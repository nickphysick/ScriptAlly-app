/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * D7 · CORRECT THE RECORD (design-refs/query-actions-v11.html §3.16) — one step, the entry's own
 * name as its title, then the review. The date field adds an "As recorded" chip; the note is
 * editable. BLOCK: a date outside its neighbours (on or after the entry before it, on or before the
 * entry after it — today when it is the newest).
 *
 * The write is `editActivity` (both stores, then recompute), so the derived dates move with it. A
 * corrected SEND also moves `dateSent`; a corrected latest NUDGE moves `lastNudgeSentDate` — the
 * dates worked out from them follow, as the mock's consequence line says.
 *
 * The "told" variant (a `withdraw_tell` / `signed_tell` task): one step, "I've told …", which sets
 * `withdrawTold` and so retires the task that asked.
 */
import React, { useEffect, useState } from "react";
import { deleteField } from "firebase/firestore";
import { useScriptAllyDb } from "../../../lib/db";
import { QueryStatus, type Query } from "../../../types";
import { activityEventLabel } from "../../../lib/activityEvent";
import { dayDiff, dayIso, dm, fmt, pastAnchors, toDay, up, type Anchor } from "../../../lib/queryActions/dates";
import { EVENT_LABEL, isEventKey } from "../../../lib/queryActions/eventKeys";
import { DateField, Fl, Note, SampleControl, TextBox, Toggle, Who } from "../controls";
import { ComponentType } from "../../../types";
import { currentVersion, editionsOn, readSummary, sentPieces, summaryOf, summaryWith, type EditionChoice } from "../../../lib/queryActions/packages";
import { sentRecordOf } from "../../../lib/queryActions/sentRecord";
import { bookOf, blankSample, type Materials, type Sample } from "../../../lib/queryActions/sample";
import { ordinal } from "../SentHow";
import type { JourneyProps } from "../QueryDrawer";
import type { Guard, JourneyView } from "../journey";
import { emptyView } from "./ResponseJourney";
import { agentName, firstName, nrmnOf, whoLine } from "./common";

interface Entry { id: string; name: string; day: Date; note: string; status: string | null; isNudge: boolean }

const tsDay = (v: unknown): Date | null => toDay(v);

export function entryName(data: Record<string, unknown>): string {
  if (isEventKey(data.eventKey)) return EVENT_LABEL[data.eventKey];
  const type = String(data.type ?? "");
  const st = (data.resultingStatus as string | undefined) ?? ((Object.values(QueryStatus) as string[]).includes(type) ? type : null);
  if (st) return activityEventLabel({ resultingStatus: st }, { includeSend: true }) ?? st;
  return type || "Entry";
}

