import { Handle, Position, NodeResizer } from 'reactflow';
import { NodeRegistry } from '../../../engine/registry';
import { getTypeColor } from '../../../lib/colors';
import { useRuntimeStore } from '../../../store/useRuntimeStore';
import { useUIStore } from '../../../store/useUIStore';
import { useGraphStore } from '../../../store/useGraphStore';

export function StructureNode({ id, data, type, selected }: any) {
  const def = NodeRegistry[type] || data?.def;
  const nodeState = useRuntimeStore(s => s.nodeState[id] || 'idle');
  const setSelectedNodeId = useUIStore(s => s.setSelectedNodeId);
  const { updateNode } = useGraphStore();
  
  const node = useGraphStore(s => s.nodes.find(n => n.id === id));
  const mode = node?.params?.mode || 'boolean';
  const cases = node?.params?.cases || ['true', 'false'];
  const activeCase = node?.params?.activeCase || 'true';

  // Use a distinct color for structure nodes
  const headerColor = '#424242'; // Dark gray for structures

  let stateBorder = 'border-dashed border-2 border-gray-400';
  if (selected) stateBorder = 'border-blue-400 border-2 shadow-lg';
  if (nodeState === 'error') stateBorder = 'border-red-500 border-2 shadow-red-500/50';
  else if (nodeState === 'running') stateBorder = 'border-blue-500 border-2 animate-pulse';
  else if (nodeState === 'done') stateBorder = 'border-green-500 border-2';

  const handleCaseChange = (newCase: string) => {
    updateNode(id, { params: { ...node?.params, activeCase: newCase } });
  };

  const isCaseStructure = type === 'structure.case';

  return (
    <div
      className={`relative rounded bg-gray-100/30 min-w-[300px] min-h-[200px] w-full h-full ${stateBorder} backdrop-blur-[2px]`}
      onClick={(e) => { e.stopPropagation(); setSelectedNodeId(id); }}
    >
      <NodeResizer color="#ff0071" isVisible={selected} minWidth={300} minHeight={200} />

      {/* Header */}
      <div
         className="px-2 py-1 text-white text-xs font-semibold select-none flex justify-between items-center rounded-t-sm"
         style={{ backgroundColor: headerColor }}
      >
        <span>{def?.label || type}</span>
        {isCaseStructure && (
          <div className="flex gap-1">
            {cases.map((caseName: string) => (
              <button
                key={caseName}
                className={`px-2 py-0.5 text-[10px] rounded transition-colors ${
                  activeCase === caseName
                    ? 'bg-white text-gray-800 font-bold'
                    : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleCaseChange(caseName);
                }}
              >
                {caseName}
              </button>
            ))}
            {mode === 'number' && (
              <button
                className={`px-2 py-0.5 text-[10px] rounded transition-colors ${
                  activeCase === 'default'
                    ? 'bg-white text-gray-800 font-bold'
                    : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleCaseChange('default');
                }}
              >
                Default
              </button>
            )}
          </div>
        )}
      </div>

      {/* Case label for Case Structure */}
      {isCaseStructure && (
        <div className="absolute top-8 left-2 text-[10px] font-bold text-gray-500 bg-gray-200 px-2 py-0.5 rounded">
          Case: {activeCase}
        </div>
      )}

      {/* Ports for the structure itself */}
      <div className="absolute top-8 left-0 flex flex-col gap-2">
         {def?.inputs?.map((port: any) => (
             <div key={port.name} className="flex items-center gap-1 h-4 relative">
                <Handle
                  type="target"
                  position={Position.Left}
                  id={port.name}
                  style={{ background: getTypeColor(port.type), width: 12, height: 12, left: -6 }}
                  title={`${port.name} (${port.type})`}
                />
                <span className="text-gray-800 pl-2 text-[10px] font-bold uppercase">{port.name}</span>
             </div>
          ))}
      </div>

      <div className="absolute top-8 right-0 flex flex-col gap-2 items-end">
         {def?.outputs?.map((port: any) => (
             <div key={port.name} className="flex items-center justify-end gap-1 h-4 relative group">
                <span className="text-gray-800 pr-2 text-[10px] font-bold uppercase">{port.name}</span>
                <Handle
                  type="source"
                  position={Position.Right}
                  id={port.name}
                  style={{ background: getTypeColor(port.type), width: 12, height: 12, right: -6 }}
                  title={`${port.name} (${port.type})`}
                />
             </div>
          ))}
      </div>
    </div>
  );
}
