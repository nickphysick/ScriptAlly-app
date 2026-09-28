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
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
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
  activePackageId, currentVersion, exactPackage, guidelineAsk, openingChoice, openingPackage, packageMatches, packageToAttach, packagesFor,
  piecesChanged, sentPieces, summaryOf, summaryWith, type PackageCard,
} from "../../../lib/queryActions/packages";
import { openQueryDrawer } from "../../../lib/queryActions/drawerStore";
import { SentChip } from "../SentHow";
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
  /* ---------- step 2: a package, or individually (§A1) ---------- */
  const orderFor = (id: string) => {
    const live = packagesFor(id, packages, versions, manuscripts.find((m) => m.id === id)?.bookVersions);
    return { live, ...openingChoice(live, req.packageId, again, activePackageId(manuscripts.find((m) => m.id === id), packages)) };
  };
  const [how, setHow] = useState<"package" | "individual">(() => orderFor(msId).how);
  const [pkg, setPkg] = useState<string | null>(() => orderFor(msId).pkg);
  /** The writer chose an option or a package themselves: nothing re-applies the order after that. */
  const [pkgTouched, setPkgTouched] = useState(false);
  /** The package the writer started from before switching to individually — the "based on" (§A2). */
  const [basedOn, setBasedOn] = useState<PackageCard | null>(null);
  /** "Leave this query to make a package?" is up. */
  const [leaving, setLeaving] = useState(false);
  const navigate = useNavigate();
  /** The order again, for a new manuscript or for packages that arrived after the drawer opened. */
  function applyOrder(id: string) {
    const { how: opened, pkg: openedPkg, live } = orderFor(id);
    setHow(opened);
    setPkg(openedPkg);
    setBasedOn(null);
    const card = openedPkg ? live.find((p) => p.id === openedPkg) : null;
    if (card) setMat((m) => ({ ...m, ql: card.ql, syn: card.syn }));
  }
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
  const pkgs = useMemo(() => packagesFor(msId, packages, versions, ms?.bookVersions), [msId, packages, versions, ms?.bookVersions]);
  /* Packages that arrive after the drawer opened re-apply the order, unless the writer has chosen. */
  const pkgKey = pkgs.map((p) => p.id).join(",");
  const lastKey = useRef(pkgKey);
  useEffect(() => {
    if (lastKey.current === pkgKey) return;
    lastKey.current = pkgKey;
    if (!pkgTouched) applyOrder(msId);
  }, [pkgKey]); // eslint-disable-line react-hooks/exhaustive-deps
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
      /* ⚠️ A GUIDELINE MATCH NEVER CHANGES THE PACKAGE (§A1, LP2). It fills the sample's portion —
         the agent's to set (D2) — and, when the writer is choosing individually, the ticks. */
      const fresh: Materials = g.stated ? { ql: g.ql, syn: g.syn, s: g.sample.unit === "none" ? noSample() : g.sample } : mat;
      const card = how === "package" ? pkgs.find((p) => p.id === pkg) : null;
      if (card) setMat({ ...fresh, ql: card.ql, syn: card.syn });
      else if (how === "individual" && !basedOn) setMat(fresh);
      else setMat({ ...mat, s: fresh.s });
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

  /** A tick or the sample: in package mode only the portion can change, and it stays a package (D2). */
  const touchMat = (m: Materials) => { setMat(m); setTouched(true); };
  function chooseHow(k: "package" | "individual") {
    setPkgTouched(true);
    setTouched(true);
    if (k === "individual") {
      if (how === "package") {
        const card = pkgs.find((p) => p.id === pkg) || null;
        setBasedOn(card);
        if (card) setMat({ ...mat, ql: card.ql, syn: card.syn });
      }
      setHow("individual");
      return;
    }
    if (!pkgs.length) return;
    const id = packageToAttach(pkgs, openingPackage(pkgs, req.packageId, again?.pkg, activePackageId(ms, packages)), agent ? ask : null);
    attach(id);
  }
  function attach(id: string | null) {
    const card = pkgs.find((p) => p.id === id);
    if (!card) return;
    setPkgTouched(true);
    setTouched(true);
    setHow("package");
    setPkg(card.id);
    setBasedOn(null);
    setMat({ ...mat, ql: card.ql, syn: card.syn });
  }

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

  const pkCard = how === "package" ? pkgs.find((p) => p.id === pkg) || null : null;
  /* The pieces going out, and their versions. Individually, a piece still ticked from the package
     the writer started from keeps THAT package's version, so switching changes nothing by itself. */
  const indQl = basedOn?.qlId && mat.ql ? { id: basedOn.qlId, name: basedOn.qlVersion } : { id: qlV?.id ?? null, name: qlV?.versionName ?? null };
  const indSyn = basedOn?.synId && mat.syn ? { id: basedOn.synId, name: basedOn.synVersion } : { id: synV?.id ?? null, name: synV?.versionName ?? null };
  const pieceV = pkCard
    ? { qlId: pkCard.qlId, synId: pkCard.synId, qlVersion: pkCard.qlVersion, synVersion: pkCard.synVersion, bookVersion: pkCard.bookVersion, other: pkCard.other }
    : { qlId: mat.ql ? indQl.id : null, synId: mat.syn ? indSyn.id : null, qlVersion: mat.ql ? indQl.name : null, synVersion: mat.syn ? indSyn.name : null, bookVersion: basedOn?.bookVersion ?? null, other: basedOn?.other ?? null };
  const pieces = sentPieces(mat, pieceV);
  const changes = !pkCard && basedOn ? piecesChanged(basedOn, pieceV) : [];
  /** Chosen individually yet exactly a live package: the review asks, never converts (§A2, LP8). */
  const exact = !pkCard ? (basedOn && !changes.length ? basedOn : exactPackage(pkgs, pieceV)) : null;
  const [exactDeclined, setExactDeclined] = useState<string | null>(null);
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
            {again ? <Note kind="ok" tag="KEPT" style={{ marginBottom: 10 }}>{again.how === "individual" || again.pkg === "custom" ? "Same day, same way and the same pieces as your last query." : "Same day, same way and the same package as your last query."} Just choose the agent.</Note> : null}
            <AgentPicker typed={typed} setTyped={setTyped} agents={agents} queried={new Set(forBook.map((q) => q.agentId))} onPick={pickAgent} book={book} />
          </>
        )}
        <Fl>MANUSCRIPT</Fl>
        <div className="qad-chips">
          {(liveMss.length ? liveMss : manuscripts).map((m) => (
            <Chip key={m.id} on={m.id === msId} onClick={() => { setMsId(m.id); if (!pkgTouched) applyOrder(m.id); else { setHow("individual"); setPkg(null); setBasedOn(null); } }}>{m.title}</Chip>
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
    const match = agent && ask.stated ? pkgs.find((p) => packageMatches(p, ask)) ?? null : null;
    const bookTitle = ms?.title ?? "this book";
    steps.push({
      title: "What you sent",
      /* ⚠️ THE REVIEW WEARS THE SAME PAIR AS THE CARD AND TRACKING (§A3): the chip is SentChip
         itself, fed the record this save will write, so the three cannot disagree. */
      summary: (
        <span className="qad-sentsum" data-qad-sentsum={pkCard ? "package" : "individual"}>
          <SentChip q={pkCard
            ? { sentHow: "package", sentPackageId: pkCard.id, sentMaterials: summaryWith(pieces, pkCard.name, null) }
            : { sentHow: "individual", basedOnPackageId: basedOn && changes.length ? basedOn.id : undefined, sentMaterials: summaryWith(pieces, null, basedOn && changes.length ? basedOn.name : null) }} />
          <span>{pkCard ? `${pkCard.name} package` : `Chosen individually · ${summaryOf(pieces).replace(/^./, (c) => c.toLowerCase()) || "nothing ticked"}`}</span>
        </span>
      ),
      guard: g3,
      ownWarn: true,
      body: (
        <>
          <div className="qad-hows" role="radiogroup" aria-label="How you record what you sent">
            <button type="button" role="radio" aria-checked={how === "package"} className={`qad-how${how === "package" ? " on" : ""}${pkgs.length ? "" : " dis"}`}
              disabled={!pkgs.length} data-qad-how="package" onClick={() => chooseHow("package")}>
              <i /><span><b>Attach a submission package</b><small>{pkgs.length ? `${pkgs.length} ready for ${bookTitle}` : "None made yet"}</small></span>
            </button>
            <button type="button" role="radio" aria-checked={how === "individual"} className={`qad-how${how === "individual" ? " on" : ""}`}
              data-qad-how="individual" onClick={() => chooseHow("individual")}>
              <i /><span><b>Choose materials individually</b><small>Tick what you sent, piece by piece</small></span>
            </button>
          </div>
          {!pkgs.length ? (
            <div className="qad-nopkg" data-qad-nopkg>No packages yet. <a role="button" tabIndex={0} onClick={() => setLeaving(true)} onKeyDown={(e) => { if (e.key === "Enter") setLeaving(true); }}>Make one in Submission packages ›</a></div>
          ) : null}
          {how === "package" && pkCard ? (
            <>
              <Fl right={askLine}>WHICH PACKAGE</Fl>
              <div className="qad-plist" role="radiogroup" aria-label="Which package">
                {pkgs.map((p) => (
                  <button type="button" role="radio" aria-checked={pkg === p.id} key={p.id} className={`qad-prow${pkg === p.id ? " on" : ""}`} data-qad-pkg={p.id} onClick={() => attach(p.id)}>
                    <i />
                    <span><b>{p.name}</b><small>{p.summary}{p.bookVersion ? ` · ${p.bookVersion}` : ""}</small></span>
                    <span className="qad-ptags">
                      {p.id === activePackageId(ms, packages) ? <em className="u">USED FOR NEW QUERIES</em> : null}
                      {agent && packageMatches(p, ask) ? <em className="m">MATCHES {first.toUpperCase()}</em> : null}
                    </span>
                  </button>
                ))}
              </div>
              <div className="qad-inpk" data-qad-inpk>
                <h5>IN THIS PACKAGE</h5>
                {sentPieces({ ...mat, ql: pkCard.ql, syn: pkCard.syn, s: noSample() }, pieceV).map((x) => (
                  <div key={x.key}><b>{x.label}</b><span>{x.value || "—"}</span></div>
                ))}
                <p>Sent something slightly different? <a role="button" tabIndex={0} onClick={() => chooseHow("individual")}>Choose individually</a>, starting from this package.</p>
              </div>
              {/* ⚠️ THE PORTION IS THE QUERY'S, NOT THE PACKAGE'S (D2): a package names the book version,
                  and how much of it went is the agent's to set. The mock draws packages that state a
                  sample; the model does not, so the portion keeps its own control here. */}
              <Fl right={agent && ask.sample.unit !== "none" ? `${first.toUpperCase()} ASKS FOR THE ${sampleName(ask.sample).toUpperCase()}` : undefined}>HOW MUCH OF THE BOOK</Fl>
              <SampleControl name="log" sample={mat.s} book={book} allowNone onChange={(s) => touchMat({ ...mat, s })} />
              {agent && ask.stated ? (
                !packageMatches(pkCard, ask) ? (
                  <Note kind="warn" tag="CHECK">
                    {first} asks for the {materialsName({ ql: ask.ql, syn: ask.syn, s: ask.sample }).replace(/^Q/, "q")}.{" "}
                    {match ? <NoteLink onClick={() => attach(match.id)}>Attach {match.name} instead</NoteLink>
                      : <NoteLink onClick={() => { chooseHow("individual"); setMat({ ql: ask.ql, syn: ask.syn, s: ask.sample.unit === "none" ? noSample() : ask.sample }); }}>Choose individually to match</NoteLink>}
                  </Note>
                ) : issues.length ? (
                  <Note kind="warn" tag="CHECK">{matchSentences(first, ask, mat).join(". ")}.</Note>
                ) : <Note kind="ok" tag="MATCH">Matches what {first} asks for.</Note>
              ) : null}
            </>
          ) : (
            <>
              <Fl right={askLine}>WHAT YOU SENT</Fl>
              <Toggle testId="ql" on={mat.ql} onClick={() => touchMat({ ...mat, ql: !mat.ql })} small={mat.ql ? versionTag(indQl.name, !basedOn || indQl.id === qlV?.id) : ""}>Query letter</Toggle>
              <Toggle testId="syn" on={mat.syn} onClick={() => touchMat({ ...mat, syn: !mat.syn })} small={mat.syn ? versionTag(indSyn.name, !basedOn || indSyn.id === synV?.id) : ""}>Synopsis</Toggle>
              <SampleControl name="log" sample={mat.s} book={book} allowNone onChange={(s) => touchMat({ ...mat, s })} />
              <SampleLine label={materialsName(mat)} sample={mat.s} book={book} />
              {basedOn && changes.length ? (
                <Note kind="info" tag="BASED ON">
                  Started from <b>{basedOn.name}</b>, {ordinal(basedOn.edition)} edition. You changed {changes.map((c) => c.replace(/:.*→\s*/, " to ").toLowerCase()).join("; ")}. It'll be recorded as <em>based on {basedOn.name}</em>, and won't count towards {basedOn.name}'s results.
                </Note>
              ) : null}
              {agent && ask.stated ? (
                issues.length || (ask.syn === false && mat.syn) || (ask.sample.unit === "none" && mat.s.unit !== "none") ? (
                  <Note kind="warn" tag="CHECK">
                    {matchSentences(first, ask, mat).join(". ")}. <NoteLink onClick={() => { setMat({ ql: ask.ql, syn: ask.syn, s: ask.sample.unit === "none" ? noSample() : ask.sample }); setTouched(true); }}>Use {first}'s list</NoteLink>
                  </Note>
                ) : <Note kind="ok" tag="MATCH">Matches what {first} asks for.</Note>
              ) : null}
              {match ? (
                <Note kind="info" tag="PACKAGE">Your <b>{match.name}</b> package matches what {first} asks for. <NoteLink onClick={() => attach(match.id)}>Attach it</NoteLink></Note>
              ) : null}
            </>
          )}
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
    pkCard
      ? { text: <><b>{pkCard.name} package</b> recorded as sent ({ordinal(pkCard.edition)} edition), and counted in its results</>, dot: "var(--qad-btn, #2a3a52)" }
      : { text: <>What was sent: {summaryOf(pieces).replace(/^./, (c) => c.toLowerCase()) || "nothing"}{basedOn && changes.length ? <> · <em>based on {basedOn.name} ({ordinal(basedOn.edition)} ed.), {changes.map((c) => c.split(":")[0].toLowerCase()).join(" and ")} changed</em></> : null}</> },
    ...(!pkCard && basedOn && changes.length ? [{ text: <>{basedOn.name}'s page lists it under “sent with changes”; it won't count towards {basedOn.name}'s results</> }] : []),
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
    reviewNote: exact && exact.id !== exactDeclined ? (
      <div className="qad-exact" data-qad-exact>
        <b>This is exactly your {exact.name} package</b>
        <p>{summaryOf(pieces)}: the same pieces as {exact.name}'s {ordinal(exact.edition)} edition. Record it as that package, so it counts towards {exact.name}'s results?</p>
        <div>
          <button type="button" className="rec" onClick={() => attach(exact.id)}>Record as {exact.name}</button>
          <button type="button" className="keep" onClick={() => setExactDeclined(exact.id)}>Keep as chosen individually</button>
        </div>
      </div>
    ) : undefined,
    leave: leaving ? {
      title: "Leave this query to make a package?",
      sub: "What you've entered here won't be kept.",
      button: "Leave",
      cancel: () => setLeaving(false),
      go: () => navigate("/manuscripts/packages"),
    } : null,
    dirty: touched || !!agent || typed.trim() !== "",
    guardDiscard: !!agent,
    touched: () => [newId.current],
    commit: async () => {
      if (!agent) throw new Error("No agent chosen");
      /* §C3 — how the materials were recorded, frozen here and never read back from a live package. */
      const summary = summaryWith(pieces, pkCard?.name ?? null, !pkCard && basedOn && changes.length ? basedOn.name : null);
      const versionIds = [pieceV.qlId, pieceV.synId].filter((x): x is string => !!x);
      const record: Record<string, unknown> = pkCard
        ? { sentHow: "package", sentPackageId: pkCard.id, sentPackageEdition: pkCard.edition }
        : { sentHow: "individual", ...(basedOn && changes.length ? { basedOnPackageId: basedOn.id, basedOnPackageEdition: basedOn.edition, sentChanges: changes } : {}) };
      const writerExpected = !wks || expectMode !== "usual";
      const payload: Record<string, unknown> = {
        id: newId.current,
        manuscriptId: msId,
        agentId: agent.id,
        /* kept in step with sentPackageId for older readers — empty when not a package (§C3) */
        packageId: pkCard ? pkCard.id : "",
        materialsWanted: materialsToQuery(mat),
        personalisationNotes: "",
        sendMethod: via,
        dateSent: dayIso(sent),
        ifNoResponse: IF_NO_STORED[ifNo],
        ...record,
        sentMaterials: summary,
        sentVersions: versionIds,
        ...(nudgeDate ? { nudgeDate: dayIso(nudgeDate) } : {}),
        ...(writerExpected ? { writerExpectedDate: dayIso(expect), writerExpectedSetAt: new Date().toISOString() } : {}),
        ...(prev || (dup && requery) ? { requery: true } : {}),
        ...(nrmnNow !== !!agent.noResponseMeansNo ? { nrmnOverride: nrmnNow } : {}),
      };
      const details = summary;
      const res = await db.addQuery(payload as never, false, { eventKey: prev || (dup && requery) ? "requery_sent" : "query_sent", details, stampPackage: !!pkCard });
      if (!res.success) throw new Error(res.error || "Couldn't log the query");
      /* "Close it" is the app's existing auto-close, which fires from `responseDeadline` — so the
         writer's choice writes that date, and only that choice does. */
      if (ifNo === "close") await db.updateQuery(newId.current, { responseDeadline: dayIso(expect) });
      const keep = { sent, via, how: (pkCard ? "package" : "individual") as "package" | "individual", pkg: pkCard ? pkCard.id : "custom", mat, manuscriptId: msId };
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
const versionTag = (name: string | null | undefined, current = true): string => (name ? `${name.toUpperCase()}${current ? " · CURRENT" : ""}` : "");
const ordinal = (n: number): string => `${n}${n % 100 >= 11 && n % 100 <= 13 ? "th" : ["th", "st", "nd", "rd"][n % 10] ?? "th"}`;

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
