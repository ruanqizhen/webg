import { Handle, Position } from 'reactflow';
import { NodeRegistry } from '../../../engine/registry';
import { getTypeColor } from '../../../lib/colors';
import { useRuntimeStore } from '../../../store/useRuntimeStore';
import { useUIStore } from '../../../store/useUIStore';
import { useGraphStore } from '../../../store/useGraphStore';

/* ═══════════════════════════════════════════════════════
   LabVIEW-Inspired Icon Definitions
   ═══════════════════════════════════════════════════════ */

interface IconDef {
  shape: string;
  bg: string;
  stroke: string;
  symbol: string;
  symbolColor: string;
  w: number;
  h: number;
}

const NODE_ICONS: Record<string, IconDef> = {
  // ── Math ── Amber chevron ──
  'math.add':      { shape:'chevron', bg:'#FEF3C7', stroke:'#B45309', symbol:'+',  symbolColor:'#78350F', w:56, h:44 },
  'math.subtract': { shape:'chevron', bg:'#FEF3C7', stroke:'#B45309', symbol:'−',  symbolColor:'#78350F', w:56, h:44 },
  'math.multiply': { shape:'chevron', bg:'#FEF3C7', stroke:'#B45309', symbol:'×',  symbolColor:'#78350F', w:56, h:44 },
  'math.divide':   { shape:'chevron', bg:'#FEF3C7', stroke:'#B45309', symbol:'÷',  symbolColor:'#78350F', w:56, h:44 },
  // ── Comparison ── Orange hexagon ──
  'logic.greater': { shape:'hexagon', bg:'#FFEDD5', stroke:'#C2410C', symbol:'>',  symbolColor:'#7C2D12', w:48, h:42 },
  'logic.less':    { shape:'hexagon', bg:'#FFEDD5', stroke:'#C2410C', symbol:'<',  symbolColor:'#7C2D12', w:48, h:42 },
  'logic.equal':   { shape:'hexagon', bg:'#FFEDD5', stroke:'#C2410C', symbol:'=',  symbolColor:'#7C2D12', w:48, h:42 },
  // ── Boolean Gates ── Blue ──
  'logic.and': { shape:'and-gate', bg:'#DBEAFE', stroke:'#1D4ED8', symbol:'&',   symbolColor:'#1E3A8A', w:56, h:44 },
  'logic.or':  { shape:'or-gate',  bg:'#DBEAFE', stroke:'#1D4ED8', symbol:'≥1',  symbolColor:'#1E3A8A', w:56, h:44 },
  'logic.not': { shape:'not-gate', bg:'#DBEAFE', stroke:'#1D4ED8', symbol:'',    symbolColor:'#1E3A8A', w:52, h:42 },
  // ── Constants ── LabVIEW-style color coding ──
  'source.number':  { shape:'constant', bg:'#FFFBEB', stroke:'#D97706', symbol:'#',   symbolColor:'#78350F', w:64, h:32 },
  'source.boolean': { shape:'constant', bg:'#F0FDF4', stroke:'#15803D', symbol:'T/F', symbolColor:'#065F46', w:64, h:32 },
  'source.string':  { shape:'constant', bg:'#FDF2F8', stroke:'#BE185D', symbol:'abc', symbolColor:'#9D174D', w:64, h:32 },
  // ── Sink ──
  'sink.display': { shape:'indicator', bg:'#FFF7ED', stroke:'#EA580C', symbol:'', symbolColor:'#9A3412', w:90, h:38 },
  // ── Terminal fallback ──
  'io.terminal': { shape:'terminal', bg:'#EFF6FF', stroke:'#3B82F6', symbol:'T', symbolColor:'#1E40AF', w:40, h:40 },
};

/* ═══════════════════════════════════════════════════════
   SVG Shape Renderers
   ═══════════════════════════════════════════════════════ */

