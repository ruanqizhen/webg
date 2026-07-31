import { useUIStore } from '../../store/useUIStore';
import { useGraphStore } from '../../store/useGraphStore';
import { NodeRegistry } from '../../engine/registry';
import { Panel, PanelHeader } from '../ui/panel';
import { FieldGroup, FieldLabel, FieldInput, FieldSelect, FieldTextarea } from '../ui/field';
import { Button } from '../ui/button';

export function PropertiesPanel() {
  const { selectedNodeId, selectedControlId, selectedEdgeId } = useUIStore();
  const { nodes, uiControls, updateNode, updateUIControl, edges, removeEdge } = useGraphStore();

  const activeNode = selectedNodeId ? nodes.find(n => n.id === selectedNodeId) : null;
  const activeControl = selectedControlId ? uiControls.find(c => c.id === selectedControlId) : null;
  const activeEdge = selectedEdgeId ? edges.find(e => e.id === selectedEdgeId) : null;

  if (!activeNode && !activeControl && !activeEdge) {
    return (
      <Panel className="w-64 border-l border-panel-border bg-panel">
        <PanelHeader>Properties</PanelHeader>
        <div className="p-6 text-center text-xs text-muted-foreground">Select a node, control, or connection to view properties.</div>
      </Panel>
    );
  }

  const isCaseStructure = activeNode?.type === 'structure.case';

  return (
    <Panel className="w-64 border-l border-panel-border bg-panel">
      <PanelHeader>Properties</PanelHeader>

      <div className="p-3 flex flex-col gap-5 text-sm overflow-y-auto">
        {activeNode && (
           <>
              <FieldGroup>
                 <FieldLabel>Node Type</FieldLabel>
                 <div className="font-mono bg-muted border border-border rounded-md px-2.5 py-1.5 text-xs">{NodeRegistry[activeNode.type]?.label || activeNode.type}</div>
              </FieldGroup>
              <FieldGroup>
                 <FieldLabel>Node ID</FieldLabel>
                 <div className="font-mono text-[10px] text-muted-foreground break-all">{activeNode.id}</div>
              </FieldGroup>

              {/* For Loop specific */}
              {activeNode.type === 'structure.forLoop' && (
                <>
                  <FieldGroup>
                    <FieldLabel className="flex items-center gap-2">For Loop Options</FieldLabel>
                    <label className="flex items-center gap-2 text-xs cursor-pointer">
                      <input type="checkbox" checked={!!activeNode.params.hasConditional} onChange={(e) => updateNode(activeNode.id, { params: { ...activeNode.params, hasConditional: e.target.checked } })} className="w-4 h-4 rounded border-input" />
                      Enable Conditional Terminal
                    </label>
                  </FieldGroup>
                  {activeNode.params.hasConditional && (
                    <FieldGroup>
                      <FieldLabel>Conditional Mode</FieldLabel>
                      <FieldSelect value={activeNode.params.conditionalMode || 'stopIfTrue'} onChange={(e) => updateNode(activeNode.id, { params: { ...activeNode.params, conditionalMode: e.target.value } })}>
                        <option value="stopIfTrue">Stop if True (break when true)</option>
                        <option value="continueIfTrue">Continue if True (break when false)</option>
                      </FieldSelect>
                    </FieldGroup>
                  )}
                  <FieldGroup>
                    <FieldLabel>Max Iterations (0 = unlimited)</FieldLabel>
                    <FieldInput type="number" value={activeNode.params.maxIterations ?? ''} placeholder="0 = no limit" onChange={(e) => updateNode(activeNode.id, { params: { ...activeNode.params, maxIterations: e.target.value ? Number(e.target.value) : 0 } })} />
                  </FieldGroup>
                </>
              )}

              {/* While Loop specific */}
              {activeNode.type === 'structure.whileLoop' && (
                <>
                  <FieldGroup>
                    <FieldLabel>Condition Mode</FieldLabel>
                    <FieldSelect value={activeNode.params.conditionMode || 'stopIfTrue'} onChange={(e) => updateNode(activeNode.id, { params: { ...activeNode.params, conditionMode: e.target.value } })}>
                      <option value="stopIfTrue">Stop if True (default)</option>
                      <option value="continueIfTrue">Continue if True</option>
                    </FieldSelect>
                    <span className="text-[11px] text-muted-foreground">Stop if True = loop stops when condition is true. Continue if True = loop stops when false.</span>
                  </FieldGroup>
                  <FieldGroup>
                    <FieldLabel>Max Iterations (safety)</FieldLabel>
                    <FieldInput type="number" value={activeNode.params.maxIterations ?? 100000} onChange={(e) => updateNode(activeNode.id, { params: { ...activeNode.params, maxIterations: e.target.value ? Number(e.target.value) : 100000 } })} />
                  </FieldGroup>
                </>
              )}

              {isCaseStructure && (
                <>
                  <FieldGroup>
                    <FieldLabel>Mode</FieldLabel>
                    <FieldSelect value={activeNode.params.mode || 'boolean'} onChange={(e) => {
                        const newMode = e.target.value;
                        const newCases = newMode === 'boolean' ? ['true', 'false'] : ['0', '1', '2'];
                        updateNode(activeNode.id, { params: { ...activeNode.params, mode: newMode, cases: newCases, defaultCase: newMode === 'number' ? 'false' : undefined, activeCase: newCases[0] } });
                      }}>
                      <option value="boolean">Boolean (True/False)</option>
                      <option value="number">Number (Multi-case)</option>
                    </FieldSelect>
                  </FieldGroup>

                  <FieldGroup>
                    <FieldLabel>Cases (comma-separated)</FieldLabel>
                    <FieldInput value={activeNode.params.cases?.join(', ') || ''} placeholder="true, false" onChange={(e) => {
                        const newCases = e.target.value.split(',').map((s: string) => s.trim()).filter((s: string) => s.length > 0);
                        const finalCases = newCases.length > 0 ? newCases : ['true', 'false'];
                        updateNode(activeNode.id, { params: { ...activeNode.params, cases: finalCases, activeCase: finalCases[0] || 'true' } });
                        const removedCases = new Set((activeNode.params.cases || []).filter((c: string) => !finalCases.includes(c)));
                        if (removedCases.size > 0) {
                          const orphans = nodes.filter(n => n.parent === activeNode.id && n.caseId && removedCases.has(n.caseId));
                          if (orphans.length > 0) useGraphStore.getState().removeNodes(orphans.map(n => n.id));
                        }
                      }} />
                  </FieldGroup>

                  {activeNode.params.mode === 'number' && (
                    <FieldGroup>
                      <FieldLabel>Default Case</FieldLabel>
                      <FieldSelect value={activeNode.params.defaultCase || 'false'} onChange={(e) => updateNode(activeNode.id, { params: { ...activeNode.params, defaultCase: e.target.value } })}>
                        {activeNode.params.cases?.map((caseName: string) => (<option key={caseName} value={caseName}>{caseName}</option>))}
                        <option value="default">Default (fallback)</option>
                      </FieldSelect>
                    </FieldGroup>
                  )}

                  <FieldGroup>
                    <FieldLabel>Active Case (for editing)</FieldLabel>
                    <FieldSelect value={activeNode.params.activeCase || 'true'} onChange={(e) => updateNode(activeNode.id, { params: { ...activeNode.params, activeCase: e.target.value } })}>
                      {activeNode.params.cases?.map((caseName: string) => (<option key={caseName} value={caseName}>{caseName}</option>))}
                      {activeNode.params.mode === 'number' && (<option value="default">Default</option>)}
                    </FieldSelect>
                  </FieldGroup>
                </>
              )}

              {activeNode.type === 'source.number' && (
                <FieldGroup>
                  <FieldLabel>Number Type</FieldLabel>
                  <FieldSelect value={activeNode.params.numberType || 'real'} onChange={(e) => updateNode(activeNode.id, { params: { ...activeNode.params, numberType: e.target.value } })}>
                    <option value="real">DBL (Real)</option>
                    <option value="integer">I32 (Integer)</option>
                  </FieldSelect>
                </FieldGroup>
              )}

              {!isCaseStructure && NodeRegistry[activeNode.type]?.params?.map(param => (
                 <FieldGroup key={param.name}>
                   <FieldLabel className="capitalize">{param.name}</FieldLabel>
                   {param.type === 'boolean' ? (
                      <input type="checkbox" checked={activeNode.params[param.name] ?? false} onChange={(e) => updateNode(activeNode.id, { params: { ...activeNode.params, [param.name]: e.target.checked } })} className="w-4 h-4 rounded border-input" />
                   ) : param.type === 'array' ? (
                      <FieldTextarea value={JSON.stringify(activeNode.params[param.name] ?? [])} placeholder="[1, 2, 3]" onChange={(e) => {
                           try { const parsed = JSON.parse(e.target.value); if (Array.isArray(parsed)) updateNode(activeNode.id, { params: { ...activeNode.params, [param.name]: parsed } }); } catch {}
                        }} />
                   ) : (
                      <FieldInput type={param.type === 'number' ? 'number' : 'text'} value={activeNode.params[param.name] ?? ''} onChange={(e) => {
                           const v = param.type === 'number' ? Number(e.target.value) : e.target.value;
                           updateNode(activeNode.id, { params: { ...activeNode.params, [param.name]: v } });
                        }} />
                   )}
                 </FieldGroup>
              ))}
           </>
        )}

        {activeControl && (
           <>
              <FieldGroup>
                 <FieldLabel>Control Type</FieldLabel>
                 <div className="font-mono bg-muted border border-border rounded-md px-2.5 py-1.5 text-xs">{activeControl.type}</div>
              </FieldGroup>

              <FieldGroup>
                 <FieldLabel>Direction</FieldLabel>
                 <FieldSelect value={activeControl.direction || 'control'} onChange={(e) => {
                      const newDirection = e.target.value as 'control' | 'indicator';
                      updateUIControl(activeControl.id, { direction: newDirection });
                      const termNode = nodes.find(n => n.id === activeControl.bindingNodeId);
                      if (termNode) {
                        if (newDirection === 'indicator') updateNode(termNode.id, { inputs: [{ name: 'input', type: 'any', direction: 'input', id: 'input' }], outputs: [] });
                        else updateNode(termNode.id, { inputs: [], outputs: [{ name: 'output', type: 'any', direction: 'output', id: 'output' }] });
                      }
                    }}>
                    <option value="control">▶ Control (Input)</option>
                    <option value="indicator">◀ Indicator (Output)</option>
                 </FieldSelect>
              </FieldGroup>

              <FieldGroup>
                 <FieldLabel>Label</FieldLabel>
                 <FieldInput value={activeControl.label} onChange={(e) => updateUIControl(activeControl.id, { label: e.target.value })} />
              </FieldGroup>

              <FieldGroup>
                 <FieldLabel>Width (px)</FieldLabel>
                 <FieldInput type="number" value={activeControl.width ?? ''} placeholder="Auto" onChange={(e) => updateUIControl(activeControl.id, { width: e.target.value ? Number(e.target.value) : undefined })} />
              </FieldGroup>

              <FieldGroup>
                 <FieldLabel>Height (px)</FieldLabel>
                 <FieldInput type="number" value={activeControl.height ?? ''} placeholder="Auto" onChange={(e) => updateUIControl(activeControl.id, { height: e.target.value ? Number(e.target.value) : undefined })} />
              </FieldGroup>

              {['numberInput', 'gauge', 'slider', 'knob', 'tank'].includes(activeControl.type) && (
                <FieldGroup>
                  <FieldLabel>Number Type</FieldLabel>
                  <FieldSelect value={activeControl.numberType || 'real'} onChange={(e) => {
                      const newNumberType = e.target.value as 'real' | 'integer';
                      updateUIControl(activeControl.id, { numberType: newNumberType });
                      const termNode = nodes.find(n => n.id === activeControl.bindingNodeId);
                      if (termNode) {
                        const portType = newNumberType === 'integer' ? 'integer' : 'number';
                        if (activeControl.direction === 'indicator') updateNode(termNode.id, { inputs: [{ name: 'input', type: portType, direction: 'input', id: 'input' }] });
                        else updateNode(termNode.id, { outputs: [{ name: 'output', type: portType, direction: 'output', id: 'output' }] });
                      }
                    }}>
                    <option value="real">DBL (Real)</option>
                    <option value="integer">I32 (Integer)</option>
                  </FieldSelect>
                </FieldGroup>
              )}

              {['numberInput', 'gauge', 'slider', 'knob', 'tank'].includes(activeControl.type) && (
                <>
                  <FieldGroup>
                    <FieldLabel>Min</FieldLabel>
                    <FieldInput type="number" value={activeControl.min ?? ''} placeholder="No limit" onChange={(e) => updateUIControl(activeControl.id, { min: e.target.value ? Number(e.target.value) : undefined })} />
                  </FieldGroup>
                  <FieldGroup>
                    <FieldLabel>Max</FieldLabel>
                    <FieldInput type="number" value={activeControl.max ?? ''} placeholder="No limit" onChange={(e) => updateUIControl(activeControl.id, { max: e.target.value ? Number(e.target.value) : undefined })} />
                  </FieldGroup>
                  {['numberInput', 'slider', 'knob'].includes(activeControl.type) && (
                    <FieldGroup>
                      <FieldLabel>Step</FieldLabel>
                      <FieldInput type="number" value={activeControl.step ?? 1} onChange={(e) => updateUIControl(activeControl.id, { step: Number(e.target.value) || 1 })} />
                    </FieldGroup>
                  )}
                </>
              )}

              {['button', 'indicatorLight', 'gauge', 'tank'].includes(activeControl.type) && (
                <>
                  <FieldGroup>
                    <FieldLabel>Color (On/Active)</FieldLabel>
                    <input type="color" value={activeControl.colorOn || '#2E7D32'} onChange={(e) => updateUIControl(activeControl.id, { colorOn: e.target.value })} className="w-full h-8 rounded-md border border-input cursor-pointer" />
                  </FieldGroup>
                  <FieldGroup>
                    <FieldLabel>Color (Off/Inactive)</FieldLabel>
                    <input type="color" value={activeControl.colorOff || '#E5E7EB'} onChange={(e) => updateUIControl(activeControl.id, { colorOff: e.target.value })} className="w-full h-8 rounded-md border border-input cursor-pointer" />
                  </FieldGroup>
                </>
              )}

              {['numberInput', 'button'].includes(activeControl.type) && (
                 <FieldGroup>
                   <FieldLabel>Default Value</FieldLabel>
                   {activeControl.type === 'button' ? (
                       <input type="checkbox" checked={!!activeControl.defaultValue} onChange={(e) => updateUIControl(activeControl.id, { defaultValue: e.target.checked })} className="w-4 h-4 rounded border-input" />
                   ) : (
                       <FieldInput type="number" value={activeControl.defaultValue ?? ''} onChange={(e) => updateUIControl(activeControl.id, { defaultValue: Number(e.target.value) })} />
                   )}
                 </FieldGroup>
              )}
           </>
        )}

        {activeEdge && (
          <>
            <FieldGroup>
              <FieldLabel>Connection</FieldLabel>
              <div className="font-mono bg-muted border border-border rounded-md px-2.5 py-1.5 text-xs">{activeEdge.sourceNode.slice(0,8)} → {activeEdge.targetNode.slice(0,8)}</div>
            </FieldGroup>
            <FieldGroup>
              <FieldLabel>Source Port</FieldLabel>
              <div className="font-mono bg-muted border border-border rounded-md px-2.5 py-1.5 text-xs">{activeEdge.sourcePort}</div>
            </FieldGroup>
            <FieldGroup>
              <FieldLabel>Target Port</FieldLabel>
              <div className="font-mono bg-muted border border-border rounded-md px-2.5 py-1.5 text-xs">{activeEdge.targetPort}</div>
            </FieldGroup>
            <FieldGroup>
              <FieldLabel>Edge ID</FieldLabel>
              <div className="font-mono text-[10px] text-muted-foreground break-all">{activeEdge.id}</div>
            </FieldGroup>
            <div className="pt-2 border-t border-border">
              <Button variant="destructive" size="sm" className="w-full gap-1.5" onClick={() => removeEdge(activeEdge.id)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                Delete Connection
              </Button>
            </div>
          </>
        )}
      </div>
    </Panel>
  );
}
