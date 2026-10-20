import { describe, expect, it } from 'vitest';
import { ExecutionEngine } from '../engine/scheduler';
import type { Graph } from '../types/graph';
import type { NodeState } from '../types/runtime';
import { createExampleProject } from './exampleProject';
import { createLoopExampleProject } from './loopExampleProject';

async function runGraph(graph: Graph): Promise<Record<string, any>> {
  const portValues: Record<string, any> = {};
  const nodeStates: Record<string, NodeState> = {};
  const engine = new ExecutionEngine(
    graph,
    { portValues: {}, nodeState: {} },
    (nid, s) => { nodeStates[nid] = s; },
    (pid, v) => { portValues[pid] = v; },
  );
  await engine.executeAll();
  return portValues;
}

function assertStructurallyValid(graph: Graph): void {
  const ids = new Set(graph.nodes.map((n) => n.id));
  expect(ids.size).toBe(graph.nodes.length); // ID 唯一
  for (const e of graph.edges) {
    expect(ids.has(e.sourceNode), `边 ${e.id} 源节点不存在`).toBe(true);
    expect(ids.has(e.targetNode), `边 ${e.id} 目标节点不存在`).toBe(true);
  }
}

describe('createExampleProject 温度换算示例', () => {
  it('结构完整：边都连到存在的节点', () => {
    assertStructurallyValid(createExampleProject());
  });

  it('25°C → 77°F，指示灯不亮', async () => {
    const graph = createExampleProject();
    const portValues = await runGraph(graph);
    const display = graph.nodes.find((n) => n.type === 'sink.display');
    expect(display).toBeDefined();
    // 25 × 1.8 + 32 = 77
    expect(portValues[`${display!.id}_value`]).toBeCloseTo(77, 10);
    // 77 > 100 为 false → 指示灯端子收到 false
    const indicator = graph.nodes.find(
      (n) => n.type === 'io.terminal' && n.inputs.length > 0,
    );
    expect(indicator).toBeDefined();
    expect(portValues[`${indicator!.id}_input`]).toBe(false);
  });
});

describe('createLoopExampleProject 循环示例', () => {
  it('结构完整：边都连到存在的节点', () => {
    assertStructurallyValid(createLoopExampleProject());
  });

  it('For 求和=15，数组透传=[1,2,3,4,5]，While 计数=6', async () => {
    const graph = createLoopExampleProject();
    const portValues = await runGraph(graph);
    // displays 按数组顺序：forSum(650,40)、forArray(650,100)、whileSum(670,340)
    const displays = graph.nodes.filter((n) => n.type === 'sink.display');
    expect(displays).toHaveLength(3);
    const [forSum, forArray, whileSum] = displays;
    expect(portValues[`${forSum.id}_value`]).toBe(15); // 1+2+3+4+5
    expect(portValues[`${forArray.id}_value`]).toEqual([1, 2, 3, 4, 5]);
    expect(portValues[`${whileSum.id}_value`]).toBe(6); // 计数到 >5 停
  });
});
