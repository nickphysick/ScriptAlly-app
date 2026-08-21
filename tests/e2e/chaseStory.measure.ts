/**
 * Phase 2 diagnosis — how many story rungs each journey renders, and what the tiles say beside them.
 * ⚠️ NO BACKTICKS INSIDE ANY page.evaluate TEMPLATE.
 *
 * ⚠️ AND `\\s` INSIDE ONE, NEVER `\\\\s` COLLAPSED TO `\\s`. A template literal eats the backslash:
 * `\\s` becomes the letter "s", so `.replace(/\\s+/g, " ")` compiles into "replace every s with a
 * space". It corrupted the TEXT of four rounds of reports — "No re pon e from Ro alind Vale" — while
 * every prefix comparison still passed, so it read as a font quirk rather than as a broken probe.
 * The first assertion that matched on a word containing an s failed, about a page that was correct.
 */
import { test } from "@playwright/test";
import { ensureSignedIn } from "./measure";
import { writeFileSync, rmSync, mkdirSync } from "node:fs";
const OUT = "run-artifacts/chase-story.txt";
rmSync(OUT, { force: true });
mkdirSync("reports/chase-round", { recursive: true });
const VIS = `(e) => { if (!e) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; }`;

test("chase story", async ({ page }) => {
  await ensureSignedIn(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  const out: string[] = [];
  await page.goto("/todo");
  await page.waitForSelector(".tlc .row", { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(4500);
  const census = await page.evaluate(`(() => {
    const vis = ${VIS};
    const by = {};
    for (const r of [...document.querySelectorAll(".tlc .row")].filter(vis)) {
      const p = ((r.querySelector(".pill") || {}).textContent || "?").trim();
      by[p] = (by[p] || 0) + 1;
    }
    return by;
  })()`);
  out.push("census: " + JSON.stringify(census));

  for (const pill of ["Chase", "Send", "Close", "Fix"]) {
    await page.goto("/todo");
    await page.waitForSelector(".tlc .row", { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(4500);
    const clicked = await page.evaluate(`(() => {
      const vis = ${VIS};
      const rows = [...document.querySelectorAll(".tlc .row")].filter(vis)
        .filter((r) => ((r.querySelector(".pill") || {}).textContent || "").trim() === ${JSON.stringify(pill)});
      if (!rows.length) return null;
      rows[0].click();
      return (rows[0].textContent || "").replace(/\\s+/g, " ").trim().slice(0, 52);
    })()`);
    if (!clicked) { out.push(pill + ": NO ROW"); continue; }
    await page.waitForTimeout(2600);
    const r = await page.evaluate(`(() => {
      const vis = ${VIS};
      const all = (s) => [...document.querySelectorAll(s)].filter(vis);
      const tl = all(".storycol .tl")[0];
      const rungs = tl ? [...tl.children].filter(vis) : [];
      return {
        deed: ((all(".tpn .deed")[0] || {}).textContent || "").replace(/\\s+/g, " ").trim().slice(0, 60),
        rungs: rungs.map((x) => (x.textContent || "").replace(/\\s+/g, " ").trim().slice(0, 40)),
        tiles: all(".tpn .tile, .tpn .fact").map((x) => (x.textContent || "").replace(/\\s+/g, " ").trim().slice(0, 40)),
        statusWord: ((all(".story-h .stat")[0] || {}).textContent || "").trim(),
      };
    })()`);
    const d = r as { deed: string; rungs: string[]; tiles: string[]; statusWord: string };
    out.push(pill + " — " + clicked);
    out.push("  deed: " + d.deed);
    out.push("  status: " + d.statusWord);
    out.push("  rungs (" + d.rungs.length + "): " + JSON.stringify(d.rungs));
    out.push("  tiles: " + JSON.stringify(d.tiles.slice(0, 4)));
    await page.screenshot({ path: "reports/chase-round/pane-" + pill.toLowerCase() + ".png" });

    /**
     * ⚠️ THE CLAIM, NAMED BY SUBJECT. A story that renders only its terminus is the fault this
     * phase exists for; a story whose FIRST rung is the send is the fixed shape. Stated per pill
     * so a pass cannot be read as covering a journey that had no row.
     */
    const first = d.rungs[0] || "";
    const hasSend = /Query\s*sent/i.test(first.replace(/\s+/g, " "));
    const terminus = /Your\s*turn/i.test((d.rungs[d.rungs.length - 1] || "").replace(/\s+/g, " "));
    out.push("  ASSERT " + pill + " · story opens on the send: " + (hasSend ? "PASS" : "FAIL")
      + " · ends on the terminus: " + (terminus ? "PASS" : "FAIL")
      + " · rungs beyond the terminus: " + (d.rungs.length - 1));
  }
  writeFileSync(OUT, out.join("\n") + "\n");
});
