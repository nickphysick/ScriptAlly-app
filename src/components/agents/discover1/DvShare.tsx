/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Discover v1 — sharing agents to the community catalogue, and the catalogue band itself.
 *
 *   · DvShareNotice: the blush notice above the picks, only while the writer has agents to share.
 *   · DvShareSheet: one row per candidate, each OPT-IN, each showing exactly the public fields that will be sent
 *     (decision 2 — `SHARE_FIELDS`, built by the same `buildSubmission` the write uses).
 *   · DvCatalogue: the paper band. Its figures come from `catalogueFigures()` — all absent today — so it draws its
 *     heading, the loop line and "Your part in it." and nothing else: no empty bars, no placeholder numbers.
 *
 * ⚠️ A SHARE CANNOT BE TAKEN BACK BY THE CLIENT (the rules give a submission no client read, update or delete). The
 *    sheet says so before Share is pressed, and the toast after offers no Undo — an Undo that deleted only the
 *    writer's echo would show the agent as unshared while the submission sat in the queue.
 */
import React, { useMemo, useState } from "react";
import { buildSubmission, hasAnyFigure, SHARE_FIELDS, type CatalogueFigures, type YourPart } from "../../../lib/scout";
import type { Agent } from "../../../types";
import { HalfDrawer } from "../../shell/HalfDrawer";

const X = <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true"><path d="M2 2l10 10M12 2 2 12" /></svg>;
const ARROW = <svg className="dv1-arw" viewBox="0 0 22 12" aria-hidden="true"><path d="M1 6h18M14 1.5 19.5 6 14 10.5" /></svg>;

export const PRIVACY_LINE = "Only the agent’s public details are shared — name, agency, what they ask for. Never your queries, your notes or your ratings.";

const agentsWord = (n: number) => (n === 1 ? "agent" : "agents");

export const DvShareNotice: React.FC<{ n: number; onShare: () => void }> = ({ n, onShare }) => (n <= 0 ? null : (
  <div className="dv1-note-b" data-dv1="share-notice">
    <span className="pd" aria-hidden="true">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5b2a1f" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M19 8v6M22 11h-6" /></svg>
    </span>
    <p><b>{n} {agentsWord(n)} on your contact list</b> {n === 1 ? "isn’t" : "aren’t"} in the community catalogue yet. Share {n === 1 ? "it" : "them"} and, once {n === 1 ? "it’s" : "they’re"} checked, other writers’ Scouts can find {n === 1 ? "it" : "them"} too.</p>
    <span className="dv1-sp" />
    <button type="button" className="dv1-b p" data-dv1="share-them" onClick={onShare}>Share {n === 1 ? "it" : "them"}</button>
  </div>
));

const FIELD_LABEL: Record<(typeof SHARE_FIELDS)[number], string> = {
  name: "Name", agency: "Agency", website: "Website", city: "City", country: "Country", genres: "Genres", mswlNotes: "Wish list",
  submissionMethod: "How to submit", materialsWanted: "Materials", responseTimeWeeks: "Reply time", noResponseMeansNo: "No reply means no",
};
const fieldValue = (k: (typeof SHARE_FIELDS)[number], v: unknown): string =>
  Array.isArray(v) ? v.join(", ") : k === "responseTimeWeeks" ? `~${v} weeks` : typeof v === "boolean" ? (v ? "Yes" : "No") : String(v);

