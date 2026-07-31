import { useState, useRef, useImperativeHandle, forwardRef } from 'react';
import { createPortal } from 'react-dom';
import { useGraphStore } from '../../store/useGraphStore';
import { useUIStore } from '../../store/useUIStore';
import { useRuntimeStore } from '../../store/useRuntimeStore';
import type { UIControl } from '../../types/graph';
import { generateId } from '../../lib/utils';
import { findNonOverlappingPosition, nodesToRects, controlsToRects } from '../../lib/layout';

// Professional flat controls — tokenized, minimal, elegant

function Gauge({ value, min, max, color }: { value: number; min: number; max: number; color: string }) {
  const rawRange = max - min;
  const range = rawRange === 0 ? 1 : rawRange;
  const percentage = rawRange === 0 ? 0 : Math.min(100, Math.max(0, ((value - min) / range) * 100));
  const rotation = percentage * 1.8 - 90;

  return (
    <div className="relative w-[132px] h-[72px] flex justify-center items-end pb-1">
      <div className="absolute bottom-0 w-[116px] h-[58px] rounded-t-full bg-card border border-border overflow-hidden">
        <div className="absolute inset-0 rounded-t-full bg-muted/30" />
      </div>
      <div className="absolute bottom-0 w-[116px] h-[58px] overflow-visible pointer-events-none z-10 rounded-t-full">
         <svg viewBox="0 0 116 58" className="w-full h-full overflow-visible">
            <path d="M 13 58 A 45 45 0 0 1 103 58" fill="none" stroke="hsl(var(--border))" strokeWidth="5" strokeLinecap="round" />
            <path d="M 13 58 A 45 45 0 0 1 103 58" fill="none" stroke={color} strokeWidth="5" strokeDasharray="141.37" strokeDashoffset={141.37 - (percentage / 100) * 141.37} strokeLinecap="round" className="transition-[stroke-dashoffset] duration-300" />
            {[...Array(11)].map((_, i) => {
              const angle = 180 - (i * 18);
              const rad = (angle * Math.PI) / 180;
              const r1 = 50; const r2 = 57;
              const x1 = 58 + r1 * Math.cos(rad); const y1 = 58 - r1 * Math.sin(rad);
              const x2 = 58 + r2 * Math.cos(rad); const y2 = 58 - r2 * Math.sin(rad);
              return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="hsl(var(--muted-foreground) / 0.4)" strokeWidth={i % 2 === 0 ? 1.2 : 0.8} />;
            })}
         </svg>
      </div>
      <span className="absolute bottom-0 left-2 text-[8px] font-mono text-muted-foreground">{min}</span>
      <span className="absolute bottom-0 right-2 text-[8px] font-mono text-muted-foreground">{max}</span>
      <div className="absolute bottom-[18px] text-[11px] font-mono font-medium tabular-nums bg-card border border-border rounded px-1.5 py-0.5 shadow-sm z-20">{Number(value).toFixed(1)}</div>
      <div className="absolute bottom-0 left-1/2 w-0.5 h-[52px] -translate-x-1/2 origin-bottom transition-transform duration-300 ease-out z-30" style={{ transform: `translateX(-50%) rotate(${rotation}deg)` }}>
         <div className="w-full h-full bg-destructive rounded-full" />
      </div>
      <div className="absolute bottom-[-4px] left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-card border border-border shadow-sm z-40 flex items-center justify-center"><div className="w-1.5 h-1.5 rounded-full bg-foreground/60" /></div>
    </div>
  );
}

