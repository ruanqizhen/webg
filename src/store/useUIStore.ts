import { create } from 'zustand';

type ViewMode = 'ui' | 'logic';

interface UIState {
  viewMode: ViewMode;
  selectedNodeId: string | null;
  selectedNodeIds: string[];
  selectedControlId: string | null;
  selectedEdgeId: string | null;

  setViewMode: (mode: ViewMode) => void;
  setSelectedNodeId: (id: string | null) => void;
  addSelectedNodeId: (id: string) => void;
  setSelectedNodeIds: (ids: string[]) => void;
  clearSelection: () => void;
  setSelectedControlId: (id: string | null) => void;
  setSelectedEdgeId: (id: string | null) => void;
}

export const useUIStore = create<UIState>((set) => ({
  viewMode: 'logic',
  selectedNodeId: null,
  selectedNodeIds: [],
  selectedControlId: null,
  selectedEdgeId: null,

  setViewMode: (mode) => set({ viewMode: mode }),

  setSelectedNodeId: (id) =>
    set({
      selectedNodeId: id,
      selectedNodeIds: id ? [id] : [],
      selectedControlId: null,
      selectedEdgeId: null,
    }),

  addSelectedNodeId: (id) =>
    set((state) => {
      const ids = state.selectedNodeIds.includes(id)
        ? state.selectedNodeIds.filter((i) => i !== id)
        : [...state.selectedNodeIds, id];
      return {
        selectedNodeIds: ids,
        selectedNodeId: ids.length === 1 ? ids[0] : null,
        selectedControlId: null,
        selectedEdgeId: null,
      };
    }),

  setSelectedNodeIds: (ids) =>
    set((state) => {
      // Skip update if the selection hasn't actually changed - prevents infinite loop
      if (
        ids.length === state.selectedNodeIds.length &&
        ids.every((id, i) => id === state.selectedNodeIds[i])
      ) {
        return state;
      }
      return {
        ...state,
        selectedNodeIds: ids,
        selectedNodeId: ids.length === 1 ? ids[0] : null,
        selectedControlId: null,
        selectedEdgeId: null,
      };
    }),

  clearSelection: () =>
    set({
      selectedNodeId: null,
      selectedNodeIds: [],
      selectedControlId: null,
      selectedEdgeId: null,
    }),

  setSelectedControlId: (id) =>
    set({
      selectedControlId: id,
      selectedNodeId: null,
      selectedNodeIds: [],
      selectedEdgeId: null,
    }),

  setSelectedEdgeId: (id) =>
    set({
      selectedEdgeId: id,
      selectedNodeId: null,
      selectedNodeIds: [],
      selectedControlId: null,
    }),
}));
