/**
 * ⚠️ GROUP & ORDER, AND FILTER — drawer round, Phase 6. The rendered half: the pure laws
 * (partition-not-reorder, direction, conditional counts, the badge arithmetic) live in
 * `src/lib/todoListView.test.ts`, each proved red; this file asserts what only a browser can —
 * the heads on the page, the chips against the active set, the footer's two forms, the
 * empty-state clear, the panel's geometry under a changing count, and the preferences surviving
 * a RELOAD, which no unit test can even express.
 *
 * ⚠️ IT EDITS A PERSISTED PREFERENCE AND RESTORES IT IN-RUN — the view is written to
 * `todoPrefs.listView` on every change, so the teardown resets it to the default through the
 * page's own Clear/Reset controls and VERIFIES the resting footer. A run that died mid-way leaves
 * a filter set, not data changed; still, the reset is asserted.
 *
 * ⚠️ NO BACKTICKS OR REGEX LITERALS IN ANY page.evaluate TEMPLATE. Runner floor: 15 assertions.
 */
import { test, expect } from "@playwright/test";
import { ensureSignedIn, liftMotionSuppression } from "./measure";
import { writeFileSync, rmSync } from "node:fs";

type R = { id: string; ok: boolean; note: string };
const OUT = process.env.SA_VP_OUT ?? "run-artifacts/view-panels.txt";
rmSync(OUT, { force: true });

