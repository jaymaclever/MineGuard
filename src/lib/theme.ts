export type ThemeMode = 'light' | 'dark';
export type ThemeTemplate = 'executive' | 'operations' | 'tactical';

export type ThemePaletteId =
  | 'obsidian-amber'
  | 'midnight-blue'
  | 'carbon-emerald'
  | 'steel-crimson'
  | 'amber-stone'
  | 'slate-blue'
  | 'forest-sand'
  | 'copper-ash';

export interface ThemeSettings {
  app_theme_mode?: string;
  app_theme_palette?: string;
  app_theme_template?: string;
}

export const themePalettes: Array<{
  id: ThemePaletteId;
  mode: ThemeMode;
  name: string;
  description: string;
  accent: string;
  surface: string;
}> = [
  { id: 'obsidian-amber', mode: 'dark', name: 'Obsidian Amber', description: 'Escuro refinado com energia âmbar.', accent: '#f59e0b', surface: '#111318' },
  { id: 'midnight-blue', mode: 'dark', name: 'Midnight Blue', description: 'Escuro técnico e corporativo.', accent: '#4f8cff', surface: '#0f172a' },
  { id: 'carbon-emerald', mode: 'dark', name: 'Carbon Emerald', description: 'Operacional e monitorizado.', accent: '#22c55e', surface: '#101916' },
  { id: 'steel-crimson', mode: 'dark', name: 'Steel Crimson', description: 'Tático, contrastado e assertivo.', accent: '#ef4444', surface: '#1a1114' },
  { id: 'amber-stone', mode: 'light', name: 'Amber Stone', description: 'Claro quente, executivo e premium.', accent: '#c97a10', surface: '#fff6ea' },
  { id: 'slate-blue', mode: 'light', name: 'Slate Blue', description: 'Claro limpo com leitura técnica.', accent: '#3366cc', surface: '#f4f7ff' },
  { id: 'forest-sand', mode: 'light', name: 'Forest Sand', description: 'Orgânico, operacional e sofisticado.', accent: '#2f7a55', surface: '#f5f3ea' },
  { id: 'copper-ash', mode: 'light', name: 'Copper Ash', description: 'Industrial claro com presença.', accent: '#b45309', surface: '#f8f3ef' },
];

export const themeTemplates: Array<{
  id: ThemeTemplate;
  name: string;
  description: string;
}> = [
  { id: 'executive', name: 'Executive', description: 'Mais respiro, sofisticação e foco em leitura.' },
  { id: 'operations', name: 'Operations', description: 'Mais densidade visual para uso operacional contínuo.' },
  { id: 'tactical', name: 'Tactical', description: 'Contraste mais forte e sensação de comando.' },
];

export const defaultPaletteByMode: Record<ThemeMode, ThemePaletteId> = {
  dark: 'obsidian-amber',
  light: 'amber-stone',
};

const allPaletteClasses = themePalettes.map((palette) => `theme-${palette.id}`);
const allTemplateClasses = themeTemplates.map((template) => `template-${template.id}`);

export const resolveThemeMode = (value?: string): ThemeMode =>
  value === 'light' ? 'light' : 'dark';

export const resolveThemePalette = (mode: ThemeMode, palette?: string): ThemePaletteId => {
  const requested = themePalettes.find((item) => item.id === palette);
  if (requested && requested.mode === mode) return requested.id;
  return defaultPaletteByMode[mode];
};

export const resolveThemeTemplate = (value?: string): ThemeTemplate => {
  if (value === 'operations' || value === 'tactical') return value;
  return 'executive';
};

export const applyThemeSettings = (root: HTMLElement, settings: ThemeSettings) => {
  const mode = resolveThemeMode(settings.app_theme_mode);
  const palette = resolveThemePalette(mode, settings.app_theme_palette);
  const template = resolveThemeTemplate(settings.app_theme_template);

  root.classList.toggle('light', mode === 'light');
  root.classList.toggle('dark', mode === 'dark');

  allPaletteClasses.forEach((className) => root.classList.remove(className));
  root.classList.add(`theme-${palette}`);

  allTemplateClasses.forEach((className) => root.classList.remove(className));
  root.classList.add(`template-${template}`);
};
