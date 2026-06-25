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
import { ManuscriptVersion, SubmissionPackage, ComponentType, UserPlan } from "../types";
import { MountPanel } from "./MountPanel";
import {
  versionSnippet,
  versionMeta,
  packagesUsingVersion,
  componentMetrics,
  packageMetrics,
  formatRate,
  barWidth,
  meetsSampleThreshold,
  MIN_SENDS_FOR_CLAIM,
} from "../lib/packageMetrics";
import {
  pageGround,
  PAGE_GRAIN,
  parchment,
  sageBandGradient,
  sageBandRule,
  amberBandGradient,
  amberBandRule,
  pinkBandGradient,
  pinkBandRule,
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
  GripVertical,
  Check,
  X,
  AlertTriangle,
  Trophy,
  Sun,
  PieChart,
} from "lucide-react";

const AMBER = "#b98a4e";
const GREY_DOT = "#c4b4aa";

/** Per-component-kind presentation (the three material kinds this page manages). */
const COMP: Record<string, { label: string; slotLabel: string; noun: string; Icon: React.ComponentType<any>; color: string; tile: string }> = {
  [ComponentType.QUERY_LETTER]: { label: "Query letters", slotLabel: "Query letter", noun: "version", Icon: Mail, color: burgundy, tile: "#f5e2da" },
  [ComponentType.SYNOPSIS]: { label: "Synopses", slotLabel: "Synopsis", noun: "version", Icon: FileText, color: sageText, tile: "#e9ede6" },
  [ComponentType.SAMPLE_PAGES]: { label: "Sample pages", slotLabel: "Sample pages", noun: "selection", Icon: BookOpen, color: AMBER, tile: "#f3e6cf" },
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
const BandHeader: React.FC<{ title: string; meta?: string; Icon: React.ComponentType<any>; variant?: "sage" | "amber" | "pink" }> = ({
  title,
  meta,
  Icon,
  variant = "sage",
}) => {
  const bg = variant === "amber" ? amberBandGradient : variant === "pink" ? pinkBandGradient : sageBandGradient;
  const rule = variant === "amber" ? amberBandRule : variant === "pink" ? pinkBandRule : sageBandRule;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 11,
        padding: "14px 20px",
        minHeight: 54,
        background: bg,
        borderBottom: `1px solid ${rule}`,
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

/* ── Component chip (icon + version name), used in package cards. ── */
const Chip: React.FC<{ kind: ComponentType; label: string }> = ({ kind, label }) => {
  const meta = COMP[kind];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, maxWidth: "100%", fontFamily: FONT_SANS, fontSize: 11, color: "#5a4a40", background: "#f3ece2", border: "1px solid #e4d8ca", borderRadius: 7, padding: "4px 9px" }}>
      <meta.Icon style={{ width: 11, height: 11, color: meta.color, flexShrink: 0 }} strokeWidth={2} aria-hidden="true" />
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
    </span>
  );
};

