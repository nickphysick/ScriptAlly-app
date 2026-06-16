/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Submission Packages — a per-manuscript page under the Manuscripts area (the "Submission packages"
 * subpage; the manuscript list/CRUD stays in AllManuscripts). Scoped to the active manuscript via
 * localStorage["scriptally_active_manuscript_id"] (the existing convention).
 *
 * Checkpoint 2: page scaffold (header + PRO pill + manuscript selector + tabs) and the LIBRARY tab
 * (versioned materials CRUD). Performance / Packages / "In the query log" land in later checkpoints.
 *
 * Every card reuses MountPanel — the shared three-layer clipping card (parchment rim → 1px frame with
 * overflow:hidden → band header with no radius of its own), so a band never spills at the corners.
 * Derived-over-stored: snippets, word counts, package usage and request rates all come from
 * packageMetrics — nothing here is persisted beyond the version/package docs themselves.
 */
import React, { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { useScriptAllyDb } from "../lib/db";
import { ManuscriptVersion, ComponentType, UserPlan } from "../types";
import { MountPanel } from "./MountPanel";
import {
  versionSnippet,
  versionMeta,
  packagesUsingVersion,
  componentMetrics,
  formatRate,
} from "../lib/packageMetrics";
import {
  pageGround,
  PAGE_GRAIN,
  parchment,
  sageBandGradient,
  sageBandRule,
  amberBandGradient,
  amberBandRule,
  burgundy,
  headingInk,
  bodyInk,
  mutedInk,
  labelColor,
  sageText,
  buttonPinkBg,
  buttonPinkBorder,
  ghostButtonBorder,
  FONT_SERIF,
  FONT_SANS,
  FONT_MONO,
} from "../lib/designTokens";
import {
  Mail,
  FileText,
  BookOpen,
  BarChart3,
  Package,
  Layers,
  Send,
  Plus,
  Pencil,
  Trash2,
  Lock,
  ChevronDown,
  X,
  AlertTriangle,
} from "lucide-react";

const AMBER = "#b98a4e";
const GREY_DOT = "#c4b4aa";

/** Per-component-kind presentation (the three material kinds this page manages). */
const COMP: Record<string, { label: string; noun: string; Icon: React.ComponentType<any>; color: string; tile: string }> = {
  [ComponentType.QUERY_LETTER]: { label: "Query letters", noun: "version", Icon: Mail, color: burgundy, tile: "#f5e2da" },
  [ComponentType.SYNOPSIS]: { label: "Synopses", noun: "version", Icon: FileText, color: sageText, tile: "#e9ede6" },
  [ComponentType.SAMPLE_PAGES]: { label: "Sample pages", noun: "selection", Icon: BookOpen, color: AMBER, tile: "#f3e6cf" },
};
const LIB_KINDS: ComponentType[] = [ComponentType.QUERY_LETTER, ComponentType.SYNOPSIS, ComponentType.SAMPLE_PAGES];

type TabKey = "perf" | "pkgs" | "lib" | "log";
const TABS: { key: TabKey; label: string; Icon: React.ComponentType<any> }[] = [
  { key: "perf", label: "Performance", Icon: BarChart3 },
  { key: "pkgs", label: "Packages", Icon: Package },
  { key: "lib", label: "Library", Icon: Layers },
  { key: "log", label: "In the query log", Icon: Send },
];

/* ── Reusable band header (sage or amber); sits inside MountPanel's clipping frame, no radius. ── */
const BandHeader: React.FC<{ title: string; meta?: string; Icon: React.ComponentType<any>; variant?: "sage" | "amber" }> = ({
  title,
  meta,
  Icon,
  variant = "sage",
}) => {
  const amber = variant === "amber";
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 11,
        padding: "14px 20px",
        minHeight: 54,
        background: amber ? amberBandGradient : sageBandGradient,
        borderBottom: `1px solid ${amber ? amberBandRule : sageBandRule}`,
      }}
    >
      <span aria-hidden="true" style={{ width: 3, height: 26, borderRadius: 2, background: burgundy, flexShrink: 0, display: "inline-block" }} />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontFamily: FONT_SERIF, fontSize: 18, fontWeight: 500, color: headingInk, lineHeight: 1.05 }}>{title}</div>
        {meta && (
          <div style={{ fontFamily: FONT_MONO, fontSize: 9, letterSpacing: "0.07em", textTransform: "uppercase", color: sageText, marginTop: 2 }}>{meta}</div>
        )}
      </div>
      <span style={{ marginLeft: "auto", color: burgundy, opacity: 0.7, flexShrink: 0, display: "inline-flex" }}>
        <Icon style={{ width: 20, height: 20 }} strokeWidth={1.6} aria-hidden="true" />
      </span>
    </div>
  );
};

