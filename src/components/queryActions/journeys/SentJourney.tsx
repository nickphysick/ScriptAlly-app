/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * D3 · I'VE SENT IT (design-refs/query-actions-v11.html §3.14) — for a query in Partial requested,
 * Full requested or Revise & resubmit. The request → What you're sending → Sending it → Reading
 * window → Check and log.
 *
 * The write is `recordMaterialsSent`, the one send path, so the rung, its feed twin and the
 * recompute are the same as every other send. After a revise-and-resubmit the rung carries the new
 * RESUBMITTED status (K6) rather than a second Full Sent.
 *
 * ⚠️ THE DUPLICATE-SEND GUARD IS THE SAME ONE `useTaskCommit` CONSULTS (`priorSameTypeSend`), here
 * as a CHECK: a second partial to one agent is legitimate (a resend) and unusual, which is exactly
 * what a check is for.
 */
import React, { useMemo, useState } from "react";
import { deleteField } from "firebase/firestore";
import { useScriptAllyDb } from "../../../lib/db";
import { QueryStatus, SubmissionMethod, type Query } from "../../../types";
import {
  addDays, dayDiff, dayIso, dm, fmt, offWeekend, pastAnchors, rel, toDay, up, type Anchor,
} from "../../../lib/queryActions/dates";
import { bookOf, capFirst, sameSample, sampleName, type Sample } from "../../../lib/queryActions/sample";
import { priorSameTypeSend } from "../../../lib/todoWalk";
import {
  Chips, DateField, Fl, Note, NoteLink, PlanTrack, Radios, SampleControl, SampleLine, TextBox, Toggle, Who,
} from "../controls";
import type { JourneyProps } from "../QueryDrawer";
import type { Guard, JourneyStep, JourneyView } from "../journey";
import type { TrackPoint } from "../../../lib/queryActions/track";
import { emptyView } from "./ResponseJourney";
import { agentName, firstName, nrmnOf, viaLabel, viaOptions, whoLine } from "./common";

type Kind = "partial" | "full" | "rr";

/** The stored request → the sample it asked for, or null when the request named no amount. */
export function requestSample(q: Query): Sample | null {
  const t = String(q.materialsRequestedType ?? "").toLowerCase();
  const n = parseInt(String(q.materialsRequestedQuantity ?? "").replace(/,/g, ""), 10);
  if (!Number.isFinite(n) || n <= 0) return null;
  const unit = t === "words" ? "words" : t === "chapters" ? "chapters" : t === "pages" ? "pages" : null;
  if (!unit) return null;
  const sect = typeof q.requestFrom === "number" && q.requestFrom > 1;
  return { unit, amt: n, from: sect ? q.requestFrom! : 1, sect, fu: sect ? (q.requestFromUnit ?? null) : null };
}

