import { useCallback, useMemo, useRef } from 'react';
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
import { StructureNode } from './nodes/StructureNode';
import { TunnelNode } from './nodes/TunnelNode';

export function GraphEditor() {
  // Use useRef to keep the exact same object reference even across Vite HMR hot-reloads
  const nodeTypes = useRef({ 
    custom: BaseNode, 
    'structure.forLoop': StructureNode,
    'structure.whileLoop': StructureNode,
    'structure.case': StructureNode,
    'io.tunnel': TunnelNode 
  }).current;

  const edgeTypes = useRef({ custom: CustomEdge }).current;

  const { nodes, edges, updateNode, addEdge: addGraphEdge, removeEdge, removeNode } = useGraphStore();
  const { setSelectedNodeId } = useUIStore();

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
        sourceNode: connection.source!,
        sourcePort: connection.sourceHandle!,
        targetNode: connection.target!,
        targetPort: connection.targetHandle!
      });
    },
    [nodes, addGraphEdge]
  );

  const onNodeDragStop = useCallback((_: any, node: FlowNode) => {
    // Basic bounds checking for parent assignment
    // React Flow position is relative to parent!
    // So if it ALREADY has a parent, we don't dynamically reparent easily unless we do absolute coordinate math.
    // For simplicity in this demo, we only assign parent if it has NO parent and is dropped into a structure.
    if (!node.parentNode) {
       const structures = flowNodes.filter(n => n.id !== node.id && String(n.type).startsWith('structure'));
       for (const s of structures) {
          const sX = s.position.x;
          const sY = s.position.y;
          const sW = s.width || 300;
          const sH = s.height || 200;
          if (node.position.x > sX && node.position.x < sX + sW &&
              node.position.y > sY && node.position.y < sY + sH) {
             // Check if it's a Case Structure - assign caseId based on active case
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
       // If it is dragged OUTSIDE its parent bounds, un-parent it.
       const parentNode = flowNodes.find(n => n.id === node.parentNode);
       if (parentNode) {
          const pW = parentNode.width || 300;
          const pH = parentNode.height || 200;
          if (node.position.x < 0 || node.position.x > pW || node.position.y < 0 || node.position.y > pH) {
             // Detach
             updateNode(node.id, {
                 parent: undefined,
                 position: { x: parentNode.position.x + node.position.x, y: parentNode.position.y + node.position.y },
                 caseId: undefined
             });
          }
       }
    }
    
    // Handle moving nodes between cases within a Case Structure
    if (node.parentNode) {
      const parentNode = nodes.find(n => n.id === node.parentNode);
      if (parentNode?.type === 'structure.case') {
        // Node is inside a Case Structure - update its caseId based on current active case
        const activeCase = parentNode.params?.activeCase;
        const nodeCaseId = node.data?.caseId;
        if (activeCase && nodeCaseId !== activeCase) {
          updateNode(node.id, { caseId: activeCase });
        }
      }
    }
  }, [flowNodes, updateNode, nodes]);

  return (
    <div className="w-full h-full flex-grow relative" onClick={() => setSelectedNodeId(null)}>
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
