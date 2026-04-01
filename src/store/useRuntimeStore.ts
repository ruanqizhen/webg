import { create } from 'zustand';
import type { NodeState, RuntimeMemory } from '../types/runtime';

interface RuntimeState extends RuntimeMemory {
  isRunning: boolean;
  errorMessage: string | null;
  setRunning: (running: boolean) => void;
  setNodeState: (nodeId: string, state: NodeState) => void;
  setPortValue: (portId: string, value: any) => void;
  setError: (message: string | null) => void;
  resetRuntime: () => void;

  // Debug controls
  isStepMode: boolean;
  isPaused: boolean;
  currentStepNode: string | null;

  setStepMode: (enabled: boolean) => void;
  setIsPaused: (paused: boolean) => void;
  setCurrentStepNode: (nodeId: string | null) => void;
  waitForStep: () => Promise<void>;
  continueExecution: () => void;
  resetDebug: () => void;
  checkIsPaused: () => boolean;
}

export const useRuntimeStore = create<RuntimeState>((set, get) => {
  let stepResolver: (() => void) | null = null;
  let stepRejecter: ((reason?: any) => void) | null = null;
  
  return {
    isRunning: false,
    errorMessage: null,
    nodeState: {},
    portValues: {},
    
    // Debug state
    isStepMode: false,
    isPaused: false,
    currentStepNode: null,
    
    setRunning: (running) => set({ isRunning: running }),
    
    setError: (message) => set({ errorMessage: message }),
    
    setNodeState: (nodeId, state) => set((prev) => ({
      nodeState: { ...prev.nodeState, [nodeId]: state }
    })),
    
    setPortValue: (portId, value) => set((prev) => ({
      portValues: { ...prev.portValues, [portId]: value }
    })),
    
    resetRuntime: () => {
      set({ isRunning: false, errorMessage: null, nodeState: {}, portValues: {} });
      get().resetDebug();
    },
    
    // Debug controls
    setStepMode: (enabled) => set({ isStepMode: enabled }),
    
    setIsPaused: (paused) => set({ isPaused: paused }),
    
    setCurrentStepNode: (nodeId) => set({ currentStepNode: nodeId }),
    
    // Wait for user to continue (for step mode or breakpoint)
    waitForStep: () => {
      return new Promise<void>((resolve, reject) => {
        // Clean up any existing resolver first (race condition fix)
        if (stepResolver) {
          stepResolver();
        }
        stepResolver = resolve;
        stepRejecter = reject;
        set({ isPaused: true });
      });
    },
    
    // Continue execution (called from toolbar)
    continueExecution: () => {
      if (stepResolver) {
        stepResolver();
        stepResolver = null;
      }
      if (stepRejecter) {
        stepRejecter = null;
      }
      set({ isPaused: false, currentStepNode: null });
    },
    
    resetDebug: () => {
      if (stepResolver) {
        stepResolver();
        stepResolver = null;
      }
      if (stepRejecter) {
        stepRejecter = null;
      }
      set({ isStepMode: false, isPaused: false, currentStepNode: null });
    },
    
    // Check if currently paused (for scheduler)
    checkIsPaused: () => get().isPaused,
    
    // Callback for scheduler to call when continuing
    onContinue: () => {
      // Optional callback for debugging
    }
  };
});
