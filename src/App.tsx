import React, { useState, useEffect, useMemo } from 'react';
import { 
  Shield, 
  FileText, 
  Users, 
  Lock, 
  AlertTriangle, 
  MapPin, 
  Clock, 
  Camera,
  ChevronRight,
  Plus,
  Search,
  Filter,
  Trash2,
  Edit2,
  CheckCircle2,
  XCircle,
  MoreVertical,
  Activity,
  Calendar,
  Settings as SettingsIcon,
  LogOut,
  Bell,
  Download,
  Printer
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';
import { Toaster, toast } from 'sonner';
import { cn } from './lib/utils';
import { io } from 'socket.io-client';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

// Fix Leaflet default icon issue
// @ts-ignore
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
// @ts-ignore
import markerIcon from 'leaflet/dist/images/marker-icon.png';
// @ts-ignore
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// --- Types ---
type NivelHierarquico = 'Superadmin' | 'Sierra 1' | 'Sierra 2' | 'Oficial' | 'Supervisor' | 'Agente';
type Categoria = 'Valores' | 'Perímetro' | 'Logística' | 'Safety' | 'Manutenção' | 'Informativo' | 'Operativo';
type Gravidade = 'G1' | 'G2' | 'G3' | 'G4';

interface User {
  id: number;
  nome: string;
  funcao: string;
  numero_mecanografico: string;
  nivel_hierarquico: NivelHierarquico;
  permissions?: Record<string, boolean>;
}

interface Report {
  id: number;
  agente_id: number;
  agente_nome: string;
  agente_nivel: string;
  titulo: string;
  categoria: Categoria;
  gravidade: Gravidade;
  descricao: string;
  fotos_path: string;
  coords_lat: number;
  coords_lng: number;
  status: 'Aberto' | 'Concluído';
  timestamp: string;
  metadata?: any;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  type: 'report' | 'system' | 'alert';
  reportId?: number;
}

interface Stats {
  totalReports: number;
  totalUsers: number;
  reportsByCategory: { name: string, value: number }[];
  reportsBySeverity: { name: string, value: number }[];
  reportsLast7Days: { date: string, count: number }[];
}

// --- UI Components ---

const SidebarItem = ({ icon: Icon, label, active, onClick }: { icon: any, label: string, active?: boolean, onClick: () => void }) => (
  <button 
    onClick={onClick}
    className={cn(
      "w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all duration-200",
      active 
        ? "bg-primary/10 text-primary border-r-2 border-primary" 
        : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/50"
    )}
  >
    <Icon size={18} className={active ? "text-primary" : "text-zinc-500"} />
    {label}
  </button>
);

const Badge = ({ gravidade }: { gravidade: Gravidade }) => {
  const colors = {
    G1: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    G2: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    G3: 'bg-primary/10 text-primary/80 border-primary/20',
    G4: 'bg-red-500/10 text-red-400 border-red-500/20',
  };
  return (
    <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider", colors[gravidade])}>
      {gravidade}
    </span>
  );
};

const Card = ({ children, className, title, subtitle, action, onClick }: { children?: React.ReactNode, className?: string, title?: string, subtitle?: string, action?: React.ReactNode, key?: any, onClick?: () => void }) => (
  <div 
    onClick={onClick}
    className={cn(
      "bg-zinc-900/40 border border-zinc-800/50 rounded-xl overflow-hidden backdrop-blur-sm transition-all", 
      onClick && "cursor-pointer hover:border-zinc-700 hover:bg-zinc-900/60 active:scale-[0.98]",
      className
    )}
  >
    {(title || action) && (
      <div className="p-3 md:p-4 border-b border-zinc-800/50 flex items-center justify-between">
        <div>
          {title && <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-widest">{title}</h3>}
          {subtitle && <p className="text-[10px] text-zinc-500 mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>
    )}
    <div className="p-3 md:p-4">{children}</div>
  </div>
);

// --- Main App ---

const Login = ({ onLogin, publicSettings }: { onLogin: (user: any) => void, publicSettings: any }) => {
  const [numero, setNumero] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Iniciando tentativa de login para:", numero);
    setLoading(true);
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ numero_mecanografico: numero, password }),
        credentials: 'include'
      });
      
      console.log("Status da resposta do servidor:", res.status);
      
      const data = await res.json();
      console.log("Dados recebidos do servidor:", data);
      
      if (data.status === 'success') {
        onLogin(data.user);
        toast.success(`Bem-vindo, ${data.user.nome}`);
      } else {
        toast.error(data.message || "Credenciais incorretas");
      }
    } catch (err) {
      console.error("Erro crítico na requisição de login:", err);
      toast.error("Erro de conexão: O servidor pode estar offline ou inacessível");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-main)] p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md space-y-8 bg-[var(--bg-card)] p-8 rounded-2xl border border-[var(--border)] backdrop-blur-xl"
      >
        <div className="text-center">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-primary/20">
            <Shield size={32} className="text-primary-foreground" strokeWidth={2.5} />
          </div>
          <h1 className="text-3xl font-black tracking-tighter text-[var(--text-main)] uppercase">{publicSettings.app_name}</h1>
          <p className="text-[var(--text-muted)] text-xs font-bold tracking-[0.3em] mt-2 uppercase">{publicSettings.app_slogan}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Nº Mecanográfico</label>
            <div className="relative group">
              <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-primary transition-colors" size={18} />
              <input 
                type="text" 
                required
                value={numero}
                onChange={(e) => setNumero(e.target.value)}
                placeholder="Ex: superadmin"
                className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-primary/50 focus:bg-zinc-900 transition-all"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Senha de Acesso</label>
            <div className="relative group">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-primary transition-colors" size={18} />
              <input 
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-primary/50 focus:bg-zinc-900 transition-all"
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-primary hover:opacity-90 text-primary-foreground font-black py-4 rounded-xl transition-all active:scale-[0.98] shadow-lg shadow-primary/20 uppercase tracking-widest text-xs disabled:opacity-50"
          >
            {loading ? "Autenticando..." : "Entrar no Sistema"}
          </button>
        </form>

        <div className="text-center pt-4">
          <p className="text-[10px] text-zinc-600 font-medium uppercase tracking-widest">Acesso restrito a pessoal autorizado</p>
        </div>
      </motion.div>
    </div>
  );
};

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'reports' | 'users' | 'permissions' | 'daily_reports' | 'settings'>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('');
  
  // Data State
  const [reports, setReports] = useState<Report[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<{ nivel_hierarquico: string, peso: number }[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [dailyReports, setDailyReports] = useState<any[]>([]);
  const [systemSettings, setSystemSettings] = useState<any[]>([]);
  const [publicSettings, setPublicSettings] = useState<any>({
    app_name: 'MINEGUARD',
    app_slogan: 'Security Operating System',
    app_theme_mode: 'dark',
    app_theme_palette: 'orange',
    app_layout: 'default'
  });
  const [selectedRoleForPerms, setSelectedRoleForPerms] = useState<string>('Superadmin');
  const [rolePermissions, setRolePermissions] = useState<{ permissao_nome: string, is_enabled: boolean }[]>([]);
  
  // UI State
  const [isLoading, setIsLoading] = useState(true);
  const [isNewReportModalOpen, setIsNewReportModalOpen] = useState(false);
  const [isNewUserModalOpen, setIsNewUserModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isBellShaking, setIsBellShaking] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number]>([-8.8383, 13.2344]); // Angola/Luanda default
  
  // Form States
  const [newReport, setNewReport] = useState({
    titulo: '',
    categoria: 'Valores' as Categoria,
    gravidade: 'G1' as Gravidade,
    descricao: '',
    coords_lat: '',
    coords_lng: '',
    foto: null as File | null,
    metadata: {} as any
  });

  const [newUser, setNewUser] = useState({
    nome: '',
    funcao: '',
    numero_mecanografico: '',
    nivel_hierarquico: 'Agente' as NivelHierarquico,
    password: ''
  });

  const addNotification = (title: string, message: string, type: 'report' | 'system' | 'alert' = 'system', reportId?: number) => {
    const newNotif: Notification = {
      id: Math.random().toString(36).substring(7),
      title,
      message,
      timestamp: new Date().toISOString(),
      read: false,
      type,
      reportId
    };
    setNotifications(prev => [newNotif, ...prev]);
    setIsBellShaking(true);
    setTimeout(() => setIsBellShaking(false), 1000);
  };

  // Socket.io Connection
  useEffect(() => {
    const socket = io();
    socket.on('new_report', (report: Report) => {
      // Check if user should see this report
      const isAuthor = report.agente_id === currentUser?.id;
      const isOficialPlus = (currentUser?.peso || 0) >= 60;

      if (isAuthor || isOficialPlus) {
        setReports(prev => [report, ...prev]);
        toast.info(`Nova ocorrência: ${report.categoria} - ${report.agente_nome}`, {
          description: report.descricao.substring(0, 50) + "..."
        });
        
        addNotification(
          `Nova Ocorrência: ${report.categoria}`,
          `Registrada por ${report.agente_nome} (${report.gravidade})`,
          'report',
          report.id
        );

        // Refresh stats if permitted
        if (currentUser?.permissions?.view_dashboard === true) {
          fetch('/api/stats', { credentials: 'include' }).then(res => res.ok ? res.json() : null).then(data => data && setStats(data));
        }
      }
    });

    socket.on('report_updated', ({ id, status }: { id: number, status: 'Aberto' | 'Concluído' }) => {
      setReports(prev => prev.map(r => r.id === id ? { ...r, status } : r));
      if (selectedReport && selectedReport.id === id) {
        setSelectedReport(prev => prev ? { ...prev, status } : null);
      }
    });

    return () => { socket.disconnect(); };
  }, [currentUser, selectedReport]);

  // Check Auth on Mount
  useEffect(() => {
    // Fetch Public Settings
    fetch('/api/public/settings')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) {
          setPublicSettings(data);
          // Apply theme
          const root = document.documentElement;
          if (data.app_theme_mode === 'light') root.classList.add('light');
          else root.classList.remove('light');
          
          // Apply palette
          const palettes = ['theme-orange', 'theme-blue', 'theme-green', 'theme-red', 'theme-purple'];
          palettes.forEach(p => root.classList.remove(p));
          root.classList.add(`theme-${data.app_theme_palette || 'orange'}`);
        }
      });

    fetch('/api/me', { credentials: 'include' })
      .then(res => res.ok ? res.json() : null)
      .then(user => {
        if (user) {
          setCurrentUser(user);
          // Initial notifications
          setNotifications([
            {
              id: '1',
              title: 'Sistema Iniciado',
              message: 'MineGuard Security OS está operacional.',
              timestamp: new Date().toISOString(),
              read: true,
              type: 'system'
            },
            {
              id: '2',
              title: 'Dica de Segurança',
              message: 'Lembre-se de registrar todas as alterações de turno.',
              timestamp: new Date(Date.now() - 3600000).toISOString(),
              read: false,
              type: 'alert'
            }
          ]);
        }
        setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    if (currentUser && activeTab === 'dashboard' && currentUser.permissions?.view_dashboard !== true) {
      setActiveTab('reports');
    }
  }, [currentUser, activeTab]);

  // Fetch Data
  const fetchData = async () => {
    if (!currentUser) return;
    try {
      const promises: Promise<any>[] = [];
      const keys: string[] = [];
      const perms = currentUser.permissions || {};

      if (perms.view_reports === true) {
        promises.push(fetch(`/api/reports?role=${currentUser.nivel_hierarquico}&search=${searchQuery}&category=${filterCategory}&severity=${filterSeverity}`, { credentials: 'include' }));
        keys.push('reports');
      }
      if (perms.manage_users === true) {
        promises.push(fetch('/api/users', { credentials: 'include' }));
        keys.push('users');
      }
      if (perms.manage_permissions === true) {
        promises.push(fetch('/api/roles', { credentials: 'include' }));
        keys.push('roles');
      }
      if (perms.view_dashboard === true) {
        promises.push(fetch('/api/stats', { credentials: 'include' }));
        keys.push('stats');
      }
      if (perms.view_daily_reports === true) {
        promises.push(fetch('/api/reports/daily', { credentials: 'include' }));
        keys.push('daily');
      }
      if (perms.manage_settings === true) {
        promises.push(fetch('/api/settings', { credentials: 'include' }));
        keys.push('settings');
      }

      if (promises.length === 0) return;

      const responses = await Promise.all(promises);
      const dataResults = await Promise.all(responses.map(res => res.ok ? res.json() : null));

      dataResults.forEach((data, index) => {
        if (!data) return;
        const key = keys[index];
        if (key === 'reports') setReports(data);
        if (key === 'users') setUsers(data);
        if (key === 'roles') setRoles(data);
        if (key === 'stats') setStats(data);
        if (key === 'daily') setDailyReports(data);
        if (key === 'settings') setSystemSettings(data);
      });
    } catch (error) {
      console.error("Fetch error:", error);
      toast.error("Erro ao carregar dados do sistema");
    }
  };

  const fetchPermissions = async (role: string) => {
    if (currentUser?.permissions?.manage_permissions !== true) return;
    try {
      const res = await fetch(`/api/permissions/${role}`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setRolePermissions(data);
      }
    } catch (err) {
      console.error("Erro ao buscar permissões:", err);
    }
  };

  useEffect(() => {
    if (activeTab === 'permissions') {
      fetchPermissions(selectedRoleForPerms);
    }
  }, [selectedRoleForPerms, activeTab]);

  useEffect(() => {
    fetchData();
  }, [activeTab, searchQuery, filterCategory, filterSeverity, currentUser]);

  // Get user's geolocation for map
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setMapCenter([position.coords.latitude, position.coords.longitude]);
        },
        (error) => {
          console.log("Geolocation denied or unavailable, using Angola default:", error);
          // Keep Angola default
        },
        { timeout: 10000 }
      );
    }
  }, []);

  // Actions
  const handleCreateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const toastId = toast.loading("Capturando localização e preparando transmissão...");
    
    try {
      // Capture Geolocation
      let lat = newReport.coords_lat;
      let lng = newReport.coords_lng;
      
      if (!lat || !lng) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 30000, enableHighAccuracy: true });
          });
          lat = position.coords.latitude.toString();
          lng = position.coords.longitude.toString();
          toast.loading("Localização capturada. Enviando relatório...", { id: toastId });
          console.log("Geolocation captured:", lat, lng);
        } catch (geoErr: any) {
          console.warn("Geolocation failed, using map center as fallback", geoErr);
          // Use map center as fallback
          lat = mapCenter[0].toString();
          lng = mapCenter[1].toString();
          toast.loading("Usando localização do mapa como referência...", { id: toastId });
        }
      }

      const formData = new FormData();
      formData.append('titulo', newReport.titulo);
      formData.append('categoria', newReport.categoria);
      formData.append('gravidade', newReport.gravidade);
      formData.append('descricao', newReport.descricao);
      formData.append('coords_lat', lat);
      formData.append('coords_lng', lng);
      formData.append('metadata', JSON.stringify(newReport.metadata));
      if (newReport.foto) formData.append('foto', newReport.foto);

      const res = await fetch('/api/reports', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      
      if (res.ok) {
        toast.success("Relatório Enviado com Sucesso", { id: toastId });
        setIsNewReportModalOpen(false);
        setNewReport({ 
          titulo: '', 
          categoria: 'Valores', 
          gravidade: 'G1', 
          descricao: '', 
          coords_lat: '', 
          coords_lng: '', 
          foto: null,
          metadata: {}
        });
        fetchData();
      } else {
        const data = await res.json();
        toast.error(data.message || "Erro ao enviar relatório", { id: toastId });
      }
    } catch (err) {
      toast.error("Erro de conexão com o servidor", { id: toastId });
    }
  };

  const handleLogout = async () => {
    await fetch('/api/logout', { method: 'POST', credentials: 'include' });
    setCurrentUser(null);
    toast.info("Sessão encerrada");
  };

  if (isLoading) return (
    <div className="h-screen bg-[#050505] flex items-center justify-center">
      <Toaster position="top-right" theme="dark" richColors />
      <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!currentUser) return (
    <>
      <Toaster position="top-right" theme="dark" richColors />
      <Login onLogin={setCurrentUser} publicSettings={publicSettings} />
    </>
  );

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const method = editingUser ? 'PUT' : 'POST';
      const url = editingUser ? `/api/users/${editingUser.id}` : '/api/users';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
        credentials: 'include'
      });
      
      if (res.ok) {
        toast.success(editingUser ? "Usuário atualizado!" : "Usuário criado!");
        setIsNewUserModalOpen(false);
        setEditingUser(null);
        setNewUser({ nome: '', funcao: '', numero_mecanografico: '', nivel_hierarquico: 'Agente' });
        fetchData();
      }
    } catch (err) {
      toast.error("Erro ao salvar usuário");
    }
  };

  const handleConcludeReport = async (reportId: number, currentStatus: string) => {
    const newStatus = currentStatus === 'Aberto' ? 'Concluído' : 'Aberto';
    try {
      const res = await fetch(`/api/reports/${reportId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
        credentials: 'include'
      });
      const data = await res.json();
      if (data.status === 'success') {
        toast.success(`Relatório ${newStatus.toLowerCase()} com sucesso!`);
        setReports(reports.map(r => r.id === reportId ? { ...r, status: newStatus as any } : r));
        if (selectedReport && selectedReport.id === reportId) {
          setSelectedReport({ ...selectedReport, status: newStatus as any });
        }
      } else {
        toast.error(data.message);
      }
    } catch (err) {
      toast.error("Erro ao atualizar status do relatório");
    }
  };

  const handleDeleteUser = async (id: number) => {
    if (!confirm("Deseja realmente excluir este usuário?")) return;
    try {
      const res = await fetch(`/api/users/${id}`, { method: 'DELETE', credentials: 'include' });
      if (res.ok) {
        toast.success("Usuário removido");
        fetchData();
      }
    } catch (err) {
      toast.error("Erro ao remover usuário");
    }
  };

  const COLORS = ['#f97316', '#3b82f6', '#10b981', '#ef4444', '#a855f7', '#eab308'];

  return (
    <div className="flex h-screen bg-[var(--bg-main)] text-[var(--text-main)] font-sans selection:bg-primary/30">
      <Toaster position="top-right" theme="dark" richColors />
      
      {/* Sidebar */}
      <aside className={cn(
        "hidden md:flex flex-col bg-[var(--bg-sidebar)] no-print border-r border-[var(--border)] transition-all duration-300",
        publicSettings.app_layout === 'compact' ? "w-20" : "w-64"
      )}>
        <div className={cn(
          "p-6 flex items-center gap-3 border-b border-[var(--border)]",
          publicSettings.app_layout === 'compact' && "justify-center p-4"
        )}>
          <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center shadow-lg shadow-primary/20 shrink-0">
            <Shield className="text-primary-foreground" size={22} strokeWidth={2.5} />
          </div>
          {publicSettings.app_layout !== 'compact' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <h1 className="font-black tracking-tighter text-xl leading-none uppercase">{publicSettings.app_name}</h1>
              <p className="text-[10px] text-[var(--text-muted)] font-bold tracking-[0.2em] mt-1 uppercase">{publicSettings.app_slogan}</p>
            </motion.div>
          )}
        </div>
        
        <nav className="flex-1 mt-6 px-2 space-y-1">
          {currentUser.permissions?.view_dashboard === true && <SidebarItem icon={Activity} label={publicSettings.app_layout === 'compact' ? "" : "Dashboard"} active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />}
          {currentUser.permissions?.view_reports === true && <SidebarItem icon={FileText} label={publicSettings.app_layout === 'compact' ? "" : "Ocorrências"} active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} />}
          {currentUser.permissions?.view_daily_reports === true && <SidebarItem icon={Calendar} label={publicSettings.app_layout === 'compact' ? "" : "Relatórios Diários"} active={activeTab === 'daily_reports'} onClick={() => setActiveTab('daily_reports')} />}
          {currentUser.permissions?.manage_users === true && <SidebarItem icon={Users} label={publicSettings.app_layout === 'compact' ? "" : "Gestão de Pessoal"} active={activeTab === 'users'} onClick={() => setActiveTab('users')} />}
          {currentUser.permissions?.manage_permissions === true && <SidebarItem icon={Lock} label={publicSettings.app_layout === 'compact' ? "" : "Permissões & Roles"} active={activeTab === 'permissions'} onClick={() => setActiveTab('permissions')} />}
          {currentUser.permissions?.manage_settings === true && <SidebarItem icon={SettingsIcon} label={publicSettings.app_layout === 'compact' ? "" : "Configurações"} active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />}
        </nav>

        <div className="p-4 mt-auto border-t border-[var(--border)]">
          <div className={cn(
            "flex items-center gap-3 p-3 rounded-xl bg-zinc-900/40 border border-zinc-800/50 group cursor-pointer hover:border-zinc-700 transition-all",
            publicSettings.app_layout === 'compact' && "justify-center p-2"
          )}>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-sm font-black text-black shadow-inner shrink-0">
              {currentUser.nome.split(' ').map(n => n[0]).join('')}
            </div>
            {publicSettings.app_layout !== 'compact' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 min-w-0">
                <p className="text-xs font-bold truncate group-hover:text-primary transition-colors">{currentUser.nome}</p>
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">{currentUser.nivel_hierarquico}</p>
              </motion.div>
            )}
            {publicSettings.app_layout !== 'compact' && (
              <button onClick={handleLogout} className="p-1 text-zinc-600 hover:text-red-400 transition-colors">
                <LogOut size={14} />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 border-b border-[var(--border)] flex items-center justify-between px-4 md:px-8 bg-[var(--bg-card)]/80 backdrop-blur-md z-10 no-print">
          <div className="flex items-center gap-4 flex-1 max-w-xl">
            <div className="relative w-full group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-primary transition-colors" size={16} />
              <input 
                type="text" 
                placeholder="Pesquisar por descrição, agente ou ID..." 
                className="w-full bg-[var(--bg-main)]/50 border border-[var(--border)] rounded-lg py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-primary/50 focus:bg-[var(--bg-main)] transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          
          <div className="flex items-center gap-2 md:gap-4">
            <button 
              onClick={handleLogout}
              className="md:hidden p-2 text-zinc-500 hover:text-red-400 transition-colors"
            >
              <LogOut size={20} />
            </button>
            
            <div className="relative">
              <button 
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className="p-2 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors relative group"
              >
                <motion.div
                  animate={isBellShaking ? {
                    rotate: [0, -20, 20, -20, 20, 0],
                    scale: [1, 1.2, 1.2, 1.2, 1.2, 1]
                  } : {}}
                  transition={{ duration: 0.5 }}
                >
                  <Bell size={20} className={cn(
                    "group-hover:rotate-12 transition-transform",
                    notifications.some(n => !n.read) && "text-primary drop-shadow-[0_0_8px_rgba(var(--primary-rgb),0.5)]"
                  )} />
                </motion.div>
                {notifications.some(n => !n.read) && (
                  <>
                    <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full border-2 border-[var(--bg-card)] z-10" />
                    <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full animate-ping opacity-75" />
                  </>
                )}
              </button>

              <AnimatePresence>
                {isNotificationsOpen && (
                  <motion.div 
                    key="notifications-backdrop"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-40" 
                    onClick={() => setIsNotificationsOpen(false)} 
                  />
                )}
                {isNotificationsOpen && (
                  <motion.div
                    key="notifications-panel"
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-80 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl shadow-2xl z-50 overflow-hidden"
                  >
                      <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
                        <h3 className="text-xs font-black uppercase tracking-widest text-[var(--text-main)]">Notificações</h3>
                        <button 
                          onClick={() => setNotifications(prev => prev.map(n => ({ ...n, read: true })))}
                          className="text-[10px] font-bold text-primary hover:underline"
                        >
                          Marcar todas como lidas
                        </button>
                      </div>
                      <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                        {notifications.length === 0 ? (
                          <div className="p-8 text-center">
                            <Bell className="mx-auto text-[var(--text-muted)] mb-2 opacity-20" size={32} />
                            <p className="text-xs text-[var(--text-muted)]">Nenhuma notificação</p>
                          </div>
                        ) : (
                          notifications.map(notif => (
                            <div 
                              key={notif.id}
                              className={cn(
                                "p-4 border-b border-[var(--border)] last:border-0 transition-colors cursor-pointer hover:bg-[var(--bg-main)]/50",
                                !notif.read && "bg-primary/5"
                              )}
                              onClick={() => {
                                setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
                                if (notif.type === 'report' && notif.reportId) {
                                  setActiveTab('reports');
                                  setSearchQuery(notif.reportId.toString());
                                  setIsNotificationsOpen(false);
                                }
                              }}
                            >
                              <div className="flex gap-3">
                                <div className={cn(
                                  "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                                  notif.type === 'report' ? "bg-blue-500/10 text-blue-500" :
                                  notif.type === 'alert' ? "bg-primary/10 text-primary" :
                                  "bg-zinc-500/10 text-zinc-500"
                                )}>
                                  {notif.type === 'report' ? <FileText size={14} /> :
                                   notif.type === 'alert' ? <AlertTriangle size={14} /> :
                                   <Activity size={14} />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <p className="text-xs font-bold text-[var(--text-main)] truncate">{notif.title}</p>
                                    {!notif.read && (
                                      <span className="px-1.5 py-0.5 bg-primary text-primary-foreground text-[8px] font-black rounded uppercase tracking-tighter">Novo</span>
                                    )}
                                  </div>
                                  <p className="text-[10px] text-[var(--text-muted)] mt-1 line-clamp-2 leading-relaxed">{notif.message}</p>
                                  <p className="text-[9px] text-zinc-600 mt-2 font-mono">
                                    {new Date(notif.timestamp).toLocaleTimeString()}
                                  </p>
                                </div>
                                {!notif.read && (
                                  <div className="w-1.5 h-1.5 bg-primary rounded-full shrink-0 mt-1" />
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                      {notifications.length > 0 && (
                        <button 
                          onClick={() => setNotifications([])}
                          className="w-full p-3 text-[10px] font-bold text-zinc-500 hover:text-[var(--text-main)] border-t border-[var(--border)] transition-colors uppercase tracking-widest"
                        >
                          Limpar tudo
                        </button>
                      )}
                    </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="h-6 w-[1px] bg-[var(--border)] mx-2" />
            {currentUser.permissions?.create_reports !== false && (
              <button 
                onClick={() => setIsNewReportModalOpen(true)}
                className="hidden md:flex items-center gap-2 bg-primary hover:opacity-90 text-primary-foreground font-black text-[10px] px-5 py-2.5 rounded-lg transition-all active:scale-95 shadow-lg shadow-primary/20 uppercase tracking-widest"
              >
                <Plus size={16} strokeWidth={3} />
                Nova Ocorrência
              </button>
            )}
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-4 md:p-8 pb-24 md:pb-8 custom-scrollbar">
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && (
              <motion.div 
                key="dashboard"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-3xl font-black tracking-tighter">CENTRAL DE COMANDO</h2>
                    <p className="text-sm text-zinc-500 mt-1">Visão geral em tempo real das operações de segurança.</p>
                  </div>
                  <div className="flex items-center gap-2 bg-zinc-900/50 p-1 rounded-lg border border-zinc-800/50">
                    <button className="px-3 py-1.5 text-[10px] font-bold bg-zinc-800 rounded-md text-zinc-100">HOJE</button>
                    <button className="px-3 py-1.5 text-[10px] font-bold text-zinc-500 hover:text-zinc-300">7 DIAS</button>
                    <button className="px-3 py-1.5 text-[10px] font-bold text-zinc-500 hover:text-zinc-300">30 DIAS</button>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card 
                    className="border-l-4 border-l-blue-500"
                    onClick={() => setActiveTab('reports')}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500"><FileText size={20} /></div>
                      <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Total</span>
                    </div>
                    <p className="text-2xl md:text-4xl font-black tracking-tighter">{stats?.totalReports || 0}</p>
                    <p className="text-[8px] md:text-[10px] text-zinc-500 font-bold uppercase mt-1 tracking-widest">Ocorrências Registradas</p>
                  </Card>
                  <Card 
                    className="border-l-4 border-l-red-500"
                    onClick={() => setActiveTab('reports')}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-2 bg-red-500/10 rounded-lg text-red-500"><AlertTriangle size={20} /></div>
                      <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Crítico</span>
                    </div>
                    <p className="text-2xl md:text-4xl font-black tracking-tighter">
                      {stats?.reportsBySeverity.find(s => s.name === 'G4')?.value || 0}
                    </p>
                    <p className="text-[8px] md:text-[10px] text-zinc-500 font-bold uppercase mt-1 tracking-widest">Alertas de Nível G4</p>
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

                {/* Interactive Map */}
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
                    
                    <div className="absolute bottom-4 right-4 bg-zinc-900/80 backdrop-blur-md border border-zinc-800 p-3 rounded-lg text-[10px] font-bold text-zinc-400 z-[1000] pointer-events-none">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                        <span>SISTEMA ATIVO</span>
                      </div>
                      <p>COORDENADAS: {Math.abs(mapCenter[0]).toFixed(4)}° {mapCenter[0] < 0 ? 'S' : 'N'}, {Math.abs(mapCenter[1]).toFixed(4)}° {mapCenter[1] > 0 ? 'E' : 'W'}</p>
                    </div>
                  </div>
                </Card>

                {/* Recent Reports List */}
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
                            <button className="sm:hidden mt-1 text-[8px] font-black text-primary uppercase tracking-widest">Mais detalhes</button>
                          </div>
                          <ChevronRight size={14} className="text-zinc-700 group-hover:text-zinc-400 transition-colors" />
                        </div>
                      ))}
                      {reports.length === 0 && (
                        <p className="text-center py-8 text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Nenhum registro recente</p>
                      )}
                      <button 
                        onClick={() => setActiveTab('reports')}
                        className="w-full py-2 text-[10px] font-black text-zinc-500 hover:text-primary uppercase tracking-widest transition-colors border-t border-zinc-800/50 mt-2"
                      >
                        Ver Todos os Registros
                      </button>
                    </div>
                  </Card>

                  <Card title="Alertas do Sistema" subtitle="Notificações críticas e avisos">
                    <div className="space-y-4 mt-4">
                      <div className="flex gap-4 p-3 rounded-xl bg-red-500/5 border border-red-500/10">
                        <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center text-red-500 shrink-0">
                          <Shield size={16} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-red-200">Protocolo de Segurança Nível 2</p>
                          <p className="text-[10px] text-red-500/70 mt-0.5">Reforço necessário no Setor de Carga Norte devido à baixa visibilidade.</p>
                        </div>
                      </div>
                      <div className="flex gap-4 p-3 rounded-xl bg-primary/5 border border-primary/10">
                        <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary shrink-0">
                          <Activity size={16} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-primary/80">Manutenção Preventiva</p>
                          <p className="text-[10px] text-primary/70 mt-0.5">Torre de comunicação TC-04 agendada para revisão em 2 horas.</p>
                        </div>
                      </div>
                      <div className="flex gap-4 p-3 rounded-xl bg-zinc-800/30 border border-zinc-800/50 opacity-50">
                        <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-500 shrink-0">
                          <Bell size={16} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-zinc-400">Troca de Turno Concluída</p>
                          <p className="text-[10px] text-zinc-600 mt-0.5">Equipe B assumiu o controle operacional às 06:00 AM.</p>
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>
              </motion.div>
            )}

            {activeTab === 'reports' && (
              <motion.div 
                key="reports"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-black tracking-tighter">LOG DE OCORRÊNCIAS</h2>
                    <p className="text-sm text-zinc-500">Histórico completo de registros operacionais.</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <select 
                      className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-primary"
                      value={filterCategory}
                      onChange={(e) => setFilterCategory(e.target.value)}
                    >
                      <option value="">Todas Categorias</option>
                      <option value="Valores">Valores</option>
                      <option value="Perímetro">Perímetro</option>
                      <option value="Safety">Safety</option>
                      <option value="Operativo">Operativo</option>
                    </select>
                    <select 
                      className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-primary"
                      value={filterSeverity}
                      onChange={(e) => setFilterSeverity(e.target.value)}
                    >
                      <option value="">Todas Gravidades</option>
                      <option value="G1">G1</option>
                      <option value="G2">G2</option>
                      <option value="G3">G3</option>
                      <option value="G4">G4</option>
                    </select>
                    <button className="p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors">
                      <Download size={16} />
                    </button>
                  </div>
                </div>

                <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-xl overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-800 bg-zinc-900/50">
                        <th className="hidden md:table-cell px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">ID</th>
                        <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Título / Descrição</th>
                        <th className="hidden lg:table-cell px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Categoria</th>
                        <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Gravidade</th>
                        <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Status</th>
                        <th className="hidden sm:table-cell px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Agente</th>
                        <th className="hidden md:table-cell px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Data/Hora</th>
                        <th className="px-6 py-4"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/50">
                      {reports.map((report) => (
                        <tr 
                          key={report.id} 
                          onClick={() => setSelectedReport(report)}
                          className="hover:bg-zinc-800/20 transition-colors group cursor-pointer"
                        >
                          <td className="hidden md:table-cell px-6 py-4 font-mono text-xs text-zinc-500">#{report.id}</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              {report.fotos_path && (
                                <div className="w-10 h-10 rounded-lg overflow-hidden border border-zinc-800 shrink-0">
                                  <img src={report.fotos_path} alt="Evidência" className="w-full h-full object-cover" />
                                </div>
                              )}
                              <div className="flex flex-col">
                                <span className="text-xs font-black text-zinc-100 uppercase tracking-tight">{report.titulo || 'Sem Título'}</span>
                                <p className="text-[11px] text-zinc-500 line-clamp-1 group-hover:line-clamp-none transition-all">{report.descricao}</p>
                                <button className="md:hidden mt-2 text-[9px] font-black text-primary uppercase tracking-widest text-left">Mais detalhes</button>
                                {report.metadata && Object.keys(report.metadata).length > 0 && (
                                  <div className="hidden sm:flex flex-wrap gap-1.5 mt-1">
                                    {Object.entries(report.metadata).map(([key, value]) => (
                                      <span key={key} className="text-[8px] font-black bg-zinc-800 text-zinc-500 px-1 py-0.5 rounded uppercase tracking-widest">
                                        {key.replace('_', ' ')}: {value as string}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="hidden lg:table-cell px-6 py-4">
                            <div className="flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                              <span className="text-xs text-zinc-400 font-bold uppercase">{report.categoria}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4"><Badge gravidade={report.gravidade} /></td>
                          <td className="px-6 py-4">
                            <div className={cn(
                              "inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border",
                              report.status === 'Concluído' 
                                ? "bg-green-500/10 text-green-400 border-green-500/20" 
                                : "bg-zinc-800 text-zinc-500 border-zinc-700"
                            )}>
                              {report.status === 'Concluído' ? <CheckCircle2 size={10} /> : <Clock size={10} />}
                              {report.status || 'Aberto'}
                            </div>
                          </td>
                          <td className="hidden sm:table-cell px-6 py-4">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-400">
                                {report.agente_nome.charAt(0)}
                              </div>
                              <span className="text-xs font-medium text-zinc-300">{report.agente_nome}</span>
                            </div>
                          </td>
                          <td className="hidden md:table-cell px-6 py-4">
                            <div className="flex flex-col">
                              <span className="text-xs text-zinc-400">{new Date(report.timestamp).toLocaleDateString()}</span>
                              <span className="text-[10px] text-zinc-600">{new Date(report.timestamp).toLocaleTimeString()}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button className="p-1.5 text-zinc-600 hover:text-white transition-colors">
                              <ChevronRight size={18} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {reports.length === 0 && (
                    <div className="py-20 text-center">
                      <Search className="mx-auto text-zinc-800 mb-4" size={48} />
                      <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">Nenhum registro encontrado</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'users' && (
              <motion.div 
                key="users"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-black tracking-tighter">GESTÃO DE PESSOAL</h2>
                    <p className="text-sm text-zinc-500">Administração de agentes e níveis de acesso.</p>
                  </div>
                  <button 
                    onClick={() => {
                      setEditingUser(null);
                      setNewUser({ nome: '', funcao: '', numero_mecanografico: '', nivel_hierarquico: 'Agente' });
                      setIsNewUserModalOpen(true);
                    }}
                    className="flex items-center gap-2 bg-zinc-100 hover:bg-white text-black font-black text-[10px] px-5 py-2.5 rounded-lg transition-all uppercase tracking-widest"
                  >
                    <Plus size={16} strokeWidth={3} />
                    Adicionar Agente
                  </button>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                  {users.map(user => (
                    <Card key={user.id} className="group hover:border-zinc-700 transition-all">
                      <div className="flex items-start justify-between mb-4">
                        <div className="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center font-black text-primary text-lg shadow-inner">
                          {user.nome.charAt(0)}
                        </div>
                        <div className="flex items-center gap-1">
                          <button 
                            onClick={() => {
                              setEditingUser(user);
                              setNewUser({ 
                                nome: user.nome, 
                                funcao: user.funcao, 
                                numero_mecanografico: user.numero_mecanografico, 
                                nivel_hierarquico: user.nivel_hierarquico 
                              });
                              setIsNewUserModalOpen(true);
                            }}
                            className="p-2 text-zinc-600 hover:text-blue-400 transition-colors"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button 
                            onClick={() => handleDeleteUser(user.id)}
                            className="p-2 text-zinc-600 hover:text-red-400 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                      <div>
                        <h3 className="font-black text-zinc-100 group-hover:text-primary transition-colors">{user.nome}</h3>
                        <p className="text-xs text-zinc-500 font-medium">{user.funcao}</p>
                        <button className="sm:hidden mt-2 text-[8px] font-black text-primary uppercase tracking-widest text-left">Mais detalhes</button>
                      </div>
                      <div className="mt-4 pt-4 border-t border-zinc-800/50 flex items-center justify-between">
                        <span className="text-[10px] font-black text-zinc-600 tracking-widest uppercase">{user.numero_mecanografico}</span>
                        <span className="text-[10px] font-black px-2 py-1 rounded bg-zinc-800 text-zinc-400 uppercase tracking-widest">
                          {user.nivel_hierarquico}
                        </span>
                      </div>
                    </Card>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === 'daily_reports' && (
              <motion.div 
                key="daily_reports"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-black tracking-tighter">RELATÓRIOS DIÁRIOS</h2>
                    <p className="text-sm text-zinc-500">Resumos consolidados para auditoria externa.</p>
                  </div>
                  <button 
                    onClick={async () => {
                      toast.loading("Gerando relatório...");
                      const res = await fetch('/api/reports/generate-now', { 
                        method: 'POST',
                        credentials: 'include'
                      });
                      const data = await res.json();
                      toast.dismiss();
                      if (data.status === 'ok') {
                        toast.success("Relatório gerado!");
                        fetchData();
                      }
                    }}
                    className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white font-black text-[10px] px-5 py-2.5 rounded-lg transition-all uppercase tracking-widest"
                  >
                    <Plus size={16} />
                    Gerar Agora
                  </button>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {dailyReports.map((report) => (
                    <Card key={report.name} className="group hover:border-primary/30 transition-all">
                      <div className="p-3 bg-zinc-800/50 rounded-lg w-fit mb-4 text-zinc-400 group-hover:text-primary transition-colors">
                        <FileText size={24} />
                      </div>
                      <h3 className="text-sm font-bold text-zinc-200 truncate">{report.name}</h3>
                      <p className="text-[10px] text-zinc-500 mt-1 flex items-center gap-1">
                        <Clock size={10} /> {report.date}
                      </p>
                      <a 
                        href={report.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="mt-4 w-full flex items-center justify-center gap-2 py-2 bg-zinc-800 hover:bg-primary hover:text-black text-zinc-300 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
                      >
                        Visualizar
                        <ChevronRight size={14} />
                      </a>
                    </Card>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === 'permissions' && (
              <motion.div 
                key="permissions"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-black tracking-tighter">PERFIS & ACESSOS</h2>
                    <p className="text-sm text-zinc-500">Configuração de privilégios e hierarquia de comando.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-8">
                  <Card title="Níveis Hierárquicos">
                    <div className="space-y-1">
                      {roles.map((role) => (
                        <button
                          key={role.nivel_hierarquico}
                          onClick={() => setSelectedRoleForPerms(role.nivel_hierarquico)}
                          className={cn(
                            "w-full flex items-center justify-between p-3 rounded-lg text-xs font-bold transition-all",
                            "hover:bg-zinc-800/50",
                            selectedRoleForPerms === role.nivel_hierarquico ? "border-l-2 border-primary bg-primary/5 text-primary" : "text-zinc-400"
                          )}
                        >
                          <span>{role.nivel_hierarquico}</span>
                          <span className="text-[10px] opacity-50">PESO {role.weight || role.peso}</span>
                        </button>
                      ))}
                    </div>
                    <div className="mt-6 p-4 bg-primary/5 border border-primary/10 rounded-lg">
                      <div className="flex gap-3">
                        <Shield size={16} className="text-primary shrink-0" />
                        <p className="text-[10px] text-zinc-400 leading-relaxed">
                          A hierarquia é baseada em <b>Peso Operacional</b>. Agentes só podem visualizar dados de subordinados com peso inferior.
                        </p>
                      </div>
                    </div>
                  </Card>

                  <div className="space-y-6">
                    <Card title={`Matriz de Permissões (${selectedRoleForPerms})`}>
                      <div className="space-y-3">
                        {[
                          { name: 'view_dashboard', label: 'Acesso ao Dashboard', desc: 'Visualização de estatísticas e gráficos.' },
                          { name: 'view_reports', label: 'Visualizar Ocorrências', desc: 'Acesso ao log de registros operacionais.' },
                          { name: 'create_reports', label: 'Registrar Ocorrências', desc: 'Permissão para enviar novos relatos.' },
                          { name: 'manage_users', label: 'Gestão de Usuários', desc: 'Permite criar, editar e remover agentes.' },
                          { name: 'manage_permissions', label: 'Gestão de Permissões', desc: 'Configuração de privilégios e roles.' },
                          { name: 'view_daily_reports', label: 'Auditoria de Logs', desc: 'Visualização de relatórios diários.' },
                          { name: 'manage_settings', label: 'Configurações de Sistema', desc: 'Acesso às chaves de integração e sistema.' },
                        ].map((p) => {
                          const isEnabled = rolePermissions.find(rp => rp.permissao_nome === p.name)?.is_enabled ?? false;
                          return (
                            <div key={p.name} className="flex items-center justify-between p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/50">
                              <div>
                                <p className="text-sm font-bold text-zinc-200">{p.label}</p>
                                <p className="text-[10px] text-zinc-500 mt-0.5">{p.desc}</p>
                              </div>
                              <button 
                                onClick={async () => {
                                  const newEnabled = !isEnabled;
                                  try {
                                    await fetch(`/api/permissions/${selectedRoleForPerms}`, {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ permissions: [{ name: p.name, enabled: newEnabled }] }),
                                      credentials: 'include'
                                    });
                                    fetchPermissions(selectedRoleForPerms);
                                    toast.success("Permissão atualizada");
                                  } catch (err) {
                                    toast.error("Erro ao atualizar permissão");
                                  }
                                }}
                                className={cn(
                                  "w-10 h-5 rounded-full relative transition-all duration-200",
                                  isEnabled ? "bg-primary" : "bg-zinc-700"
                                )}
                              >
                                <div className={cn(
                                  "absolute top-1 w-3 h-3 bg-black rounded-full transition-all duration-200",
                                  isEnabled ? "right-1" : "left-1"
                                )} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </Card>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'settings' && (
              <motion.div 
                key="settings"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                <div>
                  <h2 className="text-2xl font-black tracking-tighter">CONFIGURAÇÕES DO SISTEMA</h2>
                  <p className="text-sm text-zinc-500">Integrações e parâmetros globais de segurança.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <Card title="Integração Telegram" subtitle="Alertas automáticos para G3/G4">
                    <form onSubmit={async (e) => {
                      e.preventDefault();
                      const formData = new FormData(e.currentTarget);
                      const botToken = formData.get('telegram_bot_token') as string;
                      const chatId = formData.get('telegram_chat_id') as string;
                      
                      try {
                        await fetch('/api/settings', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            settings: [
                              { key: 'telegram_bot_token', value: botToken, description: 'Token do Bot do Telegram' },
                              { key: 'telegram_chat_id', value: chatId, description: 'ID do Chat/Grupo do Telegram' }
                            ]
                          }),
                          credentials: 'include'
                        });
                        toast.success("Configurações salvas!");
                        fetchData();
                      } catch (err) {
                        toast.error("Erro ao salvar configurações");
                      }
                    }} className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Bot Token</label>
                        <input 
                          name="telegram_bot_token"
                          type="password"
                          defaultValue={systemSettings.find(s => s.key === 'telegram_bot_token')?.value || ''}
                          placeholder="0000000000:AAH..."
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-2.5 px-4 text-sm focus:outline-none focus:border-primary"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Chat ID</label>
                        <input 
                          name="telegram_chat_id"
                          type="text"
                          defaultValue={systemSettings.find(s => s.key === 'telegram_chat_id')?.value || ''}
                          placeholder="-100..."
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-2.5 px-4 text-sm focus:outline-none focus:border-primary"
                        />
                      </div>
                      <div className="flex gap-3 pt-2">
                        <button 
                          type="button"
                          onClick={async () => {
                            const botToken = (document.getElementsByName('telegram_bot_token')[0] as HTMLInputElement).value;
                            const chatId = (document.getElementsByName('telegram_chat_id')[0] as HTMLInputElement).value;
                            if (!botToken || !chatId) return toast.error("Preencha os campos para testar");
                            
                            toast.loading("Enviando teste...");
                            const res = await fetch('/api/test-telegram', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ botToken, chatId }),
                              credentials: 'include'
                            });
                            const data = await res.json();
                            toast.dismiss();
                            if (data.status === 'ok') toast.success("Teste enviado com sucesso!");
                            else toast.error("Falha no teste: " + data.message);
                          }}
                          className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
                        >
                          Testar Conexão
                        </button>
                        <button 
                          type="submit"
                          className="flex-1 py-2.5 bg-primary hover:bg-primary/90 text-black rounded-lg text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-primary/20"
                        >
                          Salvar Alterações
                        </button>
                      </div>
                    </form>
                  </Card>

                  <Card title="Parâmetros de Auditoria" subtitle="Configurações de relatórios e logs">
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-bold text-zinc-200">Geração Automática</p>
                          <p className="text-[10px] text-zinc-500">Relatório diário às 06:00 AM.</p>
                        </div>
                        <div className="w-10 h-5 bg-primary rounded-full relative">
                          <div className="absolute right-1 top-1 w-3 h-3 bg-black rounded-full" />
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-bold text-zinc-200">Retenção de Dados</p>
                          <p className="text-[10px] text-zinc-500">Manter logs por 90 dias.</p>
                        </div>
                        <span className="text-[10px] font-black text-primary bg-primary/10 px-2 py-1 rounded">ATIVO</span>
                      </div>
                    </div>
                  </Card>

                  <Card title="Personalização da UI" subtitle="Altere a aparência global do sistema" className="lg:col-span-2">
                    <form 
                      key={publicSettings.app_name + publicSettings.app_theme_mode + publicSettings.app_theme_palette}
                      onSubmit={async (e) => {
                        e.preventDefault();
                        const formData = new FormData(e.currentTarget);
                        const settings = [
                          { key: 'app_name', value: formData.get('app_name'), description: 'Nome da Aplicação' },
                          { key: 'app_slogan', value: formData.get('app_slogan'), description: 'Slogan da Aplicação' },
                          { key: 'app_theme_mode', value: formData.get('app_theme_mode'), description: 'Modo do Tema (light/dark)' },
                          { key: 'app_theme_palette', value: formData.get('app_theme_palette'), description: 'Paleta de Cores' },
                          { key: 'app_layout', value: formData.get('app_layout'), description: 'Layout do Sistema' }
                        ];
                        
                        try {
                          await fetch('/api/settings', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ settings }),
                            credentials: 'include'
                          });
                          toast.success("Interface atualizada! Recarregando...");
                          setTimeout(() => window.location.reload(), 1500);
                        } catch (err) {
                          toast.error("Erro ao salvar personalização");
                        }
                      }} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Nome do App</label>
                          <input 
                            name="app_name"
                            type="text"
                            defaultValue={publicSettings.app_name}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-2.5 px-4 text-sm focus:outline-none focus:border-primary"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Slogan</label>
                          <input 
                            name="app_slogan"
                            type="text"
                            defaultValue={publicSettings.app_slogan}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-2.5 px-4 text-sm focus:outline-none focus:border-primary"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Modo Visual</label>
                          <select 
                            name="app_theme_mode"
                            defaultValue={publicSettings.app_theme_mode}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-2.5 px-4 text-sm focus:outline-none focus:border-primary"
                          >
                            <option value="dark">Modo Escuro (Dark)</option>
                            <option value="light">Modo Claro (Light)</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Paleta de Cores</label>
                          <select 
                            name="app_theme_palette"
                            defaultValue={publicSettings.app_theme_palette}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-2.5 px-4 text-sm focus:outline-none focus:border-primary"
                          >
                            <option value="orange">Laranja (Padrão)</option>
                            <option value="blue">Azul Corporativo</option>
                            <option value="green">Verde Operacional</option>
                            <option value="red">Vermelho Alerta</option>
                            <option value="purple">Roxo Estratégico</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Layout Base</label>
                          <select 
                            name="app_layout"
                            defaultValue={publicSettings.app_layout}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-2.5 px-4 text-sm focus:outline-none focus:border-primary"
                          >
                            <option value="default">Padrão (Sidebar)</option>
                            <option value="compact">Compacto</option>
                          </select>
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <button 
                          type="submit"
                          className="px-8 py-2.5 bg-primary hover:opacity-90 text-primary-foreground rounded-lg text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-primary/20"
                        >
                          Aplicar Nova Identidade
                        </button>
                      </div>
                    </form>
                  </Card>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Modals */}
      <AnimatePresence>
        {isNewReportModalOpen && (
          <div key="new-report-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-[#0a0a0a] border border-zinc-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl"
            >
              <form onSubmit={handleCreateReport}>
                <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/20">
                  <h3 className="text-xl font-black tracking-tighter uppercase">Registrar Ocorrência</h3>
                  <button type="button" onClick={() => setIsNewReportModalOpen(false)} className="text-zinc-500 hover:text-white transition-colors">
                    <XCircle size={24} />
                  </button>
                </div>
                <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto custom-scrollbar">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Título da Ocorrência</label>
                    <input 
                      type="text"
                      required
                      placeholder="Ex: Intrusão Setor Norte"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-2.5 px-4 text-sm focus:outline-none focus:border-primary"
                      value={newReport.titulo}
                      onChange={(e) => setNewReport({...newReport, titulo: e.target.value})}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Categoria</label>
                      <select 
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-2.5 px-4 text-sm focus:outline-none focus:border-primary"
                        value={newReport.categoria}
                        onChange={(e) => setNewReport({...newReport, categoria: e.target.value as Categoria, metadata: {}})}
                      >
                        <option value="Valores">Proteção de Valores</option>
                        <option value="Perímetro">Perímetro</option>
                        <option value="Safety">Safety (HSE)</option>
                        <option value="Operativo">Operativo</option>
                        <option value="Logística">Logística</option>
                        <option value="Manutenção">Manutenção de Planta</option>
                        <option value="Informativo">Informativo</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Gravidade</label>
                      <select 
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-2.5 px-4 text-sm focus:outline-none focus:border-primary"
                        value={newReport.gravidade}
                        onChange={(e) => setNewReport({...newReport, gravidade: e.target.value as Gravidade})}
                      >
                        <option value="G1">G1 (Baixa)</option>
                        <option value="G2">G2 (Média)</option>
                        <option value="G3">G3 (Alta)</option>
                        <option value="G4">G4 (Crítica)</option>
                      </select>
                    </div>
                  </div>

                  {/* Dynamic Fields */}
                  {newReport.categoria === 'Safety' && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="grid grid-cols-2 gap-4 p-4 bg-primary/5 border border-primary/10 rounded-xl">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-primary uppercase tracking-widest">Tipo de Risco</label>
                        <select 
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2 px-3 text-xs focus:outline-none focus:border-primary"
                          onChange={(e) => setNewReport({...newReport, metadata: {...newReport.metadata, tipo_risco: e.target.value}})}
                        >
                          <option value="">Selecionar...</option>
                          <option value="Incidente">Incidente</option>
                          <option value="Acidente">Acidente</option>
                          <option value="Condição Insegura">Condição Insegura</option>
                          <option value="Derrame">Derrame</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-primary uppercase tracking-widest">EPI em falta?</label>
                        <select 
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2 px-3 text-xs focus:outline-none focus:border-primary"
                          onChange={(e) => setNewReport({...newReport, metadata: {...newReport.metadata, epi_falta: e.target.value}})}
                        >
                          <option value="Não">Não</option>
                          <option value="Sim">Sim</option>
                        </select>
                      </div>
                    </motion.div>
                  )}

                  {newReport.categoria === 'Manutenção' && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="grid grid-cols-2 gap-4 p-4 bg-blue-500/5 border border-blue-500/10 rounded-xl">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Equipamento Afetado</label>
                        <input 
                          type="text"
                          placeholder="Ex: Torre de Iluminação"
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2 px-3 text-xs focus:outline-none focus:border-blue-500"
                          onChange={(e) => setNewReport({...newReport, metadata: {...newReport.metadata, equipamento: e.target.value}})}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Impacto</label>
                        <select 
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2 px-3 text-xs focus:outline-none focus:border-blue-500"
                          onChange={(e) => setNewReport({...newReport, metadata: {...newReport.metadata, impacto: e.target.value}})}
                        >
                          <option value="Sem Impacto">Sem Impacto</option>
                          <option value="Parada Parcial">Parada Parcial</option>
                          <option value="Parada Total">Parada Total</option>
                        </select>
                      </div>
                    </motion.div>
                  )}

                  {newReport.categoria === 'Valores' && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="grid grid-cols-2 gap-4 p-4 bg-green-500/5 border border-green-500/10 rounded-xl">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-green-500 uppercase tracking-widest">Tipo de Carga</label>
                        <select 
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2 px-3 text-xs focus:outline-none focus:border-green-500"
                          onChange={(e) => setNewReport({...newReport, metadata: {...newReport.metadata, tipo_carga: e.target.value}})}
                        >
                          <option value="Diamantes">Diamantes</option>
                          <option value="Concentrado">Concentrado</option>
                          <option value="Outros">Outros</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-green-500 uppercase tracking-widest">Código Selagem</label>
                        <input 
                          type="text"
                          placeholder="Ex: SL-9922"
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2 px-3 text-xs focus:outline-none focus:border-green-500"
                          onChange={(e) => setNewReport({...newReport, metadata: {...newReport.metadata, codigo_selagem: e.target.value}})}
                        />
                      </div>
                    </motion.div>
                  )}

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Descrição da Ocorrência</label>
                    <textarea 
                      required
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-2.5 px-4 text-sm focus:outline-none focus:border-primary min-h-[100px] resize-none"
                      placeholder="Descreva detalhadamente o que aconteceu..."
                      value={newReport.descricao}
                      onChange={(e) => setNewReport({...newReport, descricao: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Anexar Foto</label>
                    <div className="relative group">
                      <input 
                        type="file"
                        accept="image/*"
                        className="hidden"
                        id="report-photo"
                        onChange={(e) => setNewReport({...newReport, foto: e.target.files?.[0] || null})}
                      />
                      <label 
                        htmlFor="report-photo"
                        className="flex items-center justify-center gap-3 w-full bg-zinc-900 border-2 border-dashed border-zinc-800 rounded-xl py-6 cursor-pointer hover:border-primary/50 hover:bg-zinc-900/50 transition-all"
                      >
                        <Camera className="text-zinc-500 group-hover:text-primary transition-colors" size={24} />
                        <span className="text-xs font-bold text-zinc-500 group-hover:text-zinc-300">
                          {newReport.foto ? newReport.foto.name : "Clique para selecionar ou arraste uma foto"}
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
                <div className="p-6 bg-zinc-900/20 border-t border-zinc-800 flex justify-end gap-3">
                  <button type="button" onClick={() => setIsNewReportModalOpen(false)} className="px-6 py-2.5 text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-white transition-colors">Cancelar</button>
                  <button type="submit" className="bg-primary hover:bg-primary/90 text-black font-black text-[10px] px-8 py-2.5 rounded-lg transition-all uppercase tracking-widest shadow-lg shadow-primary/20">Transmitir Relatório</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {selectedReport && (
          <div key="report-details-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-[#0a0a0a] border border-zinc-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                    <FileText size={20} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black tracking-tighter uppercase">Detalhes da Ocorrência</h3>
                    <p className="text-[10px] text-zinc-500 font-bold tracking-widest uppercase">ID #{selectedReport.id} • {new Date(selectedReport.timestamp).toLocaleString()}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedReport(null)} className="text-zinc-500 hover:text-white transition-colors">
                  <XCircle size={24} />
                </button>
              </div>
              
              <div className="p-8 space-y-8 max-h-[80vh] overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div>
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-2">Título</label>
                      <p className="text-lg font-black text-white uppercase tracking-tight">{selectedReport.titulo || 'Sem Título'}</p>
                    </div>

                    <div className="flex gap-4">
                      <div>
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-2">Categoria</label>
                        <div className="flex items-center gap-2 bg-zinc-900 px-3 py-1.5 rounded-lg border border-zinc-800">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                          <span className="text-xs font-bold text-zinc-300 uppercase">{selectedReport.categoria}</span>
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-2">Gravidade</label>
                        <Badge gravidade={selectedReport.gravidade} />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-2">Status</label>
                        <div className={cn(
                          "flex items-center gap-2 px-3 py-1.5 rounded-lg border font-bold text-xs uppercase",
                          selectedReport.status === 'Concluído'
                            ? "bg-green-500/10 text-green-400 border-green-500/20"
                            : "bg-zinc-900 text-zinc-500 border-zinc-800"
                        )}>
                          {selectedReport.status === 'Concluído' ? <CheckCircle2 size={14} /> : <Clock size={14} />}
                          {selectedReport.status || 'Aberto'}
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-2">Agente Responsável</label>
                      <div className="flex items-center gap-3 bg-zinc-900 p-3 rounded-xl border border-zinc-800">
                        <div className="w-8 h-8 rounded bg-primary flex items-center justify-center text-xs font-black text-black">
                          {selectedReport.agente_nome.charAt(0)}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-zinc-200">{selectedReport.agente_nome}</p>
                          <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">{selectedReport.agente_nivel}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-2">Evidência Fotográfica</label>
                    {selectedReport.fotos_path ? (
                      <div className="aspect-video rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900 group relative">
                        <img src={selectedReport.fotos_path} alt="Evidência" className="w-full h-full object-cover" />
                        <a 
                          href={selectedReport.fotos_path} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all backdrop-blur-sm"
                        >
                          <span className="text-[10px] font-black text-white uppercase tracking-widest border border-white/20 px-4 py-2 rounded-lg">Ver em tamanho real</span>
                        </a>
                      </div>
                    ) : (
                      <div className="aspect-video rounded-xl border-2 border-dashed border-zinc-800 flex flex-col items-center justify-center text-zinc-600">
                        <Camera size={32} strokeWidth={1} />
                        <p className="text-[10px] font-bold mt-2 uppercase tracking-widest">Nenhuma foto anexada</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-2">Descrição Detalhada</label>
                    <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-xl text-sm text-zinc-300 leading-relaxed">
                      {selectedReport.descricao}
                    </div>
                  </div>

                  {selectedReport.metadata && Object.keys(selectedReport.metadata).length > 0 && (
                    <div>
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-2">Dados Adicionais (Metadata)</label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {Object.entries(selectedReport.metadata).map(([key, value]) => (
                          <div key={key} className="bg-zinc-900 border border-zinc-800 p-3 rounded-lg">
                            <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">{key.replace('_', ' ')}</p>
                            <p className="text-xs font-bold text-primary">{value as string}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="pt-4 flex items-center gap-6 border-t border-zinc-800/50">
                    <div className="flex items-center gap-2">
                      <MapPin size={14} className="text-zinc-500" />
                      <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest">
                        LAT: {selectedReport.coords_lat ? Number(selectedReport.coords_lat).toFixed(4) : 'N/A'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin size={14} className="text-zinc-500" />
                      <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest">
                        LNG: {selectedReport.coords_lng ? Number(selectedReport.coords_lng).toFixed(4) : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="p-6 bg-zinc-900/20 border-t border-zinc-800 flex justify-between items-center no-print">
                <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">Sistema de Segurança MineGuard • Auditoria Ativa</p>
                <div className="flex gap-3">
                  {(selectedReport.status !== 'Concluído' || currentUser?.permissions?.conclude_reports) && (
                    <button 
                      onClick={() => handleConcludeReport(selectedReport.id, selectedReport.status || 'Aberto')}
                      className={cn(
                        "font-black text-[10px] px-8 py-2.5 rounded-lg transition-all uppercase tracking-widest flex items-center gap-2",
                        selectedReport.status === 'Concluído'
                          ? "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                          : "bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-900/20"
                      )}
                    >
                      {selectedReport.status === 'Concluído' ? (
                        <>
                          <Clock size={14} />
                          Reabrir Relatório
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={14} />
                          Concluir Relatório
                        </>
                      )}
                    </button>
                  )}
                  <button 
                    onClick={() => window.print()}
                    className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-black text-[10px] px-8 py-2.5 rounded-lg transition-all uppercase tracking-widest flex items-center gap-2"
                  >
                    <Printer size={14} />
                    Exportar PDF
                  </button>
                  <button 
                    onClick={() => setSelectedReport(null)}
                    className="bg-zinc-100 hover:bg-white text-black font-black text-[10px] px-8 py-2.5 rounded-lg transition-all uppercase tracking-widest"
                  >
                    Fechar Detalhes
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {isNewUserModalOpen && (
          <div key="new-user-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-[#0a0a0a] border border-zinc-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl"
            >
              <form onSubmit={handleCreateUser}>
                <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/20">
                  <h3 className="text-xl font-black tracking-tighter uppercase">{editingUser ? 'Editar Agente' : 'Novo Agente'}</h3>
                  <button type="button" onClick={() => setIsNewUserModalOpen(false)} className="text-zinc-500 hover:text-white transition-colors">
                    <XCircle size={24} />
                  </button>
                </div>
                <div className="p-6 space-y-5">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Nome Completo</label>
                    <input 
                      required
                      type="text" 
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-2.5 px-4 text-sm focus:outline-none focus:border-primary"
                      placeholder="Ex: Carlos Oliveira"
                      value={newUser.nome}
                      onChange={(e) => setNewUser({...newUser, nome: e.target.value})}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Função Operacional</label>
                      <input 
                        required
                        type="text" 
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-2.5 px-4 text-sm focus:outline-none focus:border-primary"
                        placeholder="Ex: Monitor de Perímetro"
                        value={newUser.funcao}
                        onChange={(e) => setNewUser({...newUser, funcao: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Nº Mecanográfico</label>
                      <input 
                        required
                        type="text" 
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-2.5 px-4 text-sm focus:outline-none focus:border-primary"
                        placeholder="Ex: M-5022"
                        value={newUser.numero_mecanografico}
                        onChange={(e) => setNewUser({...newUser, numero_mecanografico: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Nível Hierárquico</label>
                      <select 
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-2.5 px-4 text-sm focus:outline-none focus:border-primary"
                        value={newUser.nivel_hierarquico}
                        onChange={(e) => setNewUser({...newUser, nivel_hierarquico: e.target.value as NivelHierarquico})}
                      >
                        {roles.map(r => (
                          <option key={r.nivel_hierarquico} value={r.nivel_hierarquico}>{r.nivel_hierarquico}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Senha de Acesso</label>
                      <input 
                        type="password" 
                        required={!editingUser}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-2.5 px-4 text-sm focus:outline-none focus:border-primary"
                        placeholder={editingUser ? "Deixe em branco para manter" : "Senha inicial"}
                        value={newUser.password}
                        onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                      />
                    </div>
                  </div>
                </div>
                <div className="p-6 bg-zinc-900/20 border-t border-zinc-800 flex justify-end gap-3">
                  <button type="button" onClick={() => setIsNewUserModalOpen(false)} className="px-6 py-2.5 text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-white transition-colors">Cancelar</button>
                  <button type="submit" className="bg-zinc-100 hover:bg-white text-black font-black text-[10px] px-8 py-2.5 rounded-lg transition-all uppercase tracking-widest shadow-lg shadow-white/10">Salvar Agente</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bottom Navigation (Mobile) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#080808] border-t border-zinc-900 flex items-center justify-around px-4 z-50">
        {currentUser.permissions?.view_dashboard === true && (
          <button onClick={() => setActiveTab('dashboard')} className={cn("flex flex-col items-center gap-1", activeTab === 'dashboard' ? "text-primary" : "text-zinc-500")}>
            <Activity size={20} />
            <span className="text-[8px] font-black uppercase">Dash</span>
          </button>
        )}
        {currentUser.permissions?.view_reports === true && (
          <button onClick={() => setActiveTab('reports')} className={cn("flex flex-col items-center gap-1", activeTab === 'reports' ? "text-primary" : "text-zinc-500")}>
            <FileText size={20} />
            <span className="text-[8px] font-black uppercase">Logs</span>
          </button>
        )}
        {currentUser.permissions?.create_reports === true && (
          <button onClick={() => setIsNewReportModalOpen(true)} className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-black shadow-lg shadow-primary/20 -mt-8 border-4 border-[#050505]">
            <Plus size={24} strokeWidth={3} />
          </button>
        )}
        {currentUser.permissions?.view_daily_reports === true && (
          <button onClick={() => setActiveTab('daily_reports')} className={cn("flex flex-col items-center gap-1", activeTab === 'daily_reports' ? "text-primary" : "text-zinc-500")}>
            <Calendar size={20} />
            <span className="text-[8px] font-black uppercase">Relat</span>
          </button>
        )}
        {currentUser.permissions?.manage_settings === true && (
          <button onClick={() => setActiveTab('settings')} className={cn("flex flex-col items-center gap-1", activeTab === 'settings' ? "text-primary" : "text-zinc-500")}>
            <SettingsIcon size={20} />
            <span className="text-[8px] font-black uppercase">Config</span>
          </button>
        )}
      </nav>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #18181b;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #27272a;
        }
      `}</style>
    </div>
  );
}
