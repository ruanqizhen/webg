import { useState, useEffect, useRef } from 'react';
import { useGraphStore } from '../../store/useGraphStore';
import { useUIStore } from '../../store/useUIStore';
import { useRuntimeStore } from '../../store/useRuntimeStore';
import type { UIControl } from '../../types/graph';

function Gauge({ value, min, max, color }: { value: number; min: number; max: number; color: string }) {
  const percentage = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
  const rotation = (percentage / 100) * 180 - 90; // -90 to 90 degrees

  return (
    <div className="relative w-24 h-12 overflow-hidden">
      {/* Silver Bezel */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[104px] h-[104px] rounded-full border-[2px] border-gray-400 bg-gradient-to-br from-gray-100 to-gray-300 shadow-md"
        style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}
      />
      {/* Gauge background (semi-circle) */}
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-24 h-24 rounded-full border-[12px] border-[#e0e0e0] shadow-[inset_0_2px_5px_rgba(0,0,0,0.3)] z-10"
        style={{ borderTopLeftRadius: '100%', borderTopRightRadius: '100%', borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}
      />
      {/* Colored arc overlay */}
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-24 h-24"
        style={{
          background: `conic-gradient(from 180deg at 50% 50%, ${color} 0deg, ${color} ${percentage * 1.8}deg, transparent ${percentage * 1.8}deg, transparent 180deg)`,
          borderTopLeftRadius: '100%',
          borderTopRightRadius: '100%',
          borderBottomLeftRadius: 0,
          borderBottomRightRadius: 0,
        }}
      />
      {/* Center cap - Metallic */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-gradient-to-br from-gray-400 to-gray-700 shadow-[0_2px_4px_rgba(0,0,0,0.5)] z-30 flex items-center justify-center">
         <div className="w-2 h-2 rounded-full bg-gray-800 shadow-inner"></div>
      </div>
      {/* Needle */}
      <div
        className="absolute bottom-0 left-1/2 w-0.5 h-10 bg-red-600 origin-bottom transition-transform duration-300 shadow-md z-20"
        style={{
          transform: `translateX(-50%) rotate(${rotation}deg)`,
          bottom: '1px',

        }}
      />
      {/* Min/Max labels */}
      <span className="absolute bottom-0 left-0 text-[9px] text-gray-500">{min}</span>
      <span className="absolute bottom-0 right-0 text-[9px] text-gray-500">{max}</span>
    </div>
  );
}

function Knob({ value, min, max, onChange, disabled }: { value: number; min: number; max: number; onChange?: (v: number) => void; disabled?: boolean }) {
  const percentage = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
  const rotation = percentage * 2.7 - 135; // mapping 0-100% to -135deg to +135deg

  const handlePointerDown = (e: React.PointerEvent) => {
    if (disabled || e.button !== 0) return;
    e.stopPropagation();
    
    const startY = e.clientY;
    const startVal = value;

    const handlePointerMove = (moveEvent: PointerEvent) => {
        const deltaY = startY - moveEvent.clientY; // upward drag increases
        const range = max - min;
        // 150px drag = full range
        let newVal = startVal + (deltaY / 150) * range;
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
    <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-gray-200 to-gray-400 shadow-xl border-4 border-gray-100 touch-none flex items-center justify-center cursor-ns-resize mx-auto"
         onPointerDown={handlePointerDown}
    >
      <div 
         className="w-[46px] h-[46px] rounded-full bg-gradient-to-tr from-gray-300 to-gray-500 shadow-inner transition-transform duration-75 relative z-10 pointer-events-none"
         style={{ transform: `rotate(${rotation}deg)` }}
      >
         <div className="absolute top-1 left-1/2 -translate-x-1/2 w-1.5 h-3 bg-gray-800 rounded-full shadow-[0_1px_1px_rgba(255,255,255,0.5)]"></div>
         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full border border-gray-400/50"></div>
      </div>
      <div className="absolute -bottom-3 text-[9px] text-gray-500 font-mono w-full text-center pointer-events-none">{Number(value).toFixed(1)}</div>
    </div>
  );
}

function Tank({ value, min, max, color }: { value: number; min: number; max: number; color: string }) {
  const percentage = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
  
  return (
    <div className="relative w-12 h-full min-h-[100px] bg-gray-200 rounded-md border-[3px] border-[#9ca3af] shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col justify-end mx-auto">
       <div 
          className="w-full transition-all duration-300 opacity-90 shadow-[0_-2px_10px_rgba(0,0,0,0.3)] relative group"
          style={{ height: `${percentage}%`, backgroundColor: color }}
       >
          <div className="w-full h-1 bg-white/40"></div>
          {/* Bubbles effect */}
          <div className="absolute bottom-2 left-2 w-1.5 h-1.5 rounded-full bg-white/30"></div>
          <div className="absolute bottom-6 left-6 w-2 h-2 rounded-full bg-white/30"></div>
          <div className="absolute bottom-4 right-3 w-1 h-1 rounded-full bg-white/30"></div>
       </div>
       <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-transparent to-white/20 pointer-events-none border border-black/10"></div>
       <div className="absolute bottom-0 w-full bg-black/30 backdrop-blur-[1px] text-center text-white text-[10px] font-mono font-bold drop-shadow-md z-10 py-0.5 pointer-events-none select-none">{Number(value).toFixed(1)}</div>
    </div>
  );
}

function ControlItem({ control }: { control: UIControl }) {
  const { updateUIControl, updateNode } = useGraphStore();
  const { selectedControlId, setSelectedControlId } = useUIStore();
  const portValues = useRuntimeStore(s => s.portValues);
  const isRunning = useRuntimeStore(s => s.isRunning);

  const terminalId = control.bindingNodeId;
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ pointerId: number | null; element: EventTarget | null }>({ pointerId: null, element: null });

  const onPointerDown = (e: React.PointerEvent) => {
    setSelectedControlId(control.id);
    setIsDragging(true);
    dragRef.current.pointerId = e.pointerId;
    dragRef.current.element = e.currentTarget;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (isDragging) {
      updateUIControl(control.id, {
        x: (control.x || 0) + e.movementX,
        y: (control.y || 0) + e.movementY,
      });
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    dragRef.current.pointerId = null;
    dragRef.current.element = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (err) {
      // Pointer may already be released, ignore
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (dragRef.current.element && dragRef.current.pointerId !== null) {
        try {
          (dragRef.current.element as HTMLElement).releasePointerCapture(dragRef.current.pointerId);
        } catch (err) {
          // Ignore
        }
      }
    };
  }, []);

  const handleChange = (e: any) => {
    let newVal = e.target.value;
    if (control.type === 'numberInput') newVal = Number(newVal);
    if (control.type === 'button') newVal = e.target.checked;

    updateUIControl(control.id, { defaultValue: newVal });
    updateNode(terminalId, { params: { value: newVal } });
  }

  const inputVal = portValues[`${terminalId}_input`];
  const displayVal = inputVal !== undefined ? inputVal : control.defaultValue;

  const isIndicatorDir = (control.direction || 'control') === 'indicator';

  // Control dimensions
  const width = control.width || (control.type === 'gauge' ? 120 : control.type === 'indicatorLight' || control.type === 'button' ? 80 : 140);
  const height = control.height || (control.type === 'gauge' ? 100 : control.type === 'indicatorLight' || control.type === 'button' ? 60 : 60);

  // Colors for button and indicator light
  const colorOn = control.colorOn || '#4CAF50';
  const colorOff = control.colorOff || '#cccccc';

  // Min/Max/Step for number input
  const min = control.min !== undefined ? control.min : undefined;
  const max = control.max !== undefined ? control.max : undefined;
  const step = control.step !== undefined ? control.step : 1;

  return (
    <div
      className={`absolute flex flex-col gap-1 p-2 rounded ${selectedControlId === control.id ? 'bg-blue-50/50 outline outline-1 outline-blue-400 cursor-grabbing' : 'hover:outline hover:outline-1 hover:outline-gray-300 cursor-grab'} select-none transition-all duration-200`}
      style={{ left: control.x || 50, top: control.y || 50, width: width, minHeight: height }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      <div className="flex items-center justify-between mb-1">
        <label className="text-xs font-bold text-gray-600 drop-shadow-sm pointer-events-none cursor-inherit select-none">
          {control.label}
        </label>
      </div>

      {control.type === 'numberInput' && (
         <div 
           className="flex bg-[#e8e8e8] shadow-[inset_0_2px_5px_rgba(0,0,0,0.3)] border border-gray-400 rounded p-1"
           onPointerDown={e => Object.assign(e, { cancelBubble: true })}
         >
           <input
             type="number"
             value={isIndicatorDir ? displayVal : control.defaultValue}
             onChange={isIndicatorDir ? undefined : handleChange}
             min={min}
             max={max}
             step={step}
             className="bg-transparent text-right font-mono font-semibold text-gray-800 w-full focus:outline-none focus:text-blue-600"
             disabled={isRunning || isIndicatorDir}
             readOnly={isIndicatorDir}
           />
         </div>
      )}

      {control.type === 'button' && (
         <div className="w-full h-full flex items-center justify-center p-1" onPointerDown={e => Object.assign(e, { cancelBubble: true })}>
           <label className="relative inline-flex items-center cursor-pointer select-none">
             <input
               type="checkbox"
               checked={control.defaultValue}
               onChange={handleChange}
               disabled={isRunning}
               className="sr-only peer"
             />
             <div className={`w-14 h-8 rounded-full shadow-[inset_0_3px_6px_rgba(0,0,0,0.4)] border border-gray-400 transition-colors drop-shadow-sm`} 
                  style={{ backgroundColor: control.defaultValue ? colorOn : colorOff }}
             >
                <div className={`absolute top-[2px] left-[2px] bg-gradient-to-b from-gray-100 to-gray-400 border border-gray-500 shadow-[0_2px_4px_rgba(0,0,0,0.5)] rounded-full h-6 w-6 transition-all duration-200 flex items-center justify-center ${control.defaultValue ? 'translate-x-[24px]' : ''}`}>
                   <div className="flex gap-[2px]">
                      <div className="w-0.5 h-3 bg-gray-500/50 rounded-full"></div>
                      <div className="w-0.5 h-3 bg-gray-500/50 rounded-full"></div>
                      <div className="w-0.5 h-3 bg-gray-500/50 rounded-full"></div>
                   </div>
                </div>
             </div>
           </label>
         </div>
      )}

      {control.type === 'numberIndicator' && (
         <div className="bg-[#111] px-3 py-2 text-xl rounded shadow-[inset_0_4px_10px_rgba(0,0,0,1)] border-b border-r border-gray-500 border-t-2 border-l-2 border-t-black border-l-black text-right font-mono flex-1 flex items-center justify-end overflow-hidden relative">
           <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
           <span className="text-[#39ff14] drop-shadow-[0_0_8px_rgba(57,255,20,0.9)] z-10 select-all">
             {Number(displayVal).toFixed(2)}
           </span>
         </div>
      )}

      {control.type === 'textLabel' && (
         <div className="bg-gradient-to-b from-[#f8f8f0] to-[#e8e8e0] px-3 py-1.5 text-sm rounded border border-gray-400 text-gray-800 min-w-[6rem] font-medium text-center relative overflow-hidden flex-1 shadow-[0_2px_4px_rgba(0,0,0,0.2)]">
           <div className="absolute left-1 top-1 w-1.5 h-1.5 rounded-full shadow-[inset_0_1px_2px_rgba(0,0,0,0.6)] bg-gray-400 flex items-center justify-center"><div className="w-full h-px bg-gray-600 rotate-45"></div></div>
           <div className="absolute right-1 top-1 w-1.5 h-1.5 rounded-full shadow-[inset_0_1px_2px_rgba(0,0,0,0.6)] bg-gray-400 flex items-center justify-center"><div className="w-full h-px bg-gray-600 -rotate-12"></div></div>
           <div className="absolute left-1 bottom-1 w-1.5 h-1.5 rounded-full shadow-[inset_0_1px_2px_rgba(0,0,0,0.6)] bg-gray-400 flex items-center justify-center"><div className="w-full h-px bg-gray-600 -rotate-45"></div></div>
           <div className="absolute right-1 bottom-1 w-1.5 h-1.5 rounded-full shadow-[inset_0_1px_2px_rgba(0,0,0,0.6)] bg-gray-400 flex items-center justify-center"><div className="w-full h-px bg-gray-600 rotate-12"></div></div>
           <span className="relative z-10 pointer-events-none drop-shadow-sm select-all">{String(displayVal)}</span>
         </div>
      )}

      {control.type === 'indicatorLight' && (
         <div className="relative mx-auto w-10 h-10 rounded-full bg-gradient-to-br from-gray-200 to-gray-500 p-[2px] shadow-[0_3px_6px_rgba(0,0,0,0.4)] flex items-center justify-center">
            {/* Inner Dark Cavity */}
            <div className="w-full h-full rounded-full bg-[#333] p-[2px] shadow-[inset_0_3px_5px_rgba(0,0,0,0.8)] border border-gray-600">
               {/* Glowing Bulb Surface */}
               <div
                 className="w-full h-full rounded-full transition-all duration-300 relative overflow-hidden"
                 style={{
                   background: displayVal ? `radial-gradient(circle at 35% 35%, #fff 5%, ${colorOn} 40%, #000 95%)` : `radial-gradient(circle at 35% 35%, #666 5%, #222 40%, #000 95%)`,
                   boxShadow: displayVal ? `0 0 15px 3px ${colorOn}` : 'none',
                 }}
               >
                 {displayVal && <div className="absolute top-[10%] left-[20%] w-[30%] h-[15%] bg-white rounded-full opacity-70 blur-[1px] rotate-[-40deg]" />}
                 {!displayVal && <div className="absolute top-[10%] left-[20%] w-[30%] h-[15%] bg-white rounded-full opacity-10 blur-[1px] rotate-[-40deg]" />}
               </div>
            </div>
         </div>
      )}

      {control.type === 'gauge' && (
        <div className="flex-1 flex items-center justify-center">
          <Gauge
            value={Number(displayVal) || 0}
            min={min ?? 0}
            max={max ?? 100}
            color={colorOn}
          />
        </div>
      )}

      {control.type === 'slider' && (
         <div className="w-full h-full flex flex-col justify-center px-1" onPointerDown={e => Object.assign(e, { cancelBubble: true })}>
             <input 
                type="range"
                min={min ?? 0}
                max={max ?? 100}
                step={step ?? 1}
                value={isIndicatorDir ? displayVal : control.defaultValue}
                onChange={isIndicatorDir ? undefined : handleChange}
                disabled={isRunning || isIndicatorDir}
                className="w-full h-1.5 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-blue-600 focus:outline-none"
             />
             <div className="flex justify-between items-center mt-2 group px-0.5">
                 <span className="text-[9px] text-gray-400">{min ?? 0}</span>
                 <span className="text-[10px] font-mono font-semibold text-blue-600 bg-blue-50 px-1 py-0.5 rounded">{Number(displayVal).toFixed(1)}</span>
                 <span className="text-[9px] text-gray-400">{max ?? 100}</span>
             </div>
         </div>
      )}

      {control.type === 'knob' && (
         <div className="w-full h-full flex flex-col justify-center flex-1 py-2">
             <Knob
                value={isIndicatorDir ? displayVal : control.defaultValue}
                min={min ?? 0}
                max={max ?? 100}
                onChange={(v) => { if (!isIndicatorDir && !isRunning) handleChange({ target: { value: String(v) } } as any); }}
                disabled={isRunning || isIndicatorDir}
             />
         </div>
      )}

      {control.type === 'tank' && (
         <div className="w-full h-full flex items-center justify-center flex-1 py-2">
             <Tank
                value={Number(displayVal) || 0}
                min={min ?? 0}
                max={max ?? 100}
                color={colorOn}
             />
         </div>
      )}
    </div>
  );
}

export function FrontPanel({ containerRef }: { containerRef?: React.RefObject<HTMLDivElement | null> }) {
  const { uiControls } = useGraphStore();
  const { setSelectedControlId } = useUIStore();

  return (
    <div 
      ref={containerRef}
      className="w-full h-full relative overflow-hidden flex-grow"
      style={{
        backgroundColor: '#f8fafc',
        backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)',
        backgroundSize: '16px 16px',
      }}
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) setSelectedControlId(null);
      }}
      onDragOver={(e) => e.preventDefault()}
    >
      {uiControls.map(c => (
        <ControlItem key={c.id} control={c} />
      ))}
    </div>
  );
}
