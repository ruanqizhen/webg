import { describe, expect, it } from 'vitest';
import { computeWireSegments } from './edgeOcclusion';
import type { NodeInstance } from '../types/graph';

function node(
  id: string, type: string, x: number, y: number,
  parent?: string, w = 200, h = 200,
): NodeInstance {
  return { id, type, position: { x, y }, inputs: [], outputs: [], params: {}, parent, width: w, height: h };
}

/** Parse the start and end points out of a segment path string. */
function endpoints(d: string): [{ x: number; y: number }, { x: number; y: number }] {
  const m = d.match(/^M([\d.eE+-]+),([\d.eE+-]+).* ([\d.eE+-]+),([\d.eE+-]+)$/);
  if (!m) throw new Error(`unparsable segment path: ${d}`);
  return [{ x: +m[1], y: +m[2] }, { x: +m[3], y: +m[4] }];
}

describe('computeWireSegments', () => {
  it('splits a straight wire through a structure into plain/occluded/plain', () => {
    const nodes = [
      node('for1', 'structure.forLoop', 100, 0),
      node('a', 'math.add', 0, 100),
      node('b', 'math.add', 400, 100),
    ];
    const segs = computeWireSegments('M0,100 C100,100 300,100 400,100', 0, 100, 400, 100, 'a', 'b', nodes);
    expect(segs).not.toBeNull();
    expect(segs!.map(s => s.occluded)).toEqual([false, true, false]);
    // Occluded stretch matches the structure rect minus the inset (6px).
    const [, mid] = [endpoints(segs![0].d), endpoints(segs![1].d)];
    expect(mid[0].x).toBeCloseTo(106, 0);
    expect(mid[1].x).toBeCloseTo(294, 0);
    // Segments chain: each starts where the previous ended.
    expect(endpoints(segs![1].d)[0]).toEqual(endpoints(segs![0].d)[1]);
    expect(endpoints(segs![2].d)[0]).toEqual(endpoints(segs![1].d)[1]);
    expect(endpoints(segs![0].d)[0]).toEqual({ x: 0, y: 100 });
    expect(endpoints(segs![2].d)[1]).toEqual({ x: 400, y: 100 });
  });

  it('leaves a wire with both endpoints inside the structure untouched', () => {
    const nodes = [
      node('for1', 'structure.forLoop', 100, 0),
      node('a', 'math.add', 150, 100, 'for1'),
      node('b', 'math.add', 250, 100, 'for1'),
    ];
    expect(computeWireSegments('M150,100 C200,100 200,100 250,100', 150, 100, 250, 100, 'a', 'b', nodes)).toBeNull();
  });

  it('leaves a wire connected to a tunnel untouched', () => {
    const nodes = [
      node('for1', 'structure.forLoop', 100, 0),
      node('a', 'math.add', 0, 100),
      node('t1', 'io.tunnel', 100, 100, 'for1'),
    ];
    expect(computeWireSegments('M0,100 C50,100 50,100 100,100', 0, 100, 100, 100, 'a', 't1', nodes)).toBeNull();
  });

  it('leaves a wire that misses every structure untouched', () => {
    const nodes = [
      node('for1', 'structure.forLoop', 100, 100),
      node('a', 'math.add', 0, 0),
      node('b', 'math.add', 400, 0),
    ];
    expect(computeWireSegments('M0,0 C100,0 300,0 400,0', 0, 0, 400, 0, 'a', 'b', nodes)).toBeNull();
  });

  it('merges nested structures into one occluded stretch', () => {
    const nodes = [
      node('for1', 'structure.forLoop', 0, 0, undefined, 500, 300),
      node('case1', 'structure.case', 100, 50, 'for1', 200, 200),
      node('a', 'math.add', -100, 150),
      node('b', 'math.add', 600, 150),
    ];
    const segs = computeWireSegments('M-100,150 C100,150 400,150 600,150', -100, 150, 600, 150, 'a', 'b', nodes);
    expect(segs).not.toBeNull();
    expect(segs!.map(s => s.occluded)).toEqual([false, true, false]);
    const mid = endpoints(segs![1].d);
    expect(mid[0].x).toBeCloseTo(6, 0);
    expect(mid[1].x).toBeCloseTo(494, 0);
  });

  it('catches a curved wire dipping into a structure and back out', () => {
    const nodes = [
      node('for1', 'structure.forLoop', 100, 100),
      node('a', 'math.add', 0, 0),
      node('b', 'math.add', 400, 0),
    ];
    const segs = computeWireSegments('M0,0 C100,300 300,300 400,0', 0, 0, 400, 0, 'a', 'b', nodes);
    expect(segs).not.toBeNull();
    expect(segs!.map(s => s.occluded)).toEqual([false, true, false]);
  });
});
