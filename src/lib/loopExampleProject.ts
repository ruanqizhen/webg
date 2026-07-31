import type { Graph } from '../types/graph';
import { generateId } from './utils';

function id(): string { return generateId(); }

/**
 * LabVIEW-style Loop demo:
 * - For Loop: array [1,2,3,4,5] → auto-indexing in → Add with shift register (sum) → output array and sum
 * - While Loop: counting with shift register until threshold
 */
export function createLoopExampleProject(): Graph {
  const arrayId = id();
  const forLoopId = id();
  const addInsideForId = id();
  const forOutputTunnelId = id();
  const forInputTunnelId = id();
  const srLeft1Id = id();
  const srRight1Id = id();
  const srPair1 = `sr_${id()}`;

  const whileLoopId = id();
  const addInsideWhileId = id();
  const constOneId = id();
  const thresholdId = id();
  const greaterId = id();
  const srLeft2Id = id();
  const srRight2Id = id();
  const srPair2 = `sr_${id()}`;
  const displayWhileSumId = id();

  const displayForSumId = id();
  const displayForArrayId = id();

  return {
    nodes: [
      // Source array [1,2,3,4,5]
      {
        id: arrayId,
        type: 'source.array',
        position: { x: 40, y: 40 },
        inputs: [],
        outputs: [{ id: 'value', name: 'value', type: 'number[]', direction: 'output' }],
        params: { value: [1, 2, 3, 4, 5], elementType: 'source.number' }
      },
      // For Loop
      {
        id: forLoopId,
        type: 'structure.forLoop',
        position: { x: 200, y: 20 },
        width: 400,
        height: 220,
        inputs: [],
        outputs: [],
        params: { hasConditional: false, conditionalMode: 'stopIfTrue', maxIterations: 0 }
      },
      // For Loop input tunnel (auto-indexing array element)
      {
        id: forInputTunnelId,
        type: 'io.tunnel',
        position: { x: 0, y: 40 },
        parent: forLoopId,
        inputs: [],
        outputs: [],
        params: { indexing: true }
      },
      // Shift register left (init 0)
      {
        id: srLeft1Id,
        type: 'io.shiftRegister',
        position: { x: 0, y: 120 },
        parent: forLoopId,
        inputs: [],
        outputs: [],
        params: { pairId: srPair1, side: 'left' }
      },
      // Inside For: Add (element + running sum)
      {
        id: addInsideForId,
        type: 'math.add',
        position: { x: 120, y: 60 },
        parent: forLoopId,
        inputs: [
          { id: 'A', name: 'A', type: 'number', direction: 'input' },
          { id: 'B', name: 'B', type: 'number', direction: 'input' }
        ],
        outputs: [{ id: 'result', name: 'result', type: 'number', direction: 'output' }],
        params: {}
      },
      // Shift register right (feedback)
      {
        id: srRight1Id,
        type: 'io.shiftRegister',
        position: { x: 380, y: 120 },
        parent: forLoopId,
        inputs: [],
        outputs: [],
        params: { pairId: srPair1, side: 'right' }
      },
      // For output tunnel (last sum, non-indexing)
      {
        id: forOutputTunnelId,
        type: 'io.tunnel',
        position: { x: 384, y: 60 },
        parent: forLoopId,
        inputs: [],
        outputs: [],
        params: { indexing: false }
      },

      // For Loop result displays outside loop
      {
        id: displayForSumId,
        type: 'sink.display',
        position: { x: 650, y: 40 },
        inputs: [{ id: 'value', name: 'value', type: 'any', direction: 'input' }],
        outputs: [{ id: 'pass_through', name: 'pass_through', type: 'any', direction: 'output' }],
        params: {}
      },
      {
        id: displayForArrayId,
        type: 'sink.display',
        position: { x: 650, y: 100 },
        inputs: [{ id: 'value', name: 'value', type: 'any', direction: 'input' }],
        outputs: [{ id: 'pass_through', name: 'pass_through', type: 'any', direction: 'output' }],
        params: {}
      },

      // While Loop — counting with SR until >5
      {
        id: whileLoopId,
        type: 'structure.whileLoop',
        position: { x: 200, y: 320 },
        width: 420,
        height: 200,
        inputs: [],
        outputs: [],
        params: { conditionMode: 'stopIfTrue', maxIterations: 1000 }
      },
      { id: srLeft2Id, type: 'io.shiftRegister', position: { x: 0, y: 30 }, parent: whileLoopId, inputs: [], outputs: [], params: { pairId: srPair2, side: 'left' } },
      { id: constOneId, type: 'source.number', position: { x: 80, y: 40 }, parent: whileLoopId, inputs: [], outputs: [{ id: 'value', name: 'value', type: 'number', direction: 'output' }], params: { value: 1 } },
      { id: addInsideWhileId, type: 'math.add', position: { x: 160, y: 40 }, parent: whileLoopId, inputs: [{ id: 'A', name: 'A', type: 'number', direction: 'input' }, { id: 'B', name: 'B', type: 'number', direction: 'input' }], outputs: [{ id: 'result', name: 'result', type: 'number', direction: 'output' }], params: {} },
      { id: thresholdId, type: 'source.number', position: { x: 80, y: 120 }, parent: whileLoopId, inputs: [], outputs: [{ id: 'value', name: 'value', type: 'number', direction: 'output' }], params: { value: 5 } },
      { id: greaterId, type: 'logic.greater', position: { x: 260, y: 90 }, parent: whileLoopId, inputs: [{ id: 'A', name: 'A', type: 'number', direction: 'input' }, { id: 'B', name: 'B', type: 'number', direction: 'input' }], outputs: [{ id: 'result', name: 'result', type: 'boolean', direction: 'output' }], params: {} },
      { id: srRight2Id, type: 'io.shiftRegister', position: { x: 400, y: 30 }, parent: whileLoopId, inputs: [], outputs: [], params: { pairId: srPair2, side: 'right' } },

      { id: displayWhileSumId, type: 'sink.display', position: { x: 670, y: 340 }, inputs: [{ id: 'value', name: 'value', type: 'any', direction: 'input' }], outputs: [{ id: 'pass_through', name: 'pass_through', type: 'any', direction: 'output' }], params: {} },
    ],
    edges: [
      // For Loop wiring
      { id: id(), sourceNode: arrayId, sourcePort: 'value', targetNode: forInputTunnelId, targetPort: 'input' },
      { id: id(), sourceNode: forInputTunnelId, sourcePort: 'output', targetNode: addInsideForId, targetPort: 'A' },
      { id: id(), sourceNode: srLeft1Id, sourcePort: 'output', targetNode: addInsideForId, targetPort: 'B' },
      { id: id(), sourceNode: addInsideForId, sourcePort: 'result', targetNode: srRight1Id, targetPort: 'input' },
      { id: id(), sourceNode: addInsideForId, sourcePort: 'result', targetNode: forOutputTunnelId, targetPort: 'input' },
      { id: id(), sourceNode: forOutputTunnelId, sourcePort: 'output', targetNode: displayForSumId, targetPort: 'value' },
      // For Loop output array example — pass-through array via tunnel indexing output (create extra tunnel if needed, simplified: same as input array pass-through)
      { id: id(), sourceNode: forInputTunnelId, sourcePort: 'output', targetNode: displayForArrayId, targetPort: 'value' },

      // While Loop wiring
      { id: id(), sourceNode: srLeft2Id, sourcePort: 'output', targetNode: addInsideWhileId, targetPort: 'A' },
      { id: id(), sourceNode: constOneId, sourcePort: 'value', targetNode: addInsideWhileId, targetPort: 'B' },
      { id: id(), sourceNode: addInsideWhileId, sourcePort: 'result', targetNode: srRight2Id, targetPort: 'input' },
      { id: id(), sourceNode: addInsideWhileId, sourcePort: 'result', targetNode: greaterId, targetPort: 'A' },
      { id: id(), sourceNode: thresholdId, sourcePort: 'value', targetNode: greaterId, targetPort: 'B' },
      { id: id(), sourceNode: greaterId, sourcePort: 'result', targetNode: whileLoopId, targetPort: 'stop' },
      { id: id(), sourceNode: srRight2Id, sourcePort: 'output', targetNode: displayWhileSumId, targetPort: 'value' },
    ],
    uiControls: []
  };
}
