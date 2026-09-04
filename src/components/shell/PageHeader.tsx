/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PageHeader — TWO layouts, and they are different objects rather than two sizes of one.
 *
 *   `full`      the standard header of the v2 shell: title → optional description → the page's
 *               actions on their own row → a hairline closing the header. Unchanged, byte for
 *               byte, and `pageHeaderDefault.test.tsx` fails if a pixel of it moves. Import, Help
 *               centre, Plans and the dev package lab render it.
 *
 *   `workspace` THE MASTHEAD (in-flow masthead pack; refs design-refs/169-inflow-masthead-qc.html
 *               + design-refs/170-sticky-control-row.html). Mark, title, description, a closing
 *               hairline — and NOTHING ELSE.
 *
 * ⚠️ THE RULE, AND EVERY OTHER DECISION IN THIS COMPONENT FOLLOWS FROM IT: the masthead is the
 * first thing on a page and it leaves when the user starts working — by scrolling on pages that
 * scroll, by the first click on pages that do not. **It holds no actions, so it never needs to
 * come back within a visit.**
 *
 * ⚠️ WHAT THIS REPLACES, so none of it is reinvented: the workspace variant used to be a PLATE — a
 * fixed-height card with its own fill, border, radius and shadow — that condensed on scroll into a
 * 52px BAND whose title cross-faded into a mono uppercase label. Plate, band, label, cross-fade,
 * the sticky wrapper and its reservation are all gone. The masthead is content; the page's control
 * row does the anchoring.
 */
import React from "react";
import { MoreHorizontal, Plus } from "lucide-react";
/* ⚠️ THE KICKER ARRIVES BY CONTEXT, NOT BY A ROUTER HOOK — see `mastheadSection.ts` for why. */
/* ⚠️ THE TYPE ONLY — `OneScreenMark` IS NO LONGER RENDERED HERE. The masthead draws no mark at
   rest; the mark exists in the collapsed bar, which is a separate element. The `mark` prop survives
   because that bar needs to know which one to draw, so it stays a page's declaration rather than a
   second table keyed by route. */
