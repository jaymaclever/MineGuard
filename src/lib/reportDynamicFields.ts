export type DynamicFieldType = 'text' | 'textarea' | 'number' | 'date' | 'select' | 'multiselect' | 'checkbox';
export type DynamicFieldScope = 'create' | 'edit' | 'both';

export interface DynamicFieldDefinition {
  id: string;
  label: string;
  type: DynamicFieldType;
  required: boolean;
  active: boolean;
  scope: DynamicFieldScope;
  options?: string[];
  categories?: string[];
  placeholder?: string;
}

export interface SettingLike {
  key: string;
  value: string;
}

const FIELD_TYPES: DynamicFieldType[] = ['text', 'textarea', 'number', 'date', 'select', 'multiselect', 'checkbox'];
const FIELD_SCOPES: DynamicFieldScope[] = ['create', 'edit', 'both'];

export function parseJsonObject(input: any): Record<string, any> {
  if (!input) return {};
  if (typeof input === 'object' && !Array.isArray(input)) return input;
  if (typeof input !== 'string') return {};

  try {
    const parsed = JSON.parse(input);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed;
    }
  } catch {}

  return {};
}

export function getReportDynamicFields(settings: SettingLike[]): DynamicFieldDefinition[] {
  const raw = settings.find((item) => item.key === 'report_dynamic_fields')?.value;
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((field) => sanitizeDynamicField(field))
      .filter((field): field is DynamicFieldDefinition => Boolean(field));
  } catch {
    return [];
  }
}

export function sanitizeDynamicField(field: any): DynamicFieldDefinition | null {
  if (!field || typeof field !== 'object') return null;

  const type = FIELD_TYPES.includes(field.type) ? field.type : 'text';
  const scope = FIELD_SCOPES.includes(field.scope) ? field.scope : 'both';
  const label = typeof field.label === 'string' ? field.label.trim() : '';
  const id = typeof field.id === 'string' ? field.id.trim() : '';

  if (!label || !id) return null;

  return {
    id,
    label,
    type,
    required: field.required === true,
    active: field.active !== false,
    scope,
    options: Array.isArray(field.options)
      ? field.options.map((item) => String(item).trim()).filter(Boolean)
      : [],
    categories: Array.isArray(field.categories)
      ? field.categories.map((item) => String(item).trim()).filter(Boolean)
      : [],
    placeholder: typeof field.placeholder === 'string' ? field.placeholder : '',
  };
}

export function createEmptyDynamicField(): DynamicFieldDefinition {
  return {
    id: '',
    label: '',
    type: 'text',
    required: false,
    active: true,
    scope: 'both',
    options: [],
    categories: [],
    placeholder: '',
  };
}

export function slugifyDynamicFieldLabel(label: string) {
  return label
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);
}

export function getDynamicFieldValues(metadata: any) {
  const parsed = parseJsonObject(metadata);
  const values = parsed.dynamicFields;
  if (values && typeof values === 'object' && !Array.isArray(values)) {
    return values as Record<string, any>;
  }
  return {} as Record<string, any>;
}

export function buildMetadataWithDynamicFields(existingMetadata: any, dynamicFieldValues: Record<string, any>) {
  const parsed = parseJsonObject(existingMetadata);
  return {
    ...parsed,
    dynamicFields: dynamicFieldValues,
  };
}

export function isDynamicFieldVisible(field: DynamicFieldDefinition, category: string, scope: 'create' | 'edit') {
  if (!field.active) return false;
  if (!(field.scope === 'both' || field.scope === scope)) return false;
  if (field.categories && field.categories.length > 0 && !field.categories.includes(category)) return false;
  return true;
}

export function getVisibleDynamicFields(fields: DynamicFieldDefinition[], category: string, scope: 'create' | 'edit') {
  return fields.filter((field) => isDynamicFieldVisible(field, category, scope));
}

export function getDefaultDynamicFieldValue(field: DynamicFieldDefinition) {
  if (field.type === 'checkbox') return false;
  if (field.type === 'multiselect') return [] as string[];
  return '';
}

export function coerceDynamicFieldValues(fields: DynamicFieldDefinition[], values: Record<string, any>) {
  const nextValues: Record<string, any> = {};

  fields.forEach((field) => {
    const rawValue = values?.[field.id];
    if (rawValue === undefined || rawValue === null) {
      nextValues[field.id] = getDefaultDynamicFieldValue(field);
      return;
    }

    if (field.type === 'checkbox') {
      nextValues[field.id] = rawValue === true || rawValue === 'true' || rawValue === 1 || rawValue === '1';
      return;
    }

    if (field.type === 'multiselect') {
      if (Array.isArray(rawValue)) {
        nextValues[field.id] = rawValue.map((item) => String(item));
      } else if (typeof rawValue === 'string' && rawValue.trim()) {
        nextValues[field.id] = rawValue.split(',').map((item) => item.trim()).filter(Boolean);
      } else {
        nextValues[field.id] = [];
      }
      return;
    }

    nextValues[field.id] = String(rawValue);
  });

  return nextValues;
}

export function formatDynamicFieldValue(field: DynamicFieldDefinition, value: any) {
  if (value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)) {
    return '';
  }

  if (field.type === 'checkbox') {
    return value ? 'Sim' : 'Não';
  }

  if (field.type === 'multiselect') {
    return Array.isArray(value) ? value.join(', ') : String(value);
  }

  return String(value);
}

export function validateDynamicFieldValues(
  fields: DynamicFieldDefinition[],
  values: Record<string, any>,
  category: string,
  scope: 'create' | 'edit'
) {
  for (const field of getVisibleDynamicFields(fields, category, scope)) {
    if (!field.required) continue;

    const value = values?.[field.id];
    const isEmpty =
      value === undefined ||
      value === null ||
      value === '' ||
      (Array.isArray(value) && value.length === 0) ||
      (field.type === 'checkbox' && value !== true);

    if (isEmpty) {
      return field;
    }
  }

  return null;
}
