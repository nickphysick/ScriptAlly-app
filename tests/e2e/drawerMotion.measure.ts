/**
 * ⚠️ THE DRAWER — drawer round, Phase 2. One motion, a push rather than an overlay, and the ways
 * out and along.
 *
 * ⚠️ THE CENTRAL CLAIM IS SIMULTANEITY, NOT SMOOTHNESS, and it is sampled per animation frame.
 * "The list folds and the drawer arrives" is one fact told twice; if the two were separate
 * transitions on separate elements they could be kept in step only by hand, and would drift the
 * first time one of them was retuned. Here they are the same interpolating track list, so the
 * drawer's width IS what the list gave up, every frame. What that buys is measurable: the frame on
 * which the list first moves is the frame on which the drawer first moves.
 *
 * ⚠️ IT ASSERTS ITS PRECONDITIONS FIRST. A page that arrives with a task already open would
 * satisfy "the widths changed together" by never changing; a board with no rows would satisfy
 * everything below while measuring nothing.
 *
 * ⚠️ NO BACKTICKS OR REGEX LITERALS INSIDE ANY page.evaluate TEMPLATE. One backtick terminates
 * the string and the file fails to COLLECT — which reads as "No tests found" while a previous
 * run's report sits on disk looking current.
 *
 * Read-only: it clicks rows and presses navigation keys. It presses no primary and writes nothing.
 */
import { test, expect } from "@playwright/test";
import { ensureSignedIn, liftMotionSuppression } from "./measure";
import { writeFileSync, rmSync } from "node:fs";

type R = { id: string; ok: boolean; note: string };
const OUT = process.env.SA_DM_OUT ?? "run-artifacts/drawer-motion.txt";
rmSync(OUT, { force: true });

/** the split's own transition, waited for rather than slept through */
const SETTLED = "document.querySelector('.tdw-split').getAnimations().length === 0";

const arrive = async (page: any, w: number) => {
  await page.setViewportSize({ width: w, height: 900 });
  await page.goto("/todo");
  await page.waitForFunction(
    "document.querySelectorAll('.tlc .row').length > 0", null, { timeout: 45_000 }).catch(() => {});
  await liftMotionSuppression(page);
};

