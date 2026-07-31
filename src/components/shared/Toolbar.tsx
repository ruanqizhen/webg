import { Play, Square, RotateCcw, Trash2, Save, FolderOpen, ZoomIn, StepForward, X, HelpCircle, Sun, Moon, Monitor, Terminal, Lightbulb, Repeat } from 'lucide-react';
import { useThemeStore } from '../../store/useThemeStore';
import { useLogStore } from '../../store/useLogStore';
import { createExampleProject } from '../../lib/exampleProject';
import { createLoopExampleProject } from '../../lib/loopExampleProject';
import { useGraphStore } from '../../store/useGraphStore';
import { useRuntimeStore } from '../../store/useRuntimeStore';
import { useTypeErrorStore } from '../../store/useTypeErrorStore';
import { useUIStore } from '../../store/useUIStore';
import { ExecutionEngine } from '../../engine/scheduler';
import { Button } from '../ui/button';
import { BadgeDot } from '../ui/badge-dot';
import { useRef, useState } from 'react';

export function Toolbar({ onZoomFit }: { onZoomFit?: () => void }) {
  const { clearGraph, exportGraph, loadGraph, nodes, edges, uiControls } = useGraphStore();
  const runtimeStore = useRuntimeStore();
  const typeErrors = useTypeErrorStore(s => s.errors);
  const [showTypeErrors, setShowTypeErrors] = useState(false);
  const { theme, setTheme } = useThemeStore();
  const consoleVisible = useLogStore((s) => s.isVisible);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const engineRef = useRef<ExecutionEngine | null>(null);

  const handleRun = async () => {
    if (nodes.length === 0) return;
    if (engineRef.current) return;
    try {
      runtimeStore.setRunning(true);
      runtimeStore.setError(null);
      runtimeStore.setStepMode(false);
      const engine = new ExecutionEngine(
         { nodes, edges, uiControls },
         runtimeStore,
         runtimeStore.setNodeState,
         runtimeStore.setPortValue,
         undefined,
         true
      );
      engineRef.current = engine;
      await engine.executeAll();
    } catch (err: any) {
      if (err.message !== 'Execution Aborted') {
        runtimeStore.setError(err.message || 'Unknown execution error');
      }
    } finally {
      engineRef.current = null;
      runtimeStore.setRunning(false);
    }
  };

  const handleStepRun = async () => {
    if (nodes.length === 0) return;
    if (engineRef.current) return;
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
           onNodeStart: (nodeId) => runtimeStore.setCurrentStepNode(nodeId),
           onNodeFinish: () => runtimeStore.setCurrentStepNode(null),
           shouldPause: async (nodeId) => {
             const node = nodes.find(n => n.id === nodeId);
             if (runtimeStore.isStepMode || node?.breakpoint) {
               runtimeStore.setCurrentStepNode(nodeId);
               await runtimeStore.waitForStep();
               return true;
             }
             return false;
           }
         }
      );
      engineRef.current = engine;
      await engine.executeAll();
    } catch (err: any) {
      if (err.message !== 'Execution Aborted') {
        runtimeStore.setError(err.message || 'Unknown execution error');
      }
    } finally {
      engineRef.current = null;
      if (!runtimeStore.isPaused) {
        runtimeStore.setRunning(false);
        runtimeStore.setStepMode(false);
      }
    }
  };

  const handleStop = () => {
    engineRef.current?.abort();
    engineRef.current = null;
    runtimeStore.setRunning(false);
    runtimeStore.resetDebug();
  };

  const cycleTheme = () => {
    const next: Record<string, 'light' | 'dark' | 'system'> = { light: 'dark', dark: 'system', system: 'light' };
    setTheme(next[theme]);
  };

  const handleLoadExample = () => {
    loadGraph(createExampleProject());
  };

  const handleLoadLoopExample = () => {
    loadGraph(createLoopExampleProject());
  };

  const handleClear = () => {
    if (window.confirm('Clear the entire project? This action cannot be undone.')) {
      clearGraph();
    }
  };

  const handleReset = () => runtimeStore.resetRuntime();
  const handleContinue = () => runtimeStore.continueExecution();

  const handleSave = () => {
    try {
      const graph = exportGraph();
      const json = JSON.stringify({ version: "1.1", graph, ui: { panelLayout: {}, viewport: {} } }, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `project_${new Date().toISOString().slice(0,10)}.webg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch (err: any) {
      alert('Failed to save: ' + (err?.message || 'Unknown error'));
    }
  };

  const handleLoad = () => fileInputRef.current?.click();
  const MAX_FILE_SIZE = 20 * 1024 * 1024;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) {
      alert(`File too large (${(file.size/1024/1024).toFixed(1)}MB). Max 20MB.`);
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const result = event.target?.result;
        if (typeof result !== 'string') throw new Error('Invalid file content');
        const data = JSON.parse(result);
        if (data.graph) loadGraph(data.graph);
        else if (data.nodes) loadGraph(data);
        else throw new Error('Invalid file format');
      } catch (err: any) {
        alert("Failed to load: " + (err.message || 'Unknown error'));
      }
    };
    reader.onerror = () => alert("Failed to read file");
    reader.readAsText(file);
    e.target.value = '';
  };

  const hasError = !!runtimeStore.errorMessage;
  const statusMeta = hasError
    ? { dot: 'error' as const, label: 'Error', pulse: false }
    : runtimeStore.isPaused
      ? { dot: 'paused' as const, label: 'Paused', pulse: true }
      : runtimeStore.isRunning
        ? { dot: 'running' as const, label: 'Running', pulse: true }
        : { dot: 'idle' as const, label: 'Idle', pulse: false };

  return (
    <>
      <div className="h-12 border-b border-border flex items-center px-3 justify-between bg-card shrink-0">
        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".webg,.json" className="hidden" />

        {/* Logo */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-7 h-7 rounded-md bg-foreground text-background flex items-center justify-center font-bold text-[13px] tracking-tight">W</div>
          <span className="font-semibold text-[15px] tracking-tight">WebG</span>
          <span className="text-[11px] text-muted-foreground font-mono ml-1 hidden sm:inline">v0</span>
        </div>

        {/* Center */}
        <div className="flex items-center gap-1">
          <Button size="sm" variant="secondary" onClick={handleSave} className="gap-1.5 h-7"><Save size={14} /> Save</Button>
          <Button size="sm" variant="secondary" onClick={handleLoad} className="gap-1.5 h-7"><FolderOpen size={14} /> Load</Button>
          <Button size="sm" variant="secondary" onClick={onZoomFit} className="gap-1.5 h-7"><ZoomIn size={14} /> Fit</Button>

          <div className="w-px h-4 bg-border mx-1.5" />

          {runtimeStore.isPaused ? (
            <Button size="sm" onClick={handleContinue} className="gap-1.5 h-7"><Play size={14} /> Continue</Button>
          ) : (
            <>
              <Button size="sm" onClick={handleRun} disabled={runtimeStore.isRunning} className="gap-1.5 h-7"><Play size={14} /> Run</Button>
              <Button size="sm" variant="secondary" onClick={handleStepRun} disabled={runtimeStore.isRunning} className="gap-1.5 h-7"><StepForward size={14} /> Step</Button>
            </>
          )}

          <Button size="sm" variant="secondary" onClick={handleStop} disabled={!runtimeStore.isRunning} className="gap-1.5 h-7"><Square size={14} /> Stop</Button>
          <Button size="sm" variant="ghost" onClick={handleReset} disabled={runtimeStore.isRunning && !runtimeStore.isPaused} className="gap-1.5 h-7 text-muted-foreground"><RotateCcw size={14} /> Reset</Button>
        </div>

        {/* Right */}
        <div className="flex items-center gap-1 shrink-0">
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-muted/50 border border-transparent mr-1">
            <BadgeDot status={statusMeta.dot} pulse={statusMeta.pulse} />
            <span className="text-xs font-medium text-muted-foreground">{statusMeta.label}</span>
          </div>

          <div className="w-px h-4 bg-border mx-1 hidden sm:block" />

          <Button size="sm" variant="ghost" onClick={handleLoadExample} className="h-7 w-7 p-0 text-muted-foreground" title="Example"><Lightbulb size={14} /></Button>
          <Button size="sm" variant="ghost" onClick={handleLoadLoopExample} className="h-7 w-7 p-0 text-muted-foreground" title="Loop Demo (For/While)"><Repeat size={14} /></Button>
          <Button size="sm" variant="ghost" onClick={handleClear} className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive" title="Clear"><Trash2 size={14} /></Button>

          <div className="w-px h-4 bg-border mx-1 hidden sm:block" />

          <Button size="sm" variant="ghost" onClick={cycleTheme} className="h-7 w-7 p-0 text-muted-foreground" title={`Theme: ${theme}`}>
            {theme === 'light' && <Sun size={14} />}
            {theme === 'dark' && <Moon size={14} />}
            {theme === 'system' && <Monitor size={14} />}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => useLogStore.getState().toggleVisible()} className={`h-7 w-7 p-0 ${consoleVisible ? 'text-foreground' : 'text-muted-foreground'}`} title="Console"><Terminal size={14} /></Button>
          <Button size="sm" variant="ghost" onClick={() => window.open('https://github.com/ruanqizhen/webg/blob/main/README.md', '_blank')} className="h-7 w-7 p-0 text-muted-foreground" title="Help"><HelpCircle size={14} /></Button>
        </div>
      </div>

      {hasError && (
        <div className="bg-destructive/10 border-b border-destructive/20 px-3 py-2 flex items-center gap-2.5 text-sm">
          <BadgeDot status="error" />
          <span className="text-destructive font-medium flex-1 truncate text-xs">{runtimeStore.errorMessage}</span>
          <Button size="sm" variant="ghost" onClick={() => runtimeStore.setError(null)} className="h-6 w-6 p-0 text-destructive/60 hover:text-destructive"><X size={14} /></Button>
        </div>
      )}

      {typeErrors.length > 0 && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-3 py-2 flex flex-col gap-1.5 text-sm">
          <div className="flex items-center gap-2.5">
            <BadgeDot status="warning" />
            <span className="text-amber-700 dark:text-amber-400 font-medium flex-1 text-xs">{typeErrors.length} type error{typeErrors.length>1?'s':''} — Broken Arrow</span>
            <Button size="sm" variant="ghost" onClick={() => setShowTypeErrors(!showTypeErrors)} className="h-6 px-2 text-[11px] text-amber-700 dark:text-amber-400">{showTypeErrors ? 'Hide' : 'View'}</Button>
            <Button size="sm" variant="ghost" onClick={() => useTypeErrorStore.getState().clear()} className="h-6 w-6 p-0 text-amber-700/60 hover:text-amber-700"><X size={14} /></Button>
          </div>
          {showTypeErrors && (
            <div className="flex flex-col gap-1 mt-1 max-h-[120px] overflow-y-auto">
              {typeErrors.map(err => (
                <div key={err.id} className="flex items-center gap-2 text-[11px] font-mono bg-card border border-border rounded px-2 py-1">
                  <span className="text-muted-foreground truncate">{err.sourceNode.slice(0,6)}.{err.sourcePort} ({err.sourceType})</span>
                  <span className="text-muted-foreground">→</span>
                  <span className="text-foreground truncate">{err.targetNode.slice(0,6)}.{err.targetPort} ({err.targetType})</span>
                  <span className="ml-auto text-destructive truncate max-w-[200px]">{err.message}</span>
                  <Button size="sm" variant="ghost" className="h-5 w-5 p-0 ml-1" onClick={() => {
                    useUIStore.getState().setSelectedNodeId(err.targetNode);
                  }} title="Focus"><span className="text-[10px]">◉</span></Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
