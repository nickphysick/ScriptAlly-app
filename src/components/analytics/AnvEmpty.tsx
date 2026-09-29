/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Analytics empty state — a manuscript with no queries yet (the Query Centre's and the Contact
 * list's feature-led pattern).
 *
 * ⚠️ EACH ROW IS ILLUSTRATED WITH THE PAGE'S OWN COMPONENT, POPULATED, AT FULL OPACITY, TAGGED
 * "EXAMPLE". The figures come from `exampleModel` — invented queries run through the real
 * `analyticsModel` — so an example can only ever show a shape the real page can draw. Never a
 * faded ghost of the page: a greyed chart reads as broken, not as a preview.
 */
import React from "react";
import { exampleModel } from "../../lib/analyticsExample";
import type { AnalyticsModel } from "../../lib/analyticsModel";

export interface AnvEmptyRow {
  key: string;
  heading: string;
  sub: string;
  art: (m: AnalyticsModel) => React.ReactNode;
}

export const AnvEmpty: React.FC<{ title: string; rows?: AnvEmptyRow[]; rail?: (m: AnalyticsModel) => React.ReactNode }> = ({ title, rows = [], rail }) => {
  const model = React.useMemo(() => exampleModel(Date.now()), []);
  return (
    <>
      <div className="anv-main" data-anv="main" data-anv-state="empty">
        <div className="anv-card anv-empty-hero" data-anv="empty-hero">
          <div>
            <h2 className="anv-tw">Nothing to count yet.</h2>
            <p>
              Once the first query for <em>{title}</em> goes out, this page keeps its history — where each one
              reached, how long replies take, and the story of the book's querying so far.
            </p>
          </div>
        </div>
        {rows.map((r) => (
          <section className="anv-feat" key={r.key} data-anv="empty-row">
            <div className="anv-feat-copy">
              <span className="anv-extag">Example</span>
              <h3 className="anv-tw">{r.heading}</h3>
              <p>{r.sub}</p>
            </div>
            <div className="anv-feat-art" data-anv="example">{r.art(model)}</div>
          </section>
        ))}
      </div>
      {rail ? rail(model) : null}
    </>
  );
};
