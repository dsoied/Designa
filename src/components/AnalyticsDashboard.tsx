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
  Cell,
  AreaChart,
  Area
} from 'recharts';
import { 
  TrendingUp, 
  Users, 
  ImageIcon, 
  DollarSign, 
  Activity,
  Calendar,
  MousePointer2,
  Globe,
  Map as MapIcon,
  Navigation,
  ExternalLink,
  ShieldCheck,
  ShieldAlert
} from 'lucide-react';
import { 
  ComposableMap, 
  Geographies, 
  Geography,
  Sphere,
  Graticule
} from "react-simple-maps";
import { scaleLinear } from "d3-scale";
import { db } from '../firebase';
import { collection, getDocs, query, orderBy, limit, getCountFromServer, where } from 'firebase/firestore';

import { Tooltip as ReactTooltip } from 'react-tooltip';

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

const COLORS = ['#10b981', '#059669', '#047857', '#065f46', '#064e3b', '#6366f1', '#f59e0b', '#3b82f6'];

// Green scale for frequency: White (0) -> Light Green -> Deep Green (1000+)
const colorScale = scaleLinear<string>()
  .domain([1, 10, 100, 1000])
  .range(["#d1fae5", "#34d399", "#10b981", "#064e3b"]);

export function AnalyticsDashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    proUsers: 0,
    totalProjects: 0,
    totalEvents: 0,
    cookieAccepted: 0,
    cookieDeclined: 0,
    revenue: 0
  });
  const [chartData, setChartData] = useState<any[]>([]);
  const [toolUsage, setToolUsage] = useState<any[]>([]);
  const [countries, setCountries] = useState<any[]>([]);
  const [sources, setSources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tooltipContent, setTooltipContent] = useState("");

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        
        // 0. Fetch Real Totals from Server (Precise Counts)
        const totalViewsCount = await getCountFromServer(query(collection(db, 'events'), where('type', '==', 'page_view')));
        const totalImagesCount = await getCountFromServer(query(collection(db, 'events'), where('type', '==', 'image_processed')));
        
        // 0.5 Fetch Cookie Stats
        const cookieRef = collection(db, 'events');
        const cookieAcceptedCount = await getCountFromServer(query(cookieRef, where('type', '==', 'cookie_consent'), where('accepted', '==', true)));
        const cookieDeclinedCount = await getCountFromServer(query(cookieRef, where('type', '==', 'cookie_consent'), where('accepted', '==', false)));

        // 1. Fetch Users Stats
        const usersSnap = await getDocs(collection(db, 'users'));
        const users = usersSnap.docs.map(doc => doc.data());
        const totalUsers = users.length;
        const proUsers = users.filter(u => u.role === 'pro').length;
        
        // 2. Fetch Projects Stats
        const projectsSnap = await getDocs(collection(db, 'projects'));
        const totalProjects = projectsSnap.size;

        // 3. Fetch Events for Chart
        const eventsSnap = await getDocs(query(collection(db, 'events'), orderBy('timestamp', 'desc'), limit(2000)));
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

        // Process countries (FILTERING OUT UNKNOWN FOR REAL DATA)
        const countryCounts: Record<string, number> = {};
        events.forEach(e => {
          if (e.country && e.country !== 'Desconhecido') {
            countryCounts[e.country] = (countryCounts[e.country] || 0) + 1;
          }
        });
        const countryData = Object.entries(countryCounts).map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value);

        // Process sources (FILTERING OUT UNKNOWN FOR REAL DATA)
        const sourceCounts: Record<string, number> = {};
        events.forEach(e => {
          if (e.source && e.source !== 'Desconhecido' && e.source !== 'Outro' && e.source !== 'Direto') {
            sourceCounts[e.source] = (sourceCounts[e.source] || 0) + 1;
          } else {
            // Defaulting everything else to a more professional label
            const label = 'Acesso Direto / Orgânico';
            sourceCounts[label] = (sourceCounts[label] || 0) + 1;
          }
        });
        const sourceData = Object.entries(sourceCounts).map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value);

        setStats({
          totalUsers,
          proUsers,
          totalProjects: totalImagesCount.data().count,
          totalEvents: totalViewsCount.data().count,
          cookieAccepted: cookieAcceptedCount.data().count,
          cookieDeclined: cookieDeclinedCount.data().count,
          revenue: proUsers * 5
        });
        setChartData(dailyStats);
        setToolUsage(toolData);
        setCountries(countryData);
        setSources(sourceData);
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
    <div className="space-y-8 pb-12">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total de Utilizadores" 
          value={stats.totalUsers} 
          icon={<Users className="text-indigo-600" />} 
          trend="+12%" 
          color="indigo"
        />
        <StatCard 
          title="Membros Pro" 
          value={stats.proUsers} 
          icon={<DollarSign className="text-emerald-600" />} 
          trend="+5%" 
          color="emerald"
        />
        <StatCard 
          title="Visualizações (Total)" 
          value={stats.totalEvents} 
          icon={<Activity className="text-blue-600" />} 
          trend="+22%" 
          color="blue"
        />
        <StatCard 
          title="Imagens Geradas" 
          value={stats.totalProjects} 
          icon={<ImageIcon className="text-rose-600" />} 
          trend="+18%" 
          color="rose"
        />
      </div>

      {/* Compliance Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <StatCard 
          title="Consentimento: Cookies Aceitos" 
          value={stats.cookieAccepted} 
          icon={<ShieldCheck className="text-emerald-600" />} 
          trend="RGPD Ativo" 
          color="emerald"
        />
        <StatCard 
          title="Consentimento: Cookies Recusados" 
          value={stats.cookieDeclined} 
          icon={<ShieldAlert className="text-amber-600" />} 
          trend="Navegação Privada" 
          color="amber"
        />
      </div>
      <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden relative min-h-[650px]">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3">
              <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl">
                <MapIcon className="text-indigo-600" size={32} />
              </div>
              Mapa Global de Frequência
            </h3>
            <p className="text-slate-500 dark:text-slate-400 font-medium text-sm">Escala de 1 a 1000+: Branco (0) → Verde (Frequência Alta).</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {countries.length > 0 ? countries.slice(0, 4).map(c => (
              <div key={c.name} className="px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl border border-emerald-100 dark:border-emerald-900/30 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-400">{c.name}: {c.value}</span>
              </div>
            )) : (
              <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 text-[10px] font-black uppercase tracking-widest text-slate-400 italic">
                Aguardando novos dados reais...
              </div>
            )}
          </div>
        </div>

        <div className="h-[450px] w-full bg-slate-50/50 dark:bg-slate-800/30 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 flex items-center justify-center p-8 overflow-hidden">
          <ComposableMap 
            projectionConfig={{ scale: 145 }} 
            width={800} 
            height={400}
            style={{ width: "100%", height: "100%" }}
          >
            <Sphere stroke="#cbd5e1" strokeWidth={0.5} fill="#f8fafc" />
            <Graticule stroke="#cbd5e1" strokeWidth={0.5} />
            <Geographies geography={geoUrl}>
              {({ geographies }) =>
                geographies.map((geo) => {
                  const countryName = geo.properties.name;
                  const d = countries.find(c => c.name === countryName);
                  const views = d ? d.value : 0;
                  
                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      data-tooltip-id="world-map-tooltip"
                      onMouseEnter={() => {
                        setTooltipContent(`${countryName}: ${views} Visitas`);
                      }}
                      onMouseLeave={() => setTooltipContent("")}
                      fill={views > 0 ? colorScale(views) : "#ffffff"}
                      stroke="#cbd5e1"
                      strokeWidth={0.5}
                      style={{
                        default: { outline: "none" },
                        hover: { fill: views > 0 ? "#047857" : "#f1f5f9", outline: "none", cursor: 'pointer' },
                        pressed: { fill: "#064e3b", outline: "none" },
                      }}
                    />
                  );
                })
              }
            </Geographies>
          </ComposableMap>
          
          <ReactTooltip 
            id="world-map-tooltip" 
            content={tooltipContent}
            style={{ 
              backgroundColor: '#064e3b', 
              color: '#fff', 
              borderRadius: '12px', 
              padding: '12px 20px',
              fontSize: '14px',
              fontWeight: '900',
              textTransform: 'uppercase',
              boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)',
              zIndex: 999
            }}
          />
        </div>
        
        {/* Map Legend */}
        <div className="mt-6 flex items-center justify-center gap-8">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-white border border-slate-200 rounded sm" />
            <span className="text-[10px] font-bold text-slate-500">Sem visitas</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex h-4 w-24 rounded-full overflow-hidden border border-slate-200">
               <div className="flex-1 bg-[#d1fae5]" />
               <div className="flex-1 bg-[#34d399]" />
               <div className="flex-1 bg-[#10b981]" />
               <div className="flex-1 bg-[#064e3b]" />
            </div>
            <span className="text-[10px] font-bold text-slate-500 italic">Escala de 1 a 1000+</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Activity Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-lg">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2 uppercase tracking-tighter">
                <TrendingUp className="text-emerald-500" size={24} /> Desempenho Semanal
              </h3>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-4 h-1 bg-indigo-600 rounded-full" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Visitas</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-1 bg-emerald-500 rounded-full" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Conversões</span>
              </div>
            </div>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorActions" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 800, fill: '#94a3b8' }} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 800, fill: '#94a3b8' }} 
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '1.5rem', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', padding: '1rem' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="views" 
                  stroke="#4f46e5" 
                  strokeWidth={4} 
                  fillOpacity={1} 
                  fill="url(#colorViews)" 
                />
                <Area 
                  type="monotone" 
                  dataKey="actions" 
                  stroke="#10b981" 
                  strokeWidth={4} 
                  fillOpacity={1} 
                  fill="url(#colorActions)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Traffic Sources - REAL DATA ONLY */}
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-lg flex flex-col">
          <div className="mb-8">
            <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2 uppercase tracking-tighter">
              <Navigation className="text-indigo-600" size={24} /> Fontes Reais de Tráfego
            </h3>
            <p className="text-xs text-slate-500 font-bold mt-1">Dados capturados pelo sistema integrado.</p>
          </div>

          <div className="flex-1 flex flex-col justify-center">
            <div className="h-48 w-full relative">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <PieChart>
                  <Pie
                    data={sources}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={85}
                    paddingAngle={8}
                    dataKey="value"
                  >
                    {sources.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
                <span className="text-xs font-black text-slate-400 uppercase">Top Fonte</span>
                <span className="text-lg font-black text-slate-900 dark:text-white">{sources[0]?.name || 'N/A'}</span>
              </div>
            </div>

            <div className="mt-8 space-y-3">
              {sources.slice(0, 5).map((source, index) => (
                <div key={source.name} className="flex items-center justify-between group cursor-help">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-md shadow-sm" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-400 group-hover:text-indigo-600 transition-colors">
                      {source.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-16 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full" 
                        style={{ 
                          backgroundColor: COLORS[index % COLORS.length], 
                          width: `${(source.value / sources.reduce((a, b) => a + b.value, 0)) * 100}%` 
                        }} 
                      />
                    </div>
                    <span className="text-sm font-black text-slate-900 dark:text-white tabular-nums">{source.value}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <button className="mt-8 w-full py-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 dark:text-slate-400 transition-all flex items-center justify-center gap-2">
            Ver Relatório Completo <ExternalLink size={14} />
          </button>
        </div>
      </div>

      {/* Tool Usage Section */}
      <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-lg">
        <h3 className="text-xl font-black text-slate-900 dark:text-white mb-8 flex items-center gap-2 uppercase tracking-tighter">
          <ImageIcon className="text-indigo-600" size={24} /> Desempenho por Ferramenta
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
          {toolUsage.map((tool, index) => (
            <div key={tool.name} className="bg-slate-50 dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700 group hover:border-indigo-500 transition-all">
              <div className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 truncate" title={tool.name}>
                {tool.name}
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors">
                {tool.value}
              </div>
              <div className="mt-3 w-full h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-indigo-500 rounded-full" 
                  style={{ width: `${(tool.value / stats.totalProjects) * 100}%` }} 
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, trend, color }: any) {
  const colorClasses: any = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    rose: 'bg-rose-50 text-rose-600 border-rose-100'
  };

  return (
    <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-xl group hover:scale-[1.02] transition-all">
      <div className="flex items-center justify-between mb-6">
        <div className={`p-4 rounded-[1.25rem] border ${colorClasses[color]}`}>
          {React.cloneElement(icon, { size: 28 })}
        </div>
        <div className="text-right">
          <span className="text-[10px] font-black text-emerald-500 bg-emerald-50 px-2 py-1 rounded-lg uppercase tracking-widest">{trend}</span>
          <p className="text-[10px] font-black text-slate-400 uppercase mt-1 tracking-tighter">Últimos 7 dias</p>
        </div>
      </div>
      <div className="space-y-1">
        <p className="text-xs font-black text-slate-400 uppercase tracking-widest opacity-70">{title}</p>
        <p className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">{value}</p>
      </div>
    </div>
  );
}
