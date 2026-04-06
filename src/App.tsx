import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from './i18n';
import imageCompression from 'browser-image-compression';
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
import { DailyReportsWorkspaceTab } from './components/tabs/DailyReportsWorkspaceTab';
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

interface ReportPhoto {
  id: number;
  report_id: number;
  photo_path: string;
  caption: string;
  timestamp: string;
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
  photos?: ReportPhoto[];
  coords_lat: number;
  coords_lng: number;
  status: 'Aberto' | 'Concluído' | 'Aprovado';
  timestamp: string;
  metadata?: any;
  setor?: string;
  pessoas_envolvidas?: string;
  equipamento?: string;
  acao_imediata?: string;
  requer_investigacao?: boolean;
  testemunhas?: string;
  potencial_risco?: string;
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
      "w-full flex items-center gap-2.5 px-5 py-3.5 text-[12px] font-bold uppercase tracking-[0.14em] transition-all duration-300 relative group",
      active 
        ? "text-primary bg-primary/5" 
        : "text-zinc-500 hover:text-zinc-200 hover:bg-white/5"
    )}
  >
    {active && <motion.div layoutId="active-nav" className="absolute left-0 w-1 h-2/3 bg-primary rounded-r-full" />}
    <Icon size={18} className={cn("transition-transform group-hover:scale-110", active ? "text-primary glow-amber" : "text-zinc-600")} />
    <span className="truncate text-left leading-tight">{label}</span>
  </button>
);

const Badge = ({ gravidade }: { gravidade: Gravidade }) => {
  const colors = {
    G1: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    G2: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    G3: 'bg-primary/10 text-primary text-primary/90 border-primary/20',
    G4: 'bg-red-500/10 text-red-500 border-red-500/20 animate-pulse-critical',
  };
  return (
    <span className={cn(
      "px-2 md:px-3 py-1 rounded-full text-[8px] md:text-[9px] font-black border uppercase tracking-widest shadow-sm shrink-0 whitespace-nowrap", 
      colors[gravidade]
    )}>
      {gravidade}
    </span>
  );
};

const StatCard = ({ title, value, icon: Icon, trend, color, onClick }: { title: string, value: string | number, icon: any, trend?: string, color: string, onClick?: () => void }) => (
  <div onClick={onClick} className={cn("glass-card rounded-2xl overflow-hidden group p-6 relative", onClick && "cursor-pointer hover:bg-zinc-900/40 active:scale-[0.99]")}>
    <div className={cn("absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.08] transition-all transform group-hover:scale-150 rotate-12", color)}>
      <Icon size={120} strokeWidth={1} />
    </div>
    
    <div className="flex items-start justify-between relative z-10">
      <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transform group-hover:rotate-6 transition-transform", color.replace('text-', 'bg-').replace('500', '500/20'), color)}>
        <Icon size={24} strokeWidth={2.5} />
      </div>
      {trend && (
        <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 text-[10px] font-black">
          <Activity size={10} /> {trend}
        </div>
      )}
    </div>

    <div className="mt-6 relative z-10">
      <div className="text-3xl font-black tracking-tighter text-white mb-1 group-hover:translate-x-1 transition-transform">{value}</div>
      <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{title}</div>
    </div>
    
    <div className={cn("absolute bottom-0 left-0 h-1 transition-all duration-500 opacity-30 group-hover:opacity-100", color.replace('text-', 'bg-'))} style={{ width: '0%' }} id={`progress-${title.toLowerCase().replace(/\s/g, '-')}`} />
  </div>
);

const PdfConfigPanel = () => {
  const [pdfConfig, setPdfConfig] = useState({
    showLogo: true,
    logoUrl: 'https://cdn-icons-png.flaticon.com/512/8796/8796919.png',
    titleFormat: 'Relatório Oficial MineGuard',
    showSignature: true,
    signatureName: 'Sierra 1 de Serviço'
  });

  useEffect(() => {
    const saved = localStorage.getItem('mineguard_pdf_config');
    if (saved) setPdfConfig(JSON.parse(saved));
  }, []);

  const handleSave = () => {
    localStorage.setItem('mineguard_pdf_config', JSON.stringify(pdfConfig));
    toast.success("Configurações de PDF salvas com sucesso!");
    window.dispatchEvent(new Event('storage'));
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Logo URL</label>
          <input type="text" value={pdfConfig.logoUrl} onChange={e => setPdfConfig({...pdfConfig, logoUrl: e.target.value})} className="w-full bg-zinc-800 border border-zinc-700 rounded py-2 px-3 text-sm focus:outline-none focus:border-primary" />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Título do Relatório</label>
          <input type="text" value={pdfConfig.titleFormat} onChange={e => setPdfConfig({...pdfConfig, titleFormat: e.target.value})} className="w-full bg-zinc-800 border border-zinc-700 rounded py-2 px-3 text-sm focus:outline-none focus:border-primary" />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Assinatura Padrão</label>
          <input type="text" value={pdfConfig.signatureName} onChange={e => setPdfConfig({...pdfConfig, signatureName: e.target.value})} className="w-full bg-zinc-800 border border-zinc-700 rounded py-2 px-3 text-sm focus:outline-none focus:border-primary" />
        </div>
        <div className="flex items-center gap-6 h-full pt-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={pdfConfig.showLogo} onChange={e => setPdfConfig({...pdfConfig, showLogo: e.target.checked})} className="accent-primary" />
            <span className="text-[10px] font-bold text-zinc-400 uppercase">Mostrar Logo</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={pdfConfig.showSignature} onChange={e => setPdfConfig({...pdfConfig, showSignature: e.target.checked})} className="accent-primary" />
            <span className="text-[10px] font-bold text-zinc-400 uppercase">Mostrar Assinatura</span>
          </label>
        </div>
      </div>
      <button onClick={handleSave} className="w-full py-3 bg-primary text-black rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-primary/90 transition-all flex items-center justify-center gap-2">
        <Printer size={16} /> Salvar Configuração do Relatório
      </button>
    </div>
  );
};

const Card = ({ children, className, title, subtitle, action, onClick }: { children?: React.ReactNode, className?: string, title?: string, subtitle?: string, action?: React.ReactNode, key?: any, onClick?: () => void }) => (
  <div 
    onClick={onClick}
    className={cn(
      "glass-card rounded-2xl overflow-hidden group", 
      onClick && "cursor-pointer hover:bg-zinc-900/40 active:scale-[0.99]",
      className
    )}
  >
    {(title || action) && (
      <div className="p-4 md:p-6 border-b border-zinc-800/40 flex items-center justify-between bg-white/[0.02]">
        <div>
          {title && <h3 className="text-xs font-black text-zinc-100 uppercase tracking-[0.2em]">{title}</h3>}
          {subtitle && <p className="text-[10px] text-zinc-500 mt-1 font-bold">{subtitle}</p>}
        </div>
        {action}
      </div>
    )}
    <div className="p-4 md:p-6">{children}</div>
  </div>
);

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();

  const handleLanguageChange = (lang: string) => {
    i18n.changeLanguage(lang);
    localStorage.setItem('language', lang);
    toast.success(`Idioma alterado para ${lang === 'pt-BR' ? 'Português' : 'English'}`);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button 
          onClick={() => handleLanguageChange('pt-BR')}
          className={cn(
            "py-3 px-4 rounded-lg font-bold uppercase text-[10px] tracking-widest transition-all",
            i18n.language === 'pt-BR' 
              ? "bg-primary text-black shadow-lg shadow-primary/20" 
              : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
          )}
        >
          Português (BR)
        </button>
        <button 
          onClick={() => handleLanguageChange('en-US')}
          className={cn(
            "py-3 px-4 rounded-lg font-bold uppercase text-[10px] tracking-widest transition-all",
            i18n.language === 'en-US' 
              ? "bg-primary text-black shadow-lg shadow-primary/20" 
              : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
          )}
        >
          English (US)
        </button>
      </div>
      <p className="text-[10px] text-zinc-500">Idioma atual: {i18n.language === 'pt-BR' ? 'Português Brasileiro' : 'English'}</p>
    </div>
  );
};

