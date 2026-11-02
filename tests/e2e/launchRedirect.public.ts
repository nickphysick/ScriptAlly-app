/**
 * RED-1, the rendered half (launch readiness, 2 Nov): on the live (landing-only) build, served by the
 * Firebase hosting emulator with firebase.json's own redirects, every unfinished or unknown page lands
 * on `/` by a 301, while /welcome (with and without its query) and /privacy do not move.
 *
 * Opt-in, because `vite preview` does not read firebase.json. The recipe: a folder of its own holding a
 * copy of firebase.json's `hosting` block (port moved off 5000, which macOS keeps for AirPlay) and a
 * `dist` link to the build.
 *
 * ⚠️ RUN IT FROM ITS OWN FOLDER. Started from the repo with `--config <copy>`, the hosting emulator still
 * applied the repo's firebase.json redirects (measured 2 Nov: a copy with no redirects still answered
 * 301), so the red proof against "no redirect" passed on a server that had one.
 *
 *   npm run build:prod
 *   D=$(mktemp -d); ln -s "$PWD/dist" $D/dist
 *   node -e 'const c=require("./firebase.json");require("fs").writeFileSync(process.argv[1]+"/firebase.json",JSON.stringify({hosting:c.hosting,emulators:{hosting:{port:5055,host:"127.0.0.1"}}}))' $D
 *   (cd $D && npx firebase emulators:start --only hosting --project demo-red1) &
 *   SA_E2E_HOSTING_URL=http://127.0.0.1:5055 SA_E2E_BASE_URL=http://127.0.0.1:5055 npx playwright test --project public launchRedirect
 *
 * The unit half (the regex itself, path by path) is src/lib/landingRedirect.test.ts.
 */
import { test, expect } from "@playwright/test";

const BASE = process.env.SA_E2E_HOSTING_URL;
test.skip(!BASE, "needs the hosting emulator (see the recipe above)");

const HOME = ["/pricing", "/about", "/contact", "/founders", "/terms", "/nonsense", "/dashboard", "/terms/"];
const STAY = ["/welcome?v=verified", "/welcome", "/privacy"];

test("RED-1 · unfinished and unknown pages 301 to /; /welcome and /privacy stay", async ({ request, page }) => {
  for (const p of HOME) {
    const r = await request.get(BASE + p, { maxRedirects: 0 });
    expect(r.status(), `${p} answers 301`).toBe(301);
    expect(new URL(r.headers()["location"], BASE).pathname, `${p} goes to /`).toBe("/");
  }
  for (const p of STAY) {
    const r = await request.get(BASE + p, { maxRedirects: 0 });
    expect(r.status(), `${p} is served, not moved`).toBe(200);
  }
  for (const p of ["/assets/", "/images/og-share.png", "/favicon.ico"]) {
    const r = await request.get(BASE + p, { maxRedirects: 0 });
    expect(r.status(), `${p} is not redirected`).not.toBe(301);
  }
  /* And in a browser: the page a reader lands on. */
  for (const p of ["/pricing", "/terms"]) {
    await page.goto(BASE + p);
    expect(new URL(page.url()).pathname, `${p} lands on /`).toBe("/");
  }
  /* /welcome reads its `v` once and then tidies it out of the address bar on purpose, so the browser
     check is the path, and that the verified state is what drew. */
  for (const p of STAY) {
    await page.goto(BASE + p);
    await page.waitForTimeout(400);
    expect(new URL(page.url()).pathname, `${p} stays put`).toBe(p.split("?")[0]);
  }
  await page.goto(BASE + "/welcome?v=verified");
  await expect(page.getByText("Welcome, founding writer.")).toBeVisible();
});
