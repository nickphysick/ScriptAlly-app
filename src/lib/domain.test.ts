/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The domain move — QueryHawk on queryhawk.net, scriptally.ink retired (17 Oct).
 *
 * ⚠️ THERE IS NO TRANSITION PERIOD. scriptally.ink has been deleted from Resend, so a FROM on it is
 * REJECTED — a sign-up would succeed and its confirmation would never arrive, which nobody sees
 * until a founding writer asks where their email went. These locks read the shipping sources with
 * comments stripped (a comment recording what used to be true is history, not a value).
 *
 * The Firebase ids `scriptally-app`, `scriptally-dev` and `gen-lang-client-…` are infrastructure
 * names, not the brand, and none of these assertions touches them.
 */

import { readFileSync, readdirSync, statSync, existsSync } from "fs";
import { join, relative } from "path";
import { describe, expect, it } from "vitest";
import { ALLOWED_ORIGINS } from "../../functions/src/waitlistModel";

const ROOT = process.cwd();
const TEXT = /\.(ts|tsx|js|mjs|cjs|css|json|html)$/;
const isTest = (p: string) => /\.(test|spec)\.[cm]?[jt]sx?$/.test(p) || /(^|\/)test\//.test(p);

/**
 * ⚠️ `//` IS STRIPPED ONLY WHERE IT IS NOT PART OF A URL. A naive `\/\/[^\n]*` turns
 * `"https://scriptally.ink"` into `"https:` and every check below passes vacuously over the very
 * strings it exists to find.
 */
const stripCode = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`\w])\/\/[^\n]*/g, "$1");
const stripEnv = (s: string) => s.replace(/^\s*#[^\n]*$/gm, "");

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    if (n === "node_modules") return [];
    return statSync(p).isDirectory() ? walk(p) : [p];
  });

const envFiles = (dir: string) =>
  existsSync(dir) ? readdirSync(dir).filter((n) => n.startsWith(".env")).map((n) => join(dir, n)) : [];

/** Every shipping source, comments stripped, keyed by repo-relative path. */
const sources = (): Map<string, string> => {
  const out = new Map<string, string>();
  for (const p of [...walk(join(ROOT, "src")), ...walk(join(ROOT, "functions/src"))]) {
    const rel = relative(ROOT, p);
    if (!TEXT.test(p) || isTest(rel)) continue;
    out.set(rel, stripCode(readFileSync(p, "utf8")));
  }
  for (const p of [...envFiles(ROOT), ...envFiles(join(ROOT, "functions"))]) {
    out.set(relative(ROOT, p), stripEnv(readFileSync(p, "utf8")));
  }
  return out;
};

const offenders = (needle: RegExp) =>
  [...sources()].filter(([, body]) => needle.test(body)).map(([path]) => path);

const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");

describe("the domain move to queryhawk.net", () => {
  it("D0 · the sweep reads a real population, including the files the move is about", () => {
    const s = sources();
    expect(s.size).toBeGreaterThan(200);
    for (const f of [
      "src/lib/companyInfo.ts", "functions/src/emailConfig.ts", "functions/src/emailCopy.ts",
      "functions/src/unsubscribePage.ts", "functions/src/waitlistModel.ts",
      "functions/.env.scriptally-dev", "functions/.env.example",
    ]) expect(s.has(f), f).toBe(true);
    /* The stripper must leave a URL inside a string whole, or D1 passes over nothing. */
    expect(stripCode(`const u = "https://scriptally.ink"; // note`)).toContain("https://scriptally.ink");
    expect(stripCode(`const u = 1; // scriptally.ink`)).not.toContain("scriptally.ink");
  });

  it("D1 · nothing that ships names scriptally.ink", () => {
    expect(offenders(/scriptally\.ink/i), "scriptally.ink is retired and deleted from Resend").toEqual([]);
  });

  it("D2 · no queryhawk.ink anywhere, and the emails and the unsubscribe page say QueryHawk", () => {
    expect(offenders(/queryhawk\.ink/i)).toEqual([]);
    const s = sources();
    for (const f of ["functions/src/emailCopy.ts", "functions/src/unsubscribePage.ts"]) {
      expect(s.get(f), f).not.toMatch(/ScriptAlly/);
      expect(s.get(f), f).toMatch(/QueryHawk/);
    }
  });

  it("D3 · the waitlist accepts queryhawk.net and refuses scriptally.ink", () => {
    expect(ALLOWED_ORIGINS).toContain("https://queryhawk.net");
    expect(ALLOWED_ORIGINS).toContain("https://www.queryhawk.net");
    /* Dev lives at dev.queryhawk.net, and a browser POST always carries Origin, so it must be listed. */
    expect(ALLOWED_ORIGINS).toContain("https://dev.queryhawk.net");
    expect(ALLOWED_ORIGINS.filter((o) => /scriptally\.ink/i.test(o))).toEqual([]);
    /* The Firebase site ids are infrastructure and stay reachable. */
    expect(ALLOWED_ORIGINS).toContain("https://scriptally-app.web.app");
    expect(ALLOWED_ORIGINS).toContain("https://scriptally-dev.web.app");
  });

  it("D4 · dev states its sender explicitly, on queryhawk.net", () => {
    const env = stripEnv(read("functions/.env.scriptally-dev"));
    const value = (key: string) =>
      env.match(new RegExp(`^\\s*${key}\\s*=\\s*(.+?)\\s*$`, "m"))?.[1]?.replace(/^"(.*)"$/, "$1");
    const from = value("WAITLIST_FROM");
    expect(from, "WAITLIST_FROM must be stated, not left to the code's default").toBeTruthy();
    expect(
      from!.replace(/>$/, ""),
      "Resend no longer has scriptally.ink, so any other FROM is rejected and no email arrives",
    ).toMatch(/@queryhawk\.net$/);
    for (const key of ["WAITLIST_REPLY_TO", "WAITLIST_CONTACT_EMAIL"]) {
      expect(value(key), key).toMatch(/@queryhawk\.net$/);
    }
  });

  it("D5 · the server and the client publish one support address", () => {
    const grab = (rel: string) =>
      stripCode(read(rel)).match(/export const SUPPORT_EMAIL\s*=\s*"([^"]+)"/)?.[1];
    const server = grab("functions/src/emailConfig.ts");
    const client = grab("src/lib/companyInfo.ts");
    expect(server).toBeTruthy();
    expect(client).toBeTruthy();
    expect(server).toBe(client);
  });
});
