import type { Graph, Edge } from '../types/graph';
import { NodeRegistry } from './registry';
import type { NodeState, RuntimeMemory } from '../types/runtime';

interface DebugCallbacks {
  onNodeStart?: (nodeId: string) => void;
  onNodeFinish?: (nodeId: string) => void;
  shouldPause?: (nodeId: string) => Promise<boolean>;
  isPaused?: () => boolean;
  onContinue?: () => void;
}

export class ExecutionEngine {
  private graph: Graph;
  private runtime: RuntimeMemory;
  private updateNodeState: (id: string, s: NodeState) => void;
  private updatePortValue: (id: string, v: any) => void;
  private debugCallbacks?: DebugCallbacks;
  private batchMode: boolean;
  private aborted = false;
  private edgeByNodePort = new Map<string, Edge[]>();

  constructor(
    graph: Graph,
    initialRuntime: RuntimeMemory,
    updateNodeState: (id: string, s: NodeState) => void,
    updatePortValue: (id: string, v: any) => void,
    debugCallbacks?: DebugCallbacks,
    batchMode: boolean = false
  ) {
    this.graph = graph;
    // Create independent copy to avoid mutating external store state
    this.runtime = {
      portValues: { ...initialRuntime.portValues },
      nodeState: { ...initialRuntime.nodeState }
    };
    this.updateNodeState = updateNodeState;
    this.updatePortValue = updatePortValue;
    this.debugCallbacks = debugCallbacks;
    this.batchMode = batchMode;
    this.buildEdgeMap();
  }

  /** Abort a running execution */
  public abort() {
    this.aborted = true;
  }

  /** Update a port value in both the engine's internal runtime and the external store */
  private setPortValue(portId: string, value: any) {
    this.runtime.portValues[portId] = value;
    this.updatePortValue(portId, value);
  }

  /** Build the edge lookup map once for the entire execution */
  private buildEdgeMap() {
    this.edgeByNodePort.clear();
    for (const edge of this.graph.edges) {
      const edgeKey = `${edge.sourceNode}_${edge.sourcePort}`;
      const arr = this.edgeByNodePort.get(edgeKey) || [];
      arr.push(edge);
      this.edgeByNodePort.set(edgeKey, arr);
    }
  }

  // Find the ancestor of nodeId that sits exactly in the current parentId level
  private getAncestorInLevel(nodeId: string, parentId: string | undefined): string | null {
    let curr = this.graph.nodes.find(n => n.id === nodeId);
    while (curr) {
      if (curr.parent === parentId) return curr.id;
      const parentRef = curr.parent;
      if (!parentRef) return null;
      const nextCurr = this.graph.nodes.find(n => n.id === parentRef);
      if (!nextCurr) return null;
      curr = nextCurr;
    }
    return null;
  }

  public detectCycles(): boolean {
    // DFS on the entire graph resolved cleanly
    const deps = new Map<string, string[]>();
    for (const n of this.graph.nodes) deps.set(n.id, []);
    for (const e of this.graph.edges) {
       deps.get(e.sourceNode)?.push(e.targetNode);
    }
    const visited = new Set<string>();
    const recStack = new Set<string>();

    const dfs = (nodeId: string): boolean => {
      if (recStack.has(nodeId)) return true;
      if (visited.has(nodeId)) return false;
      visited.add(nodeId);
      recStack.add(nodeId);
      const children = deps.get(nodeId) || [];
      for (const c of children) {
         if (dfs(c)) return true;
      }
      recStack.delete(nodeId);
      return false;
    }

    for (const n of this.graph.nodes) {
      if (dfs(n.id)) return true;
    }
    return false;
  }

