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
import { OnboardingCard, SelectRow, BookMotif, InboxMotif, FONT_SANS, FONT_MONO } from "./chrome";
import { sageText, onbOptionEdge, onbOptionRest, onbOptionSelectedFill, onbPlate, onbHairline, onbMuted } from "../../lib/designTokens";
import { SmartImportReview } from "./SmartImportReview";
import { ImportOverview } from "./ImportOverview";
import { ImportingLoader } from "./ImportingLoader";
import { ScatterSettleLoader, LoaderCard } from "./ScatterSettleLoader";
import { fmtDate } from "../../lib/smartImportReviewModel";
import { confirmFileLead } from "../../lib/smartImportConfirm";
import { ManuscriptFields, ManuscriptFieldsState, emptyManuscriptFields } from "./ManuscriptFields";
import { readTemplateFile, TemplateFlag } from "../../lib/templateImport";
import { CaptureOption, CAPTURE_HEADING, CAPTURE_SUB, capturePrimaryLabel } from "../../lib/captureFork";
import { CaptureFork } from "./CaptureFork";
import { subStepFor, subStepLabel } from "../../lib/onboardingSpine";
import { HandoverScreen } from "./HandoverScreen";
import { shouldHandOver, HandoverTally } from "../../lib/onboardingHandover";

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
   * ⚠️ THE DESTINATION IS THE HANDOVER'S TO CHOOSE. Landing everyone on the dashboard put a writer
   * who had just imported nine queries somewhere those queries are not.
   */
  onImportComplete: (outcome: CommitOutcome, destination: "queries" | "dashboard") => void;
  /** "Upgrade to Pro" from the blocked (free-used) state — finish onboarding into the Plans page. */
  onUpgrade?: () => void;
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
  /** The band's right-hand meta — `Step 3 of 3`. */
  stepLabel?: string;
  /**
   * The same position as a number, for composing a sub-step.
   *
   * ⚠️ PASSED, NEVER PARSED BACK OUT OF `stepLabel`. Reading "3" out of "Step 3 of 3" would be
   * deriving state from a display string — the fault this repo already forbids by name, and one
   * that breaks silently the moment the wording changes.
   */
  stepIndex?: number;
}

/* ⚠️ NO "tidying" MEMBER. It sat in this union with a render branch guarding it, and
   `setScreen("tidying")` was never called from anywhere — the reading screen routes straight to
   the overview. The component behind it (ImportTidyAnimation) and its test are deleted with it:
   a screen no path reaches is not a feature in waiting, it is a claim the union was making about
   the flow that the flow did not honour. */
type B3Screen = "book" | "pipeline" | "confirm" | "blocked" | "reading" | "overview" | "review" | "fallback" | "importing" | "done";

/** A blocked Smart Import attempt — the structured reason the gate (or the pre-check) surfaced. */
type Blocked = { reason: "free_used" | "pro_month_used"; nextAvailable?: string };

const UploadIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" /><path d="M12 3v12M8 7l4-4 4 4" />
  </svg>
);
const HandIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M19 8v6M22 11h-6" />
  </svg>
);
const TemplateIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M9 13h6M9 17h6" />
  </svg>
);

/** Sage helper note (the v2 sketch's template note), with the template download inside. */
const TemplateNote: React.FC = () => (
  <div style={{ display: "flex", gap: 9, background: "#e7ece1", border: "0.5px solid #c4d0bc", borderRadius: 9, padding: "11px 13px", margin: "0 0 14px" }}>
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5a6e58" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
      <path d="M12 3v12M8 11l4 4 4-4" /><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
    </svg>
    <p style={{ fontFamily: FONT_SANS, fontSize: 12, lineHeight: 1.5, color: "#44563a", margin: 0 }}>
      Don't have a spreadsheet set up?{" "}
      <a href="/ScriptAlly-pipeline-import-template.xlsx" download style={{ color: "#3f5237", fontWeight: 500 }}>
        Download our template →
      </a>{" "}
      It captures each query's status and key dates — so your "responses received" count is right from day one.
    </p>
  </div>
);

