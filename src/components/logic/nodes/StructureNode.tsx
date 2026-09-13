import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Handle, Position, NodeResizer, type NodeProps } from 'reactflow';
import { NodeRegistry } from '../../../engine/registry';
import { getTypeColor } from '../../../lib/colors';
import { useRuntimeStore } from '../../../store/useRuntimeStore';
import { useUIStore } from '../../../store/useUIStore';
import { useGraphStore } from '../../../store/useGraphStore';
import type { PortDefinition } from '../../../types/runtime';
import { Repeat, RefreshCw, Layers } from 'lucide-react';

const CASE_COLORS: Record<string, string> = {
  'true': '#10b981',
  'false': '#ef4444',
  '0': '#3b82f6',
  '1': '#f59e0b',
  '2': '#8b5cf6',
  '3': '#ec4899',
  'default': '#6b7280',
};

interface StructureNodeData {
  def: typeof NodeRegistry[string];
  nodeType: string;
}

export function StructureNode({ id, data, type, selected }: NodeProps<StructureNodeData>) {
  const def = NodeRegistry[type] || data?.def;
  const nodeState = useRuntimeStore(s => s.nodeState[id] || 'idle');
  const setSelectedNodeId = useUIStore(s => s.setSelectedNodeId);
  const clearSelection = useUIStore(s => s.clearSelection);
  const { updateNode } = useGraphStore();
  const node = useGraphStore(s => s.nodes.find(n => n.id === id));

  const [showMenu, setShowMenu] = useState(false);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedNodeId(id);
    setMenuPos({ x: e.clientX, y: e.clientY });
    setShowMenu(true);
  };

  const handleDelete = () => {
    setShowMenu(false);
    const store = useGraphStore.getState();
    const hasChildren = store.nodes.some(n => n.parent === id);
    if (hasChildren) {
      if (!window.confirm(`Delete "${type.split('.')[1]}" structure? All internal nodes and connections will be permanently removed.`)) return;
    }
    store.removeNode(id);
    clearSelection();
  };
  const mode = node?.params?.mode || 'boolean';
  const cases = node?.params?.cases || ['true', 'false'];
  const activeCase = node?.params?.activeCase || 'true';

  const hasConditional = Boolean(node?.params?.hasConditional);
  const conditionalMode = node?.params?.conditionalMode || 'stopIfTrue';
  const conditionMode = node?.params?.conditionMode || 'stopIfTrue';

  let stateBorder = 'border border-border';
  if (selected) stateBorder = 'ring-2 ring-ring ring-offset-1 shadow-md border-border';
  if (nodeState === 'error') stateBorder = 'ring-2 ring-destructive border-destructive';
  else if (nodeState === 'running') stateBorder = 'ring-2 ring-[var(--status-running)] animate-pulse border-[var(--status-running)]/50';
  else if (nodeState === 'done') stateBorder = 'ring-2 ring-emerald-500/30 border-emerald-500/20';

  const handleCaseChange = (newCase: string) => {
    updateNode(id, { params: { ...node?.params, activeCase: newCase } });
  };

  const isCaseStructure = type === 'structure.case';
  const isForLoop = type === 'structure.forLoop';
  const isWhileLoop = type === 'structure.whileLoop';

  const LoopIcon = isForLoop ? Repeat : isWhileLoop ? RefreshCw : Layers;

  return (
    <div
      // Transparent overlay: the frosted fill lives on the BackdropNode mirror
      // (zIndex -1, below the edges layer) so wires inside stay crisp.
      // Chrome (header, ports, resizer, rings) stays here, above the wires.
      className={`relative rounded-lg min-w-[320px] min-h-[200px] pointer-events-none ${stateBorder}`}
      style={{ width: node?.width || 320, height: node?.height || 220 }}
      onContextMenu={handleContextMenu}
    >
      <div className="pointer-events-auto">
        <NodeResizer color="hsl(var(--ring))" isVisible={selected} minWidth={320} minHeight={200} onResizeStart={() => useGraphStore.getState().pushHistory()} />
      </div>

      {/* Header */}
      <div
        className="px-2.5 py-1 text-xs font-medium select-none flex justify-between items-center rounded-t-lg bg-muted/60 text-muted-foreground border-b border-border pointer-events-auto cursor-pointer h-8"
        onClick={(e) => { e.stopPropagation(); setSelectedNodeId(id); }}
      >
        <span className="flex items-center gap-1.5 tracking-tight">
          <LoopIcon size={12} className={isForLoop ? 'text-[var(--data-integer)]' : isWhileLoop ? 'text-amber-600' : 'text-muted-foreground'} />
          {def?.label || type}
          {isForLoop && hasConditional && (
            <span className={`ml-2 text-[9px] px-1.5 py-0 rounded-full border font-mono ${conditionalMode === 'stopIfTrue' ? 'bg-destructive/10 text-destructive border-destructive/20' : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'}`}>{conditionalMode === 'stopIfTrue' ? 'Stop if T' : 'Continue if T'}</span>
          )}
          {isWhileLoop && (
            <span className={`ml-2 text-[9px] px-1.5 py-0 rounded-full border font-mono ${conditionMode === 'stopIfTrue' ? 'bg-destructive/10 text-destructive border-destructive/20' : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'}`}>{conditionMode === 'stopIfTrue' ? 'Stop if T' : 'Cont if T'}</span>
          )}
        </span>
        {isCaseStructure && (
          <div className="flex gap-1">
            {cases.map((caseName: string) => {
              const caseColor = CASE_COLORS[caseName] || CASE_COLORS['default'];
              return (
                <button key={caseName} className={`px-2 py-0.5 text-[10px] rounded-md transition-colors flex items-center gap-1 cursor-pointer pointer-events-auto border ${activeCase === caseName ? 'bg-card text-foreground font-medium shadow-sm border-border' : 'bg-transparent text-muted-foreground border-transparent hover:bg-accent hover:text-accent-foreground'}`} onClick={(e) => { e.stopPropagation(); handleCaseChange(caseName); }}>
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: caseColor }} />{caseName}
                </button>
              );
            })}
            {mode === 'number' && (
              <button className={`px-2 py-0.5 text-[10px] rounded-md transition-colors flex items-center gap-1 cursor-pointer pointer-events-auto border ${activeCase === 'default' ? 'bg-card text-foreground font-medium shadow-sm border-border' : 'bg-transparent text-muted-foreground border-transparent hover:bg-accent hover:text-accent-foreground'}`} onClick={(e) => { e.stopPropagation(); handleCaseChange('default'); }}>
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CASE_COLORS['default'] }} />Default
              </button>
            )}
          </div>
        )}
      </div>

      {/* For Loop N terminal — outer left top, LabVIEW style */}
      {isForLoop && (
        <div className="absolute -left-2 top-3 flex items-center gap-1 pointer-events-auto">
          <div className="relative w-[18px] h-[14px] rounded-[2px] bg-[var(--data-integer)] border border-foreground/20 shadow-sm flex items-center justify-center">
            <span className="text-[9px] font-bold text-white leading-none select-none">N</span>
            <Handle type="target" position={Position.Left} id="N" className="!bg-transparent !border-0 !w-full !h-full !left-0 !top-0 !rounded-[2px]" style={{ background: 'transparent' }} title="N (count) — I32" />
          </div>
        </div>
      )}

      {/* Generic input ports (excluding N, conditional, selector which have special UI) */}
      <div className="absolute top-10 left-0 flex flex-col gap-2.5 pointer-events-auto">
         {def?.inputs?.filter((p: PortDefinition) => {
           if (isForLoop && (p.name === 'N' || p.name === 'conditional')) return false;
           if (isWhileLoop && p.name === 'stop') return false;
           if (isCaseStructure && p.name === 'selector') return false;
           return true;
         }).map((port: PortDefinition) => (
           <div key={port.name} className="flex items-center gap-1 h-4 relative">
              <Handle type="target" position={Position.Left} id={port.name} style={{ background: getTypeColor(port.type), width: 12, height: 12, left: -6, border: '1px solid hsl(var(--foreground) / 0.15)', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }} title={`${port.name} (${port.type})`} />
              <span className="text-muted-foreground pl-2 text-[10px] font-medium uppercase tracking-wide pointer-events-none">{port.name}</span>
           </div>
         ))}
         {/* Case selector special */}
         {isCaseStructure && def?.inputs?.find(p => p.name === 'selector') && (
           <div className="flex items-center gap-1 h-4 relative mt-2">
              <Handle type="target" position={Position.Left} id="selector" className="!rounded-sm" style={{ background: '#22c55e', width: 16, height: 16, left: -8, border: '1px solid #14532d', boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.3), 0 1px 2px rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }} title="selector (boolean)" >
                <span className="text-[10px] font-black text-white leading-none select-none pointer-events-none">?</span>
              </Handle>
           </div>
         )}
      </div>

      {/* Output ports - generic */}
      <div className="absolute top-10 right-0 flex flex-col gap-2.5 items-end pointer-events-auto">
         {def?.outputs?.filter((p: PortDefinition) => p.name !== 'i').map((port: PortDefinition) => (
             <div key={port.name} className="flex items-center justify-end gap-1 h-4 relative">
                <span className="text-muted-foreground pr-2 text-[10px] font-medium uppercase tracking-wide pointer-events-none">{port.name}</span>
                <Handle type="source" position={Position.Right} id={port.name} style={{ background: getTypeColor(port.type), width: 12, height: 12, right: -6, border: '1px solid hsl(var(--foreground) / 0.15)' }} title={`${port.name} (${port.type})`} />
             </div>
          ))}
      </div>

      {/* i terminal — left bottom inside, for both For and While — LabVIEW blue */}
      {(isForLoop || isWhileLoop) && (
        <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-[var(--data-integer)]/10 border border-[var(--data-integer)]/30 rounded-md px-1.5 h-[18px] shadow-sm z-20 pointer-events-auto" title="Iteration count (i) — I32">
           <span className="text-[10px] font-bold text-[var(--data-integer)] select-none">i</span>
           <div className="relative w-2 h-2">
             <Handle type="source" position={Position.Right} id="i" className="!bg-[var(--data-integer)] !w-2 !h-2 !border-0 !rounded-[1px] !right-0 !top-1/2 !-translate-y-1/2" style={{ background: 'var(--data-integer)', width: 8, height: 8, right: -6 }} />
           </div>
        </div>
      )}

      {/* While Loop stop/condition terminal — right bottom inside */}
      {isWhileLoop && (
        <div className={`absolute bottom-2 right-2 flex items-center gap-1 rounded-md px-1.5 h-[18px] shadow-sm z-20 pointer-events-auto border ${conditionMode === 'stopIfTrue' ? 'bg-destructive/10 border-destructive/30' : 'bg-emerald-500/10 border-emerald-500/30'}`} title={`Condition — ${conditionMode === 'stopIfTrue' ? 'Stop if True' : 'Continue if True'}`}>
           <span className={`text-[9px] font-bold select-none ${conditionMode === 'stopIfTrue' ? 'text-destructive' : 'text-emerald-600'}`}>{conditionMode === 'stopIfTrue' ? '■' : '↻'}</span>
           <span className="text-[9px] font-mono font-medium text-muted-foreground">{conditionMode === 'stopIfTrue' ? 'Stop' : 'Cont'}</span>
           <div className="relative w-2 h-2 ml-1">
             <Handle type="target" position={Position.Left} id="stop" className="!w-2 !h-2 !rounded-full !bg-current" style={{ background: conditionMode === 'stopIfTrue' ? 'var(--status-error)' : 'var(--status-paused)', width: 10, height: 10, right: -6 }} title={`${conditionMode}`} />
           </div>
        </div>
      )}

      {/* For Loop conditional terminal — right bottom inside, only if enabled */}
      {isForLoop && hasConditional && (
        <div className={`absolute bottom-2 right-2 flex items-center gap-1 rounded-md px-1.5 h-[18px] shadow-sm z-20 pointer-events-auto border ${conditionalMode === 'stopIfTrue' ? 'bg-destructive/10 border-destructive/30' : 'bg-emerald-500/10 border-emerald-500/30'}`} title={`Conditional — ${conditionalMode}`}>
           <span className={`text-[9px] font-bold select-none ${conditionalMode === 'stopIfTrue' ? 'text-destructive' : 'text-emerald-600'}`}>?</span>
           <span className="text-[9px] font-mono text-muted-foreground">{conditionalMode === 'stopIfTrue' ? 'Stop' : 'Cont'}</span>
           <div className="relative w-2 h-2 ml-1">
             <Handle type="target" position={Position.Left} id="conditional" className="!w-2 !h-2" style={{ background: conditionalMode === 'stopIfTrue' ? 'var(--status-error)' : 'var(--status-paused)', width: 10, height: 10 }} title="conditional" />
           </div>
        </div>
      )}

      {/* Context menu — Delete */}
      {showMenu && typeof document !== 'undefined' && createPortal(
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => setShowMenu(false)} onContextMenu={(e) => { e.preventDefault(); setShowMenu(false); }} />
          <div className="fixed z-[9999] bg-popover rounded-lg shadow-xl border border-border py-1 min-w-[160px] text-xs animate-in fade-in zoom-in-95" style={{ left: menuPos.x, top: menuPos.y }}>
            <button className="w-full text-left px-3 py-1.5 hover:bg-accent hover:text-accent-foreground flex items-center gap-2" onClick={() => { setShowMenu(false); setSelectedNodeId(id); }}>
              <span className="w-4 text-center">⚙</span>Properties
            </button>
            <div className="h-px bg-border my-1 mx-2" />
            <button className="w-full text-left px-3 py-1.5 hover:bg-destructive/10 text-destructive flex items-center gap-2" onClick={handleDelete}>
              <span className="w-4 text-center">🗑</span>Delete {isForLoop ? 'For Loop' : isWhileLoop ? 'While Loop' : 'Structure'}
            </button>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}
