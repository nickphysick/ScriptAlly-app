/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ⚠️ `TodoBoard.tsx` AND `todoBoard.css` ARE DELETED, AND STAY DELETED.
 *
 * The four-column lane board was retired as this page's body in tasks-consolidation P2 (9 Aug).
 * The COMPONENT was not: it survived nine months mounted nowhere, and its stylesheet went on
 * loading on every page that opens a ⋯ menu, because `PortalMenu` — extracted from it — kept
 * importing the sheet. So `.tbd-col`, `.tbd-card` and `.tbd-empty` sat live in the cascade with no
 * renderer, waiting for any element that happened to wear those names.
 *
 * That is not hypothetical: the QC-chassis round's own board had to be called `brd-` to get out of
 * their way, and its P4.6 asserts nothing on the board wears a `tbd-` class. This is the other half
 * of that — the names are free now.
 *
 * ⚠️ THE MENU'S RULES MOVED RATHER THAN DIED. `portalMenu.css` carries them, and `PortalMenu`
 * imports that. The class names keep their `tbd-` prefix deliberately: renaming them would be a
 * second change riding a deletion, and the menu's markup, its lock and its ref all use those words.
 *
 * ⚠️ AND SEVEN TEST FILES WENT WITH THE COMPONENT — they tested a thing nothing rendered. Three
 * others used it as a convenient SUBJECT for claims that were never about it; those claims moved to
 * the live board or were retired at their own site, each saying which.
 */
import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { readdirSync } from "node:fs";

const here = join(process.cwd(), "src/components/todo");

describe("the retired four-column board stays retired", () => {
  it("neither file exists", () => {
    expect(existsSync(join(here, "TodoBoard.tsx")), "TodoBoard.tsx is back").toBe(false);
    expect(existsSync(join(here, "todoBoard.css")), "todoBoard.css is back").toBe(false);
  });

  /* ⚠️ AND NOTHING IMPORTS THEM — the half that matters, because a file can be re-created by a
     merge without anyone deciding to. Comments are stripped first: this repo's prose names both
     files constantly, including in this very file's header. */
  it("nothing imports either, in source", () => {
    const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
    const offenders: string[] = [];
    for (const dir of ["src/components/todo", "src/components/shell", "src/lib"]) {
      for (const f of readdirSync(join(process.cwd(), dir))) {
        if (!/\.(ts|tsx)$/.test(f) || f === "deadBoard.test.ts") continue;
        const src = strip(readFileSync(join(process.cwd(), dir, f), "utf8"));
        if (/from ["']\.\/TodoBoard["']|import ["']\.\/todoBoard\.css["']/.test(src)) {
          offenders.push(dir + "/" + f);
        }
      }
    }
    expect(offenders, "something imports the deleted board or its stylesheet").toEqual([]);
  });

  /* ⚠️ THE MENU KEPT ITS RULES — asserted, because deleting the sheet without moving them would
     have left every ⋯ menu in the app unstyled, and a menu that still OPENS is the kind of
     regression nobody notices until they look at one. */
  it("the portal menu's own stylesheet carries them, and the menu imports it", () => {
    const css = readFileSync(join(here, "portalMenu.css"), "utf8");
    for (const cls of [".tbd-menu2", ".tbd-mhead", ".tbd-msep", ".tbd-mi", ".tbd-mgo"]) {
      expect(css, `${cls} did not survive the move`).toContain(cls);
    }
    expect(readFileSync(join(here, "PortalMenu.tsx"), "utf8"))
      .toContain('import "./portalMenu.css"');
  });
});
