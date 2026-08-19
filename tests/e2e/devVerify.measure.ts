/**
 * IS DEV SERVING CURRENT MAIN, AND WHAT ARE THE THREE COUNTS?
 *
 * ⚠️ EVERY PROBE IS SCOPED TO THE VISIBLE PAGE. The workspace keeps other pages MOUNTED, and a
 * child of a hidden ancestor still computes `display: block` — that reported six phantom failures
 * earlier in this run. `offsetParent === null` is the test that tells them apart.
 */
import { test } from "@playwright/test";
import { ensureSignedIn } from "./measure";
import { writeFileSync } from "node:fs";

test("dev serves current main", async ({ page }) => {
  const errs: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
  page.on("pageerror", (e) => errs.push(`PAGEERROR ${e.message}`));

  await page.setViewportSize({ width: 1440, height: 900 });
  await ensureSignedIn(page);
  await page.goto("/todo");
  await page.waitForTimeout(8000);

  const r = await page.evaluate(() => {
    const vis = (e: Element | null) => !!e && (e as HTMLElement).offsetParent !== null;
    /* the ONE grid actually on screen */
    const grid = [...document.querySelectorAll(".wpg")].find((g) => vis(g)) as HTMLElement | undefined;
    const q = (root: ParentNode | undefined, sel: string) =>
      root ? [...root.querySelectorAll(sel)].filter(vis) : [];

    /* the bundle the page actually loaded */
    const bundles = [...document.querySelectorAll('script[src],link[rel="stylesheet"]')]
      .map((e) => (e.getAttribute("src") || e.getAttribute("href") || ""))
      .filter((u) => /index-[A-Za-z0-9_-]+\.(js|css)/.test(u));

    /* sidebar To-do badge — scoped to the nav, and read as its own node not the label's text */
    const navTodo = [...document.querySelectorAll("a,button")]
      .find((e) => vis(e) && /^To-do list/.test((e.textContent ?? "").trim()));
    const badge = (navTodo?.textContent ?? "").replace(/^To-do list/, "").trim();

    const footer = q(grid, "*").map((e) => (e.textContent ?? "").trim())
      .find((t) => /OUTSTANDING\s*·\s*SHOWING/i.test(t) && t.length < 80) ?? "";
    const paneHead = q(document, "*").map((e) => (e.textContent ?? "").trim())
      .find((t) => /^TASK \d+ OF \d+/i.test(t) && t.length < 60) ?? "";

    const rows = q(grid, ".tdg-row");
    const materials = rows.find((x) => /no record of what you sent/i.test(x.textContent ?? ""));

    return {
      bundles,
      badge,
      footer,
      paneHead,
      visibleRows: rows.length,
      materialsCard: (materials?.querySelector(".tdg-t")?.textContent ?? "").trim(),
      sectionCounts: q(grid, ".tdg-shd, [class*='tdg-sect'] h3").map((e) => (e.textContent ?? "").replace(/\s+/g, " ").trim()).slice(0, 6),
      otherPagesMounted: [...document.querySelectorAll(".wpg")].filter((g) => !vis(g)).length,
    };
  });

  await page.screenshot({ path: "run-artifacts/dev-deploy-verify.png" });

  const dup = errs.filter((e) => /two children with the same key/i.test(e)).length;
  const other = errs.filter((e) => !/two children with the same key/i.test(e));

  const report = [
    "── https://scriptally-dev.web.app/todo · 1440×900",
    `  bundles loaded:      ${JSON.stringify(r.bundles)}`,
    "",
    `  sidebar To-do badge: ${JSON.stringify(r.badge)}`,
    `  list footer:         ${JSON.stringify(r.footer)}`,
    `  pane header:         ${JSON.stringify(r.paneHead)}`,
    `  visible rows:        ${r.visibleRows}`,
    `  section heads:       ${JSON.stringify(r.sectionCounts)}`,
    "",
    `  materials card:      ${JSON.stringify(r.materialsCard)}`,
    `  other pages mounted: ${r.otherPagesMounted}  (excluded from every count above)`,
    "",
    `  known dup-key warns: ${dup}`,
    `  ⚠️ OTHER errors:      ${other.length}`,
    ...other.slice(0, 5).map((e) => "   " + e.slice(0, 160)),
  ].join("\n");
  writeFileSync("run-artifacts/dev-deploy-verify.txt", report);
  console.log("\n" + report + "\n");
});
