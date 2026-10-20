/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * CV25 A4: `CompTitle.inQuery` is retired. Which comps a letter mentions is the letter's own
 * `compIds`; nothing reads or writes the old flag.
 */
import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { normalizeComp } from "./comps";
import { materialDoors } from "./manuscriptV21";
import { compLetterTally } from "./manuscriptSummary";
import { compRows } from "./manuscriptShelf";
import type { CompTitle } from "../types";

const FLAG = ["in", "Query"].join("");
/**
 * THE EXEMPT SET: exactly two files may spell the retired name.
 *   - `src/types.ts` declares it, marked retired, because stored documents may still carry it;
 *   - `src/lib/suggestComps.ts` names it in a comment. That file is the Scout's client, which this
 *     pack may not touch, and NOTHING CALLS IT: the comps page mounts no Scout and `SCOUT_LIVE` is
 *     off. It is a known leftover for when the Scout goes live.
 * This lock audits the app's source. It does not audit firestore.rules, which go on accepting a
 * stored value (no migration writes).
 */
const MAY_NAME_IT = ["src/types.ts", "src/lib/suggestComps.ts"];
/** The scanner has to spell what it hunts for; it skips itself by name, apart from the exempt set. */
const SELF = "src/lib/compsInQueryRetired.test.ts";

function walk(dir: string, out: string[] = []): string[] {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(f)) out.push(p);
  }
  return out;
}

describe("CV25 A4: inQuery is retired", () => {
  it("no source outside types.ts names it", () => {
    const files = walk("src");
    expect(files.length, "the sweep found the source tree").toBeGreaterThan(500);
    const hits = files.filter((p) => p !== SELF && readFileSync(p, "utf8").includes(FLAG)).sort();
    expect(hits).toEqual([...MAY_NAME_IT].sort());
    expect(MAY_NAME_IT.length).toBe(2);
  });
  it("the Scout's client, the one other file that names it, has no caller on the comps page", () => {
    /* comps v28: every file the page is built from, read from its folders (a hand-written list named two components
       after they were deleted), so a file added there is covered without an edit here */
    const dir = "src/components/manuscripts";
    const files = ["ComparableTitlesPage.tsx", ...["comps25", "comps28"].flatMap((d) => readdirSync(`${dir}/${d}`).filter((f) => /\.tsx?$/.test(f) && !f.includes(".test.")).map((f) => `${d}/${f}`))];
    expect(files.length, "the page's files were found").toBeGreaterThan(10);
    const page = files.map((f) => readFileSync(`${dir}/${f}`, "utf8")).join("\n");
    /* an import, never a mention: comments in those files say what they do not reach */
    expect(page).not.toMatch(/from\s+["'][^"']*suggestComps["']/);
  });
  it("the declaration that remains says it is retired", () => {
    const types = readFileSync("src/types.ts", "utf8");
    expect(types).toMatch(new RegExp(`${FLAG}\\?: boolean; // retired`));
  });
  it("a stored flag does not survive a write, and reads as nothing", () => {
    const stored = { title: "A", id: "cmp_a", [FLAG]: true } as unknown as CompTitle;
    expect(FLAG in normalizeComp(stored)).toBe(false);
    /* a comp carrying the old flag, in no letter: every Manuscripts-page fact says it is in none */
    expect(compLetterTally([stored], []).inLetter).toBe(0);
    expect(compRows([stored], [])[0].inLetter).toBe(false);
    expect(materialDoors({ comps: [stored], letterCompIds: [], letters: 1, synopses: 0, letterName: null, livePackages: 0, packageQueries: 0 })[0].sentence)
      .toBe("Books and films like yours. None are in your query letter yet.");
  });
  it("the Manuscripts page's comps facts equal the current letter's compIds", () => {
    const comps: CompTitle[] = [{ title: "A", id: "a" }, { title: "B", id: "b" }, { title: "C", id: "c" }];
    for (const ids of [[], ["a"], ["a", "c"], ["a", "b", "c"]] as string[][]) {
      expect(compLetterTally(comps, ids).inLetter).toBe(ids.length);
      expect(compRows(comps, ids).filter((r) => r.inLetter).map((r) => r.comp.id).sort()).toEqual([...ids].sort());
      const s = materialDoors({ comps, letterCompIds: ids, letters: 1, synopses: 0, letterName: null, livePackages: 0, packageQueries: 0 })[0].sentence;
      expect(s).toBe(`Books and films like yours. ${ids.length === 0 ? "None are in your query letter yet." : `${ids.length} ${ids.length === 1 ? "is" : "are"} in your query letter.`}`);
    }
    const page = readFileSync("src/components/manuscripts/v12/ManuscriptPage.tsx", "utf8");
    expect(page).toContain("letterCompIds: nowLetter?.compIds ?? null");
    expect(page).toContain("currentLetter(ms.id, versions)");
  });
});
