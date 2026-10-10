/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Branch B — "Already querying":
 *   B2 · The book you're querying — full manuscript field set; status set to Querying silently.
 *   B3 · Bring it across — Smart Import primary (upload → AI mapping → review → confirm),
 *        "Add them by hand" secondary, downloadable template, Import-desk escape hatch, and a
 *        template-first fallback layout when the mapping call fails.
 * The review screen matches scriptally-smart-import-review.html; nothing writes before confirm.
 */
import React, { useEffect, useRef, useState } from "react";
import { useScriptAllyDb } from "../../lib/db";
import { QueryStatus } from "../../types";
import { SmartImportResult } from "../../types/smartImport";
import { runSmartImport, validateSmartImport, ValidatedImport, sampleRawRecords, RawRecordSample } from "../../lib/smartImport";
import { useSmartImportEntitlement } from "../../lib/useSmartImportEntitlement";
import { agentAgencyLine } from "../../lib/agentDisplay";
import { commitSmartImport, CommitOutcome } from "../../lib/smartImportCommit";
import { SmartImportReview } from "./SmartImportReview";
import { ImportOverview } from "./ImportOverview";
import { ImportingLoader } from "./ImportingLoader";
import { ScatterSettleLoader, LoaderCard } from "./ScatterSettleLoader";
import { fmtDate } from "../../lib/smartImportReviewModel";
import { ManuscriptFields, ManuscriptFieldsState, emptyManuscriptFields } from "./ManuscriptFields";
import { readTemplateFile, TemplateFlag } from "../../lib/templateImport";
import { TEMPLATE_FILENAME, downloadTemplate } from "../../lib/templateFile";
import { buildImportNotice, saveImportNotice } from "../../lib/importNotice";
import { CaptureOption } from "../../lib/captureFork";
import { ConfirmScreen } from "./ConfirmScreen";
import { UsedFree, UsedProMonth, Unreadable, NothingImported, Unloaded } from "./DeadEnd";
import { CaptureFork } from "./CaptureFork";
import { StepColumn, OpenTitle, StepCard, BackLink, StepFoot, FieldError } from "./setupParts";

export const BOOK_TITLE = "The book you're querying.";
export const BOOK_SUB = "Just the essentials. Your agents and queries attach to this, and you can flesh it out any time.";

/** UX-only floor so the post-import loader is held for a deliberate minimum (never a fake delay on
 *  errors — Promise.all rejects as soon as the commit does). */
const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export interface BranchBProps {
  onSkip: () => void;
  /** Back from B2 — returns to the welcome step. */
  onExit: () => void;
  /** B2 Continue — parent HOLDS the entered details in flow state (no write yet); resolves true to
   *  advance. The manuscript is created later, once, via onEnsureManuscript. */
  onSaveBook: (fields: ManuscriptFieldsState) => Promise<boolean>;
  /** Held B2 details, used to pre-fill the book step when re-entering Branch B (Back then forward). */
  initialBook?: ManuscriptFieldsState | null;
  /** Create-or-reuse the manuscript from the held details, returning its id (null if it couldn't be
   *  created). Idempotent — call it at the commit ending; every imported query attaches to this id. */
  onEnsureManuscript: () => Promise<string | null>;
  /** Pre-selected capture option: deep/interest → "smart", early → "byhand". */
  defaultImport: CaptureOption;
  /** "Add them by hand" — drops into the existing add-agents flow. */
  onAddByHand: () => void;
  /** Escape hatch — finish onboarding into the Import desk (ImportCsv). */
  onOpenImportDesk: () => void;
  /** Import committed — parent finishes onboarding to the dashboard. */
  /**
   * Import committed — the parent finishes onboarding.
   *
   * ⚠️ THE IMPORT ENDS ON THE DASHBOARD (onboarding v5 part 2). The destination is still named, so
   * the one call site reads as what it does; "queries" went with the closing page that offered it.
   */
  onImportComplete: (outcome: CommitOutcome, destination: "dashboard") => void;
  /** Surfaced save/limit error from the parent (e.g. the Free-tier manuscript cap). */
  error?: string | null;
  /**
   * Which spine step this branch is standing on, reported up so the header can mark it.
   *
   * ⚠️ TWO NAMES, NOT TEN. Every screen after the manuscript — the fork, the confirm, the loader,
   * the review, the duplicates — is "Your list". The import sub-flow does NOT become spine steps:
   * expanding it would make the Smart Import path look longer than the template path, which is the
   * progress bar growing because of a choice the writer made.
   */
  onStage?: (stage: "book" | "list") => void;
  /**
   * What the frame's way out should be on this screen (onboarding v5 part 2):
   *   "open"  it leaves at once, as on every set-up step;
   *   "ask"   a file has been read and nothing saved, so leaving asks first (the summary, the review);
   *   "none"  no way out is drawn (the two loaders).
   * The frame is the parent's, so the branch reports and the parent draws.
   */
  onExitMode?: (mode: ExitMode) => void;
  /** The branch is on the importing loader (the frame takes the dashboard's page tokens for it). */
  onImporting?: (on: boolean) => void;
  /** The importing loader's card has started to lift: the frame becomes the app's. */
  onHandoff?: () => void;
  /**
   * `#/onb-lab` only: start on the summary over a fixture, and commit through a stand-in. The lab
   * has no account to write to; everything between the summary and the hand-over is the real code.
   * `floorMs` shortens the 5-second floor for the locks (the floor itself is lock R1's).
   */
  lab?: { result: SmartImportResult; fileName: string; title: string; commit: (result: SmartImportResult) => Promise<CommitOutcome>; uid: string; floorMs?: number };
}

