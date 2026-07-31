export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function isOverlapping(a: Rect, b: Rect, padding = 10): boolean {
  return a.x < b.x + b.w + padding &&
         a.x + a.w + padding > b.x &&
         a.y < b.y + b.h + padding &&
         a.y + a.h + padding > b.y;
}

export interface FindOptions {
  step?: number;
  maxAttempts?: number;
  grid?: number;
  padding?: number;
  direction?: 'right' | 'down' | 'spiral';
}

/**
 * Find a non-overlapping position near desired, using grid right-down scan.
 * - desired: ideal position (e.g. 100,100 or 50,50)
 * - existing: AABB list of current nodes/controls in same scope (same parent/case)
 * - size: w/h of new node/control
 * - Returns grid-aligned {x,y}
 */
export function findNonOverlappingPosition(
  desired: { x: number; y: number },
  existing: Rect[],
  size: { w: number; h: number },
  options: FindOptions = {}
): { x: number; y: number } {
  const step = options.step ?? 40;
  const maxAttempts = options.maxAttempts ?? 200;
  const grid = options.grid ?? 16;
  const padding = options.padding ?? 10;

  const snap = (v: number) => Math.round(v / grid) * grid;

  let x = snap(desired.x);
  let y = snap(desired.y);

  // Quick check: if desired itself is free, return immediately
  const tryRect = (rx: number, ry: number): Rect => ({ x: rx, y: ry, w: size.w, h: size.h });
  const isFree = (rx: number, ry: number) => {
    const r = tryRect(rx, ry);
    for (const ex of existing) {
      if (isOverlapping(r, ex, padding)) return false;
    }
    return true;
  };

  if (isFree(x, y)) return { x, y };

  // Spiral / row scan: move right, wrap to next row when exceeds a reasonable bound
  // Search in a growing square: radius increases
  let attempts = 0;
  let row = 0;
  let col = 0;

  // We scan in rows: each row we try col 0..N, then next row
  while (attempts < maxAttempts) {
    // Rightward scan
    for (col = 0; col < 12 && attempts < maxAttempts; col++) {
      const rx = snap(desired.x + col * step);
      const ry = snap(desired.y + row * step);
      if (isFree(rx, ry)) return { x: rx, y: ry };
      attempts++;
    }
    row++;
    // Downward scan as fallback
    for (let r = 1; r <= row && attempts < maxAttempts; r++) {
      for (let c = 0; c < 6 && attempts < maxAttempts; c++) {
        const rx = snap(desired.x + c * step);
        const ry = snap(desired.y + (row - r) * step + r * step);
        if (isFree(rx, ry)) return { x: rx, y: ry };
        attempts++;
      }
    }
    // If too many rows, break and push further down
    if (row > 10) {
      return { x: snap(desired.x), y: snap(desired.y + row * step) };
    }
  }

  // Fallback: push far down-right
  return { x: snap(desired.x + maxAttempts * 2), y: snap(desired.y + maxAttempts) };
}

/**
 * Build Rect list from nodes (filtered by parent/case)
 */
export function nodesToRects(nodes: Array<{ position?: { x: number; y: number }; width?: number; height?: number }>): Rect[] {
  return nodes.map(n => ({
    x: n.position?.x ?? 0,
    y: n.position?.y ?? 0,
    w: n.width || 120,
    h: n.height || 60,
  }));
}

export function controlsToRects(controls: Array<{ x?: number; y?: number; width?: number; height?: number }>): Rect[] {
  return controls.map(c => ({
    x: c.x ?? 50,
    y: c.y ?? 50,
    w: c.width || 120,
    h: c.height || 60,
  }));
}
