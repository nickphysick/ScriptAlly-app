import { test, expect } from "@playwright/test";
import { ensureSignedIn } from "./measure";
import { openTaskInView, assertCount } from "./todoOpen";
import { writeFileSync, rmSync } from "node:fs";
test.setTimeout(900_000);

/**
 * PHASE 2 — THE INDEX CARD'S ANATOMY AND ITS ANCHOR.
 *
 * The card floated mid-page, detached from the drawer and vertically adrift. The contract pins it:
 * `right: 668px` — 640 + 28 — `top: 118px`, 292 wide, rotated −1.2°.
 *
 * ⚠️ EVERY GEOMETRIC READING CLEARS THE TRANSFORM FIRST. `getBoundingClientRect` returns a rotated
 * element's AXIS-ALIGNED box, which is taller and wider than its layout box at both ends: at
 * −1.2° over 292 × 471 the box grows ~10px vertically and ~6px horizontally, so a correct 28px gap
 * reads as 23 and a correct 118px top reads as 115. Clearing the transform, measuring, and
 * restoring changes nothing about the page, because a transform never affected layout.
 *
 * ⚠️ AND THE OFFSET IS COMPARED AGAINST THE DRAWER, NEVER A LITERAL. `right: 668px` is only
 * meaningful as "the drawer's width plus the gap"; pinning 668 here would go green the day the
 * drawer changed width and the card started overlapping it.
 *
 * ⚠️ NO BACKTICKS AND NO REGEX INSIDE ANY page.evaluate TEMPLATE.
 */
type R = { id: string; ok: boolean; note: string };
/* ⚠️ THE LAST RECORDED COUNT, NOT A ROUND NUMBER BELOW IT. A floor set comfortably under
   the real figure is a guard that never fires — the suite could quietly measure half of
   itself and still clear it. 20 is what it ran on 7 Sep — ten claims at each of two widths. */
const FLOOR = 20;

