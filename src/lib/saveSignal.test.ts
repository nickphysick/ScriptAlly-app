/**
 * Locks for the save signal — the bar's status whisper reads it (refinement §2).
 *
 * ⚠️ THE RULE THIS EXISTS FOR: the whisper must NEVER show a false "saved". Every fixture below
 * is a way that could happen, and each was a real possibility before the counter existed.
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  __resetSaveSignal, beginWrite, endWrite, saveState, subscribeSave, tracked, trackWrite,
  markDirty, clearDirty, dirtyFieldKeys,
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
    expect(saveWhisper("dirty")).toBe("Unsaved changes");
  });

  /* ⚠️ THERE IS STILL NO ERROR WORD, AND `dirty` IS NOT ONE. A failed write is the failing flow's
     business to report, and those flows already do; an error string here would be a second,
     quieter error surface nobody checks. "Unsaved changes" is not a failure — it is the whisper's
     own law being kept, that it must never show a false "saved". */
  it("has exactly three strings, one per state", () => {
    expect(new Set([saveWhisper("idle"), saveWhisper("saving"), saveWhisper("dirty")]).size).toBe(3);
  });
});

describe("the dirty registry — the bar must never claim saved over unsaved text", () => {
  it("a marked field turns the state dirty; clearing it returns to idle", () => {
    expect(saveState()).toBe("idle");
    markDirty("a");
    expect(saveState()).toBe("dirty");
    clearDirty("a");
    expect(saveState()).toBe("idle");
  });

  /* ⚠️ THE REASON IT IS A SET AND NOT A FLAG. Saving one of two dirty fields must not make the
     bar claim the other one is saved too. */
  it("stays dirty while ANY field is dirty", () => {
    markDirty("a");
    markDirty("b");
    clearDirty("a");
    expect(saveState()).toBe("dirty");
    clearDirty("b");
    expect(saveState()).toBe("idle");
  });

  it("marking the same field twice is one dirty field", () => {
    markDirty("a");
    markDirty("a");
    clearDirty("a");
    expect(saveState()).toBe("idle");
  });

  it("clearing a field that was never dirty changes nothing", () => {
    clearDirty("never");
    expect(saveState()).toBe("idle");
  });

  it("an in-flight write outranks dirty, and dirty survives the write finishing", async () => {
    markDirty("a");
    const p = trackWrite(Promise.resolve(1));
    expect(saveState()).toBe("saving");
    await p;
    expect(saveState()).toBe("dirty");
    clearDirty("a");
    expect(saveState()).toBe("idle");
  });

  it("notifies subscribers on the idle→dirty→idle edges", () => {
    const seen: string[] = [];
    const off = subscribeSave((st) => seen.push(st));
    markDirty("a");
    markDirty("b");   // already dirty — no second notification
    clearDirty("a");  // still dirty — none either
    clearDirty("b");
    off();
    expect(seen).toEqual(["dirty", "idle"]);
  });

  it("names what is dirty, for the leave-warning to read", () => {
    markDirty("settings:display-name");
    expect(dirtyFieldKeys()).toEqual(["settings:display-name"]);
    clearDirty("settings:display-name");
    expect(dirtyFieldKeys()).toEqual([]);
  });
});
