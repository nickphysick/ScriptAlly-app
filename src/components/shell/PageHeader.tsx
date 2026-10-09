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
import { HeaderSheet } from "./HeaderSheet";
import { MoreHorizontal, Plus } from "lucide-react";
/* ⚠️ THE KICKER ARRIVES BY CONTEXT, NOT BY A ROUTER HOOK — see `mastheadSection.ts` for why. */
/* ⚠️ THE TYPE ONLY — `OneScreenMark` IS NO LONGER RENDERED HERE. The masthead draws no mark at
   rest; the mark exists in the collapsed bar, which is a separate element. The `mark` prop survives
   because that bar needs to know which one to draw, so it stays a page's declaration rather than a
   second table keyed by route. */
import type { MarkName } from "../dashboard/OneScreenMark";
import { useMastheadSection } from "./mastheadSection";
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

import type { LivingLine, LivingRun } from "../../lib/livingLine";
import { runsText } from "../../lib/livingLine";
export type { LivingLine, LivingRun };
/**
 * A page opts in by passing this. `count` is `null` until the page's count is SETTLED: the fixed
 * shape renders with both lines empty but holding their space, so the page name is never flashed
 * and then replaced. `copy` is the page's own formula, derived from the count (and whatever facts
 * the page closes over) — never stored.
 */
export interface LivingHeader {
  count: number | null;
  copy: (count: number) => LivingLine;
  /**
   * THE EMPTY STATE (count 0, a page with nothing in it — never a filtered one). No `<h1>` and no
   * rule: the eyebrow carries the page's name. The heading is the situation (Special Elite 29px) and
   * the subline says what will happen; the buttons and the art stay exactly where they are.
   */
  empty?: { heading: string; subline: readonly LivingRun[] };
}

export function LivingRuns({ runs }: { runs: readonly LivingRun[] }) {
  return (
    <>
      {runs.map((r, i) =>
        typeof r === "string" ? <React.Fragment key={i}>{r}</React.Fragment>
          : "b" in r ? <b key={i}>{r.b}</b>
          : <span key={i} className="ph-ms">{r.ms}</span>)}
    </>
  );
}

/**
 * The line that changes: re-keyed by its own text, so a CHANGE of text remounts the span and runs the
 * cross-fade — and the first render does not (nothing has changed yet). `delay` staggers the subline.
 */
function LivingText({ text, children, delay = 0 }: { text: string; children: React.ReactNode; delay?: number }) {
  const first = React.useRef(true);
  const was = React.useRef(text);
  const changed = !first.current && was.current !== text;
  React.useEffect(() => { first.current = false; was.current = text; }, [text]);
  return (
    <span key={text} className={`ph-live${changed ? " ph-swap" : ""}`} style={changed && delay ? { animationDelay: `${delay}ms` } : undefined}>
      {children}
    </span>
  );
}

