import type { NodeInstance } from '../types/graph';

// ── Per-segment occlusion for wires passing behind structures ──────────
// The structure backdrop sits below the edges layer (zIndex -1), so a wire
// cannot be occluded by the backdrop itself. Instead, the wire's bezier is
// split at the boundaries of every structure it passes behind, and only the
// segments inside such a structure are rendered with the frosted treatment.
// Segments outside stay exactly as before, so a single wire is never dimmed
// along its whole length.
//
// A structure counts as "foreign" to a wire when neither endpoint belongs
// to it (endpoint is the structure itself or one of its descendants). Wires
// genuinely inside, or connected to, the structure are never split.

export interface WireSegment {
  /** SVG path for this sub-bezier. */
  d: string;
  /** True when this segment lies behind a foreign structure. */
  occluded: boolean;
}

type Pt = { x: number; y: number };
type Cubic = [Pt, Pt, Pt, Pt];

const SAMPLES = 256;
const BISECT_STEPS = 14;
const CROSS_INSET = 6;
const EPS = 1e-6;

function belongsTo(nodeId: string | undefined, structureId: string, allNodes: NodeInstance[]): boolean {
  if (!nodeId) return false;
  if (nodeId === structureId) return true;
  let cur = allNodes.find(n => n.id === nodeId);
  let guard = 0;
  while (cur?.parent && guard++ < 100) {
    if (cur.parent === structureId) return true;
    cur = allNodes.find(n => n.id === cur!.parent);
  }
  return false;
}

function absoluteRect(s: NodeInstance, allNodes: NodeInstance[]) {
  let x = s.position?.x ?? 0;
  let y = s.position?.y ?? 0;
  let cur = s.parent;
  let guard = 0;
  while (cur && guard++ < 100) {
    const pn = allNodes.find(n => n.id === cur);
    if (!pn) break;
    x += pn.position?.x ?? 0;
    y += pn.position?.y ?? 0;
    cur = pn.parent;
  }
  return { x, y, w: s.width || 320, h: s.height || 220 };
}

function parseCubic(
  edgePath: string,
  sourceX: number, sourceY: number, targetX: number, targetY: number,
): Cubic {
  // ReactFlow's format is `M sx,sy C c1x,c1y c2x,c2y tx,ty` (space before
  // the C); tolerate missing/extra whitespace around the commands.
  const m = edgePath.match(/^M\s*([\d.eE+-]+),([\d.eE+-]+)\s*C\s*([\d.eE+-]+),([\d.eE+-]+)\s+([\d.eE+-]+),([\d.eE+-]+)\s+([\d.eE+-]+),([\d.eE+-]+)\s*$/);
  if (m) {
    return [
      { x: sourceX, y: sourceY },
      { x: +m[3], y: +m[4] },
      { x: +m[5], y: +m[6] },
      { x: targetX, y: targetY },
    ];
  }
  // Straight-line fallback as a degenerate cubic.
  return [
    { x: sourceX, y: sourceY },
    { x: sourceX, y: sourceY },
    { x: targetX, y: targetY },
    { x: targetX, y: targetY },
  ];
}

function cubicPoint(c: Cubic, t: number): Pt {
  const u = 1 - t;
  const [p0, p1, p2, p3] = c;
  return {
    x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
    y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y,
  };
}