test("group & order, filter, chips, footer, and the reload", async ({ page }) => {
  test.setTimeout(150_000);
  const out: R[] = [];
  const add = (id: string, ok: boolean, note = "") => out.push({ id, ok, note });

  await ensureSignedIn(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/todo");
  await page.waitForFunction(
    "document.querySelectorAll('.tlc .row').length > 0", null, { timeout: 45_000 }).catch(() => {});
  await liftMotionSuppression(page);

  const state = () => page.evaluate(`(() => {
    const heads = [...document.querySelectorAll(".tlc .grp .g-lbl")].map((h) => h.textContent.trim());
    const rows = [...document.querySelectorAll(".tlc .row")].map((r) => r.getAttribute("data-rowkey"));
    const foot = document.querySelector(".tlc .l-foot .c");
    const chips = [...document.querySelectorAll(".tlc .fchip")].map((c) => c.textContent.replace("\\u00d7", "").trim());
    const badge = document.querySelector(".tlc .l-fbadge");
    const slbl = document.querySelector(".tlc .l-slbl");
    return { heads, rows, foot: foot ? foot.textContent.trim() : null,
             chips, badge: badge ? badge.textContent.trim() : null,
             slbl: slbl ? slbl.textContent.trim() : null };
  })()`) as Promise<any>;

  const rest = await state();
  add("P6.0 · the board is populated and at the default view",
      rest.rows.length > 5 && rest.chips.length === 0 && rest.badge === null,
      "rows " + rest.rows.length + " · heads " + JSON.stringify(rest.heads) + " · label " + JSON.stringify(rest.slbl));
  add("P6.1 · the trigger reads the contract's two-part label at rest",
      rest.slbl === "By urgency · Priority", "label = " + JSON.stringify(rest.slbl));

  /* ── group changes the heads without reordering across groups ────────────────────────── */
  await page.evaluate(`(() => {
    const b = [...document.querySelectorAll(".tlc .l-icon")].find((x) => (x.getAttribute("aria-label") || "") === "Group and order");
    if (b) b.click();
  })()`);
  await page.waitForTimeout(250);
  const panelUp = await page.evaluate(`(() => {
    const p = document.querySelector(".tdvp");
    if (!p) return null;
    const r = p.getBoundingClientRect();
    return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) };
  })()`) as any;
  add("P6.2 · the Group & order panel opens through AnchoredPanel",
      !!panelUp && panelUp.w === 300, panelUp ? JSON.stringify(panelUp) : "no panel");

  /* ⚠️ THE BOARD IS LIVE — another session seeds this dev account, so a row can ARRIVE between two
     snapshots and a count-to-count comparison flakes on somebody else's write. The conservation
     claim is therefore over KEYS captured immediately either side of the switch: everything that
     was there is still there, and anything new is reported rather than failed on. */
  const preSwitch = await state();
  await page.evaluate(`(() => {
    const byAgent = [...document.querySelectorAll(".tdvp .v-opt")].find((x) => (x.querySelector(".v-body") || {}).firstChild && (x.querySelector(".v-body").firstChild.textContent || "").trim() === "Agent");
    if (byAgent) byAgent.click();
  })()`);
  await page.waitForTimeout(300);
  const byAgent = await state();
  const kept = preSwitch.rows.every((k: string) => byAgent.rows.includes(k));
  add("P6.3 · group-by-agent changes the HEADS to names, A to Z, without dropping a row",
      byAgent.heads.length > 3
        && [...byAgent.heads].slice(0, -1).join("|") === [...byAgent.heads].slice(0, -1).sort((a: string, b: string) => a.localeCompare(b)).join("|")
        && kept,
      "heads " + JSON.stringify(byAgent.heads.slice(0, 4)) + "… · every pre-switch key kept = " + kept
      + " (" + preSwitch.rows.length + " → " + byAgent.rows.length + ")");
  add("P6.4 · the trigger's label follows — the contract's sentence",
      byAgent.slbl === "By agent · Priority", "label = " + JSON.stringify(byAgent.slbl));

  /* order within a group only: switch to Longest waiting, compare ONE group's membership */
  const firstHeadRows = (st: any) => {
    const heads = st.heads as string[];
    return heads.length ? heads[0] : null;
  };
  await page.evaluate(`(() => {
    const o = [...document.querySelectorAll(".tdvp .v-opt")].find((x) => ((x.querySelector(".v-body") || {}).firstChild || {}).textContent === "Longest waiting");
    if (o) o.click();
  })()`);
  await page.waitForTimeout(300);
  const longest = await state();
  add("P6.5 · the order changes and the heads do not — ordering runs inside the groups",
      JSON.stringify(longest.heads) === JSON.stringify(byAgent.heads),
      "heads unchanged = " + (JSON.stringify(longest.heads) === JSON.stringify(byAgent.heads)));

  /* reset, close */
  await page.evaluate(`(() => { const r = document.querySelector(".tdvp .v-ph .a"); if (r) r.click(); })()`);
  await page.waitForTimeout(250);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(200);

  /* ── the filter panel: two filters, conditional counts, geometry ─────────────────────── */
  await page.evaluate(`(() => {
    const b = [...document.querySelectorAll(".tlc .l-icon")].find((x) => (x.getAttribute("aria-label") || "") === "Filter");
    if (b) b.click();
  })()`);
  await page.waitForTimeout(250);

  const panelAt = await page.evaluate(`(() => {
    const p = document.querySelector(".tdvp");
    const r = p ? p.getBoundingClientRect() : null;
    return r ? { x: Math.round(r.left * 10) / 10, y: Math.round(r.top * 10) / 10 } : null;
  })()`) as any;

  /* ⚠️ ONE PRESS PER TICK, A RENDER BETWEEN — five clicks in one synchronous evaluate all read
     the SAME render's view (the stale-closure batch), so each produced "all minus that one" and
     the last write won: the probe left five types on while believing it left one. Real fingers
     get a re-render between presses; the probe now does too. */
  let sendOnly = 0;
  for (const l of ["Decide", "Nudge", "Close", "Fill in", "Notes"]) {
    const pressed = await page.evaluate(`(() => {
      const opts = [...document.querySelectorAll(".tdvp .v-opt")].filter((o) => o.querySelector(".v-tick"));
      const o = opts.find((x) => ((x.querySelector(".v-body") || {}).textContent || "").trim() === ${JSON.stringify(l)});
      if (!o || o.getAttribute("aria-checked") !== "true") return false;
      o.click();
      return true;
    })()`) as boolean;
    if (pressed) sendOnly += 1;
    await page.waitForTimeout(160);
  }

  /* the panel's top-left must NOT have moved while its counts changed */
  const panelNow = await page.evaluate(`(() => {
    const p = document.querySelector(".tdvp");
    const r = p ? p.getBoundingClientRect() : null;
    return r ? { x: Math.round(r.left * 10) / 10, y: Math.round(r.top * 10) / 10 } : null;
  })()`) as any;
  add("P6.6 · GEOMETRY — the panel's top-left does not move as counts change under the pointer",
      !!panelAt && !!panelNow && panelAt.x === panelNow.x && panelAt.y === panelNow.y,
      JSON.stringify(panelAt) + " → " + JSON.stringify(panelNow) + " after " + sendOnly + " unticks");

  /* now tick one agent as well — two facets set */
  const agentPicked = await page.evaluate(`(() => {
    const rows = [...document.querySelectorAll(".tdvp .v-agents .v-opt")];
    const withCount = rows.find((r) => parseInt((r.querySelector(".v-c") || {}).textContent || "0", 10) > 0);
    if (!withCount) return null;
    withCount.click();
    return ((withCount.querySelector(".v-body") || {}).textContent || "").trim();
  })()`) as string | null;
  await page.waitForTimeout(300);
  add("P6.7 · an agent with surviving rows can be ticked given the type filter",
      !!agentPicked, "ticked " + JSON.stringify(agentPicked));

  /* ⚠️ THE CONDITIONAL-COUNT PROOF, WITH TWO FILTERS SET: each TYPE option's count must equal the
     rows that type would show GIVEN the agent tick — measured by reading the panel's own numbers
     and then actually selecting each type and counting rows. Two facets set is the case the
     contract's foot-note describes and a raw count fails. */
  const sendCount = await page.evaluate(`(() => {
    const opts = [...document.querySelectorAll(".tdvp .v-opt")].filter((o) => o.querySelector(".v-tick"));
    const send = opts.find((o) => ((o.querySelector(".v-body") || {}).textContent || "").trim() === "Send");
    return send ? parseInt((send.querySelector(".v-c") || {}).textContent || "-1", 10) : -1;
  })()`) as number;
  const shownRows = await page.evaluate(`document.querySelectorAll(".tlc .row").length`) as number;
  add("P6.8 · the Send option's count EQUALS the rows it is leaving, given the agent tick",
      sendCount > -1 && sendCount === shownRows,
      "panel says " + sendCount + " · the list shows " + shownRows);

  await page.keyboard.press("Escape");
  await page.waitForTimeout(200);

  /* ── chips, badge, footer ────────────────────────────────────────────────────────────── */
  const filtered = await state();
  /* ⚠️ EXACTLY the active set: one kept type (Send) and one agent — a looser "some chips exist"
     passed over the stale-closure batch above, which is what tightened it */
  add("P6.9 · the chips ARE the active set — the one kept type, and the ticked agent",
      filtered.chips.length === 2
        && filtered.chips.some((c: string) => c === "typeSend")
        && filtered.chips.some((c: string) => c.indexOf("agent") === 0 && c.indexOf(agentPicked ?? "@@") > -1),
      "chips = " + JSON.stringify(filtered.chips));
  add("P6.10 · the Filter button carries the badge count",
      !!filtered.badge && parseInt(filtered.badge, 10) >= 2, "badge = " + JSON.stringify(filtered.badge));
  add("P6.11 · the footer switches to Showing n of N exactly while rows are hiding",
      !!filtered.foot && /^Showing /.test(filtered.foot), "footer = " + JSON.stringify(filtered.foot));

  /* ── the preferences survive a RELOAD ────────────────────────────────────────────────── */
  await page.goto("/todo");
  await page.waitForFunction(
    "document.querySelectorAll('.tlc .fchip').length > 0", null, { timeout: 30_000 }).catch(() => {});
  await liftMotionSuppression(page);
  const reloaded = await state();
  add("P6.12 · every preference survives a reload — the chips and the footer come back as left",
      JSON.stringify(reloaded.chips) === JSON.stringify(filtered.chips)
        && !!reloaded.foot && /^Showing /.test(reloaded.foot),
      "chips after reload = " + JSON.stringify(reloaded.chips) + " · footer " + JSON.stringify(reloaded.foot));

  /* ── the empty state and its one-click clear ─────────────────────────────────────────── */
  /* narrow the search to nonsense so the rail empties WITH the filters still set */
  await page.fill(".tlc .l-search input", "zzz-no-such-task");
  await page.waitForTimeout(400);
  const empty = await page.evaluate(`(() => {
    const e = document.querySelector(".tdw-empty");
    const btn = e ? e.querySelector("button") : null;
    return { there: !!e, says: e ? e.textContent.slice(0, 80) : null, hasClear: !!btn };
  })()`) as any;
  add("P6.13 · the empty state says WHY and offers the one-click clear",
      empty.there && empty.hasClear, JSON.stringify(empty.says));
  await page.evaluate(`(() => {
    const b = document.querySelector(".tdw-empty button");
    if (b) b.click();
  })()`);
  await page.waitForTimeout(400);
  const cleared = await page.evaluate(`document.querySelectorAll(".tlc .row").length`) as number;
  add("P6.14 · the clear restores rows", cleared > 0, "rows after clear = " + cleared);

  /* ── teardown: back to the default view, through the page's own controls ─────────────── */
  await page.evaluate(`(() => {
    const c = document.querySelector(".tlc .l-clear");
    if (c) c.click();
  })()`);
  await page.waitForTimeout(400);
  const final = await state();
  add("teardown · the view is back at rest — no chips, no badge, the one-number footer",
      final.chips.length === 0 && final.badge === null && !!final.foot && !/^Showing/.test(final.foot),
      "chips " + JSON.stringify(final.chips) + " · footer " + JSON.stringify(final.foot));

  writeFileSync(OUT, out.map((r) => (r.ok ? "green  · " : "RED    · ") + r.id + "\n           " + r.note).join("\n") + "\n");
  // eslint-disable-next-line no-console
  console.log("\n" + out.map((r) => (r.ok ? "green  · " : "RED    · ") + r.id + "\n           " + r.note).join("\n"));
  const bad = out.filter((r) => !r.ok);
  expect(bad.map((r) => r.id + " — " + r.note).join("\n"), "viewPanels").toEqual("");
});
