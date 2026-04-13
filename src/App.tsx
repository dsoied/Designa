import { useState, useEffect } from 'react';
import { Sidebar, TopBar } from './components/Layout';
import { Home } from './components/Home';
import { Editor } from './components/Editor';
import { History } from './components/History';
import { Tools } from './components/Tools';
import { Settings } from './components/Settings';
import { SignUp } from './components/SignUp';
import { Notifications } from './components/Notifications';
import { Pricing } from './components/Pricing';
import { BatchProcessor } from './components/BatchProcessor';
import { UserProfile } from './components/UserProfile';
import { CookieConsent } from './components/CookieConsent';
import AdminDashboard from './components/AdminDashboard';
import AIGenerator from './components/AIGenerator';
import { LegalPage } from './components/LegalPage';
import { Screen, Notification, MonetizationSettings, FooterSettings, AppConfig } from './types';
import { motion, AnimatePresence } from 'motion/react';
import { auth, onAuthStateChanged, logout, FirebaseUser, db, query, collection, where, orderBy, onSnapshot, doc, handleFirestoreError, OperationType } from './firebase';
import { getDocFromServer } from 'firebase/firestore';
import { useLanguage } from './context/LanguageContext';

import { trackPageView } from './services/analyticsService';

export default function App() {
  const { t } = useLanguage();
  const [activeScreen, setActiveScreen] = useState<Screen>(() => {
    try {
      const saved = sessionStorage.getItem('designa_active_screen');
      return (saved as Screen) || 'home';
    } catch (e) {
      return 'home';
    }
  });
  
  useEffect(() => {
    trackPageView(activeScreen);
  }, [activeScreen]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem('designa_selected_image');
    } catch (e) {
      return null;
    }
  });
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>('user');
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isPricingOpen, setIsPricingOpen] = useState(false);
  const [isMandatoryPricing, setIsMandatoryPricing] = useState(false);
  const [appConfig, setAppConfig] = useState<AppConfig>({});
  const [monetization, setMonetization] = useState<MonetizationSettings | null>(null);
  const [footerSettings, setFooterSettings] = useState<FooterSettings | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('designa_theme');
      if (saved === 'light' || saved === 'dark') return saved;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'dark';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
    }
    localStorage.setItem('designa_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const notify = (message: string, type: 'success' | 'warning' | 'info' = 'info') => {
    const newNotification: Notification = {
      id: Date.now().toString(),
      title: type === 'warning' ? 'Aviso' : type === 'success' ? 'Sucesso' : 'Informação',
      message,
      time: 'Agora',
      isRead: false,
      type
    };
    setNotifications(prev => [newNotification, ...prev]);
  };

  const hasUnreadNotifications = notifications.some(n => !n.isRead);

  useEffect(() => {
    async function testConnection() {
      const path = 'config/footer';
      try {
        await getDocFromServer(doc(db, 'config', 'footer'));
        console.log("App: Conexão com Firestore verificada com sucesso.");
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("App: Erro de conexão - O cliente está offline. Verifique sua configuração do Firebase.");
          handleFirestoreError(error, OperationType.GET, path);
        } else {
          console.error("App: Erro ao testar conexão com Firestore:", error);
        }
      }
    }
    testConnection();
  }, []);

  useEffect(() => {
    const configRef = doc(db, 'config', 'branding');
    const unsubscribe = onSnapshot(configRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setAppConfig(data);
        
        // Update document title and favicon
        if (data.appName) document.title = data.appName;
        if (data.faviconUrl) {
          let favicon = document.querySelector('link[rel*="icon"]') as HTMLLinkElement;
          if (!favicon) {
            favicon = document.createElement('link');
            favicon.rel = 'shortcut icon';
            document.head.appendChild(favicon);
          }
          favicon.href = data.faviconUrl;
        }
      }
    }, (error) => {
      console.error("App: Erro ao buscar configurações de branding:", error);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const monetizationRef = doc(db, 'config', 'monetization');
    const unsubscribe = onSnapshot(monetizationRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as MonetizationSettings;
        setMonetization(data);
        
        // Inject AdSense script if enabled
        if (data.adsenseEnabled && data.adsenseClientId) {
          const scriptId = 'adsense-script';
          if (!document.getElementById(scriptId)) {
            const script = document.createElement('script');
            script.id = scriptId;
            script.async = true;
            script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${data.adsenseClientId}`;
            script.crossOrigin = 'anonymous';
            document.head.appendChild(script);
          }
        }
      }
    }, (error) => {
      console.error("App: Erro ao buscar configurações de monetização:", error);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const footerRef = doc(db, 'config', 'footer');
    const unsubscribe = onSnapshot(footerRef, (docSnap) => {
      if (docSnap.exists()) {
        setFooterSettings(docSnap.data() as FooterSettings);
      }
    }, (error) => {
      console.error("App: Erro ao buscar configurações do rodapé:", error);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (appConfig.faviconUrl) {
      let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.getElementsByTagName('head')[0].appendChild(link);
      }
      link.href = appConfig.faviconUrl;
      
      // Also update shortcut icon
      let shortcutLink = document.querySelector("link[rel='shortcut icon']") as HTMLLinkElement;
      if (shortcutLink) shortcutLink.href = appConfig.faviconUrl;
    }
    
    if (appConfig.appName) {
      document.title = appConfig.appName;
    } else {
      document.title = 'Designa - O Futuro da Criatividade';
    }
  }, [appConfig.faviconUrl, appConfig.appName]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Owner email check
        const isOwner = currentUser.email === 'dissooquevemdepois@gmail.com';
        
        // Fetch user role and data
        const userDocRef = doc(db, 'users', currentUser.uid);
        onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            setUserData(data);
            
            if (isOwner) {
              setUserRole('admin');
              setIsMandatoryPricing(false);
            } else {
              const role = data.role || 'user';
              const planSelected = data.planSelected || false;
              
              // Ensure only the owner can be admin, others can be pro or user
              setUserRole(role === 'admin' ? 'user' : role);
              
              // If plan not selected, force pricing modal
              if (!planSelected) {
                setIsMandatoryPricing(true);
                setIsPricingOpen(true);
              } else {
                setIsMandatoryPricing(false);
              }
            }
          } else {
            setUserData(null);
            if (isOwner) {
              setUserRole('admin');
              setIsMandatoryPricing(false);
            } else {
              setUserRole('user');
              // New user without doc yet - likely just signed up
              setIsMandatoryPricing(true);
              setIsPricingOpen(true);
            }
          }
        }, (error) => {
          console.error("App: Erro no listener do perfil do usuário:", error);
          handleFirestoreError(error, OperationType.GET, `users/${currentUser.uid}`);
        });
      } else {
        setUserRole('user');
        setUserData(null);
      }
      setIsAuthReady(true);
      console.log('App: Auth state changed. User:', currentUser?.email);
    });

    return () => unsubscribe();
  }, []);

  // Fetch real notifications
  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return;
    }

    const q = query(
      collection(db, 'notifications'),
      where('uid', '==', user.uid),
      orderBy('time', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedNotifications = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as Notification[];
      setNotifications(fetchedNotifications);
    }, (error) => {
      console.error("Error fetching notifications:", error);
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    // Test connection to Firestore
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration. The client is offline.");
        }
      }
    };
    testConnection();
  }, []);

  useEffect(() => {
    console.log('App: selectedImage mudou para:', selectedImage ? 'imagem presente (tamanho: ' + selectedImage.length + ')' : 'null');
  }, [selectedImage]);

  useEffect(() => {
    if (activeScreen === 'upload') {
      const timer = setTimeout(() => {
        const element = document.getElementById('upload-section');
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
      return () => clearTimeout(timer);
    } else if (activeScreen === 'home') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [activeScreen]);

  const handleNavigate = (screen: Screen, imageData?: string) => {
    console.log(`App: Navegando para ${screen}. Imagem fornecida: ${imageData ? 'Sim (' + imageData.length + ' bytes)' : 'Não'}`);
    if (imageData) {
      console.log('App: Atualizando selectedImage com novos dados');
      setSelectedImage(imageData);
      try {
        sessionStorage.setItem('designa_selected_image', imageData);
      } catch (e) {
        console.warn('App: Falha ao salvar imagem no sessionStorage (provavelmente muito grande)');
      }
    }
    setActiveScreen(screen);
    try {
      sessionStorage.setItem('designa_active_screen', screen);
    } catch (e) {}
  };

  const renderScreen = () => {
    console.log(`App: Renderizando tela ${activeScreen}. selectedImage presente: ${!!selectedImage}`);
    switch (activeScreen) {
      case 'home':
      case 'upload':
        return <Home onNavigate={handleNavigate} selectedImage={selectedImage} userRole={userRole} onOpenPricing={() => setIsPricingOpen(true)} appConfig={appConfig} monetization={monetization} footerSettings={footerSettings} notify={notify} />;
      case 'editor':
        return <Editor imageUrl={selectedImage} onNavigate={handleNavigate} initialTool="background" userRole={userRole} onOpenPricing={() => setIsPricingOpen(true)} notify={notify} />;
      case 'objects':
        return <Editor imageUrl={selectedImage} onNavigate={handleNavigate} initialTool="object" userRole={userRole} onOpenPricing={() => setIsPricingOpen(true)} notify={notify} />;
      case 'upscale':
        return <Editor imageUrl={selectedImage} onNavigate={handleNavigate} initialTool="upscale" userRole={userRole} onOpenPricing={() => setIsPricingOpen(true)} notify={notify} />;
      case 'face':
        return <Editor imageUrl={selectedImage} onNavigate={handleNavigate} initialTool="face" userRole={userRole} onOpenPricing={() => setIsPricingOpen(true)} notify={notify} />;
      case 'filters':
        return <Editor imageUrl={selectedImage} onNavigate={handleNavigate} initialTool="filters" userRole={userRole} onOpenPricing={() => setIsPricingOpen(true)} notify={notify} />;
      case 'crop':
        return <Editor imageUrl={selectedImage} onNavigate={handleNavigate} initialTool="crop" userRole={userRole} onOpenPricing={() => setIsPricingOpen(true)} notify={notify} />;
      case 'layers':
        return <Editor imageUrl={selectedImage} onNavigate={handleNavigate} initialTool="layers" userRole={userRole} onOpenPricing={() => setIsPricingOpen(true)} notify={notify} />;
      case 'magic':
        return <Editor imageUrl={selectedImage} onNavigate={handleNavigate} initialTool="magic" userRole={userRole} onOpenPricing={() => setIsPricingOpen(true)} notify={notify} />;
      case 'outpaint':
        return <Editor imageUrl={selectedImage} onNavigate={handleNavigate} initialTool="outpaint" userRole={userRole} onOpenPricing={() => setIsPricingOpen(true)} notify={notify} />;
      case 'variations':
        return <Editor imageUrl={selectedImage} onNavigate={handleNavigate} initialTool="variations" userRole={userRole} onOpenPricing={() => setIsPricingOpen(true)} notify={notify} />;
      case 'tools':
        return <Tools onNavigate={handleNavigate} selectedImage={selectedImage} monetization={monetization} />;
      case 'history':
        return <History onNavigate={handleNavigate} userRole={userRole} onOpenPricing={() => setIsPricingOpen(true)} monetization={monetization} />;
      case 'settings':
        return <Settings user={user} userData={userData} userRole={userRole} onOpenPricing={() => setIsPricingOpen(true)} appConfig={appConfig} onNotify={notify} theme={theme} onToggleTheme={toggleTheme} />;
      case 'signup':
        return <SignUp onNavigate={handleNavigate} appConfig={appConfig} />;
      case 'notifications':
        return (
          <Notifications 
            notifications={notifications} 
            setNotifications={setNotifications} 
          />
        );
      case 'batch':
        return (
          <BatchProcessor 
            userRole={userRole} 
            onOpenPricing={() => setIsPricingOpen(true)} 
            onNavigate={handleNavigate}
          />
        );
      case 'admin':
        return userRole === 'admin' ? <AdminDashboard /> : <Home onNavigate={handleNavigate} selectedImage={selectedImage} userRole={userRole} onOpenPricing={() => setIsPricingOpen(true)} />;
      case 'generate':
        return <AIGenerator userRole={userRole} onOpenPricing={() => setIsPricingOpen(true)} onNavigate={handleNavigate} />;
      case 'profile':
        return <UserProfile onNavigate={handleNavigate} userRole={userRole} />;
      case 'terms':
        return <LegalPage type="terms" onNavigate={handleNavigate} appName={appConfig.appName} />;
      case 'privacy':
        return <LegalPage type="privacy" onNavigate={handleNavigate} appName={appConfig.appName} />;
      default:
        return (
          <div className="flex items-center justify-center h-full text-slate-500">
            Esta tela está em desenvolvimento.
          </div>
        );
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setActiveScreen('home');
    } catch (error) {
      console.error("Erro ao sair:", error);
    }
  };

  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Sidebar 
        activeScreen={activeScreen} 
        onNavigate={handleNavigate} 
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        user={user}
        userData={userData}
        userRole={userRole}
        onLogout={handleLogout}
        onOpenPricing={() => setIsPricingOpen(true)}
        appConfig={appConfig}
        monetization={monetization}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
      <TopBar 
        activeScreen={activeScreen} 
        onMenuClick={() => setIsSidebarOpen(true)}
        onNavigate={handleNavigate}
        user={user}
        userData={userData}
        userRole={userRole}
        hasUnreadNotifications={hasUnreadNotifications}
        onOpenPricing={() => setIsPricingOpen(true)}
        appConfig={appConfig}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
      
      <main className="lg:pl-64 pt-16 min-h-screen">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeScreen === 'upload' ? 'home' : activeScreen}
            initial={{ opacity: 0, scale: 0.98, filter: "blur(4px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, scale: 1.02, filter: "blur(4px)" }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            {renderScreen()}
          </motion.div>
        </AnimatePresence>
      </main>

      <Pricing 
        isOpen={isPricingOpen} 
        onClose={() => {
          if (!isMandatoryPricing) {
            setIsPricingOpen(false);
          }
        }} 
        currentRole={userRole}
        isMandatory={isMandatoryPricing}
        onPlanSelected={() => {
          setIsMandatoryPricing(false);
          setIsPricingOpen(false);
        }}
      />
      <CookieConsent />
    </div>
  );
}
