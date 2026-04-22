import React, { useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Layers, 
  Palette, 
  Sparkles, 
  Upload, 
  X, 
  Play, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Download,
  Plus,
  Trash2,
  Crown,
  ArrowRight,
  FileArchive
} from 'lucide-react';
import { useBatch } from '../context/BatchContext';

import { Screen, MonetizationSettings } from '../types';
import { AdSection } from './AdSection';

interface BatchProcessorProps {
  userRole?: string;
  onNavigate: (screen: any) => void;
  monetization?: MonetizationSettings | null;
}

export function BatchProcessor({ userRole, onNavigate, monetization }: BatchProcessorProps) {
  const { 
    files, 
    isProcessing, 
    activeTool, 
    setActiveTool, 
    addFiles, 
    removeFile, 
    clearFiles, 
    startBatch,
    downloadAllAsZip
  } = useBatch();
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const tools = [
    { id: 'background', name: 'Remover Fundo', icon: Layers, color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
    { id: 'upscale', name: 'Melhorar Qualidade', icon: Sparkles, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20' },
  ];

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList) return;
    
    const selectedFiles = Array.from(fileList) as File[];
    if (selectedFiles.length === 0) return;

    addFiles(selectedFiles);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleStartBatch = async () => {
    try {
      await startBatch(userRole || 'free');
    } catch (err: any) {
      console.error("Batch: Erro ao iniciar processamento:", err);
    }
  };

  const downloadResult = (url: string, name: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `processado_${name}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const completedCount = files.filter(f => f.status === 'completed').length;

  return (
    <div className="max-w-6xl mx-auto p-6 sm:p-12 space-y-12">
      <AdSection placement="batch" layout="top" monetization={monetization} />
      
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <h2 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">Processamento em Lote</h2>
          <p className="text-slate-500 dark:text-slate-400 max-w-xl">
            Economize tempo processando dezenas de imagens simultaneamente com o poder da nossa IA.
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {completedCount > 1 && (
            <button 
              onClick={downloadAllAsZip}
              className="px-6 py-3 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20"
            >
              <FileArchive size={18} />
              Baixar Tudo (.zip)
            </button>
          )}
          <button 
            onClick={() => onNavigate('history')}
            className="px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all flex items-center gap-2"
          >
            <Layers size={18} />
            Ver Galeria
          </button>
          <button 
            onClick={clearFiles}
            className="px-6 py-3 text-slate-500 font-bold hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            Limpar Lista
          </button>          <button 
            onClick={handleStartBatch}
            disabled={files.length === 0 || isProcessing}
            className={`px-8 py-3 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-indigo-500/20 flex items-center gap-3 transition-all ${
              (files.length === 0 || isProcessing) ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95'
            }`}
          >
            {isProcessing ? <Loader2 className="animate-spin" size={20} /> : <Play size={20} />}
            {isProcessing ? 'Processando...' : 'Iniciar Lote'}
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar: Config */}
        <aside className="lg:col-span-1 space-y-8">
          <section className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Configurações do Lote</h3>
            
            <div className="space-y-3">
              <label className="text-sm font-bold text-slate-900 dark:text-white">Recurso a Aplicar</label>
              <div className="space-y-2">
                {tools.map((tool) => (
                  <button
                    key={tool.id}
                    onClick={() => setActiveTool(tool.id as any)}
                    className={`w-full flex items-center gap-3 p-3 rounded-2xl border-2 transition-all ${
                      activeTool === tool.id 
                        ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-500 text-indigo-600' 
                        : 'bg-slate-50 dark:bg-slate-800/50 border-transparent text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    <div className={`p-2 rounded-xl ${tool.bg} ${tool.color}`}>
                      <tool.icon size={18} />
                    </div>
                    <span className="text-sm font-bold">{tool.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between text-sm mb-4">
                <span className="text-slate-500 font-medium">Total de Arquivos</span>
                <span className="text-slate-900 dark:text-white font-black">{files.length}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500 font-medium">Status do Lote</span>
                <span className={`font-black ${isProcessing ? 'text-indigo-600 animate-pulse' : 'text-slate-900 dark:text-white'}`}>
                  {isProcessing ? 'Em Progresso' : 'Aguardando'}
                </span>
              </div>
            </div>
          </section>

          <AdSection placement="batch" layout="sidebar" monetization={monetization} maxAds={2} />
        </aside>

        {/* Main: File Grid */}
        <main className="lg:col-span-3 space-y-6">
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="group relative h-48 rounded-3xl border-4 border-dashed border-slate-200 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-500 transition-all cursor-pointer flex flex-col items-center justify-center gap-4 bg-slate-50/50 dark:bg-slate-900/30"
          >
            <input 
              type="file" 
              multiple 
              ref={fileInputRef} 
              onChange={handleFileSelect} 
              className="hidden" 
              accept="image/*"
            />
            <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl shadow-sm group-hover:scale-110 transition-transform">
              <Plus className="text-indigo-600" size={32} />
            </div>
            <div className="text-center">
              <p className="text-lg font-black text-slate-900 dark:text-white">Adicionar Imagens ao Lote</p>
              <p className="text-sm text-slate-500 font-medium">Clique para selecionar ou arraste arquivos aqui</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            <AnimatePresence mode="popLayout">
              {files.map((file) => (
                <motion.div
                  key={file.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm group relative"
                >
                  <div className="relative aspect-video rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 mb-4">
                    <img src={file.preview} alt="Preview" className="w-full h-full object-cover" />
                    
                    {/* Status Overlays */}
                    {file.status === 'processing' && (
                      <div className="absolute inset-0 bg-indigo-600/40 backdrop-blur-sm flex flex-col items-center justify-center text-white gap-2">
                        <Loader2 className="animate-spin" size={32} />
                        <span className="text-xs font-black uppercase tracking-widest">{file.progress}%</span>
                      </div>
                    )}
                    {file.status === 'completed' && (
                      <div className="absolute inset-0 bg-emerald-500/40 backdrop-blur-sm flex items-center justify-center text-white">
                        <CheckCircle2 size={48} />
                      </div>
                    )}
                    {file.status === 'error' && (
                      <div className="absolute inset-0 bg-red-500/40 backdrop-blur-sm flex flex-col items-center justify-center text-white p-4 text-center">
                        <AlertCircle size={32} className="mb-2" />
                        <span className="text-[10px] font-bold leading-tight">{file.error}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{file.file.name}</p>
                      <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">
                        {(file.file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      {file.status === 'completed' && file.resultUrl && (
                        <button 
                          onClick={() => downloadResult(file.resultUrl!, file.file.name)}
                          className="p-2 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-xl transition-colors"
                          title="Baixar Resultado"
                        >
                          <Download size={18} />
                        </button>
                      )}
                      <button 
                        onClick={() => removeFile(file.id)}
                        disabled={file.status === 'processing'}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors disabled:opacity-30"
                        title="Remover"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  {file.status === 'processing' && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-100 dark:bg-slate-800 overflow-hidden rounded-b-3xl">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${file.progress}%` }}
                        className="h-full bg-indigo-600"
                      />
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {files.length === 0 && (
            <div className="py-20 text-center space-y-4">
              <div className="inline-flex p-6 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-300">
                <Upload size={48} />
              </div>
              <div className="space-y-1">
                <p className="text-xl font-bold text-slate-400">Nenhum arquivo na fila</p>
                <p className="text-sm text-slate-500">Adicione imagens para começar o processamento em lote.</p>
              </div>
            </div>
          )}
        </main>
      </div>

      <AdSection placement="batch" layout="bottom" monetization={monetization} />
    </div>
  );
}