/* ── Shared modal shell (a centred MountPanel over a scrim). ── */
const Modal: React.FC<{ onClose: () => void; labelledBy: string; children: React.ReactNode }> = ({ onClose, labelledBy, children }) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return createPortal(
    <div
      role="presentation"
      onMouseDown={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 120, background: "rgba(58,28,20,0.28)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
    >
      <div role="dialog" aria-modal="true" aria-labelledby={labelledBy} onMouseDown={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 440 }}>
        <MountPanel>{children}</MountPanel>
      </div>
    </div>,
    document.body,
  );
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "#fff",
  border: `1px solid ${ghostButtonBorder}`,
  borderRadius: 9,
  padding: "10px 13px",
  fontFamily: FONT_SANS,
  fontSize: 14,
  color: bodyInk,
  outline: "none",
};
const labelStyle: React.CSSProperties = {
  display: "block",
  fontFamily: FONT_MONO,
  fontSize: 10,
  letterSpacing: "0.07em",
  textTransform: "uppercase",
  color: labelColor,
  marginBottom: 6,
};
const addBtn: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  fontFamily: FONT_MONO,
  fontSize: 10,
  letterSpacing: "0.05em",
  textTransform: "uppercase",
  color: burgundy,
  background: buttonPinkBg,
  border: `1px solid ${buttonPinkBorder}`,
  borderRadius: 9,
  padding: "7px 13px",
  cursor: "pointer",
};
const ghostBtn: React.CSSProperties = {
  fontFamily: FONT_MONO,
  fontSize: 11,
  letterSpacing: "0.05em",
  textTransform: "uppercase",
  color: "#9c8878",
  background: "#fff",
  border: `1px solid ${ghostButtonBorder}`,
  borderRadius: 9,
  padding: "10px 16px",
  cursor: "pointer",
};

interface FormState {
  kind: ComponentType;
  editing?: ManuscriptVersion;
  name: string;
  content: string;
}