test("the index card is anchored to the drawer, at the contract's geometry", async ({ page }) => {
  const out: R[] = [];
  const add = (id: string, ok: boolean, note = "") => out.push({ id, ok, note });
  const OUT = "run-artifacts/anatomy-card.txt";
  rmSync(OUT, { force: true });

  await ensureSignedIn(page);

  for (const vw of [1440, 1920]) {
    await page.setViewportSize({ width: vw, height: vw === 1440 ? 900 : 1080 });
    await openTaskInView(page, "grid", 1, { navigate: true });

    /* the layout box of both, transform cleared and restored */
    const geo = await page.evaluate(() => {
      const card = document.querySelector(".slo .rail") as HTMLElement | null;
      const drawer = document.querySelector(".slo") as HTMLElement | null;
      if (!card || !drawer) return null;
      const cs = getComputedStyle(card);
      const spin = cs.transform;
      /* ⚠️ THE TRANSITION IS SUPPRESSED BEFORE THE TRANSFORM IS CLEARED, or the rect reads where
         the card STARTED rather than where it is. The card carries a .36s transform transition, so
         setting `transform: none` and measuring in the same frame returns the ROTATED box — the
         very fault this reading exists to avoid, arriving from the other direction. Measured: a
         correct 28px gap read as 22.99 and a correct 118px top as 115, which is exactly what the
         rotation's own axis-aligned inflation looks like. */
      const prevT = card.style.transition, prev = card.style.transform;
      card.style.transition = "none";
      card.style.transform = "none";
      void card.offsetHeight;
      const a = card.getBoundingClientRect();
      const b = drawer.getBoundingClientRect();
      card.style.transform = prev;
      card.style.transition = prevT;
      return {
        gap: Math.round((b.left - a.right) * 100) / 100,
        top: Math.round(a.top * 100) / 100,
        width: Math.round(a.width * 100) / 100,
        drawerW: Math.round(b.width * 100) / 100,
        spin, z: cs.zIndex, position: cs.position,
        radius: cs.borderTopLeftRadius, shadow: cs.boxShadow,
        bg: cs.backgroundColor, border: cs.borderTopWidth + " " + cs.borderTopColor,
        overflow: cs.overflowX,
      };
    });
    expect(geo, `${vw}: no index card beside the drawer`).not.toBeNull();
    const g = geo!;

    /* the rotation, as an angle rather than as a matrix string */
    const deg = (() => {
      const m = g.spin.match(/matrix\(([^)]+)\)/);
      if (!m) return NaN;
      const [a, b] = m[1].split(",").map((n) => Number.parseFloat(n));
      return Math.round((Math.atan2(b, a) * 180 / Math.PI) * 100) / 100;
    })();

    add(`P2.1@${vw}`, Math.abs(g.gap - 28) <= 1,
      `gap to the drawer ${g.gap} (contract 668 − 640 = 28)`);
    add(`P2.2@${vw}`, Math.abs(g.top - 118) <= 1, `top ${g.top} (contract 118)`);
    add(`P2.3@${vw}`, Math.abs(g.width - 292) <= 1, `width ${g.width} (contract 292)`);
    add(`P2.4@${vw}`, Math.abs(deg + 1.2) <= 0.05, `rotation ${deg}° (contract −1.2°)`);
    /* ⚠️ THE OFFSET IS THE DRAWER'S, NOT A NUMBER. 668 is only ever "the drawer plus the gap". */
    add(`P2.5@${vw}`, Math.abs(g.drawerW + g.gap - 668) <= 1,
      `drawer ${g.drawerW} + gap ${g.gap} = ${Math.round((g.drawerW + g.gap) * 10) / 10} (contract 668)`);
    add(`P2.6@${vw}`, g.position === "fixed" && g.z === "69", `${g.position} · z ${g.z}`);
    add(`P2.7@${vw}`, g.radius === "14px" && g.overflow === "hidden" && g.shadow.includes("44px"),
      `radius ${g.radius} · overflow ${g.overflow} · shadow ${g.shadow.slice(0, 60)}`);

    /* ⚠️ THE BRIEF ASKED FOR "OVERLAPS NO BOARD COLUMN" AND THE CONTRACT DOES NOT DO THAT.
       Rendered, the ref's own card sits over its cards too — it is a fixed card at z 69 above a
       scrim at z 60, and at 1440 its 292px spans x 480–772 while the board runs under it. There is
       no width at which a 292px card 28px left of a 640px drawer clears a full-width board. So the
       claim that CAN be made, and the one the design actually asserts, is that the card sits over a
       LIVE SCRIM — which is what stops the page beneath reading as reachable. The overlap count is
       reported beside it rather than asserted, because it is a fact about the fixture. */
    const clash = await page.evaluate(() => {
      const card = document.querySelector(".slo .rail") as HTMLElement | null;
      const scrim = document.querySelector(".slo-scrim") as HTMLElement | null;
      if (!card) return null;
      const a = card.getBoundingClientRect();
      const hits = [...document.querySelectorAll(".tkt, .brd-card, .brd-col")].filter((e) => {
        const b = e.getBoundingClientRect();
        return b.width > 0 && b.height > 0 && b.left < a.right && b.right > a.left && b.top < a.bottom && b.bottom > a.top;
      });
      const sc = scrim ? getComputedStyle(scrim) : null;
      return {
        hits: hits.length,
        scrimOn: !!sc && sc.opacity !== "0" && sc.pointerEvents !== "none",
        scrimZ: sc ? sc.zIndex : "",
      };
    });
    add(`P2.8@${vw}`, !!clash && clash.scrimOn && Number(clash.scrimZ) < 69,
      `scrim on ${clash?.scrimOn} at z ${clash?.scrimZ} (card z 69) · ${clash?.hits} tickets pass under the card, as the contract's own do`);

    /* the 82px label column — the contract's `.fact` grid */
    const lab = await page.evaluate(() => {
      const f = document.querySelector(".slo .rail .fact") as HTMLElement | null;
      return f ? getComputedStyle(f).gridTemplateColumns : "";
    });
    add(`P2.9@${vw}`, lab.startsWith("82px"), `.fact columns ${lab}`);

    /* the header IS the ladder value — derived, never stored */
    const head = await page.evaluate(() => {
      const h = document.querySelector(".slo .rail .qhead") as HTMLElement | null;
      if (!h) return null;
      const inline = h.getAttribute("style") || "";
      const tok = inline.slice(inline.indexOf("var(") + 4, inline.indexOf(")"));
      /* ⚠️ RESOLVED ON THE ELEMENT, NOT ON `documentElement`. The stage ladder is declared on a
         theme/page class, so a read at the root returns "" — which looks exactly like "the token
         does not exist" about a header that is plainly painted with it. */
      const resolved = tok ? getComputedStyle(h).getPropertyValue(tok).trim() : "";
      return { inline, tok, resolved, painted: getComputedStyle(h).backgroundColor };
    });
    expect(head, `${vw}: no card header`).not.toBeNull();
    const rgb = (hex: string) => {
      const h = hex.replace("#", "");
      if (h.length !== 6) return "";
      return "rgb(" + [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)).join(", ") + ")";
    };
    add(`P2.10@${vw}`, !!head!.tok && head!.tok.startsWith("--stage-")
      && rgb(head!.resolved) === head!.painted,
      `${head!.tok} resolves ${head!.resolved} · painted ${head!.painted}`);
  }

  const lines = out.map((r) => `${r.ok ? "PASS" : "FAIL"} ${r.id} — ${r.note}`);
  const red = out.filter((r) => !r.ok);
  writeFileSync(OUT, lines.join("\n") + `\n\n${out.length - red.length}/${out.length}\n`);
  assertCount(out.length, FLOOR, "anatomyCard");
  expect(red.map((r) => `${r.id} — ${r.note}`), "the index card is not where the contract pins it").toEqual([]);
  console.log(`\nCARD — ${out.length - red.length}/${out.length}\n${lines.join("\n")}\n`);
});
