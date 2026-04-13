import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { 
  User, 
  Mail, 
  Shield, 
  Settings, 
  LogOut, 
  Camera, 
  CheckCircle2, 
  Clock, 
  CreditCard, 
  Crown,
  Edit2,
  Save,
  X,
  RefreshCw,
  Sparkles,
  KeyRound as LockIcon
} from 'lucide-react';
import { auth, db, logout, updateDoc, doc, onSnapshot, handleFirestoreError, OperationType, uploadImageToStorage, updateProfile } from '../firebase';
import { useLanguage } from '../context/LanguageContext';

interface UserProfileProps {
  onNavigate: (screen: any) => void;
  userRole?: string;
}

interface UserData {
  displayName?: string;
  email?: string;
  photoURL?: string;
  role?: string;
  createdAt?: any;
  planSelected?: boolean;
}

export function UserProfile({ onNavigate, userRole }: UserProfileProps) {
  const { t, language } = useLanguage();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!auth.currentUser) return;

    const userRef = doc(db, 'users', auth.currentUser.uid);
    const unsubscribe = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as UserData;
        setUserData(data);
        setNewName(data.displayName || '');
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${auth.currentUser?.uid}`);
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      onNavigate('home');
    } catch (error) {
      console.error('Erro ao sair:', error);
    }
  };

  const handleUpdateProfile = async () => {
    if (!auth.currentUser || !newName.trim()) return;
    
    setIsSaving(true);
    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userRef, {
        displayName: newName.trim()
      });
      setIsEditing(false);
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      alert(t('updateProfileError'));
    } finally {
      setIsSaving(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !auth.currentUser) return;

    // Basic validation
    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione uma imagem válida.');
      return;
    }

    // Increased limit to 10MB
    if (file.size > 10 * 1024 * 1024) {
      alert('A imagem deve ter no máximo 10MB.');
      return;
    }

    setIsUploading(true);
    console.log('UserProfile: Iniciando processamento do arquivo de perfil:', file.name);
    
    try {
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        const timeoutId = setTimeout(() => reject(new Error('Timeout na leitura do arquivo')), 10000);
        reader.onload = () => {
          clearTimeout(timeoutId);
          resolve(reader.result as string);
        };
        reader.onerror = (err) => {
          clearTimeout(timeoutId);
          reject(err);
        };
        reader.readAsDataURL(file);
      });

      const fileName = `profile_${auth.currentUser?.uid}_${Date.now()}`;
      console.log('UserProfile: Iniciando upload da foto para o storage...');
      const downloadURL = await uploadImageToStorage(base64Data, fileName, `users/${auth.currentUser?.uid}/profiles`);
      console.log('UserProfile: Upload concluído, URL:', downloadURL);
      
      const userRef = doc(db, 'users', auth.currentUser?.uid || '');
      await updateDoc(userRef, {
        photoURL: downloadURL
      });
      
      // Also update Auth profile so it reflects in Sidebar/TopBar immediately
      await updateProfile(auth.currentUser, {
        photoURL: downloadURL
      });
      
      console.log('UserProfile: Firestore e Perfil Auth atualizados com a nova foto.');
      
      // Reset input value to allow re-uploading the same file if needed
      if (fileInputRef.current) fileInputRef.current.value = '';
      
    } catch (error) {
      console.error('Erro ao fazer upload da foto:', error);
      alert(t('uploadPhotoError'));
    } finally {
      setIsUploading(false);
      console.log('UserProfile: setIsUploading(false)');
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    
    const locale = language === 'pt' ? 'pt-BR' : language === 'en' ? 'en-US' : 'es-ES';
    
    return new Intl.DateTimeFormat(locale, {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    }).format(date);
  };

  if (!auth.currentUser) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-6">
        <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-400">
          <User size={40} />
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{t('restrictedAccess')}</h2>
          <p className="text-slate-500">{t('loginToViewProfile')}</p>
        </div>
        <button 
          onClick={() => onNavigate('signup')}
          className="px-8 py-3 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all"
        >
          {t('enterOrRegister')}
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 sm:p-12 space-y-12">
      <header className="flex flex-col md:flex-row items-center gap-8">
        <div className="relative group">
          <div className="w-32 h-32 rounded-[2.5rem] overflow-hidden border-4 border-white dark:border-slate-800 shadow-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
            {userData?.photoURL ? (
              <img src={userData.photoURL} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <User size={48} className="text-slate-400" />
            )}
            {isUploading && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <RefreshCw className="text-white animate-spin" size={24} />
              </div>
            )}
          </div>
          <input 
            type="file" 
            ref={fileInputRef}
            onChange={handlePhotoUpload}
            className="hidden" 
            accept="image/*"
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="absolute bottom-0 right-0 p-3 bg-indigo-600 text-white rounded-2xl shadow-lg hover:scale-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            title={t('uploadPhoto')}
          >
            <Camera size={18} />
          </button>
        </div>

        <div className="flex-1 text-center md:text-left space-y-2">
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            {isEditing ? (
              <div className="flex items-center gap-2">
                <input 
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 border-2 border-indigo-500 rounded-xl outline-none font-bold text-slate-900 dark:text-white"
                  autoFocus
                />
                <button 
                  onClick={handleUpdateProfile}
                  disabled={isSaving}
                  className="p-2 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-all"
                >
                  {isSaving ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />}
                </button>
                <button 
                  onClick={() => setIsEditing(false)}
                  className="p-2 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-300 transition-all"
                >
                  <X size={18} />
                </button>
              </div>
            ) : (
              <>
                <h2 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">
                  {userData?.displayName || t('profile')}
                </h2>
                <button 
                  onClick={() => setIsEditing(true)}
                  className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"
                >
                  <Edit2 size={18} />
                </button>
              </>
            )}
          </div>
          <div className="flex flex-wrap justify-center md:justify-start gap-4">
            <div className="flex items-center gap-2 px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-xs font-bold text-slate-500">
              <Mail size={14} /> {userData?.email}
            </div>
            <div className="flex items-center gap-2 px-3 py-1 bg-indigo-50 dark:bg-indigo-900/20 rounded-full text-xs font-bold text-indigo-600">
              <Shield size={14} /> {userRole === 'admin' ? t('admin') : userRole === 'pro' ? t('pro') : t('free')}
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button 
            onClick={handleLogout}
            className="px-6 py-3 bg-red-50 dark:bg-red-900/10 text-red-600 rounded-2xl font-bold hover:bg-red-100 transition-all flex items-center gap-2"
          >
            <LogOut size={18} /> {t('logout')}
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Card: Plano Atual */}
        <section className="md:col-span-2 bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <CreditCard className="text-indigo-600" /> {t('subscriptionStatus')}
            </h3>
            {userRole === 'pro' ? (
              <span className="px-4 py-1 bg-yellow-400/10 text-yellow-600 rounded-full text-xs font-black uppercase tracking-widest">Ativo</span>
            ) : (
              <span className="px-4 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-full text-xs font-black uppercase tracking-widest">{t('free')}</span>
            )}
          </div>

          <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-6">
            <div className="space-y-1">
              <p className="text-sm text-slate-500 font-medium">{t('accountType')}</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white">
                {userRole === 'pro' ? `Designa ${t('pro')}` : `Designa ${t('free')}`}
              </p>
            </div>
            {userRole !== 'pro' && userRole !== 'admin' && (
              <button 
                onClick={() => onNavigate('pricing')}
                className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-lg shadow-indigo-500/20"
              >
                <Crown size={18} /> {t('upgradeToPro')}
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl space-y-1">
              <p className="text-[10px] uppercase tracking-widest font-black text-slate-400">{t('memberSince')}</p>
              <p className="text-sm font-bold text-slate-900 dark:text-white">{formatDate(userData?.createdAt)}</p>
            </div>
            <div className="p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl space-y-1">
              <p className="text-[10px] uppercase tracking-widest font-black text-slate-400">Status</p>
              <p className="text-sm font-bold text-green-600 flex items-center gap-1">
                <CheckCircle2 size={14} /> Verificada
              </p>
            </div>
          </div>
        </section>

        {/* Card: Estatísticas Rápidas */}
        <section className="bg-indigo-600 rounded-[2.5rem] p-8 text-white shadow-xl shadow-indigo-500/20 space-y-6">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Sparkles className="text-indigo-200" /> {t('activity')}
          </h3>
          
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm font-bold">
                <span className="text-indigo-200">Projetos Criados</span>
                <span>--</span>
              </div>
              <div className="h-2 bg-indigo-500/30 rounded-full overflow-hidden">
                <div className="h-full bg-white w-1/3 rounded-full" />
              </div>
            </div>

            <div className="pt-6 border-t border-indigo-500/30 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500/30 rounded-xl">
                  <Clock size={18} />
                </div>
                <div>
                  <p className="text-xs text-indigo-200 font-bold uppercase tracking-widest">Última Edição</p>
                  <p className="text-sm font-bold">Hoje</p>
                </div>
              </div>
              <button 
                onClick={() => onNavigate('history')}
                className="w-full py-3 bg-white text-indigo-600 rounded-xl font-black uppercase tracking-widest text-xs shadow-lg shadow-black/10"
              >
                {t('history')}
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* Seção de Segurança/Definições */}
      <section className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-8">
        <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Settings className="text-slate-400" /> {t('settings')}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-3xl border border-slate-100 dark:border-slate-800 hover:border-indigo-500 transition-all group cursor-pointer">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl text-slate-500 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                <LockIcon size={20} />
              </div>
              <div>
                <p className="font-bold text-slate-900 dark:text-white">Segurança</p>
                <p className="text-xs text-slate-500">Alterar senha e autenticação</p>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-3xl border border-slate-100 dark:border-slate-800 hover:border-indigo-500 transition-all group cursor-pointer">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl text-slate-500 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                <Settings size={20} />
              </div>
              <div>
                <p className="font-bold text-slate-900 dark:text-white">{t('appearance')}</p>
                <p className="text-xs text-slate-500">{t('language')} e notificações</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