function lerp(a: Pt, b: Pt, t: number): Pt {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

/** de Casteljau split: returns [left (0..t), right (t..1)]. */
function splitCubic(c: Cubic, t: number): [Cubic, Cubic] {
  const [p0, p1, p2, p3] = c;
  const q0 = lerp(p0, p1, t);
  const q1 = lerp(p1, p2, t);
  const q2 = lerp(p2, p3, t);
  const r0 = lerp(q0, q1, t);
  const r1 = lerp(q1, q2, t);
  const s = lerp(r0, r1, t);
  return [
    [p0, q0, r0, s],
    [s, r1, q2, p3],
  ];
}

/** Sub-bezier covering parameter range [a, b]. */
function subCubic(c: Cubic, a: number, b: number): Cubic {
  if (a <= EPS && b >= 1 - EPS) return c;
  const [left] = b >= 1 - EPS ? [c, c] : splitCubic(c, b);
  if (a <= EPS) return left;
  const [, right] = splitCubic(left, a / b);
  return right;
}

function pathFromCubic(c: Cubic): string {
  const r = (n: number) => Math.round(n * 100) / 100;
  const [p0, p1, p2, p3] = c;
  return `M${r(p0.x)},${r(p0.y)} C${r(p1.x)},${r(p1.y)} ${r(p2.x)},${r(p2.y)} ${r(p3.x)},${r(p3.y)}`;
}

function insideRect(p: Pt, rect: { x: number; y: number; w: number; h: number }): boolean {
  return (
    p.x > rect.x + CROSS_INSET && p.x < rect.x + rect.w - CROSS_INSET &&
    p.y > rect.y + CROSS_INSET && p.y < rect.y + rect.h - CROSS_INSET
  );
}

/** Parameter intervals where the curve runs inside one structure's rect. */
function intervalsForStructure(c: Cubic, rect: { x: number; y: number; w: number; h: number }): Array<[number, number]> {
  const inside = (t: number) => insideRect(cubicPoint(c, t), rect);
  const intervals: Array<[number, number]> = [];
  let prevT = 0;
  let prevIn = inside(0);
  let openStart: number | null = prevIn ? 0 : null;
  for (let i = 1; i <= SAMPLES; i++) {
    const t = i / SAMPLES;
    const curIn = inside(t);
    if (curIn !== prevIn) {
      // Refine the crossing by bisection (single crossing per step assumed;
      // structures are far larger than one sample step, so this holds).
      let lo = prevT, hi = t;
      for (let k = 0; k < BISECT_STEPS; k++) {
        const mid = (lo + hi) / 2;
        if (inside(mid) === prevIn) lo = mid; else hi = mid;
      }
      const cross = (lo + hi) / 2;
      if (curIn) {
        openStart = cross;
      } else if (openStart !== null) {
        intervals.push([openStart, cross]);
        openStart = null;
      }
      prevIn = curIn;
    }
    prevT = t;
  }
  if (openStart !== null) intervals.push([openStart, 1]);
  return intervals;
}

function mergeIntervals(intervals: Array<[number, number]>): Array<[number, number]> {
  const sorted = intervals.slice().sort((a, b) => a[0] - b[0]);
  const merged: Array<[number, number]> = [];
  for (const [s, e] of sorted) {
    const last = merged[merged.length - 1];
    if (last && s <= last[1] + EPS) {
      last[1] = Math.max(last[1], e);
    } else {
      merged.push([s, e]);
    }
  }
  return merged;
}

/**
 * Split a wire's bezier into occluded / plain segments, or null when the
 * wire passes behind no foreign structure (render the original path).
 */
export function computeWireSegments(
  edgePath: string,
  sourceX: number, sourceY: number, targetX: number, targetY: number,
  sourceId: string, targetId: string,
  allNodes: NodeInstance[],
): WireSegment[] | null {
  const structures = allNodes.filter(n => n.type?.startsWith('structure.'));
  if (structures.length === 0) return null;

  const curve = parseCubic(edgePath, sourceX, sourceY, targetX, targetY);
  const allIntervals: Array<[number, number]> = [];
  for (const s of structures) {
    if (belongsTo(sourceId, s.id, allNodes) || belongsTo(targetId, s.id, allNodes)) continue;
    allIntervals.push(...intervalsForStructure(curve, absoluteRect(s, allNodes)));
  }
  const merged = mergeIntervals(allIntervals);
  if (merged.length === 0) return null;

  const bounds: number[] = [0];
  for (const [s, e] of merged) {
    bounds.push(s, e);
  }
  bounds.push(1);
  bounds.sort((a, b) => a - b);
  const deduped = bounds.filter((v, i) => i === 0 || v - bounds[i - 1] > EPS);

  const segments: WireSegment[] = [];
  for (let i = 0; i < deduped.length - 1; i++) {
    const a = deduped[i], b = deduped[i + 1];
    if (b - a <= EPS) continue;
    const mid = (a + b) / 2;
    const occluded = merged.some(([s, e]) => mid > s && mid < e);
    segments.push({ d: pathFromCubic(subCubic(curve, a, b)), occluded });
  }
  return segments.length > 0 ? segments : null;
}
