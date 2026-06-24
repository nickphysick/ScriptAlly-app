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
import React, { useRef, useState } from "react";
import { useScriptAllyDb } from "../../lib/db";
import { QueryStatus } from "../../types";
import { SmartImportResult } from "../../types/smartImport";
import { runSmartImport, validateSmartImport, ValidatedImport, sampleRawRecords, RawRecordSample } from "../../lib/smartImport";
import { commitSmartImport, CommitOutcome } from "../../lib/smartImportCommit";
import { Form11Card, SelectRow, BookMotif, InboxMotif, FONT_SANS, FONT_MONO } from "./chrome";
import { SmartImportReview } from "./SmartImportReview";
import { ImportOverview } from "./ImportOverview";
import { ImportTidyAnimation } from "./ImportTidyAnimation";
import { ImportingLoader } from "./ImportingLoader";
import { ScatterSettleLoader, LoaderCard } from "./ScatterSettleLoader";
import { fmtDate } from "../../lib/smartImportReviewModel";
import { ManuscriptFields, ManuscriptFieldsState, emptyManuscriptFields } from "./ManuscriptFields";

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
  /** Pre-selected import option: deep/interest → "smart", early → "byhand". */
  defaultImport: "smart" | "byhand";
  /** "Add them by hand" — drops into the existing add-agents flow. */
  onAddByHand: () => void;
  /** Escape hatch — finish onboarding into the Import desk (ImportCsv). */
  onOpenImportDesk: () => void;
  /** Import committed — parent finishes onboarding to the dashboard. */
  onImportComplete: (outcome: CommitOutcome) => void;
  /** Surfaced save/limit error from the parent (e.g. the Free-tier manuscript cap). */
  error?: string | null;
}

