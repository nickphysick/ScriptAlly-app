/**
 * §1 AUDIT — report-only. What actually differs between one page's collapsed strip and another's.
 *
 * ⚠️ IT ASSERTS NOTHING AND THAT IS THE POINT. The matrix's job is to fail on a difference; this
 * one's job is to say WHAT the difference is, before anything is changed. Running the matrix first
 * would tell me a number disagreed and stop — and the last four faults were all things I would not
 * have predicted from the failing number alone (a button class that never had a working height, a
 * page rule winning on source order, a viewport lock leaking through a block parent).
 *
 *   npx playwright test --project=measure strip.audit
 */
import { test, Page } from "@playwright/test";
import { openRoute } from "./measure";

const PAGES: [string, string][] = [
  ["Query Centre", "/queries"],
  ["Contact list", "/agents"],
  ["Discover", "/agents/discover"],
  ["Manuscripts", "/manuscripts"],
  ["Submission packages", "/manuscripts/packages"],
  ["Analytics", "/queries/analytics"],
  ["To-do", "/todo"],
  ["Calendar", "/todo/calendar"],
  ["Noteboard", "/todo/noteboard"],
  ["Comparable titles", "/manuscripts/comps"],
];

const audit = (page: Page) => page.evaluate(() => {
  const r = (n: number) => Math.round(n * 10) / 10;
  const g = [...document.querySelectorAll(".wpg")].find((x) => x.getBoundingClientRect().height > 0) as HTMLElement;
  if (!g) return null;
  const row = g.querySelector(".wpg-plate") as HTMLElement;
  const wrap = g.querySelector(".wsh-wrap") as HTMLElement | null;
  const wsh = g.querySelector(".wsh") as HTMLElement;
  const inner = g.querySelector(".wsh-row") as HTMLElement;
  const cs = (el: Element) => getComputedStyle(el);
  const box = (el: Element) => el.getBoundingClientRect();
  const hb = box(wsh);
  const centre = hb.top + hb.height / 2;

  /* every control anywhere in the strip, whatever class it wears */
  const controls = [...inner.querySelectorAll("button, a[role='button'], .svh-btn, [class*='btn']")]
    .filter((el) => box(el).height > 0)
    .map((el) => ({
      cls: el.className.toString().slice(0, 46),
      h: r(box(el).height),
      fs: cs(el).fontSize,
      dy: r(box(el).top + box(el).height / 2 - centre),
    }));

  /* anything inline with the title that is not the title — pills, chips, badges */
  const txt = g.querySelector(".wsh-txt") as HTMLElement | null;
  const title = g.querySelector(".wsh-title") as HTMLElement | null;
  const inlineWithTitle = title
    ? [...title.querySelectorAll("*")].filter((el) => box(el).height > 0).map((el) => ({
        cls: el.className.toString().slice(0, 40), h: r(box(el).height), fs: cs(el).fontSize,
      }))
    : [];

  const sub = g.querySelector(".wsh-sub") as HTMLElement | null;
  return {
    /* the strip itself */
    headerH: r(hb.height),
    headerTop: r(hb.top),                       /* distance from the window's top edge */
    rowH: r(box(row).height),
    platePadTop: cs(row).paddingTop,
    plateMargin: `${cs(row).marginTop}/${cs(row).marginBottom}`,
    wrapPad: wrap ? `${cs(wrap).paddingTop}/${cs(wrap).paddingBottom}` : "—",
    wrapMargin: wrap ? `${cs(wrap).marginTop}/${cs(wrap).marginBottom}` : "—",
    wshMargin: `${cs(wsh).marginTop}/${cs(wsh).marginBottom}`,
    rowPadX: cs(inner).paddingLeft,
    /* text */
    titleFs: title ? cs(title).fontSize : "—",
    titleFw: title ? cs(title).fontWeight : "—",
    titleWrap: title ? cs(title).whiteSpace : "—",
    titleLines: title ? Math.round(box(title).height / parseFloat(cs(title).lineHeight || "1")) : -1,
    hasSub: !!sub,
    subMaxH: sub ? cs(sub).maxHeight : "—",
    subOpacity: sub ? cs(sub).opacity : "—",
    subH: sub ? r(box(sub).height) : -1,
    /* mark */
    markW: (() => { const m = g.querySelector(".wsh-mark") as HTMLElement | null; return m ? r(box(m).width) : -1; })(),
    markKind: g.querySelector(".wsh-mark--xl") ? "xl" : g.querySelector(".wsh-mark") ? "md" : "none",
    /* the row's children and their centres */
    children: [...inner.children].filter((el) => box(el).height > 0).map((el) => ({
      cls: el.className.toString().slice(0, 30), h: r(box(el).height), dy: r(box(el).top + box(el).height / 2 - centre),
    })),
    controls,
    inlineWithTitle,
    inlineWithTitleAll: inlineWithTitle,
    /* ⚠️ THE WALK GOES ABOVE THE GRID, and my first version stopped AT it — so it reported every
       page's chain as identical while `headerTop` ranged over 22px. Whatever inset a page wrapper
       adds sits above the grid by definition; a walk that ends there cannot see the thing it is
       looking for. It runs to the shell's own scroller now. */
    chainAboveHeader: (() => {
      const out: string[] = [];
      let el: HTMLElement | null = wsh;
      const stop = document.querySelector(".ws-main, .sv2-content, #app-stage-scroll") ?? document.body;
      while (el && el !== stop && out.length < 14) {
        const c = cs(el);
        const notes: string[] = [];
        if (c.paddingTop !== "0px") notes.push(`padT ${c.paddingTop}`);
        if (c.marginTop !== "0px") notes.push(`marT ${c.marginTop}`);
        if (c.maxWidth !== "none") notes.push(`maxW ${c.maxWidth}`);
        if (c.paddingLeft !== "0px") notes.push(`padL ${c.paddingLeft}`);
        if (c.borderTopWidth !== "0px") notes.push(`bdT ${c.borderTopWidth}`);
        if (notes.length) out.push(`${el.tagName.toLowerCase()}.${el.className.toString().slice(0, 26)}: ${notes.join(", ")}`);
        el = el.parentElement;
      }
      return out;
    })(),
  };
});

