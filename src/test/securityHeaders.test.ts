/**
 * Security headers v1 (audit 2026-11-07, High 3). The headers live in ONE place, scripts/csp.mjs;
 * this suite fails if a hosting config stops carrying exactly what that file would write, so prod
 * and dev cannot drift by hand-editing one JSON.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { CONFIGS, applied, headersFor, appPolicy, projectOf, serialise } from "../../scripts/csp.mjs";

type Header = { key: string; value: string };
type Cfg = { file: string; env: string; csp: string; kind: string };

const read = (f: string) => JSON.parse(readFileSync(f, "utf8"));
const allBlock = (json: { hosting: { headers: { source: string; headers: Header[] }[] } }) =>
  json.hosting.headers.find((h) => h.source === "**")!.headers;

describe("security headers", () => {
  it("every hosting config carries exactly what scripts/csp.mjs writes", () => {
    for (const cfg of CONFIGS as Cfg[]) {
      const json = read(cfg.file);
      expect(json, `${cfg.file} differs from scripts/csp.mjs — run node scripts/csp.mjs --write`).toEqual(applied(cfg, json));
    }
  });

  it("the Cache-Control blocks are untouched", () => {
    for (const cfg of (CONFIGS as Cfg[]).filter((c) => c.kind === "app")) {
      const json = read(cfg.file);
      expect(allBlock(json).find((h) => h.key === "Cache-Control")?.value).toBe("no-cache, no-store, must-revalidate");
      expect(json.hosting.headers.find((h: { source: string }) => h.source === "/assets/**").headers)
        .toEqual([{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }]);
    }
  });

  it("no script allowance is unsafe, wildcard or a whole scheme; Google Analytics is not allowed", () => {
    for (const cfg of CONFIGS as Cfg[]) {
      const csp = (headersFor(cfg) as Header[])[0].value;
      const script = csp.split("; ").find((d) => d.startsWith("script-src"))!;
      expect(script).not.toMatch(/unsafe-inline|unsafe-eval|\*| https:(\s|$)/);
      expect(csp).not.toMatch(/\*|googletagmanager|google-analytics/);
      expect(csp).toMatch(/object-src 'none'/);
      expect(csp).toMatch(/frame-ancestors 'none'/);
    }
  });

  it("the app policy differs between projects only in the project's own origins", () => {
    const dev = serialise(appPolicy(projectOf(".env.development")));
    const prod = serialise(appPolicy(projectOf(".env.production")));
    const norm = (s: string) => s.replace(/scriptally-dev|gen-lang-client-0801391782/g, "<project>");
    expect(norm(dev)).toBe(norm(prod));
    expect(dev).not.toBe(prod);
  });
});
