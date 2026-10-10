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
 *
 * Since onboarding v5 part 3 the import itself is `components/import/ImportFlow` — the same flow the
 * Import page runs. This file keeps set-up's own two screens: the book, and the fork.
 */
import React, { useEffect, useRef, useState } from "react";
import { SmartImportResult } from "../../types/smartImport";
import { useSmartImportEntitlement } from "../../lib/useSmartImportEntitlement";
import { CommitOutcome } from "../../lib/smartImportCommit";
import { ManuscriptFields, ManuscriptFieldsState, emptyManuscriptFields } from "./ManuscriptFields";
import { CaptureOption } from "../../lib/captureFork";
import { CaptureFork } from "./CaptureFork";
import { ImportFlow, type ImportFlowHandle, type ImportFlowScreen } from "../import/ImportFlow";
import { StepColumn, OpenTitle, StepCard, BackLink, StepFoot, FieldError } from "./setupParts";

export const BOOK_TITLE = "The book you're querying.";
export const BOOK_SUB = "Just the essentials. Your agents and queries attach to this, and you can flesh it out any time.";

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

/** Set-up's own two screens. Everything after the book is "list": the fork while the import flow is
 *  idle, and the flow's screens once a file has been chosen. */
type B3Screen = "book" | "list";

export const BranchB: React.FC<BranchBProps> = ({
  onSkip, onExit, onSaveBook, initialBook, onEnsureManuscript, defaultImport, onAddByHand, onOpenImportDesk, onImportComplete, error, onStage, onExitMode, onImporting, onHandoff, lab,
}) => {
  const entitlement = useSmartImportEntitlement();

  const [screen, setScreen] = useState<B3Screen>(lab ? "list" : "book");
  /* The import flow's own screen, reported up by it. `idle` = the fork is showing. */
  const [flowScreen, setFlowScreen] = useState<ImportFlowScreen>(lab ? "overview" : "idle");
  const flowRef = useRef<ImportFlowHandle>(null);
  /* The name the frame's rules know this position by: the fork is "pipeline", as it always was. */
  const position = screen === "book" ? "book" : flowScreen === "idle" ? "pipeline" : flowScreen;

  /* Report the named position up rather than an index — an index is not a place, and the header
     owns how many steps this branch has. */
  useEffect(() => { onStage?.(screen === "book" ? "book" : "list"); }, [screen, onStage]);
  useEffect(() => { onExitMode?.(exitModeFor(position)); }, [position, onExitMode]);
  useEffect(() => { onImporting?.(position === "importing"); }, [position, onImporting]);

  // Seed from any held draft so Back-to-welcome-then-forward re-fills the book step.
  const [fields, setFields] = useState<ManuscriptFieldsState>(lab ? { ...emptyManuscriptFields(), title: lab.title } : initialBook ?? emptyManuscriptFields());
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [importOption, setImportOption] = useState<CaptureOption>(defaultImport);

  const shownError = error || fieldError;

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
                  .then((ok) => { if (ok) setScreen("list"); })
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

  /* Everything after the book is "Your list": the import flow, and — while the flow is idle — the
     fork, which is set-up's own way into it. The flow's two file pickers are opened through its ref. */
  return (
    <>
      <ImportFlow
        ref={flowRef}
        manuscriptTitle={fields.title}
        onEnsureManuscript={onEnsureManuscript}
        hostError={error}
        onAddByHand={onAddByHand}
        onUseTemplate={() => setImportOption("template")}
        onImportComplete={onImportComplete}
        onScreen={setFlowScreen}
        onHandoff={onHandoff}
        lab={lab}
      />
      {flowScreen === "idle" && (
        <CaptureFork
          ringed={importOption}
          tier={entitlement.tier}
          onChooseFile={() => flowRef.current?.chooseFile()}
          onDropFile={(f) => flowRef.current?.dropFile(f)}
          onUploadTemplate={() => flowRef.current?.chooseTemplate()}
          onAddByHand={onAddByHand}
          onBack={() => setScreen("book")}
          onNothingYet={onSkip}
          onOpenImportDesk={onOpenImportDesk}
        />
      )}
    </>
  );
};
