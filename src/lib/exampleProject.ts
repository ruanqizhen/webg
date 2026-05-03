import type { Graph } from '../types/graph';
import { generateId } from './utils';

function id(): string {
  return generateId();
}

export function createExampleProject(): Graph {
  // Create a simple temperature conversion graph:
  // Number Input (Celsius) → Multiply by 9/5 → Add 32 → Display (Fahrenheit)
  //                                               → Greater than 100 → Indicator Light

  const celsiusInputId = id();
  const multiplyNodeId = id();
  const addNodeId = id();
  const greaterNodeId = id();
  const displayId = id();
  const logId = id();
  const terminalInId = id();
  const terminalOutId = id();
  const ctrlInputId = id();
  const ctrlOutputId = id();

  return {
    nodes: [
      {
        id: celsiusInputId,
        type: 'source.number',
        position: { x: 80, y: 100 },
        inputs: [],
        outputs: [{ id: 'value', name: 'value', type: 'number', direction: 'output' }],
        params: { value: 25 },
      },
      {
        id: multiplyNodeId,
        type: 'math.multiply',
        position: { x: 250, y: 100 },
        inputs: [
          { id: 'A', name: 'A', type: 'number', direction: 'input' },
          { id: 'B', name: 'B', type: 'number', direction: 'input' },
        ],
        outputs: [{ id: 'result', name: 'result', type: 'number', direction: 'output' }],
        params: {},
      },
      {
        id: addNodeId,
        type: 'math.add',
        position: { x: 420, y: 100 },
        inputs: [
          { id: 'A', name: 'A', type: 'number', direction: 'input' },
          { id: 'B', name: 'B', type: 'number', direction: 'input' },
        ],
        outputs: [{ id: 'result', name: 'result', type: 'number', direction: 'output' }],
        params: {},
      },
      {
        id: greaterNodeId,
        type: 'logic.greater',
        position: { x: 590, y: 64 },
        inputs: [
          { id: 'A', name: 'A', type: 'number', direction: 'input' },
          { id: 'B', name: 'B', type: 'number', direction: 'input' },
        ],
        outputs: [{ id: 'result', name: 'result', type: 'boolean', direction: 'output' }],
        params: {},
      },
      {
        id: displayId,
        type: 'sink.display',
        position: { x: 590, y: 150 },
        inputs: [{ id: 'value', name: 'value', type: 'any', direction: 'input' }],
        outputs: [{ id: 'pass_through', name: 'pass_through', type: 'any', direction: 'output' }],
        params: {},
      },
      {
        id: logId,
        type: 'sink.log',
        position: { x: 760, y: 150 },
        inputs: [{ id: 'value', name: 'value', type: 'any', direction: 'input' }],
        outputs: [],
        params: {},
      },
      {
        id: terminalInId,
        type: 'io.terminal',
        position: { x: 80, y: 220 },
        inputs: [],
        outputs: [{ id: 'output', name: 'output', type: 'number', direction: 'output' }],
        params: { value: 100 },
      },
      {
        id: terminalOutId,
        type: 'io.terminal',
        position: { x: 760, y: 80 },
        inputs: [{ id: 'input', name: 'input', type: 'boolean', direction: 'input' }],
        outputs: [],
        params: { value: false },
      },
    ],
    edges: [
      { id: id(), sourceNode: celsiusInputId, sourcePort: 'value', targetNode: multiplyNodeId, targetPort: 'A' },
      { id: id(), sourceNode: multiplyNodeId, sourcePort: 'result', targetNode: addNodeId, targetPort: 'A' },
      { id: id(), sourceNode: addNodeId, sourcePort: 'result', targetNode: greaterNodeId, targetPort: 'A' },
      { id: id(), sourceNode: addNodeId, sourcePort: 'result', targetNode: displayId, targetPort: 'value' },
      { id: id(), sourceNode: displayId, sourcePort: 'pass_through', targetNode: logId, targetPort: 'value' },
      { id: id(), sourceNode: greaterNodeId, sourcePort: 'result', targetNode: terminalOutId, targetPort: 'input' },
      { id: id(), sourceNode: terminalInId, sourcePort: 'output', targetNode: greaterNodeId, targetPort: 'B' },
    ],
    uiControls: [
      {
        id: ctrlInputId,
        type: 'numberInput',
        direction: 'control',
        label: 'Threshold (°F)',
        defaultValue: 100,
        bindingNodeId: terminalInId,
        x: 50,
        y: 50,
        width: 140,
        height: 60,
        min: 0,
        max: 500,
        step: 1,
      },
      {
        id: ctrlOutputId,
        type: 'indicatorLight',
        direction: 'indicator',
        label: 'Over Threshold',
        defaultValue: false,
        bindingNodeId: terminalOutId,
        x: 210,
        y: 50,
        width: 80,
        height: 60,
        colorOn: '#EF4444',
        colorOff: '#D1D5DB',
      },
    ],
  };
}
