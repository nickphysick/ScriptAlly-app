/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * CF-1, the build half (launch readiness, 2 Nov): with a token there is exactly one Cloudflare beacon
 * in the page; without one there is none; a malformed token is refused. The served live page is read in
 * tests/e2e/launchMeta.public.ts, and .env.development must not count dev visits.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { injectBeacon, BEACON_SRC } from "../../scripts/cfBeacon.mjs";

const html = "<!doctype html><html><head><title>x</title></head><body></body></html>";
const count = (h: string) => h.split(BEACON_SRC).length - 1;
const TOKEN = "ee52cb1f15964230836ca4f32696fbfb";

describe("CF-1 · the Cloudflare beacon", () => {
  it("with the token: exactly one tag, Cloudflare's own snippet, before </head>", () => {
    const out = injectBeacon(html, TOKEN);
    expect(count(out)).toBe(1);
    expect(out).toContain(`<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token": "${TOKEN}"}'></script>`);
    expect(out.indexOf(BEACON_SRC)).toBeLessThan(out.indexOf("</head>"));
    expect(count(injectBeacon(out, TOKEN)), "never twice").toBe(1);
  });
  it("without the token: nothing", () => {
    expect(injectBeacon(html, undefined)).toBe(html);
    expect(injectBeacon(html, "")).toBe(html);
  });
  it("a malformed token is refused, not written into the page", () => {
    expect(() => injectBeacon(html, `x"><script>alert(1)</script>`)).toThrow();
  });
  it("the token is the live build's alone", () => {
    const env = (f: string) => readFileSync(join(process.cwd(), f), "utf8");
    expect(env(".env.production")).toMatch(new RegExp(`^VITE_CF_BEACON_TOKEN=${TOKEN}$`, "m"));
    expect(env(".env.development")).not.toContain("VITE_CF_BEACON_TOKEN");
  });
});
