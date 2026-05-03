import { create } from 'zustand';

export interface LogEntry {
  id: string;
  timestamp: number;
  type: 'log' | 'error' | 'warn' | 'info';
  message: string;
  nodeId?: string;
  nodeLabel?: string;
}

interface LogState {
  logs: LogEntry[];
  isVisible: boolean;
  addLog: (entry: Omit<LogEntry, 'id' | 'timestamp'>) => void;
  clearLogs: () => void;
  toggleVisible: () => void;
  setVisible: (visible: boolean) => void;
}

let counter = 0;

export const useLogStore = create<LogState>((set) => ({
  logs: [],
  isVisible: false,

  addLog: (entry) => {
    const id = `log_${Date.now()}_${counter++}`;
    set((state) => ({
      logs: [...state.logs.slice(-999), { ...entry, id, timestamp: Date.now() }],
    }));
  },

  clearLogs: () => set({ logs: [] }),

  toggleVisible: () => set((state) => ({ isVisible: !state.isVisible })),

  setVisible: (visible) => set({ isVisible: visible }),
}));

// Expose for use by the execution engine
export function runtimeLog(message: string, type: LogEntry['type'] = 'log', nodeId?: string, nodeLabel?: string) {
  useLogStore.getState().addLog({ type, message, nodeId, nodeLabel });
}