type B3Screen = "book" | "pipeline" | "reading" | "tidying" | "overview" | "review" | "fallback" | "importing" | "done";

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
  onSkip, onExit, onSaveBook, initialBook, onEnsureManuscript, defaultImport, onAddByHand, onOpenImportDesk, onImportComplete, error,
}) => {
  const { currentUser, agents, addAgent, addQuery } = useScriptAllyDb();

  const [screen, setScreen] = useState<B3Screen>("book");
  // Seed from any held draft so Back-to-welcome-then-forward re-fills the book step.
  const [fields, setFields] = useState<ManuscriptFieldsState>(initialBook ?? emptyManuscriptFields());
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [importOption, setImportOption] = useState<"smart" | "byhand">(defaultImport);
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const shownError = error || fieldError;

  const handleFile = async (file: File) => {
    setFileName(file.name);
    setRawSample([]); setExtractComplete(false); setValidated(null);
    setScreen("reading"); // the scatter-settle loader takes over from here
    // Display-only: show the writer's actual raw cells the instant they upload, scattered, while the
    // real extraction runs. Never feeds runSmartImport; a parse failure just leaves the loader plain.
    sampleRawRecords(file).then(setRawSample).catch(() => setRawSample([]));
    try {
      const result: SmartImportResult = await runSmartImport(file);
      setValidated(validateSmartImport(result));
      setExtractComplete(true); // loader snaps the cards in, crystallises them, then routes to Overview
    } catch (e) {
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
      <Form11Card
        dotIndex={1}
        onSkip={onSkip}
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
      </Form11Card>
    );
  }

  // ── B3 · bring it across — Smart Import is the hero ──────────────────────
  if (screen === "pipeline") {
    return (
      <Form11Card
        dotIndex={2}
        onSkip={onSkip}
        pre="Your pipeline"
        name="Bring it across"
        sub="Drop in whatever you use — we'll read it for you"
        motif={<InboxMotif />}
        onBack={() => setScreen("book")}
        primaryLabel={importOption === "smart" ? "Choose a file →" : "Add them by hand →"}
        onPrimary={() => {
          if (importOption === "smart") fileInputRef.current?.click();
          else onAddByHand();
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          style={{ display: "none" }}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f); e.target.value = ""; }}
        />

        {/* The hero: a large, inviting upload affordance — clicking it opens the picker directly. */}
        <div
          onClick={() => { setImportOption("smart"); fileInputRef.current?.click(); }}
          style={{
            border: importOption === "smart" ? "1.5px dashed #7c3a2a" : "1.5px dashed #d8c5b6",
            background: importOption === "smart" ? "#f8ece6" : "#fdfaf5",
            borderRadius: 12, padding: "22px 18px", textAlign: "center", cursor: "pointer",
            marginBottom: 12, transition: "all 0.15s",
          }}
        >
          <div style={{ width: 44, height: 44, borderRadius: 11, background: "#f5e2da", display: "flex", alignItems: "center", justifyContent: "center", color: "#7c3a2a", margin: "0 auto 10px" }}>
            {UploadIcon}
          </div>
          <div style={{ fontFamily: FONT_SANS, fontSize: 14.5, fontWeight: 500, color: "#3a1c14", marginBottom: 5 }}>
            Already tracking your queries somewhere?
          </div>
          <p style={{ fontFamily: FONT_SANS, fontSize: 12, color: "#9c8878", lineHeight: 1.55, margin: "0 0 12px", maxWidth: 320, marginLeft: "auto", marginRight: "auto" }}>
            Drop in whatever you use — a spreadsheet, an export, any layout — and we'll read it into ScriptAlly for you.
          </p>
          <span style={{ fontFamily: FONT_MONO, fontSize: 11, fontWeight: 500, letterSpacing: "0.05em", background: "#f5e2da", color: "#7c3a2a", border: "0.5px solid #e8c8bc", borderRadius: 9, padding: "9px 18px", display: "inline-block" }}>
            Choose a file →
          </span>
        </div>

        {/* Template, demoted to a quiet secondary line. */}
        <p style={{ fontFamily: FONT_SANS, fontSize: 11.5, color: "#a8968a", textAlign: "center", margin: "0 0 14px" }}>
          Prefer to start from a clean template?{" "}
          <a href="/ScriptAlly-pipeline-import-template.xlsx" download style={{ color: "#7c3a2a", textDecoration: "none", borderBottom: "0.5px solid #cdbdae" }}>
            Download one.
          </a>
        </p>

        <SelectRow
          icon={HandIcon}
          title="Add them by hand"
          desc="Only a few out there? Add your agents one at a time."
          selected={importOption === "byhand"}
          onClick={() => setImportOption("byhand")}
        />
        <EscapeHatch onOpen={onOpenImportDesk} />
      </Form11Card>
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
      const agency = agent?.agency?.trim() || "Agency only";
      const date = q.sentDate ? fmtDate(q.sentDate) : "Undated";
      return { messy: r.messy, name, agency, date, status: q.status ?? QueryStatus.QUERIED };
    });
    return (
      <ScatterSettleLoader
        cards={cards}
        complete={extractComplete && !!validated}
        total={validated ? resultQueries.length : rawSample.length}
        onProceed={() => setScreen("overview")}
        userName={currentUser?.name}
      />
    );
  }

  // ── Bringing it in — the held post-import loader (5s floor + commit), then routes to the dashboard.
  if (screen === "importing") {
    return (
      <ImportingLoader
        complete={importComplete}
        onProceed={() => { if (outcome) onImportComplete(outcome); }}
        userName={currentUser?.name}
      />
    );
  }

  // ── Tidying beat — the writer's own messy values straighten into clean lines before the Overview.
  if (screen === "tidying" && validated) {
    return <ImportTidyAnimation result={validated.result} onDone={() => setScreen("overview")} />;
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
        onSkip={onSkip}
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
        onSkip={onSkip}
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
    return (
      <Form11Card
        dotIndex={2}
        onSkip={onSkip}
        pre="Your pipeline"
        name={ok ? "Brought across" : "That didn't work"}
        sub={ok ? "Here's what landed in ScriptAlly" : "Nothing was imported — here's why"}
        motif={<InboxMotif />}
        onBack={() => setScreen("review")}
        primaryLabel={ok ? "Continue →" : "Back to the review →"}
        onPrimary={() => (ok ? onImportComplete(outcome) : setScreen("review"))}
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
      </Form11Card>
    );
  }

  // ── Fallback — template-first (the v2 layout) when the mapping call fails ─
  return (
    <Form11Card
      dotIndex={2}
      onSkip={onSkip}
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
    </Form11Card>
  );
};
