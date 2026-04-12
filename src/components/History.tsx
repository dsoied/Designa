import { Search, Filter, Edit, Download, Trash2, Calendar, CheckCircle, RefreshCw, ChevronLeft, ChevronRight, Plus, ExternalLink } from 'lucide-react';
import { useRef, ChangeEvent, useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Screen, Project, MonetizationSettings } from '../types';
import { db, auth, collection, query, where, orderBy, onSnapshot, deleteDoc, doc } from '../firebase';
import { AffiliateBanner } from './AffiliateBanner';
import { AdUnit } from './AdUnit';

interface HistoryProps {
  onNavigate: (screen: Screen, imageData?: string) => void;
  userRole?: string;
  onOpenPricing?: () => void;
  monetization?: MonetizationSettings | null;
}

export function History({ onNavigate, userRole, onOpenPricing, monetization }: HistoryProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterDate, setFilterDate] = useState<string>('all');

  useEffect(() => {
    if (!auth.currentUser) {
      setProjects([]);
      return;
    }

    let q = query(
      collection(db, 'projects'),
      where('uid', '==', auth.currentUser.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let fetchedProjects = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as Project[];

      // Limit for free users
      if (userRole !== 'pro' && userRole !== 'admin') {
        fetchedProjects = fetchedProjects.slice(0, 10);
      }

      setProjects(fetchedProjects);
    }, (error) => {
      console.error('History: Erro ao buscar projetos:', error);
    });

    return () => unsubscribe();
  }, []);

  const handleUploadClick = () => {
    console.log('History: Botão Novo Projeto clicado');
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      console.log('History: Arquivo selecionado:', file.name, file.type, file.size);
      if (!file.type.startsWith('image/')) {
        alert('Por favor, selecione apenas arquivos de imagem.');
        return;
      }

      // Limite de 15MB
      if (file.size > 15 * 1024 * 1024) {
        alert('O arquivo é muito grande. Por favor, selecione uma imagem com menos de 15MB.');
        return;
      }

      setIsLoading(true);

      const reader = new FileReader();
      reader.onload = (e) => {
        const imageData = e.target?.result as string;
        console.log('History: Imagem lida com sucesso, tamanho:', imageData.length);
        onNavigate('editor', imageData);
        setIsLoading(false);
      };
      reader.onerror = (err) => {
        console.error('History: Erro ao ler arquivo:', err);
        alert('Erro ao ler o arquivo. Tente novamente.');
        setIsLoading(false);
      };
      reader.readAsDataURL(file);
      
      // Reset value to allow selecting the same file again
      event.target.value = '';
    }
  };

  const handleDownload = (url: string, name: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `${name.replace(/\s+/g, '-').toLowerCase()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este projeto?')) {
      try {
        await deleteDoc(doc(db, 'projects', id));
        console.log('History: Projeto excluído com sucesso');
      } catch (err) {
        console.error('History: Erro ao excluir projeto:', err);
        alert('Erro ao excluir o projeto. Tente novamente.');
      }
    }
  };

  const filteredProjects = projects.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         p.type.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === 'all' || 
                       (filterType === 'background' && p.type.toLowerCase().includes('fundo')) ||
                       (filterType === 'upscale' && p.type.toLowerCase().includes('qualidade')) ||
                       (filterType === 'batch' && p.type.toLowerCase().includes('lote')) ||
                       (filterType === 'generate' && p.type.toLowerCase().includes('ia'));

    let matchesDate = true;
    if (filterDate !== 'all') {
      const projectDate = new Date(p.date);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - projectDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (filterDate === '7d') matchesDate = diffDays <= 7;
      else if (filterDate === '30d') matchesDate = diffDays <= 30;
    }

    return matchesSearch && matchesType && matchesDate;
  });

  return (
    <div className="max-w-7xl mx-auto p-6 sm:p-12">
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept="image/*" 
        className="hidden" 
      />
      {/* Hero / Header Section */}
      <section className="mb-8 sm:mb-12">
        <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-2">Seu Histórico Criativo</h2>
        <p className="text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed text-sm sm:text-base">Gerencie todos os seus projetos passados, recupere edições e mantenha sua galeria organizada com nossos recursos de filtragem avançada.</p>
      </section>

      {/* Search and Filter Bar */}
      <section className="mb-12 flex flex-col lg:flex-row gap-6 items-center justify-between">
        <div className="relative w-full lg:w-96 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={20} />
          <input 
            type="text" 
            placeholder="Buscar por nome ou tipo..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none transition-all placeholder:text-slate-400"
          />
        </div>
        <div className="flex flex-wrap gap-3 w-full lg:w-auto">
          <div className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl">
            <Filter size={16} className="text-slate-400" />
            <select 
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-transparent text-sm font-bold text-slate-700 dark:text-slate-300 outline-none cursor-pointer"
            >
              <option value="all">Todos os Tipos</option>
              <option value="background">Remoção de Fundo</option>
              <option value="upscale">Melhoria de Qualidade</option>
              <option value="batch">Processamento em Lote</option>
              <option value="generate">Criação com IA</option>
            </select>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl">
            <Calendar size={16} className="text-slate-400" />
            <select 
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="bg-transparent text-sm font-bold text-slate-700 dark:text-slate-300 outline-none cursor-pointer"
            >
              <option value="all">Qualquer Data</option>
              <option value="7d">Últimos 7 dias</option>
              <option value="30d">Últimos 30 dias</option>
            </select>
          </div>
          <button 
            onClick={() => {
              setFilterType('all');
              setFilterDate('all');
              setSearchTerm('');
            }}
            className="px-4 py-2 text-sm font-bold text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl transition-colors"
          >
            Limpar
          </button>
        </div>
      </section>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredProjects.map((project) => (
          <article key={project.id} className="group relative bg-white dark:bg-slate-900 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-500 border border-slate-200 dark:border-slate-800">
            <div className="aspect-[4/3] overflow-hidden relative">
              <img 
                src={project.imageUrl} 
                alt={project.name} 
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-6">
                <div className="flex gap-2 w-full">
                  <button 
                    onClick={() => onNavigate('editor', project.imageUrl)}
                    className="flex-1 py-2.5 bg-white text-slate-900 rounded-lg text-xs font-bold flex items-center justify-center gap-2 hover:bg-indigo-50 transition-colors"
                  >
                    <Edit size={16} /> Editar
                  </button>
                  <button 
                    onClick={() => handleDownload(project.imageUrl, project.name)}
                    className="p-2.5 bg-white/20 backdrop-blur-md text-white rounded-lg hover:bg-white/40 transition-colors"
                  >
                    <Download size={16} />
                  </button>
                </div>
              </div>
              <div className="absolute top-4 left-4">
                <span className="px-3 py-1 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md text-slate-900 dark:text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-sm">
                  {project.type}
                </span>
              </div>
            </div>
            <div className="p-5">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-lg text-slate-900 dark:text-white tracking-tight">{project.name}</h3>
                <button 
                  onClick={() => handleDelete(project.id)}
                  className="text-slate-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={20} />
                </button>
              </div>
              <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 font-medium">
                <span className="flex items-center gap-1">
                  <Calendar size={14} /> {project.date}
                </span>
                <span className={`flex items-center gap-1 ${project.status === 'Finalizado' ? 'text-emerald-600' : 'text-indigo-600'}`}>
                  {project.status === 'Finalizado' ? <CheckCircle size={14} /> : <RefreshCw size={14} />} {project.status}
                </span>
              </div>
            </div>
          </article>
        ))}

        {/* Add New Placeholder */}
        <motion.article 
          whileHover={{ scale: 1.02, translateY: -5 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleUploadClick}
          className={`group relative bg-slate-50 dark:bg-slate-800/50 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col items-center justify-center p-8 sm:p-12 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-indigo-600/40 transition-all cursor-pointer min-h-[200px] shadow-sm hover:shadow-md ${isLoading ? 'opacity-70 cursor-wait' : ''}`}
        >
          {isLoading ? (
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 border-4 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin"></div>
              <p className="font-bold text-indigo-600">Lendo...</p>
            </div>
          ) : (
            <>
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white dark:bg-slate-900 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform mb-3 sm:mb-4 group-hover:text-indigo-600">
                <Plus size={24} />
              </div>
              <p className="font-bold text-slate-900 dark:text-white tracking-tight text-sm sm:text-base">Novo Projeto</p>
              <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mt-1">Carregar imagem agora</p>
            </>
          )}
        </motion.article>
      </div>

      {/* Affiliate Banners */}
      {monetization && monetization.affiliateLinks.some(l => l.active) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-12">
          {monetization.affiliateLinks.filter(l => l.active).slice(0, 3).map((link) => (
            <AffiliateBanner key={link.id} link={link} />
          ))}
        </div>
      )}

      {/* AdSense Unit */}
      <AdUnit monetization={monetization} className="max-w-4xl mx-auto" />

      {/* Pagination */}
      <footer className="mt-16 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-8">
        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Exibindo {filteredProjects.length} projetos</p>
        <div className="flex gap-2">
          <button className="w-10 h-10 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-30" disabled>
            <ChevronLeft size={20} />
          </button>
          <button className="w-10 h-10 flex items-center justify-center rounded-lg bg-indigo-600 text-white font-bold shadow-lg shadow-indigo-500/20">1</button>
          <button className="w-10 h-10 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <ChevronRight size={20} />
          </button>
        </div>
      </footer>
    </div>
  );
}
