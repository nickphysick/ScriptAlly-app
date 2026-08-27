import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

/**
 * Phase 2 — every bar colour is a token, borders match fill, and five states share one wording.
 *
 * ⚠️ THE SOURCE SWEEP AND THE RENDER SWEEP ARE DIFFERENT CLAIMS. "No literal in the stylesheet"
 * is about the file and is checked in the unit suite; this is about what the browser resolved —
 * a rule can read a token that resolves to nothing and paint transparent, with the source looking
 * exactly right. Both, or neither means much.
 */
const STATES = ["s-theirs", "s-theirsq", "s-nudged", "s-y1", "s-y2", "s-y3", "s-quiet", "s-offer", "s-closed"];

test("Phase 2 — tokens, matching borders, one your-move wording", async ({ page }) => {
  const errs: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") errs.push(m.text().slice(0, 140)); });
  await openRoute(page, "/todo/calendar", { width: 1440, height: 900 });
  await page.waitForTimeout(1000);
  const slider = page.getByRole("slider", { name: /range/i });
  await slider.fill("4");           // six months — the widest population of states
  await page.waitForTimeout(700);

  const r = await page.evaluate((states: string[]) => {
    const all = [...document.querySelectorAll(".tl")] as HTMLElement[];
    const tl = all.find((e) => e.getBoundingClientRect().height > 0)!;
    const board = tl.closest(".tl-board") as HTMLElement;
    const seen: Record<string, any> = {};
    for (const st of states) {
      const el = tl.querySelector(`.tl-seg.${st}`) as HTMLElement | null;
      if (!el) continue;
      const cs = getComputedStyle(el);
      const lbl = el.querySelector(".tl-lbl") as HTMLElement | null;
      seen[st] = {
        fill: cs.backgroundColor, image: cs.backgroundImage.slice(0, 40),
        border: cs.borderTopColor, style: cs.borderTopStyle, clip: cs.backgroundClip,
        text: cs.color,
        lbl: lbl ? [getComputedStyle(lbl).fontSize, getComputedStyle(lbl).fontWeight,
                    getComputedStyle(lbl).letterSpacing, getComputedStyle(lbl).textTransform,
                    getComputedStyle(lbl).color].join(" / ") : null,
      };
    }
    return {
      seen,
      ground: getComputedStyle(board).backgroundColor,
      groundToken: getComputedStyle(board).getPropertyValue("--board-ground").trim(),
      /* ⚠️ A TOKEN THAT RESOLVES TO NOTHING PAINTS NOTHING, SILENTLY — so the board is asked
         whether every triple it declares actually has a value. */
      unresolved: states
        .map((s) => s.replace("s-", ""))
        .flatMap((n) => ["fill", "line", "text"].map((k) => `--bar-${n}-${k}`))
        .filter((t) => {
          const v = getComputedStyle(board).getPropertyValue(t).trim();
          /* closed has no fill by design; everything else must resolve */
          return v === "" && t !== "--bar-closed-fill";
        }),
    };
  }, STATES);

  for (const [st, v] of Object.entries(r.seen)) {
    console.log(`  ${st.padEnd(10)} fill ${(v as any).fill.padEnd(22)} border ${(v as any).border.padEnd(22)} ${(v as any).style}`);
  }
  console.log(`  ground ${r.ground} (token ${r.groundToken})`);
  console.log(`  unresolved tokens: ${r.unresolved.length ? r.unresolved.join(", ") : "none"}`);

  const got = Object.keys(r.seen);
  expect(got.length, "no bar states rendered — nothing was measured").toBeGreaterThan(3);
  expect(r.unresolved, "a declared bar token resolves to nothing").toEqual([]);
  expect(r.ground, "the board does not paint its own ground token").toBe("rgb(234, 226, 214)");

  for (const [st, v] of Object.entries(r.seen) as [string, any][]) {
    if (st === "s-closed") {
      /* ⚠️ THE SOLE EXCEPTION, and it is not a preference: a transparent fill with a matching
         border is an invisible bar. */
      expect(v.fill, "closed is filled").toBe("rgba(0, 0, 0, 0)");
      expect(v.style, "closed lost its dash").toBe("dashed");
    } else if (st === "s-quiet") {
      /* the one state whose fill is a hatch rather than a flat colour */
      expect(v.image, "gone quiet is not hatched").toContain("repeating-linear-gradient");
    } else {
      /* ⚠️ TRANSPARENT IS HOW THE BORDER MATCHES THE FILL. A background paints UNDER its border,
         so a transparent border shows the bar's own fill and nothing can tell them apart — while a
         border carrying a COPY of the fill token diverges the moment the pulse deepens one of
         them. `background-clip` is asserted beside it, because that default is the whole reason
         this works and a single declaration elsewhere would silently end it. */
      expect(v.border, `${st}: the border is painted rather than transparent`).toBe("rgba(0, 0, 0, 0)");
      expect(v.clip, `${st}: the fill no longer paints under its border`).toBe("border-box");
      expect(v.style, `${st}: the border is not solid`).toBe("solid");
    }
  }

  /* ⚠️ FIVE STATES, ONE WORDING — asserted as IDENTICAL STRINGS rather than against a written
     expectation, so the claim survives any retune and fails the moment one drifts. */
  const yours = ["s-y1", "s-y2", "s-y3", "s-quiet", "s-offer"].filter((s) => r.seen[s]?.lbl);
  console.log(`  your-move wording (${yours.length} present): ${yours.map((s) => r.seen[s].lbl).join(" | ")}`);
  expect(yours.length, "fewer than two your-move states rendered — nothing to compare").toBeGreaterThan(1);
  const first = r.seen[yours[0]].lbl;
  for (const s of yours) expect(r.seen[s].lbl, `${s} words differently from ${yours[0]}`).toBe(first);
  expect(first, "the shared wording is not the full-request bar's").toContain("rgb(142, 82, 82)");
  expect(first, "the shared size is not 10px").toContain("10px");

  console.log(`console errors: ${errs.length ? errs.join(" | ") : "none"}`);
  expect(errs, "the board threw").toEqual([]);
});
