/**
 * Google Analytics waits for consent. These read SOURCE (no jsdom here), so they lock the shape
 * that makes "nothing before Accept" true rather than simulating a browser.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const src = readFileSync(resolve(process.cwd(), "src/marketing/analytics.ts"), "utf8");
const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
const body = (name: string) => {
  const i = code.indexOf(`export const ${name} =`);
  expect(i, `${name} exists`).toBeGreaterThan(-1);
  const j = code.indexOf("\nexport const ", i + 1);
  return code.slice(i, j === -1 ? undefined : j);
};

describe("analytics loads only with consent", () => {
  it("the script tag is created in exactly one place, the private load()", () => {
    expect(code.match(/googletagmanager\.com\/gtag\/js/g)?.length).toBe(1);
    expect(code.match(/document\.head\.appendChild/g)?.length).toBe(1);
    expect(code).toMatch(/const load = \(\): void =>/);
  });

  it("load() is reached only from a stored 'granted' or from Accept", () => {
    expect(body("initAnalytics")).toMatch(/readConsent\(\) === "granted"\) load\(\)/);
    expect(body("grantAnalytics")).toContain("load()");
    for (const name of ["denyAnalytics", "reopenConsent", "trackPageView", "trackSignUp"]) {
      expect(body(name), `${name} must not load GA`).not.toContain("load()");
    }
  });

  it("nothing is sent without consent, and no personal data is sent with a sign-up", () => {
    expect(code).toMatch(/readConsent\(\) !== "granted"\) return;/);
    expect(body("trackSignUp")).not.toMatch(/email/i);
  });

  it("the id comes only from the build env, never a literal", () => {
    expect(code).not.toMatch(/G-[A-Z0-9]{6,}/);
    expect(code).toContain("import.meta.env.VITE_GA_MEASUREMENT_ID");
  });
});
