import { BaseEdge, getBezierPath } from 'reactflow';
import type { EdgeProps } from 'reactflow';
import { useRuntimeStore } from '../../store/useRuntimeStore';
import { getTypeColor } from '../../lib/colors';
import { NodeRegistry } from '../../engine/registry';
import { useGraphStore } from '../../store/useGraphStore';

export function CustomEdge({
  source,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  sourceHandleId,
}: EdgeProps) {
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const nodeState = useRuntimeStore((s) => s.nodeState[source]);
  const isRunning = nodeState === 'running' || nodeState === 'done';
  const nodes = useGraphStore(state => state.nodes);

  // Auto-detect color from the source graph node definition
  let strokeColor = '#b1b1b7';
  const sourceNode = nodes.find(n => n.id === source);
  if (sourceNode && sourceHandleId) {
    const def = NodeRegistry[sourceNode.type];
    if (def) {
      const portDef = def.outputs.find((p) => p.name === sourceHandleId);
      if (portDef) {
        strokeColor = getTypeColor(portDef.type);
      }
    }
  }

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          stroke: strokeColor,
          strokeWidth: 3,
          animation: isRunning ? 'dashdraw 1s linear infinite' : 'none',
          strokeDasharray: isRunning ? '6, 6' : 'none',
        }}
      />
      {isRunning && (
        <circle r="4" fill={strokeColor}>
          <animateMotion dur="1s" repeatCount="indefinite" path={edgePath} />
        </circle>
      )}
    </>
  );
}
