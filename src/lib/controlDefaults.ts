export type ControlType =
  | 'numberInput'
  | 'button'
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

/** Shared defaults for all UI control types — single source of truth */
export const controlDefaults: Record<string, ControlDefault> = {
  numberInput: { min: 0, max: 100, step: 1, defaultValue: 0 },
  button: { colorOn: '#4CAF50', colorOff: '#cccccc', defaultValue: false },
  numberIndicator: { defaultValue: 0 },
  textLabel: { defaultValue: '' },
  gauge: { min: 0, max: 100, colorOn: '#4CAF50', defaultValue: 0 },
  indicatorLight: { colorOn: '#4CAF50', colorOff: '#cccccc', defaultValue: false },
  slider: { min: 0, max: 100, step: 1, defaultValue: 0, width: 160, height: 40 },
  knob: { min: 0, max: 100, step: 1, defaultValue: 0, width: 80, height: 80 },
  tank: { min: 0, max: 100, colorOn: '#3B82F6', defaultValue: 0, width: 60, height: 160 },
  array: { defaultValue: [], width: 120, height: 60 },
};

export function getControlDefault(type: string): ControlDefault | undefined {
  return (controlDefaults as any)[type];
}
