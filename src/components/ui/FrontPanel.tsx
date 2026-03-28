import { useState } from 'react';
import { useGraphStore } from '../../store/useGraphStore';
import { useUIStore } from '../../store/useUIStore';
import { useRuntimeStore } from '../../store/useRuntimeStore';
import type { UIControl } from '../../types/graph';

function ControlItem({ control }: { control: UIControl }) {
  const { updateUIControl, updateNode } = useGraphStore();
  const { selectedControlId, setSelectedControlId } = useUIStore();
  const portValues = useRuntimeStore(s => s.portValues);
  const isRunning = useRuntimeStore(s => s.isRunning);
  
  const terminalId = control.bindingNodeId;
  const [isDragging, setIsDragging] = useState(false);

  const onPointerDown = (e: React.PointerEvent) => {
    setSelectedControlId(control.id);
    setIsDragging(true);
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
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const handleChange = (e: any) => {
    let newVal = e.target.value;
    if (control.type === 'numberInput') newVal = Number(newVal);
    if (control.type === 'button') newVal = e.target.checked;
    
    updateUIControl(control.id, { defaultValue: newVal });
    updateNode(terminalId, { params: { value: newVal } });
  }

  const inputVal = portValues[`${terminalId}_input`];
  const displayVal = inputVal !== undefined ? inputVal : control.defaultValue;

  return (
    <div 
      className={`absolute flex flex-col gap-1 p-2 bg-white rounded shadow-md border ${selectedControlId === control.id ? 'border-purple-500 ring-2 ring-purple-200' : 'border-gray-200'} select-none transition-shadow duration-200`}
      style={{ left: control.x || 50, top: control.y || 50, cursor: isDragging ? 'grabbing' : 'grab' }}
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
           className="border p-1 text-sm nodrag w-24 rounded focus:outline-none focus:ring-1 focus:ring-purple-400"
           onPointerDown={e => Object.assign(e, { cancelBubble: true })} // Let interaction pass
           disabled={isRunning}
         />
      )}

      {control.type === 'button' && (
         <input 
           type="checkbox" 
           checked={control.defaultValue} 
           onChange={handleChange}
           className="w-5 h-5 nodrag accent-purple-600"
           onPointerDown={e => Object.assign(e, { cancelBubble: true })}
           disabled={isRunning}
         />
      )}

      {control.type === 'numberIndicator' && (
         <div className="bg-gray-100 px-3 py-1 text-sm rounded pointer-events-none text-right font-mono min-w-[6rem]">
           {Number(displayVal).toFixed(2)}
         </div>
      )}
      
      {control.type === 'textLabel' && (
         <div className="bg-gray-100 px-3 py-1 text-sm rounded pointer-events-none min-w-[6rem]">
           {String(displayVal)}
         </div>
      )}

      {control.type === 'indicatorLight' && (
         <div className={`w-6 h-6 rounded-full border shadow-inner transition-colors duration-200 mx-auto ${displayVal ? 'bg-green-500 drop-shadow-[0_0_8px_rgba(34,197,94,0.8)]' : 'bg-gray-200'}`} />
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
      onClick={() => setSelectedControlId(null)}
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
