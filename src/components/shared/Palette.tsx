import { useState } from 'react';
import { useUIStore } from '../../store/useUIStore';
import { NodeRegistry } from '../../engine/registry';
import { getNodeColor } from '../../lib/colors';
import { useGraphStore } from '../../store/useGraphStore';
import { generateId, generateUniqueLabel } from '../../lib/utils';
import { controlDefaults } from '../../lib/controlDefaults';
import { Panel, PanelHeader } from '../ui/panel';
import { FieldInput } from '../ui/field';
import { findNonOverlappingPosition, nodesToRects, controlsToRects } from '../../lib/layout';
import { resolveNodeOverlaps } from '../logic/GraphEditor';
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
    const store = useGraphStore.getState();
    const currentNodes = store.nodes.filter(n => !n.parent);
    const existingRects = nodesToRects(currentNodes.map(n => ({ position: n.position, width: n.width || (String(n.type).startsWith('structure') ? 320 : 120), height: n.height || (String(n.type).startsWith('structure') ? 220 : 60) })));
    const isStructure = nodeType.startsWith('structure');
    const size = { w: isStructure ? 320 : 120, h: isStructure ? 220 : 60 };
    const pos = findNonOverlappingPosition({ x: 100, y: 100 }, existingRects, size);
    const newId = generateId();
    addNode({
      id: newId,
      type: nodeType,
      position: pos,
      inputs: [],
      outputs: [],
      params: NodeRegistry[nodeType]?.params?.reduce((acc: any, p: any) => { acc[p.name] = p.defaultValue; return acc; }, {}) || {}
    });
    // Secondary push-apart guarantee
    setTimeout(() => resolveNodeOverlaps(newId), 60);
  };

  const handleClickUI = (controlDef: any) => {
    const store = useGraphStore.getState();
    const termId = generateId();
    const ctrlId = generateId();
    const direction: 'control' | 'indicator' = controlDef.direction || 'control';

    // UI controls — find free spot in FrontPanel
    const existingControls = store.uiControls;
    const existingControlRects = controlsToRects(existingControls as any);
    const defW = controlDefaults[controlDef.type]?.width || 140;
    const defH = controlDefaults[controlDef.type]?.height || 48;
    const uiPos = findNonOverlappingPosition({ x: 50, y: 50 }, existingControlRects, { w: defW, h: defH });

    // Terminal nodes — find free spot in Logic canvas root
    const rootNodes = store.nodes.filter(n => !n.parent);
    const rootRects = nodesToRects(rootNodes.map(n => ({ position: n.position, width: n.width || 120, height: n.height || 60 })));
    const termDesired = { x: 80 + (existingControls.length % 6) * 40, y: 80 + Math.floor(existingControls.length / 6) * 50 };
    const termPos = findNonOverlappingPosition(termDesired, rootRects, { w: 64, h: 36 });

    const terminalDef: any = {
      id: termId,
      type: 'io.terminal',
      position: termPos,
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
    if (controlDef.direction === 'indicator') {
       terminalDef.inputs = [{ name: 'input', type: portType, direction: 'input', id: 'input' }];
    } else {
       terminalDef.outputs = [{ name: 'output', type: portType, direction: 'output', id: 'output' }];
    }
    const existingLabels = uiControls.map(c => c.label);
    const uniqueLabel = generateUniqueLabel(controlDef.label, existingLabels);
    addUIControl({
      id: ctrlId,
      type: controlDef.type,
      direction,
      label: uniqueLabel,
      defaultValue: controlDefaults[controlDef.type]?.defaultValue ?? 0,
      bindingNodeId: termId,
      x: uiPos.x,
      y: uiPos.y,
      width: controlDefaults[controlDef.type]?.width,
      height: controlDefaults[controlDef.type]?.height,
      min: controlDefaults[controlDef.type]?.min,
      max: controlDefaults[controlDef.type]?.max,
      step: controlDefaults[controlDef.type]?.step,
      colorOn: controlDefaults[controlDef.type]?.colorOn,
      colorOff: controlDefaults[controlDef.type]?.colorOff,
    }, terminalDef);
  };

  const categories = Object.values(NodeRegistry).reduce((acc: Record<string, typeof NodeRegistry[string][]>, node) => {
    if (node.type === 'io.terminal' || node.type === 'io.tunnel' || node.type === 'io.shiftRegister') return acc;
    const cat = node.type.split('.')[0];
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(node);
    return acc;
  }, {});

  const q = searchQuery.toLowerCase();
  const filteredCategories = q
    ? Object.entries(categories)
        .map(([cat, catNodes]) => [cat, catNodes.filter((n) => n.label.toLowerCase().includes(q))] as const)
        .filter(([, catNodes]) => catNodes.length > 0)
        .reduce((acc, [cat, catNodes]) => ({ ...acc, [cat]: catNodes }), {} as Record<string, typeof NodeRegistry[string][]>)
    : categories;

  const filteredUIControls = q ? UI_CONTROLS.filter(c => c.label.toLowerCase().includes(q)) : UI_CONTROLS;

  return (
    <Panel className="w-64 border-r border-panel-border bg-panel">
      <PanelHeader>Palette</PanelHeader>
      <div className="p-2.5 border-b border-panel-border bg-panel-header">
        <FieldInput placeholder="Search nodes…" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="h-7 text-xs" />
      </div>

      <div className="p-2.5 flex flex-col gap-5 overflow-y-auto flex-1">
        {viewMode === 'logic' ? (
          Object.entries(filteredCategories).map(([cat, catNodes]) => (
             <div key={cat} className="flex flex-col gap-1.5">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-1">{cat}</div>
                {catNodes.map((node) => {
                   const Icon = LOGIC_ICONS[node.type] || Box;
                   const accent = getNodeColor(cat);
                   return (
                     <div
                       key={node.type}
                       className="group flex items-center gap-2 rounded-md border border-border bg-card px-2.5 py-2 text-sm cursor-grab hover:border-border/80 hover:shadow-sm active:cursor-grabbing transition-colors"
                       onDragStart={(e) => handleDragStartLogic(e, node.type)}
                       onClick={() => handleClickLogic(node.type)}
                       draggable
                     >
                       <span className="w-0.5 self-stretch rounded-full shrink-0" style={{ backgroundColor: accent }} />
                       <Icon className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                       <span className="truncate text-xs font-medium">{node.label}</span>
                     </div>
                   );
                })}
             </div>
          ))
        ) : (
          <div className="flex flex-col gap-5">
             <div className="flex flex-col gap-1.5">
               <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-1 flex items-center gap-1.5">
                 <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> CONTROLS
               </div>
               {filteredUIControls.filter(c => c.direction === 'control').map((ctrl) => {
                 const Icon = UI_ICONS[ctrl.type] || Box;
                 return (
                    <div key={`${ctrl.type}-control`} className="group flex items-center gap-2 rounded-md border border-border bg-card px-2.5 py-2 text-sm cursor-grab hover:border-emerald-500/30 hover:shadow-sm transition-colors" onClick={() => handleClickUI(ctrl)} onDragStart={(e) => handleDragStartUI(e, ctrl)} draggable>
                     <span className="w-0.5 self-stretch rounded-full bg-emerald-500/70" />
                     <Icon className="w-4 h-4 text-muted-foreground group-hover:text-foreground" />
                     <span className="text-xs font-medium">{ctrl.label}</span>
                   </div>
                 );
               })}
             </div>
             <div className="flex flex-col gap-1.5">
               <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-1 flex items-center gap-1.5">
                 <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> INDICATORS
               </div>
               {filteredUIControls.filter(c => c.direction === 'indicator').map((ctrl) => {
                 const Icon = UI_ICONS[ctrl.type] || Box;
                 return (
                    <div key={`${ctrl.type}-indicator`} className="group flex items-center gap-2 rounded-md border border-border bg-card px-2.5 py-2 text-sm cursor-grab hover:border-amber-500/30 hover:shadow-sm transition-colors" onClick={() => handleClickUI(ctrl)} onDragStart={(e) => handleDragStartUI(e, ctrl)} draggable>
                     <span className="w-0.5 self-stretch rounded-full bg-amber-500/70" />
                     <Icon className="w-4 h-4 text-muted-foreground group-hover:text-foreground" />
                     <span className="text-xs font-medium">{ctrl.label}</span>
                   </div>
                 );
               })}
             </div>
          </div>
        )}

        {q && viewMode === 'logic' && Object.keys(filteredCategories).length === 0 && (
          <div className="text-center text-muted-foreground text-xs py-6">No nodes found</div>
        )}
        {q && viewMode === 'ui' && filteredUIControls.length === 0 && (
          <div className="text-center text-muted-foreground text-xs py-6">No controls found</div>
        )}
      </div>
    </Panel>
  );
}
