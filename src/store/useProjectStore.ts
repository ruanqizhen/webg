import { create } from 'zustand';
import type { Graph, Project, VI } from '../types/graph';
import { useGraphStore } from './useGraphStore';
import { useUIStore } from './useUIStore';
import { useRuntimeStore } from './useRuntimeStore';
import { useTypeErrorStore } from './useTypeErrorStore';
import { generateId, deepClone } from '../lib/utils';
import { createExampleProject } from '../lib/exampleProject';

// Multi-VI project state. The graph store always holds exactly one VI —
// the active one. Switching tabs saves the active graph back into its VI
// and loads the next VI's graph, so every existing component (editor,
// front panel, execution, shortcuts) keeps working unchanged against a
// single graph.
//
// Persistence: localStorage keeps the whole project under the same key
// the single-graph version used. Version 1 data (a bare graph) is wrapped
// into a one-VI project on load.

const STORAGE_KEY = 'webg-project';
const AUTO_SAVE_INTERVAL = 30000; // 30 seconds
const PROJECT_VERSION = 2;

export const EMPTY_GRAPH: Graph = { nodes: [], edges: [], uiControls: [] };

interface ProjectState {
  vis: VI[];
  activeViId: string | null;

  /** First-run setup: restore the saved project, migrate v1 data, or start
   * with the example as a single VI. Idempotent (mount runs it twice in
   * dev strict mode). */
  initProject: () => void;
  createVI: () => void;
  renameVI: (id: string, name: string) => void;
  closeVI: (id: string) => void;
  switchVI: (id: string) => void;

  /** Whole project for .webg export (active graph synced first). */
  exportProject: () => Project;
  /** Replace the whole project from an imported .webg file. */
  loadProject: (project: Project) => void;

  saveToStorage: () => void;
  startAutoSave: () => () => void;
}

function isGraph(value: unknown): value is Graph {
  if (!value || typeof value !== 'object') return false;
  const g = value as Graph;
  return Array.isArray(g.nodes) && Array.isArray(g.edges) && Array.isArray(g.uiControls);
}

function isProject(value: unknown): value is Project {
  if (!value || typeof value !== 'object') return false;
  const p = value as Project;
  return Array.isArray(p.vis) && p.vis.every(v =>
    typeof v?.id === 'string' && typeof v?.name === 'string' && isGraph(v?.graph));
}

/** Wrap a bare graph (v1 file or v1 storage) into a one-VI project. */
export function singleVIProject(graph: Graph, name: string): Project {
  const id = generateId();
  return {
    version: PROJECT_VERSION,
    vis: [{ id, name, graph: deepClone(graph) }],
    activeViId: id,
  };
}

function nextUntitledName(vis: VI[]): string {
  const taken = new Set(vis.map(v => v.name));
  let n = 1;
  while (taken.has(`Untitled ${n}`)) n++;
  return `Untitled ${n}`;
}

/** Transient per-VI state that must not leak across tabs. */
function clearTransientState() {
  useUIStore.getState().clearSelection();
  useUIStore.getState().setDropTargetStructureId(null);
  useRuntimeStore.getState().resetRuntime();
  try { useTypeErrorStore.getState().clear(); } catch { /* ignore */ }
}

