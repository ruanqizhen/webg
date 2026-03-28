import { create } from 'zustand';

type ViewMode = 'ui' | 'logic';

interface UIState {
  viewMode: ViewMode;
  selectedNodeId: string | null;
  selectedControlId: string | null;
  
  setViewMode: (mode: ViewMode) => void;
  setSelectedNodeId: (id: string | null) => void;
  setSelectedControlId: (id: string | null) => void;
}

export const useUIStore = create<UIState>((set) => ({
  viewMode: 'logic',
  selectedNodeId: null,
  selectedControlId: null,
  setViewMode: (mode) => set({ viewMode: mode }),
  setSelectedNodeId: (id) => set({ selectedNodeId: id, selectedControlId: null }),
  setSelectedControlId: (id) => set({ selectedControlId: id, selectedNodeId: null })
}));
