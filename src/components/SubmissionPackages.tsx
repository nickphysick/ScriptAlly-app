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
  packageFunnel,
  packageStages,
  avgReplyDays,
  resolveActivePackage,
  formatRate,
  barWidth,
  meetsSampleThreshold,
  MIN_SENDS_FOR_CLAIM,
  type PackageFunnel,
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
  Star,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Clock,
  ArrowLeftRight,
  Filter,
  AlignLeft,
  Link2,
  Paperclip,
} from "lucide-react";

/** Content-type presentation for a material version (Paste = text, Attach = file, Link). */
type ContentMode = "paste" | "attach" | "link";
const CTYPE: Record<string, { label: string; Icon: React.ComponentType<any> }> = {
  text: { label: "text", Icon: AlignLeft },
  file: { label: "file", Icon: Paperclip },
  link: { label: "link", Icon: Link2 },
};

const AMBER = "#b98a4e";
const GREY_DOT = "#c4b4aa";

/** Quiet dotted placeholders needed to fill the shelf's last grid row flush. `tiles` already counts
 *  the Build tile (the first ghost), so this returns only the extra *empty* ghosts after it. */
const ghostCount = (tiles: number, cols: number): number => (cols <= 0 ? 0 : (cols - (tiles % cols)) % cols);

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

/* ── Component chip (colour-dot + version name) — the mockup's component-identity marker
 *    (query letter = burgundy · synopsis = sage · sample pages = amber). ── */
const Chip: React.FC<{ kind: ComponentType; label: string }> = ({ kind, label }) => {
  const meta = COMP[kind];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, maxWidth: "100%", fontFamily: FONT_SANS, fontSize: 11, color: "#5a4a40", background: "#fbfdfa", border: "0.5px solid #d6e0d2", borderRadius: 7, padding: "4px 9px" }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: meta.color, flexShrink: 0 }} aria-hidden="true" />
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
    </span>
  );
};

/** Small colour-dot for a component kind (used in attribution headers + the funnel legend). */
const KindDot: React.FC<{ kind: ComponentType; size?: number }> = ({ kind, size = 7 }) => (
  <span style={{ width: size, height: size, borderRadius: "50%", background: COMP[kind].color, flexShrink: 0, display: "inline-block" }} aria-hidden="true" />
);

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
  content: string; // paste text → contentDraft
  notes: string;
  mode: ContentMode;
  link: string; // → contentLink
  selectInto?: ComponentType; // when opened from a build slot's "+ New …", auto-fill that slot on create
}

