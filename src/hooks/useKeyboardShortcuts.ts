import { useEffect } from 'react';
import { useGraphStore } from '../store/useGraphStore';
import { useUIStore } from '../store/useUIStore';

interface UseKeyboardShortcutsOptions {
  onZoomFit?: () => void;
}

export function useKeyboardShortcuts(options: UseKeyboardShortcutsOptions = {}) {
  const selectedNodeId = useUIStore((state) => state.selectedNodeId);
  const selectedEdgeId = useUIStore((state) => state.selectedEdgeId);
  const selectedControlId = useUIStore((state) => state.selectedControlId);
  const setSelectedNodeId = useUIStore((state) => state.setSelectedNodeId);
  const setSelectedEdgeId = useUIStore((state) => state.setSelectedEdgeId);
  const setSelectedControlId = useUIStore((state) => state.setSelectedControlId);
  const onZoomFit = options.onZoomFit;

  const {
    copyNode,
    pasteNode,
    undo,
    redo,
    canUndo,
    canRedo,
    removeNode,
    removeEdge,
    removeUIControl
  } = useGraphStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if user is typing in an input field
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
      
      // Don't trigger shortcuts when typing in inputs
      if (isInput) {
        if (e.key !== 'Escape') {
           return; 
        }
      }

      // Redo (Ctrl+Shift+Z or Ctrl+Y) — must check before Undo to avoid Shift+Z matching both
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
      // Copy (Ctrl+C)
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        if (selectedNodeId) {
          e.preventDefault();
          copyNode(selectedNodeId);
        }
      // Paste (Ctrl+V)
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        e.preventDefault();
        pasteNode({ x: 200, y: 200 });
      // Zoom Fit (Ctrl+0 or Ctrl+=)
      } else if ((e.ctrlKey || e.metaKey) && (e.key === '0' || e.key === '=')) {
        e.preventDefault();
        onZoomFit?.();
      // Delete (Delete or Backspace)
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedNodeId) {
          e.preventDefault();
          removeNode(selectedNodeId);
          setSelectedNodeId(null);
        } else if (selectedEdgeId) {
          e.preventDefault();
          removeEdge(selectedEdgeId);
          setSelectedEdgeId(null);
        } else if (selectedControlId) {
          e.preventDefault();
          removeUIControl(selectedControlId);
          setSelectedControlId(null);
        }
      // Escape (deselect all)
      } else if (e.key === 'Escape') {
        setSelectedNodeId(null);
        setSelectedEdgeId(null);
        setSelectedControlId(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    selectedNodeId,
    selectedEdgeId,
    selectedControlId,
    copyNode,
    pasteNode,
    undo,
    redo,
    canUndo,
    canRedo,
    removeNode,
    removeEdge,
    removeUIControl,
    setSelectedNodeId,
    setSelectedEdgeId,
    setSelectedControlId,
    onZoomFit
  ]);
}
