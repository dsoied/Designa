import React, { useState, useEffect } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  TrendingUp, 
  Users, 
  ImageIcon, 
  DollarSign, 
  Activity,
  Calendar,
  MousePointer2
} from 'lucide-react';
import { db } from '../firebase';
import { collection, getDocs, query, orderBy, limit, where } from 'firebase/firestore';

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export function AnalyticsDashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    proUsers: 0,
    totalProjects: 0,
    totalEvents: 0,
    revenue: 0
  });
  const [chartData, setChartData] = useState<any[]>([]);
  const [toolUsage, setToolUsage] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        
        // 1. Fetch Users Stats
        const usersSnap = await getDocs(collection(db, 'users'));
        const users = usersSnap.docs.map(doc => doc.data());
        const totalUsers = users.length;
        const proUsers = users.filter(u => u.role === 'pro').length;
        
        // 2. Fetch Projects Stats
        const projectsSnap = await getDocs(collection(db, 'projects'));
        const totalProjects = projectsSnap.size;

        // 3. Fetch Events for Chart
        const eventsSnap = await getDocs(query(collection(db, 'events'), orderBy('timestamp', 'desc'), limit(500)));
        const events = eventsSnap.docs.map(doc => ({
          ...doc.data(),
          id: doc.id
        })) as any[];

        // Process events for chart (last 7 days)
        const last7Days = Array.from({ length: 7 }, (_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - i);
          return d.toISOString().split('T')[0];
        }).reverse();

        const dailyStats = last7Days.map(date => {
          const dayEvents = events.filter(e => {
            const eDate = e.timestamp?.toDate ? e.timestamp.toDate().toISOString().split('T')[0] : '';
            return eDate === date;
          });
          return {
            name: date.split('-').slice(1).join('/'),
            views: dayEvents.filter(e => e.type === 'page_view').length,
            actions: dayEvents.filter(e => e.type === 'image_processed').length,
          };
        });

        // Process tool usage
        const tools: Record<string, number> = {};
        events.filter(e => e.type === 'image_processed').forEach(e => {
          const tool = e.tool || 'Desconhecido';
          tools[tool] = (tools[tool] || 0) + 1;
        });
        
        const toolData = Object.entries(tools).map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value);

        setStats({
          totalUsers,
          proUsers,
          totalProjects,
          totalEvents: events.length,
          revenue: proUsers * 5 // Rough estimate
        });
        setChartData(dailyStats);
        setToolUsage(toolData);
      } catch (error) {
        console.error("Analytics: Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total de Usuários" 
          value={stats.totalUsers} 
          icon={<Users className="text-blue-600" />} 
          trend="+12%" 
          color="blue"
        />
        <StatCard 
          title="Membros Pro" 
          value={stats.proUsers} 
          icon={<TrendingUp className="text-emerald-600" />} 
          trend="+5%" 
          color="emerald"
        />
        <StatCard 
          title="Imagens Processadas" 
          value={stats.totalProjects} 
          icon={<ImageIcon className="text-indigo-600" />} 
          trend="+18%" 
          color="indigo"
        />
        <StatCard 
          title="Receita Estimada" 
          value={`$${stats.revenue}`} 
          icon={<DollarSign className="text-amber-600" />} 
          trend="+8%" 
          color="amber"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Activity Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Activity className="text-indigo-600" size={20} /> Atividade nos Últimos 7 Dias
            </h3>
            <div className="flex items-center gap-4 text-xs font-bold">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 bg-indigo-600 rounded-full" />
                <span className="text-slate-500">Visualizações</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 bg-emerald-500 rounded-full" />
                <span className="text-slate-500">Ações</span>
              </div>
            </div>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fontWeight: 600, fill: '#94a3b8' }} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fontWeight: 600, fill: '#94a3b8' }} 
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="views" 
                  stroke="#4f46e5" 
                  strokeWidth={4} 
                  dot={{ r: 4, fill: '#4f46e5', strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="actions" 
                  stroke="#10b981" 
                  strokeWidth={4} 
                  dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tool Usage Pie Chart */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
            <MousePointer2 className="text-indigo-600" size={20} /> Uso de Ferramentas
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={toolUsage}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {toolUsage.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-2">
            {toolUsage.slice(0, 4).map((tool, index) => (
              <div key={tool.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <span className="text-slate-600 dark:text-slate-400 font-medium">{tool.name}</span>
                </div>
                <span className="font-bold text-slate-900 dark:text-white">{tool.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, trend, color }: any) {
  const colorClasses: any = {
    blue: 'bg-blue-50 text-blue-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    indigo: 'bg-indigo-50 text-indigo-600',
    amber: 'bg-amber-50 text-amber-600'
  };

  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-2xl ${colorClasses[color]}`}>
          {React.cloneElement(icon, { size: 24 })}
        </div>
        <span className="text-xs font-black text-emerald-500 bg-emerald-50 px-2 py-1 rounded-lg">{trend}</span>
      </div>
      <div className="space-y-1">
        <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">{title}</p>
        <p className="text-3xl font-black text-slate-900 dark:text-white">{value}</p>
      </div>
    </div>
  );
}
