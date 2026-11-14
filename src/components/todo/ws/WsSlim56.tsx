/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * To-do list v56 (design-refs/todo-list-v56/todo-navy-header-v1.html, "Slim bar") — THE COLLAPSED HEADER. Once the navy
 * panel has scrolled out from under the top of the page's scroller, a slim 60px bar takes its place: "{n} things to do"
 * and "for {book}" on the left; on the right "{n} need you", the italic "{late} late" (none at 0) and a navy
 * "+ Add a task" that does what the header's does.
 *
 * ⚠️ IT IS THE QUERY CENTRE'S BAR. The frame is the shared `shell/SlimBar` (extracted from QcSlim156, markup unchanged:
 *    the same reader, the same ground across the sheet's full width, inert and aria-hidden while hidden); the look is
 *    qcv156.css §3, whose selectors name `.tws56` beside `.qc151.qc153` at the same specificity. Its place (on the
 *    scroller's top, the workspace 12px under it) is todoWs56.css Phase 2 and todoWs54.css D2.
 * ⚠️ IT OFFSETS NOTHING: the workspace's pin is a constant 72px whether the bar shows or not (`cover` finds nothing), so
 *    nothing jumps when it appears.
 */
import React from "react";
import { needYou } from "../../../lib/todoHeader54";
import type { Breakdown } from "../../../lib/todoWs";
import { SlimBar } from "../../shell/SlimBar";
import { thingsTitle } from "./WsHeader56";
import "../../queries/centre/qcv156.css";
import "./todoWs56.css";

const header = (row: HTMLElement) => row.parentElement?.querySelector<HTMLElement>(":scope > [data-tws='header'] > header");
const cover = (): null => null;

export const WsSlim56: React.FC<{ todo: number; bd: Breakdown; book: string | null; onAdd: () => void }> = ({ todo, bd, book, onAdd }) => (
  <SlimBar hook="data-tws56" header={header} cover={cover}
    title={thingsTitle(todo)}
    sub={book ? { node: <>for {book}</>, probe: "slim-for" } : null}
    right={(
      <span className="qc156-sw" data-tws56="slim-need">
        <b>{needYou(bd)} need you</b>
        {bd.late > 0 ? <em data-tws56="slim-late">{bd.late} late</em> : null}
      </span>
    )}
    button={{ label: "+ Add a task", onClick: onAdd, probe: "slim-add" }} />
);
