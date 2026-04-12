import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  DollarSign, 
  Link as LinkIcon, 
  Plus, 
  Trash2, 
  Save, 
  ExternalLink, 
  AlertCircle,
  Layout,
  Globe,
  Loader2
} from 'lucide-react';
import { db, doc, setDoc, getDoc } from '../firebase';

interface AffiliateLink {
  id: string;
  title: string;
  url: string;
  imageUrl: string;
  videoUrl?: string;
  type: 'image' | 'video';
  active: boolean;
}

interface MonetizationSettings {
  adsenseClientId: string;
  adsenseSlotId: string;
  adsenseEnabled: boolean;
  affiliateLinks: AffiliateLink[];
}

export default function Monetization() {
  const [settings, setSettings] = useState<MonetizationSettings>({
    adsenseClientId: '',
    adsenseSlotId: '',
    adsenseEnabled: false,
    affiliateLinks: []
  });
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [newLink, setNewLink] = useState<Partial<AffiliateLink>>({
    title: '',
    url: '',
    imageUrl: '',
    videoUrl: '',
    type: 'image',
    active: true
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, 'config', 'monetization');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setSettings(docSnap.data() as MonetizationSettings);
        }
      } catch (error) {
        console.error("Error fetching monetization settings:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await setDoc(doc(db, 'config', 'monetization'), settings);
      setHasUnsavedChanges(false);
      alert("Configurações de monetização salvas com sucesso!");
    } catch (error) {
      console.error("Error saving monetization settings:", error);
      alert("Erro ao salvar configurações.");
    } finally {
      setIsSaving(false);
    }
  };

  const addAffiliateLink = () => {
    if (!newLink.title || !newLink.url) return;
    const link: AffiliateLink = {
      id: Date.now().toString(),
      title: newLink.title!,
      url: newLink.url!,
      imageUrl: newLink.imageUrl || 'https://picsum.photos/seed/affiliate/400/200',
      videoUrl: newLink.videoUrl,
      type: newLink.type as 'image' | 'video' || 'image',
      active: true
    };
    setSettings(prev => ({
      ...prev,
      affiliateLinks: [...prev.affiliateLinks, link]
    }));
    setHasUnsavedChanges(true);
    setNewLink({ title: '', url: '', imageUrl: '', videoUrl: '', type: 'image', active: true });
  };

  const removeAffiliateLink = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este banner de afiliado?')) {
      setSettings(prev => ({
        ...prev,
        affiliateLinks: prev.affiliateLinks.filter(l => l.id !== id)
      }));
      setHasUnsavedChanges(true);
    }
  };

  const toggleAffiliateLink = (id: string) => {
    setSettings(prev => ({
      ...prev,
      affiliateLinks: prev.affiliateLinks.map(l => 
        l.id === id ? { ...l, active: !l.active } : l
      )
    }));
    setHasUnsavedChanges(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3">
            <DollarSign className="w-7 h-7 text-emerald-600" />
            Monetização e Afiliados
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Gerencie anúncios do AdSense e seus links de afiliado.</p>
        </div>
        {hasUnsavedChanges && (
          <motion.button
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            onClick={handleSave}
            disabled={isSaving}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            Salvar Alterações
          </motion.button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Google AdSense Section */}
        <section className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-50 dark:bg-amber-900/30 text-amber-600 rounded-2xl">
                <Globe size={24} />
              </div>
              <div>
                <h3 className="font-black text-slate-900 dark:text-white">Google AdSense</h3>
                <p className="text-xs text-slate-500 font-medium">Anúncios automáticos do Google</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={settings.adsenseEnabled}
                onChange={(e) => {
                  setSettings(prev => ({ ...prev, adsenseEnabled: e.target.checked }));
                  setHasUnsavedChanges(true);
                }}
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Client ID (ca-pub-xxx)</label>
              <input 
                type="text"
                value={settings.adsenseClientId}
                onChange={(e) => {
                  setSettings(prev => ({ ...prev, adsenseClientId: e.target.value }));
                  setHasUnsavedChanges(true);
                }}
                placeholder="ca-pub-xxxxxxxxxxxxxxxx"
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Slot ID</label>
              <input 
                type="text"
                value={settings.adsenseSlotId}
                onChange={(e) => {
                  setSettings(prev => ({ ...prev, adsenseSlotId: e.target.value }));
                  setHasUnsavedChanges(true);
                }}
                placeholder="1234567890"
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              />
            </div>
          </div>

          <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-100 dark:border-amber-900/30 flex gap-3">
            <AlertCircle className="text-amber-600 shrink-0" size={20} />
            <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
              <strong>Nota:</strong> Para que o AdSense funcione, você deve ter o script do AdSense no seu <code>index.html</code> ou injetado via código. O app usará esses IDs para renderizar os blocos de anúncios.
            </p>
          </div>
        </section>

        {/* Affiliate Links Section */}
        <section className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-2xl">
              <LinkIcon size={24} />
            </div>
            <div>
              <h3 className="font-black text-slate-900 dark:text-white">Links de Afiliado</h3>
              <p className="text-xs text-slate-500 font-medium">Banners e links personalizados</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
              <button 
                onClick={() => setNewLink(prev => ({ ...prev, type: 'image' }))}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${newLink.type === 'image' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500'}`}
              >
                Banner Imagem
              </button>
              <button 
                onClick={() => setNewLink(prev => ({ ...prev, type: 'video' }))}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${newLink.type === 'video' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500'}`}
              >
                Banner Vídeo
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <input 
                type="text"
                placeholder="Título do Banner"
                value={newLink.title}
                onChange={(e) => setNewLink(prev => ({ ...prev, title: e.target.value }))}
                className="px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              />
              <input 
                type="text"
                placeholder="URL de Afiliado"
                value={newLink.url}
                onChange={(e) => setNewLink(prev => ({ ...prev, url: e.target.value }))}
                className="px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <input 
                type="text"
                placeholder="URL da Imagem (Thumbnail)"
                value={newLink.imageUrl}
                onChange={(e) => setNewLink(prev => ({ ...prev, imageUrl: e.target.value }))}
                className="px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              />
              {newLink.type === 'video' && (
                <input 
                  type="text"
                  placeholder="URL do Vídeo (.mp4)"
                  value={newLink.videoUrl}
                  onChange={(e) => setNewLink(prev => ({ ...prev, videoUrl: e.target.value }))}
                  className="px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                />
              )}
            </div>
            <button 
              onClick={addAffiliateLink}
              className="w-full py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-all"
            >
              <Plus size={18} />
              Adicionar Banner {newLink.type === 'video' ? 'de Vídeo' : 'de Imagem'}
            </button>
          </div>

          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {settings.affiliateLinks.map((link) => (
              <div key={link.id} className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 group transition-all hover:shadow-md">
                <div className="relative">
                  <img src={link.imageUrl} alt="" className={`w-20 h-12 rounded-lg object-cover shadow-sm transition-opacity ${link.active ? 'opacity-100' : 'opacity-40 grayscale'}`} />
                  {!link.active && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="bg-slate-900/80 text-white text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded">Inativo</span>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className={`text-sm font-bold truncate ${link.active ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500'}`}>
                    {link.title}
                  </h4>
                  <p className="text-[10px] text-slate-500 truncate flex items-center gap-1">
                    <LinkIcon size={10} />
                    {link.url}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => toggleAffiliateLink(link.id)}
                    title={link.active ? "Desativar" : "Ativar"}
                    className={`p-2 rounded-lg transition-colors ${link.active ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20' : 'text-slate-400 bg-slate-100 dark:bg-slate-900/40'}`}
                  >
                    <Globe size={16} />
                  </button>
                  <a 
                    href={link.url.startsWith('http') ? link.url : `https://${link.url}`} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="p-2 text-slate-400 hover:text-indigo-600 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors"
                  >
                    <ExternalLink size={16} />
                  </a>
                  <button 
                    onClick={() => removeAffiliateLink(link.id)}
                    className="p-2 text-rose-500 hover:text-white hover:bg-rose-500 bg-rose-50 dark:bg-rose-900/20 rounded-lg transition-all"
                    title="Excluir Permanentemente"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
            {settings.affiliateLinks.length === 0 && (
              <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                <LinkIcon className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-sm font-bold text-slate-400">Nenhum banner de afiliado</p>
                <p className="text-xs text-slate-500 mt-1">Adicione seu primeiro link acima</p>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Preview Section */}
      <section className="bg-slate-900 rounded-[2.5rem] p-12 text-white overflow-hidden relative">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Layout size={120} />
        </div>
        <div className="relative z-10">
          <h3 className="text-xl font-black mb-6 flex items-center gap-3">
            <Layout className="text-indigo-400" />
            Pré-visualização de Anúncios
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="aspect-[4/3] bg-slate-800 rounded-3xl border border-slate-700 flex flex-col items-center justify-center p-6 text-center space-y-3">
              <div className="w-12 h-12 bg-slate-700 rounded-2xl flex items-center justify-center text-slate-500">
                <Globe size={24} />
              </div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Espaço AdSense</p>
              <p className="text-[10px] text-slate-500">O Google AdSense preencherá este espaço automaticamente.</p>
            </div>
            {settings.affiliateLinks.slice(0, 2).map((link) => (
              <div key={link.id} className="aspect-[4/3] bg-slate-800 rounded-3xl border border-slate-700 overflow-hidden relative group">
                {link.type === 'video' && link.videoUrl ? (
                  <video 
                    src={link.videoUrl} 
                    autoPlay 
                    muted 
                    loop 
                    playsInline 
                    className="w-full h-full object-cover opacity-50 group-hover:opacity-100 transition-opacity"
                  />
                ) : (
                  <img src={link.imageUrl} alt="" className="w-full h-full object-cover opacity-50 group-hover:opacity-100 transition-opacity" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 p-6 flex flex-col justify-end">
                  <p className="text-xs font-black uppercase tracking-widest text-indigo-400 mb-1">
                    {link.type === 'video' ? 'Vídeo Afiliado' : 'Afiliado'}
                  </p>
                  <h4 className="font-bold text-sm">{link.title}</h4>
                </div>
              </div>
            ))}
            {settings.affiliateLinks.length < 2 && (
              <div className="aspect-[4/3] bg-slate-800/50 rounded-3xl border-2 border-dashed border-slate-700 flex items-center justify-center text-slate-600">
                <p className="text-xs font-bold uppercase tracking-widest">Espaço Disponível</p>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
