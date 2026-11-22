/**
 * Smart Import from photos (smart-import-photos-v1), phase 1 — the callable reads pages.
 *
 * Locks: the spreadsheet request is byte-identical to before; a photo request is two cached system
 * blocks and the pages in order; the callable refuses a malformed request BEFORE it reads the
 * entitlement, and consumes it only on a usable result; the assembler keeps the photo fields only on
 * a photo read and drops a `src` whose numbers are out of range.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createHash } from "node:crypto";

// ── The callable's world, faked: every Firestore read and write is recorded ──────────────────────
const world = vi.hoisted(() => ({
  reads: [] as string[],
  writes: [] as { path: string; value: unknown }[],
  store: {} as Record<string, Record<string, unknown>>,
  mapPages: null as null | ((...a: any[]) => Promise<any>),
  mapSheet: null as null | ((...a: any[]) => Promise<any>),
}));
vi.mock("./firestore", () => {
  const ref = (path: string) => ({
    path,
    get: async () => { world.reads.push(path); return { get: (f: string) => world.store[path]?.[f] }; },
    set: async (value: unknown) => { world.writes.push({ path, value }); },
  });
  /* The claim (AI spend guard Phase 2) is a transaction: its read and write are recorded like any other. */
  const runTransaction = async (fn: (tx: unknown) => Promise<unknown>) =>
    fn({
      get: (r: { get: () => Promise<unknown> }) => r.get(),
      set: (r: { path: string }, value: unknown) => { world.writes.push({ path: r.path, value }); },
    });
  return { db: { doc: ref, runTransaction } };
});
/* FieldValue sentinels, made readable so a write can be asserted by value. */
vi.mock("firebase-admin/firestore", () => ({
  FieldValue: { serverTimestamp: () => "<serverTimestamp>", delete: () => "<delete>" },
}));
vi.mock("firebase-functions/params", () => ({ defineSecret: () => ({ value: () => "test-key", name: "ANTHROPIC_API_KEY" }) }));
vi.mock("./smartImportCore", async (orig) => {
  const real = await orig<typeof import("./smartImportCore")>();
  return {
    ...real,
    mapPages: (...a: any[]) => world.mapPages!(...a),
    mapSheet: (...a: any[]) => world.mapSheet!(...a),
  };
});

import { smartImportMap } from "./smartImport";
import { mappingRequest, photoRequest, pickImportInput, MAX_PAGES, MAX_PAGES_CHARS, STRICT_SUFFIX } from "./smartImportCore";
import { SYSTEM_PROMPT, PHOTO_ADDENDUM } from "./smartImportPrompt";
import { assembleResult } from "./assembleImport";

/** A tiny real JPEG's base64 (the first bytes are what the validator checks). */
const JPEG = "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDA==";
const PNG = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYGD4DwABBAEAX+XDSwAAAABJRU5ErkJggg==";
const page = (data = JPEG, mediaType = "image/jpeg") => ({ mediaType, data });
const GOOD = { result: { agents: [], queries: [] }, failure: null, usage: {}, ms: 1, attempts: 1 };
const run = (data: unknown) => (smartImportMap as any).run({ data, auth: { uid: "u1" }, acceptsStreaming: false, rawRequest: {} });

beforeEach(() => {
  world.reads = []; world.writes = []; world.store = {};
  world.mapPages = vi.fn(async () => GOOD);
  world.mapSheet = vi.fn(async () => GOOD);
});

describe("the spreadsheet request is byte-identical to before (locked)", () => {
  // SHA-256 of JSON.stringify(mappingRequest(...)) as HEAD 3453bd26 built it, before this pack.
  const sheet = "Agent,Agency,Sent\nClara Voss,Pemberton,14/03/2024";
  const h = (o: unknown) => createHash("sha256").update(JSON.stringify(o)).digest("hex");
  it("plain", () => expect(h(mappingRequest(sheet, false))).toBe("e78508fdb478df498d8062341f34f082d03e634fc006601bcbd48dd2e78c13b6"));
  it("strict retry", () => expect(h(mappingRequest(sheet, true))).toBe("084ea95ccac194723ef5c03e141f1442ce8c41b441e9101299e3c24a398a55f4"));
});

