import { useState } from 'react';
import { useUIStore } from '../../store/useUIStore';
import { NodeRegistry } from '../../engine/registry';
import { getNodeColor } from '../../lib/colors';
import { useGraphStore } from '../../store/useGraphStore';
import { generateId } from '../../lib/utils';

const UI_CONTROLS = [
  { type: 'numberInput', label: 'Number Input' },
  { type: 'button', label: 'Button' },
  { type: 'numberIndicator', label: 'Number Indicator' },
  { type: 'textLabel', label: 'Text Label' },
  { type: 'gauge', label: 'Gauge' },
  { type: 'indicatorLight', label: 'Indicator Light' },
];

export function Palette() {
  const { viewMode } = useUIStore();
  const { addNode, addUIControl } = useGraphStore();
  const [searchQuery, setSearchQuery] = useState('');

  const handleDragStartLogic = (e: React.DragEvent, nodeType: string) => {
    e.dataTransfer.setData('application/reactflow', nodeType);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleClickLogic = (nodeType: string) => {
    const id = generateId();
    addNode({
      id,
      type: nodeType,
      position: { x: 100, y: 100 },
      inputs: [],
      outputs: [],
      params: NodeRegistry[nodeType]?.params?.reduce((acc: any, p) => { acc[p.name] = p.defaultValue; return acc; }, {}) || {}
    });
  };

  const handleClickUI = (controlDef: any) => {
    const termId = generateId();
    const ctrlId = generateId();

    const isIndicator = controlDef.type.includes('Indicator') || controlDef.type.includes('Label') || controlDef.type.includes('Light') || controlDef.type === 'gauge';

    const terminalDef: any = {
      id: termId,
      type: 'io.terminal',
      position: { x: Math.random() * 200 + 50, y: Math.random() * 200 + 50 },
      inputs: [],
      outputs: [],
      params: { value: controlDef.type === 'button' ? false : 0 }
    };

    if (isIndicator) {
       terminalDef.inputs = [{ name: 'input', type: 'any', direction: 'input', id: 'input' }];
    } else {
       terminalDef.outputs = [{ name: 'output', type: 'any', direction: 'output', id: 'output' }];
    }

    // Default properties for different control types
    const controlDefaults: Record<string, any> = {
      numberInput: { min: 0, max: 100, step: 1, defaultValue: 0 },
      button: { colorOn: '#4CAF50', colorOff: '#cccccc', defaultValue: false },
      numberIndicator: { defaultValue: 0 },
      textLabel: { defaultValue: '' },
      gauge: { min: 0, max: 100, colorOn: '#4CAF50', defaultValue: 0 },
      indicatorLight: { colorOn: '#4CAF50', colorOff: '#cccccc', defaultValue: false },
    };

    addUIControl({
      id: ctrlId,
      type: controlDef.type,
      label: controlDef.label,
      defaultValue: controlDefaults[controlDef.type]?.defaultValue ?? 0,
      bindingNodeId: termId,
      x: 50,
      y: 50,
      width: controlDefaults[controlDef.type]?.width,
      height: controlDefaults[controlDef.type]?.height,
      min: controlDefaults[controlDef.type]?.min,
      max: controlDefaults[controlDef.type]?.max,
      step: controlDefaults[controlDef.type]?.step,
      colorOn: controlDefaults[controlDef.type]?.colorOn,
      colorOff: controlDefaults[controlDef.type]?.colorOff,
    }, terminalDef);
  };

  const categories = Object.values(NodeRegistry).reduce((acc: any, node) => {
    if (node.type === 'io.terminal') return acc;
    const cat = node.type.split('.')[0];
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(node);
    return acc;
  }, {});

  // Filter nodes and controls based on search query
  const filteredCategories: Record<string, any[]> = searchQuery
    ? Object.entries(categories)
        .map(([cat, nodes]) => [cat, (nodes as any[]).filter((n) => n.label.toLowerCase().includes(searchQuery.toLowerCase()))])
        .filter(([_, nodes]) => (nodes as any[]).length > 0)
        .reduce((acc, [cat, nodes]) => ({ ...acc, [cat as string]: nodes }), {})
    : categories;

  const filteredUIControls = searchQuery
    ? UI_CONTROLS.filter(c => c.label.toLowerCase().includes(searchQuery.toLowerCase()))
    : UI_CONTROLS;

  return (
    <div className="w-64 border-r bg-gray-50 flex flex-col h-full overflow-y-auto shrink-0 shadow-inner">
      <div className="p-3 text-sm font-bold text-gray-700 uppercase tracking-wide border-b bg-white top-0 sticky">
        Palette
      </div>
      
      {/* Search input */}
      <div className="p-3 border-b bg-white">
        <input
          type="text"
          placeholder="Search nodes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-3 py-2 border rounded text-sm focus:outline-none focus:ring-1 focus:ring-purple-400"
        />
      </div>

      <div className="p-3 flex flex-col gap-4">
        {viewMode === 'logic' ? (
          Object.entries(filteredCategories).map(([cat, nodes]: any) => (
             <div key={cat} className="flex flex-col gap-2">
                <div className="text-xs font-semibold text-gray-500 capitalize px-1">{cat}</div>
                {nodes.map((node: any) => (
                   <div 
                     key={node.type}
                     className="bg-white border p-2 rounded text-sm cursor-grab hover:shadow-md transition-shadow active:cursor-grabbing flex items-center border-l-4"
                     style={{ borderLeftColor: getNodeColor(cat) }}
                     onDragStart={(e) => handleDragStartLogic(e, node.type)}
                     onClick={() => handleClickLogic(node.type)}
                     draggable
                   >
                     {node.label}
                   </div>
                ))}
             </div>
          ))
        ) : (
          <div className="flex flex-col gap-2">
             <div className="text-xs font-semibold text-gray-500 px-1">CONTROLS & INDICATORS</div>
             {filteredUIControls.map((ctrl) => (
               <div
                 key={ctrl.type}
                 className="bg-white border p-2 rounded text-sm cursor-pointer hover:shadow-md hover:border-purple-300 transition-all active:scale-95"
                 onClick={() => handleClickUI(ctrl)}
               >
                 {ctrl.label}
               </div>
             ))}
          </div>
        )}
        
        {searchQuery && viewMode === 'logic' && Object.keys(filteredCategories).length === 0 && (
          <div className="text-center text-gray-400 text-sm py-4">No nodes found</div>
        )}
        {searchQuery && viewMode === 'ui' && filteredUIControls.length === 0 && (
          <div className="text-center text-gray-400 text-sm py-4">No controls found</div>
        )}
      </div>
    </div>
  );
}