export const SubmissionPackages: React.FC = () => {
  const { currentUser, manuscripts, versions, packages, queries, addVersion, updateVersion, deleteVersion, addPackage, updatePackage, setActivePackage } = useScriptAllyDb();
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

  // Redesign: the build drawer (slide-in) + "set active on create" toggle, the per-package detail
  // screen, and the responsive column count used to fill the shelf's last row flush.
  const [buildOpen, setBuildOpen] = useState(false);
  const [setActiveOnCreate, setSetActiveOnCreate] = useState(true);
  const [detailPkgId, setDetailPkgId] = useState<string | null>(null);
  const shelfRef = useRef<HTMLDivElement>(null);
  const [shelfCols, setShelfCols] = useState(3);

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

  // Measure the shelf width → how many cards fit per row, so the dotted ghosts fill the last row flush.
  useEffect(() => {
    const el = shelfRef.current;
    if (!el) return;
    const MIN_TILE = 220, GAP = 13;
    const compute = () => setShelfCols(Math.max(1, Math.floor((el.clientWidth + GAP) / (MIN_TILE + GAP))));
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    return () => ro.disconnect();
  }, [view, detailPkgId, packages.length]);

  const activeMs = useMemo(() => manuscripts.find((m) => m.id === activeMsId) ?? manuscripts[0], [manuscripts, activeMsId]);
  const msId = activeMs?.id;

  const msVersions = useMemo(() => versions.filter((v) => v.manuscriptId === msId), [versions, msId]);
  const msPackages = useMemo(() => packages.filter((p) => p.manuscriptId === msId && p.status !== "Retired"), [packages, msId]);
  const msQueries = useMemo(() => queries.filter((q) => q.manuscriptId === msId), [queries, msId]);

  // Close the detail screen if its package is gone (deleted/retired, or the manuscript changed).
  useEffect(() => {
    if (detailPkgId && !msPackages.some((p) => p.id === detailPkgId)) setDetailPkgId(null);
  }, [detailPkgId, msPackages]);

  if (!currentUser) return null;

  const selectMs = (id: string) => {
    setActiveMsId(id);
    localStorage.setItem("scriptally_active_manuscript_id", id);
    setMsMenuOpen(false);
  };

  const openNew = (kind: ComponentType, selectInto?: ComponentType) =>
    setForm({ kind, name: "", content: "", notes: "", mode: kind === ComponentType.SAMPLE_PAGES ? "link" : "paste", link: "", selectInto });
  const openEdit = (v: ManuscriptVersion) =>
    setForm({ kind: v.componentType, editing: v, name: v.versionName, content: v.contentDraft ?? "", notes: v.notes ?? "", mode: v.contentType === "link" ? "link" : "paste", link: v.contentLink ?? "" });

  const saveForm = async () => {
    if (!form || !msId) return;
    const name = form.name.trim();
    if (!name) return;
    const notes = form.notes.trim();
    // Exactly one content source of truth: link mode keeps contentLink (clears the paste text), paste
    // mode keeps contentDraft (clears the link). Attach is disabled in v1, so mode is paste | link here.
    const payload =
      form.mode === "link"
        ? { contentType: "link" as const, contentLink: form.link.trim(), contentDraft: "" }
        : { contentType: "text" as const, contentDraft: form.content.trim(), contentLink: "" };
    if (form.editing) {
      const sends = componentMetrics(form.editing.id, msPackages, msQueries).sent;
      const contentChanged =
        (form.editing.contentType ?? "text") !== payload.contentType ||
        (form.editing.contentDraft ?? "") !== payload.contentDraft ||
        (form.editing.contentLink ?? "") !== payload.contentLink;
      if (sends > 0 && contentChanged) {
        // Locked rule: changing the CONTENT of a version that's already been sent forks a NEW version,
        // leaving the original (and the sends attributed to it) intact. Name/notes edits stay in place.
        await addVersion({ manuscriptId: msId, componentType: form.kind, versionName: name, fileAttached: false, notes, ...payload });
      } else {
        await updateVersion(form.editing.id, { versionName: name, notes, ...payload });
      }
    } else {
      const newId = await addVersion({ manuscriptId: msId, componentType: form.kind, versionName: name, fileAttached: false, notes, ...payload });
      // Wired build flow: a version created from a build-slot "+ New …" drops straight into that slot
      // (only when the kind still matches — the user may have switched the type in the editor).
      if (newId && form.selectInto && form.selectInto === form.kind) {
        const slot = form.selectInto;
        setSel((s) => ({ ...s, [slot]: newId }));
      }
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
  const openBuild = () => { resetBuilder(); setSetActiveOnCreate(true); setBuildOpen(true); };
  const closeBuild = () => { resetBuilder(); setBuildOpen(false); };
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
    setDetailPkgId(null); // leave the detail screen so the inline builder is visible in the list
    setBuildOpen(true);
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
      setBuildOpen(false);
    } else {
      const r = await addPackage({ manuscriptId: msId, ...fields });
      if (!r.success) { setPkgError(r.error ?? "Couldn't create the package. Please try again."); return; }
      // Locked decision: the user chooses active. The build toggle (default on) promotes the new
      // package; the app never auto-promotes elsewhere.
      if (setActiveOnCreate && r.id) await setActivePackage(msId, r.id);
      resetBuilder();
      setBuildOpen(false);
    }
  };

  // ── Materials library: three columns (query letters · synopses · sample pages), each a stack of
  //    version cards + a dashed "New …" tile. The mockup's reusable-building-blocks view. ──
  const renderMatColumn = (kind: ComponentType) => {
    const meta = COMP[kind];
    const rows = msVersions.filter((v) => v.componentType === kind);
    return (
      <div key={kind} style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 12 }}>
          <KindDot kind={kind} size={11} />
          <span style={{ fontFamily: FONT_SERIF, fontSize: 17, fontWeight: 500, color: headingInk }}>{meta.label}</span>
          <span style={{ marginLeft: "auto", fontFamily: FONT_MONO, fontSize: 8.5, letterSpacing: "0.05em", textTransform: "uppercase", color: mutedInk }}>{rows.length}</span>
        </div>

        {rows.map((v) => {
          const usedBy = packagesUsingVersion(v.id, msPackages).length;
          const cm = componentMetrics(v.id, msPackages, msQueries);
          const ct = CTYPE[v.contentType ?? "text"] ?? CTYPE.text;
          const note = (v.notes ?? "").trim() || versionSnippet(v) || versionMeta(v) || "No notes.";
          return (
            <div
              key={v.id}
              className="sp-mat"
              role="button"
              tabIndex={0}
              onClick={() => openEdit(v)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openEdit(v); } }}
              style={{ background: parchment, border: "1px solid rgba(124,58,42,0.14)", borderRadius: 12, padding: "13px 14px", marginBottom: 10, cursor: "pointer", transition: "border-color .14s, box-shadow .14s" }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                <span style={{ fontFamily: FONT_SERIF, fontSize: 15, fontWeight: 500, color: headingInk, lineHeight: 1.15, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.versionName}</span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontFamily: FONT_MONO, fontSize: 7.5, letterSpacing: "0.04em", textTransform: "uppercase", color: mutedInk, background: "#f3ece2", border: "0.5px solid #e4d8ca", borderRadius: 6, padding: "3px 6px", flexShrink: 0 }}>
                  <ct.Icon style={{ width: 10, height: 10 }} strokeWidth={2} aria-hidden="true" /> {ct.label}
                </span>
              </div>
              <div style={{ fontFamily: FONT_SANS, fontSize: 11.5, fontStyle: "italic", color: "#6a5e54", lineHeight: 1.45, marginTop: 8, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{note}</div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10, paddingTop: 9, borderTop: "1px solid rgba(124,58,42,0.08)" }}>
                <span style={{ fontFamily: FONT_MONO, fontSize: 8, letterSpacing: "0.03em", textTransform: "uppercase", color: mutedInk }}>In {usedBy} package{usedBy === 1 ? "" : "s"}</span>
                <span style={{ fontFamily: FONT_MONO, fontSize: 11, fontWeight: 500, color: cm.sent === 0 ? "#bdb3a4" : burgundy, fontStyle: cm.sent === 0 ? "italic" : "normal" }}>
                  {cm.sent === 0 ? "no sends" : `${formatRate(cm.requestRate)} req`}
                </span>
              </div>
            </div>
          );
        })}

        <button className="sp-add-mat" onClick={() => openNew(kind)} style={{ border: "1.5px dashed rgba(124,58,42,0.22)", borderRadius: 12, padding: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, color: "#9c8878", cursor: "pointer", background: "transparent", fontFamily: FONT_MONO, fontSize: 9.5, letterSpacing: "0.05em", textTransform: "uppercase", transition: "all .14s" }}>
          <Plus style={{ width: 14, height: 14 }} strokeWidth={2} aria-hidden="true" /> New {meta.noun}
        </button>
      </div>
    );
  };

  const renderLibrary = () => (
    <div>
      <div style={{ fontFamily: FONT_SANS, fontSize: 12.5, color: "#8a7a6c", lineHeight: 1.5, maxWidth: 620, margin: "0 auto 20px", textAlign: "center" }}>
        Your reusable building blocks. Write a query letter, a synopsis, a set of sample pages once — then mix and match them into packages. Each one's request rate is tracked wherever it's used.
      </div>
      <div className="sp-lib" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, alignItems: "start" }}>
        {LIB_KINDS.map(renderMatColumn)}
      </div>
    </div>
  );

  const verName = (id: string) => msVersions.find((v) => v.id === id)?.versionName ?? "—";

  // ── The inline package builder (header + Close · name + three pickers row · preview + set-active
  //    line · Create). Unfolds in place at the top of the Your-packages section; no drawer, no scrim. ──
  const renderBuilder = () => {
    const rateLabelFor = (v: ManuscriptVersion) => {
      const cm = componentMetrics(v.id, msPackages, msQueries);
      // always show the count so a 1-of-1 reads as "100% req · 1/1", never a bare "100% req"
      return cm.sent === 0 ? "no sends yet" : `${formatRate(cm.requestRate)} req · ${cm.requests}/${cm.sent}`;
    };
    const ql = sel[ComponentType.QUERY_LETTER];
    const sy = sel[ComponentType.SYNOPSIS];
    const pg = sel[ComponentType.SAMPLE_PAGES];
    const canSave = !!(pkgName.trim() && ql && sy && pg);
    const chosen: [ComponentType, string][] = [
      [ComponentType.QUERY_LETTER, ql],
      [ComponentType.SYNOPSIS, sy],
      [ComponentType.SAMPLE_PAGES, pg],
    ];

    return (
      <div className="sp-inline-builder" style={{ background: parchment, border: `1px solid ${ghostButtonBorder}`, borderRadius: 14, boxShadow: "0 6px 20px rgba(58,28,20,0.08)", padding: "16px 18px 18px" }}>
        {/* header row */}
        <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 14 }}>
          <span style={{ width: 3, height: 17, borderRadius: 2, background: burgundy, flexShrink: 0 }} aria-hidden="true" />
          <span style={{ fontFamily: FONT_SERIF, fontSize: 16, fontWeight: 500, color: headingInk }}>{editingPkgId ? "Edit package" : "Build a package"}</span>
          <span className="sp-build-hint" style={{ fontFamily: FONT_MONO, fontSize: 9, color: mutedInk, letterSpacing: "0.04em" }}>— name it, pick one of each</span>
          <button onClick={closeBuild} aria-label="Close builder" className="sp-icon-btn" style={{ marginLeft: "auto", background: "transparent", border: "none", cursor: "pointer", color: mutedInk, display: "inline-flex", padding: 4, borderRadius: 6, flexShrink: 0 }}>
            <X style={{ width: 16, height: 16 }} strokeWidth={2} aria-hidden="true" />
          </button>
        </div>

        {/* name + the three pickers — one row, wrapping gracefully at narrow widths */}
        <div className="sp-build-row" style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          <div style={{ flex: "1 1 180px", minWidth: 160 }}>
            <div style={{ fontFamily: FONT_MONO, fontSize: 9, letterSpacing: "0.06em", textTransform: "uppercase", color: mutedInk, marginBottom: 4 }}>Name</div>
            <input value={pkgName} maxLength={120} onChange={(e) => setPkgName(e.target.value)} placeholder={'e.g. "Comp-heavy"'} style={inputStyle} autoFocus />
          </div>
          {LIB_KINDS.map((kind) => {
            const m = COMP[kind];
            const kindVersions = msVersions.filter((v) => v.componentType === kind);
            return (
              <div key={kind} style={{ flex: "1 1 180px", minWidth: 160 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5, fontFamily: FONT_MONO, fontSize: 9, letterSpacing: "0.06em", textTransform: "uppercase", color: mutedInk, marginBottom: 4 }}>
                  <KindDot kind={kind} size={6} /> {m.slotLabel}
                </div>
                <div style={{ background: "#fbf6ef", border: "1px solid #e8ddcf", borderRadius: 10, padding: "11px 12px" }}>
                  <SlotDropdown
                    versions={kindVersions}
                    selectedId={sel[kind]}
                    rateLabel={rateLabelFor}
                    newLabel={`+ New ${m.noun}`}
                    onSelect={(id) => setSel((s) => ({ ...s, [kind]: id }))}
                    onNew={() => openNew(kind, kind)}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* second line: live preview + the set-active toggle */}
        <div className="sp-build-row2" style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 12, alignItems: "stretch" }}>
          <div style={{ flex: "2 1 280px", minWidth: 220, background: "#f7f1e8", border: "1px dashed #e0d2c0", borderRadius: 10, padding: "11px 13px", display: "flex", alignItems: "center", gap: 12, minHeight: 44 }}>
            <span style={{ fontFamily: FONT_MONO, fontSize: 8.5, letterSpacing: "0.08em", textTransform: "uppercase", color: labelColor, flexShrink: 0 }}>Preview</span>
            {canSave ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, flexWrap: "wrap" }}>
                <span style={{ fontFamily: FONT_SERIF, fontSize: 14, fontWeight: 500, color: headingInk, whiteSpace: "nowrap" }}>{pkgName.trim()}</span>
                {chosen.map(([kind, id]) => <Chip key={kind} kind={kind} label={verName(id)} />)}
              </div>
            ) : (
              <span style={{ fontFamily: FONT_SERIF, fontStyle: "italic", fontSize: 12, color: mutedInk }}>Name it and pick one of each.</span>
            )}
          </div>
          {!editingPkgId && (
            <div style={{ flex: "1 1 200px", minWidth: 190, display: "flex", alignItems: "center", gap: 10, background: "#f3f6f1", borderRadius: 10, padding: "10px 13px" }}>
              <button
                type="button"
                role="switch"
                aria-checked={setActiveOnCreate}
                aria-label="Make this the active package"
                onClick={() => setSetActiveOnCreate((v) => !v)}
                style={{ width: 38, height: 22, borderRadius: 999, border: "none", cursor: "pointer", padding: 2, background: setActiveOnCreate ? "#8a9e88" : "#d8cbbd", display: "inline-flex", alignItems: "center", justifyContent: setActiveOnCreate ? "flex-end" : "flex-start", transition: "background .18s", flexShrink: 0 }}
              >
                <span style={{ width: 18, height: 18, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 2px rgba(58,28,20,0.2)" }} />
              </button>
              <span style={{ fontFamily: FONT_SANS, fontSize: 12, color: bodyInk, lineHeight: 1.3 }}>Make this the active package</span>
            </div>
          )}
        </div>

        {pkgError && <div style={{ fontFamily: FONT_SANS, fontSize: 12.5, color: "#A32D2D", marginTop: 10 }}>{pkgError}</div>}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 9, marginTop: 14 }}>
          <button style={ghostBtn} onClick={closeBuild}>Cancel</button>
          <button style={{ ...addBtn, padding: "11px 22px", opacity: canSave ? 1 : 0.45, cursor: canSave ? "pointer" : "not-allowed" }} disabled={!canSave} onClick={createOrSave}>
            <Check style={{ width: 12, height: 12 }} strokeWidth={2.4} aria-hidden="true" /> {editingPkgId ? "Save changes" : "Create package"}
          </button>
        </div>
      </div>
    );
  };

  // ── Packages view: active spotlight + inline builder + shelf of other packages + dotted ghosts. ──
  const renderPackagesView = () => {
    const active = resolveActivePackage(activeMs, msPackages);
    const shelf = msPackages.filter((p) => p.id !== active?.id);
    const fOf = (p: SubmissionPackage) => packageFunnel(p.id, msQueries);
    const activeF = active ? fOf(active) : null;
    const qualified = (f: PackageFunnel) => meetsSampleThreshold(f.resolved) && f.requestRateResolved !== null;

    // best qualified package overall — the Top-performer tag + the suggestion source
    let best: { p: SubmissionPackage; f: PackageFunnel } | null = null;
    for (const p of msPackages) {
      const f = fOf(p);
      if (qualified(f) && (!best || f.requestRateResolved! > best.f.requestRateResolved!)) best = { p, f };
    }

    // divergence suggestion: the best qualified package NOT currently active, ahead by a clear margin
    const NUDGE_MARGIN = 0.05;
    let leader: { p: SubmissionPackage; f: PackageFunnel } | null = null;
    for (const p of shelf) {
      const f = fOf(p);
      if (qualified(f) && (!leader || f.requestRateResolved! > leader.f.requestRateResolved!)) leader = { p, f };
    }
    let suggestion: { p: SubmissionPackage; f: PackageFunnel } | null = null;
    if (leader) {
      if (!activeF) suggestion = leader; // nothing active → suggest the leader
      else if (qualified(activeF) && leader.f.requestRateResolved! - activeF.requestRateResolved! >= NUDGE_MARGIN) suggestion = leader;
      // if the active package isn't qualified yet, hold the nudge — too early to second-guess it
    }

    // manuscript-wide resolved request rate — the spotlight's "vs X% manuscript avg" benchmark
    const msAgg = msPackages.reduce((a, p) => { const f = fOf(p); return { req: a.req + f.requests, res: a.res + f.resolved }; }, { req: 0, res: 0 });
    const msAvgRate = msAgg.res > 0 ? msAgg.req / msAgg.res : null;

    // Spotlight shell: MountPanel's clip frame + a diagonal sage wash (the greeting-container treatment;
    // the wave is a clipped overlay, never an overlay ::before border on the card itself).
    const spotShell = (children: React.ReactNode) => (
      <MountPanel>
        <div style={{ position: "relative", overflow: "hidden" }}>
          <div className="sp-wave" aria-hidden="true" />
          <div style={{ position: "relative", zIndex: 1 }}>{children}</div>
        </div>
      </MountPanel>
    );

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
        {active && activeF ? (
          spotShell(
            <div className="sp-spot" style={{ display: "flex", alignItems: "center", gap: 26, padding: "22px 24px" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontFamily: FONT_MONO, fontSize: 8.5, letterSpacing: "0.1em", textTransform: "uppercase", color: "#5a6e58", background: "#e0e7dc", border: "0.5px solid #cbd8c4", borderRadius: 20, padding: "4px 10px", marginBottom: 12 }}>
                  <Star style={{ width: 9, height: 9, fill: "#5a6e58", color: "#5a6e58" }} strokeWidth={1.5} aria-hidden="true" /> Active · queries pre-fill this
                </span>
                <div style={{ fontFamily: FONT_SERIF, fontSize: 28, fontWeight: 500, color: headingInk, marginBottom: 11, lineHeight: 1.1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{active.packageName}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  <Chip kind={ComponentType.QUERY_LETTER} label={verName(active.queryLetterVersionId)} />
                  <Chip kind={ComponentType.SYNOPSIS} label={verName(active.synopsisVersionId)} />
                  <Chip kind={ComponentType.SAMPLE_PAGES} label={verName(active.samplePagesVersionId)} />
                </div>
                {suggestion && (
                  <div style={{ fontFamily: "'Caveat', cursive", fontSize: 17, color: burgundy, background: "rgba(255,255,255,0.55)", border: "0.5px dashed #b9c8b2", borderRadius: 10, padding: "8px 13px", marginTop: 14, display: "inline-flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    <span><b style={{ color: sageText }}>{suggestion.p.packageName}</b> is winning more requests — {formatRate(suggestion.f.requestRateResolved)} vs {formatRate(activeF.requestRateResolved)}.</span>
                    <button onClick={() => { if (msId) setActivePackage(msId, suggestion!.p.id); }} style={{ fontFamily: FONT_MONO, fontSize: 8.5, letterSpacing: "0.04em", textTransform: "uppercase", color: sageText, background: "#e0e7dc", border: "0.5px solid #cbd8c4", borderRadius: 7, padding: "6px 10px", cursor: "pointer", flexShrink: 0 }}>Set active</button>
                  </div>
                )}
              </div>
              <div style={{ textAlign: "center", flexShrink: 0 }}>
                <div style={{ fontFamily: FONT_SERIF, fontSize: 50, fontWeight: 500, color: "#5a6e58", lineHeight: 0.9 }}>{formatRate(activeF.requestRateResolved)}</div>
                <div style={{ fontFamily: FONT_MONO, fontSize: 8.5, letterSpacing: "0.05em", textTransform: "uppercase", color: mutedInk, marginTop: 6 }}>Request rate</div>
                {msAvgRate !== null && <div style={{ fontFamily: FONT_MONO, fontSize: 8.5, color: AMBER, marginTop: 8 }}>vs {formatRate(msAvgRate)} manuscript avg</div>}
                <button onClick={() => setDetailPkgId(active.id)} className="sp-link" style={{ fontFamily: FONT_MONO, fontSize: 9, letterSpacing: "0.04em", textTransform: "uppercase", color: burgundy, marginTop: 13, display: "inline-flex", alignItems: "center", gap: 5, cursor: "pointer", background: "transparent", border: "none" }}>
                  View funnel <ArrowRight style={{ width: 11, height: 11 }} strokeWidth={2.4} aria-hidden="true" />
                </button>
              </div>
            </div>,
          )
        ) : (
          spotShell(
            <div style={{ padding: "22px 24px" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontFamily: FONT_MONO, fontSize: 8.5, letterSpacing: "0.1em", textTransform: "uppercase", color: "#9c8878", background: "#efe7df", border: "0.5px solid #e0d5c8", borderRadius: 20, padding: "4px 10px", marginBottom: 11 }}>No active package</span>
              <div style={{ fontFamily: FONT_SERIF, fontSize: 24, fontWeight: 500, color: headingInk, lineHeight: 1.1 }}>Choose your default package</div>
              <div style={{ fontFamily: FONT_SANS, fontSize: 13.5, color: "#4a3e34", lineHeight: 1.55, marginTop: 11 }}>
                {msPackages.length === 0 ? (
                  <>
                    Build your first package — then set it active to pre-fill the materials on every new query for <b>{activeMs?.title}</b>.
                    <div style={{ marginTop: 14 }}>
                      <button onClick={openBuild} style={{ ...addBtn, padding: "9px 16px" }}>
                        <Plus style={{ width: 12, height: 12 }} strokeWidth={2.4} aria-hidden="true" /> Build your first package
                      </button>
                    </div>
                  </>
                ) : suggestion ? (
                  <>
                    Set a package active to pre-fill new queries on this manuscript. Based on what's winning requests, we'd suggest{" "}
                    <b style={{ color: burgundy }}>{suggestion.p.packageName}</b> ({formatRate(suggestion.f.requestRateResolved)} request rate).
                    <div style={{ marginTop: 14 }}>
                      <button onClick={() => { if (msId) setActivePackage(msId, suggestion!.p.id); }} style={{ ...addBtn, padding: "9px 16px" }}>
                        <Star style={{ width: 12, height: 12 }} strokeWidth={2} aria-hidden="true" /> Set “{suggestion.p.packageName}” active
                      </button>
                    </div>
                  </>
                ) : (
                  <>Set a package active from the shelf below — tap its star — to pre-fill the materials on every new query for <b>{activeMs?.title}</b>. The app never picks for you.</>
                )}
              </div>
            </div>,
          )
        )}

        {/* Inline builder — unfolds in place above the shelf when a ghost / empty-CTA opens it */}
        {buildOpen && renderBuilder()}

        {/* ── Shelf: the other packages + dotted ghosts ── */}
        <div>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12, padding: "0 2px" }}>
            <h3 style={{ fontFamily: FONT_SERIF, fontSize: 17, fontWeight: 500, color: headingInk, margin: 0 }}>{active ? "Other packages" : "Your packages"}</h3>
            <span style={{ fontFamily: FONT_MONO, fontSize: 9.5, letterSpacing: "0.04em", color: mutedInk }}>
              {shelf.length} {shelf.length === 1 ? "package" : "packages"}{active ? " besides active" : ""}
            </span>
          </div>

          <div ref={shelfRef} style={{ display: "grid", gridTemplateColumns: `repeat(${shelfCols}, minmax(0, 1fr))`, gap: 14 }}>
            {shelf.map((p) => {
              const f = fOf(p);
              const isBest = !!best && best.p.id === p.id && msPackages.length >= 2;
              const early = !qualified(f);
              return (
                <div
                  key={p.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setDetailPkgId(p.id)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setDetailPkgId(p.id); } }}
                  className="sp-shelf-card"
                  style={{ background: parchment, border: "1px solid rgba(124,58,42,0.14)", borderRadius: 13, padding: "15px 16px", cursor: "pointer", display: "flex", flexDirection: "column", minHeight: 122, transition: "border-color .14s, box-shadow .14s" }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontFamily: FONT_SERIF, fontSize: 16, fontWeight: 500, color: headingInk, lineHeight: 1.1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.packageName}</div>
                      {isBest ? (
                        <span style={{ display: "inline-block", marginTop: 6, fontFamily: FONT_MONO, fontSize: 7.5, letterSpacing: "0.05em", textTransform: "uppercase", color: sageText, background: "#e9ede6", border: "0.5px solid #cfdac9", borderRadius: 20, padding: "2px 7px" }}>★ Top performer</span>
                      ) : early ? (
                        <span style={{ display: "inline-block", marginTop: 6, fontFamily: FONT_MONO, fontSize: 7.5, letterSpacing: "0.05em", textTransform: "uppercase", color: "#9c8878", background: "#efe7df", border: "0.5px solid #e0d5c8", borderRadius: 20, padding: "2px 7px" }}>Early · {f.resolved}/{MIN_SENDS_FOR_CLAIM}</span>
                      ) : null}
                    </div>
                    <button
                      title="Set as active package"
                      aria-label={`Set ${p.packageName} as the active package`}
                      onClick={(e) => { e.stopPropagation(); if (msId) setActivePackage(msId, p.id); }}
                      className="sp-star-box"
                      style={{ width: 26, height: 26, borderRadius: 8, border: "0.5px solid #e0d5c8", background: "#fff", color: "#c4b4aa", display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}
                    >
                      <Star style={{ width: 13, height: 13 }} strokeWidth={1.7} aria-hidden="true" />
                    </button>
                  </div>

                  <div style={{ marginTop: 13 }}>
                    <div style={{ fontFamily: FONT_SERIF, fontSize: early ? 16 : 23, fontStyle: early ? "italic" : "normal", color: early ? "#b3a99a" : burgundy, lineHeight: 1 }}>{formatRate(f.requestRateResolved)}</div>
                    <div style={{ fontFamily: FONT_MONO, fontSize: 8, letterSpacing: "0.04em", textTransform: "uppercase", color: mutedInk, marginTop: 4 }}>{early ? "gathering data" : "request rate"}</div>
                  </div>

                  <div style={{ marginTop: "auto", paddingTop: 11, fontFamily: FONT_MONO, fontSize: 8.5, letterSpacing: "0.02em", color: "#bdb3a4" }}>
                    {f.sent} sent{f.inFlight > 0 ? ` · ${f.inFlight} in flight` : ""}
                  </div>
                </div>
              );
            })}

            {/* Build ghost (first) then quiet ghosts to fill the row flush */}
            <button onClick={openBuild} className="sp-ghost-build" style={{ border: `1.5px dashed ${buttonPinkBorder}`, borderRadius: 13, padding: "14px 15px", background: "transparent", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, minHeight: 122, color: burgundy, transition: "background .15s, border-color .15s" }}>
              <span style={{ width: 34, height: 34, borderRadius: 10, background: buttonPinkBg, border: `1px solid ${buttonPinkBorder}`, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                <Plus style={{ width: 17, height: 17 }} strokeWidth={2.2} aria-hidden="true" />
              </span>
              <span style={{ fontFamily: FONT_SERIF, fontSize: 14.5, fontWeight: 500 }}>Build a package</span>
              <span style={{ fontFamily: FONT_MONO, fontSize: 9, letterSpacing: "0.03em", color: mutedInk }}>a letter · a synopsis · sample pages</span>
            </button>

            {Array.from({ length: ghostCount(shelf.length + 1, shelfCols) }).map((_, i) => (
              <button key={`ghost-${i}`} onClick={openBuild} aria-label="Build a package" className="sp-ghost-quiet" style={{ border: "1.5px dashed rgba(124,58,42,0.20)", borderRadius: 13, minHeight: 122, background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#c4b4aa" }}>
                <Plus style={{ width: 18, height: 18, opacity: 0.35 }} strokeWidth={1.6} aria-hidden="true" />
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // ── Per-package detail: KPIs + horizontal pipeline funnel + head-to-head vs active + component
  //    attribution, all derived (packageFunnel / packageStages / avgReplyDays / componentMetrics). ──
  const renderDetail = () => {
    const p = msPackages.find((pp) => pp.id === detailPkgId);
    if (!p) return null; // guarded by the effect that clears a stale detailPkgId
    const f = packageFunnel(p.id, msQueries);
    const stages = packageStages(p.id, msQueries);
    const replyDays = avgReplyDays(p.id, msQueries);
    const activePkg = resolveActivePackage(activeMs, msPackages);
    const af = activePkg ? packageFunnel(activePkg.id, msQueries) : null;
    const isActive = activePkg?.id === p.id;
    const early = !(meetsSampleThreshold(f.resolved) && f.requestRateResolved !== null);

    // manuscript-wide resolved request rate (the KPI comparison) + top-package detection
    const msAgg = msPackages.reduce((a, pp) => { const ff = packageFunnel(pp.id, msQueries); return { req: a.req + ff.requests, res: a.res + ff.resolved }; }, { req: 0, res: 0 });
    const msAvgRate = msAgg.res > 0 ? msAgg.req / msAgg.res : null;
    let bestId: string | null = null, bestRate = -1;
    for (const pp of msPackages) { const ff = packageFunnel(pp.id, msQueries); if (meetsSampleThreshold(ff.resolved) && ff.requestRateResolved !== null && ff.requestRateResolved > bestRate) { bestRate = ff.requestRateResolved; bestId = pp.id; } }
    const isTop = bestId === p.id && msPackages.length >= 2;

    const FUNNEL: { lab: string; n: number; tone: "burg" | "sage" | "gold" }[] = [
      { lab: "Queried", n: stages.queried, tone: "burg" },
      { lab: "Responded", n: stages.responded, tone: "sage" },
      { lab: "Partial", n: stages.partial, tone: "sage" },
      { lab: "Full", n: stages.full, tone: "sage" },
      { lab: "Offer", n: stages.offer, tone: "gold" },
    ];
    const maxN = Math.max(FUNNEL[0].n, 1);
    const toneBg = (t: "burg" | "sage" | "gold") =>
      t === "burg" ? "linear-gradient(180deg,#9a5040,#7c3a2a)" : t === "gold" ? "linear-gradient(180deg,#c89a52,#a06f28)" : "linear-gradient(180deg,#9aad98,#7a8e78)";

    const Card: React.FC<{ children: React.ReactNode }> = ({ children }) => (
      <MountPanel><div style={{ padding: "18px 20px" }}>{children}</div></MountPanel>
    );
    const cardHead = (Icon: React.ComponentType<any>, text: string) => (
      <div style={{ fontFamily: FONT_MONO, fontSize: 9, letterSpacing: "0.07em", textTransform: "uppercase", color: sageText, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
        <Icon style={{ width: 13, height: 13 }} strokeWidth={1.7} aria-hidden="true" /> {text}
      </div>
    );
    const kpi = (label: string, value: React.ReactNode, accent: string, sub?: React.ReactNode, subColor?: string) => (
      <div style={{ flex: "1 1 0", minWidth: 120, background: "#fbf6ef", border: "0.5px solid #e8ddcf", borderRadius: 12, padding: "15px 17px" }}>
        <div style={{ fontFamily: FONT_MONO, fontSize: 8.5, letterSpacing: "0.05em", textTransform: "uppercase", color: mutedInk, marginBottom: 6 }}>{label}</div>
        <div style={{ fontFamily: FONT_SERIF, fontSize: 27, fontWeight: 500, color: accent, lineHeight: 1 }}>{value}</div>
        {sub && <div style={{ fontFamily: FONT_MONO, fontSize: 8.5, marginTop: 6, color: subColor ?? "#b3a99a" }}>{sub}</div>}
      </div>
    );

    return (
      <div style={{ maxWidth: 860, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>
        <button onClick={() => setDetailPkgId(null)} className="sp-link" style={{ alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: 7, background: "transparent", border: "none", cursor: "pointer", fontFamily: FONT_MONO, fontSize: 10.5, letterSpacing: "0.05em", textTransform: "uppercase", color: burgundy }}>
          <ArrowLeft style={{ width: 13, height: 13 }} strokeWidth={2.4} aria-hidden="true" /> All packages
        </button>

        {/* head: name + tag + action */}
        <div style={{ display: "flex", alignItems: "center", gap: 13, flexWrap: "wrap" }}>
          <span style={{ fontFamily: FONT_SERIF, fontSize: 27, fontWeight: 500, color: headingInk }}>{p.packageName}</span>
          {isActive ? (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontFamily: FONT_MONO, fontSize: 8, fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", color: sageText, background: "#e0e7dc", border: "0.5px solid #cbd8c4", borderRadius: 20, padding: "3px 8px" }}>
              <Star style={{ width: 8, height: 8, fill: sageText, color: sageText }} strokeWidth={1.5} aria-hidden="true" /> Active
            </span>
          ) : isTop ? (
            <span style={{ fontFamily: FONT_MONO, fontSize: 8, fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", color: sageText, background: "#e9ede6", border: "0.5px solid #cfdac9", borderRadius: 20, padding: "3px 8px" }}>★ Top performer</span>
          ) : early ? (
            <span style={{ fontFamily: FONT_MONO, fontSize: 8, fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", color: "#9c8878", background: "#efe7df", border: "0.5px solid #e0d5c8", borderRadius: 20, padding: "3px 8px" }}>Early</span>
          ) : null}
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 9 }}>
            {isActive ? (
              <span style={{ fontFamily: FONT_MONO, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em", color: mutedInk }}>Currently active</span>
            ) : (
              <button onClick={() => { if (msId) setActivePackage(msId, p.id); }} style={{ ...ghostBtn, display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 15px" }}>
                <Star style={{ width: 12, height: 12, color: AMBER }} strokeWidth={2} aria-hidden="true" /> Set active
              </button>
            )}
            <button onClick={() => editPkg(p)} style={{ ...addBtn, padding: "9px 15px" }}>
              <Pencil style={{ width: 12, height: 12 }} strokeWidth={2} aria-hidden="true" /> Edit
            </button>
          </div>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          <Chip kind={ComponentType.QUERY_LETTER} label={verName(p.queryLetterVersionId)} />
          <Chip kind={ComponentType.SYNOPSIS} label={verName(p.synopsisVersionId)} />
          <Chip kind={ComponentType.SAMPLE_PAGES} label={verName(p.samplePagesVersionId)} />
        </div>

        {/* KPIs (resolved-aware) */}
        {!early && (
          <div className="sp-kpis" style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            {kpi(
              "Request rate",
              formatRate(f.requestRateResolved),
              burgundy,
              msAvgRate !== null ? <>{(f.requestRateResolved ?? 0) >= msAvgRate ? "▲" : "▼"} vs {formatRate(msAvgRate)} avg</> : "manuscript avg —",
              msAvgRate !== null && (f.requestRateResolved ?? 0) >= msAvgRate ? sageText : AMBER,
            )}
            {kpi("Response rate", formatRate(f.responseRateResolved), sageText, <>{stages.responded} of {f.resolved} replied</>)}
            {kpi("Avg reply time", replyDays === null ? "—" : <>{replyDays}<span style={{ fontSize: 14 }}> d</span></>, headingInk, "responding agents")}
          </div>
        )}

        {/* funnel — or early-box */}
        <Card>
          {cardHead(Filter, "Pipeline funnel — where it wins and stalls")}
          {early ? (
            <div style={{ background: "#f3f6f1", border: "0.5px solid #d6e0d2", borderRadius: 12, padding: 18, textAlign: "center" }}>
              <div style={{ fontFamily: FONT_SERIF, fontStyle: "italic", fontSize: 18, color: mutedInk, marginBottom: 5 }}>{f.resolved} of {MIN_SENDS_FOR_CLAIM} resolved</div>
              <div style={{ fontFamily: FONT_SANS, fontSize: 12.5, color: "#8a7a6c", maxWidth: 440, margin: "0 auto", lineHeight: 1.5 }}>
                The funnel and a verdict appear once this package reaches {MIN_SENDS_FOR_CLAIM} resolved sends. A lucky 1-of-1 isn't a strategy — we won't crown it early.
              </div>
            </div>
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "flex-end", height: 150, padding: "6px 4px 0" }}>
                {FUNNEL.map((s, i) => (
                  <React.Fragment key={s.lab}>
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", height: "100%", justifyContent: "flex-end" }}>
                      <div style={{ fontFamily: FONT_MONO, fontSize: 13, fontWeight: 500, color: bodyInk, marginBottom: 5 }}>{s.n}</div>
                      <div style={{ width: "60%", height: `${Math.max((s.n / maxN) * 100, 3)}%`, background: toneBg(s.tone), borderRadius: "6px 6px 0 0", minHeight: 4 }} />
                      <div style={{ fontFamily: FONT_MONO, fontSize: 8.5, letterSpacing: "0.02em", textTransform: "uppercase", color: "#7a6e60", marginTop: 8, textAlign: "center" }}>{s.lab}</div>
                    </div>
                    {i < FUNNEL.length - 1 && (() => {
                      const next = FUNNEL[i + 1].n;
                      const cv = s.n ? Math.round((next / s.n) * 100) : 0;
                      const drop = s.n - next;
                      return (
                        <div style={{ width: 46, flexShrink: 0, textAlign: "center", fontFamily: FONT_MONO, fontSize: 8.5, color: mutedInk, paddingBottom: 34 }}>
                          <span style={{ color: sageText, display: "block", fontSize: 10 }}>{cv}%</span>
                          {drop > 0 && <span style={{ color: AMBER }}>−{drop}</span>}
                        </div>
                      );
                    })()}
                  </React.Fragment>
                ))}
              </div>
              {f.inFlight > 0 && (
                <div style={{ marginTop: 14, background: "#f6efe6", border: "0.5px solid #e8ddcf", borderRadius: 9, padding: "10px 13px", fontFamily: FONT_SANS, fontSize: 11.5, color: "#6a5e54", display: "flex", gap: 8, alignItems: "center", lineHeight: 1.4 }}>
                  <Clock style={{ width: 14, height: 14, color: AMBER, flexShrink: 0 }} strokeWidth={2} aria-hidden="true" />
                  <span><b style={{ color: AMBER, fontWeight: 500 }}>{f.inFlight} sent recently</b> — too soon to count; they join the funnel once an agent responds or the window lapses.</span>
                </div>
              )}
              <div style={{ fontFamily: FONT_MONO, fontSize: 8.5, color: "#bdb3a4", marginTop: 9 }}>Rates use resolved queries only, so a fresh package isn't punished for queries still in flight.</div>
            </>
          )}
        </Card>

        {/* head-to-head vs active */}
        {!early && !isActive && activePkg && af && (
          <Card>
            {cardHead(ArrowLeftRight, "Head-to-head vs your active package")}
            <div className="sp-vs" style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 18, alignItems: "center" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontFamily: FONT_MONO, fontSize: 8, letterSpacing: "0.07em", textTransform: "uppercase", color: mutedInk, marginBottom: 4 }}>This</div>
                <div style={{ fontFamily: FONT_SERIF, fontSize: 16, color: headingInk, marginBottom: 7 }}>{p.packageName}</div>
                <div style={{ fontFamily: FONT_SERIF, fontSize: 30, fontWeight: 500, color: (f.requestRateResolved ?? 0) >= (af.requestRateResolved ?? 0) ? sageText : "#b3a99a" }}>{formatRate(f.requestRateResolved)}</div>
              </div>
              <div className="sp-vs-mid" style={{ fontFamily: FONT_MONO, fontSize: 10, color: mutedInk }}>vs</div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontFamily: FONT_MONO, fontSize: 8, letterSpacing: "0.07em", textTransform: "uppercase", color: mutedInk, marginBottom: 4 }}>Active</div>
                <div style={{ fontFamily: FONT_SERIF, fontSize: 16, color: headingInk, marginBottom: 7 }}>{activePkg.packageName}</div>
                <div style={{ fontFamily: FONT_SERIF, fontSize: 30, fontWeight: 500, color: (af.requestRateResolved ?? 0) > (f.requestRateResolved ?? 0) ? sageText : "#b3a99a" }}>{formatRate(af.requestRateResolved)}</div>
              </div>
            </div>
            <div style={{ fontFamily: FONT_MONO, fontSize: 11, color: sageText, textAlign: "center", marginTop: 14, paddingTop: 13, borderTop: "1px solid rgba(124,58,42,0.1)" }}>
              {(f.requestRateResolved ?? 0) > (af.requestRateResolved ?? 0)
                ? <><b style={{ color: burgundy }}>{p.packageName}</b> wins requests by <b style={{ color: burgundy }}>+{Math.round(((f.requestRateResolved ?? 0) - (af.requestRateResolved ?? 0)) * 100)} points</b> — consider setting it active.</>
                : <>Your active package leads by {Math.round(((af.requestRateResolved ?? 0) - (f.requestRateResolved ?? 0)) * 100)} points.</>}
            </div>
          </Card>
        )}

        {/* component attribution */}
        {!early && (
          <Card>
            {cardHead(PieChart, "Component attribution — which part is carrying it")}
            <div className="sp-attr" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
              {[
                { kind: ComponentType.QUERY_LETTER, id: p.queryLetterVersionId, label: "Query letter" },
                { kind: ComponentType.SYNOPSIS, id: p.synopsisVersionId, label: "Synopsis" },
                { kind: ComponentType.SAMPLE_PAGES, id: p.samplePagesVersionId, label: "Sample pages" },
              ].map((c) => {
                const cm = componentMetrics(c.id, msPackages, msQueries);
                return (
                  <div key={c.kind}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: FONT_MONO, fontSize: 8.5, letterSpacing: "0.04em", textTransform: "uppercase", color: sageText, marginBottom: 7 }}>
                      <KindDot kind={c.kind} /> {c.label}
                    </div>
                    <div style={{ fontFamily: FONT_SANS, fontSize: 12.5, color: bodyInk, marginBottom: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{verName(c.id)}</div>
                    <div style={{ height: 6, background: "#ece4da", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ height: "100%", background: burgundy, borderRadius: 3, width: barWidth(cm.requestRate) }} />
                    </div>
                    <div style={{ fontFamily: FONT_MONO, fontSize: 11, color: burgundy, fontWeight: 500, marginTop: 6 }}>{formatRate(cm.requestRate)}<small style={{ color: "#b3a99a", fontWeight: 400, marginLeft: 3 }}>{cm.requests}/{cm.sent}</small></div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}
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
        .sp-shelf-card:hover { border-color: #c9a89e; box-shadow: 0 5px 16px rgba(58,28,20,0.08); }
        .sp-shelf-card:focus-visible { outline: 2px solid ${burgundy}; outline-offset: 2px; }
        .sp-star-box:hover { color: #8a9e88 !important; border-color: #cfdac9 !important; }
        .sp-ghost-build:hover { background: ${buttonPinkBg}; border-color: ${burgundy}; }
        .sp-ghost-quiet:hover { border-color: #c9a89e !important; color: ${burgundy} !important; background: rgba(251,243,236,0.4) !important; }
        .sp-mat:hover { border-color: #c9a89e; box-shadow: 0 4px 13px rgba(58,28,20,0.07); }
        .sp-mat:focus-visible { outline: 2px solid ${burgundy}; outline-offset: 2px; }
        .sp-add-mat:hover { border-color: #c9a89e !important; color: ${burgundy} !important; background: rgba(251,243,236,0.4) !important; }
        .sp-link:hover { text-decoration: underline; }
        @media (max-width: 880px) { .sp-lib { grid-template-columns: 1fr !important; } }
        @media (max-width: 560px) { .sp-workspace { padding: 16px 14px 20px !important; } .sp-build-hint { display: none; } }
        /* spotlight: diagonal sage wash + corner glow (the greeting-container treatment) */
        .sp-wave { position: absolute; inset: 0; pointer-events: none; z-index: 0; }
        .sp-wave::before { content: ''; position: absolute; top: -60%; left: -75%; width: 55%; height: 220%; background: linear-gradient(100deg, transparent 0%, rgba(138,158,136,0.07) 35%, rgba(176,200,168,0.20) 50%, rgba(138,158,136,0.07) 65%, transparent 100%); transform: rotate(6deg); animation: spSheen 9s ease-in-out infinite; }
        .sp-wave::after { content: ''; position: absolute; right: -12%; bottom: -40%; width: 55%; height: 150%; background: radial-gradient(ellipse at center, rgba(138,158,136,0.13), transparent 68%); }
        @keyframes spSheen { 0% { left: -75%; } 60% { left: 135%; } 100% { left: 135%; } }
        @media (prefers-reduced-motion: reduce) { .sp-wave::before { animation: none; } }
        @media (max-width: 760px) {
          .sp-pkg-row { grid-template-columns: 1fr !important; gap: 12px !important; }
          .sp-attr-grid { grid-template-columns: 1fr !important; }
          .sp-strat { flex-direction: column !important; align-items: flex-start !important; }
          .sp-strat-div { display: none !important; }
          .sp-headrow { flex-direction: column !important; align-items: center !important; gap: 14px !important; }
          .sp-spot { flex-direction: column !important; align-items: flex-start !important; gap: 14px !important; }
          .sp-spot-div { display: none !important; }
          .sp-vs { grid-template-columns: 1fr !important; }
          .sp-vs-mid { display: none !important; }
          .sp-attr { grid-template-columns: 1fr !important; }
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

        {/* ── Tab content — both pill views housed in one workspace container. No overflow:hidden, so
              the inline builder's SlotDropdown menus stay free; the spotlight keeps its own frame-clip. ── */}
        {!activeMs ? (
          <MountPanel>
            <BandHeader title="No manuscripts yet" Icon={Layers} />
            <div style={{ padding: 22, fontFamily: FONT_SERIF, fontStyle: "italic", fontSize: 14, color: mutedInk }}>
              Add a manuscript from the Manuscripts list first — packages are built per manuscript.
            </div>
          </MountPanel>
        ) : (
          // Workspace surface: a soft warm near-white, a hair lighter than the parchment cards
          // (#fdfaf5) so cards read as sitting ON it, and clearly lighter than the kraft ground.
          <div className="sp-workspace" style={{ background: "#fefcf8", border: "1px solid rgba(124,58,42,0.10)", borderRadius: 18, boxShadow: "0 1px 2px rgba(58,28,20,0.04), 0 12px 34px rgba(58,28,20,0.06)", padding: "24px 24px 28px" }}>
            {view === "packages" ? (detailPkgId ? renderDetail() : renderPackagesView()) : renderLibrary()}
          </div>
        )}
      </div>

      {/* ── Material editor (type · name · notes · content: Paste / Attach[soon] / Link) ── */}
      {form && (() => {
        const wc = form.content.trim() ? (form.content.trim().match(/\S+/g) ?? []).length : 0;
        const sends = form.editing ? componentMetrics(form.editing.id, msPackages, msQueries).sent : 0;
        const typeBtn = (kind: ComponentType, label: string) => {
          const on = form.kind === kind;
          const locked = !!form.editing; // a version's component kind is fixed once packages may reference it
          return (
            <button key={kind} disabled={locked && !on} onClick={() => { if (!locked) setForm({ ...form, kind }); }}
              style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, fontFamily: FONT_SANS, fontSize: 12, color: on ? bodyInk : "#6a5e54", background: on ? "#fff" : "#fbf6ef", border: `0.5px solid ${on ? "#c9a89e" : "#e8ddcf"}`, borderRadius: 9, padding: 9, cursor: locked ? (on ? "default" : "not-allowed") : "pointer", fontWeight: on ? 500 : 400, opacity: locked && !on ? 0.5 : 1 }}>
              <KindDot kind={kind} /> {label}
            </button>
          );
        };
        const modeBtn = (m: ContentMode, label: string, Icon: React.ComponentType<any>, disabled?: boolean) => {
          const on = form.mode === m;
          return (
            <button key={m} onClick={() => { if (!disabled) setForm({ ...form, mode: m }); }} disabled={disabled} title={disabled ? "File upload is coming soon" : undefined}
              style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, fontFamily: FONT_MONO, fontSize: 10, letterSpacing: "0.03em", textTransform: "uppercase", color: on ? burgundy : "#9c8878", background: on ? buttonPinkBg : "#fbf6ef", border: `0.5px solid ${on ? buttonPinkBorder : "#e8ddcf"}`, borderRadius: 8, padding: 9, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.55 : 1 }}>
              <Icon style={{ width: 13, height: 13 }} strokeWidth={2} aria-hidden="true" /> {label}{disabled ? " · soon" : ""}
            </button>
          );
        };
        return (
          <Modal onClose={() => setForm(null)} labelledBy="sp-form-title">
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 20px", borderBottom: "1px solid rgba(124,58,42,0.1)" }}>
              <span style={{ width: 3, height: 17, borderRadius: 2, background: burgundy }} aria-hidden="true" />
              <span id="sp-form-title" style={{ fontFamily: FONT_SERIF, fontSize: 17, fontWeight: 500, color: headingInk }}>{form.editing ? "Edit material" : `New ${COMP[form.kind].noun}`}</span>
            </div>
            <div style={{ padding: "18px 20px", maxHeight: "70vh", overflowY: "auto" }}>
              <label style={labelStyle}>Type</label>
              <div style={{ display: "flex", gap: 7, marginBottom: 16 }}>
                {typeBtn(ComponentType.QUERY_LETTER, "Query letter")}
                {typeBtn(ComponentType.SYNOPSIS, "Synopsis")}
                {typeBtn(ComponentType.SAMPLE_PAGES, "Sample pages")}
              </div>

              <label htmlFor="sp-name" style={labelStyle}>Name this version</label>
              <input id="sp-name" autoFocus value={form.name} maxLength={120} onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder={`e.g. ${form.kind === ComponentType.QUERY_LETTER ? "Comp-led letter" : form.kind === ComponentType.SYNOPSIS ? "Two-page synopsis" : "First 3 chapters"}`} style={inputStyle} />

              <label htmlFor="sp-notes" style={{ ...labelStyle, marginTop: 16 }}>Notes <span style={{ textTransform: "none", letterSpacing: 0, color: "#bdb3a4" }}>— what's different about this one (for you, not the agent)</span></label>
              <textarea id="sp-notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2}
                placeholder="e.g. Leads with two comp titles, punchier hook, cut the bio paragraph." style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5, color: "#5a4a40" }} />

              <label style={{ ...labelStyle, marginTop: 16 }}>Content</label>
              <div style={{ display: "flex", gap: 6, marginBottom: 11 }}>
                {modeBtn("paste", "Paste", AlignLeft)}
                {modeBtn("attach", "Attach", Paperclip, true)}
                {modeBtn("link", "Link", Link2)}
              </div>
              {form.mode === "link" ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                  <input value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} placeholder="Paste a Google Docs / Dropbox link…" style={inputStyle} />
                  <div style={{ fontFamily: FONT_MONO, fontSize: 9, color: "#9c8878", letterSpacing: "0.03em" }}>We'll keep the link — your document stays where it lives.</div>
                </div>
              ) : (
                <div>
                  <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={6}
                    placeholder={`Paste your ${COMP[form.kind].slotLabel.toLowerCase()} here…`} style={{ ...inputStyle, resize: "vertical", lineHeight: 1.55 }} />
                  <div style={{ fontFamily: FONT_MONO, fontSize: 9, color: "#bdb3a4", textAlign: "right", marginTop: 6, letterSpacing: "0.02em" }}>{wc} word{wc === 1 ? "" : "s"}</div>
                </div>
              )}

              {form.editing && sends > 0 && (
                <div style={{ fontFamily: FONT_SANS, fontSize: 11, color: "#6a5e54", lineHeight: 1.45, marginTop: 12, background: "#f6efe6", border: "0.5px solid #e8ddcf", borderRadius: 9, padding: "9px 12px" }}>
                  This version has been sent {sends} time{sends === 1 ? "" : "s"}. Editing its <b>content</b> saves a new version so the original keeps its results; name and notes update in place.
                </div>
              )}

              <div style={{ display: "flex", alignItems: "center", gap: 9, marginTop: 18 }}>
                {form.editing && (
                  <button onClick={() => { const v = form.editing!; setForm(null); requestDelete(v); }} style={{ marginRight: "auto", display: "inline-flex", alignItems: "center", gap: 6, fontFamily: FONT_MONO, fontSize: 10, letterSpacing: "0.04em", textTransform: "uppercase", color: "#9c8878", background: "transparent", border: "none", cursor: "pointer", padding: "8px 4px" }}>
                    <Trash2 style={{ width: 13, height: 13 }} strokeWidth={2} aria-hidden="true" /> Delete
                  </button>
                )}
                <button style={ghostBtn} onClick={() => setForm(null)}>Cancel</button>
                <button style={{ ...addBtn, padding: "10px 18px", opacity: form.name.trim() ? 1 : 0.45, cursor: form.name.trim() ? "pointer" : "not-allowed" }} disabled={!form.name.trim()} onClick={saveForm}>
                  {form.editing ? "Save material" : "Create version"}
                </button>
              </div>
            </div>
          </Modal>
        );
      })()}

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
