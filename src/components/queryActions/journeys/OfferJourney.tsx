/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * D6 · THE OFFER (design-refs/query-actions-v11.html §3.15). For a query in Offer.
 * The offer → The others → The call → Your decision → Check and save / accept / decline.
 *
 * ⚠️ THE OTHERS ARE FLAT FIELDS ON EACH OTHER QUERY (§R) — `offerRefQueryId`, `offerTold`,
 * `offerReply`, `offerToldOn` — never a map on the offering query (the nested-allowlist denial). That
 * is also what lets each "tell them" task derive from its own query.
 *
 * Accepting writes a SIGNED rung (both stores, `eventKey: signed`) and recomputes, so the status is
 * derived; each ticked query closes as Withdrawn with `closingReason: accepted_offer`
 * (`withdrawn_on_offer`) and, with the reminder on, `withdrawTold: false` for its "tell them you've
 * signed" to-do. Declining closes this query as Withdrawn with `closingReason: offer_declined` — the
 * writer's decision, NOT a pass; it still counts as an offer received (the Offer rung stays).
 */
import React, { useMemo, useState } from "react";
import { deleteField, doc, setDoc } from "firebase/firestore";
import { db as fsdb } from "../../../lib/firebase";
import { useScriptAllyDb } from "../../../lib/db";
import { recomputeQuery } from "../../../lib/recomputeQuery";
import { ActivityType, QueryStatus, type Query } from "../../../types";
import { recordQueryResponse, type RecordResponseData } from "../../../lib/recordResponse";
import { addDays, dayDiff, dayIso, fmt, futureWeeks, offWeekend, toDay, up } from "../../../lib/queryActions/dates";
import type { TrackPoint } from "../../../lib/queryActions/track";
import { DateField, Fl, Note, PlanTrack, Radios, Seg, TextBox, Toggle, Who, initialsOf } from "../controls";
import type { JourneyProps } from "../QueryDrawer";
import type { Guard, JourneyStep, JourneyView } from "../journey";
import { emptyView } from "./ResponseJourney";
import { agentName, dayIn, dayOut, firstName, isLive, nrmnOf, seedOf, statusWords, whoLine } from "./common";

type Reply = "wait" | "full" | "aside" | "offer";
const REPLY: [Reply, string][] = [["wait", "Waiting"], ["full", "Wants the full"], ["aside", "Stepped aside"], ["offer", "Offered too"]];
type Dec = "wait" | "accept" | "decline";

const closeData = (on: Date, token: string, key: "withdrawn_on_offer" | "offer_declined", notes = ""): RecordResponseData => ({
  responseType: "close", materialsType: "Pages", materialsQuantity: 0, materialsOtherText: "", expectedBy: "", sendReminderDate: "",
  dateReceived: dayIso(on), rrNotes: "", feedbackType: "Form", feedbackText: "", privateReflection: "", rejectionLesson: "",
  requeryPreference: "", offerDate: "", offerDeadline: "", offerNotes: "",
  closingReason: "Withdrew my submission", closingNotes: notes, eventKey: key, closeAs: "withdrawn", closingToken: token,
});

/** Parking (§6.4): every answer as plain data, days as `YYYY-MM-DD`. */
interface OfferAnswers {
  told: Record<string, boolean>; reply: Record<string, Reply>; call: "none" | "booked" | "done";
  callMode: string; callCustom: string | null; callNotes: string; dec: Dec;
  withdraw: Record<string, boolean>; remindTell: boolean;
}

