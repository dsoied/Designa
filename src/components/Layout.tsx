import { Home, Upload, Layers, Eraser, Construction, History, Settings, Bell, User, Menu, X, Palette, LogOut, Crown, Shield, Sparkles, RefreshCw, Loader2, Wand2, Maximize2, ExternalLink, Sun, Moon } from 'lucide-react';
import { Screen, MonetizationSettings, AppConfig } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { useState, useEffect } from 'react';
import { FirebaseUser } from '../firebase';
import { useBatch } from '../context/BatchContext';
import { AffiliateBanner } from './AffiliateBanner';
import { AdUnit } from './AdUnit';

interface SidebarProps {
  activeScreen: Screen;
  onNavigate: (screen: Screen) => void;
  isOpen: boolean;
  onClose: () => void;
  user: FirebaseUser | null;
  userRole?: string;
  onLogout: () => void;
  onOpenPricing: () => void;
  appConfig?: AppConfig;
  monetization?: MonetizationSettings | null;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
}

export function Sidebar({ activeScreen, onNavigate, isOpen, onClose, user, userRole, onLogout, onOpenPricing, appConfig, monetization, theme, onToggleTheme }: SidebarProps) {
  const navItems = [
    { id: 'home', label: 'Início', icon: Home },
    { id: 'generate', label: 'Criar com IA', icon: Sparkles },
    { id: 'upload', label: 'Carregar Imagem', icon: Upload },
    { id: 'editor', label: 'Remover Fundo', icon: Layers },
    { id: 'objects', label: 'Remover Objeto', icon: Eraser },
    { id: 'batch', label: 'Processamento Lote', icon: Layers, isPro: true },
    { id: 'magic', label: 'Edição Mágica', icon: Wand2, isPro: true },
    { id: 'outpaint', label: 'Expansão Generativa', icon: Maximize2, isPro: true },
    { id: 'variations', label: 'Variações de Imagem', icon: RefreshCw, isPro: true },
    { id: 'filters', label: 'Filtros Artísticos', icon: Palette },
    { id: 'history', label: 'Histórico', icon: History },
    { id: 'pricing_tab', label: 'Planos & Preços', icon: Crown },
    { id: 'notifications', label: 'Notificações', icon: Bell },
    { id: 'signup', label: 'Cadastro', icon: User },
    { id: 'settings', label: 'Definições', icon: Settings },
  ];

  if (userRole === 'admin') {
    navItems.splice(navItems.length - 1, 0, { id: 'admin', label: 'Painel Admin', icon: Shield });
  }

  const handleNavigate = (screen: string) => {
    if (screen === 'pricing_tab') {
      onOpenPricing();
    } else {
      onNavigate(screen as Screen);
    }
    onClose();
  };

  return (
    <>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      <aside className={`fixed left-0 top-0 h-full w-64 flex flex-col p-4 z-50 bg-slate-50/60 dark:bg-slate-950/60 backdrop-blur-xl border-r border-slate-200/20 dark:border-slate-800/20 shadow-2xl shadow-indigo-500/5 font-manrope antialiased tracking-tight transition-transform duration-300 lg:translate-x-0 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex justify-between items-center mb-6 px-2">
          <button 
            onClick={() => onNavigate('home')}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity text-left"
          >
            {appConfig?.logoUrl ? (
              <img src={appConfig.logoUrl} alt="Logo" className="h-10 w-auto object-contain" referrerPolicy="no-referrer" />
            ) : (
              <div>
                <h1 className="text-2xl font-black tracking-tighter text-slate-900 dark:text-white line-clamp-2 break-words leading-tight">
                  {appConfig?.appName || 'Designa'}
                </h1>
                <p className="text-[10px] uppercase tracking-widest text-indigo-600 font-bold">O Futuro da Criatividade</p>
              </div>
            )}
          </button>
          <button onClick={onClose} className="lg:hidden p-2 text-slate-500">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto custom-scrollbar pr-2 min-h-0">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeScreen === item.id;
            return (
              <motion.button
                key={item.id}
                whileHover={isActive ? { x: 5 } : { x: 5, backgroundColor: "rgba(226, 232, 240, 0.5)" }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleNavigate(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl font-medium transition-all duration-300 ${
                  isActive
                    ? 'bg-indigo-600 text-white font-bold shadow-lg shadow-indigo-500/30 scale-100'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 scale-95'
                }`}
              >
                <Icon size={20} />
                <span className="flex-1 text-left">{item.label}</span>
                {item.isPro && (
                  <Crown size={14} className="text-yellow-500" />
                )}
              </motion.button>
            );
          })}
        </nav>
        <div className="mt-auto space-y-4">
          {/* Monetization Section */}
          {monetization && (
            <div className="space-y-3 px-2 py-4 border-t border-slate-200/20 dark:border-slate-800/20">
              {/* AdSense Unit */}
              <AdUnit monetization={monetization} />

              {/* Affiliate Banners - Limit to only one as per user request */}
              {monetization.affiliateLinks.filter(l => l.active).slice(0, 1).map((link) => (
                <div key={link.id} className="scale-75 origin-left -my-4">
                  <AffiliateBanner 
                    link={link} 
                    aspectRatio="aspect-[5/1]" 
                    className="rounded-2xl"
                  />
                </div>
              ))}
            </div>
          )}

          {user && (
            <div className="p-4 bg-slate-100 dark:bg-slate-900 rounded-2xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-600 relative">
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.displayName || 'User'} className="w-full h-full object-cover" />
                ) : (
                  <User size={20} />
                )}
                {(userRole === 'pro' || userRole === 'admin') && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center">
                    <Crown size={8} className="text-white" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{user.displayName || 'Usuário'}</p>
                  {userRole === 'pro' && <span className="px-1.5 py-0.5 bg-yellow-400 text-[8px] font-black text-white rounded uppercase tracking-tighter">Pro</span>}
                  {userRole === 'admin' && <span className="px-1.5 py-0.5 bg-indigo-600 text-[8px] font-black text-white rounded uppercase tracking-tighter">Admin</span>}
                </div>
                <p className="text-[10px] text-slate-500 truncate">{user.email}</p>
              </div>
              <button 
                onClick={onLogout}
                className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                title="Sair"
              >
                <LogOut size={18} />
              </button>
            </div>
          )}
          {user && userRole !== 'pro' && userRole !== 'admin' && (
            <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl">
              <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 mb-2">Plano Gratuito</p>
              <button 
                onClick={onOpenPricing}
                className="w-full py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold shadow-md shadow-indigo-500/20 hover:opacity-90 transition-opacity"
              >
                Atualizar para Pro
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

interface TopBarProps {
  activeScreen: Screen;
  onMenuClick: () => void;
  onNavigate: (screen: Screen) => void;
  user: FirebaseUser | null;
  userRole?: string;
  hasUnreadNotifications: boolean;
  onOpenPricing: () => void;
  appConfig?: AppConfig;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
}

export function TopBar({ activeScreen, onMenuClick, onNavigate, user, userRole, hasUnreadNotifications, onOpenPricing, appConfig, theme, onToggleTheme }: TopBarProps) {
  const { isProcessing, files } = useBatch();
  const processingCount = files.filter(f => f.status === 'processing').length;
  const completedCount = files.filter(f => f.status === 'completed').length;
  const totalCount = files.length;

  const screenNames: Record<Screen, string> = {
    home: 'Início',
    editor: 'Remover Fundo',
    history: 'Histórico',
    objects: 'Remover Objeto',
    tools: 'Recursos',
    settings: 'Definições',
    upload: 'Carregar Imagem',
    upscale: 'Melhorar Qualidade',
    face: 'Retoque Facial',
    filters: 'Filtros Artísticos',
    crop: 'Recorte & Ajuste',
    layers: 'Composição',
    magic: 'Edição Mágica',
    signup: 'Cadastro',
    notifications: 'Notificações',
    batch: 'Processamento em Lote',
    admin: 'Painel Admin',
    generate: 'Criar com IA',
    outpaint: 'Expansão Generativa',
    variations: 'Variações de Imagem',
    terms: 'Termos e Condições',
    privacy: 'Política de Privacidade'
  };

  return (
    <header className="fixed top-0 right-0 left-0 lg:left-64 h-16 flex justify-between items-center px-4 md:px-8 z-30 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200/20 dark:border-slate-800/20">
      <div className="flex items-center gap-4">
        <button onClick={onMenuClick} className="lg:hidden p-2 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">
          <Menu size={20} />
        </button>
        {/* Mobile Logo */}
        <button 
          onClick={() => onNavigate('home')}
          className="lg:hidden flex items-center hover:opacity-80 transition-opacity"
        >
          {appConfig?.logoUrl ? (
            <img src={appConfig.logoUrl} alt="Logo" className="h-8 w-auto object-contain" referrerPolicy="no-referrer" />
          ) : (
            <span className="font-black text-lg tracking-tighter text-slate-900 dark:text-white">
              {appConfig?.appName || 'Designa'}
            </span>
          )}
        </button>
        <div className="hidden sm:flex items-center gap-4">
          {/* Label removed as per user request */}
        </div>
        <span className="text-sm font-bold text-slate-900 dark:text-white">{screenNames[activeScreen]}</span>
      </div>
      <div className="flex items-center gap-1.5 sm:gap-6">
        {isProcessing && (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={() => onNavigate('batch')}
            className="hidden md:flex items-center gap-3 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/50 rounded-2xl cursor-pointer hover:bg-indigo-100 transition-colors"
          >
            <div className="relative">
              <Loader2 className="animate-spin text-indigo-600" size={18} />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-1 h-1 bg-indigo-600 rounded-full"></div>
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Processando Lote</span>
              <span className="text-[9px] font-bold text-slate-500">{completedCount} de {totalCount} concluídos</span>
            </div>
          </motion.div>
        )}
        <div className="flex items-center gap-1 sm:gap-3">
          <motion.button 
            whileHover={{ scale: 1.1, backgroundColor: "rgba(79, 70, 229, 0.1)" }}
            whileTap={{ scale: 0.9 }}
            onClick={onToggleTheme}
            className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-all rounded-full"
            title={theme === 'dark' ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </motion.button>
          <motion.button 
            whileHover={{ scale: 1.1, backgroundColor: "rgba(79, 70, 229, 0.1)" }}
            whileTap={{ scale: 0.9 }}
            onClick={() => onNavigate('notifications')}
            className={`relative p-2 transition-all rounded-full ${
              activeScreen === 'notifications'
                ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <Bell size={20} />
            {hasUnreadNotifications && (
              <motion.span 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute top-2 right-2 w-2 h-2 bg-red-500 border-2 border-white dark:border-slate-950 rounded-full"
              ></motion.span>
            )}
          </motion.button>
          <motion.button 
            whileHover={{ scale: 1.1, backgroundColor: "rgba(79, 70, 229, 0.1)" }}
            whileTap={{ scale: 0.9 }}
            onClick={() => onNavigate('signup')}
            className={`p-2 rounded-full transition-all flex items-center justify-center overflow-hidden relative ${
              activeScreen === 'signup' 
                ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600' 
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            {user?.photoURL ? (
              <img src={user.photoURL} alt="User" className="w-6 h-6 rounded-full object-cover" />
            ) : (
              <User size={20} />
            )}
            {(userRole === 'pro' || userRole === 'admin') && (
              <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-yellow-400 rounded-full border border-white dark:border-slate-950 flex items-center justify-center">
                <Crown size={6} className="text-white" />
              </div>
            )}
          </motion.button>
        </div>
        {user && userRole !== 'pro' && userRole !== 'admin' && (
          <motion.button 
            whileHover={{ scale: 1.05, boxShadow: "0 10px 15px -3px rgba(79, 70, 229, 0.3)" }}
            whileTap={{ scale: 0.95 }}
            onClick={onOpenPricing}
            className="hidden min-[480px]:block px-3 sm:px-5 py-2 bg-indigo-600 text-white rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-widest transition-all shadow-lg shadow-indigo-500/20 whitespace-nowrap"
          >
            <span className="hidden sm:inline">Atualizar para </span>Pro
          </motion.button>
        )}
      </div>
    </header>
  );
}
