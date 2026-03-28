import { useCallback, useMemo } from 'react';
import ReactFlow, { 
  Background, 
  Controls, 
  MiniMap, 
  Panel
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



export function GraphEditor() {
  const { nodes, edges, updateNode, addEdge: addGraphEdge, removeEdge, removeNode } = useGraphStore();
  const { setSelectedNodeId } = useUIStore();

  const flowNodes: FlowNode[] = useMemo(() => nodes.map(n => ({
    id: n.id,
    type: 'custom',
    position: n.position,
    data: { def: NodeRegistry[n.type] },
  })), [nodes]);

  const flowEdges: FlowEdge[] = useMemo(() => edges.map(e => ({
    id: e.id,
    source: e.sourceNode,
    target: e.targetNode,
    sourceHandle: e.sourcePort,
    targetHandle: e.targetPort,
    type: 'custom',
  })), [edges]);

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
        alert(`Type mismatch: Cannot connect ${sourcePort.type} to ${targetPort.type}`);
        return;
      }

      addGraphEdge({
        id: `e_${connection.source}_${connection.sourceHandle}-${connection.target}_${connection.targetHandle}`,
        sourceNode: connection.source,
        sourcePort: connection.sourceHandle,
        targetNode: connection.target,
        targetPort: connection.targetHandle
      });
    },
    [nodes, addGraphEdge]
  );

  const memoizedNodeTypes = useMemo(() => ({ custom: BaseNode }), []);
  const memoizedEdgeTypes = useMemo(() => ({ custom: CustomEdge }), []);

  return (
    <div className="w-full h-full flex-grow relative" onClick={() => setSelectedNodeId(null)}>
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={memoizedNodeTypes}
        edgeTypes={memoizedEdgeTypes}
        fitView
        deleteKeyCode={["Backspace", "Delete"]}
      >
        <Background color="#eee" gap={16} />
        <Controls />
        <MiniMap zoomable pannable />
        <Panel position="top-right" className="bg-white p-2 rounded shadow text-sm font-semibold text-gray-500">
          Block Diagram
        </Panel>
      </ReactFlow>
    </div>
  );
}
