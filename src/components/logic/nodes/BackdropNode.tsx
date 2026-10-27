import type { NodeProps } from 'reactflow';
import { useRuntimeStore } from '../../../store/useRuntimeStore';
import { useUIStore } from '../../../store/useUIStore';
import { useGraphStore } from '../../../store/useGraphStore';
import { getStructureColor, getStructureDepthFill } from '../../../lib/colors';

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

  // Nesting depth: how many ancestor structures enclose this one. The fill
  // color keys off depth (not type), so each nested layer gets its own very
  // light hue and adjacent layers never share a color.
  const depth = useGraphStore(s => {
    let d = 0;
    let cur = s.nodes.find(n => n.id === structureId);
    while (cur?.parent) {
      const parentId: string = cur.parent;
      const parent = s.nodes.find(n => n.id === parentId);
      if (!parent) break;
      if (String(parent.type).startsWith('structure')) d += 1;
      cur = parent;
    }
    return d;
  });
  const fillColor = getStructureDepthFill(depth);
  // Border/glow color stays type-based, matching the StructureNode chrome.
  const typeColor = structType ? getStructureColor(structType) : '#64748B';

  // Same drop-target highlight as the chrome above, so the whole frame —
  // fill included — reads as the target while a node hovers over it:
  // the fill goes solid and the border glows.
  return (
    <div
      className={`w-full h-full rounded-[2px] border-2 pointer-events-none ${border} ${isForLoop && !isDropTarget ? 'shadow-[0_0_0_1px_hsl(var(--border)),0_2px_8px_hsl(var(--border))]' : ''}`}
      style={{
        backgroundColor: isDropTarget
          ? fillColor
          : `color-mix(in srgb, ${fillColor} 80%, transparent)`,
        ...(isDropTarget ? { borderColor: typeColor, boxShadow: `0 0 0 2px ${typeColor}33` } : {}),
      }}
    />
  );
}
