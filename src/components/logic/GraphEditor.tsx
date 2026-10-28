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
import { useTypeErrorStore } from '../../store/useTypeErrorStore';
import { BaseNode } from './nodes/BaseNode';
import { CustomEdge } from './CustomEdge';
import { NodeRegistry } from '../../engine/registry';
import { StructureNode } from './nodes/StructureNode';
import { BackdropNode } from './nodes/BackdropNode';
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

        const changed = rects.filter(r => {
            const original = currentNodes.find(n => n.id === r.id);
            return original && (original.position?.x !== r.x || original.position?.y !== r.y);
        });
        if (changed.length === 0) return;
        // Single history entry for the whole de-overlap pass (multi-push broke one-shot undo)
        useGraphStore.getState().pushHistory();
        for (const r of changed) {
            useGraphStore.getState().updateNode(r.id, { position: { x: r.x, y: r.y } }, true);
        }
    }, 50);
};

/* ═══════════════════════════════════════════════════════════════
   LabVIEW-style drop-into-structure feedback.
   While a node is dragged over a structure, the frame highlights and
   swells to swallow the node (grow-only, like LabVIEW's auto-grow).
   ═══════════════════════════════════════════════════════════════ */

const DROP_PAD = 16;

type LocalRect = { x: number; y: number; w: number; h: number };

// Canvas-absolute position of a store node, walking up ancestor offsets.
function absPosOf(all: any[], n: any) {
  let x = n.position?.x ?? 0;
  let y = n.position?.y ?? 0;
  let p = n.parent;
  while (p) {
    const pn = all.find(a => a.id === p);
    if (!pn) break;
    x += pn.position?.x ?? 0;
    y += pn.position?.y ?? 0;
    p = pn.parent;
  }
  return { x, y };
}

// Size used for fit math: structures carry real dims, tunnels are 16px,
// everything else falls back to the same 120×60 the drop code already uses.
function childSize(n: any): { w: number; h: number } {
  if (String(n.type).startsWith('structure')) return { w: n.width || 300, h: n.height || 200 };
  if (n.type === 'io.tunnel' || n.type === 'io.shiftRegister') return { w: 16, h: 16 };
  return { w: 120, h: 60 };
}

// Innermost structure whose bounds contain (cx, cy). Excludes the dragged
// node itself and its descendants — a frame can't swallow its own child.
// Shared by the drag highlight and the drop adoption so the two agree.
function findDropTarget(all: any[], cx: number, cy: number, draggedId: string) {
  let best: any | null = null;
  let bestArea = Infinity;
  for (const s of all) {
    if (!String(s.type).startsWith('structure.') || s.id === draggedId) continue;
    let p = s.parent;
    let isDescendant = false;
    while (p) {
      if (p === draggedId) { isDescendant = true; break; }
      const pn = all.find(a => a.id === p);
      p = pn?.parent;
    }
    if (isDescendant) continue;
    const { x, y } = absPosOf(all, s);
    const w = s.width || 300;
    const h = s.height || 200;
    if (cx > x && cx < x + w && cy > y && cy < y + h) {
      const area = w * h;
      if (area < bestArea) { best = s; bestArea = area; }
    }
  }
  return best;
}

