import { useUIStore } from '../../store/useUIStore';
import { MousePointer2, Network } from 'lucide-react';
import { Toolbar } from '../shared/Toolbar';
import { Palette } from '../shared/Palette';
import { PropertiesPanel } from '../shared/PropertiesPanel';
import { FrontPanel } from '../ui/FrontPanel';
import { GraphEditor } from '../logic/GraphEditor';
import { useCallback, useRef, useEffect } from 'react';
import { useGraphStore } from '../../store/useGraphStore';
import { generateId } from '../../lib/utils';

export function IdeLayout() {
  const { viewMode, setViewMode } = useUIStore();
  const { addNode, loadFromStorage, startAutoSave } = useGraphStore();
  const zoomFitRef = useRef<(() => void) | null>(null);

  const handleZoomFit = useCallback(() => {
    zoomFitRef.current?.();
  }, []);

  // Load from storage on mount and start auto-save
  useEffect(() => {
    // Try to load from storage
    const loaded = loadFromStorage();
    if (!loaded) {
      // No saved project, continue with empty canvas
    }
    
    // Start auto-save
    const cleanup = startAutoSave();
    return cleanup;
  }, [loadFromStorage, startAutoSave]);

  const handleDropLogic = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('application/reactflow');
    if (!type) return;

    const id = generateId();
    addNode({
      id,
      type,
      position: { x: e.clientX - 250, y: e.clientY - 60 },
      inputs: [],
      outputs: [],
      params: {}
    });
  }, [addNode, generateId]);

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
              onDrop={viewMode === 'logic' ? handleDropLogic : undefined}
              onDragOver={viewMode === 'logic' ? handleDragOver : undefined}
            >
               {viewMode === 'ui' && <FrontPanel />}
               {viewMode === 'logic' && <GraphEditor onZoomFitRef={zoomFitRef} />}
            </div>
         </div>

         <PropertiesPanel />
      </div>
    </div>
  );
}
