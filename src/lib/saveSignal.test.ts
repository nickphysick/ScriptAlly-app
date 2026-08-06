/**
 * Locks for the save signal — the bar's status whisper reads it (refinement §2).
 *
 * ⚠️ THE RULE THIS EXISTS FOR: the whisper must NEVER show a false "saved". Every fixture below
 * is a way that could happen, and each was a real possibility before the counter existed.
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  __resetSaveSignal, beginWrite, endWrite, saveState, subscribeSave, tracked, trackWrite,
} from "./saveSignal";
import { saveWhisper } from "./useSaveState";

beforeEach(() => __resetSaveSignal());

describe("the counter reports what is actually in flight", () => {
  it("starts idle", () => {
    expect(saveState()).toBe("idle");
  });

  it("says saving while a write is outstanding, and idle once it settles", async () => {
    let release: () => void = () => {};
    const p = trackWrite(new Promise<void>((r) => { release = r; }));
    expect(saveState()).toBe("saving");
    release();
    await p;
    expect(saveState()).toBe("idle");
  });

  /* ⚠️ THE FIXTURE A BOOLEAN WOULD FAIL. Two overlapping writes: a flag would settle on the FIRST
     completion and claim "saved" while the second was still in the air. */
  it("stays saving until the LAST of two overlapping writes finishes", async () => {
    let r1: () => void = () => {};
    let r2: () => void = () => {};
    const a = trackWrite(new Promise<void>((r) => { r1 = r; }));
    const b = trackWrite(new Promise<void>((r) => { r2 = r; }));
    expect(saveState()).toBe("saving");
    r1();
    await a;
    expect(saveState(), "one still outstanding").toBe("saving");
    r2();
    await b;
    expect(saveState()).toBe("idle");
  });

  /* ⚠️ A REJECTION MUST NOT STRAND THE APP ON "SAVING…" FOREVER. */
  it("settles when a write REJECTS", async () => {
    const p = trackWrite(Promise.reject(new Error("denied")));
    expect(saveState()).toBe("saving");
    await expect(p).rejects.toThrow("denied");
    expect(saveState()).toBe("idle");
  });

  it("never drives the counter below zero", () => {
    endWrite();
    endWrite();
    beginWrite();
    expect(saveState(), "one begin must show as saving, not be swallowed").toBe("saving");
  });
});

describe("subscribers see the transitions", () => {
  it("notifies on the way out and the way back", async () => {
    const seen: string[] = [];
    subscribeSave((s) => seen.push(s));
    const p = trackWrite(Promise.resolve());
    await p;
    expect(seen).toEqual(["saving", "idle"]);
  });

  /* Only the EDGES notify — a burst of ten writes is one "saving", not ten. */
  it("does not re-notify while already saving", async () => {
    const seen: string[] = [];
    subscribeSave((s) => seen.push(s));
    const a = trackWrite(Promise.resolve());
    const b = trackWrite(Promise.resolve());
    await Promise.all([a, b]);
    expect(seen.filter((s) => s === "saving")).toHaveLength(1);
  });

  it("unsubscribes cleanly", async () => {
    const seen: string[] = [];
    const off = subscribeSave((s) => seen.push(s));
    off();
    await trackWrite(Promise.resolve());
    expect(seen).toHaveLength(0);
  });
});

describe("tracked() wraps a function so call sites need no editing", () => {
  it("brackets the wrapped call and passes the value through", async () => {
    const fn = tracked(async (n: number) => n * 2);
    const p = fn(21);
    expect(saveState()).toBe("saving");
    expect(await p).toBe(42);
    expect(saveState()).toBe("idle");
  });
});

describe("the whisper's words", () => {
  it("reflects the state rather than a constant", () => {
    expect(saveWhisper("idle")).toBe("All changes saved");
    expect(saveWhisper("saving")).toBe("Saving…");
  });

  /* ⚠️ THERE IS NO ERROR WORD. A failed write is the failing flow's business to report, and those
     flows already do; a third string here would be a second, quieter error surface nobody checks. */
  it("has exactly two strings", () => {
    expect(new Set([saveWhisper("idle"), saveWhisper("saving")]).size).toBe(2);
  });
});
