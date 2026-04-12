import React, { useState, useRef, useEffect } from 'react';
import { CloudUpload, ArrowRight, ChevronRight, Layers, Eraser, Sparkles, ExternalLink, Plus, Crown, Zap, DollarSign } from 'lucide-react';
import { motion } from 'motion/react';
import { db, auth, collection, query, where, orderBy, onSnapshot, limit, getDoc, doc } from '../firebase';
import { Project, MonetizationSettings, FooterSettings, AppConfig } from '../types';
import { UserUsage } from '../services/usageService';
import { ContactSection } from './ContactSection';
import { AffiliateBanner } from './AffiliateBanner';
import { Footer } from './Footer';

interface HomeProps {
  onNavigate: (screen: any, imageData?: string) => void;
  selectedImage: string | null;
  userRole?: string;
  onOpenPricing: () => void;
  appConfig?: AppConfig;
  monetization?: MonetizationSettings | null;
  footerSettings?: FooterSettings | null;
}

export function Home({ onNavigate, selectedImage, userRole, onOpenPricing, appConfig, monetization, footerSettings }: HomeProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [recentProjects, setRecentProjects] = useState<Project[]>([]);
  const [usage, setUsage] = useState<UserUsage | null>(null);

  useEffect(() => {
    const fetchUsage = async () => {
      if (auth.currentUser) {
        const usageRef = doc(db, 'usage', auth.currentUser.uid);
        const snap = await getDoc(usageRef);
        if (snap.exists()) {
          setUsage(snap.data() as UserUsage);
        }
      }
    };
    fetchUsage();
  }, []);

  useEffect(() => {
    if (!auth.currentUser) {
      setRecentProjects([]);
      return;
    }

    const q = query(
      collection(db, 'projects'),
      where('uid', '==', auth.currentUser.uid),
      orderBy('createdAt', 'desc'),
      limit(3)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedProjects = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as Project[];
      setRecentProjects(fetchedProjects);
    }, (error) => {
      console.error('Home: Erro ao buscar projetos recentes:', error);
    });

    return () => unsubscribe();
  }, []);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const processFile = (file: File) => {
    console.log('Home: Processando arquivo:', file.name, file.type, file.size);
    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione apenas arquivos de imagem.');
      return;
    }

    // Free user limit: 2MB, Pro/Admin: 20MB
    const limit = (userRole === 'pro' || userRole === 'admin') ? 20 * 1024 * 1024 : 2 * 1024 * 1024;
    if (file.size > limit) {
      if (userRole !== 'pro' && userRole !== 'admin') {
        alert('O arquivo é muito grande para o plano gratuito (limite 2MB). Faça upgrade para Pro para enviar arquivos de até 20MB.');
        onOpenPricing?.();
      } else {
        alert('O arquivo excede o limite de 20MB.');
      }
      return;
    }

    setIsLoading(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      const imageData = e.target?.result as string;
      console.log('Home: Imagem lida com sucesso (tamanho:', imageData.length, '), chamando onNavigate');
      onNavigate('editor', imageData);
      setIsLoading(false);
    };
    reader.onerror = (err) => {
      console.error('Home: Erro no FileReader:', err);
      alert('Erro ao ler o arquivo. Tente novamente.');
      setIsLoading(false);
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

  const handleToolClick = (screen: any) => {
    console.log('Home: handleToolClick para:', screen);
    if (!selectedImage) {
      handleUploadClick();
    } else {
      onNavigate(screen);
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

  return (
    <div className="max-w-6xl mx-auto space-y-16 py-12 px-6 md:px-12">
      {/* Pro Banner */}
      {userRole !== 'pro' && userRole !== 'admin' && (
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl bg-indigo-600 p-8 sm:p-12 text-white shadow-2xl shadow-indigo-500/20"
        >
          <div className="absolute top-0 right-0 -translate-y-1/4 translate-x-1/4 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 translate-y-1/4 -translate-x-1/4 w-64 h-64 bg-indigo-400/20 rounded-full blur-3xl" />
          
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="space-y-4 text-center md:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-widest">
                <Sparkles size={12} className="text-yellow-400" />
                Oferta Limitada
              </div>
              <h3 className="text-3xl sm:text-4xl font-black tracking-tight">Seja Pro por apenas $5/mês</h3>
              <p className="text-indigo-100 max-w-xl font-medium">Desbloqueie processamento ilimitado, upscale em 4K e todos os recursos premium de IA sem limites de cota.</p>
            </div>
            <motion.button
              whileHover={{ scale: 1.05, backgroundColor: "rgba(255, 255, 255, 1)" }}
              whileTap={{ scale: 0.95 }}
              onClick={onOpenPricing}
              className="px-8 py-4 bg-white text-indigo-600 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-black/10 flex items-center gap-3 transition-all"
            >
              Assinar Agora <ArrowRight size={20} />
            </motion.button>
          </div>
        </motion.section>
      )}

      {/* Hero Section */}
      <section className="flex flex-col md:flex-row items-center justify-between gap-12">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex-1 space-y-6"
        >
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-black tracking-tighter text-slate-400 dark:text-slate-500">
              {appConfig?.appName || 'Designa'}
            </h1>
            <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />
            <p className="text-[9px] uppercase tracking-[0.2em] text-indigo-600 font-bold">
              {appConfig?.brandingHeadline || 'O Futuro da Criatividade'}
            </p>
          </div>
          <h2 className="font-headline text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
            Potencialize suas edições com <span className="text-indigo-600">IA</span>
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-lg leading-relaxed">
            Utilize inteligência artificial de ponta para editar, criar e otimizar seus designs em segundos, sem complicações técnicas.
          </p>
          <div className="flex flex-wrap gap-4 pt-4">
            {selectedImage ? (
              <motion.button 
                whileHover={{ scale: 1.05, boxShadow: "0 20px 25px -5px rgb(79 70 229 / 0.4)" }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onNavigate('editor')}
                className="px-8 py-4 bg-indigo-600 text-white rounded-full font-bold shadow-xl shadow-indigo-500/30 transition-all flex items-center gap-2"
              >
                Continuar Editando
                <ArrowRight size={18} />
              </motion.button>
            ) : (
              <motion.button 
                whileHover={{ scale: 1.05, boxShadow: "0 20px 25px -5px rgb(79 70 229 / 0.4)" }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onNavigate('upload')}
                className="px-8 py-4 bg-indigo-600 text-white rounded-full font-bold shadow-xl shadow-indigo-500/30 transition-all flex items-center gap-2"
              >
                Começar Agora
                <ArrowRight size={18} />
              </motion.button>
            )}
            <motion.button 
              whileHover={{ scale: 1.05, backgroundColor: "rgba(248, 250, 252, 1)" }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onNavigate('history')}
              className="px-8 py-4 bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 rounded-full font-bold transition-all"
            >
              Ver Galeria
            </motion.button>
            <motion.button 
              whileHover={{ scale: 1.05, backgroundColor: "rgba(238, 242, 255, 1)" }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onNavigate('signup')}
              className="px-8 py-4 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-full font-bold transition-all border border-indigo-200 dark:border-indigo-800/50"
            >
              Criar Conta
            </motion.button>
          </div>
        </motion.div>
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, rotate: -2 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          whileHover={{ scale: 1.02, rotate: 1 }}
          transition={{ duration: 0.5, type: "spring" }}
          className="flex-1 w-full max-w-sm aspect-square rounded-[2rem] overflow-hidden shadow-2xl shadow-indigo-500/10 relative cursor-zoom-in"
        >
          <motion.img 
            animate={{ 
              y: [0, -10, 0],
            }}
            transition={{ 
              duration: 6, 
              repeat: Infinity, 
              ease: "easeInOut" 
            }}
            src="https://picsum.photos/seed/designa/800/800" 
            alt="Arte Abstrata" 
            className="w-full h-full object-cover scale-110"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 to-transparent"></div>
        </motion.div>
      </section>

      {/* Upload Section */}
      <section id="upload-section">
        <div 
          className="group relative p-1"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className={`absolute -inset-1 bg-gradient-to-r from-indigo-600 to-indigo-400 rounded-[2rem] blur transition duration-1000 ${isDragging ? 'opacity-40' : 'opacity-10 group-hover:opacity-20'}`}></div>
          <div className={`relative bg-white dark:bg-slate-900 border-2 border-dashed rounded-[2rem] p-8 md:p-16 flex flex-col items-center justify-center text-center space-y-6 transition-all duration-500 ${isDragging ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/20' : 'border-slate-200 dark:border-slate-800 hover:border-indigo-600/40'}`}>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*"
              onChange={handleFileChange}
            />
            <div className={`w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center text-indigo-600 shadow-inner transition-transform duration-300 ${isDragging ? 'scale-110 bg-indigo-100 dark:bg-indigo-800' : 'bg-slate-50 dark:bg-slate-800'}`}>
              <CloudUpload className="w-8 h-8 md:w-10 md:h-10" />
            </div>
            <div className="space-y-2">
              <h3 className="font-headline text-xl md:text-2xl font-bold text-slate-900 dark:text-white">
                {isDragging ? 'Solte para carregar' : 'Arraste sua imagem aqui'}
              </h3>
              <p className="text-sm md:text-base text-slate-500 dark:text-slate-400 font-medium max-w-xs md:max-w-none">Ou clique para navegar nos seus arquivos (JPG, PNG, WebP)</p>
            </div>
            <motion.button 
              whileHover={{ scale: 1.05, boxShadow: "0 20px 25px -5px rgb(79 70 229 / 0.4)" }}
              whileTap={{ scale: 0.95 }}
              disabled={isLoading}
              onClick={() => {
                console.log('Home: Botão Selecionar Arquivo (Hero) clicado');
                handleUploadClick();
              }}
              className={`w-full md:w-auto px-8 py-4 bg-indigo-600 text-white rounded-full font-bold shadow-xl shadow-indigo-500/30 transition-all flex items-center justify-center gap-2 ${isLoading ? 'opacity-70 cursor-wait' : ''}`}
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Lendo arquivo...</span>
                </>
              ) : (
                'Selecionar Arquivo'
              )}
            </motion.button>
          </div>
        </div>
      </section>

      {/* Quick Tools */}
      <section className="space-y-8">
        <div className="flex justify-between items-end">
          <div className="space-y-1">
            <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-indigo-600">Recursos Rápidos</span>
            <h3 className="font-headline text-3xl font-extrabold text-slate-900 dark:text-white">O que vamos criar hoje?</h3>
          </div>
          <div className="flex items-center gap-6">
            {(userRole !== 'pro' && userRole !== 'admin') && (
              <div className="hidden sm:flex items-center gap-3 px-4 py-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                <Zap size={14} className="text-indigo-600" />
                <div className="flex flex-col">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Cota IA</span>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-600" style={{ width: `${((usage?.dailyCount || 0) / 5) * 100}%` }} />
                    </div>
                    <span className="text-[10px] font-bold text-slate-900 dark:text-white">{usage?.dailyCount || 0}/5</span>
                  </div>
                </div>
              </div>
            )}
            <button 
              onClick={() => onNavigate('tools')}
              className="text-sm font-bold text-indigo-600 flex items-center gap-2 hover:underline"
            >
              Ver todos os recursos
              <ArrowRight size={16} />
            </button>
          </div>
        </div>

        {/* Affiliate Banners in Home */}
        {monetization && monetization.affiliateLinks.some(l => l.active) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {monetization.affiliateLinks.filter(l => l.active).slice(0, 3).map((link) => (
              <AffiliateBanner key={link.id} link={link} />
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
          >
            <ToolCard 
              icon={Sparkles} 
              title="Texto para Imagem" 
              description="Crie imagens incríveis do zero apenas com descrições em texto."
              onClick={() => onNavigate('generate')}
              tag="Novo"
            />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            <ToolCard 
              icon={Layers} 
              title="Remover Fundo" 
              description="Remova fundos complexos instantaneamente com precisão de IA."
              onClick={() => handleToolClick('editor')}
            />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
          >
            <ToolCard 
              icon={Eraser} 
              title="Remover Objeto" 
              description="Elimine distrações ou objetos indesejados de qualquer fotografia."
              onClick={() => handleToolClick('objects')}
            />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
          >
            <ToolCard 
              icon={Layers} 
              title="Processamento Lote" 
              description="Processe dezenas de imagens simultaneamente com IA (Exclusivo Pro)."
              onClick={() => onNavigate('batch')}
              isPro={true}
            />
          </motion.div>
        </div>
      </section>

      {/* Recent Works */}
      <section className="space-y-8 pb-12">
        <div className="flex justify-between items-center">
          <h3 className="font-headline text-2xl font-bold text-slate-900 dark:text-white">Trabalhos Recentes</h3>
          <button 
            onClick={() => onNavigate('history')}
            className="text-sm font-medium text-indigo-600 hover:text-indigo-700 dark:hover:text-indigo-400 transition-colors"
          >
            Ver Tudo
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {recentProjects.map((project) => (
            <div 
              key={project.id} 
              onClick={() => {
                console.log('Home: Clicou em projeto recente:', project.name);
                onNavigate('editor', project.imageUrl);
              }}
              className="aspect-square bg-slate-100 dark:bg-slate-800 rounded-3xl overflow-hidden relative group cursor-pointer shadow-sm hover:shadow-md transition-all"
            >
              <img 
                src={project.imageUrl} 
                alt={project.name} 
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <ExternalLink className="text-white" size={32} />
              </div>
              <div className="absolute bottom-2 left-2 right-2 p-2 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-xl opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="text-[10px] font-bold truncate text-slate-900 dark:text-white">{project.name}</p>
              </div>
            </div>
          ))}
          <motion.div 
            whileHover={{ scale: 1.02, translateY: -5 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              console.log('Home: Botão Novo Projeto clicado');
              handleUploadClick();
            }}
            className="bg-slate-50 dark:bg-slate-800/50 rounded-3xl flex flex-col items-center justify-center gap-3 border-2 border-dashed border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer group shadow-sm hover:shadow-md min-h-[150px]"
          >
            <div className="w-12 h-12 rounded-full bg-white dark:bg-slate-900 flex items-center justify-center text-slate-400 group-hover:text-indigo-600 transition-colors shadow-sm">
              <Plus size={24} />
            </div>
            <span className="text-sm font-bold text-slate-500">Novo Projeto</span>
          </motion.div>
        </div>
      </section>

      {/* Contact Section */}
      <ContactSection />

      {/* Footer */}
      <Footer appConfig={appConfig} settings={footerSettings} onNavigate={onNavigate} />
    </div>
  );
}

function ToolCard({ icon: Icon, title, description, onClick, isPro, tag }: any) {
  return (
    <motion.div 
      whileHover={{ 
        y: -10, 
        scale: 1.02,
        boxShadow: "0 25px 50px -12px rgba(79, 70, 229, 0.15)"
      }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl group p-8 rounded-[2rem] shadow-sm transition-all duration-500 flex flex-col items-start gap-6 border border-white/40 dark:border-slate-800/40 cursor-pointer h-full relative overflow-hidden"
    >
      {isPro && (
        <div className="absolute top-4 right-4 p-1.5 bg-yellow-400 rounded-full text-white shadow-lg shadow-yellow-500/20 z-10">
          <Crown size={12} />
        </div>
      )}
      {tag && !isPro && (
        <div className="absolute top-4 right-4 px-2 py-1 bg-indigo-600 rounded-lg text-white text-[8px] font-black uppercase tracking-widest z-10">
          {tag}
        </div>
      )}
      <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-500">
        <Icon size={28} />
      </div>
      <div className="space-y-2">
        <h4 className="font-headline text-xl font-bold text-slate-900 dark:text-white">{title}</h4>
        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{description}</p>
      </div>
      <div className="mt-auto text-sm font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-2 group-hover:translate-x-1 transition-transform">
        Começar Agora
        <ChevronRight size={16} />
      </div>
    </motion.div>
  );
}
