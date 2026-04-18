import { ZoomIn, ZoomOut, Undo, Redo, Eraser, Brush, Download, Upload, RotateCcw, Sparkles, Layers, ImageIcon, AlignCenter, RefreshCw, Library, Zap, Wand2, Plus, Loader2, AlertCircle, X } from 'lucide-react';
import React, { useState, useEffect, useRef, ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { db, auth, addDoc, collection, storage, ref, uploadString, getDownloadURL, serverTimestamp, uploadImageToStorage, handleFirestoreError, OperationType, doc, getDoc } from '../firebase';
import { usageService } from '../services/usageService';
import { WelcomeTour } from './WelcomeTour';
import { PexelsBrowser } from './PexelsBrowser';

interface EditorProps {
  imageUrl: string | null;
  onNavigate?: (screen: any, imageData?: string) => void;
  initialTool?: 'background';
  userRole?: string;
  notify?: (title: string, message: string, type?: 'success' | 'error' | 'info') => void;
}

import { trackImageProcessed } from '../services/analyticsService';
import { generateImage, refinePrompt, refinePromptOptions } from '../services/geminiService';

export function Editor({ imageUrl, onNavigate, initialTool = 'background', userRole, notify }: EditorProps) {
  console.log('Editor: Renderizando. imageUrl:', imageUrl ? 'presente (tamanho: ' + imageUrl.length + ')' : 'ausente');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [brushSize, setBrushSize] = useState(24);
  const [sensitivity, setSensitivity] = useState(75);
  const [quality, setQuality] = useState(100);
  const [mode, setMode] = useState<'erase' | 'restore' | 'keep'>('erase');
  const [activeTool, setActiveTool] = useState<'background' | 'templates' | 'stock' | 'ai_generate'>(initialTool as any);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiAspectRatio, setAiAspectRatio] = useState<'1:1' | '4:3' | '16:9'>('1:1');
  const [refinementChoices, setRefinementChoices] = useState<string[]>([]);
  const [showRefinementModal, setShowRefinementModal] = useState(false);
  const [format, setFormat] = useState<'PNG' | 'JPG' | 'WebP'>('PNG');
  const [bgColor, setBgColor] = useState<string>('transparent');
  const [bgEngine, setBgEngine] = useState<'clippingmagic' | 'iloveimg'>('clippingmagic');
  const [dynaPicturesKey, setDynaPicturesKey] = useState<string>('');
  const [pexelsKey, setPexelsKey] = useState<string>('');
  const [selectedDesignId, setSelectedDesignId] = useState<string>('');
  const [templateParams, setTemplateParams] = useState<Record<string, any>>({});
  const [clippingMagicKey, setClippingMagicKey] = useState<string>('');
  const [availableDesigns, setAvailableDesigns] = useState<any[]>([]);
  const [isFetchingDesigns, setIsFetchingDesigns] = useState(false);
  const [refinement, setRefinement] = useState<'suave' | 'medio' | 'nitido'>('medio');

  useEffect(() => {
    const fetchAIConfig = async () => {
      try {
        const aiConfigRef = doc(db, 'config', 'ai');
        const snap = await getDoc(aiConfigRef);
        if (snap.exists()) {
          const data = snap.data();
          if (data.clippingMagicKey) setClippingMagicKey(data.clippingMagicKey);
          if (data.dynaPicturesKey) setDynaPicturesKey(data.dynaPicturesKey);
          if (data.pexelsKey) setPexelsKey(data.pexelsKey);
        }
      } catch (error) {
        console.error("Editor: Erro ao buscar config de IA:", error);
      }
    };
    fetchAIConfig();
  }, []);

  useEffect(() => {
    if (activeTool === 'templates' && dynaPicturesKey && availableDesigns.length === 0) {
      const fetchDesigns = async () => {
        setIsFetchingDesigns(true);
        try {
          const response = await fetch(`/api/dynapictures/designs?apiKey=${dynaPicturesKey}`);
          if (response.ok) {
            const data = await response.json();
            setAvailableDesigns(data.items || []);
            if (data.items?.length > 0) {
              setSelectedDesignId(data.items[0].id);
            }
          }
        } catch (error) {
          console.error("Editor: Erro ao buscar designs:", error);
        } finally {
          setIsFetchingDesigns(false);
        }
      };
      fetchDesigns();
    }
  }, [activeTool, dynaPicturesKey]);

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
              const maxSize = 20 * 1024 * 1024; // 20MB limit for everyone
              if (blob.size > maxSize) {
                console.log(`Editor: Imagem colada excede o limite de ${maxSize / 1024 / 1024}MB`);
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

  const handleApplyChanges = async () => {
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

    const isPro = true; // Everything is free now

    setIsProcessing(true);
    setProcessedImage(null);
    setViewMode('original');

    try {
      // Logic for AI Image Generation (Gemini)
      if (activeTool === 'ai_generate') {
         if (!aiPrompt.trim()) {
           if (notify) notify('Aviso', 'Por favor, insira um comando para gerar a imagem.', 'info');
           setIsProcessing(false);
           return;
         }

         console.log(`Editor: Gerando imagem com Gemini (Flash 2.5)... Prompt: ${aiPrompt}`);
         
         // 1. Refine prompt (optional but recommended for better results)
         const finalPrompt = await refinePrompt(aiPrompt);
         console.log(`Editor: Prompt refinado: ${finalPrompt}`);

         // 2. Generate
         const resultUrl = await generateImage(finalPrompt, aiAspectRatio);

         if (resultUrl) {
            setProcessedImage(resultUrl);
            setViewMode('compare');
            addToHistory(resultUrl);
            trackImageProcessed('ai_generate');
            
            if (auth.currentUser) {
              const fileName = `AI_Gen_${Date.now()}.png`;
              const storageUrl = await uploadImageToStorage(resultUrl, fileName, `users/${auth.currentUser.uid}/projects`);
              await addDoc(collection(db, 'projects'), {
                uid: auth.currentUser.uid,
                name: fileName,
                date: new Date().toISOString().split('T')[0],
                createdAt: serverTimestamp(),
                status: 'Finalizado',
                type: 'Geração por IA (Gemini)',
                imageUrl: storageUrl
              });
            }

            setIsProcessing(false);
            if (notify) notify('Sucesso', 'Imagem gerada com IA!', 'success');
            return;
         } else {
           throw new Error("Nenhum resultado recebido da geração de imagem.");
         }
      }

      // Logic for DynaPictures
      if (activeTool === 'templates') {
        if (!dynaPicturesKey) {
          if (notify) notify('Chave Necessária', 'Configure sua chave DynaPictures nas configurações.', 'info');
          setIsProcessing(false);
          return;
        }
        if (!selectedDesignId) {
          if (notify) notify('Design Necessário', 'Selecione um design para processar.', 'info');
          setIsProcessing(false);
          return;
        }

        console.log(`Editor: Usando DynaPictures (Design: ${selectedDesignId})...`);
        const response = await fetch('/api/dynapictures/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            apiKey: dynaPicturesKey,
            designId: selectedDesignId,
            params: templateParams
          })
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || 'Erro na DynaPictures API');
        }

        const data = await response.json();
        const resultUrl = data.imageUrl || data.image_url;

        if (resultUrl) {
          setProcessedImage(resultUrl);
          setViewMode('compare');
          addToHistory(resultUrl);
          trackImageProcessed(`dynapictures_${selectedDesignId}`);
          
          if (auth.currentUser) {
            const fileName = `Dyna_${Date.now()}.png`;
            const storageUrl = await uploadImageToStorage(resultUrl, fileName, `users/${auth.currentUser.uid}/projects`);
            await addDoc(collection(db, 'projects'), {
              uid: auth.currentUser.uid,
              name: fileName,
              date: new Date().toISOString().split('T')[0],
              createdAt: serverTimestamp(),
              status: 'Finalizado',
              type: 'DynaPictures Template',
              imageUrl: storageUrl
            });
          }

          setIsProcessing(false);
          if (notify) notify('Sucesso', 'Template processado com sucesso!', 'success');
          return;
        } else {
          throw new Error("Nenhum resultado recebido da DynaPictures API");
        }
      }

      // Logic for tools that use Clipping Magic
      if (activeTool === 'background') {
        if (bgEngine === 'clippingmagic') {
          try {
            console.log("Editor: Usando Clipping Magic...");
            let response = await fetch("/api/remove-background", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ image: displayImage, test: false, engine: bgEngine })
            });
            
            // If it fails with 402 (Payment Required), try test mode as fallback
            if (response.status === 402 && bgEngine === 'clippingmagic') {
              console.warn("Editor: Clipping Magic sem créditos, tentando modo teste...");
              response = await fetch("/api/remove-background", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ image: displayImage, test: true, engine: 'clippingmagic' })
              });
              if (response.ok && notify) {
                notify('Modo Teste', 'Usando modo de teste do Clipping Magic (pode conter marca d\'água).', 'info');
              }
            }

            if (!response.ok) {
              const errData = await response.json();
              throw new Error(errData.error || `Erro no Clipping Magic: ${response.status}`);
            }

            const data = await response.json();
            if (data.image) {
                const resultUrl = data.image;
                setProcessedImage(resultUrl);
                setViewMode('compare');
                addToHistory(resultUrl);
                trackImageProcessed(activeTool);
                
                if (auth.currentUser) {
                  const fileName = `ClipMagic_${Date.now()}.png`;
                  const storageUrl = await uploadImageToStorage(resultUrl, fileName, `users/${auth.currentUser.uid}/projects`);
                  await addDoc(collection(db, 'projects'), {
                    uid: auth.currentUser.uid,
                    name: fileName,
                    date: new Date().toISOString().split('T')[0],
                    createdAt: serverTimestamp(),
                    status: 'Finalizado',
                    type: 'Remoção de Fundo (Clipping Magic)',
                    imageUrl: storageUrl
                  });
                }

                setIsProcessing(false);
                if (notify) notify('Sucesso', 'Fundo removido com Clipping Magic.', 'success');
                return;
              }
          } catch (cmErr) {
            console.error("Editor: Erro no Clipping Magic:", cmErr);
            if (notify) notify('Erro Clipping Magic', 'Falha no processamento', 'error');
            setIsProcessing(false);
            return;
          }
        }
      }

      throw new Error("Esta ferramenta requer uma API dedicada configurada.");

    } catch (error) {
      console.error('Editor: Erro fatal no processamento:', error);
      if (notify) notify('Erro de Processamento', error instanceof Error ? error.message : 'Falha ao processar imagem', 'error');
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

    // Multi-tier limit: 20MB for everyone
    const limit = 20 * 1024 * 1024;
    if (file.size > limit) {
      const msg = 'O arquivo excede o limite de 20MB.';
      if (notify) {
        notify('Erro de Tamanho', msg, 'error');
      } else {
        alert(msg);
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

    if (activeTool === 'background' && isDrawing && maskCanvasRef.current && !isPanning) {
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

    if (activeTool === 'background' && maskCanvasRef.current) {
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
                    handleApplyChanges();
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
              {activeTool === 'background' ? 'Remover Fundo' : 
               activeTool === 'templates' ? 'Templates Dinâmicos' : 'Biblioteca Pexels'}
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
              {activeTool === 'background' ? 'Isole o objeto principal com precisão de IA.' : 
               activeTool === 'templates' ? 'Crie artes incríveis com designs prontos.' : 'Busque milhões de fotos gratuitas de alta qualidade.'}
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
                    className={`relative w-full h-full flex items-center justify-center p-4 md:p-8 z-10 ${activeTool === 'background' ? 'cursor-none' : ''}`}
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
                  {activeTool === 'background' && isMouseOverImage && !isProcessing && (
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
                  {activeTool === 'background' && (
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
                {activeTool === 'templates' ? 'DynaPictures Templates' :
                 activeTool === 'stock' ? 'Biblioteca Pexels' :
                 activeTool === 'background' ? 'Remover Fundo' : 
                 activeTool === 'ai_generate' ? 'Gerar com IA' : 'Modo de Edição'}
              </h3>
              <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
            </div>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-200 dark:bg-slate-800 rounded-2xl">
              <button 
                onClick={() => {
                  setActiveTool('background');
                  setViewMode('original');
                }}
                className={`flex flex-col items-center gap-1 py-1.5 px-1 text-[8px] md:text-[9px] font-bold rounded-xl transition-all ${
                  activeTool === 'background' 
                    ? 'bg-white dark:bg-slate-700 shadow-lg text-indigo-600' 
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <ImageIcon size={12} />
                Remover Fundo
              </button>
              <button 
                onClick={() => {
                  setActiveTool('ai_generate');
                  setViewMode('original');
                }}
                className={`flex flex-col items-center gap-1 py-1.5 px-1 text-[8px] md:text-[9px] font-bold rounded-xl transition-all ${
                  activeTool === 'ai_generate' 
                    ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg' 
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <Sparkles size={12} className={activeTool === 'ai_generate' ? 'text-white' : 'text-indigo-500'} />
                Gerar com IA
              </button>
              <button 
                onClick={() => {
                  setActiveTool('templates');
                  setViewMode('original');
                }}
                className={`flex flex-col items-center gap-1 py-1.5 px-1 text-[8px] md:text-[9px] font-bold rounded-xl transition-all ${
                  activeTool === 'templates' 
                    ? 'bg-white dark:bg-slate-700 shadow-lg text-indigo-600 border border-indigo-500/20' 
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <Zap size={12} className="text-pink-500" />
                Templates
              </button>
              <button 
                onClick={() => {
                  setActiveTool('stock');
                  setViewMode('original');
                }}
                className={`flex flex-col items-center gap-1 py-1.5 px-1 text-[8px] md:text-[9px] font-bold rounded-xl transition-all ${
                  activeTool === 'stock' 
                    ? 'bg-blue-600 text-white shadow-lg' 
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <Library size={12} />
                Pexels
              </button>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400 mb-6">Recursos de Ajuste</h3>
            
            {/* AI Generation Settings */}
            {activeTool === 'ai_generate' && (
              <div className="space-y-6 mb-8 animate-in fade-in slide-in-from-top-1 duration-300">
                <div className="space-y-3">
                  <label className="text-sm font-bold text-slate-800 dark:text-slate-200 block">Comando (Prompt)</label>
                  <div className="relative">
                    <textarea
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      placeholder="Ex: Um astronauta andando a cavalo na Lua, estilo cinematográfico..."
                      className="w-full h-32 p-4 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl text-sm focus:border-indigo-500 focus:ring-0 transition-all resize-none shadow-inner"
                    />
                    <button 
                      onClick={() => {
                        setIsProcessing(true);
                        refinePromptOptions(aiPrompt).then(res => {
                          setRefinementChoices(res);
                          setShowRefinementModal(true);
                          setIsProcessing(false);
                        });
                      }}
                      className="absolute bottom-3 right-3 p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-all"
                      title="Refinar com IA"
                    >
                      <Wand2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-bold text-slate-800 dark:text-slate-200 block">Proporção</label>
                  <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                    {(['1:1', '4:3', '16:9'] as const).map((ratio) => (
                      <button 
                        key={ratio}
                        onClick={() => setAiAspectRatio(ratio)}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                          aiAspectRatio === ratio 
                            ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600' 
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        {ratio}
                      </button>
                    ))}
                  </div>
                </div>

                <button 
                  onClick={handleApplyChanges}
                  disabled={isProcessing || !aiPrompt.trim()}
                  className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-indigo-500/20 disabled:opacity-50 disabled:scale-100"
                >
                  {isProcessing ? <Loader2 size={20} className="animate-spin" /> : <Sparkles size={20} />}
                  Gerar Imagem
                </button>
              </div>
            )}

            {/* Background tool info */}
            {activeTool === 'background' && (
              <div className="flex items-center justify-center gap-2 p-3 bg-indigo-50 dark:bg-indigo-950/30 rounded-2xl border border-indigo-100 dark:border-indigo-900/50 mb-6">
                <Layers size={16} className="text-indigo-600" />
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 leading-none mb-1">Motor Ativo</span>
                  <span className="text-[12px] font-bold text-slate-700 dark:text-slate-300 leading-none">Clipping Magic Pro</span>
                </div>
              </div>
            )}

            {/* Brush Size (For Background tool) */}
            {activeTool === 'background' && (
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

            {/* DynaPictures Templates */}
            {activeTool === 'templates' && (
              <div className="space-y-6 mb-8">
                <div className="space-y-4">
                  <div className="flex justify-between items-center px-1">
                    <label className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-tight">Modelos Dinâmicos</label>
                  </div>
                  
                  {isFetchingDesigns ? (
                    <div className="flex flex-col items-center justify-center py-10 gap-3 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl">
                      <Loader2 size={24} className="animate-spin text-indigo-600" />
                      <span className="text-xs text-slate-400">Buscando seus designs...</span>
                    </div>
                  ) : availableDesigns.length > 0 ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 gap-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                        {availableDesigns.map((design) => (
                          <button
                            key={design.id}
                            onClick={() => setSelectedDesignId(design.id)}
                            className={`flex items-center gap-3 p-3 rounded-2xl border-2 transition-all text-left ${
                              selectedDesignId === design.id 
                                ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-500 text-indigo-600' 
                                : 'bg-white dark:bg-slate-800 border-transparent text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'
                            }`}
                          >
                            <div className="w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-700 overflow-hidden">
                              <img src={design.thumbnail_url || 'https://picsum.photos/seed/template/50/50'} className="w-full h-full object-cover" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-[11px] font-bold truncate">{design.name || 'Sem nome'}</div>
                              <div className="text-[9px] opacity-70">ID: {design.id}</div>
                            </div>
                          </button>
                        ))}
                      </div>

                      {/* Manual Design ID Input as fallback */}
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800"></div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Ou insira o ID manualmente</label>
                        <input 
                          type="text"
                          value={selectedDesignId}
                          onChange={(e) => setSelectedDesignId(e.target.value)}
                          placeholder="ID do Design no DynaPictures"
                          className="w-full px-4 py-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center text-center p-6 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/50 rounded-2xl gap-3">
                      <AlertCircle className="text-amber-500" />
                      <p className="text-[10px] text-amber-700 dark:text-amber-400 leading-relaxed font-bold">
                        Não encontramos designs na sua conta. Crie um template no painel do DynaPictures e ele aparecerá aqui.
                      </p>
                      <a 
                        href="https://dynapictures.com/dashboard/designs" 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-[10px] px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-all font-black"
                      >
                        Ir para o Painel
                      </a>
                    </div>
                  )}
                </div>

                <div className="bg-pink-50 dark:bg-pink-900/10 p-4 rounded-2xl border border-pink-100 dark:border-pink-800/50">
                  <h5 className="text-[10px] font-black uppercase text-pink-600 mb-2">Automação Criativa</h5>
                  <p className="text-[10px] text-pink-700/70 dark:text-pink-400/70 leading-relaxed">
                    Transforme seus templates do DynaPictures em imagens reais com dados variáveis instantaneamente.
                  </p>
                </div>
              </div>
            )}

            {/* Pexels Stock Browser */}
            {activeTool === 'stock' && (
              <div className="h-[500px] mb-8">
                {pexelsKey ? (
                  <PexelsBrowser 
                    apiKey={pexelsKey} 
                    onSelectImage={(url) => {
                      if (window.confirm('Deseja carregar esta imagem do Pexels como base para o editor? Suas alterações não salvas serão perdidas.')) {
                        onNavigate?.('editor', url);
                        setActiveTool('background');
                      }
                    }}
                  />
                ) : (
                  <div className="flex flex-col items-center text-center p-6 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800/50 rounded-2xl gap-3">
                    <ImageIcon className="text-blue-500" />
                    <p className="text-[10px] text-blue-700 dark:text-blue-400 leading-relaxed font-bold">
                      A chave do Pexels não foi configurada. Vá em configurações para ativar o banco de imagens.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* DynaPictures Templates */}

            {/* DynaPictures Templates */}

            {/* Stock Browser */}


      {/* Tool Selection Section (from sidebar) */}
      {/* Remove magic, outpaint, variations, filters, layers, crop sections */}

            {/* Sensitivity Slider */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-sm font-semibold text-slate-900 dark:text-white">Sensibilidade</label>
                <span className="text-xs font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded">
                  {sensitivity}%
                </span>
              </div>
              <input 
                type="range" 
                min="1" 
                max="100" 
                value={sensitivity}
                onChange={(e) => setSensitivity(parseInt(e.target.value))}
                className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full appearance-none cursor-pointer accent-indigo-600"
              />
            </div>
          </div>

          {/* Refinement (Only for Background tool) */}
          {activeTool === 'background' && (
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

          {/* Background Engine (Only for Background tool) */}
          {activeTool === 'background' && (
            <div className="space-y-4 mb-6">
              <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Motor de IA</label>
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800/50 rounded-2xl">
                {(['clippingmagic', 'iloveimg'] as const).map((eng) => (
                  <button
                    key={eng}
                    onClick={() => setBgEngine(eng)}
                    className={`py-2 text-[10px] font-black uppercase tracking-tighter rounded-xl transition-all ${
                      bgEngine === eng
                        ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600'
                        : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                    }`}
                  >
                    {eng === 'clippingmagic' ? 'Clipping Magic' : 'iLoveIMG'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Mode Toggles (For Background tool) */}
          {activeTool === 'background' && (
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

      <AnimatePresence>
        {showRefinementModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowRefinementModal(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl border border-slate-200 dark:border-slate-800 p-8 flex flex-col gap-6"
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 rounded-xl">
                    <Wand2 size={20} />
                  </div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white">Escolha o melhor Refinamento</h3>
                </div>
                <button 
                  onClick={() => setShowRefinementModal(false)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-500 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                {refinementChoices.map((choice, idx) => (
                  <motion.button
                    key={idx}
                    whileHover={{ scale: 1.01, x: 5 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => {
                      setAiPrompt(choice);
                      setShowRefinementModal(false);
                    }}
                    className="w-full p-6 text-left bg-slate-50 dark:bg-slate-800/50 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 border border-slate-200 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-800 rounded-2xl transition-all group"
                  >
                    <div className="flex items-center gap-3 mb-2">
                       <span className="px-2 py-0.5 bg-indigo-600 text-[10px] font-black text-white rounded uppercase tracking-tighter">Opção {idx + 1}</span>
                    </div>
                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium">{choice}</p>
                  </motion.button>
                ))}
              </div>
              <p className="text-[10px] text-slate-500 text-center uppercase tracking-widest font-bold">Gerado pelo Google Gemini</p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
