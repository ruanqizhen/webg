import { useState } from 'react';
import { Handle, Position } from 'reactflow';
import { useRuntimeStore } from '../../../store/useRuntimeStore';
import { useUIStore } from '../../../store/useUIStore';
import { useGraphStore } from '../../../store/useGraphStore';
import { NodeRegistry } from '../../../engine/registry';
import { getTypeColor } from '../../../lib/colors';

export function TunnelNode({ id, selected }: any) {
  const nodeState = useRuntimeStore(s => s.nodeState[id] || 'idle');
  const portValues = useRuntimeStore(s => s.portValues);
  const val = portValues[`${id}_output`];
  const setSelectedNodeId = useUIStore(s => s.setSelectedNodeId);
  const edges = useGraphStore(s => s.edges);
  const nodes = useGraphStore(s => s.nodes);
  const { updateNode } = useGraphStore();

  const [showMenu, setShowMenu] = useState(false);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });

  const node = nodes.find(n => n.id === id);
  const isIndexing = node?.params?.indexing ?? false;

  // Check if parent is a loop structure (enables indexing toggle)
  const parentNode = node?.parent ? nodes.find(n => n.id === node.parent) : null;
  const isInLoop = parentNode?.type === 'structure.forLoop' || parentNode?.type === 'structure.whileLoop';

  let tunnelType = 'any';
  let currId = id;
  for (let i = 0; i < 50; i++) {
     const inEdge = edges.find(e => e.targetNode === currId);
     if (!inEdge) break;
     const srcNode = nodes.find(n => n.id === inEdge.sourceNode);
     if (!srcNode) break;
     if (srcNode.type !== 'io.tunnel') {
        const def = NodeRegistry[srcNode.type];
        const portDef = (srcNode.outputs || def?.outputs || []).find((p: any) => p.name === inEdge.sourcePort);
        tunnelType = portDef?.type || 'any';
        // Override for integer constants
        if (srcNode.type === 'source.number' && srcNode.params?.numberType === 'integer') tunnelType = 'integer';
        break;
     }
     currId = srcNode.id;
  }
  
  const bgColor = getTypeColor(tunnelType);

  let isFullyWired = true;
  if (node && node.parent) {
     const pNode = nodes.find(n => n.id === node.parent);
     if (pNode?.type === 'structure.case') {
        const tunnelInputEdges = edges.filter(e => e.targetNode === id);
        const isOutputTunnel = tunnelInputEdges.some(e => {
            const eNode = nodes.find(n => n.id === e.sourceNode);
            return eNode?.parent === pNode.id;
        });
        if (isOutputTunnel) {
           const requiredCases = pNode.params?.cases || ['true', 'false'];
           const wiredCases = new Set<string>();
           tunnelInputEdges.forEach(e => {
              const eNode = nodes.find(n => n.id === e.sourceNode);
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
    updateNode(id, { params: { ...node?.params, indexing: !isIndexing } });
    setShowMenu(false);
  };

  return (
    <>
      <div 
        className={`relative w-4 h-4 rounded-[2px] cursor-pointer hover:scale-110 transition-transform ${isFullyWired ? 'shadow-[inset_0_1px_2px_rgba(255,255,255,0.4),0_1px_2px_rgba(0,0,0,0.5)]' : ''} ${selected ? 'ring-2 ring-blue-500' : ''} ${nodeState === 'running' ? 'animate-pulse' : ''}`}
        style={isFullyWired ? { backgroundColor: bgColor, border: '1px solid #111' } : { backgroundColor: '#fff', border: `3px solid ${bgColor}` }}
        onClick={(e) => { e.stopPropagation(); setSelectedNodeId(id); }}
        onContextMenu={handleContextMenu}
        title={val !== undefined ? String(val) : 'Tunnel'}
      >
        <Handle type="target" position={Position.Left} id="input" style={{ opacity: 0, width: 2, height: 2, left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }} />
        <Handle type="source" position={Position.Right} id="output" style={{ opacity: 0, width: 2, height: 2, right: '50%', top: '50%', transform: 'translate(50%, -50%)' }} />
        
        {/* Indexing indicator */}
        {isInLoop && (
          <div 
            className="absolute -bottom-3 left-1/2 -translate-x-1/2 text-[7px] font-black select-none pointer-events-none"
            style={{ color: isIndexing ? bgColor : '#9ca3af' }}
            title={isIndexing ? 'Indexing Enabled' : 'Indexing Disabled'}
          >
            {isIndexing ? '▪' : '▫'}
          </div>
        )}
      </div>

      {/* Context menu */}
      {showMenu && (
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => setShowMenu(false)} />
          <div 
            className="fixed z-[9999] bg-white rounded-md shadow-xl border border-gray-200 py-1 min-w-[160px] text-xs"
            style={{ left: menuPos.x, top: menuPos.y }}
          >
            <button
              className="w-full text-left px-3 py-1.5 hover:bg-blue-50 flex items-center gap-2"
              onClick={toggleIndexing}
            >
              <span className="text-sm">{isIndexing ? '▫' : '▪'}</span>
              {isIndexing ? 'Disable Indexing' : 'Enable Indexing'}
            </button>
          </div>
        </>
      )}
    </>
  );
}