/** The v2 sketch's escape-hatch line beneath the options. */
const EscapeHatch: React.FC<{ onOpen: () => void }> = ({ onOpen }) => (
  <div style={{ textAlign: "center", fontSize: 11, color: "#a8968a", marginTop: 2, fontFamily: FONT_SANS }}>
    Already have your own spreadsheet?{" "}
    <button
      onClick={onOpen}
      style={{ font: "inherit", color: "#9c8878", background: "none", border: "none", borderBottom: "0.5px solid #cdbdae", cursor: "pointer", padding: 0 }}
    >
      Map your own columns in the Import desk →
    </button>
  </div>
);

// The two-screen SmartImportReview now owns review-row classification, inline fixes and the result
// it hands to handleImport — see SmartImportReview + smartImportReviewModel.

export const BranchB: React.FC<BranchBProps> = ({
  onSkip, onExit, onSaveBook, initialBook, onEnsureManuscript, defaultImport, onAddByHand, onOpenImportDesk, onImportComplete, onUpgrade, error, onStage, stepLabel, stepIndex,
}) => {
  const { currentUser, agents, addAgent, addQuery } = useScriptAllyDb();
  const entitlement = useSmartImportEntitlement();

  const [screen, setScreen] = useState<B3Screen>("book");

  /* Report the named position up rather than an index — an index is not a place, and the header
     owns how many steps this branch has. */
  useEffect(() => { onStage?.(screen === "book" ? "book" : "list"); }, [screen, onStage]);

  /* The band's meta: the step, plus what this screen is doing when that is a real sub-position.
     ⚠️ THE SPINE IS NOT TOLD ANY OF THIS. Sub-steps stay in the band by design — expanding a dot
     into three would make the Smart Import path look longer than the template path, which is the
     progress bar growing because of a choice the writer made. */
  const sub = subStepFor(screen);
  const bandStep = sub !== null && stepIndex !== undefined ? subStepLabel(stepIndex, sub) : stepLabel;
  // Seed from any held draft so Back-to-welcome-then-forward re-fills the book step.
  const [fields, setFields] = useState<ManuscriptFieldsState>(initialBook ?? emptyManuscriptFields());
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [importOption, setImportOption] = useState<CaptureOption>(defaultImport);
  const [fileName, setFileName] = useState("");
  const [validated, setValidated] = useState<ValidatedImport | null>(null);
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
      setValidated(validateSmartImport(parsed.result));
      setScreen("overview");
    } catch (e) {
      console.error("Template parse failed:", e);
      setScreen("fallback"); // graceful fallback — never dead-end onboarding
    }
  };

  const runMapping = async (file: File) => {
    setRawSample([]); setExtractComplete(false); setValidated(null);
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
  const handleImport = async (result: SmartImportResult) => {
    if (!currentUser) return;
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
        commitSmartImport(
          { userId: currentUser.id, existingAgents: agents, manuscriptTitle: fields.title, addAgent, addQuery },
          result,
          mId
        ),
        delay(5000),
      ]);
      setOutcome(committed);
      // Never route on a false success: if nothing actually landed, surface the outcome screen
      // ("That didn't work — here's why") instead of the loader's completion + dashboard route.
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
      <OnboardingCard
        step={bandStep}
        pre="Your manuscript"
        name="The book you're querying"
        sub="We'll attach your pipeline to this"
        motif={<BookMotif />}
        onBack={onExit}
        primaryLabel="Continue →"
        primaryDisabled={saving}
        onPrimary={() => {
          if (!fields.title.trim()) { setFieldError("Give it a title — even a working one."); return; }
          if (!fields.genre) { setFieldError("Pick the primary genre — agents search by it."); return; }
          setFieldError(null);
          setSaving(true);
          void onSaveBook(fields)
            .then((ok) => { if (ok) setScreen("pipeline"); })
            .finally(() => setSaving(false));
        }}
      >
        <ManuscriptFields value={fields} onChange={(v) => { setFields(v); if (fieldError) setFieldError(null); }} />
        {shownError && <p style={{ fontFamily: FONT_SANS, fontSize: 12, color: "#a0392a", margin: "10px 2px 0" }}>{shownError}</p>}
      </OnboardingCard>
    );
  }

  // ── B3 · the capture fork — three ways to bring an existing list across ──
  //    The fork itself is CaptureFork.tsx: extracted so it can be rendered and asserted on its own,
  //    rather than only after driving this component through the manuscript screen first.
  if (screen === "pipeline") {
    return (
      <OnboardingCard
        step={bandStep}
        pre="Your list"
        name={CAPTURE_HEADING}
        sub={CAPTURE_SUB}
        motif={<InboxMotif />}
        onBack={() => setScreen("book")}
        primaryLabel={capturePrimaryLabel(importOption)}
        onPrimary={() => {
          if (importOption === "smart") fileInputRef.current?.click();
          else if (importOption === "template") templateInputRef.current?.click();
          else onAddByHand();
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          style={{ display: "none" }}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) pickFile(f); e.target.value = ""; }}
        />
        <input
          ref={templateInputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          style={{ display: "none" }}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) void pickTemplateFile(f); e.target.value = ""; }}
        />
        <CaptureFork
          selected={importOption}
          onSelect={setImportOption}
          onChooseFile={() => fileInputRef.current?.click()}
          onUploadTemplate={() => templateInputRef.current?.click()}
          onNothingYet={onSkip}
          onOpenImportDesk={onOpenImportDesk}
        />
      </OnboardingCard>
    );
  }

  // ── Confirm — an explicit "this spends your Smart Import" beat so it's never burned by accident.
  //    Wording is free vs Pro-monthly, driven by the entitlement helper. (Minimal by design — the
  //    polished credit UI is a later prompt; this just guarantees correct behaviour.) ─
  if (screen === "confirm") {
    const isPro = entitlement.tier === "pro";
    return (
      <OnboardingCard
        step={bandStep}
        pre="Your pipeline"
        name="This uses your Smart Import"
        sub={isPro ? "One per month on Pro" : "Your one free Smart Import"}
        motif={<InboxMotif />}
        onBack={() => { setPendingFile(null); setScreen("pipeline"); }}
        primaryLabel="Read my file →"
        onPrimary={() => { if (pendingFile) void runMapping(pendingFile); }}
      >
        <p style={{ fontFamily: FONT_SANS, fontSize: 13, color: "#3a1c14", lineHeight: 1.6, margin: "0 0 10px" }}>
          {(() => {
            const lead = confirmFileLead(fileName);
            return lead.name
              ? <>{lead.before}<strong>{lead.name}</strong>{lead.after}</>
              : <>{lead.before}</>;
          })()}
        </p>
        <p style={{ fontFamily: FONT_SANS, fontSize: 12, color: "#9c8878", lineHeight: 1.55, margin: 0 }}>
          {isPro
            ? "This is this month's Smart Import. Your next one is available next month."
            : "This is your one free Smart Import. Upgrade to Pro later for one every month."}
        </p>
      </OnboardingCard>
    );
  }

  // ── Blocked — the entitlement is spent. free_used → upgrade path; pro_month_used → next-available
  //    date. Never a raw error; always a way forward (add by hand). ─
  if (screen === "blocked" && blocked) {
    const isFreeUsed = blocked.reason === "free_used";
    const nextLabel = blocked.nextAvailable
      ? new Date(`${blocked.nextAvailable}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })
      : "next month";
    return (
      <OnboardingCard
        step={bandStep}
        pre="Your pipeline"
        name={isFreeUsed ? "Smart Import already used" : "Next Smart Import next month"}
        sub={isFreeUsed ? "Upgrade for one every month" : `Available ${nextLabel}`}
        motif={<InboxMotif />}
        onBack={() => { setBlocked(null); setScreen("pipeline"); }}
        primaryLabel={isFreeUsed ? "Upgrade to Pro →" : "Add them by hand →"}
        onPrimary={() => (isFreeUsed ? (onUpgrade ? onUpgrade() : onAddByHand()) : onAddByHand())}
      >
        <p style={{ fontFamily: FONT_SANS, fontSize: 13, color: "#3a1c14", lineHeight: 1.6, margin: "0 0 12px" }}>
          {isFreeUsed
            ? "You've used your free Smart Import. Upgrade to Pro for a Smart Import every month — or add your agents by hand for now."
            : <>You've used this month's Smart Import. Your next one is available on <strong>{nextLabel}</strong>. You can add agents by hand in the meantime.</>}
        </p>
        {isFreeUsed && (
          <button
            onClick={onAddByHand}
            style={{ fontFamily: FONT_MONO, fontSize: 11, letterSpacing: "0.04em", color: "#9c8878", background: "none", border: "none", borderBottom: "0.5px solid #cdbdae", cursor: "pointer", padding: 0 }}
          >
            Add them by hand instead
          </button>
        )}
      </OnboardingCard>
    );
  }

  // ── Reading the file — scatter-and-settle loader (raw cells in, clean StatusDots out) ─────────────
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
        userName={currentUser?.name}
      />
    );
  }

  // ── Bringing it in — the held post-import loader (5s floor + commit), then routes to the dashboard.
  if (screen === "importing") {
    return (
      <ImportingLoader
        complete={importComplete}
        /* ⚠️ THE LOADER HANDS OVER TO THE HANDOVER, NOT TO THE DASHBOARD. It used to call
           onImportComplete directly, so a successful import went straight out of onboarding and
           the writer never saw what had landed — the `done` screen existed only for the
           nothing-imported case. That silent exit is the seam this phase adds. */
        onProceed={() => setScreen("done")}
        userName={currentUser?.name}
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
        userName={currentUser?.name}
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
        onBack={() => setScreen("pipeline")}
        error={commitError}
        onImport={handleImport}
        userName={currentUser?.name}
      />
    );
  }

  // ── Outcome — what the commit actually did. Never silent, never auto-skipped past. ─
  if (screen === "done" && outcome) {
    const skippedReasons = [...new Set((validated?.skipped || []).map((s) => s.reason))];
    const ok = outcome.queriesImported > 0;

    /* ⚠️ THE HANDOVER REPLACES THE SUCCESS CARD, AND ONLY THE SUCCESS CARD. The failure half below
       ("That didn't work") is not a handover — it is a report of a thing that did not happen, and
       it keeps its own screen and its route back to the review.

       ⚠️ AND IT IS GATED ON SOMETHING ACTUALLY HAVING LANDED. A commit that reports success with
       nothing in it would otherwise reach a tally of zeroes, which is the app remarking on how far
       along the writer is. */
    const tally: HandoverTally = {
      agents: outcome.agentsCreated,
      queries: outcome.queriesImported,
      // The manuscript this import was attached to — one, and only once it exists.
      manuscripts: fields.title.trim() ? 1 : 0,
    };
    if (ok && shouldHandOver(tally)) {
      return (
        <HandoverScreen
          tally={tally}
          onOpenQueryCentre={() => onImportComplete(outcome, "queries")}
          onDashboard={() => onImportComplete(outcome, "dashboard")}
        />
      );
    }
    return (
      <OnboardingCard
        step={bandStep}
        pre="Your pipeline"
        name={ok ? "Brought across" : "That didn't work"}
        sub={ok ? "Here's what landed in ScriptAlly" : "Nothing was imported — here's why"}
        motif={<InboxMotif />}
        onBack={() => setScreen("review")}
        primaryLabel={ok ? "Continue →" : "Back to the review →"}
        onPrimary={() => (ok ? onImportComplete(outcome, "dashboard") : setScreen("review"))}
      >
        <div style={{ fontFamily: FONT_SANS, fontSize: 13, color: "#3a1c14", lineHeight: 1.7 }}>
          <p style={{ margin: "0 0 10px" }}>
            <strong>{outcome.queriesImported}</strong> {outcome.queriesImported === 1 ? "query" : "queries"} imported ·{" "}
            <strong>{outcome.agentsCreated}</strong> {outcome.agentsCreated === 1 ? "agent" : "agents"} added
            {outcome.agentsMerged > 0 && <> · <strong>{outcome.agentsMerged}</strong> merged with existing</>}
          </p>
          {(outcome.queriesSkipped > 0 || skippedReasons.length > 0) && (
            <p style={{ margin: "0 0 10px", fontSize: 12, color: "#9c8878" }}>
              {outcome.queriesSkipped} {outcome.queriesSkipped === 1 ? "row was" : "rows were"} skipped
              {skippedReasons.length > 0 && <>: {skippedReasons.join("; ").toLowerCase()}</>}.
            </p>
          )}
          {outcome.errors.length > 0 && (
            <div style={{ background: "#FAEEDA", border: "0.5px solid #ead2a0", borderRadius: 9, padding: "10px 13px", marginTop: 4 }}>
              {outcome.errors.slice(0, 4).map((err, i) => (
                <p key={i} style={{ margin: i ? "6px 0 0" : 0, fontSize: 12, color: "#6b4a08", lineHeight: 1.5 }}>{err}</p>
              ))}
              {outcome.errors.length > 4 && (
                <p style={{ margin: "6px 0 0", fontSize: 12, color: "#9a7a30" }}>…and {outcome.errors.length - 4} more.</p>
              )}
            </div>
          )}
        </div>
      </OnboardingCard>
    );
  }

  /**
   * ── Fallback — template-first (the v2 layout) when the mapping call fails ─
   *
   * ⚠️ THIS BRANCH IS EXPLICITLY CONDITIONED, and the unhandled case below it is separate.
   * It used to be the function's bare final `return`, which made it the render for ANY screen
   * value that fell through — so a state that arrived without its data (e.g. `"overview"` with a
   * null `validated`) silently showed "We couldn't read that one automatically", blaming the
   * writer's file for what was actually our own missing state. The two are different failures and
   * now say different things.
   */
  const mappingFailed = screen === "fallback";
  if (!mappingFailed) {
    /* The genuinely-unhandled case: a screen value with no branch, or a branch whose data never
       arrived. Never silent — log it for whoever is reading the console, and say honestly that
       the step could not be shown rather than inventing a cause. Every route out stays live. */
    console.error("BranchB: unhandled screen state", { screen, hasValidated: !!validated, hasOutcome: !!outcome });
    return (
      <OnboardingCard
        step={bandStep}
        pre="Your pipeline"
        name="That step didn't load"
        sub="Nothing is lost — pick up from here"
        motif={<InboxMotif />}
        onBack={() => setScreen("pipeline")}
        primaryLabel="Back to the start of this step →"
        onPrimary={() => setScreen("pipeline")}
      >
        <p style={{ fontFamily: FONT_SANS, fontSize: 13, color: "#3a1c14", lineHeight: 1.6, margin: "0 0 12px" }}>
          Something didn't load on our side. Your file hasn't been imported and nothing has been
          saved — start this step again, or add your agents by hand.
        </p>
        <SelectRow
          icon={HandIcon}
          title="Add them by hand"
          desc="Only a few out there? Add your agents one at a time."
          selected={false}
          onClick={onAddByHand}
        />
        <EscapeHatch onOpen={onOpenImportDesk} />
      </OnboardingCard>
    );
  }

  return (
    <OnboardingCard
        step={bandStep}
      pre="Your pipeline"
      name="Bring it across"
      sub="Use our template, or add by hand"
      motif={<InboxMotif />}
      onBack={() => setScreen("pipeline")}
      primaryLabel="Download template →"
      onPrimary={() => {
        const a = document.createElement("a");
        a.href = "/ScriptAlly-pipeline-import-template.xlsx";
        a.download = "ScriptAlly-pipeline-import-template.xlsx";
        a.click();
      }}
    >
      <p style={{ fontFamily: FONT_SANS, fontSize: 12, color: "#9c8878", lineHeight: 1.5, margin: "0 0 12px" }}>
        We couldn't read that one automatically — use the template or add them by hand.
      </p>
      <SelectRow
        icon={TemplateIcon}
        title="Import with our template"
        desc="Download it, drop in your agents and queries, upload. We'll do the rest."
        selected
        onClick={() => {}}
      />
      <TemplateNote />
      <SelectRow
        icon={HandIcon}
        title="Add them by hand"
        desc="Only a few out there? Add your agents one at a time."
        selected={false}
        onClick={onAddByHand}
      />
      <EscapeHatch onOpen={onOpenImportDesk} />
    </OnboardingCard>
  );
};
