import { test } from "@playwright/test";
import { ensureSignedIn } from "./measure";
import { writeFileSync } from "node:fs";

test("audit recon 2", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await ensureSignedIn(page);
  await page.goto("/todo");
  await page.waitForTimeout(6500);
  await page.evaluate(() => {
    const vis = (e: Element) => (e as HTMLElement).offsetParent !== null;
    const row = [...document.querySelectorAll(".tdg-row")].filter(vis)
      .find((r) => /^Send your full/.test((r.querySelector(".tdg-t")?.textContent ?? "").trim()));
    (row as HTMLElement | undefined)?.click();
  });
  await page.waitForTimeout(1500);
  const rest = await page.evaluate(() => {
    const vis = (e: Element | null) => !!e && (e as HTMLElement).offsetParent !== null;
    const q = (s: string) => [...document.querySelectorAll(s)].filter(vis) as HTMLElement[];
    const b = (e?: HTMLElement) => e ? `${Math.round(e.getBoundingClientRect().x)},${Math.round(e.getBoundingClientRect().y)} ${Math.round(e.getBoundingClientRect().width)}×${Math.round(e.getBoundingClientRect().height)}` : "ABSENT";
    const wr = q(".tdk-workrow")[0];
    return {
      state: "REST (card, before entering the journey)",
      workrow: b(wr),
      workrowStyle: wr ? (({ display, flexWrap, gridTemplateColumns }) => `${display} wrap=${flexWrap} cols=${gridTemplateColumns}`)(getComputedStyle(wr)) : "-",
      workrowKids: wr ? [...wr.children].map((c) => `${(c as HTMLElement).className.split(" ")[0]} ${b(c as HTMLElement)} flex=${getComputedStyle(c).flex}`) : [],
      storyCard: b(q(".tdk-story")[0]),
      actCard: b(q(".tdk-act")[0]),
      /* the name element inside a timeline entry, precisely */
      tlNames: q(".tdk-tl li").map((li) => [...li.querySelectorAll("*")]
        .map((e) => `${(e as HTMLElement).className || e.tagName}=${Math.round(e.getBoundingClientRect().width)}`).join(" ")),
      /* what the form card restates */
      actInner: q(".tdk-act")[0] ? [...q(".tdk-act")[0].children].map((c) => `${(c as HTMLElement).className.split(" ")[0]}:"${(c.textContent ?? "").replace(/\s+/g," ").trim().slice(0,70)}"`) : [],
      paneFold: (() => { const p = q(".tdk-w")[0]; return p ? `${p.clientHeight}/${p.scrollHeight}` : "-"; })(),
    };
  });
  writeFileSync("run-artifacts/audit-recon2.txt", JSON.stringify(rest, null, 1));
  console.log(JSON.stringify(rest, null, 1));
});
