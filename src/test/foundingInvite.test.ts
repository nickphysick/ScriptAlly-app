/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Non-workspace v1, 9d — the founder's invite script (scripts/founding-invite.ts).
 * INV-1: the dry run (the default) creates no code doc, reads no project, sends nothing, and touches no network.
 * INV-2: sending needs --send AND --confirm, then only confirmed founders, a created code each, through sendEmail.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { run, readWriters, type RunDeps, type LiveDeps } from "../../scripts/founding-invite";
import { CODE_RE, newFounderCode, CODE_ALPHABET } from "../../functions/src/inviteEmail";

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

const rigOf = (readDoc?: LiveDeps["readDoc"]) => {
  const files = new Map<string, string>();
  const live = {
    readDoc: readDoc ?? vi.fn(async (_p: string) => ({ status: "verified", foundingNumber: 14 }) as Record<string, unknown>),
    createDoc: vi.fn(async (_p: string, _f: Record<string, unknown>) => {}),
    send: vi.fn(async () => ({ ok: true })),
    emailHash: (e: string) => `h-${e}`,
  };
  let n = 0;
  const deps: RunDeps = {
    log: () => {},
    write: (p, b) => { files.set(p, b); },
    mkdir: () => {},
    now: () => Date.UTC(2026, 10, 12, 22, 0),
    newCode: () => (n++ === 0 ? "QH-7K2M-9XTD" : "QH-ABCD-EFGH"),
    live: vi.fn(async () => live),
  };
  return { deps, live, files };
};

const WRITERS = ["--writer", "maya@example.com,14", "--writer", "tom@example.com,15"];

