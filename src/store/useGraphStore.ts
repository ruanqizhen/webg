import { create } from 'zustand';
import type { Edge, Graph, NodeInstance, UIControl } from '../types/graph';

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
}

export const useGraphStore = create<GraphState>((set, get) => ({
  nodes: [],
  edges: [],
  uiControls: [],

  addNode: (node) => set((state) => ({ nodes: [...state.nodes, node] })),

  updateNode: (id, updates) => set((state) => ({
    nodes: state.nodes.map(n => n.id === id ? { ...n, ...updates } : n)
  })),

  removeNode: (id) => set((state) => {
    // Remove node
    const nodes = state.nodes.filter(n => n.id !== id);
    // Remove connected edges
    const edges = state.edges.filter(e => e.sourceNode !== id && e.targetNode !== id);
    // Remove associated UI control if it's a terminal
    const uiControls = state.uiControls.filter(c => c.bindingNodeId !== id);
    return { nodes, edges, uiControls };
  }),

  addEdge: (newEdge) => set((state) => {
    // Single input limitation: remove any existing edge going to the same target port
    const filteredEdges = state.edges.filter(e => 
      !(e.targetNode === newEdge.targetNode && e.targetPort === newEdge.targetPort)
    );
    return { edges: [...filteredEdges, newEdge] };
  }),

  removeEdge: (id) => set((state) => ({
    edges: state.edges.filter(e => e.id !== id)
  })),

  addUIControl: (control, terminalNode) => set((state) => ({
    uiControls: [...state.uiControls, control],
    nodes: [...state.nodes, terminalNode]
  })),

  updateUIControl: (id, updates) => set((state) => ({
    uiControls: state.uiControls.map(c => c.id === id ? { ...c, ...updates } : c)
  })),

  removeUIControl: (id) => set((state) => {
    const control = state.uiControls.find(c => c.id === id);
    const uiControls = state.uiControls.filter(c => c.id !== id);
    let nodes = state.nodes;
    let edges = state.edges;
    if (control) {
      // Remove the corresponding terminal node
      nodes = nodes.filter(n => n.id !== control.bindingNodeId);
      edges = edges.filter(e => e.sourceNode !== control.bindingNodeId && e.targetNode !== control.bindingNodeId);
    }
    return { uiControls, nodes, edges };
  }),

  clearGraph: () => set({ nodes: [], edges: [], uiControls: [] })
}));
