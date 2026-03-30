import { create } from 'zustand';
import type { Edge, Graph, NodeInstance, UIControl } from '../types/graph';
import { generateId, deepClone } from '../lib/utils';

const STORAGE_KEY = 'webg-project';
const AUTO_SAVE_INTERVAL = 30000; // 30 seconds

interface GraphState extends Graph {
  addNode: (node: NodeInstance) => void;
  updateNode: (id: string, updates: Partial<NodeInstance>) => void;
  removeNode: (id: string) => void;

  addEdge: (edge: Edge) => void;
  removeEdge: (id: string) => void;

  addUIControl: (control: UIControl, terminalNode: NodeInstance) => void;
  updateUIControl: (id: string, updates: Partial<UIControl>) => void;
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

    updateNode: (id, updates) => {
      saveToHistory();
      set((state) => ({
        nodes: state.nodes.map(n => n.id === id ? { ...n, ...updates } : n)
      }));
    },

    removeNode: (id) => {
      saveToHistory();
      set((state) => {
        const nodes = state.nodes.filter(n => n.id !== id);
        const edges = state.edges.filter(e => e.sourceNode !== id && e.targetNode !== id);
        const uiControls = state.uiControls.filter(c => c.bindingNodeId !== id);
        return { nodes, edges, uiControls };
      });
    },

    addEdge: (newEdge) => {
      saveToHistory();
      set((state) => {
        const sourceNode = state.nodes.find(n => n.id === newEdge.sourceNode);
        const targetNode = state.nodes.find(n => n.id === newEdge.targetNode);

        const filteredEdges = state.edges.filter(e =>
          !(e.targetNode === newEdge.targetNode && e.targetPort === newEdge.targetPort)
        );

        if (sourceNode && targetNode && sourceNode.parent !== targetNode.parent) {
          const tunnelId = generateId();
          const tunnelParent = targetNode.parent ? targetNode.parent : sourceNode.parent;

          const tunnelNode: NodeInstance = {
            id: tunnelId,
            type: 'io.tunnel',
            position: { x: 10, y: 10 },
            parent: tunnelParent,
            inputs: [],
            outputs: [],
            params: {}
          };
          const edge1: Edge = {
            id: `e_${newEdge.sourceNode}_${newEdge.sourcePort}-${tunnelId}_input`,
            sourceNode: newEdge.sourceNode,
            sourcePort: newEdge.sourcePort,
            targetNode: tunnelId,
            targetPort: 'input'
          };
          const edge2: Edge = {
            id: `e_${tunnelId}_output-${newEdge.targetNode}_${newEdge.targetPort}`,
            sourceNode: tunnelId,
            sourcePort: 'output',
            targetNode: newEdge.targetNode,
            targetPort: newEdge.targetPort
          };
          return { nodes: [...state.nodes, tunnelNode], edges: [...filteredEdges, edge1, edge2] };
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

    updateUIControl: (id, updates) => {
      saveToHistory();
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
    
    // Load from localStorage
    loadFromStorage: () => {
      try {
        const data = localStorage.getItem(STORAGE_KEY);
        if (!data) return false;
        
        const parsed = JSON.parse(data);
        if (parsed.graph) {
          get().loadGraph(parsed.graph);
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
