import { test } from "@playwright/test";
import { ensureSignedIn } from "./measure";
import { openTaskInView } from "./todoOpen";
import { PARTS, contractCss, propsFor, read, openContract, same, camel, CONTRACT_PATH } from "./anatomy";
import { writeFileSync, rmSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
test.setTimeout(900_000);

/**
 * PHASE 0 — RECON. It reports; it does not judge.
 *
 * The contract's computed value beside the deployed page's computed value, for every element the
 * brief names. No fixing, and no assertion beyond the one that says the run happened: the point of
 * this file is that the table is the round.
 */
test("anatomy recon — the contract beside the deployed page", async ({ page }) => {
  const OUT = "run-artifacts/anatomy-recon.md";
  rmSync(OUT, { force: true });

  const md5 = createHash("md5").update(readFileSync(CONTRACT_PATH)).digest("hex");
  const css = contractCss();

  /* ── the app: the drawer, open on an Agent request (the contract's `now` / Send) ── */
  await ensureSignedIn(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  /* ⚠️ TICKET 1, NOT 0, AND THE REASON IS THE FIXTURE. Ticket 0 is an OFFER, whose journey draws
     no fork and no questions at all — so a recon taken there would report `.fk`, `.ql` and the
     whole ledger as MISSING from the app when they are simply not part of that task. Ticket 1 is
     a Send, which is the contract's own `now`/`Agent request` shape. */
  const scopeApp = await openTaskInView(page, "grid", 1);
  const appVals: Record<string, Awaited<ReturnType<typeof read>>> = {};
  for (const p of PARTS) {
    const props = propsFor(css, p);
    appVals[p.c] = p.app ? await read(page, p.app, props) : { found: false, count: 0, values: {} };
  }
  /* what the app's drawer actually holds, so a wrong app selector is distinguishable from a
     missing element — the census is READ, never assumed */
  const appClasses = await page.evaluate(() => {
    const root = document.querySelector(".slo");
    if (!root) return { has: false, classes: [] as string[] };
    const seen = new Set<string>();
    root.querySelectorAll("*").forEach((e) => String(e.className).split(/\s+/).forEach((c) => c && seen.add(c)));
    return { has: true, classes: [...seen].sort() };
  });
  /* ⚠️ THE WIDTH CHAIN. `.workscroll` measured 384 inside a 640 drawer on the first pass — a
     quarter of the drawer unaccounted for. Where a box is narrower than its parent, the answer is
     always an ancestor, so the ancestors are printed rather than guessed at. */
  const widthChain = await page.evaluate(() => {
    let n: Element | null = document.querySelector(".slo .workscroll");
    const out: Array<{ cls: string; w: number; cols: string; mr: string }> = [];
    while (n && !n.classList.contains("slo-scrim")) {
      const cs = getComputedStyle(n);
      out.push({ cls: String(n.className).slice(0, 24), w: Math.round(n.getBoundingClientRect().width * 10) / 10,
        cols: cs.gridTemplateColumns, mr: cs.marginRight });
      if (n.classList.contains("slo")) break;
      n = n.parentElement;
    }
    return out;
  });
  const railKids = await page.evaluate(() => {
    const tl = document.querySelector(".tpn .rail .tl");
    if (!tl) return [];
    return [...tl.children].map((e) => String(e.className)).slice(0, 6);
  });

  /* ── the contract, same family, in a second page ── */
  const cpage = await page.context().newPage();
  await cpage.setViewportSize({ width: 1440, height: 900 });
  const taskIdx = await openContract(cpage, "now", "Agent request");
  const conVals: Record<string, Awaited<ReturnType<typeof read>>> = {};
  for (const p of PARTS) conVals[p.c] = await read(cpage, p.cq ?? p.c, propsFor(css, p));
  const conPop = await cpage.evaluate(() => {
    const pop = document.querySelector(".pop") as HTMLElement | null;
    const dr = document.querySelector(".drawer") as HTMLElement | null;
    if (!pop || !dr) return null;
    const a = pop.getBoundingClientRect(), b = dr.getBoundingClientRect();
    return { gap: Math.round((b.left - a.right) * 10) / 10, top: Math.round(a.top * 10) / 10 };
  });
  const appPop = await page.evaluate(() => {
    const pop = document.querySelector(".slo .rail") as HTMLElement | null;
    const dr = document.querySelector(".slo") as HTMLElement | null;
    if (!pop || !dr) return null;
    const a = pop.getBoundingClientRect(), b = dr.getBoundingClientRect();
    return { gap: Math.round((b.left - a.right) * 10) / 10, top: Math.round(a.top * 10) / 10 };
  });
  await cpage.close();

  /* ── the table ── */
  const L: string[] = [];
  L.push("# To-do — the drawer's anatomy, recon");
  L.push("");
  L.push(`Contract \`${CONTRACT_PATH}\` md5 \`${md5}\`, opened as a file URL and rendered; task index ${taskIdx} (family \`now\`, verb \`Send\`).`);
  L.push(`Deployed page: \`${process.env.SA_E2E_BASE_URL}\`, \`/todo\` in **grid** view, ticket 1 (a Send — ticket 0 is an offer, whose journey draws no fork), drawer open.`);
  L.push("Both at 1440×900. Every value is `getComputedStyle`; nothing here is typed by hand.");
  L.push("");

  let missing = 0, differ = 0, matchP = 0, differP = 0;
  const missingList: string[] = [];

  L.push("## The table");
  L.push("");
  for (const p of PARTS) {
    const props = propsFor(css, p);
    const c = conVals[p.c], a = appVals[p.c];
    const head = `### \`${p.c}\`${p.app ? ` → \`${p.app}\`` : " → *(no app selector)*"}`;
    L.push(head);
    if (p.note) L.push(`> ${p.note}`);
    if (!c.found) {
      L.push("");
      L.push(`⚠️ the CONTRACT has no visible \`${p.c}\` in this state (matched ${c.count}) — nothing to compare against.`);
      L.push("");
      continue;
    }
    if (!a.found) {
      missing++; missingList.push(p.c);
      L.push("");
      L.push(`**MISSING on dev.** \`${p.app ?? "—"}\` matched ${a.count} element${a.count === 1 ? "" : "s"}, none visible.`);
      L.push("");
      L.push("| property | contract | dev |");
      L.push("|---|---|---|");
      for (const q of props) L.push(`| \`${q}\` | \`${c.values[q] || "—"}\` | **absent** |`);
      L.push("");
      continue;
    }
    const rows: string[] = [];
    let bad = 0;
    for (const q of props) {
      const cv = c.values[q] ?? "", av = a.values[q] ?? "";
      const ok = same(cv, av);
      if (ok) matchP++; else { bad++; differP++; }
      const waived = p.waive?.[camel(q)] ?? p.waive?.[q];
      rows.push(`| \`${q}\` | \`${cv || "—"}\` | \`${av || "—"}\` | ${ok ? "=" : waived ? "≠ *(waived)*" : "**≠**"} |`);
    }
    if (bad) differ++;
    L.push("");
    L.push(`present · contract ${c.rect?.w}×${c.rect?.h} · dev ${a.rect?.w}×${a.rect?.h} · ${bad} of ${props.length} properties differ`);
    L.push("");
    L.push("| property | contract | dev | |");
    L.push("|---|---|---|---|");
    L.push(...rows);
    L.push("");
    for (const [k, why] of Object.entries(p.waive ?? {})) L.push(`- waived \`${k}\`: ${why}`);
    if (p.waive) L.push("");
  }

  L.push("---");
  L.push("");
  L.push("## Which of these exist on dev at all");
  L.push("");
  L.push(`**${missing} of ${PARTS.length} elements are absent**: ${missingList.map((s) => `\`${s}\``).join(" · ") || "none"}.`);
  L.push("");
  L.push(`Of the ${PARTS.length - missing} present, ${differ} differ from the contract in at least one property — ` +
    `${differP} property disagreements against ${matchP} matches.`);
  L.push("");
  L.push("### the index card's anchor");
  L.push("");
  L.push(`- contract: gap to the drawer **${conPop?.gap ?? "—"}px**, top **${conPop?.top ?? "—"}px**`);
  L.push(`- dev:      gap to the drawer **${appPop?.gap ?? "—"}px**, top **${appPop?.top ?? "—"}px**`);
  L.push("");
  L.push("### the app's drawer, as rendered");
  L.push("");
  L.push(appClasses.has
    ? `\`.slo\` holds these classes: ${appClasses.classes.map((c) => `\`${c}\``).join(" ")}`
    : "⚠️ no `.slo` in the document at all.");
  L.push("");
  L.push("### the drawer's width chain, `.workscroll` upward");
  L.push("");
  L.push("| element | width | grid-template-columns | margin-right |");
  L.push("|---|---|---|---|");
  for (const w of widthChain) L.push(`| \`${w.cls}\` | ${w.w} | \`${w.cols}\` | \`${w.mr}\` |`);
  L.push("");
  L.push(`\`.tl\`'s children carry: ${railKids.length ? railKids.map((c) => `\`${c}\``).join(" · ") : "—"}`);
  L.push("");

  writeFileSync(OUT, L.join("\n"));
  console.log(`\nRECON → ${OUT}\n  ${missing} missing · ${differ} differing · ${differP} property disagreements · ${matchP} matches\n`);
});