export function OfferJourney({ req, today, children }: JourneyProps) {
  const db = useScriptAllyDb();
  const S = seedOf<OfferAnswers>(req);
  const q = db.queries.find((x) => x.id === req.queryId) || null;
  const agent = q ? db.agents.find((a) => a.id === q.agentId) || null : null;
  const others = useMemo(
    () => (q ? db.queries.filter((x) => x.id !== q.id && x.manuscriptId === q.manuscriptId && isLive(x)) : []),
    [q, db.queries],
  );
  /* a seeded mark wins for a query still in the list; one that has since closed simply falls away */
  const [told, setTold] = useState<Record<string, boolean>>(() => Object.fromEntries(others.map((o) => [o.id, S.told && o.id in S.told ? !!S.told[o.id] : o.offerRefQueryId === q?.id && !!o.offerTold])));
  const [reply, setReply] = useState<Record<string, Reply>>(() => Object.fromEntries(others.map((o) => [o.id, (S.reply && S.reply[o.id]) || (o.offerRefQueryId === q?.id && o.offerReply) || "wait"])));
  const [call, setCall] = useState<"none" | "booked" | "done">(S.call ?? q?.offerCall ?? "none");
  const [callMode, setCallMode] = useState(S.callMode ?? "2d");
  const [callCustom, setCallCustom] = useState<Date | null>(S.callCustom !== undefined ? dayIn(S.callCustom) : toDay(q?.offerCallOn));
  const [callNotes, setCallNotes] = useState(S.callNotes ?? "");
  const [dec, setDec] = useState<Dec>(S.dec ?? "wait");
  const [withdraw, setWithdraw] = useState<Record<string, boolean>>(S.withdraw ?? {});
  const [remindTell, setRemindTell] = useState(S.remindTell ?? true);
  /* a resumed journey was parked WITH answers, so it starts answered */
  const [touched, setTouched] = useState(!!req.seed);

  if (!q) return children(emptyView("OFFER OF REPRESENTATION", "The offer"));
  const first = firstName(agent);
  const offerOn = toDay(q.offerDate) ?? toDay(q.lastStatusChange) ?? today;
  const offerBy = toDay(q.offerResponseDeadline) ?? addDays(offerOn, 14);
  const left = dayDiff(offerBy, today);
  const nTold = others.filter((o) => told[o.id]).length;
  const nameOf = (o: Query) => agentName(db.agents.find((a) => a.id === o.agentId));
  const firstOf = (o: Query) => firstName(db.agents.find((a) => a.id === o.agentId));
  const callAnch = futureWeeks(today, [["1d", "Tomorrow", 1], ["2d", "In two days", 2], ["1w", "In a week", 7]]);
  const callOn: Date = callMode === "custom" && callCustom ? callCustom : (callAnch.find((x) => x.k === callMode) || callAnch[1]).d!;
  const wd = others.filter((o) => withdraw[o.id] !== false);
  const wantFull = others.filter((o) => told[o.id] && reply[o.id] === "full");
  const rival = others.filter((o) => told[o.id] && reply[o.id] === "offer");

  const steps: JourneyStep[] = [];
  steps.push({
    title: "The offer",
    summary: `Answer by ${fmt(offerBy)}`,
    body: (
      <>
        <PlanTrack className="qad-wsa" plan={{ title: "SO FAR", points: [
          { l: "Queried", d: toDay(q.dateSent) ?? offerOn, c: "done" },
          ...(toDay(q.fullSentDate) ? [{ l: "Full sent", d: toDay(q.fullSentDate)!, c: "done" as const }] : []),
          { l: "Offer", d: offerOn, c: "done" },
          { l: "Today", d: today, c: "today" },
          { l: "Answer by", d: offerBy, c: "fut" },
        ] }} />
        <p className="qad-wsl">{first} offered on {fmt(offerOn)}. You said you'd answer by {fmt(offerBy)} — <b>{left} days</b> from now.</p>
      </>
    ),
  });

  const g2: Guard | null = nTold < others.length ? { level: "check", msg: `${others.length - nTold} of ${others.length} still to be told` } : null;
  steps.push({
    title: "The others",
    summary: `${nTold} of ${others.length} told`,
    guard: g2,
    body: (
      <>
        <p className="qad-secs">Everyone still considering <b>{db.manuscripts.find((m) => m.id === q.manuscriptId)?.title ?? "this book"}</b> should hear about the offer and your deadline. Tick them off as you tell them, and note what they say.</p>
        <div className="qad-othr">
          {others.map((o) => (
            <div className="qad-oth" key={o.id} data-qad-other={o.id}>
              <div className="qad-ot">
                <span className="qad-av">{initialsOf(nameOf(o))}</span>
                <span><b>{nameOf(o)}</b><small>{statusWords(o.status).toUpperCase()} · {(db.agents.find((a) => a.id === o.agentId)?.agency ?? "").toUpperCase()}</small></span>
                <button type="button" className={`qad-told${told[o.id] ? " on" : ""}`} data-qad-told={o.id}
                  onClick={() => { setTold({ ...told, [o.id]: !told[o.id] }); setTouched(true); }}>{told[o.id] ? "✓ Told" : "Mark as told"}</button>
              </div>
              {told[o.id] ? <Seg wide sm value={reply[o.id] ?? "wait"} onPick={(k) => { setReply({ ...reply, [o.id]: k }); setTouched(true); }} options={REPLY} /> : null}
            </div>
          ))}
        </div>
        {wantFull.length ? <Note kind="info" tag="NEXT">{wantFull.map(firstOf).join(" and ")} {wantFull.length > 1 ? "want" : "wants"} the full — we'll add “Send the full” to your to-do for today.</Note> : null}
        {rival.length ? <Note kind="ok" tag="ANOTHER OFFER">{rival.map(firstOf).join(" and ")} offered too. Record it on {rival.length > 1 ? "their queries" : "their query"} so you can compare.</Note> : null}
      </>
    ),
  });

  steps.push({
    title: "The call",
    summary: call === "none" ? "Not arranged" : call === "booked" ? `Booked · ${fmt(callOn)}` : "Had the call",
    body: (
      <>
        <p className="qad-secs">Most agents offer a call to talk through the book and how they work. Optional.</p>
        <Seg wide value={call} onPick={(k) => { setCall(k); setTouched(true); }} options={[["none", "Not arranged"], ["booked", "Booked"], ["done", "Had the call"]]} />
        {call === "booked" ? (
          <DateField id="ofCall" label="CALL ON" value={callOn} anchors={callAnch} dir="future" forceKey={callMode === "custom" ? null : callMode}
            onPick={(d, k) => { if (!d) return; if (k === "custom") { setCallMode("custom"); setCallCustom(d); } else setCallMode(k); setTouched(true); }} />
        ) : null}
        {call === "done" ? (<><Fl>NOTES FROM THE CALL · OPTIONAL</Fl><TextBox value={callNotes} onChange={(v) => { setCallNotes(v); setTouched(true); }} placeholder="What they said about the book, edits, their list, how they work." /></>) : null}
      </>
    ),
  });

  const recordPts: TrackPoint[] = dec === "wait"
    ? [{ l: "Offer", d: offerOn, c: "done" }, ...(call === "booked" ? [{ l: "Call", d: callOn, c: "fut" as const }] : []), { l: "Answer by", d: offerBy, c: "fut" }]
    : [{ l: "Queried", d: toDay(q.dateSent) ?? offerOn, c: "done" }, ...(toDay(q.fullSentDate) ? [{ l: "Full sent", d: toDay(q.fullSentDate)!, c: "done" as const }] : []), { l: "Offer", d: offerOn, c: "done" }, { l: dec === "accept" ? "Signed" : "Declined", d: today, c: dec === "accept" ? "done" : "close" }];
  steps.push({
    title: "Your decision",
    summary: dec === "wait" ? "Still deciding" : dec === "accept" ? "Accepting" : "Declining",
    guard: dec === "accept" && nTold < others.length ? { level: "check", msg: "Not everyone has been told about the offer yet" } : null,
    plan: { title: dec === "wait" ? "WHAT'S AHEAD" : "THE RECORD", points: recordPts },
    body: (
      <>
        <Radios<Dec> value={dec} onPick={(k) => { setDec(k); setTouched(true); }} options={[
          { k: "wait", title: "Still deciding", sub: "Save your progress — nothing closes" },
          { k: "accept", title: `Accept ${first}'s offer`, sub: `${first} becomes your agent` },
          { k: "decline", title: `Decline ${first}'s offer`, sub: "This query closes as offer declined" },
        ]} />
        {dec === "accept" ? (
          <>
            <Fl right={`${wd.length} OF ${others.length}`}>WITHDRAW FROM EVERYONE ELSE</Fl>
            <div className="qad-othr">
              {others.map((o) => {
                const on = withdraw[o.id] !== false;
                return <Toggle key={o.id} testId={`wd-${o.id}`} on={on} small={statusWords(o.status).toUpperCase()} onClick={() => { setWithdraw({ ...withdraw, [o.id]: !on }); setTouched(true); }}>{nameOf(o)}</Toggle>;
              })}
            </div>
            <Toggle testId="remind-tell" on={remindTell} onClick={() => { setRemindTell(!remindTell); setTouched(true); }} style={{ marginTop: 14 }}>Remind me to tell each of them</Toggle>
          </>
        ) : null}
        {dec === "decline" ? <Note kind="info" tag="FOR THE RECORD">{first} stays on your Contact list. Declining an offer is recorded as your decision, not a pass.</Note> : null}
      </>
    ),
  });

  const saves = dec === "wait" ? [
    { text: `Progress saved: ${nTold} of ${others.length} told${call === "booked" ? `, call on ${fmt(callOn)}` : ""}` },
    ...(wantFull.length ? [{ text: `“Send the full” on your to-do for ${wantFull.map(firstOf).join(" and ")}`, dot: "var(--qad-blush)" }] : []),
    { text: `“Answer ${first}” stays pinned to your dashboard until ${fmt(offerBy)}` },
  ] : dec === "accept" ? [
    { text: <><b>Signed</b> — {agentName(agent)} becomes your agent for this book</>, dot: "var(--qad-offer)" },
    { text: `${wd.length} other ${wd.length === 1 ? "query closes" : "queries close"} as “withdrawn — accepted an offer”`, dot: "var(--qad-stone)" },
    ...(remindTell && wd.length ? [{ text: `${wd.length} “Tell them you've signed” to-dos, due ${fmt(offWeekend(addDays(today, 1)))}`, dot: "var(--qad-blush)" }] : []),
    { text: "Every planned nudge and reminder for this book comes off your to-do" },
  ] : [
    { text: `Query closes · offer declined · ${fmt(today)}`, dot: "var(--qad-stone)" },
    { text: "Your other queries carry on as they were" },
  ];

  const view: JourneyView = {
    eyebrow: "OFFER OF REPRESENTATION", title: "The offer",
    verb: dec === "wait" ? "save" : dec, verbDone: dec === "wait" ? "saved" : dec === "accept" ? "accepted" : "declined",
    button: dec === "wait" ? "Save progress" : dec === "accept" ? "Accept offer" : "Decline offer",
    ok: true, steps, saves,
    who: <Who name={agentName(agent)} sub={whoLine(agent, q)} nrmn={nrmnOf(q, agent)} />,
    dirty: touched,
    snapshot: (): OfferAnswers => ({ told, reply, call, callMode, callCustom: dayOut(callCustom), callNotes, dec, withdraw, remindTell }),
    touched: () => [q.id, ...others.map((o) => o.id)],
    commit: async () => {
      if (!db.currentUser) throw new Error("Signed out");
      const uid = db.currentUser.id;
      const ms = db.manuscripts.find((m) => m.id === q.manuscriptId) || null;
      /* the others' marks, and the call — saved in every decision */
      for (const o of others) {
        const patch: Record<string, unknown> = { offerRefQueryId: q.id, offerTold: !!told[o.id] };
        if (told[o.id]) { patch.offerReply = reply[o.id] ?? "wait"; if (!o.offerToldOn) patch.offerToldOn = dayIso(today); }
        await db.updateQuery(o.id, patch as Partial<Query>);
      }
      const callPatch: Record<string, unknown> = { offerCall: call };
      if (call === "booked") callPatch.offerCallOn = dayIso(callOn); else if (q.offerCallOn) callPatch.offerCallOn = deleteField();
      await db.updateQuery(q.id, callPatch as Partial<Query>);
      if (call === "booked" && !(q.offerCall === "booked" && q.offerCallOn && toDay(q.offerCallOn)?.getTime() === callOn.getTime())) {
        const id = "act-" + Math.random().toString(36).slice(2, 11);
        const note = `Offer call booked for ${fmt(callOn)}`;
        await setDoc(doc(fsdb, "users", uid, "queries", q.id, "activity", id), { type: "Offer call", createdAt: new Date().toISOString(), note, queryId: q.id, agentName: agent?.name || "The agent", eventKey: "offer_call" });
        await setDoc(doc(fsdb, "users", uid, "activities", id), { id, userId: uid, queryId: q.id, manuscriptId: q.manuscriptId, activityType: ActivityType.STATUS_CHANGED, description: `Offer call booked with ${agent?.name || "the agent"}`, date: new Date().toISOString(), details: note, eventKey: "offer_call" });
      }
      if (dec === "wait") {
        return { queryId: q.id, message: `Offer progress saved · ${agentName(agent)}`, sub: `ANSWER BY ${up(offerBy)}`, touched: [q.id] };
      }
      if (dec === "decline") {
        await recordQueryResponse({ userId: uid, query: q, agent, manuscript: ms }, closeData(today, "offer_declined", "offer_declined"));
        return { queryId: q.id, message: `Offer declined · ${agentName(agent)}`, sub: "YOUR OTHER QUERIES CARRY ON", touched: [q.id] };
      }
      /* accept: a SIGNED rung, derived through recompute */
      const id = "act-" + Math.random().toString(36).slice(2, 11);
      const nowIso = new Date().toISOString();
      const note = `Offer accepted — ${agent?.name || "the agent"} now represents this manuscript`;
      await setDoc(doc(fsdb, "users", uid, "queries", q.id, "activity", id), { type: QueryStatus.SIGNED, resultingStatus: QueryStatus.SIGNED, createdAt: nowIso, note, queryId: q.id, agentName: agent?.name || "The agent", eventKey: "signed" });
      await setDoc(doc(fsdb, "users", uid, "activities", id), { id, userId: uid, queryId: q.id, manuscriptId: q.manuscriptId, activityType: ActivityType.OFFER_ACCEPTED, description: note, date: nowIso, details: "", resultingStatus: QueryStatus.SIGNED, eventKey: "signed" });
      await recomputeQuery(uid, q.id);
      let n = 0;
      for (const o of wd) {
        await recordQueryResponse({ userId: uid, query: o, agent: db.agents.find((a) => a.id === o.agentId) || null, manuscript: ms }, closeData(today, "accepted_offer", "withdrawn_on_offer"));
        const patch: Record<string, unknown> = {};
        if (remindTell) patch.withdrawTold = false;
        if (o.nudgeDate) patch.nudgeDate = deleteField();
        if (o.closePlan) patch.closePlan = deleteField();
        if (Object.keys(patch).length) await db.updateQuery(o.id, patch as Partial<Query>);
        n++;
      }
      const clear: Record<string, unknown> = {};
      if (q.nudgeDate) clear.nudgeDate = deleteField();
      if (q.closePlan) clear.closePlan = deleteField();
      if (Object.keys(clear).length) await db.updateQuery(q.id, clear as Partial<Query>);
      return { queryId: q.id, message: `Signed with ${agentName(agent)}`, sub: `${n} OTHER ${n === 1 ? "QUERY" : "QUERIES"} WITHDRAWN`, touched: [q.id, ...others.map((o) => o.id)] };
    },
  };
  return children(view, req.preset?.step);
}
