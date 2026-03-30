import { create } from 'zustand';

type ViewMode = 'ui' | 'logic';

interface UIState {
  viewMode: ViewMode;
  selectedNodeId: string | null;
  selectedControlId: string | null;
  selectedEdgeId: string | null;

  setViewMode: (mode: ViewMode) => void;
  setSelectedNodeId: (id: string | null) => void;
  setSelectedControlId: (id: string | null) => void;
  setSelectedEdgeId: (id: string | null) => void;
}

export const useUIStore = create<UIState>((set) => ({
  viewMode: 'logic',
  selectedNodeId: null,
  selectedControlId: null,
  selectedEdgeId: null,
  setViewMode: (mode) => set({ viewMode: mode }),
  setSelectedNodeId: (id) => set({ selectedNodeId: id, selectedControlId: null, selectedEdgeId: null }),
  setSelectedControlId: (id) => set({ selectedControlId: id, selectedNodeId: null, selectedEdgeId: null }),
  setSelectedEdgeId: (id) => set({ selectedEdgeId: id, selectedNodeId: null, selectedControlId: null })
}));
