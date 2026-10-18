/**
 * The founding-number backfill's plan — pure, so it is tested without a database.
 *
 * Writers confirmed before founding numbers existed have a `position` but no `foundingNumber`.
 * They get one now, in the order they confirmed (`verifiedAt`), each taking the LOWEST number no
 * one holds — the same rule a new confirmation follows. Confirmed waiting-list writers without a
 * `reserveNumber` get the next ones in the order they confirmed (`verifyTokenSpentAt`).
 *
 * Idempotent by construction: anyone who already has a number is left alone, so a second run plans
 * nothing.
 *
 * @param {Array<{id: string, status?: string, foundingNumber?: number|null, verifiedAt?: number|null,
 *   reserveNumber?: number|null, spentAt?: number|null}>} docs  `*At` in epoch ms
 * @returns {{ founding: Array<{id: string, foundingNumber: number}>,
 *   reserve: Array<{id: string, reserveNumber: number}>,
 *   counter: { freedNumbers: number[], reserveIssued: number }, verified: number }}
 */
export function planFoundingBackfill(docs) {
  const isInt = (v) => typeof v === "number" && Number.isInteger(v) && v >= 1;
  const byTime = (key) => (a, b) => ((a[key] ?? Infinity) - (b[key] ?? Infinity)) || a.id.localeCompare(b.id);

  const verified = docs.filter((d) => d.status === "verified");
  const held = new Set(verified.map((d) => d.foundingNumber).filter(isInt));
  const founding = [];
  let next = 1;
  for (const d of verified.filter((x) => !isInt(x.foundingNumber)).sort(byTime("verifiedAt"))) {
    while (held.has(next)) next++;
    held.add(next);
    founding.push({ id: d.id, foundingNumber: next });
  }

  /* Only writers who CONFIRMED into the waiting list take a reserve place (a `spentAt` says they
     clicked); a join past the cap was never confirmed and holds no place in the queue. */
  const waiting = docs.filter((d) => d.status === "waiting" && d.spentAt != null);
  let reserveIssued = Math.max(0, ...docs.map((d) => d.reserveNumber).filter(isInt));
  const reserve = [];
  for (const d of waiting.filter((x) => !isInt(x.reserveNumber)).sort(byTime("spentAt"))) {
    reserve.push({ id: d.id, reserveNumber: ++reserveIssued });
  }

  const top = Math.max(0, ...held);
  const freedNumbers = [];
  for (let n = 1; n <= top; n++) if (!held.has(n)) freedNumbers.push(n);

  return { founding, reserve, counter: { freedNumbers, reserveIssued }, verified: verified.length };
}
