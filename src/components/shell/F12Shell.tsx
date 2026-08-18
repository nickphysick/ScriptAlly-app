/**
 * F12Shell — the SHARED page scaffold for the F12 master-theme pages (Queries Hub + Contact
 * List; refs design-refs/queries-hub-v14.html + agents-contact-list-v3.html, whose :roots are
 * identical). Built once (overnight run, Stage 2) and consumed by both pages:
 *
 *   F12Page      — the `.t-f12` root: oat ground, full-bleed header (the page's OWN crumb strip
 *                  — the app-wide CrumbStrip component is long deleted — painted by the .t-f12
 *                  --crumb-* tokens, with the page's tools OVERLAID
 *                  right — composition on top of the strip, never an edit to it; Stage 1 owns
 *                  that component), then the page's own bands/panes below (children).
 *   Icirc        — circular hover icon button (header export/help etc.).
 *   F12Primary   — the single filled ink CTA (header only — never in the control bar).
 *   IconTrig     — FILTER/SORT/GROUP 36px icon trigger (value tooltip); inverts while open.
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
import { createPortal } from "react-dom";
import "./f12.css";

/* ── page scaffold + header pieces RETIRED (shell follow-up P3) ──
   F12Page / Icirc / F12Primary / F12Account are deleted: the v2 shell draws the chrome they
   drew, Queries renders its own headerless .t-f12 root, and the To-do breadcrumb bar died with
   the hardback spine. The control-bar triggers + popovers below stay — Queries and the
   reading-pane timeline still consume them. ── */

/* ── control-bar trigger + popover ── */

/**
 * Icon-only trigger (chrome revision; ref .iconctl): 36px bordered icon button in the list-pane
 * head. `tip` doubles as the aria-label AND the hover tooltip — it must carry the CURRENT value
 * (e.g. "SORT · LAST ACTIVITY") so the icon is never the only clue. Filter passes `count` for
 * the corner pink badge. Inverts to solid ink while its popover is open.
 */
export const IconTrig = React.forwardRef<HTMLButtonElement, {
  tip: string;
  icon: React.ReactNode;
  open: boolean;
  count?: number;
  onClick: () => void;
}>(({ tip, icon, open, count, onClick }, ref) => (
  <button
    ref={ref}
    type="button"
    className={`f12-iconctl${open ? " f12-active" : ""}`}
    aria-expanded={open}
    aria-haspopup="dialog"
    aria-label={tip}
    onClick={onClick}
  >
    {icon}
    {count != null && count > 0 && <span className="f12-fcorner">{count}</span>}
    <span className="f12-tip" aria-hidden="true">{tip}</span>
  </button>
));
IconTrig.displayName = "IconTrig";

/**
 * PillTrig — the Queries list card's Filter / Sort trigger.
 *
 * v5 P1 (ref qdb-create-motion.html) made it COMPACT: a 36px icon-only circle, so the search field
 * takes the rest of the header row. The v4 label and chevron are gone from the face — the word now
 * lives in the `title` tooltip, in the aria-label, AND in the popover's own header, so nothing is
 * lost to a user who can't hover.
 *
 * `count` renders a corner badge — for a control holding several values at once (Filter). A
 * single-choice control (Sort) passes `value` instead: it enriches the accessible name
 * ("Sort: Name A–Z") but shows no marker, because its state reads in the popover it opens.
 */
export const PillTrig = React.forwardRef<HTMLButtonElement, {
  label: string;
  icon: React.ReactNode;
  open: boolean;
  /** Set away from its default — a subtle resting tint, never a second state marker. */
  active?: boolean;
  /** Single-choice controls name their choice in the accessible label. */
  value?: string;
  /** Multi-value controls show a count badge. */
  count?: number;
  onClick: () => void;
}>(({ label, icon, open, active, value, count, onClick }, ref) => (
  <button
    ref={ref}
    type="button"
    className={`f12-pill${open || active ? " f12-active" : ""}`}
    aria-expanded={open}
    aria-haspopup="dialog"
    aria-label={value ? `${label}: ${value}` : label}
    title={label}
    onClick={onClick}
  >
    {icon}
    {count != null && count > 0 && <span className="f12-pcount">{count}</span>}
  </button>
));
PillTrig.displayName = "PillTrig";

/**
 * Popover shell — PORTALLED to document.body (chrome revision) so the list pane's
 * overflow:hidden can never clip it; positioned against its trigger via the caller's
 * useFixedMenu `menuStyle` (the codebase's anchored-fixed utility). The portal wrapper
 * carries .t-f12 so every token still resolves outside the page root. Keep the trigger
 * inside an .f12-popwrap — outside-click treats clicks there as "not outside" (the
 * trigger's own onClick owns the toggle). Escape closes; first row is focused on open.
 */
