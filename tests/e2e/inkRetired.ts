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

export function retired(why: string, by: string): string {
  return `RETIRED by ink shell v1 — ${why}. Superseded by ${by} (tests/e2e/RETIRED-ink-shell-v1.md).`;
}
