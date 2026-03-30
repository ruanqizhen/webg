import { useCallback, useMemo, useState, useEffect } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Panel,
  useReactFlow,
  ReactFlowProvider
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
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';

// Inner component that uses useReactFlow - rendered INSIDE ReactFlow
function FlowContent({ onZoomFitRef }: { onZoomFitRef?: React.MutableRefObject<(() => void) | null> }) {
  const reactFlow = useReactFlow();
  const { setSelectedNodeId, setSelectedEdgeId } = useUIStore();
  const [typeMismatch, setTypeMismatch] = useState<string | null>(null);

  // Memoize nodeTypes and edgeTypes to prevent React Flow warnings
  const nodeTypes = useMemo(() => ({
    custom: BaseNode,
    'structure.forLoop': StructureNode,
    'structure.whileLoop': StructureNode,
    'structure.case': StructureNode,
    'io.tunnel': TunnelNode
  }), []);

  const edgeTypes = useMemo(() => ({
    custom: CustomEdge
  }), []);

  // Setup keyboard shortcuts
  useKeyboardShortcuts({
    onZoomFit: () => {
      reactFlow.fitView({ padding: 0.2 });
    }
  });

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
          updateNode(c.id, { position: c.position as any });
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
        id: `e_${connection.source}_${connection.sourceHandle}-${connection.target}_${connection.targetHandle}`,
        sourceNode: connection.source!,
        sourcePort: connection.sourceHandle!,
        targetNode: connection.target!,
        targetPort: connection.targetHandle!
      });
    },
    [nodes, addGraphEdge]
  );

  const flowNodes: FlowNode[] = useMemo(() => nodes.map(n => ({
    id: n.id,
    type: 'custom',
    position: n.position,
    data: { def: NodeRegistry[n.type], caseId: n.caseId },
    parentNode: n.parent,
  })), [nodes]);

  const flowEdges: FlowEdge[] = useMemo(() => edges.map(e => ({
    id: e.id,
    source: e.sourceNode,
    target: e.targetNode,
    sourceHandle: e.sourcePort,
    targetHandle: e.targetPort,
    type: 'custom',
  })), [edges]);

  const onNodeDragStop = useCallback((_: any, node: FlowNode) => {
    if (!node.parentNode) {
       const structures = flowNodes.filter(n => n.id !== node.id && String(n.type).startsWith('structure'));
       for (const s of structures) {
          const sX = s.position?.x ?? 0;
          const sY = s.position?.y ?? 0;
          const sW = s.width || 300;
          const sH = s.height || 200;
          if (node.position.x > sX && node.position.x < sX + sW &&
              node.position.y > sY && node.position.y < sY + sH) {
             const isCaseStructure = s.type === 'structure.case';
             const caseStructureNode = nodes.find(n => n.id === s.id);
             const activeCase = caseStructureNode?.params?.activeCase;

             updateNode(node.id, {
                 parent: s.id,
                 position: { x: node.position.x - sX, y: node.position.y - sY },
                 caseId: isCaseStructure ? activeCase : undefined
             });
             break;
          }
       }
    } else {
       const parentNode = flowNodes.find(n => n.id === node.parentNode);
       if (parentNode) {
          const pW = parentNode.width || 300;
          const pH = parentNode.height || 200;
          if (node.position.x < 0 || node.position.x > pW || node.position.y < 0 || node.position.y > pH) {
             updateNode(node.id, {
                 parent: undefined,
                 position: { x: (parentNode.position?.x ?? 0) + node.position.x, y: (parentNode.position?.y ?? 0) + node.position.y },
                 caseId: undefined
             });
          }
       }
    }

    if (node.parentNode) {
      const parentNode = nodes.find(n => n.id === node.parentNode);
      if (parentNode?.type === 'structure.case') {
        const activeCase = parentNode.params?.activeCase;
        const nodeCaseId = node.data?.caseId;
        if (activeCase && nodeCaseId !== activeCase) {
          updateNode(node.id, { caseId: activeCase });
        }
      }
    }
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
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        deleteKeyCode={["Backspace", "Delete"]}
        onEdgeClick={(_, edge) => setSelectedEdgeId(edge.id)}
        onPaneClick={() => { setSelectedNodeId(null); setSelectedEdgeId(null); }}
      >
        <Background color="#eee" gap={16} />
        <Controls />
        <MiniMap zoomable pannable />
        <Panel position="top-right" className="bg-white p-2 rounded shadow text-sm font-semibold text-gray-500">
          Block Diagram
        </Panel>
      </ReactFlow>
    </>
  );
}

// Wrapper component that provides ReactFlow context
function GraphEditorWithProvider({ onZoomFitRef }: { onZoomFitRef?: React.MutableRefObject<(() => void) | null> }) {
  return (
    <ReactFlowProvider>
      <FlowContent onZoomFitRef={onZoomFitRef} />
    </ReactFlowProvider>
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
