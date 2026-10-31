/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The production build — what queryhawk.net is actually sent.
 *
 * ⚠️ THIS BUILDS ITS OWN BUNDLE, IN PRODUCTION MODE, INTO A TEMPORARY DIRECTORY. It never reads
 * `dist/`. That directory holds whichever build ran last, often `build:dev`, which keeps the
 * contact and onboarding labs on purpose. A lock that read it would be measuring a different
 * build from the one it names.
 *
 * ⚠️ "CANNOT RENDER" IS NOT "NOT SHIPPED", AND THIS LOCK ASKS THE SECOND QUESTION. Before go-live,
 * every lab was correctly gated and none could render in production, yet three lab hashes and
 * the retired domain were all in the bundle:
 *   - a gate that tested the hash BEFORE `MODE`, so the minifier kept the `startsWith` call;
 *   - a hook that runs in every build;
 *   - two `@license` docblocks, which esbuild copies whole into the output.
 * So it greps every emitted file, comments included, because comments are what ship.
 */

import { mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/** Every lab hash `App.tsx` routes. `#/plans` is a DEV hash, distinct from the `/plans` path. */
export const LAB_HASHES = [
  "#/status-dots", "#/plans", "#/contact-lab", "#/onb-lab", "#/notes-lab", "#/diary-lab",
  "#/drawer-lab", "#/reading-pane-lab", "#/shell-lab",
] as const;

export const LIVE_TITLE = "QueryHawk: Query With Confidence";

const ROOT = process.cwd();
let out = "";
const files: Array<[string, string]> = [];

const walk = (d: string): string[] =>
  readdirSync(d).flatMap((n) => (statSync(join(d, n)).isDirectory() ? walk(join(d, n)) : [join(d, n)]));

beforeAll(async () => {
  out = mkdtempSync(join(tmpdir(), "qh-prodbuild-"));
  /* ⚠️ Vite derives `import.meta.env.DEV` from NODE_ENV, not from `mode`, and Vitest runs with
     NODE_ENV=test. Built as-is, DEV is TRUE and every lab ships. That is a build nobody deploys,
     so the lock would fail on a correct tree. The `vite build` CLI sets production; so does this. */
  const prev = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  try {
    const { build } = await import("vite");
    await build({ root: ROOT, mode: "production", logLevel: "silent", build: { outDir: out, emptyOutDir: true } });
  } finally {
    process.env.NODE_ENV = prev;
  }
  for (const f of walk(out)) {
    if (/\.(js|css|html|json|txt|svg|map|webmanifest)$/.test(f)) files.push([f.slice(out.length + 1), readFileSync(f, "utf8")]);
  }
}, 300_000);

afterAll(() => { if (out) rmSync(out, { recursive: true, force: true }); });

describe("the production build", () => {
  it("P0 · it emitted a real bundle, so the sweeps below have something to read", () => {
    expect(files.some(([n]) => n === "index.html")).toBe(true);
    expect(files.filter(([n]) => /^assets\/index-.+\.js$/.test(n)).length).toBe(1);
    expect(files.reduce((a, [, s]) => a + s.length, 0)).toBeGreaterThan(1_000_000);
  });

  it("P1 · no lab hash is in any emitted file, comments included", () => {
    const hits = files.flatMap(([n, s]) => LAB_HASHES.filter((h) => s.includes(h)).map((h) => `${h} in ${n}`));
    expect(hits, "a lab hash in the production bundle").toEqual([]);
  });

  it("P2 · the page title is the live one", () => {
    const html = files.find(([n]) => n === "index.html")![1];
    expect(html.match(/<title>([^<]*)<\/title>/)?.[1]).toBe(LIVE_TITLE);
  });

  it("P3 · nothing emitted names scriptally.ink", () => {
    expect(files.filter(([, s]) => /scriptally\.ink/i.test(s)).map(([n]) => n)).toEqual([]);
  });
});
