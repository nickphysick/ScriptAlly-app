/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The 26 Oct wording change to the estimate's two tails, applied to `campaignEstimate.ref.json`
 * (pricing ladder, ref design-refs/pricing-plans-ladder-v1.html).
 *
 * ⚠️ WHY A SUBSTITUTION, NOT A RE-RECORDING. The file is the phone ref's own output, recorded by
 * scripts/pricing-mobile-refoutputs.mjs. The ladder ref has no estimate script to run — its wording
 * panel states the new tail, and the brief states the second — so there is nothing to re-record from.
 * This replaces exactly those two sentences and nothing else, and refuses to run unless it finds them
 * in the numbers the recording has (206 and 115), so it cannot quietly rewrite a different file.
 * Every other field — the estimate, the why sentence, the fit, the notes — stays the ref's own.
 *
 *   node scripts/pricing-ladder-tails.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";

const FILE = "src/marketing/campaignEstimate.ref.json";
const SWAP = [
  ["If you're still querying after that, we'll be in touch with options to extend.",
   "If you're still querying after that, your plan simply carries on month by month.", 206],
  ["If your last replies run late, we'll be in touch with options to extend.",
   "If your last replies run late, your plan simply carries on month by month until you're done.", 115],
];
const cases = JSON.parse(readFileSync(FILE, "utf8"));
for (const [from, , want] of SWAP) {
  const n = cases.filter((c) => c.tail === from).length;
  if (n !== want) { console.error(`STOP: found ${n} of "${from}", expected ${want}`); process.exit(1); }
}
for (const c of cases) for (const [from, to] of SWAP) if (c.tail === from) c.tail = to;
writeFileSync(FILE, JSON.stringify(cases, null, 1) + "\n");
console.log(`${cases.length} cases; ${SWAP.map(([, , n]) => n).join(" + ")} tails replaced`);