  // Detect deadlock - when no nodes are ready to execute but execution is not complete
  public detectDeadlock(executingNodes: string[]): boolean {
    if (executingNodes.length === 0) return false;
    
    // Check if all executing nodes are waiting for inputs that will never arrive
    for (const nodeId of executingNodes) {
      const node = this.graph.nodes.find(n => n.id === nodeId);
      if (!node) continue;
      
      const nodeEdges = this.graph.edges.filter(e => e.targetNode === nodeId);
      let hasUnresolvedInput = false;
      
      for (const edge of nodeEdges) {
        const sourceNode = this.graph.nodes.find(n => n.id === edge.sourceNode);
        if (sourceNode) {
          const sourceValue = this.runtime.portValues[`${edge.sourceNode}_${edge.sourcePort}`];
          if (sourceValue === undefined) {
            hasUnresolvedInput = true;
            break;
          }
        }
      }
      
      // If this node has no unresolved inputs, it's not deadlocked
      if (!hasUnresolvedInput) return false;
    }
    
    // All nodes are waiting for inputs - this is a deadlock
    return true;
  }

  private async executeSubgraph(parentId: string | undefined, caseStructureId?: string, activeCase?: string) {
    let nodesInLevel = this.graph.nodes.filter(n => n.parent === parentId);

    // For Case Structure, only execute nodes in the active case
    if (caseStructureId && activeCase) {
      nodesInLevel = nodesInLevel.filter(n => n.caseId === activeCase || n.caseId === undefined);
    }
    
    const inDegree = new Map<string, number>();
    const deps = new Map<string, string[]>();

    for (const n of nodesInLevel) {
      inDegree.set(n.id, 0);
      deps.set(n.id, []);
    }

    // Resolve cross-hierarchy edges into level-specific dependencies
    for (const edge of this.graph.edges) {
      const sourceAncestor = this.getAncestorInLevel(edge.sourceNode, parentId);
      const targetAncestor = this.getAncestorInLevel(edge.targetNode, parentId);

      // If both ancestors exist in this level and are different, it's a structural dependency!
      if (sourceAncestor && targetAncestor && sourceAncestor !== targetAncestor) {
         // Only add dependency if both nodes are actively participating in this level's execution!
         if (inDegree.has(sourceAncestor) && inDegree.has(targetAncestor)) {
            const currentDeps = deps.get(sourceAncestor) || [];
            if (!currentDeps.includes(targetAncestor)) {
                currentDeps.push(targetAncestor);
                deps.set(sourceAncestor, currentDeps);
                inDegree.set(targetAncestor, (inDegree.get(targetAncestor) || 0) + 1);
            }
         }
      }
    }

    const queue: string[] = [];
    for (const [id, deg] of inDegree.entries()) {
      if (deg === 0) queue.push(id);
    }

    // Track nodes that have been processed
    const processedNodes = new Set<string>();

    while (queue.length > 0) {
      if (this.aborted) throw new Error("Execution Aborted");
      const nodeId = queue.shift()!;
      const node = nodesInLevel.find(n => n.id === nodeId);
      if (!node) continue;

      processedNodes.add(nodeId);

      // Check if we should pause (breakpoint or step mode)
      // Note: shouldPause callback handles the actual waiting (via waitForStep),
      // so when it resolves, execution can continue immediately.
      if (this.debugCallbacks?.shouldPause) {
        if (this.aborted) throw new Error("Execution Aborted");
        this.updateNodeState(node.id, 'running');
        await this.debugCallbacks.shouldPause(node.id);
        if (this.aborted) throw new Error("Execution Aborted");
      }

      if (this.debugCallbacks?.onNodeStart) {
        this.debugCallbacks.onNodeStart(node.id);
      }
      
      if (!this.batchMode) {
        this.updateNodeState(node.id, 'running');
      }

      try {
        const def = NodeRegistry[node.type];
        if (!def) throw new Error("Unknown node: " + node.type);

        // Harvest Inputs
        const inputs: Record<string, any> = {};
        for (const port of def.inputs) {
           inputs[port.name] = this.runtime.portValues[`${node.id}_${port.name}`]; 
           if (inputs[port.name] === undefined && node.type !== 'io.tunnel') {
              // Wait, undefined is okay for some, but typically tunnels can pass undefined
           }
        }

        const ctx = {
          inputs,
          params: node.params || {},
          runtime: this.runtime,
          nodeId: node.id
        };

        // Execution Logic
        let result: Record<string, any> = {};

        if (node.type === 'structure.forLoop') {
           const N = Number(inputs.N) || 0;
           for (let i = 0; i < N; i++) {
              if (this.aborted) throw new Error("Execution Aborted");
              this.setPortValue(`${node.id}_i`, i);
              await this.executeSubgraph(node.id);
           }
        } else if (node.type === 'structure.whileLoop') {
           let count = 0;
           while (true) {
              if (this.aborted) throw new Error("Execution Aborted");
              await this.executeSubgraph(node.id);
              const stopCondition = Boolean(this.runtime.portValues[`${node.id}_stop`]);
              if (stopCondition) break;
              count++;
              // 异步防止主线程阻塞
              if (count % 1000 === 0) await new Promise(r => setTimeout(r, 0));
              if (count >= 100000) throw new Error("While Loop Timeout");
           }
        } else if (node.type === 'structure.case') {
           // Case Structure execution - execute only the selected case based on selector value
           const selectorValue = inputs.selector;
           const mode = node.params.mode || 'boolean';
           const cases = node.params.cases || ['true', 'false'];
           const defaultCase = node.params.defaultCase || 'false';
           
           // Determine which case to execute based on selector
           let caseToExecute: string;
           
           if (mode === 'boolean') {
             caseToExecute = selectorValue ? 'true' : 'false';
           } else {
             // Number mode - find matching case
             const matchedCase = cases.find((c: string) => String(selectorValue) === c);
             caseToExecute = matchedCase || defaultCase;
           }
           
           // Execute only the selected case subgraph
           await this.executeSubgraph(node.id, node.id, caseToExecute);
        } else {
           // Standard Node or Tunnel
           const nodeTask = await def.executor(ctx);
           result = nodeTask.outputs;
        }

        // Propagate outputs
        for (const port of def.outputs) {
           const key = port.name;
           const val = result[key];

            if (val !== undefined) {
              this.setPortValue(`${node.id}_${key}`, val);

              // Direct edge propagation across anywhere in the graph!
              const outEdges = this.edgeByNodePort.get(`${node.id}_${key}`) || [];
              for (const edge of outEdges) {
                 if (edge.sourceNode === node.id) {
                    this.setPortValue(`${edge.targetNode}_${edge.targetPort}`, val);
                 }
              }
            }
        }

        if (!this.batchMode) {
          this.updateNodeState(node.id, 'done');
        }
        
        if (this.debugCallbacks?.onNodeFinish) {
          this.debugCallbacks.onNodeFinish(node.id);
        }

      } catch (err: any) {
        this.updateNodeState(node.id, 'error');
        throw err;
      }

      // Decrement children in-degree
      const children = deps.get(node.id) || [];
      for (const childId of children) {
         let count = inDegree.get(childId)! - 1;
         inDegree.set(childId, count);
         if (count === 0) queue.push(childId);
      }
      
    }
    
    // Final check: ensure all nodes were processed
    const remainingNodes = nodesInLevel.filter(n => !processedNodes.has(n.id));
    if (remainingNodes.length > 0) {
      throw new Error(`Deadlock Detected: ${remainingNodes.length} nodes could not be executed. Check for missing connections or circular dependencies.`);
    }
  }

  public async executeAll() {
    if (this.detectCycles()) {
      throw new Error("Circular Dependency Detected");
    }

    for (const n of this.graph.nodes) {
      this.updateNodeState(n.id, 'idle');
    }

    // Initialize control terminal port values from UI controls before execution
    for (const control of this.graph.uiControls) {
      const termNode = this.graph.nodes.find(n => n.id === control.bindingNodeId);
      if (termNode && termNode.type === 'io.terminal') {
        const value = termNode.params?.value !== undefined ? termNode.params.value : control.defaultValue;
        if (control.direction === 'control') {
          this.setPortValue(`${termNode.id}_output`, value);
        }
        // For indicators, value flows in during execution via edges
      }
    }

    await this.executeSubgraph(undefined);
  }
}
