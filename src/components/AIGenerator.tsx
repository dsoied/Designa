import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  Image as ImageIcon, 
  Download, 
  RefreshCw, 
  History, 
  Zap, 
  ArrowRight,
  Wand2,
  Palette,
  Maximize2,
  Layers,
  CheckCircle2,
  X,
  Trash2,
  Loader2,
  Film
} from 'lucide-react';
import { db, auth, addDoc, collection, serverTimestamp, uploadImageToStorage, getDocs, query, where, orderBy, limit, deleteDoc, doc, handleFirestoreError, OperationType, getDoc } from '../firebase';
import { usageService } from '../services/usageService';
import { generateImage, refinePrompt, refinePromptOptions } from '../services/geminiService';

interface AIGeneratorProps {
  userRole?: string;
  onNavigate?: (screen: any, imageData?: string) => void;
}

export default function AIGenerator({ userRole, onNavigate }: AIGeneratorProps) {
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '16:9' | '9:16' | '4:3'>('1:1');
  const [style, setStyle] = useState('none');
  const [selectedModel, setSelectedModel] = useState('flux');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRefining, setIsRefining] = useState(false);
  const [refinementChoices, setRefinementChoices] = useState<string[]>([]);
  const [showRefinementModal, setShowRefinementModal] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedHistoryImage, setSelectedHistoryImage] = useState<{id: string, url: string, prompt: string} | null>(null);
  const [generationHistory, setGenerationHistory] = useState<{id: string, url: string, prompt: string}[]>([]);
  const [pollinationsKey, setPollinationsKey] = useState('');
  const [neroKey, setNeroKey] = useState('');
  const [youcamKey, setYoucamKey] = useState('');

  useEffect(() => {
    const fetchAIConfig = async () => {
      try {
        const aiDoc = await getDoc(doc(db, 'config', 'ai'));
        if (aiDoc.exists()) {
          const data = aiDoc.data();
          setPollinationsKey(data.pollinationsKey || '');
          setNeroKey(data.neroKey || '');
          setYoucamKey(data.youcamKey || '');
        }
      } catch (error) {
        console.error("AIGenerator: Erro ao buscar config de IA:", error);
      }
    };
    fetchAIConfig();
  }, []);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!auth.currentUser) return;
      try {
        const q = query(
          collection(db, 'projects'),
          where('uid', '==', auth.currentUser.uid),
          where('type', '==', 'Geração de Imagem'),
          orderBy('createdAt', 'desc'),
          limit(20)
        );
        const snapshot = await getDocs(q);
        const history = snapshot.docs.map(doc => ({
          id: doc.id,
          url: doc.data().imageUrl,
          prompt: doc.data().prompt || doc.data().name.replace('Geração IA: ', '').replace('...', '')
        }));
        setGenerationHistory(history);
      } catch (error) {
        console.error("Error fetching history:", error);
      }
    };
    fetchHistory();
  }, []);

  const handleDeleteHistoryItem = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Tem certeza que deseja remover esta criação do seu histórico?')) return;
    
    try {
      await deleteDoc(doc(db, 'projects', id));
      setGenerationHistory(prev => prev.filter(item => item.id !== id));
      if (selectedHistoryImage?.id === id) {
        setSelectedHistoryImage(null);
      }
    } catch (error) {
      console.error("Error deleting history item:", error);
    }
  };

  const styles = [
    { id: 'none', name: 'Nenhum (Usar Prompt)', icon: <Sparkles size={14} /> },
    { id: 'photorealistic', name: 'Fotorrealista', icon: <ImageIcon size={14} /> },
    { id: 'digital_art', name: 'Arte Digital', icon: <Palette size={14} /> },
    { id: 'anime', name: 'Anime', icon: <Zap size={14} /> },
    { id: 'oil_painting', name: 'Pintura a Óleo', icon: <Layers size={14} /> },
    { id: '3d_render', name: 'Render 3D', icon: <Maximize2 size={14} /> },
    { id: 'pixar', name: 'Estilo Pixar', icon: <Film size={14} /> },
    { id: 'sketch', name: 'Esboço', icon: <Wand2 size={14} /> },
  ];

  const aiModels = [
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', description: 'Alta velocidade e qualidade artística (Google)', provider: 'google', icon: <Sparkles size={14} className="text-blue-500" /> },
    { id: 'gemini-3-flash', name: 'Gemini 3 Pro', description: 'Realismo extremo e detalhes precisos', provider: 'google', icon: <Sparkles size={14} className="text-indigo-500" /> },
    { id: 'flux', name: 'Flux Pro (Pollinations)', description: 'Qualidade fotográfica superior', provider: 'pollinations', icon: <Sparkles size={14} className="text-purple-500" /> },
    { id: 'turbo', name: 'Turbo (Pollinations)', description: 'Geração ultra rápida', provider: 'pollinations', icon: <Zap size={14} className="text-amber-500" /> },
  ];

  const handleGenerate = async () => {
    if (!auth.currentUser) {
      alert("Você precisa estar logado para gerar imagens.");
      onNavigate?.('signup');
      return;
    }

    if (!prompt.trim()) return;

    setIsGenerating(true);
    setShowSuccess(false);
    setError(null);
    try {
      const selectedModelInfo = aiModels.find(m => m.id === selectedModel);
      const provider = selectedModelInfo?.provider || 'google';
      let finalImageUrl = '';

      if (provider === 'google') {
        console.log(`AIGenerator: Usando Gemini para gerar imagem...`);
        finalImageUrl = await generateImage(prompt, aspectRatio === '1:1' ? '1:1' : aspectRatio === '16:9' ? '16:9' : '1:1');
      } else if (provider === 'pollinations') {
        console.log(`AIGenerator: Usando Pollinations (${selectedModel})...`);
        const width = aspectRatio === '16:9' ? 1280 : aspectRatio === '9:16' ? 720 : 1024;
        const height = aspectRatio === '16:9' ? 720 : aspectRatio === '9:16' ? 1280 : 1024;
        const seed = Math.floor(Math.random() * 1000000);
        finalImageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${width}&height=${height}&seed=${seed}&nologo=true&model=${selectedModel}`;
        
        // Verificação rápida de carregamento
        const img = new Image();
        img.crossOrigin = "anonymous";
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = finalImageUrl;
        });
      }

      if (finalImageUrl) {
        setGeneratedImage(finalImageUrl);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
        
        usageService.incrementUsage(userRole || 'free', 'generate');

        if (auth.currentUser) {
          const fileName = `${provider === 'google' ? 'Gemini' : 'Pollinations'}_Gen_${Date.now()}.png`;
          uploadImageToStorage(finalImageUrl, fileName, `users/${auth.currentUser.uid}/generated`).then(async (storageUrl) => {
            const path = 'projects';
            try {
              const docRef = await addDoc(collection(db, path), {
                id: Date.now().toString(),
                uid: auth.currentUser!.uid,
                name: `Geração ${provider === 'google' ? 'Gemini' : 'Pollinations'}: ${prompt.substring(0, 20)}...`,
                date: new Date().toISOString().split('T')[0],
                createdAt: serverTimestamp(),
                status: 'Finalizado',
                type: 'Geração de Imagem',
                imageUrl: storageUrl,
                prompt: prompt
              });
              setGenerationHistory(prev => [{id: docRef.id, url: finalImageUrl, prompt: prompt}, ...prev].slice(0, 20));
            } catch (error) {
              handleFirestoreError(error, OperationType.WRITE, path);
            }
          }).catch(err => console.error("Error uploading generated image:", err));
        } else {
          setGenerationHistory(prev => [{id: Date.now().toString(), url: finalImageUrl, prompt: prompt}, ...prev].slice(0, 20));
        }
      } else {
        throw new Error("Não foi possível gerar a imagem.");
      }
    } catch (error: any) {
      console.error("Error generating image:", error);
      setError(error.message || "Erro ao gerar imagem.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRefinePrompt = async () => {
    if (!prompt.trim()) return;
    setIsRefining(true);
    try {
      console.log("AIGenerator: Refinando prompt com Gemini (3 opções)...");
      const options = await refinePromptOptions(prompt);
      setRefinementChoices(options);
      setShowRefinementModal(true);
    } catch (err) {
      console.error("Error refining prompt:", err);
    } finally {
      setIsRefining(false);
    }
  };

  const handleDownload = () => {
    if (!generatedImage) return;
    const link = document.createElement('a');
    link.href = generatedImage;
    link.download = `designa-ai-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-4 sm:p-8 lg:p-12 max-w-7xl mx-auto min-h-screen">
      <div className="flex flex-col lg:flex-row gap-8 lg:gap-16">
        {/* Left: Controls */}
        <div className="w-full lg:w-1/3 space-y-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white flex items-center gap-3 tracking-tight">
              <Sparkles className="w-8 h-8 text-indigo-600" />
              Criar com IA
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">Transforme suas ideias em imagens incríveis em segundos.</p>
          </motion.div>

          <div className="space-y-6">
            <div className="space-y-3">
              <label className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">O que você quer criar?</label>
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl blur opacity-0 group-focus-within:opacity-20 transition duration-500"></div>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Ex: Um astronauta andando a cavalo em Marte, estilo cyberpunk, luzes neon..."
                  className="relative w-full h-32 p-5 pr-14 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none transition-all resize-none text-sm sm:text-base text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 shadow-sm"
                />
                <button 
                  onClick={handleRefinePrompt}
                  disabled={isRefining || !prompt.trim()}
                  className="absolute right-3 bottom-3 p-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white rounded-xl shadow-lg shadow-indigo-500/20 transition-all z-10 flex items-center gap-2 group"
                  title="Refinar com Google Gemini"
                >
                  {isRefining ? (
                    <RefreshCw size={18} className="animate-spin" />
                  ) : (
                    <>
                      <Sparkles size={18} className="text-indigo-200" />
                      <span className="text-[10px] font-black uppercase tracking-widest hidden group-hover:block transition-all">Gemini Refine</span>
                    </>
                  )}
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">O que EVITAR (Prompt Negativo)</label>
                <input
                  type="text"
                  value={negativePrompt}
                  onChange={(e) => setNegativePrompt(e.target.value)}
                  placeholder="Ex: mãos extras, deformado, baixa qualidade..."
                  className="w-full p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500/50 transition-all shadow-sm"
                />
              </div>

              <AnimatePresence>
                {suggestions.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-2 overflow-hidden"
                  >
                    <div className="flex items-center justify-between px-1">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sugestões da IA</span>
                      <button 
                        onClick={() => setSuggestions([])}
                        className="text-[10px] font-black text-slate-400 hover:text-red-500 uppercase tracking-widest"
                      >
                        Limpar
                      </button>
                    </div>
                    <div className="space-y-2">
                      {suggestions.map((suggestion, idx) => (
                        <motion.button
                          key={idx}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.1 }}
                          onClick={() => {
                            setPrompt(suggestion);
                            setSuggestions([]);
                          }}
                          className="w-full p-3 text-left text-xs bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 border border-indigo-100 dark:border-indigo-900/50 rounded-xl text-indigo-900 dark:text-indigo-200 transition-all line-clamp-2"
                        >
                          {suggestion}
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Motor de IA (Modelo)</label>
              <div className="grid grid-cols-1 gap-2">
                {aiModels.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setSelectedModel(m.id)}
                    className={`flex flex-col items-start p-4 rounded-2xl border transition-all text-left group ${
                      selectedModel === m.id 
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-500/30' 
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-indigo-600/40 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <div className="flex items-center gap-2">
                        {m.icon}
                        <span className="text-sm font-black">{m.name}</span>
                      </div>
      {/* Model Type Tag */}
      {m.provider === 'pollinations' ? (
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-widest ${selectedModel === m.id ? 'bg-white/20 text-white' : 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600'}`}>
          Grátis
        </span>
      ) : (
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-widest border ${selectedModel === m.id ? 'bg-white/20 border-white/40 text-white' : 'bg-indigo-100 border-indigo-200 dark:bg-indigo-900/10 dark:border-indigo-700/50 text-indigo-600 dark:text-indigo-400'}`}>
          Grátis
        </span>
      )}
                    </div>
                    <span className={`text-[10px] ${selectedModel === m.id ? 'text-indigo-100' : 'text-slate-400 dark:text-slate-500'}`}>
                      {m.description}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Estilo Visual</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-2">
                {styles.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setStyle(s.id)}
                    className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-xs font-bold transition-all ${
                      style === s.id 
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-500/30' 
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-indigo-600/40'
                    }`}
                  >
                    <span className={style === s.id ? 'text-white' : 'text-indigo-600'}>{s.icon}</span>
                    {s.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Formato (Aspect Ratio)</label>
              <div className="flex flex-wrap gap-2">
                {(['1:1', '16:9', '9:16', '4:3'] as const).map((ratio) => (
                  <button
                    key={ratio}
                    onClick={() => setAspectRatio(ratio)}
                    className={`flex-1 min-w-[60px] py-3 rounded-xl border text-xs font-black transition-all ${
                      aspectRatio === ratio 
                        ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white shadow-lg' 
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-400'
                    }`}
                  >
                    {ratio}
                  </button>
                ))}
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim()}
              className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-2xl shadow-indigo-500/30 hover:bg-indigo-700 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>Gerando Arte...</span>
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5 fill-current" />
                  <span>Gerar Imagem</span>
                </>
              )}
            </motion.button>

            {/* Small Preview Area (Requested by user) */}
            {generatedImage && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3"
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
                <div className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                  <img 
                    src={generatedImage} 
                    alt="Current Result" 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <button
                  onClick={() => onNavigate?.('editor', generatedImage)}
                  className="w-full py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-slate-300 dark:hover:bg-slate-700 transition-all"
                >
                  Abrir no Editor
                </button>
              </motion.div>
            )}
          </div>
        </div>

        {/* Right: Preview */}
        <div className="flex-1 min-w-0">
          <div className="bg-slate-50 dark:bg-slate-900/50 rounded-[2.5rem] border-2 border-dashed border-slate-200 dark:border-slate-800 min-h-[400px] sm:min-h-[600px] flex items-center justify-center relative overflow-hidden group shadow-inner">
            <AnimatePresence mode="wait">
              {showSuccess ? (
                <motion.div
                  key="success-toast"
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="absolute top-8 left-1/2 -translate-x-1/2 z-20 bg-green-500 text-white px-6 py-3 rounded-full font-black text-xs uppercase tracking-widest shadow-xl flex items-center gap-2"
                >
                  <CheckCircle2 size={16} />
                  Imagem Gerada com Sucesso!
                </motion.div>
              ) : error ? (
                <motion.div
                  key="error-toast"
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="absolute top-8 left-1/2 -translate-x-1/2 z-20 bg-red-500 text-white px-6 py-3 rounded-full font-black text-xs uppercase tracking-widest shadow-xl flex items-center gap-2"
                >
                  <X size={16} />
                  {error}
                </motion.div>
              ) : generatedImage ? (
                <motion.div
                  key="preview-content"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.05 }}
                  className="w-full h-full flex flex-col items-center justify-center p-4 sm:p-12"
                >
                  <div className="relative group/img max-w-full">
                    <img 
                      src={generatedImage} 
                      alt="Generated" 
                      className="max-w-full max-h-[70vh] rounded-3xl shadow-2xl object-contain border border-white/10"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 rounded-3xl ring-1 ring-inset ring-white/10 pointer-events-none"></div>
                  </div>
                  
                  <div className="mt-8 flex flex-wrap justify-center gap-4">
                    <button
                      onClick={handleDownload}
                      className="flex items-center gap-2 px-8 py-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm"
                    >
                      <Download className="w-5 h-5" />
                      Baixar
                    </button>
                    <button
                      onClick={() => onNavigate?.('editor', generatedImage)}
                      className="flex items-center gap-2 px-8 py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-500/20"
                    >
                      <Wand2 className="w-5 h-5" />
                      Editar
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  key="placeholder"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center space-y-6 p-12"
                >
                  <div className="w-24 h-24 bg-white dark:bg-slate-800 rounded-[2rem] shadow-xl border border-slate-100 dark:border-slate-800 flex items-center justify-center mx-auto text-indigo-600">
                    <ImageIcon className="w-12 h-12" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Sua criação aparecerá aqui</h3>
                    <p className="text-slate-500 dark:text-slate-400 max-w-xs mx-auto font-medium">Descreva o que você imagina no campo ao lado e deixe a nossa IA fazer a mágica.</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {isGenerating && (
              <div className="absolute inset-0 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center z-10">
                <div className="relative">
                  <div className="w-20 h-20 border-4 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Sparkles className="text-indigo-600 animate-pulse" size={24} />
                  </div>
                </div>
                <p className="mt-6 text-indigo-600 font-black uppercase tracking-widest text-xs animate-pulse">A IA está pintando sua ideia...</p>
              </div>
            )}
          </div>

          {/* History */}
          {generationHistory.length > 0 && (
            <div className="mt-16 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                  <History className="w-6 h-6 text-slate-400" />
                  Criações Recentes
                </h3>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{generationHistory.length} imagens</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {generationHistory.map((item, idx) => (
                  <motion.div
                    key={idx}
                    whileHover={{ y: -5, scale: 1.02 }}
                    className="relative aspect-square rounded-2xl overflow-hidden cursor-pointer group border border-slate-200 dark:border-slate-800 shadow-sm"
                  >
                    <img src={item.url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-end p-4 gap-2">
                      <div className="absolute top-2 right-2">
                        <button 
                          onClick={(e) => handleDeleteHistoryItem(item.id, e)}
                          className="p-1.5 bg-red-500/20 hover:bg-red-500 text-white rounded-lg backdrop-blur-md transition-all"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                      <p className="text-[10px] font-bold text-white line-clamp-2 leading-tight">{item.prompt}</p>
                      <div className="flex gap-1">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setGeneratedImage(item.url);
                          }}
                          className="flex-1 py-1.5 bg-white/20 hover:bg-white/40 backdrop-blur-md rounded-lg text-[8px] font-black uppercase text-white transition-colors"
                        >
                          Usar
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedHistoryImage(item);
                          }}
                          className="flex-1 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-[8px] font-black uppercase text-white transition-colors flex items-center justify-center gap-1"
                        >
                          <Maximize2 size={8} />
                          Ver Maior
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showRefinementModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
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
                      setPrompt(choice);
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

        {selectedHistoryImage && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-12">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedHistoryImage(null)}
              className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-5xl bg-slate-900 rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/10 flex flex-col md:flex-row"
            >
              <div className="flex-1 bg-black flex items-center justify-center p-4">
                <img 
                  src={selectedHistoryImage.url} 
                  alt="Full size" 
                  className="max-w-full max-h-[80vh] object-contain shadow-2xl"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="w-full md:w-80 p-8 flex flex-col gap-6 bg-slate-900">
                <div className="flex justify-between items-start">
                  <h4 className="text-xs font-black text-indigo-400 uppercase tracking-widest">Detalhes da Criação</h4>
                  <button 
                    onClick={() => setSelectedHistoryImage(null)}
                    className="p-2 hover:bg-white/10 rounded-full text-slate-400 transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Prompt</p>
                  <p className="text-sm text-white font-medium leading-relaxed">{selectedHistoryImage.prompt}</p>
                </div>
                <div className="mt-auto flex flex-col gap-3">
                  <button
                    onClick={() => {
                      setGeneratedImage(selectedHistoryImage.url);
                      setSelectedHistoryImage(null);
                    }}
                    className="w-full py-4 bg-white text-slate-900 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-100 transition-all"
                  >
                    Usar no Editor
                  </button>
                  <a
                    href={selectedHistoryImage.url}
                    download="designa-ai-creation.png"
                    className="w-full py-4 bg-slate-800 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-700 transition-all flex items-center justify-center gap-2"
                  >
                    <Download size={14} />
                    Baixar Imagem
                  </a>
                  <button
                    onClick={(e) => handleDeleteHistoryItem(selectedHistoryImage.id, e)}
                    className="w-full py-4 bg-red-500/10 text-red-500 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2"
                  >
                    <Trash2 size={14} />
                    Eliminar do Histórico
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
