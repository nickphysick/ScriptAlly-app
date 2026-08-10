/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PageHeader — the standard page header of the v2 shell (Phase 4 of the rollout; ref
 * design-refs/scriptally-shell-v2.html .pagehead): title → optional description → up to TWO
 * actions bottom-right on the description's baseline → a hairline rule closing the header.
 * Everything below the rule is page content.
 *
 * ONE variant (the flyouts pack retired compact AND greeting — the dashboard returned to its
 * original centred header): full — 40px Playfair title, optional Playfair description, up to
 * two actions, the closing rule. Every routed page except the dashboard renders it.
 *
 * Actions: maximum two, enforced in the type (a tuple union) AND with a runtime slice for
 * un-typed call sites. Secondary = parchment + hairline; primary = the Form 11 soft-pink
 * button. There is no dark-pill CTA anywhere in the app.
 */
import React from "react";
import { MoreHorizontal } from "lucide-react";
import { OneScreenMark, MarkName } from "../dashboard/OneScreenMark";
import "./pageHeader.css";

export interface PageHeaderAction {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
  /** The Form 11 soft-pink primary. At most one per header, rendered where given (rightmost by convention). */
  primary?: boolean;
  /** ⚠️ THE INK PRIMARY (corrections fix 6). Pink means CREATION or WARNING in this app — "Add a
   *  task", "Add an agent". A page's principal ACTION on things that already exist ("Work the
   *  list") is ink: it is not making anything, and dressing it pink puts it in the same family as
   *  the ＋ beside it, which is exactly the confusion. `ink` and `primary` are mutually
   *  exclusive; ink wins if both are set. */
  ink?: boolean;
  /** The HOUSE disabled treatment (todo rebuild P4): paper fill, hairline border, faint text,
   *  no shadow, cursor:not-allowed — never dashed, never opacity-only. */
  disabled?: boolean;
}

/** ⚠️ MAX TWO ACTIONS — the tuple union makes a third a TYPE ERROR, deliberately.
 *  A page header is where actions go to be NOTICED, and a row of five is a row of none. That
 *  reasoning survived the move to a tool row unchanged: the row is a new ARRANGEMENT of the same
 *  constraint, not a licence to relax it. Anything beyond two goes to `overflow`.
 *  If a page seems to need three co-equal primaries, that is usually a header doing a job that
 *  belongs in the content — raise the page, do not widen this. */
export type PageHeaderActions = [] | [PageHeaderAction] | [PageHeaderAction, PageHeaderAction];

