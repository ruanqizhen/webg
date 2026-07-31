import { useUIStore } from '../../store/useUIStore';
import { MousePointer2, Network } from 'lucide-react';
import { Toolbar } from '../shared/Toolbar';
import { Palette } from '../shared/Palette';
import { PropertiesPanel } from '../shared/PropertiesPanel';
import { OutputConsole } from '../shared/OutputConsole';
import { NodeSearch } from '../shared/NodeSearch';
import { ShortcutCheatsheet } from '../shared/ShortcutCheatsheet';
import { FrontPanel } from '../ui/FrontPanel';
import { GraphEditor, resolveNodeOverlaps } from '../logic/GraphEditor';
import { useCallback, useRef, useEffect, useState } from 'react';
import { useGraphStore } from '../../store/useGraphStore';
import { generateId, generateUniqueLabel } from '../../lib/utils';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { ReactFlowProvider, useReactFlow } from 'reactflow';
import { NodeRegistry } from '../../engine/registry';
import { controlDefaults } from '../../lib/controlDefaults';

export function IdeLayout() {
  return (
    <ReactFlowProvider>
      <IdeLayoutInner />
    </ReactFlowProvider>
  );
}

function IdeLayoutInner() {
  const { viewMode, setViewMode } = useUIStore();
  const zoomFitRef = useRef<(() => void) | null>(null);
  const reactFlow = useReactFlow();
  const frontPanelRef = useRef<{ screenToPanelPosition: (x: number, y: number) => { x: number, y: number } }>(null);
  const frontPanelDivRef = useRef<HTMLDivElement>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [cheatsheetOpen, setCheatsheetOpen] = useState(false);

  const handleZoomFit = useCallback(() => {
    zoomFitRef.current?.();
  }, []);

  const handleFocusNode = useCallback((nodeId: string) => {
    const node = useGraphStore.getState().nodes.find((n) => n.id === nodeId);
    if (node) {
      const cx = (node.position?.x ?? 0) + (node.width ?? 120) / 2;
      const cy = (node.position?.y ?? 0) + (node.height ?? 60) / 2;
      reactFlow.setCenter(cx, cy, { zoom: 1.5, duration: 500 });
      useUIStore.getState().setSelectedNodeId(nodeId);
    }
  }, [reactFlow]);

  useKeyboardShortcuts({
    onZoomFit: handleZoomFit,
  });

  // Ctrl+F / Ctrl+P to open search, ? for cheatsheet
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'f' || e.key === 'p')) {
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          setSearchOpen(true);
        }
      }
      if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          setCheatsheetOpen(true);
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Load from storage on mount and start auto-save
  useEffect(() => {
    const graphStore = useGraphStore.getState();
    graphStore.loadFromStorage();
    const cleanup = graphStore.startAutoSave();
    return cleanup;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

      const currentNodes = useGraphStore.getState().nodes;
      const structures = currentNodes.filter(n => String(n.type).startsWith('structure'));

      let parent: string | undefined = undefined;
      let caseId: string | undefined = undefined;
      let localX = position.x;
      let localY = position.y;

      const nodeCenterX = position.x + 60;
      const nodeCenterY = position.y + 30;

      for (const s of structures) {
          // Compute global position accumulating all ancestors
          let gX = s.position?.x ?? 0;
          let gY = s.position?.y ?? 0;
          let curParent: string | undefined = s.parent;
          while (curParent) {
            const p = currentNodes.find(n => n.id === curParent);
            if (!p) break;
            gX += p.position?.x ?? 0;
            gY += p.position?.y ?? 0;
            curParent = p.parent;
          }
          const sW = s.width || 300;
          const sH = s.height || 200;
          if (nodeCenterX > gX && nodeCenterX < gX + sW &&
              nodeCenterY > gY && nodeCenterY < gY + sH) {
             const isCaseStructure = s.type === 'structure.case';
             parent = s.id;
             localX = position.x - gX;
             localY = position.y - gY;
             caseId = isCaseStructure ? s.params?.activeCase : undefined;
             break;
          }
      }

      // Check for Array Constant intersection
      const arrayNodes = currentNodes.filter(n => n.type === 'source.array');
      for (const an of arrayNodes) {
          let anGX = an.position?.x ?? 0;
          let anGY = an.position?.y ?? 0;
          let anP: string | undefined = an.parent;
          while (anP) {
            const p = currentNodes.find(n => n.id === anP);
            if (!p) break;
            anGX += p.position?.x ?? 0;
            anGY += p.position?.y ?? 0;
            anP = p.parent;
          }
          const sW = an.width || 120;
          const sH = an.height || 60;

          if (nodeCenterX > anGX && nodeCenterX < anGX + sW &&
              nodeCenterY > anGY && nodeCenterY < anGY + sH) {

              if (nodeType === 'source.array') return;
              if (!nodeType.startsWith('source.')) return;

              let pType = 'any';
              if (nodeType === 'source.number') pType = 'number';
              if (nodeType === 'source.boolean') pType = 'boolean';
              if (nodeType === 'source.string') pType = 'string';

              useGraphStore.getState().updateNode(an.id, {
                  params: { ...an.params, elementType: nodeType },
                  outputs: [{ name: 'value', type: `${pType}[]`, direction: 'output', id: 'value' }]
              });
              return;
          }
      }

      // Build default params from registry so e.g. Number Constant gets value=0 not undefined
      const nodeDef = NodeRegistry[nodeType];
      const defaultParams: Record<string, any> = {};
      if (nodeDef?.params) {
        for (const p of nodeDef.params) {
          defaultParams[p.name] = p.defaultValue;
        }
      }

      useGraphStore.getState().addNode({
        id,
        type: nodeType,
        position: { x: localX, y: localY },
        parent,
        caseId,
        inputs: [],
        outputs: [],
        params: defaultParams
      });

      resolveNodeOverlaps(id);
      return;
    }

    // 2. UI Control Drop
    const controlDataRaw = e.dataTransfer.getData('application/ui-control');
    if (controlDataRaw && viewMode === 'ui') {
      let controlDef: any;
      try {
        controlDef = JSON.parse(controlDataRaw);
      } catch {
        return;
      }
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
        position: { x: 100, y: 100 },
        inputs: [],
        outputs: [],
        params: { value: controlDef.type === 'button' || controlDef.type === 'switch' ? false : 0 }
      };

      const getPortType = (type: string) => {
        if (type === 'button' || type === 'switch' || type === 'indicatorLight') return 'boolean';
        if (type === 'textLabel') return 'string';
        return 'number';
      };
      const portType = getPortType(controlDef.type);

      if (isIndicator) {
        terminalDef.inputs = [{ name: 'input', type: portType, direction: 'input', id: 'input' }];
      } else {
        terminalDef.outputs = [{ name: 'output', type: portType, direction: 'output', id: 'output' }];
      }

      // Check if we are dropping ON an existing Array UI Control
      const currentControls = useGraphStore.getState().uiControls;
      const targetArrayControl = currentControls.find(c => {
          if (c.type !== 'array') return false;
          if (c.direction !== direction) return false;
          const cx = c.x ?? 50;
          const cy = c.y ?? 50;
          const cw = c.width || 120;
          const ch = c.height || 60;
          return x > cx && x < cx + cw && y > cy && y < cy + ch;
      });

      if (targetArrayControl) {
          if (controlDef.type === 'array') return;

          useGraphStore.getState().updateUIControl(targetArrayControl.id, {
              elementDef: {
                 ...controlDef,
                 defaultValue: controlDefaults[controlDef.type]?.defaultValue ?? 0,
                 width: controlDefaults[controlDef.type]?.width,
                 height: controlDefaults[controlDef.type]?.height,
                 min: controlDefaults[controlDef.type]?.min,
                 max: controlDefaults[controlDef.type]?.max,
                 step: controlDefaults[controlDef.type]?.step,
                 colorOn: controlDefaults[controlDef.type]?.colorOn,
                 colorOff: controlDefaults[controlDef.type]?.colorOff
              },
              width: Math.max(targetArrayControl.width || 120, 46 + (controlDefaults[controlDef.type]?.width || (controlDef.type === 'button' || controlDef.type === 'switch' ? 80 : 140))),
              height: Math.max(targetArrayControl.height || 60, controlDefaults[controlDef.type]?.height || 60)
          });

          const currentTerminal = useGraphStore.getState().nodes.find(n => n.id === targetArrayControl.bindingNodeId);
          if (currentTerminal) {
              const newInputs = currentTerminal.inputs.map(p => ({ ...p, type: `${portType}[]` }));
              const newOutputs = currentTerminal.outputs.map(p => ({ ...p, type: `${portType}[]` }));
              useGraphStore.getState().updateNode(currentTerminal.id, { inputs: newInputs, outputs: newOutputs });
          }
          return;
      }

      const existingLabels = currentControls.map(c => c.label);
      const uniqueLabel = generateUniqueLabel(controlDef.label, existingLabels);

      useGraphStore.getState().addUIControl({
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
  }, [viewMode, reactFlow]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  return (
    <div className="flex flex-col h-screen w-full bg-background text-foreground overflow-hidden">
      <Toolbar onZoomFit={handleZoomFit} />
      <div className="flex flex-1 overflow-hidden relative">
         <Palette />

         <div className="flex-1 flex flex-col overflow-hidden relative border-l border-r border-border">
            {/* Tabs Header */}
            <div className="flex bg-muted/40 border-b border-border shrink-0 px-2 h-10 items-center gap-1 select-none">
               <button
                  className={`relative h-full px-3.5 text-sm font-medium flex items-center gap-1.5 transition-colors border-b-2 -mb-px ${viewMode === 'ui' ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                  onClick={() => setViewMode('ui')}
               >
                  <MousePointer2 size={14} /> UI
               </button>
               <button
                  className={`relative h-full px-3.5 text-sm font-medium flex items-center gap-1.5 transition-colors border-b-2 -mb-px ${viewMode === 'logic' ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                  onClick={() => setViewMode('logic')}
               >
                  <Network size={14} /> Logic
               </button>
            </div>

            {/* Tab Contents */}
            <div
              className="flex-1 flex overflow-hidden relative bg-canvas-bg"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            >
               {viewMode === 'ui' && <FrontPanel ref={frontPanelRef} containerRef={frontPanelDivRef} />}
               {viewMode === 'logic' && <GraphEditor onZoomFitRef={zoomFitRef} />}
            </div>
           <OutputConsole />
         </div>

         <PropertiesPanel />
      </div>
      <NodeSearch isOpen={searchOpen} onClose={() => setSearchOpen(false)} onFocusNode={handleFocusNode} />
      <ShortcutCheatsheet isOpen={cheatsheetOpen} onClose={() => setCheatsheetOpen(false)} />
    </div>
  );
}
