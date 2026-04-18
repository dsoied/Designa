import React, { useState, useRef, useEffect } from 'react';
import { User, Bell, Shield, Moon, Globe, CreditCard, LogOut, ChevronRight, Camera, Crown, Image as ImageIcon, Upload, Check, Loader2, Zap, Languages, RefreshCw, Eye, EyeOff, Sparkles, Maximize2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { FirebaseUser, db, doc, setDoc, uploadImageToStorage, getDoc, addDoc, collection, auth, handleFirestoreError, OperationType, updateProfile, serverTimestamp } from '../firebase';
import { usageService, UserUsage } from '../services/usageService';
import { AppConfig } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { Language } from '../translations';

interface SettingsProps {
  user: FirebaseUser | null;
  userData?: any;
  userRole?: string;
  appConfig?: AppConfig;
  onNotify: (message: string, type: 'success' | 'warning' | 'info') => void;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
}

export function Settings({ user, userData, userRole, appConfig, onNotify, theme, onToggleTheme }: SettingsProps) {
  const { t, language, setLanguage } = useLanguage();
  const [isSaving, setIsSaving] = useState(false);
  const [appName, setAppName] = useState(appConfig?.appName || '');
  const [brandingHeadline, setBrandingHeadline] = useState(appConfig?.brandingHeadline || 'O Futuro da Criatividade');
  const [footerTeamName, setFooterTeamName] = useState(appConfig?.footerTeamName || 'Designa');
  const [pollinationsKey, setPollinationsKey] = useState('');
  const [pexelsKey, setPexelsKey] = useState('');
  const [youcamKey, setYoucamKey] = useState('');
  const [neroKey, setNeroKey] = useState('');
  const [dynaPicturesKey, setDynaPicturesKey] = useState('');
  const [clippingMagicKey, setClippingMagicKey] = useState('');
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseAnonKey, setSupabaseAnonKey] = useState('');
  const [supabaseBucket, setSupabaseBucket] = useState('images');
  const [pixlrClientId, setPixlrClientId] = useState('');
  const [pixlrClientSecret, setPixlrClientSecret] = useState('');
  const [isKeySaved, setIsKeySaved] = useState(false);
  const [isYouCamKeySaved, setIsYouCamKeySaved] = useState(false);
  const [isNeroKeySaved, setIsNeroKeySaved] = useState(false);
  const [isDynaPicturesKeySaved, setIsDynaPicturesKeySaved] = useState(false);
  const [isPexelsKeySaved, setIsPexelsKeySaved] = useState(false);
  const [isClippingMagicKeySaved, setIsClippingMagicKeySaved] = useState(false);
  const [isPixlrSaved, setIsPixlrSaved] = useState(false);
  const [isSupabaseSaved, setIsSupabaseSaved] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [showYouCamKey, setShowYouCamKey] = useState(false);
  const [showNeroKey, setShowNeroKey] = useState(false);
  const [showDynaPicturesKey, setShowDynaPicturesKey] = useState(false);
  const [showPexelsKey, setShowPexelsKey] = useState(false);
  const [showClippingMagicKey, setShowClippingMagicKey] = useState(false);
  const [showPixlrSecret, setShowPixlrSecret] = useState(false);
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const profilePhotoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (appConfig?.appName) setAppName(appConfig.appName);
    if (appConfig?.brandingHeadline) setBrandingHeadline(appConfig.brandingHeadline);
    if (appConfig?.footerTeamName) setFooterTeamName(appConfig.footerTeamName);
  }, [appConfig]);
  const [usage, setUsage] = useState<UserUsage | null>(null);
  const [processing, setProcessing] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);

  const compressImage = (base64: string, maxWidth = 800, quality = 0.7): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = base64;
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > maxWidth) {
            height = (maxWidth / width) * height;
            width = maxWidth;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error("Não foi possível obter o contexto do canvas."));
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        } catch (err) {
          reject(err);
        }
      };
      img.onerror = () => reject(new Error("Erro ao carregar a imagem para compressão."));
    });
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      // Increased limit to 10MB for profile photos
      if (file.size > 10 * 1024 * 1024) {
        reject(new Error("O arquivo é muito grande. O limite é 10MB."));
        return;
      }
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  useEffect(() => {
    const fetchUsage = async () => {
      if (user) {
        const usageRef = doc(db, 'usage', user.uid);
        const snap = await getDoc(usageRef);
        if (snap.exists()) {
          setUsage(snap.data() as UserUsage);
        }
      }
    };
    fetchUsage();
  }, [user]);

  useEffect(() => {
    const fetchAIConfig = async () => {
      try {
        const aiConfigRef = doc(db, 'config', 'ai');
        const snap = await getDoc(aiConfigRef);
        if (snap.exists()) {
          const data = snap.data();
          if (data.pollinationsKey) {
            setPollinationsKey(data.pollinationsKey);
            setIsKeySaved(true);
          }
          if (data.youcamKey) {
            setYoucamKey(data.youcamKey);
            setIsYouCamKeySaved(true);
          }
          if (data.neroKey) {
            setNeroKey(data.neroKey);
            setIsNeroKeySaved(true);
          }
          if (data.dynaPicturesKey) {
            setDynaPicturesKey(data.dynaPicturesKey);
            setIsDynaPicturesKeySaved(true);
          }
          if (data.pexelsKey) {
            setPexelsKey(data.pexelsKey);
            setIsPexelsKeySaved(true);
          }
          if (data.clippingMagicKey) {
            setClippingMagicKey(data.clippingMagicKey);
            setIsClippingMagicKeySaved(true);
          }
          if (data.pixlrClientId) {
            setPixlrClientId(data.pixlrClientId);
          }
          if (data.pixlrClientSecret) {
            setPixlrClientSecret(data.pixlrClientSecret);
          }
          if (data.pixlrClientId && data.pixlrClientSecret) {
            setIsPixlrSaved(true);
          }
        }

        const storageConfigRef = doc(db, 'config', 'storage');
        const storageSnap = await getDoc(storageConfigRef);
        if (storageSnap.exists()) {
          const sData = storageSnap.data();
          if (sData.supabaseUrl) setSupabaseUrl(sData.supabaseUrl);
          if (sData.supabaseAnonKey) setSupabaseAnonKey(sData.supabaseAnonKey);
          if (sData.supabaseBucket) setSupabaseBucket(sData.supabaseBucket);
          if (sData.supabaseUrl && sData.supabaseAnonKey) setIsSupabaseSaved(true);
        }
      } catch (error) {
        console.error("Settings: Erro ao buscar config de IA:", error);
      }
    };
    fetchAIConfig();
  }, []);

  const handleUpdateBranding = async () => {
    if (!appName.trim()) return;
    
    try {
      setIsSaving(true);
      const configRef = doc(db, 'config', 'branding');
      console.log("Settings: Atualizando branding...");
      await setDoc(configRef, {
        ...appConfig,
        appName: appName.trim(),
        brandingHeadline: brandingHeadline.trim(),
        footerTeamName: footerTeamName.trim()
      }, { merge: true });
      
      onNotify('Configurações de branding atualizadas com sucesso!', 'success');
    } catch (error) {
      console.error("Settings: Erro ao atualizar branding:", error);
      onNotify('Erro ao atualizar configurações de branding.', 'warning');
      handleFirestoreError(error, OperationType.WRITE, 'config/branding');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setIsUploading(true);
    console.log('Settings: Iniciando upload de foto de perfil...');
    
    try {
      const base64 = await fileToBase64(file);
      const downloadURL = await uploadImageToStorage(base64, `profile_${user.uid}_${Date.now()}`, `users/${user.uid}/profiles`);
      
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, { photoURL: downloadURL }, { merge: true });
      
      // Also update Auth profile
      await updateProfile(user, {
        photoURL: downloadURL
      });
      
      onNotify(t('updateProfileSuccess'), 'success');
      console.log('Settings: Foto de perfil atualizada com sucesso.');
    } catch (error) {
      console.error('Erro ao fazer upload da foto:', error);
      onNotify(t('uploadPhotoError'), 'warning');
    } finally {
      setIsUploading(false);
      console.log('Settings: setIsUploading(false)');
    }
  };

  const handleBrandingUpload = async (type: 'logo' | 'favicon', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    console.log(`Settings: Iniciando upload de ${type}:`, file.name, file.size, file.type);
    setIsSaving(true);
    setProcessing(true);
    try {
      const base64 = await fileToBase64(file);
      console.log(`Settings: Arquivo convertido para Base64`);
      const compressed = await compressImage(base64, type === 'logo' ? 400 : 64, type === 'logo' ? 0.8 : 0.9);
      console.log(`Settings: Imagem comprimida (tamanho: ${compressed.length} caracteres)`);
      
      const configRef = doc(db, 'config', 'branding');
      await setDoc(configRef, {
        ...appConfig,
        [`${type}Url`]: compressed
      }, { merge: true });

      console.log(`Settings: Documento config/branding atualizado com sucesso`);
      
      // Update favicon dynamically if needed
      if (type === 'favicon') {
        let favicon = document.querySelector('link[rel*="icon"]') as HTMLLinkElement;
        if (!favicon) {
          favicon = document.createElement('link');
          favicon.rel = 'shortcut icon';
          document.head.appendChild(favicon);
        }
        favicon.href = compressed;
      }

      onNotify(`${type === 'logo' ? 'Logo' : 'Favicon'} atualizado com sucesso!`, 'success');
    } catch (error) {
      console.error(`Settings: Erro ao atualizar ${type}:`, error);
      onNotify(error instanceof Error ? error.message : `Erro ao atualizar ${type}.`, 'warning');
      handleFirestoreError(error, OperationType.WRITE, 'config/branding');
    } finally {
      setIsSaving(false);
      setProcessing(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleUpdateAIConfig = async (type: 'pollinations' | 'youcam' | 'nero' | 'clippingmagic' | 'dynapictures' | 'pexels' | 'pixlr') => {
    let keyToSave = '';
    if (type === 'pollinations') keyToSave = pollinationsKey;
    else if (type === 'youcam') keyToSave = youcamKey;
    else if (type === 'nero') keyToSave = neroKey;
    else if (type === 'clippingmagic') keyToSave = clippingMagicKey;
    else if (type === 'dynapictures') keyToSave = dynaPicturesKey;
    else if (type === 'pexels') keyToSave = pexelsKey;
    else if (type === 'pixlr') {
      if (!pixlrClientId.trim() || !pixlrClientSecret.trim()) {
        onNotify('Por favor, preencha o ID do Cliente e o Segredo da Pixlr.', 'warning');
        return;
      }
      keyToSave = 'PixlrConfigMatched'; // Special flag for the next logic block
    }

    if (!keyToSave.trim()) return;
    
    setIsSaving(true);
    try {
      const aiConfigRef = doc(db, 'config', 'ai');
      const updateData: any = {};
      if (type === 'pollinations') updateData.pollinationsKey = keyToSave.trim();
      else if (type === 'youcam') updateData.youcamKey = keyToSave.trim();
      else if (type === 'nero') updateData.neroKey = keyToSave.trim();
      else if (type === 'clippingmagic') updateData.clippingMagicKey = keyToSave.trim();
      else if (type === 'dynapictures') updateData.dynaPicturesKey = keyToSave.trim();
      else if (type === 'pexels') updateData.pexelsKey = keyToSave.trim();
      else if (type === 'pixlr') {
        updateData.pixlrClientId = pixlrClientId.trim();
        updateData.pixlrClientSecret = pixlrClientSecret.trim();
      }
      
      await setDoc(aiConfigRef, updateData, { merge: true });
      
      if (type === 'pollinations') setIsKeySaved(true);
      else if (type === 'youcam') setIsYouCamKeySaved(true);
      else if (type === 'nero') setIsNeroKeySaved(true);
      else if (type === 'clippingmagic') setIsClippingMagicKeySaved(true);
      else if (type === 'dynapictures') setIsDynaPicturesKeySaved(true);
      else if (type === 'pexels') setIsPexelsKeySaved(true);
      else if (type === 'pixlr') setIsPixlrSaved(true);
      
      onNotify(`Chave ${type.toUpperCase()} salva com sucesso!`, 'success');
      
      // Trigger green success overlay
      setShowSuccessOverlay(true);
      setTimeout(() => setShowSuccessOverlay(false), 3000);
    } catch (error) {
      console.error("Settings: Erro ao atualizar config de IA:", error);
      if (user) console.log("Settings: Usuário atual:", user.email, user.uid);
      onNotify('Erro ao salvar chave de IA.', 'warning');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateStorageConfig = async () => {
    if (!supabaseUrl.trim() || !supabaseAnonKey.trim()) {
      onNotify('Por favor, preencha a URL e a Chave Anon do Supabase.', 'warning');
      return;
    }
    
    setIsSaving(true);
    try {
      const storageConfigRef = doc(db, 'config', 'storage');
      await setDoc(storageConfigRef, {
        supabaseUrl: supabaseUrl.trim(),
        supabaseAnonKey: supabaseAnonKey.trim(),
        supabaseBucket: supabaseBucket.trim(),
        updatedAt: serverTimestamp()
      }, { merge: true });
      
      setIsSupabaseSaved(true);
      onNotify('Configurações de armazenamento Supabase salvas com sucesso!', 'success');
      
      setShowSuccessOverlay(true);
      setTimeout(() => setShowSuccessOverlay(false), 3000);
    } catch (error) {
      console.error("Settings: Erro ao atualizar config de armazenamento:", error);
      onNotify('Erro ao salvar configurações do Supabase.', 'warning');
      handleFirestoreError(error, OperationType.WRITE, 'config/storage');
    } finally {
      setIsSaving(false);
    }
  };

  const sections = [
    {
      title: t('personalInfo'),
      items: [
        { icon: User, label: t('displayName'), value: user?.displayName || 'Usuário', color: 'text-blue-600' },
        { icon: CreditCard, label: t('accountType'), value: 'Totalmente Grátis', color: 'text-emerald-600' },
        { icon: Shield, label: 'Segurança', value: 'Protegido', color: 'text-amber-600' },
      ]
    },
    {
      title: t('appearance'),
      items: [
        { 
          icon: theme === 'dark' ? Moon : Moon, 
          label: t('darkMode'), 
          value: theme === 'dark' ? 'Ativado' : 'Desativado', 
          color: 'text-indigo-600',
          onClick: onToggleTheme 
        },
        { icon: Bell, label: 'Notificações', value: 'Ativado', color: 'text-rose-600' },
      ]
    }
  ];

  return (
    <div className="max-w-4xl mx-auto p-6 sm:p-12 relative">
      <AnimatePresence>
        {showSuccessOverlay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-emerald-500/20 backdrop-blur-sm pointer-events-none flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] shadow-2xl border-4 border-emerald-500 flex flex-col items-center gap-4"
            >
              <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-emerald-500/40">
                <Check size={40} strokeWidth={3} />
              </div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Configurações Salvas!</h3>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="mb-12">
        <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-2">{t('settings')}</h2>
        <p className="text-slate-500 dark:text-slate-400">Gerencie sua conta, preferências de interface e configurações de segurança.</p>
      </header>

      <div className="space-y-12">
        {/* Profile Header Card */}
        <section className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center gap-8">
          <div className="relative group">
            <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white text-3xl font-black shadow-xl overflow-hidden">
              {(userData?.photoURL || user?.photoURL) ? (
                <img src={userData?.photoURL || user?.photoURL || ''} alt="User" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                userData?.displayName?.charAt(0) || user?.displayName?.charAt(0) || 'U'
              )}
              {isUploading && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <Loader2 className="text-white animate-spin" size={24} />
                </div>
              )}
            </div>
            <input 
              type="file" 
              ref={profilePhotoInputRef}
              onChange={handlePhotoUpload}
              className="hidden"
              accept="image/*"
            />
            <button 
              onClick={() => profilePhotoInputRef.current?.click()}
              disabled={isUploading}
              className="absolute bottom-0 right-0 p-2 bg-white dark:bg-slate-800 rounded-full shadow-lg border border-slate-100 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-indigo-600 transition-colors disabled:opacity-50"
            >
              <Camera size={16} />
            </button>
          </div>
          <div className="text-center sm:text-left flex-1">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{userData?.displayName || user?.displayName || t('profile')}</h3>
            <p className="text-slate-500 dark:text-slate-400 font-medium">
              Acesso Totalmente Grátis
            </p>
            <div className="mt-4 flex flex-wrap justify-center sm:justify-start gap-2">
              <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs font-bold rounded-full">Editor Master</span>
              <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold rounded-full">Verificado</span>
            </div>
          </div>
        </section>

        {/* Language Selection */}
        <section>
          <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4 ml-2">{t('language')}</h4>
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-purple-600">
                <Languages size={20} />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">{t('language')}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  {language === 'pt' ? 'Português (PT)' : language === 'en' ? 'English (US)' : 'Español (ES)'}
                </p>
              </div>
            </div>
            <select 
              value={language}
              onChange={(e) => setLanguage(e.target.value as Language)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="pt">Português</option>
              <option value="en">English</option>
              <option value="es">Español</option>
            </select>
          </div>
        </section>

        {/* Settings Groups */}
        {sections.map((section, idx) => (
          <section key={idx}>
            <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4 ml-2">{section.title}</h4>
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
              {section.items.map((item, itemIdx) => (
                <button 
                  key={itemIdx}
                  onClick={(item as any).onClick}
                  className={`w-full flex items-center justify-between p-5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${
                    itemIdx !== section.items.length - 1 ? 'border-b border-slate-100 dark:border-slate-800' : ''
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 ${item.color}`}>
                      <item.icon size={20} />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">{item.label}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{item.value}</p>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-slate-300" />
                </button>
              ))}
            </div>
          </section>
        ))}

        {/* AI Configuration - Admin Only */}
        {userRole === 'admin' && (
          <section className="space-y-6">
            <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 ml-2">Configurações de IA</h4>
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <Zap size={16} className="text-indigo-600" />
                  Chave de API Pollinations.ai
                </label>
                <p className="text-xs text-slate-500 mb-4">
                  Insira sua chave do Pollinations.ai para ter maior velocidade e acesso aos modelos Turbo. 
                  Você pode criar uma chave em <a href="https://pollinations.ai" target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">pollinations.ai</a>.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1 relative">
                    <input 
                      type={showKey ? "text" : "password"}
                      value={isKeySaved && !showKey ? "••••••••••••••••" : pollinationsKey}
                      onChange={(e) => setPollinationsKey(e.target.value)}
                      disabled={isKeySaved}
                      placeholder="Cole sua chave aqui..."
                      className={`w-full px-6 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border transition-all font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 pr-24 ${
                        isKeySaved 
                          ? 'border-emerald-500/50 text-emerald-600 dark:text-emerald-400' 
                          : 'border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white'
                      }`}
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowKey(!showKey)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 transition-colors"
                        title={showKey ? "Ocultar" : "Visualizar"}
                      >
                        {showKey ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                      {isKeySaved && (
                        <>
                          <Check size={16} className="text-emerald-500" />
                          <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest hidden sm:inline">Protegida</span>
                        </>
                      )}
                    </div>
                  </div>
                  
                  {!isKeySaved ? (
                    <button 
                      onClick={() => handleUpdateAIConfig('pollinations')}
                      disabled={isSaving || !pollinationsKey.trim()}
                      className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20"
                    >
                      {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Zap size={18} />}
                      Salvar Chave
                    </button>
                  ) : (
                    <button 
                      onClick={() => {
                        setPollinationsKey('');
                        setIsKeySaved(false);
                      }}
                      className="px-8 py-4 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black rounded-2xl hover:bg-slate-300 dark:hover:bg-slate-700 transition-all flex items-center justify-center gap-2"
                    >
                      <RefreshCw size={18} />
                      Alterar Chave
                    </button>
                  )}
                </div>
              </div>

              <div className="w-full h-px bg-slate-100 dark:bg-slate-800"></div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <Shield size={16} className="text-orange-600" />
                  Chave de API Nero AI
                </label>
                <p className="text-xs text-slate-500 mb-4">
                  A Nero AI oferece modelos de ponta para upscale e restauração. 
                  Obtenha sua chave no <a href="https://ai.nero.com/business/api" target="_blank" rel="noreferrer" className="text-orange-600 hover:underline">Nero AI API Portal</a>.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1 relative">
                    <input 
                      type={showNeroKey ? "text" : "password"}
                      value={isNeroKeySaved && !showNeroKey ? "••••••••••••••••" : neroKey}
                      onChange={(e) => setNeroKey(e.target.value)}
                      disabled={isNeroKeySaved}
                      placeholder="Cole sua chave Nero AI aqui..."
                      className={`w-full px-6 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border transition-all font-mono text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 pr-24 ${
                        isNeroKeySaved 
                          ? 'border-emerald-500/50 text-emerald-600 dark:text-emerald-400' 
                          : 'border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white'
                      }`}
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowNeroKey(!showNeroKey)}
                        className="p-1.5 text-slate-400 hover:text-orange-600 transition-colors"
                      >
                        {showNeroKey ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                      {isNeroKeySaved && (
                        <Check size={16} className="text-emerald-500" />
                      )}
                    </div>
                  </div>
                  
                  {!isNeroKeySaved ? (
                    <button 
                      onClick={() => handleUpdateAIConfig('nero')}
                      disabled={isSaving || !neroKey.trim()}
                      className="px-8 py-4 bg-orange-600 hover:bg-orange-700 text-white font-black rounded-2xl transition-all disabled:opacity-50 shadow-lg shadow-orange-500/20"
                    >
                      Salvar Chave
                    </button>
                  ) : (
                    <button 
                      onClick={() => {
                        setNeroKey('');
                        setIsNeroKeySaved(false);
                      }}
                      className="px-8 py-4 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black rounded-2xl hover:bg-slate-300 dark:hover:bg-slate-700 transition-all"
                    >
                      Alterar
                    </button>
                  )}
                </div>
              </div>

              <div className="w-full h-px bg-slate-100 dark:bg-slate-800"></div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <Maximize2 size={16} className="text-blue-600" />
                  Chave de API Clipping Magic
                </label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1 relative">
                    <input 
                      type={showClippingMagicKey ? "text" : "password"}
                      value={isClippingMagicKeySaved && !showClippingMagicKey ? "••••••••••••••••" : clippingMagicKey}
                      onChange={(e) => setClippingMagicKey(e.target.value)}
                      disabled={isClippingMagicKeySaved}
                      placeholder="Cole sua chave Clipping Magic aqui..."
                      className={`w-full px-6 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border transition-all font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 pr-24 ${
                        isClippingMagicKeySaved 
                          ? 'border-emerald-500/50 text-emerald-600 dark:text-emerald-400' 
                          : 'border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white'
                      }`}
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowClippingMagicKey(!showClippingMagicKey)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors"
                      >
                        {showClippingMagicKey ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                      {isClippingMagicKeySaved && (
                        <Check size={16} className="text-emerald-500" />
                      )}
                    </div>
                  </div>
                  
                  {!isClippingMagicKeySaved ? (
                    <button 
                      onClick={() => handleUpdateAIConfig('clippingmagic')}
                      disabled={isSaving || !clippingMagicKey.trim()}
                      className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl transition-all disabled:opacity-50 shadow-lg shadow-blue-500/20"
                    >
                      Salvar Chave
                    </button>
                  ) : (
                    <button 
                      onClick={() => {
                        setClippingMagicKey('');
                        setIsClippingMagicKeySaved(false);
                      }}
                      className="px-8 py-4 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black rounded-2xl hover:bg-slate-300 dark:hover:bg-slate-700 transition-all"
                    >
                      Alterar
                    </button>
                  )}
                </div>
              </div>

              <div className="w-full h-px bg-slate-100 dark:bg-slate-800"></div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <Sparkles size={16} className="text-purple-600" />
                  Chave de API YouCam (Perfect Corp)
                </label>
                <p className="text-xs text-slate-500 mb-4">
                  A YouCam oferece tecnologias líderes mundiais de Realidade Aumentada e IA para beleza e moda. 
                  Obtenha sua chave no <a href="https://www.perfectcorp.com/business/solutions/ai-console" target="_blank" rel="noreferrer" className="text-purple-600 hover:underline">Perfect Corp AI Console</a>.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1 relative">
                    <input 
                      type={showYouCamKey ? "text" : "password"}
                      value={isYouCamKeySaved && !showYouCamKey ? "••••••••••••••••" : youcamKey}
                      onChange={(e) => setYoucamKey(e.target.value)}
                      disabled={isYouCamKeySaved}
                      placeholder="Cole sua chave YouCam aqui..."
                      className={`w-full px-6 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border transition-all font-mono text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 pr-24 ${
                        isYouCamKeySaved 
                          ? 'border-emerald-500/50 text-emerald-600 dark:text-emerald-400' 
                          : 'border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white'
                      }`}
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowYouCamKey(!showYouCamKey)}
                        className="p-1.5 text-slate-400 hover:text-purple-600 transition-colors"
                        title={showYouCamKey ? "Ocultar" : "Visualizar"}
                      >
                        {showYouCamKey ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                      {isYouCamKeySaved && (
                        <>
                          <Check size={16} className="text-emerald-500" />
                          <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest hidden sm:inline">Protegida</span>
                        </>
                      )}
                    </div>
                  </div>
                  
                  {!isYouCamKeySaved ? (
                    <button 
                      onClick={() => handleUpdateAIConfig('youcam')}
                      disabled={isSaving || !youcamKey.trim()}
                      className="px-8 py-4 bg-purple-600 hover:bg-purple-700 text-white font-black rounded-2xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20"
                    >
                      {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                      Salvar Chave
                    </button>
                  ) : (
                    <button 
                      onClick={() => {
                        setYoucamKey('');
                        setIsYouCamKeySaved(false);
                      }}
                      className="px-8 py-4 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black rounded-2xl hover:bg-slate-300 dark:hover:bg-slate-700 transition-all flex items-center justify-center gap-2"
                    >
                      <RefreshCw size={18} />
                      Alterar Chave
                    </button>
                  )}
                </div>
              </div>

              <div className="w-full h-px bg-slate-100 dark:bg-slate-800"></div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <Zap size={16} className="text-pink-600" />
                    Chave de API DynaPictures (Automação Criativa)
                  </label>
                  <a 
                    href="https://dynapictures.com/dashboard/api-keys" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 transition-colors uppercase tracking-widest bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded"
                  >
                    Obter Chave
                  </a>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1 relative">
                    <input 
                      type={showDynaPicturesKey ? "text" : "password"}
                      value={isDynaPicturesKeySaved && !showDynaPicturesKey ? "••••••••••••••••" : dynaPicturesKey}
                      onChange={(e) => setDynaPicturesKey(e.target.value)}
                      disabled={isDynaPicturesKeySaved}
                      placeholder="Cole sua chave DynaPictures aqui..."
                      className={`w-full px-6 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border transition-all font-mono text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/50 pr-24 ${
                        isDynaPicturesKeySaved 
                          ? 'border-emerald-500/50 text-emerald-600 dark:text-emerald-400' 
                          : 'border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white'
                      }`}
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                      <button 
                        type="button"
                        onClick={() => setShowDynaPicturesKey(!showDynaPicturesKey)}
                        className="p-1.5 text-slate-400 hover:text-pink-600 transition-colors"
                      >
                        {showDynaPicturesKey ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                      {isDynaPicturesKeySaved && (
                        <Check size={16} className="text-emerald-500" />
                      )}
                    </div>
                  </div>
                  
                  {!isDynaPicturesKeySaved ? (
                    <button 
                      onClick={() => handleUpdateAIConfig('dynapictures')}
                      disabled={isSaving || !dynaPicturesKey.trim()}
                      className="px-8 py-4 bg-pink-600 hover:bg-pink-700 text-white font-black rounded-2xl transition-all disabled:opacity-50 shadow-lg shadow-pink-500/20"
                    >
                      Salvar Chave
                    </button>
                  ) : (
                    <button 
                      onClick={() => {
                        setDynaPicturesKey('');
                        setIsDynaPicturesKeySaved(false);
                      }}
                      className="px-8 py-4 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black rounded-2xl hover:bg-slate-300 dark:hover:bg-slate-700 transition-all"
                    >
                      Alterar
                    </button>
                  )}
                </div>
              </div>

              <div className="w-full h-px bg-slate-100 dark:bg-slate-800"></div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <ImageIcon size={16} className="text-blue-500" />
                    Chave de API Pexels (Banco de Imagens Stock)
                  </label>
                  <a 
                    href="https://www.pexels.com/api/new/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 transition-colors uppercase tracking-widest bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded"
                  >
                    Obter Chave
                  </a>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1 relative">
                    <input 
                      type={showPexelsKey ? "text" : "password"}
                      value={isPexelsKeySaved && !showPexelsKey ? "••••••••••••••••" : pexelsKey}
                      onChange={(e) => setPexelsKey(e.target.value)}
                      disabled={isPexelsKeySaved}
                      placeholder="Cole sua chave Pexels aqui..."
                      className={`w-full px-6 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border transition-all font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 pr-24 ${
                        isPexelsKeySaved 
                          ? 'border-emerald-500/50 text-emerald-600 dark:text-emerald-400' 
                          : 'border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white'
                      }`}
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                      <button 
                        type="button"
                        onClick={() => setShowPexelsKey(!showPexelsKey)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors"
                      >
                        {showPexelsKey ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                      {isPexelsKeySaved && (
                        <Check size={16} className="text-emerald-500" />
                      )}
                    </div>
                  </div>
                  
                  {!isPexelsKeySaved ? (
                    <button 
                      onClick={() => handleUpdateAIConfig('pexels')}
                      disabled={isSaving || !pexelsKey.trim()}
                      className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl transition-all disabled:opacity-50 shadow-lg shadow-blue-500/20"
                    >
                      Salvar Chave
                    </button>
                  ) : (
                    <button 
                      onClick={() => {
                        setPexelsKey('');
                        setIsPexelsKeySaved(false);
                      }}
                      className="px-8 py-4 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black rounded-2xl hover:bg-slate-300 dark:hover:bg-slate-700 transition-all flex items-center justify-center gap-2"
                    >
                      <RefreshCw size={18} />
                      Alterar Chave
                    </button>
                  )}
                </div>
              </div>

              <div className="w-full h-px bg-slate-100 dark:bg-slate-800"></div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <Maximize2 size={16} className="text-emerald-500" />
                    Configurações Pixlr (Editor & Design)
                  </label>
                  <a 
                    href="https://pixlr.com/developer/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 transition-colors uppercase tracking-widest bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded"
                  >
                    Site Developer
                  </a>
                </div>
                
                <div className="space-y-3">
                  <div className="relative">
                    <input 
                      type="text"
                      value={isPixlrSaved ? "••••••••••••••••" : pixlrClientId}
                      onChange={(e) => setPixlrClientId(e.target.value)}
                      disabled={isPixlrSaved}
                      placeholder="ID do Cliente Pixlr"
                      className={`w-full px-6 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border transition-all font-mono text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${
                        isPixlrSaved 
                          ? 'border-emerald-500/50 text-emerald-600 dark:text-emerald-400 font-bold' 
                          : 'border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white'
                      }`}
                    />
                  </div>

                  <div className="relative">
                    <input 
                      type={showPixlrSecret ? "text" : "password"}
                      value={isPixlrSaved && !showPixlrSecret ? "••••••••••••••••" : pixlrClientSecret}
                      onChange={(e) => setPixlrClientSecret(e.target.value)}
                      disabled={isPixlrSaved}
                      placeholder="Segredo da Chave Pixlr"
                      className={`w-full px-6 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border transition-all font-mono text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 pr-12 ${
                        isPixlrSaved 
                          ? 'border-emerald-500/50 text-emerald-600 dark:text-emerald-400 font-bold' 
                          : 'border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white'
                      }`}
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPixlrSecret(!showPixlrSecret)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-500 transition-colors"
                    >
                      {showPixlrSecret ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  
                  {!isPixlrSaved ? (
                    <button 
                      onClick={() => handleUpdateAIConfig('pixlr')}
                      disabled={isSaving || !pixlrClientId.trim() || !pixlrClientSecret.trim()}
                      className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl transition-all disabled:opacity-50 shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
                    >
                      {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Shield size={18} />}
                      Salvar Chaves Pixlr
                    </button>
                  ) : (
                    <button 
                      onClick={() => {
                        setPixlrClientId('');
                        setPixlrClientSecret('');
                        setIsPixlrSaved(false);
                      }}
                      className="w-full py-4 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black rounded-2xl hover:bg-slate-300 dark:hover:bg-slate-700 transition-all flex items-center justify-center gap-2"
                    >
                      <RefreshCw size={18} />
                      Alterar Chaves
                    </button>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Storage Configuration - Admin Only */}
        {userRole === 'admin' && (
          <section className="space-y-6">
            <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 ml-2">Configurações de Armazenamento</h4>
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm space-y-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 rounded-xl">
                    <Check size={20} />
                  </div>
                  <div>
                    <h5 className="text-sm font-bold text-slate-900 dark:text-white">Supabase Storage</h5>
                    <p className="text-xs text-slate-500">Alternativa gratuita e ilimitada ao Firebase Storage.</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Supabase URL</label>
                    <input 
                      type="text"
                      value={supabaseUrl}
                      onChange={(e) => setSupabaseUrl(e.target.value)}
                      placeholder="https://your-project.supabase.co"
                      className="w-full px-6 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-all font-mono text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Supabase Anon Key</label>
                    <input 
                      type="password"
                      value={supabaseAnonKey}
                      onChange={(e) => setSupabaseAnonKey(e.target.value)}
                      placeholder="Sua chave anônima (anon key)..."
                      className="w-full px-6 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-all font-mono text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Supabase Bucket Name</label>
                    <input 
                      type="text"
                      value={supabaseBucket}
                      onChange={(e) => setSupabaseBucket(e.target.value)}
                      placeholder="images"
                      className="w-full px-6 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-all font-mono text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button 
                    onClick={handleUpdateStorageConfig}
                    disabled={isSaving || !supabaseUrl.trim() || !supabaseAnonKey.trim() || !supabaseBucket.trim()}
                    className="w-full sm:w-auto px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                  >
                    {isSaving ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
                    Salvar Configurações Supabase
                  </button>
                </div>

                <div className="bg-emerald-50 dark:bg-emerald-900/10 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-800/50">
                  <p className="text-[10px] text-emerald-700/70 dark:text-emerald-400/70 leading-relaxed">
                    <strong>Importante:</strong> Certifique-se de criar um bucket chamado <code className="bg-emerald-100 dark:bg-emerald-800 px-1 rounded text-emerald-800 dark:text-emerald-200">images</code> com acesso público no seu painel do Supabase.
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Admin Branding Section */}
        {userRole === 'admin' && (
          <section className="space-y-6">
            <div className="flex items-center justify-between px-2">
              <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">{t('branding')}</h4>
              {(isSaving || processing) && (
                <div className="flex items-center gap-2 text-indigo-600 text-[10px] font-bold uppercase tracking-widest animate-pulse">
                  <Loader2 size={12} className="animate-spin" />
                  Processando...
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* App Name Setting */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 md:col-span-2">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-xl">
                    <Globe size={20} />
                  </div>
                  <div>
                    <h5 className="text-sm font-bold text-slate-900 dark:text-white">Identidade Visual</h5>
                    <p className="text-[10px] text-slate-500 font-medium">Configure os textos da sua plataforma</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t('appName')}</label>
                    <input 
                      type="text" 
                      value={appName}
                      onChange={(e) => setAppName(e.target.value.slice(0, 50))}
                      placeholder="Ex: Designa"
                      maxLength={50}
                      className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Slogan de Branding (Topo)</label>
                    <input 
                      type="text" 
                      value={brandingHeadline}
                      onChange={(e) => setBrandingHeadline(e.target.value)}
                      placeholder="Ex: O Futuro da Criatividade"
                      className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nome da Equipa (Rodapé)</label>
                    <input 
                      type="text" 
                      value={footerTeamName}
                      onChange={(e) => setFooterTeamName(e.target.value)}
                      placeholder="Ex: Designa"
                      className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    />
                  </div>

                  <button 
                    onClick={handleUpdateBranding}
                    disabled={isSaving || !appName.trim()}
                    className="w-full py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-500/20 hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                  >
                    {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                    {t('save')}
                  </button>
                </div>
              </div>

              {/* Logo Upload */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-xl">
                    <ImageIcon size={20} />
                  </div>
                  <div>
                    <h5 className="text-sm font-bold text-slate-900 dark:text-white">{t('appLogo')}</h5>
                    <p className="text-[10px] text-slate-500 font-medium">Aparece na barra lateral</p>
                  </div>
                </div>
                
                <div className="aspect-video rounded-2xl bg-slate-50 dark:bg-slate-800/50 border-2 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center p-4 relative group overflow-hidden">
                  {appConfig?.logoUrl ? (
                    <img src={appConfig.logoUrl} alt="Logo Preview" className="max-h-full max-w-full object-contain" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="text-center space-y-2">
                      <Upload className="mx-auto text-slate-300" size={32} />
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Sem Logo Definida</p>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button 
                      onClick={() => logoInputRef.current?.click()}
                      className="px-4 py-2 bg-white text-slate-900 rounded-xl text-xs font-bold shadow-xl hover:scale-105 transition-transform"
                    >
                      Alterar Logo
                    </button>
                    {appConfig?.logoUrl && (
                      <button 
                        onClick={async () => {
                          const configRef = doc(db, 'config', 'branding');
                          await setDoc(configRef, { ...appConfig, logoUrl: '' }, { merge: true });
                          onNotify('Logo removido.', 'info');
                        }}
                        className="px-4 py-2 bg-red-500 text-white rounded-xl text-xs font-bold shadow-xl hover:scale-105 transition-transform"
                      >
                        Remover
                      </button>
                    )}
                  </div>
                </div>
                <input 
                  type="file" 
                  ref={logoInputRef} 
                  onChange={(e) => handleBrandingUpload('logo', e)} 
                  accept="image/*" 
                  className="hidden" 
                />
              </div>

              {/* Favicon Upload */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-amber-50 dark:bg-amber-900/30 text-amber-600 rounded-xl">
                    <Globe size={20} />
                  </div>
                  <div>
                    <h5 className="text-sm font-bold text-slate-900 dark:text-white">Favicon (Ícone do Navegador)</h5>
                    <p className="text-[10px] text-slate-500 font-medium">Aparece na aba do navegador</p>
                  </div>
                </div>
                
                <div className="aspect-video rounded-2xl bg-slate-50 dark:bg-slate-800/50 border-2 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center p-4 relative group overflow-hidden">
                  {appConfig?.faviconUrl ? (
                    <div className="flex flex-col items-center gap-3">
                      <img src={appConfig.faviconUrl} alt="Favicon Preview" className="w-12 h-12 object-contain shadow-md rounded-lg" referrerPolicy="no-referrer" />
                      <p className="text-[10px] text-slate-500 font-bold uppercase">Favicon Ativo</p>
                    </div>
                  ) : (
                    <div className="text-center space-y-2">
                      <Globe className="mx-auto text-slate-300" size={32} />
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Sem Favicon Definido</p>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button 
                      onClick={() => faviconInputRef.current?.click()}
                      className="px-4 py-2 bg-white text-slate-900 rounded-xl text-xs font-bold shadow-xl hover:scale-105 transition-transform"
                    >
                      Alterar Favicon
                    </button>
                    {appConfig?.faviconUrl && (
                      <button 
                        onClick={async () => {
                          const configRef = doc(db, 'config', 'branding');
                          await setDoc(configRef, { ...appConfig, faviconUrl: '' }, { merge: true });
                          onNotify('Favicon removido.', 'info');
                        }}
                        className="px-4 py-2 bg-red-500 text-white rounded-xl text-xs font-bold shadow-xl hover:scale-105 transition-transform"
                      >
                        Remover
                      </button>
                    )}
                  </div>
                </div>
                <input 
                  type="file" 
                  ref={faviconInputRef} 
                  onChange={(e) => handleBrandingUpload('favicon', e)} 
                  accept="image/*" 
                  className="hidden" 
                />
              </div>
            </div>
          </section>
        )}

        {/* Danger Zone */}
        <section className="pt-8 border-t border-slate-100 dark:border-slate-800">
          <button 
            onClick={() => auth.signOut()}
            className="w-full flex items-center justify-center gap-2 p-4 bg-rose-50 dark:bg-rose-900/10 text-rose-600 rounded-2xl font-bold hover:bg-rose-100 dark:hover:bg-rose-900/20 transition-colors"
          >
            <LogOut size={20} />
            {t('logout')}
          </button>
          <p className="text-center text-[10px] text-slate-400 mt-6 font-medium uppercase tracking-widest">
            Versão 2.4.0 • Build 20260328
          </p>
        </section>
      </div>
    </div>
  );
}
