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
import { commitSmartImport, CommitOutcome } from "../../lib/smartImportCommit";
import { getStatusDescription } from "../StatusPill";
import { StatusDot } from "../StatusDot";
import { Form11Card, SelectRow, BookMotif, InboxMotif, FONT_SANS, FONT_MONO } from "./chrome";
import { ManuscriptFields, ManuscriptFieldsState, emptyManuscriptFields } from "./ManuscriptFields";
import { BrandDropdown } from "../forms";

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

// ── Review-row classification ────────────────────────────────────────────────
// Every detected row appears on the review — ready, fixable in place, or skipped-but-visible.
type RowKind = "ready" | "uncertain" | "recoverable" | "unrecoverable";

interface ReviewRow {
  idx: number; // index into result.queries — the key for inline fixes
  kind: RowKind;
  agentRef: string;
  displayName: string;
  date: string | null;
  /** Our best guess for the status (the model's, or Queried when unreadable). */
  guess: QueryStatus;
  /** Why we weren't sure — shown on uncertain rows. */
  uncertainNote?: string;
  skipReason?: string;
}

const VALID_STATUSES = new Set<string>(Object.values(QueryStatus));

function classifyRows(v: ValidatedImport): ReviewRow[] {
  const { result, skipped } = v;
  const skipByQuery = new Map(skipped.map((s) => [s.query, s.reason]));
  const agentByRef = new Map((result.agents || []).map((a) => [a.ref, a]));

  return (result.queries || []).map((q, idx) => {
    const agent = agentByRef.get(q.agentRef);
    const displayName = agent?.name?.trim() || `Row ${idx + 1}${agent?.agency ? ` · ${agent.agency}` : ""}`;
    const statusValid = !!q.status && VALID_STATUSES.has(q.status);
    const guess = statusValid ? (q.status as QueryStatus) : QueryStatus.QUERIED;
    const reason = skipByQuery.get(q);
    const base = { idx, agentRef: q.agentRef, displayName, date: q.dateQueried, guess };

    if (reason === "Row has no agent name") return { ...base, kind: "recoverable" as const, skipReason: "No agent name, so we can't file it" };
    // Friendly first-contact copy: quote what their sheet actually said. Prefer a quote from the
    // row's own flag (row-specific), then a translation original that isn't just a canonical
    // status name — never the model's technical phrasing.
    const quoteFor = (mapped: QueryStatus | null): string | undefined => {
      const flagQuote = q.flags?.[0]?.match(/["'“”]([^"'“”]{2,40})["'“”]/)?.[1];
      if (flagQuote) return flagQuote;
      return (result.statusTranslations || []).find(
        (t) => t.mapped === mapped && !VALID_STATUSES.has(t.original) && t.original.toLowerCase() !== String(mapped ?? "").toLowerCase()
      )?.original;
    };
    if (!statusValid) {
      const original = quoteFor(null);
      return { ...base, kind: "uncertain" as const, uncertainNote: original ? `we weren't sure — "${original}"` : "we weren't sure about the status" };
    }
    if (reason) return { ...base, kind: "unrecoverable" as const, skipReason: reason };
    if (q.confidence === "low") {
      const original = quoteFor(q.status as QueryStatus);
      return { ...base, kind: "uncertain" as const, uncertainNote: original ? `we weren't sure — "${original}"` : "we weren't fully sure about this one" };
    }
    return { ...base, kind: "ready" as const };
  });
}

