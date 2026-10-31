/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The live Hosting config — `firebase.json` serves queryhawk.net from site `scriptally-app`.
 *
 * ⚠️ LIVE'S HOSTING MUST BEHAVE LIKE DEV'S, APART FROM WHICH SITE IT IS. Two things went missing
 * when only dev's config grew:
 *   - THE WAITLIST REWRITES. Without them `/api/waitlist` falls through to the SPA catch-all and
 *     answers `200 text/html`. That is a failure that looks like a success, and every founding
 *     sign-up on live would fail as `down`. The pair is a glob each: the bare path alone leaves
 *     `/verify` and `/unsubscribe` on the catch-all.
 *   - THE CACHE HEADERS. Without them Hosting's default `max-age=3600` keeps the old page in front
 *     of readers for an hour after a deploy. `index.html` must never be cached; the hashed assets
 *     must be cached for ever.
 * So the lock compares live with DEV, read from both files, and never with a literal: a change to
 * dev's hosting that live does not follow goes red here.
 */

import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const json = (f: string) => JSON.parse(readFileSync(join(ROOT, f), "utf8"));
const live = json("firebase.json");
const dev = json("firebase.dev.json");
const envDb = readFileSync(join(ROOT, ".env.production"), "utf8")
  .match(/^\s*VITE_FIREBASE_DATABASE_ID\s*=\s*(\S+)\s*$/m)?.[1];

describe("the live Hosting config follows dev's", () => {
  it("L1 · live's rewrites equal dev's, waitlist pair ahead of the catch-all", () => {
    expect(live.hosting.rewrites).toEqual(dev.hosting.rewrites);
    const sources = live.hosting.rewrites.map((r: { source: string }) => r.source);
    expect(sources.indexOf("/api/waitlist")).toBeGreaterThanOrEqual(0);
    expect(sources.indexOf("/api/waitlist/**")).toBeGreaterThanOrEqual(0);
    expect(sources.indexOf("**"), "the catch-all must come last").toBe(sources.length - 1);
  });

  it("L2 · live's headers equal dev's: no-cache for the page, immutable for /assets/**", () => {
    expect(live.hosting.headers).toEqual(dev.hosting.headers);
    const assets = live.hosting.headers?.find((h: { source: string }) => h.source === "/assets/**");
    expect(assets?.headers?.[0]?.value, "without it a returning reader keeps the old bundle").toContain("immutable");
  });

  it("L3 · everything else in live's hosting block equals dev's, apart from `site`", () => {
    const strip = ({ site: _s, ...rest }: Record<string, unknown>) => rest;
    expect(strip(live.hosting)).toEqual(strip(dev.hosting));
    expect(live.hosting.site).toBe("scriptally-app");
  });

  it("L4 · live's Firestore database is the named id the production build reads", () => {
    expect(envDb).toBeTruthy();
    expect(envDb).not.toBe("(default)");
    expect(live.firestore.database).toBe(envDb);
  });
});