async function wheel(page: Page) {
  const all = page.locator(".wpg-scroll");
  for (let i = 0; i < await all.count(); i += 1) {
    const b = await all.nth(i).boundingBox();
    if (b && b.height > 0) {
      await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
      await page.mouse.wheel(0, 600);
      await page.waitForTimeout(420);
      return;
    }
  }
}

test("§1 AUDIT — the collapsed strip, page by page", async ({ page }) => {
  const rest: Record<string, unknown>[] = [];
  const work: Record<string, unknown>[] = [];
  const detail: string[] = [];
  for (const [label, route] of PAGES) {
    await openRoute(page, route, { width: 1440, height: 900 });
    const a = await audit(page);
    if (!a) { detail.push(`${label}: NO VISIBLE GRID`); continue; }
    await wheel(page);
    const b = await audit(page);
    const pick = (x: NonNullable<typeof a>) => ({
      page: label, headerH: x.headerH, headerTop: x.headerTop, rowH: x.rowH,
      platePadTop: x.platePadTop, rowPadX: x.rowPadX,
      titleFs: x.titleFs, titleFw: x.titleFw, titleLines: x.titleLines,
      hasSub: x.hasSub, subMaxH: x.subMaxH, subOp: x.subOpacity, subH: x.subH,
      mark: `${x.markKind} ${x.markW}`,
      btnH: [...new Set(x.controls.map((c) => c.h))].join("|") || "—",
      maxDy: x.children.length ? Math.max(...x.children.map((c) => Math.abs(c.dy))) : 0,
    });
    rest.push(pick(a));
    work.push(pick(b!));
    detail.push(
      `\n── ${label}` +
      `\n   chain above header (rest): ${a.chainAboveHeader.join(" | ") || "clean"}` +
      `\n   chain above header (work): ${b!.chainAboveHeader.join(" | ") || "clean"}` +
      `\n   controls rest:  ${a.controls.map((c) => `${c.cls}=${c.h}px/${c.fs}/dy${c.dy}`).join("  ") || "none"}` +
      `\n   controls work:  ${b!.controls.map((c) => `${c.cls}=${c.h}px/${c.fs}/dy${c.dy}`).join("  ") || "none"}` +
      `\n   inline w/title REST: ${a.inlineWithTitleAll.map((c) => `${c.cls}=${c.h}px/${c.fs}`).join("  ") || "none"}` +
      `\n   inline w/title WORK: ${b!.inlineWithTitle.map((c) => `${c.cls}=${c.h}px/${c.fs}`).join("  ") || "none"}` +
      `\n   children work:  ${b!.children.map((c) => `${c.cls}=${c.h}/dy${c.dy}`).join("  ")}` +
      `\n   plate margin ${b!.plateMargin} · wrap pad ${b!.wrapPad} · wrap margin ${b!.wrapMargin} · wsh margin ${b!.wshMargin}`,
    );
  }
  console.log("\n══════ REST ══════"); console.table(rest);
  console.log("\n══════ WORKING ══════"); console.table(work);
  console.log(detail.join("\n"));
});
