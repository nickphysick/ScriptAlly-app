/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * D2 · RECORD A RESPONSE (design-refs/query-actions-v11.html §3.11), including a LATE REPLY to a
 * closed query. The response → (details) → Check and save.
 *
 * The write is `recordQueryResponse` — the one response path — so the derivation, the feed twin and
 * the detail fields behave exactly as every other response does. The drawer adds only its own flat
 * fields around it (the request's section, the resubmit-by date, the planned nudge cancelled, the
 * offer's "tell the others" marks) and, for a late reply to a query closed as no reply, removes the
 * closure entry first so Analytics counts the reply (ruling: the ending is REPLACED, not appended to).
 */
import { QueryPicker } from "./QueryPicker";
import React, { useMemo, useState } from "react";
import { collection, deleteDoc, deleteField, doc, getDocs, query as fsQuery, where } from "firebase/firestore";
import { db as fsdb } from "../../../lib/firebase";
import { useScriptAllyDb } from "../../../lib/db";
import { QueryStatus, type EventKey, type Query } from "../../../types";
import { recordQueryResponse, type RecordResponseData } from "../../../lib/recordResponse";
import {
  addDays, dayIso, fmt, futureWeeks, offWeekend, pastAnchors, toDay, up,
} from "../../../lib/queryActions/dates";
import { bookOf, capFirst, sampleName, type Sample } from "../../../lib/queryActions/sample";
import {
  Chips, DateField, Fl, Note, SampleControl, SampleLine, TextBox, Toggle, Who,
} from "../controls";
import type { JourneyProps } from "../QueryDrawer";
import type { JourneyStep, JourneyView, SaveLine } from "../journey";
import { agentName, firstName, isLive, nrmnOf, statusWords, whoLine } from "./common";

type RType = "partial" | "full" | "rr" | "pass" | "offer";
const RL: Record<RType, string> = { partial: "Partial requested", full: "Full requested", rr: "Revise & resubmit", pass: "Pass", offer: "Offer" };
const SAVED_LABEL: Record<RType, string> = { partial: "Partial requested", full: "Full requested", rr: "Revise & resubmit", pass: "Passed", offer: "Offer" };
const DOT: Record<RType, string> = { partial: "var(--qad-rose)", full: "var(--qad-rose)", rr: "var(--qad-rose)", pass: "var(--qad-stone)", offer: "var(--qad-offer)" };
const KEY: Record<RType, EventKey> = { partial: "partial_requested", full: "full_requested", rr: "rr_requested", pass: "pass", offer: "offer" };
const REMIND: [string, string, number | null][] = [["2d", "Two days before", -2], ["1d", "The day before", -1], ["0", "On the day", 0], ["no", "No reminder", null]];

/**
 * v1.1 — opened with no query at all (the sidebar's "Record a response"), the first step is
 * choosing one. A wrapper rather than a branch inside the journey, so no hook is ever conditional.
 */
export function ResponseJourney(props: JourneyProps) {
  if (!props.req.queryId) return <QueryPicker onPick={props.pickQuery}>{(v) => props.children(v)}</QueryPicker>;
  return <ResponseJourneyForQuery {...props} />;
}

function ResponseJourneyForQuery({ req, today, children }: JourneyProps) {
  const db = useScriptAllyDb();
  const q = db.queries.find((x) => x.id === req.queryId) || null;
  const agent = q ? db.agents.find((a) => a.id === q.agentId) || null : null;
  const ms = q ? db.manuscripts.find((m) => m.id === q.manuscriptId) || null : null;
  const book = useMemo(() => bookOf(ms?.wordCount), [ms?.wordCount]);
  const [type, setType] = useState<RType | null>(req.preset?.respType ?? null);
  const [recv, setRecv] = useState<Date>(today);
  const [s, setS] = useState<Sample>({ unit: "pages", amt: 50, from: 1, sect: false, fu: null });
  const [syn, setSyn] = useState(false);
  const [sendByMode, setSendByMode] = useState<string>("2w");
  const [sendByCustom, setSendByCustom] = useState<Date | null>(null);
  const [remind, setRemind] = useState("2d");
  const [fb, setFb] = useState<"form" | "personal">("form");
  const [note, setNote] = useState("");
  const [rrNote, setRrNote] = useState("");
  const [offerByMode, setOfferByMode] = useState("2w");
  const [offerByCustom, setOfferByCustom] = useState<Date | null>(null);
  const [notify, setNotify] = useState(true);
  const [touched, setTouched] = useState(!!req.preset?.respType);

  if (!q) return children(emptyView("RECORD A RESPONSE", "Record a response"));
  const first = firstName(agent);
  const late = !isLive(q);
  const closedNoReply = q.status === QueryStatus.NO_RESPONSE;
  const closedOn = toDay(q.lastStatusChange) ?? toDay(q.rejectedDate);
  const others = db.queries.filter((x) => x.id !== q.id && x.manuscriptId === q.manuscriptId && isLive(x) && x.status !== QueryStatus.OFFER);
  const otherFirsts = others.map((x) => firstName(db.agents.find((a) => a.id === x.agentId)));

  const reqAnch = futureWeeks(recv, [["1w", "In a week", 7], ["2w", "In two weeks", 14], ["4w", "In four weeks", 28]]);
  const sendAnch = [...reqAnch, { k: "none", label: "No date given", d: null }];
  const none = sendByMode === "none";
  const sendBy: Date | null = none ? null : sendByMode === "custom" && sendByCustom ? sendByCustom : (reqAnch.find((x) => x.k === sendByMode) || reqAnch[1]).d;
  const remindOff = REMIND.find((r) => r[0] === remind)?.[2] ?? null;
  const remindOn = sendBy && remindOff !== null ? addDays(sendBy, remindOff) : null;
  const noDateTask = offWeekend(addDays(today, 3));
  const offerAnch = futureWeeks(recv, [["1w", "In a week", 7], ["2w", "In two weeks", 14]]);
  const offerBy: Date = offerByMode === "custom" && offerByCustom ? offerByCustom : (offerAnch.find((x) => x.k === offerByMode) || offerAnch[1]).d!;
  const plannedNudge = toDay(q.nudgeDate);

  const lateNote = late ? (
    <Note kind="warn" tag="LATE REPLY">
      This query was {q.status === QueryStatus.REJECTED ? "recorded as passed" : "closed"}{closedOn ? ` on ${fmt(closedOn)}` : ""}{closedNoReply ? " (no reply)" : ""}. Recording a reply reopens it{closedNoReply ? " and replaces that ending" : ""}.
    </Note>
  ) : null;

  const steps: JourneyStep[] = [{
    title: "The response",
    summary: type ? `${RL[type]} · ${fmt(recv)}` : "Choose one",
    body: (
      <>
        {lateNote}
        <Fl>WHAT DID {first.toUpperCase()} SAY?</Fl>
        <Chips name="resp" value={type} onPick={(k) => { setType(k); setTouched(true); }}
          options={(Object.keys(RL) as RType[]).map((k) => [k, RL[k]] as [RType, string])} />
        <DateField id="recv" label="RECEIVED ON" value={recv} anchors={pastAnchors(today)} dir="past" onPick={(d) => { if (d) { setRecv(d); setTouched(true); } }} />
      </>
    ),
  }];

  if (type === "partial") {
    steps.push({
      title: "What they asked for",
      summary: `${syn ? "Synopsis, " : ""}${sampleName(s)}`,
      body: (
        <>
          <p className="qad-secs">Most requests are the opening pages; some want a later section.</p>
          <SampleControl name="req" sample={s} onChange={(x) => { setS(x); setTouched(true); }} book={book} />
          <Toggle testId="syn" on={syn} onClick={() => setSyn(!syn)}>A synopsis too</Toggle>
          <SampleLine label={`${syn ? "Synopsis and " : ""}${capFirst(sampleName(s))}`} sample={s} book={book} />
        </>
      ),
    });
  }
  if (type === "rr") {
    steps.push({
      title: "What they'd like revised",
      summary: rrNote.trim() ? rrNote.trim().slice(0, 60) : "",
      body: <TextBox value={rrNote} onChange={(v) => { setRrNote(v); setTouched(true); }} placeholder="Their notes, in your words or theirs." />,
    });
  }
  if (type === "partial" || type === "full" || type === "rr") {
    steps.push({
      title: type === "rr" ? "When you'll resubmit by" : "When you'll send it by",
      summary: none ? "No date given" : `By ${fmt(sendBy!)}`,
      body: (
        <>
          <DateField id="sendBy" label={type === "rr" ? "RESUBMIT BY" : "SEND BY"} value={sendBy} anchors={sendAnch} dir="future"
            forceKey={none ? "none" : sendByMode === "custom" ? null : sendByMode}
            onPick={(d, k) => { if (k === "custom") { setSendByMode("custom"); setSendByCustom(d); } else setSendByMode(k); setTouched(true); }} />
          {!none ? (
            <>
              <Fl>REMIND ME</Fl>
              <Chips name="remind" value={remind} onPick={setRemind} options={REMIND.map(([k, l]) => [k, l] as [string, string])} />
            </>
          ) : (
            <Note kind="info" tag="TIP">Agents who don't set a date still notice speed. We'll put “Send the {type === "full" ? "full" : "pages"}” on your to-do for <b>{fmt(noDateTask)}</b>, so it doesn't drift.</Note>
          )}
        </>
      ),
    });
  }
  if (type === "pass") {
    steps.push({
      title: "Feedback",
      summary: fb === "form" ? "Form rejection" : "A personal note",
      body: (
        <>
          <Fl>FEEDBACK</Fl>
          <Chips<"form" | "personal"> name="fb" value={fb} onPick={setFb} options={[["form", "Form rejection"], ["personal", "A personal note"]]} />
          {fb === "personal" ? (<><Fl>WHAT THEY SAID</Fl><TextBox value={note} onChange={setNote} placeholder="Worth keeping — patterns across passes show up in Analytics." /></>) : null}
        </>
      ),
    });
  }
  if (type === "offer") {
    steps.push({
      title: "The offer",
      summary: `Answer by ${fmt(offerBy)}`,
      body: (
        <>
          <DateField id="offerBy" label="THEY'D LIKE AN ANSWER BY" value={offerBy} anchors={offerAnch} dir="future"
            forceKey={offerByMode === "custom" ? null : offerByMode}
            onPick={(d, k) => { if (!d) return; if (k === "custom") { setOfferByMode("custom"); setOfferByCustom(d); } else setOfferByMode(k); }} />
          <Toggle testId="notify" on={notify} onClick={() => setNotify(!notify)} small={`${others.length} AGENTS`} style={{ marginTop: 16 }}>Tell the others who have it</Toggle>
          <Note kind="info" tag="WHY">
            It's standard to let every agent still considering <b>{ms?.title}</b> know you have an offer, with your deadline.{others.length ? ` We'll add one to-do per agent: ${otherFirsts.join(", ")}.` : " Nobody else has it at the moment."}
          </Note>
        </>
      ),
    });
  }

  const saves: SaveLine[] = [];
  if (type) {
    saves.push({ text: <>{agentName(agent)} → <b>{SAVED_LABEL[type]}</b>, {fmt(recv)}</>, dot: DOT[type] });
    if (type === "partial") saves.push({ text: `Request logged: ${syn ? "synopsis and " : ""}${sampleName(s)}` });
    if (type === "partial" || type === "full" || type === "rr") {
      if (none) saves.push({ text: `“Send the ${type === "full" ? "full" : "pages"}” on your to-do for ${fmt(noDateTask)}`, dot: "var(--qad-blush)" });
      else {
        saves.push({ text: `Your move, due ${fmt(sendBy!)} — it joins “Your move” in the Query Centre` });
        if (remindOn) saves.push({ text: `Reminder on ${fmt(remindOn)}`, dot: "var(--qad-blush)" });
      }
    }
    if (plannedNudge) saves.push({ text: `Your planned nudge (${fmt(plannedNudge)}) is cancelled — they've replied` });
    if (late) saves.push({ text: `The query reopens${closedNoReply ? " — the “no reply” ending is replaced, so Analytics counts the reply" : ""}` });
    if (type === "pass") saves.push({ text: `Query closed as passed. ${first} stays on your contact list, marked as queried for this book`, dot: "var(--qad-stone)" });
    if (type === "offer") {
      saves.push({ text: `Offer deadline ${fmt(offerBy)} pinned to the top of your dashboard` });
      if (notify && others.length) saves.push({ text: `${others.length} “Tell them about the offer” to-dos, due ${fmt(offWeekend(addDays(today, 1)))}`, dot: "var(--qad-blush)" });
    }
  }

  const view: JourneyView = {
    eyebrow: "RECORD A RESPONSE",
    title: "Record a response",
    verb: "save",
    verbDone: "saved",
    button: "Save response",
    ok: !!type,
    steps,
    preNote: !type ? <Note kind="info" tag="NEXT" style={{ marginTop: 22 }}>Pick the response and the rest of the form fits it.</Note> : undefined,
    saves,
    who: <Who name={agentName(agent)} sub={whoLine(agent, q)} nrmn={nrmnOf(q, agent)} />,
    dirty: touched,
    touched: () => [q.id, ...(type === "offer" && notify ? others.map((x) => x.id) : [])],
    commit: async () => {
      if (!type || !db.currentUser) throw new Error("No response chosen");
      const unit = s.unit === "words" ? "Words" : s.unit === "chapters" ? "Chapters" : "Pages";
      const data: RecordResponseData = {
        responseType: type === "pass" ? "rejected" : type,
        materialsType: unit, materialsQuantity: s.amt, materialsOtherText: "",
        expectedBy: type !== "pass" && type !== "offer" && sendBy ? dayIso(sendBy) : "",
        sendReminderDate: type === "partial" || type === "full" || type === "rr" ? (none ? dayIso(noDateTask) : remindOn ? dayIso(remindOn) : "") : "",
        dateReceived: dayIso(recv),
        rrNotes: rrNote,
        feedbackType: fb === "personal" ? "Yes" : "Form",
        feedbackText: fb === "personal" ? note : "",
        privateReflection: "", rejectionLesson: "", requeryPreference: "",
        offerDate: type === "offer" ? dayIso(recv) : "",
        offerDeadline: type === "offer" ? dayIso(offerBy) : "",
        offerNotes: "",
        closingReason: "Other", closingNotes: "",
        eventKey: KEY[type],
      };
      await recordQueryResponse({ userId: db.currentUser.id, query: q, agent, manuscript: ms }, data);
      /* A late reply to a query closed as NO REPLY replaces that ending.
         AFTER THE REPLY, NEVER BEFORE IT, so the query never reads No Response with no closure step
         in between. (That order once also beat the runtime repair to the rung; the repair is deleted,
         28 Sep, and the order is kept because it is still the one that never leaves a gap.) A closure
         step may be a reconstructed one (`act-status-no-response-<qid>`). The status is unchanged by
         its going: the reply is the last rung.
         ⚠️ NOT `db.deleteActivity`: it finds its target in the FEED, and a closure written only to the
         query's own log has no feed row. Both stores are cleared here, by id and by the projection's
         status; the undo snapshot holds every document either delete touches. */
      if (closedNoReply) {
        const uid = db.currentUser.id;
        const log = await db.readQueryActivity(q.id);
        const closures = log.filter((e) => (e.data.resultingStatus ?? e.data.type) === QueryStatus.NO_RESPONSE);
        for (const c of closures) await deleteDoc(doc(fsdb, "users", uid, "queries", q.id, "activity", c.id));
        const feed = await getDocs(fsQuery(collection(fsdb, "users", uid, "activities"), where("queryId", "==", q.id)));
        for (const f of feed.docs) if (closures.some((c) => c.id === f.id) || f.data().resultingStatus === QueryStatus.NO_RESPONSE) await deleteDoc(f.ref);
      }
      const extra: Record<string, unknown> = {};
      if (q.nudgeDate) extra.nudgeDate = deleteField();
      if (q.closePlan) extra.closePlan = deleteField();
      if (type === "rr" && sendBy) extra.expectedSendDate = dayIso(sendBy);
      if (type === "partial") {
        extra.requestSynopsis = syn;
        if (s.sect) { extra.requestFrom = s.from; extra.requestFromUnit = s.fu ?? (s.unit === "pages" ? "page" : "chapter"); }
        else { if (q.requestFrom != null) extra.requestFrom = deleteField(); if (q.requestFromUnit) extra.requestFromUnit = deleteField(); }
      }
      if (Object.keys(extra).length) await db.updateQuery(q.id, extra as Partial<Query>);
      if (type === "offer" && notify) {
        for (const o of others) await db.updateQuery(o.id, { offerRefQueryId: q.id, offerTold: false } as Partial<Query>);
      }
      return {
        queryId: q.id,
        message: `${SAVED_LABEL[type]} · ${agentName(agent)}`,
        sub: type === "partial" || type === "full" || type === "rr"
          ? `SEND BY ${up(sendBy ?? noDateTask)}${plannedNudge ? " · PLANNED NUDGE CANCELLED" : ""}`
          : type === "offer" ? `ANSWER BY ${up(offerBy)}` : "CLOSED AS PASSED",
        touched: [q.id],
      };
    },
  };
  return children(view, type && req.preset?.respType ? 1 : undefined);
}


export function emptyView(eyebrow: string, title: string): JourneyView {
  return {
    eyebrow, title, verb: "save", verbDone: "saved", button: "Save", ok: false, steps: [], saves: [], dirty: false,
    preNote: <Note kind="info" tag="GONE">This query is no longer on your list.</Note>,
    touched: () => [], commit: async () => { throw new Error("No query"); },
  };
}
export { statusWords };
