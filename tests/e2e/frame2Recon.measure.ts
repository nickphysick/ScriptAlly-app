import { test } from "@playwright/test";
import { ensureSignedIn } from "./measure";
import { writeFileSync } from "node:fs";

const VIS = `(e) => { if (!e) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; }`;

/** walk from the workspace container down to the list card, printing each link's box + padding */
const CHAIN = (cardSel: string) => `(() => {
  const vis = ${VIS};
  const card = [...document.querySelectorAll(${JSON.stringify(cardSel)})].find(vis);
  if (!card) return { error: "no card for ${cardSel}" };
  const links = [];
  let el = card;
  while (el && el !== document.body) {
    const c = getComputedStyle(el), r = el.getBoundingClientRect();
    links.push({
      cls: String(el.className).trim().split(/\\s+/).slice(0,3).join("."),
      x: Math.round(r.left), right: Math.round(r.right), w: Math.round(r.width),
      pad: [c.paddingTop, c.paddingRight, c.paddingBottom, c.paddingLeft].map(p => Math.round(parseFloat(p))).join("/"),
      mar: [c.marginTop, c.marginRight, c.marginBottom, c.marginLeft].map(p => Math.round(parseFloat(p))).join("/"),
      gap: c.gap === "normal" ? "-" : c.gap,
    });
    el = el.parentElement;
  }
  const r = card.getBoundingClientRect();
  return { links: links.reverse(), cardLeft: Math.round(r.left), cardBottom: Math.round(r.bottom),
           fromViewportBottom: Math.round(window.innerHeight - r.bottom) };
})()`;

test("frame2 recon", async ({ page }) => {
  await ensureSignedIn(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  const out: string[] = ["# frame2 recon — measured at 1440×900\n"];

  /* ── 1 · the inset chains ─────────────────────────────────────────────────────────────── */
  for (const [route, sel] of [["/queries", ".f12-list"], ["/todo", ".tlc"]] as const) {
    await page.goto(route); await page.waitForTimeout(6500);
    const c = await page.evaluate(CHAIN(sel)) as any;
    out.push(`## ${route} — chain down to \`${sel}\``);
    if (c.error) { out.push("  " + c.error); continue; }
    out.push("| element | x | w | padding T/R/B/L | margin | gap |");
    out.push("|---|---|---|---|---|---|");
    for (const l of c.links) out.push(`| \`.${l.cls}\` | ${l.x} | ${l.w} | ${l.pad} | ${l.mar} | ${l.gap} |`);
    out.push(`\n**card left = ${c.cardLeft} · card bottom = ${c.cardBottom} · ${c.fromViewportBottom}px from the viewport bottom**\n`);
  }

  /* ── 2 · the page title ───────────────────────────────────────────────────────────────── */
  for (const [route, sels] of [["/queries", ".wsh-title, .wpg-plate, .qc-wpg .wsh"], ["/todo", ".wsh-title, .wpg-plate, .tpl-wpg .wsh"]] as const) {
    await page.goto(route); await page.waitForTimeout(6000);
    const t = await page.evaluate(`(() => {
      const vis = ${VIS};
      return [...document.querySelectorAll(${JSON.stringify(sels)})].filter(vis).slice(0,4).map((e) => {
        const c = getComputedStyle(e), r = e.getBoundingClientRect();
        return { cls: String(e.className).slice(0,44), text: (e.textContent||"").trim().slice(0,32),
                 size: c.fontSize, weight: c.fontWeight, family: c.fontFamily.split(",")[0],
                 h: Math.round(r.height) };
      });
    })()`) as any[];
    out.push(`## ${route} — page title`);
    for (const e of t) out.push(`- \`.${e.cls}\` — "${e.text}" · ${e.family} ${e.size}/${e.weight} · box ${e.h}px tall`);
    out.push("");
  }

  /* ── 3 · every count on /todo ─────────────────────────────────────────────────────────── */
  await page.goto("/todo"); await page.waitForTimeout(6500);
  const counts = await page.evaluate(`(() => {
    const vis = ${VIS};
    const txt = (s) => { const e = [...document.querySelectorAll(s)].find(vis); return e ? (e.textContent||"").replace(/\\s+/g," ").trim() : "ABSENT"; };
    const railBadge = [...document.querySelectorAll('a,[role=link],li')].filter(vis)
      .find((e) => /to-?do list/i.test(e.textContent||""));
    return {
      sidebar: railBadge ? (railBadge.textContent||"").replace(/\\s+/g," ").trim() : "ABSENT",
      meterLegend: [...document.querySelectorAll(".meter .legend span")].filter(vis).map(e => (e.textContent||"").trim()),
      footer: txt(".tlc .l-foot .c"),
      paneCounter: txt(".tpn-navk"),
      groupHeads: [...document.querySelectorAll(".tlc .grp")].filter(vis).map(e => (e.textContent||"").replace(/\\s+/g," ").trim()),
      rows: [...document.querySelectorAll(".tlc .row")].filter(vis).length,
    };
  })()`) as any;
  out.push("## /todo — every number on the page");
  out.push("| surface | rendered |");
  out.push("|---|---|");
  out.push(`| sidebar rail | \`${counts.sidebar}\` |`);
  out.push(`| meter legend | \`${counts.meterLegend.join(" · ")}\` |`);
  out.push(`| list footer | \`${counts.footer}\` |`);
  out.push(`| pane counter | \`${counts.paneCounter}\` |`);
  out.push(`| group heads | \`${counts.groupHeads.join(" · ")}\` |`);
  out.push(`| rows in the DOM | ${counts.rows} |`);

  writeFileSync("run-artifacts/frame2-recon-measured.md", out.join("\n"));
  console.log("\n" + out.join("\n") + "\n");
});
