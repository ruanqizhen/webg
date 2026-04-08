import { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { useGraphStore } from '../../store/useGraphStore';
import { useUIStore } from '../../store/useUIStore';
import { useRuntimeStore } from '../../store/useRuntimeStore';
import type { UIControl } from '../../types/graph';

function Gauge({ value, min, max, color }: { value: number; min: number; max: number; color: string }) {
  const percentage = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
  const rotation = percentage * 1.8 - 90; // -90 to 90 degrees

  return (
    <div className="relative w-[144px] h-[76px] flex justify-center items-end drop-shadow-md pb-2">
      {/* Outer Casing - Metallic */}
      <div className="absolute -bottom-[2px] w-[136px] h-[68px] rounded-t-full bg-gradient-to-b from-gray-200 to-gray-500 border-[3px] border-b-0 border-[#d1d5db] shadow-xl overflow-hidden">
          {/* Inner dark dial */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[116px] h-[58px] rounded-t-full bg-[#111] shadow-[inset_0_5px_10px_rgba(0,0,0,0.9)] border border-b-0 border-gray-600">
          </div>
      </div>

      {/* SVG Arc and Ticks */}
      <div className="absolute bottom-0 w-[116px] h-[58px] overflow-visible mix-blend-screen isolate pointer-events-none z-10 rounded-t-full">
         <svg viewBox="0 0 116 58" className="w-full h-full overflow-visible">
            {/* Background Arc */}
            <path d="M 13 58 A 45 45 0 0 1 103 58" fill="none" stroke="#333" strokeWidth="6" strokeLinecap="round" />
            
            {/* Active Color Sweep */}
            <path 
               d="M 13 58 A 45 45 0 0 1 103 58" 
               fill="none" 
               stroke={color} 
               strokeWidth="6" 
               strokeDasharray="141.37" 
               strokeDashoffset={141.37 - (percentage / 100) * 141.37} 
               strokeLinecap="round" 
               style={{ transition: 'stroke-dashoffset 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}
            />

            {/* Ticks */}
            {[...Array(21)].map((_, i) => {
              const angle = 180 - (i * 9); // 180 to 0
              const rad = (angle * Math.PI) / 180;
              const isMajor = i % 5 === 0;
              const r1 = isMajor ? 50 : 54;
              const r2 = 58;
              const x1 = 58 + r1 * Math.cos(rad);
              const y1 = 58 - r1 * Math.sin(rad);
              const x2 = 58 + r2 * Math.cos(rad);
              const y2 = 58 - r2 * Math.sin(rad);
              // Calculate text positions for major ticks
              const tx = 58 + 40 * Math.cos(rad);
              const ty = 58 - 38 * Math.sin(rad);
              const tickVal = min + (i / 20) * (max - min);
              
              return (
                <g key={i}>
                  <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={isMajor ? '#e5e7eb' : '#6b7280'} strokeWidth={isMajor ? 2 : 1} />
                  {isMajor && angle !== 0 && angle !== 180 && (
                    <text x={tx} y={ty} fill="#9ca3af" fontSize="6px" fontWeight="bold" fontFamily="monospace" textAnchor="middle" dominantBaseline="middle" opacity="0.8">
                      {Math.round(tickVal)}
                    </text>
                  )}
                </g>
              )
            })}
         </svg>
      </div>

      {/* Min/Max/Current Value Labels */}
      <span className="absolute bottom-1 left-3 text-[8px] font-mono font-bold text-gray-300 z-20 drop-shadow-md">{min}</span>
      <span className="absolute bottom-1 right-3 text-[8px] font-mono font-bold text-gray-300 z-20 drop-shadow-md">{max}</span>
      
      <div className="absolute bottom-[20px] text-[10px] font-mono font-bold text-[#0f0] drop-shadow-[0_0_3px_#0f0] z-20 bg-black/60 px-1.5 py-0.5 rounded shadow-inner leading-none border border-gray-800 tracking-wider">
         {Number(value).toFixed(1)}
      </div>

      {/* Realistic Needle */}
      <div className="absolute bottom-[-5px] left-1/2 w-[5px] h-[58px] -translate-x-1/2 origin-[center_100%] transition-transform duration-300 ease-out z-30 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] filter"
           style={{ transform: `rotate(${rotation}deg)` }}
      >
         <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[2.5px] border-r-[2.5px] border-b-[58px] border-l-transparent border-r-transparent border-b-[#dc2626]"></div>
         <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[1.25px] border-r-[1.25px] border-b-[58px] border-l-transparent border-r-transparent border-b-white/30"></div>
      </div>

      {/* Center cap - Brushed metal look */}
      <div className="absolute bottom-[-10px] left-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-gradient-to-br from-gray-300 to-gray-600 shadow-[0_3px_6px_rgba(0,0,0,0.7)] z-40 flex items-center justify-center border-2 border-gray-400">
         <div className="w-3.5 h-3.5 rounded-full bg-gradient-to-br from-gray-800 to-gray-900 shadow-[inset_0_1px_3px_rgba(0,0,0,1)] flex items-center justify-center">
            <div className="w-1 h-1 rounded-full bg-gray-500"></div>
         </div>
         <div className="absolute w-[80%] h-px bg-white/40 rotate-45 shadow-[0_1px_0_rgba(0,0,0,0.2)]"></div>
         <div className="absolute w-px h-[80%] bg-white/40 rotate-45 shadow-[1px_0_0_rgba(0,0,0,0.2)]"></div>
      </div>
    </div>
  );
}

function Knob({ value, min, max, onChange, disabled }: { value: number; min: number; max: number; onChange?: (v: number) => void; disabled?: boolean }) {
  const percentage = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
  const rotation = percentage * 2.7 - 135; // mapping 0-100% to -135deg to +135deg

  const handlePointerDown = (e: React.PointerEvent) => {
    if (disabled || e.button !== 0) return;
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const startVal = value;

    const handlePointerMove = (moveEvent: PointerEvent) => {
        const deltaY = startY - moveEvent.clientY; // upward drag increases
        const deltaX = moveEvent.clientX - startX; // rightward drag increases
        const range = max - min;
        // 150px drag = full range
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
    <div className="relative w-full max-w-[60%] h-full min-h-[50px] bg-gray-200 rounded-md border-[3px] border-[#9ca3af] shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col justify-end mx-auto">
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

function ControlItem({ control, transform }: { control: UIControl; transform: { x: number; y: number; scale: number } }) {
  const { updateUIControl, updateNode, pushHistory } = useGraphStore();
  const { selectedControlId, setSelectedControlId } = useUIStore();
  
  const terminalId = control.bindingNodeId;
  const inputVal = useRuntimeStore(s => s.portValues[`${terminalId}_input`]);
  const [isDragging, setIsDragging] = useState(false);
  const [resizeMode, setResizeMode] = useState<string | null>(null);
  const dragRef = useRef<{ pointerId: number | null; element: EventTarget | null }>({ pointerId: null, element: null });

  const onPointerDown = (e: React.PointerEvent) => {
    setSelectedControlId(control.id);
    pushHistory(); // Save state before starting drag
    setIsDragging(true);
    setResizeMode(null);
    dragRef.current.pointerId = e.pointerId;
    dragRef.current.element = e.currentTarget;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onResizePointerDown = (mode: string) => (e: React.PointerEvent) => {
    e.stopPropagation();
    setSelectedControlId(control.id);
    pushHistory(); // Save state before starting resize
    setIsDragging(true);
    setResizeMode(mode);
    dragRef.current.pointerId = e.pointerId;
    dragRef.current.element = e.currentTarget;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (isDragging) {
      if (!resizeMode) {
        updateUIControl(control.id, {
          x: (control.x || 0) + e.movementX / transform.scale,
          y: (control.y || 0) + e.movementY / transform.scale,
        }, true); // skipHistory during drag
      } else {
        const currentWidth = control.width || (control.type === 'gauge' ? 120 : control.type === 'indicatorLight' || control.type === 'button' ? 80 : 140);
        const currentHeight = control.height || (control.type === 'gauge' ? 100 : control.type === 'indicatorLight' || control.type === 'button' ? 60 : 60);
        
        let newWidth = currentWidth;
        let newHeight = currentHeight;
        
        if (resizeMode.includes('e')) newWidth = Math.max(30, currentWidth + e.movementX / transform.scale);
        if (resizeMode.includes('s')) newHeight = Math.max(30, currentHeight + e.movementY / transform.scale);
        
        updateUIControl(control.id, {
          width: newWidth,
          height: newHeight,
        }, true); // skipHistory during resize
      }
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    setResizeMode(null);
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

  const isIndicatorDir = (control.direction || 'control') === 'indicator';
  const displayVal = (isIndicatorDir && inputVal !== undefined) ? inputVal : control.defaultValue;

  const handleChange = (e: any) => {
    let newVal = e.target.value;
    if (['numberInput', 'slider', 'knob', 'gauge', 'tank'].includes(control.type)) newVal = Number(newVal);
    if (['button', 'indicatorLight'].includes(control.type)) newVal = e.target.checked;

    updateUIControl(control.id, { defaultValue: newVal });
    updateNode(terminalId, { params: { value: newVal } });
  }

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

  const isSelected = selectedControlId === control.id;

  return (
    <div
      className={`absolute flex flex-col rounded ${isSelected ? 'bg-blue-50/50 outline outline-1 outline-blue-400 z-10' : 'hover:outline hover:outline-1 hover:outline-gray-300'} select-none transition-all duration-200`}
      style={{ left: control.x || 50, top: control.y || 50, width: width, height: height, minHeight: height, cursor: isDragging && !resizeMode ? 'move' : 'move' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <div className="absolute bottom-full left-0 mb-1 flex items-center whitespace-nowrap pointer-events-auto cursor-move z-20">
        <label className="text-xs font-bold text-gray-600 drop-shadow-sm cursor-inherit select-none">
          {control.label}
        </label>
      </div>

      {control.type === 'numberInput' && (
          <div 
           className="flex-1 flex items-center bg-[#e8e8e8] shadow-[inset_0_2px_5px_rgba(0,0,0,0.3)] border border-gray-400 rounded p-1"
         >
           <input
             type="number"
             value={displayVal}
             onChange={handleChange}
             min={min}
             max={max}
             step={step}
             className="bg-transparent text-center font-mono font-semibold text-gray-800 w-full h-full focus:outline-none focus:text-blue-600"
             style={{ fontSize: `${Math.max(14, Math.min(height / 2, width / 6))}px` }}
             disabled={isIndicatorDir}
             onPointerDown={e => e.stopPropagation()}
           />
         </div>
      )}

      {control.type === 'button' && (
          <div className="w-full h-full flex items-center justify-center p-1">
            <label className="relative inline-flex items-center cursor-pointer select-none"
                   style={{ transform: `scale(${Math.max(0.5, Math.min((width - 8) / 60, (height - 30) / 40))})`, transformOrigin: 'center center' }}
                   onPointerDown={e => e.stopPropagation()}
            >
              <input
                type="checkbox"
                checked={displayVal as boolean}
                onChange={handleChange}
                disabled={isIndicatorDir}
                className="sr-only peer"
              />
              <div className={`w-14 h-8 rounded-full shadow-[inset_0_3px_6px_rgba(0,0,0,0.4)] border border-gray-400 transition-colors drop-shadow-sm`} 
                   style={{ backgroundColor: displayVal ? colorOn : colorOff }}
              >
                 <div className={`absolute top-[2px] left-[2px] bg-gradient-to-b from-gray-100 to-gray-400 border border-gray-500 shadow-[0_2px_4px_rgba(0,0,0,0.5)] rounded-full h-6 w-6 transition-all duration-200 flex items-center justify-center ${displayVal ? 'translate-x-[24px]' : ''}`}>
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
         <div className="flex-1 flex items-center justify-center relative">
            <div style={{ transform: `scale(${Math.max(0.2, Math.min((width - 16) / 40, (height - 40) / 40))})`, transformOrigin: 'center center' }}>
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
            </div>
            {!isIndicatorDir && (
               <input type="checkbox" checked={displayVal as boolean} onChange={handleChange} onPointerDown={e => e.stopPropagation()} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-50 m-0" />
            )}
         </div>
      )}

      {control.type === 'gauge' && (
        <div className="flex-1 flex items-center justify-center overflow-hidden relative">
          <div style={{ transform: `scale(${Math.max(0.2, Math.min((width - 16) / 144, (height - 40) / 84))})`, transformOrigin: 'center center' }}>
             <Gauge
              value={Number(displayVal) || 0}
              min={min ?? 0}
              max={max ?? 100}
              color={colorOn}
            />
          </div>
          {!isIndicatorDir && (
             <input type="range" min={min ?? 0} max={max ?? 100} step={step ?? 1} value={displayVal} onChange={handleChange} onPointerDown={e => e.stopPropagation()} className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-50 m-0" />
          )}
        </div>
      )}

      {control.type === 'slider' && (
         <div className="w-full h-full flex-1 flex flex-col justify-around py-2 px-1">
             <style>{`
                .slider-${control.id}::-webkit-slider-thumb {
                  -webkit-appearance: none;
                  appearance: none;
                  width: ${Math.max(16, height * 0.2)}px;
                  height: ${Math.max(16, height * 0.2)}px;
                  background: #2563eb;
                  border-radius: 50%;
                  cursor: pointer;
                  box-shadow: 0 1px 3px rgba(0,0,0,0.4);
                }
                .slider-${control.id}::-moz-range-thumb {
                  width: ${Math.max(16, height * 0.2)}px;
                  height: ${Math.max(16, height * 0.2)}px;
                  background: #2563eb;
                  border-radius: 50%;
                  cursor: pointer;
                  border: none;
                  box-shadow: 0 1px 3px rgba(0,0,0,0.4);
                }
             `}</style>
             <div className="flex-1 flex flex-col justify-center">
                 <input 
                    type="range"
                    min={min ?? 0}
                    max={max ?? 100}
                    step={step ?? 1}
                    value={displayVal}
                    onChange={handleChange}
                    disabled={isIndicatorDir}
                    className={`w-full bg-gray-300 rounded-lg appearance-none cursor-ew-resize accent-blue-600 focus:outline-none slider-${control.id}`}
                    style={{ height: `${Math.max(6, height * 0.1)}px` }}
                    onPointerDown={e => e.stopPropagation()}
                 />
             </div>
             <div className="flex justify-between items-center mt-auto group px-0.5 shrink-0" style={{ fontSize: `${Math.max(9, height * 0.15)}px` }}>
                 <span className="text-gray-400">{min ?? 0}</span>
                 <span className="font-mono font-semibold text-blue-600 bg-blue-50 px-1 py-0.5 rounded" style={{ fontSize: `${Math.max(10, height * 0.16)}px` }}>{Number(displayVal).toFixed(1)}</span>
                 <span className="text-gray-400">{max ?? 100}</span>
             </div>
         </div>
      )}

      {control.type === 'knob' && (
         <div className="w-full h-full flex flex-col justify-center items-center flex-1 py-1">
             <div style={{ transform: `scale(${Math.max(0.2, Math.min((width - 16) / 64, (height - 40) / 72))})`, transformOrigin: 'center center' }}>
                 <Knob
                    value={displayVal}
                    min={min ?? 0}
                    max={max ?? 100}
                    onChange={(v) => handleChange({ target: { value: String(v) } })}
                    disabled={isIndicatorDir}
                 />
             </div>
         </div>
      )}

      {control.type === 'tank' && (
         <div className="w-full h-full flex items-center justify-center flex-1 py-1 relative">
             <Tank
                value={Number(displayVal) || 0}
                min={min ?? 0}
                max={max ?? 100}
                color={colorOn}
             />
             {!isIndicatorDir && (
                <input type="range" min={min ?? 0} max={max ?? 100} step={step ?? 1} value={displayVal as number} onChange={handleChange} onPointerDown={e => e.stopPropagation()} style={{ appearance: 'slider-vertical', writingMode: 'bt-lr' } as any} className="absolute inset-0 w-full h-full opacity-0 cursor-ns-resize z-50 m-0" />
             )}
         </div>
      )}

      {/* Resize Handles */}
      {isSelected && (
         <>
           {/* East Handle */}
           <div 
             className="absolute top-0 right-[-4px] bottom-0 w-[8px] cursor-e-resize z-50 hover:bg-blue-400/50 transition-colors"
             onPointerDown={onResizePointerDown('e')}
           />
           {/* South Handle */}
           <div 
             className="absolute bottom-[-4px] left-0 right-0 h-[8px] cursor-s-resize z-50 hover:bg-blue-400/50 transition-colors"
             onPointerDown={onResizePointerDown('s')}
           />
           {/* South-East Handle */}
           <div 
             className="absolute bottom-[-6px] right-[-6px] w-[12px] h-[12px] bg-white border-2 border-blue-500 cursor-se-resize z-50 rounded-full shadow-sm hover:scale-125 transition-transform"
             onPointerDown={onResizePointerDown('se')}
           />
         </>
      )}
    </div>
  );
}

export const FrontPanel = forwardRef<{ screenToPanelPosition: (screenX: number, screenY: number) => { x: number, y: number } }, { containerRef?: React.RefObject<HTMLDivElement | null> }>(({ containerRef }, ref) => {
  const { uiControls } = useGraphStore();
  const { setSelectedControlId } = useUIStore();
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isPanning, setIsPanning] = useState(false);
  const internalRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    screenToPanelPosition: (screenX: number, screenY: number) => {
      const rect = internalRef.current?.getBoundingClientRect();
      if (!rect) return { x: screenX, y: screenY };
      return {
        x: (screenX - rect.left - transform.x) / transform.scale,
        y: (screenY - rect.top - transform.y) / transform.scale
      };
    }
  }));

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const rect = internalRef.current?.getBoundingClientRect();
      if (!rect) return;

      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const zoomFactor = Math.pow(0.999, e.deltaY);
      const newScale = Math.max(0.1, Math.min(5, transform.scale * zoomFactor));

      // Adjust x and y to zoom at mouse position
      const newX = mouseX - (mouseX - transform.x) * (newScale / transform.scale);
      const newY = mouseY - (mouseY - transform.y) * (newScale / transform.scale);

      setTransform({ x: newX, y: newY, scale: newScale });
    } else {
      // Normal scroll translates
      setTransform(t => ({
        ...t,
        x: t.x - e.deltaX,
        y: t.y - e.deltaY
      }));
    }
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.target === e.currentTarget) {
      setSelectedControlId(null);
      if (e.button === 0 || e.button === 1) { // Left or middle click on background
          setIsPanning(true);
          e.currentTarget.setPointerCapture(e.pointerId);
      }
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (isPanning) {
      setTransform(t => ({
        ...t,
        x: t.x + e.movementX,
        y: t.y + e.movementY
      }));
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (isPanning) {
      setIsPanning(false);
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch (err) { /* Ignore */ }
    }
  };

  return (
    <div 
      ref={(node) => {
        // Handle both forwarded ref and internal ref
        (internalRef as any).current = node;
        if (containerRef) (containerRef as any).current = node;
      }}
      className={`w-full h-full relative overflow-hidden flex-grow select-none ${isPanning ? 'cursor-grabbing' : 'cursor-grab'}`}
      style={{
        backgroundColor: '#f8fafc',
        backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)',
        backgroundSize: `${16 * transform.scale}px ${16 * transform.scale}px`,
        backgroundPosition: `${transform.x}px ${transform.y}px`,
      }}
      onWheel={handleWheel}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onDragOver={(e) => e.preventDefault()}
    >
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
          transformOrigin: '0 0'
        }}
      >
        <div className="pointer-events-auto">
          {uiControls.map(c => (
            <ControlItem key={c.id} control={c} transform={transform} />
          ))}
        </div>
      </div>
    </div>
  );
});
