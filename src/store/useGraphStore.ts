import { create } from 'zustand';
import type { Edge, Graph, NodeInstance, UIControl } from '../types/graph';
import { NodeRegistry } from '../engine/registry';
import { generateId, deepClone } from '../lib/utils';

const STORAGE_KEY = 'webg-project';
const AUTO_SAVE_INTERVAL = 30000; // 30 seconds

interface GraphState extends Graph {
  addNode: (node: NodeInstance) => void;
  updateNode: (id: string, updates: Partial<NodeInstance>, skipHistory?: boolean) => void;
  removeNode: (id: string) => void;

  addEdge: (edge: Edge) => void;
  removeEdge: (id: string) => void;

  addUIControl: (control: UIControl, terminalNode: NodeInstance) => void;
  updateUIControl: (id: string, updates: Partial<UIControl>, skipHistory?: boolean) => void;
  removeUIControl: (id: string) => void;

  clearGraph: () => void;

  // File operations
  loadGraph: (graph: Graph) => void;
  exportGraph: () => Graph;
  saveToStorage: () => void;
  loadFromStorage: () => boolean;
  startAutoSave: () => () => void;

  // Copy/Paste
  copyNode: (nodeId: string) => void;
  pasteNode: (position: { x: number; y: number }) => { nodeId: string | null; controlId: string | null };
  getClipboard: () => { node: NodeInstance | null; control: UIControl | null } | null;

  // History for Undo/Redo
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
}

// History stack limits
const MAX_HISTORY = 50;

