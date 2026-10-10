/**
 * Ink shell v1 — a retired case says why, and what measures its claim now.
 * Used as `test.skip(true, retired("…", "INK1"))` at the top of a case whose subject the ink shell
 * replaced. Listed in tests/e2e/RETIRED-ink-shell-v1.md. A skip is not a pass: the report counts them.
 */
/** Query Centre v131 — the same, for a case whose subject v131 replaced on desktop. Listed in RETIRED-query-centre-v131.md. */
export function retiredV131(why: string, by: string): string {
  return `RETIRED by Query Centre v131 — ${why}. Superseded by ${by} (tests/e2e/RETIRED-query-centre-v131.md).`;
}

/** Query Centre v131.1 — the same, for a v131 desk case whose subject the ledger cards replaced. Listed in RETIRED-query-centre-v131-1.md. */
export function retiredV1311(why: string, by: string): string {
  return `RETIRED by Query Centre v131.1 — ${why}. Superseded by ${by} (tests/e2e/RETIRED-query-centre-v131-1.md).`;
}

/** Query Centre v132 — the same, for a desktop case whose subject "Recently updated" or the new workspace replaced. Listed in RETIRED-query-centre-v132.md. */
export function retiredV132(why: string, by: string): string {
  return `RETIRED by Query Centre v132 — ${why}. Superseded by ${by} (tests/e2e/RETIRED-query-centre-v132.md).`;
}

/** Query Centre v133 — the same, for a case whose subject was the band, its card or its disc on `/queries`. Listed in RETIRED-query-centre-v133.md. */
export function retiredV133(why: string, by: string): string {
  return `RETIRED by Query Centre v133 — ${why}. Superseded by ${by} (tests/e2e/RETIRED-query-centre-v133.md).`;
}

/** Query Centre v134 — the same, for a case whose subject was v131.1's ledger card (its title row, stamp or 52px trend). Listed in RETIRED-query-centre-v134.md. */
export function retiredV134(why: string, by: string): string {
  return `RETIRED by Query Centre v134 — ${why}. Superseded by ${by} (tests/e2e/RETIRED-query-centre-v134.md).`;
}

/** Query Centre v136 — the same, for a case whose subject was the Query Centre's panel header or its v135 badge desk. Listed in RETIRED-query-centre-v136.md. */
export function retiredV136(why: string, by: string): string {
  return `RETIRED by Query Centre v136 — ${why}. Superseded by ${by} (tests/e2e/RETIRED-query-centre-v136.md).`;
}

/** Header v3 — the same, for a case whose subject was a page's own header (v136's open header, the stamp, the faces row). Listed in RETIRED-header-v3.md. */
export function retiredHV3(why: string, by: string): string {
  return `RETIRED by header v3 — ${why}. Superseded by ${by} (tests/e2e/RETIRED-header-v3.md).`;
}

export function retired(why: string, by: string): string {
  return `RETIRED by ink shell v1 — ${why}. Superseded by ${by} (tests/e2e/RETIRED-ink-shell-v1.md).`;
}
