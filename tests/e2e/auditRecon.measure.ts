import { test } from "@playwright/test";
import { ensureSignedIn } from "./measure";
import { writeFileSync } from "node:fs";

test("audit recon", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await ensureSignedIn(page);
  await page.goto("/todo");
  await page.waitForTimeout(6500);
  const picked = await page.evaluate(() => {
    const vis = (e: Element) => (e as HTMLElement).offsetParent !== null;
    const row = [...document.querySelectorAll(".tdg-row")].filter(vis)
      .find((r) => /^Send your full/.test((r.querySelector(".tdg-t")?.textContent ?? "").trim()));
    if (row) (row as HTMLElement).click();
    return !!row;
  });
  await page.waitForTimeout(1500);
  await page.evaluate(() => {
    const b = [...document.querySelectorAll("[class*='tdk-'] button")]
      .find((x) => /^(Record|Action|Close|Send|Mark|Log|Chase)/.test((x.textContent ?? "").trim()));
    (b as HTMLElement | undefined)?.click();
  });
  await page.waitForTimeout(1800);

  const r = await page.evaluate(() => {
    const vis = (e: Element | null) => !!e && (e as HTMLElement).offsetParent !== null;
    const q = (s: string) => [...document.querySelectorAll(s)].filter(vis) as HTMLElement[];
    const one = (s: string) => q(s)[0];
    const txt = (e?: HTMLElement) => (e?.textContent ?? "").replace(/\s+/g, " ").trim();
    const box = (e?: HTMLElement) => e ? (({ x, y, w, h }) => `${x},${y} ${w}×${h}`)({
      x: Math.round(e.getBoundingClientRect().x), y: Math.round(e.getBoundingClientRect().y),
      w: Math.round(e.getBoundingClientRect().width), h: Math.round(e.getBoundingClientRect().height) }) : "ABSENT";
    const cs = (e: HTMLElement | undefined, p: string) => e ? getComputedStyle(e).getPropertyValue(p) : "-";

    /* A1 · is the story rendered twice? */
    const trackingBlocks = q("[class*='track'], [class*='Track']").map((e) => `${e.className} ${box(e)}`);
    const storyCards = q(".tdk-story").map((e) => `${e.className} ${box(e)}`);
    const eventTexts = q(".tdk-act [class*='tl'], .tdk-act [class*='track']").map((e) => txt(e).slice(0, 60));

    /* A2 · timeline entry wrapping */
    const tlEntries = q(".tdk-tl li, .tdk-tl .tdk-tle").map((e) => {
      const t = e.querySelector("[class*='tlt'], .t") as HTMLElement | null;
      return `${txt(e).slice(0, 44)} | h=${Math.round(e.getBoundingClientRect().height)} | nameW=${t ? Math.round(t.getBoundingClientRect().width) : "-"}`;
    });
    const tlCardW = box(one(".tdk-story"));

    /* A3 · one screen */
    const paneScroller = one(".tdk-w");
    const fold = { paneH: paneScroller?.clientHeight ?? -1, paneContent: paneScroller?.scrollHeight ?? -1 };

    /* B · header card */
    const tiles = q(".tdk-tile");
    const tileGrid = cs(one(".tdk-tiles"), "grid-template-columns");
    const band = one(".tdk-band");
    const fig = one(".tdk-bandfig");
    const figKids = fig ? [...fig.children].map((c) => `${c.className}:"${txt(c as HTMLElement)}" ${getComputedStyle(c).fontFamily.split(",")[0]} ${getComputedStyle(c).fontSize}`) : [];
    const deed = one(".tdk-deed");
    const sub = one(".tdk-sub");
    const imgs = band ? [...band.querySelectorAll("img, svg")].map((i) => `${i.tagName} ${(i as HTMLElement).className || ""} ${box(i as HTMLElement)}`) : [];
    const closeBtn = one(".tdk-x");
    const bandBtns = band ? [...band.querySelectorAll("button")].map((b) => txt(b as HTMLElement)) : [];
    const snooze = q("button").filter((b) => /snooze/i.test(txt(b))).map((b) => `${b.className} ${box(b)}`);

    /* C · form card */
    const act = one(".tdk-act");
    const actHeads = act ? [...act.querySelectorAll("h1,h2,h3,h4")].map((h) => txt(h as HTMLElement)) : [];
    const labels = act ? [...act.querySelectorAll("[class*='fk'], label, [class*='lbl']")].map((l) => txt(l as HTMLElement)) : [];
    const actText = txt(act).slice(0, 320);
    const primary = q(".tdk-prime").map((b) => `${txt(b)} ${box(b)}`);
    const willRec = q("[class*='will'], [class*='rec']").map((e) => `${e.className}:"${txt(e).slice(0,50)}"`);

    /* D · timeline card */
    const tlHead = one(".tdk-storyhd");
    const tlHeadKids = tlHead ? [...tlHead.children].map((c) => `${c.className}:"${txt(c as HTMLElement)}"`) : [];
    const dots = q(".tdk-tlm, .tdk-tl .dot, .tdk-tl [class*='dot']").length;
    const railLine = (() => {
      const t = one(".tdk-tl");
      if (!t) return "no .tdk-tl";
      const b = getComputedStyle(t, "::before");
      return `::before content=${b.content} w=${b.width} bg=${b.backgroundColor}`;
    })();

    /* E · list */
    const rows = q(".tdg-row").slice(0, 4).map((row) => {
      const kids = [...row.children].map((c) => (c.className || c.tagName).toString().split(" ")[0]);
      return `${txt(row).slice(0, 70)} || kids=[${kids.join(",")}] h=${Math.round(row.getBoundingClientRect().height)}`;
    });
    const checkboxes = q(".tdg-row input[type=checkbox], .tdg-row [class*='check']").length;
    const railW = box(one(".tdw-rail"));
    const foot = txt(one(".tdw-foot"));

    return { picked: true, trackingBlocks, storyCards, eventTexts, tlEntries, tlCardW, fold,
      tileCount: tiles.length, tileTexts: tiles.map((t) => txt(t)), tileGrid,
      figKids, deedHTML: deed?.innerHTML ?? "ABSENT", subText: txt(sub), imgs,
      closeBtn: box(closeBtn), bandBtns, snooze,
      actHeads, labels, actText, primary, willRec,
      tlHeadKids, dots, railLine, rows, checkboxes, railW, foot };
  });

  const lines = [`picked send row: ${picked}`, JSON.stringify(r, null, 1)];
  writeFileSync("run-artifacts/audit-recon.txt", lines.join("\n"));
  console.log(lines.join("\n"));
});