function Knob({ value, min, max, onChange, disabled }: { value: number; min: number; max: number; onChange?: (v: number) => void; disabled?: boolean }) {
  const rawRange = max - min;
  const range = rawRange === 0 ? 1 : rawRange;
  const percentage = rawRange === 0 ? 0 : Math.min(100, Math.max(0, ((value - min) / range) * 100));
  const rotation = percentage * 2.7 - 135;

  const handlePointerDown = (e: React.PointerEvent) => {
    if (disabled || e.button !== 0) return;
    e.stopPropagation();
    const startX = e.clientX; const startY = e.clientY; const startVal = value;
    const handlePointerMove = (moveEvent: PointerEvent) => {
        const deltaY = startY - moveEvent.clientY;
        const deltaX = moveEvent.clientX - startX;
        let newVal = startVal + ((deltaY + deltaX) / 150) * range;
        newVal = Math.max(min, Math.min(max, newVal));
        onChange?.(newVal);
    };
    const handlePointerUp = () => {
        document.removeEventListener('pointermove', handlePointerMove);
        document.removeEventListener('pointerup', handlePointerUp);
    };
    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
  };

  return (
    <div className="relative w-[56px] h-[56px] rounded-full bg-card border border-border shadow-sm flex items-center justify-center cursor-grab active:cursor-grabbing mx-auto" onPointerDown={handlePointerDown}>
      <div className="w-[42px] h-[42px] rounded-full bg-muted border border-border shadow-inner transition-transform duration-75 relative z-10 pointer-events-none" style={{ transform: `rotate(${rotation}deg)` }}>
         <div className="absolute top-1 left-1/2 -translate-x-1/2 w-1 h-2.5 bg-foreground rounded-full" />
      </div>
      <div className="absolute -bottom-4 text-[10px] text-muted-foreground font-mono tabular-nums pointer-events-none">{Number(value).toFixed(1)}</div>
    </div>
  );
}

function Tank({ value, min, max, color }: { value: number; min: number; max: number; color: string }) {
  const rawRange = max - min;
  const range = rawRange === 0 ? 1 : rawRange;
  const percentage = rawRange === 0 ? 0 : Math.min(100, Math.max(0, ((value - min) / range) * 100));
  return (
    <div className="relative w-[56px] h-full min-h-[60px] bg-muted rounded-md border border-border overflow-hidden flex flex-col justify-end mx-auto shadow-inner">
       <div className="w-full transition-all duration-300" style={{ height: `${percentage}%`, backgroundColor: color }}>
          <div className="w-full h-px bg-white/30" />
       </div>
       <div className="absolute bottom-0 w-full bg-foreground/60 text-background text-center text-[10px] font-mono font-medium py-0.5">{Number(value).toFixed(1)}</div>
    </div>
  );
}

interface InnerControlRenderProps {
  control: UIControl;
  displayVal: any;
  handleChange: (e: React.ChangeEvent<HTMLInputElement> | { target: { value: string } }) => void;
  width: number;
  height: number;
  colorOn: string;
  colorOff: string;
  min?: number;
  max?: number;
  step?: number;
  isIndicatorDir: boolean;
}

