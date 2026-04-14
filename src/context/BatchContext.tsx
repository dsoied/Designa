import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { db, auth, addDoc, collection, serverTimestamp, uploadImageToStorage } from '../firebase';
import { usageService } from '../services/usageService';
import JSZip from 'jszip';

export interface BatchFile {
  id: string;
  file: File;
  preview: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  resultUrl?: string;
  error?: string;
  progress: number;
}

interface BatchContextType {
  files: BatchFile[];
  isProcessing: boolean;
  activeTool: 'background' | 'filters' | 'upscale';
  setActiveTool: (tool: 'background' | 'filters' | 'upscale') => void;
  addFiles: (newFiles: File[]) => void;
  removeFile: (id: string) => void;
  clearFiles: () => void;
  startBatch: (userRole: string) => Promise<void>;
  downloadAllAsZip: () => Promise<void>;
}

const BatchContext = createContext<BatchContextType | undefined>(undefined);

export function BatchProvider({ children }: { children: React.ReactNode }) {
  const [files, setFiles] = useState<BatchFile[]>([]);
  const [activeTool, setActiveTool] = useState<'background' | 'filters' | 'upscale'>('background');
  const [isProcessing, setIsProcessing] = useState(false);

  const addFiles = useCallback((newFiles: File[]) => {
    const batchFiles: BatchFile[] = newFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      preview: URL.createObjectURL(file),
      status: 'pending',
      progress: 0
    }));
    setFiles(prev => [...prev, ...batchFiles]);
  }, []);

  const removeFile = useCallback((id: string) => {
    setFiles(prev => {
      const file = prev.find(f => f.id === id);
      if (file) URL.revokeObjectURL(file.preview);
      return prev.filter(f => f.id !== id);
    });
  }, []);

  const clearFiles = useCallback(() => {
    files.forEach(f => URL.revokeObjectURL(f.preview));
    setFiles([]);
  }, [files]);

  const processSingleFile = async (batchFile: BatchFile, tool: string) => {
    try {
      setFiles(prev => prev.map(f => f.id === batchFile.id ? { ...f, status: 'processing', progress: 10 } : f));

      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(batchFile.file);
      });

      const base64Data = await base64Promise;
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
      const ai = new GoogleGenAI({ apiKey });
      
      let prompt = "";
      if (tool === 'background') {
        prompt = "Act as an expert AI image segmentation engine. Your goal is to perform a high-precision background removal. Detect the primary subject and isolate it perfectly. Output ONLY the resulting image as a base64-encoded PNG with transparency (alpha channel). The background must be completely transparent. Do not provide any text, markdown, or conversational response. Just the image data.";
      } else if (tool === 'filters') {
        prompt = "Act as an expert AI image filtering engine. Your goal is to apply a vibrant artistic filter to this photograph. Enhance colors, mood, and overall aesthetic. Output ONLY the resulting image as a base64-encoded PNG. Do not provide any text, markdown, or conversational response. Just the image data.";
      } else {
        prompt = "Act as an expert AI image enhancement engine. Your goal is to upscale this image to high resolution while preserving and enhancing details. Output ONLY the resulting image as a base64-encoded PNG. Do not provide any text, markdown, or conversational response. Just the image data.";
      }

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-image",
        contents: {
          parts: [
            { text: prompt },
            { inlineData: { data: base64Data.split(',')[1], mimeType: batchFile.file.type } }
          ]
        },
        config: {
          candidateCount: 1
        }
      });

      const resultPart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
      if (!resultPart?.inlineData?.data) throw new Error('IA não retornou imagem');

      const resultBase64 = resultPart.inlineData.data;
      const resultUrl = `data:image/png;base64,${resultBase64}`;
      
      setFiles(prev => prev.map(f => f.id === batchFile.id ? { ...f, progress: 70 } : f));

      const storageUrl = await uploadImageToStorage(resultUrl, `batch_${Date.now()}_${batchFile.file.name}`, `users/${auth.currentUser?.uid}/batch`);

      await addDoc(collection(db, 'projects'), {
        id: Date.now().toString(),
        uid: auth.currentUser?.uid,
        name: `Lote_${batchFile.file.name}`,
        date: new Date().toISOString().split('T')[0],
        createdAt: serverTimestamp(),
        status: 'Finalizado',
        type: `Lote: ${tool}`,
        imageUrl: storageUrl
      });

      setFiles(prev => prev.map(f => f.id === batchFile.id ? { ...f, status: 'completed', resultUrl: storageUrl, progress: 100 } : f));

    } catch (error: any) {
      console.error('Erro no lote:', error);
      setFiles(prev => prev.map(f => f.id === batchFile.id ? { ...f, status: 'error', error: error.message || 'Erro desconhecido' } : f));
    }
  };

  const startBatch = async (userRole: string) => {
    if (isProcessing || files.length === 0) return;

    if (userRole !== 'pro' && userRole !== 'admin') {
      throw new Error('PRO_REQUIRED');
    }

    setIsProcessing(true);
    const pendingFiles = files.filter(f => f.status === 'pending' || f.status === 'error');
    
    for (const file of pendingFiles) {
      await processSingleFile(file, activeTool);
      // Increment usage for each file in batch (though Pro is unlimited)
      await usageService.incrementUsage(userRole, activeTool, 1);
    }

    setIsProcessing(false);
  };

  const downloadAllAsZip = async () => {
    const completedFiles = files.filter(f => f.status === 'completed' && f.resultUrl);
    if (completedFiles.length === 0) return;

    const zip = new JSZip();
    const folder = zip.folder("imagens_processadas");

    for (const file of completedFiles) {
      const response = await fetch(file.resultUrl!);
      const blob = await response.blob();
      folder?.file(`processado_${file.file.name.split('.')[0]}.png`, blob);
    }

    const content = await zip.generateAsync({ type: "blob" });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(content);
    link.download = "lote_designa.zip";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <BatchContext.Provider value={{ 
      files, 
      isProcessing, 
      activeTool, 
      setActiveTool, 
      addFiles, 
      removeFile, 
      clearFiles, 
      startBatch,
      downloadAllAsZip
    }}>
      {children}
    </BatchContext.Provider>
  );
}

export function useBatch() {
  const context = useContext(BatchContext);
  if (context === undefined) {
    throw new Error('useBatch must be used within a BatchProvider');
  }
  return context;
}
