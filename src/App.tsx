import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from './i18n';
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
import { formatDate, formatDateTime, formatTime, LUANDA_TIMEZONE_LABEL } from './lib/datetime';
import {
  buildMetadataWithDynamicFields,
  coerceDynamicFieldValues,
  createEmptyDynamicField,
  getDynamicFieldValues,
  getReportDynamicFields,
  parseJsonObject,
  slugifyDynamicFieldLabel,
  validateDynamicFieldValues,
} from './lib/reportDynamicFields';
import { OperationsMapPanel } from './components/ui/OperationsMapPanel';
import { DailyReportsWorkspaceTab } from './components/tabs/DailyReportsWorkspaceTab';
import { ReportsTab } from './components/tabs/ReportsTab';
import { DailyReportPersonalTab } from './components/tabs/DailyReportPersonalTab';
import { DailyReportTeamTab } from './components/tabs/DailyReportTeamTab';
import { CommandCenterTab } from './components/tabs/CommandCenterTab';
import { CriticalOccurrencesTab } from './components/tabs/CriticalOccurrencesTab';
import { TimelineTab } from './components/tabs/TimelineTab';
import { EvidenceLibraryTab } from './components/tabs/EvidenceLibraryTab';
import { ShiftsTab } from './components/tabs/ShiftsTab';
import { AlertsTab } from './components/tabs/AlertsTab';
import { UsersTab } from './components/tabs/UsersTab';
import { SettingsTab } from './components/tabs/SettingsTab';
import { NewReportModal } from './components/modals/ReportModals';
import { ReportDetailModal } from './components/modals/ReportDetailModal';
import { DashboardRangeModal, EditAlertModal, UserModal } from './components/modals/SystemModals';
import { io } from 'socket.io-client';
import { normalizeLanguage } from './i18n';
import { matchesAlertAudience } from './lib/alertAudience';
import { applyThemeSettings, resolveThemeMode, resolveThemePalette, resolveThemeTemplate, themePalettes, themeTemplates } from './lib/theme';
import { compressPhotoToJpeg } from './lib/photoUpload';
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

