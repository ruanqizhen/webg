import { describe, expect, it } from 'vitest';
import { NodeRegistry } from './registry';
import type { NodeContext, NodeResult } from '../types/runtime';

function ctx(inputs: Record<string, any> = {}, params: Record<string, any> = {}): NodeContext {
  return { inputs, params, runtime: { portValues: {}, nodeState: {} }, nodeId: 'test' };
}

async function outputs(type: string, inputs: Record<string, any> = {}, params: Record<string, any> = {}): Promise<Record<string, any>> {
  const r: NodeResult | Promise<NodeResult> = NodeRegistry[type].executor(ctx(inputs, params));
  return (await r).outputs;
}

describe('NodeRegistry 完整性', () => {
  it('每个节点定义都有完整元数据', () => {
    const keys = Object.keys(NodeRegistry);
    expect(keys.length).toBeGreaterThan(10);
    for (const key of keys) {
      const def = NodeRegistry[key];
      expect(def.type).toBe(key);
      expect(def.label).toBeTruthy();
      expect(Array.isArray(def.inputs)).toBe(true);
      expect(Array.isArray(def.outputs)).toBe(true);
      expect(typeof def.executor).toBe('function');
    }
  });

  it('数学节点计算正确', async () => {
    expect(await outputs('math.add', { A: 2, B: 3 })).toEqual({ result: 5 });
    expect(await outputs('math.subtract', { A: 2, B: 3 })).toEqual({ result: -1 });
    expect(await outputs('math.multiply', { A: 4 })).toEqual({ result: 4 }); // B 缺省按 1
    expect(await outputs('math.divide', { A: 7, B: 2 })).toEqual({ result: 3.5 });
  });

  it('除零抛错', async () => {
    await expect(outputs('math.divide', { A: 1, B: 0 })).rejects.toThrow('Division by zero');
  });

  it('常量节点做类型转换', async () => {
    expect(await outputs('source.number', {}, { value: '42' })).toEqual({ value: 42 });
    expect(await outputs('source.boolean', {}, { value: 1 })).toEqual({ value: true });
    expect(await outputs('source.string', {}, { value: 7 })).toEqual({ value: '7' });
  });

  it('数组常量解析 JSON 字符串，非法输入回落空数组', async () => {
    expect(await outputs('source.array', {}, { value: '[1,2]' })).toEqual({ value: [1, 2] });
    expect(await outputs('source.array', {}, { value: '不是json' })).toEqual({ value: [] });
  });

  it('逻辑节点', async () => {
    expect(await outputs('logic.greater', { A: 3, B: 2 })).toEqual({ result: true });
    expect(await outputs('logic.and', { A: true, B: false })).toEqual({ result: false });
    expect(await outputs('logic.or', { A: false, B: 0 })).toEqual({ result: false });
    expect(await outputs('logic.not', { A: 0 })).toEqual({ result: true });
    expect(await outputs('logic.equal', { A: 'x', B: 'x' })).toEqual({ result: true });
  });
});
