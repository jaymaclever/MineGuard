export type AlertAudience =
  | 'all'
  | 'management'
  | 'officers'
  | 'supervisors'
  | 'agents'
  | 'sierra_1_plus'
  | 'sierra_2_plus'
  | 'official_plus'
  | 'sierra_1_only'
  | 'sierra_2_only'
  | 'official_only'
  | 'superadmin_only';

export const ALERT_AUDIENCE_OPTIONS: Array<{ value: AlertAudience; label: string; hint: string }> = [
  { value: 'all', label: 'Toda a equipa', hint: 'Visível para todos os utilizadores.' },
  { value: 'management', label: 'Gestão', hint: 'Superadmin, Admin, Sierra 1, Sierra 2, Oficial e Supervisor.' },
  { value: 'officers', label: 'Oficiais e acima', hint: 'Superadmin, Admin, Sierra 1, Sierra 2 e Oficial.' },
  { value: 'supervisors', label: 'Supervisores e acima', hint: 'Superadmin, Admin, Sierra 1, Sierra 2 e Supervisor.' },
  { value: 'agents', label: 'Agentes', hint: 'Apenas contas de nível Agente.' },
  { value: 'sierra_1_plus', label: 'Sierra 1 e acima', hint: 'Superadmin, Admin e Sierra 1 ou superior.' },
  { value: 'sierra_2_plus', label: 'Sierra 2 e acima', hint: 'Superadmin, Admin, Sierra 1 e Sierra 2 ou superior.' },
  { value: 'official_plus', label: 'Oficiais e acima', hint: 'Superadmin, Admin, Sierra 1, Sierra 2 e Oficial ou superior.' },
  { value: 'sierra_1_only', label: 'Apenas Sierra 1', hint: 'Somente contas Sierra 1.' },
  { value: 'sierra_2_only', label: 'Apenas Sierra 2', hint: 'Somente contas Sierra 2.' },
  { value: 'official_only', label: 'Apenas Oficiais', hint: 'Somente contas Oficial.' },
  { value: 'superadmin_only', label: 'Apenas Superadmin', hint: 'Somente o Superadmin.' },
];

const ROLE_WEIGHTS: Record<string, number> = {
  superadmin: 100,
  admin: 90,
  'sierra 1': 80,
  'sierra 2': 70,
  oficial: 60,
  supervisor: 50,
  agente: 40,
};

export function normalizeHierarchyRole(role: string | null | undefined) {
  return String(role || '')
    .trim()
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ');
}

export function getRoleWeight(role: string | null | undefined) {
  return ROLE_WEIGHTS[normalizeHierarchyRole(role)] || 0;
}

export function matchesAlertAudience(audience: string | null | undefined, role: string | null | undefined) {
  const normalizedAudience = String(audience || 'all').toLowerCase();
  const normalizedRole = normalizeHierarchyRole(role);
  const weight = getRoleWeight(normalizedRole);

  const groups: Record<string, (value: string, roleWeight: number) => boolean> = {
    all: () => true,
    management: (value) => ['superadmin', 'admin', 'sierra 1', 'sierra 2', 'oficial', 'supervisor'].includes(value),
    officers: (value) => ['superadmin', 'admin', 'sierra 1', 'sierra 2', 'oficial'].includes(value),
    supervisors: (value) => ['superadmin', 'admin', 'sierra 1', 'sierra 2', 'supervisor'].includes(value),
    agents: (value) => ['superadmin', 'admin', 'agente'].includes(value),
    sierra_1_plus: (_value, roleWeight) => roleWeight >= 80,
    sierra_2_plus: (_value, roleWeight) => roleWeight >= 70,
    official_plus: (_value, roleWeight) => roleWeight >= 60,
    sierra_1_only: (value) => value === 'sierra 1',
    sierra_2_only: (value) => value === 'sierra 2',
    official_only: (value) => value === 'oficial',
    superadmin_only: (value) => value === 'superadmin',
  };

  return (groups[normalizedAudience] || groups.all)(normalizedRole, weight);
}

export function getAlertAudienceLabel(audience: string | null | undefined) {
  const option = ALERT_AUDIENCE_OPTIONS.find((item) => item.value === audience);
  return option?.label || 'Toda a equipa';
}
