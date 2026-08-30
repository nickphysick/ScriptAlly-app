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
import { MoreHorizontal } from "lucide-react";
/* ⚠️ THE KICKER ARRIVES BY CONTEXT, NOT BY A ROUTER HOOK — see `mastheadSection.ts` for why. */
import { useMastheadSection } from "./mastheadSection";
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
   * ⚠️ THE KICKER IS THE SECTION, AND IT COMES FROM THE APP'S OWN CRUMB DERIVATION — carried here by
   * context rather than read from the router, so this component still renders outside one. The shell
   * computes it from `shellCrumbForPath`, the same pure function the breadcrumb reads, so the pill
   * and the crumb cannot come to disagree about which section a page is in.
   */
  const kicker = useMastheadSection();
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
     * ⚠️ THE MASTHEAD HOLDS NO CONTROL, AND THE GUARD IS THE RULE RATHER THAN A COMMENT.
     *
     * ⚠️ THIS IS THE THIRD FORM OF THIS REFUSAL AND IT RETURNS TO THE FIRST. It began as "no actions,
     * ever"; became "none where the masthead LEAVES", when the two header types made anchoring the
     * question; then "exactly one primary", when the format gained a CTA. The CTA is deleted — the
     * toolbar beneath already carried the page's action, so the masthead stated it twice — and the
     * original refusal is exactly right again. Recorded rather than rewritten, because a guard that
     * has moved twice will be read as arbitrary unless the reasons are visible.
     *
     * ⚠️ WHAT THIS REPLACES: a throw on ANY action, later made conditional on whether the masthead
     * pinned. Both were answers to a design where the header either scrolled out of reach or had to
     * be restored. It does neither now — it scrolls away as content and a separate bar takes over —
     * so an action here is no longer a control that becomes unreachable. It is a page's one call to
     * action, and one is the whole allowance.
     *
     * ⚠️ IT STILL THROWS RATHER THAN IGNORING. Accepting a prop and rendering nothing is how a page
     * ends up passing an action that quietly goes nowhere, which is the same fault as the deleted
     * `count` slot. Each refusal names what to do instead, because a throw that only says "no" gets
     * worked around.
     */
    if (process.env.NODE_ENV !== "production" && (toolbar || actionsSlot || overflow?.length || acts.length)) {
      throw new Error(
        `PageHeader variant="workspace" ("${title}") was passed a control. This masthead holds NONE. ` +
        "It carried the page's primary for two passes and the toolbar beneath carried the same " +
        "action, so every page stated it twice and paid about 30px for the duplicate. A page's " +
        "controls belong in the grid's control row, which is where they already are.",
      );
    }
    return (
      /* ⚠️ NO WRAPPER, NO CARD, NO STATE CLASS. The masthead is content: it paints the window's own
         ground and scrolls away with the page. */
      <header className="wsh">
        {/* ⚠️ ARIA-HIDDEN, BECAUSE IT IS A RULE AND NOT A SEPARATOR IN THE DOCUMENT'S SENSE. An
            `<hr>` here would put a thematic break between a page's title and the page. */}
        <div className="wsh-toprule" aria-hidden="true" />
        {/* ⚠️ NOTHING WHEN ABSENT — not an empty div, not a reserved height. See the prop's note. */}
        <div className="wsh-body">
          {/* ⚠️ THE SECTION, FROM THE ROUTER. Null on a route the crumb does not know, which renders
              nothing rather than an empty pill — a bordered pill with no word in it is worse than no
              pill at all, and it is what a fallback string would produce. */}
          {kicker && <span className="wsh-kicker">{kicker}</span>}
          <h1 className="wsh-title">
            {title}{titleAdornment}
          </h1>
          {/* ⚠️ ABSENT DESCRIPTION RENDERS NOTHING AND RESERVES NOTHING. In flow there is no height
              to keep, so a title-only page is simply shorter. */}
          {description && <p className="wsh-sub">{description}</p>}
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
