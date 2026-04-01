import { Play, Square, RotateCcw, Trash2, Save, FolderOpen, ZoomIn, StepForward, X } from 'lucide-react';
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
      runtimeStore.setError(null);
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
      runtimeStore.setError(err.message || 'Unknown execution error');
    } finally {
      runtimeStore.setRunning(false);
    }
  };

  const handleStepRun = async () => {
    if (nodes.length === 0) return;
    try {
      runtimeStore.setRunning(true);
      runtimeStore.setError(null);
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
      runtimeStore.setError(err.message || 'Unknown execution error');
    } finally {
      if (!runtimeStore.isPaused) {
        runtimeStore.setRunning(false);
        runtimeStore.setStepMode(false);
      }
    }
  };

  const handleStop = () => {
    runtimeStore.setRunning(false);
    runtimeStore.resetDebug();
  };

  const handleReset = () => {
    runtimeStore.resetRuntime();
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
    e.target.value = '';
  };

  const hasError = !!runtimeStore.errorMessage;

  const currentStatus = hasError ? 'Error' : runtimeStore.isRunning ? (runtimeStore.isPaused ? 'Paused' : 'Running') : 'Idle';
  const statusColor = hasError ? 'bg-red-500' : runtimeStore.isPaused ? 'bg-yellow-500 animate-pulse' : runtimeStore.isRunning ? 'bg-blue-500 animate-pulse' : 'bg-gray-400';
  const statusTextColor = hasError ? 'text-red-600 font-semibold' : 'text-gray-500';

  return (
    <>
      <div className="h-14 border-b flex items-center px-4 justify-between bg-white shrink-0 shadow-sm">
        {/* Hidden file input for loading */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".webg,.json"
          className="hidden"
        />

        {/* Left: Logo */}
        <div className="flex items-center gap-3">
          <h1 className="font-extrabold text-xl mr-2 bg-clip-text text-transparent bg-gradient-to-r from-purple-500 to-indigo-600">WebG</h1>
        </div>

        {/* Center: File & Canvas Controls */}
        <div className="flex items-center gap-1.5">
          <Button size="sm" variant="outline" onClick={handleSave} className="gap-1">
            <Save size={14} /> Save
          </Button>
          <Button size="sm" variant="outline" onClick={handleLoad} className="gap-1">
            <FolderOpen size={14} /> Load
          </Button>
          <Button size="sm" variant="outline" onClick={onZoomFit} className="gap-1" title="Zoom Fit (Ctrl+0)">
            <ZoomIn size={14} /> Fit
          </Button>
          
          <div className="w-px h-6 bg-gray-200 mx-1"></div>
          
          {/* Execution controls */}
          {runtimeStore.isPaused ? (
            <Button 
              size="sm" 
              variant="default" 
              onClick={handleContinue} 
              className="bg-blue-600 hover:bg-blue-700 gap-1"
              title="Continue (resume execution)"
            >
              <Play size={14} /> Continue
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
                <Play size={14} /> Run
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={handleStepRun} 
                disabled={runtimeStore.isRunning} 
                className="gap-1 border-purple-300 text-purple-600 hover:bg-purple-50"
                title="Step through nodes one by one"
              >
                <StepForward size={14} /> Step
              </Button>
            </>
          )}
          
          <Button 
            size="sm" 
            variant="outline" 
            onClick={handleStop} 
            disabled={!runtimeStore.isRunning}
            className="gap-1 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
            title="Stop execution"
          >
            <Square size={14} /> Stop
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={handleReset} 
            disabled={runtimeStore.isRunning && !runtimeStore.isPaused}
            className="gap-1 text-gray-500 hover:text-gray-700"
            title="Reset all node states"
          >
            <RotateCcw size={14} /> Reset
          </Button>
        </div>

        {/* Right: Status + Clear */}
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <div className="flex items-center gap-1.5">
             <span className={`w-2.5 h-2.5 rounded-full ${statusColor}`}></span>
             <span className={statusTextColor}>{currentStatus}</span>
          </div>
          <div className="w-px h-6 bg-gray-200"></div>
          <Button size="sm" variant="ghost" onClick={clearGraph} className="gap-1 text-gray-400 hover:text-red-500">
            <Trash2 size={14} /> Clear
          </Button>
        </div>
      </div>

      {/* Error banner */}
      {hasError && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-2 flex items-center gap-3 text-sm">
          <span className="w-2 h-2 rounded-full bg-red-500 shrink-0"></span>
          <span className="text-red-700 font-medium flex-1 truncate">{runtimeStore.errorMessage}</span>
          <button 
            onClick={() => runtimeStore.setError(null)}
            className="text-red-400 hover:text-red-600 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      )}
    </>
  );
}
