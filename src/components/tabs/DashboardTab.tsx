import React from 'react';
import { motion } from 'motion/react';
import { 
  FileText, 
  AlertTriangle, 
  Users, 
  Activity, 
  Printer, 
  ChevronRight, 
  Shield, 
  Bell, 
  Plus 
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { cn } from '../../lib/utils';
import { Card, Badge } from '../ui/LayoutComponents';
import { Stats, Report, User } from '../../types';

const COLORS = ['#f97316', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6', '#f59e0b'];

interface DashboardTabProps {
  stats: Stats | null;
  reports: Report[];
  alerts: any[];
  currentUser: User;
  setActiveTab: (tab: any) => void;
  setSelectedReport: (report: Report) => void;
  setIsNewReportModalOpen: (open: boolean) => void;
  mapCenter: [number, number];
}

export const DashboardTab: React.FC<DashboardTabProps> = ({ 
  stats, 
  reports, 
  alerts, 
  currentUser,
  setActiveTab, 
  setSelectedReport,
  setIsNewReportModalOpen,
  mapCenter
}) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-8"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-black tracking-tighter uppercase">Central de Comando</h2>
          <p className="text-[10px] md:text-sm text-zinc-500 mt-1 uppercase font-bold tracking-widest md:normal-case md:font-normal">Visão geral em tempo real</p>
        </div>
        <div className="flex items-center gap-2 bg-zinc-900/50 p-1 rounded-xl border border-zinc-800/50 self-start md:self-auto">
          <button className="px-3 py-1.5 text-[10px] font-bold bg-zinc-800 rounded-lg text-zinc-100 transition-all uppercase tracking-widest">Hoje</button>
          <button className="px-3 py-1.5 text-[10px] font-bold text-zinc-500 hover:text-zinc-300 uppercase tracking-widest">7 Dias</button>
          <button className="px-3 py-1.5 text-[10px] font-bold text-zinc-500 hover:text-zinc-300 uppercase tracking-widest">30 Dias</button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6">
        <Card 
          className="border-t-2 border-t-blue-500/50 relative group overflow-hidden"
          onClick={() => setActiveTab('reports')}
        >
          <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.07] group-hover:scale-125 transition-all">
            <FileText size={80} />
          </div>
          <div className="flex items-center justify-between mb-6">
            <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-500 border border-blue-500/20"><FileText size={24} /></div>
            <div className="text-right">
              <span className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.2em]">Total</span>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-4xl font-black tracking-tighter text-white">{stats?.totalReports || 0}</p>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Ocorrências</p>
          </div>
        </Card>

        <Card 
          className="border-t-2 border-t-red-500/50 relative group overflow-hidden"
          onClick={() => setActiveTab('reports')}
        >
          <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.07] group-hover:scale-125 transition-all">
            <AlertTriangle size={80} />
          </div>
          <div className="flex items-center justify-between mb-6">
            <div className="w-12 h-12 bg-red-500/10 rounded-2xl flex items-center justify-center text-red-500 border border-red-500/20"><AlertTriangle size={24} /></div>
            <div className="text-right">
              <span className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.2em]">Crítico</span>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-4xl font-black tracking-tighter text-white">
              {stats?.reportsBySeverity.find(s => s.name === 'G4')?.value || 0}
            </p>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Nível G4</p>
          </div>
        </Card>

        <Card 
          className="border-l-4 border-l-green-500"
          onClick={() => setActiveTab('users')}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-green-500/10 rounded-lg text-green-500"><Users size={20} /></div>
            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Equipe</span>
          </div>
          <p className="text-2xl md:text-4xl font-black tracking-tighter">{stats?.totalUsers || 0}</p>
          <p className="text-[8px] md:text-[10px] text-zinc-500 font-bold uppercase mt-1 tracking-widest">Agentes em Sistema</p>
        </Card>

        <Card 
          className="border-l-4 border-l-primary"
          onClick={() => setActiveTab('settings')}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-primary/10 rounded-lg text-primary"><Activity size={20} /></div>
            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Status</span>
          </div>
          <p className="text-2xl md:text-4xl font-black tracking-tighter">100%</p>
          <p className="text-[8px] md:text-[10px] text-zinc-500 font-bold uppercase mt-1 tracking-widest">Operacionalidade</p>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card title="Volume de Ocorrências (7 Dias)" className="lg:col-span-2">
          <div className="h-[300px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats?.reportsLast7Days || []}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#18181b" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  stroke="#52525b" 
                  fontSize={10} 
                  tickFormatter={(val) => val.split('-').slice(1).reverse().join('/')}
                />
                <YAxis stroke="#52525b" fontSize={10} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '8px' }}
                  itemStyle={{ color: 'var(--primary)', fontSize: '12px', fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="count" stroke="var(--primary)" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Distribuição por Categoria">
          <div className="h-[300px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats?.reportsByCategory || []}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {(stats?.reportsByCategory || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '8px' }}
                  itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 gap-2 mt-4">
              {(stats?.reportsByCategory || []).map((entry, index) => (
                <div key={entry.name} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <span className="text-[10px] text-zinc-400 font-bold truncate uppercase">{entry.name}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Map Section */}
      <Card title="Mapa de Operações" subtitle="Localização em tempo real das ocorrências registradas">
        <div className="h-[400px] bg-zinc-950 rounded-xl relative overflow-hidden border border-zinc-800/50 z-0">
          <MapContainer 
            center={mapCenter} 
            zoom={13} 
            scrollWheelZoom={false} 
            style={{ height: '100%', width: '100%', background: '#0a0a0a' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />
            {reports.filter(r => r.coords_lat && r.coords_lng).map((r) => (
              <Marker key={r.id} position={[r.coords_lat, r.coords_lng]}>
                <Popup className="custom-popup">
                  <div className="p-1 min-w-[150px]">
                    <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest">{r.categoria}</p>
                    <p className="text-sm font-bold text-zinc-900 mt-1">{r.agente_nome}</p>
                    <p className="text-[10px] text-zinc-600 mt-1 line-clamp-2">{r.descricao}</p>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-[9px] font-bold text-zinc-400">{new Date(r.timestamp).toLocaleDateString()}</span>
                      <button 
                        onClick={() => setSelectedReport(r)}
                        className="text-[10px] font-black text-orange-500 hover:underline uppercase tracking-tighter"
                      >
                        Ver Detalhes
                      </button>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </Card>
      
      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card 
          title="Últimas Ocorrências" 
          subtitle="Registros mais recentes no sistema"
          action={
            <button 
              onClick={() => window.print()}
              className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-zinc-300 transition-all no-print"
              title="Exportar Lista para PDF"
            >
              <Printer size={16} />
            </button>
          }
        >
          <div className="space-y-3 mt-4">
            {reports.slice(0, 5).map((report) => (
              <div 
                key={report.id}
                onClick={() => setSelectedReport(report)}
                className="flex items-center gap-4 p-3 rounded-xl bg-zinc-900/50 border border-zinc-800/50 hover:border-primary/30 hover:bg-zinc-900 transition-all cursor-pointer group"
              >
                <div className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                  report.gravidade === 'G4' ? "bg-red-500/10 text-red-500" :
                  report.gravidade === 'G3' ? "bg-primary/10 text-primary" :
                  "bg-zinc-800 text-zinc-400"
                )}>
                  <AlertTriangle size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <p className="text-xs font-black text-zinc-200 uppercase truncate group-hover:text-primary transition-colors">{report.titulo || 'Sem Título'}</p>
                    <span className="text-[9px] font-bold text-zinc-600">{new Date(report.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <p className="text-[10px] text-zinc-500 line-clamp-1">{report.descricao}</p>
                </div>
                <ChevronRight size={14} className="text-zinc-700 group-hover:text-zinc-400 transition-colors" />
              </div>
            ))}
            <button 
              onClick={() => setActiveTab('reports')}
              className="w-full py-2 text-[10px] font-black text-zinc-500 hover:text-primary uppercase tracking-widest transition-colors border-t border-zinc-800/50 mt-2"
            >
              Ver Todos os Registros
            </button>
          </div>
        </Card>

        <Card title="Alertas Ativos" subtitle="Notificações críticas e avisos">
          <div className="space-y-3 mt-4">
            {alerts.slice(0, 5).map((alert: any) => {
              const bgColors = {
                critico: "bg-red-500/5 border-red-500/10",
                aviso: "bg-orange-500/5 border-orange-500/10",
                informativo: "bg-blue-500/5 border-blue-500/10"
              };
              const iconBgs = {
                critico: "bg-red-500/20 text-red-500",
                aviso: "bg-orange-500/20 text-orange-500",
                informativo: "bg-blue-500/20 text-blue-500"
              };
              
              return (
                <div key={alert.id} className={cn("flex gap-3 p-3 rounded-xl border", bgColors[alert.tipo as keyof typeof bgColors] || bgColors.aviso)}>
                  <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", iconBgs[alert.tipo as keyof typeof iconBgs] || iconBgs.aviso)}>
                    {alert.tipo === 'critico' ? <Shield size={16} /> : alert.tipo === 'aviso' ? <Activity size={16} /> : <Bell size={16} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold truncate">{alert.titulo}</p>
                    <p className="text-[10px] opacity-70 mt-0.5 line-clamp-2">{alert.mensagem}</p>
                    <p className="text-[9px] text-zinc-600 mt-1 uppercase font-bold tracking-widest">{new Date(alert.timestamp).toLocaleString('pt-BR')}</p>
                  </div>
                </div>
              );
            })}
            {alerts.length === 0 && (
              <div className="py-8 text-center opacity-20">
                <Bell size={32} className="mx-auto mb-2" />
                <p className="text-[10px] font-black uppercase tracking-widest">Nenhum alerta ativo</p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </motion.div>
  );
};
