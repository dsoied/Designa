import React, { useState, useRef, useEffect } from 'react';
import { User, Bell, Shield, Moon, Globe, CreditCard, LogOut, ChevronRight, Camera, Crown, Image as ImageIcon, Upload, Check, Loader2, Zap, Languages } from 'lucide-react';
import { motion } from 'motion/react';
import { FirebaseUser, db, doc, setDoc, uploadImageToStorage, getDoc, addDoc, collection, auth, handleFirestoreError, OperationType, updateProfile } from '../firebase';
import { usageService, UserUsage } from '../services/usageService';
import { AppConfig } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { Language } from '../translations';

interface SettingsProps {
  user: FirebaseUser | null;
  userData?: any;
  userRole?: string;
  onOpenPricing: () => void;
  appConfig?: AppConfig;
  onNotify: (message: string, type: 'success' | 'warning' | 'info') => void;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
}

export function Settings({ user, userData, userRole, onOpenPricing, appConfig, onNotify, theme, onToggleTheme }: SettingsProps) {
  const { t, language, setLanguage } = useLanguage();
  const [isSaving, setIsSaving] = useState(false);
  const [appName, setAppName] = useState(appConfig?.appName || '');
  const [brandingHeadline, setBrandingHeadline] = useState(appConfig?.brandingHeadline || 'O Futuro da Criatividade');
  const [footerTeamName, setFooterTeamName] = useState(appConfig?.footerTeamName || 'Designa');
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

  const sections = [
    {
      title: t('personalInfo'),
      items: [
        { icon: User, label: t('displayName'), value: user?.displayName || 'Usuário', color: 'text-blue-600' },
        { icon: CreditCard, label: t('accountType'), value: userRole === 'pro' ? t('pro') : userRole === 'admin' ? t('admin') : t('free'), color: 'text-emerald-600' },
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
    <div className="max-w-4xl mx-auto p-6 sm:p-12">
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
              {userRole === 'pro' ? t('pro') : userRole === 'admin' ? t('admin') : t('free')}
            </p>
            <div className="mt-4 flex flex-wrap justify-center sm:justify-start gap-2">
              {userRole === 'pro' && <span className="px-3 py-1 bg-yellow-400 text-white text-xs font-bold rounded-full flex items-center gap-1"><Crown size={12} /> Pro</span>}
              <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs font-bold rounded-full">Editor Master</span>
              <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold rounded-full">Verificado</span>
            </div>
          </div>
          {/* Usage Stats for Free Users */}
          {(userRole !== 'pro' && userRole !== 'admin') && (
            <div className="w-full sm:w-auto bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 border border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-3 mb-3">
                <Zap className="text-indigo-600" size={18} />
                <span className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Uso Diário IA</span>
              </div>
              <div className="w-full sm:w-48 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-indigo-600 transition-all duration-500" 
                  style={{ width: `${((usage?.dailyCount || 0) / 5) * 100}%` }}
                />
              </div>
              <div className="flex justify-between items-center mt-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{usage?.dailyCount || 0} / 5 Usos</span>
                <button 
                  onClick={onOpenPricing}
                  className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline"
                >
                  Aumentar Limite
                </button>
              </div>
            </div>
          )}
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
