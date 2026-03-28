import { useUIStore } from '../../store/useUIStore';
import { useGraphStore } from '../../store/useGraphStore';
import { NodeRegistry } from '../../engine/registry';

export function PropertiesPanel() {
  const { selectedNodeId, selectedControlId } = useUIStore();
  const { nodes, uiControls, updateNode, updateUIControl } = useGraphStore();

  const activeNode = selectedNodeId ? nodes.find(n => n.id === selectedNodeId) : null;
  const activeControl = selectedControlId ? uiControls.find(c => c.id === selectedControlId) : null;

  if (!activeNode && !activeControl) {
    return (
      <div className="w-64 border-l bg-gray-50 p-4 h-full shrink-0 text-sm text-gray-400 italic">
        Select a node or control to view properties.
      </div>
    );
  }

  return (
    <div className="w-64 border-l bg-gray-50 flex flex-col h-full shrink-0 shadow-inner">
      <div className="p-3 text-sm font-bold text-gray-700 uppercase tracking-wide border-b bg-white top-0 sticky">
        Properties
      </div>
      
      <div className="p-4 flex flex-col gap-4 text-sm overflow-y-auto">
        {activeNode && (
           <>
              <div className="flex flex-col gap-1">
                 <label className="text-gray-500 font-semibold">Node Type</label>
                 <div className="font-mono bg-white border px-2 py-1 rounded text-xs">{NodeRegistry[activeNode.type]?.label || activeNode.type}</div>
              </div>
              <div className="flex flex-col gap-1">
                 <label className="text-gray-500 font-semibold">Node ID</label>
                 <div className="font-mono text-[10px] text-gray-400 break-all">{activeNode.id}</div>
              </div>

              {NodeRegistry[activeNode.type]?.params?.map(param => (
                 <div key={param.name} className="flex flex-col gap-1">
                   <label className="text-gray-500 font-semibold capitalize">{param.name}</label>
                   {param.type === 'boolean' ? (
                      <input 
                        type="checkbox" 
                        checked={activeNode.params[param.name] ?? false}
                        onChange={(e) => updateNode(activeNode.id, { params: { ...activeNode.params, [param.name]: e.target.checked } })}
                        className="w-4 h-4"
                      />
                   ) : (
                      <input 
                        type={param.type === 'number' ? 'number' : 'text'} 
                        value={activeNode.params[param.name] ?? ''}
                        onChange={(e) => {
                           const v = param.type === 'number' ? Number(e.target.value) : e.target.value;
                           updateNode(activeNode.id, { params: { ...activeNode.params, [param.name]: v } });
                        }}
                        className="border p-2 rounded hover:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-400 transition-colors bg-white shadow-sm"
                      />
                   )}
                 </div>
              ))}
           </>
        )}

        {activeControl && (
           <>
              <div className="flex flex-col gap-1">
                 <label className="text-gray-500 font-semibold">Control Type</label>
                 <div className="font-mono bg-white border px-2 py-1 rounded text-xs">{activeControl.type}</div>
              </div>
              
              <div className="flex flex-col gap-1">
                 <label className="text-gray-500 font-semibold">Label</label>
                 <input 
                    value={activeControl.label}
                    onChange={(e) => updateUIControl(activeControl.id, { label: e.target.value })}
                    className="border p-2 rounded hover:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-400 transition-colors bg-white shadow-sm"
                 />
              </div>

              {['numberInput', 'button'].includes(activeControl.type) && (
                 <div className="flex flex-col gap-1">
                   <label className="text-gray-500 font-semibold">Default Value</label>
                   {activeControl.type === 'button' ? (
                       <input 
                         type="checkbox" 
                         checked={activeControl.defaultValue}
                         onChange={(e) => updateUIControl(activeControl.id, { defaultValue: e.target.checked })}
                         className="w-4 h-4"
                       />
                   ) : (
                       <input 
                         type="number" 
                         value={activeControl.defaultValue}
                         onChange={(e) => updateUIControl(activeControl.id, { defaultValue: Number(e.target.value) })}
                         className="border p-2 rounded hover:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-400 transition-colors bg-white shadow-sm"
                       />
                   )}
                 </div>
              )}
           </>
        )}
      </div>
    </div>
  );
}
