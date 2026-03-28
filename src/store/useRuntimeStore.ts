import { create } from 'zustand';
import type { NodeState, RuntimeMemory } from '../types/runtime';

interface RuntimeState extends RuntimeMemory {
  isRunning: boolean;
  setRunning: (running: boolean) => void;
  setNodeState: (nodeId: string, state: NodeState) => void;
  setPortValue: (portId: string, value: any) => void;
  resetRuntime: () => void;
}

export const useRuntimeStore = create<RuntimeState>((set) => ({
  isRunning: false,
  nodeState: {},
  portValues: {},
  setRunning: (running) => set({ isRunning: running }),
  setNodeState: (nodeId, state) => set((prev) => ({
    nodeState: { ...prev.nodeState, [nodeId]: state }
  })),
  setPortValue: (portId, value) => set((prev) => ({
    portValues: { ...prev.portValues, [portId]: value }
  })),
  resetRuntime: () => set({ isRunning: false, nodeState: {}, portValues: {} })
}));
