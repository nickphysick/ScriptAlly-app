/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query actions v1.1 — "Record a response" opened with no query (the sidebar's capture). The first
 * step is choosing the query: an agent search over LIVE queries only, drawn with the Log journey's
 * own picker markup (`.qad-apick` / `.qad-sugg`), so the two searches read as one control.
 *
 * ⚠️ LIVE ONLY. A closed query's late reply is recorded from that query's own card ("Record a late
 * reply"), where the writer can see what they are reopening; a search that offered closed queries
 * here would put a reopening one keystroke from a routine response.
 *
 * Picking a row hands the id to the drawer (`pickQuery`), which remounts the response journey on
 * that query — its steps then begin as they do from a card.
 *
 * ⚠️ THE PRO PASTE LANE'S HOME (v1.1, Nick's ruling). The paste-an-email flow used to live only in
 * `RecordResponseScreen`, which the sidebar opened; the sidebar opens this drawer now, so the lane
 * is a link here. It closes the drawer and asks App to open the EXISTING flow (the overlay would
 * otherwise sit under the drawer) — the flow itself is untouched. Free users see no link: the drawer
 * does not sell.
 */
import React, { useMemo, useState } from "react";
import { useScriptAllyDb } from "../../../lib/db";
import { PASTE_RESPONSE_EVENT, closeQueryDrawer } from "../../../lib/queryActions/drawerStore";
import { UserPlan } from "../../../types";
import { fmt, toDay } from "../../../lib/queryActions/dates";
import { initialsOf } from "../controls";
import type { JourneyView } from "../journey";
import { isLive, statusWords } from "./common";

export function QueryPicker({ onPick, children }: { onPick: (queryId: string) => void; children: (view: JourneyView) => React.ReactElement }) {
  const db = useScriptAllyDb();
  const isPro = db.currentUser?.plan === UserPlan.PRO;
  const [typed, setTyped] = useState("");
  const t = typed.trim().toLowerCase();
  const live = useMemo(() => db.queries.filter(isLive), [db.queries]);
  const rows = useMemo(() => live
    .map((q) => {
      const a = db.agents.find((x) => x.id === q.agentId);
      const m = db.manuscripts.find((x) => x.id === q.manuscriptId);
      return { q, a, m, known: !!(a?.name || a?.agency), name: a?.name || a?.agency || "Agent not recorded", agency: a?.agency || "" };
    })
    .filter((r) => !t || r.name.toLowerCase().includes(t) || r.agency.toLowerCase().includes(t))
    /* real agents first, by name; a query whose agent record is gone sorts last, never ahead of them */
    .sort((x, y) => (x.known === y.known ? x.name.localeCompare(y.name) : x.known ? -1 : 1))
    .slice(0, 8), [live, db.agents, db.manuscripts, t]);

  const body = (
    <div className="qad-apick" data-qad-qpick>
      <input className="qad-fin" autoFocus placeholder="Start typing an agent's name…" value={typed} data-qad-query-input
        onChange={(e) => setTyped(e.target.value)} autoComplete="off"
        onKeyDown={(e) => { if (e.key === "Enter" && rows[0]) { e.preventDefault(); onPick(rows[0].q.id); } }} />
      <div className="qad-sugg" data-qad-sugg>
        {rows.map((r, i) => {
          const sent = toDay(r.q.dateSent);
          return (
            <button type="button" key={r.q.id} className={`it${i === 0 && t ? " hi" : ""}`} onClick={() => onPick(r.q.id)} data-qad-query={r.q.id}>
              <span className="qad-av">{initialsOf(r.name)}</span>
              <span>
                <b>{r.name}</b>
                <small>{[r.agency.toUpperCase(), (r.m?.title || "").toUpperCase(), statusWords(r.q.status).toUpperCase(), sent ? `SENT ${fmt(sent).toUpperCase()}` : ""].filter(Boolean).join(" · ")}</small>
              </span>
            </button>
          );
        })}
        {!rows.length ? <p className="qad-qpick-none" data-qad-qpick-none>{live.length ? "No live query with an agent of that name." : "You have no live queries to record a response to."}</p> : null}
      </div>
      {isPro ? (
        <button type="button" className="qad-link qad-qpick-paste" data-qad-paste-email
          onClick={() => { closeQueryDrawer(); window.dispatchEvent(new CustomEvent(PASTE_RESPONSE_EVENT)); }}>
          Paste the email instead
        </button>
      ) : null}
    </div>
  );

  return children({
    eyebrow: "RECORD A RESPONSE",
    title: "Record a response",
    verb: "save", verbDone: "saved", button: "Save", ok: false, pickOnly: true,
    steps: [{ title: "The query", summary: "", body }],
    saves: [],
    dirty: t.length > 0,
    touched: () => [],
    commit: async () => { throw new Error("No query chosen"); },
  });
}
