import { describe, expect, it } from 'vitest';
import { ExecutionEngine } from './scheduler';
import type { Edge, Graph, NodeInstance } from '../types/graph';
import type { NodeState, RuntimeMemory } from '../types/runtime';

function node(
  id: string,
  type: string,
  params: Record<string, any> = {},
  parent?: string,
  caseId?: string,
): NodeInstance {
  return { id, type, position: { x: 0, y: 0 }, inputs: [], outputs: [], params, parent, caseId };
}

function edge(id: string, sourceNode: string, sourcePort: string, targetNode: string, targetPort: string): Edge {
  return { id, sourceNode, sourcePort, targetNode, targetPort };
}

interface RunResult {
  portValues: Record<string, any>;
  nodeStates: Record<string, NodeState>;
  engine: ExecutionEngine;
}

function makeEngine(graph: Graph): RunResult {
  const portValues: Record<string, any> = {};
  const nodeStates: Record<string, NodeState> = {};
  const initial: RuntimeMemory = { portValues: {}, nodeState: {} };
  const engine = new ExecutionEngine(
    graph,
    initial,
    (nid, s) => { nodeStates[nid] = s; },
    (pid, v) => { portValues[pid] = v; },
  );
  return { portValues, nodeStates, engine };
}

async function run(graph: Graph): Promise<RunResult> {
  const r = makeEngine(graph);
  await r.engine.executeAll();
  return r;
}

function mathChain(): Graph {
  return {
    nodes: [
      node('c1', 'source.number', { value: 5 }),
      node('c2', 'source.number', { value: 3 }),
      node('add', 'math.add'),
    ],
    edges: [
      edge('e1', 'c1', 'value', 'add', 'A'),
      edge('e2', 'c2', 'value', 'add', 'B'),
    ],
    uiControls: [],
  };
}

describe('detectCycles 环检测', () => {
  it('线性链无环', () => {
    const { engine } = makeEngine(mathChain());
    expect(engine.detectCycles()).toBe(false);
  });

  it('简单环被检出', () => {
    const g: Graph = {
      nodes: [node('a', 'math.add'), node('b', 'math.add')],
      edges: [
        edge('e1', 'a', 'result', 'b', 'A'),
        edge('e2', 'b', 'result', 'a', 'A'),
      ],
      uiControls: [],
    };
    expect(makeEngine(g).engine.detectCycles()).toBe(true);
  });

  it('经由 shift register 的反馈不算环（SR 按设计打破环）', () => {
    const g: Graph = {
      nodes: [
        node('a', 'math.add'),
        node('sr', 'io.shiftRegister', { side: 'left', pairId: 'p1' }),
      ],
      edges: [
        edge('e1', 'a', 'result', 'sr', 'input'),
        edge('e2', 'sr', 'output', 'a', 'A'),
      ],
      uiControls: [],
    };
    expect(makeEngine(g).engine.detectCycles()).toBe(false);
  });

  it('executeAll 遇到环直接抛错', async () => {
    const g: Graph = {
      nodes: [node('a', 'math.add'), node('b', 'math.add')],
      edges: [
        edge('e1', 'a', 'result', 'b', 'A'),
        edge('e2', 'b', 'result', 'a', 'A'),
      ],
      uiControls: [],
    };
    await expect(run(g)).rejects.toThrow('Circular Dependency Detected');
  });
});

