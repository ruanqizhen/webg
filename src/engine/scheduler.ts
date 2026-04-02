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

  constructor(
    graph: Graph,
    initialRuntime: RuntimeMemory,
    updateNodeState: (id: string, s: NodeState) => void,
    updatePortValue: (id: string, v: any) => void,
    debugCallbacks?: DebugCallbacks,
    batchMode: boolean = false
  ) {
    this.graph = graph;
    this.runtime = initialRuntime;
    this.updateNodeState = updateNodeState;
    this.updatePortValue = updatePortValue;
    this.debugCallbacks = debugCallbacks;
    this.batchMode = batchMode;
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
    const edgeByNodePort = new Map<string, Edge[]>();

    for (const edge of this.graph.edges) {
      // track global edge-by-node-port for direct value propagation
      const edgeKey = `${edge.sourceNode}_${edge.sourcePort}`;
      const pEdges = edgeByNodePort.get(edgeKey) || [];
      pEdges.push(edge);
      edgeByNodePort.set(edgeKey, pEdges);

      const sourceAncestor = this.getAncestorInLevel(edge.sourceNode, parentId);
      const targetAncestor = this.getAncestorInLevel(edge.targetNode, parentId);

      // If both ancestors exist in this level and are different, it's a structural dependency!
      if (sourceAncestor && targetAncestor && sourceAncestor !== targetAncestor) {
         // To avoid duplicating edges between the same components
         const currentDeps = deps.get(sourceAncestor) || [];
         if (!currentDeps.includes(targetAncestor)) {
             currentDeps.push(targetAncestor);
             deps.set(sourceAncestor, currentDeps);
             inDegree.set(targetAncestor, (inDegree.get(targetAncestor) || 0) + 1);
         }
      }
    }

    const queue: string[] = [];
    for (const [id, deg] of inDegree.entries()) {
      if (deg === 0) queue.push(id);
    }

    // Track nodes that have been processed
    const processedNodes = new Set<string>();
    let deadlockCheckCount = 0;

    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      const node = nodesInLevel.find(n => n.id === nodeId);
      if (!node) continue;

      processedNodes.add(nodeId);
      deadlockCheckCount = 0;  // Reset deadlock counter when a node is processed

      // Check if we should pause (breakpoint or step mode)
      if (this.debugCallbacks?.shouldPause) {
        const shouldPause = await this.debugCallbacks.shouldPause(node.id);
        if (shouldPause) {
          this.updateNodeState(node.id, 'running');
          // Wait for user to continue using a proper promise-based approach
          await new Promise<void>((resolve) => {
            const checkPause = () => {
              if (!this.debugCallbacks?.isPaused?.()) {
                this.debugCallbacks?.onContinue?.();
                resolve();
              } else {
                // Check again after 100ms
                setTimeout(checkPause, 100);
              }
            };
            checkPause();
          });
        }
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
              this.updatePortValue(`${node.id}_i`, i);
              await this.executeSubgraph(node.id);
           }
        } else if (node.type === 'structure.whileLoop') {
           let count = 0;
           while (true) {
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
             this.updatePortValue(`${node.id}_${key}`, val);

             // Direct edge propagation across anywhere in the graph!
             const outEdges = edgeByNodePort.get(`${node.id}_${key}`) || [];
             for (const edge of outEdges) {
                if (edge.sourceNode === node.id) {
                   this.updatePortValue(`${edge.targetNode}_${edge.targetPort}`, val);
                   // CRITICAL: Sync engine's internal runtime memory as well!
                   this.runtime.portValues[`${edge.targetNode}_${edge.targetPort}`] = val;
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
      
      // Deadlock detection: check if queue is empty but there are still nodes to process
      if (queue.length === 0) {
        const remainingNodes = nodesInLevel.filter(n => !processedNodes.has(n.id));
        if (remainingNodes.length > 0) {
          // Check if this is a deadlock situation
          deadlockCheckCount++;
          if (deadlockCheckCount >= 3) {  // Check a few times to avoid false positives
            throw new Error(`Deadlock Detected: ${remainingNodes.length} nodes cannot be executed due to unresolved dependencies`);
          }
        }
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

    await this.executeSubgraph(undefined);
  }
}
