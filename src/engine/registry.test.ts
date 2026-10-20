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

describe('新增节点：三角函数', () => {
  it('sin/cos/tan', async () => {
    expect(await outputs('math.sin', { x: 0 })).toEqual({ result: 0 });
    expect(await outputs('math.cos', { x: 0 })).toEqual({ result: 1 });
    expect(await outputs('math.tan', { x: 0 })).toEqual({ result: 0 });
    expect((await outputs('math.sin', { x: Math.PI / 2 })).result).toBeCloseTo(1, 10);
  });

  it('sqrt/pow/abs', async () => {
    expect(await outputs('math.sqrt', { x: 4 })).toEqual({ result: 2 });
    expect(await outputs('math.pow', { A: 2, B: 3 })).toEqual({ result: 8 });
    expect(await outputs('math.abs', { x: -5 })).toEqual({ result: 5 });
  });

  it('sqrt 负数抛错', async () => {
    await expect(outputs('math.sqrt', { x: -1 })).rejects.toThrow('Square root of negative number');
  });
});

describe('新增节点：字符串', () => {
  it('concat/length/upper/lower', async () => {
    expect(await outputs('string.concat', { A: 'foo', B: 'bar' })).toEqual({ result: 'foobar' });
    expect(await outputs('string.concat', { A: 'x' })).toEqual({ result: 'x' });
    expect(await outputs('string.length', { s: 'hello' })).toEqual({ length: 5 });
    expect(await outputs('string.uppercase', { s: 'abc' })).toEqual({ result: 'ABC' });
    expect(await outputs('string.lowercase', { s: 'AbC' })).toEqual({ result: 'abc' });
  });

  it('substring', async () => {
    expect(await outputs('string.substring', { s: 'hello', start: 1, length: 3 })).toEqual({ result: 'ell' });
    expect(await outputs('string.substring', { s: 'hello', start: 2 })).toEqual({ result: 'llo' });
    expect(await outputs('string.substring', { s: 'hello', start: -5, length: 2 })).toEqual({ result: 'he' });
  });
});

describe('新增节点：数组', () => {
  it('length', async () => {
    expect(await outputs('array.length', { array: [1, 2, 3] })).toEqual({ length: 3 });
    expect(await outputs('array.length', { array: '不是数组' })).toEqual({ length: 0 });
  });

  it('index', async () => {
    expect(await outputs('array.index', { array: ['a', 'b'], index: 1 })).toEqual({ element: 'b' });
    expect(await outputs('array.index', { array: ['a'], index: 5 })).toEqual({ element: undefined });
  });

  it('append', async () => {
    expect(await outputs('array.append', { array: [1], element: 2 })).toEqual({ result: [1, 2] });
    expect(await outputs('array.append', { element: 'x' })).toEqual({ result: ['x'] });
  });
});

describe('新增节点：随机与时间', () => {
  it('random.uniform 落在区间内', async () => {
    for (let i = 0; i < 20; i++) {
      const { value } = await outputs('random.uniform', {}, { min: 5, max: 10 });
      expect(value).toBeGreaterThanOrEqual(5);
      expect(value).toBeLessThan(10);
    }
  });

  it('random.uniform integer 模式取整', async () => {
    const { value } = await outputs('random.uniform', {}, { min: 0, max: 100, integer: true });
    expect(Number.isInteger(value)).toBe(true);
  });

  it('time.wait 等待后返回 done', async () => {
    const t0 = Date.now();
    expect(await outputs('time.wait', { ms: 5 })).toEqual({ done: true });
    expect(Date.now() - t0).toBeGreaterThanOrEqual(4);
  });

  it('time.now 返回毫秒时间戳', async () => {
    const before = Date.now();
    const { timestamp } = await outputs('time.now');
    expect(timestamp).toBeGreaterThanOrEqual(before);
    expect(timestamp).toBeLessThanOrEqual(Date.now());
  });
});