describe('executeAll 基础执行', () => {
  it('数学链按拓扑顺序求值', async () => {
    const { portValues, nodeStates } = await run(mathChain());
    expect(portValues['add_result']).toBe(8);
    expect(nodeStates['add']).toBe('done');
  });

  it('除零抛错并标记节点 error', async () => {
    const g: Graph = {
      nodes: [
        node('c1', 'source.number', { value: 1 }),
        node('c0', 'source.number', { value: 0 }),
        node('div', 'math.divide'),
      ],
      edges: [
        edge('e1', 'c1', 'value', 'div', 'A'),
        edge('e2', 'c0', 'value', 'div', 'B'),
      ],
      uiControls: [],
    };
    const r = makeEngine(g);
    await expect(r.engine.executeAll()).rejects.toThrow('Division by zero');
    expect(r.nodeStates['div']).toBe('error');
  });

  it('未知节点类型抛错', async () => {
    const g: Graph = { nodes: [node('x', 'nope.unknown')], edges: [], uiControls: [] };
    await expect(run(g)).rejects.toThrow('Unknown node');
  });

  it('abort 中断执行', async () => {
    const r = makeEngine(mathChain());
    r.engine.abort();
    await expect(r.engine.executeAll()).rejects.toThrow('Execution Aborted');
  });

  it('整数常量截断小数', async () => {
    const g: Graph = {
      nodes: [node('c', 'source.number', { value: 3.7, numberType: 'integer' })],
      edges: [],
      uiControls: [],
    };
    const { portValues } = await run(g);
    expect(portValues['c_value']).toBe(3);
  });
});

function forSumGraph(n: number): Graph {
  return {
    nodes: [
      node('cN', 'source.number', { value: n }),
      node('c0', 'source.number', { value: 0 }),
      node('loop', 'structure.forLoop'),
      node('srL', 'io.shiftRegister', { side: 'left', pairId: 'p1' }, 'loop'),
      node('srR', 'io.shiftRegister', { side: 'right', pairId: 'p1' }, 'loop'),
      node('add', 'math.add', {}, 'loop'),
      node('disp', 'sink.display'),
    ],
    edges: [
      edge('e1', 'cN', 'value', 'loop', 'N'),
      edge('e2', 'c0', 'value', 'srL', 'input'),
      edge('e3', 'srL', 'output', 'add', 'A'),
      edge('e4', 'loop', 'i', 'add', 'B'),
      edge('e5', 'add', 'result', 'srR', 'input'),
      edge('e6', 'srR', 'output', 'disp', 'value'),
    ],
    uiControls: [],
  };
}

describe('For 循环', () => {
  it('shift register 累加 0+1+...+(N-1)', async () => {
    const { portValues } = await run(forSumGraph(5));
    expect(portValues['disp_value']).toBe(10);
  });

  it('N=0 时非索引输出取类型默认值（LabVIEW 语义）', async () => {
    const g: Graph = {
      nodes: [
        node('cN', 'source.number', { value: 0 }),
        node('loop', 'structure.forLoop'),
        node('add', 'math.add', {}, 'loop'),
        node('outT', 'io.tunnel', { indexing: false }, 'loop'),
        node('disp', 'sink.display'),
      ],
      edges: [
        edge('e1', 'cN', 'value', 'loop', 'N'),
        edge('e2', 'add', 'result', 'outT', 'input'),
        edge('e3', 'outT', 'output', 'disp', 'value'),
      ],
      uiControls: [],
    };
    const { portValues } = await run(g);
    expect(portValues['disp_value']).toBe(0);
  });

  it('无显式 N 时按最短索引数组自动确定次数', async () => {
    const g: Graph = {
      nodes: [
        node('arr', 'source.array', { value: [5, 6] }),
        node('loop', 'structure.forLoop'),
        node('inT', 'io.tunnel', { indexing: true }, 'loop'),
        node('outT', 'io.tunnel', { indexing: true }, 'loop'),
        node('disp', 'sink.display'),
      ],
      edges: [
        edge('e1', 'arr', 'value', 'inT', 'input'),
        edge('e2', 'inT', 'output', 'outT', 'input'),
        edge('e3', 'outT', 'output', 'disp', 'value'),
      ],
      uiControls: [],
    };
    const { portValues } = await run(g);
    expect(portValues['disp_value']).toEqual([5, 6]);
  });
});

