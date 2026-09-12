import type { Graph, Edge, NodeInstance } from '../types/graph';
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
  private nodeMap = new Map<string, NodeInstance>();

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
    this.buildMaps();
  }

  /** Abort a running execution */
  public abort() {
    this.aborted = true;
  }

  /** Update a port value in the engine's internal runtime. In batch mode defers store sync. */
  private setPortValue(portId: string, value: any) {
    this.runtime.portValues[portId] = value;
    if (!this.batchMode) {
      this.updatePortValue(portId, value);
    }
  }

  /** Flush all buffered port values to the external store (batch mode only) */
  private flushPortValues() {
    if (this.batchMode) {
      for (const [portId, value] of Object.entries(this.runtime.portValues)) {
        this.updatePortValue(portId, value);
      }
    }
  }

  /** Buffered node-state update: always recorded internally, synced to the store immediately only when not batching. */
  private setNodeStateBuffered(id: string, s: NodeState) {
    this.runtime.nodeState[id] = s;
    if (!this.batchMode) {
      this.updateNodeState(id, s);
    }
  }

  /** Flush all buffered node states to the external store (batch mode only) */
  private flushNodeStates() {
    if (this.batchMode) {
      for (const [nodeId, state] of Object.entries(this.runtime.nodeState)) {
        this.updateNodeState(nodeId, state as NodeState);
      }
    }
  }

  /** Build the edge and node lookup maps once for the entire execution */
  private buildMaps() {
    this.edgeByNodePort.clear();
    for (const edge of this.graph.edges) {
      const edgeKey = `${edge.sourceNode}_${edge.sourcePort}`;
      const arr = this.edgeByNodePort.get(edgeKey) || [];
      arr.push(edge);
      this.edgeByNodePort.set(edgeKey, arr);
    }
    this.nodeMap.clear();
    for (const node of this.graph.nodes) {
      this.nodeMap.set(node.id, node);
    }
  }

  // Find the ancestor of nodeId that sits exactly in the current parentId level
  private getAncestorInLevel(nodeId: string, parentId: string | undefined): string | null {
    let curr = this.nodeMap.get(nodeId);
    while (curr) {
      if (curr.parent === parentId) return curr.id;
      const parentRef = curr.parent;
      if (!parentRef) return null;
      const nextCurr = this.nodeMap.get(parentRef);
      if (!nextCurr) return null;
      curr = nextCurr;
    }
    return null;
  }

  /** Look up a port's declared type: instance dynamic ports first, then registry def. */
  private getPortType(nodeId: string, portName: string, direction: 'input' | 'output'): string | undefined {
    const node = this.nodeMap.get(nodeId);
    if (!node) return undefined;
    const instancePorts = direction === 'input' ? node.inputs : node.outputs;
    const inst = instancePorts?.find(p => p.name === portName);
    if (inst?.type && inst.type !== 'any') return inst.type;
    const def = NodeRegistry[node.type];
    const defPorts = direction === 'input' ? def?.inputs : def?.outputs;
    const dep = defPorts?.find((p: any) => p.name === portName);
    if (dep?.type && (dep as any).type !== 'any') return (dep as any).type;
    // LabVIEW-style: integer-configured number constant / terminal reports integer
    if (node.type === 'source.number' && node.params?.numberType === 'integer') return 'integer';
    if (node.type === 'io.terminal') {
      const ctrl = this.graph.uiControls.find(c => c.bindingNodeId === node.id);
      if (ctrl?.numberType === 'integer') return 'integer';
    }
    return inst?.type ?? (dep as any)?.type;
  }

  /** Walk upstream past tunnels/SRs to find the first concrete value type feeding a tunnel/SR. */
  private inferTunnelType(tunnelId: string): string | undefined {
    const seen = new Set<string>();
    const stack: string[] = [tunnelId];
    let hops = 0;
    while (stack.length > 0 && hops < 50) {
      const currId = stack.pop()!;
      if (seen.has(currId)) continue;
      seen.add(currId);
      hops++;
      const incoming = this.graph.edges.filter(e => e.targetNode === currId);
      for (const edge of incoming) {
        const srcNode = this.nodeMap.get(edge.sourceNode);
        if (!srcNode) continue;
        if (srcNode.type === 'io.tunnel' || srcNode.type === 'io.shiftRegister') {
          stack.push(srcNode.id);
          continue;
        }
        const t = this.getPortType(edge.sourceNode, edge.sourcePort, 'output');
        if (t && t.toLowerCase() !== 'any') return t;
      }
    }
    return undefined;
  }

  /** LabVIEW-like default for a declared type. */
  private defaultForType(type: string | undefined): any {
    if (!type) return 0;
    const lower = type.toLowerCase();
    if (lower.endsWith('[]') || lower === 'array') return [];
    const base = lower.replace('[]', '');
    if (base === 'boolean') return false;
    if (base === 'string') return '';
    if (base === 'number' || base === 'integer') return 0;
    return 0;
  }

  /** Type-aware tunnel default (boolean->false, string->"", array->[], else 0). */
  private defaultForTunnelTypeById(tunnelId: string): any {
    return this.defaultForType(this.inferTunnelType(tunnelId));
  }

  public detectCycles(): boolean {
    // Group nodes by parent (+ caseId for Case structures) and ignore cross-group edges.
    // Tunnel / ShiftRegister nodes are intentionally ignored because they break cycles by design
    // (feedback via SR is handled explicitly by the scheduler, not as a graph edge cycle).
    const nodeMap = new Map<string, NodeInstance>();
    for (const n of this.graph.nodes) nodeMap.set(n.id, n);

    const excludedTypes = new Set(['io.tunnel', 'io.shiftRegister']);

    // Build groups: key = parentId + caseId (caseId only matters inside Case structures)
    const groupKey = (n: NodeInstance): string => {
      const parent = n.parent ?? '__root__';
      const pNode = parent !== '__root__' ? nodeMap.get(parent) : undefined;
      if (pNode?.type === 'structure.case') {
        return `${parent}::${n.caseId ?? '__noCase'}`;
      }
      return parent;
    };

    const groups = new Map<string, NodeInstance[]>();
    for (const n of this.graph.nodes) {
      if (excludedTypes.has(n.type)) continue;
      const key = groupKey(n);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(n);
    }

    for (const [, groupNodes] of groups) {
      if (groupNodes.length <= 1) continue;
      const idSet = new Set(groupNodes.map(n => n.id));
      const deps = new Map<string, string[]>();
      for (const n of groupNodes) deps.set(n.id, []);

      for (const e of this.graph.edges) {
        if (!idSet.has(e.sourceNode) || !idSet.has(e.targetNode)) continue;
        // Skip if either endpoint is tunnel/SR (already filtered nodes, but edge could point to excluded? already not in idSet)
        const srcNode = nodeMap.get(e.sourceNode);
        const tgtNode = nodeMap.get(e.targetNode);
        if (!srcNode || !tgtNode) continue;
        if (excludedTypes.has(srcNode.type) || excludedTypes.has(tgtNode.type)) continue;
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
      };

      for (const n of groupNodes) {
        if (dfs(n.id)) return true;
      }
    }
    return false;
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

      this.setNodeStateBuffered(node.id, 'running');

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

         if (node.type === 'structure.forLoop' || node.type === 'structure.whileLoop') {
            // Show the loop container as running immediately even in batch mode (inner nodes stay buffered)
            this.updateNodeState(node.id, 'running');
            // Find all tunnels belonging to this loop
            const childTunnels = this.graph.nodes.filter(n => n.parent === node.id && n.type === 'io.tunnel');

            // Robust classification: input tunnel = incoming edge from outside loop, output = from inside
            const isDescendantOf = (candidateId: string, ancestorId: string): boolean => {
              let cur = this.nodeMap.get(candidateId);
              while (cur) {
                if (cur.parent === ancestorId) return true;
                if (!cur.parent) return false;
                cur = this.nodeMap.get(cur.parent);
                if (!cur) return false;
                if (cur.id === ancestorId) return true;
              }
              return false;
            };

            const inputTunnels: typeof childTunnels = [];
            const outputTunnels: typeof childTunnels = [];
            for (const t of childTunnels) {
               const incoming = this.graph.edges.filter(e => e.targetNode === t.id);
               if (incoming.length === 0) {
                 // Fallback: use position heuristic and explicit side param if present
                 const parentW = node.width || 300;
                 const explicitSide = (t.params as any)?.side;
                 if (explicitSide) {
                   if (explicitSide === 'left') inputTunnels.push(t);
                   else outputTunnels.push(t);
                 } else if ((t.position?.x ?? 0) < parentW / 2) {
                   inputTunnels.push(t);
                 } else {
                   outputTunnels.push(t);
                 }
                 continue;
               }
               const srcId = incoming[0].sourceNode;
               // If source is inside this loop => output tunnel, else input
               if (isDescendantOf(srcId, node.id)) {
                 outputTunnels.push(t);
               } else {
                 inputTunnels.push(t);
               }
            }

            // Resolve indexed input arrays and determine auto-N (For Loop only — While does not auto from array length)
            const indexedInputArrays = new Map<string, any[]>();
            let autoN = -1;
            if (node.type === 'structure.forLoop') {
              for (const tunnel of inputTunnels) {
                 const isIndexing = tunnel.params?.indexing ?? true;
                 if (!isIndexing) continue;
                 const val = this.runtime.portValues[`${tunnel.id}_input`];
                 if (Array.isArray(val)) {
                    indexedInputArrays.set(tunnel.id, val);
                    if (autoN < 0 || val.length < autoN) autoN = val.length;
                 }
              }
            }

            // Determine N: explicit value takes priority, else auto from shortest indexed array (For only)
            const rawN = inputs.N;
            const parsedN = rawN !== undefined ? Number(rawN) : NaN;
            const explicitN = isFinite(parsedN) ? Math.trunc(parsedN) : undefined;
            let N: number;
            if (explicitN !== undefined) {
              N = Math.max(0, explicitN);
            } else if (node.type === 'structure.forLoop' && autoN >= 0) {
              N = autoN;
            } else {
              N = 0;
            }
            const hasExplicitN = explicitN !== undefined;

            // Helper to provide LabVIEW-like default values instead of undefined
            const defaultForAny = (sample: any): any => {
              if (Array.isArray(sample)) return sample.length > 0 ? defaultForAny(sample[0]) : 0;
              if (typeof sample === 'boolean') return false;
              if (typeof sample === 'string') return '';
              if (typeof sample === 'number') return 0;
              return 0;
            };

            const defaultForTunnelType = (tunnelId: string): any => this.defaultForTunnelTypeById(tunnelId);

            if (hasExplicitN && autoN >= 0 && N > autoN) {
              console.warn(`For Loop "${node.id}": N=${N} but input arrays have length ${autoN}. Out-of-range iterations will use default values.`);
            }

            // Prepare output tunnel collectors
            const outputCollectors = new Map<string, any[]>();
            for (const tunnel of outputTunnels) {
               const isIndexing = tunnel.params?.indexing ?? (node.type === 'structure.forLoop' ? true : false);
               if (isIndexing) {
                  outputCollectors.set(tunnel.id, []);
               }
            }

            // === Shift Registers ===
            const shiftRegs = this.graph.nodes.filter(n => n.parent === node.id && n.type === 'io.shiftRegister');
            const srPairs = new Map<string, { left?: typeof shiftRegs[0], right?: typeof shiftRegs[0] }>();
            for (const sr of shiftRegs) {
               const pairId = sr.params?.pairId;
               if (!pairId) continue;
               if (!srPairs.has(pairId)) srPairs.set(pairId, {});
               const pair = srPairs.get(pairId)!;
               if (sr.params?.side === 'left') pair.left = sr;
               else if (sr.params?.side === 'right') pair.right = sr;
            }

            // Initialize left registers from external wires (before iteration 0) — with safe defaults
            for (const [, pair] of srPairs) {
               if (pair.left) {
                  let initVal = this.runtime.portValues[`${pair.left.id}_input`];
                  if (initVal === undefined) {
                    // LabVIEW default: 0/false/"" depending on connected type — fall back to 0
                    initVal = defaultForTunnelType(pair.left.id);
                  }
                  this.setPortValue(`${pair.left.id}_output`, initVal);
                  const lEdges = this.edgeByNodePort.get(`${pair.left.id}_output`) || [];
                  for (const edge of lEdges) {
                     this.setPortValue(`${edge.targetNode}_${edge.targetPort}`, initVal);
                  }
               }
            }

            // Read loop params for conditional / conditionMode
            const forHasConditional = node.type === 'structure.forLoop' ? Boolean(node.params?.hasConditional) : false;
            const forCondMode = node.params?.conditionalMode || 'stopIfTrue';
            const whileCondMode = node.params?.conditionMode || 'stopIfTrue';
            const whileMaxIter = Number(node.params?.maxIterations) || (node.type === 'structure.whileLoop' ? 100000 : 0);
            const forMaxIter = Number(node.params?.maxIterations) || 0; // 0 = no limit for For

            const runIteration = async (iterationIndex: number) => {
               if (this.aborted) throw new Error("Execution Aborted");

               this.setPortValue(`${node.id}_i`, iterationIndex);
               const iEdges = this.edgeByNodePort.get(`${node.id}_i`) || [];
               for (const edge of iEdges) {
                  if (edge.sourceNode === node.id) {
                     this.setPortValue(`${edge.targetNode}_${edge.targetPort}`, iterationIndex);
                  }
               }

               // Feed input tunnels: array[i] → tunnel output, or constant → tunnel output
               for (const tunnel of inputTunnels) {
                  const isIndexing = tunnel.params?.indexing ?? (node.type === 'structure.forLoop' ? true : false);
                  if (isIndexing) {
                     const arr = indexedInputArrays.get(tunnel.id) || [];
                     let element: any;
                     if (iterationIndex < arr.length) {
                       element = arr[iterationIndex];
                     } else {
                       // Out of bounds → LabVIEW returns default(T) rather than undefined
                       const sample = arr.length > 0 ? arr[0] : undefined;
                       element = sample !== undefined ? defaultForAny(sample) : defaultForTunnelType(tunnel.id);
                       if (arr.length > 0) {
                         console.warn(`Loop iteration ${iterationIndex}: tunnel "${tunnel.id}" array length ${arr.length} out of bounds, using default.`);
                       }
                     }
                     this.setPortValue(`${tunnel.id}_output`, element);
                     const tEdges = this.edgeByNodePort.get(`${tunnel.id}_output`) || [];
                     for (const edge of tEdges) {
                        this.setPortValue(`${edge.targetNode}_${edge.targetPort}`, element);
                     }
                  } else {
                     const val = this.runtime.portValues[`${tunnel.id}_input`];
                     this.setPortValue(`${tunnel.id}_output`, val);
                     const tEdges = this.edgeByNodePort.get(`${tunnel.id}_output`) || [];
                     for (const edge of tEdges) {
                        this.setPortValue(`${edge.targetNode}_${edge.targetPort}`, val);
                     }
                  }
               }

               await this.executeSubgraph(node.id);

               // Collect output tunnel values for indexing
               for (const tunnel of outputTunnels) {
                  const isIndexing = tunnel.params?.indexing ?? (node.type === 'structure.forLoop' ? true : false);
                  if (isIndexing && outputCollectors.has(tunnel.id)) {
                     const val = this.runtime.portValues[`${tunnel.id}_input`];
                     outputCollectors.get(tunnel.id)!.push(val);
                  }
               }

               // Shift registers: copy right → left for next iteration
               for (const [, pair] of srPairs) {
                  if (pair.right && pair.left) {
                     const rightVal = this.runtime.portValues[`${pair.right.id}_input`];
                     // If right not wired inside, keep left value to avoid NaN
                     const safeRight = rightVal !== undefined ? rightVal : this.runtime.portValues[`${pair.left.id}_output`];
                     this.setPortValue(`${pair.right.id}_output`, safeRight);
                     this.setPortValue(`${pair.left.id}_output`, safeRight);
                     const lEdges = this.edgeByNodePort.get(`${pair.left.id}_output`) || [];
                     for (const edge of lEdges) {
                        this.setPortValue(`${edge.targetNode}_${edge.targetPort}`, safeRight);
                     }
                  }
               }
            };

            if (node.type === 'structure.forLoop') {
               const limit = forMaxIter > 0 ? Math.min(N, forMaxIter) : N;
               if (forMaxIter > 0 && N > forMaxIter) {
                 console.warn(`For Loop "${node.id}": N=${N} exceeds maxIterations ${forMaxIter}, clamped.`);
               }
               for (let i = 0; i < limit; i++) {
                  await runIteration(i);
                  // Yield periodically so large N doesn't block the main thread / abort stays responsive
                  if (i % 50 === 49) await new Promise<void>(r => setTimeout(r, 0));
                  // Check conditional terminal (optional break)
                  if (forHasConditional) {
                    const condRaw = this.runtime.portValues[`${node.id}_conditional`];
                    if (condRaw !== undefined) {
                      const cond = Boolean(condRaw);
                      const shouldBreak = forCondMode === 'stopIfTrue' ? cond : !cond;
                      if (shouldBreak) break;
                    }
                  }
               }
            } else {
               let count = 0;
               const maxIter = whileMaxIter > 0 ? whileMaxIter : 100000;
               while (true) {
                  await runIteration(count);
                  const stopRaw = this.runtime.portValues[`${node.id}_stop`];
                  const stopCondition = Boolean(stopRaw);
                  const shouldStop = whileCondMode === 'stopIfTrue' ? stopCondition : !stopCondition;
                  if (shouldStop) break;
                  count++;
                  if (count % 50 === 0) await new Promise<void>(r => setTimeout(r, 0));
                  if (count >= maxIter) {
                    if (whileMaxIter > 0) throw new Error(`While Loop "${node.id}" exceeded maxIterations ${maxIter}. Check stop condition.`);
                    else throw new Error("While Loop Timeout: exceeded 100,000 iterations. Check your stop condition or add a counter check.");
                  }
               }
            }

            // After loop: set output tunnel values
            for (const tunnel of outputTunnels) {
               const isIndexing = tunnel.params?.indexing ?? (node.type === 'structure.forLoop' ? true : false);
               if (isIndexing && outputCollectors.has(tunnel.id)) {
                  const arr = outputCollectors.get(tunnel.id)!;
                  this.setPortValue(`${tunnel.id}_output`, arr);
                  const tEdges = this.edgeByNodePort.get(`${tunnel.id}_output`) || [];
                  for (const edge of tEdges) {
                     this.setPortValue(`${edge.targetNode}_${edge.targetPort}`, arr);
                  }
               } else {
                  // Non-indexed: last value, or default if 0 iterations (LabVIEW behavior)
                  let lastVal = this.runtime.portValues[`${tunnel.id}_input`];
                  if (lastVal === undefined) {
                    lastVal = defaultForTunnelType(tunnel.id);
                  }
                  this.setPortValue(`${tunnel.id}_output`, lastVal);
                  const tEdges = this.edgeByNodePort.get(`${tunnel.id}_output`) || [];
                  for (const edge of tEdges) {
                     this.setPortValue(`${edge.targetNode}_${edge.targetPort}`, lastVal);
                  }
               }
            }

            // After loop: propagate right shift register outputs outward
            for (const [, pair] of srPairs) {
               if (pair.right) {
                  const finalVal = this.runtime.portValues[`${pair.right.id}_input`] ?? this.runtime.portValues[`${pair.right.id}_output`] ?? defaultForTunnelType(pair.right.id);
                  this.setPortValue(`${pair.right.id}_output`, finalVal);
                  const rEdges = this.edgeByNodePort.get(`${pair.right.id}_output`) || [];
                  for (const edge of rEdges) {
                     this.setPortValue(`${edge.targetNode}_${edge.targetPort}`, finalVal);
                  }
               }
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
           let applyStandardExecution = true;
           if (node.type === 'io.tunnel' || node.type === 'io.shiftRegister') {
              const pNode = node.parent ? this.nodeMap.get(node.parent) : undefined;
               if (pNode?.type === 'structure.forLoop' || pNode?.type === 'structure.whileLoop') {
                 applyStandardExecution = false;
              }
           }

           if (applyStandardExecution) {
              const nodeTask = await def.executor(ctx);
              result = nodeTask.outputs;
           }

           // Apply integer truncation for number constants configured as integer
           if (node.type === 'source.number' && node.params?.numberType === 'integer') {
              for (const key of Object.keys(result)) {
                 if (typeof result[key] === 'number') {
                    result[key] = Math.trunc(result[key]);
                 }
              }
           }
           // Apply integer truncation for io.terminal with integer control
           if (node.type === 'io.terminal') {
              const ctrl = this.graph.uiControls.find(c => c.bindingNodeId === node.id);
              if (ctrl?.numberType === 'integer') {
                 for (const key of Object.keys(result)) {
                    if (typeof result[key] === 'number') {
                       result[key] = Math.trunc(result[key]);
                    }
                 }
              }
           }
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

        this.setNodeStateBuffered(node.id, 'done');
        
        if (this.debugCallbacks?.onNodeFinish) {
          this.debugCallbacks.onNodeFinish(node.id);
        }

      } catch (err: any) {
        this.runtime.nodeState[node.id] = 'error';
        this.updateNodeState(node.id, 'error');
        throw err;
      }

      // Decrement children in-degree
      const children = deps.get(node.id) || [];
      for (const childId of children) {
         const prev = inDegree.get(childId);
         if (prev === undefined) continue;
         const next = prev - 1;
         inDegree.set(childId, next);
         if (next === 0) queue.push(childId);
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

    // Start from a clean runtime: stale port values / node states from a
    // previous run (or deleted nodes) must never leak into this execution.
    this.runtime.portValues = {};
    this.runtime.nodeState = {};

    for (const n of this.graph.nodes) {
      this.updateNodeState(n.id, 'idle');
    }

    // Initialize control terminal port values from UI controls before execution
    for (const control of this.graph.uiControls) {
      const termNode = this.nodeMap.get(control.bindingNodeId);
      if (termNode && termNode.type === 'io.terminal') {
        const value = termNode.params?.value !== undefined ? termNode.params.value : control.defaultValue;
        if (control.direction === 'control') {
          this.setPortValue(`${termNode.id}_output`, value);
        }
        // For indicators, value flows in during execution via edges
      }
    }

    try {
      await this.executeSubgraph(undefined);
    } finally {
      // Buffered node states always flush (done/error mapping survives failures);
      // port values only flush on success to avoid surfacing partial garbage on error/abort.
      this.flushNodeStates();
    }
    this.flushPortValues();
  }
}
