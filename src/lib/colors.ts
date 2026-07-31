/**
 * Centralized color mapping — mirrors CSS variables in index.css
 * Hex values kept for canvas/SVG usage where CSS var() not yet resolved.
 * Prefer CSS var(--data-*) in DOM styles, hex here for ReactFlow edges & SVG.
 */

export const DATA_COLORS: Record<string, string> = {
  number: '#D97706',   // --data-number
  integer: '#1565C0',  // --data-integer
  boolean: '#2E7D32',  // --data-boolean (harmonized from #388E3C/#4CAF50)
  string: '#F9A825',   // --data-string
  array: '#E65100',    // --data-array
  any: '#9E9E9E',      // --data-any
};

// CSS variable tokens for DOM usage (use as style={{ color: 'var(--data-number)' }} or className="text-[var(--data-number)]")
export const DATA_COLOR_TOKENS: Record<string, string> = {
  number: 'var(--data-number)',
  integer: 'var(--data-integer)',
  boolean: 'var(--data-boolean)',
  string: 'var(--data-string)',
  array: 'var(--data-array)',
  any: 'var(--data-any)',
};

export const getTypeColor = (type: string) => {
  const baseType = type.toLowerCase().replace('[]', '');
  return DATA_COLORS[baseType] ?? DATA_COLORS.any;
};

export const getTypeColorToken = (type: string) => {
  const baseType = type.toLowerCase().replace('[]', '');
  return DATA_COLOR_TOKENS[baseType] ?? DATA_COLOR_TOKENS.any;
};

export const isTypeArray = (type: string) => type.endsWith('[]') || type.toLowerCase() === 'array';

export const NODE_CATEGORY_COLORS: Record<string, string> = {
  source: '#2E7D32',
  math: '#1565C0',
  logic: '#6A1B9A',
  sink: '#E65100',
  io: '#1565C0',
  structure: '#424242',
};

export const getNodeColor = (category: string) => {
  return NODE_CATEGORY_COLORS[category.toLowerCase()] ?? '#546E7A';
};

export const STATUS_COLORS = {
  idle: 'var(--status-idle)',
  running: 'var(--status-running)',
  paused: 'var(--status-paused)',
  error: 'var(--status-error)',
};

export const getTypeAbbrev = (type: string): string => {
  const base = type.toLowerCase().replace('[]', '');
  switch (base) {
    case 'number': return 'DBL';
    case 'integer': return 'I32';
    case 'boolean': return 'BOOL';
    case 'string': return 'STR';
    case 'array': return 'ARR';
    case 'any': return 'ANY';
    default: return base.slice(0, 3).toUpperCase();
  }
};
