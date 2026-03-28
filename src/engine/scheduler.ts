import type { Graph, Edge } from '../types/graph';
import { NodeRegistry } from './registry';
import type { NodeState, RuntimeMemory } from '../types/runtime';

export class ExecutionEngine {
  private graph: Graph;
  private runtime: RuntimeMemory;
  private updateNodeState: (id: string, s: NodeState) => void;
  private updatePortValue: (id: string, v: any) => void;

  constructor(
    graph: Graph, 
    initialRuntime: RuntimeMemory, 
    updateNodeState: (id: string, s: NodeState) => void,
    updatePortValue: (id: string, v: any) => void
  ) {
    this.graph = graph;
    this.runtime = initialRuntime;
    this.updateNodeState = updateNodeState;
    this.updatePortValue = updatePortValue;
  }

  public detectCycles(): boolean {
    const adj = new Map<string, string[]>();
    for (const node of this.graph.nodes) adj.set(node.id, []);
    for (const edge of this.graph.edges) {
      if (adj.has(edge.sourceNode) && adj.has(edge.targetNode)) {
          adj.get(edge.sourceNode)!.push(edge.targetNode);
      }
    }

    const visited = new Set<string>();
    const recStack = new Set<string>();

    const dfs = (nodeId: string): boolean => {
      if (recStack.has(nodeId)) return true;
      if (visited.has(nodeId)) return false;

      visited.add(nodeId);
      recStack.add(nodeId);

      const neighbors = adj.get(nodeId) || [];
      for (const n of neighbors) {
        if (dfs(n)) return true;
      }
      recStack.delete(nodeId);
      return false;
    };

    for (const node of this.graph.nodes) {
      if (dfs(node.id)) return true;
    }
    return false;
  }

  public async executeAll() {
    if (this.detectCycles()) {
      throw new Error("Circular Dependency Detected");
    }

    for (const n of this.graph.nodes) {
      this.updateNodeState(n.id, 'idle');
    }

    const inDegree = new Map<string, number>();
    const deps = new Map<string, string[]>();
    const edgeByPort = new Map<string, Edge[]>();

    for (const n of this.graph.nodes) {
      inDegree.set(n.id, 0);
      deps.set(n.id, []);
    }

    for (const edge of this.graph.edges) {
      const targetList = deps.get(edge.sourceNode) || [];
      targetList.push(edge.targetNode);
      deps.set(edge.sourceNode, targetList);

      inDegree.set(edge.targetNode, (inDegree.get(edge.targetNode) || 0) + 1);
      
      const pEdges = edgeByPort.get(edge.sourcePort) || [];
      pEdges.push(edge);
      edgeByPort.set(edge.sourcePort, pEdges);
    }

    const queue: string[] = [];
    for (const [id, deg] of inDegree.entries()) {
      if (deg === 0) queue.push(id);
    }

    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      const node = this.graph.nodes.find(n => n.id === nodeId);
      if (!node) continue;

      this.updateNodeState(node.id, 'running');

      try {
        const def = NodeRegistry[node.type];
        if (!def) {
          throw new Error("Unknown node type: " + node.type);
        }
        
        const inputs: Record<string, any> = {};
        for (const port of node.inputs) {
           inputs[port.name] = this.runtime.portValues[`${node.id}_${port.id}`]; 
        }

        const ctx = {
          inputs,
          params: node.params || {},
          runtime: this.runtime,
          nodeId: node.id
        };

        const result = await def.executor(ctx);

        for (const [key, val] of Object.entries(result.outputs)) {
           const portDefinition = def.outputs.find(o => o.name === key);
           if (!portDefinition) continue;
           
           const outputPort = node.outputs.find(p => p.name === key);
           if (!outputPort) continue;

           this.updatePortValue(`${node.id}_${outputPort.id}`, val);
           
           const outEdges = edgeByPort.get(outputPort.id) || [];
           for (const edge of outEdges) {
              this.updatePortValue(`${edge.targetNode}_${edge.targetPort}`, val);
           }
        }

        this.updateNodeState(node.id, 'done');

      } catch (err: any) {
        this.updateNodeState(node.id, 'error');
        throw err;
      }

      const children = deps.get(node.id) || [];
      for (const childId of children) {
         let count = inDegree.get(childId)! - 1;
         inDegree.set(childId, count);
         if (count === 0) queue.push(childId);
      }
    }
  }
}