describe('While 循环', () => {
  it('计数到阈值后按 Stop if True 停下', async () => {
    const g: Graph = {
      nodes: [
        node('c0', 'source.number', { value: 0 }),
        node('c1', 'source.number', { value: 1 }),
        node('c2', 'source.number', { value: 2 }),
        node('w', 'structure.whileLoop', { conditionMode: 'stopIfTrue', maxIterations: 100 }),
        node('srL', 'io.shiftRegister', { side: 'left', pairId: 'p1' }, 'w'),
        node('srR', 'io.shiftRegister', { side: 'right', pairId: 'p1' }, 'w'),
        node('add', 'math.add', {}, 'w'),
        node('gt', 'logic.greater', {}, 'w'),
        node('disp', 'sink.display'),
      ],
      edges: [
        edge('e1', 'c0', 'value', 'srL', 'input'),
        edge('e2', 'c1', 'value', 'add', 'B'),
        edge('e3', 'srL', 'output', 'add', 'A'),
        edge('e4', 'add', 'result', 'srR', 'input'),
        edge('e5', 'add', 'result', 'gt', 'A'),
        edge('e6', 'c2', 'value', 'gt', 'B'),
        edge('e7', 'gt', 'result', 'w', 'stop'),
        edge('e8', 'srR', 'output', 'disp', 'value'),
      ],
      uiControls: [],
    };
    const { portValues } = await run(g);
    expect(portValues['disp_value']).toBe(3);
  });
});

function caseGraph(selectorValue: boolean): Graph {
  return {
    nodes: [
      node('sel', 'source.boolean', { value: selectorValue }),
      node('cs', 'structure.case', { mode: 'boolean' }),
      node('nT', 'source.number', { value: 1 }, 'cs', 'true'),
      node('nF', 'source.number', { value: 2 }, 'cs', 'false'),
      node('tunT', 'io.tunnel', {}, 'cs'),
      node('tunF', 'io.tunnel', {}, 'cs'),
      node('dT', 'sink.display'),
      node('dF', 'sink.display'),
    ],
    edges: [
      edge('e1', 'sel', 'value', 'cs', 'selector'),
      edge('e2', 'nT', 'value', 'tunT', 'input'),
      edge('e3', 'nF', 'value', 'tunF', 'input'),
      edge('e4', 'tunT', 'output', 'dT', 'value'),
      edge('e5', 'tunF', 'output', 'dF', 'value'),
    ],
    uiControls: [],
  };
}

describe('Case 结构', () => {
  it('boolean 选择器为 true 只执行 true 分支，未执行分支的输出隧道取类型默认值', async () => {
    const { portValues, nodeStates } = await run(caseGraph(true));
    expect(portValues['dT_value']).toBe(1);
    // LabVIEW 语义：未执行分支没给输出隧道接线时，隧道输出类型默认值（number → 0）
    expect(portValues['dF_value']).toBe(0);
    expect(nodeStates['nT']).toBe('done');
    expect(nodeStates['nF']).toBe('idle');
  });

  it('boolean 选择器为 false 只执行 false 分支，未执行分支的输出隧道取类型默认值', async () => {
    const { portValues, nodeStates } = await run(caseGraph(false));
    expect(portValues['dF_value']).toBe(2);
    expect(portValues['dT_value']).toBe(0);
    expect(nodeStates['nF']).toBe('done');
    expect(nodeStates['nT']).toBe('idle');
  });
});

function numberCaseGraph(selectorValue: number): Graph {
  return {
    nodes: [
      node('sel', 'source.number', { value: selectorValue }),
      node('cs', 'structure.case', { mode: 'number', cases: ['0', '1..5', 'default'], defaultCase: 'default' }),
      node('n0', 'source.number', { value: 0 }, 'cs', '0'),
      node('nR', 'source.number', { value: 1 }, 'cs', '1..5'),
      node('nD', 'source.number', { value: 9 }, 'cs', 'default'),
      node('outT', 'io.tunnel', {}, 'cs'),
      node('disp', 'sink.display'),
    ],
    edges: [
      edge('e1', 'sel', 'value', 'cs', 'selector'),
      edge('e2', 'n0', 'value', 'outT', 'input'),
      edge('e3', 'nR', 'value', 'outT', 'input'),
      edge('e4', 'nD', 'value', 'outT', 'input'),
      edge('e5', 'outT', 'output', 'disp', 'value'),
    ],
    uiControls: [],
  };
}

