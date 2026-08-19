/** PHASE 2 — measure, do not change. The ancestor chain from the pane to <body>, three viewports. */
import { test } from "@playwright/test";
import { ensureSignedIn } from "./measure";
import { writeFileSync, appendFileSync } from "node:fs";

const OUT = "run-artifacts/frame-measurements-raw.txt";

test("frame measurements", async ({ page }) => {
  writeFileSync(OUT, "");
  await ensureSignedIn(page);
  for (const vp of [{ width: 1440, height: 900 }, { width: 1680, height: 1050 }, { width: 1920, height: 1080 }]) {
    await page.setViewportSize(vp);
    await page.goto("/todo");
    await page.waitForTimeout(6500);
    const m = await page.evaluate(() => {
      const vis = (e: Element | null) => !!e && (e as HTMLElement).offsetParent !== null;
      const r = (el: Element) => Math.round((el as HTMLElement).getBoundingClientRect().width);
      const pane = [...document.querySelectorAll(".tdk-w")].find(vis) as HTMLElement;
      const list = [...document.querySelectorAll(".tdg")].find(vis) as HTMLElement;
      const rim = pane?.querySelector(".tdk-rim") as HTMLElement | null;
      const grid = pane?.querySelector(".tdk-scroll, .tdk-body") as HTMLElement | null;

      /* ⚠️ THE CONSTRAINING DECLARATION per ancestor — the value that decides its width. */
      const chain: string[] = [];
      let el: HTMLElement | null = pane;
      while (el && el !== document.body) {
        const c = getComputedStyle(el);
        const parts: string[] = [];
        if (c.maxWidth !== "none") parts.push("max-width:" + c.maxWidth);
        if (c.display.includes("grid") && c.gridTemplateColumns !== "none") parts.push("cols:" + c.gridTemplateColumns.split(" ").map((x) => (x.includes(".") ? Math.round(parseFloat(x)) + "px" : x)).join(" "));
        if (c.display.includes("flex")) parts.push("flex:" + c.flexGrow + " " + c.flexShrink + " " + c.flexBasis);
        if (parseFloat(c.paddingLeft) || parseFloat(c.paddingRight)) parts.push("pad:" + c.paddingLeft + "/" + c.paddingRight);
        if (c.justifyContent !== "normal" && c.display.includes("grid")) parts.push("justify:" + c.justifyContent);
        const name = (el.className && String(el.className).split(" ")[0]) || el.tagName.toLowerCase();
        chain.push(`${String(r(el)).padStart(5)}px  ${name.padEnd(22)} ${parts.join("  ")}`);
        el = el.parentElement;
      }
      const doc = document.documentElement;
      const dockEl = pane?.closest(".tdk") as HTMLElement | null;
      return {
        dpr: window.devicePixelRatio,
        list: list ? r(list) : -1,
        listParent: list?.parentElement ? r(list.parentElement) : -1,
        pane: pane ? r(pane) : -1,
        dock: dockEl ? r(dockEl) : -1,
        rim: rim ? r(rim) : -1,
        grid: grid ? r(grid) : -1,
        docW: doc.clientWidth,
        chain,
      };
    });
    appendFileSync(OUT, `\n════ ${vp.width}×${vp.height}  (documentElement.clientWidth ${m.docW}, devicePixelRatio ${m.dpr})\n`
      + `  list ${m.list}  listParent ${m.listParent}  |  dock ${m.dock}  pane(.tdk-w) ${m.pane}  rim ${m.rim}  inner ${m.grid}\n`
      + "  ancestors (pane → body), width + constraining declaration:\n"
      + m.chain.map((l) => "    " + l).join("\n") + "\n");
  }
  console.log("done");
});
