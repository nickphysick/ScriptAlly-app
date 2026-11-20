/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Submission packages v43 — the source locks (the rendered ones are tests/e2e/pk43.measure.ts).
 *   P6 (source half)  the pinned Archivist is gone: Pk41Hawk.tsx no longer resolves, nothing imports it, no stylesheet
 *                     draws `.p41-perch`; v41's header (Pk41Header) is gone with it
 */
import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const SRC = resolve(__dirname, "../../..");
const walk = (d: string): string[] => readdirSync(d).flatMap((n) => { const p = join(d, n); return statSync(p).isDirectory() ? walk(p) : [p]; });
const files = walk(SRC);
const page = readFileSync(resolve(SRC, "components/SubmissionPackages.tsx"), "utf8");

describe("PK43 P6 — the Archivist stands in the header; nothing is pinned", () => {
  it("finds the population it reads", () => {
    expect(files.filter((f) => f.endsWith(".css")).length).toBeGreaterThan(100);
    /* v62 (18 Nov): the header is v62's, on the same shared OpenHeader */
    expect(page).toContain("<Pk62Header");
  });
  it("Pk41Hawk no longer resolves, and nothing imports it", async () => {
    expect(existsSync(resolve(SRC, "components/packages/v41/Pk41Hawk.tsx"))).toBe(false);
    await expect(import("../v41/Pk41Hawk" as string)).rejects.toThrow();
    const importers = files.filter((f) => !f.endsWith("pk43.test.ts") && /\.(tsx?|mjs)$/.test(f) && /Pk41Hawk/.test(readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "")));
    expect(importers).toEqual([]);
  });
  it("no stylesheet draws the pinned hawk", () => {
    const perch = files.filter((f) => f.endsWith(".css") && /\.p41-perch\b/.test(readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\//g, "")));
    expect(perch).toEqual([]);
  });
  it("v41's header is gone with it: the page renders the shared OpenHeader through Pk62Header (v43's, re-pointed)", () => {
    expect(existsSync(resolve(SRC, "components/packages/v41/Pk41Header.tsx"))).toBe(false);
    expect(existsSync(resolve(SRC, "components/packages/v43/Pk43Header.tsx"))).toBe(false);
    const hd = readFileSync(resolve(SRC, "components/packages/v62/Pk62Header.tsx"), "utf8");
    expect(hd).toMatch(/import \{ OpenHeader \} from "\.\.\/\.\.\/shell\/OpenHeader"/);
    expect(hd).toContain('className="qc151 qc153 pk43-hdw"');
    expect(hd).toMatch(/src=\{HAWK_STANDING\}/);
    expect(readFileSync(resolve(SRC, "lib/packagesV43.ts"), "utf8")).toContain('HAWK_STANDING = "/images/packages/packages-hawk-standing.png"');
  });
});

/* ── P7 / P9 (source halves) ── */
const css = (f: string) => readFileSync(resolve(SRC, f), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
const decl = (sheet: string, sel: string) => {
  const m = new RegExp(`(?:^|\\n)\\s*${sel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{([^}]*)\\}`).exec(sheet);
  return m ? m[1].split(";").map((d) => d.trim()).filter(Boolean) : null;
};

describe("PK43 P7 (source) — the list is Query letters' rows, reused; the stat tiles are gone", () => {
  const ql = css("components/letters/queryLetters.css");
  const pk = css("components/packages/v43/pk43.css");
  it("the stat tiles' component and rules are deleted", () => {
    expect(existsSync(resolve(SRC, "components/packages/v42/Pk42Tiles.tsx"))).toBe(false);
    expect(css("components/packages/v42/pk42.css")).not.toMatch(/\.p42-tile|\.p42-tiles|\.p42-cb|\.p42-bw/);
    expect(page).not.toContain("Pk42Tiles");
    expect(page).toContain('import "./letters/queryLetters.css"');
  });
  it("the --ql-* tokens this page states equal the letters page's", () => {
    const toks = (s: string, root: string) => Object.fromEntries([...(decl(s, root) ?? []).join(";").matchAll(/(--ql-[\w-]+)\s*:\s*([^;]+)/g)].map((m) => [m[1], m[2].trim()]));
    const a = toks(ql, ".qlp"), b = toks(pk, ".pk43");
    expect(Object.keys(b).length).toBe(9);
    expect(b).toEqual(Object.fromEntries(Object.keys(b).map((k) => [k, a[k]])));
  });
  it("the three root-scoped row rules are restated with the letters page's values", () => {
    for (const [q, p] of [[".qlp .qlp-row-n", ".pk43 .qlp-row-n"], [".qlp .qlp-row-f b", ".pk43 .qlp-row-f b"]] as const) {
      expect(decl(ql, q), q).not.toBeNull();
      expect(decl(pk, p), p).toEqual(decl(ql, q));
    }
    const h = decl(pk, ".pk43 h2.qlp-h2")!, hq = decl(ql, ".qlp h2.qlp-h2")!;
    /* the letters page's own reset supplies margin 0 above; this page states it in the rule */
    expect(h.filter((d) => !d.startsWith("margin"))).toEqual(hq.filter((d) => !d.startsWith("margin")));
  });
});

describe("PK43 P9 (source) — no green in the builder on this page", () => {
  it("the step disc, the open step and the status dot are navy here", () => {
    const s = css("components/packages/v41/pk41.css");
    expect(s).toMatch(/\.p41 \.p41-bld \.p93-done \.p93-sn \{ background: var\(--sp-anthracite\); color: #f4eee5; \}/); // roll-out v1, ruling 3: one navy
    for (const g of ["#3e7d5a", "#4e6b58", "#f3f6f2", "#7fc89a"]) expect(s, g).not.toContain(g);
  });
});

/* ── P8 (source half), re-pointed to v62 (18 Nov): Pk43GoingOut and the builder are deleted ── */
import { isFinished } from "../../../lib/packagesV62";
import type { SubmissionPackage } from "../../../types";
const pkg = (over: Partial<SubmissionPackage>): SubmissionPackage => ({
  id: "p", userId: "u", manuscriptId: "m", packageName: "P", queryLetterVersionId: "", synopsisVersionId: "",
  samplePagesVersionId: "", status: "Active", createdDate: "2026-01-01", ...over,
});

describe("PK43 P8 (source) — Change offers only packages that can go out; the band says it the same way", () => {
  it("a draft (no version or no letter) is not offered; finished ones are, sent or not", () => {
    expect(isFinished(pkg({}))).toBe(false);
    expect(isFinished(pkg({ queryLetterVersionId: "l" }))).toBe(false);
    expect(isFinished(pkg({ bookVersionId: "v" }))).toBe(false);
    expect(isFinished(pkg({ bookVersionId: "v", queryLetterVersionId: "l" }))).toBe(true);
    expect(isFinished(pkg({ bookVersionId: "v", queryLetterVersionId: "l", firstSentAt: "2026-02-01" } as Partial<SubmissionPackage>))).toBe(true);
  });
  it("Change and the band's button call the one writer", () => {
    expect(page).toContain("const options = useMemo(() => live.filter(isFinished), [live]);");
    expect(page).toContain("if (await act.useForNew(p))");
    const open = readFileSync(resolve(SRC, "components/packages/v62/Pk62Open.tsx"), "utf8");
    expect(open).toContain("onClick={() => void act.useForNew(p)}>Use for new queries</button>");
    expect(readFileSync(resolve(SRC, "components/packages/v62/usePk62Actions.ts"), "utf8")).toContain("!canMakeActive(p, active?.id) || !isFinished(p)");
  });
});

/* ── P5 (source half) ── */
describe("PK43 P5 (source) — the bar is the Query Centre's; qcv156.css §3 names this page and changes nothing else", () => {
  const q = readFileSync(resolve(SRC, "components/queries/centre/qcv156.css"), "utf8");
  const at = q.indexOf("/* ── §3 · the collapsed header");
  const s3 = q.slice(at, q.indexOf("/* ── §", at + 10) > at ? q.indexOf("/* ── §", at + 10) : undefined);
  it("every list in §3 that names To-do's root names this page's too, and no list names it without To-do's", () => {
    const lists = [...s3.matchAll(/:is\(([^)]*)\)/g)].map((m) => m[1]);
    expect(lists.length).toBeGreaterThanOrEqual(16);
    for (const l of lists) expect(l.includes(".pk43"), l).toBe(l.includes(".tws56"));
    expect(q.slice(0, q.indexOf("/* ── §3"))).not.toContain(".pk43");
  });
  it("with `, .pk43` taken out, §3 reads as it did for To-do v56 (same rules, same specificity)", () => {
    /* RE-POINTED (Workspace headers v1, at the merge): the shared navy header's `.wsnh` follows `.pk43` in the lists */
    expect(s3.replace(/, \.pk43(?=[,)])/g, "")).not.toContain("pk43");
  });
  it("the page mounts the shared SlimBar through Pk62Slim (v43's, re-pointed), a direct child of the page root", () => {
    const slim = readFileSync(resolve(SRC, "components/packages/v62/Pk62Header.tsx"), "utf8");
    expect(slim).toMatch(/import \{ SlimBar \} from "\.\.\/\.\.\/shell\/SlimBar"/);
    expect(page.indexOf("<Pk62Slim")).toBeGreaterThan(page.indexOf('data-pk62="page"'));
    expect(page.indexOf("<Pk62Slim")).toBeLessThan(page.indexOf("<Pk62Header"));
  });
});

/* ── P10 (source half) ── */
describe("PK43 P10 (source) — day one is the same header and desk; v26's hero is retired", () => {
  it("Pk26Hero is gone from the page and its file deleted", () => {
    expect(page).not.toContain("Pk26Hero");
    expect(existsSync(resolve(SRC, "components/packages/v26/Pk26Header.tsx"))).toBe(false);
    expect(files.filter((f) => /\.tsx?$/.test(f) && !f.endsWith("pk43.test.ts") && /Pk26Hero|Pk26Header/.test(readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "")))).toEqual([]);
  });
});
