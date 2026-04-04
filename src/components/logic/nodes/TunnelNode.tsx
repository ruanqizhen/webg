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
      <Handle type="target" position={Position.Left} id="input" style={{ opacity: 0, width: 2, height: 2, left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }} />
      <Handle type="source" position={Position.Right} id="output" style={{ opacity: 0, width: 2, height: 2, right: '50%', top: '50%', transform: 'translate(50%, -50%)' }} />
    </div>
  );
}
