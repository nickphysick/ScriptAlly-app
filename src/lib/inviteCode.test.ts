/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The founder's code — the client half (non-workspace v1, Phase 1). Re-pointed from the beta invite locks.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "fs";
import { resolve, join } from "path";
import {
  codeFromPath, formatCodeInput, looksLikeInviteCode, normaliseInviteCode, readCodeStatus, codeError, CODE_PLACEHOLDER, CODE_REFUSED,
} from "./inviteCode";

describe("normalising and masking a code", () => {
  it("upper-cases and strips spaces", () => {
    expect(normaliseInviteCode("  qh-7k2m-9xtd ")).toBe("QH-7K2M-9XTD");
  });
  /** ⚠️ THE EM DASH IS NOT PEDANTRY: a code rejected for a character the writer cannot see is the worst first impression. */
  it("folds every dash a mail client might substitute", () => {
    for (const dash of ["‐", "‑", "–", "—", "―", "−"]) expect(normaliseInviteCode(`QH${dash}7K2M${dash}9XTD`)).toBe("QH-7K2M-9XTD");
  });
  it("the ref's input mask: hyphens after 2 and 6, 12 characters at most", () => {
    expect(formatCodeInput("qh7k2m9xtd")).toBe("QH-7K2M-9XTD");
    expect(formatCodeInput("QH-7K2M-9XTDZZZ")).toBe("QH-7K2M-9XTD");
    expect(formatCodeInput("q")).toBe("Q");
    expect(CODE_PLACEHOLDER).toBe("QH-XXXX-XXXX");
  });
  it("only the whole code is worth asking the server about", () => {
    expect(looksLikeInviteCode("QH-7K2M")).toBe(false);
    expect(looksLikeInviteCode("QH-7K2M-9XTD")).toBe(true);
  });
});

describe("the code in the invite link", () => {
  it("reads /join/<code>", () => {
    expect(codeFromPath("/join/QH-7K2M-9XTD")).toBe("QH-7K2M-9XTD");
    expect(codeFromPath("/join/qh-7k2m-9xtd/")).toBe("QH-7K2M-9XTD");
    expect(codeFromPath("/dashboard")).toBeNull();
    expect(codeFromPath("/join/%E0%A4%A")).not.toBeNull(); // a broken escape is just an unknown code, never a crash
  });
});

describe("reading the server's answer", () => {
  /* Re-pointed (v1.1): "unknown" and "used" are one outcome, "refused". */
  it("anything unrecognised is refused, never ok — and a used code reads the same as an unknown one", () => {
    expect(readCodeStatus(null).status).toBe("refused");
    expect(readCodeStatus({ status: "yes" }).status).toBe("refused");
    expect(readCodeStatus({ status: "used" })).toEqual(readCodeStatus({ status: "unknown" }));
    expect(readCodeStatus({ status: "used" })).toEqual({ status: "refused" });
    expect(codeError(readCodeStatus({ status: "used" }))).toBe(CODE_REFUSED);
    expect(codeError(readCodeStatus({ status: "ok", email: null }))).toBeUndefined();
    expect(readCodeStatus({ status: "ok", email: "a@b.co", foundingNo: 3 })).toEqual({ status: "ok", email: "a@b.co", name: null, foundingNo: 3 });
  });
});

describe("⚠️ \"founder's code\", never \"invite code\", in anything a reader can see", () => {
  /* Every string literal in the app and the functions, with comments removed. A comment may still say invite. */
  const roots = [resolve(__dirname, ".."), resolve(__dirname, "../../functions/src")];
  const files: string[] = [];
  const walk = (d: string) => {
    for (const n of readdirSync(d)) {
      const p = join(d, n);
      if (statSync(p).isDirectory()) { if (n !== "node_modules") walk(p); continue; }
      if (/\.(ts|tsx)$/.test(n) && !/\.(test|spec)\./.test(n)) files.push(p);
    }
  };
  roots.forEach(walk);
  it("the sweep found the files", () => expect(files.length).toBeGreaterThan(500));
  it("no string literal says invite code", () => {
    const hits: string[] = [];
    for (const f of files) {
      const src = readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "").replace(/\{\/\*[\s\S]*?\*\/\}/g, "");
      const lits = src.match(/"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`/g) ?? [];
      for (const l of lits) if (/invite[\s-]code/i.test(l)) hits.push(`${f.split("/src/").pop()}: ${l.slice(0, 80)}`);
    }
    expect(hits).toEqual([]);
  });
});

describe("the gate is armed on dev only", () => {
  it("reads the bundle's project, so prod's build is off", () => {
    const beta = readFileSync(resolve(__dirname, "beta.ts"), "utf8");
    expect(beta).toContain('export const INVITE_GATE_ENABLED: boolean = import.meta.env.VITE_FIREBASE_PROJECT_ID === "scriptally-dev";');
  });
});
