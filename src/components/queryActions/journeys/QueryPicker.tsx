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
import { DrawerMoment } from "../../shared/DrawerMoment";
import React, { useMemo, useState } from "react";
import { useScriptAllyDb } from "../../../lib/db";
import { PASTE_RESPONSE_EVENT, closeQueryDrawer } from "../../../lib/queryActions/drawerStore";
import { UserPlan } from "../../../types";
import { fmt, toDay } from "../../../lib/queryActions/dates";
import { initialsOf } from "../controls";
import type { JourneyView } from "../journey";
import { isLive, seedOf, statusWords } from "./common";

export function QueryPicker({ onPick, seed, hadOpen, children }: { onPick: (queryId: string) => void; seed?: unknown; /** Query panel v2 §E — the query that was open in the panel: listed first, under its own heading */ hadOpen?: string; children: (view: JourneyView) => React.ReactElement }) {
  const db = useScriptAllyDb();
  const isPro = db.currentUser?.plan === UserPlan.PRO;
  /* parking (§6.4): what was typed is the picker's one answer */
  const [typed, setTyped] = useState(seedOf<{ typed: string }>({ seed }).typed ?? "");
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
  /* §E — the query the reader had open, first, whatever its status: a late reply to a closed query is a response too.
     It is not repeated in the list beneath, and typing a name sets it aside like any other row. */
  const open = useMemo(() => {
    const q = hadOpen ? db.queries.find((x) => x.id === hadOpen) : undefined;
    if (!q) return null;
    const a = db.agents.find((x) => x.id === q.agentId);
    const m = db.manuscripts.find((x) => x.id === q.manuscriptId);
    const name = a?.name || a?.agency || "Agent not recorded";
    if (t && !name.toLowerCase().includes(t) && !(a?.agency || "").toLowerCase().includes(t)) return null;
    return { q, a, m, known: !!(a?.name || a?.agency), name, agency: a?.agency || "" };
  }, [hadOpen, db.queries, db.agents, db.manuscripts, t]);
  const rest = open ? rows.filter((r) => r.q.id !== open.q.id) : rows;

  const row = (r: NonNullable<typeof open>, hi: boolean) => {
    const sent = toDay(r.q.dateSent);
    return (
      <button type="button" key={r.q.id} className={`it${hi ? " hi" : ""}`} onClick={() => onPick(r.q.id)} data-qad-query={r.q.id}>
        <span className="qad-av">{initialsOf(r.name)}</span>
        <span>
          <b>{r.name}</b>
          <small>{[r.agency.toUpperCase(), (r.m?.title || "").toUpperCase(), statusWords(r.q.status).toUpperCase(), sent ? `SENT ${fmt(sent).toUpperCase()}` : ""].filter(Boolean).join(" · ")}</small>
        </span>
      </button>
    );
  };
  const body = (
    <div className="qad-apick" data-qad-qpick>
      <input className="qad-fin" autoFocus placeholder="Start typing an agent's name…" value={typed} data-qad-query-input
        onChange={(e) => setTyped(e.target.value)} autoComplete="off"
        onKeyDown={(e) => { const first = open ?? rest[0]; if (e.key === "Enter" && first) { e.preventDefault(); onPick(first.q.id); } }} />
      <div className="qad-sugg" data-qad-sugg>
        {open ? <p className="qad-qpick-h" data-qad-qpick-open>The query you had open</p> : null}
        {open ? row(open, true) : null}
        {open && rest.length ? <p className="qad-qpick-h">Your other live queries</p> : null}
        {rest.map((r, i) => row(r, !open && i === 0 && !!t))}
        {!rows.length && !open ? <p className="qad-qpick-none" data-qad-qpick-none>{live.length ? "No live query with an agent of that name." : "You have no live queries to record a response to."}</p> : null}
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
    /* Contact list v25 F — the moment over "Who replied?", when no query was open (with one open, the picker is a step) */
    moment: hadOpen ? undefined : <DrawerMoment kind="record" />,
    steps: [{ title: "The query", summary: "", body }],
    saves: [],
    dirty: t.length > 0,
    snapshot: () => ({ typed }),
    touched: () => [],
    commit: async () => { throw new Error("No query chosen"); },
  });
}