describe('Case 结构 number 模式（LabVIEW 语义）', () => {
  it('范围分支 1..5 命中 3', async () => {
    const { portValues } = await run(numberCaseGraph(3));
    expect(portValues['disp_value']).toBe(1);
  });

  it('范围边界 5 命中，6 落入 Default', async () => {
    const { portValues: p5 } = await run(numberCaseGraph(5));
    expect(p5['disp_value']).toBe(1);
    const { portValues: p6 } = await run(numberCaseGraph(6));
    expect(p6['disp_value']).toBe(9);
  });

  it('精确值 0 优先于范围', async () => {
    const { portValues } = await run(numberCaseGraph(0));
    expect(portValues['disp_value']).toBe(0);
  });
});

function forCondGraph(mode: 'stopIfTrue' | 'continueIfTrue', cmp: 'greater' | 'less', threshold: number): Graph {
  return {
    nodes: [
      node('cN', 'source.number', { value: 10 }),
      node('c0', 'source.number', { value: 0 }),
      node('cT', 'source.number', { value: threshold }),
      node('loop', 'structure.forLoop', { hasConditional: true, conditionalMode: mode }),
      node('srL', 'io.shiftRegister', { side: 'left', pairId: 'p1' }, 'loop'),
      node('srR', 'io.shiftRegister', { side: 'right', pairId: 'p1' }, 'loop'),
      node('add', 'math.add', {}, 'loop'),
      node('cmp', `logic.${cmp}`, {}, 'loop'),
      node('disp', 'sink.display'),
    ],
    edges: [
      edge('e1', 'cN', 'value', 'loop', 'N'),
      edge('e2', 'c0', 'value', 'srL', 'input'),
      edge('e3', 'srL', 'output', 'add', 'A'),
      edge('e4', 'loop', 'i', 'add', 'B'),
      edge('e5', 'add', 'result', 'srR', 'input'),
      edge('e6', 'loop', 'i', 'cmp', 'A'),
      edge('e7', 'cT', 'value', 'cmp', 'B'),
      edge('e8', 'cmp', 'result', 'loop', 'conditional'),
      edge('e9', 'srR', 'output', 'disp', 'value'),
    ],
    uiControls: [],
  };
}

describe('For 循环条件端（LabVIEW 语义）', () => {
  it('Stop if True：i > 1 时在 i=2 提前退出，累加 0+1+2=3（不停则为 45）', async () => {
    const { portValues } = await run(forCondGraph('stopIfTrue', 'greater', 1));
    expect(portValues['disp_value']).toBe(3);
  });

  it('Continue if True：i < 2 在 i=2 变假时退出，累加 0+1+2=3', async () => {
    const { portValues } = await run(forCondGraph('continueIfTrue', 'less', 2));
    expect(portValues['disp_value']).toBe(3);
  });
});

describe('While 循环至少执行一次（LabVIEW 语义）', () => {
  it('停止条件一开始就为真，循环体仍执行一次', async () => {
    const g: Graph = {
      nodes: [
        node('c0', 'source.number', { value: 0 }),
        node('c1', 'source.number', { value: 1 }),
        node('t', 'source.boolean', { value: true }),
        node('w', 'structure.whileLoop', { conditionMode: 'stopIfTrue', maxIterations: 100 }),
        node('srL', 'io.shiftRegister', { side: 'left', pairId: 'p1' }, 'w'),
        node('srR', 'io.shiftRegister', { side: 'right', pairId: 'p1' }, 'w'),
        node('add', 'math.add', {}, 'w'),
        node('disp', 'sink.display'),
      ],
      edges: [
        edge('e1', 'c0', 'value', 'srL', 'input'),
        edge('e2', 'c1', 'value', 'add', 'B'),
        edge('e3', 'srL', 'output', 'add', 'A'),
        edge('e4', 'add', 'result', 'srR', 'input'),
        edge('e5', 't', 'value', 'w', 'stop'),
        edge('e6', 'srR', 'output', 'disp', 'value'),
      ],
      uiControls: [],
    };
    const { portValues } = await run(g);
    expect(portValues['disp_value']).toBe(1);
  });
});