test("the drawer pushes, moves as one, and can be left", async ({ page }) => {
  const out: R[] = [];
  const add = (id: string, ok: boolean, note = "") => out.push({ id, ok, note });

  await ensureSignedIn(page);

  for (const w of [1440, 1920]) {
    await arrive(page, w);

    const pre = await page.evaluate(`(() => ({
      rows: document.querySelectorAll(".tlc .row").length,
      open: document.querySelector(".tdw-split").classList.contains("open"),
    }))()`) as { rows: number; open: boolean };
    add("P2.0 @" + w + " · rows on the board, and the page arrives closed",
        pre.rows > 1 && !pre.open, "rows = " + pre.rows + " · split.open = " + pre.open);

    /* ── the motion, sampled per frame ──────────────────────────────────────────────────── */
    /* ⚠️ THE SAMPLER IS ARMED BEFORE THE CLICK AND READS BOTH BOXES IN THE SAME rAF CALLBACK.
       Two separate samplers would be two clocks, and a claim about simultaneity taken from two
       clocks is a claim about the clocks. */
    /* ⚠️ THE GAP IS SAMPLED WITH THE TWO WIDTHS, and it is what makes this falsifiable. A first
       form measured only the two boxes and could NOT be made to fail: putting a 200ms delay on the
       track while leaving the gap undelayed left both widths pinned (the list track is a fixed
       `100%`, so the drawer has nothing to take) and both still "first moved on the same frame".
       The three together are the real invariant, and the delay breaks it immediately. */
    const frames = await page.evaluate(`(() => new Promise((done) => {
      const split = document.querySelector(".tdw-split");
      const list = document.querySelector(".tlc");
      const work = document.querySelector(".tdw-work");
      const row = document.querySelector(".tlc .row");
      const seq = [];
      let n = 0;
      const tick = () => {
        seq.push([Math.round(list.getBoundingClientRect().width * 100) / 100,
                  Math.round(work.getBoundingClientRect().width * 100) / 100,
                  Math.round(parseFloat(getComputedStyle(split).columnGap) * 100) / 100,
                  Math.round(split.getBoundingClientRect().width * 100) / 100]);
        if (++n < 40) requestAnimationFrame(tick); else done(seq);
      };
      requestAnimationFrame(() => { row.click(); requestAnimationFrame(tick); });
    }))()`) as [number, number, number, number][];

    const firstMove = (i: number) => frames.findIndex((f) => Math.abs(f[i] - frames[0][i]) > 0.5);
    const [fL, fD, fG] = [firstMove(0), firstMove(1), firstMove(2)];
    add("P2.1 @" + w + " · the list, the drawer and the gap all first move on the SAME frame",
        fL > -1 && fL === fD && fL === fG,
        "list " + fL + " · drawer " + fD + " · gap " + fG
        + " · from " + frames[0].slice(0, 3).join("/") + " to " + frames[frames.length - 1].slice(0, 3).join("/"));

    /* ⚠️ AND THEY MOVE TOGETHER THROUGHOUT, not merely at the start. A pair that departed on one
       frame and then ran at different rates would satisfy the claim above and still look like two
       animations. The invariant is that the three of them ALWAYS fill the split exactly — which is
       what "the drawer's width is what the list gave up" actually asserts, and which a tolerance
       on `list + drawer` alone cannot state, because that sum legitimately falls by the gap. */
    const err = frames.map((f) => Math.abs(f[0] + f[1] + f[2] - f[3]));
    const worst = Math.round(Math.max(...err) * 100) / 100;
    add("P2.2 @" + w + " · list + gap + drawer IS the split, on every frame of the motion",
        worst <= 1, "worst frame is out by " + worst + "px across " + frames.length + " frames");

    await page.waitForFunction(SETTLED, null, { timeout: 5_000 }).catch(() => {});

    /* ── a push, not an overlay ─────────────────────────────────────────────────────────── */
    /* ⚠️ THE CHECK IS FOR ANY FULL-VIEWPORT PAINTED LAYER, not for a class called "scrim". A
       backdrop added under another name would pass a name check and dim the page just the same. */
    const overlay = await page.evaluate(`(() => {
      const vw = window.innerWidth, vh = window.innerHeight;
      const bad = [];
      for (const el of document.querySelectorAll("body *")) {
        const s = getComputedStyle(el);
        if (s.position !== "fixed" && s.position !== "absolute") continue;
        if (s.visibility === "hidden" || s.display === "none") continue;
        if (parseFloat(s.opacity) === 0) continue;
        const r = el.getBoundingClientRect();
        if (r.width < vw * 0.8 || r.height < vh * 0.8) continue;
        const bg = s.backgroundColor;
        const m = bg.replace("rgba(", "").replace("rgb(", "").split(",");
        const a = m.length > 3 ? parseFloat(m[3]) : 1;
        if (a > 0.01 || s.backdropFilter !== "none") {
          bad.push((el.className || el.tagName) + " " + bg + " " + s.backdropFilter);
        }
      }
      return bad;
    })()`) as string[];
    add("P2.3 @" + w + " · no dim, no backdrop, nothing laid over the page",
        overlay.length === 0, overlay.length ? overlay.join(" | ") : "no full-viewport painted layer");

    /* the list is still live: it scrolls, and its rows still answer a click */
    const live = await page.evaluate(`(() => {
      const body = document.querySelector(".tlc .l-body");
      const before = body.scrollTop;
      body.scrollTop = 120;
      const moved = body.scrollTop;
      body.scrollTop = before;
      return { moved, max: body.scrollHeight - body.clientHeight,
               pe: getComputedStyle(body).pointerEvents };
    })()`) as { moved: number; max: number; pe: string };
    add("P2.4 @" + w + " · the list stays live and scrollable beside the drawer",
        live.moved > 0 && live.pe !== "none",
        "scrolled to " + live.moved + " of " + live.max + " · pointer-events " + live.pe);

    /* ── the selected row keeps its highlight, and is on screen ─────────────────────────── */
    const sel = await page.evaluate(`(() => {
      const body = document.querySelector(".tlc .l-body");
      const r = body.querySelector(".row.sel");
      if (!r) return null;
      const a = r.getBoundingClientRect(), b = body.getBoundingClientRect();
      return { inView: a.top >= b.top - 1 && a.bottom <= b.bottom + 1,
               marked: getComputedStyle(r).borderLeftColor };
    })()`) as { inView: boolean; marked: string } | null;
    add("P2.5 @" + w + " · the selected row keeps its mark and stays in view",
        !!sel && sel.inView && sel.marked !== "rgba(0, 0, 0, 0)",
        sel ? "in view = " + sel.inView + " · marker " + sel.marked : "no selected row");

    /* ── along: the band's arrows and the keys, neither of which closes ─────────────────── */
    const keyOf = () => page.evaluate(
      `(() => { const r = document.querySelector(".tlc .row.sel"); return r ? r.textContent.trim().slice(0, 40) : null; })()`) as Promise<string | null>;
    const first = await keyOf();

    await page.locator('.tpn .b-nav button[aria-label="Next task"]').click();
    await page.waitForTimeout(260);
    const afterNext = await keyOf();
    const openAfterNext = await page.evaluate(`document.querySelector(".tdw-split").classList.contains("open")`) as boolean;
    add("P2.6 @" + w + " · the band's › moves to another task without closing",
        !!afterNext && afterNext !== first && openAfterNext,
        "from " + JSON.stringify(first) + " to " + JSON.stringify(afterNext) + " · still open = " + openAfterNext);

    /* ⚠️ THE KEY IS PRESSED ON THE BODY, NOT INTO A FIELD. The handler refuses inside an editable
       — ↑ and ↓ are cursor keys there — so a press that happened to land in the search box would
       report "the keys do nothing" about a handler working exactly as designed. */
    await page.evaluate(`document.activeElement && document.activeElement.blur()`);
    await page.keyboard.press("ArrowUp");
    await page.waitForTimeout(260);
    const afterUp = await keyOf();
    const openAfterUp = await page.evaluate(`document.querySelector(".tdw-split").classList.contains("open")`) as boolean;
    add("P2.7 @" + w + " · ↑ walks back to the previous task, still without closing",
        afterUp === first && openAfterUp,
        "back to " + JSON.stringify(afterUp) + " · still open = " + openAfterUp);

    /* ── out: the band's Close, then Escape, and the reader keeps their place ──────────── */
    /* ⚠️ THE CLAIM IS THE ROW AT THE TOP, NOT THE NUMBER OF PIXELS — and a pixel equality here
       would be asserting something that cannot be true. The rows are TALLER folded (two lines)
       than open (one), so unfolding shrinks the content above the reader and the browser's scroll
       anchoring reduces `scrollTop` to keep the anchored element where it is. Measured: row height
       57.9 → 50, `scrollHeight` 1876 → 1799, `scrollTop` 140 → 138. That is anchoring doing its
       job, and this repo already records that `overflow-anchor: none` is the wrong fix for it.
       So: the same row is at the top of the port afterwards, and the drift is smaller than one
       row — which cannot be satisfied by a coincidence of numbers the way a tolerance can. */
    await page.evaluate(`document.querySelector(".tlc .l-body").scrollTop = 140`);
    const before = await page.evaluate(`(() => {
      const b = document.querySelector(".tlc .l-body");
      const top = b.getBoundingClientRect().top;
      const at = [...b.querySelectorAll(".row")].find((r) => r.getBoundingClientRect().bottom > top + 1);
      return { scroll: b.scrollTop, row: at ? at.textContent.trim().slice(0, 40) : null,
               rowH: Math.round(at.getBoundingClientRect().height * 10) / 10 };
    })()`) as { scroll: number; row: string | null; rowH: number };
    const scrolled = before.scroll;

    await page.locator(".tpn .b-nav .b-close").click();
    await page.waitForFunction(SETTLED, null, { timeout: 5_000 }).catch(() => {});
    const closedByChip = await page.evaluate(`(() => ({
      open: document.querySelector(".tdw-split").classList.contains("open"),
      folded: document.querySelector(".tlc").classList.contains("folded"),
      card: Math.round(document.querySelector(".tlc").getBoundingClientRect().width),
      scroll: document.querySelector(".tlc .l-body").scrollTop,
      row: (() => { const b = document.querySelector(".tlc .l-body");
        const top = b.getBoundingClientRect().top;
        const at = [...b.querySelectorAll(".row")].find((r) => r.getBoundingClientRect().bottom > top + 1);
        return at ? at.textContent.trim().slice(0, 40) : null; })(),
    }))()`) as { open: boolean; folded: boolean; card: number; scroll: number; row: string | null };
    add("P2.8 @" + w + " · the band's Close returns the list to full width",
        !closedByChip.open && !closedByChip.folded && closedByChip.card > 520,
        "open = " + closedByChip.open + " · card " + closedByChip.card + "px");
    /* ⚠️ THE LIST NEVER RELOADS, SO ITS SCROLL IS NOT SOMETHING TO RESTORE — it is something that
       must not be disturbed. Restoring a remembered value would look identical here and would be a
       different mechanism with a different failure. */
    add("P2.9 @" + w + " · the reader keeps their place — the same row is still at the top",
        !!before.row && closedByChip.row === before.row
          && Math.abs(closedByChip.scroll - scrolled) < before.rowH,
        "top row " + JSON.stringify(before.row) + " → " + JSON.stringify(closedByChip.row)
        + " · scrollTop " + scrolled + " → " + closedByChip.scroll
        + " (anchoring, against a row height of " + before.rowH + ")");

    await page.locator(".tlc .row").first().click();
    await page.waitForFunction(SETTLED, null, { timeout: 5_000 }).catch(() => {});
    await page.evaluate(`document.activeElement && document.activeElement.blur()`);
    await page.keyboard.press("Escape");
    await page.waitForFunction(SETTLED, null, { timeout: 5_000 }).catch(() => {});
    const closedByEsc = await page.evaluate(`(() => ({
      open: document.querySelector(".tdw-split").classList.contains("open"),
      card: Math.round(document.querySelector(".tlc").getBoundingClientRect().width),
    }))()`) as { open: boolean; card: number };
    add("P2.10 @" + w + " · Escape closes it too",
        !closedByEsc.open && closedByEsc.card > 520,
        "open = " + closedByEsc.open + " · card " + closedByEsc.card + "px");

    /* ⚠️ THE SIDEBAR IS DELIBERATELY UNTOUCHED, AND THAT IS ASSERTED RATHER THAN ASSUMED. The
       brief asks for a collapse-to-rail; recon found the state (`useSidebarCollapsed`) but no seam
       from a page to it, AND that its setter writes localStorage — so a drawer-driven collapse
       would change the writer's own preference permanently, and a run that died with the drawer
       open would leave it flipped. Skipped per the brief's own escape. This is what makes the skip
       a checked decision instead of an omission: the width must NOT move.
       ⚠️ `.ws-panel` IS THE ELEMENT — `WorkspaceShell` renders it with `sb-collapsed` when the
       state flips, so its width is what a collapse would move. A first attempt guessed at
       `.ws-side, .sv2-side, aside` and measured 0px both times, which "passed" the equality and
       proved nothing: the vacuous shape this repo keeps paying for, arriving through a selector
       that matched an element with no box. The floor below is what makes it a measurement. */
    const sideBefore = await page.evaluate(
      `(() => { const a = document.querySelector(".ws-panel"); return a ? Math.round(a.getBoundingClientRect().width) : -1; })()`) as number;
    await page.locator(".tlc .row").first().click();
    await page.waitForFunction(SETTLED, null, { timeout: 5_000 }).catch(() => {});
    const sideAfter = await page.evaluate(
      `(() => { const a = document.querySelector(".ws-panel"); return a ? Math.round(a.getBoundingClientRect().width) : -1; })()`) as number;
    add("P2.11 @" + w + " · the sidebar does not move with the drawer (skipped, and checked)",
        sideBefore > 0 && sideBefore === sideAfter,
        "sidebar " + sideBefore + "px before · " + sideAfter + "px after");
  }

  /* ── reduced motion: a swap, and BOTH directions ─────────────────────────────────────── */
  /* ⚠️ ASSERTING ONLY THE 0ms WOULD PASS ON A PAGE WHERE THE TRANSITION WAS NEVER SET AT ALL.
     The pair is the claim: the full value under no-preference, nothing under reduce. */
  const durationNow = async (): Promise<string> => {
    await arrive(page, 1440);
    return page.evaluate(
      `getComputedStyle(document.querySelector(".tdw-split")).transitionDuration`) as Promise<string>;
  };
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const full = await durationNow();
  await page.emulateMedia({ reducedMotion: "reduce" });
  const reduced = await durationNow();
  await page.emulateMedia({ reducedMotion: null });

  /* ⚠️ THE REDUCED VALUE IS `1e-05s`, NOT `0s`, AND THAT IS THE APP'S OWN MECHANISM RATHER THAN
     this page's. `workspaceShell.css` ends with `.ws-app * { transition-duration: 0.01ms
     !important }` under the query — 0.01ms IS 1e-05s. A block in `todoSplit.css` could never have
     won against it, so the honest claim is the OUTCOME: effectively nothing. Asserted as a
     threshold rather than a literal so the shell may state it however it likes, and BOTH
     directions, because a 0s-only check passes on a page where the transition was never set. */
  const reducedMs = Math.max(...reduced.split(",").map((v) => parseFloat(v) * 1000));
  add("P2.12 · the motion is 380ms, and reduced motion makes it a swap",
      full.indexOf("0.38s") > -1 && reducedMs <= 1,
      "no-preference " + full + " · reduce " + reduced + " (" + reducedMs + "ms)");

  writeFileSync(OUT, out.map((r) => (r.ok ? "green  · " : "RED    · ") + r.id + "\n           " + r.note).join("\n") + "\n");
  // eslint-disable-next-line no-console
  console.log("\n" + out.map((r) => (r.ok ? "green  · " : "RED    · ") + r.id + "\n           " + r.note).join("\n"));
  const bad = out.filter((r) => !r.ok);
  expect(bad.map((r) => r.id + " — " + r.note).join("\n"), "drawerMotion").toEqual("");
});
