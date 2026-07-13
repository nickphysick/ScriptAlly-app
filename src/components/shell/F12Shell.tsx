/**
 * F12Shell — the SHARED page scaffold for the F12 master-theme pages (Queries Hub + Contact
 * List; refs design-refs/queries-hub-v14.html + agents-contact-list-v3.html, whose :roots are
 * identical). Built once (overnight run, Stage 2) and consumed by both pages:
 *
 *   F12Page      — the `.t-f12` root: oat ground, full-bleed header (the app-wide CrumbStrip,
 *                  repainted by the .t-f12 --crumb-* tokens, with the page's tools OVERLAID
 *                  right — composition on top of the strip, never an edit to it; Stage 1 owns
 *                  that component), then the page's own bands/panes below (children).
 *   Icirc        — circular hover icon button (header export/help etc.).
 *   F12Primary   — the single filled ink CTA (header only — never in the control bar).
 *   Trig         — FILTER/SORT/GROUP pill trigger; inverts to ink while its popover is open.
 *   F12Popover   — shared popover shell (paper Playfair head · sectioned body · paper foot
 *                  with live count + DONE): closes on outside click and Escape.
 *   PopSection   — mono small-caps label + trailing hairline rule section.
 *   PRow         — radio/checkbox option row with optional subtitle.
 *   Chip         — removable pink active-filter chip.
 *
 * Tokens live in index.css (.t-f12); classes in f12.css. No color-mix(), literal keyframes,
 * reduced-motion honoured in f12.css.
 */
import React, { useEffect, useRef } from "react";
import { CrumbStrip } from "./CrumbStrip";
import { useScriptAllyDb } from "../../lib/db";
import "./f12.css";

/* ── page scaffold ── */

export const F12Page: React.FC<{
  /** Header right cluster (export/help icon buttons + the one filled CTA). */
  tools?: React.ReactNode;
  children: React.ReactNode;
}> = ({ tools, children }) => (
  <div className="t-f12 f12-root">
    <div className="f12-hdwrap">
      <CrumbStrip />
      {tools && <div className="f12-hdtools">{tools}</div>}
    </div>
    {children}
  </div>
);

/* ── header pieces ── */

export const Icirc: React.FC<{ title: string; onClick?: () => void; children: React.ReactNode }> = ({ title, onClick, children }) => (
  <button type="button" className="f12-icirc" title={title} aria-label={title} onClick={onClick}>
    {children}
  </button>
);

/** The header's only right-side item (chrome revision): pink initials avatar + the user's full
 *  name, one link to their account. Renders nothing signed-out. */
export const F12Account: React.FC<{ onClick: () => void }> = ({ onClick }) => {
  const { currentUser } = useScriptAllyDb();
  if (!currentUser) return null;
  const initials = currentUser.name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <button type="button" className="f12-who" onClick={onClick} title="Account settings" aria-label="Account settings">
      <span className="f12-av2" aria-hidden="true">{initials}</span>
      <span className="f12-nm2">{currentUser.name}</span>
    </button>
  );
};

export const F12Primary: React.FC<{ onClick?: () => void; children: React.ReactNode }> = ({ onClick, children }) => (
  <button type="button" className="f12-primary" onClick={onClick}>
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
    {children}
  </button>
);

/* ── control-bar trigger + popover ── */

export const Trig = React.forwardRef<HTMLButtonElement, {
  label: string;
  icon: React.ReactNode;
  open: boolean;
  count?: number;
  onClick: () => void;
}>(({ label, icon, open, count, onClick }, ref) => (
  <button
    ref={ref}
    type="button"
    className={`f12-trig${open ? " f12-active" : ""}`}
    aria-expanded={open}
    aria-haspopup="dialog"
    onClick={onClick}
  >
    {icon}
    {label}
    {count != null && count > 0 && <span className="f12-fcount">{count}</span>}
    <svg className="f12-chev" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
  </button>
));
Trig.displayName = "Trig";

/**
 * Popover shell. Mount INSIDE an .f12-popwrap alongside its trigger; handles outside-click +
 * Escape (returning focus to the wrap's trigger button). Rendered only while open — the
 * caller owns the state.
 */
export const F12Popover: React.FC<{
  width: number;
  title: string;
  onClose: () => void;
  /** Header-right action, e.g. RESET ALL. */
  headAction?: React.ReactNode;
  /** Footer-left live text, e.g. "6 of 20 queries". */
  footText?: React.ReactNode;
  children: React.ReactNode;
}> = ({ width, title, onClose, headAction, footText, children }) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const el = ref.current;
      if (!el) return;
      const wrap = el.closest(".f12-popwrap");
      if (wrap && !wrap.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div ref={ref} className="f12-pop" style={{ width, display: "block" }} role="dialog" aria-label={title}>
      <div className="f12-pop-head">
        <span className="f12-pt">{title}</span>
        {headAction}
      </div>
      <div className="f12-pop-body">{children}</div>
      <div className="f12-pop-foot">
        <span>{footText}</span>
        <button type="button" className="f12-done" onClick={onClose}>DONE</button>
      </div>
    </div>
  );
};

export const PopSection: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="f12-sect">
    <div className="f12-sect-h"><span className="f12-lbl">{label}</span><span className="f12-rule" /></div>
    {children}
  </div>
);

/** Radio (`kind="rad"`) or checkbox (`kind="box"`) option row with optional subtitle. */
export const PRow: React.FC<{
  kind: "rad" | "box";
  on: boolean;
  label: React.ReactNode;
  sub?: string;
  /** Leading adornment before the text (e.g. a StatusDot). */
  lead?: React.ReactNode;
  onClick: () => void;
}> = ({ kind, on, label, sub, lead, onClick }) => (
  <button
    type="button"
    className={`f12-prow${on ? " f12-on" : ""}`}
    role={kind === "rad" ? "radio" : "checkbox"}
    aria-checked={on}
    onClick={onClick}
  >
    <span className={kind === "rad" ? "f12-rad" : "f12-box"} aria-hidden="true" />
    {lead}
    <span className="f12-txt">
      {label}
      {sub && <span className="f12-sub">{sub}</span>}
    </span>
  </button>
);

/* ── active-filter chip ── */

export const Chip: React.FC<{ onRemove: () => void; children: React.ReactNode }> = ({ onRemove, children }) => (
  <span className="f12-chip">
    {children}
    <button type="button" onClick={onRemove} aria-label="Remove filter" title="Remove">×</button>
  </span>
);
