/**
 * LabVIEW-style Case Structure selector matching.
 *
 * LabVIEW case labels support:
 * - Boolean mode: 'true' / 'false'
 * - Number mode: exact values ('3'), inclusive ranges ('1..5'),
 *   and comma lists inside one label ('1, 3, 5')
 * - A 'default' case: runs when nothing else matches (number/string mode).
 *   The 'default' label itself never matches directly — it is the fallback.
 *
 * Matching order (LabVIEW): labels are tried in order, first match wins;
 * if none matches, the configured default case runs.
 */

/** Does this single case label match the selector value? ('default' never matches directly.) */
export function matchCaseLabel(selector: unknown, label: string, mode: string): boolean {
  const trimmed = label.trim();
  if (trimmed.toLowerCase() === 'default') return false;

  if (mode === 'boolean') {
    const want = trimmed.toLowerCase();
    if (want === 'true') return selector === true || selector === 'true';
    if (want === 'false') return selector === false || selector === 'false';
    return false;
  }

  // Number/string mode: a label may hold a comma list; each part is tried.
  const parts = trimmed.split(',').map((p) => p.trim()).filter(Boolean);
  return parts.some((part) => matchCasePart(selector, part));
}

function matchCasePart(selector: unknown, part: string): boolean {
  // Inclusive range: a..b (LabVIEW ranges are numeric, order-insensitive).
  const range = part.match(/^(-?\d+(?:\.\d+)?)\s*\.\.\s*(-?\d+(?:\.\d+)?)$/);
  if (range) {
    const v = Number(selector);
    if (!isFinite(v)) return false;
    const lo = Number(range[1]);
    const hi = Number(range[2]);
    return v >= Math.min(lo, hi) && v <= Math.max(lo, hi);
  }
  // Exact: numeric compare when both sides are numeric, else string compare.
  const selNum = Number(selector);
  const partNum = Number(part);
  if (
    selector !== '' && selector !== null && selector !== undefined &&
    part !== '' && isFinite(selNum) && isFinite(partNum)
  ) {
    return selNum === partNum;
  }
  return String(selector) === part;
}

/**
 * Resolve which case executes for a selector value.
 * Boolean mode: true/false. Otherwise first matching label wins;
 * no match falls back to `defaultCase`, or 'default' when unset.
 */
export function resolveCaseToExecute(
  selector: unknown,
  mode: string,
  cases: string[],
  defaultCase: string | undefined,
): string {
  if (mode === 'boolean') {
    return selector ? 'true' : 'false';
  }
  for (const c of cases) {
    if (matchCaseLabel(selector, c, mode)) return c;
  }
  if (defaultCase) return defaultCase;
  return 'default';
}
