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
import { runSmartImport, validateSmartImport, ValidatedImport } from "../../lib/smartImport";
import { commitSmartImport, countExistingMatches, CommitOutcome } from "../../lib/smartImportCommit";
import { Form11Card, SelectRow, BookMotif, InboxMotif, FONT_SANS, FONT_MONO } from "./chrome";
import { ManuscriptFields, ManuscriptFieldsState, emptyManuscriptFields } from "./ManuscriptFields";

export interface BranchBProps {
  onSkip: () => void;
  /** Back from B2 — returns to the welcome step. */
  onExit: () => void;
  /** B2 Continue — parent saves the manuscript (status Querying); resolves true on success. */
  onSaveBook: (fields: ManuscriptFieldsState) => Promise<boolean>;
  /** The manuscript every imported query attaches to (set by the parent after B2 saves). */
  manuscriptId: string | null;
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

type B3Screen = "book" | "pipeline" | "reading" | "review" | "fallback" | "importing" | "done";

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

const pillStyle = (status: QueryStatus): React.CSSProperties => {
  const s = String(status);
  let bg = "#FFF0F0", color = "#7c3a2a"; // queried-ish
  if (/Partial/.test(s)) { bg = "#dce0d9"; color = "#2e3a2c"; }
  else if (/Full/.test(s)) { bg = "#D1E3FF"; color = "#185FA5"; }
  else if (/Rejected|Withdrawn|No Response/.test(s)) { bg = "#ececec"; color = "#6b5e5e"; }
  return { fontSize: 11, fontWeight: 500, padding: "3px 10px", borderRadius: 20, whiteSpace: "nowrap", background: bg, color };
};

const fmtDate = (iso: string | null | undefined): string => {
  if (!iso) return "";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? iso : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
};

export const BranchB: React.FC<BranchBProps> = ({
  onSkip, onExit, onSaveBook, manuscriptId, defaultImport, onAddByHand, onOpenImportDesk, onImportComplete, error,
}) => {
  const { currentUser, agents, addAgent, addQuery } = useScriptAllyDb();

  const [screen, setScreen] = useState<B3Screen>("book");
  const [fields, setFields] = useState<ManuscriptFieldsState>(emptyManuscriptFields());
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [importOption, setImportOption] = useState<"smart" | "byhand">(defaultImport);
  const [fileName, setFileName] = useState("");
  const [validated, setValidated] = useState<ValidatedImport | null>(null);
  const [outcome, setOutcome] = useState<CommitOutcome | null>(null);
  const [dismissedFlags, setDismissedFlags] = useState<Set<number>>(new Set());
  const [commitError, setCommitError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const shownError = error || fieldError;

  const handleFile = async (file: File) => {
    setFileName(file.name);
    setScreen("reading");
    try {
      const result: SmartImportResult = await runSmartImport(file);
      setValidated(validateSmartImport(result));
      setDismissedFlags(new Set());
      setScreen("review");
    } catch (e) {
      console.error("Smart Import mapping failed:", e);
      setScreen("fallback"); // graceful fallback — never dead-end onboarding
    }
  };

  const handleConfirm = async () => {
    if (!validated || !currentUser || !manuscriptId) return;
    setScreen("importing");
    try {
      const result = await commitSmartImport(
        {
          userId: currentUser.id,
          existingAgents: agents,
          manuscriptTitle: fields.title,
          addAgent,
          addQuery,
        },
        validated.result,
        manuscriptId
      );
      // Always show what actually happened — the commit must never finish silently,
      // least of all when it produced zero queries.
      setOutcome(result);
      setScreen("done");
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

  // ── B3 · bring it across (Smart Import primary) ──────────────────────────
  if (screen === "pipeline") {
    return (
      <Form11Card
        dotIndex={2}
        onSkip={onSkip}
        pre="Your pipeline"
        name="Bring it across"
        sub="Read it from your spreadsheet, or add by hand"
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
        <SelectRow
          icon={UploadIcon}
          title="Upload a spreadsheet"
          desc="Agents and queries in one go — we'll match the columns for you."
          selected={importOption === "smart"}
          onClick={() => setImportOption("smart")}
        />
        <TemplateNote />
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

  // ── Reading the file ─────────────────────────────────────────────────────
  if (screen === "reading" || screen === "importing") {
    return (
      <Form11Card
        dotIndex={2}
        onSkip={onSkip}
        pre="Your pipeline"
        name={screen === "reading" ? "Reading your file…" : "Bringing it in…"}
        sub={screen === "reading" ? "Matching your columns to ScriptAlly" : "Writing agents, queries, and history"}
        motif={<InboxMotif />}
        primaryLabel="Working…"
        primaryDisabled
        onPrimary={() => {}}
      >
        <div style={{ display: "flex", justifyContent: "center", gap: 8, padding: "26px 0 30px" }}>
          {[0, 1, 2].map((i) => (
            <span key={i} style={{ width: 9, height: 9, borderRadius: "50%", background: "#7c3a2a", animation: "sa-ob-pulse2 1.2s infinite ease-in-out", animationDelay: `${i * 0.2}s` }} />
          ))}
          <style>{`@keyframes sa-ob-pulse2{0%,100%{opacity:0.25;transform:scale(0.85);}50%{opacity:1;transform:scale(1);}}`}</style>
        </div>
        <p style={{ fontFamily: FONT_SANS, fontSize: 12, color: "#9c8878", textAlign: "center", margin: 0 }}>
          {screen === "reading" ? "This usually takes a few seconds." : "Almost there — don't close this tab."}
        </p>
      </Form11Card>
    );
  }

  // ── Review & confirm (matches scriptally-smart-import-review.html) ───────
  if (screen === "review" && validated) {
    const { result, importable, skipped, dateWarnings } = validated;
    const mergeCount = countExistingMatches(result, agents);
    const unmappedStatuses = (result.statusTranslations || []).filter((t) => !t.mapped);
    const lowConfidence = importable.filter((q) => q.confidence === "low").length;

    // Amber flags: unmapped status vocab, skipped rows, date-order warnings, low confidence.
    const flags: string[] = [
      ...unmappedStatuses.map((t) => `We couldn't read "${t.original}" (${t.count} ${t.count === 1 ? "query" : "queries"}) — those rows will be skipped.`),
      ...(skipped.length ? [`${skipped.length} ${skipped.length === 1 ? "row" : "rows"} can't be imported (${[...new Set(skipped.map((s) => s.reason.toLowerCase()))].join("; ")}).`] : []),
      ...dateWarnings,
      ...(lowConfidence ? [`${lowConfidence} ${lowConfidence === 1 ? "query looks" : "queries look"} uncertain — worth a glance after import.`] : []),
      ...(result.warnings || []),
    ];

    const agentByRef = (ref: string) => (result.agents || []).find((a) => a.ref === ref);

    return (
      <Form11Card
        dotIndex={2}
        onSkip={onSkip}
        pre="Your pipeline"
        name="Here's what we found"
        sub="Read straight from your file — give it a glance"
        motif={<InboxMotif />}
        onBack={() => setScreen("pipeline")}
        primaryLabel={`Looks right — import ${importable.length} ${importable.length === 1 ? "query" : "queries"} →`}
        primaryFilled
        primaryDisabled={importable.length === 0}
        onPrimary={() => void handleConfirm()}
      >
        {/* source row */}
        <div style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 12, color: "#9c8878", marginBottom: 14, fontFamily: FONT_SANS, flexWrap: "wrap" }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9c8878" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" />
          </svg>
          <span style={{ color: "#3a1c14", fontWeight: 500 }}>{fileName}</span>
          <span style={{ width: 3, height: 3, borderRadius: "50%", background: "#c9b8a8" }} />
          <span>{(result.agents || []).length} agents</span>
          <span style={{ width: 3, height: 3, borderRadius: "50%", background: "#c9b8a8" }} />
          <span>{importable.length} queries</span>
        </div>

        {/* a few queries, as we read them */}
        <p style={{ fontFamily: FONT_MONO, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.07em", color: "#9c8878", margin: "0 0 8px" }}>
          A few of your queries, as we read them
        </p>
        {importable.slice(0, 4).map((q, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "10px 13px", border: "0.5px solid #e8ddd0", borderRadius: 9, background: "#fff", marginBottom: 7 }}>
            <div>
              <div style={{ fontSize: 13, color: "#3a1c14", fontWeight: 500, fontFamily: FONT_SANS }}>{agentByRef(q.agentRef)?.name || "Unknown agent"}</div>
              <div style={{ fontSize: 11, color: "#a8968a", marginTop: 1, fontFamily: FONT_SANS }}>{q.status} · {fmtDate(q.dateQueried)}</div>
            </div>
            <span style={pillStyle(q.status!)}>{q.status}</span>
          </div>
        ))}

        {/* amber flags */}
        {flags.map((f, i) =>
          dismissedFlags.has(i) ? null : (
            <div key={i} style={{ display: "flex", gap: 10, background: "#FAEEDA", border: "0.5px solid #ead2a0", borderRadius: 9, padding: "11px 13px", margin: "14px 0 0" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9a6a12" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
                <path d="M12 9v4M12 17h.01" /><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
              </svg>
              <div>
                <div style={{ fontSize: 12, color: "#6b4a08", lineHeight: 1.5, fontFamily: FONT_SANS }}>{f}</div>
                <div style={{ display: "flex", gap: 8, marginTop: 7 }}>
                  <button
                    onClick={() => setDismissedFlags((p) => new Set(p).add(i))}
                    style={{ fontFamily: FONT_MONO, fontSize: 10, letterSpacing: "0.03em", borderRadius: 7, padding: "5px 11px", cursor: "pointer", border: "0.5px solid #dcc188", background: "#f1e3c4", color: "#6b4a08" }}
                  >
                    Understood
                  </button>
                  <button
                    onClick={onOpenImportDesk}
                    style={{ fontFamily: FONT_MONO, fontSize: 10, letterSpacing: "0.03em", borderRadius: 7, padding: "5px 11px", cursor: "pointer", border: "0.5px solid #d8c39a", background: "transparent", color: "#9a7a30" }}
                  >
                    Map it myself
                  </button>
                </div>
              </div>
            </div>
          )
        )}

        {/* sage merge note */}
        {mergeCount > 0 && (
          <div style={{ display: "flex", gap: 9, background: "#e7ece1", border: "0.5px solid #c4d0bc", borderRadius: 9, padding: "10px 13px", marginTop: 10 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5a6e58" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
              <path d="M18 8 22 12l-4 4M6 8l-4 4 4 4M2 12h20" />
            </svg>
            <p style={{ fontSize: 12, color: "#44563a", lineHeight: 1.5, margin: 0, fontFamily: FONT_SANS }}>
              {mergeCount} of these agents already exist in your ScriptAlly — we'll merge, not duplicate.
            </p>
          </div>
        )}

        {commitError && <p style={{ fontFamily: FONT_SANS, fontSize: 12, color: "#a0392a", margin: "12px 2px 0" }}>{commitError}</p>}

        <p style={{ textAlign: "center", fontSize: 11, color: "#a8968a", marginTop: 14, fontStyle: "italic", fontFamily: FONT_SANS }}>
          Nothing's saved yet. Confirm and we'll bring it all in.
        </p>
      </Form11Card>
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
