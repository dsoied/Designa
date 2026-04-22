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
  Loader2,
  Edit,
  Upload,
  Image as ImageIcon,
  X as CloseIcon
} from 'lucide-react';
import { db, doc, setDoc, getDoc, uploadImageToStorage, uploadFileToStorage, onSnapshot } from '../firebase';

interface AffiliateLink {
  id: string;
  title: string;
  url: string;
  imageUrl: string;
  videoUrl?: string;
  type: 'image' | 'video';
  placement: 'home' | 'bg-remover' | 'tools' | 'batch' | 'signup' | 'profile' | 'notifications' | 'history' | 'generate' | 'all' | 'hap-grandi';
  layout: 'top' | 'bottom' | 'sidebar' | 'horizontal' | 'vertical';
  ratio: 'square' | 'vertical' | 'horizontal';
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
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const videoInputRef = React.useRef<HTMLInputElement>(null);
  const [newLink, setNewLink] = useState<Partial<AffiliateLink>>({
    title: '',
    url: '',
    imageUrl: '',
    videoUrl: '',
    type: 'image',
    placement: 'all',
    layout: 'bottom',
    ratio: 'horizontal',
    active: true
  });

  useEffect(() => {
    const docRef = doc(db, 'config', 'monetization');
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as MonetizationSettings;
        setSettings(data);
        console.log("Monetization: Configurações carregadas em tempo real:", data.affiliateLinks?.length || 0, "banners");
      }
      setLoading(false);
    }, (error) => {
      console.error("Monetization: Erro no listener em tempo real:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSave = async (customSettings?: MonetizationSettings) => {
    const settingsToSave = customSettings || settings;
    try {
      setIsSaving(true);
      console.log("Monetization: Salvando configurações...", settingsToSave.affiliateLinks.length, "banners");
      
      // Verification of Base64 images to Storage (to avoid 1MB limit)
      const updatedLinks = [...(settingsToSave.affiliateLinks || [])];
      let needsSavingAgain = false;

      for (let i = 0; i < updatedLinks.length; i++) {
        const link = updatedLinks[i];
        
        // If image is still base64 (migration safety)
        if (link.imageUrl && link.imageUrl.startsWith('data:image')) {
          console.log(`Monetization: Migrando imagem base64 do banner '${link.title}'...`);
          const fileName = `migrated_${link.id}_${Date.now()}.png`;
          try {
            const url = await uploadImageToStorage(link.imageUrl, fileName, 'monetization/images');
            updatedLinks[i] = { ...link, imageUrl: url };
            needsSavingAgain = true;
          } catch (err) {
            console.error(`Monetization: Erro ao migrar imagem do banner ${link.title}:`, err);
          }
        }

        // If video is still base64
        if (link.videoUrl && link.videoUrl.startsWith('data:video')) {
          console.log(`Monetization: Migrando vídeo base64 do banner '${link.title}'...`);
          const fileName = `migrated_${link.id}_${Date.now()}.mp4`;
          try {
            const url = await uploadImageToStorage(link.videoUrl, fileName, 'monetization/videos');
            updatedLinks[i] = { ...link, videoUrl: url };
            needsSavingAgain = true;
          } catch (err) {
            console.error(`Monetization: Erro ao migrar vídeo do banner ${link.title}:`, err);
          }
        }
      }

      const finalSettings = {
        ...settingsToSave,
        affiliateLinks: updatedLinks
      };

      await setDoc(doc(db, 'config', 'monetization'), finalSettings);
      console.log("Monetization: Configurações persistidas com sucesso no Firestore.");
      
      setHasUnsavedChanges(false);
      if (!customSettings) {
        alert("Configurações de monetização salvas com sucesso!");
      }
    } catch (error: any) {
      console.error("Monetization: Erro ao salvar configurações:", error);
      alert(`Erro ao salvar: ${error.message || 'Erro desconhecido'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const addAffiliateLink = async () => {
    if (!newLink.title || !newLink.url) {
      alert("Por favor, preencha o título e a URL do link.");
      return;
    }

    let updatedAffiliateLinks = [...settings.affiliateLinks];

    if (editingLinkId) {
      updatedAffiliateLinks = updatedAffiliateLinks.map(l => 
        l.id === editingLinkId 
          ? { ...l, ...newLink as AffiliateLink, id: editingLinkId } 
          : l
      );
    } else {
      const link: AffiliateLink = {
        id: Date.now().toString(),
        title: newLink.title!,
        url: newLink.url!,
        imageUrl: newLink.imageUrl || 'https://picsum.photos/seed/affiliate/400/200',
        videoUrl: newLink.videoUrl,
        type: newLink.type as 'image' | 'video' || 'image',
        placement: newLink.placement as any || 'all',
        layout: newLink.layout as any || 'bottom',
        ratio: newLink.ratio as any || 'horizontal',
        active: true
      };
      updatedAffiliateLinks.push(link);
    }

    const updatedSettings = {
      ...settings,
      affiliateLinks: updatedAffiliateLinks
    };

    // Immediate save to prevent data loss
    await handleSave(updatedSettings);

    setEditingLinkId(null);
    setNewLink({ 
      title: '', 
      url: '', 
      imageUrl: '', 
      videoUrl: '', 
      type: 'image', 
      placement: 'all', 
      layout: 'bottom', 
      ratio: 'horizontal', 
      active: true 
    });
  };

  const startEditing = (link: AffiliateLink) => {
    setEditingLinkId(link.id);
    setNewLink({ ...link });
    // Scroll to form
    window.scrollTo({ top: 300, behavior: 'smooth' });
  };

  const cancelEditing = () => {
    setEditingLinkId(null);
    setNewLink({ 
      title: '', 
      url: '', 
      imageUrl: '', 
      videoUrl: '', 
      type: 'image', 
      placement: 'all', 
      layout: 'bottom', 
      ratio: 'horizontal', 
      active: true 
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video') => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsSaving(true);
      const fileName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
      const path = `monetization/${type}s`;
      
      try {
        const downloadUrl = await uploadFileToStorage(file, fileName, path);
        
        if (type === 'image') {
          setNewLink(prev => ({ ...prev, imageUrl: downloadUrl }));
        } else {
          setNewLink(prev => ({ ...prev, videoUrl: downloadUrl }));
        }
        setHasUnsavedChanges(true);
      } catch (uploadError) {
        console.error("Error uploading file to storage:", uploadError);
        alert("Erro ao fazer upload do arquivo diretamente para o Supabase/Storage.");
      } finally {
        setIsSaving(false);
      }
    } catch (error) {
      console.error("Error initiating upload:", error);
      setIsSaving(false);
    }
  };

  const removeAffiliateLink = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este banner de afiliado?')) {
      const updatedSettings = {
        ...settings,
        affiliateLinks: settings.affiliateLinks.filter(l => l.id !== id)
      };
      await handleSave(updatedSettings);
    }
  };

  const toggleAffiliateLink = async (id: string) => {
    const updatedSettings = {
      ...settings,
      affiliateLinks: settings.affiliateLinks.map(l => 
        l.id === id ? { ...l, active: !l.active } : l
      )
    };
    await handleSave(updatedSettings);
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
            onClick={() => handleSave()}
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
                onChange={async (e) => {
                  const updatedSettings = { ...settings, adsenseEnabled: e.target.checked };
                  setSettings(updatedSettings);
                  await handleSave(updatedSettings);
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

            {editingLinkId && (
              <div className="flex items-center justify-between px-2">
                <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded-lg border border-amber-100 dark:border-amber-900/30">
                  Editando: {settings.affiliateLinks.find(l => l.id === editingLinkId)?.title}
                </span>
                <button 
                  onClick={cancelEditing}
                  className="text-[10px] font-black text-slate-500 uppercase hover:text-rose-500 transition-colors"
                >
                  Cancelar Edição
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Informações Básicas</label>
                  <input 
                    type="text"
                    placeholder="Título do Banner"
                    value={newLink.title}
                    onChange={(e) => setNewLink(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  />
                  <input 
                    type="text"
                    placeholder="URL de Afiliado"
                    value={newLink.url}
                    onChange={(e) => setNewLink(prev => ({ ...prev, url: e.target.value }))}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Caminhos Digitais (URL)</label>
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                      <input 
                        type="text"
                        placeholder="URL da Imagem (Thumbnail)"
                        value={newLink.imageUrl}
                        onChange={(e) => setNewLink(prev => ({ ...prev, imageUrl: e.target.value }))}
                        className="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      />
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="p-3 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-colors flex items-center justify-center min-w-[48px]"
                        title="Upload de Imagem"
                      >
                        <Upload size={18} />
                      </button>
                    </div>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, 'image')}
                    />
                  </div>
                  {newLink.type === 'video' && (
                    <div className="flex flex-col gap-2">
                      <div className="flex gap-2">
                        <input 
                          type="text"
                          placeholder="URL do Vídeo (.mp4)"
                          value={newLink.videoUrl}
                          onChange={(e) => setNewLink(prev => ({ ...prev, videoUrl: e.target.value }))}
                          className="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                        />
                        <button 
                          onClick={() => videoInputRef.current?.click()}
                          className="p-3 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-colors flex items-center justify-center min-w-[48px]"
                          title="Upload de Vídeo"
                        >
                          <Upload size={18} />
                        </button>
                      </div>
                      <input 
                        type="file" 
                        ref={videoInputRef} 
                        className="hidden" 
                        accept="video/*"
                        onChange={(e) => handleFileUpload(e, 'video')}
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Página (Placement)</label>
                    <select 
                      value={newLink.placement}
                      onChange={(e) => setNewLink(prev => ({ ...prev, placement: e.target.value as any }))}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    >
                      <option value="all">Todas as Páginas</option>
                      <option value="home">Página Inicial</option>
                      <option value="bg-remover">Remover Fundo</option>
                      <option value="tools">Recursos/Ferramentas</option>
                      <option value="batch">Processamento em Lote</option>
                      <option value="generate">Criar com IA</option>
                      <option value="signup">Cadastramento</option>
                      <option value="profile">Perfil do Usuário</option>
                      <option value="notifications">Notificações</option>
                      <option value="history">Histórico</option>
                      <option value="hap-grandi">HAP Grandi</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Lugar na Página (Layout)</label>
                    <select 
                      value={newLink.layout}
                      onChange={(e) => setNewLink(prev => ({ ...prev, layout: e.target.value as any }))}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    >
                      <option value="top">Superior (Top)</option>
                      <option value="bottom">Inferior (Footer Area)</option>
                      <option value="sidebar">Laterais (Sidebar Area)</option>
                      <option value="horizontal">Geral Horizontal</option>
                      <option value="vertical">Geral Vertical</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Formato do Banner (Ratio)</label>
                  <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                    {(['horizontal', 'vertical', 'square'] as const).map((r) => (
                      <button 
                        key={r}
                        onClick={() => setNewLink(prev => ({ ...prev, ratio: r }))}
                        className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${newLink.ratio === r ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500'}`}
                      >
                        {r === 'horizontal' ? 'Horizontal' : r === 'vertical' ? 'Vertical' : 'Quadrado'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Pré-visualização</label>
                <div className={`bg-slate-100 dark:bg-slate-800 rounded-2xl overflow-hidden relative border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center group transition-all duration-500 ${
                  newLink.ratio === 'horizontal' ? 'aspect-video' : newLink.ratio === 'vertical' ? 'aspect-[3/4] max-h-[300px]' : 'aspect-square max-h-[300px]'
                }`}>
                  {newLink.imageUrl ? (
                    <>
                      <img 
                        src={newLink.imageUrl} 
                        alt="Preview" 
                        className="w-full h-full object-cover"
                      />
                      <button 
                        onClick={() => setNewLink(prev => ({ ...prev, imageUrl: '' }))}
                        className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-600"
                      >
                        <CloseIcon size={14} />
                      </button>
                    </>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <ImageIcon size={32} />
                      <span className="text-[10px] font-black uppercase tracking-widest">Sem Imagem</span>
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 p-4">
                    <p className="text-[10px] font-black text-white uppercase tracking-widest opacity-60">Banner Final</p>
                    <h4 className="text-sm font-bold text-white truncate">{newLink.title || 'Título do Banner'}</h4>
                  </div>
                </div>
              </div>
            </div>
            <button 
              onClick={addAffiliateLink}
              className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 transition-all ${
                editingLinkId 
                  ? 'bg-amber-600 text-white hover:bg-amber-700 shadow-xl shadow-amber-600/20' 
                  : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:scale-[1.01] active:scale-[0.98] shadow-xl'
              }`}
            >
              {editingLinkId ? <Save size={18} /> : <Plus size={18} />}
              <span className="truncate">
                {editingLinkId ? 'Salvar Alterações' : `Novo Banner ${newLink.type === 'video' ? 'de Vídeo' : 'de Imagem'}`}
              </span>
            </button>
          </div>

          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {settings?.affiliateLinks && settings.affiliateLinks.map((link) => (
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
                    onClick={() => startEditing(link)}
                    title="Editar Banner"
                    className="p-2 text-slate-400 hover:text-indigo-600 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors"
                  >
                    <Edit size={16} />
                  </button>
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
            {(!settings?.affiliateLinks || settings.affiliateLinks.length === 0) && (
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
      <section className="bg-slate-900 rounded-[2.5rem] p-12 text-white relative">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Layout size={120} />
        </div>
        <div className="relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <h3 className="text-xl font-black flex items-center gap-3">
                <Layout className="text-indigo-400" />
                Pré-visualização de Anúncios
              </h3>
              <p className="text-slate-400 text-xs mt-1">Veja como seus anúncios atuais aparecem em tempo real no app.</p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 rounded-full border border-slate-700">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">Live Preview</span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <div className="aspect-[4/3] bg-slate-800 rounded-3xl border border-slate-700 flex flex-col items-center justify-center p-6 text-center space-y-3">
              <div className="w-12 h-12 bg-slate-700 rounded-2xl flex items-center justify-center text-slate-500">
                <Globe size={24} />
              </div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Espaço AdSense</p>
              <p className="text-[10px] text-slate-500 font-medium">O Google AdSense preencherá este espaço automaticamente.</p>
            </div>
            
            {settings?.affiliateLinks && settings.affiliateLinks.map((link) => (
              <div key={link.id} className={`aspect-[4/3] bg-slate-800 rounded-3xl border border-slate-700 overflow-hidden relative group transition-all duration-300 hover:border-indigo-500/50 hover:shadow-xl hover:shadow-indigo-500/10 ${!link.active ? 'grayscale opacity-50' : ''}`}>
                {link.type === 'video' && link.videoUrl ? (
                  <video 
                    src={link.videoUrl} 
                    autoPlay 
                    muted 
                    loop 
                    playsInline 
                    className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity"
                  />
                ) : (
                  <img src={link.imageUrl} alt="" className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                )}
                {!link.active && (
                  <div className="absolute top-4 right-4 z-20">
                    <span className="px-2 py-0.5 bg-slate-900 border border-slate-700 text-[8px] font-black uppercase tracking-tighter rounded">Inativo</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/40 to-transparent p-6 flex flex-col justify-end">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="px-2 py-0.5 bg-indigo-600 text-[8px] font-black uppercase tracking-widest rounded-sm">
                      {link.type === 'video' ? 'Vídeo' : 'Imagem'}
                    </span>
                    <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-tighter truncate max-w-[100px]">
                      {link.placement}
                    </span>
                  </div>
                  <h4 className="font-bold text-sm leading-tight line-clamp-2">{link.title}</h4>
                </div>
              </div>
            ))}
            
            {settings?.affiliateLinks && settings.affiliateLinks.length < 3 && Array.from({ length: 3 - settings.affiliateLinks.length }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-[4/3] bg-slate-800/40 rounded-3xl border-2 border-dashed border-slate-700 flex flex-col items-center justify-center text-slate-600 group hover:border-slate-600 transition-colors">
                <Plus className="opacity-20 group-hover:opacity-40 transition-opacity mb-2" />
                <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Ad Virtual</p>
              </div>
            ))}
          </div>
          
          <div className="mt-12 pt-8 border-t border-slate-800 text-center">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Total de Ativos Publicitários: {(settings?.affiliateLinks?.length || 0) + (settings.adsenseEnabled ? 1 : 0)}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
