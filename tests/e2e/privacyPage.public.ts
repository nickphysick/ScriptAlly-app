/**
 * /privacy — privacy page v1 (2 Nov; ref design-refs/privacy-v1.html): PRIV-1 … PRIV-4, on a PRODUCTION
 * build served locally.
 *
 *   npm run build:prod && npx vite preview --host 127.0.0.1 --port 4410 --strictPort
 *   SA_E2E_BASE_URL=http://127.0.0.1:4410 npx playwright test --project public privacyPage
 *
 * `PRIV_MUTATE=<name>` applies a named break in the page (see MUTATIONS).
 */
import { test, expect, Page } from "@playwright/test";

const SIZES = [{ width: 390, height: 844 }, { width: 1440, height: 900 }];

/** Verbatim from the brief and its addendum (straight quotes and apostrophes, as the site's copy is set). */
const STRINGS = [
  "Last updated 2 November 2026",
  "The short version",
  "Your querying records and your writing belong to you.",
  "We collect only what the app needs to work.",
  "We don't sell it, and we don't run advertising.",
  "AI only does the admin. It never writes for you, and nothing you store trains it.",
  "QueryHawk is run by Nick, an aspiring writer in London, UK, with a background in using data to tell stories (\"we\", \"us\"). We are the data controller for the personal data described in this policy, and you can reach us at hello@queryhawk.net.",
  "in the London (europe-west2) region.",
  "AI does the admin, never the art. QueryHawk uses AI models only for menial, behind-the-scenes tasks: reading and sorting information you give it, so you don't have to retype it. It never writes your query letters, synopses or pages, never edits your work, and never creates or designs anything for you.",
  "AI is used only when you run one of these features, never in the background:",
  "Smart Import — reads the spreadsheet or notes you upload and turns them into your agents and queries.",
  "Smart Email Drop — reads an email you paste in and suggests the updates to make. Nothing changes until you accept them.",
  "Comparable title suggestions — looks at the details you've entered about your manuscript and suggests published titles you might compare it to.",
  "Finding agent details — looks up an agent's public submission information and shows you where each detail came from, for you to check.",
  "These tasks are processed on our behalf by Anthropic (the maker of the Claude AI models). Under the commercial terms we use, Anthropic does not use this data to train its models. The results are stored in your account; the processing itself is transient.",
  "Your manuscripts, pitches and notes stored in QueryHawk are not sent to any AI service unless you run one of the features above.",
  "There are no advertising cookies and no cross-site trackers, which is why you won't find a cookie banner here. We count visits with Cloudflare Web Analytics, which doesn't use cookies or track you across sites.",
  "If you would rather we removed you sooner, email hello@queryhawk.net and we will.",
];
const SECTIONS = [
  "Who we are", "What we collect", "How we use it, and on what basis", "How we use AI", "Where your data lives",
  "Cookies and local storage", "Retention and deletion", "Your rights", "Children", "Changes to this policy",
];

const MUTATIONS: Record<string, (page: Page) => Promise<unknown>> = {
  PRIV1: (page) => page.evaluate(() => { document.querySelector("#priv-s1 p")!.append(" [ICO registration number: pending.]"); }),
  PRIV1b: (page) => page.evaluate(() => { const d = document.createElement("div"); d.className = "mk-draftribbon"; d.textContent = "Working draft"; document.querySelector(".mk-pv")!.prepend(d); }),
  PRIV2: (page) => page.evaluate(() => { const a = document.createElement("a"); a.href = "/contact"; a.textContent = "write to us"; document.querySelector("#priv-s7 p")!.append(a); }),
  PRIV3: (page) => page.evaluate(() => { const p = document.querySelector("#priv-s1 p")!; p.innerHTML = p.innerHTML.replace("Nick", "Nick Physick"); }),
  PRIV4: (page) => page.evaluate(() => { document.querySelectorAll(".mk-pv-toc li")[9]!.remove(); }),
  PRIV4b: (page) => page.evaluate(() => { const a = document.querySelectorAll<HTMLAnchorElement>(".mk-pv-toc a")[4]; const c = a.cloneNode(true) as HTMLAnchorElement; c.href = "#priv-s1"; a.replaceWith(c); }),
};
const mutate = async (page: Page, ...names: string[]) => {
  const m = process.env.PRIV_MUTATE;
  if (!m || !names.includes(m)) return;
  await MUTATIONS[m](page);
  await page.waitForTimeout(100);
};

async function open(page: Page) {
  await page.route(/googletagmanager\.com|google-analytics\.com/, (r) => r.abort());
  await page.goto("/privacy");
  /* The shell, not the page's own marker, so an old build fails on its CONTENT, not on a missing hook. */
  await expect(page.locator("#mk-main h1").first()).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
}
const flat = (s: string) => s.replace(/\s+/g, " ").trim();