export const useGraphStore = create<GraphState>((set, get) => {
  // Clipboard for copy/paste
  let clipboard: { node: NodeInstance | null; control: UIControl | null } | null = null;

  // History stacks for undo/redo
  let historyStack: Graph[] = [];
  let redoStack: Graph[] = [];

  const saveToHistory = () => {
    const state = get();
    const snapshot: Graph = deepClone({
      nodes: state.nodes,
      edges: state.edges,
      uiControls: state.uiControls
    });
    historyStack.push(snapshot);
    if (historyStack.length > MAX_HISTORY) {
      historyStack.shift();
    }
    redoStack = []; // Clear redo stack on new action
  };

  return {
    nodes: [],
    edges: [],
    uiControls: [],

    addNode: (node) => {
      saveToHistory();
      set((state) => ({ nodes: [...state.nodes, { ...node, id: node.id || generateId() }] }));
    },

    updateNode: (id, updates, skipHistory) => {
      if (!skipHistory) saveToHistory();
      set((state) => ({
        nodes: state.nodes.map(n => n.id === id ? { ...n, ...updates } : n)
      }));
    },

    removeNode: (id) => {
      saveToHistory();
      set((state) => {
        // Recursively collect all descendant node IDs
        const idsToRemove = new Set<string>();
        const collectDescendants = (parentId: string) => {
          idsToRemove.add(parentId);
          for (const n of state.nodes) {
            if (n.parent === parentId && !idsToRemove.has(n.id)) {
              collectDescendants(n.id);
            }
          }
        };
        collectDescendants(id);

        const nodes = state.nodes.filter(n => !idsToRemove.has(n.id));
        const edges = state.edges.filter(e => !idsToRemove.has(e.sourceNode) && !idsToRemove.has(e.targetNode));
        const uiControls = state.uiControls.filter(c => !idsToRemove.has(c.bindingNodeId));
        return { nodes, edges, uiControls };
      });
    },

    addEdge: (newEdge) => {
      saveToHistory();
      set((state) => {
        const sourceNode = state.nodes.find(n => n.id === newEdge.sourceNode);
        const targetNode = state.nodes.find(n => n.id === newEdge.targetNode);

        const filteredEdges = state.edges.filter(e => {
          if (e.targetNode === newEdge.targetNode && e.targetPort === newEdge.targetPort) {
             const tNode = state.nodes.find(n => n.id === newEdge.targetNode);
             if (tNode?.type === 'io.tunnel') {
                const pNode = state.nodes.find(n => n.id === tNode.parent);
                if (pNode?.type === 'structure.case') {
                   // Preserve connections from OTHER branches. Replace if from the SAME branch.
                   const eNode = state.nodes.find(n => n.id === e.sourceNode);
                   if (eNode?.caseId === sourceNode?.caseId) {
                       return false; 
                   }
                   return true;
                }
             }
             return false;
          }
          return true;
        });

        const isInternalPort = (nodeType: string, portName: string, direction: 'input' | 'output'): boolean => {
          const def = NodeRegistry[nodeType];
          if (!def) return false;
          const port = direction === 'input' 
             ? def.inputs.find((p: any) => p.name === portName)
             : def.outputs.find((p: any) => p.name === portName);
          return !!port?.isInternal;
        };

        const isBoundaryCrossing = (source: NodeInstance, target: NodeInstance, sourcePort: string, targetPort: string): boolean => {
          if (source.parent === target.parent) return false;
          
          // Check if source is the parent of target AND the port is internal
          if (source.id === target.parent && isInternalPort(source.type, sourcePort, 'output')) return false;
          
          // Check if target is the parent of source AND the port is internal (e.g. while loop stop)
          if (target.id === source.parent && isInternalPort(target.type, targetPort, 'input')) return false;
          
          return true;
        };

        if (sourceNode && targetNode && isBoundaryCrossing(sourceNode, targetNode, newEdge.sourcePort, newEdge.targetPort)) {
          const getGlobalPos = (n: any) => {
             let x = n.position?.x || 0;
             let y = n.position?.y || 0;
             let currentP = n.parent;
             while (currentP) {
                const parentNode = state.nodes.find(p => p.id === currentP);
                if (parentNode) {
                   x += parentNode.position?.x || 0;
                   y += parentNode.position?.y || 0;
                   currentP = parentNode.parent;
                } else break;
             }
             return { x, y };
          };

          const sGlobal = getGlobalPos(sourceNode);
          const tGlobal = getGlobalPos(targetNode);
          sGlobal.x += sourceNode.width || 60;
          sGlobal.y += 20;
          tGlobal.y += 20;

          const spawnTunnel = (parentId: string, isInput: boolean) => {
            const pStruct = state.nodes.find(n => n.id === parentId);
            let spawnX = 0;
            let spawnY = 50;
            if (pStruct) {
              const structGlobal = getGlobalPos(pStruct);
              const borderX = isInput ? structGlobal.x : structGlobal.x + (pStruct.width || 300);
              const dx = tGlobal.x - sGlobal.x;
              const dy = tGlobal.y - sGlobal.y;
              let intersectYGlobal = sGlobal.y;
              if (Math.abs(dx) > 1) {
                intersectYGlobal = sGlobal.y + dy * ((borderX - sGlobal.x) / dx);
              }
              const localSpawnY = intersectYGlobal - structGlobal.y - 8;
              spawnX = isInput ? 0 : (pStruct.width || 300) - 16;
              spawnY = Math.max(0, Math.min((pStruct.height || 200) - 16, localSpawnY));
            }
            const tunnelId = generateId();
            const tunnelNode: NodeInstance = {
              id: tunnelId,
              type: 'io.tunnel',
              position: { x: spawnX, y: spawnY },
              parent: parentId,
              inputs: [],
              outputs: [],
              params: {}
            };
            return { tunnelId, tunnelNode };
          };

          const bothHaveParents = !!sourceNode.parent && !!targetNode.parent;

          if (bothHaveParents && sourceNode.parent !== targetNode.parent) {
            // Both nodes are inside different structures: create two tunnels
            const outTunnel = spawnTunnel(sourceNode.parent!, false);
            const inTunnel = spawnTunnel(targetNode.parent!, true);
            const edge1: Edge = {
              id: `e_${newEdge.sourceNode}_${newEdge.sourcePort}-${outTunnel.tunnelId}_input`,
              sourceNode: newEdge.sourceNode,
              sourcePort: newEdge.sourcePort,
              targetNode: outTunnel.tunnelId,
              targetPort: 'input'
            };
            const edgeMid: Edge = {
              id: `e_${outTunnel.tunnelId}_output-${inTunnel.tunnelId}_input`,
              sourceNode: outTunnel.tunnelId,
              sourcePort: 'output',
              targetNode: inTunnel.tunnelId,
              targetPort: 'input'
            };
            const edge2: Edge = {
              id: `e_${inTunnel.tunnelId}_output-${newEdge.targetNode}_${newEdge.targetPort}`,
              sourceNode: inTunnel.tunnelId,
              sourcePort: 'output',
              targetNode: newEdge.targetNode,
              targetPort: newEdge.targetPort
            };
            return {
              nodes: [...state.nodes, outTunnel.tunnelNode, inTunnel.tunnelNode],
              edges: [...filteredEdges, edge1, edgeMid, edge2]
            };
          } else {
            // One node is inside a structure, the other is outside
            const isInputTunnel = !!targetNode.parent && targetNode.parent !== sourceNode.parent;
            const tunnelParent = isInputTunnel ? targetNode.parent! : sourceNode.parent!;
            const tunnel = spawnTunnel(tunnelParent, isInputTunnel);

            const edge1: Edge = {
              id: `e_${newEdge.sourceNode}_${newEdge.sourcePort}-${tunnel.tunnelId}_input`,
              sourceNode: newEdge.sourceNode,
              sourcePort: newEdge.sourcePort,
              targetNode: tunnel.tunnelId,
              targetPort: 'input'
            };
            const edge2: Edge = {
              id: `e_${tunnel.tunnelId}_output-${newEdge.targetNode}_${newEdge.targetPort}`,
              sourceNode: tunnel.tunnelId,
              sourcePort: 'output',
              targetNode: newEdge.targetNode,
              targetPort: newEdge.targetPort
            };
            return { nodes: [...state.nodes, tunnel.tunnelNode], edges: [...filteredEdges, edge1, edge2] };
          }
        }

        return { edges: [...filteredEdges, newEdge] };
      });
    },

    removeEdge: (id) => {
      saveToHistory();
      set((state) => ({
        edges: state.edges.filter(e => e.id !== id)
      }));
    },

    addUIControl: (control, terminalNode) => {
      saveToHistory();
      set((state) => ({
        uiControls: [...state.uiControls, control],
        nodes: [...state.nodes, terminalNode]
      }));
    },

    updateUIControl: (id, updates, skipHistory) => {
      if (!skipHistory) saveToHistory();
      set((state) => ({
        uiControls: state.uiControls.map(c => c.id === id ? { ...c, ...updates } : c)
      }));
    },

    removeUIControl: (id) => {
      saveToHistory();
      set((state) => {
        const control = state.uiControls.find(c => c.id === id);
        const uiControls = state.uiControls.filter(c => c.id !== id);
        let nodes = state.nodes;
        let edges = state.edges;
        if (control) {
          nodes = nodes.filter(n => n.id !== control.bindingNodeId);
          edges = edges.filter(e => e.sourceNode !== control.bindingNodeId && e.targetNode !== control.bindingNodeId);
        }
        return { uiControls, nodes, edges };
      });
    },

    clearGraph: () => {
      saveToHistory();
      set({ nodes: [], edges: [], uiControls: [] });
    },

    exportGraph: () => {
      const state = get();
      return {
        nodes: state.nodes,
        edges: state.edges,
        uiControls: state.uiControls
      };
    },

    loadGraph: (graph: Graph) => {
      saveToHistory();
      set({
        nodes: graph.nodes || [],
        edges: graph.edges || [],
        uiControls: graph.uiControls || []
      });
    },

    copyNode: (nodeId) => {
      const state = get();
      const node = state.nodes.find(n => n.id === nodeId);
      const control = state.uiControls.find(c => c.bindingNodeId === nodeId);

      if (node) {
        clipboard = {
          node: { ...node, id: '', position: { x: 0, y: 0 } },
          control: control ? { ...control, id: '', bindingNodeId: '' } : null
        };
      }
    },

    pasteNode: (position) => {
      if (!clipboard || !clipboard.node) {
        return { nodeId: null, controlId: null };
      }

      const newNodeId = generateId();
      const newControlId = clipboard.control ? generateId() : null;

      const newNode: NodeInstance = {
        ...clipboard.node,
        id: newNodeId,
        position: { ...position },
        inputs: [...clipboard.node.inputs],
        outputs: [...clipboard.node.outputs],
        params: { ...clipboard.node.params }
      };

      // Save history once and perform both operations together
      saveToHistory();
      
      if (clipboard.control && newControlId) {
        const newControl: UIControl = {
          ...clipboard.control,
          id: newControlId,
          bindingNodeId: newNodeId,
          x: position.x - 100,
          y: position.y
        };
        set((state) => ({
          nodes: [...state.nodes, newNode],
          uiControls: [...state.uiControls, newControl]
        }));
      } else {
        set((state) => ({ nodes: [...state.nodes, newNode] }));
      }

      return { nodeId: newNodeId, controlId: newControlId };
    },

    getClipboard: () => clipboard,

    pushHistory: () => saveToHistory(),

    undo: () => {
      if (historyStack.length === 0) return;

      const state = get();
      const currentState: Graph = {
        nodes: [...state.nodes],
        edges: [...state.edges],
        uiControls: [...state.uiControls]
      };
      redoStack.push(currentState);

      const previousState = historyStack.pop();
      if (previousState) {
        set({
          nodes: previousState.nodes,
          edges: previousState.edges,
          uiControls: previousState.uiControls
        });
      }
    },

    redo: () => {
      if (redoStack.length === 0) return;

      const state = get();
      const currentState: Graph = {
        nodes: [...state.nodes],
        edges: [...state.edges],
        uiControls: [...state.uiControls]
      };
      historyStack.push(currentState);

      const nextState = redoStack.pop();
      if (nextState) {
        set({
          nodes: nextState.nodes,
          edges: nextState.edges,
          uiControls: nextState.uiControls
        });
      }
    },

    canUndo: () => historyStack.length > 0,

    canRedo: () => redoStack.length > 0,
    
    // Save to localStorage
    saveToStorage: () => {
      try {
        const state = get();
        const data = {
          version: '1.1',
          timestamp: Date.now(),
          graph: {
            nodes: state.nodes,
            edges: state.edges,
            uiControls: state.uiControls
          }
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch (err) {
        console.error('Failed to save to storage:', err);
      }
    },
    
    // Load from localStorage (bypasses loadGraph to avoid pushing empty state to history)
    loadFromStorage: () => {
      try {
        const data = localStorage.getItem(STORAGE_KEY);
        if (!data) return false;
        
        const parsed = JSON.parse(data);
        if (parsed.graph) {
          set({
            nodes: parsed.graph.nodes || [],
            edges: parsed.graph.edges || [],
            uiControls: parsed.graph.uiControls || []
          });
          return true;
        }
        return false;
      } catch (err) {
        console.error('Failed to load from storage:', err);
        return false;
      }
    },
    
    // Start auto-save interval, returns cleanup function
    startAutoSave: () => {
      const intervalId = setInterval(() => {
        get().saveToStorage();
      }, AUTO_SAVE_INTERVAL);
      
      // Initial save after 2 seconds
      setTimeout(() => get().saveToStorage(), 2000);
      
      return () => clearInterval(intervalId);
    }
  };
});
