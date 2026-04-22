import React, { useState, useRef, useEffect } from 'react';
import { CloudUpload, ArrowRight, ChevronRight, Layers, Eraser, Sparkles, ExternalLink, Plus, Crown, Zap, DollarSign, Wand2, Maximize2, RefreshCw, Library, Grid2X2, MousePointer2 } from 'lucide-react';
import { motion } from 'motion/react';
import { db, auth, collection, query, where, orderBy, onSnapshot, limit, getDoc, doc, handleFirestoreError, OperationType } from '../firebase';
import { Project, MonetizationSettings, FooterSettings, AppConfig } from '../types';
import { UserUsage } from '../services/usageService';
import { ContactSection } from './ContactSection';
import { AffiliateBanner } from './AffiliateBanner';
import { Footer } from './Footer';
import { useLanguage } from '../context/LanguageContext';

interface HomeProps {
  onNavigate: (screen: any, imageData?: string) => void;
  selectedImage: string | null;
  userRole?: string;
  appConfig?: AppConfig;
  monetization?: MonetizationSettings | null;
  footerSettings?: FooterSettings | null;
  notify?: (title: string, message: string, type?: 'success' | 'error' | 'info') => void;
}

export function Home({ onNavigate, selectedImage, userRole, appConfig, monetization, footerSettings, notify }: HomeProps) {
  const { t } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [recentProjects, setRecentProjects] = useState<Project[]>([]);
  const [usage, setUsage] = useState<UserUsage | null>(null);

  useEffect(() => {
    const fetchUsage = async () => {
      if (auth.currentUser) {
        const usageRef = doc(db, 'usage', auth.currentUser.uid);
        try {
          const snap = await getDoc(usageRef);
          if (snap.exists()) {
            setUsage(snap.data() as UserUsage);
          }
        } catch (error) {
          console.error('Home: Erro ao buscar uso:', error);
        }
      }
    };
    fetchUsage();
  }, [auth.currentUser]);

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
      handleFirestoreError(error, OperationType.LIST, 'projects');
    });

    return () => unsubscribe();
  }, [auth.currentUser]);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const processFile = (file: File) => {
    console.log('Home: Iniciando processamento do arquivo:', file.name, 'tipo:', file.type, 'tamanho:', file.size);
    
    if (!file.type.startsWith('image/')) {
      if (notify) {
        notify('Erro de Arquivo', 'Por favor, selecione apenas arquivos de imagem.', 'error');
      } else {
        alert('Por favor, selecione apenas arquivos de imagem.');
      }
      return;
    }

    // Standard limit: 20MB for everyone now
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

    setIsLoading(true);
    console.log('Home: setIsLoading(true)');

    try {
      const reader = new FileReader();
      
      // Add a safety timeout in case FileReader hangs
      const timeoutId = setTimeout(() => {
        if (isLoading) {
          console.error('Home: FileReader timeout atingido');
          setIsLoading(false);
          if (notify) notify('Erro de Carregamento', 'O carregamento da imagem demorou muito. Tente uma imagem menor.', 'error');
        }
      }, 15000);

      reader.onload = (e) => {
        clearTimeout(timeoutId);
        const imageData = e.target?.result as string;
        console.log('Home: Imagem lida com sucesso (tamanho:', imageData.length, '), chamando onNavigate');
        
        try {
          onNavigate('editor', imageData);
          console.log('Home: onNavigate chamado com sucesso');
        } catch (navErr) {
          console.error('Home: Erro ao navegar para o editor:', navErr);
          if (notify) notify('Erro de Navegação', 'Ocorreu um erro ao abrir o editor.', 'error');
        } finally {
          setIsLoading(false);
          console.log('Home: setIsLoading(false) no onload');
        }
      };

      reader.onerror = (err) => {
        clearTimeout(timeoutId);
        console.error('Home: Erro no FileReader:', err);
        if (notify) {
          notify('Erro de Leitura', 'Erro ao ler o arquivo. Tente novamente.', 'error');
        } else {
          alert('Erro ao ler o arquivo. Tente novamente.');
        }
        setIsLoading(false);
        console.log('Home: setIsLoading(false) no onerror');
      };

      reader.onabort = () => {
        clearTimeout(timeoutId);
        console.warn('Home: Leitura do arquivo abortada');
        setIsLoading(false);
      };

      reader.readAsDataURL(file);
    } catch (err) {
      console.error('Home: Erro inesperado no processFile:', err);
      setIsLoading(false);
    }
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
              {t('signup')}
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
              title="Gerar com IA" 
              description="Crie imagens incríveis do zero usando o novo Flash 2.5 da Google."
              onClick={() => onNavigate('editor')}
              tag="2.5 Flash"
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
              description="Remova fundos complexos instantaneamente usando IA gratuita diretamente no seu navegador."
              onClick={() => handleToolClick('editor')}
              tag="Grátis & Ilimitado"
            />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            <ToolCard 
              icon={Grid2X2} 
              title="Super Colagem" 
              description="Crie composições livres ou automáticas com inteligência artificial."
              onClick={() => onNavigate('collage')}
              tag="IA + Manual"
            />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
          >
            <ToolCard 
              icon={Zap} 
              title="Design Templates" 
              description="Transforme suas fotos em designs profissionais para redes sociais."
              onClick={() => handleToolClick('editor')}
            />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
          >
            <ToolCard 
              icon={Library} 
              title="Banco Pexels" 
              description="Acesse milhões de fotos de alta qualidade para seus projetos."
              onClick={() => handleToolClick('editor')}
            />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5 }}
          >
            <ToolCard 
              icon={Layers} 
              title="Processamento Lote" 
              description="Processe dezenas de imagens simultaneamente com IA."
              onClick={() => onNavigate('batch')}
            />
          </motion.div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
          >
            <ToolCard 
              icon={Wand2} 
              title="Efeitos Inteligentes" 
              description="Aplique filtros e melhorias automáticas baseadas em IA."
              onClick={() => onNavigate('editor')}
            />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            <ToolCard 
              icon={Maximize2} 
              title="Recorte Profissional" 
              description="Ajuste suas imagens para qualquer formato de rede social."
              onClick={() => onNavigate('editor')}
            />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
          >
            <ToolCard 
              icon={RefreshCw} 
              title="Histórico Cloud" 
              description="Acesse suas criações anteriores de qualquer dispositivo."
              onClick={() => onNavigate('history')}
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

function ToolCard({ icon: Icon, title, description, onClick, tag }: any) {
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
      {tag && (
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
