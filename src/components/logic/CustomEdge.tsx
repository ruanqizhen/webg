import { BaseEdge, getBezierPath } from 'reactflow';
import type { EdgeProps } from 'reactflow';
import { useRuntimeStore } from '../../store/useRuntimeStore';
import { getTypeColor, isTypeArray } from '../../lib/colors';
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
  const uiControls = useGraphStore(state => state.uiControls);
  const { setSelectedEdgeId, selectedEdgeId } = useUIStore();
  const { removeEdge } = useGraphStore();

  const edges = useGraphStore(state => state.edges);
  let strokeColor = '#b1b1b7';
  let isArrayBase = false;
  let arrayModifiers = 0;
  let currId = source;
  let currPort = sourceHandleId;

  for (let i = 0; i < 50; i++) {
     const currNode = nodes.find(n => n.id === currId);
     if (!currNode) break;

     if (currNode.type === 'io.tunnel') {
        const parentNode = currNode.parent ? nodes.find(n => n.id === currNode.parent) : null;
        const isInLoop = parentNode?.type === 'structure.forLoop' || parentNode?.type === 'structure.whileLoop';
        const isIndexing = currNode.params?.indexing ?? (isInLoop ? true : false);

        if (isIndexing && parentNode) {
            const pW = parentNode.width || 300;
            const isInputTunnel = (currNode.position?.x ?? 0) < pW / 2;
            // If tracing backwards across an input tunnel, we are going from inside to outside. The base is an array, but we are inside, so -1.
            // If tracing backwards across an output tunnel, we are going from outside to inside. The base is a scalar, but we are outside, so +1.
            if (isInputTunnel) arrayModifiers--;
            else arrayModifiers++;
        }

        const inEdge = edges.find(e => e.targetNode === currId);
        if (!inEdge) break;
        currId = inEdge.sourceNode;
        currPort = inEdge.sourcePort;
     } else {
        const def = NodeRegistry[currNode.type];
        if (def) {
           const nodeOutputs = (currNode.outputs && currNode.outputs.length > 0) ? currNode.outputs : (def.outputs || []);
           const portDef = nodeOutputs.find((p: any) => p.name === currPort);
           if (portDef) {
               strokeColor = getTypeColor(portDef.type);
               isArrayBase = isTypeArray(portDef.type);
           }
           // Override for integer number constants
           if (currNode.type === 'source.number' && currNode.params?.numberType === 'integer') {
              strokeColor = '#1565C0';
           }
           // Override for integer terminal nodes
           if (currNode.type === 'io.terminal') {
              const ctrl = uiControls.find((c: any) => c.bindingNodeId === currNode.id);
              if (ctrl?.numberType === 'integer') {
                 strokeColor = '#1565C0';
              }
           }
        }
        break;
     }
  }

  const isSelected = selectedEdgeId === id;
  const isArray = (isArrayBase ? 1 : 0) + arrayModifiers > 0;

  return (
    <>
      <g onClick={() => setSelectedEdgeId(id)} style={{ cursor: 'pointer' }}>
        {isArray && !isSelected && (
           <>
              <BaseEdge
                path={edgePath}
                markerEnd={markerEnd}
                style={{
                  ...style,
                  stroke: strokeColor,
                  strokeWidth: 5,
                  animation: 'none',
                  strokeDasharray: 'none',
                }}
              />
              <BaseEdge
                path={edgePath}
                markerEnd={markerEnd}
                style={{
                  ...style,
                  stroke: '#f8fafc',
                  strokeWidth: 2,
                  animation: isRunning ? 'dashdraw 1s linear infinite' : 'none',
                  strokeDasharray: isRunning ? '6, 6' : 'none',
                }}
              />
           </>
        )}
        {(!isArray || isSelected) && (
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
        )}
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