/** A page operation that is real but NOT primary — it lives behind the row's ⋯ menu. */
export interface PageHeaderOverflowItem {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

export interface PageHeaderProps {
  /** One variant remains; the prop survives (optional) so existing `variant="full"` call
   *  sites stand unchanged. */
  /**
   * ⚠️ THE UNION WAS CLOSED ON PURPOSE, AND `"band"` RE-OPENS IT KNOWINGLY. `compact` and
   * `greeting` were RETIRED by the flyouts pack on the conclusion that one full layout was right;
   * this is not their return. The band is a 60px workspace header on a sage ground — a different
   * OBJECT, not a second full layout — and pages opt in explicitly, one prop at a time.
   *
   * ⚠️ `"full"` MUST RENDER IDENTICALLY TO BEFORE. That contract is what protects Manuscripts,
   * Comparable titles, Import, Help centre and Plans: they are not exempted by a list, they simply
   * never pass the new value. `pageHeaderDefault.test.tsx` fails if a pixel of it moves.
   */
  variant?: "full" | "band";
  title: string;
  description?: string;
  /** The band's mono count strip — DATA, never prose. Ignored by the default variant. */
  count?: React.ReactNode;
  /** The band's 30px mark. Required when `variant="band"`; ignored otherwise. */
  mark?: MarkName;
  actions?: PageHeaderActions;
  /** Rendered inline immediately right of the title text, baseline-aligned (Discover's Pro pill).
   *  Additive and optional — every existing call site is unchanged. */
  titleAdornment?: React.ReactNode;
  /** A custom control occupying the same slot as `actions` — for pages whose right-hand control
   *  isn't a button (Discover's "Finding for" manuscript selector). Ignored when `actions` is set. */
  actionsSlot?: React.ReactNode;
  /** Page operations beyond the two primaries — rendered behind a ⋯ at the end of the tool row.
   *  If a page has six things it can do, five of them are not primary and the header should
   *  say so. Ignored on a compact header, whose actions stay inline. */
  overflow?: PageHeaderOverflowItem[];
  /**
   * The lean masthead for WORKSPACE pages — a fixed-height master–detail surface where every
   * pixel of header is working area taken from the panes below (the Queries Hub). Drops the
   * subtitle, takes the title to 26px, tightens the vertical padding and centres the title row
   * against the actions. Default false: every other page is byte-identical without it.
   *
   * NOT a return of the retired `variant: "compact"` — that was a second full layout, and one
   * header layout for every page is the win worth keeping. This is a density flag on the one
   * layout. See pageHeader.test.tsx, which locks both halves of that distinction.
   */
  compact?: boolean;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  variant = "full",
  title,
  description,
  count,
  mark,
  actions,
  titleAdornment,
  actionsSlot,
  overflow,
  compact = false,
}) => {
  const acts = (actions ?? []).slice(0, 2); // runtime guard behind the tuple type
  const bandActs = (actions ?? []).slice(0, 2);
  const [moreOpen, setMoreOpen] = React.useState(false);
  const moreRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!moreOpen) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && moreRef.current?.contains(t)) return;
      setMoreOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setMoreOpen(false); };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [moreOpen]);

  const controls = (
    <>
      {acts.length === 0 && actionsSlot}
      {acts.map((action, i) => (
        <button
          key={i}
          type="button"
          className={action.ink ? "svh-btn svh-btn-ink" : action.primary ? "svh-btn svh-btn-primary" : "svh-btn svh-btn-ghost"}
          onClick={action.onClick}
          disabled={action.disabled}
        >
          {action.icon}
          {action.label}
        </button>
      ))}
      {/* OVERFLOW — everything that is a real page operation but not one of the two primaries. */}
      {!compact && overflow && overflow.length > 0 && (
        <div className="svh-morewrap" ref={moreRef}>
          <button
            type="button"
            className="svh-more"
            aria-haspopup="menu"
            aria-expanded={moreOpen}
            aria-label="More actions"
            onClick={() => setMoreOpen((v) => !v)}
          >
            <MoreHorizontal aria-hidden="true" />
          </button>
          {moreOpen && (
            <div className="svh-moremenu" role="menu">
              {overflow.map((item, i) => (
                <button
                  key={i}
                  type="button"
                  role="menuitem"
                  className="svh-morerow"
                  disabled={item.disabled}
                  onClick={() => { setMoreOpen(false); item.onClick(); }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );

  /**
   * ⚠️ THE BAND RETURNS EARLY, and that is the mechanism protecting the default. Threading
   * `variant === "band"` conditionals through the markup below would put the two layouts in one
   * expression, and every future edit to either would risk the other. Two returns, one contract:
   * nothing beneath this block can change what `"full"` renders.
   *
   * ⚠️ LAYOUT IS ON THE INNER ROW, NEVER THE OUTER ELEMENT. `.pb` owns background and show/hide;
   * `.pb-row` owns `display:flex`. A single-class layout rule sharing an element with a
   * multi-class visibility rule is how the last two mockups broke.
   */
  if (variant === "band") {
    return (
      <header className="pb">
        <div className="pb-row">
          {mark && <span className="pb-mark"><OneScreenMark name={mark} /></span>}
          <h1 className="pb-title">{title}{titleAdornment}</h1>
          {/* ⚠️ ABSENT COUNT RENDERS NOTHING — not an empty strip, which would draw a bare divider
              against the title. */}
          {count != null && count !== false && <div className="pb-count">{count}</div>}
          <span className="pb-grow" aria-hidden="true" />
          {(bandActs.length > 0 || actionsSlot) && (
            <div className="pb-acts">
              {bandActs.length === 0 && actionsSlot}
              {bandActs.map((action, i) => (
                <button
                  key={i}
                  type="button"
                  /* ⚠️ INK IS THE PRIMARY HERE, NOT PINK — the new grammar: ink starts something,
                     pink records something that happened. */
                  className={action.primary ? "pb-btn pb-btn-primary" : "pb-btn"}
                  onClick={action.onClick}
                  disabled={action.disabled}
                >
                  {action.icon}
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>
    );
  }

  return (
    <header className={`svh svh--full${compact ? " svh--compact" : ""}`}>
      <div className="svh-top">
        <div className="svh-txt">
          <h1 className="svh-title">
            {title}
            {titleAdornment}
          </h1>
          {description && !compact && <div className="svh-sub">{description}</div>}
        </div>
        {/* ⚠️ COMPACT KEEPS THE ACTIONS INLINE on the title row. On a fixed-height master–detail
            surface, header height is taken directly from the panes below — which is the whole
            reason compact exists, and giving the actions their own row would add back exactly
            the height it was built to remove. */}
        {compact && (acts.length > 0 || actionsSlot) && <div className="svh-acts">{controls}</div>}
      </div>
      {/* THE TOOL ROW (Baked 10) — the default: the page's actions on their own row, above the
          hairline, primary pink at the RIGHT. */}
      {!compact && (acts.length > 0 || actionsSlot || (overflow && overflow.length > 0)) && (
        <div className="svh-tools">{controls}</div>
      )}
      <div className="svh-rule" />
    </header>
  );
};
