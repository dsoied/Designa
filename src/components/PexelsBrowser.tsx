import React, { useState, useEffect } from 'react';
import { Search, Image as ImageIcon, Loader2, Download, ExternalLink, AlertCircle, RefreshCw, Video, Film, Eye, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PexelsBrowserProps {
  apiKey: string;
  onSelectImage: (imageUrl: string) => void;
  onClose?: () => void;
}

interface PexelsImage {
  id: number;
  width: number;
  height: number;
  url: string;
  photographer: string;
  src: {
    original: string;
    large2x: string;
    large: string;
    medium: string;
    small: string;
    portrait: string;
    landscape: string;
    tiny: string;
  };
}

interface PexelsVideo {
  id: number;
  width: number;
  height: number;
  url: string;
  user: { name: string };
  image: string; // Preview image
  video_files: {
    id: number;
    quality: string;
    file_type: string;
    width: number;
    height: number;
    link: string;
  }[];
}

export function PexelsBrowser({ apiKey, onSelectImage, onClose }: PexelsBrowserProps) {
  const [query, setQuery] = useState('');
  const [searchType, setSearchType] = useState<'photos' | 'videos'>('photos');
  const [images, setImages] = useState<PexelsImage[]>([]);
  const [videos, setVideos] = useState<PexelsVideo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const searchMedia = async (newSearch = false) => {
    if (!query.trim()) return;
    setIsLoading(true);
    setError(null);
    const targetPage = newSearch ? 1 : page;
    
    try {
      const response = await fetch(`/api/pexels/search?apiKey=${apiKey}&query=${encodeURIComponent(query)}&page=${targetPage}&per_page=20&type=${searchType}`);
      if (!response.ok) {
        throw new Error(`Falha ao buscar ${searchType} no Pexels`);
      }
      const data = await response.json();
      
      if (searchType === 'photos') {
        if (newSearch) {
          setImages(data.photos || []);
          setPage(2);
        } else {
          setImages(prev => [...prev, ...(data.photos || [])]);
          setPage(prev => prev + 1);
        }
      } else {
        if (newSearch) {
          setVideos(data.videos || []);
          setPage(2);
        } else {
          setVideos(prev => [...prev, ...(data.videos || [])]);
          setPage(prev => prev + 1);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    searchMedia(true);
  };

  const handleDownloadOriginal = (e: React.MouseEvent, url: string, name: string) => {
    e.stopPropagation();
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.download = `${name}-pexels.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xl">
      <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-xl">
              <ImageIcon size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-none">Pexels Stock</h3>
              <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-widest font-bold">Imagens Gratuitas</p>
            </div>
          </div>
          {onClose && (
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
              <AlertCircle size={18} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 mb-4">
          <button 
            onClick={() => { setSearchType('photos'); setImages([]); setVideos([]); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-black transition-all ${searchType === 'photos' ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}
          >
            <ImageIcon size={14} /> Fotos
          </button>
          <button 
            onClick={() => { setSearchType('videos'); setImages([]); setVideos([]); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-black transition-all ${searchType === 'videos' ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}
          >
            <Video size={14} /> Vídeos
          </button>
        </div>

        <form onSubmit={handleSearch} className="relative">
          <input 
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por 'natureza', 'tecnologia'..."
            className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all shadow-sm"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <button 
            type="submit"
            className="hidden sm:block absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-all"
          >
            Buscar
          </button>
        </form>
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {error && (
          <div className="flex flex-col items-center justify-center py-10 text-center space-y-3">
            <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-full">
              <AlertCircle size={32} />
            </div>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{error}</p>
            <button onClick={() => searchMedia(true)} className="px-4 py-2 bg-slate-200 dark:bg-slate-800 rounded-xl text-xs font-bold">Tentar novamente</button>
          </div>
        )}

        {!isLoading && images.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
            <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-3xl flex items-center justify-center text-slate-200 dark:text-slate-700">
              <ImageIcon size={40} />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-slate-900 dark:text-white">Nada por aqui ainda</p>
              <p className="text-xs text-slate-500">Busque por algo para ver imagens incríveis.</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <AnimatePresence>
            {searchType === 'photos' ? images.map((img) => (
              <motion.div
                key={img.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                layout
                className="group relative aspect-[4/5] rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 cursor-pointer shadow-sm hover:shadow-xl transition-all"
                onClick={() => onSelectImage(img.src.large2x)}
              >
                <img 
                  src={img.src.medium} 
                  alt={img.photographer}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-[10px] font-bold text-white truncate">@{img.photographer}</p>
                </div>
                <div className="absolute top-2 right-2 flex gap-1">
                  <button 
                    onClick={(e) => handleDownloadOriginal(e, img.src.original, img.photographer)}
                    className="p-1.5 bg-white/90 dark:bg-slate-900/90 rounded-lg text-blue-600 opacity-0 group-hover:opacity-100 transition-all hover:scale-110"
                    title="Baixar Original"
                  >
                    <Download size={12} />
                  </button>
                  <div className="p-1.5 bg-white/90 dark:bg-slate-900/90 rounded-lg text-emerald-600 opacity-0 group-hover:opacity-100 transition-all">
                    <Check size={12} />
                  </div>
                </div>
              </motion.div>
            )) : videos.map((vid) => (
              <motion.div
                key={vid.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                layout
                className="group relative aspect-[4/5] rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 cursor-pointer shadow-sm hover:shadow-xl transition-all"
                onClick={() => window.open(vid.url, '_blank')}
              >
                <img 
                  src={vid.image} 
                  alt={vid.user.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-all">
                  <div className="p-3 bg-white/20 backdrop-blur-md rounded-full text-white border border-white/30">
                    <Video size={20} />
                  </div>
                </div>
                <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-[10px] font-bold text-white truncate">@{vid.user.name}</p>
                </div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    const bestQuality = vid.video_files.sort((a, b) => b.width - a.width)[0];
                    if (bestQuality) window.open(bestQuality.link, '_blank');
                  }}
                  className="absolute top-2 right-2 p-1.5 bg-white/90 dark:bg-slate-900/90 rounded-lg text-blue-600 opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Download size={12} />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {(images.length > 0 || videos.length > 0) && (
          <div className="mt-6 flex justify-center">
            <button
              onClick={() => searchMedia()}
              disabled={isLoading}
              className="px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl text-xs font-black transition-all hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 flex items-center gap-2"
            >
              {isLoading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              {isLoading ? 'Carregando...' : 'Carregar mais'}
            </button>
          </div>
        )}
      </div>

      <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/30 flex items-center justify-center gap-2">
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Powered by Pexels</p>
      </div>
    </div>
  );
}
