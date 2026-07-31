import { create } from 'zustand';

export interface TypeError {
  id: string;
  sourceNode: string;
  sourcePort: string;
  sourceType: string;
  targetNode: string;
  targetPort: string;
  targetType: string;
  message: string;
  timestamp: number;
}

interface TypeErrorState {
  errors: TypeError[];
  addError: (err: Omit<TypeError, 'id' | 'timestamp'>) => void;
  removeError: (targetNode: string, targetPort: string) => void;
  removeByNode: (nodeId: string) => void;
  removeByEdgeTarget: (targetNode: string, targetPort?: string) => void;
  clear: () => void;
}

export const useTypeErrorStore = create<TypeErrorState>((set, get) => ({
  errors: [],

  addError: (err) => {
    const id = `${err.targetNode}_${err.targetPort}`;
    set((state) => {
      // dedupe by target node+port, overwrite
      const filtered = state.errors.filter(e => !(e.targetNode === err.targetNode && e.targetPort === err.targetPort));
      return {
        errors: [...filtered, { ...err, id, timestamp: Date.now() }]
      };
    });
  },

  removeError: (targetNode, targetPort) => {
    set((state) => ({
      errors: state.errors.filter(e => !(e.targetNode === targetNode && e.targetPort === targetPort))
    }));
  },

  removeByNode: (nodeId) => {
    set((state) => ({
      errors: state.errors.filter(e => e.sourceNode !== nodeId && e.targetNode !== nodeId)
    }));
  },

  removeByEdgeTarget: (targetNode, targetPort) => {
    if (targetPort) {
      get().removeError(targetNode, targetPort);
    } else {
      set((state) => ({
        errors: state.errors.filter(e => e.targetNode !== targetNode)
      }));
    }
  },

  clear: () => set({ errors: [] }),
}));