export const SubmissionPackages: React.FC = () => {
  const { currentUser, manuscripts, versions, packages, queries, addVersion, updateVersion, deleteVersion } = useScriptAllyDb();
  const isPro = currentUser?.plan === UserPlan.PRO;

  const [activeMsId, setActiveMsId] = useState<string | null>(() =>
    typeof window !== "undefined" ? localStorage.getItem("scriptally_active_manuscript_id") : null,
  );
  const [tab, setTab] = useState<TabKey>("lib"); // Library is the built tab this checkpoint
  const [msMenuOpen, setMsMenuOpen] = useState(false);
  const [form, setForm] = useState<FormState | null>(null);
  const [confirmDel, setConfirmDel] = useState<ManuscriptVersion | null>(null);
  const msMenuRef = useRef<HTMLDivElement>(null);

  // Default to the first manuscript when none is selected / the saved one is gone.
  useEffect(() => {
    if (manuscripts.length === 0) return;
    if (!activeMsId || !manuscripts.some((m) => m.id === activeMsId)) {
      const first = manuscripts[0].id;
      setActiveMsId(first);
      localStorage.setItem("scriptally_active_manuscript_id", first);
    }
  }, [manuscripts, activeMsId]);

  // Outside-click closes the manuscript menu.
  useEffect(() => {
    if (!msMenuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (msMenuRef.current && !msMenuRef.current.contains(e.target as Node)) setMsMenuOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [msMenuOpen]);

  const activeMs = useMemo(() => manuscripts.find((m) => m.id === activeMsId) ?? manuscripts[0], [manuscripts, activeMsId]);
  const msId = activeMs?.id;

  const msVersions = useMemo(() => versions.filter((v) => v.manuscriptId === msId), [versions, msId]);
  const msPackages = useMemo(() => packages.filter((p) => p.manuscriptId === msId && p.status !== "Retired"), [packages, msId]);
  const msQueries = useMemo(() => queries.filter((q) => q.manuscriptId === msId), [queries, msId]);

  if (!currentUser) return null;

  const selectMs = (id: string) => {
    setActiveMsId(id);
    localStorage.setItem("scriptally_active_manuscript_id", id);
    setMsMenuOpen(false);
  };

  const openNew = (kind: ComponentType) => setForm({ kind, name: "", content: "" });
  const openEdit = (v: ManuscriptVersion) => setForm({ kind: v.componentType, editing: v, name: v.versionName, content: v.contentDraft ?? "" });

  const saveForm = async () => {
    if (!form || !msId) return;
    const name = form.name.trim();
    if (!name) return;
    const content = form.content.trim();
    if (form.editing) {
      await updateVersion(form.editing.id, { versionName: name, contentDraft: content });
    } else {
      await addVersion({ manuscriptId: msId, componentType: form.kind, versionName: name, fileAttached: false, contentDraft: content });
    }
    setForm(null);
  };

  const requestDelete = (v: ManuscriptVersion) => setConfirmDel(v);
  const doDelete = async () => {
    if (!confirmDel) return;
    await deleteVersion(confirmDel.id);
    setConfirmDel(null);
  };

  // ── Library section for one component kind ──────────────────────────────────
  const renderSection = (kind: ComponentType) => {
    const meta = COMP[kind];
    const rows = msVersions.filter((v) => v.componentType === kind);
    // Rates are derived (over the manuscript's active packages + its queries). Highlight the best
    // (highest request rate) version with the component colour; the rest grey.
    const rated = rows.map((v) => ({
      v,
      usedBy: packagesUsingVersion(v.id, msPackages).length,
      rate: componentMetrics(v.id, msPackages, msQueries).requestRate,
    }));
    let bestId: string | null = null;
    let bestRate = -1;
    for (const r of rated) {
      if (r.rate !== null && r.rate > bestRate) { bestRate = r.rate; bestId = r.v.id; }
    }

    return (
      <div key={kind} style={{ marginTop: kind === LIB_KINDS[0] ? 0 : 22 }}>
        {/* section header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 11 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
            <span style={{ width: 28, height: 28, borderRadius: 8, background: meta.tile, color: meta.color, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <meta.Icon style={{ width: 15, height: 15 }} strokeWidth={2} aria-hidden="true" />
            </span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: FONT_SERIF, fontSize: 16, fontWeight: 500, color: headingInk }}>{meta.label}</div>
              <div style={{ fontFamily: FONT_MONO, fontSize: 9.5, color: mutedInk, letterSpacing: "0.04em", marginTop: 1 }}>
                {rows.length} {rows.length === 1 ? meta.noun : `${meta.noun}s`}
              </div>
            </div>
          </div>
          <button style={addBtn} onClick={() => openNew(kind)}>
            <Plus style={{ width: 11, height: 11 }} strokeWidth={2.4} aria-hidden="true" /> New {meta.noun}
          </button>
        </div>

        {/* version rows */}
        {rated.length === 0 ? (
          <div style={{ fontFamily: FONT_SERIF, fontStyle: "italic", fontSize: 13, color: mutedInk, padding: "10px 2px" }}>
            No {meta.noun}s yet — add one to build packages from it.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {rated.map(({ v, usedBy, rate }) => {
              const snippet = versionSnippet(v);
              const meta2 = versionMeta(v);
              return (
                <div key={v.id} className="sp-ver" style={{ display: "flex", alignItems: "center", gap: 12, background: "#fbf6ef", border: "1px solid #e8ddcf", borderRadius: 10, padding: "11px 14px" }}>
                  <span style={{ width: 9, height: 9, borderRadius: "50%", background: v.id === bestId ? meta.color : GREY_DOT, flexShrink: 0 }} aria-hidden="true" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: FONT_SANS, fontSize: 13.5, fontWeight: 500, color: bodyInk }}>{v.versionName}</div>
                    {(snippet || meta2) && (
                      <div style={{ fontFamily: FONT_SANS, fontSize: 11.5, fontStyle: snippet ? "italic" : "normal", fontWeight: 300, color: "#8a7a6c", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {snippet ?? meta2}
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0, fontFamily: FONT_MONO, fontSize: 9.5, color: mutedInk, letterSpacing: "0.03em" }}>
                    {snippet && meta2 ? <span>{meta2}</span> : null}
                    <div>
                      in {usedBy} package{usedBy === 1 ? "" : "s"} · <span style={{ color: burgundy, fontWeight: 500 }}>{formatRate(rate)} req</span>
                    </div>
                  </div>
                  <div className="sp-row-actions" style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                    <button className="sp-icon-btn" title="Edit" aria-label={`Edit ${v.versionName}`} onClick={() => openEdit(v)} style={{ background: "transparent", border: "none", cursor: "pointer", color: mutedInk, padding: 5, display: "inline-flex", borderRadius: 6 }}>
                      <Pencil style={{ width: 14, height: 14 }} strokeWidth={2} aria-hidden="true" />
                    </button>
                    <button className="sp-icon-btn" title="Delete" aria-label={`Delete ${v.versionName}`} onClick={() => requestDelete(v)} style={{ background: "transparent", border: "none", cursor: "pointer", color: mutedInk, padding: 5, display: "inline-flex", borderRadius: 6 }}>
                      <Trash2 style={{ width: 14, height: 14 }} strokeWidth={2} aria-hidden="true" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const placeholder = (label: string) => (
    <MountPanel>
      <BandHeader title={label} Icon={TABS.find((t) => t.label === label)?.Icon ?? Layers} />
      <div style={{ padding: "22px", fontFamily: FONT_SERIF, fontStyle: "italic", fontSize: 14, color: mutedInk }}>
        This tab arrives in the next checkpoint.
      </div>
    </MountPanel>
  );

  return (
    <div className="min-h-screen pb-20 font-sans" style={{ background: pageGround, color: bodyInk }}>
      <div aria-hidden="true" style={{ position: "fixed", inset: 0, opacity: 0.25, pointerEvents: "none", zIndex: 0, backgroundImage: PAGE_GRAIN }} />

      <style>{`
        .sp-tab { transition: color .18s; }
        .sp-tab:hover { color: ${burgundy}; }
        .sp-icon-btn:hover { color: ${burgundy}; background: rgba(124,58,42,0.06); }
        .sp-ver:hover { border-color: #ddcdba; }
      `}</style>

      <div className="relative" style={{ zIndex: 1, maxWidth: 1000, margin: "0 auto", padding: "40px 20px 0" }}>
        {/* ── Header ── */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 20, flexWrap: "wrap", marginBottom: 6 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <h1 style={{ fontFamily: FONT_SERIF, fontSize: 28, fontWeight: 500, color: bodyInk, margin: 0 }}>Submission Packages</h1>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontFamily: FONT_MONO, fontSize: 9, fontWeight: 500, letterSpacing: "0.12em", color: burgundy, background: buttonPinkBg, border: `0.5px solid ${buttonPinkBorder}`, borderRadius: 20, padding: "4px 9px 3px" }}>
                <Lock style={{ width: 9, height: 9 }} strokeWidth={2.4} aria-hidden="true" />
                PRO
              </span>
            </div>
            <div style={{ fontFamily: FONT_MONO, fontSize: 10.5, letterSpacing: "0.1em", textTransform: "uppercase", color: sageText }}>
              Build · attach · learn what wins requests
            </div>
          </div>

          {/* manuscript selector */}
          {activeMs && (
            <div ref={msMenuRef} style={{ position: "relative" }}>
              <button
                onClick={() => setMsMenuOpen((o) => !o)}
                aria-haspopup="listbox"
                aria-expanded={msMenuOpen}
                style={{ display: "inline-flex", alignItems: "center", gap: 8, background: parchment, border: `1px solid ${ghostButtonBorder}`, borderRadius: 10, padding: "9px 13px", fontFamily: FONT_SANS, fontSize: 13, color: bodyInk, cursor: "pointer", boxShadow: "0 1px 2px rgba(58,28,20,0.05)", maxWidth: 320 }}
              >
                <span style={{ fontFamily: FONT_MONO, fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase", color: labelColor }}>Manuscript</span>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{activeMs.title}</span>
                <ChevronDown style={{ width: 13, height: 13, color: burgundy, flexShrink: 0 }} strokeWidth={2.2} aria-hidden="true" />
              </button>
              {msMenuOpen && (
                <div role="listbox" style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, minWidth: 240, maxWidth: 340, background: parchment, border: `1px solid ${ghostButtonBorder}`, borderRadius: 10, boxShadow: "0 8px 24px rgba(58,28,20,0.16)", padding: 5, zIndex: 30, maxHeight: 320, overflowY: "auto" }}>
                  {manuscripts.map((m) => (
                    <div
                      key={m.id}
                      role="option"
                      aria-selected={m.id === activeMs.id}
                      onClick={() => selectMs(m.id)}
                      style={{ padding: "9px 11px", borderRadius: 7, fontFamily: FONT_SANS, fontSize: 13, color: m.id === activeMs.id ? burgundy : bodyInk, background: m.id === activeMs.id ? "#f5e2da" : "transparent", cursor: "pointer", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                    >
                      {m.title}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Tabs ── */}
        <div style={{ display: "flex", gap: 4, margin: "18px 0 22px", borderBottom: "1px solid rgba(124,58,42,0.16)" }}>
          {TABS.map((t) => {
            const active = t.key === tab;
            return (
              <button
                key={t.key}
                className="sp-tab"
                onClick={() => setTab(t.key)}
                aria-current={active ? "page" : undefined}
                style={{ position: "relative", display: "flex", alignItems: "center", gap: 7, background: "none", border: "none", padding: "11px 16px", cursor: "pointer", fontFamily: FONT_MONO, fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: active ? 500 : 400, color: active ? burgundy : "#9c8878" }}
              >
                <t.Icon style={{ width: 14, height: 14 }} strokeWidth={2} aria-hidden="true" />
                {t.label}
                {active && <span aria-hidden="true" style={{ position: "absolute", left: 10, right: 10, bottom: -1, height: 2, background: burgundy, borderRadius: 2 }} />}
              </button>
            );
          })}
        </div>

        {/* ── Tab content ── */}
        {!activeMs ? (
          <MountPanel>
            <BandHeader title="No manuscripts yet" Icon={Layers} />
            <div style={{ padding: 22, fontFamily: FONT_SERIF, fontStyle: "italic", fontSize: 14, color: mutedInk }}>
              Add a manuscript from the Manuscripts list first — packages are built per manuscript.
            </div>
          </MountPanel>
        ) : tab === "lib" ? (
          <MountPanel>
            <BandHeader title="Materials library" meta="every version of every component — the building blocks for packages" Icon={Layers} />
            <div style={{ padding: "20px 22px 22px" }}>{LIB_KINDS.map(renderSection)}</div>
          </MountPanel>
        ) : tab === "perf" ? (
          placeholder("Performance")
        ) : tab === "pkgs" ? (
          placeholder("Packages")
        ) : (
          placeholder("In the query log")
        )}
      </div>

      {/* ── New / edit version form ── */}
      {form && (
        <Modal onClose={() => setForm(null)} labelledBy="sp-form-title">
          <BandHeader title={`${form.editing ? "Edit" : "New"} ${COMP[form.kind].label.replace(/s$/, "").toLowerCase()} ${COMP[form.kind].noun}`} Icon={COMP[form.kind].Icon} />
          <div style={{ padding: 20 }}>
            <span id="sp-form-title" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>
              {form.editing ? "Edit" : "New"} {COMP[form.kind].noun}
            </span>
            <label htmlFor="sp-name" style={labelStyle}>Name</label>
            <input
              id="sp-name"
              autoFocus
              value={form.name}
              maxLength={120}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder={`e.g. ${form.kind === ComponentType.QUERY_LETTER ? "Comp-led" : form.kind === ComponentType.SYNOPSIS ? "Two-page detailed" : "First 3 chapters"}`}
              style={inputStyle}
            />
            <label htmlFor="sp-content" style={{ ...labelStyle, marginTop: 16 }}>Content <span style={{ textTransform: "none", letterSpacing: 0, color: mutedInk }}>(optional — used for the preview & word count)</span></label>
            <textarea
              id="sp-content"
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              rows={5}
              placeholder="Paste or draft the text…"
              style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 9, marginTop: 18 }}>
              <button style={ghostBtn} onClick={() => setForm(null)}>Cancel</button>
              <button style={{ ...addBtn, padding: "10px 18px", opacity: form.name.trim() ? 1 : 0.45, cursor: form.name.trim() ? "pointer" : "not-allowed" }} disabled={!form.name.trim()} onClick={saveForm}>
                {form.editing ? "Save changes" : "Create version"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Delete confirm / consequence-aware warning ── */}
      {confirmDel && (() => {
        const usedBy = packagesUsingVersion(confirmDel.id, msPackages);
        const locked = usedBy.length > 0;
        return (
          <Modal onClose={() => setConfirmDel(null)} labelledBy="sp-del-title">
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 20px", background: amberBandGradient, borderBottom: `1px solid ${amberBandRule}` }}>
              <AlertTriangle style={{ width: 18, height: 18, color: "#8a6a2e", flexShrink: 0 }} strokeWidth={2} aria-hidden="true" />
              <span id="sp-del-title" style={{ fontFamily: FONT_SERIF, fontSize: 17, fontWeight: 500, color: headingInk }}>
                {locked ? "Version in use" : "Delete version"}
              </span>
            </div>
            <div style={{ padding: 20 }}>
              {locked ? (
                <>
                  <p style={{ fontFamily: FONT_SANS, fontSize: 13.5, color: bodyInk, lineHeight: 1.55, margin: 0 }}>
                    <b style={{ color: burgundy }}>{confirmDel.versionName}</b> is used by {usedBy.length} package{usedBy.length === 1 ? "" : "s"}
                    {": "}
                    {usedBy.map((p) => p.packageName).join(", ")}. Remove it from {usedBy.length === 1 ? "that package" : "those packages"} (or retire {usedBy.length === 1 ? "it" : "them"}) before deleting, so no package is left pointing at a missing version.
                  </p>
                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 18 }}>
                    <button style={ghostBtn} onClick={() => setConfirmDel(null)}>Close</button>
                  </div>
                </>
              ) : (
                <>
                  <p style={{ fontFamily: FONT_SANS, fontSize: 13.5, color: bodyInk, lineHeight: 1.55, margin: 0 }}>
                    Delete <b style={{ color: burgundy }}>{confirmDel.versionName}</b>? This can't be undone.
                  </p>
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: 9, marginTop: 18 }}>
                    <button style={ghostBtn} onClick={() => setConfirmDel(null)}>Cancel</button>
                    <button style={{ fontFamily: FONT_MONO, fontSize: 11, letterSpacing: "0.05em", textTransform: "uppercase", color: "#fff", background: burgundy, border: "none", borderRadius: 9, padding: "10px 18px", cursor: "pointer" }} onClick={doDelete}>
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          </Modal>
        );
      })()}
    </div>
  );
};
