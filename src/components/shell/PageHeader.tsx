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
import { OneScreenMark, MarkName, markHasArt } from "../dashboard/OneScreenMark";
import { PlateCondensedContext } from "./WorkspacePageGrid";
import "./pageHeader.css";

/**
 * ⚠️ THE PLATE FINDS ITS OWN SCROLLER, because there is no single one to assume. `.aglist`,
 * `.msv1` and `.pkgw` scroll THEMSELVES; Discover scrolls in the shell's `.ws-wbody` two levels
 * up; `.ctpage` is `overflow:hidden` and never scrolls at all. Hard-coding any one of those would
 * leave the plate stuck at rest on the other pages — silently, since a header that never condenses
 * looks exactly like a header that has not been scrolled yet.
 *
 * ⚠️ IT MATCHES ON THE COMPUTED `overflow`, NOT ON WHETHER CONTENT CURRENTLY OVERFLOWS. At mount
 * a list may be empty or still loading, so `scrollHeight > clientHeight` is false and the real
 * scroller would be walked straight past — the plate would then never condense on that page for
 * the rest of the session.
 *
 * A page whose root cannot scroll (`.ctpage`) simply keeps the rest state, which is correct: the
 * plate is not covering anything, so it has nothing to condense out of the way for.
 */
const nearestScroller = (from: HTMLElement): HTMLElement | null => {
  let p: HTMLElement | null = from.parentElement;
  while (p) {
    const oy = window.getComputedStyle(p).overflowY;
    if (oy === "auto" || oy === "scroll") return p;
    p = p.parentElement;
  }
  return null;
};

