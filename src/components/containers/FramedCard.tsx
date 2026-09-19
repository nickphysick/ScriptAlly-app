/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * FramedCard — white 6px rim, 16px radius, soft shadow; inside it a 1px burgundy frame that clips;
 * an optional band inside the frame. The dashboard's card, lifted so a second page can wear it
 * (Query Centre v11). It is NOT `MountCard`/`MountPanel` (parchment rim, ~25 importers) and it does
 * not replace `OneScreenPanel`, which keeps its own classes and its own tests.
 */
import React from "react";
import "./framedCard.css";

export type FramedTone = "navy" | "stone";

export interface FramedCardProps {
  /** The card's element. The open query is an `aside`; the summary cards are `article`s. */
  as?: "div" | "section" | "article" | "aside";
  /** What goes IN the band. Omit for a card with no band (the view's frame). */
  band?: React.ReactNode;
  tone?: FramedTone;
  /** A band fill that is not a tone — a query's state colour. Set as `--fc-band` on the card. */
  bandFill?: string;
  /** Make the card a size container (default). Off where the card itself is `position: sticky`'s subject and needs no query. */
  container?: boolean;
  className?: string;
  frameClassName?: string;
  bandClassName?: string;
  /** `data-qcv`-style probe name; the frame and band take `-frame` / `-band`. */
  probe?: string;
  probeAttr?: string;
  label?: string;
  innerRef?: React.Ref<HTMLElement>;
  children?: React.ReactNode;
  rest?: React.HTMLAttributes<HTMLElement> & Record<`data-${string}`, string | undefined>;
}

export const FramedCard: React.FC<FramedCardProps> = ({
  as = "div", band, tone, bandFill, container = true, className, frameClassName, bandClassName,
  probe, probeAttr = "data-qcv", label, innerRef, children, rest,
}) => {
  const Tag = as as React.ElementType;
  const p = (suffix: string) => (probe ? { [probeAttr]: `${probe}${suffix}` } : {});
  return (
    <Tag
      ref={innerRef}
      {...rest}
      {...p("")}
      aria-label={label}
      className={`fc-card${container ? " fc-card--cq" : ""}${tone ? ` fc-tone--${tone}` : ""}${className ? ` ${className}` : ""}`}
      style={bandFill ? ({ "--fc-band": bandFill } as React.CSSProperties) : undefined}
    >
      <div className={`fc-frame${frameClassName ? ` ${frameClassName}` : ""}`} {...p("-frame")}>
        {band !== undefined && (
          <div className={`fc-band${bandClassName ? ` ${bandClassName}` : ""}`} {...p("-band")}>{band}</div>
        )}
        {children}
      </div>
    </Tag>
  );
};
