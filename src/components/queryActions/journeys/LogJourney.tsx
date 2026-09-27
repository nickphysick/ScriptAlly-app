/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * D1 · LOG A QUERY (design-refs/query-actions-v11.html §3.10).
 * Agent and book → Sending → What you sent → Response expectations → If they don't reply → Check and log.
 *
 * Guards, exactly the mock's: BLOCK no agent · BLOCK a live query with this agent for this book
 * (override "It's a separate query") · CHECK a live query with another agent at the same agency ·
 * CHECK the method differs from how the agent takes queries · BLOCK nothing marked as sent ·
 * CHECK the materials differ from the agent's guidelines · CHECK a nudge before the reply date.
 */
import React, { useMemo, useRef, useState } from "react";
import { collection, doc } from "firebase/firestore";
import { db as fsdb } from "../../../lib/firebase";
import { useScriptAllyDb } from "../../../lib/db";
import { ComponentType, SubmissionMethod, SubmissionStatus, type Agent, type QueryMaterial } from "../../../types";
import {
  addDays, dayDiff, dayIso, dm, fmt, pastAnchors, reminderAnchors, sameDay, up, type Anchor,
} from "../../../lib/queryActions/dates";
import {
  bookOf, capFirst, materialsName, sameSample, sampleName, type Materials, type Sample,
} from "../../../lib/queryActions/sample";
import {
  currentVersion, guidelineAsk, packageMatches, packagesFor, sentSnapshot, type PackageCard,
} from "../../../lib/queryActions/packages";
import { openQueryDrawer } from "../../../lib/queryActions/drawerStore";
import { buildAgentMaterials, emptyMaterials } from "../../../lib/agentMaterials";
import {
  Chip, Chips, DateField, Fl, Note, NoteLink, SampleControl, SampleLine, Seg, Toggle, Who, initialsOf,
} from "../controls";
import type { JourneyProps } from "../QueryDrawer";
import type { Guard, JourneyStep, JourneyView, SaveLine } from "../journey";
import {
  agencyOf, agentName, firstName, isLive, viaLabel, viaOptions, whoLine,
} from "./common";

type IfNo = "nudge" | "close" | "nothing";
const IF_NO_STORED: Record<IfNo, string> = {
  nudge: "Remind me to nudge",
  close: "Mark as no response automatically",
  nothing: "Do nothing",
};

const noSample = (): Sample => ({ unit: "none", amt: 3, from: 1, sect: false, fu: null });

/** Materials → the query's stored `materialsWanted`, the shape the rest of the app reads. */
export function materialsToQuery(m: Materials): (string | QueryMaterial)[] {
  const out: (string | QueryMaterial)[] = [];
  if (m.ql) out.push("Query Letter");
  if (m.syn) out.push("Synopsis");
  if (m.s.unit !== "none") out.push({ material: "Sample Pages", type: m.s.unit, quantity: m.s.amt });
  return out;
}

function readActiveManuscript(): string | null {
  try { return localStorage.getItem("scriptally_active_manuscript_id"); } catch { return null; }
}

