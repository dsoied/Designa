import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, X, Smartphone, ArrowRight } from 'lucide-react';

interface PWAInstallPromptProps {
  onNotify?: (message: string, type?: any) => void;
}

export function PWAInstallPrompt({ onNotify }: PWAInstallPromptProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      
      // Check if user just logged in or signed up in this session
      const justLoggedIn = sessionStorage.getItem('pwa_just_auth') === 'true';
      if (justLoggedIn) {
        setShowPrompt(true);
        // Clear the flag so it doesn't show again on every mount
        sessionStorage.removeItem('pwa_just_auth');
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Also check on mount if we should show it (in case event fired before mount)
    const justLoggedIn = sessionStorage.getItem('pwa_just_auth') === 'true';
    if (justLoggedIn && !showPrompt) {
      // Small delay to ensure UI is ready
      const timer = setTimeout(() => {
        setShowPrompt(true);
        sessionStorage.removeItem('pwa_just_auth');
      }, 3000);
      return () => clearTimeout(timer);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, [showPrompt]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    // Hide the app-provided install promotion
    setShowPrompt(false);
    
    // Show the install prompt
    deferredPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);
    
    // We've used the prompt, and can't use it again, throw it away
    setDeferredPrompt(null);
    
    if (outcome === 'accepted' && onNotify) {
      onNotify('Obrigado por instalar o Designa!', 'success');
    }
  };

  if (!showPrompt) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.9 }}
        className="fixed bottom-6 left-6 right-6 md:left-auto md:right-10 md:w-96 z-[100] bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-slate-800 p-6 md:p-8 overflow-hidden group"
      >
        {/* Background glow */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none group-hover:bg-indigo-500/20 transition-all duration-500" />
        
        <button 
          onClick={() => setShowPrompt(false)}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-full transition-all"
        >
          <X size={18} />
        </button>

        <div className="flex items-start gap-5">
          <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-indigo-600/20">
            <Smartphone className="text-white" size={28} />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">
              Designa no seu <span className="text-indigo-600">Celular</span>
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Instale nosso app para acesso rápido e uma experiência muito melhor, como um app nativo!
            </p>
          </div>
        </div>

        <div className="mt-8 flex gap-3">
          <button
            onClick={() => setShowPrompt(false)}
            className="flex-1 py-3 text-sm font-bold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
          >
            Depois
          </button>
          <button
            onClick={handleInstallClick}
            className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-xl shadow-indigo-500/30 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 group/btn"
          >
            <Download size={18} />
            Instalar Agora
            <ArrowRight size={16} className="group-hover/btn:translate-x-1 transition-transform" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
