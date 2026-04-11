import { Handle, Position } from 'reactflow';
import { useRuntimeStore } from '../../../store/useRuntimeStore';
import { useUIStore } from '../../../store/useUIStore';
import { useGraphStore } from '../../../store/useGraphStore';

export function ShiftRegisterNode({ id, selected }: any) {
  const nodeState = useRuntimeStore(s => s.nodeState[id] || 'idle');
  const val = useRuntimeStore(s => s.portValues[`${id}_output`]);
  const setSelectedNodeId = useUIStore(s => s.setSelectedNodeId);
  const nodes = useGraphStore(s => s.nodes);

  const node = nodes.find(n => n.id === id);
  const side = node?.params?.side || 'left'; // 'left' or 'right'

  // Left side: has output (feeds into loop), receives init from external input
  // Right side: has input (receives from loop), feeds to next-iteration left side
  const isLeft = side === 'left';

  const displayVal = val !== undefined ? (
    typeof val === 'number' ? (val % 1 !== 0 ? val.toFixed(1) : String(val)) : String(val)
  ) : '';

  return (
    <div 
      className={`relative flex items-center justify-center cursor-pointer transition-transform hover:scale-105 ${selected ? 'ring-2 ring-blue-500' : ''} ${nodeState === 'running' ? 'animate-pulse' : ''}`}
      onClick={(e) => { e.stopPropagation(); setSelectedNodeId(id); }}
      title={`Shift Register (${side}) ${displayVal}`}
      style={{ width: 20, height: 28 }}
    >
      {/* Visual box with arrows */}
      <svg viewBox="0 0 20 28" width={20} height={28} className="drop-shadow-sm">
        <rect x={1} y={1} width={18} height={26} rx={2}
          fill={isLeft ? '#EDE9FE' : '#FEF3C7'} 
          stroke={isLeft ? '#7C3AED' : '#D97706'} 
          strokeWidth={1.5}
        />
        {/* Up/down arrows to indicate iteration shift */}
        <path d="M 10,5 L 7,9 L 13,9 Z" fill={isLeft ? '#7C3AED' : '#D97706'} />
        <path d="M 10,23 L 7,19 L 13,19 Z" fill={isLeft ? '#7C3AED' : '#D97706'} />
        {/* Value display */}
        {displayVal && (
          <text x={10} y={15} textAnchor="middle" dominantBaseline="central" 
            fill={isLeft ? '#4C1D95' : '#78350F'} fontSize="7" fontWeight="bold" fontFamily="monospace">
            {displayVal.slice(0, 4)}
          </text>
        )}
      </svg>

      {/* Handles */}
      <Handle type="target" position={Position.Left} id="input" 
        style={{ 
          width: 8, height: 8, left: -4, top: '50%', marginTop: -4,
          background: isLeft ? '#7C3AED' : '#D97706', 
          border: '1px solid white', borderRadius: 1
        }} 
      />
      <Handle type="source" position={Position.Right} id="output"
        style={{ 
          width: 8, height: 8, right: -4, top: '50%', marginTop: -4,
          background: isLeft ? '#7C3AED' : '#D97706', 
          border: '1px solid white', borderRadius: 1
        }}
      />
    </div>
  );
}