export const DvShareSheet: React.FC<{
  open: boolean;
  candidates: Agent[];
  uid: string;
  busy: boolean;
  onClose: () => void;
  onShare: (agents: Agent[]) => void;
}> = ({ open, candidates, uid, busy, onClose, onShare }) => {
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const now = useMemo(() => Date.now(), [open]);
  const toggle = (id: string) => setPicked((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const chosen = candidates.filter((a) => picked.has(a.id));
  return (
    <HalfDrawer probe="dv1-share" open={open} onClose={onClose} label="Share agents with the community catalogue" width="min(640px, 54vw)"
      head={(
        <div className="dv1-layer dv1-dh">
          <span className="dv1-disc-sm dv1-disc-ic" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M19 8v6M22 11h-6" /></svg></span>
          <div className="tx"><h3>Share my agents</h3><small>Choose who joins the community catalogue</small></div>
          <button type="button" className="dv1-x" data-dv1="share-close" aria-label="Close" onClick={onClose}>{X}</button>
        </div>
      )}
      foot={(
        <div className="dv1-layer dv1-df">
          <span data-dv1="share-foot">Once sent, a share can’t be taken back from here — it waits to be checked by hand.</span>
          <button type="button" className="dv1-b p" data-dv1="share-send" disabled={busy || chosen.length === 0} onClick={() => onShare(chosen)}>
            {chosen.length ? `Share ${chosen.length} ${agentsWord(chosen.length)}` : "Share"}
          </button>
        </div>
      )}>
      <div className="dv1-layer dv1-db">
        <p className="dv1-privacy" data-dv1="privacy">{PRIVACY_LINE}</p>
        {candidates.length === 0 ? <p className="dv1-sempty" data-dv1="share-empty">Every agent on your list is in the catalogue, or already shared.</p> : null}
        {candidates.map((a) => {
          const sub = buildSubmission(a, uid, now) as unknown as Record<string, unknown>;
          const rows = SHARE_FIELDS.filter((k) => sub[k] !== undefined);
          return (
            <label key={a.id} className="dv1-share" data-dv1="share-row" data-id={a.id} aria-checked={picked.has(a.id)}>
              <input type="checkbox" checked={picked.has(a.id)} onChange={() => toggle(a.id)} data-dv1="share-pick" />
              <span className="body">
                <b>{a.name || a.agency}</b>
                <dl data-dv1="share-fields">
                  {rows.map((k) => <React.Fragment key={k}><dt>{FIELD_LABEL[k]}</dt><dd data-k={k}>{fieldValue(k, sub[k])}</dd></React.Fragment>)}
                </dl>
              </span>
            </label>
          );
        })}
      </div>
    </HalfDrawer>
  );
};

export const DvCatalogue: React.FC<{ figures: CatalogueFigures; part: YourPart; onShare: () => void }> = ({ figures, part, onShare }) => {
  const any = hasAnyFigure(figures);
  const n = (v: number | null) => (v == null ? null : v.toLocaleString("en-GB"));
  return (
    <section className="dv1-catband" aria-labelledby="dv1CatH" data-dv1="catalogue">
      <div className="dv1-bandin">
        <div className="dv1-sh">
          <h2 id="dv1CatH">The community catalogue</h2>
          <span className="dv1-tag">Built by writers · checked by hand</span>
        </div>
        <div className={`dv1-cat${any ? "" : " dv1-cat--solo"}`}>
          {any ? (
            <div data-dv1="cat-figures">
              <div className="dv1-figs">
                {figures.verified != null ? <div className="dv1-fig"><b>{n(figures.verified)}</b><span>verified agents</span><small>the Scout can bring</small></div> : null}
                {figures.contributed != null ? <div className="dv1-fig"><b>{n(figures.contributed)}</b><span>contributed by writers</span>{figures.contributedLists != null ? <small>across {n(figures.contributedLists)} contact lists</small> : null}</div> : null}
                {figures.thisMonth != null ? <div className="dv1-fig"><b>{n(figures.thisMonth)}</b><span>verified this month</span>{figures.updated ? <small>updated {figures.updated}</small> : null}</div> : null}
              </div>
            </div>
          ) : null}
          <div className="dv1-you" data-dv1="your-part">
            <h3>Your part in it.</h3>
            <p>Agents from your contact list help every writer here whose book fits them.</p>
            <ul>
              <li data-k="in"><b>{part.inCatalogue}</b>{part.inCatalogue === 1 ? "agent from your list is in the catalogue" : "agents from your list are in the catalogue"}</li>
              <li data-k="wait" className="wait"><b>{part.waiting}</b>waiting to be checked</li>
              <li data-k="not"><b>{part.notShared}</b>you haven’t shared</li>
            </ul>
            {part.notShared > 0 ? <div className="b"><button type="button" className="dv1-b p" data-dv1="share-other" onClick={onShare}>Share the other {part.notShared}</button></div> : null}
            <small>{PRIVACY_LINE}</small>
          </div>
        </div>
        <div className="dv1-loop" data-dv1="loop">
          <span><i>1</i>Writers add agents</span>{ARROW}<span><i>2</i>Each one is checked by hand</span>{ARROW}<span><i>3</i>The Scout brings the ones that fit</span>
        </div>
      </div>
    </section>
  );
};
