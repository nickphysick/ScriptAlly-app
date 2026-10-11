/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Import page (onboarding v5, part 3; ref design-refs/onboarding/onboarding-journey-v5.html #desk).
 *
 * The in-app home for all three ways of bringing a list across. It opens on three tiles — Smart
 * import, Our template, Match your own columns — under the shared panel header. The first two start
 * the SAME `ImportFlow` set-up runs; the third opens the column matcher (`ImportCsv`).
 *
 * No tile is ringed, badged or recommended. A spent Smart Import disables its tile's button and the
 * fact line says why; there is no dead-end screen and no upgrade prompt here.
 */
import React, { useRef, useState } from "react";
import { BookStep } from "../onboarding/BookStep";
import { ManuscriptFieldsState, emptyManuscriptFields } from "../onboarding/ManuscriptFields";
import { ImportCancelConfirm } from "./ImportCancelConfirm";
import { buildManuscriptPayload, ensureManuscriptOnce, manuscriptLimitError, type ManuscriptIdCache } from "../../lib/manuscripts";
import { ManuscriptStatus } from "../../types";
import "./importPage.css";
import "../onboarding/onboarding.css";
import "../onboarding/importFlow.css";
import { WorkspacePageGrid } from "../shell/WorkspacePageGrid";
import { PanelHeader } from "../shell/PanelHeader";
import { ImportFlow, type ImportFlowHandle, type ImportFlowProps, type ImportFlowScreen } from "./ImportFlow";
import { ImportCsv } from "../ImportCsv";
import { useScriptAllyDb } from "../../lib/db";
import { useSmartImportEntitlement } from "../../lib/useSmartImportEntitlement";
import type { SmartImportEntitlement } from "../../lib/smartImportEntitlement";
import { TEMPLATE_FILENAME, downloadTemplate } from "../../lib/templateFile";
import { dayMonth } from "../../lib/dates";
import { IMPORT_TITLE, IMPORT_SUB, TILE_SMART, TILE_TEMPLATE, TILE_MATCH, IMPORT_FOOTNOTE, smartFactLine } from "../../lib/importPage";

const ACTIVE_MS_KEY = "scriptally_active_manuscript_id";

export interface ImportPageProps {
  onNavigate: (tab: string, sub?: string) => void;
  /** `#/onb-lab?s=import-page` only: a held entitlement, and spies in place of the real handlers. */
  lab?: {
    entitlement?: SmartImportEntitlement;
    /** Every tile press records its name and does nothing else (lock D2). */
    spy?: (name: string) => () => void;
    /** Start the flow on the summary over a fixture, committing through a stand-in (locks F3, F4). */
    flow?: ImportFlowProps["lab"];
    /** Stands in for creating the manuscript. */
    ensure?: () => Promise<string | null>;
  };
}

const IconSpark = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z" /><path d="M19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16z" />
  </svg>
);
const IconSheet = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="4" y="3" width="16" height="18" rx="2" /><path d="M4 9h16M4 15h16M10 3v18" />
  </svg>
);
const IconColumns = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M7 4v16M17 4v16M7 8h10M7 16h10" /><path d="M14 5l3 3-3 3M10 13l-3 3 3 3" />
  </svg>
);

