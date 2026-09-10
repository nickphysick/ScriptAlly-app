import { test } from "@playwright/test";
import { ensureSignedIn } from "./measure";
import { gotoTodo, selectTodoView } from "./todoOpen";
import { propsFor } from "./anatomy";
import { VIEW_PARTS, VIEWS_PATH, VIEWS_MD5, cssOf, openContractView, readBox, trackShape, samePlace, type ViewName } from "./views";
import { writeFileSync, rmSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
test.setTimeout(900_000);

/**
 * PHASE 0 — RECON. It reports; it does not judge.
 *
 * The contract's computed value beside the deployed page's, per selector, for all three views —
 * AND each element's rect as a proportion of its own container, which is the half the drawer round
 * proved was missing.
 */
test("views recon — the contract beside the page, three views", async ({ page }) => {
  const OUT = "run-artifacts/views-recon.md";
  rmSync(OUT, { force: true });
  const md5 = createHash("md5").update(readFileSync(VIEWS_PATH)).digest("hex");
  const css = cssOf(VIEWS_PATH);

  const L: string[] = [];
  L.push("# To-do — the three views, recon");
  L.push("");
  L.push(`Contract \`${VIEWS_PATH}\` md5 \`${md5}\`${md5 === VIEWS_MD5 ? " (matches the brief)" : " ⚠️ DIFFERS FROM THE BRIEF"}, opened as a file URL and rendered.`);
  L.push(`Page: \`${process.env.SA_E2E_BASE_URL}\`, \`/todo\`, at 1440×900. Every value is \`getComputedStyle\`; every position is a measured rect. Nothing here is typed by hand.`);
  L.push("");

  const cpage = await page.context().newPage();
  await cpage.setViewportSize({ width: 1440, height: 900 });

  await ensureSignedIn(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await gotoTodo(page, "list");

  const summary: string[] = [];
  const missingAll: Record<string, string[]> = {};

  for (const view of ["grid", "list", "board"] as ViewName[]) {
    await selectTodoView(page, view);
    await page.waitForTimeout(500);
    /* the ref is forced to the app's own content width, so every reading below is in pixels */
    const appW = await page.evaluate((sel: string) => {
      const el = [...document.querySelectorAll(sel)].find((e) => e.getBoundingClientRect().width > 0);
      return el ? Math.round(el.getBoundingClientRect().width) : 0;
    }, view === "grid" ? ".tkt-grid" : view === "list" ? ".tlc" : ".brd");
    await openContractView(cpage, view, appW);

    const parts = VIEW_PARTS[view];
    let missing = 0, differP = 0, matchP = 0, differPos = 0, present = 0;
    const miss: string[] = [];
    L.push(`## ${view}`);
    L.push("");

    for (const p of parts) {
      const props = propsFor(css, p);
      const c = await readBox(cpage, p.cq ?? p.c, props, p.cIn);
      const a = p.app ? await readBox(page, p.app, props, p.aIn) : { found: false, count: 0, values: {} };
      L.push(`### \`${p.c}\`${p.app ? ` → \`${p.app}\`` : " → *(no app selector)*"}`);
      if (p.note) L.push(`> ${p.note}`);
      if (!c.found) { L.push(""); L.push(`⚠️ the CONTRACT draws no visible \`${p.cq ?? p.c}\` in this view (matched ${c.count}).`); L.push(""); continue; }
      if (!a.found) {
        missing++; miss.push(p.c);
        L.push(""); L.push(`**MISSING on dev.** \`${p.app ?? "—"}\` matched ${a.count}, none visible.`);
        L.push(""); L.push("| property | contract | dev |"); L.push("|---|---|---|");
        for (const q of props) L.push(`| \`${q}\` | \`${c.values[q] || "—"}\` | **absent** |`);
        L.push(`| *position* | \`${JSON.stringify(c.rel)}\` | **absent** |`);
        L.push(""); continue;
      }
      present++;
      const rows: string[] = []; let bad = 0;
      for (const q of props) {
        let cv = c.values[q] ?? "", av = a.values[q] ?? "";
        if (q === "grid-template-columns" || q === "grid-template-rows") { cv = trackShape(cv); av = trackShape(av); }
        const ok = cv === av;
        if (ok) matchP++; else { bad++; differP++; }
        rows.push(`| \`${q}\` | \`${cv || "—"}\` | \`${av || "—"}\` | ${ok ? "=" : "**≠**"} |`);
      }
      const posOk = samePlace(c.rel, a.rel, { abs: p.abs, fluid: p.fluid });
      if (!posOk) differPos++;
      L.push("");
      L.push(`present · ${bad} of ${props.length} properties differ · position ${posOk ? "matches" : "**DIFFERS**"}`);
      L.push("");
      L.push("| property | contract | dev | |"); L.push("|---|---|---|---|");
      L.push(...rows);
      L.push(`| *offset in \`${p.cIn ?? "itself"}\`* | \`${c.rel?.dx},${c.rel?.dy}\` · \`${c.rel?.w}×${c.rel?.h}\` | \`${a.rel?.dx},${a.rel?.dy}\` · \`${a.rel?.w}×${a.rel?.h}\` | ${posOk ? "=" : "**≠**"} |`);
      L.push(`| *host* | \`${c.rel?.hostW}×${c.rel?.hostH}\` | \`${a.rel?.hostW}×${a.rel?.hostH}\` | |`);
      L.push("");
    }
    missingAll[view] = miss;
    summary.push(`**${view}** — ${missing} of ${parts.length} absent · ${present} present, of which ${differPos} sit in the wrong place · ${differP} property disagreements against ${matchP} matches`);
    L.push("---"); L.push("");
  }

  await cpage.close();

  L.push("## Which of these do not exist on dev at all");
  L.push("");
  for (const [v, m] of Object.entries(missingAll)) {
    L.push(`- **${v}** — ${m.length ? m.map((s) => `\`${s}\``).join(" · ") : "none"}`);
  }
  L.push("");
  L.push("## Summary");
  L.push("");
  for (const s of summary) L.push(`- ${s}`);
  L.push("");

  writeFileSync(OUT, L.join("\n"));
  console.log("\nVIEWS RECON → " + OUT + "\n  " + summary.join("\n  ") + "\n");
});
