import { Handle, Position } from 'reactflow';
import { NodeRegistry } from '../../../engine/registry';
import { getNodeColor, getTypeColor } from '../../../lib/colors';
import { useRuntimeStore } from '../../../store/useRuntimeStore';
import { useUIStore } from '../../../store/useUIStore';
import { useGraphStore } from '../../../store/useGraphStore';

// Colors for different cases inside Case Structure
const CASE_COLORS: Record<string, string> = {
  'true': '#10b981',    // green
  'false': '#ef4444',   // red
  '0': '#3b82f6',       // blue
  '1': '#f59e0b',       // amber
  '2': '#8b5cf6',       // purple
  '3': '#ec4899',       // pink
  'default': '#6b7280', // gray
};

const SHAPE_CONFIGS: Record<string, any> = {
  'math.add': { shape: 'triangle', color: '#fef08a', borderColor: '#ca8a04', symbol: '+', size: 48 },
  'math.subtract': { shape: 'triangle', color: '#fef08a', borderColor: '#ca8a04', symbol: '-', size: 48 },
  'math.multiply': { shape: 'triangle', color: '#fef08a', borderColor: '#ca8a04', symbol: '×', size: 48 },
  'math.divide': { shape: 'triangle', color: '#fef08a', borderColor: '#ca8a04', symbol: '÷', size: 48 },
  'logic.greater': { shape: 'square', color: '#ffedd5', borderColor: '#ea580c', symbol: '>', size: 40 },
  'logic.less': { shape: 'square', color: '#ffedd5', borderColor: '#ea580c', symbol: '<', size: 40 },
  'logic.equal': { shape: 'square', color: '#ffedd5', borderColor: '#ea580c', symbol: '=', size: 40 },
  'logic.and': { shape: 'and-gate', color: '#dbeafe', borderColor: '#2563eb', symbol: '&', size: 48 },
  'logic.or': { shape: 'or-gate', color: '#dbeafe', borderColor: '#2563eb', symbol: '≥1', size: 48 },
  'logic.not': { shape: 'not-gate', color: '#dbeafe', borderColor: '#2563eb', symbol: '!', size: 48 },
};

function renderShape(config: any) {
  const { shape, color, borderColor } = config;
  if (shape === 'triangle') {
    return (
      <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full drop-shadow-md">
        <polygon points="5,5 95,50 5,95" fill={color} stroke={borderColor} strokeWidth="6" strokeLinejoin="round" />
      </svg>
    );
  } else if (shape === 'square') {
    return (
      <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full drop-shadow-md">
        <rect x="5" y="5" width="90" height="90" rx="15" fill={color} stroke={borderColor} strokeWidth="6" strokeLinejoin="round" />
      </svg>
    );
  } else if (shape === 'and-gate') {
    return (
      <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full drop-shadow-md">
        <path d="M 5,5 L 50,5 A 45,45 0 0 1 50,95 L 5,95 Z" fill={color} stroke={borderColor} strokeWidth="6" strokeLinejoin="round" />
      </svg>
    );
  } else if (shape === 'or-gate') {
    return (
      <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full drop-shadow-md">
        <path d="M 5,5 C 35,5 65,30 95,50 C 65,70 35,95 5,95 C 25,70 25,30 5,5 Z" fill={color} stroke={borderColor} strokeWidth="6" strokeLinejoin="round" />
      </svg>
    );
  } else if (shape === 'not-gate') {
    return (
      <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full drop-shadow-md">
        <polygon points="5,20 65,50 5,80" fill={color} stroke={borderColor} strokeWidth="6" strokeLinejoin="round" />
        <circle cx="80" cy="50" r="12" fill={color} stroke={borderColor} strokeWidth="6" />
      </svg>
    );
  }
}