function renderShape(shape: string, w: number, h: number, bg: string, stroke: string) {
  const s = 2;
  switch (shape) {
    case 'chevron':
      return (
        <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} className="drop-shadow-md">
          <polygon
            points={`${s},${s} ${w*0.65},${s} ${w-s},${h/2} ${w*0.65},${h-s} ${s},${h-s}`}
            fill={bg} stroke={stroke} strokeWidth={s} strokeLinejoin="round"
          />
        </svg>
      );
    case 'hexagon':
      return (
        <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} className="drop-shadow-md">
          <polygon
            points={`${s},${h/2} ${w*0.22},${s} ${w*0.78},${s} ${w-s},${h/2} ${w*0.78},${h-s} ${w*0.22},${h-s}`}
            fill={bg} stroke={stroke} strokeWidth={s} strokeLinejoin="round"
          />
        </svg>
      );
    case 'and-gate':
      return (
        <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} className="drop-shadow-md">
          <path
            d={`M ${s},${s} L ${w*0.45},${s} A ${h/2},${h/2} 0 0 1 ${w*0.45},${h-s} L ${s},${h-s} Z`}
            fill={bg} stroke={stroke} strokeWidth={s} strokeLinejoin="round"
          />
        </svg>
      );
    case 'or-gate':
      return (
        <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} className="drop-shadow-md">
          <path
            d={`M ${s},${s} Q ${w*0.35},${s} ${w*0.5},${s+2} Q ${w*0.82},${h*0.2} ${w-s},${h/2} Q ${w*0.82},${h*0.8} ${w*0.5},${h-s-2} Q ${w*0.35},${h-s} ${s},${h-s} Q ${w*0.18},${h/2} ${s},${s} Z`}
            fill={bg} stroke={stroke} strokeWidth={s} strokeLinejoin="round"
          />
        </svg>
      );
    case 'not-gate':
      return (
        <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} className="drop-shadow-md">
          <polygon
            points={`${s},${s} ${w*0.7},${h/2} ${s},${h-s}`}
            fill={bg} stroke={stroke} strokeWidth={s} strokeLinejoin="round"
          />
          <circle cx={w*0.82} cy={h/2} r={h*0.12}
            fill={bg} stroke={stroke} strokeWidth={s}
          />
        </svg>
      );
    case 'constant':
      return (
        <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} className="drop-shadow-sm">
          <rect x={s} y={s} width={w-2*s} height={h-2*s} rx={2}
            fill={bg} stroke={stroke} strokeWidth={s}
          />
          {/* Subtle LabVIEW inner bezel-like effect */}
          <line x1={s+2} y1={s+2} x2={w-s-2} y2={s+2} stroke="white" strokeWidth="1" opacity="0.6" />
          <line x1={s+2} y1={s+2} x2={s+2} y2={h-s-2} stroke="white" strokeWidth="1" opacity="0.6" />
        </svg>
      );
    case 'indicator':
      return (
        <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} className="drop-shadow-md">
          <rect x={s} y={s} width={w-2*s} height={h-2*s} rx={4}
            fill={bg} stroke={stroke} strokeWidth={s}
          />
          <rect x={s+4} y={s+4} width={w-2*s-8} height={h-2*s-8} rx={2}
            fill="#111827" opacity="0.85"
          />
        </svg>
      );
    case 'term-cntl': // LabVIEW Control (Output on right)
      return (
        <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} className="drop-shadow-sm">
          <rect x={s} y={s} width={w-s-8} height={h-2*s} rx={1} fill={bg} stroke={stroke} strokeWidth={s} />
          <polygon points={`${w-s-8},${h/4} ${w-s},${h/2} ${w-s-8},${h*3/4}`} fill={stroke} />
        </svg>
      );
    case 'term-ind': // LabVIEW Indicator (Input on left)
      return (
        <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} className="drop-shadow-sm">
          <rect x={s+8} y={s} width={w-s-8} height={h-2*s} rx={1} fill={bg} stroke={stroke} strokeWidth={s} />
          <polygon points={`${s+8},${h/4} ${s},${h/2} ${s+8},${h*3/4}`} fill={stroke} />
        </svg>
      );
    default:
      return null;
  }
}

/* ═══════════════════════════════════════════════════════
   Handle position helpers
   ═══════════════════════════════════════════════════════ */

function spreadPositions(count: number): number[] {
  if (count === 1) return [50];
  if (count === 2) return [30, 70];
  return Array.from({ length: count }, (_, i) => 15 + (i * 70 / Math.max(count - 1, 1)));
}

/* ═══════════════════════════════════════════════════════
   State ring CSS helper
   ═══════════════════════════════════════════════════════ */

function stateRingClass(nodeState: string, selected: boolean, isCurrentStep: boolean): string {
  if (isCurrentStep) return 'ring-[3px] ring-yellow-400 shadow-lg shadow-yellow-400/40 animate-pulse';
  if (nodeState === 'error') return 'ring-2 ring-red-500 shadow-md shadow-red-500/30';
  if (nodeState === 'running') return 'ring-2 ring-blue-500 animate-pulse';
  if (nodeState === 'done') return 'ring-2 ring-green-500';
  if (selected) return 'ring-2 ring-blue-400 shadow-md';
  return '';
}

/* ═══════════════════════════════════════════════════════
   Main BaseNode Component
   ═══════════════════════════════════════════════════════ */