export const ImportPage: React.FC<ImportPageProps> = ({ onNavigate, lab }) => {
  const { manuscripts, currentUser, addManuscript } = useScriptAllyDb();
  const liveEntitlement = useSmartImportEntitlement();
  const entitlement = lab?.entitlement ?? liveEntitlement;

  const [view, setView] = useState<"tiles" | "matcher">("tiles");
  const [flowScreen, setFlowScreen] = useState<ImportFlowScreen>(lab?.flow ? "overview" : "idle");
  const flowRef = useRef<ImportFlowHandle>(null);
  const inFlow = flowScreen !== "idle";

  /* The import attaches to the sidebar's active manuscript: the same key the sidebar's card writes. */
  const activeId = typeof window === "undefined" ? null : window.localStorage.getItem(ACTIVE_MS_KEY);
  const manuscript = manuscripts.find((m) => m.id === activeId) ?? manuscripts[0] ?? null;

  /* ── With no manuscript, the import opens on set-up's book step ──────────────────────────────
     The details are HELD, as in set-up: nothing is written until the import itself, when the
     manuscript is created once and every imported query attaches to it. */
  const [book, setBook] = useState<null | "smart" | "template">(null);
  const [draft, setDraft] = useState<ManuscriptFieldsState | null>(null);
  const [hostError, setHostError] = useState<string | null>(null);
  const created = useRef<ManuscriptIdCache>({ id: null });
  const needsBook = !manuscript && !draft && !lab?.flow;
  const openPicker = (kind: "smart" | "template") => (kind === "smart" ? flowRef.current?.chooseFile() : flowRef.current?.chooseTemplate());
  const start = (kind: "smart" | "template") => { if (needsBook) setBook(kind); else openPicker(kind); };

  const ensureManuscript = async (): Promise<string | null> => {
    if (lab?.ensure) return lab.ensure();
    if (manuscript) return manuscript.id;
    return ensureManuscriptOnce(created.current, !!draft, async () => {
      const limit = manuscriptLimitError(currentUser?.plan, manuscripts.length);
      if (limit) { setHostError(limit); return null; }
      const res = await addManuscript(buildManuscriptPayload({
        title: draft!.title.trim() || "Untitled manuscript",
        genre: draft!.genre,
        subGenres: draft!.subGenres,
        ageCategory: draft!.ageCategory,
        wordCount: parseInt(draft!.wordCount.replace(/\D/g, ""), 10) || 0,
        logline: draft!.strapline,
        status: ManuscriptStatus.QUERYING,
      }));
      if (!res.success || !res.id) { setHostError(res.error ?? null); return null; }
      setHostError(null);
      return res.id;
    });
  };

  /* ── Leaving part-way ── "Cancel" asks with the drawer's own words; Discard drops the read file. */
  const [asking, setAsking] = useState(false);

  const act = (name: string, real: () => void) => (lab?.spy ? lab.spy(name) : real);
  const chooseSmart = act("picker", () => start("smart"));
  const download = act("download", () => { void downloadTemplate(TEMPLATE_FILENAME); });
  const chooseTemplate = act("templatePicker", () => start("template"));
  const openMatcher = act("matcher", () => setView("matcher"));
  const showTiles = !inFlow && !book;

  if (view === "matcher") {
    /* The matcher opens with its own open title under a "‹ Back to import" link: no panel header. */
    return (
      <WorkspacePageGrid className="impg impg-wpg" scrollLabel="Import" masthead={null}>
        {/* The grid gives its measure to the scroll row's direct child; the matcher sits inside it,
            left-aligned, at most 960 wide. */}
        <div data-impg="matcher-view">
          <ImportCsv onNavigate={onNavigate} onBack={() => setView("tiles")} />
        </div>
      </WorkspacePageGrid>
    );
  }

  return (
    <WorkspacePageGrid
      className="impg impg-wpg" scrollLabel="Import"
      masthead={!showTiles ? null : (
        <PanelHeader
          kind="title" slim className="ph ph--compact ph--panel"
          attrs={{ "data-probe": "page-header", "data-size": "compact", "data-impg": "header" }}
          title={IMPORT_TITLE} sub={IMPORT_SUB}
        />
      )}
    >
      {showTiles && (
        <div className="impg-tilesview" data-impg="tiles-view">
          <div className="impg-tiles" data-impg="tiles">
            <section className="impg-tile" data-impg="tile" data-tile="smart" aria-labelledby="impg-t-smart">
              <span className="impg-disc" aria-hidden="true"><IconSpark /></span>
              <div className="impg-body">
                <h2 className="impg-h" id="impg-t-smart">{TILE_SMART.title}</h2>
                <p className="impg-p">{TILE_SMART.text}</p>
                <div className="impg-acts">
                  <button type="button" className="impg-btn" data-act="smart" onClick={chooseSmart} disabled={!entitlement.allowed}>{TILE_SMART.action}</button>
                </div>
                <p className="impg-fact" data-impg="fact">{smartFactLine(entitlement, dayMonth)}</p>
              </div>
            </section>
            <section className="impg-tile" data-impg="tile" data-tile="template" aria-labelledby="impg-t-template">
              <span className="impg-disc" aria-hidden="true"><IconSheet /></span>
              <div className="impg-body">
                <h2 className="impg-h" id="impg-t-template">{TILE_TEMPLATE.title}</h2>
                <p className="impg-p">{TILE_TEMPLATE.text}</p>
                <div className="impg-acts">
                  <button type="button" className="impg-btn" data-act="download" onClick={download}>{TILE_TEMPLATE.download}</button>
                  <button type="button" className="impg-btn impg-btn--line" data-act="upload" onClick={chooseTemplate}>{TILE_TEMPLATE.upload}</button>
                </div>
                <p className="impg-fact" data-impg="fact">{TILE_TEMPLATE.fact}</p>
              </div>
            </section>
            <section className="impg-tile" data-impg="tile" data-tile="match" aria-labelledby="impg-t-match">
              <span className="impg-disc" aria-hidden="true"><IconColumns /></span>
              <div className="impg-body">
                <h2 className="impg-h" id="impg-t-match">{TILE_MATCH.title}</h2>
                <p className="impg-p">{TILE_MATCH.text}</p>
                <div className="impg-acts">
                  <button type="button" className="impg-btn" data-act="match" onClick={openMatcher}>{TILE_MATCH.action}</button>
                </div>
                <p className="impg-fact" data-impg="fact">{TILE_MATCH.fact}</p>
              </div>
            </section>
          </div>
          <p className="impg-foot" data-impg="footnote">{IMPORT_FOOTNOTE}</p>
        </div>
      )}

      {/* The shared import flow. Idle, it renders only its two file pickers; once a file is chosen its
          screens take the sheet in place of the header and the tiles. */}
      <div className="sf impg-flow" data-impg="flow" data-flow-screen={book ? "book" : flowScreen}>
        {book && (
          <BookStep
            initial={draft ?? emptyManuscriptFields()}
            onBack={() => setBook(null)}
            onContinue={(fields) => {
              /* Held, not saved. The picker opens from this same press, so the browser lets it. */
              const kind = book;
              setDraft(fields); setBook(null);
              openPicker(kind);
            }}
          />
        )}
        <ImportFlow
          ref={flowRef}
          manuscriptTitle={lab?.flow?.title ?? manuscript?.title ?? draft?.title ?? ""}
          onEnsureManuscript={ensureManuscript}
          hostError={hostError}
          onAddByHand={() => onNavigate("agents", "Add an agent")}
          onImportComplete={() => onNavigate("dashboard")}
          onScreen={setFlowScreen}
          onCancel={() => setAsking(true)}
          lab={lab?.flow}
        />
        {asking && <ImportCancelConfirm onKeep={() => setAsking(false)} onDiscard={() => { setAsking(false); flowRef.current?.reset(); }} />}
      </div>
    </WorkspacePageGrid>
  );
};