export const F12Popover: React.FC<{
  width: number;
  title: string;
  onClose: () => void;
  /** Anchored position from useFixedMenu(open) — REQUIRED for the portalled placement. */
  style?: React.CSSProperties;
  /** Header-right action, e.g. RESET ALL. */
  headAction?: React.ReactNode;
  /** Footer-left live text, e.g. "6 of 20 queries". */
  footText?: React.ReactNode;
  /**
   * §8 — the panel's own element, for `useFixedMenu`'s `auto` placement.
   *
   * ⚠️ THE FLIP IS DECIDED BY MEASUREMENT, and the thing to measure is this element. Without a
   * handle on it the hook has to guess how tall a filter panel is, which is the guess that puts a
   * panel's foot below the fold.
   */
  panelRef?: React.RefObject<HTMLElement | null>;
  children: React.ReactNode;
}> = ({ width, title, onClose, style, headAction, footText, panelRef, children }) => {
  const ref = useRef<HTMLDivElement>(null);
  /* one element, two holders: the outside-click handler's and the caller's placement measurement */
  useEffect(() => { if (panelRef) (panelRef as React.MutableRefObject<HTMLElement | null>).current = ref.current; });
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const el = ref.current;
      const t = e.target as Node;
      if (!el) return;
      // Not outside: clicks in the popover itself, or on any trigger wrap (its onClick toggles).
      if (el.contains(t) || (t instanceof Element && t.closest(".f12-popwrap"))) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  // Keyboard entry: focus the first option so Tab/Space work immediately from the trigger.
  useEffect(() => {
    ref.current?.querySelector<HTMLElement>("button, [href], input")?.focus();
  }, []);

  return createPortal(
    <div className="t-f12 qc-neutral">
      <div
        ref={ref}
        className="f12-pop"
        /* ⚠️ A FLEX COLUMN (§8), so a `max-height` from the caller squeezes the BODY and leaves the
           head and foot pinned. As a block it scrolled as a whole and took the foot with it. */
        style={{ width, display: "flex", flexDirection: "column", minHeight: 0, zIndex: 60, ...style }}
        role="dialog"
        aria-label={title}
      >
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
    </div>,
    document.body
  );
};

/**
 * F12Panel — the page's ONE editor popover (§1, ref design-refs/161-attach-popover.html).
 *
 * ⚠️ IT REPLACES `F12Popover` FOR EDITORS, and the difference is not decoration. `F12Popover` is a
 * titled FILTER DIALOG: a cream head, a display-size Playfair title and a DONE foot — a shape that
 * says "make your changes and confirm". The materials editors commit as you go, so the confirm had
 * no job, and the surface was making a promise the behaviour did not keep. Nothing else in the
 * product looks like that sheet.
 *
 * ⚠️ SO THERE IS NO `Done` AND NO `Save`, AND THAT IS A PROPERTY OF THE COMPONENT rather than a
 * choice each caller makes. Click away or Esc closes, exactly as the filter and sort panels do.
 *
 * ⚠️ AND IT RETURNS FOCUS TO WHAT OPENED IT. A popover that closes into nowhere leaves a keyboard
 * reader at the top of the document; `onClose` is where the caller re-focuses, and Esc routes
 * through it rather than around it.
 */
export const F12Panel: React.FC<{
  open: boolean;
  /** The mono eyebrow — `OPENING SAMPLE`, `EMAIL`. Never a display-size title. */
  eyebrow: string;
  onClose: () => void;
  style?: React.CSSProperties;
  width?: number;
  panelRef?: React.RefObject<HTMLElement | null>;
  children: React.ReactNode;
}> = ({ open, eyebrow, onClose, style, width = 246, panelRef, children }) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (panelRef) (panelRef as React.MutableRefObject<HTMLElement | null>).current = ref.current; });
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (ref.current?.contains(t) || (t instanceof Element && t.closest(".f12-popwrap"))) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); onClose(); } };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open, onClose]);
  if (!open) return null;
  return createPortal(
    <div className="t-f12 qc-neutral">
      <div ref={ref} className="f12-panel" style={{ width, zIndex: 60, ...style }} role="dialog" aria-label={eyebrow}>
        <div className="f12-panel-eyebrow">{eyebrow}</div>
        {children}
      </div>
    </div>,
    document.body
  );
};

/**
 * F12Menu — a lightweight portalled action menu (chrome revision / interactions): the ⋯ overflow
 * on the control bar, the corrections ⋯ on timeline rows, etc. Unlike F12Popover (titled filter
 * dialog), this is a bare list of actions. Portalled to document.body inside a .t-f12 wrapper
 * (tokens resolve, no clip), positioned via the caller's useFixedMenu `style`. Keep the trigger in
 * an .f12-popwrap so its own onClick owns the toggle. Escape + outside-click close.
 */
/**
 * ⚠️ `hint` IS A RIGHT-ALIGNED MONO NOTE, not a second label (§2). It states what choosing the row
 * WILL DO — `ATTACHED` on one already on the send, `→ SIZE` on one that hands over to an editor,
 * `FREE TEXT` on one that opens a field. A writer should know that before clicking, not after.
 */
export type F12MenuItem = "divider" | { label: string; hint?: string; icon?: React.ReactNode; onClick: () => void; danger?: boolean; disabled?: boolean };
export const F12Menu: React.FC<{
  open: boolean;
  onClose: () => void;
  style?: React.CSSProperties;
  items: F12MenuItem[];
  ariaLabel?: string;
}> = ({ open, onClose, style, items, ariaLabel }) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (ref.current?.contains(t) || (t instanceof Element && t.closest(".f12-popwrap"))) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open, onClose]);
  if (!open) return null;
  return createPortal(
    <div className="t-f12 qc-neutral">
      <div ref={ref} className="f12-menu" style={{ zIndex: 60, ...style }} role="menu" aria-label={ariaLabel}>
        {items.map((it, i) =>
          it === "divider" ? (
            <div key={i} className="f12-menu-sep" aria-hidden="true" />
          ) : (
            <button
              key={i}
              type="button"
              role="menuitem"
              className={`f12-menu-item${it.danger ? " f12-danger" : ""}`}
              disabled={it.disabled}
              onClick={() => { it.onClick(); onClose(); }}
            >
              {it.icon}
              {it.label}
              {it.hint && <span className="f12-menu-hint">{it.hint}</span>}
            </button>
          )
        )}
      </div>
    </div>,
    document.body
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