export type ExitMode = "open" | "ask" | "none";
export const exitModeFor = (screen: string): ExitMode =>
  screen === "reading" || screen === "importing" ? "none"
    : screen === "overview" || screen === "review" ? "ask"
    : "open";

/* ⚠️ NO "tidying" MEMBER. It sat in this union with a render branch guarding it, and
   `setScreen("tidying")` was never called from anywhere — the reading screen routes straight to
   the overview. The component behind it (ImportTidyAnimation) and its test are deleted with it:
   a screen no path reaches is not a feature in waiting, it is a claim the union was making about
   the flow that the flow did not honour. */
type B3Screen = "book" | "pipeline" | "confirm" | "blocked" | "reading" | "overview" | "review" | "fallback" | "importing" | "done";

/** A blocked Smart Import attempt — the structured reason the gate (or the pre-check) surfaced. */
type Blocked = { reason: "free_used" | "pro_month_used"; nextAvailable?: string };


/** Sage helper note (the v2 sketch's template note), with the template download inside. */

/** The v2 sketch's escape-hatch line beneath the options. */

// The two-screen SmartImportReview now owns review-row classification, inline fixes and the result
// it hands to handleImport — see SmartImportReview + smartImportReviewModel.

export const BranchB: React.FC<BranchBProps> = ({
  onSkip, onExit, onSaveBook, initialBook, onEnsureManuscript, defaultImport, onAddByHand, onOpenImportDesk, onImportComplete, error, onStage, onExitMode, onImporting, onHandoff, lab,
}) => {
  const { currentUser, agents, addAgent, addQuery } = useScriptAllyDb();
  const entitlement = useSmartImportEntitlement();

  const [screen, setScreen] = useState<B3Screen>(lab ? "overview" : "book");

  /* Report the named position up rather than an index — an index is not a place, and the header
     owns how many steps this branch has. */
  useEffect(() => { onStage?.(screen === "book" ? "book" : "list"); }, [screen, onStage]);
  useEffect(() => { onExitMode?.(exitModeFor(screen)); }, [screen, onExitMode]);
  useEffect(() => { onImporting?.(screen === "importing"); }, [screen, onImporting]);

  /* The band's meta: the step, plus what this screen is doing when that is a real sub-position.
     ⚠️ THE SPINE IS NOT TOLD ANY OF THIS. Sub-steps stay in the band by design — expanding a dot
     into three would make the Smart Import path look longer than the template path, which is the
     progress bar growing because of a choice the writer made. */
  // Seed from any held draft so Back-to-welcome-then-forward re-fills the book step.
  const [fields, setFields] = useState<ManuscriptFieldsState>(lab ? { ...emptyManuscriptFields(), title: lab.title } : initialBook ?? emptyManuscriptFields());
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [importOption, setImportOption] = useState<CaptureOption>(defaultImport);
  const [fileName, setFileName] = useState(lab?.fileName ?? "");
  const [validated, setValidated] = useState<ValidatedImport | null>(() => (lab ? validateSmartImport(lab.result) : null));
  // Scatter-settle loader (extraction wait): the writer's raw cells sampled client-side (display only),
  // plus the "extraction done" signal that triggers the snap-and-crystallise settle.
  const [rawSample, setRawSample] = useState<RawRecordSample[]>([]);
  const [extractComplete, setExtractComplete] = useState(false);
  const [outcome, setOutcome] = useState<CommitOutcome | null>(null);
  const [commitError, setCommitError] = useState<string | null>(null);
  // Drives the loader's completion beat: flipped true only after a genuine success (commit resolved
  // with rows imported AND the 5s floor elapsed). The loader then plays its finish and routes on.
  const [importComplete, setImportComplete] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [blocked, setBlocked] = useState<Blocked | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const templateInputRef = useRef<HTMLInputElement>(null);
  /** Cells the template parser could not read. The review screen shows them; nothing is guessed. */
  const [templateFlags, setTemplateFlags] = useState<TemplateFlag[]>([]);
  /** The file's row count, when it is known without reading the file again: the template parse
   *  returns it; a Smart import does not (its sample is capped at eight rows). */
  const [rowsRead, setRowsRead] = useState<number | null>(null);

  const shownError = error || fieldError;

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
    setFileName(file.name);
    try {
      const parsed = await readTemplateFile(file);
      setTemplateFlags(parsed.flags);
      setRowsRead(parsed.rowsRead);
      setValidated(validateSmartImport(parsed.result));
      setScreen("overview");
    } catch (e) {
      console.error("Template parse failed:", e);
      setScreen("fallback"); // graceful fallback — never dead-end onboarding
    }
  };

  const runMapping = async (file: File) => {
    setRawSample([]); setExtractComplete(false); setValidated(null); setRowsRead(null);
    setScreen("reading"); // the scatter-settle loader takes over from here
    // Display-only: show the writer's actual raw cells the instant they upload, scattered, while the
    // real extraction runs. Never feeds runSmartImport; a parse failure just leaves the loader plain.
    sampleRawRecords(file).then(setRawSample).catch(() => setRawSample([]));
    try {
      const result: SmartImportResult = await runSmartImport(file);
      setValidated(validateSmartImport(result));
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
    setImportComplete(false);
    setScreen("importing"); // the loader shows the instant Import is pressed
    try {
      // Create (or reuse) the manuscript from the held details — the single deferred write — then
      // attach this import's queries to it. Idempotent: a retry after a failed commit reuses the id.
      const mId = await onEnsureManuscript();
      if (!mId) {
        setCommitError("Couldn't set up your manuscript — nothing's lost. Try again, or use the Import desk.");
        setScreen("review");
        return;
      }
      // Run the commit and a 5s UX floor together. The floor never hides an error: if the commit
      // rejects, Promise.all rejects immediately (we don't wait out the 5s to surface the failure).
      const [committed] = await Promise.all([
        lab
          ? lab.commit(result)
          : commitSmartImport(
              { userId: currentUser!.id, existingAgents: agents, manuscriptTitle: fields.title, addAgent, addQuery },
              result,
              mId
            ),
        delay(lab?.floorMs ?? 5000),
      ]);
      setOutcome(committed);
      /* ⚠️ THE SKIPPED ROWS ARE KEPT FOR THE DASHBOARD HERE, when the commit returns and before the
         loader completes. The validation is of the result the REVIEW handed back — the one that was
         committed — not of the first read. A commit that skipped nothing clears any older notice. */
      saveImportNotice(lab ? lab.uid : currentUser!.id, buildImportNotice(validateSmartImport(result).skipped, committed, result.agents, left?.setAside ?? []));
      // Never route on a false success: if nothing actually landed, surface the outcome screen
      // instead of the loader's completion + dashboard route.
      if (committed.queriesImported === 0) { setScreen("done"); return; }
      // Genuine success → let the loader play its completion beat, then it calls onProceed to route.
      setImportComplete(true);
    } catch (e) {
      console.error("Smart Import commit failed:", e);
      setCommitError("Something went wrong bringing your pipeline in — nothing is lost. Try again, or use the Import desk.");
      setScreen("review");
    }
  };

  // ── B2 · the book ────────────────────────────────────────────────────────
  if (screen === "book") {
    return (
      <StepColumn screen="book">
        <OpenTitle title={BOOK_TITLE} sub={BOOK_SUB} />
        <StepCard>
          <ManuscriptFields value={fields} onChange={(v) => { setFields(v); if (fieldError) setFieldError(null); }} />
          {shownError && <FieldError>{shownError}</FieldError>}
          <StepFoot left={<BackLink onClick={onExit} />}>
            <button
              type="button" className="sf-btn" disabled={saving}
              onClick={() => {
                if (!fields.title.trim()) { setFieldError("Give it a title — even a working one."); return; }
                /* Required for the reason BranchA requires it: an agent's fit is matched on genre. */
                if (!fields.genre) { setFieldError("Pick the primary genre — agents search by it."); return; }
                setFieldError(null);
                setSaving(true);
                void onSaveBook(fields)
                  .then((ok) => { if (ok) setScreen("pipeline"); })
                  .finally(() => setSaving(false));
              }}
            >
              Continue
            </button>
          </StepFoot>
        </StepCard>
      </StepColumn>
    );
  }

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

  if (screen === "pipeline") {
    return (
      <>
        {pickers}
        <CaptureFork
          ringed={importOption}
          tier={entitlement.tier}
          onChooseFile={() => fileInputRef.current?.click()}
          onDropFile={pickFile}
          onUploadTemplate={() => templateInputRef.current?.click()}
          onAddByHand={onAddByHand}
          onBack={() => setScreen("book")}
          onNothingYet={onSkip}
          onOpenImportDesk={onOpenImportDesk}
        />
      </>
    );
  }

  if (screen === "confirm") {
    return (
      <>
        {pickers}
        <ConfirmScreen
          fileName={fileName}
          fileSize={pendingFile?.size ?? null}
          tier={entitlement.tier}
          /* "Change" opens the picker in place: `pickFile` replaces the pending file and the name
             shown, and the screen stays where it is. Nothing is read by choosing. */
          onChange={() => fileInputRef.current?.click()}
          onBack={() => { setPendingFile(null); setScreen("pipeline"); }}
          onRead={() => { if (pendingFile) void runMapping(pendingFile); }}
        />
      </>
    );
  }

  if (screen === "blocked" && blocked) {
    const backToFork = () => { setBlocked(null); setScreen("pipeline"); };
    if (blocked.reason === "free_used") {
      return (
        <UsedFree
          onBack={backToFork}
          onAddByHand={onAddByHand}
          /* Back to the fork with the template tile ringed: the suggestion follows what the writer
             has just been told they can still do. */
          onUseTemplate={() => { setBlocked(null); setImportOption("template"); setScreen("pipeline"); }}
        />
      );
    }
    const nextLabel = blocked.nextAvailable
      ? new Date(`${blocked.nextAvailable}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })
      : "next month";
    return <UsedProMonth nextLabel={nextLabel} onBack={backToFork} onAddByHand={onAddByHand} />;
  }

  if (screen === "reading") {
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
        manuscriptTitle={fields.title}
        fileName={fileName}
        rowCount={rowsRead}
        onContinue={() => setScreen("review")}
      />
    );
  }

  // ── Review & confirm — the two-screen SmartImportReview (Agents ⇄ Queries). It owns every inline
  //    fix (statuses, dates, dedupe, exclusions) and hands back the final result; we commit it. ─
  if (screen === "review" && validated) {
    return (
      <SmartImportReview
        result={validated.result}
        manuscriptTitle={fields.title}
        onBack={() => setScreen("pipeline")}
        error={commitError}
        onImport={handleImport}
      />
    );
  }

  // ── Nothing imported — what the commit actually did. Never silent, never auto-skipped past.
  if (screen === "done" && outcome) {
    const skippedReasons = [...new Set((validated?.skipped || []).map((s) => s.reason))];
    return <NothingImported outcome={outcome} skippedReasons={skippedReasons} onBackToReview={() => setScreen("review")} />;
  }

  // Graceful fallback (also reached when an AI/template mapping fails) — or, if the state machine
  // lands somewhere no branch above handles, an honest recovery card that names the problem.
  if (screen !== "fallback") {
    console.error("BranchB: unhandled screen state", { screen, hasValidated: !!validated, hasOutcome: !!outcome });
    return <Unloaded onAddByHand={onAddByHand} onRestart={() => setScreen("pipeline")} />;
  }

  return (
    <Unreadable
      onBack={() => setScreen("pipeline")}
      onAddByHand={onAddByHand}
      /* ⚠️ THE SAME FILE THE FORK HANDS OUT, by the same call. This card used to fetch
         `QueryHawk-pipeline-import-template.xlsx` — the three-tab workbook the Query Centre's and
         the Contact list's empty states link to — so a writer told "use the template" on the fork
         and here was given two different sheets. */
      onDownload={() => { void downloadTemplate(TEMPLATE_FILENAME); }}
    />
  );
};
