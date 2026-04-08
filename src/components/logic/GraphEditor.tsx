import { useCallback, useMemo, useState, useEffect } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useReactFlow,
} from 'reactflow';
import type {
  Connection,
  Edge as FlowEdge,
  Node as FlowNode,
  NodeChange,
  EdgeChange,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { useGraphStore } from '../../store/useGraphStore';
import { useUIStore } from '../../store/useUIStore';
import { BaseNode } from './nodes/BaseNode';
import { CustomEdge } from './CustomEdge';
import { NodeRegistry } from '../../engine/registry';
import { StructureNode } from './nodes/StructureNode';
import { TunnelNode } from './nodes/TunnelNode';

export const resolveNodeOverlaps = (draggedNodeId: string) => {
    setTimeout(() => {
        const currentNodes = useGraphStore.getState().nodes;
        const targetNode = currentNodes.find(n => n.id === draggedNodeId);
        if (!targetNode || targetNode.type === 'io.tunnel') return;
        
        const targetParent = targetNode.parent;
        const targetCase = targetNode.caseId;
        
        const rects = currentNodes
            .filter(n => n.parent === targetParent && n.caseId === targetCase && n.type !== 'io.tunnel')
            .map(n => ({
                id: n.id,
                x: n.position?.x ?? 0,
                y: n.position?.y ?? 0,
                w: n.width || 120,
                h: n.height || 60
            }));
        
        const rectMap = new Map(rects.map(r => [r.id, r]));
        
        const pushOverlaps = (id: string, visited: Set<string>) => {
            visited.add(id);
            const rect = rectMap.get(id);
            if (!rect) return;
            
            for (const [otherId, other] of rectMap.entries()) {
                if (visited.has(otherId)) continue;
                
                const isOverlap = 
                    rect.x < other.x + other.w &&
                    rect.x + rect.w > other.x &&
                    rect.y < other.y + other.h &&
                    rect.y + rect.h > other.y;
                    
                if (isOverlap) {
                    const pushRight = (rect.x + rect.w) - other.x + 10;
                    const pushDown = (rect.y + rect.h) - other.y + 10;
                    
                    if (pushRight < pushDown) {
                        other.x += pushRight;
                    } else {
                        other.y += pushDown;
                    }
                    
                    pushOverlaps(otherId, visited);
                }
            }
        };
        
        pushOverlaps(draggedNodeId, new Set());
        
        for (const r of rects) {
            const original = currentNodes.find(n => n.id === r.id);
            if (original && (original.position?.x !== r.x || original.position?.y !== r.y)) {
                useGraphStore.getState().updateNode(r.id, { position: { x: r.x, y: r.y } });
            }
        }
    }, 50);
};

const initialNodeTypes: any = {
  custom: BaseNode,
  'structure.forLoop': StructureNode,
  'structure.whileLoop': StructureNode,
  'structure.case': StructureNode,
  'io.tunnel': TunnelNode
};

// Register all primitive and basic logic/math nodes to BaseNode custom renderer
Object.keys(NodeRegistry).forEach(key => {
  if (!initialNodeTypes[key]) {
    initialNodeTypes[key] = BaseNode;
  }
});

const initialEdgeTypes: any = { custom: CustomEdge };

// Inner component that uses useReactFlow - rendered INSIDE ReactFlow
function FlowContent({ onZoomFitRef }: { onZoomFitRef?: React.MutableRefObject<(() => void) | null> }) {
  const reactFlow = useReactFlow();
  const { setSelectedNodeId, setSelectedEdgeId } = useUIStore();
  const [typeMismatch, setTypeMismatch] = useState<string | null>(null);


  // Register zoom fit function with parent ref
  useEffect(() => {
    if (onZoomFitRef) {
      onZoomFitRef.current = () => {
        reactFlow.fitView({ padding: 0.2 });
      };
    }
  }, [reactFlow, onZoomFitRef]);

  const { nodes, edges, updateNode, addEdge: addGraphEdge, removeEdge, removeNode } = useGraphStore();

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      changes.forEach(c => {
        if (c.type === 'position' && c.position) {
          // Read fresh state to avoid stale closure issues with batched changes
          const currentNodes = useGraphStore.getState().nodes;
          const node = currentNodes.find(n => n.id === c.id);
          if (node?.type === 'io.tunnel' && node.parent) {
             const p = currentNodes.find(p => p.id === node.parent);
             const pW = p?.width || 300;
             const pH = p?.height || 200;
             // Determine if it's on the left or right border based on its last known position
             const isRight = (node.position?.x ?? 0) > pW / 2;
             const fixedX = isRight ? pW - 16 : 0; // 16px is approx tunnel width
             const clampedY = Math.max(0, Math.min(pH - 16, c.position.y));
             updateNode(c.id, { position: { x: fixedX, y: clampedY } });
          } else {
             updateNode(c.id, { position: c.position as any });
          }
        } else if (c.type === 'dimensions' && c.dimensions) {
          updateNode(c.id, { width: c.dimensions.width, height: c.dimensions.height });
        } else if (c.type === 'remove') {
          removeNode(c.id);
        }
      });
    },
    [updateNode, removeNode]
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      changes.forEach(c => {
        if (c.type === 'remove') {
          removeEdge(c.id);
        }
      });
    },
    [removeEdge]
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      const sourceNode = nodes.find(n => n.id === connection.source);
      const targetNode = nodes.find(n => n.id === connection.target);

      if (!sourceNode || !targetNode || !connection.sourceHandle || !connection.targetHandle) return;

      const sourceDef = NodeRegistry[sourceNode.type];
      const targetDef = NodeRegistry[targetNode.type];

      const sourcePort = sourceDef?.outputs.find(p => p.name === connection.sourceHandle);
      const targetPort = targetDef?.inputs.find(p => p.name === connection.targetHandle);

      if (sourcePort && targetPort && sourcePort.type !== 'any' && targetPort.type !== 'any' && sourcePort.type !== targetPort.type) {
        setTypeMismatch(`Type mismatch: Cannot connect ${sourcePort.type} to ${targetPort.type}`);
        setTimeout(() => setTypeMismatch(null), 3000);
        return;
      }

      addGraphEdge({
        id: `e_${connection.source}_${connection.sourceHandle}-${connection.target}_${connection.targetHandle}_${Date.now().toString(36)}`,
        sourceNode: connection.source!,
        sourcePort: connection.sourceHandle!,
        targetNode: connection.target!,
        targetPort: connection.targetHandle!
      });
    },
    [nodes, addGraphEdge]
  );

  const getFlowNodeType = (nodeType: string): string => {
    if (nodeType.startsWith('structure.')) return nodeType;
    if (nodeType === 'io.tunnel') return nodeType;
    return 'custom';
  };

  const flowNodes: FlowNode[] = useMemo(() => nodes.map(n => {
    let hidden = false;
    if (n.parent) {
       const parentNode = nodes.find(p => p.id === n.parent);
       if (parentNode?.type === 'structure.case' && parentNode.params?.activeCase) {
          if (n.caseId && n.caseId !== parentNode.params.activeCase) {
             hidden = true;
          }
       }
    }
    return {
      id: n.id,
      type: getFlowNodeType(n.type),
      position: n.position,
      data: { def: NodeRegistry[n.type], nodeType: n.type, caseId: n.caseId },
      parentNode: n.parent,
      hidden,
      ...(n.width ? { width: n.width } : {}),
      ...(n.height ? { height: n.height } : {}),
    };
  }), [nodes]);

  const flowEdges: FlowEdge[] = useMemo(() => edges.map(e => {
     let hidden = false;
     const sourceNode = nodes.find(n => n.id === e.sourceNode);
     const targetNode = nodes.find(n => n.id === e.targetNode);
     
     const checkHidden = (n: any) => {
        if (!n || !n.parent) return false;
        const parentNode = nodes.find(p => p.id === n.parent);
        if (parentNode?.type === 'structure.case' && parentNode.params?.activeCase) {
           if (n.caseId && n.caseId !== parentNode.params.activeCase) return true;
        }
        return false;
     };

     if (checkHidden(sourceNode) || checkHidden(targetNode)) {
         hidden = true;
     }

     return {
       id: e.id,
       source: e.sourceNode,
       target: e.targetNode,
       sourceHandle: e.sourcePort,
       targetHandle: e.targetPort,
       type: 'custom',
       hidden,
     };
  }), [edges, nodes]);

  const onNodeDragStop = useCallback((_: any, node: FlowNode) => {
    if (!node.parentNode) {
       const structures = flowNodes.filter(n => n.id !== node.id && String(n.type).startsWith('structure'));
       const nodeCenterX = node.position.x + (node.width || 120) / 2;
       const nodeCenterY = node.position.y + (node.height || 60) / 2;

       for (const s of structures) {
          const sX = s.position?.x ?? 0;
          const sY = s.position?.y ?? 0;
          const sW = s.width || 300;
          const sH = s.height || 200;
          if (nodeCenterX > sX && nodeCenterX < sX + sW &&
              nodeCenterY > sY && nodeCenterY < sY + sH) {
             const isCaseStructure = s.type === 'structure.case';
             const caseStructureNode = nodes.find(n => n.id === s.id);
             const activeCase = caseStructureNode?.params?.activeCase;

             updateNode(node.id, {
                 parent: s.id,
                 position: { x: node.position.x - sX, y: node.position.y - sY },
                 caseId: isCaseStructure ? activeCase : undefined
             });
             resolveNodeOverlaps(node.id);
             return;
          }
       }
    } else {
       const parentNode = flowNodes.find(n => n.id === node.parentNode);
       if (parentNode && node.type !== 'io.tunnel') {
          const pW = parentNode.width || 300;
          const pH = parentNode.height || 200;
          const nodeCenterX = node.position.x + (node.width || 120) / 2;
          const nodeCenterY = node.position.y + (node.height || 60) / 2;

          if (nodeCenterX < 0 || nodeCenterX > pW || nodeCenterY < 0 || nodeCenterY > pH) {
             updateNode(node.id, {
                 parent: undefined,
                 position: { x: (parentNode.position?.x ?? 0) + node.position.x, y: (parentNode.position?.y ?? 0) + node.position.y },
                 caseId: undefined
             });
             resolveNodeOverlaps(node.id);
             return;
          }
       }
    }

    if (node.parentNode && node.type !== 'io.tunnel') {
      const parentNode = nodes.find(n => n.id === node.parentNode);
      if (parentNode?.type === 'structure.case') {
        const activeCase = parentNode.params?.activeCase;
        const nodeCaseId = node.data?.caseId;
        if (activeCase && nodeCaseId !== activeCase) {
          updateNode(node.id, { caseId: activeCase });
        }
      }
    }

    resolveNodeOverlaps(node.id);
  }, [flowNodes, updateNode, nodes]);

  return (
    <>
      {typeMismatch && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-pulse">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <circle cx="12" cy="16" r="1" fill="currentColor" />
          </svg>
          {typeMismatch}
        </div>
      )}

      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDragStop={onNodeDragStop}
        nodeTypes={initialNodeTypes}
        edgeTypes={initialEdgeTypes}
        fitView
        deleteKeyCode={["Backspace", "Delete"]}
        onEdgeClick={(_, edge) => setSelectedEdgeId(edge.id)}
        onPaneClick={() => { setSelectedNodeId(null); setSelectedEdgeId(null); }}
      >
        <Background color="#eee" gap={16} />
        <Controls />
        <MiniMap zoomable pannable />
      </ReactFlow>
    </>
  );
}

// Wrapper component that provides ReactFlow context
function GraphEditorWithProvider({ onZoomFitRef }: { onZoomFitRef?: React.MutableRefObject<(() => void) | null> }) {
  return (
    <FlowContent onZoomFitRef={onZoomFitRef} />
  );
}

interface GraphEditorProps {
  onZoomFitRef?: React.MutableRefObject<(() => void) | null>;
}

export function GraphEditor({ onZoomFitRef }: GraphEditorProps) {
  return (
    <div className="w-full h-full flex-grow relative" onClick={() => { }}>
      <GraphEditorWithProvider onZoomFitRef={onZoomFitRef} />
    </div>
  );
}
