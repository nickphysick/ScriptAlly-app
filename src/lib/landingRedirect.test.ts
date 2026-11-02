/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * RED-1, the unit half (launch readiness, 2 Nov): the live site's hosting 301 in firebase.json is the
 * regex scripts/landingRedirect.mjs builds, and it sends every unfinished or unknown page home while
 * leaving the three live pages, the assets and the API alone. The rendered half (a real hosting server
 * following the 301) is tests/e2e/launchRedirect.public.ts.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { landingRedirectRegex, KEEP } from "../../scripts/landingRedirect.mjs";

const json = (f: string) => JSON.parse(readFileSync(join(process.cwd(), f), "utf8"));
const re = new RegExp(landingRedirectRegex());

describe("RED-1 · the live site's hosting redirect", () => {
  it("firebase.json carries exactly the generated regex, as a 301 to /, ahead of nothing else", () => {
    const r = json("firebase.json").hosting.redirects;
    expect(r).toEqual([{ regex: landingRedirectRegex(), destination: "/", type: 301 }]);
  });
  it("the dev config has no redirect (the whole app stays reachable there)", () => {
    expect(json("firebase.dev.json").hosting.redirects).toBeUndefined();
  });
  it("sends the unfinished and unknown pages home", () => {
    for (const p of ["/pricing", "/about", "/contact", "/founders", "/terms", "/terms/", "/dashboard", "/queries/analytics",
      "/nonsense", "/a", "/w", "/welcomes", "/welcom", "/privacy-old", "/apis", "/imagesx", "/status", "/Welcome"]) {
      expect(re.test(p), p).toBe(true);
    }
  });
  it("leaves the live pages, the assets, the images and the API alone", () => {
    for (const p of ["/", "/welcome", "/welcome/", "/privacy", "/api/waitlist", "/api/waitlist/verify",
      "/assets/index-abc.js", "/images/og-share.png", "/status-dots/x.svg", "/favicon.ico", "/index.html",
      "/apple-touch-icon.png", "/manifest.webmanifest"]) {
      expect(re.test(p), p).toBe(false);
    }
  });
  it("KEEP is the three-page rule plus the top-level folders that hold files", () => {
    expect(KEEP).toEqual(["welcome", "privacy", "api", "assets", "images", "status-dots"]);
  });
});
