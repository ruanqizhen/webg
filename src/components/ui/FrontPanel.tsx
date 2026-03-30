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
      {/* Gauge background (semi-circle) */}
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-24 h-24 rounded-full border-[12px] border-gray-200"
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
      {/* Center cap */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3 h-3 bg-gray-700 rounded-full" />
      {/* Needle */}
      <div
        className="absolute bottom-0 left-1/2 w-0.5 h-10 bg-red-600 origin-bottom transition-transform duration-300"
        style={{
          transform: `translateX(-50%) rotate(${rotation}deg)`,
          bottom: '0px',
        }}
      />
      {/* Min/Max labels */}
      <span className="absolute bottom-0 left-0 text-[9px] text-gray-500">{min}</span>
      <span className="absolute bottom-0 right-0 text-[9px] text-gray-500">{max}</span>
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
      className={`absolute flex flex-col gap-1 p-2 bg-white rounded shadow-md border ${selectedControlId === control.id ? 'border-purple-500 ring-2 ring-purple-200' : 'border-gray-200'} select-none transition-shadow duration-200`}
      style={{ left: control.x || 50, top: control.y || 50, width: width, height: height, cursor: isDragging ? 'grabbing' : 'grab' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      <label className="text-xs font-semibold text-gray-500 pointer-events-none mb-1">{control.label}</label>

      {control.type === 'numberInput' && (
         <input
           type="number"
           value={control.defaultValue}
           onChange={handleChange}
           min={min}
           max={max}
           step={step}
           className="border p-1 text-sm nodrag w-full rounded focus:outline-none focus:ring-1 focus:ring-purple-400"
           onPointerDown={e => Object.assign(e, { cancelBubble: true })}
           disabled={isRunning}
         />
      )}

      {control.type === 'button' && (
         <input
           type="checkbox"
           checked={control.defaultValue}
           onChange={handleChange}
           className="w-5 h-5 nodrag"
           style={{ accentColor: control.defaultValue ? colorOn : colorOff }}
           onPointerDown={e => Object.assign(e, { cancelBubble: true })}
           disabled={isRunning}
         />
      )}

      {control.type === 'numberIndicator' && (
         <div className="bg-gray-100 px-3 py-1 text-sm rounded pointer-events-none text-right font-mono flex-1 flex items-center justify-end">
           {Number(displayVal).toFixed(2)}
         </div>
      )}

      {control.type === 'textLabel' && (
         <div className="bg-gray-100 px-3 py-1 text-sm rounded pointer-events-none flex-1 flex items-center min-w-[6rem]">
           {String(displayVal)}
         </div>
      )}

      {control.type === 'indicatorLight' && (
         <div
           className={`w-8 h-8 rounded-full border shadow-inner transition-colors duration-200 mx-auto`}
           style={{
             backgroundColor: displayVal ? colorOn : colorOff,
             boxShadow: displayVal ? `0 0 12px ${colorOn}` : 'inset 0 2px 4px rgba(0,0,0,0.2)',
           }}
         />
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
    </div>
  );
}

export function FrontPanel() {
  const { uiControls } = useGraphStore();
  const { setSelectedControlId } = useUIStore();

  return (
    <div 
      className="w-full h-full relative overflow-hidden bg-[url('radial-gradient(#cbd5e1_1px,transparent_1px)')] [background-size:16px_16px] bg-slate-50 flex-grow"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) setSelectedControlId(null);
      }}
      onDragOver={(e) => e.preventDefault()}
    >
      <div className="absolute top-2 right-2 bg-white px-3 py-1 shadow rounded text-sm font-semibold text-gray-500 select-none">
        Front Panel
      </div>
      
      {uiControls.map(c => (
        <ControlItem key={c.id} control={c} />
      ))}
    </div>
  );
}
