/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Form11Drawer — the shared Form 11 drawer shell, extracted from EditAgentDrawer (Prompt 1) so the
 * Edit Agent and Edit Query drawers share ONE implementation of the chrome, the motion, and the
 * click-to-edit field affordances.
 *
 * What it owns (everything portable):
 *  · the dimmed overlay + the slide-in panel (MountPanel-style parchment body inside a burgundy
 *    inset clip — never MountCard, whose overlay border spills);
 *  · the lean-then-straighten entrance (~0.55s) and the sharp fast-exit (~0.18s) with the unmount
 *    deferred to the exit-animation end, reduced-motion → instant both ways;
 *  · the die-cut "editing" spine tab (parchment, shadow-defined, vertical mono label);
 *  · the optional punch-hole rail — an infinite column of recessed holes painted as a repeating
 *    background with `background-attachment: local`, so the holes SCROLL with the body (no CSS mask,
 *    which would pin to the viewport). Opt-in via `showRail` so the agent drawer is unchanged;
 *  · the pinned footer slot + the global Escape / outside-click close that PARKS the draft;
 *  · the background scroll-lock for the app-level overlay use.
 *
 * The canonical field primitives live here too (`RestingField`, `Form11Select`, `BlockNote`,
 * `ConfirmGuard`, `DirtyDot`) so both drawers inherit the finalised affordances. `StatusDot` stays
 * the locked source for status glyphs — never rolled here.
 *
 * Critical colours are inline (the Tailwind-drift footgun this codebase has hit before).
 */
import React, {
  forwardRef, useEffect, useImperativeHandle, useRef, useState,
} from "react";
import Lottie from "lottie-react";
import editPencil from "../assets/edit-pencil-animation.json";
import { lockStageScroll } from "../lib/stageScroll";

export const F11 = {
  parchment: "#fdfaf5",
  burgundy: "#7c3a2a",
  burgundyDeep: "#5e2b1f",
  deep: "#3a1c14",
  pink: "#f5e2da",
  pinkBorder: "#e8c8bc",
  fieldFill: "#fffdf9",
  fieldBorder: "#ece2d4",
  muted: "#a89a8a",
  sub: "#6a5b4c",
  err: "#a83a2a",
  errBg: "#f7e4de",
  errBorder: "#e6bdb0",
  sage: "#8a9e88",
  darkSage: "#5a6e58",
  sageTint: "#eef2ec",
} as const;
export const F11_MONO = "'JetBrains Mono', monospace";
export const F11_SERIF = "'Playfair Display', serif";

export const prefersReducedMotion = () =>
  typeof window !== "undefined" && !!window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// ── icons (shared) ──────────────────────────────────────────────────────────────
export const AlertIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" width={13} height={13} style={{ flexShrink: 0, marginTop: 1 }}><path d="M8 2l6.5 11.5h-13L8 2z" stroke="currentColor" strokeWidth={1.3} strokeLinejoin="round" /><path d="M8 6.5v3M8 11.6h.01" stroke="currentColor" strokeWidth={1.3} strokeLinecap="round" /></svg>
);
export const OkIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" width={13} height={13} style={{ flexShrink: 0, marginTop: 1 }}><circle cx="8" cy="8" r="6.2" stroke="currentColor" strokeWidth={1.2} /><path d="M5.5 8l1.7 1.7L10.5 6.5" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" /></svg>
);
export const PencilGlyph = () => (
  <svg viewBox="0 0 16 16" fill="none" width={13} height={13}><path d="M11 2l3 3-8 8-3.5.5.5-3.5 8-8z" stroke="currentColor" strokeWidth={1.3} strokeLinejoin="round" /></svg>
);

/** The burgundy dirty-dot beside a changed field's label. */
export const DirtyDot: React.FC<{ on: boolean }> = ({ on }) => (
  <span style={{ width: 5, height: 5, borderRadius: "50%", background: F11.burgundy, opacity: on ? 0.65 : 0, transition: "opacity .15s", display: "inline-block" }} />
);

