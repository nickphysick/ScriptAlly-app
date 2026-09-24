/* scratch: does every closed mark still NAME its outcome? Worktree only. */
import { expect, test } from "@playwright/test";
import { ensureSignedIn, openRoute } from "./measure";

/**
 * ⚠️ `?view=grid` AND `?view=calendar` ARE GONE FROM THIS CENSUS (v65.1). Since v65 retired the
 * views, `?view=grid` is the same page as `/queries` — a duplicate — and `?view=calendar` OPENS THE
 * EXPANDED BIRDS-EYE VIEW, so this sweep was measuring a MODAL and counting its marks as the page's.
 * A census that visits the same surface twice inflates its own population, and one that visits a
 * different surface than it names is not measuring what it says.
 */
const ROUTES = ["/queries", "/dashboard", "/todo", "/queries/analytics", "/agents", "/manuscripts"];

test("every closed mark names its outcome", async ({ page }) => {
  await ensureSignedIn(page);
  const report: string[] = [];
  for (const route of ROUTES) {
    await openRoute(page, route, { width: 1440, height: 900 });
    await page.waitForTimeout(3000);
    const out = await page.evaluate(() => {
      /* the closed mark: a ring with the bar through it */
      const dots = [...document.querySelectorAll('svg[viewBox="0 0 24 24"][stroke-width="2"]')]
        .filter((s) => s.querySelector('circle[r="10"]') && s.querySelector('path[d="M7.5 12h9"]'));
      const WORDS = ["pass", "no reply", "withdrawn", "closed", "rejected", "no response"];
      const rows: { where: string; named: boolean; via: string; text: string }[] = [];
      for (const s of dots) {
        const host = s.parentElement as HTMLElement | null;
        if (!host) continue;
        const r = host.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        /* the mark itself may carry the name */
        const own = (host.getAttribute("aria-label") ?? "") + " " + (host.getAttribute("title") ?? "");
        /* …or the block it sits in, or that block's title */
        let ctx = "", titled = "";
        let p: HTMLElement | null = host.parentElement;
        for (let i = 0; i < 4 && p; i++) {
          ctx += " " + (p.textContent ?? "");
          titled += " " + (p.getAttribute("title") ?? "") + " " + (p.getAttribute("aria-label") ?? "");
          p = p.parentElement;
        }
        const hay = (own + ctx + titled).toLowerCase();
        const hit = WORDS.find((w) => hay.includes(w));
        rows.push({
          where: (host.parentElement?.className || host.className || "?").toString().slice(0, 44),
          named: !!hit, via: hit ?? "—",
          text: (ctx.replace(/\s+/g, " ").trim()).slice(0, 70),
        });
      }
      return rows;
    });
    const unnamed = out.filter((r) => !r.named);
    report.push(`${route.padEnd(24)} closed marks ${String(out.length).padStart(3)} · unnamed ${unnamed.length}` +
      (unnamed.length ? "\n      " + [...new Set(unnamed.map((u) => `${u.where} :: "${u.text}"`))].slice(0, 6).join("\n      ") : ""));
  }
  // eslint-disable-next-line no-console
  console.log("\n@@CLOSED\n" + report.join("\n"));
  expect(report.length).toBe(ROUTES.length);
});
