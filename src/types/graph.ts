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
  label: string;
  defaultValue: any;
  bindingNodeId: string;
  x?: number;
  y?: number;
}

export interface Graph {
  nodes: NodeInstance[];
  edges: Edge[];
  uiControls: UIControl[];
}
