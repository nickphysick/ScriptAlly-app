/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v152 L14 — compares the phone readings qc152Phone.measure.ts wrote on the v151.2 build and on this one.
 * Exits 1 on any difference in the text or the data attributes of the Queries page or an open query's sheet.
 */
import { readFileSync } from "node:fs";
let bad = 0;
for (const w of [390, 360]) {
  const a = JSON.parse(readFileSync(`reports/qc-v152/phone/base-${w}.json`, "utf8"));
  const b = JSON.parse(readFileSync(`reports/qc-v152/phone/v152-${w}.json`, "utf8"));
  for (const part of ["list", "sheet"]) for (const k of ["text", "attrs"]) {
    const same = a[part][k] === b[part][k];
    if (!same) {
      bad++;
      const x = a[part][k], y = b[part][k];
      let i = 0; while (i < x.length && x[i] === y[i]) i++;
      console.log(`✗ ${w} ${part} ${k} differs at ${i}: base «${x.slice(Math.max(0, i - 60), i + 80)}» vs v152 «${y.slice(Math.max(0, i - 60), i + 80)}»`);
    } else console.log(`✓ ${w} ${part} ${k} identical (${a[part][k].length} chars)`);
  }
}
process.exit(bad ? 1 : 0);