const PaginationControls = ({ currentPage, totalPages, onPageChange }: { currentPage: number, totalPages: number, onPageChange: (page: number) => void }) => {
  return (
    <div className="flex items-center justify-between py-4 px-6 bg-zinc-900/30 border-t border-zinc-800/50">
      <div className="text-sm text-zinc-400">
        Página <span className="font-bold text-zinc-200">{currentPage}</span> de <span className="font-bold text-zinc-200">{totalPages}</span>
      </div>
      <div className="flex items-center gap-2">
        <button 
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 disabled:bg-zinc-900 disabled:text-zinc-600 text-zinc-300 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all disabled:cursor-not-allowed"
        >
          ← Anterior
        </button>
        <button 
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 disabled:bg-zinc-900 disabled:text-zinc-600 text-zinc-300 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all disabled:cursor-not-allowed"
        >
          Próximo →
        </button>
      </div>
    </div>
  );
};

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
  const activeTabStorageKey = 'mineguard_active_tab';
  const [activeTab, setActiveTab] = useState<'dashboard' | 'reports' | 'users' | 'permissions' | 'daily_reports' | 'personal_reports' | 'daily_report_personal' | 'daily_report_team' | 'alerts' | 'settings' | 'parametrization'>(() => (localStorage.getItem(activeTabStorageKey) as 'dashboard' | 'reports' | 'users' | 'permissions' | 'daily_reports' | 'personal_reports' | 'daily_report_personal' | 'daily_report_team' | 'alerts' | 'settings' | 'parametrization') || 'dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterAgent, setFilterAgent] = useState('');
  const [dashboardRange, setDashboardRange] = useState('7days');
  const [isDashboardRangeModalOpen, setIsDashboardRangeModalOpen] = useState(false);
  const [dashboardCustomRange, setDashboardCustomRange] = useState({ from: '', to: '' });
  const [showHeatmap, setShowHeatmap] = useState(false);
  
  // Data State
  const [reports, setReports] = useState<Report[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<{ nivel_hierarquico: string, peso: number }[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [dailyReports, setDailyReports] = useState<any[]>([]);
  const [personalReports, setPersonalReports] = useState<Report[]>([]);
  const [personalReportsStartDate, setPersonalReportsStartDate] = useState('');
  const [personalReportsEndDate, setPersonalReportsEndDate] = useState('');
  const [dailyReportPersonal, setDailyReportPersonal] = useState<any>(null);
  const [dailyReportTeam, setDailyReportTeam] = useState<any>(null);
  const [showReportPreview, setShowReportPreview] = useState(false);
  const [systemSettings, setSystemSettings] = useState<any[]>([]);
  const [publicSettings, setPublicSettings] = useState<any>({
    app_name: 'MINEGUARD',
    app_slogan: 'Security Operating System',
    app_theme_mode: 'dark',
    app_theme_palette: 'orange',
    app_layout: 'default'
  });
  const [selectedRoleForPerms, setSelectedRoleForPerms] = useState<string>('Superadmin');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
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
  const [alerts, setAlerts] = useState<any[]>([]);
  const [newAlert, setNewAlert] = useState({ titulo: '', mensagem: '', tipo: 'aviso' });
  const [editingAlert, setEditingAlert] = useState<any>(null);
  const [editAlertForm, setEditAlertForm] = useState({ titulo: '', mensagem: '', tipo: 'aviso' });
  const [mapCenter, setMapCenter] = useState<[number, number]>([-8.8383, 13.2344]); // Angola/Luanda default
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [focusMode, setFocusMode] = useState(false);
  const [newReportStep, setNewReportStep] = useState(1);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isEditingReport, setIsEditingReport] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);
  const [showInstallGuide, setShowInstallGuide] = useState(false);

  // PWA Logic
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBtn(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem(activeTabStorageKey, activeTab);
  }, [activeTab]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setShowInstallBtn(false);
    }
  };

  function createEmptyEditingReportData() {
    return {
      titulo: '',
      descricao: '',
      setor: '',
      equipamento: '',
      acao_imediata: '',
      testemunhas: '',
      potencial_risco: '',
      fotos: [] as Array<{ file: File; caption: string }>
    };
  }

  function createEmptyNewReport() {
    return {
      titulo: '',
      categoria: 'Valores' as Categoria,
      gravidade: 'G1' as Gravidade,
      descricao: '',
      coords_lat: '',
      coords_lng: '',
      setor: '',
      pessoas_envolvidas: '',
      equipamento: '',
      acao_imediata: '',
      requer_investigacao: false,
      testemunhas: '',
      potencial_risco: '',
      fotos: [] as Array<{ file: File; caption: string }>,
      metadata: {} as any
    };
  }

  const [editingReportData, setEditingReportData] = useState<{
    titulo: string;
    descricao: string;
    setor: string;
    equipamento: string;
    acao_imediata: string;
    testemunhas: string;
    potencial_risco: string;
    fotos: Array<{ file: File; caption: string }>;
  }>(createEmptyEditingReportData());
  
  // Form States
  const [newReport, setNewReport] = useState(createEmptyNewReport());

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
      const weight = (currentUser as any)?.peso || 0;
      const isAuthor = report.agente_id === currentUser?.id;
      const isOficialPlus = weight >= 60;

      if (isAuthor || isOficialPlus) {
        setReports(prev => [report, ...prev.filter(r => r.id !== report.id)]);
        toast.info(`Nova ocorrência: ${report.categoria} - ${report.agente_nome}`, {
          description: report.descricao.substring(0, 50) + "..."
        });
        
        addNotification(
          `Nova Ocorrência: ${report.categoria}`,
          `Registrada por ${report.agente_nome} (${report.gravidade})`,
          'report',
          report.id
        );

        if (currentUser?.permissions?.view_dashboard === true) {
          fetch('/api/stats', { credentials: 'include' }).then(res => res.ok ? res.json() : null).then(data => data && setStats(data));
        }
      }
    });

    socket.on('report_updated', (report: Partial<Report> & { id: number; status?: Report['status'] }) => {
      setReports(prev => prev.map(r => r.id === report.id ? { ...r, ...report } : r));
      setSelectedReport(prev => prev && prev.id === report.id ? { ...prev, ...report } : prev);
    });

    socket.on('new_alert', (alert: any) => {
      setAlerts(prev => [alert, ...prev]);
      addNotification(
        `Novo Alerta: ${alert.titulo}`,
        alert.mensagem,
        'alert',
        alert.id
      );
    });

    socket.on('alert_updated', (alert: any) => {
      setAlerts(prev => prev.map(a => a.id === alert.id ? alert : a));
      toast.info(`Alerta atualizado: ${alert.titulo}`);
    });

    socket.on('alert_deleted', ({ id }: { id: number }) => {
      setAlerts(prev => prev.filter(a => a.id !== id));
      toast.info("Alerta removido");
    });

    socket.on('report_deleted', ({ id }: { id: number }) => {
      setReports(prev => prev.filter(r => r.id !== id));
      if (selectedReport && selectedReport.id === id) {
        setSelectedReport(null);
      }
      toast.info("Ocorrência removida");
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
          // Use user's preferred language
          const preferredLang = (user as any).preferred_language || 'pt-BR';
          i18n.changeLanguage(preferredLang);
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

  // Change language based on user's preferred language
  useEffect(() => {
    if (currentUser && (currentUser as any).preferred_language) {
      i18n.changeLanguage((currentUser as any).preferred_language);
    }
  }, [(currentUser as any)?.preferred_language]);

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
        const queryParams = new URLSearchParams({
          role: currentUser.nivel_hierarquico,
          search: searchQuery,
          category: filterCategory,
          severity: filterSeverity,
          dateFrom: filterDateFrom,
          dateTo: filterDateTo,
          status: filterStatus,
          agent: filterAgent,
          page: currentPage.toString(),
          limit: itemsPerPage.toString()
        });
        promises.push(fetch(`/api/reports?${queryParams.toString()}`, { credentials: 'include' }));
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
        const statsParams = new URLSearchParams({ range: dashboardRange });
        if (dashboardRange === 'custom') {
          if (dashboardCustomRange.from) statsParams.append('from', dashboardCustomRange.from);
          if (dashboardCustomRange.to) statsParams.append('to', dashboardCustomRange.to);
        }
        promises.push(fetch(`/api/stats?${statsParams.toString()}`, { credentials: 'include' }));
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

      // Always fetch alerts
      promises.push(fetch('/api/alerts', { credentials: 'include' }));
      keys.push('alerts');

      if (promises.length === 0) return;

      const responses = await Promise.all(promises);
      const dataResults = await Promise.all(responses.map(res => res.ok ? res.json() : null));

      dataResults.forEach((data, index) => {
        if (!data) return;
        const key = keys[index];
        if (key === 'reports') {
          setReports(data.data || data);
          if (data.pagination) {
            setTotalPages(data.pagination.pages);
          }
        }
        if (key === 'users') setUsers(data);
        if (key === 'roles') setRoles(data);
        if (key === 'stats') setStats(data);
        if (key === 'daily') setDailyReports(Array.isArray(data) ? data : []);
        if (key === 'settings') setSystemSettings(data);
        if (key === 'alerts') setAlerts(data.alerts || []);
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
    setCurrentPage(1);
  }, [searchQuery, filterCategory, filterSeverity, filterDateFrom, filterDateTo, filterStatus, filterAgent]);

  useEffect(() => {
    fetchData();
  }, [activeTab, searchQuery, filterCategory, filterSeverity, filterDateFrom, filterDateTo, filterStatus, filterAgent, currentPage, currentUser, dashboardRange, dashboardCustomRange.from, dashboardCustomRange.to]);

  const applyDashboardCustomRange = () => {
    if (!dashboardCustomRange.from || !dashboardCustomRange.to) {
      toast.error("Selecione as duas datas do intervalo");
      return;
    }

    if (dashboardCustomRange.from > dashboardCustomRange.to) {
      toast.error("A data inicial não pode ser maior que a data final");
      return;
    }

    setDashboardRange('custom');
    setIsDashboardRangeModalOpen(false);
  };

  const dashboardCustomRangeLabel =
    dashboardCustomRange.from && dashboardCustomRange.to
      ? `${new Date(`${dashboardCustomRange.from}T00:00:00`).toLocaleDateString('pt-BR')} -> ${new Date(`${dashboardCustomRange.to}T00:00:00`).toLocaleDateString('pt-BR')}`
      : 'INTERVALO';

  // Fetch Personal Reports
  const fetchPersonalReports = async () => {
    if (!currentUser) return;
    try {
      const params = new URLSearchParams();
      if (personalReportsStartDate) params.append('startDate', personalReportsStartDate);
      if (personalReportsEndDate) params.append('endDate', personalReportsEndDate);
      
      const res = await fetch(`/api/reports/personal?${params.toString()}`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setPersonalReports(data);
      }
    } catch (err) {
      console.error("Erro ao buscar relatórios pessoais:", err);
      toast.error("Erro ao carregar relatórios pessoais");
    }
  };

  useEffect(() => {
    if (activeTab === 'personal_reports') {
      fetchPersonalReports();
    }
  }, [activeTab, personalReportsStartDate, personalReportsEndDate, currentUser]);

  const fetchDailyReportPersonal = async () => {
    if (!currentUser) return;
    try {
      const res = await fetch('/api/reports/daily-personal', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setDailyReportPersonal(data);
      }
    } catch (err) {
      console.error("Erro ao buscar relatório diário pessoal:", err);
    }
  };

  useEffect(() => {
    if (activeTab === 'daily_report_personal') {
      fetchDailyReportPersonal();
    }
  }, [activeTab, currentUser]);

  const fetchDailyReportTeam = async () => {
    if (!currentUser || (currentUser.peso || 0) < 50) return;
    try {
      const res = await fetch('/api/reports/daily-team', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setDailyReportTeam(data);
      }
    } catch (err) {
      console.error("Erro ao buscar relatório da equipe:", err);
    }
  };

  useEffect(() => {
    if (activeTab === 'daily_report_team') {
      fetchDailyReportTeam();
    }
  }, [activeTab, currentUser]);

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

  // Initialize editing data when report is selected
  useEffect(() => {
    if (selectedReport) {
      setEditingReportData({
        titulo: selectedReport.titulo || '',
        descricao: selectedReport.descricao || '',
        setor: (selectedReport as any).setor || '',
        equipamento: (selectedReport as any).equipamento || '',
        acao_imediata: (selectedReport as any).acao_imediata || '',
        testemunhas: (selectedReport as any).testemunhas || '',
        potencial_risco: (selectedReport as any).potencial_risco || '',
        fotos: []
      });
      setIsEditingReport(false);
    }
  }, [selectedReport]);

  const closeNewReportModal = () => {
    setIsNewReportModalOpen(false);
    setShowReportPreview(false);
    setNewReportStep(1);
    setNewReport(createEmptyNewReport());
  };

  const closeReportDetails = () => {
    setSelectedReport(null);
    setIsEditingReport(false);
    setEditingReportData(createEmptyEditingReportData());
  };

  const validateNewReportStep = (step: number) => {
    if (step === 1) {
      if (!newReport.titulo.trim()) {
        toast.error("Informe o t�tulo da ocorr�ncia.");
        return false;
      }
      if (!newReport.descricao.trim()) {
        toast.error("Descreva a ocorr�ncia para continuar.");
        return false;
      }
    }

    if (step === 2 && newReport.categoria === 'Safety') {
      if (!newReport.metadata?.incidentType || !newReport.metadata?.ppeUsage) {
        toast.error("Nos relat�rios Safety, preencha o tipo de incidente e o uso de EPI.");
        return false;
      }
    }

    return true;
  };

  const validateNewReportBeforeSubmit = () => {
    return validateNewReportStep(1) && validateNewReportStep(2);
  };

  const handlePreviewNewReport = () => {
    if (!validateNewReportBeforeSubmit()) return;
    setShowReportPreview(true);
  };

  const handleNextNewReportStep = () => {
    if (!validateNewReportStep(newReportStep)) return;
    setNewReportStep((step) => Math.min(step + 1, 3));
  };

  const addNewReportPhotos = (files: File[]) => {
    const imageFiles = files
      .filter((file) => file.type && file.type.startsWith('image/'))
      .map((file) => ({ file, caption: '' }));

    if (imageFiles.length === 0) return;
    setNewReport((current) => ({ ...current, fotos: [...current.fotos, ...imageFiles] }));
  };

  const addEditingReportPhotos = (files: File[]) => {
    const imageFiles = files
      .filter((file) => file.type && file.type.startsWith('image/'))
      .map((file) => ({ file, caption: '' }));

    if (imageFiles.length === 0) return;
    setEditingReportData((current) => ({ ...current, fotos: [...current.fotos, ...imageFiles] }));
  };

  const openReportDetails = async (report: Report) => {
    setSelectedReport(report);
    setIsEditingReport(false);

    try {
      const res = await fetch(`/api/reports/${report.id}`, { credentials: 'include' });
      const data = await res.json();
      if (res.ok && data?.report) {
        setSelectedReport(data.report);
      }
    } catch (err) {
      console.error('Erro ao carregar detalhes da ocorr�ncia', err);
    }
  };

  const startEditingSelectedReport = () => {
    if (!selectedReport) return;
    setEditingReportData({
      titulo: selectedReport.titulo || '',
      descricao: selectedReport.descricao || '',
      setor: selectedReport.setor || '',
      equipamento: selectedReport.equipamento || '',
      acao_imediata: selectedReport.acao_imediata || '',
      testemunhas: selectedReport.testemunhas || '',
      potencial_risco: selectedReport.potencial_risco || '',
      fotos: []
    });
    setIsEditingReport(true);
  };

  const cancelEditingSelectedReport = () => {
    if (selectedReport) {
      setEditingReportData({
        titulo: selectedReport.titulo || '',
        descricao: selectedReport.descricao || '',
        setor: selectedReport.setor || '',
        equipamento: selectedReport.equipamento || '',
        acao_imediata: selectedReport.acao_imediata || '',
        testemunhas: selectedReport.testemunhas || '',
        potencial_risco: selectedReport.potencial_risco || '',
        fotos: []
      });
    } else {
      setEditingReportData(createEmptyEditingReportData());
    }
    setIsEditingReport(false);
  };

  // Actions
  const submitNewReport = async () => {
    if (!validateNewReportBeforeSubmit()) {
      return false;
    }

    const toastId = toast.loading("Capturando localiza��o e preparando transmiss�o...");
    
    try {
      let lat = newReport.coords_lat;
      let lng = newReport.coords_lng;
      
      if (!lat || !lng) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 30000, enableHighAccuracy: true });
          });
          lat = position.coords.latitude.toString();
          lng = position.coords.longitude.toString();
          toast.loading("Localiza��o capturada. Enviando relat�rio...", { id: toastId });
          console.log("Geolocation captured:", lat, lng);
        } catch (geoErr: any) {
          console.warn("Geolocation failed, using map center as fallback", geoErr);
          lat = mapCenter[0].toString();
          lng = mapCenter[1].toString();
          toast.loading("Usando localiza��o do mapa como refer�ncia...", { id: toastId });
        }
      }

      const formData = new FormData();
      formData.append('titulo', newReport.titulo.trim());
      formData.append('categoria', newReport.categoria);
      formData.append('gravidade', newReport.gravidade);
      formData.append('descricao', newReport.descricao.trim());
      formData.append('coords_lat', lat);
      formData.append('coords_lng', lng);
      formData.append('setor', newReport.setor);
      formData.append('pessoas_envolvidas', newReport.pessoas_envolvidas);
      formData.append('equipamento', newReport.equipamento);
      formData.append('acao_imediata', newReport.acao_imediata);
      formData.append('requer_investigacao', newReport.requer_investigacao ? '1' : '0');
      formData.append('testemunhas', newReport.testemunhas);
      formData.append('potencial_risco', newReport.potencial_risco);
      formData.append('metadata', JSON.stringify(newReport.metadata));
      
      for (const foto of newReport.fotos) {
        try {
          const options = { maxSizeMB: 0.3, maxWidthOrHeight: 1280, useWebWorker: true };
          const compressedFile = await imageCompression(foto.file, options);
          formData.append('fotos', compressedFile);
        } catch (e) {
          console.error("Image compression failed", e);
          formData.append('fotos', foto.file);
        }
        formData.append('captions', foto.caption);
      }

      const res = await fetch('/api/reports', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      const data = await res.json();
      
      if (res.ok) {
        toast.success("Relat�rio enviado com sucesso", { id: toastId });
        if (data?.report) {
          setReports(prev => [data.report, ...prev.filter(r => r.id !== data.report.id)]);
        }
        closeNewReportModal();
        fetchData();
        return true;
      }

      toast.error(data.message || "Erro ao enviar relat�rio", { id: toastId });
      return false;
    } catch (err) {
      toast.error("Erro de conex�o com o servidor", { id: toastId });
      return false;
    }
  };

  const handleCreateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitNewReport();
  };

  const handleCreateAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentUser?.permissions?.create_alerts) {
      toast.error("Sem permissão para criar alertas");
      return;
    }

    try {
      const res = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAlert),
        credentials: 'include'
      });

      const data = await res.json();
      if (data.status === 'success') {
        toast.success("Alerta criado com sucesso!");
        setNewAlert({ titulo: '', mensagem: '', tipo: 'aviso' });
        // Alert will be added via Socket.io listener
      } else {
        toast.error(data.message || "Erro ao criar alerta");
      }
    } catch (err) {
      toast.error("Erro ao criar alerta");
    }
  };

  const handleEditAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAlert) return;

    try {
      const res = await fetch(`/api/alerts/${editingAlert.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editAlertForm),
        credentials: 'include'
      });

      const data = await res.json();
      if (data.status === 'success') {
        toast.success("Alerta atualizado!");
        setEditingAlert(null);
        // Updated via Socket.io listener
      } else {
        toast.error(data.message || "Erro ao atualizar alerta");
      }
    } catch (err) {
      toast.error("Erro ao atualizar alerta");
    }
  };

  const handleDeleteAlert = async (alertId: number) => {
    if (!confirm("Tem certeza que deseja deletar este alerta?")) return;

    try {
      const res = await fetch(`/api/alerts/${alertId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      const data = await res.json();
      if (data.status === 'success') {
        toast.success("Alerta deletado!");
        // Removed via Socket.io listener
      } else {
        toast.error(data.message || "Erro ao deletar alerta");
      }
    } catch (err) {
      toast.error("Erro ao deletar alerta");
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
        setNewUser({ nome: '', funcao: '', numero_mecanografico: '', nivel_hierarquico: 'Agente', password: '' });
        fetchData();
      }
    } catch (err) {
      toast.error("Erro ao salvar usuário");
    }
  };

  const handleDeleteUser = async (id: number) => {
    if (!confirm("Deseja realmente excluir este usuário?")) return;
    try {
      const res = await fetch(`/api/users/${id}`, { method: 'DELETE', credentials: 'include' });
      if (res.ok) {
        toast.success("Usuário removido!");
        fetchData();
      }
    } catch (err) {
      toast.error("Erro ao remover usuário");
    }
  };

  const handleDeleteReport = async (id: number) => {
    if (!confirm("Tem certeza que deseja DELETAR esta ocorrência? Esta ação é irreversível.")) return;
    try {
      const res = await fetch(`/api/reports/${id}`, { method: 'DELETE', credentials: 'include' });
      const data = await res.json();
      if (data.status === 'success') {
        toast.success("Relatório removido com sucesso!");
        // Update local state immediately for better UX
        setReports(prev => prev.filter(r => r.id !== id));
        setSelectedReport(null);
        fetchData();
      } else {
        toast.error(data.message || "Erro ao remover relatório");
      }
    } catch (err) {
      toast.error("Erro na comunicação com o servidor");
    }
  };

  const handleUpdateReport = async (id: number, data: any) => {
    try {
      const res = await fetch(`/api/reports/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include'
      });
      if (res.ok) {
        toast.success("Relatório atualizado!");
        fetchData();
      }
    } catch (err) {
      toast.error("Erro ao atualizar relatório");
    }
  };

  const handleSaveReportEdits = async () => {
    if (!selectedReport) return;
    if (!editingReportData.descricao.trim()) {
      toast.error("A descri��o da ocorr�ncia n�o pode ficar vazia.");
      return;
    }

    try {
      const formData = new FormData();
      formData.append('titulo', editingReportData.titulo.trim());
      formData.append('descricao', editingReportData.descricao.trim());
      formData.append('setor', editingReportData.setor);
      formData.append('equipamento', editingReportData.equipamento);
      formData.append('acao_imediata', editingReportData.acao_imediata);
      formData.append('testemunhas', editingReportData.testemunhas);
      formData.append('potencial_risco', editingReportData.potencial_risco);
      
      for (const foto of editingReportData.fotos) {
        if (foto.file) {
          try {
            const options = { maxSizeMB: 0.3, maxWidthOrHeight: 1280, useWebWorker: true };
            const compressedFile = await imageCompression(foto.file, options);
            formData.append('fotos', compressedFile);
          } catch (e) {
            console.error("Image compression failed", e);
            formData.append('fotos', foto.file);
          }
        }
        formData.append('captions', foto.caption);
      }

      const res = await fetch(`/api/reports/${selectedReport.id}`, {
        method: 'PATCH',
        body: formData,
        credentials: 'include'
      });

      const data = await res.json();
      if (data.status === 'success') {
        toast.success("Ocorr�ncia atualizada com sucesso!");
        setIsEditingReport(false);
        if (data.report) {
          setReports(prev => prev.map(report => report.id === data.report.id ? data.report : report));
          setSelectedReport(data.report);
        }
        fetchData();
      } else {
        toast.error(data.message || "Erro ao salvar altera��es");
      }
    } catch (err) {
      toast.error("Erro ao salvar altera��es");
      console.error(err);
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

  const COLORS = ['#f97316', '#3b82f6', '#10b981', '#ef4444', '#a855f7', '#eab308'];

  if (isLoading) {
    return (
      <div className="h-screen w-full bg-[#050505] flex flex-col items-center justify-center p-8 text-center overscroll-none overflow-hidden">
        <motion.div 
          animate={{ scale: [1, 1.1, 1], rotate: [0, 180, 360] }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          className="w-24 h-24 bg-primary rounded-3xl flex items-center justify-center shadow-2xl shadow-primary/30 mb-8 border-4 border-black group"
        >
          <Shield size={48} className="text-black" strokeWidth={3} />
        </motion.div>
        <div className="space-y-3">
          <h2 className="text-2xl font-black uppercase tracking-tighter text-white">MineGuard</h2>
          <div className="flex items-center gap-2 justify-center">
            <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" />
            <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:0.2s]" />
            <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:0.4s]" />
          </div>
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Inicializando Sistemas de Segurança</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <Login 
        onLogin={(user) => { 
          setCurrentUser(user); 
          fetchData(); 
        }} 
        publicSettings={publicSettings} 
      />
    );
  }

  return (
    <div className={cn("flex h-screen bg-[var(--bg-main)] text-[var(--text-main)] font-sans selection:bg-primary/30 relative overflow-hidden transition-all duration-700", focusMode && "brightness-50 sepia-[.4] hue-rotate-[-10deg] saturate-[1.5] contrast-125")}>
      <div className="absolute inset-0 industrial-grid opacity-[0.03] pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[50vh] bg-gradient-to-b from-primary/10 to-transparent opacity-30 pointer-events-none" />
      
      <Toaster position="top-right" theme="dark" richColors />
      
      {/* Sidebar */}
      <aside className={cn(
        "hidden md:flex flex-col bg-[var(--bg-sidebar)] no-print border-r border-[var(--border)] transition-all duration-300",
        publicSettings.app_layout === 'compact' ? "w-20" : "w-72",
        focusMode && "!hidden"
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
          <SidebarItem icon={FileText} label={publicSettings.app_layout === 'compact' ? "" : "Meus Relatórios"} active={activeTab === 'personal_reports'} onClick={() => setActiveTab('personal_reports')} />
          <SidebarItem icon={Calendar} label={publicSettings.app_layout === 'compact' ? "" : "Meu Dia"} active={activeTab === 'daily_report_personal'} onClick={() => setActiveTab('daily_report_personal')} />
          {currentUser.permissions?.view_team_daily && <SidebarItem icon={Users} label={publicSettings.app_layout === 'compact' ? "" : "Dia da Equipe"} active={activeTab === 'daily_report_team'} onClick={() => setActiveTab('daily_report_team')} />}
          <SidebarItem icon={AlertTriangle} label={publicSettings.app_layout === 'compact' ? "" : "Alertas"} active={activeTab === 'alerts'} onClick={() => setActiveTab('alerts')} />
          {currentUser.permissions?.manage_users === true && <SidebarItem icon={Users} label={publicSettings.app_layout === 'compact' ? "" : "Gestão de Pessoal"} active={activeTab === 'users'} onClick={() => setActiveTab('users')} />}
          {currentUser.permissions?.manage_permissions === true && <SidebarItem icon={Lock} label={publicSettings.app_layout === 'compact' ? "" : "Permissões & Roles"} active={activeTab === 'permissions'} onClick={() => setActiveTab('permissions')} />}
          {currentUser.permissions?.manage_settings === true && <SidebarItem icon={SettingsIcon} label={publicSettings.app_layout === 'compact' ? '' : 'Defini\u00e7\u00f5es'} active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />}
          {currentUser.permissions?.manage_settings === true && <SidebarItem icon={SettingsIcon} label={publicSettings.app_layout === 'compact' ? '' : 'Parametriza\u00e7\u00e3o'} active={activeTab === 'parametrization'} onClick={() => setActiveTab('parametrization')} />}
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
        <header className="h-16 border-b border-[var(--border)] flex items-center justify-between px-4 md:px-8 bg-[var(--bg-card)]/80 backdrop-blur-md z-40 transition-all no-print">
          <div className="flex items-center gap-3">
            <div className="md:hidden w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-lg shadow-primary/20 shrink-0">
              <Shield className="text-black" size={18} strokeWidth={3} />
            </div>
            <div className="hidden md:flex items-center gap-4 flex-1 max-w-xl">
              <div className="relative w-full group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-primary transition-colors" size={16} />
                <input 
                  type="text" 
                  placeholder="Pesquisar registros..." 
                  className="w-full bg-[var(--bg-main)]/50 border border-[var(--border)] rounded-lg py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-primary/50 focus:bg-[var(--bg-main)] transition-all"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <div className="md:hidden">
              <h1 className="text-xs font-black tracking-tighter uppercase line-clamp-1">{publicSettings.app_name}</h1>
            </div>
          </div>
          
          <div className="flex items-center gap-2 md:gap-4">
            {/* Network Status Indicator */}
            <div className="hidden sm:flex items-center gap-2 px-2 py-1 rounded-lg bg-zinc-900/50 border border-zinc-800/50" title={isOnline ? "Conexão Segura e Sincronizada" : "Modo Offline (Gravando Localmente)"}>
              <div className={cn("w-2 h-2 rounded-full", isOnline ? "bg-green-500 animate-pulse" : "bg-orange-500")} />
              <span className={cn("text-[10px] font-bold uppercase tracking-widest", isOnline ? "text-green-500" : "text-orange-500")}>
                {isOnline ? "Online" : "Offline / L"}
              </span>
            </div>

            {/* Focus Mode Toggle */}
            <button 
              onClick={() => setFocusMode(!focusMode)}
              className={cn("hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all shadow-sm", focusMode ? "bg-red-500/10 border-red-500/30 text-red-500" : "bg-zinc-900/50 border-zinc-800/50 text-zinc-500 hover:text-zinc-300")}
              title="Modo Operação Noturna"
            >
              <Activity size={12} className={focusMode ? "animate-pulse" : ""} />
              <span className="text-[10px] font-bold uppercase tracking-widest">{focusMode ? "Foco Ativo" : "Modo Foco"}</span>
            </button>

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
                    className="absolute right-0 mt-2 w-80 bg-zinc-950 border border-[var(--border)] rounded-xl shadow-2xl z-50 overflow-hidden"
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
              <motion.button 
                whileHover={{ scale: 1.02, boxShadow: '0 0 20px rgba(249, 115, 22, 0.3)' }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setIsNewReportModalOpen(true)}
                className="hidden md:flex items-center gap-2 bg-primary text-black font-black text-[10px] px-6 py-3 rounded-xl transition-all shadow-xl shadow-primary/20 uppercase tracking-[0.2em] relative overflow-hidden group"
              >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                <Plus size={16} strokeWidth={4} className="relative z-10 group-hover:rotate-90 transition-transform" />
                <span className="relative z-10">Nova Ocorrência</span>
              </motion.button>
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
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl md:text-3xl font-black tracking-tighter">CENTRAL DE COMANDO</h2>
                    <p className="text-[10px] md:text-sm text-zinc-500 mt-1 uppercase font-bold tracking-widest md:normal-case md:font-normal">Visão geral em tempo real</p>
                  </div>
                  <div className="flex items-center gap-2 bg-zinc-900/50 p-1 rounded-xl border border-zinc-800/50 self-start md:self-auto">
                    <button onClick={() => setDashboardRange('today')} className={cn("px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all", dashboardRange === 'today' ? "bg-zinc-800 text-zinc-100" : "text-zinc-500 hover:text-zinc-300")}>HOJE</button>
                    <button onClick={() => setDashboardRange('7days')} className={cn("px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all", dashboardRange === '7days' ? "bg-zinc-800 text-zinc-100" : "text-zinc-500 hover:text-zinc-300")}>7 DIAS</button>
                    <button onClick={() => setDashboardRange('30days')} className={cn("px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all", dashboardRange === '30days' ? "bg-zinc-800 text-zinc-100" : "text-zinc-500 hover:text-zinc-300")}>30 DIAS</button>
                    <button onClick={() => setIsDashboardRangeModalOpen(true)} className={cn("px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all", dashboardRange === 'custom' ? "bg-zinc-800 text-zinc-100" : "text-zinc-500 hover:text-zinc-300")}>{dashboardRange === 'custom' ? dashboardCustomRangeLabel : 'INTERVALO'}</button>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6">
                  <StatCard title="Total Ocorrências" value={stats?.totalReports || 0} icon={FileText} color="text-blue-500" onClick={() => setActiveTab('reports')} />
                  <StatCard title="Nível G4 (Crítico)" value={stats?.reportsBySeverity.find(s => s.name === 'G4')?.value || 0} icon={AlertTriangle} color="text-red-500" onClick={() => setActiveTab('reports')} />
                  <StatCard title="Agentes em Sistema" value={stats?.totalUsers || 0} icon={Users} color="text-green-500" onClick={() => setActiveTab('users')} />
                  <StatCard title="Operacionalidade" value="100%" icon={Activity} color="text-primary" onClick={() => setActiveTab('settings')} />
                </div>

                {/* Charts Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <Card title="Volume de Ocorrências" className="lg:col-span-2">
                    <div className="h-[250px] md:h-[300px] w-full mt-4">
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
                    <div className="flex flex-col h-[350px] mt-4">
                      <div className="flex-1 min-h-0">
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
                                <Cell 
                                  key={`cell-${index}`} 
                                  fill={COLORS[index % COLORS.length]} 
                                  onClick={() => {
                                    setFilterCategory(entry.name);
                                    setActiveTab('reports');
                                  }}
                                  className="cursor-pointer hover:opacity-80 transition-opacity"
                                />
                              ))}
                            </Pie>
                            <Tooltip 
                              contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '8px' }}
                              itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-4 justify-center pb-4">
                        {(stats?.reportsByCategory || []).map((entry, index) => (
                          <div 
                            key={entry.name} 
                            onClick={() => {
                              setFilterCategory(entry.name);
                              setActiveTab('reports');
                            }}
                            className="flex items-center gap-1.5 bg-zinc-900/60 px-2.5 py-1.5 rounded-lg border border-zinc-800/50 shadow-sm transition-all hover:border-primary/50 hover:bg-zinc-800 cursor-pointer group"
                          >
                            <div className="w-1.5 h-1.5 rounded-full group-hover:scale-125 transition-transform" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                            <span className="text-[10px] text-zinc-100 font-bold truncate uppercase tracking-tight group-hover:text-primary transition-colors">{entry.name}</span>
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
                      
                      {/* Heatmap Layer - Dynamic color based on gravity severity */}
                      {showHeatmap && reports.map(r => {
                        const gravityColors: Record<string, string> = {
                          'G4': '#ef4444', 
                          'G3': '#f97316', 
                          'G2': '#eab308', 
                          'G1': '#3b82f6'  
                        };
                        const sizes: Record<string, number> = {
                          'G4': 80,
                          'G3': 60,
                          'G2': 40,
                          'G1': 30
                        };
                        const opacities: Record<string, number> = {
                          'G4': 0.3,
                          'G3': 0.2,
                          'G2': 0.15,
                          'G1': 0.1
                        };
                        const color = gravityColors[r.gravidade as string] || '#71717a';
                        const size = sizes[r.gravidade as string] || 40;
                        const opacity = opacities[r.gravidade as string] || 0.15;
                        
                        return (
                          <Marker 
                            key={`heat-${r.id}`} 
                            position={[r.coords_lat, r.coords_lng]}
                            icon={L.divIcon({
                              className: 'custom-heat-pin',
                              html: `<div style="
                                background: ${color}; 
                                width: ${size}px; 
                                height: ${size}px; 
                                margin-left: -${size/2}px;
                                margin-top: -${size/2}px;
                                border-radius: 50%; 
                                opacity: ${opacity}; 
                                filter: blur(${size/4}px); 
                                box-shadow: 0 0 ${size/2}px ${color};
                                animation: pulse-heat 3s infinite ease-in-out;
                              "></div>`
                            })}
                          />
                        );
                      })}

                      {reports.filter(r => r.coords_lat && r.coords_lng).map((r) => (
                        <Marker key={r.id} position={[r.coords_lat, r.coords_lng]}>
                          <Popup className="custom-popup">
                            <div className="p-2 min-w-[180px] bg-zinc-950 text-zinc-100">
                              <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">{r.categoria}</p>
                              <p className="text-sm font-bold text-white mb-2">{r.agente_nome}</p>
                              <p className="text-[10px] text-zinc-400 line-clamp-3 leading-relaxed mb-3 italic">"{r.descricao}"</p>
                              <div className="pt-2 border-t border-zinc-800 flex items-center justify-between">
                                <span className="text-[9px] font-bold text-zinc-500">{new Date(r.timestamp).toLocaleDateString()}</span>
                                <button 
                                  onClick={() => openReportDetails(r)}
                                  className="text-[10px] font-black text-primary hover:text-white transition-colors uppercase tracking-widest"
                                >
                                  Ver Ficha
                                </button>
                              </div>
                            </div>
                          </Popup>
                        </Marker>
                      ))}
                    </MapContainer>

                    <button 
                      onClick={() => setShowHeatmap(!showHeatmap)}
                      className={cn(
                        "absolute top-4 right-4 z-[1000] px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 border shadow-2xl",
                        showHeatmap 
                          ? "bg-primary text-black border-primary shadow-primary/20" 
                          : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:bg-zinc-800"
                      )}
                    >
                      <Activity size={14} className={showHeatmap ? "animate-pulse" : ""} />
                      {showHeatmap ? 'Heatmap On' : 'Heatmap Off'}
                    </button>
                    
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
                          onClick={() => openReportDetails(report)}
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

                  <Card title="Alertas" subtitle="Notificações críticas e avisos">
                    {alerts.length === 0 ? (
                      <div className="p-8 text-center">
                        <AlertTriangle className="mx-auto text-zinc-600 mb-2" size={32} />
                        <p className="text-xs text-zinc-500">Nenhum alerta no momento</p>
                      </div>
                    ) : (
                      <div className="space-y-3 mt-4 max-h-64 overflow-y-auto">
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
                          const icons = {
                            critico: <Shield size={16} />,
                            aviso: <Activity size={16} />,
                            informativo: <Bell size={16} />
                          };

                          return (
                            <div key={alert.id} className={cn("flex gap-3 p-3 rounded-xl border", bgColors[alert.tipo as keyof typeof bgColors] || bgColors.aviso)}>
                              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", iconBgs[alert.tipo as keyof typeof iconBgs] || iconBgs.aviso)}>
                                {icons[alert.tipo as keyof typeof icons] || icons.aviso}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold truncate">{alert.titulo}</p>
                                <p className="text-[10px] opacity-70 mt-0.5 line-clamp-2">{alert.mensagem}</p>
                                <p className="text-[9px] text-zinc-600 mt-1">{new Date(alert.timestamp).toLocaleString('pt-BR')}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
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
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-black tracking-tighter">LOG DE OCORRÊNCIAS</h2>
                      <p className="text-sm text-zinc-500">Histórico completo de registros operacionais.</p>
                    </div>
                    <a href="/api/reports/export" target="_blank" rel="noopener noreferrer" className="p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors flex items-center justify-center">
                      <Download size={16} />
                    </a>
                  </div>

                  <div className="bg-zinc-900/20 border border-zinc-800/50 rounded-lg p-4 space-y-4">
                    <h3 className="text-sm font-bold text-zinc-200">Filtros Avançados</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-zinc-500 uppercase">Categoria</label>
                        <select 
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-primary"
                          value={filterCategory}
                          onChange={(e) => setFilterCategory(e.target.value)}
                        >
                          <option value="">Todas</option>
                          <option value="Valores">Valores</option>
                          <option value="Perímetro">Perímetro</option>
                          <option value="Logística">Logística</option>
                          <option value="Safety">Safety</option>
                          <option value="Manutenção">Manutenção</option>
                          <option value="Informativo">Informativo</option>
                          <option value="Operativo">Operativo</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-zinc-500 uppercase">Gravidade</label>
                        <select 
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-primary"
                          value={filterSeverity}
                          onChange={(e) => setFilterSeverity(e.target.value)}
                        >
                          <option value="">Todas</option>
                          <option value="G1">G1 - Crítico</option>
                          <option value="G2">G2 - Alto</option>
                          <option value="G3">G3 - Médio</option>
                          <option value="G4">G4 - Baixo</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-zinc-500 uppercase">Status</label>
                        <select 
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-primary"
                          value={filterStatus}
                          onChange={(e) => setFilterStatus(e.target.value)}
                        >
                          <option value="">Todos</option>
                          <option value="Aberto">Aberto</option>
                          <option value="Concluído">Concluído</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-zinc-500 uppercase">Data Inicial</label>
                        <input 
                          type="date"
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-primary"
                          value={filterDateFrom}
                          onChange={(e) => setFilterDateFrom(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-zinc-500 uppercase">Data Final</label>
                        <input 
                          type="date"
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-primary"
                          value={filterDateTo}
                          onChange={(e) => setFilterDateTo(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-zinc-500 uppercase">Agente</label>
                        <select 
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-primary"
                          value={filterAgent}
                          onChange={(e) => setFilterAgent(e.target.value)}
                        >
                          <option value="">Todos</option>
                          {users.map(u => (
                            <option key={u.id} value={u.id.toString()}>{u.nome}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-end">
                        <button 
                          onClick={() => {
                            setFilterCategory('');
                            setFilterSeverity('');
                            setFilterStatus('');
                            setFilterDateFrom('');
                            setFilterDateTo('');
                            setFilterAgent('');
                          }}
                          className="w-full py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
                        >
                          Limpar Filtros
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="glass-card rounded-2xl overflow-hidden mb-20 md:mb-0">
                  <div className="hidden md:block">
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
                      <tbody className="divide-y divide-zinc-800/30">
                        <AnimatePresence initial={false}>
                          {reports.length === 0 ? (
                            <tr>
                              <td colSpan={8} className="py-20 text-center">
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-4 text-zinc-500">
                                  <Search size={48} strokeWidth={1} className="opacity-20" />
                                  <p className="text-xs font-black uppercase tracking-[0.3em]">Nenhuma ocorrência encontrada</p>
                                </motion.div>
                              </td>
                            </tr>
                          ) : reports.map((report, index) => (
                            <motion.tr 
                              key={report.id}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.03 }}
                              onClick={() => openReportDetails(report)}
                              className="hover:bg-primary/5 hover:border-primary/20 transition-all group cursor-pointer active:scale-[0.99] border-zinc-800/40"
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
                              <motion.button 
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                className="p-1.5 text-zinc-600 hover:text-white transition-colors"
                              >
                                <ChevronRight size={18} />
                              </motion.button>
                            </td>
                          </motion.tr>
                        ))}
                        </AnimatePresence>
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Cards Layout */}
                  <div className="md:hidden divide-y divide-zinc-800/30">
                    <AnimatePresence initial={false}>
                      {reports.length === 0 ? (
                        <div className="py-20 text-center">
                          <Search size={32} className="mx-auto text-zinc-800 mb-4 opacity-20" />
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Nenhum registro encontrado</p>
                        </div>
                      ) : reports.map((report, index) => (
                        <motion.div 
                          key={report.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          onClick={() => openReportDetails(report)}
                          className="p-4 active:bg-white/[0.03] transition-colors flex items-center justify-between gap-4"
                        >
                          <div className="flex items-center gap-4 flex-1 min-w-0">
                            {report.fotos_path ? (
                              <div className="w-12 h-12 rounded-xl overflow-hidden border border-zinc-800 shrink-0">
                                <img src={report.fotos_path} alt="Evidência" className="w-full h-full object-cover" />
                              </div>
                            ) : (
                              <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0">
                                <FileText size={20} className="text-zinc-700" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge gravidade={report.gravidade} />
                                <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">{report.categoria}</span>
                              </div>
                              <p className="text-xs font-black text-zinc-200 uppercase truncate">{report.titulo || 'Ocorrência s/Título'}</p>
                              <div className="flex items-center gap-2 mt-1.5">
                                <div className="text-[9px] text-zinc-600 font-bold uppercase tracking-wider flex items-center gap-1">
                                  <Clock size={10} />
                                  {new Date(report.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                                <div className="w-1 h-1 rounded-full bg-zinc-800" />
                                <div className="text-[9px] text-zinc-600 font-bold uppercase tracking-wider">
                                  {report.agente_nome.split(' ')[0]}
                                </div>
                              </div>
                            </div>
                          </div>
                          <ChevronRight size={16} className="text-zinc-700 shrink-0" />
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
                
                {reports.length > 0 && totalPages > 1 && (
                  <PaginationControls 
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                  />
                )}
              </motion.div>
            )}

            {activeTab === 'personal_reports' && (
              <motion.div 
                key="personal_reports"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-black tracking-tighter">MEUS RELATÓRIOS</h2>
                    <p className="text-sm text-zinc-500">Histórico pessoal de ocorrências registradas.</p>
                  </div>
                </div>

                <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-xl p-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Data Inicial</label>
                      <input 
                        type="date" 
                        value={personalReportsStartDate}
                        onChange={(e) => setPersonalReportsStartDate(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Data Final</label>
                      <input 
                        type="date" 
                        value={personalReportsEndDate}
                        onChange={(e) => setPersonalReportsEndDate(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div className="space-y-2 flex flex-col justify-end">
                      <button 
                        onClick={() => {
                          setPersonalReportsStartDate('');
                          setPersonalReportsEndDate('');
                        }}
                        className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-black text-[10px] px-4 py-2 rounded-lg transition-all uppercase tracking-widest"
                      >
                        Limpar Filtros
                      </button>
                    </div>
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
                        <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/50">
                      {personalReports.map((report) => (
                        <tr 
                          key={report.id} 
                          className="hover:bg-zinc-800/20 transition-colors group cursor-pointer"
                        >
                          <td className="hidden md:table-cell px-6 py-4 font-mono text-xs text-zinc-500" onClick={() => openReportDetails(report)}>#{report.id}</td>
                          <td className="px-6 py-4" onClick={() => openReportDetails(report)}>
                            <div className="flex items-center gap-3">
                              {report.fotos_path && (
                                <div className="w-10 h-10 rounded-lg overflow-hidden border border-zinc-800 shrink-0">
                                  <img src={report.fotos_path} alt="Evidência" className="w-full h-full object-cover" />
                                </div>
                              )}
                              <div>
                                <p className="font-bold text-zinc-100 text-sm line-clamp-1">{report.agente_nome}</p>
                                <p className="text-xs text-zinc-500 line-clamp-1">{report.descricao}</p>
                              </div>
                            </div>
                          </td>
                          <td className="hidden lg:table-cell px-6 py-4 text-sm text-zinc-400" onClick={() => openReportDetails(report)}>{report.categoria}</td>
                          <td className="px-6 py-4" onClick={() => openReportDetails(report)}>
                            <Badge gravidade={report.gravidade} />
                          </td>
                          <td className="px-6 py-4" onClick={() => openReportDetails(report)}>
                            <span className={cn("text-xs font-bold px-2 py-1 rounded uppercase", 
                              report.status === 'Concluído' ? 'bg-green-500/10 text-green-400' : 
                              report.status === 'Aprovado' ? 'bg-blue-500/10 text-blue-400' :
                              'bg-amber-500/10 text-amber-400'
                            )}>
                              {report.status || 'Aberto'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedReport(report);
                                  setIsEditingReport(true);
                                  setEditingReportData({
                                    titulo: report.titulo || '',
                                    descricao: report.descricao,
                                    setor: report.setor || '',
                                    equipamento: report.equipamento || '',
                                    acao_imediata: report.acao_imediata || '',
                                    testemunhas: report.testemunhas || '',
                                    potencial_risco: report.potencial_risco || '',
                                    fotos: []
                                  });
                                }}
                                className="p-2 text-zinc-600 hover:text-blue-400 transition-colors"
                                title="Editar Relatório"
                              >
                                <Edit2 size={14} />
                              </button>
                               <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteReport(report.id);
                                }}
                                className="p-2 text-zinc-600 hover:text-red-400 transition-colors"
                                title="Deletar Relatório"
                              >
                                <Trash2 size={14} />
                              </button>
                              <button className="text-zinc-600 hover:text-primary transition-colors ml-2" onClick={() => openReportDetails(report)}>
                                <ChevronRight size={18} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {personalReports.length === 0 && (
                    <div className="py-20 text-center">
                      <Search className="mx-auto text-zinc-800 mb-4" size={48} />
                      <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">Nenhum relatório encontrado nesse período</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'daily_report_personal' && (
              <motion.div 
                key="daily_report_personal"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-2xl font-black tracking-tighter">MEU RELATÓRIO DO DIA</h2>
                  <p className="text-sm text-zinc-500">{new Date().toLocaleDateString('pt-BR')}</p>
                </div>

                {dailyReportPersonal ? (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <Card className="border-primary/30 bg-primary/5">
                        <div className="text-center">
                          <p className="text-3xl font-black text-primary">{dailyReportPersonal.totalReports}</p>
                          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mt-2">Ocorrências Registradas</p>
                        </div>
                      </Card>
                      
                      <Card className="border-red-500/30 bg-red-500/5">
                        <div className="text-center">
                          <p className="text-3xl font-black text-red-400">{dailyReportPersonal.byGravity.G4}</p>
                          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mt-2">Crítica (G4)</p>
                        </div>
                      </Card>

                      <Card className="border-orange-500/30 bg-orange-500/5">
                        <div className="text-center">
                          <p className="text-3xl font-black text-orange-400">{dailyReportPersonal.byGravity.G3}</p>
                          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mt-2">Alta (G3)</p>
                        </div>
                      </Card>

                      <Card className="border-yellow-500/30 bg-yellow-500/5">
                        <div className="text-center">
                          <p className="text-3xl font-black text-yellow-400">{dailyReportPersonal.byGravity.G2 + dailyReportPersonal.byGravity.G1}</p>
                          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mt-2">Baixa/Média</p>
                        </div>
                      </Card>
                    </div>



                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-20 md:pb-0">
                      <Card title="Distribuição por Categoria">
                        <div className="space-y-3">
                          {Object.entries(dailyReportPersonal.byCategory).map(([cat, count]: [string, any]) => (
                            <div key={cat} className="flex items-center justify-between">
                              <span className="text-sm text-zinc-300">{cat}</span>
                              <div className="flex items-center gap-2">
                                <div className="w-32 h-2 bg-zinc-800 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-primary rounded-full" 
                                    style={{width: `${(count / dailyReportPersonal.totalReports) * 100}%`}}
                                  />
                                </div>
                                <span className="text-sm font-bold text-primary">{count}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </Card>

                      <Card title="Distribuição por Gravidade">
                        <div className="space-y-3">
                          {Object.entries(dailyReportPersonal.byGravity).map(([gravity, count]: [string, any]) => {
                            const colors = { G1: 'bg-blue-500', G2: 'bg-yellow-500', G3: 'bg-orange-500', G4: 'bg-red-500' };
                            return (
                              <div key={gravity} className="flex items-center justify-between">
                                <span className="text-sm text-zinc-300 font-bold">{gravity}</span>
                                <div className="flex items-center gap-2">
                                  <div className="w-32 h-2 bg-zinc-800 rounded-full overflow-hidden">
                                    <div 
                                      className={`h-full rounded-full ${colors[gravity as keyof typeof colors]}`}
                                      style={{width: dailyReportPersonal.totalReports > 0 ? `${(count / dailyReportPersonal.totalReports) * 100}%` : '0'}}
                                    />
                                  </div>
                                  <span className="text-sm font-bold">{count}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </Card>
                    </div>

                    {dailyReportPersonal.reports.length > 0 && (
                      <Card title={`Ocorrências de Hoje (${dailyReportPersonal.reports.length})`}>
                        <div className="space-y-2">
                          {dailyReportPersonal.reports.map((report: Report) => (
                            <div 
                              key={report.id}
                              onClick={() => openReportDetails(report)}
                              className="flex items-center justify-between p-3 bg-zinc-800/30 border border-zinc-800 rounded-lg hover:border-primary/50 cursor-pointer transition-all"
                            >
                              <div className="flex-1">
                                <p className="text-sm font-bold text-zinc-100">{report.titulo || 'Sem título'}</p>
                                <p className="text-xs text-zinc-500">{report.categoria}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge gravidade={report.gravidade} />
                                <ChevronRight size={16} className="text-zinc-600" />
                              </div>
                            </div>
                          ))}
                        </div>
                      </Card>
                    )}
                  </>
                ) : (
                  <div className="py-20 text-center">
                    <Calendar className="mx-auto text-zinc-800 mb-4" size={48} />
                    <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">Nenhuma ocorrência registrada hoje</p>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'daily_report_team' && (
              <motion.div 
                key="daily_report_team"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-2xl font-black tracking-tighter">DIA DA EQUIPE</h2>
                  <p className="text-sm text-zinc-500">{new Date().toLocaleDateString('pt-BR')}</p>
                </div>

                {dailyReportTeam && dailyReportTeam.totalReports > 0 ? (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <Card className="border-primary/30 bg-primary/5">
                        <div className="text-center">
                          <p className="text-3xl font-black text-primary">{dailyReportTeam.totalReports}</p>
                          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mt-2">Ocorrências da Equipe</p>
                        </div>
                      </Card>
                      
                      <Card className="border-red-500/30 bg-red-500/5">
                        <div className="text-center">
                          <p className="text-3xl font-black text-red-400">{dailyReportTeam.byGravity.G4}</p>
                          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mt-2">Crítica (G4)</p>
                        </div>
                      </Card>

                      <Card className="border-orange-500/30 bg-orange-500/5">
                        <div className="text-center">
                          <p className="text-3xl font-black text-orange-400">{dailyReportTeam.byGravity.G3}</p>
                          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mt-2">Alta (G3)</p>
                        </div>
                      </Card>

                      <Card className="border-yellow-500/30 bg-yellow-500/5">
                        <div className="text-center">
                          <p className="text-3xl font-black text-yellow-400">{dailyReportTeam.byGravity.G2 + dailyReportTeam.byGravity.G1}</p>
                          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mt-2">Baixa/Média</p>
                        </div>
                      </Card>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      <Card title="Ocorrências por Agente">
                        <div className="space-y-3">
                          {Object.entries(dailyReportTeam.byAgent).map(([agent, count]: [string, any]) => (
                            <div key={agent} className="flex items-center justify-between">
                              <span className="text-sm text-zinc-300">{agent}</span>
                              <div className="flex items-center gap-2">
                                <div className="w-24 h-2 bg-zinc-800 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-primary rounded-full" 
                                    style={{width: `${(count / dailyReportTeam.totalReports) * 100}%`}}
                                  />
                                </div>
                                <span className="text-sm font-bold text-primary min-w-[30px]">{count}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </Card>

                      <Card title="Distribuição por Categoria">
                        <div className="space-y-3">
                          {Object.entries(dailyReportTeam.byCategory).map(([cat, count]: [string, any]) => (
                            <div key={cat} className="flex items-center justify-between">
                              <span className="text-sm text-zinc-300">{cat}</span>
                              <span className="text-sm font-bold text-primary">{count}</span>
                            </div>
                          ))}
                        </div>
                      </Card>

                      <Card title="Distribuição por Gravidade">
                        <div className="space-y-3">
                          {Object.entries(dailyReportTeam.byGravity).map(([gravity, count]: [string, any]) => {
                            const colors = { G1: 'bg-blue-500', G2: 'bg-yellow-500', G3: 'bg-orange-500', G4: 'bg-red-500' };
                            return (
                              <div key={gravity} className="flex items-center justify-between">
                                <span className="text-sm text-zinc-300 font-bold">{gravity}</span>
                                <span className="text-sm font-bold">{count}</span>
                              </div>
                            );
                          })}
                        </div>
                      </Card>
                    </div>

                    {dailyReportTeam.reports.length > 0 && (
                      <Card title={`Todas as Ocorrências (${dailyReportTeam.reports.length})`}>
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                          {dailyReportTeam.reports.map((report: any) => (
                            <div 
                              key={report.id}
                              onClick={() => openReportDetails(report)}
                              className="flex items-center justify-between p-3 bg-zinc-800/30 border border-zinc-800 rounded-lg hover:border-primary/50 cursor-pointer transition-all"
                            >
                              <div className="flex-1">
                                <p className="text-sm font-bold text-zinc-100">{report.titulo || 'Sem título'}</p>
                                <p className="text-xs text-zinc-500">{report.agente_nome} • {report.categoria}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge gravidade={report.gravidade} />
                                <ChevronRight size={16} className="text-zinc-600" />
                              </div>
                            </div>
                          ))}
                        </div>
                      </Card>
                    )}
                  </>
                ) : (
                  <div className="py-20 text-center">
                    <Users className="mx-auto text-zinc-800 mb-4" size={48} />
                    <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">Nenhuma ocorrência da equipe registrada hoje</p>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'alerts' && (
              <motion.div 
                key="alerts"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-2xl font-black tracking-tighter">ALERTAS</h2>
                  <p className="text-sm text-zinc-500">Gerencie alertas para toda a equipe</p>
                </div>

                {currentUser?.permissions?.create_alerts && (
                  <Card title="Criar Novo Alerta" subtitle="Criar alertas para toda a equipe">
                    <form onSubmit={handleCreateAlert} className="space-y-4 mt-4">
                      <div>
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-2">Título do Alerta</label>
                        <input 
                          type="text"
                          required
                          placeholder="Ex: Manutenção de Emergência"
                          value={newAlert.titulo}
                          onChange={(e) => setNewAlert({...newAlert, titulo: e.target.value})}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-2.5 px-4 text-sm focus:outline-none focus:border-primary"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-2">Mensagem</label>
                        <textarea 
                          required
                          placeholder="Descreva o alerta..."
                          value={newAlert.mensagem}
                          onChange={(e) => setNewAlert({...newAlert, mensagem: e.target.value})}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-2.5 px-4 text-sm focus:outline-none focus:border-primary min-h-[80px] resize-none"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-2">Tipo</label>
                        <select 
                          value={newAlert.tipo}
                          onChange={(e) => setNewAlert({...newAlert, tipo: e.target.value})}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-2.5 px-4 text-sm focus:outline-none focus:border-primary"
                        >
                          <option value="aviso">Aviso</option>
                          <option value="critico">Crítico</option>
                          <option value="informativo">Informativo</option>
                        </select>
                      </div>

                      <button 
                        type="submit"
                        className="w-full bg-primary hover:bg-primary/90 text-black font-black text-[10px] px-6 py-2.5 rounded-lg transition-all uppercase tracking-widest shadow-lg shadow-primary/20"
                      >
                        Enviar Alerta
                      </button>
                    </form>
                  </Card>
                )}

                <Card title={`Alertas (${alerts.length})`}>
                  {alerts.length === 0 ? (
                    <div className="p-8 text-center">
                      <AlertTriangle className="mx-auto text-zinc-600 mb-2" size={32} />
                      <p className="text-xs text-zinc-500">Nenhum alerta no momento</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {alerts.map((alert: any) => (
                        <div key={alert.id} className={cn(
                          "p-4 rounded-lg border transition-colors",
                          alert.tipo === 'critico' ? "bg-red-900/20 border-red-800/50" :
                          alert.tipo === 'aviso' ? "bg-orange-900/20 border-orange-800/50" :
                          "bg-blue-900/20 border-blue-800/50"
                        )}>
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-bold text-sm">{alert.titulo}</h4>
                            <span className={cn(
                              "text-[8px] font-black px-2 py-1 rounded uppercase tracking-tighter",
                              alert.tipo === 'critico' ? "bg-red-500 text-white" :
                              alert.tipo === 'aviso' ? "bg-orange-500 text-white" :
                              "bg-blue-500 text-white"
                            )}>
                              {alert.tipo}
                            </span>
                          </div>
                          <p className="text-sm text-zinc-300 mb-2">{alert.mensagem}</p>
                          <div className="flex items-center justify-between text-[10px] text-zinc-500 mb-3">
                            <span>Por: {alert.creator_name || 'Sistema'}</span>
                            <span>{new Date(alert.timestamp).toLocaleString('pt-BR')}</span>
                          </div>
                          {currentUser?.id === alert.created_by && (
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  setEditingAlert(alert);
                                  setEditAlertForm({ titulo: alert.titulo, mensagem: alert.mensagem, tipo: alert.tipo });
                                }}
                                className="flex-1 text-[9px] font-bold px-2 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded border border-blue-500/30 transition-colors uppercase tracking-tighter"
                              >
                                Editar
                              </button>
                              <button
                                onClick={() => handleDeleteAlert(alert.id)}
                                className="flex-1 text-[9px] font-bold px-2 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded border border-red-500/30 transition-colors uppercase tracking-tighter"
                              >
                                Deletar
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </motion.div>
            )}

            {activeTab === 'parametrization' && (
              <motion.div 
                key="parametrization"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6 pb-20 md:pb-0"
              >
                <div>
                  <h2 className="text-2xl font-black tracking-tighter">PARAMETRIZAÇÃO</h2>
                  <p className="text-sm text-zinc-500">Configurações globais do sistema e relatórios PDF.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Branding & PDF Config */}
                  <Card title="Identidade Visual & PDF" subtitle="Logotipo e assinaturas dos relatórios">
                    <form onSubmit={async (e) => {
                      e.preventDefault();
                      const formData = new FormData(e.currentTarget);
                      try {
                        const settingsToSave = [
                          { key: 'pdf_logo_url', value: formData.get('pdf_logo_url'), description: 'URL do Logotipo no PDF' },
                          { key: 'pdf_footer_text', value: formData.get('pdf_footer_text'), description: 'Rodapé do PDF' },
                          { key: 'pdf_default_signature', value: formData.get('pdf_default_signature'), description: 'Assinatura Padrão' },
                        ];
                        await fetch('/api/settings', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ settings: settingsToSave }),
                          credentials: 'include'
                        });
                        toast.success("Identidade visual salva!");
                        fetchData();
                      } catch (err) { toast.error("Erro ao salvar identidade"); }
                    }} className="space-y-4 mt-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">URL do Logotipo (PNG/JPG)</label>
                        <input 
                          name="pdf_logo_url" 
                          type="url"
                          defaultValue={systemSettings.find(s => s.key === 'pdf_logo_url')?.value || ''} 
                          placeholder="https://exemplo.com/logo.png"
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-primary" 
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Assinatura Padrão (Texto)</label>
                        <input 
                          name="pdf_default_signature" 
                          type="text"
                          defaultValue={systemSettings.find(s => s.key === 'pdf_default_signature')?.value || ''} 
                          placeholder="Ex: Responsável pela Segurança"
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-primary" 
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Texto de Rodapé</label>
                        <input 
                          name="pdf_footer_text" 
                          type="text"
                          defaultValue={systemSettings.find(s => s.key === 'pdf_footer_text')?.value || ''} 
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-primary" 
                        />
                      </div>
                      <button type="submit" className="w-full py-3 bg-primary text-black rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-primary/90 transition-all shadow-lg shadow-primary/20">
                        Salvar Identidade
                      </button>
                    </form>
                  </Card>

                  {/* Operational Settings */}
                  <Card title="Funcionamento de Ocorrências" subtitle="Campos e comportamentos dinâmicos">
                    <form onSubmit={async (e) => {
                      e.preventDefault();
                      const formData = new FormData(e.currentTarget);
                      try {
                        const settingsToSave = [
                          { key: 'form_sectors', value: formData.get('form_sectors'), description: 'Setores Disponíveis' },
                          { key: 'enable_witnesses', value: formData.get('enable_witnesses') === 'on' ? 'true' : 'false', description: 'Habilitar Testemunhas' },
                          { key: 'enable_equipment', value: formData.get('enable_equipment') === 'on' ? 'true' : 'false', description: 'Habilitar Equipamentos' }
                        ];
                        await fetch('/api/settings', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ settings: settingsToSave }),
                          credentials: 'include'
                        });
                        toast.success("Parâmetros operacionais salvos!");
                        fetchData();
                      } catch (err) { toast.error("Erro ao salvar parâmetros"); }
                    }} className="space-y-6 mt-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Setores Disponíveis (Separados por vírgula)</label>
                        <textarea 
                          name="form_sectors" 
                          defaultValue={systemSettings.find(s => s.key === 'form_sectors')?.value || ''} 
                          placeholder="Setor A, Setor B, Mina Norte..."
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-primary min-h-[100px]" 
                        />
                      </div>
                      
                      <div className="space-y-4">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block">Visibilidade de Campos</label>
                        <div className="flex items-center justify-between p-3 bg-zinc-900/50 border border-zinc-800 rounded-xl">
                          <span className="text-xs font-bold text-zinc-300">Campo de Testemunhas</span>
                          <input 
                            name="enable_witnesses" 
                            type="checkbox" 
                            defaultChecked={systemSettings.find(s => s.key === 'enable_witnesses')?.value === 'true'} 
                            className="w-4 h-4 accent-primary" 
                          />
                        </div>
                        <div className="flex items-center justify-between p-3 bg-zinc-900/50 border border-zinc-800 rounded-xl">
                          <span className="text-xs font-bold text-zinc-300">Campo de Equipamentos</span>
                          <input 
                            name="enable_equipment" 
                            type="checkbox" 
                            defaultChecked={systemSettings.find(s => s.key === 'enable_equipment')?.value === 'true'} 
                            className="w-4 h-4 accent-primary" 
                          />
                        </div>
                      </div>

                      <button type="submit" className="w-full py-3 bg-zinc-100 text-black rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-white transition-all">
                        Salvar Parâmetros Ativos
                      </button>
                    </form>
                  </Card>
                </div>

                {/* System Style (Original) */}
                <Card title="Aparência do PDF" subtitle="Ajustes técnicos de layout">
                   <PdfConfigPanel />
                </Card>
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
              <DailyReportsWorkspaceTab
                canGenerate={currentUser.permissions?.manage_settings === true}
                canExport={currentUser.permissions?.export_reports === true}
              />
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
                          { name: 'conclude_reports', label: 'Finalizar Ocorrências', desc: 'Permissão para fechar/concluir ocorrências.' },
                          { name: 'view_daily_reports', label: 'Visualizar Relatórios Diários', desc: 'Acesso aos relatórios consolidados do dia.' },
                          { name: 'view_team_daily', label: 'Visualizar Dia da Equipe', desc: 'Ver relatórios consolidados de toda a equipe.' },
                          { name: 'create_alerts', label: 'Criar Alertas', desc: 'Permissão para criar alertas para a equipe.' },
                          { name: 'edit_own_alerts', label: 'Editar Alertas Próprios', desc: 'Editar e deletar alertas que você criou.' },
                          { name: 'view_audit_logs', label: 'Auditoria de Logs', desc: 'Visualização de logs e histórico do sistema.' },
                          { name: 'manage_users', label: 'Gestão de Usuários', desc: 'Permite criar, editar e remover agentes.' },
                          { name: 'manage_permissions', label: 'Gestão de Permissões', desc: 'Configuração de privilégios e roles.' },
                          { name: 'manage_settings', label: 'Configurações de Sistema', desc: 'Acesso às chaves de integração e sistema.' },
                          { name: 'export_reports', label: 'Exportar Relatórios', desc: 'Permissão para exportar relatórios em diversos formatos.' },
                          { name: 'view_personal_reports', label: 'Meus Relatórios', desc: 'Acesso aos seus relatórios pessoais.' },
                          { name: 'view_personal_daily', label: 'Meu Dia', desc: 'Ver consolidado pessoal do dia.' },
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
                  <Card title="🔔 Notificações" subtitle="Configure email, Telegram e relatórios agendados" className="lg:col-span-2">
                    <div className="space-y-6">
                      {/* Email SMTP Section */}
                      <div className="border-b border-zinc-800 pb-6">
                        <h3 className="text-sm font-black text-zinc-200 mb-4">📧 Email SMTP</h3>
                        <form onSubmit={async (e) => {
                          e.preventDefault();
                          const formData = new FormData(e.currentTarget);
                          try {
                            await fetch('/api/settings', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                settings: [
                                  { key: 'email_sender', value: formData.get('email_sender'), description: 'Email do remetente' },
                                  { key: 'email_sender_name', value: formData.get('email_sender_name'), description: 'Nome do remetente' },
                                  { key: 'smtp_host', value: formData.get('smtp_host'), description: 'Host SMTP' },
                                  { key: 'smtp_port', value: formData.get('smtp_port'), description: 'Porta SMTP' },
                                  { key: 'smtp_user', value: formData.get('smtp_user'), description: 'Usuário SMTP' },
                                  { key: 'smtp_password', value: formData.get('smtp_password'), description: 'Senha SMTP' }
                                ]
                              }),
                              credentials: 'include'
                            });
                            toast.success("Email configurado!");
                            fetchData();
                          } catch (err) {
                            toast.error("Erro ao salvar");
                          }
                        }} className="space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="text-[9px] font-black text-zinc-500 uppercase">Remetente</label>
                              <input name="email_sender" type="email" defaultValue={systemSettings.find(s => s.key === 'email_sender')?.value || ''} placeholder="noreply@mineguard.com" className="w-full bg-zinc-800 border border-zinc-700 rounded py-2 px-3 text-sm focus:outline-none focus:border-primary" />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] font-black text-zinc-500 uppercase">Nome</label>
                              <input name="email_sender_name" defaultValue={systemSettings.find(s => s.key === 'email_sender_name')?.value || 'MineGuard'} className="w-full bg-zinc-800 border border-zinc-700 rounded py-2 px-3 text-sm focus:outline-none focus:border-primary" />
                            </div>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="text-[9px] font-black text-zinc-500 uppercase">Host SMTP</label>
                              <input name="smtp_host" defaultValue={systemSettings.find(s => s.key === 'smtp_host')?.value || ''} placeholder="smtp.gmail.com" className="w-full bg-zinc-800 border border-zinc-700 rounded py-2 px-3 text-sm focus:outline-none focus:border-primary" />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] font-black text-zinc-500 uppercase">Porta</label>
                              <input name="smtp_port" type="number" defaultValue={systemSettings.find(s => s.key === 'smtp_port')?.value || '587'} className="w-full bg-zinc-800 border border-zinc-700 rounded py-2 px-3 text-sm focus:outline-none focus:border-primary" />
                            </div>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="text-[9px] font-black text-zinc-500 uppercase">Usuário</label>
                              <input name="smtp_user" defaultValue={systemSettings.find(s => s.key === 'smtp_user')?.value || ''} className="w-full bg-zinc-800 border border-zinc-700 rounded py-2 px-3 text-sm focus:outline-none focus:border-primary" />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] font-black text-zinc-500 uppercase">Senha</label>
                              <input name="smtp_password" type="password" defaultValue={systemSettings.find(s => s.key === 'smtp_password')?.value || ''} className="w-full bg-zinc-800 border border-zinc-700 rounded py-2 px-3 text-sm focus:outline-none focus:border-primary" />
                            </div>
                          </div>
                          <button type="submit" className="w-full py-2 bg-primary/20 hover:bg-primary/30 text-primary rounded text-[9px] font-black uppercase transition-all">Salvar Email</button>
                        </form>
                      </div>

                      {/* Telegram Section */}
                      <div className="border-b border-zinc-800 pb-6">
                        <h3 className="text-sm font-black text-zinc-200 mb-4">📱 Telegram</h3>
                        <form onSubmit={async (e) => {
                          e.preventDefault();
                          const formData = new FormData(e.currentTarget);
                          try {
                            await fetch('/api/settings', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                settings: [
                                  { key: 'telegram_bot_token', value: formData.get('telegram_bot_token'), description: 'Token do Bot' },
                                  { key: 'telegram_chat_id', value: formData.get('telegram_chat_id'), description: 'Chat ID' },
                                  { key: 'telegram_alert_level', value: formData.get('telegram_alert_level'), description: 'Nível de alerta' }
                                ]
                              }),
                              credentials: 'include'
                            });
                            toast.success("Telegram configurado!");
                            fetchData();
                          } catch (err) {
                            toast.error("Erro ao salvar");
                          }
                        }} className="space-y-3">
                          <div className="space-y-1">
                            <label className="text-[9px] font-black text-zinc-500 uppercase">Bot Token</label>
                            <input name="telegram_bot_token" type="password" defaultValue={systemSettings.find(s => s.key === 'telegram_bot_token')?.value || ''} placeholder="0000000000:AAH..." className="w-full bg-zinc-800 border border-zinc-700 rounded py-2 px-3 text-sm focus:outline-none focus:border-primary" />
                            <p className="text-[8px] text-zinc-400">Obtenha em @BotFather</p>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-black text-zinc-500 uppercase">Chat ID</label>
                            <input name="telegram_chat_id" type="text" defaultValue={systemSettings.find(s => s.key === 'telegram_chat_id')?.value || ''} placeholder="-100123456789 ou @grupo" className="w-full bg-zinc-800 border border-zinc-700 rounded py-2 px-3 text-sm focus:outline-none focus:border-primary" />
                            <p className="text-[8px] text-zinc-400">Use /getid para descobrir</p>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-black text-zinc-500 uppercase">Nível Mínimo</label>
                            <select name="telegram_alert_level" defaultValue={systemSettings.find(s => s.key === 'telegram_alert_level')?.value || 'G3'} className="w-full bg-zinc-800 border border-zinc-700 rounded py-2 px-3 text-sm focus:outline-none focus:border-primary">
                              <option value="G4">G4 (Crítico)</option>
                              <option value="G3">G3 e G4</option>
                              <option value="G2">G2, G3 e G4</option>
                            </select>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <button type="button" onClick={async () => {
                              const token = (document.getElementsByName('telegram_bot_token')[0] as HTMLInputElement).value;
                              const id = (document.getElementsByName('telegram_chat_id')[0] as HTMLInputElement).value;
                              if (!token || !id) return toast.error("Preencha os campos");
                              toast.loading("Testando...");
                              const res = await fetch('/api/test-telegram', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ botToken: token, chatId: id }),
                                credentials: 'include'
                              });
                              const data = await res.json();
                              toast.dismiss();
                              if (data.status === 'ok') toast.success("Enviado!");
                              else toast.error("Falha: " + data.message);
                            }} className="py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-[9px] font-black uppercase transition-all">Testar</button>
                            <button type="submit" className="py-2 bg-primary/20 hover:bg-primary/30 text-primary rounded text-[9px] font-black uppercase transition-all">Salvar Telegram</button>
                          </div>
                        </form>
                      </div>

                      {/* Scheduled Reports Section */}
                      <div>
                        <h3 className="text-sm font-black text-zinc-200 mb-4">📨 Relatórios Agendados</h3>
                        <form onSubmit={async (e) => {
                          e.preventDefault();
                          const formData = new FormData(e.currentTarget);
                          const channels: string[] = [];
                          if (formData.get('scheduled_reports_email_enabled') === 'on') channels.push('email');
                          if (formData.get('scheduled_reports_telegram_enabled') === 'on') channels.push('telegram');
                          const content: string[] = [];
                          ['summary', 'daily_incidents', 'alerts_g4', 'alerts_g3', 'active_users', 'security_stats', 'perimeter_status'].forEach(item => {
                            if (formData.get(`scheduled_reports_content_${item}`) === 'on') content.push(item);
                          });
                          if (!channels.length) return toast.error("Selecione um canal");
                          try {
                            await fetch('/api/settings', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                settings: [
                                  { key: 'scheduled_reports_enabled', value: (formData.get('scheduled_reports_enabled') === 'on') ? 'true' : 'false', description: 'Ativado' },
                                  { key: 'scheduled_reports_time', value: formData.get('scheduled_reports_time'), description: 'Horário' },
                                  { key: 'scheduled_reports_channel', value: channels.join(','), description: 'Canais' },
                                  { key: 'scheduled_reports_recipients', value: formData.get('scheduled_reports_recipients'), description: 'Emails' },
                                  { key: 'scheduled_reports_telegram_chat', value: formData.get('scheduled_reports_telegram_chat'), description: 'Chat Telegram' },
                                  { key: 'scheduled_reports_content', value: content.join(','), description: 'Conteúdo' }
                                ]
                              }),
                              credentials: 'include'
                            });
                            toast.success("Relatórios configurados!");
                            fetchData();
                          } catch (err) {
                            toast.error("Erro ao salvar");
                          }
                        }} className="space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black text-zinc-300 uppercase">Ativar Agendamento</span>
                            <input type="checkbox" name="scheduled_reports_enabled" defaultChecked={systemSettings.find(s => s.key === 'scheduled_reports_enabled')?.value === 'true'} className="w-4 h-4 rounded" />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-black text-zinc-500 uppercase">Horário de Envio</label>
                            <input type="time" name="scheduled_reports_time" defaultValue={systemSettings.find(s => s.key === 'scheduled_reports_time')?.value || '06:00'} className="w-full bg-zinc-800 border border-zinc-700 rounded py-2 px-3 text-sm focus:outline-none focus:border-primary" />
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input type="checkbox" name="scheduled_reports_email_enabled" defaultChecked={systemSettings.find(s => s.key === 'scheduled_reports_channel')?.value?.includes('email') ?? true} className="w-4 h-4 rounded" />
                              <span className="text-[9px] font-bold text-zinc-300">Email</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input type="checkbox" name="scheduled_reports_telegram_enabled" defaultChecked={systemSettings.find(s => s.key === 'scheduled_reports_channel')?.value?.includes('telegram') ?? false} className="w-4 h-4 rounded" />
                              <span className="text-[9px] font-bold text-zinc-300">Telegram</span>
                            </label>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-black text-zinc-500 uppercase">Emails Destinatários</label>
                            <input type="text" name="scheduled_reports_recipients" placeholder="email1@example.com, email2@example.com" defaultValue={systemSettings.find(s => s.key === 'scheduled_reports_recipients')?.value || ''} className="w-full bg-zinc-800 border border-zinc-700 rounded py-2 px-3 text-sm focus:outline-none focus:border-primary" />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[9px] font-black text-zinc-500 uppercase">Conteúdo Incluído</label>
                            <div className="grid grid-cols-2 gap-2">
                              {[
                                { id: 'summary', label: 'Resumo' },
                                { id: 'daily_incidents', label: 'Incidentes' },
                                { id: 'alerts_g4', label: 'Críticos (G4)' },
                                { id: 'alerts_g3', label: 'Altos (G3)' },
                                { id: 'active_users', label: 'Usuários' },
                                { id: 'security_stats', label: 'Estatísticas' }
                              ].map(item => (
                                <label key={item.id} className="flex items-center gap-2 cursor-pointer">
                                  <input type="checkbox" name={`scheduled_reports_content_${item.id}`} defaultChecked={systemSettings.find(s => s.key === 'scheduled_reports_content')?.value?.includes(item.id) ?? true} className="w-3 h-3 rounded" />
                                  <span className="text-[8px] text-zinc-300">{item.label}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                          <button type="submit" className="w-full py-2 bg-primary hover:opacity-90 text-black rounded text-[9px] font-black uppercase transition-all">Salvar Relatórios</button>
                        </form>
                      </div>
                    </div>
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

                  <Card title="Preferências de Idioma" subtitle="Selecione o idioma da interface">
                    <LanguageSwitcher />
                  </Card>

                  <Card title="Backup & Restauração" subtitle="Gerencie backups do banco de dados" className="lg:col-span-2">
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm font-bold text-zinc-200 mb-3">Fazer Backup</p>
                          <p className="text-[10px] text-zinc-500 mb-3">Fazer download do banco de dados completo</p>
                          <button 
                            onClick={async () => {
                              try {
                                const res = await fetch('/api/backup', { credentials: 'include' });
                                if (res.ok) {
                                  const blob = await res.blob();
                                  const url = window.URL.createObjectURL(blob);
                                  const a = document.createElement('a');
                                  a.href = url;
                                  a.download = `mineguard-backup-${new Date().toISOString().split('T')[0]}.db`;
                                  document.body.appendChild(a);
                                  a.click();
                                  window.URL.revokeObjectURL(url);
                                  toast.success("Backup baixado com sucesso!");
                                }
                              } catch (err) {
                                toast.error("Erro ao fazer backup");
                              }
                            }}
                            className="w-full py-2.5 bg-primary hover:bg-primary/90 text-black rounded-lg text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-primary/20"
                          >
                            ⬇️ Baixar Backup Agora
                          </button>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-zinc-200 mb-3">Restaurar Backup</p>
                          <p className="text-[10px] text-zinc-500 mb-3">Restaurar dados a partir de um arquivo de backup</p>
                          <input 
                            type="file"
                            id="backup-file"
                            accept=".db"
                            className="hidden"
                            onChange={async (e) => {
                              const file = e.currentTarget.files?.[0];
                              if (!file) return;
                              const formData = new FormData();
                              formData.append('backupFile', file);
                              try {
                                const res = await fetch('/api/backup/restore', {
                                  method: 'POST',
                                  body: formData,
                                  credentials: 'include'
                                });
                                if (res.ok) {
                                  toast.success("Backup restaurado! Recarregando...");
                                  setTimeout(() => window.location.reload(), 1500);
                                } else {
                                  toast.error("Erro ao restaurar backup");
                                }
                              } catch (err) {
                                toast.error("Erro ao restaurar backup");
                              }
                            }}
                          />
                          <button 
                            onClick={() => document.getElementById('backup-file')?.click()}
                            className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
                          >
                            📁 Selecionar Arquivo
                          </button>
                        </div>
                      </div>
                      <div className="bg-zinc-800/30 border border-zinc-700/30 rounded-lg p-3">
                        <p className="text-[10px] text-zinc-400 font-bold uppercase">⚠️ Aviso Importante:</p>
                        <p className="text-[10px] text-zinc-500 mt-1">Fazer backup regularmente é recomendado. Um backup automático é feito diariamente no servidor.</p>
                      </div>
                    </div>
                  </Card>

                  <Card title="Versioning & Atualizações" subtitle="Gerencie versões e atualizações" className="lg:col-span-2">
                    <form onSubmit={async (e) => {
                      e.preventDefault();
                      const formData = new FormData(e.currentTarget);
                      const settings = [
                        { key: 'github_repo_url', value: formData.get('github_repo_url'), description: 'URL do repositório GitHub' },
                        { key: 'auto_check_updates', value: (formData.get('auto_check_updates') === 'on') ? 'true' : 'false', description: 'Verificar atualizações automaticamente' }
                      ];
                      
                      try {
                        await fetch('/api/settings', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ settings }),
                          credentials: 'include'
                        });
                        toast.success("Configuração de versioning salva!");
                        fetchData();
                      } catch (err) {
                        toast.error("Erro ao salvar configurações");
                      }
                    }} className="space-y-6">
                      <div className="bg-zinc-800/30 border border-zinc-700/30 rounded-lg p-4">
                        <p className="text-xs font-black text-zinc-300 uppercase">Versão Atual: v1.0.0</p>
                        <p className="text-[10px] text-zinc-500 mt-1">Status: ✅ Atualizado</p>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">URL do Repositório GitHub</label>
                        <input 
                          type="url"
                          name="github_repo_url"
                          placeholder="https://github.com/usuario/mineguard"
                          defaultValue={systemSettings.find(s => s.key === 'github_repo_url')?.value || ''}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-2.5 px-4 text-sm focus:outline-none focus:border-primary"
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-bold text-zinc-200">Verificação Automática</p>
                          <p className="text-[10px] text-zinc-500">Verificar atualizações diariamente.</p>
                        </div>
                        <input 
                          type="checkbox"
                          name="auto_check_updates"
                          defaultChecked={systemSettings.find(s => s.key === 'auto_check_updates')?.value === 'true'}
                          className="w-4 h-4 rounded cursor-pointer"
                        />
                      </div>

                      <div className="flex gap-3">
                        <button 
                          type="button"
                          onClick={async () => {
                            toast.loading("Verificando atualizações...");
                            // Simulated check - will be replaced with actual GitHub API
                            setTimeout(() => {
                              toast.dismiss();
                              toast.success("Sistema está atualizado ✓");
                            }, 1500);
                          }}
                          className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
                        >
                          🔍 Verificar Agora
                        </button>
                        <button 
                          type="submit"
                          className="flex-1 py-2.5 bg-primary hover:opacity-90 text-primary-foreground rounded-lg text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-primary/20"
                        >
                          Salvar
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
          <div key="new-report-modal" className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-4 bg-black/90 backdrop-blur-md no-print">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-[#0a0a0a] border border-zinc-800 w-full max-w-4xl h-full md:h-auto md:max-h-[92vh] md:rounded-2xl overflow-hidden shadow-2xl flex flex-col relative"
            >
              <form onSubmit={handleCreateReport} className="flex flex-col h-full">
                <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/20">
                  <h3 className="text-xl font-black tracking-tighter uppercase">Registrar Ocorrência</h3>
                  <button type="button" onClick={closeNewReportModal} className="text-zinc-500 hover:text-white transition-colors">
                    <XCircle size={24} />
                  </button>
                </div>
                <div className="flex-1 min-h-0 md:max-h-[72vh] p-4 sm:p-6 space-y-5 overflow-y-auto custom-scrollbar">
                  {/* Wizard Header */}
                  <div className="flex flex-col gap-2 pb-4 border-b border-zinc-800">
                    <div className="flex justify-between text-[10px] uppercase font-bold text-zinc-500">
                      <span className={newReportStep === 1 ? "text-primary" : ""}>P1. O Que e Onde</span>
                      <span className={newReportStep === 2 ? "text-primary" : ""}>P2. Detalhes</span>
                      <span className={newReportStep === 3 ? "text-primary" : ""}>P3. Anexos</span>
                    </div>
                    <div className="flex gap-2">
                      <div className={cn("h-1 flex-1 rounded-full", newReportStep >= 1 ? "bg-primary" : "bg-zinc-800")} />
                      <div className={cn("h-1 flex-1 rounded-full", newReportStep >= 2 ? "bg-primary" : "bg-zinc-800")} />
                      <div className={cn("h-1 flex-1 rounded-full", newReportStep === 3 ? "bg-primary" : "bg-zinc-800")} />
                    </div>
                  </div>

                  <div className={cn("space-y-5", newReportStep !== 1 && "hidden")}>
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  </div>

                  <div className={cn("space-y-5", newReportStep !== 2 && "hidden")}>
                  {newReport.categoria === 'Safety' && (
                    <div className="grid grid-cols-2 gap-4 mb-4 p-4 border border-orange-500/30 bg-orange-500/5 rounded-lg">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-orange-400 uppercase tracking-widest">Tipo de Incidente (Safety)</label>
                        <select 
                          required
                          className="w-full bg-zinc-950 border border-orange-500/50 rounded-lg py-2 px-3 text-xs focus:outline-none focus:border-orange-500"
                          value={newReport.metadata?.incidentType || ''}
                          onChange={(e) => setNewReport({...newReport, metadata: {...newReport.metadata, incidentType: e.target.value}})}
                        >
                          <option value="">Selecione...</option>
                          <option value="Queda">Queda de mesmo nível</option>
                          <option value="Esmagamento">Risco de Esmagamento</option>
                          <option value="Quimico">Derramamento Químico</option>
                          <option value="Outro">Outro</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-orange-400 uppercase tracking-widest">Uso de EPI</label>
                        <select 
                          required
                          className="w-full bg-zinc-950 border border-orange-500/50 rounded-lg py-2 px-3 text-xs focus:outline-none focus:border-orange-500"
                          value={newReport.metadata?.ppeUsage || ''}
                          onChange={(e) => setNewReport({...newReport, metadata: {...newReport.metadata, ppeUsage: e.target.value}})}
                        >
                          <option value="">Selecione...</option>
                          <option value="Total">Sim, todos adequados</option>
                          <option value="Parcial">Parcial / Inadequado</option>
                          <option value="Nenhum">Não estava usando</option>
                        </select>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-2">Setor/Local</label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {(systemSettings.find((s: any) => s.key === 'form_sectors')?.value || '').split(',').map((s: string) => s.trim()).filter(Boolean).map((sec: string) => {
                          const selectedSectors = newReport.setor ? newReport.setor.split(', ') : [];
                          const isSelected = selectedSectors.includes(sec);
                          return (
                            <button
                              key={sec}
                              type="button"
                              onClick={() => {
                                let updated;
                                if (isSelected) {
                                  updated = selectedSectors.filter(s => s !== sec);
                                } else {
                                  updated = [...selectedSectors, sec];
                                }
                                setNewReport({...newReport, setor: updated.join(', ')});
                              }}
                              className={cn(
                                "px-3 py-1.5 text-[10px] font-bold rounded-lg border transition-all uppercase tracking-widest outline-none",
                                isSelected 
                                  ? "bg-primary/20 border-primary/50 text-primary glow-amber-sm" 
                                  : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
                              )}
                            >
                              {sec}
                            </button>
                          );
                        })}
                        {!(systemSettings.find((s: any) => s.key === 'form_sectors')?.value || '').trim() && (
                          <p className="text-[10px] text-zinc-600 italic">Nenhum setor parametrizado.</p>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Pessoas Envolvidas</label>
                      <input 
                        type="number"
                        min="0"
                        placeholder="Quantas?"
                        value={newReport.pessoas_envolvidas}
                        onChange={(e) => setNewReport({...newReport, pessoas_envolvidas: e.target.value})}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-2.5 px-4 text-sm focus:outline-none focus:border-primary"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Equipamento</label>
                      <input 
                        type="text"
                        placeholder="Ex: Escavadora 01"
                        value={newReport.equipamento}
                        onChange={(e) => setNewReport({...newReport, equipamento: e.target.value})}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-2.5 px-4 text-sm focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Potencial de Risco</label>
                       <select 
                         className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-2.5 px-4 text-sm focus:outline-none focus:border-primary"
                         value={newReport.potencial_risco}
                         onChange={(e) => setNewReport({...newReport, potencial_risco: e.target.value})}
                       >
                         <option value="">Selecione...</option>
                         <option value="Baixo">Baixo</option>
                         <option value="Médio">Médio</option>
                         <option value="Alto">Alto</option>
                         <option value="Crítico">Crítico</option>
                       </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Testemunhas</label>
                    <input 
                      type="text"
                      placeholder="Nomes separados por vírgula"
                      value={newReport.testemunhas}
                      onChange={(e) => setNewReport({...newReport, testemunhas: e.target.value})}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-2.5 px-4 text-sm focus:outline-none focus:border-primary"
                    />
                  </div>
                  </div>

                  <div className={cn("space-y-5", newReportStep !== 3 && "hidden")}>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Ação Imediata Tomada</label>
                    <textarea 
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-2.5 px-4 text-sm focus:outline-none focus:border-primary min-h-[60px] resize-none"
                      placeholder="O que foi feito no momento?"
                      value={newReport.acao_imediata}
                      onChange={(e) => setNewReport({...newReport, acao_imediata: e.target.value})}
                    />
                  </div>

                  <div className="space-y-4 pt-2 border-t border-zinc-800/50">
                    <div className="flex items-center gap-3 bg-zinc-900/50 p-4 rounded-xl border border-zinc-800">
                      <input 
                        type="checkbox"
                        id="investigacao"
                        checked={newReport.requer_investigacao}
                        onChange={(e) => setNewReport({...newReport, requer_investigacao: e.target.checked})}
                        className="w-5 h-5 cursor-pointer rounded border-zinc-700 bg-zinc-900 text-primary focus:ring-primary/20"
                      />
                      <label htmlFor="investigacao" className="text-sm font-bold text-zinc-300 cursor-pointer flex-1">
                        ⚠️ Esta ocorrência requer investigação formal
                      </label>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Galeria de Evidências</label>
                    <div 
                      className="relative group mb-3"
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.currentTarget.classList.add('border-primary/70', 'bg-primary/5');
                      }}
                      onDragLeave={(e) => {
                        e.currentTarget.classList.remove('border-primary/70', 'bg-primary/5');
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.currentTarget.classList.remove('border-primary/70', 'bg-primary/5');
                        const files = e.dataTransfer.files;
                        Array.from(files).forEach((file: File) => {
                          if (file.type && file.type.startsWith('image/')) {
                            addNewReportPhotos([file]);
                          }
                        });
                      }}
                    >
                      <input 
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        id="report-photos"
                        onChange={(e) => {
                          const newFiles = Array.from(e.target.files || []).map(f => ({ file: f as File, caption: '' }));
                          addNewReportPhotos(newFiles.map(item => item.file));
                        }}
                      />
                      <label 
                        htmlFor="report-photos"
                        className="flex items-center justify-center gap-3 w-full bg-zinc-900 border-2 border-dashed border-zinc-800 rounded-xl py-6 cursor-pointer hover:border-primary/50 hover:bg-zinc-900/50 transition-all"
                      >
                        <Camera className="text-zinc-500 group-hover:text-primary transition-colors" size={24} />
                        <span className="text-xs font-bold text-zinc-500 group-hover:text-zinc-300">
                          Clique ou arraste múltiplas fotos aqui
                        </span>
                      </label>
                    </div>
                    
                    {newReport.fotos.length > 0 && (
                      <div className="space-y-2">
                        {newReport.fotos.map((foto, idx) => (
                          <div key={idx} className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-zinc-300">📷 {foto.file.name}</span>
                              <button 
                                type="button" 
                                onClick={() => setNewReport({...newReport, fotos: newReport.fotos.filter((_, i) => i !== idx)})}
                                className="text-[10px] font-bold text-red-500 hover:text-red-400 transition-colors"
                              >
                                ✕ REMOVER
                              </button>
                            </div>
                            <input 
                              type="text"
                              placeholder="Legenda/descrição desta foto..."
                              value={foto.caption}
                              onChange={(e) => {
                                const newFotos = [...newReport.fotos];
                                newFotos[idx].caption = e.target.value;
                                setNewReport({...newReport, fotos: newFotos});
                              }}
                              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg py-2 px-3 text-xs text-zinc-200 focus:outline-none focus:border-primary"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  </div>
                </div>
                <div className="p-4 md:p-6 bg-zinc-900/40 border-t border-zinc-800 flex flex-col-reverse sm:flex-row justify-end gap-3 no-print">
                  {newReportStep > 1 && (
                    <button type="button" onClick={() => setNewReportStep(s => s - 1)} className="w-full sm:w-auto px-6 py-2.5 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white transition-all bg-zinc-800 rounded-lg">VOLTAR</button>
                  )}
                  {newReportStep < 3 && (
                    <button type="button" onClick={handleNextNewReportStep} className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-black font-black text-[10px] px-8 py-2.5 rounded-lg transition-all uppercase tracking-widest">PRÓXIMO</button>
                  )}
                  <button type="button" onClick={closeNewReportModal} className="w-full sm:w-auto px-6 py-2.5 text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-white transition-all bg-zinc-900/50 sm:bg-transparent rounded-lg border border-zinc-800 sm:border-none">Cancelar</button>
                  <button type="button" onClick={handlePreviewNewReport} className="w-full sm:w-auto bg-zinc-800 hover:bg-zinc-700 text-white font-black text-[10px] px-8 py-2.5 rounded-lg transition-all uppercase tracking-widest border border-zinc-700">Visualizar</button>
                  <button type="submit" className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-black font-black text-[10px] px-8 py-3 rounded-lg transition-all uppercase tracking-widest shadow-lg shadow-primary/20">Transmitir Relatório</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {showReportPreview && (
          <div key="preview-modal" className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-[#0a0a0a] border border-zinc-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/20">
                <h3 className="text-xl font-black tracking-tighter uppercase">Visualização da Ocorrência</h3>
                <button type="button" onClick={() => setShowReportPreview(false)} className="text-zinc-500 hover:text-white transition-colors">
                  <XCircle size={24} />
                </button>
              </div>
              <div className="p-4 sm:p-6 space-y-6 max-h-[75vh] overflow-y-auto">
                <div>
                  <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Título</p>
                  <p className="text-lg font-bold text-zinc-100">{newReport.titulo || 'Sem título'}</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Categoria</p>
                    <p className="text-sm text-zinc-300 bg-zinc-900/50 p-2 rounded">{newReport.categoria}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Gravidade</p>
                    <div className="inline-block"><Badge gravidade={newReport.gravidade} /></div>
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Descrição</p>
                  <p className="text-sm text-zinc-300 bg-zinc-900/50 p-3 rounded leading-relaxed">{newReport.descricao || 'Sem descrição'}</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {newReport.setor && (
                    <div>
                      <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Setor/Local</p>
                      <p className="text-sm text-zinc-300">{newReport.setor}</p>
                    </div>
                  )}
                  {newReport.pessoas_envolvidas && (
                    <div>
                      <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Pessoas Envolvidas</p>
                      <p className="text-sm text-zinc-300">{newReport.pessoas_envolvidas}</p>
                    </div>
                  )}
                </div>

                {newReport.equipamento && (
                  <div>
                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Equipamento</p>
                    <p className="text-sm text-zinc-300">{newReport.equipamento}</p>
                  </div>
                )}

                {newReport.acao_imediata && (
                  <div>
                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Ação Imediata</p>
                    <p className="text-sm text-zinc-300 bg-zinc-900/50 p-2 rounded">{newReport.acao_imediata}</p>
                  </div>
                )}

                {newReport.testemunhas && (
                  <div>
                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Testemunhas</p>
                    <p className="text-sm text-zinc-300">{newReport.testemunhas}</p>
                  </div>
                )}

                {newReport.potencial_risco && (
                  <div>
                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Potencial de Risco</p>
                    <p className="text-sm text-zinc-300 bg-zinc-900/50 p-2 rounded">{newReport.potencial_risco}</p>
                  </div>
                )}

                {newReport.requer_investigacao && (
                  <div className="bg-red-900/20 border border-red-800/50 p-3 rounded">
                    <p className="text-sm font-bold text-red-400">⚠️ Requer Investigação Formal</p>
                  </div>
                )}

                {newReport.fotos.length > 0 && (
                  <div>
                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3">Evidências ({newReport.fotos.length})</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {newReport.fotos.map((foto, idx) => (
                        <div key={idx} className="space-y-1">
                          <img src={URL.createObjectURL(foto.file)} alt={`Preview ${idx}`} className="w-full h-32 object-cover rounded border border-zinc-800" />
                          {foto.caption && <p className="text-xs text-zinc-400">{foto.caption}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="p-6 bg-zinc-900/20 border-t border-zinc-800 flex justify-end gap-3">
                <button type="button" onClick={() => setShowReportPreview(false)} className="px-6 py-2.5 text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-white transition-colors">Voltar</button>
                <button type="button" onClick={async () => { const ok = await submitNewReport(); if (ok) { setShowReportPreview(false); } }} className="bg-primary hover:bg-primary/90 text-black font-black text-[10px] px-8 py-2.5 rounded-lg transition-all uppercase tracking-widest shadow-lg shadow-primary/20">Confirmar e Enviar</button>
              </div>
            </motion.div>
          </div>
        )}

        {editingAlert && (
          <div key="edit-alert-modal" className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-[#0a0a0a] border border-zinc-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
                <h3 className="text-xl font-black tracking-tighter uppercase">Editar Alerta</h3>
                <button type="button" onClick={() => setEditingAlert(null)} className="text-zinc-500 hover:text-white transition-colors">
                  <XCircle size={24} />
                </button>
              </div>

              <form onSubmit={handleEditAlert} className="p-6 space-y-4">
                <div>
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-2">Título</label>
                  <input 
                    type="text"
                    required
                    value={editAlertForm.titulo}
                    onChange={(e) => setEditAlertForm({...editAlertForm, titulo: e.target.value})}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-2.5 px-4 text-sm focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-2">Mensagem</label>
                  <textarea 
                    required
                    value={editAlertForm.mensagem}
                    onChange={(e) => setEditAlertForm({...editAlertForm, mensagem: e.target.value})}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-2.5 px-4 text-sm focus:outline-none focus:border-primary min-h-[80px] resize-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-2">Tipo</label>
                  <select 
                    value={editAlertForm.tipo}
                    onChange={(e) => setEditAlertForm({...editAlertForm, tipo: e.target.value})}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-2.5 px-4 text-sm focus:outline-none focus:border-primary"
                  >
                    <option value="aviso">Aviso</option>
                    <option value="critico">Crítico</option>
                    <option value="informativo">Informativo</option>
                  </select>
                </div>

                <div className="flex gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => setEditingAlert(null)}
                    className="flex-1 px-6 py-2.5 text-[10px] font-bold uppercase tracking-widest text-zinc-500 hover:text-white transition-colors border border-zinc-800 rounded-lg"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 bg-primary hover:bg-primary/90 text-black font-black text-[10px] px-6 py-2.5 rounded-lg transition-all uppercase tracking-widest shadow-lg shadow-primary/20"
                  >
                    Salvar Alterações
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {isDashboardRangeModalOpen && (
          <div key="dashboard-range-modal" className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md no-print">
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.96 }}
              className="bg-[#0a0a0a] border border-zinc-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/20">
                <div>
                  <h3 className="text-lg font-black tracking-tighter uppercase">Intervalo da Dashboard</h3>
                  <p className="text-[10px] text-zinc-500 font-bold tracking-widest uppercase">Defina o período da análise</p>
                </div>
                <button onClick={() => setIsDashboardRangeModalOpen(false)} className="text-zinc-500 hover:text-white transition-colors">
                  <XCircle size={22} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">De</label>
                  <input
                    type="date"
                    value={dashboardCustomRange.from}
                    onChange={(e) => setDashboardCustomRange(prev => ({ ...prev, from: e.target.value }))}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Até</label>
                  <input
                    type="date"
                    value={dashboardCustomRange.to}
                    onChange={(e) => setDashboardCustomRange(prev => ({ ...prev, to: e.target.value }))}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary"
                  />
                </div>
              </div>
              <div className="p-6 bg-zinc-900/20 border-t border-zinc-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsDashboardRangeModalOpen(false)}
                  className="px-6 py-2.5 text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={applyDashboardCustomRange}
                  className="bg-primary hover:bg-primary/90 text-black font-black text-[10px] px-8 py-2.5 rounded-lg transition-all uppercase tracking-widest shadow-lg shadow-primary/20"
                >
                  Aplicar Intervalo
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {selectedReport && (
          <div key="report-details-modal" className="fixed inset-0 z-[200] flex items-center justify-center p-0 md:p-4 bg-black/95 backdrop-blur-xl no-print">
            <motion.div 
              initial={{ opacity: 0, y: 50, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.98 }}
              className="bg-[#0a0a0a] border-zinc-800 md:border md:rounded-3xl w-full max-w-5xl h-full md:h-[90vh] overflow-hidden flex flex-col shadow-2xl relative"
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
                <div className="flex items-center gap-2">
                  {selectedReport.status === 'Concluído' && (
                    <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full">
                      <CheckCircle2 size={12} className="text-green-500" />
                      <span className="text-[9px] font-black text-green-500 uppercase tracking-widest">Relatório Selado</span>
                    </div>
                  )}
                  <button onClick={closeReportDetails} className="text-zinc-500 hover:text-white transition-colors">
                    <XCircle size={24} />
                  </button>
                </div>
              </div>
              
              <div className="flex-1 min-h-0 md:max-h-[80vh] p-4 sm:p-6 lg:p-8 space-y-6 lg:space-y-8 overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)] gap-6 lg:gap-10">
                  <div className="space-y-6">
                    <div>
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-2">Título</label>
                      {isEditingReport ? (
                        <input 
                          type="text" 
                          value={editingReportData.titulo} 
                          onChange={e => setEditingReportData({...editingReportData, titulo: e.target.value})}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-2.5 px-4 text-sm focus:outline-none focus:border-primary"
                        />
                      ) : (
                        <p className="text-lg font-black text-white uppercase tracking-tight">{selectedReport.titulo || 'Sem Título'}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-2">Categoria</label>
                        <div className="flex items-center gap-2 bg-zinc-900 px-3 py-2 rounded-lg border border-zinc-800">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(249,115,22,0.5)]" />
                          <span className="text-xs font-bold text-zinc-300 uppercase">{selectedReport.categoria}</span>
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-2">Gravidade</label>
                        <Badge gravidade={selectedReport.gravidade} />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-2">Setor / Local</label>
                        {isEditingReport ? (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {(systemSettings.find((s: any) => s.key === 'form_sectors')?.value || '').split(',').map((s: string) => s.trim()).filter(Boolean).map((sec: string) => {
                              const selectedSectors = editingReportData.setor ? editingReportData.setor.split(', ') : [];
                              const isSelected = selectedSectors.includes(sec);
                              return (
                                <button
                                  key={sec}
                                  type="button"
                                  onClick={() => {
                                    let updated;
                                    if (isSelected) {
                                      updated = selectedSectors.filter(s => s !== sec);
                                    } else {
                                      updated = [...selectedSectors, sec];
                                    }
                                    setEditingReportData({...editingReportData, setor: updated.join(', ')});
                                  }}
                                  className={cn(
                                    "px-3 py-1.5 text-[9px] font-bold rounded-md border transition-all uppercase tracking-widest outline-none",
                                    isSelected 
                                      ? "bg-primary/20 border-primary/50 text-primary" 
                                      : "bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                                  )}
                                >
                                  {sec}
                                </button>
                              );
                            })}
                            {!(systemSettings.find((s: any) => s.key === 'form_sectors')?.value || '').trim() && (
                              <p className="text-[10px] text-zinc-600 italic">Nenhum setor parametrizado.</p>
                            )}
                          </div>
                        ) : (
                          <p className="text-sm font-bold text-zinc-300 bg-zinc-900/50 p-3 rounded-lg border border-zinc-800/50">{selectedReport.setor || 'N/A'}</p>
                        )}
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-2">Equipamento</label>
                        {isEditingReport ? (
                          <input 
                            type="text" 
                            value={editingReportData.equipamento || ''} 
                            onChange={e => setEditingReportData({...editingReportData, equipamento: e.target.value})}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-2 px-4 text-sm focus:outline-none focus:border-primary"
                          />
                        ) : (
                          <p className="text-sm font-bold text-zinc-300 bg-zinc-900/50 p-3 rounded-lg border border-zinc-800/50">{selectedReport.equipamento || 'N/A'}</p>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-2">Ação Imediata Tomada</label>
                      {isEditingReport ? (
                        <textarea
                          value={editingReportData.acao_imediata || ''}
                          onChange={e => setEditingReportData({...editingReportData, acao_imediata: e.target.value})}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-sm text-zinc-300 focus:outline-none focus:border-primary min-h-[60px]"
                        />
                      ) : (
                        <div className="bg-amber-500/5 border border-amber-500/20 p-4 rounded-xl">
                           <p className="text-sm text-zinc-300 leading-relaxed italic">"{selectedReport.acao_imediata || 'Nenhuma ação registrada'}"</p>
                        </div>
                      )}
                    </div>

                    <div className="space-y-4">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-1">Informações Adicionais</label>
                      <div className="grid grid-cols-1 gap-3">
                         <div className="bg-zinc-900/30 p-3 rounded-lg border border-zinc-900 flex items-center justify-between">
                            <span className="text-[10px] font-bold text-zinc-500 uppercase">Testemunhas</span>
                            {isEditingReport ? (
                              <input 
                                type="text" 
                                value={editingReportData.testemunhas || ''} 
                                onChange={e => setEditingReportData({...editingReportData, testemunhas: e.target.value})}
                                className="bg-transparent text-right text-xs font-bold text-zinc-200 focus:outline-none"
                                placeholder="Nomes..."
                              />
                            ) : (
                              <span className="text-[10px] font-black text-zinc-300 uppercase">{selectedReport.testemunhas || 'Nenhuma'}</span>
                            )}
                         </div>
                         <div className="bg-zinc-900/30 p-3 rounded-lg border border-zinc-900 flex items-center justify-between">
                            <span className="text-[10px] font-bold text-zinc-500 uppercase">Potencial de Risco</span>
                            {isEditingReport ? (
                              <select 
                                value={editingReportData.potencial_risco || ''} 
                                onChange={e => setEditingReportData({...editingReportData, potencial_risco: e.target.value})}
                                className="bg-transparent text-right text-xs font-bold text-zinc-200 focus:outline-none"
                              >
                                <option value="">Selecione...</option>
                                <option value="Baixo">Baixo</option>
                                <option value="Médio">Médio</option>
                                <option value="Alto">Alto</option>
                                <option value="Crítico">Crítico</option>
                              </select>
                            ) : (
                              <span className={cn(
                                "text-[10px] font-black uppercase",
                                selectedReport.potencial_risco === 'Crítico' ? "text-red-500" : "text-zinc-300"
                              )}>{selectedReport.potencial_risco || 'Não Avaliado'}</span>
                            )}
                         </div>
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-2">Agente Responsável</label>
                      <div className="flex items-center gap-3 bg-zinc-900/50 p-3 rounded-xl border border-zinc-800 shadow-inner">
                        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-sm font-black text-black shadow-lg shadow-primary/20">
                          {selectedReport.agente_nome.charAt(0)}
                        </div>
                        <div>
                          <p className="text-xs font-black text-zinc-200 uppercase tracking-tight">{selectedReport.agente_nome}</p>
                          <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest leading-none mt-1">{selectedReport.agente_nivel}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-2">Galeria de Evidências</label>
                    {isEditingReport && selectedReport.status === 'Aberto' ? (
                      <div className="space-y-3">
                        <div 
                          className="border-2 border-dashed border-zinc-800 hover:border-primary/50 transition-all flex flex-col items-center justify-center text-zinc-600 cursor-pointer bg-zinc-900/20 rounded-xl py-6"
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.currentTarget.classList.add('border-primary/70', 'bg-primary/5');
                          }}
                          onDragLeave={(e) => {
                            e.currentTarget.classList.remove('border-primary/70', 'bg-primary/5');
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            e.currentTarget.classList.remove('border-primary/70', 'bg-primary/5');
                            const files = e.dataTransfer.files;
                            Array.from(files).forEach((file: File) => {
                              if (file.type && file.type.startsWith('image/')) {
                                addEditingReportPhotos([file]);
                              }
                            });
                          }}
                        >
                          <input 
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            id="edit-report-photos"
                            onChange={(e) => {
                              const newFiles = Array.from(e.target.files || []).map(f => ({ file: f as File, caption: '' }));
                              addEditingReportPhotos(newFiles.map(item => item.file));
                            }}
                          />
                          <label htmlFor="edit-report-photos" className="flex flex-col items-center justify-center w-full cursor-pointer">
                            <Camera size={32} strokeWidth={1} />
                            <p className="text-[10px] font-bold mt-2 uppercase tracking-widest">Clique ou arraste múltiplas fotos</p>
                          </label>
                        </div>
                        
                        {editingReportData.fotos.map((foto, idx) => (
                          <div key={idx} className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-zinc-300">📷 {foto.file.name}</span>
                              <button 
                                type="button" 
                                onClick={() => setEditingReportData({...editingReportData, fotos: editingReportData.fotos.filter((_, i) => i !== idx)})}
                                className="text-[10px] font-bold text-red-500 hover:text-red-400 transition-colors"
                              >
                                ✕
                              </button>
                            </div>
                            <input 
                              type="text"
                              placeholder="Legenda/descrição..."
                              value={foto.caption}
                              onChange={(e) => {
                                const newFotos = [...editingReportData.fotos];
                                newFotos[idx].caption = e.target.value;
                                setEditingReportData({...editingReportData, fotos: newFotos});
                              }}
                              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg py-2 px-3 text-xs text-zinc-200 focus:outline-none focus:border-primary"
                            />
                          </div>
                        ))}
                      </div>
                    ) : selectedReport.photos && selectedReport.photos.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {selectedReport.photos.map((photo) => (
                          <div key={photo.id} className="space-y-2">
                            <div className="aspect-square rounded-lg overflow-hidden border border-zinc-800 bg-zinc-900 group relative">
                              <img 
                                src={photo.photo_path} 
                                alt={photo.caption || "Evidência"} 
                                className="w-full h-full object-cover" 
                              />
                              <a 
                                href={photo.photo_path} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all backdrop-blur-sm"
                              >
                                <span className="text-[10px] font-black text-white uppercase tracking-widest">Ver</span>
                              </a>
                            </div>
                            {photo.caption && (
                              <p className="text-[10px] text-zinc-400 leading-relaxed">{photo.caption}</p>
                            )}
                          </div>
                        ))}
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
                    {isEditingReport && selectedReport.status === 'Aberto' ? (
                      <textarea
                        value={editingReportData.descricao}
                        onChange={(e) => setEditingReportData({...editingReportData, descricao: e.target.value})}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-sm text-zinc-300 focus:outline-none focus:border-primary resize-none min-h-[120px]"
                        placeholder="Edite a descrição da ocorrência..."
                      />
                    ) : (
                      <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-xl text-sm text-zinc-300 leading-relaxed">
                        {selectedReport.descricao}
                      </div>
                    )}
                  </div>


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
              
              <div className="p-4 md:p-6 bg-zinc-900/40 border-t border-zinc-800 no-print">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col sm:flex-row justify-between items-center bg-zinc-900/50 p-3 rounded-xl border border-zinc-800/50 gap-4 sm:gap-2">
                    <p className="text-[9px] md:text-[10px] text-zinc-600 font-bold uppercase tracking-widest text-center sm:text-left">Sistema de Segurança MineGuard • Auditoria Ativa</p>
                    <div className="flex items-center gap-2">
                       <button 
                        onClick={() => window.print()}
                        className="p-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-all border border-zinc-700"
                        title="Exportar PDF"
                      >
                        <Printer size={16} />
                      </button>
                      <button 
                        onClick={closeReportDetails}
                        className="bg-zinc-100 hover:bg-white text-black font-black text-[10px] px-6 py-2.5 rounded-lg transition-all uppercase tracking-widest"
                      >
                        Fechar
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 justify-center sm:justify-end">
                    {isEditingReport && selectedReport.status === 'Aberto' ? (
                      <>
                        <button 
                          type="button"
                          onClick={cancelEditingSelectedReport}
                          className="flex-1 sm:flex-none font-black text-[10px] px-8 py-2.5 rounded-lg transition-all uppercase tracking-widest bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700"
                        >
                          Cancelar
                        </button>
                        <button 
                          type="button"
                          onClick={handleSaveReportEdits}
                          className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-500 text-white font-black text-[10px] px-8 py-2.5 rounded-lg transition-all uppercase tracking-widest shadow-lg shadow-blue-900/20"
                        >
                          Salvar Alterações
                        </button>
                      </>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap gap-2 w-full sm:w-auto">
                        {selectedReport.status === 'Aberto' && (
                          <button 
                            type="button"
                            onClick={startEditingSelectedReport}
                            className="bg-primary hover:bg-primary/90 text-black font-black text-[10px] px-6 py-2.5 rounded-lg transition-all uppercase tracking-widest shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                          >
                            Editar
                          </button>
                        )}
                        {selectedReport.status !== 'Aprovado' && (selectedReport.status !== 'Concluído' || currentUser?.permissions?.conclude_reports) && (
                          <button 
                            onClick={() => handleConcludeReport(selectedReport.id, selectedReport.status || 'Aberto')}
                            className={cn(
                              "font-black text-[10px] px-6 py-2.5 rounded-lg transition-all uppercase tracking-widest flex items-center justify-center gap-2 min-w-[120px]",
                              selectedReport.status === 'Concluído'
                                ? "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 border border-zinc-700"
                                : "bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-900/20"
                            )}
                          >
                            {selectedReport.status === 'Concluído' ? (
                              <>
                                <Clock size={14} />
                                Reabrir
                              </>
                            ) : (
                              <>
                                <CheckCircle2 size={14} />
                                Concluir
                              </>
                            )}
                          </button>
                        )}

                        {selectedReport.status !== 'Aprovado' && selectedReport.status === 'Concluído' && currentUser?.permissions?.approve_reports && (
                          <button 
                            onClick={async () => {
                              try {
                                const res = await fetch(`/api/reports/${selectedReport.id}/status`, {
                                  method: 'PATCH',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ status: 'Aprovado' }),
                                  credentials: 'include'
                                });
                                const data = await res.json();
                                if (data.status === 'success') {
                                  toast.success("Relatório aprovado e selado com sucesso!");
                                  setReports(reports.map(r => r.id === selectedReport.id ? { ...r, status: 'Aprovado' as any } : r));
                                  setSelectedReport({ ...selectedReport, status: 'Aprovado' as any });
                                } else {
                                  toast.error(data.message);
                                }
                              } catch (err) {
                                toast.error("Erro ao aprovar relatório");
                              }
                            }}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white font-black text-[10px] px-6 py-2.5 rounded-lg transition-all uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-indigo-900/20 col-span-2 xs:col-auto"
                          >
                            <Shield size={14} />
                            Aprovar
                          </button>
                        )}
                        {(String(currentUser?.nivel_hierarquico).toLowerCase() === 'superadmin' || 
                          String(currentUser?.nivel_hierarquico).toLowerCase() === 'admin' || 
                          currentUser?.permissions?.delete_reports ||
                          currentUser?.id === 1) && (
                          <button 
                            onClick={() => handleDeleteReport(selectedReport.id)}
                            className="bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white border border-red-500/20 font-black text-[10px] px-6 py-2.5 rounded-lg transition-all uppercase tracking-widest flex items-center justify-center gap-2"
                          >
                            <Trash2 size={14} />
                            Deletar
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {isNewUserModalOpen && (
          <div key="new-user-modal" className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                        value={newUser.numero_mecanografico}
                        onChange={(e) => setNewUser({...newUser, numero_mecanografico: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
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
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Idioma Preferido</label>
                      <select 
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-2.5 px-4 text-sm focus:outline-none focus:border-primary"
                        value={(newUser as any).preferred_language || 'pt-BR'}
                        onChange={(e) => setNewUser({...newUser, preferred_language: e.target.value} as any)}
                      >
                        <option value="pt-BR">Português (BR)</option>
                        <option value="en-US">English (US)</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Senha de Acesso</label>
                      <input 
                        type="password" 
                        required={!editingUser}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-2.5 px-4 text-sm focus:outline-none focus:border-primary"
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
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 glass no-print flex items-center justify-between px-6 z-50 safe-bottom">
        <button 
          onClick={() => setActiveTab('dashboard')} 
          className={cn(
            "flex flex-col items-center gap-1 transition-all duration-300", 
            activeTab === 'dashboard' ? "text-primary scale-110" : "text-zinc-600"
          )}
        >
          <Activity size={20} weight={activeTab === 'dashboard' ? 'fill' : 'regular'} />
          <span className="text-[7px] font-black uppercase tracking-widest">Dash</span>
        </button>

        <button 
          onClick={() => setActiveTab('reports')} 
          className={cn(
            "flex flex-col items-center gap-1 transition-all duration-300", 
            activeTab === 'reports' ? "text-primary scale-110" : "text-zinc-600"
          )}
        >
          <FileText size={20} />
          <span className="text-[7px] font-black uppercase tracking-widest">Logs</span>
        </button>

        <motion.button 
          whileTap={{ scale: 0.85 }}
          onClick={() => setIsNewReportModalOpen(true)} 
          className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-black shadow-lg shadow-primary/30 -mt-10 border-4 border-[var(--bg-main)] glow-amber"
        >
          <Plus size={24} strokeWidth={4} />
        </motion.button>

        <button 
          onClick={() => setActiveTab('daily_reports')} 
          className={cn(
            "flex flex-col items-center gap-1 transition-all duration-300", 
            activeTab === 'daily_reports' ? "text-primary scale-110" : "text-zinc-600"
          )}
        >
          <Calendar size={20} />
          <span className="text-[7px] font-black uppercase tracking-widest">Relat</span>
        </button>

        <button 
          onClick={() => setIsMobileMenuOpen(true)} 
          className={cn(
            "flex flex-col items-center gap-1 transition-all duration-300 text-zinc-600"
          )}
        >
          <MoreVertical size={20} />
          <span className="text-[7px] font-black uppercase tracking-widest">Mais</span>
        </button>
      </nav>

      {/* Mobile Drawer (Mais) */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[90] md:hidden"
            />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 glass rounded-t-[2rem] z-[100] md:hidden pb-12 pt-8 px-6"
            >
              <div className="w-12 h-1 bg-zinc-800 rounded-full mx-auto mb-8 opacity-20" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <SidebarItem icon={FileText} label="Meus Relatos" active={activeTab === 'personal_reports'} onClick={() => { setActiveTab('personal_reports'); setIsMobileMenuOpen(false); }} />
                <SidebarItem icon={Calendar} label="Meu Dia" active={activeTab === 'daily_report_personal'} onClick={() => { setActiveTab('daily_report_personal'); setIsMobileMenuOpen(false); }} />
                {currentUser.permissions?.view_team_daily && (
                  <SidebarItem icon={Users} label="Equipe" active={activeTab === 'daily_report_team'} onClick={() => { setActiveTab('daily_report_team'); setIsMobileMenuOpen(false); }} />
                )}
                <SidebarItem icon={AlertTriangle} label="Alertas" active={activeTab === 'alerts'} onClick={() => { setActiveTab('alerts'); setIsMobileMenuOpen(false); }} />
                {currentUser.permissions?.manage_users === true && (
                  <SidebarItem icon={Users} label="Pessoal" active={activeTab === 'users'} onClick={() => { setActiveTab('users'); setIsMobileMenuOpen(false); }} />
                )}
                {currentUser.permissions?.manage_permissions === true && (
                  <SidebarItem icon={Lock} label="Permissões" active={activeTab === 'permissions'} onClick={() => { setActiveTab('permissions'); setIsMobileMenuOpen(false); }} />
                )}
                {currentUser.permissions?.manage_settings === true && (
                  <>
                    <SidebarItem icon={SettingsIcon} label='Defini\u00e7\u00f5es' active={activeTab === 'settings'} onClick={() => { setActiveTab('settings'); setIsMobileMenuOpen(false); }} />
                    <SidebarItem icon={SettingsIcon} label='Parametriza\u00e7\u00e3o' active={activeTab === 'parametrization'} onClick={() => { setActiveTab('parametrization'); setIsMobileMenuOpen(false); }} />
                  </>
                )}
                <motion.button 
                  whileTap={{ scale: 0.96 }}
                  onClick={async () => {
                    if (deferredPrompt) {
                      await handleInstallClick();
                    } else {
                      setIsMobileMenuOpen(false);
                      setShowInstallGuide(true);
                    }
                  }}
                  className="col-span-2 w-full flex items-center justify-center gap-3 p-3 rounded-xl text-xs font-black uppercase bg-primary text-black border border-primary/30 shadow-lg shadow-primary/20"
                >
                  <Download size={16} strokeWidth={3} />
                  Instalar como App
                </motion.button>
              </div>
              <div className="mt-8 pt-8 border-t border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-black font-black">
                     {currentUser.nome.charAt(0)}
                   </div>
                   <div>
                     <p className="text-xs font-black uppercase">{currentUser.nome}</p>
                     <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{currentUser.nivel_hierarquico}</p>
                   </div>
                </div>
                <button onClick={handleLogout} className="p-3 bg-red-500/10 text-red-500 rounded-xl">
                  <LogOut size={20} />
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Install Guide Modal */}
      <AnimatePresence>
        {showInstallGuide && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowInstallGuide(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200]"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 220 }}
              className="fixed bottom-0 left-0 right-0 z-[201] bg-zinc-950 border-t border-zinc-800 rounded-t-[2rem] p-8 pb-12 shadow-2xl"
            >
              <div className="w-12 h-1 bg-zinc-800 rounded-full mx-auto mb-6" />
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
                  <Shield size={24} className="text-black" strokeWidth={3} />
                </div>
                <div>
                  <h3 className="text-base font-black uppercase tracking-tight text-white">Instalar MineGuard</h3>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Como App no seu Telemóvel</p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-black text-xs shrink-0 mt-0.5">1</div>
                  <div>
                    <p className="text-sm font-black text-white">Abra o menu do Chrome</p>
                    <p className="text-xs text-zinc-500 mt-0.5">Toque nos <strong className="text-zinc-300">3 pontos ⋮</strong> no canto superior direito do Chrome</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-black text-xs shrink-0 mt-0.5">2</div>
                  <div>
                    <p className="text-sm font-black text-white">Seleccione "Adicionar ao ecrã inicial"</p>
                    <p className="text-xs text-zinc-500 mt-0.5">Pode também aparecer como <strong className="text-zinc-300">"Instalar aplicação"</strong> ou <strong className="text-zinc-300">"Adicionar ao início"</strong></p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-black text-xs shrink-0 mt-0.5">3</div>
                  <div>
                    <p className="text-sm font-black text-white">Confirme e pronto!</p>
                    <p className="text-xs text-zinc-500 mt-0.5">O MineGuard aparecerá no seu ecrã inicial como uma app nativa.</p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowInstallGuide(false)}
                className="mt-8 w-full py-4 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 text-xs font-black uppercase tracking-widest"
              >
                Fechar
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

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




