import { Play, Square, RotateCcw, Trash2, Maximize, MousePointer2, Network } from 'lucide-react';
import { useUIStore } from '../../store/useUIStore';
import { useGraphStore } from '../../store/useGraphStore';
import { useRuntimeStore } from '../../store/useRuntimeStore';
import { ExecutionEngine } from '../../engine/scheduler';
import { Button } from '../ui/button';

export function Toolbar() {
  const { viewMode, setViewMode } = useUIStore();
  const { clearGraph, nodes, edges, uiControls } = useGraphStore();
  const runtimeStore = useRuntimeStore();

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

  const currentStatus = runtimeStore.isRunning ? 'Running' : 'Idle';

  return (
    <div className="h-14 border-b flex items-center px-4 justify-between bg-white shrink-0">
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
