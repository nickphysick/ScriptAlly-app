/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DeskCard — the settled desk's card chrome: a sage band carrying a title and/or an outlined mono
 * pill, over a parchment body (ref design-refs/dashboard-settled-desk.html).
 *
 * ⚠️ A THIN LOCAL WRAPPER, AND DELIBERATELY NOT MountCard. `MountCard`/`MountPanel` are LOCKED and
 * consumed by four other pages; they are the parchment mount — paper texture, 14px radius, the
 * mount shadow, a burgundy-tinted hairline. This card is a different object: flat parchment, a
 * neutral two-stop shadow, 16px radius, and a band across its head. Making one express the other
 * would mean adding a band, a pill, a radius override and a shadow override to a locked component,
 * which is a fork with extra steps.
 *
 * ⚠️ AND THE SHADOW IS NEUTRAL. No thick ink borders, no coloured drop shadows anywhere on this
 * page — the chrome rule the Contact list and Discover already follow.
 */
import React from "react";
import "./deskTooltip.css";

export interface DeskCardProps {
  /** Playfair title in the band. Omit for a pill-only band (the stat cards). */
  title?: string;
  /** The outlined mono pill, right of the title. */
  pill?: React.ReactNode;
  /** An icon at the head of the band, before the title. */
  icon?: React.ReactNode;
  /** Anything else the band carries, right-aligned (the pipeline's stage counts). */
  bandExtra?: React.ReactNode;
  children: React.ReactNode;
  /** The hairline-topped foot row. */
  foot?: React.ReactNode;
  className?: string;
  /** Drop the body's default padding — for bodies that draw their own rows edge to edge. */
  bare?: boolean;
}

export const DeskCard: React.FC<DeskCardProps> = ({
  title, pill, icon, bandExtra, children, foot, className, bare,
}) => (
  <section className={`dk-card${className ? ` ${className}` : ""}`}>
    <div className="dk-band">
      {icon}
      {title && <h2>{title}</h2>}
      {/* ⚠️ WITHOUT A TITLE THE PILL STILL SITS LEFT, not floated right — the stat cards' band is
          a label, and a pill pushed to the far edge of a 1/4-width card reads as detached. */}
      {pill}
      {bandExtra}
    </div>
    {bare ? children : <div className="dk-body">{children}</div>}
    {foot && <div className="dk-foot">{foot}</div>}
  </section>
);
