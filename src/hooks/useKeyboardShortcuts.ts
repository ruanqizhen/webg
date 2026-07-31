import { useEffect } from 'react';
import { useGraphStore } from '../store/useGraphStore';
import { useUIStore } from '../store/useUIStore';

interface UseKeyboardShortcutsOptions {
  onZoomFit?: () => void;
}

export function useKeyboardShortcuts(options: UseKeyboardShortcutsOptions = {}) {
  const selectedNodeId = useUIStore((state) => state.selectedNodeId);
  const selectedNodeIds = useUIStore((state) => state.selectedNodeIds);
  const selectedEdgeId = useUIStore((state) => state.selectedEdgeId);
  const selectedControlId = useUIStore((state) => state.selectedControlId);
  const onZoomFit = options.onZoomFit;

  const {
    copyNode,
    pasteNode,
    copyNodes,
    pasteNodes,
    undo,
    redo,
    canUndo,
    canRedo,
    removeNode,
    removeEdge,
    removeUIControl,
  } = useGraphStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      if (isInput) {
        if (e.key !== 'Escape') return;
      }

      // Redo (Ctrl+Shift+Z or Ctrl+Y)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'z' || e.key === 'Z')) {
        if (canRedo()) {
          e.preventDefault();
          redo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        if (canRedo()) {
          e.preventDefault();
          redo();
        }
      // Undo (Ctrl+Z)
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        if (canUndo()) {
          e.preventDefault();
          undo();
        }
      // Select All (Ctrl+A) - select all nodes
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        if (!isInput) {
          e.preventDefault();
          const allIds = useGraphStore.getState().nodes.map((n) => n.id);
          useUIStore.getState().setSelectedNodeIds(allIds);
        }
      // Copy (Ctrl+C) - supports multi-select
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        if (!isInput && selectedNodeIds.length > 0) {
          e.preventDefault();
          if (selectedNodeIds.length === 1) {
            copyNode(selectedNodeIds[0]);
          } else {
            copyNodes(selectedNodeIds);
          }
        }
      // Paste (Ctrl+V)
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        e.preventDefault();
        pasteNodes({ x: 200, y: 200 });
      // Zoom Fit (Ctrl+0 or Ctrl+=)
      } else if ((e.ctrlKey || e.metaKey) && (e.key === '0' || e.key === '=')) {
        e.preventDefault();
        onZoomFit?.();
      // Delete (Delete or Backspace) — canvas nodes/edges are handled by GraphEditor's onNodesChange/onEdgesChange (single history)
      // Here we only handle UI controls (FrontPanel) to avoid double-delete
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (!isInput) {
          // If focus is inside ReactFlow canvas, let GraphEditor handle deletion
          const targetEl = e.target as HTMLElement;
          if (targetEl.closest && targetEl.closest('.react-flow')) {
            return;
          }
          // Also check active element inside flow
          if (typeof document !== 'undefined' && document.activeElement && (document.activeElement as HTMLElement).closest?.('.react-flow')) {
            return;
          }
          if (selectedControlId) {
            e.preventDefault();
            removeUIControl(selectedControlId);
            useUIStore.getState().setSelectedControlId(null);
          }
        }
      // Escape (deselect all)
      } else if (e.key === 'Escape') {
        useUIStore.getState().clearSelection();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    selectedNodeId,
    selectedNodeIds,
    selectedEdgeId,
    selectedControlId,
    copyNode,
    pasteNode,
    copyNodes,
    pasteNodes,
    undo,
    redo,
    canUndo,
    canRedo,
    removeNode,
    removeEdge,
    removeUIControl,
    onZoomFit,
  ]);
}
