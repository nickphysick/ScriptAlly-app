/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * CONFIRM-1 (2 Nov, live): the founding confirm link landed on Firebase's "Page Not Found".
 *
 * The link and the function were both right — the verify answered 302 to `/welcome?v=verified`.
 * What failed was HOSTING: the SPA catch-all regex was written for a match ANYWHERE in the path, and
 * Firebase Hosting matches the WHOLE path (the stored live config shows a `$` appended). Under that
 * rule it covered only "/" and paths of one to seven characters, so /welcome and /privacy were 404s.
 * The STALE-1 suite went green over it because it tested with JavaScript's `RegExp.test`, which
 * matches anywhere. These locks test the way Hosting does.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { SPA_REWRITE_REGEX } from "../../scripts/landingRedirect.mjs";
import { resolveMailConfig, verifyLink, PUBLIC_URL_ENV } from "../../functions/src/emailConfig";

const ROOT = process.cwd();
const read = (f: string) => readFileSync(join(ROOT, f), "utf8");
const live = JSON.parse(read("firebase.json"));

/** Firebase Hosting matches a rewrite regex against the WHOLE path, as if anchored at both ends. */
const hostingMatches = (re: string, path: string) => new RegExp(`^(?:${re})$`).test(path);

describe("CONFIRM-1 · the founding confirm link reaches a page", () => {
  it("L1 · the verify link is on https://queryhawk.net, and live's env template says so", () => {
    const cfg = resolveMailConfig({ [PUBLIC_URL_ENV]: "https://queryhawk.net" });
    expect(verifyLink(cfg, "tok")).toBe("https://queryhawk.net/api/waitlist/verify?token=tok");
    const tpl = read("functions/.env.example");
    const block = tpl.split("---- functions/.env.gen-lang-client-0801391782 ----")[1] ?? "";
    expect(block, "the live block is missing from the template").not.toBe("");
    expect(block.match(/^#\s*WAITLIST_PUBLIC_URL=(\S+)\s*$/m)?.[1]).toBe("https://queryhawk.net");
  });

  it("L2 · live rewrites /api/waitlist and /api/waitlist/** to waitlist in europe-west2", () => {
    const fn = (src: string) =>
      live.hosting.rewrites.find((r: { source?: string }) => r.source === src)?.function;
    for (const src of ["/api/waitlist", "/api/waitlist/**"]) {
      expect(fn(src), src).toEqual({ functionId: "waitlist", region: "europe-west2" });
    }
  });

  it("L3 · under Hosting's whole-path match, every page reaches the app and /assets/ files do not", () => {
    const catchAll = live.hosting.rewrites[live.hosting.rewrites.length - 1];
    expect(catchAll.destination).toBe("/index.html");
    for (const p of ["/", "/welcome", "/privacy", "/dashboard", "/queries/analytics", "/a", "/as",
      "/assets", "/assetsx", "/assetsx/y", "/agents", "/x/assets/y", "/status-dots"]) {
      expect(hostingMatches(catchAll.regex, p), p).toBe(true);
    }
    for (const p of ["/assets/", "/assets/PublicRoot-OLDHASH.js", "/assets/x/y.css"]) {
      expect(hostingMatches(catchAll.regex, p), p).toBe(false);
    }
    expect(catchAll.regex).toBe(SPA_REWRITE_REGEX);
  });
});
