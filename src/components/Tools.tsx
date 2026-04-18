import React, { useRef } from 'react';
import { 
  Eraser, 
  Image as ImageIcon, 
  Sparkles, 
  User, 
  Layers, 
  Crop, 
  Maximize, 
  Palette,
  ArrowRight,
  Upload,
  Crown,
  RefreshCw,
  Maximize2,
  ExternalLink
} from 'lucide-react';
import { motion } from 'motion/react';
import { Screen, MonetizationSettings } from '../types';
import { AffiliateBanner } from './AffiliateBanner';
import { AdUnit } from './AdUnit';

interface ToolsProps {
  onNavigate: (screen: Screen, imageData?: string) => void;
  selectedImage: string | null;
  monetization?: MonetizationSettings | null;
  userRole?: string;
}

const allTools = [
  {
    id: 'editor',
    name: 'Remover Fundo',
    description: 'Remova fundos de imagens instantaneamente com IA de alta precisão.',
    icon: ImageIcon,
    color: 'bg-blue-500',
    tag: 'Popular'
  },
  {
    id: 'objects',
    name: 'Remover Objeto',
    description: 'Elimine elementos indesejados, pessoas ou textos das suas fotos.',
    icon: Eraser,
    color: 'bg-indigo-500',
    tag: 'Novo'
  },
  {
    id: 'upscale',
    name: 'Melhorar Qualidade',
    description: 'Aumente a resolução e nitidez das suas imagens sem perder detalhes.',
    icon: Maximize,
    color: 'bg-purple-500'
  },
  {
    id: 'face',
    name: 'Retoque Facial',
    description: 'Suavize a pele, remova manchas e realce traços faciais automaticamente.',
    icon: User,
    color: 'bg-pink-500'
  },
  {
    id: 'filters',
    name: 'Filtros Artísticos',
    description: 'Aplique estilos únicos e transformações artísticas às suas fotografias.',
    icon: Palette,
    color: 'bg-orange-500'
  },
  {
    id: 'crop',
    name: 'Recorte & Ajuste',
    description: 'Redimensione e ajuste o enquadramento perfeito para redes sociais.',
    icon: Crop,
    color: 'bg-emerald-500'
  },
  {
    id: 'layers',
    name: 'Composição',
    description: 'Combine múltiplas imagens e crie designs complexos com camadas.',
    icon: Layers,
    color: 'bg-amber-500'
  },
  {
    id: 'magic',
    name: 'Edição Mágica',
    description: 'Transforme partes da imagem usando descrições em texto (IA Generativa).',
    icon: Sparkles,
    color: 'bg-cyan-500'
  },
  {
    id: 'generate',
    name: 'Texto para Imagem',
    description: 'Crie imagens do zero apenas descrevendo o que você deseja em texto.',
    icon: Sparkles,
    color: 'bg-indigo-600',
    tag: 'Novo'
  },
  {
    id: 'outpaint',
    name: 'Expansão Generativa',
    description: 'Aumente as bordas de uma foto criando conteúdo que não existia antes.',
    icon: Maximize2,
    color: 'bg-violet-500'
  },
  {
    id: 'variations',
    name: 'Variações de Imagem',
    description: 'Crie versões diferentes de uma foto mantendo o mesmo estilo e tema.',
    icon: RefreshCw,
    color: 'bg-fuchsia-500'
  },
  {
    id: 'batch',
    name: 'Processamento em Lote',
    description: 'Processe dezenas de imagens de uma vez com o poder da nossa IA.',
    icon: Layers,
    color: 'bg-indigo-600'
  }
];

export function Tools({ onNavigate, selectedImage, monetization, userRole }: ToolsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const tools = allTools;

  const handleToolClick = (screen: Screen) => {
    if (!selectedImage) {
      fileInputRef.current?.click();
    } else {
      onNavigate(screen);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Por favor, selecione apenas arquivos de imagem.');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const imageData = e.target?.result as string;
        onNavigate('editor', imageData);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept="image/*"
        onChange={handleFileChange}
      />
      <div className="mb-12">
        <span className="text-xs uppercase tracking-[0.3em] font-bold text-indigo-600 mb-2 block">Catálogo Completo</span>
        <h1 className="font-headline text-4xl sm:text-5xl font-black text-slate-900 dark:text-white mb-4">
          Nossos <span className="text-indigo-600">Recursos</span>
        </h1>
        <p className="text-slate-600 dark:text-slate-400 max-w-2xl text-lg">
          Explore nossa suíte completa de recursos de edição alimentados por inteligência artificial para transformar suas imagens em segundos.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {tools.map((tool, index) => {
          const Icon = tool.icon;
          return (
            <motion.div
              key={tool.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ 
                y: -10, 
                scale: 1.02,
                boxShadow: "0 25px 50px -12px rgba(79, 70, 229, 0.15)"
              }}
              whileTap={{ scale: 0.98 }}
              className="group relative bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm transition-all duration-300 cursor-pointer"
              onClick={() => handleToolClick(tool.id as Screen)}
            >
              {tool.tag && (
                <span className="absolute top-4 right-4 px-3 py-1 text-[10px] font-bold rounded-full uppercase tracking-wider flex items-center gap-1.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                  {tool.tag}
                </span>
              )}
              
              <div className={`w-14 h-14 ${tool.color} rounded-2xl flex items-center justify-center text-white mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                <Icon size={28} />
              </div>

              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 group-hover:text-indigo-600 transition-colors">
                {tool.name}
              </h3>
              
              <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-6">
                {tool.description}
              </p>

              <div className="flex items-center text-indigo-600 font-bold text-sm gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-[-10px] group-hover:translate-x-0">
                Começar agora
                <ArrowRight size={16} />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Affiliate Banners */}
      {monetization && monetization.affiliateLinks.some(l => l.active) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-12">
          {monetization.affiliateLinks.filter(l => l.active).slice(0, 4).map((link) => (
            <AffiliateBanner key={link.id} link={link} aspectRatio="aspect-[16/9]" />
          ))}
        </div>
      )}

      {/* AdSense Unit */}
      <AdUnit monetization={monetization} className="max-w-4xl mx-auto mt-12" />

      <div className="mt-20 p-8 sm:p-12 bg-indigo-600 rounded-[40px] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-400/20 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl" />
        
        <div className="relative z-10 text-center max-w-3xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-6">
            Não encontrou o que precisava?
          </h2>
          <p className="text-indigo-100 text-lg mb-8">
            Estamos constantemente adicionando novos recursos. Sugira uma funcionalidade e ajude-nos a construir o melhor editor de imagens do mundo.
          </p>
          <motion.button 
            whileHover={{ scale: 1.05, backgroundColor: "#f5f3ff" }}
            whileTap={{ scale: 0.95 }}
            className="px-8 py-4 bg-white text-indigo-600 font-bold rounded-2xl transition-all shadow-xl"
          >
            Sugerir Recurso
          </motion.button>
        </div>
      </div>
    </div>
  );
}
