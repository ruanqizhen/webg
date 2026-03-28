import { useUIStore } from '../../store/useUIStore';
import { NodeRegistry } from '../../engine/registry';
import { getNodeColor } from '../../lib/colors';
import { useGraphStore } from '../../store/useGraphStore';

const UI_CONTROLS = [
  { type: 'numberInput', label: 'Number Input' },
  { type: 'button', label: 'Button' },
  { type: 'numberIndicator', label: 'Number Indicator' },
  { type: 'textLabel', label: 'Text Label' },
  { type: 'indicatorLight', label: 'Indicator Light' },
];

export function Palette() {
  const { viewMode } = useUIStore();
  const { addNode, addUIControl } = useGraphStore();

  const handleDragStartLogic = (e: React.DragEvent, nodeType: string) => {
    e.dataTransfer.setData('application/reactflow', nodeType);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleClickLogic = (nodeType: string) => {
    const id = crypto.randomUUID();
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
    const termId = crypto.randomUUID();
    const ctrlId = crypto.randomUUID();
    
    const isIndicator = controlDef.type.includes('Indicator') || controlDef.type.includes('Label') || controlDef.type.includes('Light');
    
    const terminalDef = {
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

    addUIControl({
      id: ctrlId,
      type: controlDef.type,
      label: controlDef.label,
      defaultValue: controlDef.type === 'button' ? false : 0,
      bindingNodeId: termId,
      x: 50,
      y: 50
    }, terminalDef);
  };

  const categories = Object.values(NodeRegistry).reduce((acc: any, node) => {
    if (node.type === 'io.terminal') return acc;
    const cat = node.type.split('.')[0];
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(node);
    return acc;
  }, {});

  return (
    <div className="w-64 border-r bg-gray-50 flex flex-col h-full overflow-y-auto shrink-0 shadow-inner">
      <div className="p-3 text-sm font-bold text-gray-700 uppercase tracking-wide border-b bg-white top-0 sticky">
        Palette
      </div>
      
      <div className="p-3 flex flex-col gap-4">
        {viewMode === 'logic' ? (
          Object.entries(categories).map(([cat, nodes]: any) => (
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
             {UI_CONTROLS.map((ctrl) => (
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
      </div>
    </div>
  );
}