/** Condensed once the scroller has moved at all — the pack's `scrollTop > 4`. */
const useCondensed = (ref: React.RefObject<HTMLElement | null>, enabled: boolean): boolean => {
  const [condensed, setCondensed] = React.useState(false);
  React.useEffect(() => {
    if (!enabled || !ref.current) return;
    const sc = nearestScroller(ref.current);
    if (!sc) return;
    const read = () => setCondensed(sc.scrollTop > 4);
    read(); // a remounting page (the stage keeps pages alive) can arrive already scrolled
    sc.addEventListener("scroll", read, { passive: true });
    return () => sc.removeEventListener("scroll", read);
  }, [ref, enabled]);
  return condensed;
};

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
   * ⚠️ THE UNION WAS CLOSED ON PURPOSE, AND `"workspace"` RE-OPENS IT KNOWINGLY.
   *
   * `compact` and `greeting` were retired because they were SIZE VARIANTS OF THE SAME OBJECT — the
   * same content at a different scale, which is a thing one layout should absorb rather than fork.
   * `workspace` is a different OBJECT with different content rules: it carries a mark and a mono
   * count strip the default has no concept of, and it drops the tool row entirely. That is why
   * re-opening the union is right here and would not be right for a third size. **This is not
   * licence to re-add compact or greeting.**
   *
   * ⚠️ `"full"` MUST RENDER IDENTICALLY TO BEFORE. That contract is what protects Manuscripts,
   * Comparable titles, Import, Help centre and Plans: they are not exempted by a list, they simply
   * never pass the new value. `pageHeaderDefault.test.tsx` fails if a pixel of it moves.
   */
  variant?: "full" | "workspace";
  title: string;
  description?: string;
  /* ⚠️ THERE IS NO `count` PROP — the slot is DELETED from the variant (amendment 7), not merely
     unused. The plate is mark + title + description + actions. The two pages that had one had
     their figure REHOMED rather than dropped; see the notes at those call sites. Deleting the prop
     rather than leaving it inert is deliberate: an accepted-but-unrendered prop is how a page ends
     up passing data that silently goes nowhere. */
  /** The workspace header's 38px mark. Required when `variant="workspace"`; ignored otherwise. */
  mark?: MarkName;
  /* ⚠️ THERE IS NO `markSize` PROP, and its removal was the point. It was a KNOB — any page could
     ask for any size — and the size is a RULE: illustrated → 64px bare, monoline → 38px on a plate.
     `markHasArt` decides, so a page converts when its drawing lands rather than when someone
     remembers to pass a prop. See the note on `markHasArt` in OneScreenMark.tsx. */
  actions?: PageHeaderActions;
  /**
   * ⚠️ THE TOOL ROW — the plate's SECOND row (amendment 8, Phase B): search, filters, group, sort,
   * and the right-aligned mono tally. It rides INSIDE the plate rather than beside it, so the
   * controls pin with the header they belong to.
   *
   * ⚠️ IT IS A ROW OF THE PLATE, NOT A SECOND STICKY ELEMENT. The alternative — a separate sticky
   * strip with `top` set to the plate's height — has to track that height through the condense
   * transition, so it is wrong for 200ms on every scroll and fragile by construction. One
   * container, one border, one shadow, one background, one sticky element.
   *
   * ⚠️ AND IT DOES NOT CONDENSE. Only the identity row shrinks; the controls stay the same size,
   * because a filter you can no longer read is not a filter. See the reservation note in the
   * stylesheet for how the page below is kept from moving when the identity row does shrink.
   *
   * Absent → NO row and NO hairline, and the plate reserves nothing for it.
   */
  toolbar?: React.ReactNode;
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
  mark,
  actions,
  toolbar,
  titleAdornment,
  actionsSlot,
  overflow,
  compact = false,
}) => {
  const acts = (actions ?? []).slice(0, 2); // runtime guard behind the tuple type
  const wsActs = (actions ?? []).slice(0, 2);
  const [moreOpen, setMoreOpen] = React.useState(false);
  const moreRef = React.useRef<HTMLDivElement>(null);
  /* ⚠️ THE HOOK RUNS FOR EVERY VARIANT, and it must — hooks cannot sit behind the `workspace`
     early return without breaking the rules of hooks the moment a caller changes variant. It is
     GATED instead: the default variant passes `false` and never attaches a listener. */
  const plateRef = React.useRef<HTMLElement>(null);
  /**
   * ⚠️ TWO PATHS, AND BOTH ARE LIVE ON PURPOSE (amendment 9, mid-conversion). A page inside a
   * `WorkspacePageGrid` is TOLD when to condense — the grid owns the scroller, the sentinel and the
   * observer, so there is nothing to find and nothing to compute. A page still on the old sticky
   * arrangement has no grid above it, reads `null`, and keeps the legacy scroll listener.
   *
   * ⚠️ `null` IS WHY THIS WORKS. It is distinguishable from `false`, so "no grid above me" and "in a
   * grid, not yet scrolled" are different answers; with a `false` default every unconverted page
   * would silently stop condensing. The legacy hook is GATED on that same null, so a converted page
   * attaches no listener at all.
   *
   * ⚠️ THIS FALLBACK IS TEMPORARY. It goes when the last page converts, together with the sticky
   * wrapper, the reservation padding and the frosted state. Until then the old path must stay alive,
   * because a half-converted app is the one thing worse than a slow conversion.
   */
  const gridCondensed = React.useContext(PlateCondensedContext);
  const legacyCondensed = useCondensed(plateRef, variant === "workspace" && gridCondensed === null);
  const condensed = gridCondensed ?? legacyCondensed;
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
   * `variant === "workspace"` conditionals through the markup below would put the two layouts in one
   * expression, and every future edit to either would risk the other. Two returns, one contract:
   * nothing beneath this block can change what `"full"` renders.
   *
   * ⚠️ LAYOUT IS ON THE INNER ROW, NEVER THE OUTER ELEMENT. `.wsh` owns the hairline and show/hide;
   * `.wsh-row` owns `display:flex`. A single-class layout rule sharing an element with a
   * multi-class visibility rule is how the last two mockups broke.
   */
  if (variant === "workspace") {
    return (
      /* ⚠️ THE STICKY WRAPPER PAINTS NOTHING — no backing strip, ever. See pageHeader.css: an
         opaque band across the gutters is the dead margin this design exists to avoid, and content
         is meant to run under the plate and out past both its edges. */
      /* ⚠️ THE CONDENSED CLASS IS ON THE WRAPPER TOO, and that is the reservation. Only the IDENTITY
         row shrinks (88 → 56), so the wrapper gives back exactly that 32px as padding while it is
         condensed — which keeps the page below from sliding up. It is done with a class rather than
         a measured height because the TOOL ROW's height is unknown to CSS, so the old fixed
         `calc(88 + 2·gap)` reservation could not survive a second row. */
      <div className={`wsh-wrap${condensed ? " wsh-wrap--scrolled" : ""}`}>
        {/* ⚠️ BOTH CLASSES ARE DERIVED — one from `description`, one from the scroller's position.
            There is no height prop and must never be one; see the knob-versus-rule note in the
            stylesheet. */}
        <header ref={plateRef} className={`wsh${description ? "" : " wsh--solo"}${condensed ? " wsh--scrolled" : ""}`}>
        <div className="wsh-row">
          {/* ⚠️ DERIVED FROM THE ARTWORK, NEVER PASSED IN — see the `markHasArt` note. */}
          {mark && (
            <span className={`wsh-mark wsh-mark--${markHasArt(mark) ? "xl" : "md"}`}>
              <OneScreenMark name={mark} />
            </span>
          )}
          {/* ⚠️ TITLE OVER DESCRIPTION IN ONE COLUMN. The count that used to sit to their right is
              GONE (amendment 7) — the plate is mark + title + description + actions. */}
          <div className="wsh-txt">
            <h1 className={`wsh-title${description ? "" : " wsh-title--solo"}`}>
              {title}{titleAdornment}
            </h1>
            {/* ⚠️ ABSENT DESCRIPTION RENDERS NOTHING and the title steps up. The plate keeps its
                full height either way — two pages side by side must read as deliberate, not as one
                being broken. */}
            {description && <p className="wsh-sub">{description}</p>}
          </div>
          <span className="wsh-grow" aria-hidden="true" />
          {(wsActs.length > 0 || actionsSlot) && (
            <div className="wsh-acts">
              {wsActs.length === 0 && actionsSlot}
              {wsActs.map((action, i) => (
                /* ⚠️ THE EXISTING BUTTON STYLES, REUSED — `svh-btn-ink` and `svh-btn-ghost` both
                   already exist. This variant changes WHERE the button sits, not what it is. */
                <button
                  key={i}
                  type="button"
                  className={action.primary ? "svh-btn svh-btn-ink" : "svh-btn svh-btn-ghost"}
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
        {/* ⚠️ NO TOOLBAR → NO ROW AND NO HAIRLINE, and the plate reserves nothing for it. An empty
            row would draw its own separator against the identity row with nothing beneath it —
            the same fault the count strip's empty state had. */}
        {toolbar && <div className="wsh-tools">{toolbar}</div>}
        </header>
      </div>
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
