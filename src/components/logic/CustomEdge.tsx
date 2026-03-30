import { BaseEdge, getBezierPath } from 'reactflow';
import type { EdgeProps } from 'reactflow';
import { useRuntimeStore } from '../../store/useRuntimeStore';
import { getTypeColor } from '../../lib/colors';
import { NodeRegistry } from '../../engine/registry';
import { useGraphStore } from '../../store/useGraphStore';
import { useUIStore } from '../../store/useUIStore';

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
  id,
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
  const { setSelectedEdgeId, selectedEdgeId } = useUIStore();
  const { removeEdge } = useGraphStore();

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

  const isSelected = selectedEdgeId === id;

  return (
    <>
      <g onClick={() => setSelectedEdgeId(id)} style={{ cursor: 'pointer' }}>
        <BaseEdge
          path={edgePath}
          markerEnd={markerEnd}
          style={{
            ...style,
            stroke: isSelected ? '#f59e0b' : strokeColor,
            strokeWidth: isSelected ? 4 : 3,
            animation: isRunning && !isSelected ? 'dashdraw 1s linear infinite' : 'none',
            strokeDasharray: isRunning && !isSelected ? '6, 6' : 'none',
          }}
        />
      </g>
      {isRunning && (
        <circle r="4" fill={strokeColor}>
          <animateMotion dur="1s" repeatCount="indefinite" path={edgePath} />
        </circle>
      )}
      {/* Delete button on selection */}
      {isSelected && (
        <g>
          <foreignObject
            width={40}
            height={40}
            x={(sourceX + targetX) / 2 - 20}
            y={(sourceY + targetY) / 2 - 20}
            style={{ overflow: 'visible' }}
          >
            <div
              className="w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg flex items-center justify-center cursor-pointer border-2 border-white transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                removeEdge(id);
                setSelectedEdgeId(null);
              }}
              title="Delete connection"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </div>
          </foreignObject>
        </g>
      )}
    </>
  );
}
