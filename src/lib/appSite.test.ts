/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * App site v1, Phase 3 — two sites in each project, each with its own build.
 *
 *   prod  queryhawk.net      site scriptally-app          firebase.json             build:prod      dist/          landing only
 *   prod  app.queryhawk.net  site queryhawk-app           firebase.app.json         build:prod-app  dist-app/      the whole app
 *   dev   (landing mirror)   site scriptally-dev-landing  firebase.dev-landing.json build:dev-landing dist-landing/ landing only
 *   dev   (app)              site scriptally-dev          firebase.dev.json         build:dev       dist/          the whole app
 *
 * ⚠️ queryhawk.net IS UNCHANGED. Its config, its build script and its output folder are the ones it had; the app
 *    site is a second config beside it, built into its own folder, so neither build can overwrite the other.
 * ⚠️ THE APP SITE HAS THE LANDING'S REWRITES BUT NOT ITS REDIRECTS. The redirect sends every path but the landing's
 *    own pages to `/`, which on the app site would send /dashboard home.
 * ⚠️ A BUILD CHECK SAYS WHICH KIND IT IS (scripts/assert-site-mode.mjs): a landing bundle has a PublicRoot chunk and
 *    no AppRoot; an app bundle the reverse (main.tsx drops the other branch).
 */
import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";
import { CONFIGS } from "../../scripts/csp.mjs";

const ROOT = process.cwd();
const read = (f: string) => readFileSync(join(ROOT, f), "utf8");
const json = (f: string) => JSON.parse(read(f));
const live = json("firebase.json").hosting;
const app = json("firebase.app.json");
const devLanding = json("firebase.dev-landing.json");
const scripts = json("package.json").scripts as Record<string, string>;

describe("queryhawk.net stays as it is", () => {
  it("firebase.json still serves site scriptally-app from dist/, with the landing's redirect and the waitlist", () => {
    expect(live.site).toBe("scriptally-app");
    expect(live.public).toBe("dist");
    expect(live.redirects).toHaveLength(1);
    expect(live.rewrites.slice(0, 2).map((r: { source: string }) => r.source)).toEqual(["/api/waitlist", "/api/waitlist/**"]);
  });
  it("its build script is unchanged and still landing-only", () => {
    expect(scripts["build:prod"]).toBe("node scripts/check-design-refs.mjs && vite build --mode production && node scripts/assert-build-target.mjs prod");
    expect(read(".env.production")).toMatch(/^VITE_LANDING_ONLY=true$/m);
  });
});

describe("the prod app site", () => {
  it("is its own site, served from its own folder, hosting only", () => {
    expect(Object.keys(app)).toEqual(["hosting"]);
    expect(app.hosting.site).toBe("queryhawk-app");
    expect(app.hosting.public).toBe("dist-app");
  });
  it("has the landing's rewrites and headers' shape, and no redirect", () => {
    expect(app.hosting.rewrites).toEqual(live.rewrites);
    expect(app.hosting.redirects).toBeUndefined();
    expect(app.hosting.headers.map((h: { source: string }) => h.source)).toEqual(live.headers.map((h: { source: string }) => h.source));
  });
  it("never uploads a source map", () => {
    expect(app.hosting.ignore).toContain("**/*.map");
  });
  it("is built as the whole app, for prod, into dist-app, with hidden source maps for Sentry", () => {
    const b = scripts["build:prod-app"];
    expect(b).toContain("VITE_LANDING_ONLY=false");
    expect(b).toContain("NODE_OPTIONS=--max-old-space-size=8192"); // source maps need the room
    expect(b).toContain("SA_SOURCEMAPS=hidden");
    expect(b).toContain("vite build --mode production --outDir dist-app");
    expect(b).toContain("node scripts/assert-build-target.mjs prod dist-app");
    expect(b).toContain("node scripts/assert-site-mode.mjs app dist-app");
  });
  it("its security headers are written by scripts/csp.mjs, report-only like the landing's", () => {
    expect(CONFIGS).toContainEqual({ file: "firebase.app.json", env: ".env.production", csp: "report-only", kind: "app" });
  });
});

describe("the dev mirror", () => {
  it("the dev landing site carries prod's landing redirect and rewrites", () => {
    expect(devLanding.hosting.site).toBe("scriptally-dev-landing");
    expect(devLanding.hosting.public).toBe("dist-landing");
    expect(devLanding.hosting.redirects).toEqual(live.redirects);
    expect(devLanding.hosting.rewrites).toEqual(live.rewrites);
    expect(CONFIGS).toContainEqual({ file: "firebase.dev-landing.json", env: ".env.development", csp: "enforce", kind: "app" });
  });
  it("is built landing-only for dev into dist-landing", () => {
    const b = scripts["build:dev-landing"];
    expect(b).toContain("VITE_LANDING_ONLY=true");
    expect(b).toContain("vite build --mode development --outDir dist-landing");
    expect(b).toContain("node scripts/assert-build-target.mjs dev dist-landing");
    expect(b).toContain("node scripts/assert-site-mode.mjs landing dist-landing");
  });
  it("the dev app is scriptally-dev as before", () => {
    expect(json("firebase.dev.json").hosting.site).toBe("scriptally-dev");
    expect(scripts["build:dev"]).toContain("node scripts/assert-site-mode.mjs app dist");
  });
});

describe("the pieces the two builds share", () => {
  it("each build folder is ignored by git", () => {
    const gi = read(".gitignore");
    expect(gi).toMatch(/^dist-app\/$/m);
    expect(gi).toMatch(/^dist-landing\/$/m);
  });
  it("source maps are made only when asked for, so every other build is as it was", () => {
    expect(read("vite.config.ts")).toContain("sourcemap: process.env.SA_SOURCEMAPS === 'hidden' ? ('hidden' as const) : false");
  });
  it("a refused writer is sent to each tier's landing site", () => {
    expect(read(".env.production")).toMatch(/^VITE_LANDING_URL=https:\/\/queryhawk\.net$/m);
    expect(read(".env.development")).toMatch(/^VITE_LANDING_URL=https:\/\/scriptally-dev-landing\.web\.app$/m);
  });
  it("the waitlist accepts each site's own origin", () => {
    const m = read("functions/src/waitlistModel.ts");
    for (const o of ["https://app.queryhawk.net", "https://queryhawk-app.web.app", "https://scriptally-dev-landing.web.app"]) expect(m).toContain(`"${o}",`);
  });
});
