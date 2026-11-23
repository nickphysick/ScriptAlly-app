/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Log a query v2.3 · Phase 4 (D3) — THE "SEND YOUR QUERY TO {agent}" TASK CANNOT BE RENAMED. Its title is fixed on the
 * To-do page's own-task desk (WsOwnTask, desktop and phone), its agent cannot be unlinked there, and every other writer
 * of a task's title in src is accounted for (a new one turns the census red). The door ("I've sent it") is derived from
 * the stored fields, so it survives a reload. A task renamed before this change is an ordinary task, left as it is.
 * Red before: the base drew the title as a textarea for every own task.
 */
import { describe, expect, it } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import type { UserTask } from "../../../types";
import { WsOwnTask } from "./WsOwnTask";
import { heldSendDoor, heldTaskText, isHeldSendTask } from "../../../lib/queryActions/journeyCreated";

const TODAY = new Date(2026, 10, 23);
const held = { id: "t1", userId: "u", text: heldTaskText("Callum Reid"), agentId: "a1", manuscriptId: "m1", dueDate: "2026-11-23", done: false, createdAt: "2026-11-23T10:00:00.000Z" } as unknown as UserTask;
const own = { ...held, id: "t2", text: "Read the agent's wishlist", manuscriptId: null } as unknown as UserTask;
/** a held task the writer renamed before v2.3 */
const renamed = { ...held, id: "t3", text: "Email Callum the pages" } as unknown as UserTask;
const agents = [{ id: "a1", name: "Callum Reid", agency: "Reid Whitlock Associates" }] as never[];
const draw = (task: UserTask) => renderToStaticMarkup(
  <WsOwnTask task={task} today={TODAY} agents={agents} queries={[]} titleOf={() => "The book"} picking={false} setPicking={() => {}}
    w={{ update: async () => {}, done: () => {}, said: () => {} }} />);

describe("LAQ23-4 the held task cannot be renamed (D3)", () => {
  it("is recognised as the app's own, open or done", () => {
    expect(isHeldSendTask(held)).toBe(true);
    expect(isHeldSendTask({ ...held, done: true })).toBe(true);
    expect(isHeldSendTask(own)).toBe(false);
  });
  it("on the To-do desk: its title is not a field, and its agent cannot be unlinked", () => {
    const h = draw(held);
    expect(h).toContain('data-tws="fixed-title"');
    expect(h).toContain(">Send your query to Callum Reid</p>");
    expect(h).not.toMatch(/<textarea[^>]*aria-label="What needs doing"/);
    expect(h).not.toContain('aria-label="Unlink"');
  });
  it("ticking, the due date, steps and notes are as any task's", () => {
    const h = draw(held);
    expect(h).toContain('aria-label="Mark done"');
    expect(h).toContain('class="tws-oddb"');
    expect(h).toContain('aria-label="Add a step"');
    expect(h).toMatch(/<textarea class="tws-opad"[^>]*aria-label="Notes"/);
  });
  it("an ordinary task keeps its editable title and its unlink", () => {
    const h = draw(own);
    expect(h).toMatch(/<textarea[^>]*class="tws-ott"[^>]*aria-label="What needs doing"/);
    expect(h).toContain('aria-label="Unlink"');
  });
  it("the button survives a reload: the door comes from the stored fields alone", () => {
    const reloaded = JSON.parse(JSON.stringify(held)) as UserTask;
    expect(heldSendDoor(reloaded)).toEqual({ mode: "log", agentId: "a1", manuscriptId: "m1" });
  });
  it("a task renamed before this change is an ordinary task, left as it is (editable, no door)", () => {
    expect(isHeldSendTask(renamed)).toBe(false);
    expect(heldSendDoor(renamed)).toBeNull();
    expect(draw(renamed)).toMatch(/<textarea[^>]*aria-label="What needs doing"/);
  });
});

describe("LAQ23-4b every writer of a task's title, accounted for", () => {
  const walk = (d: string): string[] => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : /\.tsx?$/.test(f) && !/\.test\./.test(f) ? [p] : []; });
  const writers = walk("src").filter((f) => /updateUserTask\([^;]*\{[^}]*\btext\b|\bupdate\(\{ text\b/.test(readFileSync(f, "utf8"))).map((f) => f.replace(/^src\//, "")).sort();
  it("only these write a task's title — and none of them can reach the held task", () => {
    expect(writers).toEqual([
      /* not reachable: nothing opens the phone composer with a task to edit (below) */
      "components/phone/PhoneComposeFlow.tsx",
      /* not reachable: the old To-do page is not routed (below) */
      "components/todo/ToDoPage.tsx",
      /* undated notes only: the held task is written with a date and the desk's due menu offers no "No date" */
      "components/todo/TodoNoteboardPage.tsx",
      /* the own-task desk: guarded by isHeldSendTask (above) */
      "components/todo/ws/WsOwnTask.tsx",
    ]);
  });
  it("the two that are not reachable stay so: ToDoPage is not routed, and nothing opens the phone composer with a task", () => {
    const route = readFileSync("src/components/todo/TodoRoute.tsx", "utf8");
    expect(route).not.toMatch(/<ToDoPage\b/);
    /* a caller with a second argument (a seed: the task or note to edit) */
    const callers = walk("src").filter((f) => !f.endsWith("lib/phoneCompose.ts") && /openPhoneCompose\([^,)]+,/.test(readFileSync(f, "utf8")));
    expect(callers).toEqual([]);
  });
});
