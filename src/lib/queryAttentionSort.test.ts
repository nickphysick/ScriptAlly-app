/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ⚠️ THE ORDER IS ASSERTED AS A PARTITION, NOT AS A LIST OF INDICES. "Every `you` precedes every
 * `late`" survives a fixture gaining a row; `expect(order).toEqual([...])` does not, and would go
 * red on a change that made the sort more correct rather than less.
 */
import { describe, it, expect } from "vitest";
import { ATTENTION_RANK, compareAttention, type AttentionRow } from "./queryAttentionSort";
import { DEFAULT_SORT, SORT_OPTIONS } from "./qcSummary";
import type { Register } from "./queryCardFacts";

const row = (register: Register, o: Partial<AttentionRow> = {}): AttentionRow =>
  ({ register, expectedMs: null, closedMs: null, lastActivityMs: 0, ...o });

describe("the attention order", () => {
  it("⚠️ partitions by register, in the stated order", () => {
    const mixed: AttentionRow[] = [
      row("closed"), row("calm", { expectedMs: 10 }), row("offer"), row("late"), row("you"),
      row("calm", { expectedMs: 5 }), row("closed", { closedMs: 99 }), row("you", { lastActivityMs: 3 }),
    ];
    const sorted = [...mixed].sort(compareAttention).map((r) => r.register);
    /* every register's LAST index precedes the next register's FIRST */
    const order: Register[] = ["you", "late", "offer", "calm", "closed"];
    for (let i = 0; i < order.length - 1; i++) {
      const lastOfA = sorted.lastIndexOf(order[i]);
      const firstOfB = sorted.indexOf(order[i + 1]);
      if (lastOfA === -1 || firstOfB === -1) continue;
      expect(lastOfA, `a ${order[i]} row sorts after a ${order[i + 1]} row`).toBeLessThan(firstOfB);
    }
    expect(ATTENTION_RANK).toEqual({ you: 0, late: 1, offer: 2, calm: 3, closed: 4 });
  });

  it("calm orders by the nearest expected reply, and an unstated window sorts LAST among them", () => {
    const cs = [row("calm", { expectedMs: 300 }), row("calm", { expectedMs: null }), row("calm", { expectedMs: 100 })];
    expect(cs.sort(compareAttention).map((r) => r.expectedMs)).toEqual([100, 300, null]);
  });

  it("closed orders newest first", () => {
    const cs = [row("closed", { closedMs: 10 }), row("closed", { closedMs: 90 }), row("closed", { closedMs: 50 })];
    expect(cs.sort(compareAttention).map((r) => r.closedMs)).toEqual([90, 50, 10]);
  });

  it("⚠️ ties inside every register fall to last activity, newest first", () => {
    for (const reg of Object.keys(ATTENTION_RANK) as Register[]) {
      const cs = [row(reg, { lastActivityMs: 1 }), row(reg, { lastActivityMs: 9 }), row(reg, { lastActivityMs: 5 })];
      expect(cs.sort(compareAttention).map((r) => r.lastActivityMs), reg).toEqual([9, 5, 1]);
    }
  });

  /* ⚠️ RETARGETED (Query Centre v11, 19 Sep): per-view defaults are gone with the Board and the Sort
     pill. This order survives as ONE of the sentence's six sorts, relabelled "with you first" — a label
     that says where the rows go and nothing about what they are — and it is NOT the default. */
  it("⚠️ it survives as 'with you first', and it is not the default", () => {
    expect(SORT_OPTIONS.find((o) => o.key === "you")?.label).toBe("with you first");
    expect(DEFAULT_SORT).toBe("activity");
    expect(SORT_OPTIONS.map((o) => o.label).join(" ")).not.toMatch(/attention|overdue|late\b|urgent/i);
  });
});
