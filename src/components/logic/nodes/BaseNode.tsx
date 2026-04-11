import React, { useState } from 'react';
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
  'logic.and': { shape:'and-gate', bg:'#DBEAFE', stroke:'#1D4ED8', symbol:'∧',   symbolColor:'#1E3A8A', w:56, h:44 },
  'logic.or':  { shape:'or-gate',  bg:'#DBEAFE', stroke:'#1D4ED8', symbol:'∨',   symbolColor:'#1E3A8A', w:56, h:44 },
  'logic.not': { shape:'not-gate', bg:'#DBEAFE', stroke:'#1D4ED8', symbol:'',    symbolColor:'#1E3A8A', w:56, h:44 },
  // ── Constants ── LabVIEW-style color coding ──
  'source.number':  { shape:'constant', bg:'#FFFBEB', stroke:'#D97706', symbol:'#',   symbolColor:'#78350F', w:64, h:32 },
  'source.boolean': { shape:'constant', bg:'#F0FDF4', stroke:'#15803D', symbol:'T/F', symbolColor:'#065F46', w:64, h:32 },
  'source.string':  { shape:'constant', bg:'#FDF2F8', stroke:'#BE185D', symbol:'abc', symbolColor:'#9D174D', w:64, h:32 },
  'source.array':   { shape:'constant', bg:'#FFF7ED', stroke:'#E65100', symbol:'[ ]', symbolColor:'#BF360C', w:64, h:32 },
  // ── Sink ──
  'sink.display': { shape:'indicator', bg:'#FFF7ED', stroke:'#EA580C', symbol:'', symbolColor:'#9A3412', w:90, h:38 },
  'sink.log':     { shape:'console',   bg:'#1F2937', stroke:'#4B5563', symbol:'', symbolColor:'#10B981', w:56, h:40 },
  // ── Terminal fallback ──
  'io.terminal': { shape:'terminal', bg:'#EFF6FF', stroke:'#3B82F6', symbol:'T', symbolColor:'#1E40AF', w:40, h:40 },
};

/* ═══════════════════════════════════════════════════════
   SVG Shape Renderers
   ═══════════════════════════════════════════════════════ */

function renderShape(shape: string, w: number, h: number, bg: string, stroke: string, symbolColor?: string) {
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
        <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} className="group-hover:drop-shadow-sm transition-all">
          <path
            d={`M ${s},${s} L ${w*0.63},${s} A ${h/2-s},${h/2-s} 0 0 1 ${w*0.63},${h-s} L ${s},${h-s} Z`}
            fill={bg} stroke={stroke} strokeWidth={s} strokeLinejoin="round"
          />
        </svg>
      );
    case 'or-gate':
      return (
        <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} className="group-hover:drop-shadow-sm transition-all">
          <path
             d={`M ${s},${s} Q ${w*0.3},${s} ${w*0.5},${s+2} Q ${w*0.9},${h*0.2} ${w-s},${h/2} Q ${w*0.9},${h*0.8} ${w*0.5},${h-s-2} Q ${w*0.3},${h-s} ${s},${h-s} Q ${w*0.15},${h/2} ${s},${s} Z`}
            fill={bg} stroke={stroke} strokeWidth={s} strokeLinejoin="round"
          />
        </svg>
      );
    case 'not-gate':
      return (
        <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} className="group-hover:drop-shadow-sm transition-all">
          <polygon
            points={`${s},${s} ${w*0.75},${h/2} ${s},${h-s}`}
            fill={bg} stroke={stroke} strokeWidth={s} strokeLinejoin="round"
          />
          {/* Lying down L symbol (¬) */}
          <path
            d={`M ${w*0.2},${h*0.4} L ${w*0.4},${h*0.4} L ${w*0.4},${h*0.6}`}
            fill="none" stroke={symbolColor} strokeWidth={s}
          />
          <circle cx={w*0.88} cy={h/2} r={h*0.12}
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
    case 'console':
      return (
        <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} className="group-hover:drop-shadow-sm transition-all">
          <rect x={s} y={s} width={w-2*s} height={h-2*s} rx={2} fill="#111827" stroke={stroke} strokeWidth={s} />
          <path d={`M ${w*0.2},${h*0.35} L ${w*0.35},${h*0.5} L ${w*0.2},${h*0.65}`} fill="none" stroke={symbolColor} strokeWidth={s+1} />
          <rect x={w*0.45} y={h*0.65} width={w*0.3} height={s+1} fill={symbolColor} />
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

