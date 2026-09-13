import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { BaseEdge, getBezierPath } from 'reactflow';
import type { EdgeProps } from 'reactflow';
import { getTypeColor, isTypeArray } from '../../lib/colors';
import { NodeRegistry } from '../../engine/registry';
import { useGraphStore } from '../../store/useGraphStore';
import { useUIStore } from '../../store/useUIStore';
import type { NodeInstance, Edge, UIControl } from '../../types/graph';

function resolveEdgeVisuals(
  source: string,
  sourceHandleId: string | null | undefined,
  allNodes: NodeInstance[],
  allEdges: Edge[],
  allUiControls: UIControl[]
) {
  let strokeColor = '#b1b1b7';
  let isArrayBase = false;
  let arrayModifiers = 0;
  let currId = source;
  let currPort: string | null | undefined = sourceHandleId ?? null;

  for (let i = 0; i < 50; i++) {
    const currNode = allNodes.find(n => n.id === currId);
    if (!currNode) break;

    if (currNode.type === 'io.tunnel' || currNode.type === 'io.shiftRegister') {
      const parentNode = currNode.parent ? allNodes.find(n => n.id === currNode.parent) : null;
      const isInLoop = parentNode?.type === 'structure.forLoop' || parentNode?.type === 'structure.whileLoop';
      const isIndexing =
        currNode.type === 'io.tunnel' ? (currNode.params?.indexing ?? (isInLoop ? true : false)) : false;

      if (isIndexing && parentNode) {
        const pW = parentNode.width || 300;
        const isInputTunnel = (currNode.position?.x ?? 0) < pW / 2;
        if (isInputTunnel) arrayModifiers--;
        else arrayModifiers++;
      }

      const inEdge = allEdges.find(e => e.targetNode === currId);
      if (!inEdge) break;
      currId = inEdge.sourceNode;
      currPort = inEdge.sourcePort;
    } else {
      const def = NodeRegistry[currNode.type];
      if (def) {
        const nodeOutputs =
          currNode.outputs && currNode.outputs.length > 0 ? currNode.outputs : (def.outputs || []);
        const portDef = nodeOutputs.find((p: { name: string; type: string }) => p.name === currPort);
        if (portDef) {
          strokeColor = getTypeColor(portDef.type);
          isArrayBase = isTypeArray(portDef.type);
        }
        if (currNode.type === 'source.number' && currNode.params?.numberType === 'integer') {
          strokeColor = '#1565C0';
        }
        if (currNode.type === 'io.terminal') {
          const ctrl = allUiControls.find(c => c.bindingNodeId === currNode.id);
          if (ctrl?.numberType === 'integer') {
            strokeColor = '#1565C0';
          }
        }
      }
      break;
    }
  }
  return { strokeColor, isArrayBase, arrayModifiers };
}

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

  const { setSelectedEdgeId, selectedEdgeId } = useUIStore();
  const { removeEdge } = useGraphStore();

  const [showMenu, setShowMenu] = useState(false);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedEdgeId(id);
    setMenuPos({ x: e.clientX, y: e.clientY });
    setShowMenu(true);
  };

  // Subscribe so color updates reactively when node types change
  const allNodes = useGraphStore((s) => s.nodes);
  const allEdges = useGraphStore((s) => s.edges);
  const allUiControls = useGraphStore((s) => s.uiControls);

  const { strokeColor, isArrayBase, arrayModifiers } = useMemo(
    () => resolveEdgeVisuals(source, sourceHandleId, allNodes, allEdges, allUiControls),
    [source, sourceHandleId, allNodes, allEdges, allUiControls]
  );

  const isSelected = selectedEdgeId === id;
  const isArray = (isArrayBase ? 1 : 0) + arrayModifiers > 0;

  return (
    <>
      <g onClick={() => setSelectedEdgeId(id)} onContextMenu={handleContextMenu} style={{ cursor: 'pointer' }}>
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
                  animation: 'none',
                  strokeDasharray: 'none',
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
               animation: 'none',
               strokeDasharray: 'none',
             }}
           />
        )}
      </g>
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
              className="w-8 h-8 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-full shadow-lg flex items-center justify-center cursor-pointer border-2 border-card transition-colors"
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
      {showMenu && typeof document !== 'undefined' && createPortal(
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => setShowMenu(false)} onContextMenu={(e) => { e.preventDefault(); setShowMenu(false); }} />
          <div className="fixed z-[9999] bg-popover rounded-lg shadow-xl border border-border py-1 min-w-[160px] text-xs animate-in fade-in zoom-in-95" style={{ left: menuPos.x, top: menuPos.y }}>
            <button className="w-full text-left px-3 py-1.5 hover:bg-destructive/10 text-destructive flex items-center gap-2" onClick={() => { setShowMenu(false); removeEdge(id); setSelectedEdgeId(null); }}>
              <span className="w-4 text-center">🗑</span>Delete Connection
            </button>
          </div>
        </>,
        document.body
      )}
    </>
  );
}