/* ── A labelled metric bar (Requests = burgundy, Responses = sage). ── */
const MetricBar: React.FC<{ label: string; rate: number | null; n: number; total: number; variant: "req" | "resp" }> = ({ label, rate, n, total, variant }) => (
  <div style={{ marginBottom: 9 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
      <span style={{ fontFamily: FONT_MONO, fontSize: 9, letterSpacing: "0.05em", textTransform: "uppercase", color: mutedInk }}>{label}</span>
      <span style={{ fontSize: 12, color: bodyInk, fontWeight: 500 }}>
        {formatRate(rate)}
        <small style={{ fontFamily: FONT_MONO, fontSize: 9.5, color: "#b3a99a", fontWeight: 400, marginLeft: 3 }}>{n} of {total}</small>
      </span>
    </div>
    <div style={{ height: 7, background: "#ece4da", borderRadius: 4, overflow: "hidden" }}>
      <div style={{ height: "100%", borderRadius: 4, width: barWidth(rate), background: variant === "req" ? burgundy : "#8a9e88" }} />
    </div>
  </div>
);

/* ── Builder slot dropdown. The menu is portalled to <body> so MountPanel's overflow:hidden frame
 *    can't clip it (a long version list or the bottom slot would otherwise be cut off). ── */
const SlotDropdown: React.FC<{
  versions: ManuscriptVersion[];
  selectedId?: string;
  rateLabel: (v: ManuscriptVersion) => string;
  newLabel: string;
  onSelect: (id: string) => void;
  onNew: () => void;
}> = ({ versions, selectedId, rateLabel, newLabel, onSelect, onNew }) => {
  const [open, setOpen] = useState(false);
  const trigRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [rect, setRect] = useState<{ top: number; left: number; width: number } | null>(null);

  const place = () => {
    const el = trigRef.current;
    if (el) { const r = el.getBoundingClientRect(); setRect({ top: r.bottom + 6, left: r.left, width: r.width }); }
  };
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (trigRef.current?.contains(e.target as Node) || menuRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    const reflow = () => place();
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", reflow, true);
    window.addEventListener("resize", reflow);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", reflow, true);
      window.removeEventListener("resize", reflow);
    };
  }, [open]);

  const selected = versions.find((v) => v.id === selectedId);
  return (
    <>
      <button
        ref={trigRef}
        type="button"
        onClick={() => { if (!open) place(); setOpen((o) => !o); }}
        aria-haspopup="listbox"
        aria-expanded={open}
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, width: "100%", cursor: "pointer", background: "transparent", border: "none", padding: 0, fontFamily: FONT_SANS, fontSize: 13.5, color: selected ? bodyInk : "#c8b8a8", textAlign: "left" }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{selected ? selected.versionName : "Choose a version…"}</span>
        <ChevronDown style={{ width: 13, height: 13, color: burgundy, flexShrink: 0, transform: open ? "rotate(180deg)" : "none", transition: "transform .2s" }} strokeWidth={2.2} aria-hidden="true" />
      </button>
      {open && rect && createPortal(
        <div ref={menuRef} role="listbox" style={{ position: "fixed", top: rect.top, left: rect.left, minWidth: Math.max(rect.width, 220), background: parchment, border: `1px solid ${ghostButtonBorder}`, borderRadius: 10, boxShadow: "0 8px 24px rgba(58,28,20,0.16)", padding: 5, zIndex: 130, maxHeight: 280, overflowY: "auto" }}>
          {versions.length === 0 && (
            <div style={{ padding: "9px 11px", fontFamily: FONT_SANS, fontSize: 12.5, fontStyle: "italic", color: mutedInk }}>No versions yet.</div>
          )}
          {versions.map((v) => (
            <div
              key={v.id}
              role="option"
              aria-selected={v.id === selectedId}
              onClick={() => { onSelect(v.id); setOpen(false); }}
              className="sp-dd-opt"
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, padding: "9px 11px", borderRadius: 7, fontFamily: FONT_SANS, fontSize: 13, color: v.id === selectedId ? burgundy : bodyInk, background: v.id === selectedId ? "#f5e2da" : "transparent", cursor: "pointer" }}
            >
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.versionName}</span>
              <small style={{ fontFamily: FONT_MONO, fontSize: 9, color: mutedInk, flexShrink: 0 }}>{rateLabel(v)}</small>
            </div>
          ))}
          <div
            role="option"
            onClick={() => { onNew(); setOpen(false); }}
            className="sp-dd-opt"
            style={{ padding: "10px 11px", marginTop: 3, borderTop: "1px solid rgba(124,58,42,0.1)", fontFamily: FONT_SANS, fontSize: 13, fontWeight: 500, color: burgundy, cursor: "pointer" }}
          >
            {newLabel}
          </div>
        </div>,
        document.body,
      )}
    </>
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
  const { currentUser, manuscripts, versions, packages, queries, addVersion, updateVersion, deleteVersion, addPackage, updatePackage } = useScriptAllyDb();
  const isPro = currentUser?.plan === UserPlan.PRO;

  const [activeMsId, setActiveMsId] = useState<string | null>(() =>
    typeof window !== "undefined" ? localStorage.getItem("scriptally_active_manuscript_id") : null,
  );
  // Redesign: two top-level views behind a centred Packages / Materials pill (was: 4 tabs).
  const [view, setView] = useState<"packages" | "materials">("packages");
  const [msMenuOpen, setMsMenuOpen] = useState(false);
  const [form, setForm] = useState<FormState | null>(null);
  const [confirmDel, setConfirmDel] = useState<ManuscriptVersion | null>(null);
  const msMenuRef = useRef<HTMLDivElement>(null);

  // Package builder state
  const [pkgName, setPkgName] = useState("");
  const [sel, setSel] = useState<Record<string, string>>({}); // keyed by ComponentType → versionId
  const [editingPkgId, setEditingPkgId] = useState<string | null>(null);
  const [pkgError, setPkgError] = useState<string | null>(null);

  // "In the query log" tab — static illustration only (not wired to the real log form; that's Prompt 2)
  const [logTier, setLogTier] = useState<"free" | "pro">("free");
  const [logPopOpen, setLogPopOpen] = useState(false);

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

  const resetBuilder = () => { setPkgName(""); setSel({}); setEditingPkgId(null); setPkgError(null); };
  const editPkg = (p: SubmissionPackage) => {
    setEditingPkgId(p.id);
    setPkgName(p.packageName);
    setSel({
      [ComponentType.QUERY_LETTER]: p.queryLetterVersionId,
      [ComponentType.SYNOPSIS]: p.synopsisVersionId,
      [ComponentType.SAMPLE_PAGES]: p.samplePagesVersionId,
    });
    setPkgError(null);
    setView("packages");
  };
  const createOrSave = async () => {
    const ql = sel[ComponentType.QUERY_LETTER];
    const sy = sel[ComponentType.SYNOPSIS];
    const pg = sel[ComponentType.SAMPLE_PAGES];
    if (!msId || !pkgName.trim() || !ql || !sy || !pg) return;
    const fields = { packageName: pkgName.trim(), queryLetterVersionId: ql, synopsisVersionId: sy, samplePagesVersionId: pg };
    if (editingPkgId) {
      await updatePackage(editingPkgId, fields);
      resetBuilder();
    } else {
      const r = await addPackage({ manuscriptId: msId, ...fields });
      if (!r.success) { setPkgError(r.error ?? "Couldn't create the package. Please try again."); return; }
      resetBuilder();
    }
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
      cm: componentMetrics(v.id, msPackages, msQueries),
    }));
    // best = highest request rate among QUALIFIED versions (≥ MIN_SENDS_FOR_CLAIM); a lucky 1-of-1 isn't crowned
    let bestId: string | null = null;
    let bestRate = -1;
    for (const r of rated) {
      if (meetsSampleThreshold(r.cm.sent) && r.cm.requestRate !== null && r.cm.requestRate > bestRate) {
        bestRate = r.cm.requestRate;
        bestId = r.v.id;
      }
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
            {rated.map(({ v, usedBy, cm }) => {
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
                      in {usedBy} package{usedBy === 1 ? "" : "s"} ·{" "}
                      {cm.sent === 0 ? (
                        <span>— req</span>
                      ) : (
                        <span>
                          {/* below the sample threshold → muted, not the confident burgundy; count always shown */}
                          <span style={{ color: meetsSampleThreshold(cm.sent) ? burgundy : mutedInk, fontWeight: 500 }}>{formatRate(cm.requestRate)} req</span>
                          <span style={{ color: "#b3a99a", fontWeight: 400 }}> {cm.requests}/{cm.sent}</span>
                        </span>
                      )}
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

  // ── Packages tab: builder + your-packages list ──────────────────────────────
  const renderPackages = () => {
    const rateLabelFor = (v: ManuscriptVersion) => {
      const cm = componentMetrics(v.id, msPackages, msQueries);
      // always show the count so a 1-of-1 reads as "100% req · 1/1", never a bare "100% req"
      return cm.sent === 0 ? "no sends yet" : `${formatRate(cm.requestRate)} req · ${cm.requests}/${cm.sent}`;
    };
    const ql = sel[ComponentType.QUERY_LETTER];
    const sy = sel[ComponentType.SYNOPSIS];
    const pg = sel[ComponentType.SAMPLE_PAGES];
    const canSave = !!(pkgName.trim() && ql && sy && pg);
    const verName = (id: string) => msVersions.find((v) => v.id === id)?.versionName ?? "—";

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Builder */}
        <MountPanel>
          <BandHeader title={editingPkgId ? "Edit package" : "Build a package"} meta="name it, pick one of each — reuse across as many queries as you like" Icon={Plus} />
          <div style={{ padding: "20px 22px 22px", display: "flex", flexDirection: "column", gap: 12 }}>
            <input value={pkgName} maxLength={120} onChange={(e) => setPkgName(e.target.value)} placeholder={'Package name — e.g. "Comp-heavy", "Standard sub"'} style={inputStyle} />
            {LIB_KINDS.map((kind) => {
              const m = COMP[kind];
              const kindVersions = msVersions.filter((v) => v.componentType === kind);
              return (
                <div key={kind} style={{ display: "flex", alignItems: "center", gap: 11, background: "#fbf6ef", border: "1px solid #e8ddcf", borderRadius: 10, padding: "11px 12px" }}>
                  <span title="Drag to reorder (coming soon)" style={{ color: "#cbbcae", display: "inline-flex", cursor: "grab", flexShrink: 0 }}>
                    <GripVertical style={{ width: 14, height: 14 }} aria-hidden="true" />
                  </span>
                  <span style={{ width: 30, height: 30, borderRadius: 8, background: m.tile, color: m.color, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <m.Icon style={{ width: 15, height: 15 }} strokeWidth={2} aria-hidden="true" />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: FONT_MONO, fontSize: 9, letterSpacing: "0.06em", textTransform: "uppercase", color: mutedInk, marginBottom: 2 }}>{m.slotLabel}</div>
                    <SlotDropdown
                      versions={kindVersions}
                      selectedId={sel[kind]}
                      rateLabel={rateLabelFor}
                      newLabel={`+ New ${m.noun}`}
                      onSelect={(id) => setSel((s) => ({ ...s, [kind]: id }))}
                      onNew={() => openNew(kind)}
                    />
                  </div>
                </div>
              );
            })}
            {pkgError && <div style={{ fontFamily: FONT_SANS, fontSize: 12.5, color: "#A32D2D" }}>{pkgError}</div>}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 9, marginTop: 4 }}>
              {editingPkgId && <button style={ghostBtn} onClick={resetBuilder}>Cancel edit</button>}
              <button style={{ ...addBtn, padding: "11px 22px", opacity: canSave ? 1 : 0.45, cursor: canSave ? "pointer" : "not-allowed" }} disabled={!canSave} onClick={createOrSave}>
                <Check style={{ width: 12, height: 12 }} strokeWidth={2.4} aria-hidden="true" /> {editingPkgId ? "Save changes" : "Create package"}
              </button>
            </div>
          </div>
        </MountPanel>

        {/* Your packages */}
        <MountPanel>
          <BandHeader title="Your packages" meta={`${msPackages.length} package${msPackages.length === 1 ? "" : "s"} on this manuscript`} Icon={Package} />
          <div style={{ padding: "20px 22px 22px" }}>
            {msPackages.length === 0 ? (
              <div style={{ fontFamily: FONT_SERIF, fontStyle: "italic", fontSize: 13.5, color: mutedInk }}>No packages yet — build one above to reuse across your queries.</div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
                {msPackages.map((p) => {
                  const m = packageMetrics(p.id, msQueries);
                  return (
                    <div key={p.id} style={{ background: "#fbf6ef", border: "1px solid #e8ddcf", borderRadius: 11, padding: "14px 15px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, gap: 8 }}>
                        <span style={{ fontFamily: FONT_SERIF, fontSize: 16, fontWeight: 500, color: headingInk, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.packageName}</span>
                        <button onClick={() => editPkg(p)} className="sp-icon-btn" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontFamily: FONT_MONO, fontSize: 9, letterSpacing: "0.05em", textTransform: "uppercase", color: mutedInk, background: "transparent", border: "none", cursor: "pointer", padding: "3px 5px", borderRadius: 6, flexShrink: 0 }}>
                          <Pencil style={{ width: 11, height: 11 }} strokeWidth={2} aria-hidden="true" /> Edit
                        </button>
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        <Chip kind={ComponentType.QUERY_LETTER} label={verName(p.queryLetterVersionId)} />
                        <Chip kind={ComponentType.SYNOPSIS} label={verName(p.synopsisVersionId)} />
                        <Chip kind={ComponentType.SAMPLE_PAGES} label={verName(p.samplePagesVersionId)} />
                      </div>
                      <div style={{ marginTop: 11, display: "flex", gap: 16 }}>
                        <span style={{ fontFamily: FONT_MONO, fontSize: 10, color: "#6a5e54" }}>Sent <b style={{ color: burgundy, fontWeight: 500 }}>{m.sent}×</b></span>
                        <span style={{ fontFamily: FONT_MONO, fontSize: 10, color: "#6a5e54" }}>Requests <b style={{ color: burgundy, fontWeight: 500 }}>{formatRate(m.requestRate)}</b></span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </MountPanel>
      </div>
    );
  };

  // ── Performance tab: what's working + leaderboard + component attribution ────
  // Every "best"/crown/insight is gated behind meetsSampleThreshold (≥ MIN_SENDS_FOR_CLAIM sends)
  // so a lucky 1-of-1 can't read as 100% and crown itself; rates always show, the crown is withheld.
  const renderPerformance = () => {
    const LAG_NOUN: Record<string, string> = {
      [ComponentType.QUERY_LETTER]: "letter",
      [ComponentType.SYNOPSIS]: "synopsis",
      [ComponentType.SAMPLE_PAGES]: "sample pages",
    };

    const ranked = msPackages.map((p) => ({ p, m: packageMetrics(p.id, msQueries) }));
    const totalSent = ranked.reduce((s, r) => s + r.m.sent, 0);

    // Qualified packages first (request rate desc, then sends), sub-threshold packages held back.
    const sorted = [...ranked].sort((a, b) => {
      const qa = meetsSampleThreshold(a.m.sent), qb = meetsSampleThreshold(b.m.sent);
      if (qa !== qb) return qa ? -1 : 1;
      const ra = a.m.requestRate ?? -1, rb = b.m.requestRate ?? -1;
      if (rb !== ra) return rb - ra;
      return b.m.sent - a.m.sent;
    });
    const topQualified = sorted.find((r) => meetsSampleThreshold(r.m.sent) && r.m.requestRate !== null) || null;

    // Component attribution: versions that have been sent, per kind; best = highest-rate QUALIFIED one.
    const attribution = LIB_KINDS.map((kind) => {
      const items = msVersions
        .filter((v) => v.componentType === kind)
        .map((v) => ({ v, m: componentMetrics(v.id, msPackages, msQueries) }))
        .filter((x) => x.m.sent > 0)
        .sort((a, b) => {
          // qualified versions first (so a lucky 1-send 100% never sits above a trustworthy rate), then rate desc
          const qa = meetsSampleThreshold(a.m.sent), qb = meetsSampleThreshold(b.m.sent);
          if (qa !== qb) return qa ? -1 : 1;
          return (b.m.requestRate ?? -1) - (a.m.requestRate ?? -1);
        });
      const best = items.find((x) => meetsSampleThreshold(x.m.sent) && x.m.requestRate !== null) || null;
      return { kind, items, bestId: best ? best.v.id : null };
    });
    const bestName = (kind: ComponentType) => {
      const col = attribution.find((a) => a.kind === kind);
      return col && col.bestId ? col.items.find((i) => i.v.id === col.bestId)?.v.versionName ?? null : null;
    };
    const qualComponents = attribution.flatMap((a) =>
      a.items.filter((i) => meetsSampleThreshold(i.m.sent) && i.m.requestRate !== null).map((i) => ({ ...i, kind: a.kind })),
    );
    const laggard = qualComponents.length >= 2 ? [...qualComponents].sort((x, y) => x.m.requestRate! - y.m.requestRate!)[0] : null;

    const whatsWorkingHead = <BandHeader title="What's working" meta="your querying strategy, derived from real outcomes" Icon={Sun} variant="amber" />;
    const bld = (t: string) => <b style={{ color: burgundy, fontWeight: 500 }}>{t}</b>;

    let whatsWorking: React.ReactNode;
    if (msPackages.length === 0 || totalSent === 0) {
      whatsWorking = (
        <MountPanel>
          {whatsWorkingHead}
          <div style={{ padding: 22, fontFamily: FONT_SERIF, fontStyle: "italic", fontSize: 14, color: mutedInk, lineHeight: 1.5 }}>
            Attach packages to your queries to start learning what works — once outcomes come in, your sharpest combination surfaces here.
          </div>
        </MountPanel>
      );
    } else if (!topQualified) {
      whatsWorking = (
        <MountPanel>
          {whatsWorkingHead}
          <div style={{ padding: 22, fontFamily: FONT_SANS, fontSize: 13.5, color: bodyInk, lineHeight: 1.55 }}>
            You've linked {totalSent} quer{totalSent === 1 ? "y" : "ies"} to packages so far. Once a package reaches {MIN_SENDS_FOR_CLAIM} sends, the strongest combination — and the letter or synopsis doing the work — will surface here. Too early to crown a winner yet.
          </div>
        </MountPanel>
      );
    } else {
      const top = topQualified;
      const bestQL = bestName(ComponentType.QUERY_LETTER);
      const bestSy = bestName(ComponentType.SYNOPSIS);
      whatsWorking = (
        <MountPanel>
          {whatsWorkingHead}
          <div style={{ padding: "20px 22px 22px" }}>
            <div className="sp-strat" style={{ display: "flex", gap: 20, alignItems: "center" }}>
              <div style={{ fontFamily: "'Caveat', cursive", fontSize: 27, lineHeight: 1.12, color: burgundy, flexShrink: 0, maxWidth: 215 }}>
                Lead with <b style={{ color: sageText, fontWeight: 600 }}>{top.p.packageName}</b> — it's your sharpest package.
              </div>
              <div className="sp-strat-div" style={{ width: 1, alignSelf: "stretch", background: "rgba(124,58,42,0.14)" }} aria-hidden="true" />
              <div style={{ fontFamily: FONT_SANS, fontSize: 13.5, color: "#4a3e34", lineHeight: 1.55 }}>
                {bld(top.p.packageName)} earns a request from {bld(formatRate(top.m.requestRate))} of agents, across {top.m.sent} sends.
                {bestQL && bestSy && <> The lift is coming from your {bld(bestQL)} letter and {bld(bestSy)} synopsis — both ahead of the alternatives.</>}
                {laggard && laggard.m.requestRate! < top.m.requestRate! && <> Your {bld(laggard.v.versionName)} {LAG_NOUN[laggard.kind]} is lagging at {bld(formatRate(laggard.m.requestRate))}; worth a rethink.</>}{" "}
                None of this shows up in a notes field — it's here because every send is tied to the exact materials behind it.
              </div>
            </div>
          </div>
        </MountPanel>
      );
    }

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {whatsWorking}

        {/* Package leaderboard */}
        <MountPanel>
          <BandHeader title="Package leaderboard" meta={`${msPackages.length} package${msPackages.length === 1 ? "" : "s"} · ${totalSent} quer${totalSent === 1 ? "y" : "ies"} sent · sorted by request rate`} Icon={Trophy} />
          <div style={{ padding: "8px 22px 18px" }}>
            {msPackages.length === 0 ? (
              <div style={{ fontFamily: FONT_SERIF, fontStyle: "italic", fontSize: 13.5, color: mutedInk, padding: "12px 0" }}>No packages yet — build one to start tracking what wins requests.</div>
            ) : (
              sorted.map(({ p, m }, i) => {
                const early = !meetsSampleThreshold(m.sent);
                const isTop = !!topQualified && p.id === topQualified.p.id && sorted.length >= 2;
                return (
                  <div key={p.id} className="sp-pkg-row" style={{ display: "grid", gridTemplateColumns: "1fr 230px", gap: 18, alignItems: "center", padding: "16px 2px", borderTop: i === 0 ? "none" : "1px solid rgba(124,58,42,0.1)" }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 8, flexWrap: "wrap" }}>
                        <span style={{ fontFamily: FONT_SERIF, fontSize: 17, fontWeight: 500, color: headingInk }}>{p.packageName}</span>
                        {isTop && <span style={{ fontFamily: FONT_MONO, fontSize: 8.5, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: "#8a6a2e", background: "#f3e6cf", border: "0.5px solid #e3cda0", borderRadius: 20, padding: "3px 8px" }}>Top performer</span>}
                        {early && <span style={{ fontFamily: FONT_MONO, fontSize: 8.5, letterSpacing: "0.06em", textTransform: "uppercase", color: "#9c8878", background: "#f1ece3", borderRadius: 20, padding: "3px 8px" }}>early</span>}
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        <Chip kind={ComponentType.QUERY_LETTER} label={msVersions.find((v) => v.id === p.queryLetterVersionId)?.versionName ?? "—"} />
                        <Chip kind={ComponentType.SYNOPSIS} label={msVersions.find((v) => v.id === p.synopsisVersionId)?.versionName ?? "—"} />
                        <Chip kind={ComponentType.SAMPLE_PAGES} label={msVersions.find((v) => v.id === p.samplePagesVersionId)?.versionName ?? "—"} />
                      </div>
                      <div style={{ fontFamily: FONT_MONO, fontSize: 9.5, letterSpacing: "0.04em", textTransform: "uppercase", color: mutedInk, marginTop: 9 }}>
                        {m.sent === 0 ? "Not sent yet" : `Sent ${m.sent} time${m.sent === 1 ? "" : "s"}`}
                      </div>
                    </div>
                    <div>
                      <MetricBar label="Requests" rate={m.requestRate} n={m.requests} total={m.sent} variant="req" />
                      <MetricBar label="Responses" rate={m.responseRate} n={m.responses} total={m.sent} variant="resp" />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </MountPanel>

        {/* Component attribution */}
        <MountPanel>
          <BandHeader title="Component attribution" meta="request rate by individual version — where the credit really sits" Icon={PieChart} />
          <div style={{ padding: "20px 22px 22px" }}>
            <div className="sp-attr-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
              {attribution.map(({ kind, items, bestId }) => {
                const m = COMP[kind];
                return (
                  <div key={kind} style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: FONT_MONO, fontSize: 9.5, letterSpacing: "0.08em", textTransform: "uppercase", color: sageText, marginBottom: 11 }}>
                      <m.Icon style={{ width: 13, height: 13, color: m.color }} strokeWidth={2} aria-hidden="true" />
                      {m.label}
                    </div>
                    {items.length === 0 ? (
                      <div style={{ fontFamily: FONT_SANS, fontSize: 11.5, fontStyle: "italic", color: mutedInk }}>No sends yet.</div>
                    ) : (
                      items.map(({ v, m: vm }) => {
                        const best = v.id === bestId;
                        return (
                          <div key={v.id} style={{ marginBottom: 13 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, marginBottom: 4 }}>
                              <span style={{ fontSize: 12.5, lineHeight: 1.2, color: best ? burgundy : bodyInk, fontWeight: best ? 500 : 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.versionName}</span>
                              <span style={{ fontFamily: FONT_MONO, fontSize: 11, color: burgundy, fontWeight: 500, flexShrink: 0 }}>
                                {formatRate(vm.requestRate)}<small style={{ color: "#b3a99a", fontWeight: 400, fontSize: 9, marginLeft: 2 }}>{vm.requests}/{vm.sent}</small>
                              </span>
                            </div>
                            <div style={{ height: 6, background: "#ece4da", borderRadius: 3, overflow: "hidden" }}>
                              <div style={{ height: "100%", borderRadius: 3, width: barWidth(vm.requestRate), background: best ? burgundy : "#cdb6ad" }} />
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </MountPanel>
      </div>
    );
  };

  // ── "In the query log" tab — a STATIC illustration of how the materials field will look once
  //    Prompt 2 lands. Nothing here writes to the real log form; the toggle + popover are demo-only.
  const renderLog = () => {
    const fld: React.CSSProperties = { ...inputStyle, cursor: "default" };
    const demoNote = (text: string) => (
      <div style={{ fontFamily: FONT_MONO, fontSize: 9.5, color: mutedInk, letterSpacing: "0.03em", marginTop: 14, paddingTop: 13, borderTop: "1px dashed rgba(124,58,42,0.18)", lineHeight: 1.5 }}>{text}</div>
    );
    return (
      <MountPanel>
        <BandHeader title="How it appears when logging a query" meta="the materials field — free path stays untouched" Icon={Send} />
        <div style={{ padding: "20px 22px 22px" }}>
          <div style={{ fontFamily: FONT_MONO, fontSize: 9, letterSpacing: "0.07em", textTransform: "uppercase", color: "#9c8878", background: "rgba(124,58,42,0.045)", border: "0.5px solid rgba(124,58,42,0.14)", borderRadius: 8, padding: "7px 11px", marginBottom: 18 }}>
            Preview only — illustration of the log form; not wired here (Prompt 2 wires the real form)
          </div>

          {/* Free / Pro toggle */}
          <div style={{ display: "inline-flex", background: "#ece4da", borderRadius: 9, padding: 3, gap: 3, marginBottom: 20 }}>
            {(["free", "pro"] as const).map((t) => (
              <button key={t} onClick={() => setLogTier(t)} style={{ fontFamily: FONT_MONO, fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase", border: "none", padding: "8px 16px", borderRadius: 7, cursor: "pointer", fontWeight: logTier === t ? 500 : 400, background: logTier === t ? parchment : "transparent", color: logTier === t ? burgundy : "#9c8878", boxShadow: logTier === t ? "0 1px 3px rgba(58,28,20,0.08)" : "none" }}>
                {t === "free" ? "Free user" : "Pro user"}
              </button>
            ))}
          </div>

          {logTier === "free" ? (
            <div>
              <label style={labelStyle}>Materials sent</label>
              <input readOnly value="Query letter + first 10 pages" style={fld} aria-label="Materials sent (preview)" />
              <div>
                <button onClick={() => setLogPopOpen(true)} style={{ marginTop: 9, display: "inline-flex", alignItems: "center", gap: 7, fontFamily: FONT_MONO, fontSize: 10.5, letterSpacing: "0.03em", color: "#9c8878", background: "transparent", border: "none", padding: "2px 0", cursor: "pointer" }}>
                  <Lock style={{ width: 12, height: 12, color: AMBER }} strokeWidth={2.2} aria-hidden="true" /> Attach a package · Pro
                </button>
              </div>
              {demoNote("The text field is the whole free experience — primary, never disabled. The package link is quiet scenery; tapping it explains the feature rather than blocking anything.")}
            </div>
          ) : (
            <div>
              <label style={labelStyle}>Materials sent</label>
              <input readOnly value="" placeholder="Type what you sent, or attach a package below" style={fld} aria-label="Materials sent (preview)" />
              <div>
                <span style={{ marginTop: 9, display: "inline-flex", alignItems: "center", gap: 7, fontFamily: FONT_MONO, fontSize: 10.5, letterSpacing: "0.03em", color: burgundy }}>
                  <Package style={{ width: 12, height: 12, color: burgundy }} strokeWidth={2.2} aria-hidden="true" /> Attach a package
                </span>
              </div>
              <div style={{ marginTop: 11, background: "#fbf6ef", border: `1px solid ${ghostButtonBorder}`, borderRadius: 11, padding: "12px 13px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 9 }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontFamily: FONT_SERIF, fontSize: 15, fontWeight: 500, color: headingInk }}>
                    Comp-heavy
                    <span style={{ fontFamily: FONT_MONO, fontSize: 8, letterSpacing: "0.08em", textTransform: "uppercase", color: "#8a6a2e", background: "#f3e6cf", borderRadius: 20, padding: "2px 7px" }}>attached</span>
                  </span>
                  <span style={{ fontFamily: FONT_MONO, fontSize: 9, letterSpacing: "0.04em", textTransform: "uppercase", color: "#9c8878", cursor: "default" }}>Use free text instead</span>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  <Chip kind={ComponentType.QUERY_LETTER} label="Comp-led" />
                  <Chip kind={ComponentType.SYNOPSIS} label="Two-page synopsis" />
                  <Chip kind={ComponentType.SAMPLE_PAGES} label="First 3 chapters" />
                </div>
              </div>
              {demoNote("Same field, same flow. Attaching a package records the exact components — so this query's outcome feeds the performance view automatically. Free text is still one tap away for ad-hoc sends.")}
            </div>
          )}
        </div>
      </MountPanel>
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
        .sp-dd-opt:hover { background: #f5e2da; color: ${burgundy}; }
        @media (max-width: 760px) {
          .sp-pkg-row { grid-template-columns: 1fr !important; gap: 12px !important; }
          .sp-attr-grid { grid-template-columns: 1fr !important; }
          .sp-strat { flex-direction: column !important; align-items: flex-start !important; }
          .sp-strat-div { display: none !important; }
          .sp-headrow { flex-direction: column !important; align-items: center !important; gap: 14px !important; }
        }
      `}</style>

      <div className="relative" style={{ zIndex: 1, maxWidth: 1000, margin: "0 auto", padding: "40px 20px 0" }}>
        {/* ── Header: centred "Submission Packages · PRO" eyebrow + the big Packages / Materials pill,
              with the manuscript selector floated to the right. ── */}
        <div className="sp-headrow" style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 26 }}>
          <div style={{ flex: 1, minWidth: 0 }} aria-hidden="true" />

          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, flexShrink: 0 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontFamily: FONT_MONO, fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", color: sageText }}>Submission Packages</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontFamily: FONT_MONO, fontSize: 9, fontWeight: 500, letterSpacing: "0.12em", color: burgundy, background: buttonPinkBg, border: `0.5px solid ${buttonPinkBorder}`, borderRadius: 20, padding: "3px 8px 2px" }}>
                <Lock style={{ width: 9, height: 9 }} strokeWidth={2.4} aria-hidden="true" /> PRO
              </span>
            </span>
            {/* the Packages / Materials pill */}
            <div role="tablist" aria-label="Submission packages views" style={{ display: "inline-flex", background: "#ece4da", borderRadius: 999, padding: 4, gap: 3, boxShadow: "inset 0 1px 2px rgba(58,28,20,0.06)" }}>
              {([["packages", "Packages", Package], ["materials", "Materials", Layers]] as const).map(([v, label, Icon]) => {
                const active = v === view;
                return (
                  <button
                    key={v}
                    role="tab"
                    aria-selected={active}
                    onClick={() => setView(v)}
                    style={{ display: "inline-flex", alignItems: "center", gap: 9, padding: "11px 30px", borderRadius: 999, border: "none", cursor: "pointer", fontFamily: FONT_SERIF, fontSize: 15, fontWeight: 500, color: active ? burgundy : "#9c8878", background: active ? parchment : "transparent", boxShadow: active ? "0 1px 3px rgba(58,28,20,0.12)" : "none", transition: "color .18s, background .18s" }}
                  >
                    <Icon style={{ width: 16, height: 16 }} strokeWidth={1.9} aria-hidden="true" /> {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* manuscript selector (top-right) */}
          <div style={{ flex: 1, minWidth: 0, display: "flex", justifyContent: "flex-end" }}>
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
        </div>

        {/* ── Tab content ── */}
        {!activeMs ? (
          <MountPanel>
            <BandHeader title="No manuscripts yet" Icon={Layers} />
            <div style={{ padding: 22, fontFamily: FONT_SERIF, fontStyle: "italic", fontSize: 14, color: mutedInk }}>
              Add a manuscript from the Manuscripts list first — packages are built per manuscript.
            </div>
          </MountPanel>
        ) : view === "packages" ? (
          renderPackages()
        ) : (
          <MountPanel>
            <BandHeader title="Materials library" meta="every version of every component — the building blocks for packages" Icon={Layers} />
            <div style={{ padding: "20px 22px 22px" }}>{LIB_KINDS.map(renderSection)}</div>
          </MountPanel>
        )}
      </div>

      {/* ── New / edit version form ── */}
      {form && (
        <Modal onClose={() => setForm(null)} labelledBy="sp-form-title">
          <BandHeader title={`${form.editing ? "Edit" : "New"} ${COMP[form.kind].slotLabel.toLowerCase()}`} Icon={COMP[form.kind].Icon} />
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

      {/* "In the query log" explainer popover (Free) — illustrative; pink-band MountPanel via Modal. */}
      {logPopOpen && (
        <Modal onClose={() => setLogPopOpen(false)} labelledBy="sp-pop-title">
          <BandHeader title="Submission packages" Icon={Package} variant="pink" />
          <div style={{ padding: "18px 22px 22px" }}>
            <span id="sp-pop-title" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>Submission packages</span>
            <p style={{ fontFamily: FONT_SANS, fontSize: 13.5, color: "#4a3e34", lineHeight: 1.55, margin: "0 0 13px" }}>
              Instead of typing what you sent, attach a <b style={{ color: burgundy, fontWeight: 500 }}>package</b> — a reusable combination of a query letter, synopsis and sample pages.
            </p>
            <ul style={{ listStyle: "none", margin: "0 0 18px", padding: 0, display: "flex", flexDirection: "column", gap: 7 }}>
              {["See which combination wins the most requests", "Learn which letter or synopsis is doing the work", "Let the analytics build themselves from your queries"].map((b) => (
                <li key={b} style={{ display: "flex", gap: 9, fontFamily: FONT_SANS, fontSize: 12.5, color: "#4a3e34", lineHeight: 1.4 }}>
                  <Check style={{ width: 14, height: 14, color: "#8a9e88", flexShrink: 0, marginTop: 2 }} strokeWidth={2.4} aria-hidden="true" /> {b}
                </li>
              ))}
            </ul>
            <div style={{ display: "flex", gap: 9 }}>
              <button onClick={() => setLogPopOpen(false)} style={{ ...addBtn, flex: 1, justifyContent: "center", padding: 12 }}>
                {/* TODO(Prompt 2 / plans): route to the plans page when wired from the real form */}
                Upgrade to Pro
              </button>
              <button onClick={() => setLogPopOpen(false)} style={{ ...ghostBtn, padding: "12px 16px" }}>Not now</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
