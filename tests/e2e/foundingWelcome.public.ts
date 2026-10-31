/**
 * The founding welcome (/welcome), measured on a PRODUCTION build with the real `waitlist` function
 * running on the emulator (founding-welcome, Part D). Never live, never dev.
 *
 *   npm --prefix functions run build
 *   firebase emulators:start --only functions,firestore --project demo-scriptally-test
 *     (functions/.secret.local: WAITLIST_IP_SALT=<anything>, RESEND_API_KEY= — empty, so no mail
 *      leaves; functions/.env.demo-scriptally-test: FIRESTORE_DATABASE_ID=(default). Both local only.)
 *   npx vite build --outDir <dir> && npx vite preview --outDir <dir> --host 127.0.0.1 --port 4733 --strictPort
 *   SA_E2E_BASE_URL=http://127.0.0.1:4733 npx playwright test --project public tests/e2e/foundingWelcome.public.ts
 *
 * ⚠️ EVERY STATE IS REACHED THROUGH THE REAL VERIFY LINK. The spec seeds pending writers in the
 * emulator's Firestore, GETs the function's own /verify, and follows the 302 it answers — so the
 * reference on the address is one the function minted, and the number on the card is the one it
 * assigned. `vite preview` has no rewrites, so the page's `/api/waitlist/**` calls are forwarded to
 * the emulator by `page.route`, which is also where a delay is added to watch the card hold still.
 */
import { test, expect, Page } from "@playwright/test";
import { createRequire } from "module";
import { writeFileSync, mkdirSync } from "fs";
import { resolve } from "path";

const FN = "http://127.0.0.1:5001/demo-scriptally-test/europe-west2/waitlist";
const OUT = "reports/founding-welcome";
const readings: Record<string, unknown> = {};

/* The function's own compiled helpers and its own copy of the Admin SDK, so the seed hashes a token
   exactly as the function will. */
process.env.FIRESTORE_EMULATOR_HOST ??= "127.0.0.1:8080";
const req = createRequire(resolve("functions/package.json"));
const admin = req("firebase-admin");
const model = req("./lib/waitlistModel.js");
if (admin.apps.length === 0) admin.initializeApp({ projectId: "demo-scriptally-test" });
const db = admin.firestore();

const seedPending = async (email: string, expiresInMs = 48 * 3600 * 1000): Promise<string> => {
  const token = model.newVerifyToken();
  await db.doc(`waitlist/${model.emailHash(email)}`).set({
    email, emailNormalised: email, createdAt: new Date(), lastInteractionAt: new Date(),
    verified: false, status: "pending", position: null,
    verifyTokenHash: model.tokenHash(token), verifyTokenExpiresAt: new Date(Date.now() + expiresInMs),
    source: "founders-hero",
  });
  return token;
};
const verify = async (token: string): Promise<string> => {
  const res = await fetch(`${FN}/verify?token=${encodeURIComponent(token)}`, { redirect: "manual" });
  expect(res.status, "verify answers with a redirect").toBe(302);
  return res.headers.get("location")!;
};

const LINKS: Record<string, string> = {};
let verifiedEmail = "";

test.beforeAll(async () => {
  for (const c of ["waitlist", "ratelimits"]) {
    const snap = await db.collection(c).get();
    await Promise.all(snap.docs.map((d: { ref: { delete: () => Promise<unknown> } }) => d.ref.delete()));
  }
  /* Twenty-two places already taken, so the writer below is No. 23 (and the twice-clicker No. 24). */
  await db.doc(model.COUNTER_PATH).set({ verifiedCount: 22, cap: 100 });
  verifiedEmail = "welcome-e2e-a@example.test";
  const a = await seedPending(verifiedEmail);
  LINKS.verified = await verify(a);
  /* A second writer clicks twice (or a mail scanner clicked first). Each click mints a fresh
     reference and the newest is the one that works, so "already" is a writer of its own — reusing
     the first writer would leave the verified link's reference replaced. */
  const twice = await seedPending("welcome-e2e-d@example.test");
  await verify(twice);
  LINKS.already = await verify(twice);
  const late = await seedPending("welcome-e2e-c@example.test", -60_000);
  LINKS.expired = await verify(late);
  LINKS.unknown = await verify("not-a-real-token");
  /* The founding hundred full: the next writer to confirm is a reserve. */
  await db.doc(model.COUNTER_PATH).set({ verifiedCount: 100, cap: 100 }, { merge: true });
  LINKS.waiting = await verify(await seedPending("welcome-e2e-b@example.test"));
  readings.links = Object.fromEntries(Object.entries(LINKS).map(([k, v]) => [k, v.replace(/r=[^&]+/, "r=<ref>")]));
});

