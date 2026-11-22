/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE AGENTS TAB ON A PHONE (Phone app v2, Part 6; ref design-refs/phone-app-v2/src/agentsv.js `screenAgents2` at
 * AGR B · AGD C, `agRow`, `discList` at ADC B, `ovAgentD` at AGS D). `/agents` and `/agents/discover` below 768px.
 *
 * ⚠️ IT DERIVES NOTHING OF ITS OWN. Your list reads the Contact list's own facts — `agentFacts` over the Query Centre's
 * rows (`buildQcRows`) for the book in scope (`resolveScopedManuscript`, the shell's key) — so "{n} on your list ·
 * {m} to query" is the Contact list's count and never follows a chip. Discover reads the Scout (`useScout`): its queue
 * in its order, its tally, its add path. The door is `doorOf`: a door nobody stated reads `DOOR_NOT_KNOWN`, never Open.
 *
 * Missing facts are left out — never a dash, never "Unknown".
 */
import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useScriptAllyDb } from "../../../lib/db";
import { buildQcRows, STAGE_NAME, type QcRow } from "../../../lib/qcSummary";
import { agentFacts, type AgentFacts } from "../../../lib/contactList";
import { resolveScopedManuscript } from "../../../lib/shellSidebar";
import { openAgentCard } from "../../../lib/agentCardStore";
import { openQueryDrawer, showUndoBar } from "../../../lib/queryActions/drawerStore";
import { decisionDoc } from "../../../lib/scout";
import { usePhoneBandSlot } from "../../phone/phoneBandStore";
import { PhoneDisc } from "../../phone/PhoneDisc";
import { PI } from "../../phone/phoneIcons";
import { MobileSheet } from "../../shell/MobileSheet";
import { useScout } from "../discover1/useScout";
import { DISCOVER_LIVE } from "../../../lib/discoverShared";
import { devAid, type DevAid } from "../../../lib/discoverReviewAid";
import { notifyPrefs } from "../../../lib/accountPrefs";
import { SubmissionMethod, type Agent, type CommunityAgent } from "../../../types";
import { doorWords, howWords, replyWords } from "../../../lib/agentsPhone";
import "./agentsPhone.css";
import "./agentsPhoneR2.css";

const initialsOf = (name: string) => name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("") || "?";
const domainOf = (a: Pick<Agent, "email" | "website">): string | null => {
  const e = (a.email ?? "").split("@")[1]?.trim();
  if (e) return e;
  const w = (a.website ?? "").replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0]?.trim();
  return w || null;
};

const NO_AID: DevAid = { face: null, fixture: null, memory: null, holdMs: 0 };
/** Discover's own gate (`DISCOVER_LIVE`), with the desktop's dev review aid. ⚠️ THE MODE CHECK IS AT THE CALL SITE, as
 *  in DiscoverPage, so a production build folds the aid away. While the gate is off the phone shows what the desktop
 *  shows: that the Scout is coming — no queue, no "{n} new". */
function useDiscoverFace(): { live: boolean; aid: DevAid } {
  const [aid] = useState<DevAid>(() => (import.meta.env.MODE !== "production" ? devAid() : NO_AID));
  return { live: (aid.face ?? (DISCOVER_LIVE ? "live" : "soon")) === "live", aid };
}

/** Phone app v4: Discover's own count for the Agents tab's row (the Scout's queue while Discover is live; 0 otherwise) */
export function useDiscoverCount(): number {
  const face = useDiscoverFace();
  const s = useScout(face.live ? face.aid : NO_AID);
  return face.live ? s.queue.length : 0;
}

