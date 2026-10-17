/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * TD52 F2 (unit) — the row's lines lead with the agent; the overdue tag's units at 5, 20 and 100 days late.
 */
import { describe, expect, it } from "vitest";
import { lateTag, overdueLabel, rowLines } from "./trayRows";
import type { TrayItem } from "./todoTray";

const item = (o: Partial<TrayItem>): TrayItem => ({ deed: "Send your partial", sub: "Ana Duarte · Duarte Words", sweep: false, bucket: "send", ...o } as TrayItem);
const agent = { id: "a1", name: "Ana Duarte", agency: "Duarte Words" } as TrayItem["agent"];

describe("TD52 F2 — the row leads with the agent", () => {
  it("send: the name, then the deed and the agency", () => {
    expect(rowLines(item({ agent }))).toEqual({ bold: "Ana Duarte", italic: "Send your partial · Duarte Words", agentLed: true });
  });
  it("chase: Nudge · status; close: Consider closing · status", () => {
    expect(rowLines(item({ agent, bucket: "chase", query: { status: "Queried" } as TrayItem["query"] })).italic).toBe("Nudge · Queried · Duarte Words");
    expect(rowLines(item({ agent, bucket: "close", query: { status: "Full Sent" } as TrayItem["query"] })).italic).toBe("Consider closing · Full sent · Duarte Words");
  });
  it("own tasks and Every-agent sweeps keep v5.1's lines", () => {
    expect(rowLines(item({ userTask: { id: "u" } as TrayItem["userTask"], deed: "Ring the office", sub: "Your own task" }))).toMatchObject({ bold: "Ring the office", italic: "Your own task", agentLed: false });
    expect(rowLines(item({ sweep: true, agent, deed: "Missing submission details", sub: "For every agent" }))).toMatchObject({ bold: "Missing submission details", agentLed: false });
  });
});

describe("TD52 F2 — the overdue tag", () => {
  it("days under 14, weeks under 60, months beyond", () => {
    expect(lateTag(5)).toBe("+5 d");
    expect(lateTag(20)).toBe("+3 wk");
    expect(lateTag(100)).toBe("+3 mo");
    expect(lateTag(0)).toBeNull();
  });
  it("spoken: Overdue since {date}", () => {
    expect(overdueLabel("2026-06-20", "2026-10-17")).toBe("Overdue since 20 June");
    expect(overdueLabel("2025-12-01", "2026-10-17")).toBe("Overdue since 1 December 2025");
  });
});
