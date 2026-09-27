/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * CompCard — one comp in the library (comps v2; the mock's `.comp`). Grip · spine · text · the
 * In-query-letter switch with its ordinal · Edit and Remove.
 *
 * ⚠️ EVERY FACT IS DERIVED AT RENDER from the stored comp (compsPage.ts): the spine's initial, the
 * "author · publisher" line, the facet chips, the age line. Nothing here is stored.
 *
 * ⚠️ THE AGE LINE IS ON EVERY CARD AND SAYS THE SAME KIND OF THING ON EVERY CARD — a year and a
 * count, or "Year not recorded". No colour, no cutoff, no verdict.
 *
 * ⚠️ `example` RENDERS A PICTURE OF A CARD: every control becomes an inert span, so the empty
 * state's examples cannot be tabbed into, clicked or read as live.
 */
import React from "react";
import { CompTitle } from "../../types";
import { compAgeLine, compFacets, compMedia, ordinal, spineInitial } from "../../lib/compsPage";

const MEDIA_LABEL = { book: "Book", film: "Film", tv: "TV", other: "Other" } as const;

/** The grip's six dots — drawn, not typed (a glyph is a request to a font). */
const GripDots = () => (
  <svg width="10" height="16" viewBox="0 0 10 16" fill="currentColor" aria-hidden="true">
    <circle cx="3" cy="3" r="1.3" /><circle cx="7" cy="3" r="1.3" /><circle cx="3" cy="8" r="1.3" />
    <circle cx="7" cy="8" r="1.3" /><circle cx="3" cy="13" r="1.3" /><circle cx="7" cy="13" r="1.3" />
  </svg>
);

export interface CompCardProps {
  comp: CompTitle;
  /** 1-based position among the switched-on comps, or null when off. */
  position: number | null;
  now: number;
  example?: boolean;
  /** drag / drop state */
  dragging?: boolean;
  drop?: "before" | "after" | null;
  flash?: boolean;
  onToggle?: () => void;
  onEdit?: (focusNote?: boolean) => void;
  onRemove?: () => void;
  onGripPointerDown?: (e: React.PointerEvent<HTMLButtonElement>) => void;
  onGripKey?: (dir: -1 | 1) => void;
  gripRef?: (el: HTMLButtonElement | null) => void;
  editRef?: (el: HTMLButtonElement | null) => void;
}

export const CompCard: React.FC<CompCardProps> = ({
  comp: c, position, now, example, dragging, drop, flash,
  onToggle, onEdit, onRemove, onGripPointerDown, onGripKey, gripRef, editRef,
}) => {
  const media = compMedia(c);
  const screen = media !== "book";
  const facets = compFacets(c);
  const by = [c.author, c.publisher].filter((x): x is string => !!x && !!x.trim()).join(" · ");
  const on = !!c.inQuery;
  const cls = ["cpv-comp", on ? "is-in" : "", dragging ? "is-dragging" : "", drop ? `drop-${drop}` : "", flash ? "flash" : ""]
    .filter(Boolean).join(" ");

  /* ⚠️ A FUNCTION, NOT A COMPONENT DEFINED IN RENDER — a component declared here is a new type on
     every render, so React would remount each button and a toggle would lose its own focus. */
  const btn = (
    props: React.ButtonHTMLAttributes<HTMLButtonElement> & { "data-cpv": string; refFn?: (el: HTMLButtonElement | null) => void },
    children: React.ReactNode,
  ) => {
    const { refFn, ...rest } = props;
    return example
      ? <span className={rest.className}>{children}</span>
      : <button type="button" ref={refFn} {...rest}>{children}</button>;
  };

  return (
    <article className={cls} data-cpv="comp" data-title={c.title}>
      {example ? (
        <span className="cpv-grip" aria-hidden="true"><GripDots /></span>
      ) : (
        <button
          type="button"
          className="cpv-grip"
          data-cpv="grip"
          ref={gripRef}
          aria-label={`Reorder ${c.title}. Use Alt with the arrow keys to move.`}
          title="Drag, or Alt + ↑/↓"
          onPointerDown={onGripPointerDown}
          onKeyDown={(e) => {
            if (!e.altKey) return;
            if (e.key === "ArrowUp") { e.preventDefault(); onGripKey?.(-1); }
            if (e.key === "ArrowDown") { e.preventDefault(); onGripKey?.(1); }
          }}
        >
          <GripDots />
        </button>
      )}
      <div className={`cpv-spine${screen ? " cpv-spine--screen" : ""}`} data-cpv="spine" aria-hidden="true">
        <span className="i">{spineInitial(c.title)}</span>
        {screen && <span className="md">{MEDIA_LABEL[media]}</span>}
        <span className="y">{c.year ?? "—"}</span>
      </div>
      <div className="cpv-cbody">
        <div className="cpv-ct">{c.title}</div>
        <div className="cpv-ca" data-cpv="by">
          {by || <span style={{ opacity: 0.8 }}>Author not recorded</span>}
          {screen ? ` · ${MEDIA_LABEL[media]}` : null}
        </div>
        {facets.length > 0 && (
          <div className="cpv-facets">
            {facets.map((f, i) => <span key={`${f}-${i}`} className="cpv-facet" data-cpv="facet">{f}</span>)}
          </div>
        )}
        {c.note ? (
          <div className="cpv-note" data-cpv="note">{c.note}</div>
        ) : (
          <div className="cpv-note cpv-note--miss" data-cpv="note">
            No note on why it compares.{" "}
            {btn({ className: "cpv-mini", "data-cpv": "add-note", onClick: () => onEdit?.(true) }, "Add a note")}
          </div>
        )}
        <div className="cpv-age" data-cpv="age">{compAgeLine(c, now)}</div>
      </div>
      <div className="cpv-cside">
        {btn(
          { className: "cpv-inl", role: "switch", "aria-checked": on, "data-cpv": "inq", "aria-label": `In query letter: ${c.title}`, onClick: onToggle },
          <>
            <span className="sw" aria-hidden="true" />
            In query letter
            {on && position != null && <span className="pos" data-cpv="pos">{ordinal(position)}</span>}
          </>,
        )}
        <div className="cpv-cacts">
          {btn({ className: "cpv-txt", "data-cpv": "edit", refFn: editRef, onClick: () => onEdit?.(false) }, "Edit")}
          {btn({ className: "cpv-txt cpv-txt--quiet", "data-cpv": "remove", onClick: onRemove }, "Remove")}
        </div>
      </div>
    </article>
  );
};