const STATUS_FIX_OPTIONS = [
  ...Object.values(QueryStatus).map((s) => ({ value: s, label: s })),
  { value: "__exclude__", label: "Don't import this row" },
];

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
  // Inline review fixes: per-row status override / exclusion, and recovered names for no-name rows.
  const [fixes, setFixes] = useState<Record<number, QueryStatus | "__exclude__">>({});
  const [recoveredNames, setRecoveredNames] = useState<Record<string, string>>({});
  const [namingRef, setNamingRef] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState("");
  const [commitError, setCommitError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const shownError = error || fieldError;

  const handleFile = async (file: File) => {
    setFileName(file.name);
    setScreen("reading");
    try {
      const result: SmartImportResult = await runSmartImport(file);
      setValidated(validateSmartImport(result));
      setFixes({});
      setRecoveredNames({});
      setNamingRef(null);
      setScreen("review");
    } catch (e) {
      console.error("Smart Import mapping failed:", e);
      setScreen("fallback"); // graceful fallback — never dead-end onboarding
    }
  };

  // The review classification — every detected row, bucketed (recomputed cheaply per render).
  const rows = validated ? classifyRows(validated) : [];

  // Rows that will import once the user's inline fixes are applied — the honest confirm count.
  const importingRows = rows.filter((row) => {
    if (fixes[row.idx] === "__exclude__") return false;
    if (row.kind === "ready" || row.kind === "uncertain") return true;
    if (row.kind === "recoverable") return !!recoveredNames[row.agentRef]?.trim();
    return false;
  });

  /** The result as the user resolved it: fixed statuses applied, exclusions dropped, names recovered. */
  const buildAmendedResult = (): SmartImportResult => {
    const r = validated!.result;
    const rowByIdx = new Map(rows.map((row) => [row.idx, row]));
    return {
      ...r,
      agents: (r.agents || []).map((a) =>
        recoveredNames[a.ref]?.trim() ? { ...a, name: recoveredNames[a.ref].trim() } : a
      ),
      queries: (r.queries || []).flatMap((q, idx) => {
        const fix = fixes[idx];
        if (fix === "__exclude__") return [];
        if (fix) return [{ ...q, status: fix as QueryStatus }];
        const row = rowByIdx.get(idx);
        if (row?.kind === "uncertain") return [{ ...q, status: row.guess }];
        return [q];
      }),
    };
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
        buildAmendedResult(),
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

  // ── Review & confirm (matches scriptally-smart-import-review-v2.html) ────
  if (screen === "review" && validated) {
    const { result } = validated;
    const uncertainRows = rows.filter((r) => r.kind === "uncertain" && fixes[r.idx] !== "__exclude__");
    const skippedRows = rows.filter(
      (r) => (r.kind === "recoverable" && !recoveredNames[r.agentRef]?.trim()) || r.kind === "unrecoverable" || fixes[r.idx] === "__exclude__"
    );
    const listedRows = rows.filter((r) => !skippedRows.includes(r));

    // Minor assumptions, folded into ONE quiet line — never a stack of cards.
    const assumptions: string[] = [];
    if (listedRows.some((r) => r.date)) assumptions.push("numeric dates read as UK format (DD/MM/YYYY)");
    const noAgency = (result.agents || []).filter((a) => a.name?.trim() && !a.agency?.trim()).map((a) => a.name);
    if (noAgency.length) assumptions.push(`${noAgency.join(" and ")} ${noAgency.length === 1 ? "has" : "have"} no agency yet — you can add it anytime`);
    if (result.warnings?.length) assumptions.push(...result.warnings.map((w) => w.replace(/\.$/, "").toLowerCase()));

    const rowStatus = (row: ReviewRow): QueryStatus => (fixes[row.idx] && fixes[row.idx] !== "__exclude__" ? (fixes[row.idx] as QueryStatus) : row.guess);

    return (
      <Form11Card
        dotIndex={2}
        onSkip={onSkip}
        pre="Your pipeline"
        name="Here's what we found"
        sub="Every row's here — check it over, then confirm"
        motif={<InboxMotif />}
        onBack={() => setScreen("pipeline")}
        primaryLabel={`Looks right — import ${importingRows.length} →`}
        primaryFilled
        primaryDisabled={importingRows.length === 0}
        onPrimary={() => void handleConfirm()}
      >
        {/* source row */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#9c8878", marginBottom: 9, fontFamily: FONT_SANS }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9c8878" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" />
          </svg>
          <b style={{ color: "#3a1c14", fontWeight: 500 }}>{fileName}</b>
        </div>

        {/* tally chips */}
        <div style={{ display: "flex", gap: 7, marginBottom: 15, flexWrap: "wrap" }}>
          <span style={{ fontFamily: FONT_MONO, fontSize: 10, letterSpacing: "0.02em", padding: "4px 9px", borderRadius: 20, background: "#e7ece1", color: "#44563a" }}>
            {importingRows.length - uncertainRows.length} ready to import
          </span>
          {uncertainRows.length > 0 && (
            <span style={{ fontFamily: FONT_MONO, fontSize: 10, letterSpacing: "0.02em", padding: "4px 9px", borderRadius: 20, background: "#FAEEDA", color: "#6b4a08" }}>
              {uncertainRows.length} to check
            </span>
          )}
          {skippedRows.length > 0 && (
            <span style={{ fontFamily: FONT_MONO, fontSize: 10, letterSpacing: "0.02em", padding: "4px 9px", borderRadius: 20, background: "#efe9e2", color: "#a08a78" }}>
              {skippedRows.length} skipped
            </span>
          )}
        </div>

        <p style={{ fontFamily: FONT_MONO, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.07em", color: "#9c8878", margin: "0 0 8px" }}>
          All {listedRows.length} queries we read
        </p>

        {listedRows.map((row) => {
          const uncertain = row.kind === "uncertain";
          const status = rowStatus(row);
          const closed = [QueryStatus.REJECTED, QueryStatus.WITHDRAWN, QueryStatus.NO_RESPONSE].includes(status);
          return (
            <div
              key={row.idx}
              style={{
                display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12,
                padding: "10px 12px", borderRadius: 9, marginBottom: 6, flexWrap: uncertain ? "wrap" : undefined,
                border: uncertain ? "0.5px solid #ead2a0" : "0.5px solid #e8ddd0",
                background: uncertain ? "#fdf7ec" : "#fff",
              }}
            >
              <div style={{ paddingTop: 1 }}>
                <div style={{ fontSize: 13, color: "#3a1c14", fontWeight: 500, fontFamily: FONT_SANS }}>{row.displayName}</div>
                <div style={{ fontSize: 11, color: "#a8968a", marginTop: 2, fontFamily: FONT_SANS }}>{fmtDate(row.date)}</div>
                {uncertain && (
                  <span style={{ fontFamily: FONT_MONO, fontSize: 9, letterSpacing: "0.04em", color: "#9a6a12", background: "#f4e6cb", padding: "2px 7px", borderRadius: 5, marginTop: 3, display: "inline-block" }}>
                    {row.uncertainNote}
                  </span>
                )}
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2, flexShrink: 0, maxWidth: "52%" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <StatusDot status={status} size={13} />
                  <span style={{ fontSize: 11.5, fontWeight: 500, whiteSpace: "nowrap", color: closed ? "#9b8d80" : "#5a4e44", fontFamily: FONT_SANS }}>{status}</span>
                </div>
                <div style={{ fontSize: 10, color: "#b3a596", fontWeight: 300, textAlign: "right", lineHeight: 1.3, fontFamily: FONT_SANS }}>
                  {getStatusDescription(status)}
                </div>
              </div>
              {uncertain && (
                <div style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, marginTop: 9, paddingTop: 9, borderTop: "0.5px solid #ecdcc0" }}>
                  <span style={{ fontSize: 11, color: "#8a6d3a", fontFamily: FONT_SANS, flexShrink: 0 }}>We read this as</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <BrandDropdown
                      value={fixes[row.idx] ?? row.guess}
                      options={STATUS_FIX_OPTIONS}
                      onChange={(v) => setFixes((p) => ({ ...p, [row.idx]: v as QueryStatus | "__exclude__" }))}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* skipped — visible, recoverable where possible */}
        {skippedRows.length > 0 && (
          <>
            <p style={{ fontFamily: FONT_MONO, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.07em", color: "#9c8878", margin: "14px 0 8px" }}>
              Skipped — needs you
            </p>
            {skippedRows.map((row) => (
              <div
                key={row.idx}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
                  padding: "10px 12px", borderRadius: 9, marginBottom: 6, flexWrap: "wrap",
                  background: "#f4f1ec", border: "0.5px dashed #ddd3c7",
                }}
              >
                <div>
                  <div style={{ fontSize: 13, color: "#a89a8c", fontWeight: 500, fontFamily: FONT_SANS }}>{row.displayName}</div>
                  <div style={{ fontSize: 11, color: "#a8968a", marginTop: 2, fontFamily: FONT_SANS }}>
                    {fixes[row.idx] === "__exclude__" ? "You chose not to import this row" : row.skipReason}
                  </div>
                </div>
                {row.kind === "recoverable" && namingRef !== row.agentRef && (
                  <button
                    onClick={() => { setNamingRef(row.agentRef); setNameDraft(""); }}
                    style={{ fontFamily: FONT_MONO, fontSize: 10, color: "#7c3a2a", textDecoration: "underline", cursor: "pointer", whiteSpace: "nowrap", background: "none", border: "none", padding: 0 }}
                  >
                    Add a name →
                  </button>
                )}
                {fixes[row.idx] === "__exclude__" && (
                  <button
                    onClick={() => setFixes((p) => { const n = { ...p }; delete n[row.idx]; return n; })}
                    style={{ fontFamily: FONT_MONO, fontSize: 10, color: "#7c3a2a", textDecoration: "underline", cursor: "pointer", whiteSpace: "nowrap", background: "none", border: "none", padding: 0 }}
                  >
                    Include it after all →
                  </button>
                )}
                {row.kind === "recoverable" && namingRef === row.agentRef && (
                  <div style={{ width: "100%", display: "flex", gap: 8, marginTop: 8 }}>
                    <input
                      autoFocus
                      value={nameDraft}
                      onChange={(e) => setNameDraft(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter" && nameDraft.trim()) { setRecoveredNames((p) => ({ ...p, [row.agentRef]: nameDraft.trim() })); setNamingRef(null); } }}
                      placeholder="Agent's name…"
                      style={{ flex: 1, background: "#fff", border: "0.5px solid #e0d5c8", borderRadius: 7, padding: "6px 10px", fontFamily: FONT_SANS, fontSize: 12, color: "#3a1c14", outline: "none" }}
                    />
                    <button
                      disabled={!nameDraft.trim()}
                      onClick={() => { setRecoveredNames((p) => ({ ...p, [row.agentRef]: nameDraft.trim() })); setNamingRef(null); }}
                      style={{ fontFamily: FONT_MONO, fontSize: 10, background: "#f5e2da", color: "#7c3a2a", border: "0.5px solid #e8c8bc", borderRadius: 7, padding: "5px 12px", cursor: nameDraft.trim() ? "pointer" : "not-allowed", opacity: nameDraft.trim() ? 1 : 0.55 }}
                    >
                      Add
                    </button>
                  </div>
                )}
              </div>
            ))}
          </>
        )}

        {/* one quiet line of minor assumptions */}
        {assumptions.length > 0 && (
          <div style={{ display: "flex", gap: 9, background: "#f3efe8", border: "0.5px solid #e4dcd0", borderRadius: 9, padding: "10px 12px", marginTop: 13 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a8968a" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
              <circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" />
            </svg>
            <p style={{ fontSize: 11.5, color: "#8a7c6e", lineHeight: 1.55, margin: 0, fontFamily: FONT_SANS }}>
              {assumptions.length === 1 ? "One small assumption: " : "A couple of small assumptions: "}
              {assumptions.join("; ")}.
            </p>
          </div>
        )}

        {commitError && <p style={{ fontFamily: FONT_SANS, fontSize: 12, color: "#a0392a", margin: "12px 2px 0" }}>{commitError}</p>}

        <p style={{ textAlign: "center", fontSize: 11, color: "#a8968a", marginTop: 13, fontStyle: "italic", fontFamily: FONT_SANS }}>
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
