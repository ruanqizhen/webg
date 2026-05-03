import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Handle, Position, type NodeProps } from 'reactflow';
import { useRuntimeStore } from '../../../store/useRuntimeStore';
import { useUIStore } from '../../../store/useUIStore';
import { useGraphStore } from '../../../store/useGraphStore';
import { NodeRegistry } from '../../../engine/registry';
import { getTypeColor } from '../../../lib/colors';

export function TunnelNode({ id, selected }: NodeProps) {
  const nodeState = useRuntimeStore(s => s.nodeState[id] || 'idle');
  const val = useRuntimeStore(s => s.portValues[`${id}_output`]);
  const setSelectedNodeId = useUIStore(s => s.setSelectedNodeId);
  const { updateNode, addNode, removeNode } = useGraphStore();

  const [showMenu, setShowMenu] = useState(false);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });

  const node = useGraphStore(s => {
    for (const n of s.nodes) {
      if (n.id === id) return n;
    }
    return undefined;
  });
  const parentNode = useGraphStore(s => {
    if (!node) return undefined;
    const parentId = node.parent;
    if (!parentId) return undefined;
    for (const n of s.nodes) {
      if (n.id === parentId) return n;
    }
    return undefined;
  });
  const isInLoop = parentNode?.type === 'structure.forLoop' || parentNode?.type === 'structure.whileLoop';

  const isShiftRegister = node?.type === 'io.shiftRegister';
  const isIndexing = isShiftRegister ? false : (node?.params?.indexing ?? (isInLoop ? true : false));
  const side = isShiftRegister ? (node?.params?.side || 'left') : 'left';
  const isLeft = side === 'left';

  let tunnelType = 'any';
  let currId = id;
  const allNodes = useGraphStore.getState().nodes;
  const allEdges = useGraphStore.getState().edges;
  for (let i = 0; i < 50; i++) {
     const inEdge = allEdges.find(e => e.targetNode === currId);
     if (!inEdge) break;
     const srcNode = allNodes.find(n => n.id === inEdge.sourceNode);
     if (!srcNode) break;
     if (srcNode.type !== 'io.tunnel' && srcNode.type !== 'io.shiftRegister') {
        const def = NodeRegistry[srcNode.type];
        const portDef = (srcNode.outputs || def?.outputs || []).find((p: { name: string; type: string }) => p.name === inEdge.sourcePort);
        tunnelType = portDef?.type || 'any';
        if (srcNode.type === 'source.number' && srcNode.params?.numberType === 'integer') tunnelType = 'integer';
        break;
     }
     currId = srcNode.id;
  }

  const bgColor = getTypeColor(tunnelType);

  let isFullyWired = true;
  if (!isShiftRegister && node && node.parent) {
     const pNode = allNodes.find(n => n.id === node.parent);
     if (pNode?.type === 'structure.case') {
        const tunnelInputEdges = allEdges.filter(e => e.targetNode === id);
        const isOutputTunnel = tunnelInputEdges.some(e => {
            const eNode = allNodes.find(n => n.id === e.sourceNode);
            return eNode?.parent === pNode.id;
        });
        if (isOutputTunnel) {
           const requiredCases = pNode.params?.cases || ['true', 'false'];
           const wiredCases = new Set<string>();
           tunnelInputEdges.forEach(e => {
              const eNode = allNodes.find(n => n.id === e.sourceNode);
              if (eNode?.caseId) wiredCases.add(eNode.caseId);
           });
           isFullyWired = requiredCases.every((c: string) => wiredCases.has(c));
        }
     }
  }

  const handleContextMenu = (e: React.MouseEvent) => {
    if (!isInLoop) return;
    e.preventDefault();
    e.stopPropagation();
    setMenuPos({ x: e.clientX, y: e.clientY });
    setShowMenu(true);
  };

  const toggleIndexing = () => {
    updateNode(id, { type: 'io.tunnel', params: { ...node?.params, indexing: !isIndexing } });
    setShowMenu(false);
  };

  const replaceWithShiftRegister = () => {
    setShowMenu(false);
    if (!parentNode) return;
    
    // Determine which side we are on
    const pW = parentNode.width || 300;
    const isLeftEdge = (node?.position?.x ?? 0) < pW / 2;
    const pairId = `sr_${Date.now().toString(36)}`;
    
    // Convert current to shift register
    updateNode(id, {
      type: 'io.shiftRegister',
      params: { pairId, side: isLeftEdge ? 'left' : 'right' }
    });

    // Spawn partner
    addNode({
      id: `${pairId}_sibling`,
      type: 'io.shiftRegister',
      position: { x: isLeftEdge ? pW - 20 : 0, y: node?.position?.y || 0 },
      parent: node?.parent,
      inputs: [],
      outputs: [],
      params: { pairId, side: isLeftEdge ? 'right' : 'left' }
    });
  };

  const revertToTunnel = () => {
    setShowMenu(false);
    
    // Find pair and delete it
    const pairId = node?.params?.pairId;
    if (pairId) {
      const pairNode = useGraphStore.getState().nodes.find(n =>
        n.parent === node?.parent &&
        n.type === 'io.shiftRegister' &&
        n.params?.pairId === pairId && 
        n.id !== id
      );
      if (pairNode) {
        removeNode(pairNode.id);
      }
    }

    // Convert current back to indexing tunnel
    updateNode(id, {
      type: 'io.tunnel',
      params: { indexing: true }
    });
  };

  const displayVal = val !== undefined ? (
    typeof val === 'number' ? (val % 1 !== 0 ? val.toFixed(1) : String(val)) : String(val)
  ) : '';

  return (
    <>
      <div 
        className={`relative w-4 h-4 flex items-center justify-center rounded-[1px] cursor-pointer hover:scale-110 transition-transform ${isFullyWired ? 'shadow-[inset_0_1px_2px_rgba(255,255,255,0.4),0_1px_2px_rgba(0,0,0,0.5)]' : ''} ${selected ? 'ring-2 ring-blue-500' : ''} ${nodeState === 'running' ? 'animate-pulse' : ''}`}
        style={isFullyWired ? { backgroundColor: bgColor, border: '1px solid #111' } : { backgroundColor: '#fff', border: `2px solid ${bgColor}` }}
        onClick={(e) => { e.stopPropagation(); setSelectedNodeId(id); }}
        onContextMenu={handleContextMenu}
        title={isShiftRegister ? `Shift Register (${side}) ${displayVal}` : (displayVal !== '' ? displayVal : 'Tunnel')}
      >
        <Handle type="target" position={Position.Left} id="input" style={{ opacity: 0, width: 2, height: 2, left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }} />
        <Handle type="source" position={Position.Right} id="output" style={{ opacity: 0, width: 2, height: 2, right: '50%', top: '50%', transform: 'translate(50%, -50%)' }} />
        
        {/* Inner symbol */}
        {isShiftRegister ? (
           <svg width="10" height="10" viewBox="0 0 10 10" className="pointer-events-none drop-shadow-sm">
             <polygon 
                points={isLeft ? "1,2 9,2 5,9" : "5,1 1,8 9,8"} 
                fill={isFullyWired ? '#ffffff' : bgColor} 
             />
           </svg>
        ) : (isIndexing && isInLoop) ? (
           <svg width="10" height="10" viewBox="0 0 12 12" className="pointer-events-none drop-shadow-sm">
             <path d="M 4,2 L 2,2 L 2,10 L 4,10" fill="none" stroke={isFullyWired ? '#ffffff' : bgColor} strokeWidth="1.5" />
             <path d="M 8,2 L 10,2 L 10,10 L 8,10" fill="none" stroke={isFullyWired ? '#ffffff' : bgColor} strokeWidth="1.5" />
           </svg>
        ) : null}
      </div>

      {/* Context menu */}
      {showMenu && typeof document !== 'undefined' && createPortal(
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => setShowMenu(false)} onContextMenu={(e) => { e.preventDefault(); setShowMenu(false); }} />
          <div 
            className="fixed z-[9999] bg-white rounded-md shadow-xl border border-gray-200 py-1 min-w-[160px] text-xs"
            style={{ left: menuPos.x, top: menuPos.y }}
          >
            {!isShiftRegister && (
              <>
                <button
                  className="w-full text-left px-3 py-1.5 hover:bg-blue-50 flex items-center gap-2"
                  onClick={toggleIndexing}
                >
                  <span className="text-sm font-bold">{isIndexing ? '■' : '[ ]'}</span>
                  {isIndexing ? 'Disable Indexing' : 'Enable Indexing'}
                </button>
                <div className="h-[1px] bg-gray-200 my-1 mx-2" />
                <button
                  className="w-full text-left px-3 py-1.5 hover:bg-purple-50 flex items-center gap-2"
                  onClick={replaceWithShiftRegister}
                >
                  <span className="text-sm font-bold text-purple-600">↻</span>
                  Replace with Shift Register
                </button>
              </>
            )}
            {isShiftRegister && (
              <button
                className="w-full text-left px-3 py-1.5 hover:bg-blue-50 flex items-center gap-2"
                onClick={revertToTunnel}
              >
                <span className="text-sm font-bold text-blue-600">■</span>
                Revert to Tunnel
              </button>
            )}
          </div>
        </>,
        document.body
      )}
    </>
  );
}