export function LogJourney({ req, today, children }: JourneyProps) {
  const db = useScriptAllyDb();
  const { agents, queries, manuscripts, packages, versions } = db;
  const liveMss = manuscripts.filter((m) => !m.shelved);
  const again = req.again;
  const [msId, setMsId] = useState<string>(() => {
    const want = req.manuscriptId || again?.manuscriptId || readActiveManuscript();
    return (want && manuscripts.some((m) => m.id === want) ? want : (liveMss[0] || manuscripts[0])?.id) || "";
  });
  const ms = manuscripts.find((m) => m.id === msId) || null;
  const book = useMemo(() => bookOf(ms?.wordCount), [ms?.wordCount]);

  const [agentId, setAgentId] = useState<string | null>(req.agentId || null);
  const [typed, setTyped] = useState("");
  const [requery, setRequery] = useState(false);
  const [sent, setSent] = useState<Date>(again?.sent ?? today);
  const [via, setVia] = useState<SubmissionMethod>((again?.via as SubmissionMethod) ?? SubmissionMethod.EMAIL);
  const [pkg, setPkg] = useState<string>(again?.pkg ?? req.packageId ?? "custom");
  const [mat, setMat] = useState<Materials>(() => (again?.mat as Materials) ?? { ql: true, syn: true, s: { unit: "chapters", amt: 3, from: 1, sect: false, fu: null } });
  const [expectMode, setExpectMode] = useState<string>("usual");
  const [expectCustom, setExpectCustom] = useState<Date | null>(null);
  const [nrmn, setNrmn] = useState<boolean | null>(null);
  const [ifNo, setIfNo] = useState<IfNo>("nudge");
  const [ifNoSet, setIfNoSet] = useState(false);
  const [nudgeWhen, setNudgeWhen] = useState<string>("week");
  const [nudgeCustom, setNudgeCustom] = useState<Date | null>(null);
  const [touched, setTouched] = useState(false);
  const newId = useRef<string>(doc(collection(fsdb, "users", db.currentUser?.id || "_", "queries")).id);

  const agent = agents.find((a) => a.id === agentId) || null;
  const pkgs = useMemo(() => packagesFor(msId, packages, versions), [msId, packages, versions]);
  const ask = useMemo(() => guidelineAsk(agent), [agent]);
  const qlV = currentVersion(msId, versions, ComponentType.QUERY_LETTER);
  const synV = currentVersion(msId, versions, ComponentType.SYNOPSIS);

  /* ---------- picking an agent fills the rest from their guidelines ---------- */
  function pickAgent(a: Agent) {
    const g = guidelineAsk(a);
    setAgentId(a.id);
    setRequery(false);
    setVia((a.submissionMethod as SubmissionMethod) || SubmissionMethod.EMAIL);
    if (!again) {
      const fresh: Materials = g.stated ? { ql: g.ql, syn: g.syn, s: g.sample.unit === "none" ? noSample() : g.sample } : mat;
      const match = packagesFor(msId, packages, versions).find((p) => packageMatches(p, g));
      if (match) { setPkg(match.id); setMat({ ...fresh, ql: match.ql, syn: match.syn }); } else { setPkg(req.packageId ?? "custom"); setMat(fresh); }
    }
    setExpectMode("usual");
    setExpectCustom(null);
    setNrmn(!!a.noResponseMeansNo);
    setIfNoSet(false);
    setIfNo(a.noResponseMeansNo ? "close" : "nudge");
    setNudgeWhen("week");
    setNudgeCustom(null);
    setTouched(true);
  }
  // A door from the Contact list arrives with the agent already chosen.
  const seeded = useRef(false);
  if (!seeded.current && req.agentId && agent) { seeded.current = true; pickAgent(agent); }

  const touchMat = (m: Materials) => { setMat(m); setPkg("custom"); setTouched(true); };

  /* ---------- the facts the guards read ---------- */
  const forBook = queries.filter((q) => q.manuscriptId === msId);
  const dup = agent ? forBook.find((q) => q.agentId === agent.id && isLive(q)) : null;
  const prev = agent && !dup ? forBook.find((q) => q.agentId === agent.id && !isLive(q)) : null;
  const sameAg = agent
    ? forBook.find((q) => q.agentId !== agent.id && isLive(q) && (() => {
        const o = agents.find((x) => x.id === q.agentId);
        return !!o && !!agencyOf(agent) && agencyOf(o).toLowerCase() === agencyOf(agent).toLowerCase();
      })())
    : null;
  const sameAgent = sameAg ? agents.find((x) => x.id === sameAg.agentId) : null;
  const first = firstName(agent);
  const wks = agent?.responseTimeWeeks && agent.responseTimeWeeks > 0 ? agent.responseTimeWeeks : null;

  /* ---------- response expectations ---------- */
  const exA: Anchor[] = wks
    ? [
        { k: "usual", label: `Their usual · ${wks} wks`, d: addDays(sent, wks * 7) },
        { k: "+2", label: `${wks + 2} wks`, d: addDays(sent, (wks + 2) * 7) },
        { k: "+4", label: `${wks + 4} wks`, d: addDays(sent, (wks + 4) * 7) },
      ]
    : [
        { k: "w6", label: "6 wks", d: addDays(sent, 42) },
        { k: "usual", label: "8 wks", d: addDays(sent, 56) },
        { k: "w12", label: "12 wks", d: addDays(sent, 84) },
      ];
  exA.forEach((x) => { x.sub = dm(x.d!); });
  const expect: Date = expectMode === "custom" && expectCustom ? expectCustom : (exA.find((x) => x.k === expectMode) || exA.find((x) => x.k === "usual")!).d!;
  const nrmnNow = nrmn ?? !!agent?.noResponseMeansNo;

  const nAnch = reminderAnchors(expect, [["w0", "On the day", 0], ["week", "A week later", 7], ["2w", "Two weeks later", 14]]);
  const nHit = nAnch.find((x) => x.k === nudgeWhen);
  const nudgeDate: Date | null = ifNo !== "nudge" ? null : nudgeWhen === "custom" && nudgeCustom ? nudgeCustom : (nHit || nAnch[1]).d;
  const nudgeShifted = ifNo === "nudge" && nudgeWhen !== "custom" && !!nHit && !sameDay(nHit.raw, nHit.d);

  /* ---------- guards ---------- */
  const g1: Guard | null = !agent
    ? { level: "block", msg: "Choose the agent you queried" }
    : dup && !requery
      ? { level: "block", msg: `You already have a live query with ${first} for this book, sent ${fmt(dayOr(dup.dateSent, today))}` }
      : sameAg && sameAgent
        ? { level: "check", msg: `You have a live query with ${agentName(sameAgent)}, also at ${agencyOf(agent)}` }
        : null;
  const g2: Guard | null = agent && agent.submissionMethod && via !== agent.submissionMethod
    ? { level: "check", msg: `${first} takes queries by ${viaLabel(agent.submissionMethod)} — you've chosen ${viaLabel(via)}` }
    : null;
  const nothing = !mat.ql && !mat.syn && mat.s.unit === "none";
  const issues: string[] = [];
  if (agent && ask.stated) {
    if (ask.ql && !mat.ql) issues.push("no query letter");
    if (ask.syn && !mat.syn) issues.push("no synopsis");
    if (ask.sample.unit !== "none" && (mat.s.unit !== ask.sample.unit || mat.s.amt !== ask.sample.amt || mat.s.sect)) issues.push(`${first} asks for the ${sampleName(ask.sample)}`);
  }
  const g3: Guard | null = nothing ? { level: "block", msg: "Nothing is marked as sent" } : issues.length ? { level: "check", msg: `Different from ${first}'s guidelines: ${issues.join("; ")}` } : null;
  const g5: Guard | null = nudgeDate && dayDiff(nudgeDate, expect) < 0 ? { level: "check", msg: `The nudge is before ${first}'s reply window closes` } : null;

  const pkCard = pkgs.find((p) => p.id === pkg) || null;
  const ok = !!agent;

  /* ---------- the steps ---------- */
  const steps: JourneyStep[] = [];
  steps.push({
    title: "Agent and book",
    summary: agent ? `${agentName(agent)} · ${ms?.title ?? ""}${prev ? " · requery" : ""}` : "Choose the agent",
    guard: g1,
    ownWarn: !!(dup || sameAg),
    body: (
      <>
        <Fl>WHO YOU QUERIED</Fl>
        {agent ? (
          <>
            {dup ? (
              <Note kind={requery ? "info" : "warn"} tag={requery ? "NOTED" : "ALREADY LIVE"} style={{ marginBottom: 10 }}>
                {requery
                  ? <>Logging a second, separate query to {first}. </>
                  : <>You already have a live query with {first} for {ms?.title}, sent {fmt(dayOr(dup.dateSent, today))}. Did you mean to record a response or a nudge instead? </>}
                <NoteLink onClick={() => setRequery(!requery)}>{requery ? "Undo" : "It's a separate query"}</NoteLink>
              </Note>
            ) : null}
            {sameAg && sameAgent ? (
              <Note kind="warn" tag="SAME AGENCY" style={{ marginBottom: 10 }}>
                You have a live query with <b>{agentName(sameAgent)}</b> at {agencyOf(agent)}, sent {fmt(dayOr(sameAg.dateSent, today))}. Many agencies count a no from one agent as a no from all, so check their guidelines.
              </Note>
            ) : null}
            {prev ? (
              <Note kind="info" tag="QUERIED BEFORE" style={{ marginBottom: 10 }}>
                You queried {first} with this book on {fmt(dayOr(prev.dateSent, today))}. This will be logged as a requery.
              </Note>
            ) : null}
            <Who name={agentName(agent)} sub={whoLine(agent, null)} nrmn={!!agent.noResponseMeansNo}
              extra={<button type="button" className="qad-change" onClick={() => { setAgentId(null); setTyped(""); }}>CHANGE</button>} />
          </>
        ) : (
          <>
            {again ? <Note kind="ok" tag="KEPT" style={{ marginBottom: 10 }}>Same day, same way and the same package as your last query. Just choose the agent.</Note> : null}
            <AgentPicker typed={typed} setTyped={setTyped} agents={agents} queried={new Set(forBook.map((q) => q.agentId))} onPick={pickAgent} book={book} />
          </>
        )}
        <Fl>MANUSCRIPT</Fl>
        <div className="qad-chips">
          {(liveMss.length ? liveMss : manuscripts).map((m) => (
            <Chip key={m.id} on={m.id === msId} onClick={() => { setMsId(m.id); setPkg("custom"); }}>{m.title}</Chip>
          ))}
        </div>
      </>
    ),
  });

  if (agent) {
    steps.push({
      title: "Sending",
      summary: `${fmt(sent)} · ${viaLabel(via)}`,
      guard: g2,
      body: (
        <>
          <DateField id="logSent" label="SENT ON" value={sent} anchors={pastAnchors(today)} dir="past" onPick={(d) => { if (d) { setSent(d); setTouched(true); } }} />
          <Fl right={agent.submissionMethod ? `${first.toUpperCase()} TAKES ${viaLabel(agent.submissionMethod).toUpperCase()}` : undefined}>SENT VIA</Fl>
          <Chips<SubmissionMethod> name="via" options={viaOptions(agent)} value={via} onPick={(k) => { setVia(k); setTouched(true); }} />
        </>
      ),
    });

    const askLine = ask.stated ? `${first.toUpperCase()} ASKS FOR: ${materialsName({ ql: ask.ql, syn: ask.syn, s: ask.sample }).toUpperCase()}` : undefined;
    steps.push({
      title: "What you sent",
      summary: `${pkCard ? `${pkCard.name} package · ` : ""}${materialsName(mat)}`,
      guard: g3,
      ownWarn: issues.length > 0,
      body: (
        <>
          {pkgs.length ? (
            <>
              <Fl right="FROM YOUR MANUSCRIPT'S MATERIALS">SUBMISSION PACKAGE</Fl>
              <div className="qad-pkgs">
                {pkgs.map((p) => (
                  <button type="button" key={p.id} className={`qad-pkg${pkg === p.id ? " on" : ""}`} data-qad-pkg={p.id}
                    onClick={() => { setPkg(p.id); setMat({ ...mat, ql: p.ql, syn: p.syn }); setTouched(true); }}>
                    <b>{p.name}{packageMatches(p, ask) ? <em>MATCHES {first.toUpperCase()}</em> : null}</b>
                    <small>{p.summary}</small>
                  </button>
                ))}
                <button type="button" className={`qad-pkg${pkg === "custom" ? " on" : ""}`} data-qad-pkg="custom" onClick={() => setPkg("custom")}>
                  <b>Custom</b><small>Choose the pieces yourself</small>
                </button>
              </div>
            </>
          ) : null}
          <Fl right={askLine}>{""}</Fl>
          <Toggle testId="ql" on={mat.ql} onClick={() => touchMat({ ...mat, ql: !mat.ql })} small={mat.ql ? versionTag(pkCard?.qlVersion ?? qlV?.versionName) : ""}>Query letter</Toggle>
          <Toggle testId="syn" on={mat.syn} onClick={() => touchMat({ ...mat, syn: !mat.syn })} small={mat.syn ? versionTag(pkCard?.synVersion ?? synV?.versionName) : ""}>Synopsis</Toggle>
          <SampleControl name="log" sample={mat.s} book={book} allowNone onChange={(s) => touchMat({ ...mat, s })} />
          <SampleLine label={materialsName(mat)} sample={mat.s} book={book} />
          {agent && ask.stated ? (
            issues.length || (ask.syn === false && mat.syn) || (ask.sample.unit === "none" && mat.s.unit !== "none") ? (
              <Note kind="warn" tag="CHECK">
                {matchSentences(first, ask, mat).join(". ")}. <NoteLink onClick={() => { setMat({ ql: ask.ql, syn: ask.syn, s: ask.sample.unit === "none" ? noSample() : ask.sample }); setPkg("custom"); }}>Use {first}'s list</NoteLink>
              </Note>
            ) : <Note kind="ok" tag="MATCH">Matches what {first} asks for.</Note>
          ) : null}
        </>
      ),
    });

    steps.push({
      title: "Response expectations",
      summary: `By ${fmt(expect)} · ${nrmnNow ? "silence is a no" : "they reply"}`,
      body: (
        <>
          <p className="qad-secs">What {first} says about replies — change either if you know better.</p>
          <DateField id="logExpect" label="REPLY EXPECTED BY" value={expect} anchors={exA} dir="future"
            forceKey={expectMode === "custom" ? null : expectMode}
            onPick={(d, k) => { if (!d) return; if (k === "custom") { setExpectMode("custom"); setExpectCustom(d); } else setExpectMode(k); setTouched(true); }} />
          <Fl right={agent.noResponseMeansNo ? `${first.toUpperCase()}'S GUIDELINES SAY YES` : `${first.toUpperCase()}'S GUIDELINES DON'T SAY SO`}>DOES NO REPLY MEAN NO?</Fl>
          <Chips name="nrmn" options={[["yes", "Yes — silence is a pass"], ["no", "No — they reply to everyone"]]} value={nrmnNow ? "yes" : "no"}
            onPick={(k) => { const v = k === "yes"; setNrmn(v); if (!ifNoSet) setIfNo(v ? "close" : "nudge"); setTouched(true); }} />
        </>
      ),
    });

    const planPts = [{ l: "Sent", d: sent, c: "done" as const }, { l: ifNo === "close" ? "Reply due · closes" : "Reply due", d: expect, c: "fut" as const }];
    if (nudgeDate) planPts.push({ l: "Nudge", d: nudgeDate, c: "nudge" as never }, { l: "Consider closing", d: addDays(nudgeDate, 28), c: "close" as never, s: "4 WKS ON" } as never);
    steps.push({
      title: "If they don't reply",
      summary: ifNo === "nudge" && nudgeDate ? `Nudge reminder ${fmt(nudgeDate)}` : ifNo === "close" ? `Close after ${fmt(expect)}` : "Do nothing",
      guard: g5,
      ownWarn: !!g5,
      plan: { title: "THE PLAN", points: planPts },
      body: (
        <>
          <p className="qad-secs">{nrmnNow ? `Silence is ${first}'s answer, so the usual move is to close it. You can still plan a nudge.` : "Plan the chase now, so it lands on your to-do list at the right moment."}</p>
          <Fl>WHEN {up(expect)} PASSES</Fl>
          <Chips name="ifno" value={ifNo} onPick={(k) => { setIfNo(k); setIfNoSet(true); setTouched(true); }}
            options={[["nudge", "Remind me to nudge"], ["close", "Close it", nrmnNow ? "USUAL" : undefined], ["nothing", "Do nothing"]]} />
          {ifNo === "nudge" && nudgeDate ? (
            <>
              <DateField id="logNudge" label="REMIND ME TO NUDGE" value={nudgeDate} anchors={nAnch} dir="future" shift={nudgeShifted}
                forceKey={nudgeWhen === "custom" ? null : nudgeWhen}
                onPick={(d, k) => { if (!d) return; if (k === "custom") { setNudgeWhen("custom"); setNudgeCustom(d); } else setNudgeWhen(k); setTouched(true); }} />
              {dayDiff(nudgeDate, expect) < 0 ? (
                <Note kind="warn" tag="EARLY">That's before {first}'s reply window closes. An early nudge can read as impatient.</Note>
              ) : nrmnNow ? (
                <Note kind="info" tag="YOUR CALL">{first} doesn't expect nudges, but a short, polite one rarely does harm. We'll plan it as you've asked.</Note>
              ) : null}
            </>
          ) : null}
        </>
      ),
    });
  }

  /* ---------- when you save ---------- */
  const saves: SaveLine[] = agent ? [
    { text: <><b>Queried</b> {agentName(agent)}, {fmt(sent)}, via {viaLabel(via)}</>, dot: "var(--qad-sand)" },
    { text: `${materialsName(mat)} recorded as sent` },
    { text: `Reply expected by ${fmt(expect)}` },
    ...(ifNo === "nudge" && nudgeDate ? [{ text: `“Nudge ${first}” lands on your to-do on ${fmt(nudgeDate)}; if still quiet, “Consider closing” four weeks after`, dot: "var(--qad-blush)" }] : []),
    ...(ifNo === "close" ? [{ text: `Closes itself on ${fmt(addDays(expect, 1))} if nothing comes back — you'll see it in the Query Centre first`, dot: "var(--qad-stone)" }] : []),
  ] : [];

  const view: JourneyView = {
    eyebrow: "LOG A QUERY",
    title: "Log a query",
    verb: "log",
    verbDone: "logged",
    button: "Log query",
    ok,
    steps,
    preNote: !agent ? <Note kind="info" tag="NEXT" style={{ marginTop: 22 }}>Choose the agent first. Their reply time, how they take queries and what they ask for fill in the rest.</Note> : undefined,
    saves,
    dirty: touched || !!agent || typed.trim() !== "",
    guardDiscard: !!agent,
    touched: () => [newId.current],
    commit: async () => {
      if (!agent) throw new Error("No agent chosen");
      const snap = sentSnapshot(pkCard, mat, qlV?.versionName ?? null, synV?.versionName ?? null);
      const writerExpected = !wks || expectMode !== "usual";
      const payload: Record<string, unknown> = {
        id: newId.current,
        manuscriptId: msId,
        agentId: agent.id,
        packageId: pkCard ? pkCard.id : "",
        materialsWanted: materialsToQuery(mat),
        personalisationNotes: "",
        sendMethod: via,
        dateSent: dayIso(sent),
        ifNoResponse: IF_NO_STORED[ifNo],
        sentPackageId: snap.sentPackageId,
        sentMaterials: snap.sentMaterials,
        sentVersions: snap.sentVersions,
        ...(nudgeDate ? { nudgeDate: dayIso(nudgeDate) } : {}),
        ...(writerExpected ? { writerExpectedDate: dayIso(expect), writerExpectedSetAt: new Date().toISOString() } : {}),
        ...(prev || (dup && requery) ? { requery: true } : {}),
        ...(nrmnNow !== !!agent.noResponseMeansNo ? { nrmnOverride: nrmnNow } : {}),
      };
      const details = [snap.sentMaterials, ...snap.sentVersions].join(" · ");
      const res = await db.addQuery(payload as never, false, { eventKey: prev || (dup && requery) ? "requery_sent" : "query_sent", details });
      if (!res.success) throw new Error(res.error || "Couldn't log the query");
      /* "Close it" is the app's existing auto-close, which fires from `responseDeadline` — so the
         writer's choice writes that date, and only that choice does. */
      if (ifNo === "close") await db.updateQuery(newId.current, { responseDeadline: dayIso(expect) });
      const keep = { sent, via, pkg, mat, manuscriptId: msId };
      return {
        queryId: newId.current,
        message: `Query logged · ${agentName(agent)}`,
        sub: nudgeDate ? `NUDGE REMINDER ${up(nudgeDate)} ADDED TO YOUR TO-DO` : `REPLY EXPECTED ${up(expect)}`,
        touched: [newId.current],
        again: () => openQueryDrawer({ mode: "log", again: keep }),
      };
    },
  };
  return children(view);
}

