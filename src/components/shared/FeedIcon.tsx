/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * FEED WORDING v1.1 (Part 4) — the ONE drawing for each kind of feed event, modelled on shared/MaterialIcon.
 *
 * ⚠️ THE DRAWINGS ARE THE RULED REF, BYTE FOR BYTE: each string below is `icons.<key>.inner` from
 * design-refs/feed-icons-v1/feed-icons-v1.json, on its viewBox, stroke width, caps and joins. FeedIcon.test.ts compares
 * them with the file, so a hand "tidy" goes red. Which kind an event takes is lib/feedIcon `feedIconKind`.
 *
 * ⚠️ COLOUR IS `currentColor` ONLY: ink on card rows, --sp-quiet on quiet lines, the nudge's bell --sp-rust (the host
 * sets `color`). No tile, no second colour, no badge. aria-hidden: the sentence carries the meaning.
 */
import type { FeedIconKind } from "../../lib/feedIcon";

export type { FeedIconKind } from "../../lib/feedIcon";

export const FEED_ICON_INNER: Readonly<Record<FeedIconKind, string>> = {
  agent_added: "<path d=\"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2\"></path><circle cx=\"9\" cy=\"7\" r=\"4\"></circle><path d=\"M19 8v6M22 11h-6\"></path>",
  agent_updated: "<path d=\"M11.5 15H7a4 4 0 0 0-4 4v2\"></path><circle cx=\"10\" cy=\"7\" r=\"4\"></circle><path d=\"M21.4 16.6a1 1 0 0 0-3-3l-4 4a2 2 0 0 0-.5.9l-.8 2.8a.5.5 0 0 0 .6.6l2.9-.8a2 2 0 0 0 .8-.5z\"></path>",
  agent_removed: "<path d=\"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2\"></path><circle cx=\"9\" cy=\"7\" r=\"4\"></circle><path d=\"M22 11h-6\"></path>",
  agents_several: "<path d=\"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2\"></path><circle cx=\"9\" cy=\"7\" r=\"4\"></circle><path d=\"M22 21v-2a4 4 0 0 0-3-3.87\"></path><path d=\"M16 3.13a4 4 0 0 1 0 7.75\"></path>",
  manuscript_added: "<g transform=\"scale(.8)\" stroke-width=\"2.25\"><path d=\"M12 7v14\"></path><path d=\"M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z\"></path></g><path d=\"M19.5 17v5M17 19.5h5\"></path>",
  manuscript_updated: "<g transform=\"scale(.8)\" stroke-width=\"2.25\"><path d=\"M12 7v14\"></path><path d=\"M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z\"></path></g><path d=\"M22.1 16.3a.85.85 0 0 0-1.9-1.9l-3.3 3.3a1.5 1.5 0 0 0-.4.7l-.5 1.9a.4.4 0 0 0 .5.5l1.9-.5a1.5 1.5 0 0 0 .7-.4z\"></path>",
  manuscript_removed: "<g transform=\"scale(.8)\" stroke-width=\"2.25\"><path d=\"M12 7v14\"></path><path d=\"M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z\"></path></g><path d=\"M17 19.5h5\"></path>",
  holding_reply: "<path d=\"M9 17l-5-5 5-5\"></path><path d=\"M20 18v-2a4 4 0 0 0-4-4H4\"></path>",
  others_told: "<path d=\"M3 11l18-5v12L3 14z\"></path><path d=\"M11.6 16.8a3 3 0 1 1-5.8-1.6\"></path>",
  call_booked: "<path d=\"M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z\"></path>",
  nudge: "<path d=\"M6 16V11a6 6 0 1112 0v5l2 2H4z\"></path><path d=\"M10 20a2 2 0 004 0\"></path>",
  import: "<path d=\"M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z\"></path><path d=\"M14 3v5h5\"></path><path d=\"M12 17v-6M9.5 13.5L12 11l2.5 2.5\"></path>",
  manuscript: "<path d=\"M12 7v14\"></path><path d=\"M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z\"></path>",
};

export const FEED_ICON_VIEWBOX = "0 0 24 24";
export const FEED_ICON_STROKE_WIDTH = 1.8;
/** The feed draws them at 20. */
export const FEED_ICON_SIZE = 20;

/**
 * `bare`: the host sizes it (search's action tiles set their own svg width and stroke); otherwise the box and the stroke
 * are pinned inline, as MaterialIcon does, so a host rule cannot shrink it or change its weight.
 */
export function FeedIcon({ kind, size = FEED_ICON_SIZE, className, bare }: { kind: FeedIconKind; size?: number; className?: string; bare?: boolean }) {
  return (
    <svg
      className={["feed-ico", className ?? ""].filter(Boolean).join(" ")}
      data-feed-icon={kind}
      {...(bare ? {} : { width: size, height: size })}
      viewBox={FEED_ICON_VIEWBOX}
      fill="none"
      stroke="currentColor"
      strokeWidth={FEED_ICON_STROKE_WIDTH}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      style={bare ? undefined : { flex: "none", width: size, height: size, fill: "none", stroke: "currentColor", strokeWidth: FEED_ICON_STROKE_WIDTH }}
      dangerouslySetInnerHTML={{ __html: FEED_ICON_INNER[kind] }}
    />
  );
}