for (const vp of SIZES) {
  test.describe(`at ${vp.width}`, () => {
    test.use({ viewport: vp });

    test("PRIV-1 · no bracketed placeholder and no working-draft ribbon", async ({ page }) => {
      await open(page);
      await mutate(page, "PRIV1", "PRIV1b");
      const r = await page.evaluate(() => ({
        text: document.body.innerText,
        ribbon: document.querySelectorAll(".mk-draftribbon, .mk-drtag").length,
      }));
      expect(r.text.length, "the page has text").toBeGreaterThan(3000);
      expect(r.text.match(/\[[^\]]*\]/g) ?? [], "no bracketed text").toEqual([]);
      expect(r.text).not.toContain("[");
      expect(r.text, "no working-draft wording").not.toMatch(/working draft/i);
      expect(r.ribbon, "no ribbon").toBe(0);
    });

    test("PRIV-2 · the only links are mailto, ico.org.uk and the contents' anchors", async ({ page }) => {
      await open(page);
      await mutate(page, "PRIV2");
      const r = await page.evaluate(() => ({
        hrefs: Array.from(document.querySelectorAll<HTMLAnchorElement>("a[href]")).filter((a) => !a.classList.contains("mk-skip")).map((a) => a.getAttribute("href")!),
        buttons: Array.from(document.querySelectorAll(".mk-navwrap button, .mk-foot button, .mk-pv button")).map((b) => (b.textContent ?? "").trim()),
      }));
      console.log(`PRIV-2 @${vp.width}`, JSON.stringify(r));
      const ok = (h: string) => h.startsWith("mailto:") || h === "https://ico.org.uk" || /^#priv-s\d+$/.test(h);
      expect(r.hrefs.filter((h) => h.startsWith("#priv-s")).length, "the contents' anchors are found").toBe(10);
      expect(r.hrefs.some((h) => h.startsWith("mailto:")), "a mailto is found").toBe(true);
      for (const h of r.hrefs) expect(ok(h), `${h} is not an allowed link`).toBe(true);
      expect(r.buttons, "no buttons that go anywhere").toEqual([]);
    });

    test("PRIV-3 · every string verbatim; no surname", async ({ page }) => {
      await open(page);
      await mutate(page, "PRIV3");
      const text = flat(await page.evaluate(() => (document.querySelector("#mk-main") as HTMLElement).innerText));
      for (const s of STRINGS) expect(text, s.slice(0, 50)).toContain(s);
      expect(await page.locator(".mk-pv-short li").count(), "four ticks").toBe(4);
      expect(await page.locator(".mk-pv-callout--navy").first().evaluate((e) => e.closest("section")!.id), "the navy callout opens the AI section").toBe("priv-s4");
      const lead = await page.locator(".mk-pv-callout--navy strong").first();
      expect(await lead.textContent()).toBe("AI does the admin, never the art.");
      expect(await lead.evaluate((e) => getComputedStyle(e).color), "the lead phrase is blush").toBe("rgb(232, 180, 163)");
      const whole = await page.evaluate(() => document.body.innerText + document.title + Array.from(document.querySelectorAll("meta")).map((m) => m.content).join(" "));
      expect(whole, "no surname anywhere").not.toMatch(/Physick/i);
      const upper = await page.evaluate(() => Array.from(document.querySelectorAll<HTMLElement>("body *")).filter((e) => getComputedStyle(e).textTransform === "uppercase").length);
      expect(upper, "nothing in capitals").toBe(0);
    });

    test("PRIV-4 · ten contents items, each scrolls its section into place", async ({ page }) => {
      await open(page);
      await mutate(page, "PRIV4", "PRIV4b");
      const items = page.locator(".mk-pv-toc a");
      expect(await items.count(), "ten items").toBe(10);
      expect((await items.allTextContents()).map((t) => t.replace(/^\d+\.\s*/, "")), "in order, named as the sections").toEqual(SECTIONS);
      for (let i = 0; i < 10; i++) {
        await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior }));
        await page.emulateMedia({ reducedMotion: "reduce" });
        await items.nth(i).click();
        await page.waitForTimeout(150);
        const r = await page.evaluate((n) => {
          const s = document.getElementById(`priv-s${n}`)!.getBoundingClientRect();
          const nav = document.querySelector(".mk-navwrap")!.getBoundingClientRect().bottom;
          const atEnd = Math.ceil(scrollY + innerHeight) >= document.documentElement.scrollHeight - 1;
          return { top: s.top, nav, atEnd, vh: innerHeight, scrollY };
        }, i + 1);
        expect(r.scrollY, `item ${i + 1} scrolled the page`).toBeGreaterThan(0);
        /* The section's top lands just under the bar — or, near the foot, the page has run out of room
           and the section is on screen below the bar. */
        if (r.atEnd) expect(r.top >= r.nav - 1 && r.top < r.vh, `section ${i + 1} on screen (top ${r.top})`).toBe(true);
        /* The offset is the bar's FULL height + 20 (the site's anchor rule: the scroll is worked out before the
           bar condenses), so under the condensed bar the section lands with up to ~50px of air above it. */
        else expect(r.top >= r.nav && r.top <= r.nav + 60, `section ${i + 1} lands under the bar (top ${r.top}, bar ${r.nav})`).toBe(true);
      }
    });
  });
}
