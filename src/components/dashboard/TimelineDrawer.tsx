/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Timeline drawer (v37, tl4 floating) — "The story so far" renamed Timeline and moved off the
 * dashboard grid into a right-edge floating drawer: fixed 14px insets, 285px wide, radius 18,
 * themed band head (foam / pink / graphite-tint), 360ms slide. A pull tab sits on the right
 * edge while closed. Pinned state persists to localStorage["sa.timelinePinned"]: pinned =
 * auto-open on dashboard load, × hidden. The stage scroll container is padded right (~309px)
 * while open at ≥1180px so content isn't covered; below that it overlays with a heavier shadow.
 * Dashboard-route only: the component renders inside the dashboard StagePage (hidden with it),
 * and the stage padding clears itself whenever the route or the drawer state changes.
 */
import React, { useEffect, useState } from "react";
import { getStageScrollEl } from "../../lib/stageScroll";

export const TIMELINE_PIN_KEY = "sa.timelinePinned";

/** Pure, storage-injectable pin persistence (unit-tested; the component passes localStorage). */
export const readTimelinePinned = (storage?: Pick<Storage, "getItem">): boolean => {
  try {
    const s = storage ?? (typeof localStorage !== "undefined" ? localStorage : undefined);
    return s?.getItem(TIMELINE_PIN_KEY) === "1";
  } catch { return false; }
};
export const writeTimelinePinned = (pinned: boolean, storage?: Pick<Storage, "setItem">): void => {
  try {
    const s = storage ?? (typeof localStorage !== "undefined" ? localStorage : undefined);
    s?.setItem(TIMELINE_PIN_KEY, pinned ? "1" : "0");
  } catch { /* private mode — ignore */ }
};

const readPinned = (): boolean => readTimelinePinned();

interface TimelineDrawerProps {
  /** Entries within the current fortnight — the head eyebrow count. */
  fortnightCount: number;
  /** True while the dashboard route is the visible one. */
  active: boolean;
  children: React.ReactNode;
}

export const TimelineDrawer: React.FC<TimelineDrawerProps> = ({ fortnightCount, active, children }) => {
  const [pinned, setPinned] = useState(readPinned);
  const [open, setOpen] = useState(readPinned);

  const togglePin = () => {
    setPinned((p) => {
      const next = !p;
      writeTimelinePinned(next);
      if (next) setOpen(true);
      return next;
    });
  };

  // Content push: pad the stage while open on the dashboard at ≥1180px. Cleared on route
  // leave / close / unmount so no other page inherits the footprint.
  useEffect(() => {
    const stage = getStageScrollEl();
    if (!stage) return;
    const apply = () => {
      const wide = window.innerWidth >= 1180;
      stage.style.paddingRight = active && open && wide ? "309px" : "";
    };
    apply();
    window.addEventListener("resize", apply);
    return () => {
      window.removeEventListener("resize", apply);
      stage.style.paddingRight = "";
    };
  }, [active, open]);

  return (
    <>
      {!open && (
        <button type="button" className="sa-tltab" onClick={() => setOpen(true)} aria-label={`Open timeline (${fortnightCount} events this fortnight)`}>
          <svg width={13} height={13} viewBox="0 0 24 24" fill="none" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.5 2" />
          </svg>
          <span className="sa-tllbl">Timeline</span>
          <span className="sa-tlcnt">{fortnightCount}</span>
        </button>
      )}
      <aside className={`sa-tldrawer${open ? " open" : ""}${pinned ? " pinned" : ""}`} aria-label="Timeline" aria-hidden={!open}>
        <div className="sa-tlhead">
          <div>
            <div className="sa-tleyebrow">This fortnight · {fortnightCount} {fortnightCount === 1 ? "event" : "events"}</div>
            <h3>Timeline</h3>
          </div>
          <button type="button" className="sa-tlpin" onClick={togglePin} title={pinned ? "Unpin" : "Pin open"} aria-label={pinned ? "Unpin timeline" : "Pin timeline open"} aria-pressed={pinned}>
            <svg width={13} height={13} viewBox="0 0 24 24" fill="none" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 17v5" /><path d="M9 3h6l1 7 2.5 2.5H5.5L8 10z" />
            </svg>
          </button>
          {!pinned && (
            <button type="button" className="sa-tlx" onClick={() => setOpen(false)} title="Close" aria-label="Close timeline">×</button>
          )}
        </div>
        <div className="sa-tlbody">{children}</div>
      </aside>
    </>
  );
};