/** The looping burgundy edit-pencil avatar in a parchment circle — both header bands use it. */
export const Form11HeaderAvatar: React.FC<{ size?: number; ring?: string }> = ({ size = 38, ring = "rgba(124,58,42,0.25)" }) => (
  <div style={{ width: size, height: size, borderRadius: "50%", background: F11.parchment, border: `1px solid ${ring}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
    <Lottie animationData={editPencil} loop autoplay style={{ width: size - 8, height: size - 8 }} />
  </div>
);

// ── the canonical resting click-to-edit field ─────────────────────────────────────
// Reads as text inside a faint hairline field; click → input; Enter saves+exits, Esc reverts, blur
// commits; textarea: Enter saves+exits, Shift+Enter = newline. Empty shows a muted "Add …"
// placeholder, never "—". Editing-open state is CONTROLLED by the parent (one `editing` key gates
// which field is live), matching the agent drawer's existing pattern exactly.
export interface RestingFieldProps {
  value: string;
  onCommit: (v: string) => void;
  placeholder: string;
  /** What an empty value reads as when not editing (defaults to `placeholder`). */
  emptyDisplay?: string;
  multiline?: boolean;
  quoted?: boolean;
  /** Non-empty → red border + errval text colour (the reason note is rendered separately). */
  error?: boolean;
  isEditing: boolean;
  onStartEdit: () => void;
  onEndEdit: () => void;
  /** Extra style on the resting affordance (e.g. min-height tweaks). */
  restingStyle?: React.CSSProperties;
}
export const RestingField: React.FC<RestingFieldProps> = ({
  value, onCommit, placeholder, emptyDisplay, multiline, quoted, error, isEditing, onStartEdit, onEndEdit, restingStyle,
}) => {
  const editBuf = useRef<string>("");
  const empty = value.trim() === "";
  const display = empty ? (emptyDisplay ?? placeholder) : (quoted ? `“${value}”` : value);
  if (isEditing) {
    const common = {
      autoFocus: true, defaultValue: value, placeholder,
      onFocus: () => { editBuf.current = value; },
      onBlur: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => { onCommit(e.target.value); onEndEdit(); },
      className: `f11-inp${error ? " bad" : ""}`,
      style: multiline ? { minHeight: 54, lineHeight: 1.45, resize: "vertical" as const, fontStyle: quoted ? ("italic" as const) : undefined } : undefined,
    };
    return multiline ? (
      <textarea {...common} onKeyDown={(e) => {
        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); (e.target as HTMLTextAreaElement).blur(); }
        else if (e.key === "Escape") { (e.target as HTMLTextAreaElement).value = editBuf.current; (e.target as HTMLTextAreaElement).blur(); }
      }} />
    ) : (
      <input {...common} onKeyDown={(e) => {
        if (e.key === "Enter") { e.preventDefault(); (e.target as HTMLInputElement).blur(); }
        else if (e.key === "Escape") { (e.target as HTMLInputElement).value = editBuf.current; (e.target as HTMLInputElement).blur(); }
      }} />
    );
  }
  return (
    <div className="f11-editable" tabIndex={0} role="button" style={restingStyle}
      onClick={onStartEdit}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onStartEdit(); } }}>
      <span className={`f11-fval${multiline || quoted ? " wrap" : ""}${empty ? " ph" : ""}${error ? " errval" : ""}`} style={{ fontStyle: quoted && !empty ? "italic" : undefined }}>{display}</span>
      <span className="f11-hint"><PencilGlyph /></span>
    </div>
  );
};

// ── always-visible native select ──────────────────────────────────────────────────
// Opens on a single click (no two-click reveal), commits on change. Options can be strings or
// {value,label}. An empty value shows the muted placeholder option.
export interface Form11SelectOption { value: string; label: string }
export const Form11Select: React.FC<{
  value: string;
  options: (string | Form11SelectOption)[];
  onChange: (v: string) => void;
  placeholder?: string;
  ariaLabel?: string;
}> = ({ value, options, onChange, placeholder, ariaLabel }) => {
  const empty = value.trim() === "";
  return (
    <select aria-label={ariaLabel} className={`f11-select${empty ? " ph" : ""}`} value={value} onChange={(e) => onChange(e.target.value)}>
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((o) => {
        const opt = typeof o === "string" ? { value: o, label: o } : o;
        return <option key={opt.value} value={opt.value}>{opt.label}</option>;
      })}
    </select>
  );
};

// ── hard-block note (locks Save with a plain reason + an inline "Undo — keep …") ───
export const BlockNote: React.FC<{ msg: string; onUndo: () => void; undoLabel: string }> = ({ msg, onUndo, undoLabel }) => (
  <div style={{ marginTop: 8 }}>
    <div style={{ display: "flex", gap: 7, alignItems: "flex-start", background: F11.errBg, border: `1px solid ${F11.errBorder}`, borderRadius: 7, padding: "8px 10px", fontSize: 11, color: F11.err, lineHeight: 1.45 }}>
      <AlertIcon /><span>{msg}</span>
    </div>
    <span role="button" onMouseDown={(e) => { e.preventDefault(); onUndo(); }}
      style={{ display: "inline-block", marginTop: 6, fontFamily: F11_MONO, fontSize: 9, letterSpacing: "0.04em", textTransform: "uppercase", color: F11.burgundy, cursor: "pointer", borderBottom: "1px solid rgba(124,58,42,0.4)" }}>{undoLabel}</span>
  </div>
);

// ── consequence guard (an identity-changing / destructive edit; locks Save until acknowledged) ──
export const ConfirmGuard: React.FC<{ message: React.ReactNode; confirmLabel: string; keepLabel: string; onConfirm: () => void; onKeep: () => void }> = ({ message, confirmLabel, keepLabel, onConfirm, onKeep }) => (
  <div style={{ marginTop: 8 }}>
    <div className="f11-confirm"><AlertIcon /><span>{message}</span></div>
    <div style={{ display: "flex", gap: 8, marginTop: 7 }}>
      <button type="button" className="f11-cbtn-go" onMouseDown={(e) => { e.preventDefault(); onConfirm(); }}>{confirmLabel}</button>
      <button type="button" className="f11-cbtn-keep" onMouseDown={(e) => { e.preventDefault(); onKeep(); }}>{keepLabel}</button>
    </div>
  </div>
);

// ── the pinned footer (live status + Discard + Save) ──────────────────────────────
export const Form11Footer: React.FC<{
  statusText: string;
  tone: "idle" | "dirty" | "blocked" | "saved";
  onDiscard: () => void;
  onSave: () => void;
  saveDisabled: boolean;
  saving: boolean;
  saveLabel?: string;
}> = ({ statusText, tone, onDiscard, onSave, saveDisabled, saving, saveLabel }) => {
  const textColor = tone === "blocked" ? F11.err : tone === "dirty" ? F11.burgundy : "#bcae9e";
  return (
    <div style={{ flexShrink: 0, borderTop: "1px solid #ece2d6", background: F11.parchment, padding: "13px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
      <div style={{ fontFamily: F11_MONO, fontSize: 8.5, letterSpacing: "0.05em", textTransform: "uppercase", color: textColor, flex: 1, minWidth: 0 }}>{statusText}</div>
      <span role="button" className="f11-discard" onClick={onDiscard}
        style={{ fontFamily: F11_MONO, fontSize: 10, letterSpacing: "0.05em", textTransform: "uppercase", color: "#a89a8a", cursor: "pointer", padding: "9px 14px", borderRadius: 8 }}>Discard</span>
      <button disabled={saveDisabled || saving} onClick={onSave}
        style={{
          background: saveDisabled ? "#efe6da" : F11.pink, border: `1px solid ${saveDisabled ? "#efe6da" : F11.pinkBorder}`,
          color: saveDisabled ? "#bcae9e" : F11.burgundy, fontFamily: F11_MONO, fontSize: 10, letterSpacing: "0.06em",
          textTransform: "uppercase", padding: "9px 18px", borderRadius: 8, cursor: saveDisabled || saving ? "not-allowed" : "pointer", whiteSpace: "nowrap",
        }}>{saving ? "Saving…" : (saveLabel ?? "Save changes")}</button>
    </div>
  );
};

// ── the shell ──────────────────────────────────────────────────────────────────────
export interface Form11DrawerHandle {
  /** Close the drawer with the slide-back. `park=true` fires onPark first (user-initiated close). */
  close: (park: boolean) => void;
}

export interface Form11DrawerProps {
  isOpen: boolean;
  /** Called once the exit animation completes — the consumer unmounts (host state → null). */
  onClose: () => void;
  /** User-initiated close (overlay / Esc / a header ✕ routed through the ref): stash the draft. */
  onPark?: () => void;
  /** Lock background (window) scroll at its current position while open — the app-level overlay use. */
  lockScroll?: boolean;
  /** Paint the punch-hole rail down the scrolling body's left margin. Default off (agent drawer). */
  showRail?: boolean;
  /** While an inline field edit is open, Escape reverts the field — not the drawer. */
  suppressEsc?: boolean;
  tabLabel?: string;
  width?: number;
  header: React.ReactNode;
  children: React.ReactNode;
  footer: React.ReactNode;
  /** Forwarded to the scrolling body div (the journey engine scrolls + measures against it). */
  bodyRef?: React.Ref<HTMLDivElement>;
  /** Extra class on the scrolling body (e.g. the agent journey's `touring`). */
  bodyClassName?: string;
}

export const Form11Drawer = forwardRef<Form11DrawerHandle, Form11DrawerProps>(function Form11Drawer(
  { isOpen, onClose, onPark, lockScroll, showRail, suppressEsc, tabLabel = "editing", width = 460, header, children, footer, bodyRef, bodyClassName },
  ref,
) {
  const [closing, setClosing] = useState(false);

  // Reset the slide-back only on (re)open — NOT on a re-render mid-flight (e.g. a post-save reseed),
  // which would otherwise cancel the exit animation.
  useEffect(() => { setClosing(false); }, [isOpen]);

  const close = (park: boolean) => {
    if (park) onPark?.();
    if (prefersReducedMotion()) { onClose(); return; }
    setClosing(true);
  };
  // Keep the latest close (which reads the latest onPark/onClose props) in a ref so the once-bound
  // Escape listener never parks a stale draft.
  const closeRef = useRef(close);
  closeRef.current = close;
  useImperativeHandle(ref, () => ({ close: (park: boolean) => closeRef.current(park) }), []);

  // Fast-exit fallback: unmount on the animationend, with a timeout guard matching the ~0.18s exit.
  useEffect(() => {
    if (!closing) return;
    const t = setTimeout(onClose, 250);
    return () => clearTimeout(t);
  }, [closing, onClose]);

  // Capture-phase Escape so the top overlay owns it even when opened over a FormShell; an inline edit
  // keeps its own Esc (suppressEsc).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || !isOpen || suppressEsc) return;
      e.stopImmediatePropagation();
      closeRef.current(true);
    };
    if (isOpen) window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, suppressEsc]);

  // Lock the background at its current scroll position while open; restore (no jump) on close.
  // Since the AppShell migration the page scrolls inside the stage element, not the window, so the
  // stage is locked too (releaseStage always restores to "", so a close after a route change can
  // never leave the stage wedged). The body lock is kept belt-and-braces for window-scroll edges.
  useEffect(() => {
    if (!isOpen || !lockScroll) return;
    const scrollY = window.scrollY;
    const releaseStage = lockStageScroll();
    const b = document.body;
    const prev = { position: b.style.position, top: b.style.top, left: b.style.left, right: b.style.right, width: b.style.width };
    b.style.position = "fixed"; b.style.top = `-${scrollY}px`; b.style.left = "0"; b.style.right = "0"; b.style.width = "100%";
    return () => {
      releaseStage();
      b.style.position = prev.position; b.style.top = prev.top; b.style.left = prev.left; b.style.right = prev.right; b.style.width = prev.width;
      window.scrollTo(0, scrollY);
    };
  }, [isOpen, lockScroll]);

  if (!isOpen) return null;

  return (
    <>
      <Form11Styles />
      <div onClick={() => close(true)} style={{ position: "fixed", inset: 0, background: "rgba(58,28,20,0.18)", zIndex: 1000 }} />
      <div className={`f11-slide${closing ? " f11-closing" : ""}`} style={{ position: "fixed", top: 0, right: 0, height: "100vh", zIndex: 1001, display: "flex", alignItems: "center", padding: "0 24px", boxSizing: "border-box" }}>
        <div style={{ position: "relative" }} onAnimationEnd={() => { if (closing) onClose(); }}>
          {/* die-cut "editing" spine tab — parchment, shadow-defined, vertical mono label */}
          <div style={{ position: "absolute", top: 12, left: -21, width: 24, height: 92, zIndex: 3, background: F11.parchment, borderRadius: "8px 0 0 8px", boxShadow: "-3px 3px 7px rgba(58,28,20,0.10)", display: "flex", alignItems: "center", justifyContent: "center", paddingRight: 4 }}>
            <span style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", fontFamily: F11_MONO, fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: "#a89a8a", fontWeight: 500 }}>{tabLabel}</span>
          </div>

          {/* maxHeight leaves a small symmetric breathing gap top+bottom (was calc(100vh - 64px)
              to clear the retired top bar; the drawer overlays the full viewport now). */}
          <div style={{ width, maxWidth: "calc(100vw - 60px)", maxHeight: "calc(100vh - 32px)", background: F11.parchment, padding: 7, borderRadius: 14, boxShadow: "0 22px 60px rgba(58,28,20,0.28)", display: "flex" }}>
            <div style={{ flex: 1, border: `1px solid ${F11.burgundy}`, borderRadius: 10, overflow: "hidden", display: "flex", flexDirection: "column", minWidth: 0, position: "relative" }}>
              {header}
              <div
                ref={bodyRef}
                className={`f11-body${showRail ? " f11-rail" : ""}${bodyClassName ? " " + bodyClassName : ""}`}
                style={{ position: "relative", flex: 1, overflowY: "auto", padding: showRail ? "16px 20px 20px 40px" : "16px 20px 20px" }}
              >
                {children}
              </div>
              {footer}
            </div>
          </div>
        </div>
      </div>
    </>
  );
});

/** The portable CSS: motion, scrollbar, the resting-field / select / note primitives, and the rail. */
export const Form11Styles: React.FC = () => (
  <style>{`
    @keyframes f11-slide-in { 0%{transform:translateX(125%) rotate(-5deg);} 65%{transform:translateX(0) rotate(-3deg);} 100%{transform:translateX(0) rotate(0deg);} }
    @keyframes f11-slide-out { 0%{transform:translateX(0) rotate(0deg);} 100%{transform:translateX(130%) rotate(-4deg);} }
    .f11-slide > div { animation: f11-slide-in .55s cubic-bezier(.22,.61,.36,1); transform-origin:center; }
    .f11-slide.f11-closing > div { animation: f11-slide-out .18s cubic-bezier(.5,0,.9,.4) forwards; }
    @media (prefers-reduced-motion: reduce) { .f11-slide > div, .f11-slide.f11-closing > div { animation: none !important; } }
    .f11-body::-webkit-scrollbar{width:7px;} .f11-body::-webkit-scrollbar-thumb{background:#e3d6c8;border-radius:4px;}
    /* Punch-hole rail — recessed discs repeated down the body's left margin. background-attachment:
       local so the holes scroll WITH the content (a mask would pin to the viewport). Tile 34x120,
       hole centred at 17px 30px, radius ~7px: recessed fill + dark inner ring + a faint lower edge. */
    .f11-body.f11-rail{
      background-image:
        radial-gradient(circle 6px at 17px 31px, rgba(255,253,248,0.85), rgba(255,253,248,0) 7px),
        radial-gradient(circle 7px at 17px 30px, rgba(58,28,20,0.18), rgba(58,28,20,0.18) 6.4px, rgba(58,28,20,0) 7.6px),
        radial-gradient(circle 6.2px at 17px 30px, #efe7d9, #efe7d9 6px, rgba(239,231,217,0) 7px);
      background-repeat:repeat-y; background-size:34px 120px; background-position:0 0; background-attachment:local;
    }
    /* resting click-to-edit field */
    .f11-editable{position:relative;display:flex;align-items:center;gap:8px;min-height:38px;padding:8px 11px;background:#fffdf9;border:1px solid #ece2d4;border-radius:8px;cursor:text;transition:border-color .14s,background .14s;margin-top:2px;}
    .f11-editable:hover{border-color:#d8c9b6;background:#fffefb;}
    .f11-editable:focus-visible{outline:none;border-color:#8a9e88;box-shadow:0 0 0 3px rgba(138,158,136,0.16);}
    .f11-fval{flex:1;min-width:0;font-size:13px;color:#3a1c14;line-height:1.35;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
    .f11-fval.wrap{white-space:normal;}
    .f11-fval.ph{color:#b9aa99;}
    .f11-fval.errval{color:#a83a2a;}
    .f11-hint{flex-shrink:0;display:flex;align-items:center;color:#cdbeae;opacity:0;transition:opacity .14s;}
    .f11-editable:hover .f11-hint,.f11-editable:focus-visible .f11-hint{opacity:1;}
    .f11-inp{width:100%;background:#fff;border:1px solid #e0d5c8;border-radius:8px;padding:8px 11px;font-size:12.5px;color:#3a1c14;font-family:'Source Sans Pro',sans-serif;outline:none;margin-top:2px;min-height:38px;}
    .f11-inp:focus{border-color:#8a9e88;box-shadow:0 0 0 3px rgba(138,158,136,0.12);}
    .f11-inp.bad{border-color:#e6bdb0;box-shadow:0 0 0 3px rgba(168,58,42,0.10);}
    /* always-visible native select */
    .f11-select{margin-top:2px;width:100%;min-height:38px;-webkit-appearance:none;appearance:none;padding:8px 30px 8px 11px;font-size:12.5px;color:#3a1c14;font-family:'Source Sans Pro',sans-serif;background-color:#fffdf9;background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='%237c3a2a' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>");background-repeat:no-repeat;background-position:right 10px center;border:1px solid #ece2d4;border-radius:8px;cursor:pointer;outline:none;transition:border-color .14s,background-color .14s;}
    .f11-select:hover{border-color:#d8c9b6;background-color:#fffefb;}
    .f11-select:focus{border-color:#8a9e88;box-shadow:0 0 0 3px rgba(138,158,136,0.16);}
    .f11-select.ph{color:#b9aa99;}
    /* consequence-guard note + buttons */
    .f11-confirm{display:flex;gap:8px;align-items:flex-start;background:#fbf1e7;border:1px solid #ecd9c6;border-radius:9px;padding:9px 11px;font-size:11.5px;color:#8a5a3a;line-height:1.5;}
    .f11-confirm.done{background:#eef2ec;border-color:#d8e0d4;color:#5a6e58;margin-top:8px;}
    .f11-cbtn-go{font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.04em;text-transform:uppercase;background:#f5e2da;color:#7c3a2a;border:1px solid #e8c8bc;border-radius:7px;padding:6px 12px;cursor:pointer;}
    .f11-cbtn-go:hover{background:#efd5ca;}
    .f11-cbtn-keep{font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.04em;text-transform:uppercase;background:transparent;color:#9a8876;border:1px solid #e2d6c8;border-radius:7px;padding:6px 12px;cursor:pointer;}
    .f11-cbtn-keep:hover{color:#7c3a2a;border-color:#d8c9b6;}
    .f11-discard:hover{color:#a83a2a!important;background:#f7eee9;}
  `}</style>
);
