import type { NodeProps } from 'reactflow';
import { useRuntimeStore } from '../../../store/useRuntimeStore';
import { useUIStore } from '../../../store/useUIStore';

interface BackdropNodeData {
  structureId: string;
  isForLoop: boolean;
}

/**
 * Pure-background mirror of a structure node, rendered at zIndex -1 —
 * below ReactFlow's edges layer. Wires crossing a structure stay crisp
 * instead of being dimmed by the frosted fill.
 *
 * Fully non-interactive (not draggable/selectable/connectable/focusable):
 * all chrome (header, terminals, resizer, selection ring) lives on the
 * transparent overlay StructureNode above the edges.
 */
export function BackdropNode({ data }: NodeProps<BackdropNodeData>) {
  const { structureId, isForLoop } = data;
  const nodeState = useRuntimeStore(s => s.nodeState[structureId] || 'idle');
  const selected = useUIStore(s => s.selectedNodeId === structureId || s.selectedNodeIds.includes(structureId));

  let border = 'border-border';
  if (nodeState === 'error') border = 'border-destructive/60';
  else if (nodeState === 'running') border = 'border-[var(--status-running)]/50';
  else if (nodeState === 'done') border = 'border-emerald-500/20';
  if (selected) border = 'border-ring/60';

  return (
    <div className={`w-full h-full rounded-lg border bg-canvas-bg/50 pointer-events-none ${border} ${isForLoop ? 'shadow-[0_0_0_1px_hsl(var(--border)),0_2px_8px_hsl(var(--border))]' : ''}`} />
  );
}