// Grow a structure (never shrink) so it encloses `rects` (frame-local coords)
// with DROP_PAD slack. Growing left/top moves the frame and shifts direct
// children by the same amount so they stay visually put; edge-pinned
// tunnels/shift-registers stay glued to the frame edge instead.
function growStructureToFit(structureId: string, rects: LocalRect[]) {
  if (rects.length === 0) return false;
  const st = useGraphStore.getState();
  const all = st.nodes;
  const s = all.find(n => n.id === structureId);
  if (!s) return false;
  const minX = Math.min(...rects.map(r => r.x));
  const minY = Math.min(...rects.map(r => r.y));
  const maxR = Math.max(...rects.map(r => r.x + r.w));
  const maxB = Math.max(...rects.map(r => r.y + r.h));
  const dx = Math.max(0, DROP_PAD - minX);
  const dy = Math.max(0, DROP_PAD - minY);
  const w = s.width || 300;
  const h = s.height || 200;
  // Bottom/right edges never move inward: height must cover the top shift too.
  const newW = Math.max(w + dx, maxR + dx + DROP_PAD);
  const newH = Math.max(h + dy, maxB + dy + DROP_PAD);
  if (dx === 0 && dy === 0 && newW === w && newH === h) return false;
  const sx = s.position?.x ?? 0;
  const sy = s.position?.y ?? 0;
  st.updateNode(structureId, { position: { x: sx - dx, y: sy - dy }, width: newW, height: newH }, true);
  for (const c of all.filter(n => n.parent === structureId)) {
    const cx = c.position?.x ?? 0;
    const cy = c.position?.y ?? 0;
    if (c.type === 'io.tunnel' || c.type === 'io.shiftRegister') {
      const isRight = c.type === 'io.shiftRegister' ? c.params?.side === 'right' : cx > w / 2;
      const nx = isRight ? newW - 16 : cx + dx;
      const ny = Math.max(0, Math.min(newH - 16, cy + dy));
      if (nx !== cx || ny !== cy) st.updateNode(c.id, { position: { x: nx, y: ny } }, true);
    } else if (dx !== 0 || dy !== 0) {
      st.updateNode(c.id, { position: { x: cx + dx, y: cy + dy } }, true);
    }
  }
  return true;
}

// After a drop, grow each ancestor so it still encloses its (possibly
// just-grown) child frames. Grow-only: frames never shrink on drop.
function fitAncestors(startId: string) {
  let curId: string | undefined = startId;
  while (curId) {
    const all = useGraphStore.getState().nodes;
    const cur = all.find(n => n.id === curId);
    const parentId = cur?.parent;
    if (!parentId) break;
    const kids = all.filter(n => n.parent === parentId);
    if (kids.length > 0) {
      growStructureToFit(parentId, kids.map(k => ({ x: k.position?.x ?? 0, y: k.position?.y ?? 0, ...childSize(k) })));
    }
    curId = parentId;
  }
}

