// Centralised Types for MineGuard

export type NivelHierarquico = 'Superadmin' | 'Sierra 1' | 'Sierra 2' | 'Oficial' | 'Supervisor' | 'Agente';
export type Categoria = 'Valores' | 'Perímetro' | 'Logística' | 'Safety' | 'Manutenção' | 'Informativo' | 'Operativo';
export type Gravidade = 'G1' | 'G2' | 'G3' | 'G4';

export interface User {
  id: number;
  nome: string;
  funcao: string;
  numero_mecanografico: string;
  nivel_hierarquico: NivelHierarquico;
  permissions?: Record<string, boolean>;
  peso?: number;
  preferred_language?: string;
}

export interface ReportPhoto {
  id: number;
  report_id: number;
  photo_path: string;
  caption: string;
  timestamp: string;
}

export interface Report {
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

export interface Notification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  type: 'report' | 'system' | 'alert';
  reportId?: number;
}

export interface Stats {
  totalReports: number;
  totalUsers: number;
  reportsByCategory: { name: string; value: number }[];
  reportsBySeverity: { name: string; value: number }[];
  reportsLast7Days: { date: string; count: number }[];
}
