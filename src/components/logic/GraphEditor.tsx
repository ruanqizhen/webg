import { useCallback, useMemo, useState, useEffect, useRef } from 'react';
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
        if (!targetNode || targetNode.type === 'io.tunnel' || targetNode.type === 'io.shiftRegister') return;

        const targetParent = targetNode.parent;
        const targetCase = targetNode.caseId;

        const rects = currentNodes
            .filter(n => n.parent === targetParent && n.caseId === targetCase && n.type !== 'io.tunnel' && n.type !== 'io.shiftRegister')
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
  'io.tunnel': TunnelNode,
  'io.shiftRegister': TunnelNode
};

Object.keys(NodeRegistry).forEach(key => {
  if (!initialNodeTypes[key]) {
    initialNodeTypes[key] = BaseNode;
  }
});

const initialEdgeTypes: any = { custom: CustomEdge };

function validateConnection(
  sourceNodeType: string,
  targetNodeType: string,
  sourceHandle: string,
  targetHandle: string
): string | null {
  const sourceDef = NodeRegistry[sourceNodeType];
  const targetDef = NodeRegistry[targetNodeType];
  const sourcePort = sourceDef?.outputs.find(p => p.name === sourceHandle);
  const targetPort = targetDef?.inputs.find(p => p.name === targetHandle);
  if (sourcePort && targetPort && sourcePort.type !== 'any' && targetPort.type !== 'any' && sourcePort.type !== targetPort.type) {
    return `Type mismatch: Cannot connect ${sourcePort.type} to ${targetPort.type}`;
  }
  return null;
}

