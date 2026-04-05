import { useUIStore } from '../../store/useUIStore';
import { MousePointer2, Network } from 'lucide-react';
import { Toolbar } from '../shared/Toolbar';
import { Palette } from '../shared/Palette';
import { PropertiesPanel } from '../shared/PropertiesPanel';
import { FrontPanel } from '../ui/FrontPanel';
import { GraphEditor } from '../logic/GraphEditor';
import { useCallback, useRef, useEffect } from 'react';
import { useGraphStore } from '../../store/useGraphStore';
import { generateId, generateUniqueLabel } from '../../lib/utils';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { ReactFlowProvider, useReactFlow } from 'reactflow';

export function IdeLayout() {
  return (
    <ReactFlowProvider>
      <IdeLayoutInner />
    </ReactFlowProvider>
  );
}

function IdeLayoutInner() {
  const { viewMode, setViewMode } = useUIStore();
  const { addNode, addUIControl, uiControls, loadFromStorage, startAutoSave } = useGraphStore();
  const zoomFitRef = useRef<(() => void) | null>(null);
  const reactFlow = useReactFlow();
  const frontPanelRef = useRef<{ screenToPanelPosition: (x: number, y: number) => { x: number, y: number } }>(null);
  const frontPanelDivRef = useRef<HTMLDivElement>(null);

  const handleZoomFit = useCallback(() => {
    zoomFitRef.current?.();
  }, []);

  useKeyboardShortcuts({
    onZoomFit: handleZoomFit
  });

  // Load from storage on mount and start auto-save
  useEffect(() => {
    loadFromStorage();
    const cleanup = startAutoSave();
    return cleanup;
  }, [loadFromStorage, startAutoSave]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    
    // 1. Logic Node Drop
    const nodeType = e.dataTransfer.getData('application/node-type');
    if (nodeType && viewMode === 'logic') {
      const position = reactFlow.screenToFlowPosition({
        x: e.clientX,
        y: e.clientY,
      });
      
      const id = generateId();
      addNode({
        id,
        type: nodeType,
        position,
        inputs: [],
        outputs: [],
        params: {}
      });
      return;
    }

    // 2. UI Control Drop
    const controlDataRaw = e.dataTransfer.getData('application/ui-control');
    if (controlDataRaw && viewMode === 'ui') {
      const controlDef = JSON.parse(controlDataRaw);
      const pos = frontPanelRef.current?.screenToPanelPosition(e.clientX, e.clientY);
      if (!pos) return;

      const { x, y } = pos;

      const termId = generateId();
      const ctrlId = generateId();
      const direction: 'control' | 'indicator' = controlDef.direction || 'control';
      const isIndicator = direction === 'indicator';

      const terminalDef: any = {
        id: termId,
        type: 'io.terminal',
        position: { x: Math.random() * 200 + 50, y: Math.random() * 200 + 50 },
        inputs: [],
        outputs: [],
        params: { value: controlDef.type === 'button' ? false : 0 }
      };

      const getPortType = (type: string) => {
        if (type === 'button' || type === 'indicatorLight') return 'boolean';
        if (type === 'textLabel') return 'string';
        return 'number';
      };
      const portType = getPortType(controlDef.type);

      if (isIndicator) {
        terminalDef.inputs = [{ name: 'input', type: portType, direction: 'input', id: 'input' }];
      } else {
        terminalDef.outputs = [{ name: 'output', type: portType, direction: 'output', id: 'output' }];
      }

      // Default properties for different control types
      const controlDefaults: Record<string, any> = {
        numberInput: { min: 0, max: 100, step: 1, defaultValue: 0 },
        button: { colorOn: '#4CAF50', colorOff: '#cccccc', defaultValue: false },
        numberIndicator: { defaultValue: 0 },
        textLabel: { defaultValue: '' },
        gauge: { min: 0, max: 100, colorOn: '#4CAF50', defaultValue: 0 },
        indicatorLight: { colorOn: '#4CAF50', colorOff: '#cccccc', defaultValue: false },
        slider: { min: 0, max: 100, step: 1, defaultValue: 0, width: 160, height: 40 },
        knob: { min: 0, max: 100, step: 1, defaultValue: 0, width: 80, height: 80 },
        tank: { min: 0, max: 100, colorOn: '#3B82F6', defaultValue: 0, width: 60, height: 160 },
      };

      const existingLabels = uiControls.map(c => c.label);
      const uniqueLabel = generateUniqueLabel(controlDef.label, existingLabels);

      addUIControl({
        id: ctrlId,
        type: controlDef.type,
        direction,
        label: uniqueLabel,
        defaultValue: controlDefaults[controlDef.type]?.defaultValue ?? 0,
        bindingNodeId: termId,
        x,
        y,
        width: controlDefaults[controlDef.type]?.width,
        height: controlDefaults[controlDef.type]?.height,
        min: controlDefaults[controlDef.type]?.min,
        max: controlDefaults[controlDef.type]?.max,
        step: controlDefaults[controlDef.type]?.step,
        colorOn: controlDefaults[controlDef.type]?.colorOn,
        colorOff: controlDefaults[controlDef.type]?.colorOff,
      }, terminalDef);
    }
  }, [addNode, addUIControl, viewMode, reactFlow]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  return (
    <div className="flex flex-col h-screen w-full bg-white overflow-hidden text-gray-800 font-sans">
      <Toolbar onZoomFit={handleZoomFit} />
      <div className="flex flex-1 overflow-hidden relative">
         <Palette />
         
         <div className="flex-1 flex flex-col overflow-hidden relative border-l border-r border-gray-200">
            {/* Tabs Header */}
            <div className="flex bg-gray-50 border-b shrink-0 px-2 pt-2 gap-1 select-none">
               <button 
                  className={`px-4 py-2 font-medium text-sm rounded-t-lg border-t border-l border-r flex items-center gap-2 transition-colors ${viewMode === 'ui' ? 'bg-white text-purple-600 border-gray-200 border-b-white translate-y-[1px] shadow-sm' : 'bg-transparent border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'}`}
                  onClick={() => setViewMode('ui')}
               >
                  <MousePointer2 size={16} /> Front Panel
               </button>
               <button 
                  className={`px-4 py-2 font-medium text-sm rounded-t-lg border-t border-l border-r flex items-center gap-2 transition-colors ${viewMode === 'logic' ? 'bg-white text-purple-600 border-gray-200 border-b-white translate-y-[1px] shadow-sm' : 'bg-transparent border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'}`}
                  onClick={() => setViewMode('logic')}
               >
                  <Network size={16} /> Block Diagram
               </button>
            </div>
            
            {/* Tab Contents */}
            <div
              className="flex-1 flex overflow-hidden relative bg-white"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            >
               {viewMode === 'ui' && <FrontPanel ref={frontPanelRef} containerRef={frontPanelDivRef} />}
               {viewMode === 'logic' && <GraphEditor onZoomFitRef={zoomFitRef} />}
            </div>
         </div>

         <PropertiesPanel />
      </div>
    </div>
  );
}
