import { Handle, Position } from 'reactflow';
import { useRuntimeStore } from '../../../store/useRuntimeStore';
import { useUIStore } from '../../../store/useUIStore';

export function TunnelNode({ id, selected }: any) {
  const nodeState = useRuntimeStore(s => s.nodeState[id] || 'idle');
  const portValues = useRuntimeStore(s => s.portValues);
  const val = portValues[`${id}_output`];
  const setSelectedNodeId = useUIStore(s => s.setSelectedNodeId);

  return (
    <div 
      className={`w-4 h-4 bg-yellow-400 border border-yellow-600 rounded-sm cursor-pointer hover:scale-110 transition-transform ${selected ? 'ring-2 ring-blue-500' : ''} ${nodeState === 'running' ? 'animate-pulse bg-yellow-300' : ''}`}
      onClick={(e) => { e.stopPropagation(); setSelectedNodeId(id); }}
      title={val !== undefined ? String(val) : 'Tunnel'}
    >
      <Handle type="target" position={Position.Left} id="input" style={{ opacity: 0, width: 20, height: 20, left: -8, top: -2 }} />
      <Handle type="source" position={Position.Right} id="output" style={{ opacity: 0, width: 20, height: 20, right: -8, top: -2 }} />
      
      {/* Tooltip for runtime value */}
      {val !== undefined && (
         <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] bg-gray-800 text-white px-1 py-0.5 rounded shadow z-10 whitespace-nowrap">
           {String(val)}
         </span>
      )}
    </div>
  );
}
