/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE SPOT-ART SLOT (Query Centre v131 §3, §4). A circle holding a line icon today, and Nick's
 * commissioned illustration the day one is dropped in — **as a file change, never a code change**:
 *
 *   public/images/qc/spots/<name>.png   (e.g. recently-updated.png, group-your-move.png)
 *
 * The slot always asks for the file. Until it LOADS, the line icon shows; if it never loads (a 404,
 * or the SPA catch-all handing back HTML, which fails to decode) the icon simply stays. So there is
 * no manifest to keep in step and no flash of a broken image.
 *
 * ⚠️ THE ICONS ARE PLACEHOLDERS for those illustrations (the brief's §3). Their paths are the
 * reference's own (`SP` in query-centre-v131.html).
 */
import React, { useState } from "react";

export type SpotName =
  | "recently-updated" | "your-queries"
  | "group-your-move" | "group-with-agent" | "group-closed" | "group-other";

const path = (d: React.ReactNode) => d;
const SPOT_ICON: Record<SpotName, React.ReactNode> = {
  "recently-updated": path(<><rect x="6" y="6" width="15" height="11" rx="1.5" /><path d="m6.5 7 7 5.5 7-5.5" /><path d="M1.5 9h3M2.5 12.5h2M1.5 16h3" /></>),
  "your-queries": path(<><rect x="4" y="8" width="16" height="11" rx="1.5" /><path d="M6 5.5h12M8 3h8" /><path d="m4.5 9 7.5 5 7.5-5" /></>),
  "group-your-move": path(<><path d="M20 4C12 5 7 10 5 19" /><path d="M5 19c3-6 7-9 11-10" /><path d="M4 21h7" /></>),
  "group-with-agent": path(<><path d="M7 3h10M7 21h10" /><path d="M8 3c0 5 8 5 8 9s-8 4-8 9M16 3c0 5-8 5-8 9s8 4 8 9" /></>),
  "group-closed": path(<><rect x="3.5" y="4.5" width="17" height="4" rx="1" /><path d="M5 8.5V19a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8.5" /><path d="M10 12.5h4" /></>),
  "group-other": path(<><rect x="4" y="8" width="16" height="11" rx="1.5" /><path d="M6 5.5h12M8 3h8" /></>),
};

/** Where Nick's illustration for a slot goes. */
export const spotSrc = (name: SpotName): string => `/images/qc/spots/${name}.png`;

export const QcArtSlot: React.FC<{ name: SpotName; size: "group"; tone?: "you" | "agent" | "closed" | "other" }> = ({ name, size, tone = "you" }) => {
  const [loaded, setLoaded] = useState(false);
  return (
    <span className={`qc13-art qc13-art--${size} qc13-art--${tone}`} data-qcv="art-slot" data-spot={name} data-art={loaded ? "image" : "icon"} aria-hidden="true">
      {!loaded && (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{SPOT_ICON[name]}</svg>
      )}
      <img src={spotSrc(name)} alt="" onLoad={() => setLoaded(true)} onError={() => setLoaded(false)}
        style={loaded ? undefined : { display: "none" }} />
    </span>
  );
};