describe("INV-1 · the dry run writes no Firestore doc and sends nothing", () => {
  for (const extra of [[], ["--send"], ["--confirm"], ["--project", "scriptally-dev"]]) {
    it(`args ${JSON.stringify(extra)}: renders to files, never reaches the live half or the network`, async () => {
      const net = vi.fn(async () => { throw new Error("network touched"); });
      vi.stubGlobal("fetch", net);
      const r = rigOf();
      const out = await run([...WRITERS, ...extra, "--out", "/tmp/never-written"], r.deps);
      expect(out).toEqual({ mode: "dry-run", rendered: 2, created: 0, sent: 0 });
      expect(r.deps.live).not.toHaveBeenCalled();
      expect(r.live.createDoc).not.toHaveBeenCalled();
      expect(r.live.send).not.toHaveBeenCalled();
      expect(net).not.toHaveBeenCalled();
      expect([...r.files.keys()].map((p) => p.split("/").pop())).toEqual(["01-QH-7K2M-9XTD.html", "01-QH-7K2M-9XTD.txt", "02-QH-ABCD-EFGH.html", "02-QH-ABCD-EFGH.txt"]);
    });
  }
  it("what it renders is the invite, with the code in the /join link, and no recipient address anywhere in a file", async () => {
    const r = rigOf();
    await run(WRITERS, r.deps);
    const [html, text] = [...r.files.values()];
    expect(html).toContain('href="https://scriptally-app.web.app/join/QH-7K2M-9XTD"');
    expect(text).toContain("Subject: Your QueryHawk invite: your wave is open");
    for (const body of r.files.values()) expect(body).not.toMatch(/maya@example\.com|tom@example\.com/);
  });
  it("the live half (REST client, transport) is loaded only inside `live`, never at the top of the module", () => {
    const s = readFileSync(new URL("../../scripts/founding-invite.ts", import.meta.url), "utf8");
    /* Comments and type-only imports are erased; what is left is what a dry run loads. */
    const top = s.slice(0, s.indexOf("const realDeps")).replace(/\/\*[\s\S]*?\*\//g, "").replace(/^import type [^\n]*$/gm, "");
    expect(top).not.toMatch(/adminRest|functions\/src\/email"|firebase-admin|firebase\/app/);
    expect(s.indexOf('if (!(send && confirm))')).toBeLessThan(s.indexOf("await deps.live(argv)"));
  });
});

describe("INV-2 · --send --confirm: confirmed founders only, one created code each, sent through sendEmail", () => {
  it("creates the code doc with the gate's fields and an exists:false precondition, then sends", async () => {
    vi.stubEnv("WAITLIST_PUBLIC_URL", "https://queryhawk.net");
    vi.stubEnv("APP_PUBLIC_URL", "https://scriptally-app.web.app");
    vi.stubEnv("WAITLIST_IP_SALT", "s");
    vi.stubEnv("RESEND_API_KEY", "k");
    vi.spyOn(console, "log").mockImplementation(() => {});
    const r = rigOf(vi.fn(async (p: string) => (p.includes("tom") ? { status: "pending" } : { status: "verified", foundingNumber: 14 })));
    const out = await run([...WRITERS, "--project", "scriptally-dev", "--send", "--confirm"], r.deps);
    expect(out).toEqual({ mode: "sent", rendered: 1, created: 1, sent: 1 });
    expect(r.live.createDoc).toHaveBeenCalledTimes(1);
    const [path, fields] = r.live.createDoc.mock.calls[0];
    expect(path).toBe("inviteCodes/QH-7K2M-9XTD");
    expect(Object.keys(fields).sort()).toEqual(["createdAt", "foundingNo", "issuedToEmail", "linkExpiresAt", "name"]);
    expect(fields.linkExpiresAt).toEqual({ timestampValue: new Date(Date.UTC(2026, 10, 12, 22, 0) + 48 * 3600e3).toISOString() });
    expect(fields.foundingNo).toEqual({ integerValue: "14" });
    expect(r.live.send).toHaveBeenCalledTimes(1);
    vi.unstubAllEnvs();
  });
  it("the live half names its project and carries the live opt-in (adminRest target), and sends as kind 'invite'", () => {
    const s = readFileSync(new URL("../../scripts/founding-invite.ts", import.meta.url), "utf8");
    expect(s).toContain("const t = target(USAGE);");
    expect(s).toContain('sendEmail(to, "invite", rendered)');
    expect(readFileSync(new URL("../../scripts/lib/adminRest.mjs", import.meta.url), "utf8")).toContain("currentDocument: { exists: false }");
  });
});

describe("the founder's code", () => {
  it("QH-XXXX-XXXX from an alphabet with no 0, O, 1, I or L", () => {
    expect(CODE_ALPHABET).not.toMatch(/[01OIL]/);
    for (let i = 0; i < 200; i++) expect(newFounderCode()).toMatch(CODE_RE);
    expect(newFounderCode(() => 0)).toBe("QH-2222-2222");
  });
  it("writers from --writer and a CSV file, de-duplicated, lower-cased", () => {
    const w = readWriters(["--writer", "Maya@Example.com,14", "--file", "w.csv"], () => "# a comment\nmaya@example.com,14\ntom@example.com,,Tom Aldous\n");
    expect(w).toEqual([
      { email: "maya@example.com", foundingNo: 14, name: null },
      { email: "tom@example.com", foundingNo: null, name: "Tom Aldous" },
    ]);
    expect(() => readWriters(["--writer", "not-an-address"])).toThrow(/Not an address/);
  });
});

describe("the fresh-link path sends the invite through the same renderer and transport", () => {
  it("inviteSend renders with renderInvite and sends with sendEmail as 'invite'; the callable binds the key and salt", () => {
    const s = readFileSync(new URL("../../functions/src/inviteSend.ts", import.meta.url), "utf8");
    expect(s).toContain("renderInvite(cfg,");
    expect(s).toContain('await sendEmail(to.email, "invite", prepared.email)');
    expect(readFileSync(new URL("../../functions/src/inviteCode.ts", import.meta.url), "utf8")).toContain("secrets: [RESEND_API_KEY, IP_HASH_SALT]");
  });
});
