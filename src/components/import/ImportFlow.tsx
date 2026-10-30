/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ImportFlow — the import, from a chosen file to the dashboard (onboarding v5, part 3).
 *
 * ONE FLOW, TWO HOMES. These are the steps parts 1 and 2 built inside set-up's `BranchB`: the
 * confirm, the two "already used" screens, the reading loader, the summary, the review, the
 * importing loader, "nothing imported" and the two dead ends — with the handlers that drive them
 * (`pickFile`, `pickTemplateFile`, `runMapping`, `handleImport`), the 5-second floor and the
 * skipped-rows notice. They were moved here unchanged so the Import page can run the same code.
 *
 * PROPS, NOT CONTEXT, for everything a host decides: the manuscript, where "Back" from the first
 * screen goes, and what happens at the end. The HOST DRAWS THE FRAME and its own way in (set-up's
 * fork, the Import page's tiles); while the flow is `idle` it renders only its two file pickers,
 * which the host opens through the ref.
 */
import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import type { DraftMeta } from "../../lib/importDraft";
/* ⚠️ LOADED WHEN FIRST NEEDED: `lib/importDraft` brings Firebase with it, and this flow is mounted by suites and labs that
   have no Firebase to load */
const draftStore = () => import("../../lib/importDraft");
import { draftCounts, type DraftPayload, type ReviewSnapshot } from "../../lib/importDraftModel";
import { eventPath, logEvent } from "../../lib/events";
import { useLocation } from "react-router-dom";

/** First visit v2 (Part F): a draft is saved this long after the review's last change. */
export const DRAFT_SAVE_MS = 800;
import { useScriptAllyDb } from "../../lib/db";
import { QueryStatus } from "../../types";
import { SmartImportResult } from "../../types/smartImport";
import { runSmartImport, validateSmartImport, ValidatedImport, sampleRawRecords, RawRecordSample } from "../../lib/smartImport";
import { applyImportUpdate, PROGRESS_START, type LoaderProgress } from "../../lib/importEstimate";
import { useSmartImportEntitlement } from "../../lib/useSmartImportEntitlement";
import { agentAgencyLine } from "../../lib/agentDisplay";
import { commitSmartImport, CommitOutcome } from "../../lib/smartImportCommit";
import { clearWin, noteFirstWin } from "../../lib/firstWin";
import { isFirstQueryWin, winCopy } from "../../lib/dashFirstVisit";
import { SmartImportReview } from "../onboarding/SmartImportReview";
import { ImportOverview } from "../onboarding/ImportOverview";
import { ImportingLoader } from "../onboarding/ImportingLoader";
import { ScatterSettleLoader, LoaderCard } from "../onboarding/ScatterSettleLoader";
import { fmtDate, reviewTallies } from "../../lib/smartImportReviewModel";
import { summaryModel } from "../../lib/importSummary";
import { readTemplateFile, TemplateFlag } from "../../lib/templateImport";
import { TEMPLATE_FILENAME, downloadTemplate } from "../../lib/templateFile";
import { buildImportNotice, saveImportNotice } from "../../lib/importNotice";
import { splitDuplicates, ALREADY_REASON } from "../../lib/importDuplicates";

type AlreadyRow = { who: string; status: string; sentDate: string | null };
import { manuscriptErrorLine, type ImportSource } from "../../lib/importLabels";
import { ConfirmScreen } from "../onboarding/ConfirmScreen";
import { UsedFree, UsedProMonth, Unreadable, NothingImported, Unloaded } from "../onboarding/DeadEnd";

/** UX-only floor so the post-import loader is held for a deliberate minimum (never a fake delay on
 *  errors — Promise.all rejects as soon as the commit does). */
const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Where the flow is. `idle` = nothing chosen yet: the host's own way in is on screen. */
export type ImportFlowScreen = "idle" | "confirm" | "blocked" | "reading" | "overview" | "review" | "fallback" | "importing" | "done";

/** A blocked Smart Import attempt — the structured reason the gate (or the pre-check) surfaced. */
type Blocked = { reason: "free_used" | "pro_month_used"; nextAvailable?: string };

/** What the host can ask of the flow while it is idle. */
export interface ImportFlowHandle {
  /** Open the Smart Import file picker. */
  chooseFile: () => void;
  /** Open the template file picker. */
  chooseTemplate: () => void;
  /** A file dropped on the host's drop zone: the Smart Import path. */
  dropFile: (file: File) => void;
  /** Drop the file that was read and everything answered about it, and go back to idle. Nothing has
   *  been written at any point before the import, so there is nothing to undo — except the kept draft
   *  (Dashboard first visit v2, Part F), which a discard deletes. */
  reset: () => void;
  /** Dashboard first visit v2 (Part F): reopen a kept review at the step and row it was left on. */
  resume: (d: { meta: DraftMeta; payload: DraftPayload }) => void;
}

export interface ImportFlowProps {
  /** The manuscript's title, shown on the summary and the review. */
  manuscriptTitle: string;
  /** The manuscript the import will file its queries under, when it already exists. A query in
   *  the file that this manuscript already holds is not imported again. Set-up has none yet. */
  manuscriptId?: string | null;
  /** Create-or-reuse the manuscript, returning its id (null if it couldn't be created). Called once,
   *  at the commit; every imported query attaches to this id. */
  onEnsureManuscript: () => Promise<string | null>;
  /** The host's own message when the manuscript could not be created (e.g. the plan's limit). */
  hostError?: string | null;
  /** "Add them by hand", offered on the dead ends. */
  onAddByHand: () => void;
  /** The flow has gone back to `idle` — "Back" from its first screen, or a dead end's way out. */
  onBackToStart?: () => void;
  /** "Use the template instead", from the Smart-Import-already-used screen. */
  onUseTemplate?: () => void;
  /** Import committed and the loader has finished: the host opens the dashboard. */
  onImportComplete: (outcome: CommitOutcome, destination: "dashboard") => void;
  /** The flow's current screen, reported so the host can set its frame around it. */
  onScreen?: (screen: ImportFlowScreen) => void;
  /** The importing loader's card has started to lift. */
  onHandoff?: () => void;
  /** "Cancel", drawn on the summary and the review when the host has a way out of its own (the Import
   *  page). Set-up passes none: its way out is the frame's. */
  onCancel?: () => void;
  /**
   * `#/onb-lab` only: start on the summary over a fixture, and commit through a stand-in. The lab
   * has no account to write to; everything between the summary and the hand-over is the real code.
   * `floorMs` shortens the 5-second floor for the locks (the floor itself is lock R1's).
   */
  lab?: { result: SmartImportResult; fileName: string; title: string; commit: (result: SmartImportResult) => Promise<CommitOutcome>; uid: string; floorMs?: number };
}

export const ImportFlow = forwardRef<ImportFlowHandle, ImportFlowProps>(function ImportFlow({
  manuscriptTitle, manuscriptId, onEnsureManuscript, hostError, onAddByHand, onBackToStart, onUseTemplate, onImportComplete, onScreen, onHandoff, onCancel, lab,
}, ref) {
  const { currentUser, agents, queries, addAgent, addQuery, manuscripts } = useScriptAllyDb();
  const entitlement = useSmartImportEntitlement();

  const [screen, setScreen] = useState<ImportFlowScreen>(lab ? "overview" : "idle");
  useEffect(() => { onScreen?.(screen); }, [screen, onScreen]);
  /** Back to the host's own way in. */
  const toStart = () => { setScreen("idle"); onBackToStart?.(); };

  const [fileName, setFileName] = useState(lab?.fileName ?? "");
  const [validated, setValidated] = useState<ValidatedImport | null>(() => (lab ? validateSmartImport(lab.result) : null));
  // Scatter-settle loader (extraction wait): the writer's raw cells sampled client-side (display only),
  // plus the "extraction done" signal that triggers the snap-and-crystallise settle.
  const [rawSample, setRawSample] = useState<RawRecordSample[]>([]);
  /** The reading loader's foot bar: the file's row total, the server's count as it streams in, and
   *  the phase (opening → reading → tidying, or retry). */
  const [readProgress, setReadProgress] = useState<LoaderProgress>(PROGRESS_START);
  const [extractComplete, setExtractComplete] = useState(false);
  const [outcome, setOutcome] = useState<CommitOutcome | null>(null);
  const [commitError, setCommitError] = useState<string | null>(null);
  const [manuscriptFailed, setManuscriptFailed] = useState(false);
  /** Which path read the file — named in the activity line the commit leaves. */
  const [importSource, setImportSource] = useState<ImportSource>("smart");
  // Drives the loader's completion beat: flipped true only after a genuine success (commit resolved
  // with rows imported AND the 5s floor elapsed). The loader then plays its finish and routes on.
  const [importComplete, setImportComplete] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [blocked, setBlocked] = useState<Blocked | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const templateInputRef = useRef<HTMLInputElement>(null);
  /** Cells the template parser could not read. Each date flag is also a reason on its own query,
   *  which is what the review renders. */
  const [, setTemplateFlags] = useState<TemplateFlag[]>([]);
  /** The file's row count, when it is known without reading the file again: the template parse
   *  returns it; a Smart import does not (its sample is capped at eight rows). */
  const [rowsRead, setRowsRead] = useState<number | null>(null);
  /** Rows of the file the account already holds (same agent, manuscript and sent day). They are
   *  taken out before the summary, so the summary and the review count only what will be written. */
  const [already, setAlready] = useState<AlreadyRow[]>([]);

  /* ── Dashboard first visit v2 (Part F): the review, kept as a draft while it is open ──
     Every change the review reports is saved (debounced) to `importDrafts/{uid}`: the file's name, the read, every
     decision so far, the step and counts — never the file. Finishing the import, or discarding it, deletes it. A save
     that fails is logged and the review carries on. Never in the lab, and never without a writer. */
  const [resumeSnap, setResumeSnap] = useState<ReviewSnapshot | undefined>(undefined);
  const draftStarted = useRef<string | null>(null);
  const draftTimer = useRef(0);
  const draftLive = useRef(false);
  const uid = currentUser?.id ?? null;
  /* Part I: the import's events — the path is the writer's, the counts the review's own (`draftCounts`) */
  const lastSnap = useRef<ReviewSnapshot | null>(null);
  const evPath = () => eventPath(currentUser, manuscripts.find((m) => m.id === manuscriptId) ?? null);
  const evCounts = (snap: ReviewSnapshot | null) => {
    if (!snap) return {};
    const c = draftCounts(snap);
    return { step: snap.screen, agents: c.agentsChecked, queries: c.queriesChecked };
  };
  const keepDraft = useCallback((snap: ReviewSnapshot) => {
    lastSnap.current = snap;
    if (lab || !uid || !validated) return;
    if (!draftStarted.current) {
      draftStarted.current = new Date().toISOString();
      logEvent(uid, "import_started", evPath(), evCounts(snap));
    }
    draftLive.current = true;
    window.clearTimeout(draftTimer.current);
    const input = { uid, fileName, source: importSource, manuscriptId: manuscriptId ?? null, startedAt: draftStarted.current,
      payload: { result: validated.result, review: snap, already } };
    draftTimer.current = window.setTimeout(() => {
      if (!draftLive.current) return;
      void draftStore().then((m) => m.saveDraft(input)).catch((e) => console.error("Import draft not kept:", e));
    }, DRAFT_SAVE_MS);
  }, [lab, uid, validated, fileName, importSource, manuscriptId, already]);
  const dropDraft = () => {
    window.clearTimeout(draftTimer.current);
    draftLive.current = false;
    draftStarted.current = null;
    if (uid && !lab) void draftStore().then((m) => m.deleteDraft(uid)).catch(() => { /* nothing kept, or already gone */ });
  };
  useEffect(() => () => window.clearTimeout(draftTimer.current), []);
  /* Part I: the page left while a review is open (another route, or the tab closed) — the moment a draft matters */
  const where = useLocation().pathname;
  const whereWas = useRef(where);
  const leftLogged = useRef(false);
  useEffect(() => {
    const moved = whereWas.current !== where;
    whereWas.current = where;
    if (screen !== "review") { leftLogged.current = false; return; }
    if (moved && !leftLogged.current && !lab) { leftLogged.current = true; logEvent(uid, "import_left", evPath(), evCounts(lastSnap.current)); }
    if (!moved) leftLogged.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [where, screen]);
  useEffect(() => {
    if (screen !== "review" || lab) return undefined;
    const hide = () => { if (!leftLogged.current) { leftLogged.current = true; logEvent(uid, "import_left", evPath(), evCounts(lastSnap.current)); } };
    window.addEventListener("pagehide", hide);
    return () => window.removeEventListener("pagehide", hide);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, uid]);

  /**
   * Take the file as read, set aside what is already in the account, and show what is left.
   * A file whose every query is already here goes straight to "Nothing was imported": there is
   * nothing to review and nothing is written.
   */
  const takeRead = (result: SmartImportResult): "fresh" | "nothing" => {
    const split = splitDuplicates(result, agents, queries, manuscriptId);
    const rows: AlreadyRow[] = split.duplicates.map((d) => ({
      who: (d.agent?.name ?? "").trim() || (d.agent?.agency ?? "").trim(),
      status: d.query.status ?? "", sentDate: d.query.sentDate ?? null,
    }));
    setAlready(rows);
    setValidated(validateSmartImport(split.fresh));
    if (rows.length > 0 && (split.fresh.queries ?? []).length === 0) {
      const none: CommitOutcome = { agentsCreated: 0, agentsMerged: 0, queriesImported: 0, queriesSkipped: rows.length, errors: [], already: rows };
      setOutcome(none);
      if (currentUser) saveImportNotice(currentUser.id, buildImportNotice([], none, [], [], Date.now(), rows));
      setNothingNew(true);
      setScreen("done");
      return "nothing";
    }
    return "fresh";
  };
  const [nothingNew, setNothingNew] = useState(false);

  // File chosen → gate it on the client first. If already used, go straight to the blocked screen
  // (no wasted call); otherwise hold the file and ask for an explicit confirm before spending it.
  // The server re-checks regardless — this is UX, not the enforcement.
  const pickFile = (file: File) => {
    if (!entitlement.allowed) {
      setBlocked({ reason: entitlement.reason as Blocked["reason"], nextAvailable: entitlement.nextAvailable });
      setScreen("blocked");
      return;
    }
    setPendingFile(file);
    /* ⚠️ THE NAME IS RECORDED HERE, NOT IN runMapping — the confirm screen is the ONLY reader.
       It used to be set at the top of runMapping, which the confirm screen's own primary button
       calls: so by the time the name existed, the screen asking you to confirm it was gone. The
       screen therefore always took its unnamed fallback ("We'll read your file…") on the one
       screen whose whole job is naming the file about to spend a one-shot entitlement. */
    setFileName(file.name);
    setScreen("confirm");
  };

  /**
   * The template path — parsed HERE, in the browser, with no call to anything.
   *
   * ⚠️ IT DOES NOT TOUCH THE ENTITLEMENT, AND THAT IS THE PROMISE THE FORK MAKES IN WORDS. No
   * gate check, no confirm beat, no spend: the columns are set, so reading them needs no model.
   * The confirm screen exists to name the file about to spend a one-shot entitlement, and there is
   * nothing here to spend.
   *
   * ⚠️ IT REJOINS THE SMART IMPORT PIPELINE AT THE REVIEW. The parse produces a SmartImportResult,
   * so duplicate reconciliation, validation, the review screen and commitSmartImport are the same
   * code for both paths — the adaptation is at this boundary and nowhere else.
   */
  const pickTemplateFile = async (file: File) => {
    setRawSample([]); setExtractComplete(false); setValidated(null); setTemplateFlags([]);
    setImportSource("template");
    setFileName(file.name);
    try {
      const parsed = await readTemplateFile(file);
      setTemplateFlags(parsed.flags);
      setRowsRead(parsed.rowsRead);
      if (takeRead(parsed.result) === "fresh") setScreen("overview");
    } catch (e) {
      console.error("Template parse failed:", e);
      setScreen("fallback"); // graceful fallback — never dead-end onboarding
    }
  };

  const runMapping = async (file: File) => {
    setRawSample([]); setExtractComplete(false); setValidated(null); setRowsRead(null);
    setImportSource("smart");
    setScreen("reading"); // the scatter-settle loader takes over from here
    // Display-only: show the writer's actual raw cells the instant they upload, scattered, while the
    // real extraction runs. Never feeds runSmartImport; a parse failure just leaves the loader plain.
    sampleRawRecords(file).then(setRawSample).catch(() => setRawSample([]));
    try {
      setReadProgress(PROGRESS_START);
      const result: SmartImportResult = await runSmartImport(file, (u) => setReadProgress((p) => applyImportUpdate(p, u)));
      setReadProgress((p) => applyImportUpdate(p, { type: "result" }));
      if (takeRead(result) === "nothing") return;
      setExtractComplete(true); // loader snaps the cards in, crystallises them, then routes to Overview
    } catch (e: any) {
      // A blocked entitlement comes back as a structured HttpsError — branch on details.reason so the
      // UI shows the right thing, not a raw error. (Covers a client/server race: client thought it was
      // allowed but the server had already consumed it.)
      const reason = e?.details?.reason;
      if (reason === "free_used" || reason === "pro_month_used") {
        setBlocked({ reason, nextAvailable: e?.details?.nextAvailable });
        setScreen("blocked");
        return;
      }
      console.error("Smart Import mapping failed:", e);
      setScreen("fallback"); // graceful fallback — never dead-end onboarding
    }
  };

  /** Commit the final result the review hands back. The two-screen SmartImportReview owns every
   *  inline fix (statuses, dates, dedupe, exclusions, recovered names) and builds the result via
   *  modelToResult, so we just commit it — same deps and post-import flow as before. */
  const handleImport = async (result: SmartImportResult, left?: { setAside: { status: string; sentDate: string | null }[] }) => {
    if (!currentUser && !lab) return;
    setCommitError(null);
    setManuscriptFailed(false);
    setImportComplete(false);
    setScreen("importing"); // the loader shows the instant Import is pressed
    try {
      // Create (or reuse) the manuscript from the held details — the single deferred write — then
      // attach this import's queries to it. Idempotent: a retry after a failed commit reuses the id.
      const mId = await onEnsureManuscript();
      if (!mId) {
        /* The host says why through `error` (the plan's limit has its own message); the review
           shows that when it is the limit, and the plain sentence for anything else. */
        setManuscriptFailed(true);
        setScreen("review");
        return;
      }
      // Run the commit and a 5s UX floor together. The floor never hides an error: if the commit
      // rejects, Promise.all rejects immediately (we don't wait out the 5s to surface the failure).
      const [committed] = await Promise.all([
        lab
          ? lab.commit(result)
          : commitSmartImport(
              { userId: currentUser!.id, existingAgents: agents, existingQueries: queries, manuscriptTitle: manuscriptTitle, addAgent, addQuery },
              result,
              mId,
              importSource
            ),
        delay(lab?.floorMs ?? 5000),
      ]);
      setOutcome(committed);
      /* first visit v2 (Part F): the import is finished, so the kept review goes */
      dropDraft();
      if (!lab) logEvent(uid, "import_finished", evPath(), { step: lastSnap.current?.screen, agents: committed.agentsCreated, queries: committed.queriesImported });
      /* ⚠️ THE SKIPPED ROWS ARE KEPT FOR THE DASHBOARD HERE, when the commit returns and before the
         loader completes. The validation is of the result the REVIEW handed back — the one that was
         committed — not of the first read. A commit that skipped nothing clears any older notice. */
      saveImportNotice(lab ? lab.uid : currentUser!.id, buildImportNotice(
        validateSmartImport(result).skipped, committed, result.agents, left?.setAside ?? [], Date.now(),
        /* what the read set aside as already here, and anything the commit itself found (set-up
           learns its manuscript only at the commit) — the two never overlap */
        [...already, ...(committed.already ?? [])],
      ));
      // Never route on a false success: if nothing actually landed, surface the outcome screen
      // instead of the loader's completion + dashboard route.
      if (committed.queriesImported === 0) { setScreen("done"); return; }
      /* Dashboard first visit v1 (Part B): an import that brings a manuscript its first queries is the dashboard's
         first-win stamp — one for the file. The agents it created are part of that import, not a first agent of
         their own, so a "first agent" the commit raised is taken back. */
      if (!lab && currentUser && isFirstQueryWin(queries, mId, false)) {
        clearWin({ uid: currentUser.id, kind: "agent", msId: null });
        noteFirstWin({ kind: "import", uid: currentUser.id, msId: mId, ...winCopy.import(committed.queriesImported) });
      }
      // Genuine success → let the loader play its completion beat, then it calls onProceed to route.
      setImportComplete(true);
    } catch (e) {
      console.error("Smart Import commit failed:", e);
      setCommitError("Something went wrong bringing your pipeline in — nothing is lost. Try again, or use the Import desk.");
      setScreen("review");
    }
  };


  useImperativeHandle(ref, () => ({
    chooseFile: () => fileInputRef.current?.click(),
    chooseTemplate: () => templateInputRef.current?.click(),
    dropFile: pickFile,
    reset: () => {
      dropDraft();
      setResumeSnap(undefined);
      setPendingFile(null); setValidated(null); setRawSample([]); setExtractComplete(false); setOutcome(null);
      setCommitError(null); setManuscriptFailed(false); setImportComplete(false); setBlocked(null); setRowsRead(null); setFileName("");
      setAlready([]); setNothingNew(false);
      setScreen("idle");
    },
    resume: ({ meta, payload }) => {
      draftStarted.current = meta.startedAt;
      logEvent(uid, "import_resumed", evPath(), evCounts({ ...payload.review }));
      setFileName(meta.fileName);
      setImportSource(meta.source);
      setAlready(payload.already ?? []);
      setValidated(validateSmartImport(payload.result));
      setResumeSnap(payload.review);
      setScreen("review");
    },
  }));

  /* The two pickers. One element each, rendered by whichever screen can open one — the fork, and
     the confirm's "Change" — so a press always has an input to click. */
  const pickers = (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        style={{ display: "none" }}
        data-picker="smart"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) pickFile(f); e.target.value = ""; }}
      />
      <input
        ref={templateInputRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        style={{ display: "none" }}
        data-picker="template"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) void pickTemplateFile(f); e.target.value = ""; }}
      />
    </>
  );

  if (screen === "confirm") {
    return (
      <>
        {pickers}
        <ConfirmScreen
          fileName={fileName}
          fileSize={pendingFile?.size ?? null}
          /* "Change" opens the picker in place: `pickFile` replaces the pending file and the name
             shown, and the screen stays where it is. Nothing is read by choosing. */
          onChange={() => fileInputRef.current?.click()}
          onBack={() => { setPendingFile(null); toStart(); }}
          onRead={() => { if (pendingFile) void runMapping(pendingFile); }}
        />
      </>
    );
  }

  if (screen === "blocked" && blocked) {
    const backToFork = () => { setBlocked(null); toStart(); };
    if (blocked.reason === "free_used") {
      return (
        <UsedFree
          onBack={backToFork}
          onAddByHand={onAddByHand}
          /* Back to the start, where the template tile is: what the writer
             has just been told they can still do. */
          onUseTemplate={() => { setBlocked(null); onUseTemplate?.(); toStart(); }}
        />
      );
    }
    const nextLabel = blocked.nextAvailable
      ? new Date(`${blocked.nextAvailable}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })
      : "next month";
    return <UsedProMonth nextLabel={nextLabel} onBack={backToFork} onAddByHand={onAddByHand} />;
  }

  if (screen === "reading") {
    /* The phone's two piles end on the overview's own totals (set-up on phones v1): the same
       `summaryModel` → `reviewTallies` the overview reads, once the result is in. Read only. */
    const readPiles = validated
      ? (() => { const m = summaryModel(validated.result); const t = reviewTallies(m.agents, m.queries); return { agents: t.agents.total, queries: t.queries.total }; })()
      : null;
    const resultQueries = validated?.result.queries ?? [];
    const resultAgents = validated?.result.agents ?? [];
    const cards: LoaderCard[] = rawSample.map((r, i) => {
      const q = extractComplete ? resultQueries[i] : undefined;
      if (!q) return { messy: r.messy }; // still scattered / not yet extracted
      const agent = resultAgents.find((a) => a.ref === q.agentRef);
      const name = agent?.name?.trim() || agent?.agency?.trim() || "New agent";
      const agency = agentAgencyLine(agent ?? {}); // agency, or "No agency" — never the inverted "Agency only" for a named record
      const date = q.sentDate ? fmtDate(q.sentDate) : "Undated";
      return { messy: r.messy, name, agency, date, status: q.status ?? QueryStatus.QUERIED };
    });
    return (
      <ScatterSettleLoader
        cards={cards}
        complete={extractComplete && !!validated}
        total={validated ? resultQueries.length : rawSample.length}
        onProceed={() => setScreen("overview")}
        onTimeout={() => setScreen("fallback")}
        progress={readProgress}
        fileName={fileName}
        piles={readPiles}
      />
    );
  }

  // ── Bringing it in — the held loader (5s floor + commit), which opens the dashboard.
  if (screen === "importing") {
    return (
      <ImportingLoader
        complete={importComplete}
        onLift={onHandoff}
        /* ⚠️ THE LOADER HANDS OVER TO THE DASHBOARD. There is no closing page: the dashboard is what
           the import was for, and the page that stood here ("That's everything captured") restated
           what the dashboard shows a moment later. `importComplete` is only ever set after the
           build's own success test (at least one query imported), so `outcome` is a success here. */
        onProceed={() => { if (outcome) onImportComplete(outcome, "dashboard"); }}
      />
    );
  }

  // ── Overview — "Here's what we found". Positive arrival before any work; reads the parsed result
  //    for live tier counts, then "Let's work through it" routes into the review stages. ─
  if (screen === "overview" && validated) {
    return (
      <ImportOverview
        result={validated.result}
        manuscriptTitle={manuscriptTitle}
        fileName={fileName}
        rowCount={rowsRead}
        onContinue={() => setScreen("review")}
        onCancel={onCancel}
      />
    );
  }

  // ── Review & confirm — the two-screen SmartImportReview (Agents ⇄ Queries). It owns every inline
  //    fix (statuses, dates, dedupe, exclusions) and hands back the final result; we commit it. ─
  if (screen === "review" && validated) {
    return (
      <SmartImportReview
        result={validated.result}
        manuscriptTitle={manuscriptTitle}
        onBack={() => toStart()}
        error={manuscriptFailed ? manuscriptErrorLine(hostError) : commitError}
        onImport={handleImport}
        onCancel={onCancel}
        resume={resumeSnap}
        onChange={keepDraft}
      />
    );
  }

  // ── Nothing imported — what the commit actually did. Never silent, never auto-skipped past.
  if (screen === "done" && outcome) {
    const skippedReasons = [...new Set([
      ...(validated?.skipped || []).map((s) => s.reason),
      ...((outcome.already ?? []).length > 0 || already.length > 0 ? [ALREADY_REASON] : []),
    ])];
    /* Every row was already here: there is no review to go back to, so the way out is the start. */
    if (nothingNew) return <NothingImported outcome={outcome} skippedReasons={skippedReasons} onBackToReview={() => toStart()} backLabel="Back" nothingNew />;
    return <NothingImported outcome={outcome} skippedReasons={skippedReasons} onBackToReview={() => setScreen("review")} />;
  }

  // Graceful fallback (also reached when an AI/template mapping fails) — or, if the state machine
  // lands somewhere no branch above handles, an honest recovery card that names the problem.
  if (screen === "idle") return pickers; // the host is showing its own way in (the fork, or the tiles)
  if (screen !== "fallback") {
    console.error("ImportFlow: unhandled screen state", { screen, hasValidated: !!validated, hasOutcome: !!outcome });
    return <Unloaded onAddByHand={onAddByHand} onRestart={() => toStart()} />;
  }

  return (
    <Unreadable
      onBack={() => toStart()}
      onAddByHand={onAddByHand}
      /* ⚠️ THE SAME FILE THE FORK HANDS OUT, by the same call. This card used to fetch
         `QueryHawk-pipeline-import-template.xlsx` — the three-tab workbook the Query Centre's and
         the Contact list's empty states link to — so a writer told "use the template" on the fork
         and here was given two different sheets. */
      onDownload={() => { void downloadTemplate(TEMPLATE_FILENAME); }}
    />
  );
});