const initialNodeTypes: any = {
  custom: BaseNode,
  backdrop: BackdropNode,
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
): { message: string; sourceType: string; targetType: string } | null {
  const sourceDef = NodeRegistry[sourceNodeType];
  const targetDef = NodeRegistry[targetNodeType];
  const sourcePort = sourceDef?.outputs.find(p => p.name === sourceHandle);
  const targetPort = targetDef?.inputs.find(p => p.name === targetHandle);
  if (sourcePort && targetPort && sourcePort.type !== 'any' && targetPort.type !== 'any' && sourcePort.type !== targetPort.type) {
    // Allow number <-> integer compatibility (LabVIEW style coercion)
    const compatible = (a: string, b: string) => {
      const la = a.toLowerCase(); const lb = b.toLowerCase();
      if ((la === 'number' && lb === 'integer') || (la === 'integer' && lb === 'number')) return true;
      return false;
    };
    if (compatible(sourcePort.type, targetPort.type)) return null;
    return { message: `Type mismatch: Cannot connect ${sourcePort.type} to ${targetPort.type}`, sourceType: sourcePort.type, targetType: targetPort.type };
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
      const removeIds: string[] = [];
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
          // skipHistory: resize start pushes one entry (see NodeResizer onResizeStart),
          // otherwise every tick of a resize drag would flood the 50-entry history stack
          updateNode(c.id, { width: dims.width, height: dims.height }, true);

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
        } else if (c.type === 'remove') {
          removeIds.push(c.id);
        }
      });
      if (removeIds.length > 0) {
        // Check for structure nodes with children — confirm
        const store = useGraphStore.getState();
        const structWithChildren = removeIds.filter(id => {
          const n = store.nodes.find(nd => nd.id === id);
          return n && String(n.type).startsWith('structure.') && store.nodes.some(child => child.parent === id);
        });
        if (structWithChildren.length > 0) {
          if (!window.confirm(`Delete ${structWithChildren.length} structure node(s)? All internal nodes and connections will be permanently removed.`)) return;
        }
        store.removeNodes(removeIds);
        useUIStore.getState().clearSelection();
      }
    },
    [updateNode]
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      const removeIds: string[] = [];
      changes.forEach(c => {
        if (c.type === 'remove') {
          removeIds.push(c.id);
        }
      });
      if (removeIds.length > 0) {
        useGraphStore.getState().removeEdges(removeIds);
        useUIStore.getState().setSelectedEdgeId(null);
      }
    },
    []
  );

  const onConnect = useCallback(
    (connection: Connection) => {
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
        showTypeMismatch(mismatch.message);
        useTypeErrorStore.getState().addError({
          sourceNode: connection.source!,
          sourcePort: connection.sourceHandle!,
          sourceType: mismatch.sourceType,
          targetNode: connection.target!,
          targetPort: connection.targetHandle!,
          targetType: mismatch.targetType,
          message: mismatch.message
        });
        return;
      }

      useTypeErrorStore.getState().removeError(connection.target!, connection.targetHandle!);

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
    // Absolute (canvas) position of a node, accumulating ancestor offsets.
    // Backdrop mirrors must be top-level, so they need global coords.
    const toGlobal = (n: (typeof nodes)[number]) => {
      let x = n.position?.x ?? 0;
      let y = n.position?.y ?? 0;
      let p = n.parent;
      while (p) {
        const pn = nodeMap.get(p);
        if (!pn) break;
        x += pn.position?.x ?? 0;
        y += pn.position?.y ?? 0;
        p = pn.parent;
      }
      return { x, y };
    };
    const result: FlowNode[] = [];
    for (const n of nodes) {
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
      const isStructure = n.type.startsWith('structure.');
      if (isStructure) {
        // Pure-background mirror rendered at zIndex -1 (below the edges
        // layer), so wires inside the structure stay above the frosted fill.
        // Top-level + absolute coords: ReactFlow has no nested zIndex below edges.
        const g = toGlobal(n);
        result.push({
          id: `${n.id}__bg`,
          type: 'backdrop',
          position: g,
          data: { structureId: n.id, isForLoop: n.type === 'structure.forLoop' },
          hidden,
          draggable: false,
          selectable: false,
          connectable: false,
          focusable: false,
          zIndex: -1,
          className: 'pointer-events-none',
          // Explicit size: ReactFlow's node wrapper carries no width/height
          // of its own and shrink-fits its content, so without this the
          // w-full h-full fill measured ~0 and the backdrop was invisible.
          // Same fallback as the StructureNode chrome (320×220).
          style: { width: n.width || 320, height: n.height || 220 },
          ...(n.width ? { width: n.width } : {}),
          ...(n.height ? { height: n.height } : {}),
        });
      }
      result.push({
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
      });
    }
    return result;
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

  // Live LabVIEW-style feedback while dragging: highlight the frame the node
  // hovers over, and swell that frame to swallow the node. For nodes already
  // inside a frame, only grow the frame's right/bottom edge — never move a
  // frame under a live drag.
  const onNodeDrag = useCallback((_: any, node: FlowNode) => {
    const st = useGraphStore.getState();
    const ui = useUIStore.getState();
    const all = st.nodes;
    const nw = node.width || 120;
    const nh = node.height || 60;
    const nx = node.position?.x ?? 0;
    const ny = node.position?.y ?? 0;

    if (node.parentNode) {
      if (ui.dropTargetStructureId) ui.setDropTargetStructureId(null);
      // Deliberately NO frame growth while dragging a node that is already
      // inside a structure. Growing here only ever extends the right/bottom
      // edges (left/top growth would have to shift the frame and every child
      // mid-drag), so the frame chased the node on right/bottom exits and
      // the node's center could never cross the border — while left/top
      // exits worked directly. That asymmetry made drag-out direction
      // dependent. The frame now stays put during the drag, so exiting
      // works identically in all four directions; containment is restored
      // at drop time (see onNodeDragStop) instead of mid-drag.
      return;
    }

    const cx = nx + nw / 2;
    const cy = ny + nh / 2;
    const target = findDropTarget(all, cx, cy, node.id);
    const targetId = target?.id ?? null;
    if (ui.dropTargetStructureId !== targetId) ui.setDropTargetStructureId(targetId);
    if (target) {
      const { x: tx, y: ty } = absPosOf(all, target);
      growStructureToFit(target.id, [{ x: nx - tx, y: ny - ty, w: nw, h: nh }]);
    }
  }, []);

  const onNodeDragStop = useCallback((_: any, node: FlowNode) => {
    useUIStore.getState().setDropTargetStructureId(null);
    const GRID = 16;
    const snappedX = Math.round(node.position.x / GRID) * GRID;
    const snappedY = Math.round(node.position.y / GRID) * GRID;
    const pos = { x: snappedX, y: snappedY };
    if (snappedX !== node.position.x || snappedY !== node.position.y) {
      updateNode(node.id, { position: pos }, true);
    }

    if (!node.parentNode) {
       const nodeCenterX = pos.x + (node.width || 120) / 2;
       const nodeCenterY = pos.y + (node.height || 60) / 2;
       // Same innermost-frame rule as the drag highlight, so the frame that
       // lit up is the frame that adopts the node.
       const target = findDropTarget(nodes, nodeCenterX, nodeCenterY, node.id);
       if (target) {
          const { x: absX, y: absY } = absPosOf(nodes, target);
          const isCaseStructure = target.type === 'structure.case';
          const activeCase = target.params?.activeCase;

          updateNode(node.id, {
              parent: target.id,
              position: { x: pos.x - absX, y: pos.y - absY },
              caseId: isCaseStructure ? activeCase : undefined
          });
          fitAncestors(target.id);
          resolveNodeOverlaps(node.id);
          return;
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
      // Drop-time fit: a node dropped half-out (center still inside, edge
      // poking past the border) swells the frame to enclose it, and the
      // ancestors follow. This runs only on drop, never during the drag,
      // so it cannot chase a node that is being dragged out — which is
      // what keeps drag-out identical in all four directions.
      growStructureToFit(node.parentNode, [{ x: pos.x, y: pos.y, w: node.width || 120, h: node.height || 60 }]);
      fitAncestors(node.parentNode);
    }

    resolveNodeOverlaps(node.id);
  }, [flowNodes, updateNode, nodes]);

  return (
    <>
      {typeMismatch && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-destructive text-destructive-foreground px-3.5 py-2 rounded-lg shadow-float flex items-center gap-2 text-sm animate-in slide-in-from-top-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
        onNodeDrag={onNodeDrag}
        onNodeDragStop={onNodeDragStop}
        nodeTypes={initialNodeTypes}
        edgeTypes={initialEdgeTypes}
        fitView
        nodesFocusable={true}
        nodesDraggable={true}
        elementsSelectable={true}
        proOptions={{ hideAttribution: true }}
        deleteKeyCode={["Backspace", "Delete"]}
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
              showTypeMismatch(mismatch.message);
              useTypeErrorStore.getState().addError({
                sourceNode: newConnection.source!,
                sourcePort: newConnection.sourceHandle!,
                sourceType: mismatch.sourceType,
                targetNode: newConnection.target!,
                targetPort: newConnection.targetHandle!,
                targetType: mismatch.targetType,
                message: mismatch.message
              });
              return;
            }
          }
          const state = useGraphStore.getState();
          state.removeEdge(oldEdge.id);
          const oldTarget = (oldEdge as any).targetNode || (oldEdge as any).target;
          const oldTargetPort = (oldEdge as any).targetPort || (oldEdge as any).targetHandle;
          if (oldTarget) useTypeErrorStore.getState().removeError(oldTarget, oldTargetPort);
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
            useTypeErrorStore.getState().removeError(newConnection.target!, targetHandle);
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
        <Background color="hsl(var(--border))" gap={24} size={1} />
        <Controls className="bg-card border border-border rounded-lg shadow-sm [&>button]:!bg-card [&>button]:!border-border hover:[&>button]:!bg-accent" />
        <MiniMap className="bg-card border border-border rounded-lg shadow-sm" zoomable pannable />
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