/* ══ Discover (Phone app v4: pushed from the Agents tab) ══ */
export const DiscoverPhone: React.FC = () => {
  const navigate = useNavigate();
  const face = useDiscoverFace();
  const s = useScout(face.live ? face.aid : NO_AID);
  const db = useScriptAllyDb();
  const notified = notifyPrefs(db.currentUser?.notifyPrefs).discover;
  const [busy, setBusy] = useState<string | null>(null);
  const [peek, setPeek] = useState<CommunityAgent | null>(null);

  /* the Discover page's own add path (DiscoverPage `decide`): add, record the decision, the increment; Undo reverses both */
  const add = async (ca: CommunityAgent) => {
    const ms = s.manuscript;
    if (!s.io || !ms || busy) return;
    setBusy(ca.id);
    const before = s.decisions.find((d) => d.id === ca.id);
    const r = await s.io.add(ca, ms.title);
    if ("error" in r) { setBusy(null); showUndoBar({ message: r.error, sub: "" }); return; }
    try {
      await s.io.writeDecision({ id: ca.id, ...decisionDoc("added", Date.now(), ms.id) });
    } catch {
      await s.io.undoAdd(r.agentId, ca.id, before).catch(() => {});
      setBusy(null);
      showUndoBar({ message: "That didn’t save. Check your connection and try again.", sub: "" });
      return;
    }
    s.io.scheduleIncrement(ca.id, 8500);
    setBusy(null);
    const io = s.io;
    showUndoBar({ message: `Added ${ca.name || ca.agency} to your contact list.`, sub: "", undo: async () => { io.cancelIncrement(ca.id); await io.undoAdd(r.agentId, ca.id, before); } });
  };

  return (
    <div className="pa-agents" data-pa="discover">
      <div className="pa-agbody">
        {!face.live ? (
          <section className="pa-dsoon" data-pa="d-soon">
            <span className="pa-dspot" aria-hidden="true">{PI.scope}</span>
            <h2 className="pa-dname">The Scout is out looking</h2>
            <p>As writers join, their agent lists build one shared catalogue. Every agent in it is checked by hand before the Scout brings you the ones who want a book like {s.manuscript?.title ?? "yours"}, with the reasons they fit. Nothing joins your contact list without you.</p>
            {/* ⚠️ ONE LEAF, `notifyPrefs.discover` — the desktop's own write (the whole map would drop Settings' other keys) */}
            <button type="button" className="pa-pri" data-pa="d-notify" aria-pressed={notified} onClick={() => { void db.updateUserPaths({ "notifyPrefs.discover": !notified }); }}>
              {notified ? <>{PI.check}We’ll tell you</> : "Tell me when it’s ready"}
            </button>
          </section>
        ) : null}
        {face.live ? <div className="pa-dintro">
          <span className="pa-dspot" aria-hidden="true">{PI.scope}</span>
          <p>Verified agents who have told the Scout they’re looking for books like {s.manuscript?.title ?? "yours"}.</p>
        </div> : null}
        {face.live ? s.queue.map((p) => {
          const ca = p.agent;
          const reply = replyWords(ca.responseTimeWeeks), how = howWords(ca.submissionMethod);
          return (
            <article key={ca.id} className="pa-dcard" data-pa="d-card" data-id={ca.id}>
              <div className="pa-dband" data-pa="d-band"><span>{PI.verified}Verified by the Scout</span><span data-pa="d-door">{doorWords(ca)}</span></div>
              <div className="pa-dbody">
                <div className="pa-drow"><span className="pa-amono sm">{initialsOf(ca.name || ca.agency)}</span><div><div className="pa-dname">{ca.name || ca.agency}</div>{ca.name && ca.agency ? <div className="pa-asub">{ca.agency}</div> : null}</div></div>
                {ca.mswlNotes?.trim() || ca.genres?.length ? (
                  <div className="pa-dwish" data-pa="d-wish">
                    <div className="pa-asub">Looking for</div>
                    {ca.mswlNotes?.trim() ? <p>{ca.mswlNotes.trim()}</p> : null}
                    {ca.genres?.length ? <div className="pa-pillrow">{ca.genres.map((g) => <span key={g} className="pa-tag white">{g}</span>)}</div> : null}
                  </div>
                ) : null}
                {reply || how ? <div className="pa-dfacts" data-pa="d-facts">{reply ? <span>{PI.clock}{reply}</span> : null}{how ? <span>{ca.submissionMethod === SubmissionMethod.EMAIL ? PI.mail : PI.globe}{how}</span> : null}</div> : null}
                <div className="pa-dacts">
                  <button type="button" className="pa-pri sm" data-pa="d-add" disabled={busy === ca.id} onClick={() => void add(ca)}>{PI.plus}Add to my agents</button>
                  <button type="button" className="pa-sec sm" data-pa="d-profile" onClick={() => setPeek(ca)}>Profile</button>
                </div>
              </div>
            </article>
          );
        }) : null}
        {face.live && !s.loading && !s.queue.length ? <p className="pa-tdnone" data-pa="d-none">No new agents for this book just now. The Scout keeps looking.</p> : null}
      </div>
      <MobileSheet open={!!peek} onClose={() => setPeek(null)} ariaLabel={peek?.name || "Agent"} pa={{ height: "auto", white: true, className: "pa-agmore" }}>
        {peek ? (
          <div className="pa-abody" data-pa="d-profile-sheet">
            <div className="pa-dname">{peek.name || peek.agency}</div>
            {peek.name && peek.agency ? <div className="pa-asub">{peek.agency}</div> : null}
            {peek.mswlNotes?.trim() ? <><div className="pa-asec">What they’re looking for</div><p className="pa-aquote">“{peek.mswlNotes.trim().replace(/[.]$/, "")}.”</p></> : null}
            {peek.materialsWanted?.length ? <><div className="pa-asec">They ask for</div><div className="pa-pillrow">{peek.materialsWanted.map((m) => <span key={m} className="pa-tag white">{m}</span>)}</div></> : null}
            <p className="pa-asub">{[howWords(peek.submissionMethod), domainOf(peek)].filter(Boolean).join(" · ")}</p>
            <p className="pa-asub">{doorWords(peek)}</p>
          </div>
        ) : null}
      </MobileSheet>
    </div>
  );
};
