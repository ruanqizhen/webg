export type NodeState = 'idle' | 'ready' | 'running' | 'done' | 'error';

export interface RuntimeMemory {
  portValues: Record<string, any>;
  nodeState: Record<string, NodeState>;
}

export interface NodeError {
  nodeId: string;
  message: string;
}

export interface NodeResult {
  outputs: Record<string, any>;
}

export interface NodeContext {
  inputs: Record<string, any>;
  params: Record<string, any>;
  runtime: RuntimeMemory;
  nodeId: string;
}

export type NodeExecutor = (ctx: NodeContext) => NodeResult | Promise<NodeResult>;

export interface PortDefinition {
  name: string;
  type: string;
}

export interface ParamDefinition {
  name: string;
  type: string;
  defaultValue?: any;
}

export interface NodeDefinition {
  type: string;
  label: string;
  inputs: PortDefinition[];
  outputs: PortDefinition[];
  params?: ParamDefinition[];
  executor: NodeExecutor;
}
