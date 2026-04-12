import React, { useState } from 'react';
import { motion } from 'motion/react';
import { User, Mail, Lock, ArrowRight, CheckCircle2, ShieldCheck, Zap, Sparkles, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { signInWithGoogle, signUpWithEmail, loginWithEmail } from '../firebase';

interface SignUpProps {
  onNavigate: (screen: any) => void;
  appConfig?: { logoUrl?: string; faviconUrl?: string; appName?: string };
}

export function SignUp({ onNavigate, appConfig }: SignUpProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const suggestPassword = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+";
    let password = "";
    for (let i = 0; i < 14; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData({ ...formData, password });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      alert("As senhas não coincidem!");
      return;
    }

    setIsSubmitting(true);
    try {
      await signUpWithEmail(formData.email, formData.password, formData.name);
      setIsSuccess(true);
      setTimeout(() => {
        onNavigate('home');
      }, 2000);
    } catch (error: any) {
      console.error("Erro no cadastro:", error);
      if (error.code === 'auth/email-already-in-use') {
        // Try logging in instead if they already have an account
        try {
          await loginWithEmail(formData.email, formData.password);
          setIsSuccess(true);
          setTimeout(() => {
            onNavigate('home');
          }, 2000);
        } catch (loginError) {
          alert("E-mail já está em uso. Verifique sua senha.");
        }
      } else {
        alert("Falha ao criar conta: " + (error.message || "Erro desconhecido"));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsSubmitting(true);
    try {
      await signInWithGoogle();
      setIsSuccess(true);
      setTimeout(() => {
        onNavigate('home');
      }, 2000);
    } catch (error) {
      console.error("Erro no login com Google:", error);
      alert("Falha ao entrar com Google. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="max-w-md mx-auto mt-20 p-8 bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-slate-800 text-center space-y-6">
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto text-green-600 dark:text-green-400"
        >
          <CheckCircle2 size={40} />
        </motion.div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Conta Criada!</h2>
          <p className="text-slate-600 dark:text-slate-400">Bem-vindo ao Designa. Redirecionando para o início...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-12 px-6 md:px-12 flex flex-col lg:flex-row gap-16 items-center">
      {/* Branding Logo for Mobile */}
      <div className="lg:hidden w-full flex justify-center mb-8">
        {appConfig?.logoUrl ? (
          <img src={appConfig.logoUrl} alt="Logo" className="h-12 w-auto object-contain" referrerPolicy="no-referrer" />
        ) : (
          <div className="text-center">
            <h1 className="text-3xl font-black tracking-tighter text-slate-900 dark:text-white">
              {appConfig?.appName || 'Designa'}
            </h1>
            <p className="text-[10px] uppercase tracking-widest text-indigo-600 font-bold">O Futuro da Criatividade</p>
          </div>
        )}
      </div>

      {/* Left Side: Info */}
      <div className="flex-1 space-y-8">
        <div className="hidden lg:block mb-12">
          {appConfig?.logoUrl ? (
            <img src={appConfig.logoUrl} alt="Logo" className="h-16 w-auto object-contain" referrerPolicy="no-referrer" />
          ) : (
            <div>
              <h1 className="text-4xl font-black tracking-tighter text-slate-900 dark:text-white">
                {appConfig?.appName || 'Designa'}
              </h1>
              <p className="text-xs uppercase tracking-widest text-indigo-600 font-bold">O Futuro da Criatividade</p>
            </div>
          )}
        </div>
        <div className="space-y-4">
          <span className="px-4 py-1.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs font-black uppercase tracking-widest rounded-full">
            Junte-se à Revolução
          </span>
          <h2 className="font-headline text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
            Crie sua conta e <span className="text-indigo-600">desbloqueie</span> seu potencial.
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed max-w-lg">
            Tenha acesso a recursos exclusivos de IA, salve seu histórico de edições e colabore em tempo real.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <Feature icon={ShieldCheck} title="Seguro" desc="Seus dados protegidos" />
          <Feature icon={Zap} title="Rápido" desc="Edição em segundos" />
          <Feature icon={Sparkles} title="IA Avançada" desc="Modelos de ponta" />
          <Feature icon={User} title="Personalizado" desc="Sua galeria exclusiva" />
        </div>
      </div>

      {/* Right Side: Form */}
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="w-full max-w-md bg-white dark:bg-slate-900 p-8 md:p-10 rounded-[3rem] shadow-2xl border border-slate-200 dark:border-slate-800 space-y-8"
      >
        <div className="text-center space-y-2">
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Cadastro</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">Comece sua jornada criativa hoje</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Nome Completo</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                required
                type="text" 
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Ex: João Silva"
                className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 rounded-2xl transition-all outline-none text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">E-mail Profissional</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                required
                type="email" 
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="seu@email.com"
                className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 rounded-2xl transition-all outline-none text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center ml-1">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Senha</label>
              <button 
                type="button"
                onClick={suggestPassword}
                className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
              >
                <RefreshCw size={10} />
                Sugerir Senha
              </button>
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                required
                type={showPassword ? "text" : "password"} 
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                className="w-full pl-12 pr-12 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 rounded-2xl transition-all outline-none text-slate-900 dark:text-white"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Confirmar Senha</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                required
                type={showPassword ? "text" : "password"} 
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="••••••••"
                className="w-full pl-12 pr-12 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 rounded-2xl transition-all outline-none text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <button 
            disabled={isSubmitting}
            type="submit"
            className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-xl shadow-indigo-500/30 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <>
                Criar Minha Conta
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <div className="relative py-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200 dark:border-slate-800"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white dark:bg-slate-900 px-2 text-slate-500 font-bold tracking-widest">Ou continue com</span>
          </div>
        </div>

        <button 
          onClick={handleGoogleLogin}
          disabled={isSubmitting}
          className="w-full py-4 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-2xl font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-70"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
          Entrar com Google
        </button>

        <div className="text-center">
          <p className="text-sm text-slate-500">
            Já tem uma conta? <button onClick={() => onNavigate('home')} className="text-indigo-600 font-bold hover:underline">Entrar</button>
          </p>
        </div>
      </motion.div>
    </div>
  );
}

function Feature({ icon: Icon, title, desc }: any) {
  return (
    <div className="flex items-center gap-4 p-4 bg-white/50 dark:bg-slate-900/50 rounded-2xl border border-white/20 dark:border-slate-800/20">
      <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center">
        <Icon size={20} />
      </div>
      <div>
        <h4 className="text-sm font-bold text-slate-900 dark:text-white">{title}</h4>
        <p className="text-[10px] text-slate-500 dark:text-slate-400">{desc}</p>
      </div>
    </div>
  );
}
