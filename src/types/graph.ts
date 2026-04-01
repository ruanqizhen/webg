export type DataType = 'number' | 'boolean' | 'string' | 'array' | 'any';

export interface Port {
  id: string;
  name: string;
  type: DataType;
  direction: 'input' | 'output';
}

export interface NodeInstance {
  id: string;
  type: string;
  position: { x: number; y: number };
  inputs: Port[];
  outputs: Port[];
  params: Record<string, any>;
  parent?: string;
  width?: number;
  height?: number;
  // For nodes inside Case structure - which case they belong to
  caseId?: string;
  // For debugging - breakpoint flag
  breakpoint?: boolean;
}

export interface Edge {
  id: string;
  sourceNode: string;
  sourcePort: string;
  targetNode: string;
  targetPort: string;
}

export interface UIControl {
  id: string;
  type: 'numberInput' | 'button' | 'numberIndicator' | 'textLabel' | 'gauge' | 'indicatorLight';
  direction: 'control' | 'indicator';
  label: string;
  defaultValue: any;
  bindingNodeId: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  // For numberInput and gauge
  min?: number;
  max?: number;
  step?: number;
  // For button and indicatorLight
  colorOn?: string;
  colorOff?: string;
}

export interface Graph {
  nodes: NodeInstance[];
  edges: Edge[];
  uiControls: UIControl[];
}