export function SentJourney({ req, today, children }: JourneyProps) {
  const db = useScriptAllyDb();
  const q = db.queries.find((x) => x.id === req.queryId) || null;
  const agent = q ? db.agents.find((a) => a.id === q.agentId) || null : null;
  const ms = q ? db.manuscripts.find((m) => m.id === q.manuscriptId) || null : null;
  const book = useMemo(() => bookOf(ms?.wordCount), [ms?.wordCount]);
  const reqSample = q ? requestSample(q) : null;
  const drafts = [...(ms?.bookVersions ?? [])].reverse();
  const [s, setS] = useState<Sample>(reqSample ?? { unit: "pages", amt: 50, from: 1, sect: false, fu: null });
  const [syn, setSyn] = useState<boolean>(!!q?.requestSynopsis);
  const [ver, setVer] = useState<string | null>(drafts[0]?.id ?? null);
  const [changed, setChanged] = useState("");
  const [sent, setSent] = useState<Date>(today);
  const [via, setVia] = useState<SubmissionMethod>((q?.sendMethod as SubmissionMethod) || SubmissionMethod.EMAIL);
  const [expMode, setExpMode] = useState("w1");
  const [expCustom, setExpCustom] = useState<Date | null>(null);
  const [ifNo, setIfNo] = useState<"nudge" | "nothing">("nudge");
  const [touched, setTouched] = useState(false);

  if (!q) return children(emptyView("SENT WHAT THEY ASKED FOR", "I’ve sent it"));
  const kind: Kind = q.status === QueryStatus.FULL_REQUESTED ? "full" : q.status === QueryStatus.REVISE_RESUBMIT ? "rr" : "partial";
  const first = firstName(agent);
  const reqOn = (kind === "partial" ? toDay(q.partialRequestedDate) : kind === "full" ? toDay(q.fullRequestedDate) : null) ?? toDay(q.lastStatusChange) ?? today;
  const due = toDay(q.expectedSendDate);
  const what = kind === "full" ? "the full manuscript" : kind === "rr" ? "a revised manuscript" : reqSample ? `the ${sampleName(reqSample)}` : "a partial";
  const target = kind === "partial" ? QueryStatus.PARTIAL_SENT : kind === "full" ? QueryStatus.FULL_SENT : QueryStatus.RESUBMITTED;
  const lab = kind === "full" ? "Full sent" : kind === "rr" ? "Resubmitted" : "Partial sent";
  const lastRead = kind === "rr"
    ? db.activities.filter((a) => a.queryId === q.id && a.resultingStatus === QueryStatus.FULL_SENT && a.bookVersionId)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]?.bookVersionId ?? null
    : null;

  /* ---------- the request ---------- */
  const soFar: TrackPoint[] = [
    { l: "Queried", d: toDay(q.dateSent) ?? reqOn, c: "done" },
    { l: kind === "rr" ? "Revise & resubmit" : kind === "full" ? "Full requested" : "Partial requested", d: reqOn, c: "done" },
    ...(due ? [{ l: "Send by", d: due, c: "fut" as const }] : []),
    { l: "Today", d: today, c: "today" },
  ];
  const left = due ? dayDiff(due, today) : null;
  const steps: JourneyStep[] = [{
    title: "The request",
    summary: `${kind === "partial" && reqSample ? sampleName(reqSample) : kind === "full" ? "Full manuscript" : kind === "rr" ? "Revision" : "Partial"}${due ? ` · due ${fmt(due)}` : ""}`,
    body: (
      <>
        <PlanWs points={soFar} />
        <p className="qad-wsl">
          {first} asked for {what} on {fmt(reqOn)}.{" "}
          {!due ? "They didn't give a date." : left! > 0 ? `It's due by ${fmt(due)}, ${rel(due, today)}.` : left === 0 ? <>It's due <b>today</b>.</> : `It was due ${fmt(due)}, ${rel(due, today)}.`}
        </p>
      </>
    ),
  }];

  /* ---------- what you're sending ---------- */
  const mismatch = kind === "partial" && reqSample && !sameSample(reqSample, s);
  const dupISO = priorSameTypeSend(db.activities, q.id, target, kind === "rr");
  const g2: Guard | null = mismatch
    ? { level: "check", msg: `${first} asked for the ${sampleName(reqSample!)} — you're sending ${s.sect ? "" : "the "}${sampleName(s)}` }
    : kind === "rr" && lastRead && ver === lastRead
      ? { level: "check", msg: `That's the version ${first} has already read` }
      : null;
  const verName = drafts.find((d) => d.id === ver)?.name ?? null;
  steps.push({
    title: "What you're sending",
    summary: kind === "partial" ? `${syn ? "Synopsis and " : ""}${sampleName(s)}` : `${kind === "full" ? "Full manuscript" : "Revised manuscript"}${verName ? ` · ${verName}` : ""}`,
    guard: g2,
    ownWarn: !!g2,
    body: kind === "partial" ? (
      <>
        <SampleControl name="sent" sample={s} book={book} onChange={(x) => { setS(x); setTouched(true); }} />
        <Toggle testId="syn" on={syn} onClick={() => { setSyn(!syn); setTouched(true); }}>A synopsis too</Toggle>
        <SampleLine label={`${syn ? "Synopsis and " : ""}${sampleName(s)}`} sample={s} book={book} />
        {reqSample && !mismatch ? <Note kind="ok" tag="MATCH">Matches what {first} asked for.</Note> : null}
        {mismatch ? <Note kind="warn" tag="CHECK">{first} asked for the {sampleName(reqSample!)}. <NoteLink onClick={() => setS(reqSample!)}>Match the request</NoteLink></Note> : null}
      </>
    ) : (
      <>
        {drafts.length ? (
          <>
            <Fl>WHICH VERSION</Fl>
            <Radios value={ver} onPick={(k) => { setVer(k); setTouched(true); }}
              options={drafts.map((d, i) => ({
                k: d.id,
                title: d.name,
                sub: kind === "rr"
                  ? (d.id === lastRead ? "The version they read" : i === 0 ? "Your revision · new" : fmt(toDay(d.createdDate) ?? today))
                  : i === 0 ? `Current${ms?.wordCount ? ` · ${ms.wordCount.toLocaleString("en-GB")} words` : ""}` : fmt(toDay(d.createdDate) ?? today),
              }))} />
          </>
        ) : null}
        <Toggle testId="syn" on={syn} onClick={() => { setSyn(!syn); setTouched(true); }} style={{ marginTop: 12 }}>A synopsis too</Toggle>
        {kind === "rr" ? (<><Fl>WHAT YOU CHANGED · OPTIONAL</Fl><TextBox value={changed} onChange={setChanged} placeholder="A few lines on the revision, for your own record." /></>) : null}
        {kind === "rr" && lastRead && ver === lastRead ? <Note kind="warn" tag="CHECK">That's the version {first} has already read.</Note> : null}
      </>
    ),
  });

  /* ---------- sending it ---------- */
  const g3: Guard | null = dayDiff(sent, reqOn) < 0
    ? { level: "block", msg: "That date is before they asked" }
    : due && dayDiff(sent, due) > 0
      ? { level: "check", msg: `That's after the ${fmt(due)} deadline` }
      : dupISO
        ? { level: "check", msg: `You logged a ${kind === "full" ? "full" : "partial"} to ${first} on ${fmt(toDay(dupISO) ?? today)} — this logs another` }
        : null;
  steps.push({
    title: "Sending it",
    summary: `${fmt(sent)} · ${viaLabel(via)}`,
    guard: g3,
    body: (
      <>
        <DateField id="msSent" label="SENT ON" value={sent} anchors={pastAnchors(today)} dir="past" onPick={(d) => { if (d) { setSent(d); setTouched(true); } }} />
        <Fl>VIA</Fl>
        <Chips<SubmissionMethod> name="via" options={viaOptions(agent)} value={via} onPick={(k) => { setVia(k); setTouched(true); }} />
      </>
    ),
  });

  /* ---------- reading window ---------- */
  const wk = kind === "partial" ? [6, 8, 10] : [8, 12, 16];
  const ex: Anchor[] = wk.map((w, i) => {
    const d = addDays(sent, w * 7);
    return { k: `w${i}`, label: i === 1 ? `Usual for a ${kind === "partial" ? "partial" : "full"} · ${w} wks` : `${w} wks`, d, sub: dm(d) };
  });
  const exp: Date = expMode === "custom" && expCustom ? expCustom : (ex.find((x) => x.k === expMode) || ex[1]).d!;
  const nd = ifNo === "nudge" ? offWeekend(addDays(exp, 7)) : null;
  steps.push({
    title: "Reading window",
    summary: `Reply by ${fmt(exp)}`,
    plan: {
      title: "THE PLAN",
      points: [
        { l: "Queried", d: toDay(q.dateSent) ?? reqOn, c: "done" },
        { l: "Requested", d: reqOn, c: "done" },
        { l: lab, d: sent, c: "done" },
        { l: "Reply due", d: exp, c: "fut" },
        ...(nd ? [{ l: "Nudge", d: nd, c: "nudge" as const }] : []),
      ],
    },
    body: (
      <>
        <p className="qad-secs">{kind === "partial" ? "Partials" : "Full manuscripts"} usually take longer than queries. We'll restart the clock from the day you sent it.</p>
        <DateField id="msExp" label="REPLY EXPECTED BY" value={exp} anchors={ex} dir="future" forceKey={expMode === "custom" ? null : expMode}
          onPick={(d, k) => { if (!d) return; if (k === "custom") { setExpMode("custom"); setExpCustom(d); } else setExpMode(k); setTouched(true); }} />
        <Fl>IF THEY DON'T REPLY BY THEN</Fl>
        <Chips name="ifno" value={ifNo} onPick={(k) => { setIfNo(k); setTouched(true); }} options={[["nudge", "Remind me to nudge"], ["nothing", "Do nothing"]]} />
      </>
    ),
  });

  const view: JourneyView = {
    eyebrow: "SENT WHAT THEY ASKED FOR",
    title: "I’ve sent it",
    verb: "log",
    verbDone: "logged",
    button: "Log it",
    ok: true,
    steps,
    saves: [
      { text: <>{agentName(agent)} → <b>{lab}</b>, {fmt(sent)}, via {viaLabel(via)}</>, dot: "var(--qad-sage)" },
      { text: `It leaves “Your move” — the ball's in ${first}'s court again` },
      { text: `Reply expected by ${fmt(exp)}` },
      ...(nd ? [{ text: `“Nudge ${first}” lands on your to-do on ${fmt(nd)}`, dot: "var(--qad-blush)" }] : []),
      ...(due ? [{ text: `Your “send by ${fmt(due)}” reminder comes off your to-do` }] : []),
    ],
    who: <Who name={agentName(agent)} sub={whoLine(agent, q)} nrmn={nrmnOf(q, agent)} />,
    dirty: touched,
    touched: () => [q.id],
    commit: async () => {
      const label = kind === "partial" ? capFirst(`${syn ? "synopsis and " : ""}${sampleName(s)}`) : `${kind === "full" ? "Full manuscript" : "Revised manuscript"}${verName ? ` · ${verName}` : ""}${syn ? " and synopsis" : ""}`;
      await db.recordMaterialsSent({
        queryId: q.id,
        targetStatus: target,
        sentDate: dayIso(sent),
        isResubmit: kind === "rr",
        writerExpectedDate: dayIso(exp),
        ...(nd ? { nudgeDate: dayIso(nd) } : {}),
        note: kind === "rr" ? changed : undefined,
        ...(kind !== "partial" && ver ? { bookVersionId: ver } : {}),
        eventKey: kind === "partial" ? "partial_sent" : kind === "full" ? "full_sent" : "resubmitted",
      } as never);
      const extra: Record<string, unknown> = { lastSentLabel: label };
      if (q.expectedSendDate) extra.expectedSendDate = deleteField();
      if (q.sendReminderDate) extra.sendReminderDate = deleteField();
      if (!nd && q.nudgeDate) extra.nudgeDate = deleteField();
      await db.updateQuery(q.id, extra as Partial<Query>);
      return { queryId: q.id, message: `${lab} · ${agentName(agent)}`, sub: `REPLY EXPECTED ${up(exp)}`, touched: [q.id] };
    },
  };
  return children(view);
}

function PlanWs({ points }: { points: TrackPoint[] }) {
  return <PlanTrack plan={{ title: "SO FAR", points }} className="qad-wsa" />;
}
