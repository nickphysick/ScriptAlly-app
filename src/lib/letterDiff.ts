/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query letters v2 (12 Nov), Phase E — "Show what changed from {parent}", ported from design-refs/query-letters-v2's
 * `diff` / `wdiff` / `alike`. Paragraphs are matched first (a longest common subsequence over paragraphs); a run of
 * removed and added paragraphs is then paired by word overlap, and a pair alike enough is diffed word by word.
 *
 * ⚠️ IT REPORTS DIFFERENCES ONLY. Nothing here scores, ranks or suggests wording. The ref returned HTML; this returns
 * segments so the page renders `<ins>` / `<del>` itself and never sets HTML.
 */

export type DiffKind = "same" | "added" | "removed";
export interface DiffSeg { kind: DiffKind; text: string }
/** One paragraph of the result: its segments in reading order. Paragraphs are joined by a blank line. */
export type DiffPara = DiffSeg[];

/** a longest-common-subsequence table over two token lists (the ref's Uint16Array grid) */
function lcs(A: readonly string[], B: readonly string[]): Uint16Array[] {
  const n = A.length, m = B.length;
  const L: Uint16Array[] = [];
  for (let i = 0; i <= n; i++) L.push(new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = A[i] === B[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  return L;
}

/** Word by word inside one reworked paragraph (the ref's `wdiff`). Whitespace runs are kept as their own tokens. */
export function wordDiff(a: string, b: string): DiffPara {
  const A = a.split(/(\s+)/), B = b.split(/(\s+)/);
  const L = lcs(A, B);
  const raw: DiffSeg[] = [];
  const push = (kind: DiffKind, s: string) => {
    const p = raw[raw.length - 1];
    if (p && p.kind === kind) p.text += s; else raw.push({ kind, text: s });
  };
  let i = 0, j = 0;
  while (i < A.length && j < B.length) {
    if (A[i] === B[j]) { push("same", A[i]); i++; j++; }
    else if (L[i + 1][j] >= L[i][j + 1]) { push("removed", A[i]); i++; }
    else { push("added", B[j]); j++; }
  }
  while (i < A.length) push("removed", A[i++]);
  while (j < B.length) push("added", B[j++]);
  /* the ref's output rules: a whitespace-only change keeps an added space and drops a removed one; a removed run is
     trimmed and followed by one space */
  const out: DiffSeg[] = [];
  for (const p of raw) {
    if (p.kind === "same") { out.push(p); continue; }
    if (!p.text.trim()) { if (p.kind === "added") out.push({ kind: "same", text: p.text }); continue; }
    if (p.kind === "added") out.push(p);
    else { out.push({ kind: "removed", text: p.text.trim() }); out.push({ kind: "same", text: " " }); }
  }
  return merge(out);
}

/** How alike two paragraphs are: the share of the smaller vocabulary they have in common (the ref's `alike`). */
export function alike(a: string, b: string): number {
  const A = new Set(a.toLowerCase().split(/\W+/).filter(Boolean));
  const B = new Set<string>();
  let n = 0, t = 0;
  for (const w of b.toLowerCase().split(/\W+/)) {
    if (!w || B.has(w)) continue;
    B.add(w); t++;
    if (A.has(w)) n++;
  }
  return t ? n / Math.min(t, A.size || 1) : 0;
}

/** Above this, a removed and an added paragraph are one paragraph reworded (the ref's .45). */
export const ALIKE_THRESHOLD = 0.45;

/** The letter against its parent: paragraphs first, then words inside a paragraph that was reworked. */
export function letterDiff(before: string, after: string): DiffPara[] {
  const A = before.split(/\n{2,}/), B = after.split(/\n{2,}/);
  const L = lcs(A, B);
  const out: DiffPara[] = [];
  let rem: string[] = [], add: string[] = [];
  const flush = () => {
    const used = new Set<number>();
    for (const p of add) {
      let best = -1, score = ALIKE_THRESHOLD;
      rem.forEach((r, k) => { if (used.has(k)) return; const sc = alike(r, p); if (sc > score) { score = sc; best = k; } });
      if (best >= 0) { used.add(best); out.push(wordDiff(rem[best], p)); }
      else out.push([{ kind: "added", text: p }]);
    }
    rem.forEach((r, k) => { if (!used.has(k)) out.push([{ kind: "removed", text: r }]); });
    rem = []; add = [];
  };
  let i = 0, j = 0;
  while (i < A.length && j < B.length) {
    if (A[i] === B[j]) { flush(); out.push([{ kind: "same", text: A[i] }]); i++; j++; }
    else if (L[i + 1][j] >= L[i][j + 1]) { rem.push(A[i]); i++; }
    else { add.push(B[j]); j++; }
  }
  while (i < A.length) rem.push(A[i++]);
  while (j < B.length) add.push(B[j++]);
  flush();
  return out;
}

/** true when the result has any added or removed text */
export const hasChanges = (d: readonly DiffPara[]): boolean => d.some((p) => p.some((s) => s.kind !== "same"));

function merge(segs: DiffSeg[]): DiffSeg[] {
  const out: DiffSeg[] = [];
  for (const s of segs) {
    if (!s.text) continue;
    const p = out[out.length - 1];
    if (p && p.kind === s.kind) p.text += s.text; else out.push({ ...s });
  }
  return out;
}