test.afterAll(() => {
  mkdirSync(OUT, { recursive: true });
  writeFileSync(`${OUT}/partD-readings.json`, JSON.stringify(readings, null, 2) + "\n");
});

/** Forwards the page's API calls to the emulator; `hold` delays the welcome lookup. */
const forward = async (page: Page, opts: { hold?: number; failAnswers?: boolean } = {}) => {
  await page.route(/\/api\/waitlist(\/|\?|$)/, async (route) => {
    const url = new URL(route.request().url());
    const sub = url.pathname.replace(/^\/api\/waitlist/, "");
    if (opts.failAnswers && sub === "/welcome/answers") return route.fulfill({ status: 500, contentType: "application/json", body: '{"ok":false}' });
    if (opts.hold && sub === "/welcome") await new Promise((r) => setTimeout(r, opts.hold));
    /* ⚠️ THE ORIGIN HEADER IS DROPPED. The function refuses an origin outside its allowlist, and this
       page's origin is 127.0.0.1, not the live site; live, the request is same-origin through the
       hosting rewrite and carries an allowed one. Dropping it is what a server-side caller sends. */
    const headers = { ...route.request().headers() };
    delete headers.origin;
    const res = await route.fetch({ url: `${FN}${sub}${url.search}`, headers });
    (readings.api ??= [] as unknown[]) && (readings.api as unknown[]).push(`${route.request().method()} ${sub} → ${res.status()}`);
    await route.fulfill({ response: res });
  });
};

const HEADLINES: Record<string, RegExp> = {
  verified: /^Welcome, Founding Writer\.$/,
  already: /^You're already in\.$/,
  waiting: /^So close\. You're first reserve\.$/,
  expired: /^That link's 48 hours are up\.$/,
  unknown: /^We don't recognise that link\.$/,
};
const CARD: Record<string, string> = { verified: "023", already: "024", waiting: "1st", expired: "—", unknown: "—" };