import type { MarkName } from "../dashboard/OneScreenMark";
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
  /**
   * The page's own mark, as an imported asset URL — 72px, on the page ground, no tile.
   *
   * ⚠️ A URL RATHER THAN A `MarkName`. The mark registry draws monoline SVGs sized for a 20px bar
   * glyph; these are painted illustrations at 100px, and routing them through a name would mean a
   * second registry keyed the same way. A page imports its own asset and hands it over, which is
   * also what lets a page have none — nine of ten do not, and `MarkName` has no absent member.
   */
  icon?: string;
  /**
   * The page's ONE call to action, or none. See the guard in the workspace branch.
   *
   * ⚠️ IT IS AN OBJECT RATHER THAN THE `actions` ARRAY, so "exactly one" is expressible in the type
   * rather than only in a throw. The array stays refused.
   */
  primary?: { label: string; onClick: () => void; disabled?: boolean };
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
  /**
   * ⚠️ A NODE, NOT A STRING, SINCE THE PACKAGES PAGE STATES ITS SCOPE HERE.
   *
   * `builder-refined.html` puts `for **Murphy's Day Out** · Switch book` in this slot — a sentence
   * with a name in it and a deferral to the sidebar's switcher — which a `string` cannot carry.
   * The house law is that a type which cannot represent an offered choice is extended rather than
   * worked around; the alternative was a second slot in the same position, which is how one line
   * comes to have two owners.
   *
   * ⚠️ ADDITIVE, AND PROVED SO: a `string` IS a `ReactNode`, so every existing call site compiles
   * and renders byte-identically. The two render sites below already wrap it in an element.
   */
  description?: React.ReactNode;
  /* ⚠️ THERE IS NO `count` PROP — the slot is DELETED from the variant (amendment 7), not merely
     unused. The plate is mark + title + description + actions. The two pages that had one had
     their figure REHOMED rather than dropped; see the notes at those call sites. Deleting the prop
     rather than leaving it inert is deliberate: an accepted-but-unrendered prop is how a page ends
     up passing data that silently goes nowhere. */
  /** The masthead's mark: 52px BARE when the name has artwork, 38px on its parchment plate when
   *  it is a monoline glyph. Required when `variant="workspace"`; ignored otherwise. */
  mark?: MarkName;
  /* ⚠️ THERE IS NO `markSize` PROP, and its removal was the point: the size is a RULE, not a knob
     any page can turn.
     ⚠️ AND IT IS NOW ONE SIZE FOR BOTH MARK FAMILIES — 52px, in a bare box, illustrated or monoline
     (masthead measure, §2). The previous rule was "illustrated → 52 bare, monoline → 38 on a
     parchment plate", on the reasoning that scaling a PLATED glyph up "would turn a small badge into
     a large blank tile". That reasoning was about the plate, and the plate is gone: ref 173 draws a
     bare 52px box with the glyph at 36, which is a drawing rather than a badge at either size. So
     `markHasArt` is no longer read here — one box, one size, mirrored on the right. */
  actions?: PageHeaderActions;
  /**
   * The `full` layout's tool row. ⚠️ REJECTED BY `workspace`, WHICH THROWS — see the guard in the
   * render. A masthead that carried controls would have to survive the user starting work, which
   * is exactly what this design stops doing.
   */
  toolbar?: React.ReactNode;
  /** Rendered inline immediately right of the title text, baseline-aligned (Discover's Pro pill).
   *  Additive and optional — every existing call site is unchanged. */
  titleAdornment?: React.ReactNode;
  /** A custom control occupying the same slot as `actions` — for pages whose right-hand control
   *  isn't a button (Discover's "Finding for" manuscript selector). Ignored when `actions` is set. */
  actionsSlot?: React.ReactNode;
  /**
   * ⚠️ `lead` IS DELETED — an optional row above the title, and its only caller was Manuscripts'
   * `← All manuscripts`. That departure lives in the record BAR now, shared with Query Centre, so
   * the prop had no consumer and `.wsh-lead` had nothing to style. A prop nothing passes is a knob
   * the next reader goes looking for a use for.
   */
  /** Page operations beyond the two primaries — rendered behind a ⋯ at the end of the tool row.
   *  If a page has six things it can do, five of them are not primary and the header should
   *  say so. Ignored on a compact header, whose actions stay inline. */
  overflow?: PageHeaderOverflowItem[];
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  variant = "full",
  title,
  icon,
  primary,
  description,
  mark,
  actions,
  toolbar,
  titleAdornment,
  actionsSlot,
  overflow,
}) => {
  const acts = (actions ?? []).slice(0, 2); // runtime guard behind the tuple type
  /* Whether THIS page's masthead scrolls away. Published by the grid; `true` outside one. */
  /**
   * ⚠️ THE KICKER IS DELETED (compact header, §1), AND SO IS ITS SOURCE FROM THIS FILE. It was the
   * SECTION name in a bordered pill, carried by context from `shellCrumbForPath` so the pill and
   * the breadcrumb could not disagree. The compact format states the page once — an icon, a title
   * and a sentence — and the section is already in the crumb three inches above it.
   *
   * ⚠️ `mastheadSection.ts` SURVIVES AND IS STILL PROVIDED BY THE SHELL, because it is a general
   * seam rather than the kicker's own; nothing here reads it. If it acquires no other consumer it
   * is the next thing to sweep.
   */
  const [moreOpen, setMoreOpen] = React.useState(false);
  const moreRef = React.useRef<HTMLDivElement>(null);
  /**
   * ⚠️ THE MASTHEAD NO LONGER HAS A STATE, AND THAT IS THE WHOLE OF THE IN-FLOW DESIGN.
   *
   * It used to read `PlateCondensedContext`, latch a cross-fade and swap its title into a mono
   * label on a band. All of it is gone: the masthead is the first thing on the page and it leaves
   * when the user starts working — by scrolling on pages that scroll, by the first click on pages
   * that do not. There is nothing to condense INTO, so there is nothing to condense.
   *
   * ⚠️ THE CONTEXT READ WENT WITH IT, so this component no longer needs a grid above it and no
   * longer throws when it has none. What replaces the throw is the guard below: a masthead that is
   * handed an action is a masthead that would need restoring, which is the one thing this design
   * cannot afford.
   */

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
      {overflow && overflow.length > 0 && (
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
    /**
     * ⚠️ EXACTLY ONE PRIMARY OR NONE, AND THIS IS THE THIRD AND FINAL POSITION OF THIS GUARD.
     *
     * The history, because a guard that has moved three times reads as arbitrary without it:
     * (1) "no actions, ever" — the masthead scrolled out of reach and a control in it became
     * unreachable; (2) "none where the masthead LEAVES", when two header types made anchoring the
     * question; (3) "no control at all", when the CTA and the toolbar beneath it carried the same
     * action and every page stated it twice. Each was right about its own design.
     *
     * ⚠️ WHAT CHANGED IS THAT THE DUPLICATE IS NOW FORECLOSED RATHER THAN AVOIDED. The primary
     * MOVES here from the toolbar rather than joining it — the census is asserted, not intended —
     * so the reason (3) existed is gone, and the header is the one place a page's call to action
     * lives. `toolbar`, `actionsSlot`, `overflow` and the `actions` array stay refused: those are
     * plural surfaces, and the allowance is one.
     *
     * ⚠️ IT THROWS RATHER THAN IGNORING. Accepting a prop and rendering nothing is how a page ends
     * up passing an action that quietly goes nowhere.
     */
    if (process.env.NODE_ENV !== "production" && (toolbar || actionsSlot || overflow?.length || acts.length)) {
      throw new Error(
        `PageHeader variant="workspace" ("${title}") was passed a plural control surface. ` +
        "This masthead holds EXACTLY ONE primary action or none — pass `primary`. " +
        "`toolbar`, `actionsSlot`, `overflow` and `actions` are refused: a header that can hold " +
        "several controls becomes a second toolbar, which is what this format replaced.",
      );
    }
    return (
      /* ⚠️ NO WRAPPER, NO CARD, NO STATE CLASS. The masthead is content: it paints the window's own
         ground and scrolls away with the page. */
      <header className="wsh">
        {/* ⚠️ ARIA-HIDDEN, BECAUSE IT IS A RULE AND NOT A SEPARATOR IN THE DOCUMENT'S SENSE. An
            `<hr>` here would put a thematic break between a page's title and the page. */}
        <div className="wsh-toprule" aria-hidden="true" />
        <div className="wsh-row">
          {/**
            * ⚠️ THE ICON SITS DIRECTLY ON THE PAGE GROUND — no tile, no border, no plate, no
            * background of its own. The ref draws it in a 64px rounded card with a white fill and
            * `object-fit: cover`; the brief names 72px, `contain`, and bare ground, and gives the
            * reason. A ref wins on what it shows, except where the pack names a value AND its
            * reason — and a tile would put a second object in a row whose whole job is to be one.
            *
            * ⚠️ ABSENT MEANS NO SLOT, NOT AN EMPTY BOX. Nine of the ten pages have no asset yet, and
            * a reserved 72px well on each would be nine pages with a hole where a picture will go.
            * The text starts at the gutter on those, which is asserted rather than assumed.
            *
            * ⚠️ `alt=""`, BECAUSE THE TITLE IS BESIDE IT. The icon names the page a second time; a
            * screen reader hearing "Contact list, Contact list" is the mark's fault, not the
            * heading's.
            */}
          {icon && <img className="wsh-icon" src={icon} alt="" />}
          <div className="wsh-text">
            <h1 className="wsh-title">
              {title}{titleAdornment}
            </h1>
            {/* ⚠️ ABSENT DESCRIPTION RENDERS NOTHING AND RESERVES NOTHING. In flow there is no
                height to keep, so a title-only page is simply shorter. */}
            {description && <p className="wsh-sub">{description}</p>}
          </div>
          {/**
            * ⚠️ ONE BUTTON, AND IT IS THE PAGE'S — the same handler the toolbar used to call, moved
            * rather than copied. The slim bar renders the same `primary` at its own size, so a page
            * states its call to action once and it survives the scroll.
            */}
          {primary && (
            /* ⚠️ `disabled` IS NOT DECORATION — Query Centre's `Log new query` greys out while a
               draft is open, and moving the button here without it was a silent behaviour
               regression. `queryReentry` caught it, which is what that lock is for. */
            <button type="button" className="wsh-cta" onClick={primary.onClick} disabled={primary.disabled}>
              <Plus aria-hidden="true" />
              {primary.label}
            </button>
          )}
        </div>
      </header>
    );
  }

  return (
    <header className={"svh svh--full"}>
      <div className="svh-top">
        <div className="svh-txt">
          <h1 className="svh-title">
            {title}
            {titleAdornment}
          </h1>
          {description && <div className="svh-sub">{description}</div>}
        </div>
      </div>
      {/* THE TOOL ROW (Baked 10) — the default: the page's actions on their own row, above the
          hairline, primary pink at the RIGHT. */}
      {(acts.length > 0 || actionsSlot || (overflow && overflow.length > 0)) && (
        <div className="svh-tools">{controls}</div>
      )}
      <div className="svh-rule" />
    </header>
  );
};