export function BaseNode({ id, data, type, selected }: any) {
  const def = NodeRegistry[type] || data?.def;
  const nodeState = useRuntimeStore(s => s.nodeState[id] || 'idle');
  const portValues = useRuntimeStore(s => s.portValues);
  const currentStepNode = useRuntimeStore(s => s.currentStepNode);
  const setSelectedNodeId = useUIStore(s => s.setSelectedNodeId);
  const { updateNode, nodes } = useGraphStore();

  const node = nodes.find(n => n.id === id);
  const hasBreakpoint = node?.breakpoint || false;
  const isCurrentStep = currentStepNode === id;
  const caseId = node?.caseId;
  const parentId = node?.parent;
  
  // Find parent case structure to get active case
  const parentCase = parentId ? nodes.find(n => n.id === parentId) : undefined;
  const isCaseStructure = parentCase?.type === 'structure.case';
  const activeCase = parentCase?.params?.activeCase;
  const isNodeInActiveCase = caseId === activeCase;

  if (!def) return <div className="p-2 bg-red-500 text-white rounded">Unknown Node: {type}</div>;

  const category = type.split('.')[0];
  const headerColor = getNodeColor(category);

  let stateBorder = 'ring-1 ring-gray-300';
  if (selected) stateBorder = 'ring-2 ring-blue-400 shadow-lg';
  if (nodeState === 'error') stateBorder = 'ring-2 ring-red-500 shadow-red-500/50';
  else if (nodeState === 'running') stateBorder = 'ring-2 ring-blue-500 animate-pulse';
  else if (nodeState === 'done') stateBorder = 'ring-2 ring-green-500';

  // Highlight for current step in debug mode
  if (isCurrentStep) {
    stateBorder = 'ring-4 ring-yellow-400 shadow-yellow-400/50 animate-pulse';
  }

  // Case Structure visual feedback
  let caseIndicator = null;
  let nodeOpacity = 1;
  let caseBorder = '';
  
  if (isCaseStructure && caseId) {
    const caseColor = CASE_COLORS[caseId] || CASE_COLORS['default'];
    
    // Add colored top border based on case
    caseBorder = `border-t-4`;
    
    // Show case indicator badge
    caseIndicator = (
      <span
        className="ml-1 px-1.5 py-0.5 text-[8px] font-bold rounded text-white"
        style={{ backgroundColor: caseColor }}
      >
        {caseId}
      </span>
    );
    
    // Dim nodes not in active case
    if (!isNodeInActiveCase) {
      nodeOpacity = 0.5;
    }
  }

  const toggleBreakpoint = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateNode(id, { breakpoint: !hasBreakpoint });
  };

  const shapeConfig = SHAPE_CONFIGS[type];
  const isCustomShape = !!shapeConfig;

  // Render logic for custom SVG icon shapes
  if (isCustomShape) {
    const size = shapeConfig.size || 50;
    const { inputs, outputs } = def;

    return (
      <div 
        className={`relative flex items-center justify-center transition-all ${selected ? 'ring-2 ring-blue-500 rounded-full bg-blue-500/10' : ''} ${isCurrentStep ? 'ring-4 ring-yellow-400 rounded-lg shadow-yellow-400/50 animate-pulse' : ''} ${caseBorder}`}
        style={{ width: size, height: size, opacity: nodeOpacity }}
        onClick={() => setSelectedNodeId(id)}
      >
        {renderShape(shapeConfig)}
        <span 
          className="relative z-10 font-bold pointer-events-none" 
          style={{ 
            color: shapeConfig.borderColor, 
            fontSize: size * 0.4, 
            transform: shapeConfig.shape === 'triangle' ? 'translateX(-5px)' : 'none',
          }}
        >
          {shapeConfig.symbol}
        </span>
        
        {/* Handles */}
        {inputs.map((port: any, idx: number) => {
           let top = 50;
           if (inputs.length > 1) {
             top = 25 + (idx * (50 / (inputs.length - 1)));
           }
           if (shapeConfig.shape === 'triangle') top = 30 + (idx * 40); // slightly spread out for triangle flat side

           return (
             <Handle 
               key={port.name}
               type="target" 
               position={Position.Left} 
               id={port.name} 
               style={{ background: getTypeColor(port.type), width: 10, height: 10, left: -6, top: `${top}%` }} 
               title={`${port.name} (${port.type})`}
             />
           );
        })}

        {outputs.map((port: any, idx: number) => {
           let top = 50;
           if (outputs.length > 1) {
             top = 25 + (idx * (50 / (outputs.length - 1)));
           }
           const val = portValues[`${id}_${port.name}`];
           return (
             <div key={port.name} className="absolute group" style={{ top: `${top}%`, left: '100%', transform: 'translateY(-50%)' }}>
               <Handle 
                 type="source" 
                 position={Position.Right} 
                 id={port.name} 
                 style={{ background: getTypeColor(port.type), width: 10, height: 10, right: 'auto', left: -4, top: '50%' }}
                 title={`${port.name} (${port.type})`}
               />
               {val !== undefined && (
                 <span className="hidden group-hover:block absolute left-4 -top-3 text-[10px] bg-gray-800 text-white px-1 py-0.5 rounded shadow z-50 whitespace-nowrap pointer-events-none">
                   {String(val)}
                 </span>
               )}
             </div>
           );
        })}
      </div>
    );
  }

  // Generic rectangular node fallback
  return (
    <div
      className={`flex flex-col rounded-md shadow-md bg-white overflow-hidden min-w-[120px] transition-all ${stateBorder} ${caseBorder}`}
      style={{ opacity: nodeOpacity }}
      onClick={() => setSelectedNodeId(id)}
    >
      {/* Header */}
      <div
         className="px-2 py-1 text-white text-xs font-semibold flex justify-between items-center"
         style={{ backgroundColor: headerColor }}
      >
        <div className="flex items-center gap-1">
          <span>{def.label}</span>
          {caseIndicator}
        </div>
        {/* Breakpoint toggle button */}
        <button
          className={`w-4 h-4 rounded-full border border-white/50 flex items-center justify-center transition-colors ${
            hasBreakpoint ? 'bg-red-500 hover:bg-red-600' : 'bg-transparent hover:bg-white/20'
          }`}
          onClick={toggleBreakpoint}
          title={hasBreakpoint ? 'Remove breakpoint' : 'Add breakpoint'}
        >
          {hasBreakpoint && (
            <svg width="8" height="8" viewBox="0 0 24 24" fill="white">
              <circle cx="12" cy="12" r="8" />
            </svg>
          )}
        </button>
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
