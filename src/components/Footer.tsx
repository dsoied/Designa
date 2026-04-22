import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Mail, Phone, Globe, Shield, FileText, Instagram, Twitter, Github, Heart, Loader2, CheckCircle2 } from 'lucide-react';
import { FooterSettings, Screen, AppConfig } from '../types';
import { db, doc, setDoc } from '../firebase';

interface FooterProps {
  appConfig?: AppConfig;
  settings?: FooterSettings | null;
  onNavigate?: (screen: Screen) => void;
}

export function Footer({ appConfig, settings, onNavigate }: FooterProps) {
  const currentYear = new Date().getFullYear();
  const [email, setEmail] = useState('');
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [subscribeStatus, setSubscribeStatus] = useState<'idle' | 'success' | 'error'>('idle');
  
  // Default values if no settings are provided
  const defaultSettings: FooterSettings = {
    adminEmail: "dissooquevemdepois@gmail.com",
    contactPhone: "",
    websiteUrl: "www.designa.ai",
    instagramUrl: "#",
    twitterUrl: "#",
    githubUrl: "#",
    description: "Plataforma líder em edição de imagens com inteligência artificial. Transformamos sua visão criativa em realidade digital em segundos.",
    privacyPolicyUrl: "#",
    termsConditionsUrl: "#"
  };

  const s = settings || defaultSettings;

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) return;

    setIsSubscribing(true);
    setSubscribeStatus('idle');

    try {
      const newsletterRef = doc(db, 'newsletter', email.toLowerCase());
      await setDoc(newsletterRef, {
        email: email.toLowerCase(),
        subscribedAt: new Date().toISOString()
      });
      setSubscribeStatus('success');
      setEmail('');
      setTimeout(() => setSubscribeStatus('idle'), 5000);
    } catch (error) {
      console.error('Erro ao assinar newsletter:', error);
      setSubscribeStatus('error');
    } finally {
      setIsSubscribing(false);
    }
  };

  return (
    <footer className="bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 pt-20 pb-12 px-6 overflow-hidden">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
        {/* Brand Section */}
        <div className="space-y-6">
          <button 
            onClick={() => onNavigate?.('home')}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity text-left"
          >
            {appConfig?.logoUrl ? (
              <img src={appConfig.logoUrl} alt="Logo" className="h-10 w-auto object-contain" referrerPolicy="no-referrer" />
            ) : (
              <div className="flex flex-col">
                <h2 className="text-2xl font-black tracking-tighter text-slate-900 dark:text-white">
                  {appConfig?.appName || 'Designa'}
                </h2>
                <p className="text-[10px] uppercase tracking-widest text-indigo-600 font-bold">O Futuro da Criatividade</p>
              </div>
            )}
          </button>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
            {s.description}
          </p>
          <div className="flex items-center gap-4 flex-wrap">
            {s.instagramUrl && <SocialLink icon={Instagram} href={s.instagramUrl} />}
            {s.twitterUrl && <SocialLink icon={Twitter} href={s.twitterUrl} />}
            {s.githubUrl && <SocialLink icon={Github} href={s.githubUrl} />}
          </div>
        </div>

        {/* Contact info */}
        <div className="space-y-6">
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white">Contato</h3>
          <ul className="space-y-4">
            <li className="flex items-center gap-3 group">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                <Mail size={16} />
              </div>
              <a href={`mailto:${s.adminEmail}`} className="text-sm text-slate-500 dark:text-slate-400 font-medium hover:text-indigo-600 transition-colors">
                {s.adminEmail}
              </a>
            </li>
            <li className="flex items-center gap-3 group">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                <Globe size={16} />
              </div>
              <a 
                href={s.websiteUrl.startsWith('http') ? s.websiteUrl : `https://${s.websiteUrl}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm text-slate-500 dark:text-slate-400 font-medium hover:text-indigo-600 transition-colors"
              >
                {s.websiteUrl}
              </a>
            </li>
          </ul>
        </div>

        {/* Legal Links */}
        <div className="space-y-6">
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white">Legal</h3>
          <ul className="space-y-4">
            <li className="flex items-center gap-3 group">
              <Shield size={16} className="text-slate-400 group-hover:text-indigo-600 transition-colors" />
              <button 
                onClick={() => onNavigate?.('privacy')}
                className="text-sm text-slate-500 dark:text-slate-400 font-medium hover:text-indigo-600 transition-colors text-left"
              >
                Política de Privacidade
              </button>
            </li>
            <li className="flex items-center gap-3 group">
              <FileText size={16} className="text-slate-400 group-hover:text-indigo-600 transition-colors" />
              <button 
                onClick={() => onNavigate?.('terms')}
                className="text-sm text-slate-500 dark:text-slate-400 font-medium hover:text-indigo-600 transition-colors text-left"
              >
                Termos e Condições
              </button>
            </li>
            <li className="flex items-center gap-3 group">
              <Shield size={16} className="text-slate-400 group-hover:text-indigo-600 transition-colors" />
              <button className="text-sm text-slate-500 dark:text-slate-400 font-medium hover:text-indigo-600 transition-colors text-left">
                Cookies
              </button>
            </li>
          </ul>
        </div>

        {/* Newsletter / CTA */}
        <div className="space-y-6">
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white">Newsletter</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
            Receba as últimas novidades e atualizações de IA diretamente no seu e-mail.
          </p>
          <form onSubmit={handleSubscribe} className="space-y-3">
            <div className="flex gap-2">
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Seu e-mail" 
                required
                disabled={isSubscribing || subscribeStatus === 'success'}
                className="flex-1 px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-600/20 transition-all disabled:opacity-50"
              />
              <button 
                type="submit"
                disabled={isSubscribing || subscribeStatus === 'success'}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center min-w-[60px]"
              >
                {isSubscribing ? <Loader2 size={16} className="animate-spin" /> : subscribeStatus === 'success' ? <CheckCircle2 size={16} /> : 'Ok'}
              </button>
            </div>
            {subscribeStatus === 'success' && (
              <p className="text-[10px] text-green-600 font-bold animate-pulse">Inscrição realizada com sucesso!</p>
            )}
            {subscribeStatus === 'error' && (
              <p className="text-[10px] text-red-500 font-bold">Ocorreu um erro. Tente novamente.</p>
            )}
          </form>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="max-w-7xl mx-auto pt-12 border-t border-slate-100 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-6">
        <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest">
          © {currentYear} {appConfig?.appName || 'Designa'}. Todos os direitos reservados.
        </p>
        <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
          Feito com <Heart size={12} className="text-red-500 fill-red-500" /> pela equipe {appConfig?.footerTeamName || appConfig?.appName || 'Designa'}
        </div>
      </div>
    </footer>
  );
}

function SocialLink({ icon: Icon, href }: { icon: any, href: string }) {
  if (!href || href === '#') return null;
  
  const absoluteHref = href.startsWith('http') ? href : `https://${href}`;
  
  return (
    <motion.a
      href={absoluteHref}
      target="_blank"
      rel="noopener noreferrer"
      whileHover={{ y: -3, scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex items-center justify-center text-slate-500 hover:text-indigo-600 hover:border-indigo-600/20 transition-all shadow-sm hover:shadow-md"
    >
      <Icon size={18} />
    </motion.a>
  );
}
