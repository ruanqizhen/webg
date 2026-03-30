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

  const isCaseStructure = activeNode?.type === 'structure.case';

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

              {/* Special handling for Case Structure */}
              {isCaseStructure && (
                <>
                  <div className="flex flex-col gap-1">
                    <label className="text-gray-500 font-semibold">Mode</label>
                    <select
                      value={activeNode.params.mode || 'boolean'}
                      onChange={(e) => {
                        const newMode = e.target.value;
                        const newCases = newMode === 'boolean' ? ['true', 'false'] : ['0', '1', '2'];
                        updateNode(activeNode.id, { 
                          params: { 
                            ...activeNode.params, 
                            mode: newMode,
                            cases: newCases,
                            defaultCase: newMode === 'number' ? 'false' : undefined,
                            activeCase: newCases[0]
                          } 
                        });
                      }}
                      className="border p-2 rounded hover:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-400 transition-colors bg-white shadow-sm"
                    >
                      <option value="boolean">Boolean (True/False)</option>
                      <option value="number">Number (Multi-case)</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-gray-500 font-semibold">Cases (comma-separated)</label>
                    <input
                      type="text"
                      value={activeNode.params.cases?.join(', ') || ''}
                      onChange={(e) => {
                        const newCases = e.target.value.split(',').map(s => s.trim()).filter(s => s.length > 0);
                        updateNode(activeNode.id, { 
                          params: { 
                            ...activeNode.params, 
                            cases: newCases.length > 0 ? newCases : ['true', 'false'],
                            activeCase: newCases[0] || 'true'
                          } 
                        });
                      }}
                      placeholder="true, false"
                      className="border p-2 rounded hover:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-400 transition-colors bg-white shadow-sm"
                    />
                  </div>

                  {activeNode.params.mode === 'number' && (
                    <div className="flex flex-col gap-1">
                      <label className="text-gray-500 font-semibold">Default Case</label>
                      <select
                        value={activeNode.params.defaultCase || 'false'}
                        onChange={(e) => updateNode(activeNode.id, { params: { ...activeNode.params, defaultCase: e.target.value } })}
                        className="border p-2 rounded hover:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-400 transition-colors bg-white shadow-sm"
                      >
                        {activeNode.params.cases?.map((caseName: string) => (
                          <option key={caseName} value={caseName}>{caseName}</option>
                        ))}
                        <option value="default">Default (fallback)</option>
                      </select>
                    </div>
                  )}

                  <div className="flex flex-col gap-1">
                    <label className="text-gray-500 font-semibold">Active Case (for editing)</label>
                    <select
                      value={activeNode.params.activeCase || 'true'}
                      onChange={(e) => updateNode(activeNode.id, { params: { ...activeNode.params, activeCase: e.target.value } })}
                      className="border p-2 rounded hover:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-400 transition-colors bg-white shadow-sm"
                    >
                      {activeNode.params.cases?.map((caseName: string) => (
                        <option key={caseName} value={caseName}>{caseName}</option>
                      ))}
                      {activeNode.params.mode === 'number' && (
                        <option value="default">Default</option>
                      )}
                    </select>
                  </div>
                </>
              )}

              {!isCaseStructure && NodeRegistry[activeNode.type]?.params?.map(param => (
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

              <div className="flex flex-col gap-1">
                 <label className="text-gray-500 font-semibold">Width (px)</label>
                 <input
                    type="number"
                    value={activeControl.width ?? ''}
                    onChange={(e) => updateUIControl(activeControl.id, { width: e.target.value ? Number(e.target.value) : undefined })}
                    placeholder="Auto"
                    className="border p-2 rounded hover:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-400 transition-colors bg-white shadow-sm"
                 />
              </div>

              <div className="flex flex-col gap-1">
                 <label className="text-gray-500 font-semibold">Height (px)</label>
                 <input
                    type="number"
                    value={activeControl.height ?? ''}
                    onChange={(e) => updateUIControl(activeControl.id, { height: e.target.value ? Number(e.target.value) : undefined })}
                    placeholder="Auto"
                    className="border p-2 rounded hover:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-400 transition-colors bg-white shadow-sm"
                 />
              </div>

              {/* Min/Max/Step for numberInput and gauge */}
              {['numberInput', 'gauge'].includes(activeControl.type) && (
                <>
                  <div className="flex flex-col gap-1">
                    <label className="text-gray-500 font-semibold">Min</label>
                    <input
                      type="number"
                      value={activeControl.min ?? ''}
                      onChange={(e) => updateUIControl(activeControl.id, { min: e.target.value ? Number(e.target.value) : undefined })}
                      placeholder="No limit"
                      className="border p-2 rounded hover:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-400 transition-colors bg-white shadow-sm"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-gray-500 font-semibold">Max</label>
                    <input
                      type="number"
                      value={activeControl.max ?? ''}
                      onChange={(e) => updateUIControl(activeControl.id, { max: e.target.value ? Number(e.target.value) : undefined })}
                      placeholder="No limit"
                      className="border p-2 rounded hover:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-400 transition-colors bg-white shadow-sm"
                    />
                  </div>

                  {activeControl.type === 'numberInput' && (
                    <div className="flex flex-col gap-1">
                      <label className="text-gray-500 font-semibold">Step</label>
                      <input
                        type="number"
                        value={activeControl.step ?? 1}
                        onChange={(e) => updateUIControl(activeControl.id, { step: Number(e.target.value) || 1 })}
                        className="border p-2 rounded hover:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-400 transition-colors bg-white shadow-sm"
                      />
                    </div>
                  )}
                </>
              )}

              {/* Color On/Off for button and indicatorLight */}
              {['button', 'indicatorLight', 'gauge'].includes(activeControl.type) && (
                <>
                  <div className="flex flex-col gap-1">
                    <label className="text-gray-500 font-semibold">Color (On/Active)</label>
                    <input
                      type="color"
                      value={activeControl.colorOn || '#4CAF50'}
                      onChange={(e) => updateUIControl(activeControl.id, { colorOn: e.target.value })}
                      className="w-full h-8 border rounded cursor-pointer"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-gray-500 font-semibold">Color (Off/Inactive)</label>
                    <input
                      type="color"
                      value={activeControl.colorOff || '#cccccc'}
                      onChange={(e) => updateUIControl(activeControl.id, { colorOff: e.target.value })}
                      className="w-full h-8 border rounded cursor-pointer"
                    />
                  </div>
                </>
              )}

              {/* Default Value for controllers */}
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
