import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Mail, Calendar, Search, Download, Trash2, Loader2, UserCheck } from 'lucide-react';
import { db, collection, getDocs, deleteDoc, doc, query, orderBy } from '../firebase';
import { NewsletterSubscription } from '../types';

export function NewsletterList() {
  const [subscriptions, setSubscriptions] = useState<NewsletterSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, 'newsletter'), orderBy('subscribedAt', 'desc'));
      const snapshot = await getDocs(q);
      const list = snapshot.docs.map(doc => doc.data() as NewsletterSubscription);
      setSubscriptions(list);
    } catch (error) {
      console.error('Erro ao buscar inscrições:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (email: string) => {
    if (!window.confirm(`Tem certeza que deseja remover ${email} da newsletter?`)) return;
    
    try {
      setIsDeleting(email);
      await deleteDoc(doc(db, 'newsletter', email));
      setSubscriptions(prev => prev.filter(s => s.email !== email));
    } catch (error) {
      console.error('Erro ao deletar inscrição:', error);
    } finally {
      setIsDeleting(null);
    }
  };

  const exportToCSV = () => {
    const headers = ['Email', 'Data de Inscrição'];
    const rows = subscriptions.map(s => [s.email, new Date(s.subscribedAt).toLocaleString()]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `newsletter_subscriptions_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filtered = subscriptions.filter(s => 
    s.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
        <p className="text-slate-500 font-medium">Carregando inscritos...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por e-mail..."
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <button 
          onClick={exportToCSV}
          className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/20"
        >
          <Download size={18} />
          Exportar CSV
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-500">E-mail</th>
                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-500">Data de Inscrição</th>
                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-500 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
              {filtered.length > 0 ? (
                filtered.map((sub) => (
                  <motion.tr 
                    key={sub.email}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 flex items-center justify-center">
                          <Mail size={14} />
                        </div>
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{sub.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Calendar size={14} />
                        {new Date(sub.subscribedAt).toLocaleDateString()} {new Date(sub.subscribedAt).toLocaleTimeString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => handleDelete(sub.email)}
                        disabled={isDeleting === sub.email}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all disabled:opacity-50"
                      >
                        {isDeleting === sub.email ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                      </button>
                    </td>
                  </motion.tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <UserCheck size={40} strokeWidth={1} />
                      <p className="font-medium">Nenhum inscrito encontrado.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="flex items-center justify-between px-2">
        <p className="text-xs text-slate-500 font-medium">
          Total de inscritos: <span className="text-indigo-600 font-bold">{subscriptions.length}</span>
        </p>
      </div>
    </div>
  );
}
