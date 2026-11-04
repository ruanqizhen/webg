import type { Graph } from '../types/graph';
import { generateId } from './utils';

function id(): string {
  return generateId();
}

/**
 * Front-panel demo: two sliders drive a tank level.
 *
 * Front panel: two slider controls ("Inflow 1", "Inflow 2") and one tank
 * indicator ("Tank Level"). The diagram adds the two slider values inside
 * a While loop and writes the sum to the tank each iteration. The loop
 * also contains a Wait (ms) wired to a constant 50, so iterations are
 * paced at least 50 ms apart.
 *
 * The While loop has no stop condition wired: it runs until the user
 * presses Stop in the toolbar (maxIterations is only a safety net).
 * The tank terminal sits inside the loop so the front panel updates on
 * every iteration; the slider terminals sit outside and feed the loop
 * through input tunnels. The tank fill clamps visually at full when the
 * two sliders sum past 100.
 */
export function createTankExampleProject(): Graph {
  const sliderTerm1Id = id();
  const sliderTerm2Id = id();
  const whileLoopId = id();
  const tunnel1Id = id();
  const tunnel2Id = id();
  const addId = id();
  const tankTermId = id();
  const const50Id = id();
  const waitId = id();
  const ctrlSlider1Id = id();
  const ctrlSlider2Id = id();
  const ctrlTankId = id();

  return {
    nodes: [
      // Slider terminals (outside the loop; values come from the panel)
      {
        id: sliderTerm1Id,
        type: 'io.terminal',
        position: { x: 40, y: 80 },
        inputs: [],
        outputs: [{ id: 'output', name: 'output', type: 'number', direction: 'output' }],
        params: { value: 30 },
      },
      {
        id: sliderTerm2Id,
        type: 'io.terminal',
        position: { x: 40, y: 200 },
        inputs: [],
        outputs: [{ id: 'output', name: 'output', type: 'number', direction: 'output' }],
        params: { value: 40 },
      },
      // While loop: no stop edge, runs until toolbar Stop
      {
        id: whileLoopId,
        type: 'structure.whileLoop',
        position: { x: 220, y: 40 },
        width: 480,
        height: 280,
        inputs: [],
        outputs: [],
        params: { conditionMode: 'stopIfTrue', maxIterations: 100000 },
      },
      // Input tunnels (non-indexing: the slider value is re-fed each iteration)
      {
        id: tunnel1Id,
        type: 'io.tunnel',
        position: { x: 0, y: 50 },
        parent: whileLoopId,
        inputs: [],
        outputs: [],
        params: { indexing: false },
      },
      {
        id: tunnel2Id,
        type: 'io.tunnel',
        position: { x: 0, y: 130 },
        parent: whileLoopId,
        inputs: [],
        outputs: [],
        params: { indexing: false },
      },
      // Inside the loop: level = slider1 + slider2
      {
        id: addId,
        type: 'math.add',
        position: { x: 130, y: 70 },
        parent: whileLoopId,
        inputs: [
          { id: 'A', name: 'A', type: 'number', direction: 'input' },
          { id: 'B', name: 'B', type: 'number', direction: 'input' },
        ],
        outputs: [{ id: 'result', name: 'result', type: 'number', direction: 'output' }],
        params: {},
      },
      // Tank terminal inside the loop so the panel updates every iteration
      {
        id: tankTermId,
        type: 'io.terminal',
        position: { x: 320, y: 70 },
        parent: whileLoopId,
        inputs: [{ id: 'input', name: 'input', type: 'number', direction: 'input' }],
        outputs: [],
        params: { value: 0 },
      },
      // 50 ms pacing
      {
        id: const50Id,
        type: 'source.number',
        position: { x: 130, y: 190 },
        parent: whileLoopId,
        inputs: [],
        outputs: [{ id: 'value', name: 'value', type: 'number', direction: 'output' }],
        params: { value: 50 },
      },
      {
        id: waitId,
        type: 'time.wait',
        position: { x: 320, y: 190 },
        parent: whileLoopId,
        inputs: [{ id: 'ms', name: 'ms', type: 'number', direction: 'input' }],
        outputs: [{ id: 'done', name: 'done', type: 'boolean', direction: 'output' }],
        params: { defaultMs: 50 },
      },
    ],
    edges: [
      { id: id(), sourceNode: sliderTerm1Id, sourcePort: 'output', targetNode: tunnel1Id, targetPort: 'input' },
      { id: id(), sourceNode: sliderTerm2Id, sourcePort: 'output', targetNode: tunnel2Id, targetPort: 'input' },
      { id: id(), sourceNode: tunnel1Id, sourcePort: 'output', targetNode: addId, targetPort: 'A' },
      { id: id(), sourceNode: tunnel2Id, sourcePort: 'output', targetNode: addId, targetPort: 'B' },
      { id: id(), sourceNode: addId, sourcePort: 'result', targetNode: tankTermId, targetPort: 'input' },
      { id: id(), sourceNode: const50Id, sourcePort: 'value', targetNode: waitId, targetPort: 'ms' },
    ],
    uiControls: [
      {
        id: ctrlSlider1Id,
        type: 'slider',
        direction: 'control',
        label: 'Inflow 1',
        defaultValue: 30,
        bindingNodeId: sliderTerm1Id,
        x: 40,
        y: 40,
        width: 160,
        height: 44,
        min: 0,
        max: 100,
        step: 1,
      },
      {
        id: ctrlSlider2Id,
        type: 'slider',
        direction: 'control',
        label: 'Inflow 2',
        defaultValue: 40,
        bindingNodeId: sliderTerm2Id,
        x: 40,
        y: 120,
        width: 160,
        height: 44,
        min: 0,
        max: 100,
        step: 1,
      },
      {
        id: ctrlTankId,
        type: 'tank',
        direction: 'indicator',
        label: 'Tank Level',
        defaultValue: 0,
        bindingNodeId: tankTermId,
        x: 260,
        y: 40,
        width: 56,
        height: 140,
        min: 0,
        max: 100,
        colorOn: '#2563EB',
      },
    ],
  };
}
