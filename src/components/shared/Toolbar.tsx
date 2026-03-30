import { Play, Square, Trash2, Save, FolderOpen, ZoomIn, StepForward } from 'lucide-react';
import { useGraphStore } from '../../store/useGraphStore';
import { useRuntimeStore } from '../../store/useRuntimeStore';
import { ExecutionEngine } from '../../engine/scheduler';
import { Button } from '../ui/button';
import { useRef } from 'react';

export function Toolbar({ onZoomFit }: { onZoomFit?: () => void }) {
  const { clearGraph, exportGraph, loadGraph, nodes, edges, uiControls } = useGraphStore();
  const runtimeStore = useRuntimeStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleRun = async () => {
    if (nodes.length === 0) return;
    try {
      runtimeStore.setRunning(true);
      runtimeStore.setStepMode(false);
      
      const engine = new ExecutionEngine(
         { nodes, edges, uiControls },
         runtimeStore,
         runtimeStore.setNodeState,
         runtimeStore.setPortValue
      );
      await engine.executeAll();
    } catch (err: any) {
      console.error("Execution Error:", err);
      runtimeStore.setRunning(false);
      throw err;  // Re-throw for caller to handle
    }
  };

  const handleStepRun = async () => {
    if (nodes.length === 0) return;
    try {
      runtimeStore.setRunning(true);
      runtimeStore.setStepMode(true);
      
      const engine = new ExecutionEngine(
         { nodes, edges, uiControls },
         runtimeStore,
         runtimeStore.setNodeState,
         runtimeStore.setPortValue,
         {
           isPaused: () => runtimeStore.checkIsPaused(),
           onContinue: () => {},
           onNodeStart: (nodeId) => {
             runtimeStore.setCurrentStepNode(nodeId);
           },
           onNodeFinish: () => {
             runtimeStore.setCurrentStepNode(null);
           },
           shouldPause: async (nodeId) => {
             // Check if step mode is enabled or node has breakpoint
             const node = nodes.find(n => n.id === nodeId);
             const isStepMode = runtimeStore.isStepMode;
             const hasBreakpoint = node?.breakpoint;
             
             if (isStepMode || hasBreakpoint) {
               runtimeStore.setCurrentStepNode(nodeId);
               await runtimeStore.waitForStep();
               return true;
             }
             return false;
           }
         }
      );
      await engine.executeAll();
    } catch (err: any) {
      console.error("Execution Error:", err);
      runtimeStore.setRunning(false);
      runtimeStore.setStepMode(false);
      throw err;
    } finally {
      if (!runtimeStore.isPaused) {
        runtimeStore.setRunning(false);
        runtimeStore.setStepMode(false);
      }
    }
  };

  const handleContinue = () => {
    runtimeStore.continueExecution();
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
        const result = event.target?.result;
        if (typeof result !== 'string') {
          throw new Error('Invalid file content');
        }
        const data = JSON.parse(result);
        if (data.graph) {
          loadGraph(data.graph);
        } else if (data.nodes) {
          // Direct graph format
          loadGraph(data);
        } else {
          throw new Error('Invalid file format');
        }
      } catch (err: any) {
        console.error("Failed to load file:", err);
        alert("Failed to load file: " + (err.message || 'Unknown error'));
      }
    };
    reader.onerror = () => {
      console.error("Failed to read file");
      alert("Failed to read file");
    };
    reader.readAsText(file);
    // Reset input so same file can be loaded again
    e.target.value = '';
  };

  const currentStatus = runtimeStore.isRunning ? (runtimeStore.isPaused ? 'Paused' : 'Running') : 'Idle';

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
        
        {/* Debug controls */}
        {runtimeStore.isPaused ? (
          <Button 
            size="sm" 
            variant="default" 
            onClick={handleContinue} 
            className="bg-blue-600 hover:bg-blue-700 gap-1"
            title="Continue (resume execution)"
          >
            <Play size={16} /> Continue
          </Button>
        ) : (
          <>
            <Button 
              size="sm" 
              variant="default" 
              onClick={handleRun} 
              disabled={runtimeStore.isRunning} 
              className="bg-green-600 hover:bg-green-700 gap-1"
            >
              <Play size={16} /> Run
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={handleStepRun} 
              disabled={runtimeStore.isRunning} 
              className="gap-1 border-purple-300 text-purple-600 hover:bg-purple-50"
              title="Step through nodes one by one"
            >
              <StepForward size={16} /> Step
            </Button>
          </>
        )}
        
        <Button size="sm" variant="outline" onClick={() => runtimeStore.resetRuntime()} disabled={!runtimeStore.isRunning && !runtimeStore.isPaused && Object.values(runtimeStore.nodeState).length === 0} className="gap-1 text-red-600 hover:text-red-700">
          <Square size={16} /> Stop / Reset
        </Button>
      </div>

      <div className="flex items-center gap-4 text-sm text-gray-500">
        <div className="flex items-center gap-1.5">
           <span className={`w-2 h-2 rounded-full ${
             runtimeStore.isPaused ? 'bg-yellow-500 animate-pulse' :
             runtimeStore.isRunning ? 'bg-blue-500 animate-pulse' : 'bg-gray-400'
           }`}></span>
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
