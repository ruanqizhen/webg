import { useState } from 'react';
import { useUIStore } from '../../store/useUIStore';
import { NodeRegistry } from '../../engine/registry';
import { getNodeColor } from '../../lib/colors';
import { useGraphStore } from '../../store/useGraphStore';
import { generateId, generateUniqueLabel } from '../../lib/utils';
import { 
  Hash, ToggleLeft, Type, Gauge, Lightbulb, SquareAsterisk, Pointer,
  PlusSquare, MinusSquare, XSquare, DivideSquare, ChevronRightSquare, ChevronLeftSquare,
  EqualSquare, GitMerge, GitBranch, Ban, TerminalSquare, ClipboardList, Repeat, RefreshCw, Layers, ArrowRightSquare, Box,
  SlidersHorizontal, CircleDot, Database, List
} from 'lucide-react';

const UI_ICONS: Record<string, any> = {
  numberInput: Hash,
  button: Pointer,
  numberIndicator: SquareAsterisk,
  textLabel: Type,
  gauge: Gauge,
  indicatorLight: Lightbulb,
  slider: SlidersHorizontal,
  knob: CircleDot,
  tank: Database,
  array: List,
};

const LOGIC_ICONS: Record<string, any> = {
  'source.number': Hash,
  'source.boolean': ToggleLeft,
  'source.string': Type,
  'source.array': List,
  'math.add': PlusSquare,
  'math.subtract': MinusSquare,
  'math.multiply': XSquare,
  'math.divide': DivideSquare,
  'logic.greater': ChevronRightSquare,
  'logic.less': ChevronLeftSquare,
  'logic.equal': EqualSquare,
  'logic.and': GitMerge,
  'logic.or': GitBranch,
  'logic.not': Ban,
  'sink.display': TerminalSquare,
  'sink.log': ClipboardList,
  'structure.forLoop': Repeat,
  'structure.whileLoop': RefreshCw,
  'structure.case': Layers,
  'io.tunnel': ArrowRightSquare
};

const UI_CONTROLS = [
  { type: 'numberInput', label: 'Number Input', direction: 'control' as const },
  { type: 'button', label: 'Button', direction: 'control' as const },
  { type: 'slider', label: 'Slider', direction: 'control' as const },
  { type: 'knob', label: 'Knob', direction: 'control' as const },
  { type: 'array', label: 'Array Control', direction: 'control' as const },
  { type: 'numberIndicator', label: 'Number Indicator', direction: 'indicator' as const },
  { type: 'textLabel', label: 'Text Label', direction: 'indicator' as const },
  { type: 'gauge', label: 'Gauge', direction: 'indicator' as const },
  { type: 'indicatorLight', label: 'Indicator Light', direction: 'indicator' as const },
  { type: 'tank', label: 'Tank', direction: 'indicator' as const },
  { type: 'array', label: 'Array Indicator', direction: 'indicator' as const },
];