// Inner component that uses useReactFlow - rendered INSIDE ReactFlow
function FlowContent({ onZoomFitRef }: { onZoomFitRef?: React.MutableRefObject<(() => void) | null> }) {
  const reactFlow = useReactFlow();
  const { setSelectedEdgeId, setSelectedNodeIds } = useUIStore();
  const [typeMismatch, setTypeMismatch] = useState<string | null>(null);
  const typeMismatchTimerRef = useRef<number | null>(null);

  const showTypeMismatch = useCallback((msg: string) => {
    setTypeMismatch(msg);
    if (typeMismatchTimerRef.current) window.clearTimeout(typeMismatchTimerRef.current);
    typeMismatchTimerRef.current = window.setTimeout(() => setTypeMismatch(null), 3000);
  }, []);

  useEffect(() => {
    return () => {
      if (typeMismatchTimerRef.current) window.clearTimeout(typeMismatchTimerRef.current);
    };
  }, []);

  // Register zoom fit function with parent ref
  useEffect(() => {
    if (onZoomFitRef) {
      onZoomFitRef.current = () => {
        reactFlow.fitView({ padding: 0.2 });
      };
    }
  }, [reactFlow, onZoomFitRef]);

  const { nodes, edges, updateNode, pushHistory } = useGraphStore();

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      changes.forEach(c => {
        if (c.type === 'position' && c.position) {
          const currentNodes = useGraphStore.getState().nodes;
          const node = currentNodes.find(n => n.id === c.id);
          if ((node?.type === 'io.tunnel' || node?.type === 'io.shiftRegister') && node.parent) {
             const p = currentNodes.find(p => p.id === node.parent);
             const pW = p?.width || 300;
             const pH = p?.height || 200;
             let isRight = false;
             if (node.type === 'io.shiftRegister') {
                 isRight = node.params?.side === 'right';
             } else {
                 isRight = (c.position.x ?? 0) > pW / 2;
             }
             const fixedX = isRight ? pW - 16 : 0;
             const clampedY = Math.max(0, Math.min(pH - 16, c.position.y));
             updateNode(c.id, { position: { x: fixedX, y: clampedY } }, true);
          } else {
             updateNode(c.id, { position: c.position }, true);
          }
        } else if (c.type === 'dimensions' && c.dimensions) {
          const dims = c.dimensions;
          updateNode(c.id, { width: dims.width, height: dims.height });

          const currentNodes = useGraphStore.getState().nodes;
          const parentNode = currentNodes.find(n => n.id === c.id);
          if (parentNode && String(parentNode.type).startsWith('structure')) {
             const oldPW = parentNode.width || 300;
             const children = currentNodes.filter(n => n.parent === c.id && (n.type === 'io.tunnel' || n.type === 'io.shiftRegister'));
             children.forEach(child => {
                let isRight = false;
                if (child.type === 'io.shiftRegister') {
                    isRight = child.params?.side === 'right';
                } else {
                    isRight = (child.position?.x ?? 0) > oldPW / 2;
                }

                let newX = child.position?.x ?? 0;
                let newY = child.position?.y ?? 0;

                if (isRight) newX = dims.width - 16;
                newY = Math.max(0, Math.min(dims.height - 16, newY));

                if (newX !== (child.position?.x ?? 0) || newY !== (child.position?.y ?? 0)) {
                    updateNode(child.id, { position: { x: newX, y: newY } }, true);
                }
             });
          }
        }
        // NOTE: remove type intentionally ignored here to avoid double-delete
        // with useKeyboardShortcuts — deletion is handled centrally there.
      });
    },
    [updateNode]
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      // Only handle selection changes — delete is handled by keyboard hook to avoid double history
      changes.forEach(c => {
        if (c.type === 'remove') {
          // Skip: handled by useKeyboardShortcuts to prevent double history push
        }
      });
    },
    []
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      // Read fresh state to avoid stale closure
      const currentNodes = useGraphStore.getState().nodes;
      const sourceNode = currentNodes.find(n => n.id === connection.source);
      const targetNode = currentNodes.find(n => n.id === connection.target);

      if (!sourceNode || !targetNode || !connection.sourceHandle || !connection.targetHandle) return;

      const mismatch = validateConnection(
        sourceNode.type,
        targetNode.type,
        connection.sourceHandle,
        connection.targetHandle
      );
      if (mismatch) {
        showTypeMismatch(mismatch);
        return;
      }

      useGraphStore.getState().addEdge({
        id: `e_${connection.source}_${connection.sourceHandle}-${connection.target}_${connection.targetHandle}_${Date.now().toString(36)}`,
        sourceNode: connection.source!,
        sourcePort: connection.sourceHandle!,
        targetNode: connection.target!,
        targetPort: connection.targetHandle!
      });
    },
    [showTypeMismatch]
  );

  const flowNodes: FlowNode[] = useMemo(() => {
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    return nodes.map(n => {
      let hidden = false;
      let curr: typeof n | undefined = n;
      // Walk ancestor chain for case hidden logic
      while (curr?.parent) {
        const parentNode = nodeMap.get(curr.parent);
        if (parentNode?.type === 'structure.case' && parentNode.params?.activeCase) {
          const isChildOfThisParent = n.parent === parentNode.id || curr.parent === parentNode.id;
          const checkNode = n.parent === parentNode.id ? n : curr;
          if (checkNode.caseId && checkNode.caseId !== parentNode.params?.activeCase) {
            if (isChildOfThisParent || n.caseId) {
              hidden = true;
              break;
            }
          }
        }
        curr = parentNode ? { ...parentNode, id: parentNode.id } as any : undefined;
        if (curr && curr.parent) {
          const gp = nodeMap.get(curr.parent);
          if (gp?.type === 'structure.case' && gp.params?.activeCase) {
            if (n.caseId && n.caseId !== gp.params?.activeCase) {
              hidden = true;
              break;
            }
          }
          curr = gp as any;
        } else {
          break;
        }
      }
      return {
        id: n.id,
        type: n.type.startsWith('structure.') ? n.type : (n.type === 'io.tunnel' || n.type === 'io.shiftRegister' ? n.type : 'custom'),
        position: n.position,
        data: { def: NodeRegistry[n.type], nodeType: n.type, caseId: n.caseId },
        parentNode: n.parent,
        hidden,
        ...(n.width ? { width: n.width } : {}),
        ...(n.height ? { height: n.height } : {}),
        className: n.type.startsWith('structure.') ? 'pointer-events-none' : '',
        zIndex: n.type.startsWith('structure.') ? 0 : 1,
      };
    });
  }, [nodes]);

  const flowEdges: FlowEdge[] = useMemo(() => {
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    return edges.map(e => {
       let hidden = false;
       const sourceNode = nodeMap.get(e.sourceNode);
       const targetNode = nodeMap.get(e.targetNode);

       const checkHidden = (node: (typeof nodeMap extends Map<any, infer V> ? V : never) | undefined) => {
         if (!node) return false;
         let curr: any = node;
         while (curr?.parent) {
           const parentNode = nodeMap.get(curr.parent);
           if (parentNode?.type === 'structure.case' && parentNode.params?.activeCase) {
             const checkId = curr === node ? (node as any).caseId : curr.caseId;
             if (checkId && checkId !== parentNode.params.activeCase) return true;
           }
           curr = parentNode;
         }
         return false;
       };

       if (checkHidden(sourceNode as any) || checkHidden(targetNode as any)) {
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
    });
  }, [edges, nodes]);

  const onNodeDragStart = useCallback(() => {
    pushHistory();
  }, [pushHistory]);

  const onNodeDragStop = useCallback((_: any, node: FlowNode) => {
    const GRID = 16;
    const snappedX = Math.round(node.position.x / GRID) * GRID;
    const snappedY = Math.round(node.position.y / GRID) * GRID;
    const pos = { x: snappedX, y: snappedY };
    if (snappedX !== node.position.x || snappedY !== node.position.y) {
      updateNode(node.id, { position: pos }, true);
    }

    if (!node.parentNode) {
       const structures = flowNodes.filter(n => n.id !== node.id && String(n.type).startsWith('structure'));
       const nodeCenterX = pos.x + (node.width || 120) / 2;
       const nodeCenterY = pos.y + (node.height || 60) / 2;

       for (const s of structures) {
          let absX = s.position?.x ?? 0;
          let absY = s.position?.y ?? 0;
          let curParentId: string | undefined = nodes.find(n => n.id === s.id)?.parent;
          while (curParentId) {
            const p = nodes.find(n => n.id === curParentId);
            if (!p) break;
            absX += p.position?.x ?? 0;
            absY += p.position?.y ?? 0;
            curParentId = p.parent;
          }
          const sW = s.width || 300;
          const sH = s.height || 200;
          if (nodeCenterX > absX && nodeCenterX < absX + sW &&
              nodeCenterY > absY && nodeCenterY < absY + sH) {
             const isCaseStructure = s.type === 'structure.case';
             const caseStructureNode = nodes.find(n => n.id === s.id);
             const activeCase = caseStructureNode?.params?.activeCase;

             updateNode(node.id, {
                 parent: s.id,
                 position: { x: pos.x - absX, y: pos.y - absY },
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
          const nodeCenterX2 = pos.x + (node.width || 120) / 2;
          const nodeCenterY2 = pos.y + (node.height || 60) / 2;

          if (nodeCenterX2 < 0 || nodeCenterX2 > pW || nodeCenterY2 < 0 || nodeCenterY2 > pH) {
             let gx = (parentNode.position?.x ?? 0) + pos.x;
             let gy = (parentNode.position?.y ?? 0) + pos.y;
             let curPid: string | undefined = nodes.find(n => n.id === parentNode.id)?.parent;
             while (curPid) {
               const pp = nodes.find(n => n.id === curPid);
               if (!pp) break;
               gx += pp.position?.x ?? 0;
               gy += pp.position?.y ?? 0;
               curPid = pp.parent;
             }
             updateNode(node.id, {
                 parent: undefined,
                 position: { x: gx, y: gy },
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
        onNodeDragStart={onNodeDragStart}
        onNodeDragStop={onNodeDragStop}
        nodeTypes={initialNodeTypes}
        edgeTypes={initialEdgeTypes}
        fitView
        nodesFocusable={true}
        nodesDraggable={true}
        elementsSelectable={true}
        proOptions={{ hideAttribution: true }}
        deleteKeyCode={null}
        onReconnect={(oldEdge, newConnection) => {
          const currentNodes = useGraphStore.getState().nodes;
          const srcNode = currentNodes.find(n => n.id === newConnection.source);
          const tgtNode = currentNodes.find(n => n.id === newConnection.target);
          if (srcNode && tgtNode && newConnection.sourceHandle && newConnection.targetHandle) {
            const mismatch = validateConnection(
              srcNode.type,
              tgtNode.type,
              newConnection.sourceHandle,
              newConnection.targetHandle
            );
            if (mismatch) {
              showTypeMismatch(mismatch);
              return;
            }
          }
          const state = useGraphStore.getState();
          state.removeEdge(oldEdge.id);
          const sourceHandle = newConnection.sourceHandle;
          const targetHandle = newConnection.targetHandle;
          if (newConnection.source && newConnection.target && sourceHandle && targetHandle) {
            state.addEdge({
              id: `e_${newConnection.source}_${sourceHandle}-${newConnection.target}_${targetHandle}_${Date.now().toString(36)}`,
              sourceNode: newConnection.source,
              sourcePort: sourceHandle,
              targetNode: newConnection.target,
              targetPort: targetHandle,
            });
          }
        }}
        onEdgeClick={(_, edge) => setSelectedEdgeId(edge.id)}
        onPaneClick={() => {
          useUIStore.getState().clearSelection();
        }}
        onSelectionChange={({ nodes: selectedNodes }) => {
          setSelectedNodeIds(selectedNodes.map((n) => n.id));
        }}
        multiSelectionKeyCode="Shift"
        selectionKeyCode="Shift"
      >
        <Background color="#eee" gap={16} />
        <Controls />
        <MiniMap zoomable pannable />
      </ReactFlow>
    </>
  );
}

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
