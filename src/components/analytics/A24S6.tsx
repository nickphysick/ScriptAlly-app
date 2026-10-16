/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Analytics v24 S6 — MOMENTS WORTH REMEMBERING. A dated list from `moments` (lib/analyticsV24): the first query, the
 * first request to read more, the first offer and the busiest week, in the order they happened. An entry with nothing
 * to support it is absent. v21's featured card and records panel are retired.
 */
import React from "react";
import type { V24 } from "../../lib/analyticsV24";

export const S6Body: React.FC<{ v: V24 }> = ({ v }) => (
  v.moments.length ? (
    <ol className="a24-mom" data-a24="moments">
      {v.moments.map((m) => (
        <li key={m.key} data-a24="moment" data-k={m.key} data-at={m.atMs} data-days={m.days ?? ""}>
          <time>{m.date}</time>
          <div><b>{m.title}</b><p>{m.line}</p></div>
        </li>
      ))}
    </ol>
  ) : <p className="a24-none a24-momnone">Nothing to remember yet: none of your queries has a date sent.</p>
);