export interface PageHeaderProps {
  /**
   * LIVING HEADERS — opt in by passing the count and the page's copy function (`full` only). The
   * hero then takes the fixed shape (§1 of the brief) and only the headline's and subline's TEXT
   * follow the count; `title` stays the page's name for the eyebrow. Every page that does not pass
   * this renders exactly as it did.
   */
  living?: LivingHeader;
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
  /**
   * §3 (page header v1) — TWO SIZES OF ONE HEADER, and the names are kept rather than renamed so
   * nine mounts do not churn: `full` is the OPEN header (eyebrow · 56px title · intro · actions ·
   * art, on Query Centre and Contact list) and `workspace` is the COMPACT one (a two-column row:
   * eyebrow · 44px title · intro, with the actions beside them) on every other workspace route.
   */
  variant?: "full" | "workspace";
  /**
   * §3 — A REF ON THE PRIMARY, because focus has to come back to it.
   *
   * ⚠️ IT IS NOT DECORATION: the Query Centre's create flow returns focus to "+ Log a query" when
   * it closes, and that button used to be the page's own. Moving it into this component without
   * the ref would have left the flow returning focus to nothing — a keyboard reader dropped at the
   * top of the document every time they cancelled.
   */
  primaryRef?: React.Ref<HTMLButtonElement>;
  /** §3.1 — the secondary action, beside the primary. Absent renders nothing. */
  secondary?: { label: string; onClick: () => void; disabled?: boolean };
  /** §3.1 — the drawing, anchored to the header's bottom-right. `full` only; absent renders no slot. */
  art?: React.ReactNode;
  /**
   * THE PLATE (qc-plate-header-v1, 4 Oct) — opt-in, `full` only, and today the Query Centre's alone.
   * The header becomes a white plate standing on the page ground, and its drawing splits in two:
   * `art` becomes the UNDER layer, clipped by a layer that IS the plate (so the brush stops at the
   * plate's edge) and faded in from the left; `artFigure` is the OVER layer, the same drawing with the
   * see-through brush removed, unclipped and stacked above the plate's hairline and shadow, so where
   * the courier crosses the plate's top edge the edge passes behind him. Same box, same place.
   *
   * ⚠️ A PROP PER PAGE, NOT A VARIANT: the rollout to the other full headers is this flag on each page.
   */
  plate?: boolean;
  /** The plate's OVER layer (see `plate`). Ignored without `plate`. */
  artFigure?: React.ReactNode;
  /**
   * THE BAND (Query Centre v126, 5 Oct) — opt-in, `full` only, and today the Query Centre's alone. The
   * header becomes a full-bleed anthracite band starting directly under the top bar: the text block
   * left-aligned with `art` (a drawing in a white disc) on its right, the pair centred on the column.
   * The plate path stays for anyone else; a page passes one or the other.
   */
  band?: boolean;
  /**
   * THE FIXED BAND (Analytics v17, 5 Oct; ref design-refs/analytics-v17.html) — a modifier of `band`, and
   * Analytics' alone: the band 337px tall with its contents vertically centred, a 250px disc rather than the
   * courier's 290, and no eyebrow. ⚠️ A MODIFIER, NOT A SECOND BAND: every rule it adds names `.ph--bandfix`,
   * so the Query Centre — which does not pass it — renders exactly as before (AN17-3). Ignored without `band`.
   */
  bandFixed?: boolean;
  /**
   * THE HEADER CARD (ink shell v1 fix-ups, 7 Oct) — opt-in, and the Query Centre's alone (both its states).
   * With `band`, the full-bleed band becomes a rounded card (radius 18, clipped) sitting inside the sheet:
   * 20px of paper above it so the folder tab joins paper, its edges on the page's content column, its
   * contents laid out against the card. Without `band` (the light empty state) it only takes the card's
   * top gap — the empty state keeps its look. ⚠️ A MODIFIER: every rule names `.ph--card`, so Analytics and
   * the Contact list, which pass `band` and not this, keep their full-bleed bands.
   */
  card?: boolean;
  /**
   * THE COMPACT CARD (Query Centre v131 §1) — a modifier of `card`: 178px tall, the title in the
   * typewriter at 40, the sentence at 16.5/1.45, the two pills STACKED to the left of a 150px disc, the
   * contents vertically centred. ⚠️ Every rule names `.ph--compact`; ignored without `band` + `card`, so
   * the empty state (which passes `card` alone) and every other band are untouched.
   */
  compact?: boolean;
  /**
   * §4 (page header v2) — A PANEL ONE OF THE ACTIONS OPENS, anchored to the actions row: the
   * Contact list's quick-add card drops 10px below "+ Add an agent". `full` only.
   *
   * ⚠️ IT RENDERS INSIDE `.ph-acts`, WHICH IS WHY THAT ROW IS POSITIONED: it is the anchor. The
   * panel states its own `z-index`, and nothing between it and the page creates a stacking context,
   * so that alone puts it over the count cards below the rule.
   */
  actionsPopover?: React.ReactNode;
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
  /** ⚠️ THE PAGE'S PICTURE, right of the text and left of the primary — `workspace` only, and
   *  absent on every page that does not pass one. See the note at its render site. */
  illo?: React.ReactNode;
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
  primaryRef,
  secondary,
  art,
  plate = false,
  artFigure,
  band = false,
  bandFixed = false,
  card = false,
  compact = false,
  title,
  icon,
  primary,
  description,
  mark,
  actions,
  toolbar,
  titleAdornment,
  actionsPopover,
  illo,
  actionsSlot,
  overflow,
  living,
}) => {
  /**
   * §3.1/§3.2 — THE EYEBROW'S SECTION ARRIVES BY CONTEXT, never as a prop.
   *
   * ⚠️ AND IT IS THE SHELL'S OWN ANSWER, which is what stops the header and the sidebar disagreeing
   * about which section a page is in. A prop would be a second table keyed by route, and this app
   * has been caught by exactly that before: the pill and the crumb naming different sections for
   * one page, each correct in its own file.
   */
  const section = useMastheadSection();

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
      <header className="ph ph--compact hsheet-host" data-probe="page-header" data-size="compact">
        <HeaderSheet />
        {/**
          * §3.2 — A TWO-COLUMN ROW: the eyebrow, the 44px title and the intro on the left; the
          * actions on the right, on one line, bottom-aligned with the text. The rule closes it.
          *
          * ⚠️ `align-items: end` IS WHAT PUTS THE ACTIONS ON THE INTRO'S BASELINE rather than in
          * the middle of a two-line block. It is a row default, so the actions state no alignment
          * of their own — the house law about per-item alignment applies the other way here.
          */}
        <div className="ph-text">
          {section && <p className="ph-eyebrow" data-probe="eyebrow"><span>{section}</span> / <b>{title}</b></p>}
          <h1 className="ph-title" data-probe="title" data-page-title="">{title}{titleAdornment}</h1>
          {/* ⚠️ ABSENT INTRO RENDERS NOTHING AND RESERVES NOTHING — in flow there is no height to
              keep, so a title-only page is simply shorter. Five compact pages have none. */}
          {description && <p className="ph-intro" data-probe="intro">{description}</p>}
        </div>
        {(primary || secondary) && (
          <div className="ph-acts" data-probe="actions">
            {primary && (
              <button ref={primaryRef} type="button" className="ph-primary" onClick={primary.onClick} disabled={primary.disabled}>{primary.label}</button>
            )}
            {secondary && (
              <button type="button" className="ph-secondary" onClick={secondary.onClick} disabled={secondary.disabled}>{secondary.label}</button>
            )}
          </div>
        )}
      </header>
      );
}

  return (
    /**
     * §3.1 — THE OPEN HEADER. Eyebrow · 56px title · intro · actions, in a text block at most half
     * the header's width, with the drawing anchored to the bottom-right corner so it always stands
     * ON the rule.
     *
     * ⚠️ NO BOX. No background, no border, no radius — the page ground shows through, and the only
     * line in it is the rule beneath. What this replaces had a fill and a shadow, and the header
     * read as a card sitting on the page rather than as the page's own opening.
     */
    <header
      className={`ph ph--full${band ? "" : " hsheet-host"}${living ? " ph--living" : ""}${living?.count === 0 && living.empty ? " ph--empty" : ""}${plate ? " ph--plate" : ""}${band ? " ph--band" : ""}${band && bandFixed ? " ph--bandfix" : ""}${card ? " ph--card" : ""}${card && band && compact ? " ph--compact" : ""}`}
      data-probe="page-header" data-size="full" data-plate={plate ? "" : undefined} data-band={band ? "" : undefined}
      data-living={living ? (living.count === null ? "pending" : living.count === 0 && living.empty ? "empty" : "settled") : undefined}
    >
      {/* app shell v2: the header sheet, behind everything the header paints. A BAND header is its own
          full-width ink field, so it takes none (headerSheetRoutes lists its route). */}
      {!band && <HeaderSheet />}
      {/**
        * THE HERO FRAME. The header spans the whole content column and its rule runs the column's full
        * width. Since the quiet bar the frame IS the column (page header v2's centred 920 is gone): the
        * text starts on the column's left edge, level with the cards below, and the drawing is
        * anchored to the frame's right and to the rule, so it ends at the column's right edge.
        */}
      <div className="ph-hin" data-probe="hero-frame">
      <div className="ph-text" data-probe={band ? "band-text" : undefined}>
        {section && <p className="ph-eyebrow" data-probe="eyebrow"><span>{section}</span> / <b>{title}</b></p>}
        {living && living.count === 0 && living.empty ? (
          <>
            <h2 className="ph-eh2" data-probe="empty-heading">{living.empty.heading}</h2>
            <p className="ph-intro" data-probe="intro"><LivingRuns runs={living.empty.subline} /></p>
          </>
        ) : living ? (() => {
          /* ⚠️ UNSETTLED = EMPTY, NEVER THE PAGE NAME. The lines keep their space by min-height. */
          const line = living.count === null ? null : living.copy(living.count);
          const subText = line ? runsText(line.subline) : "";
          return (
            <>
              <h1 className="ph-title" data-probe="title" data-page-title="">
                {line && <LivingText text={line.headline}>{line.headline}</LivingText>}
              </h1>
              <p className="ph-intro" data-probe="intro">
                {line && <LivingText text={subText} delay={60}><LivingRuns runs={line.subline} /></LivingText>}
              </p>
            </>
          );
        })() : (
          <>
            <h1 className="ph-title" data-probe="title" data-page-title="">{title}{titleAdornment}</h1>
            {description && <p className="ph-intro" data-probe="intro">{description}</p>}
          </>
        )}
        {(primary || secondary) && (
          <div className="ph-acts" data-probe="actions">
            {primary && (
              <button ref={primaryRef} type="button" className="ph-primary" onClick={primary.onClick} disabled={primary.disabled}>{primary.label}</button>
            )}
            {secondary && (
              <button type="button" className="ph-secondary" onClick={secondary.onClick} disabled={secondary.disabled}>{secondary.label}</button>
            )}
            {actionsPopover}
          </div>
        )}
      </div>
      {/**
        * ⚠️ ABSENT ART RENDERS NO SLOT AND NO PLACEHOLDER. Manuscripts is a full header with no
        * drawing yet, and a reserved 42% well there would be a page with a hole where a picture
        * will go. The text block keeps its half either way, so the two pages that do have art and
        * the one that does not open identically.
        */}
      {art && !plate && !band && <div className="ph-art" data-probe="art" aria-hidden="true">{art}</div>}
      {/* the band's drawing: a disc beside the text, in the flow of the band's grid, never absolute */}
      {art && band && <div className="ph-bdisc" data-probe="band-disc" aria-hidden="true">{art}</div>}
      {/**
        * THE PLATE'S TWO LAYERS (see the `plate` prop). The clip is a sibling of the text, inset to the
        * plate's own box with its radius, so the under layer is cut at exactly the plate's edge; the
        * over layer is outside it. Both are decorative: aria-hidden, and no pointer events (CSS).
        */}
      {plate && art && (
        <div className="ph-plclip" aria-hidden="true">
          <div className="ph-under" data-probe="art-under">{art}</div>
        </div>
      )}
      {plate && artFigure && <div className="ph-over" data-probe="art-figure" aria-hidden="true">{artFigure}</div>}
      </div>
    </header>
  );
};