export function BaseNode({ id, data, type, selected }: any) {
  const actualType: string = data?.nodeType || type;
  const def = NodeRegistry[actualType] || data?.def;
  const nodeState = useRuntimeStore(s => s.nodeState[id] || 'idle');
  const portValues = useRuntimeStore(s => s.portValues);
  const currentStepNode = useRuntimeStore(s => s.currentStepNode);
  const setSelectedNodeId = useUIStore(s => s.setSelectedNodeId);
  const { updateNode, nodes, uiControls } = useGraphStore();

  const node = nodes.find(n => n.id === id);
  const hasBreakpoint = node?.breakpoint || false;
  const isCurrentStep = currentStepNode === id;

  if (!def) return <div className="p-2 bg-red-500 text-white rounded text-xs">Unknown: {actualType}</div>;

  let iconDef = NODE_ICONS[actualType];

  /* ── Special handling for io.terminal ────────── */
  if (actualType === 'io.terminal') {
    const boundControl = uiControls.find(c => c.bindingNodeId === id);
    const isIndicator = boundControl?.direction === 'indicator';
    const ctrlType = boundControl?.type || 'numberInput';
    
    let color = '#D97706'; // Default Amber (Numeric/DBL) - matching Constant
    let symbol = 'DBL';
    if (ctrlType === 'button' || ctrlType === 'indicatorLight') {
      color = '#059669'; // Green (Boolean)
      symbol = 'TF';
    } else if (ctrlType === 'textLabel') {
       color = '#DB2777'; // Pink (String)
       symbol = 'abc';
    } else if (ctrlType === 'gauge') {
       color = '#D97706'; // Use same amber for all numerical indicators
       symbol = 'DBL';
    }

    iconDef = {
      shape: isIndicator ? 'term-ind' : 'term-cntl',
      bg: `${color}15`, // Very light version of color
      stroke: color,
      symbol,
      symbolColor: color,
      w: 64,
      h: 36
    };
  }

  /* ── Icon-based rendering ────────── */
  if (iconDef) {
    const { shape, bg, stroke, symbol, symbolColor, w, h } = iconDef;
    const ringCls = stateRingClass(nodeState, !!selected, isCurrentStep);
    const isTerminal = actualType === 'io.terminal' || actualType === 'io.tunnel';
    const nodeInputs = (isTerminal && node?.inputs) ? node.inputs : (def.inputs || []);
    const nodeOutputs = (isTerminal && node?.outputs) ? node.outputs : (def.outputs || []);
    const inputPositions = spreadPositions(nodeInputs.length);
    const outputPositions = spreadPositions(nodeOutputs.length);

    const isConstant = shape === 'constant';
    const isIndicator = shape === 'indicator';
    const paramValue = node?.params?.value;

    // Determine display value
    let displayValue = '';
    if (isConstant) {
      displayValue = paramValue !== undefined ? String(paramValue) : '';
    } else if (isIndicator || actualType === 'io.terminal') {
      const inPortId = `${id}_input`;
      const outPortId = `${id}_output`;
      const inVal = portValues[inPortId];
      const outVal = portValues[outPortId];
      const currentVal = inVal !== undefined ? inVal : (outVal !== undefined ? outVal : paramValue);
      displayValue = currentVal !== undefined ? (typeof currentVal === 'number' ? currentVal.toFixed(2) : String(currentVal)) : (actualType === 'io.terminal' ? symbol : '');
    }

    return (
      <div
        className={`relative cursor-pointer transition-all rounded-lg ${ringCls}`}
        style={{ width: w, height: h }}
        onClick={() => setSelectedNodeId(id)}
        title={def.label}
      >
        {/* SVG Shape */}
        <div className="absolute inset-0">
          {renderShape(shape, w, h, bg, stroke)}
        </div>

        {/* Symbol / Value overlay */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-10">
          {(isConstant || isIndicator) ? (
            <span
              className="font-mono font-bold text-xs truncate max-w-[90%] px-1"
              style={{ color: isIndicator ? '#39ff14' : symbolColor,
                       textShadow: isIndicator ? '0 0 6px rgba(57,255,20,0.7)' : 'none' }}
            >
              {displayValue || symbol}
            </span>
          ) : (
            <span className="font-bold select-none" style={{ color: symbolColor, fontSize: h * 0.45 }}>
              {symbol}
            </span>
          )}
        </div>

        {/* Label below */}
        <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] text-gray-400 font-medium pointer-events-none select-none">
          {actualType === 'io.terminal' ? (uiControls.find(c => c.bindingNodeId === id)?.label || def.label) : def.label}
        </div>

        {/* Breakpoint dot */}
        {hasBreakpoint && (
          <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-500 border border-white z-20" />
        )}

        {/* Input handles */}
        {nodeInputs.map((port: any, i: number) => {
          const topPct = inputPositions[i];
          const val = portValues[`${id}_${port.name}`];
          return (
            <div key={port.name} className="group">
              <Handle
                type="target"
                position={Position.Left}
                id={port.name}
                style={{
                  top: `${topPct}%`,
                  background: getTypeColor(port.type),
                  width: 10, height: 10,
                  border: '2px solid white',
                  left: -5,
                }}
              />
              {/* Hover tooltip */}
              <div
                className="hidden group-hover:block absolute text-[9px] bg-gray-800 text-white px-1.5 py-0.5 rounded shadow-lg z-50 whitespace-nowrap pointer-events-none"
                style={{ top: `${topPct}%`, left: -8, transform: 'translate(-100%, -50%)' }}
              >
                {port.name}{val !== undefined ? `: ${String(val)}` : ''}
              </div>
            </div>
          );
        })}

        {/* Output handles */}
        {nodeOutputs.map((port: any, i: number) => {
          const topPct = outputPositions[i];
          const val = portValues[`${id}_${port.name}`];
          return (
            <div key={port.name} className="group">
              <Handle
                type="source"
                position={Position.Right}
                id={port.name}
                style={{
                  top: `${topPct}%`,
                  background: getTypeColor(port.type),
                  width: 10, height: 10,
                  border: '2px solid white',
                  right: -5,
                }}
              />
              <div
                className="hidden group-hover:block absolute text-[9px] bg-gray-800 text-white px-1.5 py-0.5 rounded shadow-lg z-50 whitespace-nowrap pointer-events-none"
                style={{ top: `${topPct}%`, right: -8, transform: 'translate(100%, -50%)' }}
              >
                {port.name}{val !== undefined ? `: ${String(val)}` : ''}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  /* ── Fallback: generic rectangular node ────────────── */
  const category = actualType.split('.')[0];
  const headerColor = category === 'source' ? '#388E3C' : category === 'math' ? '#1565C0'
    : category === 'logic' ? '#6A1B9A' : category === 'sink' ? '#E65100' : '#546E7A';

  let stateBorder = 'ring-1 ring-gray-300';
  if (selected) stateBorder = 'ring-2 ring-blue-400 shadow-lg';
  if (nodeState === 'error') stateBorder = 'ring-2 ring-red-500';
  else if (nodeState === 'running') stateBorder = 'ring-2 ring-blue-500 animate-pulse';
  else if (nodeState === 'done') stateBorder = 'ring-2 ring-green-500';
  if (isCurrentStep) stateBorder = 'ring-4 ring-yellow-400 animate-pulse';

  return (
    <div
      className={`flex flex-col rounded-md shadow-md bg-white overflow-hidden min-w-[120px] transition-all ${stateBorder}`}
      onClick={() => setSelectedNodeId(id)}
    >
      <div className="px-2 py-1 text-white text-xs font-semibold flex justify-between items-center"
           style={{ backgroundColor: headerColor }}>
        <span>{def.label}</span>
        <button
          className={`w-4 h-4 rounded-full border border-white/50 flex items-center justify-center transition-colors ${hasBreakpoint ? 'bg-red-500' : 'bg-transparent hover:bg-white/20'}`}
          onClick={(e) => { e.stopPropagation(); updateNode(id, { breakpoint: !hasBreakpoint }); }}
        >
          {hasBreakpoint && <svg width="8" height="8" viewBox="0 0 24 24" fill="white"><circle cx="12" cy="12" r="8"/></svg>}
        </button>
      </div>
      <div className="flex p-2 justify-between gap-4 text-xs relative">
        <div className="flex flex-col gap-2 min-w-[20px]">
          {def.inputs.map((port: any) => {
            const v = portValues[`${id}_${port.name}`];
            return (
              <div key={port.name} className="flex items-center gap-1 h-4 relative group">
                <Handle type="target" position={Position.Left} id={port.name}
                  style={{ background: getTypeColor(port.type), width: 12, height: 12, left: -14 }}
                  title={`${port.name} (${port.type})`} />
                {v !== undefined && (
                  <span className="hidden group-hover:block absolute left-[-10px] -top-5 text-[10px] bg-gray-800 text-white px-1 py-0.5 rounded shadow z-10 whitespace-nowrap pointer-events-none">{String(v)}</span>
                )}
                <span className="text-gray-600 pl-1">{port.name}</span>
              </div>
            );
          })}
        </div>
        <div className="flex flex-col gap-2 min-w-[20px] items-end">
          {def.outputs.map((port: any) => {
            const v = portValues[`${id}_${port.name}`];
            return (
              <div key={port.name} className="flex items-center justify-end gap-1 h-4 relative group">
                {v !== undefined && (
                  <span className="hidden group-hover:block absolute right-8 -top-4 text-[10px] bg-gray-800 text-white px-1 py-0.5 rounded shadow z-10 whitespace-nowrap">{String(v)}</span>
                )}
                <span className="text-gray-600 pr-1">{port.name}</span>
                <Handle type="source" position={Position.Right} id={port.name}
                  style={{ background: getTypeColor(port.type), width: 12, height: 12, right: -14 }}
                  title={`${port.name} (${port.type})`} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