export function EditJourney({ req, today, children }: JourneyProps) {
  const db = useScriptAllyDb();
  const q = db.queries.find((x) => x.id === req.queryId) || null;
  const agent = q ? db.agents.find((a) => a.id === q.agentId) || null : null;
  const [log, setLog] = useState<Entry[] | null>(null);
  const [d, setD] = useState<Date | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [told, setTold] = useState(false);
  const [touched, setTouched] = useState(false);
  const tellMode = !req.entryId;
  /* §A4 — what was sent, corrected. null = unchanged; the writer's choice replaces the snapshot. */
  const [sent, setSent] = useState<{ how: "package"; key: string } | { how: "individual"; mat: Materials } | null>(null);

  useEffect(() => {
    if (!q || tellMode) return;
    let live = true;
    void db.readQueryActivity(q.id).then((rows) => {
      if (!live) return;
      const es = rows.map((r) => ({
        id: r.id, name: entryName(r.data), day: tsDay(r.data.createdAt) ?? today, note: String(r.data.note ?? ""),
        status: (r.data.resultingStatus as string) ?? null, isNudge: r.data.type === "Nudge sent",
      })).sort((a, b) => a.day.getTime() - b.day.getTime());
      setLog(es);
    });
    return () => { live = false; };
  }, [q?.id, tellMode]);

  if (!q) return children(emptyView("CORRECT THE RECORD", "Edit an entry"));
  const first = firstName(agent);
  const who = <Who name={agentName(agent)} sub={whoLine(agent, q)} nrmn={nrmnOf(q, agent)} />;

  if (tellMode) {
    const signed = q.closingReason === "accepted_offer";
    return children({
      eyebrow: "CORRECT THE RECORD", title: signed ? "Tell them you've signed" : "Tell them you've withdrawn",
      verb: "save", verbDone: "saved", button: "Save", ok: true,
      steps: [{
        title: `Tell ${first}`,
        summary: told ? "Told" : "Not yet",
        body: (
          <>
            <p className="qad-secs">{signed ? `You accepted an offer, and ${first}'s query closed with it.` : `You withdrew this query.`} It's courteous to let {first} know.</p>
            <Toggle testId="told" on={told} onClick={() => { setTold(!told); setTouched(true); }}>I’ve told {first}</Toggle>
          </>
        ),
      }],
      saves: told ? [{ text: `The “Tell ${first}” to-do comes off your list` }] : [{ text: "Nothing changes until you've told them" }],
      who, dirty: touched, touched: () => [q.id],
      commit: async () => {
        if (told) await db.updateQuery(q.id, { withdrawTold: true } as Partial<Query>);
        return { queryId: q.id, message: `Noted · ${agentName(agent)}`, sub: told ? `TOLD ${up(today)}` : "NOTHING CHANGED", touched: [q.id] };
      },
    });
  }

  const i = log ? log.findIndex((e) => e.id === req.entryId) : -1;
  const e = i >= 0 && log ? log[i] : null;
  if (!e) {
    return children({ ...emptyView("CORRECT THE RECORD", "Edit an entry"), preNote: <Note kind="info" tag="LOADING">Reading the entry…</Note>, who });
  }
  const orig = e.day;
  const day = d ?? orig;
  const text = note ?? e.note;
  const newer = log![i + 1] ?? null;
  const older = i > 0 ? log![i - 1] : null;
  const latestAllowed = newer ? newer.day : today;
  const bad: Guard | null = dayDiff(day, latestAllowed) > 0
    ? { level: "block", msg: `It must be on or before ${fmt(latestAllowed)}${newer ? `, when “${newer.name}” happened` : ""}` }
    : older && dayDiff(day, older.day) < 0
      ? { level: "block", msg: `It must be on or after ${fmt(older.day)}, when “${older.name}” happened` }
      : null;
  const anch: Anchor[] = [{ k: "orig", label: "As recorded", d: orig, sub: dm(orig) }, ...pastAnchors(today)];
  const moved = dayDiff(day, orig) !== 0;
  const isSend = e.status === QueryStatus.QUERIED || /query sent/i.test(e.name);
  const isLatestNudge = e.isNudge && !log!.slice(i + 1).some((x) => x.isNudge);

  /* ---------- §A4 · what you sent (the Queried entry only) ---------- */
  const rec = sentRecordOf(q);
  const ms = db.manuscripts.find((m) => m.id === q.manuscriptId) || null;
  const choices: EditionChoice[] = isSend ? editionsOn(q.manuscriptId, dayIso(day), db.packages, db.versions, ms?.bookVersions) : [];
  const recordedKey = rec.how === "package" && rec.packageId ? `${rec.packageId}#${rec.edition ?? 1}` : null;
  const was = readSummary(rec.materials);
  const recordedPortion = was.pieces.find((p) => p.key === "sample")?.value.split(" · ")[0] ?? "";
  const qlV = currentVersion(q.manuscriptId, db.versions, ComponentType.QUERY_LETTER);
  const synV = currentVersion(q.manuscriptId, db.versions, ComponentType.SYNOPSIS);
  const book = bookOf(ms?.wordCount);
  const how: "package" | "individual" | null = sent ? sent.how : rec.how === "unrecorded" ? null : rec.how;
  const pickedKey = sent?.how === "package" ? sent.key : sent ? null : recordedKey;
  const picked = choices.find((c) => c.key === pickedKey) || null;
  const indMat: Materials = sent?.how === "individual" ? sent.mat : { ql: true, syn: !!synV, s: blankSample() };
  /** The new record, or null when nothing about what was sent has changed. */
  const next = !sent ? null : sent.how === "package"
    ? (picked ? {
        sentHow: "package" as const, id: picked.id, edition: picked.edition, name: picked.name,
        summary: summaryWith([
          ...sentPieces({ ql: picked.ql, syn: picked.syn, s: { ...blankSample(), unit: "none" } }, { ...picked, bookVersion: null }).filter((x) => x.key !== "other"),
          ...(recordedPortion || picked.bookVersion ? [{ key: "sample" as const, label: "Sample", value: [recordedPortion, picked.bookVersion].filter(Boolean).join(" · ") }] : []),
          ...(picked.other ? [{ key: "other" as const, label: "Also", value: picked.other }] : []),
        ], picked.name, null),
        versions: [picked.qlId, picked.synId].filter((x): x is string => !!x),
      } : null)
    : {
        sentHow: "individual" as const, id: null, edition: null, name: null,
        summary: summaryWith(sentPieces(sent.mat, { qlVersion: qlV?.versionName ?? null, synVersion: synV?.versionName ?? null, bookVersion: null, other: null }), null, null),
        versions: [sent.mat.ql ? qlV?.id : null, sent.mat.syn ? synV?.id : null].filter((x): x is string => !!x),
      };
  const sentChanged = !!next && next.summary !== (q.sentMaterials ?? "");
  const describe = (name: string | null, how: string) => (name ? `${name}` : how === "unrecorded" ? "not recorded" : "chosen individually");
  const requestRungs = (log ?? []).filter((x) => x.status === QueryStatus.PARTIAL_REQUESTED || x.status === QueryStatus.FULL_REQUESTED || x.status === QueryStatus.REVISE_RESUBMIT);
  const sentSection = isSend ? (
    <>
      <Fl>WHAT YOU SENT</Fl>
      <div className="qad-hows" role="radiogroup" aria-label="How you record what you sent">
        <button type="button" role="radio" aria-checked={how === "package"} className={`qad-how${how === "package" ? " on" : ""}${choices.length ? "" : " dis"}`}
          disabled={!choices.length} data-qad-how="package"
          onClick={() => { setSent({ how: "package", key: recordedKey && choices.some((c) => c.key === recordedKey) ? recordedKey : choices[0].key }); setTouched(true); }}>
          <i /><span><b>Attach a submission package</b>{choices.length ? null : <small>None existed on {fmt(day)}</small>}</span>
        </button>
        <button type="button" role="radio" aria-checked={how === "individual"} className={`qad-how${how === "individual" ? " on" : ""}`} data-qad-how="individual"
          onClick={() => { setSent({ how: "individual", mat: indMat }); setTouched(true); }}>
          <i /><span><b>Choose materials individually</b></span>
        </button>
      </div>
      {how === "package" ? (
        <>
          <div className="qad-plist" style={{ marginTop: 10 }} role="radiogroup" aria-label="Which edition">
            {choices.map((c) => (
              <button type="button" role="radio" aria-checked={pickedKey === c.key} key={c.key} className={`qad-prow${pickedKey === c.key ? " on" : ""}`} data-qad-pkg={c.id} data-qad-edition={c.edition}
                onClick={() => { setSent({ how: "package", key: c.key }); setTouched(true); }}>
                <i />
                <span><b>{c.name} · {ordinal(c.edition)} edition</b><small>{c.retired ? "Retired · " : ""}{summaryOf(sentPieces({ ql: c.ql, syn: c.syn, s: { ...blankSample(), unit: "none" } }, c)).replace(/^./, (x) => x)}</small></span>
                <span className="qad-ptags">{c.key === recordedKey ? <em className="w">AS RECORDED</em> : null}</span>
              </button>
            ))}
          </div>
          <Note kind="info" tag="EDITIONS">Every edition that existed on {dm(day)} is offered, including retired ones, because that's what could have gone out that day.</Note>
        </>
      ) : how === "individual" ? (
        <>
          <Toggle testId="edql" on={indMat.ql} onClick={() => { setSent({ how: "individual", mat: { ...indMat, ql: !indMat.ql } }); setTouched(true); }} small={indMat.ql && qlV ? qlV.versionName.toUpperCase() : ""}>Query letter</Toggle>
          <Toggle testId="edsyn" on={indMat.syn} onClick={() => { setSent({ how: "individual", mat: { ...indMat, syn: !indMat.syn } }); setTouched(true); }} small={indMat.syn && synV ? synV.versionName.toUpperCase() : ""}>Synopsis</Toggle>
          <SampleControl name="edit" sample={indMat.s} book={book} allowNone onChange={(s2: Sample) => { setSent({ how: "individual", mat: { ...indMat, s: s2 } }); setTouched(true); }} />
        </>
      ) : <p className="qad-secs">Nothing is recorded about what went with this query. Choose one of the two ways to add it.</p>}
    </>
  ) : null;

  const view: JourneyView = {
    eyebrow: "CORRECT THE RECORD", title: "Edit an entry", verb: "save", verbDone: "saved", button: "Save correction", ok: true,
    steps: [{
      title: e.name,
      summary: `${fmt(day)}${moved ? ` · was ${fmt(orig)}` : ""}${sentChanged && next ? ` · sent: ${next.name ? `${next.name}, ${ordinal(next.edition ?? 1)} edition` : "chosen individually"}` : ""}`,
      guard: bad,
      body: (
        <>
          <p className="qad-secs">Correct the date or the note. The query's plan and reminders are worked out again from the new date.</p>
          <DateField id="edDate" label="DATE" value={day} anchors={anch} dir="past" onPick={(x) => { if (x) { setD(x); setTouched(true); } }} />
          <Fl>NOTE</Fl>
          <TextBox value={text} onChange={(v) => { setNote(v); setTouched(true); }} />
          {sentSection}
        </>
      ),
    }],
    saves: [
      ...(moved ? [{ text: `“${e.name}” moves from ${fmt(orig)} to ${fmt(day)}` }] : []),
      ...(!sentChanged ? [{ text: "Dates worked out from it — reply expected, nudge reminders — move with it" }] : [
        { text: <>What was sent changes from <em>{describe(was.packageName, rec.how)}</em> to <em>{next!.name ? `${next!.name}, ${ordinal(next!.edition ?? 1)} edition` : "chosen individually"}</em></> },
        ...(requestRungs.length ? [{ text: next!.name
          ? `${first}'s ${requestRungs.map((x) => x.name.toLowerCase()).join(" and ")} ${requestRungs.length > 1 ? "move" : "moves"} to ${next!.name}'s results`
          : `${first}'s ${requestRungs.map((x) => x.name.toLowerCase()).join(" and ")} no longer count towards any package` }] : []),
        { text: `The entry shows “Corrected ${dm(today)}”, and the original stays in its history` },
      ]),
    ],
    who, dirty: touched, touched: () => [q.id],
    commit: async () => {
      await db.editActivity(q.id, e.id, { ...(moved ? { date: dayIso(day) } : {}), ...(note !== null ? { details: text } : {}) });
      const extra: Record<string, unknown> = {};
      if (moved && isSend) extra.dateSent = dayIso(day);
      if (moved && isLatestNudge) extra.lastNudgeSentDate = dayIso(day);
      /* §A4 — the snapshot is REPLACED, and the old summary kept beside the correction. Results move
         by themselves: they are worked out from the query, never stored on an entry (LP10). */
      if (sentChanged && next) {
        const none = deleteField() as unknown as undefined;
        Object.assign(extra, {
          sentHow: next.sentHow,
          packageId: next.id ?? "",
          sentPackageId: next.id ?? none,
          sentPackageEdition: next.edition ?? none,
          basedOnPackageId: none, basedOnPackageEdition: none, sentChanges: none,
          sentMaterials: next.summary,
          sentVersions: next.versions,
          sentCorrectedAt: new Date().toISOString(),
          sentCorrectedFrom: q.sentMaterials ?? "",
        });
      }
      if (Object.keys(extra).length) await db.updateQuery(q.id, extra as Partial<Query>, sentChanged && next?.id ? { stampPackage: next.id } : undefined);
      return { queryId: q.id, message: `Entry corrected · ${agentName(agent)}`, sub: sentChanged && next ? `NOW ${next.name ? `${next.name.toUpperCase()}, ${ordinal(next.edition ?? 1).toUpperCase()} EDITION` : "CHOSEN INDIVIDUALLY"}` : moved ? `${e.name.toUpperCase()} NOW ${up(day)}` : "NOTE UPDATED", touched: [q.id] };
    },
  };
  return children(view);
}
