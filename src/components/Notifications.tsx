import React from 'react';
import { motion } from 'motion/react';
import { Bell, CheckCircle2, Info, AlertCircle, Clock, Trash2, Settings, Check } from 'lucide-react';
import { Notification, MonetizationSettings } from '../types';
import { db, updateDoc, deleteDoc, doc } from '../firebase';
import { AdSection } from './AdSection';

interface NotificationsProps {
  notifications: Notification[];
  setNotifications: React.Dispatch<React.SetStateAction<Notification[]>>;
  monetization?: MonetizationSettings | null;
}

export function Notifications({ notifications, setNotifications, monetization }: NotificationsProps) {
  const markAllAsRead = async () => {
    const unread = notifications.filter(n => !n.isRead);
    try {
      await Promise.all(unread.map(n => updateDoc(doc(db, 'notifications', n.id), { isRead: true })));
    } catch (err) {
      console.error('Notifications: Erro ao marcar todas como lidas:', err);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { isRead: true });
    } catch (err) {
      console.error('Notifications: Erro ao marcar como lida:', err);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'notifications', id));
    } catch (err) {
      console.error('Notifications: Erro ao excluir notificação:', err);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle2 className="text-green-500" size={18} />;
      case 'warning': return <AlertCircle className="text-amber-500" size={18} />;
      default: return <Info className="text-blue-500" size={18} />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-6 space-y-8">
      <AdSection placement="notifications" layout="top" monetization={monetization} />
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Notificações</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Fique por dentro das novidades e atividades da sua conta.</p>
        </div>
        <div className="flex gap-3">
          {notifications.some(n => !n.isRead) && (
            <button 
              onClick={markAllAsRead}
              className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center gap-2"
            >
              <CheckCircle2 size={14} />
              Ler Todas
            </button>
          )}
          <button className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all">
            <Settings size={18} />
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {notifications.length > 0 ? (
          notifications.map((notification, index) => (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              key={notification.id}
              className={`group relative p-5 rounded-[2rem] border transition-all ${
                notification.isRead 
                  ? 'bg-white/50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-800/50' 
                  : 'bg-white dark:bg-slate-900 border-indigo-100 dark:border-indigo-900/30 shadow-lg shadow-indigo-500/5'
              }`}
            >
              {!notification.isRead && (
                <div className="absolute top-6 left-2 w-1.5 h-1.5 bg-indigo-600 rounded-full"></div>
              )}
              
              <div className="flex gap-4">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                  notification.type === 'success' ? 'bg-green-50 dark:bg-green-900/20' :
                  notification.type === 'warning' ? 'bg-amber-50 dark:bg-amber-900/20' :
                  'bg-blue-50 dark:bg-blue-900/20'
                }`}>
                  {getIcon(notification.type)}
                </div>
                
                <div className="flex-1 space-y-1">
                  <div className="flex justify-between items-start">
                    <h4 className={`text-sm font-bold ${notification.isRead ? 'text-slate-700 dark:text-slate-300' : 'text-slate-900 dark:text-white'}`}>
                      {notification.title}
                    </h4>
                    <span className="text-[10px] font-medium text-slate-400 flex items-center gap-1">
                      <Clock size={10} />
                      {notification.time}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    {notification.message}
                  </p>
                  {!notification.isRead && (
                    <button 
                      onClick={() => markAsRead(notification.id)}
                      className="mt-3 px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 rounded-full flex items-center gap-1 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-all active:scale-95"
                    >
                      <Check size={10} />
                      Lido
                    </button>
                  )}
                </div>

                <button 
                  onClick={() => deleteNotification(notification.id)}
                  className="opacity-0 group-hover:opacity-100 p-2 text-slate-300 hover:text-red-500 transition-all"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="py-20 text-center space-y-4">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto text-slate-400">
              <Bell size={32} />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Tudo limpo!</h3>
              <p className="text-sm text-slate-500">Você não tem novas notificações no momento.</p>
            </div>
          </div>
        )}
      </div>

      <AdSection placement="notifications" layout="bottom" monetization={monetization} />
    </div>
  );
}