for (const width of [1440, 390]) {
  test.describe(`at ${width}px`, () => {
    test.use({ viewport: { width, height: width === 390 ? 844 : 900 } });

    for (const kind of ["verified", "already", "waiting", "expired", "unknown"]) {
      test(`${kind}: its headline, its card, a clean address`, async ({ page }) => {
        await forward(page);
        await page.goto(LINKS[kind]);
        const root = page.locator(`[data-welcome="${kind}"]`);
        await expect(root).toBeVisible();
        await expect(root.locator("h1")).toHaveText(HEADLINES[kind]);
        await expect(page.locator('[data-probe="card-number"]')).toHaveText(CARD[kind]);
        const url = new URL(page.url());
        expect(url.pathname).toBe("/welcome");
        expect(url.search, "v and r are removed from the address").toBe("");
        const r = await page.evaluate(() => ({
          focused: document.activeElement?.tagName,
          ring: getComputedStyle(document.activeElement as Element).outlineStyle,
          overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          /* The writer's address, never the footer's contact line: read the welcome itself. */
          hasAt: /@[a-z0-9-]+\./i.test((document.querySelector(".mk-wel") as HTMLElement).innerText),
          title: document.title,
        }));
        expect(r.focused, "focus starts on the headline").toBe("H1");
        expect(r.ring, "the headline is not a tab stop, so it draws no ring").toBe("none");
        expect(r.overflow, "no sideways scroll").toBeLessThanOrEqual(0);
        expect(r.hasAt, "no email address on the page").toBe(false);
        readings[`${kind}@${width}`] = r;
        await page.waitForTimeout(1600);
        await page.screenshot({ path: `${OUT}/${kind}-${width}.png`, fullPage: true });
      });
    }

    test("the card does not move when the number lands", async ({ page }) => {
      await forward(page, { hold: 1500 });
      await page.goto(LINKS.verified);
      const card = page.locator(".mk-wel-card");
      await expect(card).toHaveClass(/is-loading/);
      const box = () => card.evaluate((el: HTMLElement) => {
        const r = el.getBoundingClientRect();
        /* Read with the entrance's transform cleared, so the reading is the layout box. */
        const t = el.style.transform; el.style.animation = "none"; el.style.transform = "none"; void el.offsetHeight;
        const b = el.getBoundingClientRect(); el.style.transform = t; el.style.animation = "";
        return { x: b.x + window.scrollX, y: b.y + window.scrollY, w: b.width, h: b.height, rect: r.width };
      });
      /* The fonts first: a web font swapping in reflows the headline above the card on the phone,
         which is not what this measures. */
      await page.evaluate(() => document.fonts.ready);
      const before = await box();
      await expect(card, "the first reading was taken while the number was still on its way").toHaveClass(/is-loading/);
      await expect(card).not.toHaveClass(/is-loading/, { timeout: 6000 });
      await expect(page.locator('[data-probe="card-number"]')).toHaveText("023");
      const after = await box();
      readings[`stable@${width}`] = { before, after };
      for (const k of ["x", "y", "w", "h"] as const) expect(Math.abs(after[k] - before[k]), k).toBeLessThanOrEqual(0.5);
    });

    test("the stamp has landed by 1.5s, and reduced motion shows the final frame", async ({ page }) => {
      await forward(page);
      await page.goto(LINKS.verified);
      const seal = page.locator(".mk-wel-seal");
      const timing = await seal.evaluate((el) => el.getAnimations().map((a) => (a.effect as KeyframeEffect).getComputedTiming().endTime));
      expect(timing.length, "the stamp animates").toBe(1);
      expect(Number(timing[0]), "it ends by 1500ms").toBeLessThanOrEqual(1500);
      await page.waitForTimeout(1500);
      const done = await seal.evaluate((el) => el.getAnimations().every((a) => a.playState === "finished"));
      expect(done).toBe(true);

      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.reload();
      await page.goto(LINKS.verified);
      await expect(page.locator(".mk-wel-card")).not.toHaveClass(/is-loading/);
      const still = await page.evaluate(() => {
        const card = document.querySelector(".mk-wel-card")!, seal = document.querySelector(".mk-wel-seal")!;
        return {
          animations: document.getAnimations().length,
          sealOpacity: getComputedStyle(seal).opacity,
          sealTransform: getComputedStyle(seal).transform,
          cardTransform: getComputedStyle(card).transform,
        };
      });
      readings[`motion@${width}`] = { endTime: timing[0], reduced: still };
      expect(still.animations, "nothing animates").toBe(0);
      expect(still.sealOpacity).toBe("1");
      /* rotate(-14deg) and rotate(-1.6deg): the final frame, not the first. */
      expect(still.sealTransform).toMatch(/^matrix\(0\.97/);
      expect(still.cardTransform).toMatch(/^matrix\(0\.999/);
    });
  });
}

test("the three answers round-trip, and a failure keeps them", async ({ page }) => {
  await forward(page, { failAnswers: true });
  await page.goto(LINKS.verified);
  const send = page.getByRole("button", { name: "Send to Nick" });
  await expect(send).toBeDisabled();
  await page.getByRole("button", { name: "In the thick of it" }).click();
  await page.getByRole("button", { name: "11–50" }).click();
  await expect(send, "two of three is not enough").toBeDisabled();
  await page.getByRole("button", { name: "Spreadsheet" }).click();
  await expect(send).toBeEnabled();
  await send.click();
  await expect(page.getByRole("alert")).toHaveText("That didn't send — try again");
  await expect(page.getByRole("button", { name: "Spreadsheet" })).toHaveAttribute("aria-pressed", "true");

  /* Now the real function. */
  await page.unrouteAll({ behavior: "wait" });
  await forward(page);
  await send.click();
  await expect(page.getByText("Thank you, that's really useful.")).toBeVisible();
  const doc = (await db.doc(`waitlist/${model.emailHash(verifiedEmail)}`).get()).data();
  readings.answers = { stage: doc.answerStage, queried: doc.answerQueried, tracker: doc.answerTracker, answeredAt: !!doc.answeredAt };
  expect([doc.answerStage, doc.answerQueried, doc.answerTracker]).toEqual(["in-the-thick", "11-50", "spreadsheet"]);
});

test("/founders?verified=already goes on to /welcome", async ({ page }) => {
  await forward(page);
  await page.goto("/founders?verified=already");
  await expect(page.locator('[data-welcome="already"] h1')).toHaveText(HEADLINES.already);
  expect(new URL(page.url()).pathname).toBe("/welcome");
});