export function Palette() {
  const { viewMode } = useUIStore();
  const { addNode, addUIControl, uiControls } = useGraphStore();
  const [searchQuery, setSearchQuery] = useState('');

  const handleDragStartLogic = (e: React.DragEvent, nodeType: string) => {
    e.dataTransfer.setData('application/node-type', nodeType);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragStartUI = (e: React.DragEvent, controlDef: any) => {
    e.dataTransfer.setData('application/ui-control', JSON.stringify(controlDef));
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

    const direction: 'control' | 'indicator' = controlDef.direction || 'control';
    const isIndicator = direction === 'indicator';

    const terminalDef: any = {
      id: termId,
      type: 'io.terminal',
      position: { x: Math.random() * 200 + 50, y: Math.random() * 200 + 50 },
      inputs: [],
      outputs: [],
      params: { value: controlDef.type === 'button' ? false : 0 }
    };

    const getPortType = (type: string) => {
      if (type === 'button' || type === 'indicatorLight') return 'boolean';
      if (type === 'textLabel') return 'string';
      return 'number';
    };
    const portType = getPortType(controlDef.type);

    if (isIndicator) {
       terminalDef.inputs = [{ name: 'input', type: portType, direction: 'input', id: 'input' }];
    } else {
       terminalDef.outputs = [{ name: 'output', type: portType, direction: 'output', id: 'output' }];
    }

    // Default properties for different control types
    const controlDefaults: Record<string, any> = {
      numberInput: { min: 0, max: 100, step: 1, defaultValue: 0 },
      button: { colorOn: '#4CAF50', colorOff: '#cccccc', defaultValue: false },
      numberIndicator: { defaultValue: 0 },
      textLabel: { defaultValue: '' },
      gauge: { min: 0, max: 100, colorOn: '#4CAF50', defaultValue: 0 },
      indicatorLight: { colorOn: '#4CAF50', colorOff: '#cccccc', defaultValue: false },
      slider: { min: 0, max: 100, step: 1, defaultValue: 0, width: 160, height: 40 },
      knob: { min: 0, max: 100, step: 1, defaultValue: 0, width: 80, height: 80 },
      tank: { min: 0, max: 100, colorOn: '#3B82F6', defaultValue: 0, width: 60, height: 160 },
    };

    const existingLabels = uiControls.map(c => c.label);
    const uniqueLabel = generateUniqueLabel(controlDef.label, existingLabels);

    addUIControl({
      id: ctrlId,
      type: controlDef.type,
      direction,
      label: uniqueLabel,
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
    if (node.type === 'io.terminal' || node.type === 'io.tunnel' || node.type === 'io.shiftRegister') return acc;
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
                {nodes.map((node: any) => {
                   const Icon = LOGIC_ICONS[node.type] || Box;
                   return (
                     <div 
                       key={node.type}
                       className="bg-white border p-2 rounded text-sm cursor-grab hover:shadow-md transition-shadow active:cursor-grabbing flex items-center border-l-4 gap-2"
                       style={{ borderLeftColor: getNodeColor(cat) }}
                       onDragStart={(e) => handleDragStartLogic(e, node.type)}
                       onClick={() => handleClickLogic(node.type)}
                       draggable
                     >
                       <Icon className="w-4 h-4 text-gray-400" />
                       <span className="truncate">{node.label}</span>
                     </div>
                   );
                })}
             </div>
          ))
        ) : (
          <div className="flex flex-col gap-4">
             {/* Controls (Input) */}
             <div className="flex flex-col gap-2">
               <div className="text-xs font-semibold text-gray-500 px-1 flex items-center gap-1">
                 <span className="text-green-500">▶</span> CONTROLS (Input)
               </div>
               {filteredUIControls.filter(c => c.direction === 'control').map((ctrl) => {
                 const Icon = UI_ICONS[ctrl.type] || Box;
                 return (
                    <div
                      key={ctrl.type}
                      className="bg-white border p-2 rounded text-sm cursor-grab hover:shadow-md hover:border-green-300 transition-all flex items-center border-l-4 border-l-green-400"
                      onClick={() => handleClickUI(ctrl)}
                      onDragStart={(e) => handleDragStartUI(e, ctrl)}
                      draggable
                    >
                     <Icon className="w-4 h-4 mr-2 text-green-500" />
                     {ctrl.label}
                   </div>
                 );
               })}
             </div>
             {/* Indicators (Output) */}
             <div className="flex flex-col gap-2">
               <div className="text-xs font-semibold text-gray-500 px-1 flex items-center gap-1">
                 <span className="text-orange-500">◀</span> INDICATORS (Output)
               </div>
               {filteredUIControls.filter(c => c.direction === 'indicator').map((ctrl) => {
                 const Icon = UI_ICONS[ctrl.type] || Box;
                 return (
                    <div
                      key={ctrl.type}
                      className="bg-white border p-2 rounded text-sm cursor-grab hover:shadow-md hover:border-orange-300 transition-all flex items-center border-l-4 border-l-orange-400"
                      onClick={() => handleClickUI(ctrl)}
                      onDragStart={(e) => handleDragStartUI(e, ctrl)}
                      draggable
                    >
                     <Icon className="w-4 h-4 mr-2 text-orange-500" />
                     {ctrl.label}
                   </div>
                 );
               })}
             </div>
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
