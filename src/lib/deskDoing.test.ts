/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * TD52 J2 (unit) — every journey the desk can open maps to a title: each door `drawerDoorForTask` reaches, the set-aside
 * popover's doors (send-by, withdraw, plan), and a Close that becomes a response.
 */
import { describe, expect, it } from "vitest";
import { doingTitle } from "./deskDoing";
import { drawerDoorForTask } from "./queryActions/entry";

const TASKS = ["partial_requested", "full_requested", "revise_resubmit", "nudge_overdue", "no_response_close", "offer_received", "offer_send_full", "withdraw_tell", "signed_tell"];

describe("TD52 J2 — the band's title, one map", () => {
  it("the pack's table", () => {
    expect(doingTitle("sent", "partial_requested", undefined)).toBe("Sending your partial");
    expect(doingTitle("sent", "full_requested", undefined)).toBe("Sending your full");
    expect(doingTitle("sent", "offer_send_full", undefined)).toBe("Sending your full");
    expect(doingTitle("sent", "revise_resubmit", undefined)).toBe("Sending the revision");
    expect(doingTitle("nudge", "nudge_overdue", undefined)).toBe("Recording a nudge");
    expect(doingTitle("close", "no_response_close", { closeWhy: "noreply" })).toBe("Closing the query");
    expect(doingTitle("close", "partial_requested", { closeWhy: "withdraw" })).toBe("Withdrawing the query");
    expect(doingTitle("resp", "no_response_close", undefined)).toBe("Logging their reply");
    expect(doingTitle("offer", "offer_received", undefined)).toBe("Answering the offer");
  });
  it("every door drawerDoorForTask reaches has a title (never empty, never the raw mode)", () => {
    const seen: string[] = [];
    for (const t of TASKS) {
      const door = drawerDoorForTask(t, "q1", () => "q0");
      if (!door) continue;
      const title = doingTitle(door.mode, t, door.preset);
      expect(title, t).toMatch(/^[A-Z][a-z]+ing /);
      seen.push(`${t}→${title}`);
    }
    expect(seen.length).toBeGreaterThan(5);
  });
  it("the set-aside popover's doors", () => {
    expect(doingTitle("edit", "partial_requested", { sendBy: true })).toBe("Setting a send-by date");
    expect(doingTitle("nudge", "nudge_overdue", { nudgeTab: "plan" })).toBe("Recording a nudge");
  });
});