const SidebarItem = ({
  icon: Icon,
  label,
  active,
  onClick,
  compact = false,
  onHoverHint,
}: {
  icon: any,
  label: string,
  active?: boolean,
  onClick: () => void,
  compact?: boolean,
  onHoverHint?: (payload: { label: string; top: number; left: number } | null) => void,
}) => (
  <button 
    onClick={onClick}
    onMouseEnter={(event) => {
      if (!compact || !onHoverHint) return;
      const rect = event.currentTarget.getBoundingClientRect();
      onHoverHint({
        label,
        top: rect.top + rect.height / 2,
        left: rect.right + 12,
      });
    }}
    onMouseLeave={() => {
      if (!compact || !onHoverHint) return;
      onHoverHint(null);
    }}
    className={cn(
      "w-full flex items-center gap-2.5 rounded-[1.15rem] px-3 py-2.5 text-[10px] font-black uppercase tracking-[0.11em] transition-all duration-300 relative group text-left overflow-hidden xl:px-3.5 xl:py-2.5",
      compact && "justify-center px-2.5",
      active 
        ? "text-primary bg-primary/8 shadow-[inset_0_0_0_1px_rgba(249,115,22,0.12)]" 
        : "text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-white/[0.03]"
    )}
  >
    {active && <motion.div layoutId="active-nav" className="absolute left-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-r-full bg-primary" />}
    <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-[1rem] border transition-all", active ? "border-primary/20 bg-primary/12 text-primary shadow-[0_0_30px_rgba(var(--primary-rgb),0.18)]" : "border-[var(--border)] bg-[var(--surface-1)] text-[var(--text-faint)] group-hover:border-[var(--border-strong)] group-hover:text-[var(--text-main)]")}>
      <Icon size={16} className={cn("transition-transform group-hover:scale-110", active && "glow-amber")} />
    </div>
    {!compact && <span className="sidebar-label min-w-0 flex-1 text-left leading-[1.1rem]">{label}</span>}
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
      <div className="text-3xl font-black tracking-tighter text-[var(--text-main)] mb-1 group-hover:translate-x-1 transition-transform">{value}</div>
      <div className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest">{title}</div>
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
    toast.success("Definições de PDF guardadas com sucesso!");
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
        <Printer size={16} /> Guardar Configuração do Relatório
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
      <div className="p-4 md:p-6 border-b border-[var(--border)] flex items-center justify-between bg-white/[0.03]">
        <div>
          {title && <h3 className="text-xs font-black text-[var(--text-main)] uppercase tracking-[0.2em]">{title}</h3>}
          {subtitle && <p className="text-[10px] text-[var(--text-muted)] mt-1 font-bold">{subtitle}</p>}
        </div>
        {action}
      </div>
    )}
    <div className="p-4 md:p-6">{children}</div>
  </div>
);
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
  const { t } = useTranslation();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const activeTabStorageKey = 'mineguard_active_tab';
  const [activeTab, setActiveTab] = useState<
    'dashboard' |
    'command_center' |
    'critical_occurrences' |
    'timeline' |
    'evidence_library' |
    'shifts' |
    'reports' |
    'users' |
    'permissions' |
    'daily_reports' |
    'personal_reports' |
    'daily_report_personal' |
    'daily_report_team' |
    'alerts' |
    'settings' |
    'parametrization'
  >(() => (
    localStorage.getItem(activeTabStorageKey) as
      'dashboard' |
      'command_center' |
      'critical_occurrences' |
      'timeline' |
      'evidence_library' |
      'shifts' |
      'reports' |
      'users' |
      'permissions' |
      'daily_reports' |
      'personal_reports' |
      'daily_report_personal' |
      'daily_report_team' |
      'alerts' |
      'settings' |
      'parametrization'
  ) || 'dashboard');
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
    app_theme_palette: 'obsidian-amber',
    app_theme_template: 'executive',
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
  const [newAlert, setNewAlert] = useState({ titulo: '', mensagem: '', tipo: 'aviso', expiresInHours: '24', isTemporary: true, targetAudience: 'all', pinned: false });
  const [editingAlert, setEditingAlert] = useState<any>(null);
  const [editAlertForm, setEditAlertForm] = useState({ titulo: '', mensagem: '', tipo: 'aviso', expiresInHours: '24', isTemporary: true, targetAudience: 'all', pinned: false });
  const [mapCenter, setMapCenter] = useState<[number, number]>([-8.8383, 13.2344]); // Angola/Luanda default
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [focusMode, setFocusMode] = useState(false);
  const [newReportStep, setNewReportStep] = useState(1);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [compactSidebarHint, setCompactSidebarHint] = useState<{ label: string; top: number; left: number } | null>(null);
  const [isEditingReport, setIsEditingReport] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const canManageSystem = currentUser?.permissions?.manage_settings === true || currentUser?.nivel_hierarquico === 'Superadmin';
  const canGenerateDailyReports =
    canManageSystem ||
    ['Oficial', 'Sierra 1', 'Sierra 2'].includes(currentUser?.nivel_hierarquico || '');
  const getSettingValue = (key: string, fallback = '') => systemSettings.find((setting) => setting.key === key)?.value || fallback;
  const reportDynamicFields = getReportDynamicFields(systemSettings);
  const reportFormBaseItems = [
    { id: 'base:title', label: 'Título da ocorrência', type: 'text', scope: 'both', categories: [] as string[], active: true },
    { id: 'base:category', label: 'Categoria', type: 'select', scope: 'both', categories: [] as string[], active: true },
    { id: 'base:severity', label: 'Gravidade', type: 'select', scope: 'both', categories: [] as string[], active: true },
    { id: 'base:description', label: 'Descrição da ocorrência', type: 'textarea', scope: 'both', categories: [] as string[], active: true },
    { id: 'base:safety_incident', label: 'Tipo de incidente (Safety)', type: 'select', scope: 'both', categories: ['Safety'], active: true },
    { id: 'base:safety_ppe', label: 'Uso de EPI', type: 'select', scope: 'both', categories: ['Safety'], active: true },
    { id: 'base:sector', label: 'Setor / local', type: 'multiselect', scope: 'both', categories: [] as string[], active: true },
    { id: 'base:people', label: 'Pessoas envolvidas', type: 'number', scope: 'both', categories: [] as string[], active: true },
    { id: 'base:equipment', label: 'Equipamento', type: 'text', scope: 'both', categories: [] as string[], active: getSettingValue('enable_equipment', 'true') === 'true' },
    { id: 'base:risk', label: 'Potencial de risco', type: 'select', scope: 'both', categories: [] as string[], active: true },
    { id: 'base:witnesses', label: 'Testemunhas', type: 'text', scope: 'both', categories: [] as string[], active: getSettingValue('enable_witnesses', 'true') === 'true' },
    { id: 'base:immediate_action', label: 'Ação imediata tomada', type: 'textarea', scope: 'both', categories: [] as string[], active: true },
    { id: 'base:investigation', label: 'Requer investigação formal', type: 'checkbox', scope: 'both', categories: [] as string[], active: true },
    { id: 'base:photos', label: 'Galeria de evidências', type: 'media', scope: 'both', categories: [] as string[], active: true },
  ];
  const reportFormLayoutSetting = (() => {
    try {
      const parsed = JSON.parse(getSettingValue('report_form_layout', '[]'));
      return Array.isArray(parsed) ? parsed.map((item) => String(item)) : [];
    } catch {
      return [] as string[];
    }
  })();
  const reportFormItems = (() => {
    const dynamicItems = reportDynamicFields.map((field) => ({
      id: `dynamic:${field.id}`,
      label: field.label,
      type: field.type,
      scope: field.scope,
      categories: field.categories || [],
      active: field.active,
      isDynamic: true,
      field,
    }));
    const allItems = [
      ...reportFormBaseItems.map((item) => ({ ...item, isDynamic: false, field: null as any })),
      ...dynamicItems,
    ];
    const orderedIds = [...reportFormLayoutSetting];
    allItems.forEach((item) => {
      if (!orderedIds.includes(item.id)) orderedIds.push(item.id);
    });
    return orderedIds
      .map((id) => allItems.find((item) => item.id === id))
      .filter(Boolean) as Array<any>;
  })();

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
      metadata: {} as any,
      dynamicFieldValues: {} as Record<string, any>,
      fotos: [] as Array<{ file: File; caption: string }>
    };
  }

  function createEmptyNewReport(settingsSource = systemSettings) {
    const getValue = (key: string, fallback = '') => settingsSource.find((setting) => setting.key === key)?.value || fallback;
    return {
      titulo: '',
      categoria: (getValue('default_report_category', 'Valores') as Categoria),
      gravidade: (getValue('default_report_severity', 'G1') as Gravidade),
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
      metadata: { dynamicFields: {} } as any
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
    metadata: any;
    dynamicFieldValues: Record<string, any>;
    fotos: Array<{ file: File; caption: string }>;
  }>(createEmptyEditingReportData());
  
  // Form States
  const [newReport, setNewReport] = useState(createEmptyNewReport());

  useEffect(() => {
    const defaultHeatmap = getSettingValue('show_heatmap_by_default', 'false') === 'true';
    setShowHeatmap(defaultHeatmap);
  }, [systemSettings]);

  const [newUser, setNewUser] = useState({
    nome: '',
    funcao: '',
    numero_mecanografico: '',
    nivel_hierarquico: 'Agente' as NivelHierarquico,
    password: ''
  });
  const [dynamicFieldDraft, setDynamicFieldDraft] = useState(createEmptyDynamicField());
  const [editingDynamicFieldId, setEditingDynamicFieldId] = useState<string | null>(null);
  const [draggedFormLayoutItemId, setDraggedFormLayoutItemId] = useState<string | null>(null);
  const [dynamicFieldPreviewCategory, setDynamicFieldPreviewCategory] = useState<Categoria>('Valores');
  const [dynamicFieldPreviewScope, setDynamicFieldPreviewScope] = useState<'create' | 'edit'>('create');
  const [operationalSettingsForm, setOperationalSettingsForm] = useState({
    form_sectors: '',
    enable_witnesses: false,
    enable_equipment: false,
    default_report_category: 'Valores' as Categoria,
    default_report_severity: 'G1' as Gravidade,
  });

  useEffect(() => {
    setOperationalSettingsForm({
      form_sectors: systemSettings.find((s) => s.key === 'form_sectors')?.value || '',
      enable_witnesses: systemSettings.find((s) => s.key === 'enable_witnesses')?.value === 'true',
      enable_equipment: systemSettings.find((s) => s.key === 'enable_equipment')?.value === 'true',
      default_report_category: (getSettingValue('default_report_category', 'Valores') as Categoria),
      default_report_severity: (getSettingValue('default_report_severity', 'G1') as Gravidade),
    });
  }, [systemSettings]);
  const [interfaceSettingsForm, setInterfaceSettingsForm] = useState({
    app_name: 'MINEGUARD',
    app_slogan: 'Security Operating System',
    app_theme_mode: 'dark',
    app_theme_palette: 'obsidian-amber',
    app_theme_template: 'executive',
    app_layout: 'default',
  });

  useEffect(() => {
    const normalizedMode = resolveThemeMode(publicSettings.app_theme_mode);
    setInterfaceSettingsForm({
      app_name: publicSettings.app_name || 'MINEGUARD',
      app_slogan: publicSettings.app_slogan || 'Security Operating System',
      app_theme_mode: normalizedMode,
      app_theme_palette: resolveThemePalette(normalizedMode, publicSettings.app_theme_palette),
      app_theme_template: resolveThemeTemplate(publicSettings.app_theme_template),
      app_layout: publicSettings.app_layout || 'default',
    });
  }, [publicSettings]);

  useEffect(() => {
    applyThemeSettings(document.documentElement, publicSettings);
  }, [publicSettings]);

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
    const currentRole = (currentUser?.nivel_hierarquico || currentUser?.funcao || '').toString();

    socket.on('new_report', (incomingReport: Report) => {
      const report = normalizeReportRecord(incomingReport);
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
          `Registada por ${report.agente_nome} (${report.gravidade})`,
          'report',
          report.id
        );

        if (currentUser?.permissions?.view_dashboard === true) {
          fetch('/api/stats', { credentials: 'include' }).then(res => res.ok ? res.json() : null).then(data => data && setStats(data));
        }
      }
    });

    socket.on('report_updated', (incomingReport: Partial<Report> & { id: number; status?: Report['status'] }) => {
      const report = normalizeReportRecord(incomingReport);
      setReports(prev => prev.map(r => r.id === report.id ? { ...r, ...report } : r));
      setSelectedReport(prev => prev && prev.id === report.id ? { ...prev, ...report } : prev);
    });

    socket.on('new_alert', (alert: any) => {
      if (!matchesAlertAudience(alert?.target_audience, currentRole)) {
        return;
      }
      setAlerts(prev => [alert, ...prev]);
      addNotification(
        `Novo Alerta: ${alert.titulo}`,
        alert.mensagem,
        'alert',
        alert.id
      );
    });

    socket.on('alert_updated', (alert: any) => {
      if (!matchesAlertAudience(alert?.target_audience, currentRole)) {
        setAlerts(prev => prev.filter(a => a.id !== alert.id));
        return;
      }
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
          applyThemeSettings(document.documentElement, data);
        }
      });

    fetch('/api/me', { credentials: 'include' })
      .then(res => res.ok ? res.json() : null)
      .then(user => {
        if (user) {
          setCurrentUser(user);
          const preferredLang = normalizeLanguage((user as any).preferred_language || 'pt');
          i18n.changeLanguage(preferredLang);
          localStorage.setItem('language', preferredLang);
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
              message: 'Lembre-se de registar todas as alterações de turno.',
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
      const preferredLang = normalizeLanguage((currentUser as any).preferred_language);
      i18n.changeLanguage(preferredLang);
      localStorage.setItem('language', preferredLang);
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
      if (currentUser && (perms.manage_settings === true || currentUser.nivel_hierarquico === 'Superadmin')) {
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
          setReports(normalizeReportsList(data.data || data));
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
      toast.error(t('app.dashboard.selectRangeDates'));
      return;
    }

    if (dashboardCustomRange.from > dashboardCustomRange.to) {
      toast.error(t('app.dashboard.invalidRange'));
      return;
    }

    setDashboardRange('custom');
    setIsDashboardRangeModalOpen(false);
  };

  const dashboardCustomRangeLabel =
    dashboardCustomRange.from && dashboardCustomRange.to
      ? `${new Date(`${dashboardCustomRange.from}T00:00:00`).toLocaleDateString(normalizeLanguage(i18n.language) === 'en' ? 'en-US' : 'pt-PT')} -> ${new Date(`${dashboardCustomRange.to}T00:00:00`).toLocaleDateString(normalizeLanguage(i18n.language) === 'en' ? 'en-US' : 'pt-PT')}`
      : t('app.dashboard.customRange');

  const normalizeReportRecord = (report: any): Report => ({
    ...report,
    metadata: parseJsonObject(report?.metadata),
  });

  const normalizeReportsList = (payload: any): Report[] => {
    if (Array.isArray(payload)) return payload.map(normalizeReportRecord) as Report[];
    if (Array.isArray(payload?.reports)) return payload.reports.map(normalizeReportRecord) as Report[];
    return [];
  };

  const normalizeDailyReport = (payload: any, includeAgent = false) => {
    const base = {
      totalReports: 0,
      byGravity: { G1: 0, G2: 0, G3: 0, G4: 0 },
      byCategory: {},
      reports: [] as Report[],
    };

    const normalized = {
      ...base,
      ...(payload || {}),
      byGravity: { ...base.byGravity, ...(payload?.byGravity || {}) },
      byCategory: payload?.byCategory && typeof payload.byCategory === 'object' ? payload.byCategory : {},
      reports: normalizeReportsList(payload?.reports ?? payload),
    } as any;

    if (includeAgent) {
      normalized.byAgent = payload?.byAgent && typeof payload.byAgent === 'object' ? payload.byAgent : {};
    }

    return normalized;
  };

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
        setPersonalReports(normalizeReportsList(data));
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
        setDailyReportPersonal(normalizeDailyReport(data));
      } else {
        setDailyReportPersonal(normalizeDailyReport(null));
      }
    } catch (err) {
      console.error("Erro ao buscar relatório diário pessoal:", err);
      setDailyReportPersonal(normalizeDailyReport(null));
    }
  };

  useEffect(() => {
    if (activeTab === 'daily_report_personal') {
      fetchDailyReportPersonal();
    }
  }, [activeTab, currentUser]);

  const fetchDailyReportTeam = async () => {
    if (!currentUser) return;
    try {
      const res = await fetch('/api/reports/daily-team', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setDailyReportTeam(normalizeDailyReport(data, true));
      } else {
        setDailyReportTeam(normalizeDailyReport(null, true));
      }
    } catch (err) {
      console.error("Erro ao buscar relatório da equipa:", err);
      setDailyReportTeam(normalizeDailyReport(null, true));
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
        metadata: parseJsonObject((selectedReport as any).metadata),
        dynamicFieldValues: coerceDynamicFieldValues(reportDynamicFields, getDynamicFieldValues((selectedReport as any).metadata)),
        fotos: []
      });
      setIsEditingReport(false);
    }
  }, [selectedReport, systemSettings]);

  const closeNewReportModal = () => {
    setIsNewReportModalOpen(false);
    setShowReportPreview(false);
    setNewReportStep(1);
    setNewReport(createEmptyNewReport());
  };

  const openNewReportModal = () => {
    setShowReportPreview(false);
    setNewReportStep(1);
    setNewReport(createEmptyNewReport());
    setIsNewReportModalOpen(true);
  };

  const closeReportDetails = () => {
    setSelectedReport(null);
    setIsEditingReport(false);
    setEditingReportData(createEmptyEditingReportData());
  };

  const validateNewReportStep = (step: number) => {
    if (step === 1) {
      if (!newReport.titulo.trim()) {
        toast.error(t('app.reports.validation.titleRequired'));
        return false;
      }
      if (!newReport.descricao.trim()) {
        toast.error(t('app.reports.validation.descriptionRequired'));
        return false;
      }
    }

    if (step === 2 && newReport.categoria === 'Safety') {
      if (!newReport.metadata?.incidentType || !newReport.metadata?.ppeUsage) {
        toast.error(t('app.reports.validation.safetyRequired'));
        return false;
      }
    }

    if (step === 2) {
      const invalidDynamicField = validateDynamicFieldValues(
        reportDynamicFields,
        getDynamicFieldValues(newReport.metadata),
        newReport.categoria,
        'create'
      );

      if (invalidDynamicField) {
        toast.error(`Preencha o campo obrigatório: ${invalidDynamicField.label}`);
        return false;
      }
    }

    return true;
  };

  const validateNewReportBeforeSubmit = () => {
    return validateNewReportStep(1) && validateNewReportStep(2);
  };

  const saveDynamicFieldConfiguration = async (fields: any[]) => {
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        settings: [
          {
            key: 'report_dynamic_fields',
            value: JSON.stringify(fields),
            description: 'Campos dinâmicos do formulário de ocorrência',
          },
        ],
      }),
      credentials: 'include',
    });
  };

  const handleSaveDynamicField = async () => {
    const label = dynamicFieldDraft.label.trim();
    if (!label) {
      toast.error('Define o nome do campo.');
      return;
    }

    if ((dynamicFieldDraft.type === 'select' || dynamicFieldDraft.type === 'multiselect') && (dynamicFieldDraft.options || []).length === 0) {
      toast.error('Campos de seleção precisam de opções.');
      return;
    }

    const baseId = slugifyDynamicFieldLabel(label) || `campo_${Date.now()}`;
    const nextField = {
      ...dynamicFieldDraft,
      id: editingDynamicFieldId || baseId,
      label,
    };

    const alreadyExists = reportDynamicFields.some((field) => field.id === nextField.id && field.id !== editingDynamicFieldId);
    if (alreadyExists) {
      toast.error('Já existe um campo com este identificador. Ajusta o nome.');
      return;
    }

    const nextFields = editingDynamicFieldId
      ? reportDynamicFields.map((field) => (field.id === editingDynamicFieldId ? nextField : field))
      : [...reportDynamicFields, nextField];

    try {
      await saveDynamicFieldConfiguration(nextFields);
      toast.success(editingDynamicFieldId ? 'Campo atualizado.' : 'Campo adicionado.');
      setDynamicFieldDraft(createEmptyDynamicField());
      setEditingDynamicFieldId(null);
      fetchData();
    } catch {
      toast.error('Erro ao guardar campo dinâmico.');
    }
  };

  const handleEditDynamicField = (fieldId: string) => {
    const field = reportDynamicFields.find((item) => item.id === fieldId);
    if (!field) return;
    setDynamicFieldDraft({
      ...field,
      options: [...(field.options || [])],
      categories: [...(field.categories || [])],
    });
    setEditingDynamicFieldId(fieldId);
  };

  const handleDeleteDynamicField = async (fieldId: string) => {
    try {
      await saveDynamicFieldConfiguration(reportDynamicFields.filter((field) => field.id !== fieldId));
      toast.success('Campo removido da parametrização.');
      if (editingDynamicFieldId === fieldId) {
        setDynamicFieldDraft(createEmptyDynamicField());
        setEditingDynamicFieldId(null);
      }
      fetchData();
    } catch {
      toast.error('Erro ao remover campo dinâmico.');
    }
  };

  const handleMoveDynamicField = async (fieldId: string, direction: 'up' | 'down') => {
    const currentIndex = reportDynamicFields.findIndex((field) => field.id === fieldId);
    if (currentIndex < 0) return;
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= reportDynamicFields.length) return;

    const nextFields = [...reportDynamicFields];
    const [item] = nextFields.splice(currentIndex, 1);
    nextFields.splice(targetIndex, 0, item);

    try {
      await saveDynamicFieldConfiguration(nextFields);
      fetchData();
    } catch {
      toast.error('Erro ao reordenar campo.');
    }
  };

  const saveReportFormLayout = async (orderedIds: string[]) => {
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        settings: [
          {
            key: 'report_form_layout',
            value: JSON.stringify(orderedIds),
            description: 'Ordem visual do formulário de ocorrência',
          },
        ],
      }),
      credentials: 'include',
    });
  };

  const updateSettings = async (settings: any[]) => {
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings }),
        credentials: 'include',
      });
      const nextPublicSettings = {
        ...publicSettings,
        ...Object.fromEntries(
          settings
            .filter((item) => typeof item.key === 'string' && String(item.key).startsWith('app_'))
            .map((item) => [item.key, item.value]),
        ),
      };
      setPublicSettings(nextPublicSettings);
      applyThemeSettings(document.documentElement, nextPublicSettings);
      fetchData();
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const handleMoveReportFormItem = async (itemId: string, direction: 'up' | 'down') => {
    const currentIndex = reportFormItems.findIndex((item) => item.id === itemId);
    if (currentIndex < 0) return;
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= reportFormItems.length) return;

    const nextItems = [...reportFormItems];
    const [item] = nextItems.splice(currentIndex, 1);
    nextItems.splice(targetIndex, 0, item);

    try {
      await saveReportFormLayout(nextItems.map((entry) => entry.id));
      fetchData();
    } catch {
      toast.error('Erro ao reordenar item do formulário.');
    }
  };

  const handleReorderReportFormItems = async (sourceId: string, targetId: string) => {
    if (!sourceId || !targetId || sourceId === targetId) return;

    const sourceIndex = reportFormItems.findIndex((item) => item.id === sourceId);
    const targetIndex = reportFormItems.findIndex((item) => item.id === targetId);
    if (sourceIndex < 0 || targetIndex < 0) return;

    const nextItems = [...reportFormItems];
    const [movedItem] = nextItems.splice(sourceIndex, 1);
    nextItems.splice(targetIndex, 0, movedItem);

    try {
      await saveReportFormLayout(nextItems.map((entry) => entry.id));
      fetchData();
    } catch {
      toast.error('Erro ao reordenar item do formulário.');
    } finally {
      setDraggedFormLayoutItemId(null);
    }
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
        setSelectedReport(normalizeReportRecord(data.report));
      }
    } catch (err) {
      console.error(t('app.reports.errors.loadDetails'), err);
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
      metadata: parseJsonObject(selectedReport.metadata),
      dynamicFieldValues: coerceDynamicFieldValues(reportDynamicFields, getDynamicFieldValues(selectedReport.metadata)),
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
        metadata: parseJsonObject(selectedReport.metadata),
        dynamicFieldValues: coerceDynamicFieldValues(reportDynamicFields, getDynamicFieldValues(selectedReport.metadata)),
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

    const toastId = toast.loading(t('app.reports.sending.capturingLocation'));
    
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
          toast.loading(t('app.reports.sending.locationCaptured'), { id: toastId });
          console.log("Geolocation captured:", lat, lng);
        } catch (geoErr: any) {
          console.warn("Geolocation failed, using map center as fallback", geoErr);
          lat = mapCenter[0].toString();
          lng = mapCenter[1].toString();
          toast.loading(t('app.reports.sending.usingMapLocation'), { id: toastId });
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
      formData.append(
        'metadata',
        JSON.stringify(buildMetadataWithDynamicFields(newReport.metadata, getDynamicFieldValues(newReport.metadata)))
      );
      
      for (const foto of newReport.fotos) {
        try {
          const jpegFile = await compressPhotoToJpeg(foto.file);
          formData.append('fotos', jpegFile);
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
        toast.success(t('app.reports.sending.success'), { id: toastId });
        if (data?.report) {
          const normalizedReport = normalizeReportRecord(data.report);
          setReports(prev => [normalizedReport, ...prev.filter(r => r.id !== normalizedReport.id)]);
        }
        closeNewReportModal();
        fetchData();
        return true;
      }

      toast.error(data.message || t('app.reports.sending.error'), { id: toastId });
      return false;
    } catch (err) {
      toast.error(t('app.reports.sending.connectionError'), { id: toastId });
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
        setNewAlert({ titulo: '', mensagem: '', tipo: 'aviso', expiresInHours: '24', isTemporary: true, targetAudience: 'all', pinned: false });
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
    if (!confirm("Tem a certeza de que deseja eliminar este alerta?")) return;

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
        toast.error(data.message || "Erro ao eliminar alerta");
      }
    } catch (err) {
      toast.error("Erro ao eliminar alerta");
    }
  };

  const handleLogout = async () => {
    await fetch('/api/logout', { method: 'POST', credentials: 'include' });
    setCurrentUser(null);
    toast.info("Sessão encerrada");
  };

  if (isLoading) return (
    <div className="h-screen bg-[#050505] flex items-center justify-center">
      <Toaster position="top-right" theme={publicSettings.app_theme_mode === 'light' ? 'light' : 'dark'} richColors />
      <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!currentUser) return (
    <>
      <Toaster position="top-right" theme={publicSettings.app_theme_mode === 'light' ? 'light' : 'dark'} richColors />
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
        toast.success(editingUser ? "Utilizador atualizado!" : "Utilizador criado!");
        setIsNewUserModalOpen(false);
        setEditingUser(null);
        setNewUser({ nome: '', funcao: '', numero_mecanografico: '', nivel_hierarquico: 'Agente', password: '' });
        fetchData();
      }
    } catch (err) {
      toast.error("Erro ao guardar utilizador");
    }
  };

  const handleDeleteUser = async (id: number) => {
    if (!confirm("Deseja realmente eliminar este utilizador?")) return;
    try {
      const res = await fetch(`/api/users/${id}`, { method: 'DELETE', credentials: 'include' });
      if (res.ok) {
        toast.success("Utilizador removido!");
        fetchData();
      }
    } catch (err) {
      toast.error("Erro ao remover utilizador");
    }
  };

  const handleDeleteReport = async (id: number) => {
    if (!confirm("Tem a certeza de que deseja ELIMINAR esta ocorrência? Esta ação é irreversível.")) return;
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
      toast.error(t('app.reports.validation.descriptionEmpty'));
      return;
    }

    const invalidDynamicField = validateDynamicFieldValues(
      reportDynamicFields,
      editingReportData.dynamicFieldValues,
      selectedReport.categoria,
      'edit'
    );

    if (invalidDynamicField) {
      toast.error(`Preencha o campo obrigatório: ${invalidDynamicField.label}`);
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
      formData.append(
        'metadata',
        JSON.stringify(buildMetadataWithDynamicFields(editingReportData.metadata, editingReportData.dynamicFieldValues))
      );
      
      for (const foto of editingReportData.fotos) {
        if (foto.file) {
          try {
            const jpegFile = await compressPhotoToJpeg(foto.file);
            formData.append('fotos', jpegFile);
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
        toast.success(t('app.reports.edit.success'));
        setIsEditingReport(false);
        if (data.report) {
          const normalizedReport = normalizeReportRecord(data.report);
          setReports(prev => prev.map(report => report.id === normalizedReport.id ? normalizedReport : report));
          setSelectedReport(normalizedReport);
        }
        fetchData();
      } else {
        toast.error(data.message || t('app.reports.edit.saveError'));
      }
    } catch (err) {
      toast.error(t('app.reports.edit.saveError'));
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
  const activeViewMeta: Record<string, { title: string; subtitle: string }> = {
    dashboard: { title: t('app.sidebar.dashboard'), subtitle: t('app.dashboard.realtimeOverview') },
    command_center: { title: 'Centro de Comando', subtitle: 'Prioridades operacionais, alertas e atalhos do turno.' },
    critical_occurrences: { title: 'Ocorrências Críticas', subtitle: 'Priorização de G3 e G4 com foco na resposta.' },
    timeline: { title: 'Linha do Tempo', subtitle: 'Leitura cronológica da atividade recente.' },
    evidence_library: { title: 'Biblioteca de Evidências', subtitle: 'Consulta visual das fotografias associadas às ocorrências.' },
    shifts: { title: 'Turnos', subtitle: 'Carga operacional do turno e atividade da equipa.' },
    reports: { title: t('app.sidebar.occurrences'), subtitle: 'Registos operacionais, filtros e histórico consolidado.' },
    daily_reports: { title: t('app.sidebar.dailyReports'), subtitle: 'Geração, pesquisa e exportação dos relatórios diários.' },
    personal_reports: { title: t('app.sidebar.myReports'), subtitle: 'Acompanhamento pessoal dos teus registos.' },
    daily_report_personal: { title: t('app.sidebar.myDay'), subtitle: 'Resumo pessoal do dia de operação.' },
    daily_report_team: { title: t('app.sidebar.teamDay'), subtitle: 'Visão consolidada do dia da equipa.' },
    alerts: { title: t('app.sidebar.alerts'), subtitle: 'Comunicação operacional e avisos prioritários.' },
    users: { title: t('app.sidebar.staffManagement'), subtitle: 'Gestão de utilizadores, funções e acesso.' },
    permissions: { title: t('app.sidebar.permissionsRoles'), subtitle: 'Perfis, hierarquia e matriz de permissões.' },
    settings: { title: t('app.sidebar.settings'), subtitle: 'Integrações, notificações e ajustes do sistema.' },
    parametrization: { title: t('app.sidebar.parametrization'), subtitle: 'Comportamentos operacionais e identidade do produto.' },
  };
  const handleStartEditReport = (report: Report) => {
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
      metadata: parseJsonObject(report.metadata),
      dynamicFieldValues: coerceDynamicFieldValues(reportDynamicFields, getDynamicFieldValues(report.metadata)),
      fotos: []
    });
  };

  const handleApproveReport = async (reportId: number) => {
    try {
      const res = await fetch(`/api/reports/${reportId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Aprovado' }),
        credentials: 'include'
      });
      const data = await res.json();
      if (data.status === 'success') {
        toast.success("Relatório aprovado e selado com sucesso!");
        setReports(reports.map(r => r.id === reportId ? { ...r, status: 'Aprovado' as any } : r));
        if (selectedReport?.id === reportId) {
          setSelectedReport({ ...selectedReport, status: 'Aprovado' as any });
        }
      } else {
        toast.error(data.message);
      }
    } catch (err) {
      toast.error("Erro ao aprovar relatório");
    }
  };

  const handleMarkAlertRead = async (alertId: number) => {
    try {
      const res = await fetch(`/api/alerts/${alertId}/read`, {
        method: 'PATCH',
        credentials: 'include'
      });

      const data = await res.json();
      if (data.status === 'success') {
        setAlerts((current) => current.map((alert) => (alert.id === alertId ? { ...alert, read: 1 } : alert)));
      } else {
        toast.error(data.message || "Erro ao marcar alerta como lido");
      }
    } catch (err) {
      toast.error("Erro ao marcar alerta como lido");
    }
  };
  const currentViewMeta = activeViewMeta[activeTab] || activeViewMeta.dashboard;

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

  const selectedThemeMode = resolveThemeMode(interfaceSettingsForm.app_theme_mode);
  const availablePalettes = themePalettes.filter((palette) => palette.mode === selectedThemeMode);
  const selectedPalette = availablePalettes.find((palette) => palette.id === interfaceSettingsForm.app_theme_palette) || availablePalettes[0];
  const selectedTemplate = themeTemplates.find((template) => template.id === resolveThemeTemplate(interfaceSettingsForm.app_theme_template)) || themeTemplates[0];

  return (
    <div className={cn("app-shell flex h-screen bg-[var(--bg-main)] text-[var(--text-main)] font-sans selection:bg-primary/30 relative overflow-hidden transition-all duration-700", focusMode && "brightness-50 sepia-[.4] hue-rotate-[-10deg] saturate-[1.5] contrast-125")}>
      <div className="absolute inset-0 industrial-grid opacity-[0.03] pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[50vh] bg-gradient-to-b from-primary/10 to-transparent opacity-30 pointer-events-none" />
      
      <Toaster position="top-right" theme={publicSettings.app_theme_mode === 'light' ? 'light' : 'dark'} richColors />
      
      {/* Sidebar */}
      <aside className={cn(
        "app-sidebar hidden md:flex flex-col no-print border-r border-[var(--border)] transition-all duration-300",
        publicSettings.app_layout === 'compact' ? "w-[5.25rem]" : "w-[var(--template-sidebar-width)]",
        focusMode && "!hidden"
      )}>
        <div className={cn(
          "flex items-center gap-3 border-b border-[var(--border)] px-4 py-4 xl:px-5",
          publicSettings.app_layout === 'compact' && "justify-center px-3 py-4"
        )}>
          <div className="h-10 w-10 shrink-0 rounded-[1rem] bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
            <Shield className="text-primary-foreground" size={20} strokeWidth={2.5} />
          </div>
          {publicSettings.app_layout !== 'compact' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <h1 className="text-[1.55rem] font-black tracking-tight leading-none uppercase">{publicSettings.app_name}</h1>
              <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">{publicSettings.app_slogan}</p>
            </motion.div>
          )}
        </div>
        
        <nav className="custom-scrollbar flex-1 overflow-y-auto px-2.5 py-4 space-y-1">
          {publicSettings.app_layout !== 'compact' && <p className="nav-section-label">Operação</p>}
          {currentUser.permissions?.view_dashboard === true && <SidebarItem icon={Activity} label={t('app.sidebar.dashboard')} active={activeTab === 'dashboard'} compact={publicSettings.app_layout === 'compact'} onHoverHint={setCompactSidebarHint} onClick={() => setActiveTab('dashboard')} />}
          {currentUser.permissions?.view_dashboard === true && <SidebarItem icon={Shield} label={'Centro de Comando'} active={activeTab === 'command_center'} compact={publicSettings.app_layout === 'compact'} onHoverHint={setCompactSidebarHint} onClick={() => setActiveTab('command_center')} />}
          {currentUser.permissions?.view_reports === true && <SidebarItem icon={AlertTriangle} label={'Ocorrências Críticas'} active={activeTab === 'critical_occurrences'} compact={publicSettings.app_layout === 'compact'} onHoverHint={setCompactSidebarHint} onClick={() => setActiveTab('critical_occurrences')} />}
          {currentUser.permissions?.view_dashboard === true && <SidebarItem icon={Clock} label={'Linha do Tempo'} active={activeTab === 'timeline'} compact={publicSettings.app_layout === 'compact'} onHoverHint={setCompactSidebarHint} onClick={() => setActiveTab('timeline')} />}
          {currentUser.permissions?.view_reports === true && <SidebarItem icon={Camera} label={'Biblioteca de Evidências'} active={activeTab === 'evidence_library'} compact={publicSettings.app_layout === 'compact'} onHoverHint={setCompactSidebarHint} onClick={() => setActiveTab('evidence_library')} />}
          {currentUser.permissions?.view_team_daily && <SidebarItem icon={Users} label={'Turnos'} active={activeTab === 'shifts'} compact={publicSettings.app_layout === 'compact'} onHoverHint={setCompactSidebarHint} onClick={() => setActiveTab('shifts')} />}
          {currentUser.permissions?.view_reports === true && <SidebarItem icon={FileText} label={t('app.sidebar.occurrences')} active={activeTab === 'reports'} compact={publicSettings.app_layout === 'compact'} onHoverHint={setCompactSidebarHint} onClick={() => setActiveTab('reports')} />}
          {currentUser.permissions?.view_daily_reports === true && <SidebarItem icon={Calendar} label={t('app.sidebar.dailyReports')} active={activeTab === 'daily_reports'} compact={publicSettings.app_layout === 'compact'} onHoverHint={setCompactSidebarHint} onClick={() => setActiveTab('daily_reports')} />}
          <SidebarItem icon={FileText} label={t('app.sidebar.myReports')} active={activeTab === 'personal_reports'} compact={publicSettings.app_layout === 'compact'} onHoverHint={setCompactSidebarHint} onClick={() => setActiveTab('personal_reports')} />
          <SidebarItem icon={Calendar} label={t('app.sidebar.myDay')} active={activeTab === 'daily_report_personal'} compact={publicSettings.app_layout === 'compact'} onHoverHint={setCompactSidebarHint} onClick={() => setActiveTab('daily_report_personal')} />
          {currentUser.permissions?.view_team_daily && <SidebarItem icon={Users} label={t('app.sidebar.teamDay')} active={activeTab === 'daily_report_team'} compact={publicSettings.app_layout === 'compact'} onHoverHint={setCompactSidebarHint} onClick={() => setActiveTab('daily_report_team')} />}
          <SidebarItem icon={AlertTriangle} label={t('app.sidebar.alerts')} active={activeTab === 'alerts'} compact={publicSettings.app_layout === 'compact'} onHoverHint={setCompactSidebarHint} onClick={() => setActiveTab('alerts')} />
          {(currentUser.permissions?.manage_users === true || currentUser.permissions?.manage_permissions === true || canManageSystem) && publicSettings.app_layout !== 'compact' && <p className="nav-section-label mt-6">Administração</p>}
          {currentUser.permissions?.manage_users === true && <SidebarItem icon={Users} label={t('app.sidebar.staffManagement')} active={activeTab === 'users'} compact={publicSettings.app_layout === 'compact'} onHoverHint={setCompactSidebarHint} onClick={() => setActiveTab('users')} />}
          {currentUser.permissions?.manage_permissions === true && <SidebarItem icon={Lock} label={t('app.sidebar.permissionsRoles')} active={activeTab === 'permissions'} compact={publicSettings.app_layout === 'compact'} onHoverHint={setCompactSidebarHint} onClick={() => setActiveTab('permissions')} />}
          {canManageSystem && <SidebarItem icon={SettingsIcon} label={t('app.sidebar.settings')} active={activeTab === 'settings'} compact={publicSettings.app_layout === 'compact'} onHoverHint={setCompactSidebarHint} onClick={() => setActiveTab('settings')} />}
          {canManageSystem && <SidebarItem icon={SettingsIcon} label={t('app.sidebar.parametrization')} active={activeTab === 'parametrization'} compact={publicSettings.app_layout === 'compact'} onHoverHint={setCompactSidebarHint} onClick={() => setActiveTab('parametrization')} />}
        </nav>

        <div className="mt-auto border-t border-[var(--border)] p-3">
          <div className={cn(
            "flex items-center gap-2.5 rounded-[1.15rem] border border-[var(--border)] bg-[var(--surface-1)]/85 p-2.5 group cursor-pointer hover:border-[var(--border-strong)] transition-all",
            publicSettings.app_layout === 'compact' && "justify-center p-2"
          )}>
            <div className="h-9 w-9 shrink-0 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-[12px] font-black text-black shadow-inner">
              {currentUser.nome.split(' ').map(n => n[0]).join('')}
            </div>
            {publicSettings.app_layout !== 'compact' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 min-w-0">
                <p className="truncate text-[11px] font-bold group-hover:text-primary transition-colors">{currentUser.nome}</p>
                <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">{currentUser.nivel_hierarquico}</p>
              </motion.div>
            )}
            {publicSettings.app_layout !== 'compact' && (
              <button onClick={handleLogout} className="p-1 text-[var(--text-faint)] hover:text-red-400 transition-colors">
                <LogOut size={14} />
              </button>
            )}
          </div>
        </div>
      </aside>

      <AnimatePresence>
        {publicSettings.app_layout === 'compact' && compactSidebarHint && !focusMode && (
          <motion.div
            initial={{ opacity: 0, x: -8, scale: 0.98 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -8, scale: 0.98 }}
            transition={{ duration: 0.16 }}
            className="pointer-events-none fixed z-[70] hidden md:block"
            style={{ top: compactSidebarHint.top, left: compactSidebarHint.left, transform: 'translateY(-50%)' }}
          >
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)]/96 px-4 py-3 shadow-[0_18px_48px_rgba(0,0,0,0.22)] backdrop-blur-xl">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-primary">Navegação</p>
              <p className="mt-1 whitespace-nowrap text-xs font-black uppercase tracking-[0.08em] text-[var(--text-main)]">
                {compactSidebarHint.label}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="app-header border-b border-[var(--border)] z-40 transition-all no-print">
          <div className="section-shell flex items-center justify-between gap-3 px-4 py-3 md:px-6 md:py-3.5 xl:px-8">
          <div className="flex items-center gap-3 min-w-0">
            <div className="md:hidden w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-lg shadow-primary/20 shrink-0">
              <Shield className="text-black" size={18} strokeWidth={3} />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-[0.16em] text-[var(--text-muted)]">{publicSettings.app_name}</p>
              <h1 className="truncate text-[13px] font-black uppercase tracking-[0.05em] text-[var(--text-main)] md:text-[1.15rem]">{currentViewMeta.title}</h1>
              <p className="hidden max-w-2xl truncate text-[11px] text-[var(--text-muted)] xl:block">{currentViewMeta.subtitle}</p>
            </div>
            <div className="hidden xl:flex items-center gap-3 flex-1 max-w-[34rem] ml-3">
              <div className="relative w-full group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-primary transition-colors" size={16} />
                <input 
                  type="text" 
                  placeholder="Pesquisar registos..." 
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-main)]/50 py-2 pl-10 pr-4 text-[13px] focus:outline-none focus:border-primary/50 focus:bg-[var(--bg-main)] transition-all"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 md:gap-3 shrink-0">
            {/* Network Status Indicator */}
            <div className="hidden xl:flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-2.5 py-1.5" title={isOnline ? "Conexão Segura e Sincronizada" : "Modo Offline (Gravando Localmente)"}>
              <div className={cn("w-2 h-2 rounded-full", isOnline ? "bg-green-500 animate-pulse" : "bg-orange-500")} />
              <span className={cn("text-[9px] font-bold uppercase tracking-[0.14em]", isOnline ? "text-green-500" : "text-orange-500")}>
                {isOnline ? "Online" : "Offline / L"}
              </span>
            </div>

            {/* Focus Mode Toggle */}
            <button 
              onClick={() => setFocusMode(!focusMode)}
              className={cn("hidden lg:flex items-center gap-2 rounded-xl border px-2.5 py-1.5 transition-all shadow-sm", focusMode ? "bg-red-500/10 border-red-500/30 text-red-500" : "bg-[var(--surface-1)] border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-main)]")}
              title="Modo Operação Noturna"
            >
              <Activity size={12} className={focusMode ? "animate-pulse" : ""} />
              <span className="text-[9px] font-bold uppercase tracking-[0.14em]">{focusMode ? "Foco Ativo" : "Modo Foco"}</span>
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
                    className="absolute right-0 z-50 mt-2 w-[20rem] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] shadow-2xl xl:w-[22rem]"
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
                                    {formatTime(notif.timestamp, normalizeLanguage(i18n.language))}
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

            <div className="hidden md:block h-8 w-[1px] bg-[var(--border)] mx-1" />
            {currentUser.permissions?.create_reports !== false && (
              <motion.button 
                whileHover={{ scale: 1.02, boxShadow: '0 0 20px rgba(249, 115, 22, 0.3)' }}
                whileTap={{ scale: 0.98 }}
                onClick={openNewReportModal}
                className="hidden md:flex items-center gap-2 bg-primary text-black font-black text-[10px] px-6 py-3 rounded-xl transition-all shadow-xl shadow-primary/20 uppercase tracking-[0.2em] relative overflow-hidden group"
              >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                <Plus size={16} strokeWidth={4} className="relative z-10 group-hover:rotate-90 transition-transform" />
                <span className="relative z-10">{t('app.actions.newOccurrence')}</span>
              </motion.button>
            )}
          </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="app-content flex-1 overflow-auto custom-scrollbar">
          <div className="section-shell p-4 pb-28 md:p-8 md:pb-8">
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && (
              <motion.div 
                key="dashboard"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="overflow-hidden rounded-[1.8rem] border border-[var(--border)] bg-[radial-gradient(circle_at_top_left,rgba(var(--primary-rgb),0.12),transparent_30%),linear-gradient(180deg,var(--surface-2),var(--surface-1))] p-4 md:p-6">
                  <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
                    <div className="max-w-3xl">
                      <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-primary">
                        <Activity size={12} />
                        Sala de situação
                      </div>
                      <h2 className="mt-3 text-[1.9rem] font-black tracking-tight text-[var(--text-main)] md:text-[2.4rem]">{t('app.dashboard.commandCenter')}</h2>
                      <p className="mt-2 text-sm text-[var(--text-muted)] md:text-[15px]">{t('app.dashboard.realtimeOverview')}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 self-start xl:self-auto">
                      <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-[var(--border)] bg-[var(--surface-1)]/85 p-1.5">
                        <button onClick={() => setDashboardRange('today')} className={cn("rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] transition-all", dashboardRange === 'today' ? "bg-primary text-black shadow-lg shadow-primary/20" : "text-[var(--text-muted)] hover:bg-[var(--surface-3)] hover:text-[var(--text-main)]")}>{t('app.dashboard.today')}</button>
                        <button onClick={() => setDashboardRange('7days')} className={cn("rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] transition-all", dashboardRange === '7days' ? "bg-primary text-black shadow-lg shadow-primary/20" : "text-[var(--text-muted)] hover:bg-[var(--surface-3)] hover:text-[var(--text-main)]")}>{t('app.dashboard.last7days')}</button>
                        <button onClick={() => setDashboardRange('30days')} className={cn("rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] transition-all", dashboardRange === '30days' ? "bg-primary text-black shadow-lg shadow-primary/20" : "text-[var(--text-muted)] hover:bg-[var(--surface-3)] hover:text-[var(--text-main)]")}>{t('app.dashboard.last30days')}</button>
                        <button onClick={() => setIsDashboardRangeModalOpen(true)} className={cn("rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] transition-all", dashboardRange === 'custom' ? "bg-primary text-black shadow-lg shadow-primary/20" : "text-[var(--text-muted)] hover:bg-[var(--surface-3)] hover:text-[var(--text-main)]")}>{dashboardRange === 'custom' ? dashboardCustomRangeLabel : t('app.dashboard.customRange')}</button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6">
                  <StatCard title={t('app.dashboard.totalOccurrences')} value={stats?.totalReports || 0} icon={FileText} color="text-blue-500" onClick={() => setActiveTab('reports')} />
                  <StatCard title={t('app.dashboard.g4Level')} value={stats?.reportsBySeverity.find(s => s.name === 'G4')?.value || 0} icon={AlertTriangle} color="text-red-500" onClick={() => setActiveTab('reports')} />
                  <StatCard title={t('app.dashboard.activeAgents')} value={stats?.totalUsers || 0} icon={Users} color="text-green-500" onClick={() => setActiveTab('users')} />
                  <StatCard title={t('app.dashboard.operationality')} value="100%" icon={Activity} color="text-primary" onClick={() => setActiveTab('settings')} />
                </div>

                {/* Charts Grid */}
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
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
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                          <XAxis 
                            dataKey="date" 
                            stroke="var(--text-faint)" 
                            fontSize={10} 
                            tickFormatter={(val) => val.split('-').slice(1).reverse().join('/')}
                          />
                          <YAxis stroke="var(--text-faint)" fontSize={10} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: '12px', color: 'var(--text-main)' }}
                            itemStyle={{ color: 'var(--primary)', fontSize: '12px', fontWeight: 'bold' }}
                          />
                          <Area type="monotone" dataKey="count" stroke="var(--primary)" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>

                  <Card title={t('app.common.distributionByCategory')}>
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
                              contentStyle={{ backgroundColor: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: '12px', color: 'var(--text-main)' }}
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
                            className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1.5 shadow-sm transition-all cursor-pointer group hover:border-primary/40 hover:bg-[var(--surface-3)]"
                          >
                            <div className="w-1.5 h-1.5 rounded-full group-hover:scale-125 transition-transform" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                            <span className="text-[10px] font-bold uppercase tracking-tight text-[var(--text-main)] truncate transition-colors group-hover:text-primary">{entry.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </Card>
                </div>

                {/* Interactive Map */}
                <Card title={t('app.dashboard.operationsMap')} subtitle={t('app.dashboard.operationsMapSubtitle')}>
                  <OperationsMapPanel
                    reports={reports}
                    initialCenter={mapCenter}
                    showHeatmap={showHeatmap}
                    onToggleHeatmap={() => setShowHeatmap(!showHeatmap)}
                    onOpenReportDetails={openReportDetails}
                  />
                </Card>

                {/* Recent Reports List */}
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                  <Card 
                    title={t('app.dashboard.latestOccurrences')} 
                    subtitle="Registos mais recentes no sistema"
                    action={
                      <button 
                        onClick={() => window.print()}
                        className="rounded-lg p-2 text-[var(--text-muted)] transition-all hover:bg-[var(--surface-3)] hover:text-[var(--text-main)] no-print"
                        title="Exportar Lista para PDF"
                      >
                        <Printer size={16} />
                      </button>
                    }
                  >
                    <div className="mt-3 space-y-2.5">
                      {reports.slice(0, 5).map((report) => (
                        <div 
                          key={report.id}
                          onClick={() => openReportDetails(report)}
                          className="group flex cursor-pointer items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 transition-all hover:border-primary/30 hover:bg-[var(--surface-3)]"
                        >
                          <div className={cn(
                            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                            report.gravidade === 'G4' ? "bg-red-500/10 text-red-500" :
                            report.gravidade === 'G3' ? "bg-primary/10 text-primary" :
                            "bg-[var(--surface-3)] text-[var(--text-faint)]"
                          )}>
                            <AlertTriangle size={18} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-0.5">
                              <p className="truncate text-xs font-black uppercase text-[var(--text-main)] transition-colors group-hover:text-primary">{report.titulo || 'Sem Título'}</p>
                              <span className="text-[9px] font-bold text-[var(--text-faint)]">{formatTime(report.timestamp, normalizeLanguage(i18n.language))}</span>
                            </div>
                            <p className="line-clamp-1 text-[10px] text-[var(--text-muted)]">{report.descricao}</p>
                            <button className="sm:hidden mt-1 text-[8px] font-black text-primary uppercase tracking-widest">Mais detalhes</button>
                          </div>
                          <ChevronRight size={14} className="text-[var(--text-faint)] transition-colors group-hover:text-[var(--text-main)]" />
                        </div>
                      ))}
                      {reports.length === 0 && (
                        <p className="py-8 text-center text-[10px] font-bold uppercase tracking-widest text-[var(--text-faint)]">Nenhum registo recente</p>
                      )}
                      <button 
                        onClick={() => setActiveTab('reports')}
                        className="mt-2 w-full border-t border-[var(--border)] py-2 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] transition-colors hover:text-primary"
                      >
                        Ver Todos os Registos
                      </button>
                    </div>
                  </Card>

                  <Card title="Alertas" subtitle="Notificações críticas e avisos">
                    {alerts.length === 0 ? (
                      <div className="p-8 text-center">
                        <AlertTriangle className="mx-auto mb-2 text-[var(--text-faint)]" size={32} />
                        <p className="text-xs text-[var(--text-muted)]">Nenhum alerta no momento</p>
                      </div>
                    ) : (
                      <div className="mt-3 max-h-64 space-y-2.5 overflow-y-auto">
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
                                <p className="mt-1 text-[9px] text-[var(--text-faint)]">{formatDateTime(alert.timestamp, normalizeLanguage(i18n.language))}</p>
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

            {activeTab === 'command_center' && (
              <CommandCenterTab
                stats={stats}
                reports={reports}
                alerts={alerts}
                currentUser={currentUser}
                setActiveTab={setActiveTab}
                setSelectedReport={setSelectedReport}
                setIsNewReportModalOpen={setIsNewReportModalOpen}
              />
            )}

            {activeTab === 'critical_occurrences' && (
              <CriticalOccurrencesTab
                reports={reports}
                setSelectedReport={setSelectedReport}
              />
            )}

            {activeTab === 'timeline' && (
              <TimelineTab
                reports={reports}
                alerts={alerts}
                setSelectedReport={setSelectedReport}
              />
            )}

              {activeTab === 'evidence_library' && (
                <EvidenceLibraryTab
                  reports={reports}
                  onOpenReportDetails={openReportDetails}
                />
              )}

            {activeTab === 'shifts' && (
              <ShiftsTab reports={reports} />
            )}

            {activeTab === 'reports' && (
              <ReportsTab
                reports={reports}
                users={users}
                filterCategory={filterCategory}
                setFilterCategory={setFilterCategory}
                filterSeverity={filterSeverity}
                setFilterSeverity={setFilterSeverity}
                filterStatus={filterStatus}
                setFilterStatus={setFilterStatus}
                filterDateFrom={filterDateFrom}
                setFilterDateFrom={setFilterDateFrom}
                filterDateTo={filterDateTo}
                setFilterDateTo={setFilterDateTo}
                filterAgent={filterAgent}
                setFilterAgent={setFilterAgent}
                clearFilters={() => {
                  setFilterCategory('');
                  setFilterSeverity('');
                  setFilterStatus('');
                  setFilterDateFrom('');
                  setFilterDateTo('');
                  setFilterAgent('');
                }}
                currentPage={currentPage}
                totalPages={totalPages}
                setCurrentPage={setCurrentPage}
                onOpenReport={openReportDetails}
                onEditReport={handleStartEditReport}
                onDeleteReport={handleDeleteReport}
              />
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
                    <h2 className="text-2xl font-black tracking-tighter">{t('app.tabs.myReports')}</h2>
                    <p className="text-sm text-zinc-500">{t('app.tabs.myReportsSubtitle')}</p>
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
                        <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">{t('app.common.titleDescription')}</th>
                        <th className="hidden lg:table-cell px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Categoria</th>
                        <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Gravidade</th>
                        <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Status</th>
                        <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] text-right">{t('app.common.action')}</th>
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
                              <span className="inline-flex items-center gap-1.5">
                                {report.status === 'Concluído' ? <CheckCircle2 size={12} /> : report.status === 'Aprovado' ? <Lock size={12} /> : <Clock size={12} />}
                                <span>{report.status || 'Aberto'}</span>
                              </span>
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
                                    metadata: parseJsonObject(report.metadata),
                                    dynamicFieldValues: coerceDynamicFieldValues(reportDynamicFields, getDynamicFieldValues(report.metadata)),
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
                                title="Eliminar Relatório"
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
              <DailyReportPersonalTab
                dailyReport={dailyReportPersonal}
                onSelectReport={openReportDetails}
              />
            )}

            {activeTab === 'daily_report_team' && (
              <DailyReportTeamTab
                dailyReport={dailyReportTeam}
                onSelectReport={openReportDetails}
              />
            )}

            {activeTab === 'alerts' && (
              <AlertsTab
                alerts={alerts as any}
                currentUser={currentUser}
                newAlert={newAlert}
                setNewAlert={setNewAlert}
                onCreateAlert={handleCreateAlert}
                onStartEditAlert={(alert) => {
                  setEditingAlert(alert);
                  setEditAlertForm({
                    titulo: alert.titulo,
                    mensagem: alert.mensagem,
                    tipo: alert.tipo,
                    expiresInHours: alert.expires_in_hours ? String(alert.expires_in_hours) : '24',
                    isTemporary: Boolean(alert.expires_at),
                    targetAudience: alert.target_audience || 'all',
                    pinned: Boolean(alert.pinned),
                  });
                }}
                onDeleteAlert={handleDeleteAlert}
                onMarkAlertRead={handleMarkAlertRead}
              />
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
                  <h2 className="text-2xl font-black tracking-tighter">{t('app.tabs.parametrization')}</h2>
                  <p className="text-sm text-zinc-500">{t('app.tabs.parametrizationSubtitle')}</p>
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
                      } catch (err) { toast.error("Erro ao guardar identidade"); }
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
                        Guardar Identidade
                      </button>
                    </form>
                  </Card>

                  {/* Operational Settings */}
                  <Card title="Formulário de Ocorrências" subtitle="Configuração visual, ordem e campos personalizados da janela de ocorrência">
                    <form onSubmit={async (e) => {
                      e.preventDefault();
                      try {
                        const settingsToSave = [
                          { key: 'form_sectors', value: operationalSettingsForm.form_sectors, description: 'Setores Disponíveis' },
                          { key: 'enable_witnesses', value: operationalSettingsForm.enable_witnesses ? 'true' : 'false', description: 'Habilitar Testemunhas' },
                          { key: 'enable_equipment', value: operationalSettingsForm.enable_equipment ? 'true' : 'false', description: 'Habilitar Equipamentos' },
                          { key: 'default_report_category', value: operationalSettingsForm.default_report_category, description: 'Categoria padrão da ocorrência' },
                          { key: 'default_report_severity', value: operationalSettingsForm.default_report_severity, description: 'Gravidade padrão da ocorrência' }
                        ];
                        await fetch('/api/settings', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ settings: settingsToSave }),
                          credentials: 'include'
                        });
                        const mergedSettings = [...systemSettings];
                        settingsToSave.forEach((setting) => {
                          const normalizedValue = String(setting.value ?? '');
                          const existingIndex = mergedSettings.findIndex((item) => item.key === setting.key);
                          if (existingIndex >= 0) {
                            mergedSettings[existingIndex] = { ...mergedSettings[existingIndex], value: normalizedValue };
                          } else {
                            mergedSettings.push({ ...setting, value: normalizedValue });
                          }
                        });
                        setSystemSettings(mergedSettings);
                        setNewReport(createEmptyNewReport(mergedSettings));
                        toast.success("Parâmetros operacionais salvos!");
                        fetchData();
                      } catch (err) { toast.error("Erro ao guardar parâmetros"); }
                    }} className="space-y-6 mt-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Setores Disponíveis (Separados por vírgula)</label>
                        <textarea 
                          name="form_sectors"
                          value={operationalSettingsForm.form_sectors}
                          onChange={(event) => setOperationalSettingsForm((current) => ({ ...current, form_sectors: event.target.value }))}
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
                            checked={operationalSettingsForm.enable_witnesses}
                            onChange={(event) => setOperationalSettingsForm((current) => ({ ...current, enable_witnesses: event.target.checked }))}
                            className="w-4 h-4 accent-primary" 
                          />
                        </div>
                        <div className="flex items-center justify-between p-3 bg-zinc-900/50 border border-zinc-800 rounded-xl">
                          <span className="text-xs font-bold text-zinc-300">Campo de Equipamentos</span>
                          <input 
                            name="enable_equipment" 
                            type="checkbox"
                            checked={operationalSettingsForm.enable_equipment}
                            onChange={(event) => setOperationalSettingsForm((current) => ({ ...current, enable_equipment: event.target.checked }))}
                            className="w-4 h-4 accent-primary" 
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Categoria padrão</label>
                          <select
                            name="default_report_category"
                            value={operationalSettingsForm.default_report_category}
                            onChange={(event) => setOperationalSettingsForm((current) => ({ ...current, default_report_category: event.target.value as Categoria }))}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-primary"
                          >
                            <option value="Valores">Valores</option>
                            <option value="Perímetro">Perímetro</option>
                            <option value="Safety">Safety</option>
                            <option value="Operativo">Operativo</option>
                            <option value="Logística">Logística</option>
                            <option value="Manutenção">Manutenção</option>
                            <option value="Informativo">Informativo</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Gravidade padrão</label>
                          <select
                            name="default_report_severity"
                            value={operationalSettingsForm.default_report_severity}
                            onChange={(event) => setOperationalSettingsForm((current) => ({ ...current, default_report_severity: event.target.value as Gravidade }))}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-primary"
                          >
                            <option value="G1">G1</option>
                            <option value="G2">G2</option>
                            <option value="G3">G3</option>
                            <option value="G4">G4</option>
                          </select>
                        </div>
                      </div>

                      <button type="submit" className="w-full py-3 bg-zinc-100 text-black rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-white transition-all">
                        Guardar Parâmetros Ativos
                      </button>
                      <div className="mt-8 border-t border-zinc-800 pt-6 space-y-4">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-primary">Campos personalizados</p>
                          <p className="mt-1 text-xs text-zinc-500">Adiciona campos extra sem alterar a estrutura dos relatórios ou do backend.</p>
                        </div>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Nome do campo</label>
                          <input
                            type="text"
                            value={dynamicFieldDraft.label}
                            onChange={(event) => setDynamicFieldDraft((current) => ({ ...current, label: event.target.value }))}
                            placeholder="Ex: Matrícula da viatura"
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-primary"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Tipo</label>
                          <select
                            value={dynamicFieldDraft.type}
                            onChange={(event) => setDynamicFieldDraft((current) => ({ ...current, type: event.target.value as any, options: event.target.value === 'select' || event.target.value === 'multiselect' ? current.options : [] }))}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-primary"
                          >
                            <option value="text">Texto curto</option>
                            <option value="textarea">Texto longo</option>
                            <option value="number">Número</option>
                            <option value="date">Data</option>
                            <option value="select">Seleção</option>
                            <option value="multiselect">Múltipla seleção</option>
                            <option value="checkbox">Checkbox</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Onde aparece</label>
                          <select
                            value={dynamicFieldDraft.scope}
                            onChange={(event) => setDynamicFieldDraft((current) => ({ ...current, scope: event.target.value as any }))}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-primary"
                          >
                            <option value="both">Criação e edição</option>
                            <option value="create">Só criação</option>
                            <option value="edit">Só edição</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Placeholder</label>
                          <input
                            type="text"
                            value={dynamicFieldDraft.placeholder || ''}
                            onChange={(event) => setDynamicFieldDraft((current) => ({ ...current, placeholder: event.target.value }))}
                            placeholder="Texto de ajuda"
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-primary"
                          />
                        </div>
                      </div>

                      {(dynamicFieldDraft.type === 'select' || dynamicFieldDraft.type === 'multiselect') && (
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Opções</label>
                          <input
                            type="text"
                            value={(dynamicFieldDraft.options || []).join(', ')}
                            onChange={(event) => setDynamicFieldDraft((current) => ({ ...current, options: event.target.value.split(',').map((item) => item.trim()).filter(Boolean) }))}
                            placeholder="Ex: Toyota, Volvo, Caterpillar"
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-primary"
                          />
                        </div>
                      )}

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Categorias onde aparece</label>
                        <div className="flex flex-wrap gap-2">
                          {['Valores', 'Perímetro', 'Safety', 'Operativo', 'Logística', 'Manutenção', 'Informativo'].map((category) => {
                            const selected = (dynamicFieldDraft.categories || []).includes(category);
                            return (
                              <button
                                key={category}
                                type="button"
                                onClick={() =>
                                  setDynamicFieldDraft((current) => ({
                                    ...current,
                                    categories: selected
                                      ? (current.categories || []).filter((item) => item !== category)
                                      : [...(current.categories || []), category],
                                  }))
                                }
                                className={cn(
                                  'rounded-lg border px-3 py-1.5 text-[10px] font-black uppercase tracking-widest transition-all',
                                  selected ? 'border-primary/50 bg-primary/15 text-primary' : 'border-zinc-800 bg-zinc-900 text-zinc-400'
                                )}
                              >
                                {category}
                              </button>
                            );
                          })}
                        </div>
                        <p className="text-[10px] text-zinc-500">Se não escolheres nenhuma, o campo aparece em todas as categorias.</p>
                      </div>

                      <div className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/50 p-3">
                        <span className="text-xs font-bold text-zinc-300">Campo obrigatório</span>
                        <input
                          type="checkbox"
                          checked={dynamicFieldDraft.required}
                          onChange={(event) => setDynamicFieldDraft((current) => ({ ...current, required: event.target.checked }))}
                          className="w-4 h-4 accent-primary"
                        />
                      </div>

                      <div className="flex gap-3">
                        <button type="button" onClick={handleSaveDynamicField} className="flex-1 py-3 bg-primary text-black rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-primary/90 transition-all shadow-lg shadow-primary/20">
                          {editingDynamicFieldId ? 'Atualizar campo' : 'Adicionar campo'}
                        </button>
                        {editingDynamicFieldId && (
                          <button type="button" onClick={() => { setDynamicFieldDraft(createEmptyDynamicField()); setEditingDynamicFieldId(null); }} className="px-4 py-3 bg-zinc-800 text-zinc-300 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-zinc-700 transition-all">
                            Cancelar
                          </button>
                        )}
                      </div>

                      <div className="space-y-3 border-t border-zinc-800 pt-4">
                        {reportFormItems.length > 0 && (
                          <div className="rounded-xl border border-zinc-800/70 bg-zinc-950/30 p-4">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                              <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-primary">Preview do formulário</p>
                                <p className="mt-1 text-xs text-zinc-500">Simulação rápida do layout final da janela de ocorrência.</p>
                              </div>
                              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <select
                                  value={dynamicFieldPreviewCategory}
                                  onChange={(event) => setDynamicFieldPreviewCategory(event.target.value as Categoria)}
                                  className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-200 focus:border-primary focus:outline-none"
                                >
                                  <option value="Valores">Valores</option>
                                  <option value="Perímetro">Perímetro</option>
                                  <option value="Safety">Safety</option>
                                  <option value="Operativo">Operativo</option>
                                  <option value="Logística">Logística</option>
                                  <option value="Manutenção">Manutenção</option>
                                  <option value="Informativo">Informativo</option>
                                </select>
                                <select
                                  value={dynamicFieldPreviewScope}
                                  onChange={(event) => setDynamicFieldPreviewScope(event.target.value as 'create' | 'edit')}
                                  className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-200 focus:border-primary focus:outline-none"
                                >
                                  <option value="create">Modo criação</option>
                                  <option value="edit">Modo edição</option>
                                </select>
                              </div>
                            </div>

                            <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4">
                              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                {reportFormItems
                                  .filter((item) => {
                                    if (!item.active) return false;
                                    if (!(item.scope === 'both' || item.scope === dynamicFieldPreviewScope)) return false;
                                    if (item.categories && item.categories.length > 0 && !item.categories.includes(dynamicFieldPreviewCategory)) return false;
                                    return true;
                                  })
                                  .map((item) => (
                                    <div key={`preview-${item.id}`} className={cn('space-y-2', (item.type === 'textarea' || item.type === 'multiselect' || item.type === 'checkbox' || item.type === 'media') && 'sm:col-span-2')}>
                                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{item.label}</label>
                                      <div className="rounded-lg border border-dashed border-zinc-700 bg-zinc-900/60 px-4 py-3 text-sm text-zinc-500">
                                        {item.id === 'base:category'
                                          ? dynamicFieldPreviewCategory
                                          : item.id === 'base:severity'
                                            ? 'G1 / G2 / G3 / G4'
                                            : item.id === 'base:safety_incident'
                                              ? 'Seleção Safety'
                                              : item.id === 'base:safety_ppe'
                                                ? 'Uso de EPI'
                                                : item.id === 'base:sector'
                                                  ? 'Setores parametrizados'
                                                  : item.id === 'base:people'
                                                    ? 'Campo numérico'
                                                    : item.id === 'base:investigation'
                                                      ? 'Checkbox'
                                                      : item.id === 'base:photos'
                                                        ? 'Importar ou tirar fotografias'
                                                        : item.isDynamic
                                                          ? (item.type === 'select'
                                                              ? `Seleção: ${(item.field?.options || []).join(', ') || 'sem opções'}`
                                                              : item.type === 'multiselect'
                                                                ? `Múltipla seleção: ${(item.field?.options || []).join(', ') || 'sem opções'}`
                                                                : item.field?.placeholder || `Campo ${item.type}`)
                                                          : `Campo ${item.type}`}
                                      </div>
                                    </div>
                                  ))}
                              </div>
                            </div>
                          </div>
                        )}
                        {reportFormItems.length === 0 && (
                          <div className="rounded-xl border border-dashed border-zinc-800 p-4 text-xs text-zinc-500">
                            Ainda não existem itens configurados para o formulário.
                          </div>
                        )}
                        {reportFormItems.map((field, index) => (
                          <div
                            key={field.id}
                            draggable
                            onDragStart={() => setDraggedFormLayoutItemId(field.id)}
                            onDragEnd={() => setDraggedFormLayoutItemId(null)}
                            onDragOver={(event) => event.preventDefault()}
                            onDrop={() => draggedFormLayoutItemId && handleReorderReportFormItems(draggedFormLayoutItemId, field.id)}
                            className={cn(
                              "rounded-xl border border-zinc-800 bg-zinc-900/40 p-3 transition-all",
                              draggedFormLayoutItemId === field.id && "border-primary/50 bg-primary/5"
                            )}
                          >
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                              <div className="flex items-start gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950 text-zinc-500 cursor-grab active:cursor-grabbing">
                                  <MoreVertical size={16} />
                                </div>
                                <div>
                                <p className="text-xs font-black uppercase text-zinc-200">{field.label}</p>
                                <p className="mt-1 text-[10px] uppercase tracking-widest text-zinc-500">{field.isDynamic ? 'campo dinâmico' : 'campo base'} • {field.type} • {field.scope}{field.isDynamic ? ` • ${field.field?.required ? 'obrigatório' : 'opcional'}` : ''}</p>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <button type="button" onClick={() => handleMoveReportFormItem(field.id, 'up')} disabled={index === 0} className="px-3 py-2 rounded-lg bg-zinc-800 text-zinc-300 text-[10px] font-black uppercase disabled:opacity-40">↑</button>
                                <button type="button" onClick={() => handleMoveReportFormItem(field.id, 'down')} disabled={index === reportFormItems.length - 1} className="px-3 py-2 rounded-lg bg-zinc-800 text-zinc-300 text-[10px] font-black uppercase disabled:opacity-40">↓</button>
                                {field.isDynamic && <button type="button" onClick={() => handleEditDynamicField(field.field.id)} className="px-3 py-2 rounded-lg bg-blue-600 text-white text-[10px] font-black uppercase">Editar</button>}
                                {field.isDynamic && <button type="button" onClick={() => handleDeleteDynamicField(field.field.id)} className="px-3 py-2 rounded-lg bg-red-600/20 text-red-400 text-[10px] font-black uppercase">Remover</button>}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
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
              <UsersTab
                users={users}
                onCreateUser={() => {
                  setEditingUser(null);
                  setNewUser({ nome: '', funcao: '', numero_mecanografico: '', nivel_hierarquico: 'Agente', password: '' });
                  setIsNewUserModalOpen(true);
                }}
                onEditUser={(user) => {
                  setEditingUser(user);
                  setNewUser({
                    nome: user.nome,
                    funcao: user.funcao,
                    numero_mecanografico: user.numero_mecanografico,
                    nivel_hierarquico: user.nivel_hierarquico,
                    password: '',
                    preferred_language: (user as any).preferred_language || 'pt',
                  } as any);
                  setIsNewUserModalOpen(true);
                }}
                onDeleteUser={handleDeleteUser}
              />
            )}

            {activeTab === 'daily_reports' && (
              <DailyReportsWorkspaceTab
                canGenerate={canGenerateDailyReports}
                canExport={currentUser.permissions?.export_reports === true}
                canManageLifecycle={canManageSystem}
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
                          { name: 'view_reports', label: 'Visualizar Ocorrências', desc: 'Acesso ao log de registos operacionais.' },
                          { name: 'create_reports', label: 'Registar Ocorrências', desc: 'Permissão para enviar novos relatos.' },
                          { name: 'conclude_reports', label: 'Finalizar Ocorrências', desc: 'Permissão para fechar/concluir ocorrências.' },
                          { name: 'view_daily_reports', label: 'Visualizar Relatórios Diários', desc: 'Acesso aos relatórios consolidados do dia.' },
                          { name: 'view_team_daily', label: 'Visualizar Dia da Equipa', desc: 'Ver relatórios consolidados de toda a equipa.' },
                          { name: 'create_alerts', label: 'Criar Alertas', desc: 'Permissão para criar alertas para a equipa.' },
                          { name: 'edit_own_alerts', label: 'Editar Alertas Próprios', desc: 'Editar e eliminar alertas que criou.' },
                          { name: 'view_audit_logs', label: 'Auditoria de Logs', desc: 'Visualização de logs e histórico do sistema.' },
                          { name: 'manage_users', label: 'Gestão de Utilizadores', desc: 'Permite criar, editar e remover agentes.' },
                          { name: 'manage_permissions', label: 'Gestão de Permissões', desc: 'Configuração de privilégios e roles.' },
                          { name: 'manage_settings', label: 'Definições de Sistema', desc: 'Acesso às chaves de integração e sistema.' },
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
                key="settings-clean"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                <SettingsTab
                  systemSettings={systemSettings as any}
                  publicSettings={publicSettings as any}
                  updateSettings={updateSettings}
                  currentUser={currentUser as any}
                  fetchData={fetchData}
                />
              </motion.div>
            )}

            {activeTab === '__legacy_settings__' && (
              <motion.div 
                key="settings"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                <div>
                  <h2 className="text-2xl font-black tracking-tighter">{t('app.tabs.systemSettings')}</h2>
                  <p className="text-sm text-zinc-500">{t('app.tabs.systemSettingsSubtitle')}</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <Card title="Notificações" subtitle="Configure email, Telegram e relatórios agendados" className="lg:col-span-2">
                    <div className="space-y-6">
                      {/* Email SMTP Section */}
                      <div className="border-b border-zinc-800 pb-6">
                        <h3 className="text-sm font-black text-zinc-200 mb-4">Email SMTP</h3>
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
                                  { key: 'smtp_user', value: formData.get('smtp_user'), description: 'Utilizador SMTP' },
                                  { key: 'smtp_password', value: formData.get('smtp_password'), description: 'Senha SMTP' }
                                ]
                              }),
                              credentials: 'include'
                            });
                            toast.success("Email configurado!");
                            fetchData();
                          } catch (err) {
                            toast.error("Erro ao guardar");
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
                              <label className="text-[9px] font-black text-zinc-500 uppercase">Utilizador</label>
                              <input name="smtp_user" defaultValue={systemSettings.find(s => s.key === 'smtp_user')?.value || ''} className="w-full bg-zinc-800 border border-zinc-700 rounded py-2 px-3 text-sm focus:outline-none focus:border-primary" />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] font-black text-zinc-500 uppercase">Senha</label>
                              <input name="smtp_password" type="password" defaultValue={systemSettings.find(s => s.key === 'smtp_password')?.value || ''} className="w-full bg-zinc-800 border border-zinc-700 rounded py-2 px-3 text-sm focus:outline-none focus:border-primary" />
                            </div>
                          </div>
                          <button type="submit" className="w-full py-2 bg-primary/20 hover:bg-primary/30 text-primary rounded text-[9px] font-black uppercase transition-all">Guardar Email</button>
                        </form>
                      </div>

                      {/* Telegram Section */}
                      <div className="border-b border-zinc-800 pb-6">
                        <h3 className="text-sm font-black text-zinc-200 mb-4">Telegram</h3>
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
                            toast.error("Erro ao guardar");
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
                            <button type="submit" className="py-2 bg-primary/20 hover:bg-primary/30 text-primary rounded text-[9px] font-black uppercase transition-all">Guardar Telegram</button>
                          </div>
                        </form>
                      </div>

                      {/* Scheduled Reports Section */}
                      <div>
                        <h3 className="text-sm font-black text-zinc-200 mb-4">Relatórios Agendados</h3>
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
                            toast.error("Erro ao guardar");
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
                                { id: 'active_users', label: 'Utilizadores' },
                                { id: 'security_stats', label: 'Estatísticas' }
                              ].map(item => (
                                <label key={item.id} className="flex items-center gap-2 cursor-pointer">
                                  <input type="checkbox" name={`scheduled_reports_content_${item.id}`} defaultChecked={systemSettings.find(s => s.key === 'scheduled_reports_content')?.value?.includes(item.id) ?? true} className="w-3 h-3 rounded" />
                                  <span className="text-[8px] text-zinc-300">{item.label}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                          <button type="submit" className="w-full py-2 bg-primary hover:opacity-90 text-black rounded text-[9px] font-black uppercase transition-all">Guardar Relatórios</button>
                        </form>
                      </div>
                    </div>
                  </Card>

                  <Card title="Parâmetros de Auditoria" subtitle="Definições de relatórios e logs">
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-bold text-zinc-200">Geração Automática</p>
                          <p className="text-[10px] text-zinc-500">Relatório diário às 06:00.</p>
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

                  <Card title="Experiência do mapa" subtitle="Preferências operacionais da dashboard">
                    <form onSubmit={async (e) => {
                      e.preventDefault();
                      const formData = new FormData(e.currentTarget);
                      try {
                        await fetch('/api/settings', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            settings: [
                              { key: 'show_heatmap_by_default', value: formData.get('show_heatmap_by_default') === 'on' ? 'true' : 'false', description: 'Heatmap ativo por defeito' },
                            ]
                          }),
                          credentials: 'include'
                        });
                        toast.success("Preferências do mapa guardadas!");
                        fetchData();
                      } catch (err) {
                        toast.error("Erro ao guardar preferências do mapa");
                      }
                    }} className="space-y-4">
                      <div className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
                        <div>
                          <p className="text-sm font-bold text-zinc-200">Heatmap ativo por defeito</p>
                          <p className="text-[10px] text-zinc-500">Ao abrir o dashboard, a camada térmica começa ligada.</p>
                        </div>
                        <input
                          type="checkbox"
                          name="show_heatmap_by_default"
                          defaultChecked={getSettingValue('show_heatmap_by_default', 'false') === 'true'}
                          className="h-4 w-4 accent-primary"
                        />
                      </div>
                      <button type="submit" className="w-full py-3 bg-primary/15 text-primary rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-primary/25 transition-all">
                        Guardar preferências do mapa
                      </button>
                    </form>
                  </Card>

                  <Card title="Personalização da interface" subtitle="Altere a aparência global do sistema" className="lg:col-span-2">
                    <form 
                      onSubmit={async (e) => {
                        e.preventDefault();
                        const settings = [
                          { key: 'app_name', value: interfaceSettingsForm.app_name, description: 'Nome da aplicação' },
                          { key: 'app_slogan', value: interfaceSettingsForm.app_slogan, description: 'Slogan da aplicação' },
                          { key: 'app_theme_mode', value: interfaceSettingsForm.app_theme_mode, description: 'Modo do tema (light/dark)' },
                          { key: 'app_theme_palette', value: interfaceSettingsForm.app_theme_palette, description: 'Paleta de cores' },
                          { key: 'app_theme_template', value: interfaceSettingsForm.app_theme_template, description: 'Template visual' },
                          { key: 'app_layout', value: interfaceSettingsForm.app_layout, description: 'Layout do sistema' }
                        ];
                        
                        try {
                          await fetch('/api/settings', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ settings }),
                            credentials: 'include'
                          });
                          const nextPublicSettings = { ...publicSettings, ...Object.fromEntries(settings.map((item) => [item.key, item.value])) };
                          setPublicSettings(nextPublicSettings);
                          applyThemeSettings(document.documentElement, nextPublicSettings);
                          toast.success("Identidade visual atualizada.");
                        } catch (err) {
                          toast.error("Erro ao guardar personalização");
                        }
                      }} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Nome da aplicação</label>
                          <input 
                            name="app_name"
                            type="text"
                            value={interfaceSettingsForm.app_name}
                            onChange={(event) => setInterfaceSettingsForm((current) => ({ ...current, app_name: event.target.value }))}
                            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-input)] py-2.5 px-4 text-sm text-[var(--text-main)] focus:outline-none focus:border-primary"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Slogan da aplicação</label>
                          <input 
                            name="app_slogan"
                            type="text"
                            value={interfaceSettingsForm.app_slogan}
                            onChange={(event) => setInterfaceSettingsForm((current) => ({ ...current, app_slogan: event.target.value }))}
                            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-input)] py-2.5 px-4 text-sm text-[var(--text-main)] focus:outline-none focus:border-primary"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Modo do tema</label>
                          <div className="grid grid-cols-2 gap-2">
                            {[
                              { value: 'dark', label: 'Escuro' },
                              { value: 'light', label: 'Claro' },
                            ].map((modeOption) => (
                              <button
                                key={modeOption.value}
                                type="button"
                                onClick={() => setInterfaceSettingsForm((current) => ({
                                  ...current,
                                  app_theme_mode: modeOption.value,
                                  app_theme_palette: resolveThemePalette(modeOption.value as 'light' | 'dark', current.app_theme_palette),
                                }))}
                                className={cn(
                                  "rounded-xl border px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] transition-all",
                                  interfaceSettingsForm.app_theme_mode === modeOption.value
                                    ? "border-primary bg-primary/12 text-primary"
                                    : "border-[var(--border)] bg-[var(--surface-1)] text-[var(--text-muted)] hover:border-[var(--border-strong)] hover:text-[var(--text-main)]"
                                )}
                              >
                                {modeOption.label}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Template visual</label>
                          <select
                            name="app_theme_template"
                            value={interfaceSettingsForm.app_theme_template}
                            onChange={(event) => setInterfaceSettingsForm((current) => ({ ...current, app_theme_template: event.target.value }))}
                            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-input)] py-2.5 px-4 text-sm text-[var(--text-main)] focus:outline-none focus:border-primary"
                          >
                            {themeTemplates.map((template) => (
                              <option key={template.id} value={template.id}>{template.name}</option>
                            ))}
                          </select>
                          <p className="text-[11px] text-[var(--text-muted)]">{selectedTemplate.description}</p>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Layout do sistema</label>
                          <select 
                            name="app_layout"
                            value={interfaceSettingsForm.app_layout}
                            onChange={(event) => setInterfaceSettingsForm((current) => ({ ...current, app_layout: event.target.value }))}
                            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-input)] py-2.5 px-4 text-sm text-[var(--text-main)] focus:outline-none focus:border-primary"
                          >
                            <option value="default">Padrão (barra lateral)</option>
                            <option value="compact">Compacto</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-primary">Paletas para {selectedThemeMode === 'light' ? 'modo claro' : 'modo escuro'}</p>
                            <p className="mt-1 text-xs text-[var(--text-muted)]">Cada paleta altera superfícies, contraste, brilho e personalidade cromática.</p>
                          </div>
                          <div className="rounded-full border border-[var(--border)] bg-[var(--surface-1)] px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-muted)]">
                            {availablePalettes.length} opções
                          </div>
                        </div>
                        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                          {availablePalettes.map((palette) => {
                            const selected = interfaceSettingsForm.app_theme_palette === palette.id;
                            return (
                              <button
                                key={palette.id}
                                type="button"
                                onClick={() => setInterfaceSettingsForm((current) => ({ ...current, app_theme_palette: palette.id }))}
                                className={cn(
                                  "rounded-[1.4rem] border p-4 text-left transition-all",
                                  selected
                                    ? "border-primary bg-primary/8 shadow-[0_18px_38px_rgba(var(--primary-rgb),0.16)]"
                                    : "border-[var(--border)] bg-[var(--surface-1)] hover:border-[var(--border-strong)]"
                                )}
                              >
                                <div className="flex items-start justify-between gap-4">
                                  <div>
                                    <p className="text-sm font-black uppercase tracking-[0.12em] text-[var(--text-main)]">{palette.name}</p>
                                    <p className="mt-1 text-xs text-[var(--text-muted)]">{palette.description}</p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="h-4 w-4 rounded-full border border-white/30" style={{ backgroundColor: palette.accent }} />
                                    <span className="h-4 w-4 rounded-full border border-white/20" style={{ backgroundColor: palette.surface }} />
                                  </div>
                                </div>
                                <div className="mt-4 grid grid-cols-3 gap-2">
                                  <div className="h-10 rounded-xl border border-white/10" style={{ backgroundColor: palette.surface }} />
                                  <div className="h-10 rounded-xl border border-white/10 bg-[var(--surface-2)]" />
                                  <div className="h-10 rounded-xl border border-white/10" style={{ backgroundColor: palette.accent, opacity: 0.9 }} />
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="rounded-[1.75rem] border border-[var(--border)] bg-[var(--surface-1)] p-5">
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-primary">Preview do tema</p>
                            <h4 className="mt-2 text-lg font-black tracking-tight text-[var(--text-main)]">{selectedPalette?.name}</h4>
                            <p className="mt-1 text-xs text-[var(--text-muted)]">{selectedTemplate.description}</p>
                          </div>
                          <div className="rounded-full border border-[var(--border)] px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-[var(--text-muted)]">
                            {interfaceSettingsForm.app_layout === 'compact' ? 'Compacto' : 'Padrão'}
                          </div>
                        </div>
                        <div className="mt-5 grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
                          <div className="rounded-[1.4rem] border border-[var(--border)] p-4" style={{ background: `linear-gradient(180deg, ${selectedPalette?.surface || 'var(--surface-2)'}, var(--surface-2))` }}>
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-2xl text-sm font-black" style={{ backgroundColor: selectedPalette?.accent, color: selectedThemeMode === 'light' ? '#ffffff' : '#091018' }}>
                                MG
                              </div>
                              <div>
                                <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--text-main)]">{interfaceSettingsForm.app_name}</p>
                                <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--text-muted)]">{interfaceSettingsForm.app_slogan}</p>
                              </div>
                            </div>
                            <div className="mt-5 space-y-2">
                              {['Dashboard', 'Ocorrências', 'Relatórios'].map((item, index) => (
                                <div
                                  key={item}
                                  className={cn(
                                    "rounded-xl border px-3 py-2 text-[11px] font-black uppercase tracking-[0.16em]",
                                    index === 0 ? "text-[var(--text-main)]" : "text-[var(--text-muted)]"
                                  )}
                                  style={index === 0 ? { borderColor: selectedPalette?.accent, backgroundColor: `${selectedPalette?.accent}18` } : undefined}
                                >
                                  {item}
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="rounded-[1.4rem] border border-[var(--border)] bg-[var(--bg-elevated)] p-4 shadow-[0_18px_40px_var(--shadow-color)]">
                            <div className="flex items-center justify-between gap-4">
                              <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-muted)]">Painel principal</p>
                                <h5 className="mt-2 text-base font-black text-[var(--text-main)]">Centro de Operações</h5>
                              </div>
                              <div className="rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em]" style={{ backgroundColor: `${selectedPalette?.accent}16`, color: selectedPalette?.accent }}>
                                {selectedThemeMode === 'light' ? 'Claro' : 'Escuro'}
                              </div>
                            </div>
                            <div className="mt-4 grid gap-3 md:grid-cols-3">
                              {[43, 12, 5].map((value, index) => (
                                <div key={value} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
                                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-muted)]">
                                    {index === 0 ? 'Ocorrências' : index === 1 ? 'Críticas' : 'Alertas'}
                                  </p>
                                  <p className="mt-3 text-2xl font-black tracking-tight text-[var(--text-main)]">{value}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <button 
                          type="submit"
                          className="px-8 py-2.5 bg-primary hover:opacity-90 text-primary-foreground rounded-lg text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-primary/20"
                        >
                          Aplicar identidade visual
                        </button>
                      </div>
                    </form>
                  </Card>

                  <Card title="Backup e Restauro" subtitle="Gira cópias de segurança da base de dados" className="lg:col-span-2">
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm font-bold text-zinc-200 mb-3">Criar cópia de segurança</p>
                          <p className="text-[10px] text-zinc-500 mb-3">Descarregar a base de dados completa</p>
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
                                  toast.success("Cópia de segurança descarregada com sucesso!");
                                }
                              } catch (err) {
                                toast.error("Erro ao criar a cópia de segurança");
                              }
                            }}
                            className="w-full py-2.5 bg-primary hover:bg-primary/90 text-black rounded-lg text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-primary/20"
                          >
                            Descarregar agora
                          </button>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-zinc-200 mb-3">Restaurar cópia de segurança</p>
                          <p className="text-[10px] text-zinc-500 mb-3">Restaurar dados a partir de um ficheiro de backup</p>
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
                                  toast.success("Cópia de segurança restaurada. A recarregar...");
                                  setTimeout(() => window.location.reload(), 1500);
                                } else {
                                  toast.error("Erro ao restaurar a cópia de segurança");
                                }
                              } catch (err) {
                                toast.error("Erro ao restaurar a cópia de segurança");
                              }
                            }}
                          />
                          <button 
                            onClick={() => document.getElementById('backup-file')?.click()}
                            className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
                          >
                            Selecionar Arquivo
                          </button>
                        </div>
                      </div>
                      <div className="bg-zinc-800/30 border border-zinc-700/30 rounded-lg p-3">
                        <p className="text-[10px] text-zinc-400 font-bold uppercase">Aviso Importante:</p>
                        <p className="text-[10px] text-zinc-500 mt-1">É recomendável criar cópias de segurança regularmente. Uma cópia automática é criada diariamente no servidor.</p>
                      </div>
                    </div>
                  </Card>

                  <Card title="Versioning & Atualizações" subtitle="Gira versões e atualizações" className="lg:col-span-2">
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
                        toast.success("Configuração de versionamento guardada!");
                        fetchData();
                      } catch (err) {
                        toast.error("Erro ao guardar definições");
                      }
                    }} className="space-y-6">
                      <div className="bg-zinc-800/30 border border-zinc-700/30 rounded-lg p-4">
                        <p className="text-xs font-black text-zinc-300 uppercase">Versão Atual: v1.0.0</p>
                        <p className="text-[10px] text-zinc-500 mt-1">Status: OK. Atualizado</p>
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
                              toast.success("Sistema está atualizado");
                            }, 1500);
                          }}
                          className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
                        >
                          Verificar Agora
                        </button>
                        <button 
                          type="submit"
                          className="flex-1 py-2.5 bg-primary hover:opacity-90 text-primary-foreground rounded-lg text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-primary/20"
                        >
                          Guardar
                        </button>
                      </div>
                    </form>
                  </Card>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          </div>
        </div>
      </main>

      {/* Modals */}
      <AnimatePresence>
        <NewReportModal
          isOpen={isNewReportModalOpen}
          showPreview={showReportPreview}
          newReport={newReport}
          newReportStep={newReportStep}
          systemSettings={systemSettings as any}
          dynamicFields={reportDynamicFields as any}
          formItems={reportFormItems as any}
          onClose={closeNewReportModal}
          onSubmit={handleCreateReport}
          onPreview={handlePreviewNewReport}
          onClosePreview={() => setShowReportPreview(false)}
          onConfirmPreview={async () => {
            const ok = await submitNewReport();
            if (ok) {
              setShowReportPreview(false);
            }
          }}
          onNextStep={handleNextNewReportStep}
          onPreviousStep={() => setNewReportStep((step) => step - 1)}
          setNewReportStep={setNewReportStep}
          setNewReport={setNewReport}
          addNewReportPhotos={addNewReportPhotos}
        />

        <EditAlertModal
          isOpen={Boolean(editingAlert)}
          form={editAlertForm}
          setForm={setEditAlertForm}
          onClose={() => setEditingAlert(null)}
          onSubmit={handleEditAlert}
        />

        <DashboardRangeModal
          isOpen={isDashboardRangeModalOpen}
          value={dashboardCustomRange}
          setValue={setDashboardCustomRange}
          onClose={() => setIsDashboardRangeModalOpen(false)}
          onApply={applyDashboardCustomRange}
        />

        <ReportDetailModal
          report={selectedReport as any}
          currentUser={currentUser}
          systemSettings={systemSettings as any}
          dynamicFields={reportDynamicFields as any}
          formItems={reportFormItems as any}
          isEditing={isEditingReport}
          editingData={editingReportData}
          onClose={closeReportDetails}
          onStartEditing={startEditingSelectedReport}
          onCancelEditing={cancelEditingSelectedReport}
          setEditingData={setEditingReportData}
          addEditingReportPhotos={addEditingReportPhotos}
          onSaveEdits={handleSaveReportEdits}
          onConclude={handleConcludeReport}
          onApprove={handleApproveReport}
          onDelete={handleDeleteReport}
        />

        <UserModal
          isOpen={isNewUserModalOpen}
          editingUser={editingUser}
          newUser={newUser}
          setNewUser={setNewUser}
          roles={roles as any}
          onClose={() => setIsNewUserModalOpen(false)}
          onSubmit={handleCreateUser}
        />
      </AnimatePresence>

      {/* Bottom Navigation (Mobile) */}
      <nav className="md:hidden fixed bottom-3 left-3 right-3 h-16 glass no-print flex items-center justify-between px-4 rounded-[1.75rem] z-50 safe-bottom shadow-2xl shadow-black/30">
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
          onClick={openNewReportModal} 
          className="w-14 h-14 bg-primary rounded-full flex items-center justify-center text-black shadow-lg shadow-primary/30 -mt-12 border-4 border-[var(--bg-main)] glow-amber"
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
              className="fixed bottom-0 left-0 right-0 z-[100] md:hidden rounded-t-[2rem] border-t border-[var(--border)] bg-[linear-gradient(180deg,var(--surface-1),var(--surface-2))] px-4 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-6 shadow-[0_-30px_80px_rgba(0,0,0,0.28)]"
            >
              <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-[var(--border-strong)]" />
              <div className="mb-5 flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-primary">Mais opções</p>
                  <h3 className="mt-2 text-base font-black uppercase tracking-[0.08em] text-[var(--text-main)]">Navegação rápida</h3>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">Atalhos operacionais e áreas administrativas.</p>
                </div>
                <button onClick={() => setIsMobileMenuOpen(false)} className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-2 text-[var(--text-muted)]">
                  <XCircle size={18} />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  currentUser.permissions?.view_dashboard === true ? { key: 'command_center', label: 'Centro de Comando', icon: Shield } : null,
                  currentUser.permissions?.view_reports === true ? { key: 'critical_occurrences', label: 'Ocorrências Críticas', icon: AlertTriangle } : null,
                  currentUser.permissions?.view_dashboard === true ? { key: 'timeline', label: 'Linha do Tempo', icon: Clock } : null,
                  currentUser.permissions?.view_reports === true ? { key: 'evidence_library', label: 'Biblioteca', icon: Camera } : null,
                  currentUser.permissions?.view_team_daily ? { key: 'shifts', label: 'Turnos', icon: Users } : null,
                  { key: 'personal_reports', label: 'Meus Relatórios', icon: FileText },
                  { key: 'daily_report_personal', label: 'Meu Dia', icon: Calendar },
                  currentUser.permissions?.view_team_daily ? { key: 'daily_report_team', label: 'Dia da Equipa', icon: Users } : null,
                  { key: 'alerts', label: 'Alertas', icon: AlertTriangle },
                  currentUser.permissions?.manage_users === true ? { key: 'users', label: 'Utilizadores', icon: Users } : null,
                  currentUser.permissions?.manage_permissions === true ? { key: 'permissions', label: 'Permissões', icon: Lock } : null,
                  canManageSystem ? { key: 'settings', label: 'Definições', icon: SettingsIcon } : null,
                  canManageSystem ? { key: 'parametrization', label: 'Parametrização', icon: SettingsIcon } : null,
                ].filter(Boolean).map((item: any) => {
                  const Icon = item.icon;
                  const active = activeTab === item.key;
                  return (
                    <button
                      key={item.key}
                      onClick={() => { setActiveTab(item.key); setIsMobileMenuOpen(false); }}
                      className={cn(
                        "flex min-h-[76px] flex-col items-start justify-between rounded-2xl border px-4 py-3 text-left transition-all",
                        active
                          ? "border-primary/40 bg-primary/12 text-primary"
                          : "border-[var(--border)] bg-[var(--surface-1)] text-[var(--text-main)]"
                      )}
                    >
                      <Icon size={18} />
                      <span className="text-[10px] font-black uppercase tracking-[0.16em] leading-tight">{item.label}</span>
                    </button>
                  );
                })}
              </div>
              <div className="mt-6 flex items-center justify-between border-t border-[var(--border)] pt-6">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-black font-black">
                     {currentUser.nome.charAt(0)}
                   </div>
                   <div>
                     <p className="text-xs font-black uppercase text-[var(--text-main)]">{currentUser.nome}</p>
                     <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">{currentUser.nivel_hierarquico}</p>
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
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Como app no seu telemóvel</p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-black text-xs shrink-0 mt-0.5">1</div>
                  <div>
                    <p className="text-sm font-black text-white">Abra o menu do Chrome</p>
                    <p className="text-xs text-zinc-500 mt-0.5">Toque nos <strong className="text-zinc-300">3 pontos (⋮)</strong> no canto superior direito do Chrome</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-black text-xs shrink-0 mt-0.5">2</div>
                  <div>
                    <p className="text-sm font-black text-white">Selecione "Adicionar ao ecrã inicial"</p>
                    <p className="text-xs text-zinc-500 mt-0.5">Pode também aparecer como <strong className="text-zinc-300">"Instalar aplicação"</strong> ou <strong className="text-zinc-300">"Adicionar ao ecrã principal"</strong></p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-black text-xs shrink-0 mt-0.5">3</div>
                  <div>
                    <p className="text-sm font-black text-white">Confirme e pronto!</p>
                    <p className="text-xs text-zinc-500 mt-0.5">O MineGuard aparecerá no seu ecrã inicial como uma app instalada.</p>
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