export const useProjectStore = create<ProjectState>((set, get) => {
  // Current in-memory graph written back into the active VI. The graph
  // store replaces its arrays on edit, but clone anyway: cheap insurance
  // against any in-place mutation sharing state between tabs.
  const syncActiveGraph = (): VI[] => {
    const { vis, activeViId } = get();
    if (!activeViId) return vis;
    const graph = deepClone(useGraphStore.getState().exportGraph());
    return vis.map(v => (v.id === activeViId ? { ...v, graph } : v));
  };

  // Shared tail of every activation: point the graph store at the VI,
  // load its graph without polluting its undo stack, and clear state
  // that belongs to the previous VI.
  const activate = (vis: VI[], activeViId: string | null) => {
    const graphStore = useGraphStore.getState();
    const target = vis.find(v => v.id === activeViId);
    set({ vis, activeViId: target ? target.id : null });
    if (target) {
      graphStore.setDocumentKey(target.id);
      graphStore.loadGraph(deepClone(target.graph), true);
    } else {
      graphStore.setDocumentKey('');
      graphStore.loadGraph(deepClone(EMPTY_GRAPH), true);
    }
    clearTransientState();
  };

  return {
    vis: [],
    activeViId: null,

    initProject: () => {
      if (get().vis.length > 0) return; // already initialized
      let vis: VI[];
      let activeViId: string | null;
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (isProject(parsed)) {
            vis = parsed.vis;
            activeViId = vis.some(v => v.id === parsed.activeViId) ? parsed.activeViId : vis[0]?.id ?? null;
          } else if (parsed?.graph && isGraph(parsed.graph)) {
            // v1 storage: a single graph under { version, graph }.
            const wrapped = singleVIProject(parsed.graph, 'Untitled 1');
            vis = wrapped.vis;
            activeViId = wrapped.activeViId;
          } else {
            throw new Error('Unrecognized stored project');
          }
        } else {
          throw new Error('Nothing stored');
        }
      } catch {
        // First visit (or corrupt storage): the wired temperature example
        // as a single VI, so Run does something meaningful.
        const wrapped = singleVIProject(createExampleProject(), 'Untitled 1');
        vis = wrapped.vis;
        activeViId = wrapped.activeViId;
      }
      activate(vis, activeViId);
    },

    createVI: () => {
      const vis = syncActiveGraph();
      const id = generateId();
      const next: VI[] = [...vis, { id, name: nextUntitledName(vis), graph: deepClone(EMPTY_GRAPH) }];
      activate(next, id);
    },

    renameVI: (id, name) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      set(state => ({ vis: state.vis.map(v => (v.id === id ? { ...v, name: trimmed } : v)) }));
    },

    closeVI: (id) => {
      const { vis, activeViId } = get();
      const idx = vis.findIndex(v => v.id === id);
      if (idx === -1) return;
      const target = vis[idx];
      const hasContent =
        target.graph.nodes.length > 0 || target.graph.edges.length > 0 || target.graph.uiControls.length > 0;
      if (hasContent && !window.confirm(`Close "${target.name}"? It will be removed from the project.`)) {
        return;
      }
      const nextVis = vis.filter(v => v.id !== id);
      useGraphStore.getState().dropDocumentHistory(id);
      if (id !== activeViId) {
        // Closing a background tab leaves the active VI untouched.
        set({ vis: nextVis });
        return;
      }
      // Closing the active tab: prefer the tab to its right, else the last.
      const nextActive = nextVis[Math.min(idx, nextVis.length - 1)] ?? null;
      activate(nextVis, nextActive ? nextActive.id : null);
    },

    switchVI: (id) => {
      const { vis, activeViId } = get();
      if (id === activeViId) return;
      if (!vis.some(v => v.id === id)) return;
      // Save first: the active graph in the store is newer than the VI's
      // snapshot. (The graph being closed over is not synced — closing
      // discards it — but switching must preserve it.)
      activate(syncActiveGraph(), id);
    },

    exportProject: () => {
      const vis = syncActiveGraph();
      set({ vis });
      return { version: PROJECT_VERSION, vis: deepClone(vis), activeViId: get().activeViId };
    },

    loadProject: (project) => {
      if (!isProject(project) || project.vis.length === 0) {
        throw new Error('Invalid project data: expected at least one VI');
      }
      const vis = deepClone(project.vis);
      const activeViId = vis.some(v => v.id === project.activeViId) ? project.activeViId : vis[0].id;
      activate(vis, activeViId);
    },

    saveToStorage: () => {
      try {
        const vis = syncActiveGraph();
        set({ vis });
        const data = {
          version: PROJECT_VERSION,
          timestamp: Date.now(),
          vis: get().vis,
          activeViId: get().activeViId,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch (err) {
        console.error('Failed to save to storage:', err);
      }
    },

    startAutoSave: () => {
      const intervalId = setInterval(() => {
        get().saveToStorage();
      }, AUTO_SAVE_INTERVAL);

      // Initial save after 2 seconds
      const timeoutId = setTimeout(() => get().saveToStorage(), 2000);

      return () => {
        clearInterval(intervalId);
        clearTimeout(timeoutId);
      };
    },
  };
});