describe("a photo request", () => {
  const pages = [page(JPEG), page(PNG, "image/png"), page(JPEG)];
  it("is two cached system blocks, the first exactly the sheet request's", () => {
    const r = photoRequest(pages as any, false);
    expect(r.system).toHaveLength(2);
    expect(r.system[0]).toEqual(mappingRequest("anything", false).system[0]);
    expect(r.system[0].text).toBe(SYSTEM_PROMPT);
    expect(r.system[1]).toEqual({ type: "text", text: PHOTO_ADDENDUM, cache_control: { type: "ephemeral" } });
  });
  it("puts the strict reminder on the addendum, leaving the first block untouched", () => {
    const r = photoRequest(pages as any, true);
    expect(r.system[0].text).toBe(SYSTEM_PROMPT);
    expect(r.system[1].text).toBe(PHOTO_ADDENDUM + STRICT_SUFFIX);
  });
  it("sends the pages in order, each image after its 'Page N' label", () => {
    const c = photoRequest(pages as any, false).messages[0].content;
    expect(c.map((b: any) => (b.type === "text" ? b.text : `${b.source.media_type}:${b.source.data.slice(0, 4)}`))).toEqual([
      "Page 1", "image/jpeg:/9j/", "Page 2", "image/png:iVBO", "Page 3", "image/jpeg:/9j/",
    ]);
    expect(c[1].source.type).toBe("base64");
  });
});

describe("the callable refuses a malformed request BEFORE the entitlement is read (locked)", () => {
  const bad: [string, unknown][] = [
    ["both", { sheetText: "a,b\n1,2", pages: [page()] }],
    ["neither", {}],
    ["eleven pages", { pages: Array.from({ length: MAX_PAGES + 1 }, () => page()) }],
    ["no pages", { pages: [] }],
    ["a bad media type", { pages: [page(JPEG, "image/heic")] }],
    ["base64 that does not decode", { pages: [page("/9j/not base64!!")] }],
    ["bytes that are not the media type", { pages: [page(PNG, "image/jpeg")] }],
    ["over the cap", { pages: Array.from({ length: 5 }, () => page("/9j/" + "A".repeat(Math.ceil(MAX_PAGES_CHARS / 5) + 4 - ((Math.ceil(MAX_PAGES_CHARS / 5) + 4) % 4)))) }],
  ];
  for (const [name, data] of bad) {
    it(name, async () => {
      await expect(run(data)).rejects.toMatchObject({ code: "invalid-argument" });
      expect(world.reads).toEqual([]);
      expect(world.writes).toEqual([]);
      expect(world.mapPages).not.toHaveBeenCalled();
      expect(world.mapSheet).not.toHaveBeenCalled();
    });
  }
  it("a good photo request does read it, and reaches mapPages with the pages", async () => {
    await run({ pages: [page(), page(PNG, "image/png")] });
    expect(world.reads).toEqual(["users/u1/private/entitlement"]); // plan rules v1: the plan is not read — once per account
    expect(world.mapPages).toHaveBeenCalledTimes(1);
    expect((world.mapPages as any).mock.calls[0][1].map((p: any) => p.mediaType)).toEqual(["image/jpeg", "image/png"]);
    expect(world.mapSheet).not.toHaveBeenCalled();
  });
});

describe("one entitlement for both inputs (locked)", () => {
  const ENT = "users/u1/private/entitlement";
  const claim = { path: ENT, value: { smartImportPending: "<serverTimestamp>" } };
  it("is claimed before the call and consumed on a usable photo result, releasing the claim", async () => {
    await run({ pages: [page()] });
    expect(world.writes).toEqual([
      claim,
      { path: ENT, value: { smartImportFreeUsed: true, smartImportPending: "<delete>" } },
    ]);
  });
  it("is NOT consumed when the photo read fails — the claim is released instead", async () => {
    for (const failure of ["api", "badjson", "nonjson"]) {
      world.mapPages = vi.fn(async () => ({ ...GOOD, result: null, failure }));
      await expect(run({ pages: [page()] })).rejects.toBeTruthy();
    }
    const release = { path: ENT, value: { smartImportPending: "<delete>" } };
    expect(world.writes).toEqual([claim, release, claim, release, claim, release]);
  });
  it("a spent import refuses photos exactly as it refuses a sheet", async () => {
    world.store["users/u1/private/entitlement"] = { smartImportFreeUsed: true };
    await expect(run({ pages: [page()] })).rejects.toMatchObject({ code: "resource-exhausted", details: { reason: "used" } });
    expect(world.mapPages).not.toHaveBeenCalled();
  });

  /* PLAN RULES v1 — ONCE PER ACCOUNT ON EVERY PLAN: the first call spends the one import, and the second is refused,
     whether the account is Free, paid Pro, founding or on its trial. The plan is not even read. */
  for (const [who, user, ent] of [
    ["Free", { plan: "Free" }, {}],
    ["paid Pro", { plan: "Pro" }, {}],
    ["founding", { plan: "Free" }, { founding: true }],
    ["an old Pro month on record", { plan: "Pro" }, { smartImportLastUsedMonth: "2026-10" }],
  ] as const) {
    it(`${who}: the second call is refused`, async () => {
      world.store["users/u1"] = { ...user };
      world.store["users/u1/private/entitlement"] = { ...ent };
      const first = await run({ sheetText: "Agent,Agency\nClara,Pemberton" }).then(() => "ok", (e: any) => e.details?.reason);
      if (who === "an old Pro month on record") {
        expect(first, "an account that used one under the old rule has none left").toBe("used");
        return;
      }
      expect(first).toBe("ok");
      const consumed = world.writes.find((w) => (w.value as Record<string, unknown>).smartImportFreeUsed === true);
      expect(consumed, "the first call spends the one import").toBeTruthy();
      world.store["users/u1/private/entitlement"] = { ...ent, smartImportFreeUsed: true };
      await expect(run({ sheetText: "Agent,Agency\nClara,Pemberton" })).rejects.toMatchObject({ code: "resource-exhausted", details: { reason: "used" } });
      expect(world.reads).not.toContain("users/u1");
    });
  }
  it("the sheet path still goes to mapSheet", async () => {
    await run({ sheetText: "Agent,Agency\nClara,Pemberton" });
    expect(world.mapSheet).toHaveBeenCalledTimes(1);
    expect(world.mapPages).not.toHaveBeenCalled();
  });
});

