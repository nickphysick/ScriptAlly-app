/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * To-do list v2's row cards. The status mark is `StatusDot` BY IMPORT — asserted on the import and
 * on the rendered signature, never on a hand-drawn shape — and every press on a row is `onOpen`.
 */
import React from "react";
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { V2Rows } from "./V2Rows";
import { buildRow, groupRows } from "../../../lib/todoV2";
import type { BoardCard } from "../../../lib/todoBoard";
import { QueryStatus } from "../../../types";
import { sdAt } from "../../../test/statusDotSignature";

const src = readFileSync(join(__dirname, "V2Rows.tsx"), "utf8");
const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

const card = (over: Partial<BoardCard>): BoardCard => ({
  key: "k1", stream: "do", title: "t", who: "Greg Panetta", subtitle: "", due: "", warn: false, snoozes: 0,
  hk: false, initials: "GP", record: "", committed: false, done: false, taskType: "partial_requested",
  status: QueryStatus.PARTIAL_REQUESTED, ...over,
} as BoardCard);

describe("the row's status mark is StatusDot, by import", () => {
  it("imports the one component and draws no status geometry of its own", () => {
    expect(code).toContain('import { StatusDot } from "../../StatusDot";');
    expect(code).toContain("<StatusDot status={status} overrideSize={13} decorative />");
    /* the only svg the row draws is the tick's check path */
    expect((code.match(/<svg/g) ?? []).length).toBe(1);
    expect(code).not.toContain("<circle");
  });
  it("the rendered row carries StatusDot's own signature at 13px", () => {
    const r = buildRow(card({}), { deed: "Send your partial", agency: "Curtis Vane", dateKey: "Asked on", dateValue: "28 June", spanValue: "3 months", dueYmd: "2026-09-01", pkg: null }, "2026-09-28");
    const html = renderToStaticMarkup(<V2Rows groups={groupRows([r], "when")} landedKey={null} onOpen={() => {}} empty="none" />);
    expect(html).toMatch(sdAt(13));
    expect(html).toContain("Past the date");
    expect(html).toContain("tdv2-row past");
    expect(html).toContain("Your move");
  });
});

describe("every press opens; nothing on the row writes", () => {
  it("the tick, the row and the action all call onOpen — and nothing else", () => {
    expect((code.match(/onOpen\(r\)/g) ?? []).length).toBe(4); // row click, row key, tick, act
    for (const w of ["commit", "quickDone", "update", "dismiss", "complete"]) {
      expect(code, `the row reaches a write: ${w}`).not.toMatch(new RegExp(`\\b${w}\\w*\\(`));
    }
  });
});

describe("the page's one door (Phase 7)", () => {
  const page = readFileSync(join(__dirname, "..", "ToDoPage.tsx"), "utf8");
  it("a row opens the query drawer when it has a journey, the task pane otherwise — and writes nothing", () => {
    const a = page.indexOf("const openV2Row = (r: V2Row) => {");
    expect(a, "openV2Row").toBeGreaterThan(-1);
    const b = page.indexOf("\n  };\n", a);
    expect(b).toBeGreaterThan(a);
    const fn = page.slice(a, b);
    expect(fn).toContain("drawerDoorForTask(c.taskType, c.relatedRecordId");
    expect(fn).toContain("if (door) { openQueryDrawer(door); return; }");
    expect(fn).toContain("openDockRef.current(c.key);");
    for (const w of ["addUserTask", "updateUserTask", "quickDone", "commitFromPane", "dismissTask", "upsertTaskFlag", "updateQuery"]) {
      expect(fn, `the door reaches a write: ${w}`).not.toContain(w);
    }
    /* every door on the page is that one function */
    expect(page).toContain("onOpen={openV2Row}");
    expect(page).toContain("onOpenRow={openV2Row}");
  });
});