// Helper for handle rendering to keep BaseNode clean
function OptimizedHandle({ nodeId, port, position, topPct, isInput, colorOverride }: any) {
  const val = useRuntimeStore(s => s.portValues[`${nodeId}_${port.name}`]);
  
  return (
    <div className="group">
      <Handle
        type={isInput ? "target" : "source"}
        position={position}
        id={port.name}
        style={{
          top: `${topPct}%`,
          background: colorOverride || getTypeColor(port.type),
          width: isInput ? 10 : 10, height: 10,
          border: '2px solid white',
          [isInput ? 'left' : 'right']: -5,
        }}
      />
      <div
        className="hidden group-hover:block absolute text-[9px] bg-gray-800 text-white px-1.5 py-0.5 rounded shadow-lg z-50 whitespace-nowrap pointer-events-none"
        style={{ 
          top: `${topPct}%`, 
          [isInput ? 'left' : 'right']: -8, 
          transform: isInput ? 'translate(-100%, -50%)' : 'translate(100%, -50%)' 
        }}
      >
        {port.name}{val !== undefined ? `: ${String(val)}` : ''}
      </div>
    </div>
  );
}

function ArrayConstantNode({ id, node, updateNode, nodeState, isCurrentStep, selected }: any) {
  const [arrayIndex, setArrayIndex] = useState(0);
  const paramValue = Array.isArray(node?.params?.value) ? node.params.value : [];
  const elementType = node?.params?.elementType;
  const outPort = node?.outputs?.[0] || { name: 'value', type: 'array' };

  // Inner constant value proxy
  let innerVal = paramValue[arrayIndex];
  if (innerVal === undefined) {
      if (elementType === 'source.number') innerVal = 0;
      else if (elementType === 'source.boolean') innerVal = false;
      else if (elementType === 'source.string') innerVal = '';
  }

  const handleInnerChange = (e: any) => {
     let val = e.target.value;
     if (elementType === 'source.number') val = Number(val);
     if (elementType === 'source.boolean') val = e.target.checked;
     
     const newArr = [...paramValue];
     newArr[arrayIndex] = val;
     updateNode(id, { params: { ...node.params, value: newArr } });
  };

  const ringCls = stateRingClass(nodeState, !!selected, isCurrentStep);

  return (
    <div className={`flex flex-row bg-[#F3F4F6] border-2 border-[#D1D5DB] rounded-sm overflow-hidden shadow-sm pointer-events-auto ${ringCls}`} style={{ width: 120, height: 40 }}>
       <div className="w-8 flex flex-col items-stretch border-r border-[#D1D5DB] bg-[#E5E7EB] shrink-0">
          <button onPointerDown={e => { e.stopPropagation(); setArrayIndex(a => Math.max(0, a+1)); }} className="flex-1 flex items-center justify-center hover:bg-[#D1D5DB] border-b border-[#D1D5DB] text-[8px] cursor-pointer">▲</button>
          <div className="flex-1 flex items-center justify-center text-[10px] font-mono font-bold">{arrayIndex}</div>
          <button onPointerDown={e => { e.stopPropagation(); setArrayIndex(a => Math.max(0, a-1)); }} className="flex-1 flex items-center justify-center hover:bg-[#D1D5DB] border-t border-[#D1D5DB] text-[8px] cursor-pointer">▼</button>
       </div>
       <div className="flex-1 flex items-center justify-center p-1 relative overflow-hidden bg-[#fff]">
          {elementType ? (
             <div className="w-full h-full relative" onContextMenu={e => e.stopPropagation()}>
               {elementType === 'source.number' && <input type="number" value={innerVal || ''} onChange={handleInnerChange} onPointerDown={e => e.stopPropagation()} className="w-full h-full text-center bg-[#FFECB3] border border-[#FFCA28] text-xs font-mono font-bold focus:outline-none focus:ring-1 focus:ring-amber-500 nodrag" />}
               {elementType === 'source.string' && <input type="text" value={innerVal || ''} onChange={handleInnerChange} onPointerDown={e => e.stopPropagation()} className="w-full h-full px-1 text-left bg-[#FCE4EC] border border-[#F48FB1] text-xs font-mono focus:outline-none focus:ring-1 focus:ring-pink-500 nodrag" />}
               {elementType === 'source.boolean' && <label className="w-full h-full flex items-center justify-center bg-[#E8F5E9] border border-[#A5D6A7] cursor-pointer nodrag"><input type="checkbox" checked={!!innerVal} onChange={handleInnerChange} onPointerDown={e => e.stopPropagation()} className="mr-1" /><span className="text-[10px] font-bold text-green-800">{innerVal ? 'T' : 'F'}</span></label>}
             </div>
          ) : (
             <span className="text-[8px] text-gray-400 font-bold uppercase text-center border border-dashed border-gray-300 w-full h-full flex items-center justify-center">Drop</span>
          )}
       </div>
       <OptimizedHandle nodeId={id} port={{ ...outPort, name: 'value', type: outPort.type }} position={Position.Right} topPct={50} isInput={false} />
    </div>
  );
}

