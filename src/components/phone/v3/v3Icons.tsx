/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phone app v3 — the ref's own line icons (phone-app-v3.html `IC`), path for path: a 24-unit box, 1.7 stroke, round caps
 * and joins (`.ib svg,.ic`). Status is never drawn here — that is StatusDot's alone.
 */
import React from "react";

const P = {
  today: "M4 6l1.5 1.5L8 5M4 12l1.5 1.5L8 11M4 18l1.5 1.5L8 17M11.5 6H20M11.5 12H20M11.5 18H20",
  queries: "M21 3L3 10.5l7 2.5 2.5 7zM10 13L21 3",
  agents: "M16 20v-1.5a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4V20M9.5 10.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M21 20v-1.5a4 4 0 0 0-3-3.85M15.5 3.65a3.5 3.5 0 0 1 0 6.7",
  plus: "M12 5v14M5 12h14", x: "M6 6l12 12M18 6L6 18", chev: "M9 6l6 6-6 6", back: "M15 6l-6 6 6 6",
  search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14M16.5 16.5L21 21",
  eye: "M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12zM12 14.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5",
  list: "M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01",
  mail: "M3 6h18v12H3zM3 7l9 6 9-6", chart: "M5 20V10M12 20V4M19 20v-7",
  box: "M12 3l8 4.5v9L12 21l-8-4.5v-9zM4 7.5l8 4.5 8-4.5M12 12v9",
  file: "M7 3h7l4 4v14H7zM14 3v4h4M10 12h5M10 16h5", book: "M6 3h12v18H6zM9 7h6",
  pin: "M9 3h6l-1 6 3 3H7l3-3zM12 12v9",
  flame: "M12 3c1 3 4 4.5 4 8.5a4 4 0 0 1-8 0c0-1.5.5-2.5 1.5-3.5 0 1.5.5 2 1.5 2 0-2.5 0-4.5 1-7z",
  wall: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
  help: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7M12 17h.01",
  chat: "M4 5h16v11H9l-5 4z", upload: "M12 16V4M7 9l5-5 5 5M4 20h16",
  gear: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1",
  check: "M5 12.5l4.5 4.5L19 7.5", note: "M5 4h14v11l-5 5H5zM14 20v-5h5",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8M4 21a8 8 0 0 1 16 0",
  copy: "M9 9h11v11H9zM5 15H4V4h11v1", out: "M10 4H5v16h5M15 8l4 4-4 4M19 12H9",
} as const;

export type V3IconName = keyof typeof P;

export const V3I: React.FC<{ n: V3IconName; className?: string }> = ({ n, className = "pa3-ic" }) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true"><path d={P[n]} /></svg>
);
