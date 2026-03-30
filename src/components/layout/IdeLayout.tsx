import { useUIStore } from '../../store/useUIStore';
import { Toolbar } from '../shared/Toolbar';
import { Palette } from '../shared/Palette';
import { PropertiesPanel } from '../shared/PropertiesPanel';
import { FrontPanel } from '../ui/FrontPanel';
import { GraphEditor } from '../logic/GraphEditor';
import { useCallback, useRef } from 'react';
import { useGraphStore } from '../../store/useGraphStore';

export function IdeLayout() {
  const { viewMode } = useUIStore();
  const { addNode } = useGraphStore();
  const zoomFitRef = useRef<(() => void) | null>(null);

  const handleZoomFit = useCallback(() => {
    zoomFitRef.current?.();
  }, []);

  const handleDropLogic = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('application/reactflow');
    if (!type) return;

    // Optional: get bounding client rect to calculate drop position accurately
    // Here we use a minimal approach to place the node
    const id = crypto.randomUUID();
    addNode({
      id,
      type,
      position: { x: e.clientX - 250, y: e.clientY - 60 },
      inputs: [],
      outputs: [],
      params: {}
    });
  }, [addNode]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  return (
    <div className="flex flex-col h-screen w-full bg-white overflow-hidden text-gray-800 font-sans">
      <Toolbar onZoomFit={handleZoomFit} />
      <div className="flex flex-1 overflow-hidden relative">
         <Palette />
         
         <div
           className="flex-1 flex overflow-hidden relative"
           onDrop={viewMode === 'logic' ? handleDropLogic : undefined}
           onDragOver={viewMode === 'logic' ? handleDragOver : undefined}
         >
            {viewMode === 'ui' && <FrontPanel />}
            {viewMode === 'logic' && <GraphEditor onZoomFitRef={zoomFitRef} />}
         </div>

         <PropertiesPanel />
      </div>
    </div>
  );
}
