import type { NodeProps } from 'reactflow';
import { useRuntimeStore } from '../../../store/useRuntimeStore';
import { useUIStore } from '../../../store/useUIStore';
import { useGraphStore } from '../../../store/useGraphStore';
import { getStructureColor } from '../../../lib/colors';

interface BackdropNodeData {
  structureId: string;
  isForLoop: boolean;
}

/**
 * Pure-background mirror of a structure node, rendered at zIndex -1 —
 * below ReactFlow's edges layer. Wires crossing a structure stay crisp
 * instead of being dimmed by the fill.
 *
 * Fully non-interactive (not draggable/selectable/connectable/focusable):
 * all chrome (header, terminals, resizer, selection ring) lives on the
 * transparent overlay StructureNode above the edges.
 */
export function BackdropNode({ data }: NodeProps<BackdropNodeData>) {
  const { structureId, isForLoop } = data;
  const nodeState = useRuntimeStore(s => s.nodeState[structureId] || 'idle');
  const selected = useUIStore(s => s.selectedNodeId === structureId || s.selectedNodeIds.includes(structureId));
  const isDropTarget = useUIStore(s => s.dropTargetStructureId === structureId);
  const structType = useGraphStore(s => s.nodes.find(n => n.id === structureId)?.type);

  // LabVIEW-style frame: near-square corners, 2px border tinted per structure
  // (kept in sync with the StructureNode overlay above it).
  const structureBorder = structType === 'structure.forLoop'
    ? 'border-[var(--data-integer)]/60'
    : structType === 'structure.whileLoop'
      ? 'border-amber-600/60'
      : 'border-slate-500/60';
  let border = structureBorder;
  if (nodeState === 'error') border = 'border-destructive/60';
  else if (nodeState === 'running') border = 'border-[var(--status-running)]/50';
  else if (nodeState === 'done') border = 'border-emerald-500/20';
  if (selected) border = 'border-ring/60';

  // Visible translucent fill, tinted per structure type (For blue, While
  // amber, Case slate). The old bg-canvas-bg/50 blended back to the canvas
  // color and read as fully transparent, so the frame's region — and
  // whether a control or wire sat inside it or behind it — was invisible.
  // The mix stays mostly see-through, so the dot grid and wires still show
  // through the region; the tint is what marks the region itself.
  const fillColor = structType ? getStructureColor(structType) : '#64748B';

  // Same drop-target highlight as the chrome above, so the whole frame —
  // fill included — reads as the target while a node hovers over it:
  // the fill deepens and the border glows.
  return (
    <div
      className={`w-full h-full rounded-[2px] border-2 pointer-events-none ${border} ${isForLoop && !isDropTarget ? 'shadow-[0_0_0_1px_hsl(var(--border)),0_2px_8px_hsl(var(--border))]' : ''}`}
      style={{
        backgroundColor: isDropTarget
          ? `color-mix(in srgb, ${fillColor} 30%, white 25%)`
          : `color-mix(in srgb, ${fillColor} 22%, white 18%)`,
        ...(isDropTarget ? { borderColor: fillColor, boxShadow: `0 0 0 2px ${fillColor}33` } : {}),
      }}
    />
  );
}
