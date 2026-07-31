export type ControlType =
  | 'numberInput'
  | 'button' // legacy: kept for .webg compatibility, UI shows as Switch
  | 'switch'
  | 'numberIndicator'
  | 'textLabel'
  | 'gauge'
  | 'indicatorLight'
  | 'slider'
  | 'knob'
  | 'tank'
  | 'array';

export interface ControlDefault {
  defaultValue: any;
  min?: number;
  max?: number;
  step?: number;
  colorOn?: string;
  colorOff?: string;
  width?: number;
  height?: number;
}

/** Shared defaults for all UI control types — single source of truth
 *  Colors use professional muted palette matching --data-boolean token.
 *  `button` type is kept for backward compatibility; new files should use `switch`.
 */
export const controlDefaults: Record<string, ControlDefault> = {
  numberInput: { min: 0, max: 100, step: 1, defaultValue: 0, width: 140, height: 36 },
  button: { colorOn: '#2E7D32', colorOff: '#E5E7EB', defaultValue: false, width: 80, height: 36 }, // legacy
  switch: { colorOn: '#2E7D32', colorOff: '#E5E7EB', defaultValue: false, width: 80, height: 36 },
  numberIndicator: { defaultValue: 0, width: 120, height: 36 },
  textLabel: { defaultValue: '', width: 140, height: 32 },
  gauge: { min: 0, max: 100, colorOn: '#2E7D32', defaultValue: 0, width: 120, height: 90 },
  indicatorLight: { colorOn: '#2E7D32', colorOff: '#E5E7EB', defaultValue: false, width: 48, height: 48 },
  slider: { min: 0, max: 100, step: 1, defaultValue: 0, width: 160, height: 44 },
  knob: { min: 0, max: 100, step: 1, defaultValue: 0, width: 72, height: 72 },
  tank: { min: 0, max: 100, colorOn: '#2563EB', defaultValue: 0, width: 56, height: 140 },
  array: { defaultValue: [], width: 160, height: 64 },
};

export function getControlDefault(type: string): ControlDefault | undefined {
  return (controlDefaults as any)[type];
}
