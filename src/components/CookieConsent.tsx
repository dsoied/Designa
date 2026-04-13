import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Cookie, X, ShieldCheck } from 'lucide-react';

export function CookieConsent() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('designa_cookie_consent');
    if (!consent) {
      // Show after a short delay
      const timer = setTimeout(() => setIsVisible(true), 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('designa_cookie_consent', 'true');
    setIsVisible(false);
  };

  const handleDecline = () => {
    localStorage.setItem('designa_cookie_consent', 'false');
    setIsVisible(false);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-6 left-6 right-6 md:left-auto md:right-6 md:w-[400px] z-[200]"
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] shadow-2xl p-6 md:p-8 space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center shrink-0">
                <Cookie size={24} />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Privacidade & Cookies</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Utilizamos cookies para melhorar a sua experiência, analisar o tráfego e personalizar conteúdos. Ao continuar, você concorda com a nossa política.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleAccept}
                className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20"
              >
                Aceitar Tudo
              </button>
              <button
                onClick={handleDecline}
                className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
              >
                Recusar
              </button>
            </div>

            <div className="flex items-center justify-center gap-2 text-[10px] text-slate-400 font-medium">
              <ShieldCheck size={12} />
              <span>Conforme o RGPD (GDPR) da União Europeia</span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