function InnerControlRender({ control, displayVal, handleChange, width, height, colorOn, colorOff, min, max, step, isIndicatorDir }: InnerControlRenderProps) {
  return (
    <>
      {control.type === 'numberInput' && (
          <div className="flex-1 flex items-center bg-card border border-input rounded-md px-1 shadow-sm focus-within:ring-2 focus-within:ring-ring focus-within:border-ring transition-all">
           <input type="number" value={displayVal ?? ''} onChange={handleChange} min={min} max={max} step={step} className="bg-transparent text-center font-mono text-sm font-medium text-foreground w-full h-7 focus:outline-none" disabled={isIndicatorDir} onPointerDown={e => e.stopPropagation()} />
         </div>
      )}

      {control.type === 'button' && (
          <div className="w-full h-full flex items-center justify-center">
            <label className="relative inline-flex items-center cursor-pointer select-none" onPointerDown={e => e.stopPropagation()}>
              <input type="checkbox" checked={!!displayVal} onChange={handleChange} disabled={isIndicatorDir} className="sr-only peer" />
              <div className="w-12 h-6 rounded-full bg-input border border-border shadow-inner transition-colors peer-checked:bg-primary relative">
                 <div className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-card border border-border shadow-sm transition-transform peer-checked:translate-x-6" />
              </div>
            </label>
          </div>
      )}

      {control.type === 'numberIndicator' && (
         <div className="bg-muted border border-border rounded-md px-2.5 py-1.5 text-sm font-mono tabular-nums font-medium text-foreground text-right flex-1 flex items-center justify-end shadow-inner">{Number(displayVal ?? 0).toFixed(2)}</div>
      )}

      {control.type === 'textLabel' && (
         <div className="bg-card border border-dashed border-border rounded-md px-2.5 py-1.5 text-sm text-foreground text-center flex-1 flex items-center justify-center shadow-sm">
           <span className="truncate text-xs">{String(displayVal ?? '')}</span>
         </div>
      )}

      {control.type === 'indicatorLight' && (
         <div className="flex-1 flex items-center justify-center">
            <div className="relative w-8 h-8 rounded-full bg-card border border-border shadow-sm flex items-center justify-center p-1">
               <div className="w-full h-full rounded-full transition-all duration-300" style={{ background: displayVal ? colorOn : colorOff, boxShadow: displayVal ? `0 0 10px ${colorOn}80` : 'none' }} />
            </div>
            {!isIndicatorDir && <input type="checkbox" checked={!!displayVal} onChange={handleChange} onPointerDown={e => e.stopPropagation()} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 m-0" />}
         </div>
      )}

      {control.type === 'gauge' && (
        <div className="flex-1 flex items-center justify-center overflow-hidden">
          <div style={{ transform: `scale(${Math.max(0.3, Math.min((width - 16) / 132, (height - 20) / 72))})`, transformOrigin: 'center center' }}>
             <Gauge value={Number(displayVal) || 0} min={min ?? 0} max={max ?? 100} color={colorOn} />
          </div>
          {!isIndicatorDir && <input type="range" min={min ?? 0} max={max ?? 100} step={step ?? 1} value={displayVal as number} onChange={handleChange} onPointerDown={e => e.stopPropagation()} className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-10" />}
        </div>
      )}

      {control.type === 'slider' && (
         <div className="w-full flex-1 flex flex-col justify-center gap-1.5 px-1">
             <input type="range" min={min ?? 0} max={max ?? 100} step={step ?? 1} value={displayVal ?? 0} onChange={handleChange} disabled={isIndicatorDir} className="w-full h-1.5 bg-muted rounded-full appearance-none cursor-pointer accent-primary" onPointerDown={e => e.stopPropagation()} />
             <div className="flex justify-between items-center text-[10px] text-muted-foreground font-mono">
                 <span>{min ?? 0}</span><span className="font-medium text-foreground bg-muted px-1 rounded">{Number(displayVal ?? 0).toFixed(1)}</span><span>{max ?? 100}</span>
             </div>
         </div>
      )}

      {control.type === 'knob' && (
         <div className="w-full h-full flex flex-col justify-center items-center flex-1 py-1">
             <div style={{ transform: `scale(${Math.max(0.3, Math.min((width - 16) / 64, (height - 32) / 64))})`, transformOrigin: 'center center' }}>
                 <Knob value={displayVal as number} min={min ?? 0} max={max ?? 100} onChange={(v) => handleChange({ target: { value: String(v) } } as any)} disabled={isIndicatorDir} />
             </div>
         </div>
      )}

      {control.type === 'tank' && (
         <div className="w-full h-full flex items-center justify-center flex-1 py-1">
             <Tank value={Number(displayVal) || 0} min={min ?? 0} max={max ?? 100} color={colorOn} />
             {!isIndicatorDir && <input type="range" min={min ?? 0} max={max ?? 100} step={step ?? 1} value={displayVal as number} onChange={handleChange} onPointerDown={e => e.stopPropagation()} style={{ writingMode: 'vertical-lr', direction: 'rtl' } as any} className="absolute inset-0 w-full h-full opacity-0 cursor-ns-resize z-10" />}
         </div>
      )}
    </>
  );
}

function ControlItem({ control, transform }: { control: UIControl; transform: { x: number; y: number; scale: number } }) {
  const { updateUIControl, updateNode, pushHistory } = useGraphStore();
  const { selectedControlId, setSelectedControlId } = useUIStore();
  const terminalId = control.bindingNodeId;
  const inputVal = useRuntimeStore(s => s.portValues[`${terminalId}_input`]);
  const [isDragging, setIsDragging] = useState(false);
  const [resizeMode, setResizeMode] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
  const dragMetaRef = useRef<{ pointerId: number | null; element: EventTarget | null; clientX: number; clientY: number; origX: number; origY: number; origW: number; origH: number; }>({ pointerId: null, element: null, clientX: 0, clientY: 0, origX: 0, origY: 0, origW: 0, origH: 0 });
  const originalPosRef = useRef<{ x: number; y: number } | null>(null);

  const handleContextMenu = (e: React.MouseEvent) => {
    // Keep native menu on inputs
    const target = e.target as HTMLElement;
    if (target.closest('input, textarea, select')) return;
    e.preventDefault();
    e.stopPropagation();
    setSelectedControlId(control.id);
    setMenuPos({ x: e.clientX, y: e.clientY });
    setShowMenu(true);
  };

  const handleDelete = () => {
    setShowMenu(false);
    useGraphStore.getState().removeUIControl(control.id);
    useUIStore.getState().setSelectedControlId(null);
  };

  const handleDuplicate = () => {
    setShowMenu(false);
    const newTermId = generateId();
    const newCtrlId = generateId();
    const store = useGraphStore.getState();
    const termNode = store.nodes.find(n => n.id === control.bindingNodeId);
    if (!termNode) return;
    // Find non-overlapping positions for both control and terminal
    const existingControlRects = controlsToRects(store.uiControls.map(c => ({ x: c.x, y: c.y, width: c.width, height: c.height })));
    const desiredCtrl = { x: (control.x ?? 50) + 20, y: (control.y ?? 50) + 20 };
    const freeCtrlPos = findNonOverlappingPosition(desiredCtrl, existingControlRects, { w: control.width || 120, h: control.height || 60 });
    const rootNodes = store.nodes.filter((n: any) => !n.parent);
    const rootRects = nodesToRects(rootNodes.map((n: any) => ({ position: n.position, width: n.width || 120, height: n.height || 60 })));
    const desiredTerm = { x: (termNode.position?.x ?? 0) + 20, y: (termNode.position?.y ?? 0) + 20 };
    const freeTermPos = findNonOverlappingPosition(desiredTerm, rootRects, { w: 64, h: 36 });
    const newTerm = { ...termNode, id: newTermId, position: freeTermPos };
    const newCtrl = { ...control, id: newCtrlId, bindingNodeId: newTermId, x: freeCtrlPos.x, y: freeCtrlPos.y };
    store.addUIControl(newCtrl, newTerm as any);
    useUIStore.getState().setSelectedControlId(newCtrlId);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button === 2) return; // right-click should not start drag
    setSelectedControlId(control.id);
    pushHistory();
    setIsDragging(true);
    setResizeMode(null);
    dragMetaRef.current.pointerId = e.pointerId;
    dragMetaRef.current.element = e.currentTarget;
    dragMetaRef.current.clientX = e.clientX;
    dragMetaRef.current.clientY = e.clientY;
    dragMetaRef.current.origX = control.x ?? 50;
    dragMetaRef.current.origY = control.y ?? 50;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    originalPosRef.current = { x: control.x ?? 50, y: control.y ?? 50 };
  };

  const onResizePointerDown = (mode: string) => (e: React.PointerEvent) => {
    if ((e as any).button === 2) return;
    e.stopPropagation();
    setSelectedControlId(control.id);
    pushHistory();
    setIsDragging(true);
    setResizeMode(mode);
    dragMetaRef.current.pointerId = e.pointerId;
    dragMetaRef.current.element = e.currentTarget;
    dragMetaRef.current.clientX = e.clientX;
    dragMetaRef.current.clientY = e.clientY;
    dragMetaRef.current.origW = control.width || 120;
    dragMetaRef.current.origH = control.height || 60;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragMetaRef.current.clientX;
    const dy = e.clientY - dragMetaRef.current.clientY;
    if (!resizeMode) {
      const totalDx = e.clientX - dragMetaRef.current.clientX;
      const totalDy = e.clientY - dragMetaRef.current.clientY;
      updateUIControl(control.id, { x: dragMetaRef.current.origX + totalDx / transform.scale, y: dragMetaRef.current.origY + totalDy / transform.scale }, true);
    } else {
      let newWidth = dragMetaRef.current.origW;
      let newHeight = dragMetaRef.current.origH;
      if (resizeMode.includes('e')) newWidth = Math.max(36, dragMetaRef.current.origW + dx / transform.scale);
      if (resizeMode.includes('s')) newHeight = Math.max(36, dragMetaRef.current.origH + dy / transform.scale);
      updateUIControl(control.id, { width: newWidth, height: newHeight }, true);
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    setResizeMode(null);
    const meta = dragMetaRef.current;
    meta.pointerId = null; meta.element = null;
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
    if (!resizeMode && originalPosRef.current) {
        const myX = control.x ?? 50; const myY = control.y ?? 50;
        const myW = width; const myH = height;
        const allControls = useGraphStore.getState().uiControls;
        const allNodes = useGraphStore.getState().nodes;
        let overlappingArray: UIControl | null = null; let hasOverlap = false;
        for (const other of allControls) {
            if (other.id === control.id) continue;
            const oX = other.x ?? 50; const oY = other.y ?? 50;
            const oW = other.width || 120; const oH = other.height || 60;
            if (myX < oX + oW && myX + myW > oX && myY < oY + oH && myY + myH > oY) {
                hasOverlap = true;
                if (other.type === 'array' && other.direction === control.direction && control.type !== 'array') { overlappingArray = other; break; }
            }
        }
        if (overlappingArray) {
            const getPortType = (type: string) => { if (type === 'button' || type === 'indicatorLight') return 'boolean'; if (type === 'textLabel') return 'string'; return 'number'; };
            const portType = getPortType(control.type);
            updateUIControl(overlappingArray.id, { elementDef: { ...control, id: undefined }, width: Math.max(overlappingArray.width || 120, 46 + myW), height: Math.max(overlappingArray.height || 60, myH) });
            const currentTerminal = allNodes.find(n => n.id === overlappingArray!.bindingNodeId);
            if (currentTerminal) {
                const isIndicator = overlappingArray!.direction === 'indicator';
                const newInputs = isIndicator ? currentTerminal.inputs.map(p => ({ ...p, type: `${portType}[]` })) : currentTerminal.inputs;
                const newOutputs = !isIndicator ? currentTerminal.outputs.map(p => ({ ...p, type: `${portType}[]` })) : currentTerminal.outputs;
                useGraphStore.getState().updateNode(currentTerminal.id, { inputs: newInputs, outputs: newOutputs });
            }
            useGraphStore.getState().removeNode(control.bindingNodeId);
        } else if (hasOverlap) {
            updateUIControl(control.id, { x: originalPosRef.current!.x, y: originalPosRef.current!.y }, true);
        }
    }
  };

  const [arrayIndex, setArrayIndex] = useState(0);
  const isIndicatorDir = (control.direction || 'control') === 'indicator';
  const isArray = control.type === 'array';
  let displayVal: any;
  if (isArray) {
     const arr = Array.isArray(inputVal) ? inputVal : (Array.isArray(control.defaultValue) ? control.defaultValue : []);
     displayVal = arr[arrayIndex] ?? (control.elementDef?.defaultValue ?? 0);
  } else {
     displayVal = (isIndicatorDir && inputVal !== undefined) ? inputVal : control.defaultValue;
  }

  const handleChange = (e: any) => {
    let newVal = e.target.value;
    const targetType = isArray ? control.elementDef?.type : control.type;
    if (['numberInput', 'slider', 'knob', 'gauge', 'tank'].includes(targetType)) newVal = Number(newVal);
    if (['button', 'indicatorLight'].includes(targetType)) newVal = e.target.checked;
    if (isArray) {
       const arr = Array.isArray(control.defaultValue) ? [...control.defaultValue] : [];
       arr[arrayIndex] = newVal;
       updateUIControl(control.id, { defaultValue: arr });
       updateNode(terminalId, { params: { value: arr } });
    } else {
       updateUIControl(control.id, { defaultValue: newVal });
       updateNode(terminalId, { params: { value: newVal } });
    }
  };

  const width = control.width || 120;
  const height = control.height || 48;
  const colorOn = control.colorOn || '#2E7D32';
  const colorOff = control.colorOff || 'hsl(var(--muted))';
  const min = control.min; const max = control.max; const step = control.step ?? 1;
  const isSelected = selectedControlId === control.id;

  return (
    <div className={`absolute flex flex-col rounded-md transition-colors ${isSelected ? 'bg-accent/40 outline outline-1 outline-ring z-10' : 'hover:outline hover:outline-1 hover:outline-border'} select-none`} style={{ left: control.x ?? 50, top: control.y ?? 50, width, height, cursor: isDragging && !resizeMode ? 'grabbing' : 'grab' }} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp} onContextMenu={handleContextMenu}>
      <div className="absolute bottom-full left-0 mb-1 flex items-center whitespace-nowrap pointer-events-auto cursor-grab z-20">
        <label className="text-[11px] font-medium text-muted-foreground tracking-wide select-none">{control.label}</label>
      </div>

      {control.type === 'array' ? (
        <div className="flex-1 flex flex-row overflow-hidden border border-border bg-card rounded-md shadow-sm">
           <div className="w-9 flex flex-col border-r border-border bg-muted/50 shrink-0">
               <button onPointerDown={(e) => { if ((e as any).button !== 0) return; e.stopPropagation(); setArrayIndex(a => Math.min(99, a + 1)); }} className="h-1/2 flex items-center justify-center hover:bg-accent text-[10px] border-b border-border">▲</button>
               <div className="flex-1 flex items-center justify-center font-mono text-[11px] font-medium">{arrayIndex}</div>
               <button onPointerDown={(e) => { if ((e as any).button !== 0) return; e.stopPropagation(); setArrayIndex(a => Math.max(0, a - 1)); }} className="h-1/2 flex items-center justify-center hover:bg-accent text-[10px] border-t border-border">▼</button>
           </div>
           <div className="flex-1 overflow-hidden relative">
               {control.elementDef ? (
                 <div className="absolute inset-1 flex items-center justify-center">
                   <InnerControlRender control={{...control.elementDef, id: `${control.id}_inner`}} displayVal={displayVal} handleChange={handleChange} width={width-40} height={height} colorOn={control.elementDef.colorOn || '#2E7D32'} colorOff={control.elementDef.colorOff || 'hsl(var(--muted))'} min={control.elementDef.min} max={control.elementDef.max} step={control.elementDef.step} isIndicatorDir={isIndicatorDir} />
                 </div>
               ) : (
                 <div className="w-full h-full flex items-center justify-center"><span className="text-[10px] text-muted-foreground border border-dashed border-border rounded px-2 py-1 bg-muted/30">Drop Element</span></div>
               )}
           </div>
        </div>
      ) : (
        <InnerControlRender control={control} displayVal={displayVal} handleChange={handleChange} width={width} height={height} colorOn={colorOn} colorOff={colorOff} min={min} max={max} step={step} isIndicatorDir={isIndicatorDir} />
      )}

      {isSelected && (
         <>
           <div className="absolute top-0 right-[-4px] bottom-0 w-2 cursor-e-resize z-10 hover:bg-ring/20" onPointerDown={onResizePointerDown('e')} />
           <div className="absolute bottom-[-4px] left-0 right-0 h-2 cursor-s-resize z-10 hover:bg-ring/20" onPointerDown={onResizePointerDown('s')} />
           <div className="absolute bottom-[-5px] right-[-5px] w-2.5 h-2.5 bg-card border border-ring rounded-full shadow-sm cursor-se-resize z-10 hover:scale-110 transition-transform" onPointerDown={onResizePointerDown('se')} />
         </>
      )}

      {showMenu && typeof document !== 'undefined' && createPortal(
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => setShowMenu(false)} onContextMenu={(e) => { e.preventDefault(); setShowMenu(false); }} />
          <div className="fixed z-[9999] bg-popover rounded-lg shadow-xl border border-border py-1 min-w-[160px] text-xs animate-in fade-in zoom-in-95" style={{ left: menuPos.x, top: menuPos.y }}>
            <div className="px-3 py-1 text-[11px] font-medium text-muted-foreground truncate">{control.label}</div>
            <div className="h-px bg-border my-1 mx-2" />
            <button className="w-full text-left px-3 py-1.5 hover:bg-accent hover:text-accent-foreground flex items-center gap-2" onClick={() => { setShowMenu(false); setSelectedControlId(control.id); }}>
              <span className="w-4 text-center">⚙</span>Properties
            </button>
            <button className="w-full text-left px-3 py-1.5 hover:bg-accent hover:text-accent-foreground flex items-center gap-2" onClick={handleDuplicate}>
              <span className="w-4 text-center">⎘</span>Duplicate
            </button>
            <div className="h-px bg-border my-1 mx-2" />
            <button className="w-full text-left px-3 py-1.5 hover:bg-destructive/10 text-destructive flex items-center gap-2" onClick={handleDelete}>
              <span className="w-4 text-center">🗑</span>Delete Control
            </button>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}

export const FrontPanel = forwardRef<{ screenToPanelPosition: (screenX: number, screenY: number) => { x: number; y: number } }, { containerRef?: React.RefObject<HTMLDivElement | null> }>(({ containerRef }, ref) => {
  const { uiControls } = useGraphStore();
  const { setSelectedControlId } = useUIStore();
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isPanning, setIsPanning] = useState(false);
  const internalRef = useRef<HTMLDivElement>(null);
  const panRef = useRef<{ clientX: number; clientY: number; tx: number; ty: number } | null>(null);

  useImperativeHandle(ref, () => ({
    screenToPanelPosition: (screenX: number, screenY: number) => {
      const rect = internalRef.current?.getBoundingClientRect();
      if (!rect) return { x: screenX, y: screenY };
      const safeScale = transform.scale === 0 ? 1 : transform.scale;
      return { x: (screenX - rect.left - transform.x) / safeScale, y: (screenY - rect.top - transform.y) / safeScale };
    }
  }));

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const rect = internalRef.current?.getBoundingClientRect();
      if (!rect) return;
      const mouseX = e.clientX - rect.left; const mouseY = e.clientY - rect.top;
      const zoomFactor = Math.pow(0.999, e.deltaY);
      const newScale = Math.max(0.1, Math.min(5, transform.scale * zoomFactor));
      const safeScale = transform.scale === 0 ? 1 : transform.scale;
      const newX = mouseX - (mouseX - transform.x) * (newScale / safeScale);
      const newY = mouseY - (mouseY - transform.y) * (newScale / safeScale);
      setTransform({ x: newX, y: newY, scale: newScale });
    } else {
      setTransform(t => ({ ...t, x: t.x - e.deltaX, y: t.y - e.deltaY }));
    }
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.target === e.currentTarget) {
      setSelectedControlId(null);
      if (e.button === 0 || e.button === 1) {
          setIsPanning(true);
          panRef.current = { clientX: e.clientX, clientY: e.clientY, tx: transform.x, ty: transform.y };
          e.currentTarget.setPointerCapture(e.pointerId);
      }
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (isPanning && panRef.current) {
      const dx = e.clientX - panRef.current.clientX;
      const dy = e.clientY - panRef.current.clientY;
      setTransform({ x: panRef.current.tx + dx, y: panRef.current.ty + dy, scale: transform.scale });
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (isPanning) {
      setIsPanning(false);
      panRef.current = null;
      try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
    }
  };

  const panelCallbackRef = (node: HTMLDivElement | null) => {
    internalRef.current = node;
    if (containerRef) {
      // eslint-disable-next-line react-hooks/immutability
      (containerRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
    }
  };

  return (
    <div ref={panelCallbackRef} className={`w-full h-full relative overflow-hidden flex-grow select-none ${isPanning ? 'cursor-grabbing' : 'cursor-grab'} bg-canvas-bg`} style={{ backgroundImage: 'radial-gradient(hsl(var(--border)) 1px, transparent 1px)', backgroundSize: `${16 * transform.scale}px ${16 * transform.scale}px`, backgroundPosition: `${transform.x}px ${transform.y}px` }} onWheel={handleWheel} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp} onDragOver={(e) => e.preventDefault()}>
      <div className="absolute inset-0 pointer-events-none" style={{ transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`, transformOrigin: '0 0' }}>
        <div className="pointer-events-auto">
          {uiControls.map(c => (<ControlItem key={c.id} control={c} transform={transform} />))}
        </div>
      </div>
    </div>
  );
});
