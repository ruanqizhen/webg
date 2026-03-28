import { Handle, Position } from 'reactflow';
import { NodeRegistry } from '../../../engine/registry';
import { getNodeColor, getTypeColor } from '../../../lib/colors';
import { useRuntimeStore } from '../../../store/useRuntimeStore';
import { useUIStore } from '../../../store/useUIStore';

export function BaseNode({ id, data, type, selected }: any) {
  const def = NodeRegistry[type] || data?.def;
  const nodeState = useRuntimeStore(s => s.nodeState[id] || 'idle');
  const portValues = useRuntimeStore(s => s.portValues);
  const setSelectedNodeId = useUIStore(s => s.setSelectedNodeId);

  if (!def) return <div className="p-2 bg-red-500 text-white rounded">Unknown Node: {type}</div>;

  const category = type.split('.')[0];
  const headerColor = getNodeColor(category);

  let stateBorder = 'ring-1 ring-gray-300';
  if (selected) stateBorder = 'ring-2 ring-blue-400 shadow-lg';
  if (nodeState === 'error') stateBorder = 'ring-2 ring-red-500 shadow-red-500/50';
  else if (nodeState === 'running') stateBorder = 'ring-2 ring-blue-500 animate-pulse';
  else if (nodeState === 'done') stateBorder = 'ring-2 ring-green-500';

  return (
    <div 
      className={`flex flex-col rounded-md shadow-md bg-white overflow-hidden min-w-[120px] transition-all ${stateBorder}`}
      onClick={() => setSelectedNodeId(id)}
    >
      {/* Header */}
      <div 
         className="px-2 py-1 text-white text-xs font-semibold flex justify-between items-center"
         style={{ backgroundColor: headerColor }}
      >
        <span>{def.label}</span>
      </div>

      {/* Body / Ports */}
      <div className="flex p-2 justify-between gap-4 text-xs relative">
        {/* Input Ports */}
        <div className="flex flex-col gap-2 min-w-[20px]">
          {def.inputs.map((port: any) => (
             <div key={port.name} className="flex items-center gap-1 h-4 relative">
                <Handle 
                  type="target" 
                  position={Position.Left} 
                  id={port.name} 
                  style={{ background: getTypeColor(port.type), width: 12, height: 12, left: -14 }} 
                  title={`${port.name} (${port.type})`}
                />
                <span className="text-gray-600 pl-1">{port.name}</span>
             </div>
          ))}
        </div>

        {/* Output Ports */}
        <div className="flex flex-col gap-2 min-w-[20px] items-end">
          {def.outputs.map((port: any) => {
             const val = portValues[`${id}_${port.name}`];
             return (
             <div key={port.name} className="flex items-center justify-end gap-1 h-4 relative group">
                {val !== undefined && (
                   <span className="hidden group-hover:block absolute right-8 -top-4 text-[10px] bg-gray-800 text-white px-1 py-0.5 rounded shadow z-10 whitespace-nowrap">
                     {String(val)}
                   </span>
                )}
                <span className="text-gray-600 pr-1">{port.name}</span>
                <Handle 
                  type="source" 
                  position={Position.Right} 
                  id={port.name} 
                  style={{ background: getTypeColor(port.type), width: 12, height: 12, right: -14 }}
                  title={`${port.name} (${port.type})`}
                />
             </div>
             )
          })}
        </div>
      </div>
    </div>
  );
}
