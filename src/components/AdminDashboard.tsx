import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Users, 
  Shield, 
  User as UserIcon, 
  Search, 
  MoreVertical, 
  Check, 
  X,
  Image as ImageIcon,
  Calendar,
  Mail,
  ArrowRight,
  DollarSign,
  Layout as LayoutIcon,
  Palette as PaletteIcon
} from 'lucide-react';
import Monetization from './Monetization';
import { FooterManagement } from './FooterManagement';
import { NewsletterList } from './NewsletterList';
import { db, auth } from '../firebase';
import { 
  collection, 
  getDocs, 
  doc, 
  updateDoc, 
  query, 
  where,
  orderBy,
  onSnapshot
} from 'firebase/firestore';

interface UserData {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  role: 'user' | 'pro' | 'admin';
  createdAt?: any;
  projectCount?: number;
}

export default function AdminDashboard() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [activeTab, setActiveTab] = useState<'users' | 'monetization' | 'footer' | 'newsletter'>('users');

  const isOwner = auth.currentUser?.email === 'dissooquevemdepois@gmail.com';

  if (!isOwner) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-12 text-center">
        <Shield className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Acesso Restrito</h2>
        <p className="text-slate-500 mt-2">Apenas o administrador principal tem acesso a este painel.</p>
      </div>
    );
  }

  useEffect(() => {
    const fetchUsersAndStats = async () => {
      try {
        setLoading(true);
        
        // 1. Fetch all users
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const usersList: UserData[] = usersSnapshot.docs.map(doc => ({
          ...doc.data() as UserData,
          uid: doc.id
        }));

        // 2. Fetch all projects to count per user
        // Note: In a large app, this should be a cloud function or a counter in the user doc
        const projectsSnapshot = await getDocs(collection(db, 'projects'));
        const projectCounts: Record<string, number> = {};
        
        projectsSnapshot.docs.forEach(doc => {
          const data = doc.data();
          if (data.uid) {
            projectCounts[data.uid] = (projectCounts[data.uid] || 0) + 1;
          }
        });

        // 3. Combine data
        const finalUsers = usersList.map(user => ({
          ...user,
          projectCount: projectCounts[user.uid] || 0
        })).sort((a, b) => (b.projectCount || 0) - (a.projectCount || 0));

        setUsers(finalUsers);
      } catch (error) {
        console.error("Error fetching admin data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsersAndStats();
  }, []);

  const handleUpdateRole = async (userId: string, newRole: 'user' | 'pro' | 'admin') => {
    if (newRole === 'admin' && !isOwner) {
      alert("Apenas o administrador principal pode atribuir o cargo de Admin.");
      return;
    }
    try {
      setIsUpdating(true);
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, { role: newRole });
      
      // Update local state
      setUsers(prev => prev.map(u => u.uid === userId ? { ...u, role: newRole } : u));
      if (selectedUser?.uid === userId) {
        setSelectedUser(prev => prev ? { ...prev, role: newRole } : null);
      }
    } catch (error) {
      console.error("Error updating role:", error);
      alert("Erro ao atualizar cargo. Verifique suas permissões.");
    } finally {
      setIsUpdating(false);
    }
  };

  const filteredUsers = users.filter(user => 
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.displayName || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Shield className="w-8 h-8 text-blue-600" />
            Painel de Gestão
          </h1>
          <p className="text-gray-500 mt-1">Gerencie usuários, cargos e acompanhe o uso da plataforma.</p>
        </div>

        <div className="flex items-center gap-2 bg-gray-100 p-1.5 rounded-2xl">
          <button 
            onClick={() => setActiveTab('users')}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'users' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <Users size={18} />
            Usuários
          </button>
          {isOwner && (
            <>
              <button 
                onClick={() => setActiveTab('monetization')}
                className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'monetization' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <DollarSign size={18} />
                Monetização
              </button>
              <button 
                onClick={() => setActiveTab('footer')}
                className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'footer' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <LayoutIcon size={18} />
                Rodapé
              </button>
            </>
          )}
          <button 
            onClick={() => setActiveTab('newsletter')}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'newsletter' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <Mail size={18} />
            Newsletter
          </button>
        </div>

        {activeTab === 'users' && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nome ou e-mail..."
              className="pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none w-full md:w-80 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        )}
      </div>

      {activeTab === 'users' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Users List */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="px-6 py-4 text-sm font-semibold text-gray-600">Usuário</th>
                      <th className="px-6 py-4 text-sm font-semibold text-gray-600">Cargo</th>
                      <th className="px-6 py-4 text-sm font-semibold text-gray-600">Imagens</th>
                      <th className="px-6 py-4 text-sm font-semibold text-gray-600 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredUsers.map((user) => (
                      <motion.tr 
                        key={user.uid}
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className={`hover:bg-blue-50/30 transition-colors cursor-pointer ${selectedUser?.uid === user.uid ? 'bg-blue-50/50' : ''}`}
                        onClick={() => setSelectedUser(user)}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            {user.photoURL ? (
                              <img src={user.photoURL} alt="" className="w-10 h-10 rounded-full object-cover border border-gray-100" referrerPolicy="no-referrer" />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                                <UserIcon className="w-5 h-5 text-gray-400" />
                              </div>
                            )}
                            <div>
                              <div className="font-medium text-gray-900">{user.displayName || 'Sem nome'}</div>
                              <div className="text-xs text-gray-500">{user.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                            user.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                            user.role === 'pro' ? 'bg-blue-100 text-blue-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {user.role.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <ImageIcon className="w-4 h-4 text-gray-400" />
                            {user.projectCount || 0}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                            <ArrowRight className="w-5 h-5 text-gray-400" />
                          </button>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* User Details & Management */}
          <div className="lg:col-span-1">
            {selectedUser ? (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sticky top-6"
              >
                <div className="flex flex-col items-center text-center mb-6">
                  {selectedUser.photoURL ? (
                    <img src={selectedUser.photoURL} alt="" className="w-20 h-20 rounded-full object-cover border-4 border-gray-50 mb-4" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                      <UserIcon className="w-10 h-10 text-gray-400" />
                    </div>
                  )}
                  <h2 className="text-xl font-bold text-gray-900">{selectedUser.displayName || 'Usuário'}</h2>
                  <p className="text-sm text-gray-500">{selectedUser.email}</p>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 block">
                      Alterar Cargo
                    </label>
                    <div className="grid grid-cols-1 gap-2">
                      {(['user', 'pro', 'admin'] as const).map((role) => {
                        if (role === 'admin' && !isOwner) return null;
                        return (
                          <button
                            key={role}
                            disabled={isUpdating}
                            onClick={() => handleUpdateRole(selectedUser.uid, role)}
                            className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${
                              selectedUser.role === role 
                                ? 'bg-blue-50 border-blue-200 text-blue-700' 
                                : 'bg-white border-gray-100 text-gray-600 hover:border-gray-200'
                            }`}
                          >
                            <span className="capitalize font-medium">{role}</span>
                            {selectedUser.role === role && <Check className="w-5 h-5" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="pt-6 border-t border-gray-50">
                    <div className="flex items-center justify-between text-sm mb-4">
                      <span className="text-gray-500 flex items-center gap-2">
                        <ImageIcon className="w-4 h-4" />
                        Total de Imagens
                      </span>
                      <span className="font-bold text-gray-900">{selectedUser.projectCount}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm mb-4">
                      <span className="text-gray-500 flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        Membro desde
                      </span>
                      <span className="font-medium text-gray-900">
                        {selectedUser.createdAt?.toDate ? selectedUser.createdAt.toDate().toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500 flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        UID
                      </span>
                      <span className="text-xs font-mono text-gray-400 truncate max-w-[150px]">
                        {selectedUser.uid}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 p-12 text-center">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Selecione um usuário para gerenciar suas permissões e ver detalhes.</p>
              </div>
            )}
          </div>
        </div>
      ) : activeTab === 'monetization' ? (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <Monetization />
        </motion.div>
      ) : activeTab === 'footer' ? (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <FooterManagement />
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <NewsletterList />
        </motion.div>
      )}
    </div>
  );
}
