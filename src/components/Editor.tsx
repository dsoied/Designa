import { ZoomIn, ZoomOut, Undo, Redo, Eraser, Brush, Download, Maximize2, Upload, Plus, RotateCcw, Sparkles, Sliders, Layers, Crop, Wand2, User, Image as ImageIcon, Camera, Sun, Moon, Palette, Film, Grid3x3, AlignCenter, RotateCw, Zap, Layout, Square, Smartphone, Monitor, Crown, RefreshCw } from 'lucide-react';
import React, { useState, useEffect, useRef, ChangeEvent } from 'react';
import { motion } from 'motion/react';
import { GoogleGenAI } from "@google/genai";
import { db, auth, addDoc, collection, storage, ref, uploadString, getDownloadURL, serverTimestamp, uploadImageToStorage, handleFirestoreError, OperationType } from '../firebase';
import { usageService } from '../services/usageService';
import { WelcomeTour } from './WelcomeTour';

interface EditorProps {
  imageUrl: string | null;
  onNavigate?: (screen: any, imageData?: string) => void;
  initialTool?: 'background' | 'object' | 'upscale' | 'face' | 'filters' | 'crop' | 'layers' | 'magic' | 'outpaint' | 'variations';
  userRole?: string;
  onOpenPricing?: () => void;
  notify?: (title: string, message: string, type?: 'success' | 'error' | 'info') => void;
}

import { trackImageProcessed } from '../services/analyticsService';

