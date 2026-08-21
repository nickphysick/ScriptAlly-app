/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The local-bundle guard, in a PLAIN MODULE.
 *
 * ⚠️ IT LIVES HERE BECAUSE PLAYWRIGHT FORBIDS A TEST FILE IMPORTING A TEST FILE. The guard was
 * written inside `auth.setup.ts`, and moving the call into `ensureSignedIn` — which is right, the
 * setup project is SKIPPED when a cached `storageState` is still valid, so the check has to sit
 * where the traffic is — made `measure.ts` import a spec, and the whole e2e suite failed to
 * collect with "should not import test file". Neither caller is at fault; the function simply was
 * not a spec's to own.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { resolve } from "node:path";

/**
 * ⚠️ A LOCAL RUN MUST BE SERVING A **DEV** BUNDLE, AND THIS IS WHERE THAT IS CHECKED.
 *
 * `dist/` is one directory shared by every session in this checkout, and a production build —
 * `npm run build` as a gate, from ANY session — silently replaces the dev bundle a
 * `vite preview` is serving. The pages still load, the harness signs in, and the measurements
 * read a real page: it is simply the PRODUCTION Firebase project.
 *
 * Measured 20 Aug, and it is not hypothetical: a settings measurement ran against a prod bundle
 * for several minutes. Its writes were correctly DENIED (prod rules are older, and the field it
 * was writing did not exist there), and the denial read exactly like a broken feature — the
 * diagnosis went through the rules, a redeploy, a vintage probe and a per-field SDK write, all of
 * which said the write was fine, before the request payload named `gen-lang-client-…` in its URL.
 * Nothing in prod was modified, and nothing should have been at risk of it.
 *
 * The check is skipped for a remote BASE_URL, and for a local server that is not serving a built
 * bundle at all — see `servesBuiltBundle`.
 */
/**
 * ⚠️ ASK THE SERVER WHAT IT SERVES — DO NOT ASSUME IT IS `dist/`.
 *
 * `.claude/launch.json` carries both kinds on localhost: `npm run dev` (a Vite dev server, which
 * serves SOURCE and is current the instant a file is saved) and `vite preview` (which serves the
 * built `dist/`). Every check below is about the BUNDLE, and against a dev server they are not
 * merely unnecessary — the staleness one would refuse a perfectly good measurement every time a
 * source file is newer than the last build, which on a working night is always. Written on the
 * unexamined belief that port 3000 was a preview server; it is `npm run dev`.
 *
 * The tell is in the served document: a built page links `/assets/index-*.js`; a Vite dev page
 * links `/src/main.tsx` and `/@vite/client`. One request settles it. A server that cannot be
 * reached returns false and is left to Playwright's own connection error, which says what is
 * wrong far more plainly than a guess from this function could.
 */
async function servesBuiltBundle(base: string): Promise<boolean> {
  /**
   * ⚠️⚠️ THIS FUNCTION USED TO FAIL OPEN, AND IT DISABLED THE WHOLE GUARD SILENTLY.
   *
   * A `catch { return false }` meant "could not reach the server" was reported as "not serving a
   * built bundle", and the caller reads that as permission to skip EVERY check. Proved by planting
   * the production project id in `dist/assets` and watching a measurement pass.
   *
   * ⚠️ AND THE THING IT COULD NOT REACH WAS RUNNING. `vite preview` binds IPv4 only; Node resolves
   * `localhost` to `::1` first and undici does not fall back, so `fetch` threw `fetch failed`
   * against a server `curl` and Chromium both talk to happily. **Node and the browser disagree about
   * `localhost`** — so this function's failure says nothing whatever about the page being measured,
   * which is precisely why it must not be read as an answer.
   *
   * So: try the literal host, then 127.0.0.1, and if neither can be reached DO NOT skip — fall
   * through to the bundle checks. Refusing a good run costs a rebuild; passing a prod one costs what
   * the note at the top of this file describes.
   */
  for (const url of [base, base.replace("//localhost", "//127.0.0.1")]) {
    try {
      const html = await (await fetch(url, { redirect: "follow" })).text();
      return /\/assets\/index-[A-Za-z0-9_-]+\.js/.test(html);
    } catch {
      /* try the next address */
    }
  }
  /* unreachable from Node — assume it may be serving `dist/` and check it */
  return true;
}

export async function assertLocalBundleIsDev(): Promise<void> {
  const base = process.env.SA_E2E_BASE_URL ?? "";
  if (!/^https?:\/\/(localhost|127\.0\.0\.1)/.test(base)) return;
  if (!(await servesBuiltBundle(base))) return;
  const dir = resolve(process.cwd(), "dist/assets");
  if (!existsSync(dir)) throw new Error(`No dist/ to serve. Run \`npm run build:dev\` first.`);
  const js = readdirSync(dir).filter((f) => f.endsWith(".js"));
  const bundle = js.map((f) => readFileSync(resolve(dir, f), "utf8")).join("");
  if (bundle.includes(PROD_PROJECT_ID)) {
    throw new Error(
      `dist/ is a PRODUCTION bundle (${PROD_PROJECT_ID} present) and ${base} is serving it. ` +
      `Measuring would point the harness account at prod. Run \`npm run build:dev\` and retry — ` +
      `a production build from any session in this checkout overwrites dist/.`,
    );
  }

  /**
   * ⚠️ AND A DEV BUNDLE CAN STILL BE THE WRONG PAGE — IT CAN BE YESTERDAY'S (pane round, Phase 5).
   * The local server serves `dist/`, not source, so a measurement taken after an edit measures the
   * LAST BUILD. That is not a theoretical gap: two assertions reported a heading and a primary as
   * empty strings when both were on the page and correct, because `dist/` predated the chassis that
   * introduced their elements. It reads exactly like a feature that did not land — which is the
   * same false-report shape the prod check above exists for, one degree milder.
   *
   * The newest source file against the newest bundle settles it. Anything under `src/` counts,
   * because anything under `src/` reaches the bundle.
   */
  const newest = (root: string): number => {
    let t = 0;
    for (const e of readdirSync(root, { withFileTypes: true })) {
      if (e.name.startsWith(".")) continue;
      const p = resolve(root, e.name);
      t = Math.max(t, e.isDirectory() ? newest(p) : statSync(p).mtimeMs);
    }
    return t;
  };
  const srcAt = newest(resolve(process.cwd(), "src"));
  const distAt = Math.max(...js.map((f) => statSync(resolve(dir, f)).mtimeMs));
  if (srcAt > distAt) {
    const mins = Math.round((srcAt - distAt) / 60000);
    throw new Error(
      `dist/ is STALE: src/ was edited ${mins} minute(s) after the bundle was built, and ${base} ` +
      `serves the bundle. Measuring now would report your edit as absent. Run \`npm run build:dev\`.`,
    );
  }
}

/** The prod project id, the one string that must never appear in a locally-served bundle. */
const PROD_PROJECT_ID = "gen-lang-client-0801391782";