const dayOr = (v: unknown, fallback: Date): Date => {
  const x = v ? new Date(v as string) : null;
  return x && !isNaN(x.getTime()) ? new Date(x.getFullYear(), x.getMonth(), x.getDate()) : fallback;
};
const versionTag = (name: string | null | undefined): string => (name ? `${name.toUpperCase()} · CURRENT` : "");

function matchSentences(first: string, ask: ReturnType<typeof guidelineAsk>, m: Materials): string[] {
  const out: string[] = [];
  if (ask.ql && !m.ql) out.push(`${first} asks for a query letter`);
  if (ask.syn && !m.syn) out.push(`${first} asks for a synopsis`);
  if (!ask.syn && m.syn) out.push(`${first} doesn't ask for a synopsis`);
  if (ask.sample.unit === "none" && m.s.unit !== "none") out.push(`${first} doesn't ask for a sample`);
  else if (ask.sample.unit !== "none" && !sameSample({ ...ask.sample, sect: false }, m.s)) {
    out.push(`${first} asks for the ${sampleName(ask.sample)}${m.s.unit === "none" ? "" : ` — you're sending ${!m.s.sect ? "the " : ""}${sampleName(m.s)}`}`);
  }
  return out;
}

/* ---------- the agent picker, and "+ Add … as a new agent" ---------- */

function AgentPicker({ typed, setTyped, agents, queried, onPick, book }: {
  typed: string; setTyped: (v: string) => void; agents: Agent[]; queried: Set<string>; onPick: (a: Agent) => void; book: ReturnType<typeof bookOf>;
}) {
  const [focus, setFocus] = useState(true);
  const [adding, setAdding] = useState(false);
  const t = typed.trim().toLowerCase();
  const list = agents
    .filter((a) => !a.setAside)
    .filter((a) => !t || (a.name || "").toLowerCase().includes(t) || (a.agency || "").toLowerCase().includes(t))
    .slice(0, 5);
  if (adding) return <NewAgentForm initialName={typed.trim()} onCancel={() => setAdding(false)} onSaved={(a) => { setAdding(false); onPick(a); }} book={book} />;
  return (
    <div className="qad-apick">
      <input className="qad-fin" autoFocus placeholder="Start typing an agent's name…" value={typed} data-qad-agent-input
        onChange={(e) => setTyped(e.target.value)} onFocus={() => setFocus(true)} onBlur={() => window.setTimeout(() => setFocus(false), 150)}
        onKeyDown={(e) => { if (e.key === "Enter" && list[0]) { e.preventDefault(); onPick(list[0]); } }} autoComplete="off" />
      {focus || t ? (
        <div className="qad-sugg" data-qad-sugg>
          {list.map((a, i) => (
            <button type="button" key={a.id} className={`it${i === 0 && t ? " hi" : ""}`} onMouseDown={(e) => { e.preventDefault(); onPick(a); }} data-qad-agent={a.id}>
              <span className="qad-av">{initialsOf(a.name || a.agency || "?")}</span>
              <span><b>{a.name || a.agency}</b><small>{(a.agency || "").toUpperCase()}{a.responseTimeWeeks ? ` · ~${a.responseTimeWeeks} WKS` : ""}</small></span>
              {queried.has(a.id) ? <span className="qad-tag">ALREADY QUERIED</span> : a.noResponseMeansNo ? <span className="qad-tag">NO REPLY MEANS NO</span> : null}
            </button>
          ))}
          {t ? <button type="button" className="new" onMouseDown={(e) => { e.preventDefault(); setAdding(true); }} data-qad-new-agent>+ Add “{typed.trim()}” as a new agent</button> : null}
        </div>
      ) : null}
    </div>
  );
}

function NewAgentForm({ initialName, onCancel, onSaved, book }: { initialName: string; onCancel: () => void; onSaved: (a: Agent) => void; book: ReturnType<typeof bookOf> }) {
  const db = useScriptAllyDb();
  const [name, setName] = useState(initialName);
  const [agency, setAgency] = useState("");
  const [wks, setWks] = useState<string>("8");
  const [via, setVia] = useState<SubmissionMethod>(SubmissionMethod.EMAIL);
  const [nr, setNr] = useState(false);
  const [ql, setQl] = useState(true);
  const [syn, setSyn] = useState(false);
  const [s, setS] = useState<Sample>({ unit: "pages", amt: 10, from: 1, sect: false, fu: null });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function save() {
    if (!name.trim() && !agency.trim()) { setErr("Add a name or an agency."); return; }
    setBusy(true);
    const st = emptyMaterials();
    if (ql) st.selected.push("Query letter");
    if (syn) st.selected.push("Synopsis");
    if (s.unit !== "none") {
      const pill = s.unit === "pages" ? "Sample pages" : s.unit === "words" ? "Sample words" : "Sample chapters";
      st.selected.push(pill); st.counts[pill] = String(s.amt);
    }
    const w = parseInt(wks, 10);
    const res = await db.addAgent({
      name: name.trim(), agency: agency.trim(), email: "", website: "", genres: [], mswlNotes: "", notes: "",
      submissionStatus: SubmissionStatus.OPEN, submissionMethod: via, materialsWanted: buildAgentMaterials(st),
      ...(Number.isFinite(w) && w > 0 ? { responseTimeWeeks: w } : {}),
      ...(nr ? { noResponseMeansNo: true } : {}),
    } as never);
    setBusy(false);
    if (!res.success || !res.id) { setErr(res.error || "Couldn't add the agent."); return; }
    const made = { ...(db.agents.find((a) => a.id === res.id) || {}), id: res.id, name: name.trim(), agency: agency.trim(), submissionMethod: via, responseTimeWeeks: Number.isFinite(w) && w > 0 ? w : undefined, noResponseMeansNo: nr || undefined, materialsWanted: buildAgentMaterials(st) } as Agent;
    onSaved(made);
  }
  return (
    <div className="qad-newag" data-qad-newagent>
      <Fl>NAME</Fl>
      <input className="qad-fin" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      <Fl>AGENCY</Fl>
      <input className="qad-fin" value={agency} onChange={(e) => setAgency(e.target.value)} />
      <Fl>REPLY TIME</Fl>
      <Chips options={[["4", "4 wks"], ["6", "6 wks"], ["8", "8 wks"], ["12", "12 wks"], ["0", "Not stated"]]} value={wks} onPick={setWks} />
      <Fl>HOW THEY TAKE QUERIES</Fl>
      <Chips<SubmissionMethod> options={VIA_ALL} value={via} onPick={setVia} />
      <Toggle on={nr} onClick={() => setNr(!nr)}>No reply means no</Toggle>
      <Fl>WHAT THEY ASK FOR</Fl>
      <Toggle on={ql} onClick={() => setQl(!ql)}>Query letter</Toggle>
      <Toggle on={syn} onClick={() => setSyn(!syn)}>Synopsis</Toggle>
      <SampleControl sample={s} onChange={setS} book={book} allowNone />
      {err ? <Note kind="warn" tag="CHECK">{err}</Note> : null}
      <div className="acts">
        <Chip on onClick={() => { if (!busy) void save(); }}>{busy ? "Adding…" : "Add to your Contact list"}</Chip>
        <Chip onClick={onCancel}>Back</Chip>
      </div>
    </div>
  );
}
const VIA_ALL: [SubmissionMethod, string][] = [[SubmissionMethod.EMAIL, "Email"], [SubmissionMethod.QUERY_MANAGER, "QueryManager"], [SubmissionMethod.ONLINE_FORM, "Online form"], [SubmissionMethod.POST, "Post"]];

export { capFirst, Seg };
