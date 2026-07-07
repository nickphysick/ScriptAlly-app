/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Comparable titles — a manuscript-scoped workspace where a writer curates a single FLAT list of
 * comps (free), alongside "The Scout" (Pro), which will surface verified, web-scoured comps.
 * Route /manuscripts/comps; reached from the rail and each plate's MANAGE → link.
 * Single visual source of truth: design-refs/comparable-titles-flat.html.
 *
 * Workspace-fills layout (masthead flex-none over a two-panel split that fills the stage and scrolls
 * internally). The masthead is the locked HubHeaderBar with the manuscript selector in its right
 * slot. Store only facts + one intent (`inQuery`); role / query line / health / recency are derived
 * at render (src/lib/compsPage.ts). Comp writes go through the shared updateManuscript path (a first
 * write on a legacy-string doc converts it to the structured array).
 */
import React, { useState, useEffect, useRef } from "react";
import { ChevronDown } from "lucide-react";
import { useScriptAllyDb } from "../../lib/db";
import { Manuscript } from "../../types";
import { HubHeaderBar } from "../shell/HubHeaderBar";
import { isShelvedPresentation } from "../../lib/manuscriptPage";
import { manuscriptComps } from "../../lib/comps";
import { compCounts, currentYear } from "../../lib/compsPage";
import { FONT_SERIF } from "../../lib/designTokens";
import "./comps.css";

/** Shared with the overview + the Package Builder — the section's single active-manuscript pointer. */
const ACTIVE_MS_KEY = "scriptally_active_manuscript_id";

interface ComparableTitlesPageProps {
  onNavigate?: (tab: string, subPageName?: string, opts?: { manuscriptId?: string }) => void;
}

/** First glyph of a title for the selector monogram. */
function monogram(title: string): string {
  return (title.trim()[0] || "·").toUpperCase();
}

/** The right-of-masthead manuscript selector (design-ref .ms-header). Outside-click closes. */
const CompsMsSelect: React.FC<{
  active: Manuscript;
  manuscripts: Manuscript[];
  onSelect: (id: string) => void;
}> = ({ active, manuscripts, onSelect }) => {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="ct-mssel-wrap" ref={wrapRef}>
      <button
        type="button"
        className="ct-mssel"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="mono">{monogram(active.title)}</span>
        <span>
          <span className="lab">Working on</span>
          <span className="val" style={{ display: "block" }}>{active.title}</span>
        </span>
        <ChevronDown size={15} />
      </button>
      {open && (
        <div className="ct-msmenu" role="listbox">
          {manuscripts.map((m) => {
            const shelved = isShelvedPresentation(m);
            const n = manuscriptComps(m).length;
            return (
              <button
                key={m.id}
                type="button"
                role="option"
                aria-selected={m.id === active.id}
                className={`ct-msopt${m.id === active.id ? " on" : ""}${shelved ? " shelved" : ""}`}
                onClick={() => {
                  onSelect(m.id);
                  setOpen(false);
                }}
              >
                <span className="t">{m.title}</span>
                <span className="c">{shelved ? "SHELVED" : `${n} ${n === 1 ? "COMP" : "COMPS"}`}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export const ComparableTitlesPage: React.FC<ComparableTitlesPageProps> = ({ onNavigate }) => {
  const { currentUser, manuscripts } = useScriptAllyDb();

  const [selectedMsId, setSelectedMsId] = useState<string | null>(
    () => localStorage.getItem(ACTIVE_MS_KEY)
  );

  // Active books first, shelved sink to the end — the spine ordering the overview uses.
  const ordered = [...manuscripts].sort(
    (a, b) => Number(isShelvedPresentation(a)) - Number(isShelvedPresentation(b))
  );

  // Keep the selection valid: fall back to the first spine when the stored id is gone.
  useEffect(() => {
    if (ordered.length === 0) {
      if (selectedMsId !== null) setSelectedMsId(null);
      return;
    }
    if (!selectedMsId || !ordered.some((m) => m.id === selectedMsId)) {
      setSelectedMsId(ordered[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manuscripts]);

  if (!currentUser) return null;

  const selectMs = (id: string) => {
    setSelectedMsId(id);
    localStorage.setItem(ACTIVE_MS_KEY, id);
  };

  const activeMs = selectedMsId ? manuscripts.find((m) => m.id === selectedMsId) : null;
  const comps = activeMs ? manuscriptComps(activeMs) : [];
  const now = currentYear();
  const counts = compCounts(comps);

  const pulse = activeMs ? (
    <span className="ct-pulse">
      {[activeMs.ageCategory, activeMs.genre].filter(Boolean).join(" ")} · <b>{counts.total}</b>{" "}
      {counts.total === 1 ? "comp" : "comps"} · <b>{counts.inQuery}</b> in your query
    </span>
  ) : (
    manuscripts.length === 0 ? "No manuscripts yet" : ""
  );

  return (
    <div className="ctpage">
      <div className="ct-mast">
        <HubHeaderBar
          title="Comparable titles"
          titleStyle={{ fontFamily: FONT_SERIF, fontWeight: 600, fontSize: 30, color: "var(--ct-ink)" }}
          subtitle={pulse}
          right={
            activeMs ? (
              <CompsMsSelect active={activeMs} manuscripts={ordered} onSelect={selectMs} />
            ) : undefined
          }
        />
      </div>

      <div className="ct-desk">
        {!activeMs ? (
          <div className="ct-panel" style={{ height: "100%" }}>
            <div className="ct-blank">
              <div className="q">No manuscript to compare yet.</div>
              <span className="lab">Add a manuscript to build its comp list</span>
            </div>
          </div>
        ) : (
          <div className="ct-split">
            {/* ── Your comps (Phase 3) ── */}
            <section className="ct-panel">
              <div className="ct-band">
                <span className="bt">Your comps</span>
                <span className="ct-tag free">Free</span>
                <span className="bmeta">{counts.total} saved</span>
              </div>
              <div className="ct-body" />
            </section>

            {/* ── The Scout (Phase 4) ── */}
            <section className="ct-panel">
              <div className="ct-band">
                <span className="bt">The Scout</span>
                <span className="ct-tag pro">Pro</span>
              </div>
              <div className="ct-body" />
            </section>
          </div>
        )}
      </div>
    </div>
  );
};
