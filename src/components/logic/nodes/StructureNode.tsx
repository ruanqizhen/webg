import { Handle, Position, NodeResizer, type NodeProps } from 'reactflow';
import { NodeRegistry } from '../../../engine/registry';
import { getTypeColor } from '../../../lib/colors';
import { useRuntimeStore } from '../../../store/useRuntimeStore';
import { useUIStore } from '../../../store/useUIStore';
import { useGraphStore } from '../../../store/useGraphStore';
import type { PortDefinition } from '../../../types/runtime';

// Colors for different cases
const CASE_COLORS: Record<string, string> = {
  'true': '#10b981',    // green
  'false': '#ef4444',   // red
  '0': '#3b82f6',       // blue
  '1': '#f59e0b',       // amber
  '2': '#8b5cf6',       // purple
  '3': '#ec4899',       // pink
  'default': '#6b7280', // gray
};

interface StructureNodeData {
  def: typeof NodeRegistry[string];
  nodeType: string;
}

export function StructureNode({ id, data, type, selected }: NodeProps<StructureNodeData>) {
  const def = NodeRegistry[type] || data?.def;
  const nodeState = useRuntimeStore(s => s.nodeState[id] || 'idle');
  const setSelectedNodeId = useUIStore(s => s.setSelectedNodeId);
  const { updateNode } = useGraphStore();

  const node = useGraphStore(s => s.nodes.find(n => n.id === id));
  const mode = node?.params?.mode || 'boolean';
  const cases = node?.params?.cases || ['true', 'false'];
  const activeCase = node?.params?.activeCase || 'true';

  let stateBorder = 'border-dashed border border-border';
  if (selected) stateBorder = 'ring-2 ring-ring ring-offset-1 shadow-md border-solid border-ring';
  if (nodeState === 'error') stateBorder = 'ring-2 ring-destructive border-destructive';
  else if (nodeState === 'running') stateBorder = 'ring-2 ring-[var(--status-running)] animate-pulse';
  else if (nodeState === 'done') stateBorder = 'ring-2 ring-emerald-500/50';

  const handleCaseChange = (newCase: string) => {
    updateNode(id, { params: { ...node?.params, activeCase: newCase } });
  };

  const isCaseStructure = type === 'structure.case';

  return (
    <div
      className={`relative rounded-md min-w-[300px] min-h-[200px] pointer-events-none bg-card/30 backdrop-blur-[1px] ${stateBorder}`}
      style={{ width: node?.width || 300, height: node?.height || 200 }}
    >
      <div className="pointer-events-auto">
        <NodeResizer color="hsl(var(--ring))" isVisible={selected} minWidth={300} minHeight={200} />
      </div>

      {/* Header — professional muted */}
      <div
         className="px-2.5 py-1 text-xs font-medium select-none flex justify-between items-center rounded-t-md bg-muted text-muted-foreground border-b border-border pointer-events-auto cursor-pointer h-7"
         onClick={(e) => { e.stopPropagation(); setSelectedNodeId(id); }}
      >
        <span className="tracking-tight">{def?.label || type}</span>
        {isCaseStructure && (
          <div className="flex gap-1">
            {cases.map((caseName: string) => {
              const caseColor = CASE_COLORS[caseName] || CASE_COLORS['default'];
              return (
                <button
                  key={caseName}
                  className={`px-2 py-0.5 text-[10px] rounded-md transition-colors flex items-center gap-1 cursor-pointer pointer-events-auto border ${
                    activeCase === caseName
                      ? 'bg-card text-foreground font-medium shadow-sm border-border'
                      : 'bg-transparent text-muted-foreground border-transparent hover:bg-accent hover:text-accent-foreground'
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCaseChange(caseName);
                  }}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: caseColor }}
                  />
                  {caseName}
                </button>
              );
            })}
            {mode === 'number' && (
              <button
                className={`px-2 py-0.5 text-[10px] rounded-md transition-colors flex items-center gap-1 cursor-pointer pointer-events-auto border ${
                  activeCase === 'default'
                    ? 'bg-card text-foreground font-medium shadow-sm border-border'
                    : 'bg-transparent text-muted-foreground border-transparent hover:bg-accent hover:text-accent-foreground'
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleCaseChange('default');
                }}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: CASE_COLORS['default'] }}
                />
                Default
              </button>
            )}
          </div>
        )}
      </div>



      {/* Ports for the structure itself */}
      <div className="absolute top-8 left-0 flex flex-col gap-2 pointer-events-auto">
         {def?.inputs?.map((port: PortDefinition) => {
             const isSelector = isCaseStructure && port.name === 'selector';
             return (
                 <div key={port.name} className={`flex items-center gap-1 h-4 relative ${isSelector ? 'mt-4' : ''}`}>
                    <Handle
                      type="target"
                      position={Position.Left}
                      id={port.name}
                      className={isSelector ? '!rounded-sm' : ''}
                      style={{
                          background: isSelector ? '#22c55e' : getTypeColor(port.type),
                          width: isSelector ? 16 : 12,
                          height: isSelector ? 16 : 12,
                          left: isSelector ? -8 : -6,
                          boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.4), 0 1px 2px rgba(0,0,0,0.5)',
                          border: '1px solid #14532d',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          zIndex: 10
                      }}
                      title={`${port.name} (${port.type})`}
                    >
                       {isSelector && <span className="text-[10px] font-black pointer-events-none text-white drop-shadow-md leading-none select-none">?</span>}
                    </Handle>
                    {!isSelector && <span className="text-muted-foreground pl-2 text-[10px] font-medium uppercase tracking-wide pointer-events-none">{port.name}</span>}
                 </div>
             );
         })}
      </div>

      <div className="absolute top-8 right-0 flex flex-col gap-2 items-end pointer-events-auto">
         {def?.outputs?.filter((p: PortDefinition) => !(type === 'structure.forLoop' && p.name === 'i')).map((port: PortDefinition) => (
             <div key={port.name} className="flex items-center justify-end gap-1 h-4 relative group">
                <span className="text-muted-foreground pr-2 text-[10px] font-medium uppercase tracking-wide pointer-events-none">{port.name}</span>
                <Handle
                  type="source"
                  position={Position.Right}
                  id={port.name}
                  style={{ background: getTypeColor(port.type), width: 12, height: 12, right: -6 }}
                  title={`${port.name} (${port.type})`}
                />
             </div>
          ))}
      </div>

      {/* Internal Iterator Terminal for For Loop */}
      {type === 'structure.forLoop' && (
        <div
          className="absolute bottom-2 left-2 flex items-center bg-[var(--data-number)]/10 border border-[var(--data-number)]/30 rounded px-1 min-w-[24px] h-[18px] shadow-sm z-50 pointer-events-auto"
          title="Iteration count (i)"
        >
           <span className="text-[10px] font-bold text-[var(--data-number)] select-none mr-1">i</span>
           <Handle
             type="source"
             position={Position.Right}
             id="i"
             style={{ 
                background: getTypeColor('number'), 
                width: 8, height: 8, 
                right: -4, top: '50%',
                marginTop: -4,
                border: '1px solid #1e3a8a',
                borderRadius: '1px'
             }}
           />
        </div>
      )}
    </div>
  );
}