export function BaseNode({ id, data, type, selected }: any) {
  const actualType: string = data?.nodeType || type;
  const def = NodeRegistry[actualType] || data?.def;
  
  // Granular subscription to runtime state
  const nodeState = useRuntimeStore(s => s.nodeState[id] || 'idle');
  const inVal = useRuntimeStore(s => s.portValues[`${id}_input`] ?? s.portValues[`${id}_value`]);
  const outVal = useRuntimeStore(s => s.portValues[`${id}_output`]);
  const currentStepNode = useRuntimeStore(s => s.currentStepNode);
  
  // Granular subscription to graph state
  const node = useGraphStore(s => s.nodes.find(n => n.id === id));
  const boundControl = useGraphStore(s => s.uiControls.find(c => c.bindingNodeId === id));
  const boundControlLabel = boundControl?.label;
  const updateNode = useGraphStore(s => s.updateNode);
  const setSelectedNodeId = useUIStore(s => s.setSelectedNodeId);

  const hasBreakpoint = node?.breakpoint || false;
  const isCurrentStep = currentStepNode === id;

  if (!def) return <div className="p-2 bg-red-500 text-white rounded text-xs">Unknown: {actualType}</div>;

  if (actualType === 'source.array') {
    return <ArrayConstantNode id={id} node={node} updateNode={updateNode} nodeState={nodeState} isCurrentStep={isCurrentStep} selected={selected} />;
  }

  let iconDef = NODE_ICONS[actualType] ? { ...NODE_ICONS[actualType] } : undefined;

  /* ── Override source.number icon based on numberType ────────── */
  if (actualType === 'source.number' && iconDef) {
    const isInteger = node?.params?.numberType === 'integer';
    if (isInteger) {
      iconDef = {
        ...iconDef,
        bg: '#DBEAFE',
        stroke: '#1565C0',
        symbol: 'I32',
        symbolColor: '#1E3A8A',
      };
    }
  }

  /* ── Special handling for io.terminal ────────── */
  if (actualType === 'io.terminal') {
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
    } else if (boundControl?.numberType === 'integer') {
       color = '#1565C0'; // Blue (Integer/I32)
       symbol = 'I32';
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
    const isTerminal = actualType === 'io.terminal';
    // Determine effective port type color for handles
    const getEffectiveColor = (_port: any) => {
      if (actualType === 'source.number' && node?.params?.numberType === 'integer') return '#1565C0';
      if (actualType === 'io.terminal' && boundControl?.numberType === 'integer') return '#1565C0';
      return undefined; // use default from getTypeColor
    };

    const nodeInputs = (isTerminal && node?.inputs) ? node.inputs : (def.inputs || []);
    const nodeOutputs = (isTerminal && node?.outputs) ? node.outputs : (def.outputs || []);
    const inputPositions = spreadPositions(nodeInputs.length);
    const outputPositions = spreadPositions(nodeOutputs.length);

    const isConstant = shape === 'constant';
    const isIndicator = shape === 'indicator' || shape === 'term-ind';
    const paramValue = node?.params?.value;

    // Determine display value
    let displayValue = '';
    if (isConstant) {
      if (actualType === 'source.array') {
        const arr = Array.isArray(paramValue) ? paramValue : [];
        displayValue = `[${arr.length}]`;
      } else {
        displayValue = paramValue !== undefined ? String(paramValue) : '';
      }
    } else if (isIndicator || actualType === 'io.terminal') {
      const baseVal = actualType === 'io.terminal' ? (paramValue !== undefined ? paramValue : boundControl?.defaultValue) : paramValue;
      const currentVal = inVal !== undefined ? inVal : (outVal !== undefined ? outVal : baseVal);
      
      if (currentVal !== undefined) {
         if (typeof currentVal === 'number') {
            const hasFraction = currentVal % 1 !== 0;
            displayValue = (hasFraction && currentVal !== 0) ? currentVal.toFixed(1) : String(currentVal);
         } else if (typeof currentVal === 'boolean') {
            displayValue = currentVal ? 'T' : 'F';
         } else {
            displayValue = String(currentVal);
         }
      } else {
         displayValue = actualType === 'io.terminal' ? symbol : '';
      }
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
          {renderShape(shape, w, h, bg, stroke, symbolColor)}
        </div>

        {/* Symbol / Value overlay */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-10">
          {(isConstant || isIndicator || actualType === 'io.terminal') ? (
            <span
              className="font-mono font-bold text-xs truncate max-w-[90%] px-1"
              style={{ color: isIndicator ? '#39ff14' : symbolColor,
                       textShadow: isIndicator ? '0 0 6px rgba(57,255,20,0.7)' : 'none' }}
            >
              {displayValue}
            </span>
          ) : (
            <span className="font-bold select-none" style={{ color: symbolColor, fontSize: h * 0.45 }}>
              {symbol}
            </span>
          )}
        </div>

        {/* Label below */}
        <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] text-gray-400 font-medium pointer-events-none select-none">
          {actualType === 'io.terminal' ? (boundControlLabel || def.label) : def.label}
        </div>

        {/* Breakpoint dot */}
        {hasBreakpoint && (
          <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-500 border border-white z-20" />
        )}

        {/* Input handles */}
        {nodeInputs.map((port: any, i: number) => (
          <OptimizedHandle 
            key={port.name} 
            nodeId={id} 
            port={port} 
            position={Position.Left} 
            isInput={true} 
            topPct={inputPositions[i]}
            colorOverride={getEffectiveColor(port)}
          />
        ))}

        {/* Output handles */}
        {nodeOutputs.map((port: any, i: number) => (
          <OptimizedHandle 
            key={port.name} 
            nodeId={id} 
            port={port} 
            position={Position.Right} 
            isInput={false} 
            topPct={outputPositions[i]}
            colorOverride={getEffectiveColor(port)}
          />
        ))}
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
          {def.inputs.map((port: any) => (
            <div key={port.name} className="flex items-center gap-1 h-4 relative group">
              <Handle type="target" position={Position.Left} id={port.name}
                style={{ background: getTypeColor(port.type), width: 12, height: 12, left: -14 }}
                title={`${port.name} (${port.type})`} />
              <PortValueTooltip nodeId={id} portName={port.name} isOutput={false} />
              <span className="text-gray-600 pl-1">{port.name}</span>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-2 min-w-[20px] items-end">
          {def.outputs.map((port: any) => (
            <div key={port.name} className="flex items-center justify-end gap-1 h-4 relative group">
              <PortValueTooltip nodeId={id} portName={port.name} isOutput={true} />
              <span className="text-gray-600 pr-1">{port.name}</span>
              <Handle type="source" position={Position.Right} id={port.name}
                style={{ background: getTypeColor(port.type), width: 12, height: 12, right: -14 }}
                title={`${port.name} (${port.type})`} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PortValueTooltip({ nodeId, portName, isOutput }: { nodeId: string, portName: string, isOutput: boolean }) {
  const v = useRuntimeStore(s => s.portValues[`${nodeId}_${portName}`]);
  if (v === undefined) return null;
  
  return (
    <span className={`hidden group-hover:block absolute ${isOutput ? 'right-8' : 'left-[-10px]'} -top-5 text-[10px] bg-gray-800 text-white px-1 py-0.5 rounded shadow z-10 whitespace-nowrap pointer-events-none`}>
      {String(v)}
    </span>
  );
}
