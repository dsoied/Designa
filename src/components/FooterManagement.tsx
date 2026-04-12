import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Save, Mail, Phone, Globe, Instagram, Twitter, Github, FileText, Shield, Loader2, CheckCircle2 } from 'lucide-react';
import { db, doc, getDoc, setDoc } from '../firebase';
import { FooterSettings } from '../types';

export function FooterManagement() {
  const [settings, setSettings] = useState<FooterSettings>({
    adminEmail: 'dissooquevemdepois@gmail.com',
    contactPhone: '+55 (11) 99999-9999',
    websiteUrl: 'www.designa.ai',
    instagramUrl: '',
    twitterUrl: '',
    githubUrl: '',
    description: 'Plataforma líder em edição de imagens com inteligência artificial. Transformamos sua visão criativa em realidade digital em segundos.',
    privacyPolicyUrl: '',
    termsConditionsUrl: ''
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, 'config', 'footer');
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          setSettings(snap.data() as FooterSettings);
        }
      } catch (error) {
        console.error('Erro ao buscar configurações do rodapé:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);
    try {
      await setDoc(doc(db, 'config', 'footer'), settings);
      setMessage({ type: 'success', text: 'Configurações do rodapé salvas com sucesso!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Erro ao salvar configurações do rodapé:', error);
      setMessage({ type: 'error', text: 'Erro ao salvar configurações. Tente novamente.' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-100 dark:border-slate-800 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Gerenciar Rodapé</h3>
            <p className="text-sm text-slate-500">Personalize as informações exibidas no rodapé do site.</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSave}
            disabled={isSaving}
            className="w-full sm:w-auto px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 disabled:opacity-70"
          >
            {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            Salvar Alterações
          </motion.button>
        </div>

        {message && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-4 rounded-xl mb-6 flex items-center gap-3 ${
              message.type === 'success' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'
            }`}
          >
            {message.type === 'success' && <CheckCircle2 size={18} />}
            <span className="text-sm font-bold">{message.text}</span>
          </motion.div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Contact Info */}
          <div className="space-y-6">
            <h4 className="text-xs font-black uppercase tracking-widest text-indigo-600">Informações de Contato</h4>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 ml-1">E-mail do Administrador</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="email"
                    value={settings.adminEmail}
                    onChange={(e) => setSettings({ ...settings, adminEmail: e.target.value })}
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-indigo-600/20 outline-none transition-all font-medium"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 ml-1">Telefone de Contato</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="text"
                    value={settings.contactPhone}
                    onChange={(e) => setSettings({ ...settings, contactPhone: e.target.value })}
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-indigo-600/20 outline-none transition-all font-medium"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 ml-1">URL do Site</label>
                <div className="relative">
                  <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="text"
                    value={settings.websiteUrl}
                    onChange={(e) => setSettings({ ...settings, websiteUrl: e.target.value })}
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-indigo-600/20 outline-none transition-all font-medium"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Social Media */}
          <div className="space-y-6">
            <h4 className="text-xs font-black uppercase tracking-widest text-indigo-600">Redes Sociais</h4>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 ml-1">Instagram URL</label>
                <div className="relative">
                  <Instagram className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="text"
                    placeholder="ex: instagram.com/seuusuario"
                    value={settings.instagramUrl}
                    onChange={(e) => setSettings({ ...settings, instagramUrl: e.target.value })}
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-indigo-600/20 outline-none transition-all font-medium"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 ml-1">Twitter URL</label>
                <div className="relative">
                  <Twitter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="text"
                    placeholder="ex: twitter.com/seuusuario"
                    value={settings.twitterUrl}
                    onChange={(e) => setSettings({ ...settings, twitterUrl: e.target.value })}
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-indigo-600/20 outline-none transition-all font-medium"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 ml-1">GitHub URL</label>
                <div className="relative">
                  <Github className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="text"
                    placeholder="ex: github.com/seuusuario"
                    value={settings.githubUrl}
                    onChange={(e) => setSettings({ ...settings, githubUrl: e.target.value })}
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-indigo-600/20 outline-none transition-all font-medium"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Legal & Description */}
          <div className="md:col-span-2 space-y-6">
            <h4 className="text-xs font-black uppercase tracking-widest text-indigo-600">Legal e Descrição</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 ml-1">Política de Privacidade URL</label>
                <div className="relative">
                  <Shield className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="text"
                    value={settings.privacyPolicyUrl}
                    onChange={(e) => setSettings({ ...settings, privacyPolicyUrl: e.target.value })}
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-indigo-600/20 outline-none transition-all font-medium"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 ml-1">Termos e Condições URL</label>
                <div className="relative">
                  <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="text"
                    value={settings.termsConditionsUrl}
                    onChange={(e) => setSettings({ ...settings, termsConditionsUrl: e.target.value })}
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-indigo-600/20 outline-none transition-all font-medium"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 ml-1">Descrição do Rodapé</label>
              <textarea
                rows={3}
                value={settings.description}
                onChange={(e) => setSettings({ ...settings, description: e.target.value })}
                className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-600/20 outline-none transition-all font-medium resize-none"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