describe("pickImportInput", () => {
  it("reads an empty or missing sheet as an empty sheet (the old message stands)", () => {
    expect(pickImportInput({})).toEqual({ kind: "sheet", sheetText: "" });
    expect(pickImportInput(undefined)).toEqual({ kind: "sheet", sheetText: "" });
  });
  it("accepts ten pages", () => {
    expect(pickImportInput({ pages: Array.from({ length: 10 }, () => page()) }).kind).toBe("pages");
  });
});

describe("the assembler and the photo fields", () => {
  const raw = () => ({
    agents: [{ ref: "a1", name: "Hannah Biddle", agency: "Greaves", readings: ["Hannah Biddle, Greaves", " hannah biddle, greaves ", "Hannah Riddle, Greaves", "", "x", "y"] }],
    queries: [
      { agentRef: "a1", status: "Queried", sentDateRaw: "3/4/2026", reasons: ["check-reading", "crossed-out", "made-up"], src: { p: 1, y: [0.2, 0.26] }, lineRaw: "Hannah Biddle – Greaves – 3/4", markRaw: "✗" },
      { agentRef: "a1", status: "Queried", src: { p: 4, y: [0.2, 0.3] } },
      { agentRef: "a1", status: "Queried", src: { p: 1, y: [0.4, 0.3] } },
      { agentRef: "a1", status: "Queried", src: { p: 1, y: [-0.1, 0.3] } },
      { agentRef: "a1", status: "Queried", src: { p: 1.5, y: [0.1, 0.3] } },
      { agentRef: "a1", status: "Queried", src: { p: 1, y: [0.1, 1.2] } },
      { agentRef: "a1", status: "Queried", src: "page one" },
    ],
  });
  it("keeps src, lineRaw, markRaw, the photo codes and clean readings on a photo read", () => {
    const out = assembleResult(raw(), { photos: { pageCount: 2 } });
    expect(out.queries[0].src).toEqual({ p: 1, y: [0.2, 0.26] });
    expect(out.queries[0].lineRaw).toBe("Hannah Biddle – Greaves – 3/4");
    expect(out.queries[0].markRaw).toBe("✗");
    expect(out.queries[0].reasons).toEqual(expect.arrayContaining(["check-reading", "crossed-out"]));
    expect(out.queries[0].reasons).not.toContain("made-up");
    expect(out.agents[0].readings).toEqual(["Hannah Biddle, Greaves", "Hannah Riddle, Greaves", "x"]);
  });
  it("drops every src whose numbers are out of range, and never throws", () => {
    const out = assembleResult(raw(), { photos: { pageCount: 2 } });
    expect(out.queries.slice(1).map((q: any) => q.src ?? null)).toEqual([null, null, null, null, null, null]);
  });
  it("a sheet read keeps none of it", () => {
    const out = assembleResult(raw());
    expect(out.queries[0].src).toBeUndefined();
    expect(out.queries[0].lineRaw).toBeUndefined();
    expect(out.queries[0].markRaw).toBeUndefined();
    expect(out.queries[0].reasons).not.toContain("check-reading");
    expect(out.queries[0].reasons).not.toContain("crossed-out");
  });
});
