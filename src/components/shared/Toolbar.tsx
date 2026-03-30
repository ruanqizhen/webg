import { Play, Square, Trash2, MousePointer2, Network, Save, FolderOpen, ZoomIn } from 'lucide-react';
import { useUIStore } from '../../store/useUIStore';
import { useGraphStore } from '../../store/useGraphStore';
import { useRuntimeStore } from '../../store/useRuntimeStore';
import { ExecutionEngine } from '../../engine/scheduler';
import { Button } from '../ui/button';
import { useRef } from 'react';

export function Toolbar({ onZoomFit }: { onZoomFit?: () => void }) {
  const { viewMode, setViewMode } = useUIStore();
  const { clearGraph, exportGraph, loadGraph, nodes, edges, uiControls } = useGraphStore();
  const runtimeStore = useRuntimeStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleRun = async () => {
    if (nodes.length === 0) return;
    try {
      runtimeStore.setRunning(true);
      const engine = new ExecutionEngine(
         { nodes, edges, uiControls },
         runtimeStore,
         runtimeStore.setNodeState,
         runtimeStore.setPortValue
      );
      await engine.executeAll();
    } catch (err: any) {
      alert("Execution Error: " + err.message);
    } finally {
      runtimeStore.setRunning(false);
    }
  };

  const handleSave = () => {
    const graph = exportGraph();
    const fileData = {
      version: "1.1",
      graph: graph,
      ui: {
        panelLayout: {},
        viewport: {}
      }
    };
    const blob = new Blob([JSON.stringify(fileData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'project.webg';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleLoad = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.graph) {
          loadGraph(data.graph);
        } else if (data.nodes) {
          // Direct graph format
          loadGraph(data);
        }
      } catch (err: any) {
        alert("Failed to load file: " + err.message);
      }
    };
    reader.readAsText(file);
    // Reset input so same file can be loaded again
    e.target.value = '';
  };

  const currentStatus = runtimeStore.isRunning ? 'Running' : 'Idle';

  return (
    <div className="h-14 border-b flex items-center px-4 justify-between bg-white shrink-0">
      {/* Hidden file input for loading */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".webg,.json"
        className="hidden"
      />

      <div className="flex items-center gap-2">
        <h1 className="font-extrabold text-xl mr-4 bg-clip-text text-transparent bg-gradient-to-r from-purple-500 to-indigo-600">WebG</h1>

        {/* View Toggle */}
        <div className="flex bg-gray-100 p-1 rounded-md border text-sm font-medium">
          <button
            className={`px-3 py-1 rounded flex gap-1 items-center transition-colors ${viewMode === 'ui' ? 'bg-white shadow-sm text-purple-600' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setViewMode('ui')}
          >
            <MousePointer2 size={16} /> UI
          </button>
          <button
            className={`px-3 py-1 rounded flex gap-1 items-center transition-colors ${viewMode === 'logic' ? 'bg-white shadow-sm text-purple-600' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setViewMode('logic')}
          >
            <Network size={16} /> Logic
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" onClick={handleSave} className="gap-1">
          <Save size={16} /> Save
        </Button>
        <Button size="sm" variant="outline" onClick={handleLoad} className="gap-1">
          <FolderOpen size={16} /> Load
        </Button>
        <Button size="sm" variant="outline" onClick={onZoomFit} className="gap-1" title="Zoom Fit (Ctrl+0)">
          <ZoomIn size={16} /> Fit
        </Button>
        <Button size="sm" variant="default" onClick={handleRun} disabled={runtimeStore.isRunning} className="bg-green-600 hover:bg-green-700 gap-1">
          <Play size={16} /> Run
        </Button>
        <Button size="sm" variant="outline" onClick={() => runtimeStore.resetRuntime()} disabled={!runtimeStore.isRunning && Object.values(runtimeStore.nodeState).length === 0} className="gap-1 text-red-600 hover:text-red-700">
          <Square size={16} /> Stop / Reset
        </Button>
      </div>

      <div className="flex items-center gap-4 text-sm text-gray-500">
        <div className="flex items-center gap-1.5">
           <span className={`w-2 h-2 rounded-full ${runtimeStore.isRunning ? 'bg-blue-500 animate-pulse' : 'bg-gray-400'}`}></span>
           {currentStatus}
        </div>
        <div className="w-px h-6 bg-gray-200"></div>
        <Button size="sm" variant="ghost" onClick={clearGraph} className="gap-1">
          <Trash2 size={16} /> Clear
        </Button>
      </div>
    </div>
  );
}