export function Editor({ imageUrl, onNavigate, initialTool = 'background', userRole, onOpenPricing, notify }: EditorProps) {
  console.log('Editor: Renderizando. imageUrl:', imageUrl ? 'presente (tamanho: ' + imageUrl.length + ')' : 'ausente');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [brushSize, setBrushSize] = useState(24);
  const [sensitivity, setSensitivity] = useState(75);
  const [quality, setQuality] = useState(100);
  const [mode, setMode] = useState<'erase' | 'restore' | 'keep'>('erase');
  const [activeTool, setActiveTool] = useState<'background' | 'object' | 'upscale' | 'face' | 'filters' | 'crop' | 'layers' | 'magic' | 'outpaint' | 'variations'>(initialTool);
  const [refinement, setRefinement] = useState<'suave' | 'medio' | 'nitido'>('medio');
  const [upscaleLevel, setUpscaleLevel] = useState<'2K' | '4K' | '8K'>('2K');
  const [format, setFormat] = useState<'PNG' | 'JPG' | 'WebP'>('PNG');
  const [selectedFilter, setSelectedFilter] = useState<string>('vibrante');
  const [selectedComposition, setSelectedComposition] = useState<string>('thirds');
  const [selectedFacePreset, setSelectedFacePreset] = useState<string>('natural');
  const [selectedCrop, setSelectedCrop] = useState<string>('1:1');
  const [magicInstruction, setMagicInstruction] = useState<string>('');
  const [selectedMagicPreset, setSelectedMagicPreset] = useState<string>('');
  const [bgColor, setBgColor] = useState<string>('transparent');
  const [retryCount, setRetryCount] = useState<number>(0);

  const filters = [
    { id: 'vibrante', name: 'Vibrante', desc: 'Cores intensas', color: 'bg-orange-500', icon: <Sparkles size={14} /> },
    { id: 'vintage', name: 'Vintage', desc: 'Estilo Retrô', color: 'bg-amber-700', icon: <Camera size={14} /> },
    { id: 'pb', name: 'P&B', desc: 'Clássico', color: 'bg-slate-700', icon: <Moon size={14} /> },
    { id: 'cinematico', name: 'Cinema', desc: 'Look Filme', color: 'bg-blue-900', icon: <Film size={14} /> },
    { id: 'frio', name: 'Frio', desc: 'Tons Azuis', color: 'bg-cyan-500', icon: <Sun size={14} className="rotate-180" /> },
    { id: 'quente', name: 'Quente', desc: 'Tons Ouro', color: 'bg-yellow-600', icon: <Sun size={14} /> },
    { id: 'noir', name: 'Noir', desc: 'Dramático', color: 'bg-black', icon: <Moon size={14} className="fill-current" /> },
    { id: 'pop', name: 'Pop Art', desc: 'Cores Vivas', color: 'bg-pink-500', icon: <Palette size={14} /> },
  ];

  const compositionPresets = [
    { id: 'thirds', name: 'Regra dos Terços', desc: 'Equilíbrio clássico', color: 'bg-blue-500', icon: <Grid3x3 size={14} /> },
    { id: 'centered', name: 'Simetria Central', desc: 'Foco total no meio', color: 'bg-indigo-500', icon: <AlignCenter size={14} /> },
    { id: 'golden', name: 'Proporção Áurea', desc: 'Harmonia natural', color: 'bg-purple-500', icon: <RotateCw size={14} /> },
    { id: 'cinematic', name: 'Panorâmico', desc: 'Estilo cinema 21:9', color: 'bg-slate-800', icon: <Film size={14} /> },
    { id: 'portrait', name: 'Retrato Focado', desc: 'Ideal para pessoas', color: 'bg-pink-500', icon: <User size={14} /> },
    { id: 'dynamic', name: 'Ângulo Dinâmico', desc: 'Ação e movimento', color: 'bg-orange-500', icon: <Zap size={14} /> },
  ];

  const facePresets = [
    { id: 'natural', name: 'Natural', desc: 'Toque leve e real', color: 'bg-emerald-500', icon: <User size={14} /> },
    { id: 'smooth', name: 'Pele Suave', desc: 'Textura de porcelana', color: 'bg-pink-400', icon: <Sparkles size={14} /> },
    { id: 'glamour', name: 'Glamour', desc: 'Maquiagem e brilho', color: 'bg-purple-500', icon: <Palette size={14} /> },
    { id: 'bright', name: 'Iluminado', desc: 'Realce de olhos', color: 'bg-yellow-400', icon: <Sun size={14} /> },
    { id: 'sharp', name: 'Definido', desc: 'Contornos marcantes', color: 'bg-indigo-500', icon: <Maximize2 size={14} /> },
  ];

  const cropPresets = [
    { id: '1:1', name: 'Quadrado', desc: 'Ideal para Feed', ratio: '1:1', icon: <Square size={14} /> },
    { id: '4:5', name: 'Retrato', desc: 'Instagram Feed', ratio: '4:5', icon: <User size={14} /> },
    { id: '9:16', name: 'Story', desc: 'TikTok / Reels', ratio: '9:16', icon: <Smartphone size={14} /> },
    { id: '16:9', name: 'Widescreen', desc: 'YouTube / TV', ratio: '16:9', icon: <Monitor size={14} /> },
    { id: '2.35:1', name: 'Cinemascopo', desc: 'Look de Filme', ratio: '2.35:1', icon: <Film size={14} /> },
  ];

  const magicPresets = [
    { id: 'sky', name: 'Céu Dramático', desc: 'Pôr do sol incrível', prompt: 'Change the sky to a dramatic sunset with vibrant orange and purple colors. Keep the rest of the image natural.' },
    { id: 'season', name: 'Mudar Estação', desc: 'Inverno/Outono', prompt: 'Transform the environment to look like a snowy winter scene. Add subtle snow on surfaces.' },
    { id: 'artistic', name: 'Pintura a Óleo', desc: 'Estilo clássico', prompt: 'Transform this image into a high-quality oil painting with visible brushstrokes and rich textures.' },
    { id: 'cyberpunk', name: 'Cyberpunk', desc: 'Neon e futuro', prompt: 'Apply a cyberpunk aesthetic with neon lights, futuristic elements, and a dark, moody atmosphere.' },
    { id: 'fantasy', name: 'Fantasia', desc: 'Mundo mágico', prompt: 'Add magical elements like floating particles, ethereal lighting, and a fantasy world feel.' },
  ];

  // Update activeTool if initialTool changes (e.g. navigating between tools from sidebar)
  useEffect(() => {
    setActiveTool(initialTool);
  }, [initialTool]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsPanning(true);
        if (e.target === document.body) e.preventDefault();
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') setIsPanning(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Use state for display image to ensure it updates correctly
  const [displayImage, setDisplayImage] = useState<string>(imageUrl || "");
  const [initialImage, setInitialImage] = useState<string>(imageUrl || "");
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  // UI State: 'original' (before), 'result' (after), 'compare' (slider view)
  // The 'compare' mode uses a responsive slider with clip-path for pixel-perfect alignment.
  const [viewMode, setViewMode] = useState<'original' | 'result' | 'compare'>('original');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isKeySelected, setIsKeySelected] = useState<boolean | null>(null);
  const [showKeyPrompt, setShowKeyPrompt] = useState(false);
  const [keyPromptReason, setKeyPromptReason] = useState<'high-quality' | 'quota-exceeded'>('high-quality');
  const [isDragging, setIsDragging] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isDrawing, setIsDrawing] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [sliderPosition, setSliderPosition] = useState(50);
  const [history, setHistory] = useState<string[]>(imageUrl ? [imageUrl] : []);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [imageMetadata, setImageMetadata] = useState<{ width: number, height: number, size: string }>({ width: 0, height: 0, size: '0KB' });
  const [showWelcomeTour, setShowWelcomeTour] = useState(false);
  const [isMouseOverImage, setIsMouseOverImage] = useState(false);

  useEffect(() => {
    const hasSeenTour = localStorage.getItem('designa_editor_tour_seen');
    if (!hasSeenTour) {
      setShowWelcomeTour(true);
    }
  }, []);

  const handleTourComplete = () => {
    localStorage.setItem('designa_editor_tour_seen', 'true');
    setShowWelcomeTour(false);
  };

  const maskCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (displayImage) {
      const img = new Image();
      img.onload = () => {
        const base64Length = displayImage.split(',')[1].length;
        const sizeInBytes = Math.floor(base64Length * 0.75);
        const sizeInKB = (sizeInBytes / 1024).toFixed(1);
        setImageMetadata({
          width: img.width,
          height: img.height,
          size: sizeInBytes > 1024 * 1024 ? (sizeInBytes / (1024 * 1024)).toFixed(1) + 'MB' : sizeInKB + 'KB'
        });
      };
      img.src = displayImage;
    }
  }, [displayImage]);

  useEffect(() => {
    console.log('Editor: useEffect detectou mudança em imageUrl:', imageUrl ? 'presente (tamanho: ' + imageUrl.length + ')' : 'ausente');
    setDisplayImage(imageUrl || "");
    setInitialImage(imageUrl || "");
    setProcessedImage(null);
    setViewMode('original');
    if (imageUrl) {
      setHistory([imageUrl]);
      setHistoryIndex(0);
    }
  }, [imageUrl]);

  const addToHistory = (newImage: string) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newImage);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setDisplayImage(newImage);
  };

  useEffect(() => {
    if (displayImage && maskCanvasRef.current) {
      const img = new Image();
      img.src = displayImage;
      img.onload = () => {
        if (maskCanvasRef.current) {
          maskCanvasRef.current.width = img.naturalWidth;
          maskCanvasRef.current.height = img.naturalHeight;
        }
      };
    }
  }, [displayImage]);

  const handleZoom = () => {
    setZoom(prev => prev === 1 ? 1.5 : prev === 1.5 ? 2 : 1);
  };

  useEffect(() => {
    const checkKey = async () => {
      if ((window as any).aistudio?.hasSelectedApiKey) {
        const hasKey = await (window as any).aistudio.hasSelectedApiKey();
        setIsKeySelected(hasKey);
      }
    };
    checkKey();
  }, []);

  const handleSelectKey = async () => {
    if ((window as any).aistudio?.openSelectKey) {
      await (window as any).aistudio.openSelectKey();
      setIsKeySelected(true);
      setShowKeyPrompt(false);
    }
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setDisplayImage(history[newIndex]);
      setProcessedImage(null);
      setViewMode('original');
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setDisplayImage(history[newIndex]);
      setProcessedImage(null);
      setViewMode('original');
    }
  };

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (items) {
        for (let i = 0; i < items.length; i++) {
          if (items[i].type.indexOf('image') !== -1) {
            const blob = items[i].getAsFile();
            if (blob) {
              const maxSize = (userRole === 'pro' || userRole === 'admin') ? 20 * 1024 * 1024 : 10 * 1024 * 1024;
              if (blob.size > maxSize) {
                console.log(`Editor: Imagem colada excede o limite de ${maxSize / 1024 / 1024}MB`);
                onOpenPricing?.();
                return;
              }
              const reader = new FileReader();
              reader.onload = (event) => {
                const imageData = event.target?.result as string;
                console.log('Editor: Imagem colada da área de transferência');
                onNavigate?.('editor', imageData);
              };
              reader.readAsDataURL(blob);
            }
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [onNavigate]);

  useEffect(() => {
    console.log('Editor: displayImage atualizado para:', displayImage ? 'imagem presente (tamanho: ' + displayImage.length + ')' : 'vazio');
  }, [displayImage]);

  const handleApplyChanges = async (isRetry = false) => {
    if (!displayImage) return;

    // Auth check
    if (!auth.currentUser) {
      if (notify) {
        notify('Acesso Restrito', 'Você precisa estar logado para processar imagens com IA.', 'error');
      } else {
        alert("Você precisa estar logado para processar imagens com IA.");
      }
      onNavigate?.('signup');
      return;
    }

    // Usage check for free users
    const usage = await usageService.checkUsage(userRole || 'free', activeTool);
    if (!usage.allowed) {
      console.log(`Editor: Limite de uso diário atingido para o recurso "${activeTool}" no plano gratuito`);
      onOpenPricing?.();
      return;
    }

    const isPro = userRole === 'pro' || userRole === 'admin';

    // Enforce Pro-only tools
    const proTools = ['magic', 'outpaint', 'variations'];
    if (proTools.includes(activeTool) && !isPro) {
      console.log(`Editor: Recurso "${activeTool}" é exclusivo para usuários Pro`);
      onOpenPricing?.();
      return;
    }

    // Enforce Pro-only upscale levels
    if (activeTool === 'upscale' && (upscaleLevel === '4K' || upscaleLevel === '8K') && !isPro) {
      console.log(`Editor: Upscale "${upscaleLevel}" é exclusivo para usuários Pro`);
      onOpenPricing?.();
      return;
    }

    setIsProcessing(true);
    
    // Reset retry count if it's a fresh call
    if (!isRetry) {
      setRetryCount(0);
      console.log('Editor: Aplicando alterações reais com Gemini API...');
    } else {
      console.log(`Editor: Tentando novamente (${retryCount + 1}/3) após erro de cota...`);
    }
    
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
      const ai = new GoogleGenAI({ apiKey });
      
      // Resize image if it's too large to save quota/bandwidth
      let finalBase64Data = displayImage.split(',')[1];
      let finalMimeType = displayImage.match(/^data:([^;]+);base64,/)?.[1] || 'image/png';

      // Simple resizing logic for very large images (> 1600px)
      const resizeImage = async (base64: string, maxDim: number): Promise<string> => {
        return new Promise((resolve) => {
          const img = new Image();
          img.onload = () => {
            if (img.width <= maxDim && img.height <= maxDim) {
              resolve(base64);
              return;
            }
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            if (width > height) {
              if (width > maxDim) {
                height *= maxDim / width;
                width = maxDim;
              }
            } else {
              if (height > maxDim) {
                width *= maxDim / height;
                height = maxDim;
              }
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/png').split(',')[1]);
          };
          img.src = `data:image/png;base64,${base64}`;
        });
      };

      // Only resize if not upscaling
      if (activeTool !== 'upscale') {
        finalBase64Data = await resizeImage(finalBase64Data, 1600);
      }

      // We will use the standard model but with a "Super-Resolution" prompt to maximize quality for free
      let modelName = 'gemini-2.5-flash-image';
      let config: any = {};

      let prompt = "";
      if (activeTool === 'background' || activeTool === 'object') {
        // Create a temporary canvas to merge image and mask
        const tempCanvas = document.createElement('canvas');
        const img = new Image();
        img.src = displayImage;
        await new Promise(resolve => img.onload = resolve);
        
        tempCanvas.width = img.naturalWidth;
        tempCanvas.height = img.naturalHeight;
        const tempCtx = tempCanvas.getContext('2d');
        
        if (tempCtx && maskCanvasRef.current) {
          // Draw original image
          tempCtx.drawImage(img, 0, 0);
          
          // Create a filtered mask canvas
          const maskCanvas = maskCanvasRef.current;
          const filteredMaskCanvas = document.createElement('canvas');
          filteredMaskCanvas.width = maskCanvas.width;
          filteredMaskCanvas.height = maskCanvas.height;
          const fCtx = filteredMaskCanvas.getContext('2d');
          
          if (fCtx) {
            fCtx.drawImage(maskCanvas, 0, 0);
            const imageData = fCtx.getImageData(0, 0, filteredMaskCanvas.width, filteredMaskCanvas.height);
            const data = imageData.data;
            
            let hasMask = false;
            for (let i = 0; i < data.length; i += 4) {
              if (data[i + 3] > 0) {
                hasMask = true;
                break;
              }
            }

            if (hasMask) {
              // For Object removal, we only care about RED. 
              // For Background removal, we care about RED (Background) and GREEN (Foreground).
              for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                const a = data[i + 3];
                
                if (a > 0) {
                  if (activeTool === 'object') {
                    // Object removal: Only red matters.
                    data[i] = 255;
                    data[i + 1] = 0;
                    data[i + 2] = 0;
                    data[i + 3] = 255;
                  } else {
                    // Background removal: Keep Red as Red, Green as Green.
                    if (r > g && r > 100) {
                      data[i] = 255; data[i+1] = 0; data[i+2] = 0;
                    } else if (g > r && g > 100) {
                      data[i] = 0; data[i+1] = 255; data[i+2] = 0;
                    }
                    data[i + 3] = 255;
                  }
                }
              }
              fCtx.putImageData(imageData, 0, 0);
              
              // Draw filtered mask onto image
              tempCtx.globalAlpha = 0.7; // Make it semi-transparent so AI sees both
              tempCtx.drawImage(filteredMaskCanvas, 0, 0, tempCanvas.width, tempCanvas.height);
              
              const mergedDataUrl = tempCanvas.toDataURL('image/png');
              finalBase64Data = mergedDataUrl.split(',')[1];
              finalMimeType = 'image/png';
            }
          }
          
          // Clear mask after merging
          clearMask();
        }

        if (activeTool === 'background') {
          prompt = `Act as an expert AI image segmentation engine. Your goal is to perform a high-precision background removal. 
          I have provided hints on the image:
          - Areas marked in RED are BACKGROUND (to be removed).
          - Areas marked in GREEN are FOREGROUND (to be kept).
          If no markings are present, detect the primary subject automatically.
          
          Sensitivity: ${sensitivity}%. Refinement: ${refinement}.
          Output ONLY the resulting image as a base64-encoded PNG. ${bgColor === 'transparent' ? 'The background must be completely transparent (alpha channel).' : `Replace the background with a solid ${bgColor} color.`}
          Do not provide any text, markdown, or conversational response. Just the image data.`;
        } else {
          prompt = `Act as an expert AI image retouching engine. Your goal is to perform high-precision object removal (inpainting). 
          I have marked the object to be removed in RED on the provided image. 
          Please remove the area marked in RED and fill it seamlessly with the surrounding background.
          Output ONLY the resulting image as a base64-encoded PNG. 
          CRITICAL: DO NOT provide any text, markdown, or conversational response. If you understand, return ONLY the image data.`;
        }
      } else if (activeTool === 'upscale') {
        prompt = `Act as a world-class AI Super-Resolution and Image Restoration engine. 
        Your task is to perform an EXTREME high-fidelity upscale to ${upscaleLevel} resolution.
        
        TECHNICAL REQUIREMENTS:
        1. RECONSTRUCT missing details: Analyze textures (skin, fabric, nature) and synthesize high-frequency details that were lost.
        2. NEURAL DENOISING: Remove all JPEG artifacts and ISO noise without losing sharpness.
        3. EDGE REFINEMENT: Make all outlines perfectly crisp and smooth.
        4. COLOR DEPTH: Enhance micro-contrast and dynamic range to simulate a professional RAW photograph.
        5. TARGET: The final output must look like it was shot with a high-end 8K cinema camera.
        
        Output ONLY the resulting image as a base64-encoded PNG. NO TEXT. NO MARKDOWN.`;
      } else if (activeTool === 'face') {
        const preset = facePresets.find(p => p.id === selectedFacePreset);
        prompt = `Act as a world-class AI facial retouching and beauty engine. Your goal is to perform a high-precision facial enhancement.
        Target Style: "${preset?.name}" (${preset?.desc}).
        Intensity: ${sensitivity}%. Quality: ${quality}%.
        
        TECHNICAL REQUIREMENTS:
        1. SKIN RETOUCHING: Smooth skin texture while preserving natural pores and details. Remove blemishes, acne, and fine lines.
        2. FEATURE ENHANCEMENT: ${preset?.id === 'bright' ? 'Focus on brightening the eyes and whitening teeth.' : 
                                preset?.id === 'sharp' ? 'Enhance facial contours, jawline, and cheekbones.' : 
                                preset?.id === 'glamour' ? 'Apply a subtle digital makeup effect and soft lighting.' : 
                                'Enhance facial features naturally and harmoniously.'}
        3. LIGHTING: Adjust facial lighting to be more flattering and professional.
        4. NATURAL LOOK: Ensure the result looks realistic and not over-processed.
        
        Output ONLY the resulting image as a base64-encoded PNG. NO TEXT. NO MARKDOWN.`;
      } else if (activeTool === 'filters') {
        const filterObj = filters.find(f => f.id === selectedFilter);
        prompt = `Act as an expert AI image filtering engine. Your goal is to apply the "${filterObj?.name}" artistic filter to this photograph. 
        Filter Description: ${filterObj?.desc}.
        Intensity: ${sensitivity}%.
        Enhance colors, mood, and overall aesthetic according to the chosen style.
        Output ONLY the resulting image as a base64-encoded PNG. Do not provide any text, markdown, or conversational response. Just the image data.`;
      } else if (activeTool === 'crop') {
        const preset = cropPresets.find(p => p.id === selectedCrop);
        prompt = `Act as an expert AI image composition and cropping engine. Your goal is to perform a smart crop and adjustment of the framing.
        Target Aspect Ratio: ${preset?.ratio} (${preset?.name}).
        
        TECHNICAL REQUIREMENTS:
        1. SMART CROP: Detect the most important subject in the image and ensure it is perfectly positioned according to the ${preset?.ratio} aspect ratio.
        2. COMPOSITION: Apply professional photography rules (like the rule of thirds) to make the crop visually appealing.
        3. CONTENT PRESERVATION: Do not cut off important parts of the subject (like heads or limbs).
        4. OUTPUT: Return ONLY the cropped image as a base64-encoded PNG.
        
        CRITICAL: DO NOT provide any text, markdown, or conversational response. Return ONLY the image data.`;
      } else if (activeTool === 'layers') {
        const preset = compositionPresets.find(p => p.id === selectedComposition);
        prompt = `Act as an expert AI image composition and layout engine. Your goal is to re-compose and enhance the visual structure of this photograph.
        Target Composition Style: "${preset?.name}" (${preset?.desc}).
        Intensity of Adjustment: ${sensitivity}%.
        
        TECHNICAL GOALS:
        1. RE-FRAME: Adjust the cropping and positioning of elements to follow the ${preset?.name} principle.
        2. DEPTH ENHANCEMENT: Use AI to create a stronger sense of foreground, middle ground, and background.
        3. VISUAL BALANCE: Balance the weights of colors and subjects within the frame.
        4. SEAMLESS EXPANSION: If needed to achieve the composition, use generative fill to expand the edges naturally.
        
        Output ONLY the resulting image as a base64-encoded PNG. NO TEXT. NO MARKDOWN.`;
      } else if (activeTool === 'outpaint') {
        prompt = `Act as an expert AI outpainting and image expansion engine. Your goal is to expand the boundaries of this image.
        TECHNICAL REQUIREMENTS:
        1. SEAMLESS EXPANSION: Create new content that naturally continues the existing scene, lighting, and style.
        2. CONTEXT AWARENESS: Understand the environment and add logical elements (e.g., more sky, more landscape, more background).
        3. QUALITY: Maintain the same resolution and detail level as the original.
        
        Output ONLY the resulting image as a base64-encoded PNG. NO TEXT. NO MARKDOWN.`;
      } else if (activeTool === 'variations') {
        prompt = `Act as an expert AI image variation engine. Your goal is to create a new version of this image that maintains the same core style, subject, and composition but with creative variations.
        TECHNICAL REQUIREMENTS:
        1. STYLE PRESERVATION: Keep the artistic style, color palette, and lighting of the original.
        2. CREATIVE VARIATION: Change subtle details, poses, or background elements to create a fresh but familiar version.
        3. QUALITY: Ensure the output is high-resolution and professional.
        
        Output ONLY the resulting image as a base64-encoded PNG. NO TEXT. NO MARKDOWN.`;
      } else if (activeTool === 'magic') {
        const preset = magicPresets.find(p => p.id === selectedMagicPreset);
        const finalInstruction = magicInstruction || preset?.prompt || 'Enhance and modify the image creatively based on the visual context.';
        
        prompt = `Act as a world-class AI generative editing engine. Your goal is to transform the image based on the following instruction:
        
        INSTRUCTION: "${finalInstruction}"
        
        TECHNICAL REQUIREMENTS:
        1. GENERATIVE EDITING: Use advanced generative AI to modify the image while maintaining the core structure and identity of the original subjects unless specified otherwise.
        2. SEAMLESS INTEGRATION: Any new elements or changes must blend perfectly with the existing lighting, shadows, and textures.
        3. CREATIVITY: Be creative but realistic in the execution of the request.
        4. OUTPUT: Return ONLY the modified image as a base64-encoded PNG.
        
        CRITICAL: DO NOT provide any text, markdown, or conversational response. Return ONLY the image data.`;
      } else {
        prompt = "Process image. Return ONLY image.";
      }

      const response = await ai.models.generateContent({
        model: modelName,
        contents: {
          parts: [
            { text: prompt },
            {
              inlineData: {
                data: finalBase64Data,
                mimeType: finalMimeType,
              },
            },
          ],
        },
        config: {
          candidateCount: 1
        }
      });

      let foundImage = false;
      const candidates = response.candidates;
      
      if (candidates && candidates.length > 0 && candidates[0].content?.parts) {
        for (const part of candidates[0].content.parts) {
          if (part.inlineData?.data) {
            const resultBase64 = part.inlineData.data;
            const resultMimeType = part.inlineData.mimeType || 'image/png';
            const resultUrl = `data:${resultMimeType};base64,${resultBase64}`;
            
            setProcessedImage(resultUrl);
            setViewMode('compare');
            addToHistory(resultUrl);
            trackImageProcessed(activeTool);
            foundImage = true;
            console.log('Editor: Sucesso! Imagem recebida.');

            // Increment usage
            await usageService.incrementUsage(userRole || 'free', activeTool);

            // Save to Firestore and Storage if user is logged in
            if (auth.currentUser) {
              const toolName = activeTool === 'background' ? 'Remoção de Fundo' :
                               activeTool === 'object' ? 'Remoção de Objeto' :
                               activeTool === 'upscale' ? `Upscale ${upscaleLevel}` :
                               activeTool === 'face' ? 'Retoque Facial' :
                               activeTool === 'filters' ? 'Filtro Artístico' :
                               activeTool === 'crop' ? 'Corte Inteligente' :
                               activeTool === 'layers' ? 'Composição' :
                               activeTool === 'outpaint' ? 'Expansão Generativa' :
                               activeTool === 'variations' ? 'Variações de Imagem' :
                               activeTool === 'magic' ? 'Edição Mágica' : 'Edição IA';

              try {
                const fileName = `Projeto_${Date.now()}.png`;
                const storageUrl = await uploadImageToStorage(resultUrl, fileName, `users/${auth.currentUser.uid}/projects`);

                const projectsPath = 'projects';
                try {
                  await addDoc(collection(db, projectsPath), {
                    id: Date.now().toString(),
                    uid: auth.currentUser.uid,
                    name: `Projeto_${Date.now()}`,
                    date: new Date().toISOString().split('T')[0],
                    createdAt: serverTimestamp(),
                    status: 'Finalizado',
                    type: toolName,
                    imageUrl: storageUrl
                  });
                } catch (err) {
                  handleFirestoreError(err, OperationType.WRITE, projectsPath);
                }
                
                const notificationsPath = 'notifications';
                try {
                  await addDoc(collection(db, notificationsPath), {
                    id: Date.now().toString(),
                    uid: auth.currentUser.uid,
                    title: 'Processamento Concluído',
                    message: `O recurso "${toolName}" foi aplicado com sucesso e salvo no seu histórico.`,
                    time: 'Agora',
                    createdAt: serverTimestamp(),
                    type: 'success',
                    isRead: false
                  });
                } catch (err) {
                  handleFirestoreError(err, OperationType.WRITE, notificationsPath);
                }
                console.log('Editor: Projeto e notificação salvos no Firestore');
              } catch (err) {
                console.error('Editor: Erro ao salvar no Firestore:', err);
              }
            }
            break;
          }
        }
      }

      if (!foundImage) {
        const textResponse = response.text;
        console.warn('Editor: IA não enviou imagem. Resposta:', textResponse);
        if (notify) {
          notify('Erro da IA', `A IA não enviou uma imagem de retorno. Resposta: ${textResponse || 'Sem detalhes.'}`, 'error');
        } else {
          alert(`A IA não enviou uma imagem de retorno. Resposta da IA: ${textResponse || 'Sem resposta detalhada.'}`);
        }
      } else {
        if (notify) {
          notify('Sucesso', 'Alterações aplicadas com sucesso! Agora você pode comparar com a original.', 'success');
        } else {
          alert('Alterações aplicadas com sucesso! Agora você pode comparar com a original.');
        }
      }

    } catch (error: any) {
      console.error('Editor: Erro ao processar imagem com Gemini:', error);
      
      const errorMsg = error.message || String(error);
      const errorStr = JSON.stringify(error);
      const isQuotaError = errorMsg.includes('429') || 
                          errorMsg.includes('RESOURCE_EXHAUSTED') || 
                          errorStr.includes('429') || 
                          errorStr.includes('RESOURCE_EXHAUSTED');

      if (isQuotaError) {
        if (retryCount < 2) {
          const nextRetry = retryCount + 1;
          setRetryCount(nextRetry);
          // Exponential backoff: 2s, 5s, 10s
          const delay = nextRetry === 1 ? 2000 : nextRetry === 2 ? 5000 : 10000;
          console.log(`Editor: Erro de cota. Tentando novamente em ${delay/1000}s...`);
          setTimeout(() => handleApplyChanges(true), delay);
          return;
        }
        setKeyPromptReason('quota-exceeded');
        setShowKeyPrompt(true);
      } else {
        if (notify) {
          notify('Erro de Processamento', 'Ocorreu um erro ao processar a imagem. O servidor pode estar instável ou a imagem é muito grande. Tente novamente em instantes.', 'error');
        } else {
          alert('Ocorreu um erro ao processar a imagem. O servidor pode estar instável ou a imagem é muito grande. Tente novamente em instantes.');
        }
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    const imageToDownload = processedImage || displayImage;
    if (!imageToDownload) return;
    
    const link = document.createElement('a');
    link.href = imageToDownload;
    link.download = `edit-master-${Date.now()}.${format.toLowerCase()}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      if (notify) {
        notify('Erro de Arquivo', 'Por favor, selecione apenas arquivos de imagem.', 'error');
      } else {
        alert('Por favor, selecione apenas arquivos de imagem.');
      }
      return;
    }

    // Free user limit: 10MB, Pro/Admin: 20MB
    const limit = (userRole === 'pro' || userRole === 'admin') ? 20 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > limit) {
      if (userRole !== 'pro' && userRole !== 'admin') {
        const msg = 'O arquivo é muito grande para o plano gratuito (limite 10MB). Faça upgrade para Pro para enviar arquivos de até 20MB.';
        if (notify) {
          notify('Limite Excedido', msg, 'error');
        } else {
          alert(msg);
        }
        onOpenPricing?.();
      } else {
        const msg = 'O arquivo excede o limite de 20MB.';
        if (notify) {
          notify('Erro de Tamanho', msg, 'error');
        } else {
          alert(msg);
        }
      }
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const imageData = e.target?.result as string;
      console.log('Editor: Nova imagem carregada (tamanho:', imageData.length, ')');
      try {
        onNavigate?.('editor', imageData);
      } catch (err) {
        console.error('Editor: Erro ao navegar após upload:', err);
      }
    };
    reader.onerror = (err) => {
      console.error('Editor: Erro ao ler arquivo:', err);
      if (notify) {
        notify('Erro de Leitura', 'Erro ao ler o arquivo. Tente novamente.', 'error');
      } else {
        alert('Erro ao ler o arquivo. Tente novamente.');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processFile(file);
      // Reset value to allow selecting the same file again
      event.target.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setMousePos({ x, y });

    if (isPanning && isDrawing) {
      const dx = e.clientX - lastMousePos.x;
      const dy = e.clientY - lastMousePos.y;
      setPanOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      setLastMousePos({ x: e.clientX, y: e.clientY });
      return;
    }

    if ((activeTool === 'object' || activeTool === 'background') && isDrawing && maskCanvasRef.current && !isPanning) {
      const canvas = maskCanvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const canvasX = x * scaleX;
        const canvasY = y * scaleY;
        const scaledBrushSize = brushSize * scaleX;

        ctx.save();
        if (mode === 'restore') {
          ctx.globalCompositeOperation = 'destination-out';
          ctx.strokeStyle = 'rgba(0,0,0,1)';
          ctx.lineWidth = scaledBrushSize;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.lineTo(canvasX, canvasY);
          ctx.stroke();
        } else {
          const isKeep = mode === 'keep';
          const color = isKeep ? '34, 197, 94' : '255, 0, 0'; // Green for Keep, Red for Remove
          
          // High-precision solid brush with soft edges
          ctx.strokeStyle = `rgba(${color}, 0.4)`; 
          ctx.lineWidth = scaledBrushSize;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.shadowBlur = scaledBrushSize / 4;
          ctx.shadowColor = `rgba(${color}, 0.6)`;
          ctx.lineTo(canvasX, canvasY);
          ctx.stroke();
          
          // Add some density for the "Pro" feel
          const density = Math.floor(brushSize / 2);
          for (let i = 0; i < density; i++) {
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * (scaledBrushSize / 2.5);
            const px = canvasX + Math.cos(angle) * radius;
            const py = canvasY + Math.sin(angle) * radius;
            ctx.beginPath();
            ctx.arc(px, py, Math.random() * 2 + 1, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${color}, ${Math.random() * 0.3 + 0.2})`;
            ctx.fill();
          }
        }
        ctx.restore();
      }
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left click
    
    if (isPanning) {
      setIsDrawing(true);
      setLastMousePos({ x: e.clientX, y: e.clientY });
      return;
    }

    if ((activeTool === 'object' || activeTool === 'background') && maskCanvasRef.current) {
      setIsDrawing(true);
      const canvas = maskCanvasRef.current;
      const rect = e.currentTarget.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const scaledBrushSize = brushSize * scaleX;
        ctx.save();
        if (mode === 'restore') {
          ctx.globalCompositeOperation = 'destination-out';
          ctx.beginPath();
          ctx.arc(x, y, scaledBrushSize / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          const isKeep = mode === 'keep';
          const color = isKeep ? '34, 197, 94' : '255, 0, 0';
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.fillStyle = `rgba(${color}, 0.5)`;
          ctx.arc(x, y, scaledBrushSize / 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
    }
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
  };

  const clearMask = () => {
    if (maskCanvasRef.current) {
      const ctx = maskCanvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, maskCanvasRef.current.width, maskCanvasRef.current.height);
      }
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8 p-4 md:p-8 min-h-[calc(100vh-64px)]">
      {showWelcomeTour && <WelcomeTour onComplete={handleTourComplete} />}
      {/* Key Selection Modal */}
      {showKeyPrompt && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 max-w-sm w-full shadow-2xl border border-slate-200 dark:border-slate-800 text-center space-y-4">
            <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mx-auto">
              <Sparkles className="text-indigo-600 dark:text-indigo-400" size={24} />
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                {keyPromptReason === 'quota-exceeded' ? 'Limite de Cota' : 'Alta Qualidade'}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                {keyPromptReason === 'quota-exceeded' 
                  ? 'A cota gratuita do servidor foi atingida temporariamente.'
                  : 'Para gerar imagens em 4K/8K nativos, configure sua própria chave.'}
              </p>
              {keyPromptReason === 'quota-exceeded' ? (
                <div className="text-left bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl space-y-1 border border-slate-200 dark:border-slate-700">
                  <p className="text-[9px] font-bold text-indigo-600 uppercase tracking-wider">Como prosseguir:</p>
                  <ul className="text-[10px] text-slate-600 dark:text-slate-400 space-y-1 list-disc ml-4">
                    <li>Aguarde alguns minutos.</li>
                    <li>Use sua própria chave paga.</li>
                  </ul>
                </div>
              ) : (
                <div className="text-left bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-xl border border-indigo-100 dark:border-indigo-800/30">
                  <p className="text-[10px] text-indigo-700 dark:text-indigo-300 leading-tight">
                    <b>Nota:</b> O seletor exige um projeto com faturamento ativado.
                  </p>
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2">
              {keyPromptReason === 'quota-exceeded' && (
                <button 
                  onClick={() => {
                    setShowKeyPrompt(false);
                    handleApplyChanges(false);
                  }}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 text-sm"
                >
                  <RotateCcw size={16} />
                  Tentar Novamente
                </button>
              )}
              <button 
                onClick={handleSelectKey}
                className={`w-full py-3 font-bold rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 text-sm ${
                  keyPromptReason === 'quota-exceeded'
                    ? 'bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-700'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/20'
                }`}
              >
                <Wand2 size={16} />
                Configurar Chave
              </button>
              <button 
                onClick={() => setShowKeyPrompt(false)}
                className="w-full py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-xl transition-all text-sm"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Hidden File Input */}
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept="image/*"
        onChange={handleFileChange}
      />

      {/* Center Editor Area */}
      <section 
        className={`flex-1 flex flex-col gap-6 transition-all duration-300 ${isDragging ? 'scale-[0.99] opacity-80' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div id="editor-topbar" className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-headline font-extrabold tracking-tight text-slate-900 dark:text-white">
              {activeTool === 'background' ? 'Remover Fundo' : 'Remover Objeto'}
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
              {activeTool === 'background' 
                ? 'Isole o objeto principal com precisão de IA.' 
                : 'Elimine elementos indesejados da sua imagem.'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <motion.button 
              initial={{ backgroundColor: "rgba(255, 255, 255, 0)" }}
              whileHover={{ scale: 1.05, backgroundColor: "rgba(248, 250, 252, 1)" }}
              whileTap={{ scale: 0.95 }}
              onClick={handleUploadClick}
              className="flex-1 sm:flex-none px-4 py-1.5 text-xs font-bold rounded-lg bg-white dark:bg-slate-700 shadow-sm text-slate-700 dark:text-slate-200 transition-all flex items-center gap-2"
            >
              <Upload size={14} />
              Carregar outra
            </motion.button>
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex-1 sm:flex-none">
              <motion.button 
                whileTap={{ scale: 0.95 }}
                onClick={() => setViewMode('original')}
                className={`flex-1 sm:flex-none px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  viewMode === 'original' 
                    ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400' 
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Original
              </motion.button>
              <motion.button 
                whileTap={{ scale: 0.95 }}
                onClick={() => setViewMode('result')}
                className={`flex-1 sm:flex-none px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  viewMode === 'result' 
                    ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400' 
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Resultado
              </motion.button>
            </div>
          </div>
        </div>

        {/* Preview Container */}
        <div id="editor-canvas" className={`relative flex-1 bg-slate-100 dark:bg-slate-800 rounded-[2rem] overflow-hidden flex items-center justify-center p-4 md:p-12 min-h-[400px] md:min-h-[500px] group transition-all duration-500 ${isDragging ? 'ring-4 ring-indigo-600 ring-inset bg-indigo-50 dark:bg-indigo-900/20' : ''}`}>
          <div className="absolute inset-0 checkerboard opacity-40"></div>
          
          {isDragging && (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-indigo-600/10 backdrop-blur-sm pointer-events-none">
              <div className="w-20 h-20 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-2xl animate-bounce">
                <Upload size={32} />
              </div>
              <p className="mt-4 font-bold text-indigo-600 dark:text-indigo-400 text-lg">Solte para carregar imagem</p>
            </div>
          )}

          {/* Before/After Slider Mockup */}
          <div 
            className="relative w-full h-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden flex shadow-indigo-500/10"
            style={{ 
              transform: `scale(${zoom})`,
              transition: 'transform 0.3s ease-in-out',
              transformOrigin: 'center'
            }}
          >
            <div className="absolute inset-0 checkerboard"></div>
            
            {displayImage ? (
              <>
                {/* Main View Area */}
                <div 
                  className={`relative w-full h-full flex items-center justify-center p-4 md:p-8 z-10 ${activeTool === 'object' ? 'cursor-none' : ''}`}
                  onMouseMove={handleMouseMove}
                  onMouseDown={handleMouseDown}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={() => {
                    setIsMouseOverImage(false);
                    setIsDrawing(false);
                  }}
                  onMouseEnter={() => setIsMouseOverImage(true)}
                >
                  {/* Visual Brush Cursor */}
                  {activeTool === 'object' && isMouseOverImage && !isProcessing && (
                    <div 
                      className={`absolute pointer-events-none z-50 border-2 shadow-[0_0_0_1px_rgba(0,0,0,0.5)] rounded-full backdrop-blur-[1px] transition-colors duration-200 ${
                        mode === 'erase' ? 'border-white bg-red-500/20' : 'border-white bg-green-500/20'
                      }`}
                      style={{
                        left: mousePos.x,
                        top: mousePos.y,
                        width: brushSize,
                        height: brushSize,
                        transform: 'translate(-50%, -50%)',
                        boxShadow: mode === 'erase' 
                          ? '0 0 15px rgba(239, 68, 68, 0.4), inset 0 0 10px rgba(239, 68, 68, 0.2)'
                          : '0 0 15px rgba(34, 197, 94, 0.4), inset 0 0 10px rgba(34, 197, 94, 0.2)'
                      }}
                    />
                  )}
                  {viewMode === 'original' ? (
                    <img 
                      src={initialImage} 
                      alt="Original" 
                      className="max-w-full max-h-full object-contain shadow-2xl rounded-lg"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
                      <div 
                        className="relative transition-transform duration-200 ease-out"
                        style={{ 
                          transform: `scale(${zoom}) translate(${panOffset.x / zoom}px, ${panOffset.y / zoom}px)`,
                          cursor: isPanning ? 'grab' : 'crosshair'
                        }}
                      >
                        <img 
                          src={processedImage || displayImage} 
                          alt="Resultado" 
                          className={`max-w-full max-h-full object-contain shadow-2xl rounded-lg ${!processedImage ? 'opacity-50 grayscale' : ''}`}
                          referrerPolicy="no-referrer"
                        />
                        {!processedImage && (
                          <div className="absolute inset-0 flex items-center justify-center z-50">
                            <p className="bg-black/60 text-white px-4 py-2 rounded-full text-xs font-bold backdrop-blur-sm">
                              Clique em "Aplicar" para ver o resultado
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Mask Drawing Canvas */}
                  {(activeTool === 'object' || activeTool === 'background') && (
                    <div className="absolute inset-0 flex items-center justify-center p-4 md:p-8 pointer-events-none z-20">
                      <canvas 
                        ref={maskCanvasRef}
                        onContextMenu={(e) => e.preventDefault()}
                        className="max-w-full max-h-full object-contain pointer-events-auto"
                        style={{ 
                          width: '100%', 
                          height: '100%',
                          cursor: 'none'
                        }}
                      />
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 gap-4 p-8">
                <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  <Upload size={32} />
                </div>
                <div className="text-center">
                  <p className="font-bold">Nenhuma imagem carregada</p>
                  <p className="text-xs">Por favor, carregue uma imagem para começar a editar.</p>
                </div>
                <button 
                  onClick={handleUploadClick}
                  className="mt-2 px-6 py-2 bg-indigo-600 text-white rounded-full text-xs font-bold"
                >
                  Carregar Imagem
                </button>
              </div>
            )}
          </div>

          {/* Floating Controls */}
          <div id="editor-actions" className="absolute bottom-4 md:bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-1 md:gap-2 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-1.5 md:p-2 rounded-2xl shadow-2xl border border-white/20 dark:border-slate-800/20 z-40 w-[90%] sm:w-auto justify-center">
            <motion.button 
              initial={{ backgroundColor: "rgba(255, 255, 255, 0)" }}
              whileHover={{ scale: 1.1, backgroundColor: "rgba(241, 245, 249, 1)" }}
              whileTap={{ scale: 0.9 }}
              onClick={handleZoom}
              className="p-2 md:p-3 hover:bg-white dark:hover:bg-slate-800 rounded-xl text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all flex flex-col items-center gap-1"
              title="Ajustar Zoom"
            >
              {zoom === 1 ? <ZoomIn size={18} className="md:w-5 md:h-5" /> : <ZoomOut size={18} className="md:w-5 md:h-5" />}
              <span className="text-[8px] font-bold uppercase sm:hidden">Zoom</span>
            </motion.button>
            <div className="w-px h-6 bg-slate-200 dark:bg-slate-800 mx-0.5 md:mx-1"></div>
            <motion.button 
              initial={{ backgroundColor: "rgba(255, 255, 255, 0)" }}
              whileHover={{ scale: 1.1, backgroundColor: "rgba(241, 245, 249, 1)" }}
              whileTap={{ scale: 0.9 }}
              onClick={handleUploadClick}
              className="p-2 md:p-3 hover:bg-white dark:hover:bg-slate-800 rounded-xl text-indigo-600 dark:text-indigo-400 transition-all flex items-center gap-2"
              title="Adicionar nova imagem"
            >
              <Plus size={18} className="md:w-5 md:h-5" />
              <span className="text-[10px] font-bold hidden sm:inline">Adicionar</span>
            </motion.button>
            <div className="w-px h-6 bg-slate-200 dark:bg-slate-800 mx-0.5 md:mx-1"></div>
            <motion.button 
              initial={{ backgroundColor: "rgba(255, 255, 255, 0)" }}
              whileHover={historyIndex !== 0 ? { scale: 1.1, backgroundColor: "rgba(241, 245, 249, 1)" } : {}}
              whileTap={historyIndex !== 0 ? { scale: 0.9 } : {}}
              onClick={handleUndo}
              disabled={historyIndex === 0}
              className={`p-3 md:p-3 hover:bg-white dark:hover:bg-slate-800 rounded-xl transition-all flex flex-col items-center gap-1 ${historyIndex === 0 ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed' : 'text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400'}`}
              title="Desfazer"
            >
              <Undo size={20} className="md:w-5 md:h-5" />
              <span className="text-[8px] font-bold uppercase sm:hidden">Desfazer</span>
            </motion.button>
            <motion.button 
              initial={{ backgroundColor: "rgba(255, 255, 255, 0)" }}
              whileHover={historyIndex !== history.length - 1 ? { scale: 1.1, backgroundColor: "rgba(241, 245, 249, 1)" } : {}}
              whileTap={historyIndex !== history.length - 1 ? { scale: 0.9 } : {}}
              onClick={handleRedo}
              disabled={historyIndex === history.length - 1}
              className={`p-3 md:p-3 hover:bg-white dark:hover:bg-slate-800 rounded-xl transition-all flex flex-col items-center gap-1 ${historyIndex === history.length - 1 ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed' : 'text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400'}`}
              title="Refazer"
            >
              <Redo size={20} className="md:w-5 md:h-5" />
              <span className="text-[8px] font-bold uppercase sm:hidden">Refazer</span>
            </motion.button>
            <div className="w-px h-6 bg-slate-200 dark:bg-slate-800 mx-0.5 md:mx-1"></div>
            <motion.button 
              whileHover={!(isProcessing || !displayImage) ? { scale: 1.05, boxShadow: "0 20px 25px -5px rgb(79 70 229 / 0.4)" } : {}}
              whileTap={!(isProcessing || !displayImage) ? { scale: 0.95 } : {}}
              onClick={() => handleApplyChanges()}
              disabled={isProcessing || !displayImage}
              className={`px-3 md:px-6 py-2 md:py-3 bg-indigo-600 text-white rounded-xl text-[10px] md:text-xs font-bold transition-all whitespace-nowrap shadow-lg shadow-indigo-500/20 flex items-center gap-2 ${isProcessing ? 'opacity-70 cursor-wait' : 'hover:opacity-90'}`}
            >
              {isProcessing ? (
                <>
                  <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Processando...</span>
                </>
              ) : (
                <>
                  <span className="hidden sm:inline">Aplicar alterações</span>
                  <span className="sm:hidden">Aplicar</span>
                </>
              )}
            </motion.button>
          </div>
        </div>
      </section>

      {/* Right Side Tools Panel */}
      <aside id="editor-sidebar" className="w-full lg:w-80 flex flex-col gap-6 overflow-y-auto max-h-[calc(100vh-100px)] lg:max-h-none pr-2 custom-scrollbar">
        {/* Current Result Preview (Requested by user) */}
        {processedImage && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-slate-900 rounded-[2rem] p-4 shadow-xl shadow-indigo-900/5 border border-slate-200 dark:border-slate-800 space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Resultado Atual</span>
              <button 
                onClick={handleDownload}
                className="p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/20"
                title="Baixar Imagem"
              >
                <Download size={14} />
              </button>
            </div>
            <div className="relative aspect-video rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800">
              <img 
                src={processedImage} 
                alt="Current Result" 
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
          </motion.div>
        )}

        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-[2rem] p-6 space-y-8 shadow-sm border border-slate-200 dark:border-slate-800">
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                {activeTool === 'filters' ? 'Filtros Artísticos' : 
                 activeTool === 'upscale' ? 'Melhorar Qualidade' : 
                 activeTool === 'object' ? 'Remover Objetos' : 
                 activeTool === 'outpaint' ? 'Expansão Generativa' :
                 activeTool === 'variations' ? 'Variações de Imagem' :
                 activeTool === 'background' ? 'Remover Fundo' : 'Modo de Edição'}
              </h3>
              <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
            </div>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-200 dark:bg-slate-800 rounded-2xl">
              <button 
                onClick={() => {
                  setActiveTool('background');
                  setViewMode('original');
                }}
                className={`flex flex-col items-center gap-1 py-2 px-1 text-[9px] font-bold rounded-xl transition-all ${
                  activeTool === 'background' 
                    ? 'bg-white dark:bg-slate-700 shadow-lg text-indigo-600' 
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <ImageIcon size={14} />
                Remover Fundo
              </button>
              <button 
                onClick={() => {
                  setActiveTool('object');
                  setViewMode('original');
                }}
                className={`flex flex-col items-center gap-1 py-2 px-1 text-[9px] font-bold rounded-xl transition-all ${
                  activeTool === 'object' 
                    ? 'bg-white dark:bg-slate-700 shadow-lg text-indigo-600' 
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <Eraser size={14} />
                Remover Objeto
              </button>
              <button 
                onClick={() => {
                  setActiveTool('upscale');
                  setViewMode('original');
                }}
                className={`flex flex-col items-center gap-1 py-2 px-1 text-[9px] font-bold rounded-xl transition-all ${
                  activeTool === 'upscale' 
                    ? 'bg-white dark:bg-slate-700 shadow-lg text-indigo-600' 
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <Sparkles size={14} />
                Melhorar Qualidade
              </button>
              <button 
                onClick={() => {
                  setActiveTool('face');
                  setViewMode('original');
                }}
                className={`flex flex-col items-center gap-1 py-2 px-1 text-[9px] font-bold rounded-xl transition-all ${
                  activeTool === 'face' 
                    ? 'bg-white dark:bg-slate-700 shadow-lg text-indigo-600' 
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <User size={14} />
                Retoque Facial
              </button>
              <button 
                onClick={() => {
                  setActiveTool('filters');
                  setViewMode('original');
                }}
                className={`flex flex-col items-center gap-1 py-2 px-1 text-[9px] font-bold rounded-xl transition-all ${
                  activeTool === 'filters' 
                    ? 'bg-white dark:bg-slate-700 shadow-lg text-indigo-600' 
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <Sliders size={14} />
                Filtros
              </button>
              <button 
                onClick={() => {
                  setActiveTool('crop');
                  setViewMode('original');
                }}
                className={`flex flex-col items-center gap-1 py-2 px-1 text-[9px] font-bold rounded-xl transition-all ${
                  activeTool === 'crop' 
                    ? 'bg-white dark:bg-slate-700 shadow-lg text-indigo-600' 
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <Crop size={14} />
                Recorte
              </button>
              <button 
                onClick={() => {
                  setActiveTool('layers');
                  setViewMode('original');
                }}
                className={`flex flex-col items-center gap-1 py-2 px-1 text-[9px] font-bold rounded-xl transition-all ${
                  activeTool === 'layers' 
                    ? 'bg-white dark:bg-slate-700 shadow-lg text-indigo-600' 
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <Layers size={14} />
                Composição
              </button>
              <button 
                onClick={() => {
                  setActiveTool('magic');
                  setViewMode('original');
                }}
                className={`flex flex-col items-center gap-1 py-2 px-1 text-[9px] font-bold rounded-xl transition-all ${
                  activeTool === 'magic' 
                    ? 'bg-white dark:bg-slate-700 shadow-lg text-indigo-600' 
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <Wand2 size={14} />
                Edição Mágica
              </button>
              <button 
                onClick={() => {
                  setActiveTool('outpaint');
                  setViewMode('original');
                }}
                className={`flex flex-col items-center gap-1 py-2 px-1 text-[9px] font-bold rounded-xl transition-all ${
                  activeTool === 'outpaint' 
                    ? 'bg-white dark:bg-slate-700 shadow-lg text-indigo-600' 
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <Maximize2 size={14} />
                Expansão IA
              </button>
              <button 
                onClick={() => {
                  setActiveTool('variations');
                  setViewMode('original');
                }}
                className={`flex flex-col items-center gap-1 py-2 px-1 text-[9px] font-bold rounded-xl transition-all ${
                  activeTool === 'variations' 
                    ? 'bg-white dark:bg-slate-700 shadow-lg text-indigo-600' 
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <RefreshCw size={14} />
                Variações
              </button>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400 mb-6">Recursos de Ajuste</h3>
            
            {/* Brush Size (For Object and Background tools) */}
            {(activeTool === 'object' || activeTool === 'background') && (
              <div className="space-y-4 mb-8">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-semibold text-slate-900 dark:text-white">Tamanho do Pincel</label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded">{brushSize}px</span>
                    <button 
                      onClick={clearMask}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg bg-red-50 dark:bg-red-900/20 text-[10px] font-bold text-red-500 hover:bg-red-100 dark:hover:bg-red-900/40 transition-all"
                    >
                      <RotateCcw size={10} />
                      Limpar Tudo
                    </button>
                  </div>
                </div>
                <input 
                  type="range" 
                  min="1" 
                  max="100" 
                  value={brushSize}
                  onChange={(e) => setBrushSize(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full appearance-none cursor-pointer accent-indigo-600"
                />
              </div>
            )}

            {/* Upscale Level (Only for Upscale tool) */}
            {activeTool === 'upscale' && (
              <div className="space-y-4 mb-8">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-semibold text-slate-900 dark:text-white">Nível de Resolução</label>
                  <span className="text-xs font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded">{upscaleLevel}</span>
                </div>
                <div className="flex gap-2">
                  {(['2K', '4K', '8K'] as const).map((level) => (
                    <button 
                      key={level}
                      onClick={() => {
                        if ((level === '4K' || level === '8K') && userRole !== 'pro' && userRole !== 'admin') {
                          onOpenPricing?.();
                          return;
                        }
                        setUpscaleLevel(level);
                      }}
                      className={`flex-1 py-2 text-[10px] font-bold rounded-lg transition-all relative ${
                        upscaleLevel === level 
                          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' 
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {level}
                      {(level === '4K' || level === '8K') && userRole !== 'pro' && userRole !== 'admin' && (
                        <Crown size={10} className="absolute top-1 right-1 text-yellow-500" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Magic Edit Selection (Only for Magic tool) */}
            {activeTool === 'magic' && (
              <div className="space-y-6 mb-8">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-semibold text-slate-900 dark:text-white">Instrução Personalizada</label>
                    <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded uppercase">IA Generativa</span>
                  </div>
                  <textarea 
                    value={magicInstruction}
                    onChange={(e) => {
                      setMagicInstruction(e.target.value);
                      setSelectedMagicPreset(''); // Clear preset if user types
                    }}
                    placeholder="Ex: Mude o céu para um pôr do sol dramático ou transforme em uma pintura..."
                    className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 transition-all text-sm text-slate-700 dark:text-slate-200 min-h-[100px] resize-none outline-none"
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-semibold text-slate-900 dark:text-white">Sugestões Rápidas</label>
                  <div className="grid grid-cols-2 gap-2">
                    {magicPresets.map((p) => (
                      <button 
                        key={p.id}
                        onClick={() => {
                          setSelectedMagicPreset(p.id);
                          setMagicInstruction(''); // Clear custom if preset selected
                        }}
                        className={`flex flex-col items-start p-3 rounded-2xl border-2 transition-all active:scale-95 ${
                          selectedMagicPreset === p.id 
                            ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-500 text-indigo-600 shadow-lg shadow-indigo-500/10' 
                            : 'bg-white dark:bg-slate-800 border-transparent text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'
                        }`}
                      >
                        <div className="w-full h-8 rounded-lg mb-2 bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                          <Wand2 size={16} />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-wider">{p.name}</span>
                        <span className="text-[8px] font-bold opacity-60 uppercase truncate w-full">{p.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Crop Selection (Only for Crop tool) */}
            {activeTool === 'crop' && (
              <div className="space-y-4 mb-8">
                <div className="flex justify-between items-center">
                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-slate-900 dark:text-white">Proporção de Recorte</label>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">Escolha o formato ideal</p>
                  </div>
                  <span className="text-xs font-bold text-amber-600 bg-amber-50 dark:bg-amber-900/30 px-2 py-0.5 rounded uppercase">
                    {cropPresets.find(p => p.id === selectedCrop)?.name}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {cropPresets.map((p) => (
                    <button 
                      key={p.id}
                      onClick={() => setSelectedCrop(p.id)}
                      className={`flex flex-col items-start p-3 rounded-2xl border-2 transition-all active:scale-95 ${
                        selectedCrop === p.id 
                          ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-500 text-amber-600 shadow-lg shadow-amber-500/10' 
                          : 'bg-white dark:bg-slate-800 border-transparent text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      <div className={`w-full h-10 rounded-xl mb-2 bg-slate-100 dark:bg-slate-700 flex items-center justify-center ${selectedCrop === p.id ? 'text-amber-500' : 'text-slate-400'}`}>
                        {p.icon}
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-wider">{p.name}</span>
                      <span className="text-[8px] font-bold opacity-60 uppercase truncate w-full">{p.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Face Retouch Selection (Only for Face tool) */}
            {activeTool === 'face' && (
              <div className="space-y-4 mb-8">
                <div className="flex justify-between items-center">
                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-slate-900 dark:text-white">Estilo de Retoque</label>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">Embeleze rostos com IA</p>
                  </div>
                  <span className="text-xs font-bold text-pink-600 bg-pink-50 dark:bg-pink-900/30 px-2 py-0.5 rounded uppercase">
                    {facePresets.find(p => p.id === selectedFacePreset)?.name}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {facePresets.map((p) => (
                    <button 
                      key={p.id}
                      onClick={() => setSelectedFacePreset(p.id)}
                      className={`flex flex-col items-start p-3 rounded-2xl border-2 transition-all active:scale-95 ${
                        selectedFacePreset === p.id 
                          ? 'bg-pink-50 dark:bg-pink-900/20 border-pink-500 text-pink-600 shadow-lg shadow-pink-500/10' 
                          : 'bg-white dark:bg-slate-800 border-transparent text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      <div className={`w-full h-10 rounded-xl mb-2 ${p.color} opacity-80 flex items-center justify-center text-white`}>
                        {p.icon}
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-wider">{p.name}</span>
                      <span className="text-[8px] font-bold opacity-60 uppercase truncate w-full">{p.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Filter Selection (Only for Filters tool) */}
            {activeTool === 'filters' && (
              <div className="space-y-4 mb-8">
                <div className="flex justify-between items-center">
                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-slate-900 dark:text-white">Escolha o Filtro</label>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">Aplique estilos artísticos instantâneos</p>
                  </div>
                  <span className="text-xs font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded uppercase">
                    {filters.find(f => f.id === selectedFilter)?.name}
                  </span>
                </div>
                <div className="flex justify-end">
                  <button 
                    onClick={() => {
                      setSelectedFilter('vibrante');
                      setSensitivity(75);
                    }}
                    className="text-[10px] font-bold text-slate-400 hover:text-indigo-600 transition-colors flex items-center gap-1"
                  >
                    <RotateCcw size={10} />
                    Resetar Filtro
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {filters.map((f) => (
                    <button 
                      key={f.id}
                      onClick={() => setSelectedFilter(f.id)}
                      className={`flex flex-col items-start p-3 rounded-2xl border-2 transition-all active:scale-95 ${
                        selectedFilter === f.id 
                          ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-500 text-indigo-600 shadow-lg shadow-indigo-500/10' 
                          : 'bg-white dark:bg-slate-800 border-transparent text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      <div className={`w-full h-10 rounded-xl mb-2 ${f.color} opacity-80 flex items-center justify-center text-white`}>
                        {f.icon}
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-wider">{f.name}</span>
                      <span className="text-[8px] font-bold opacity-60 uppercase truncate w-full">{f.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Composition Selection (Only for Layers tool) */}
            {activeTool === 'layers' && (
              <div className="space-y-4 mb-8">
                <div className="flex justify-between items-center">
                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-slate-900 dark:text-white">Estilo de Composição</label>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">Re-enquadre sua foto com IA</p>
                  </div>
                  <span className="text-xs font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded uppercase">
                    {compositionPresets.find(p => p.id === selectedComposition)?.name}
                  </span>
                </div>
                <div className="flex justify-end">
                  <button 
                    onClick={() => {
                      setSelectedComposition('thirds');
                      setSensitivity(75);
                    }}
                    className="text-[10px] font-bold text-slate-400 hover:text-indigo-600 transition-colors flex items-center gap-1"
                  >
                    <RotateCcw size={10} />
                    Resetar Layout
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {compositionPresets.map((p) => (
                    <button 
                      key={p.id}
                      onClick={() => setSelectedComposition(p.id)}
                      className={`flex flex-col items-start p-3 rounded-2xl border-2 transition-all active:scale-95 ${
                        selectedComposition === p.id 
                          ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-500 text-indigo-600 shadow-lg shadow-indigo-500/10' 
                          : 'bg-white dark:bg-slate-800 border-transparent text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      <div className={`w-full h-10 rounded-xl mb-2 ${p.color} opacity-80 flex items-center justify-center text-white`}>
                        {p.icon}
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-wider">{p.name}</span>
                      <span className="text-[8px] font-bold opacity-60 uppercase truncate w-full">{p.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Sensitivity / Quality Slider */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-sm font-semibold text-slate-900 dark:text-white">
                  {activeTool === 'upscale' ? 'Intensidade de Melhoria' : 
                   activeTool === 'filters' ? 'Intensidade do Filtro' : 
                   activeTool === 'layers' ? 'Intensidade do Ajuste' : 'Sensibilidade'}
                </label>
                <span className="text-xs font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded">
                  {activeTool === 'upscale' ? quality : sensitivity}%
                </span>
              </div>
              <input 
                type="range" 
                min="1" 
                max="100" 
                value={activeTool === 'upscale' ? quality : sensitivity}
                onChange={(e) => {
                  if (activeTool === 'upscale') setQuality(parseInt(e.target.value));
                  else setSensitivity(parseInt(e.target.value));
                }}
                className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full appearance-none cursor-pointer accent-indigo-600"
              />
            </div>
          </div>

          {/* Refinement (Only for Background and Upscale tools) */}
          {(activeTool === 'background' || activeTool === 'upscale') && (
            <div className="space-y-4 mt-8">
              <div className="flex justify-between items-center">
                <label className="text-sm font-semibold text-slate-900 dark:text-white">Refinamento</label>
                <span className="text-xs font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded uppercase">{refinement}</span>
              </div>
              <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                {(['suave', 'medio', 'nitido'] as const).map((r) => (
                  <button 
                    key={r}
                    onClick={() => setRefinement(r)}
                    className={`flex-1 py-1.5 text-[9px] font-bold rounded-lg transition-all capitalize ${
                      refinement === r 
                        ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600' 
                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Background Color (Only for Background tool) */}
          {activeTool === 'background' && (
            <div className="space-y-4 mt-8">
              <div className="flex justify-between items-center">
                <label className="text-sm font-semibold text-slate-900 dark:text-white">Cor de Fundo</label>
                <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded uppercase">{bgColor === 'transparent' ? 'Transparente' : bgColor}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {['transparent', 'white', 'black', 'gray', 'red', 'blue', 'green', 'yellow'].map((color) => (
                  <button 
                    key={color}
                    onClick={() => setBgColor(color)}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      bgColor === color ? 'border-indigo-600 scale-110 shadow-lg' : 'border-transparent hover:scale-105'
                    }`}
                    style={{ 
                      backgroundColor: color === 'transparent' ? 'transparent' : color,
                      backgroundImage: color === 'transparent' ? 'linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%, #ccc), linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%, #ccc)' : 'none',
                      backgroundSize: color === 'transparent' ? '8px 8px' : 'auto',
                      backgroundPosition: color === 'transparent' ? '0 0, 4px 4px' : '0 0'
                    }}
                    title={color === 'transparent' ? 'Transparente' : color}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Mode Toggles (For Object and Background tools) */}
          {(activeTool === 'object' || activeTool === 'background') && (
            <div className="grid grid-cols-3 gap-2 mb-6 p-1 bg-slate-100 dark:bg-slate-800/50 rounded-[2rem]">
              <button 
                onClick={() => setMode('erase')}
                className={`flex flex-col items-center justify-center gap-2 py-4 rounded-3xl transition-all ${
                  mode === 'erase' 
                    ? 'bg-red-500 text-white shadow-lg shadow-red-500/20 scale-105' 
                    : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                <Eraser size={20} />
                <span className="text-[10px] font-black uppercase tracking-wider">Remover</span>
              </button>
              <button 
                onClick={() => setMode('keep')}
                className={`flex flex-col items-center justify-center gap-2 py-4 rounded-3xl transition-all ${
                  mode === 'keep' 
                    ? 'bg-green-500 text-white shadow-lg shadow-green-500/20 scale-105' 
                    : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                <Brush size={20} />
                <span className="text-[10px] font-black uppercase tracking-wider">Manter</span>
              </button>
              <button 
                onClick={() => setMode('restore')}
                className={`flex flex-col items-center justify-center gap-2 py-4 rounded-3xl transition-all ${
                  mode === 'restore' 
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-lg scale-105' 
                    : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                <RotateCcw size={20} />
                <span className="text-[10px] font-black uppercase tracking-wider">Limpar</span>
              </button>
            </div>
          )}
        </div>

        {/* Export Section */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] p-6 shadow-xl shadow-indigo-900/5 mt-auto">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">Exportação</h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Formato de Saída</p>
              <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                {(['PNG', 'JPG', 'WebP'] as const).map((f) => (
                  <button 
                    key={f}
                    onClick={() => setFormat(f)}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                      format === f 
                        ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400' 
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Qualidade</p>
                <span className="text-[10px] font-bold text-slate-900 dark:text-white">{quality}%</span>
              </div>
              <input 
                type="range" 
                min="1" 
                max="100" 
                value={quality}
                onChange={(e) => setQuality(parseInt(e.target.value))}
                className="w-full h-1 bg-slate-200 dark:bg-slate-800 rounded-full appearance-none accent-indigo-600"
              />
            </div>
            <button 
              onClick={handleDownload}
              className="w-full mt-2 py-4 bg-indigo-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-indigo-500/20"
            >
              <Download size={20} />
              Baixar Imagem
            </button>
            <p className="text-[10px] text-center text-slate-500 dark:text-slate-400 font-medium">{format} • {imageMetadata.width}x{imageMetadata.height}px • {imageMetadata.size}</p>
          </div>
        </div>
      </aside>
    </div>
  );
}
