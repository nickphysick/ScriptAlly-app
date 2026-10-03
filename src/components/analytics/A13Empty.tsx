/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Analytics page for a manuscript with no queries yet (v13) — feature-led, as the Query Centre and
 * the Contact list are: the feature container stays, then a row per feature, each illustrated with the
 * page's own figure populated from `exampleModel` (invented queries run through the real
 * `analyticsModel`) at full opacity and tagged "Example".
 *
 * ⚠️ THE FIGURES ARE THE PAGE'S OWN COMPONENTS, never a drawing of them, so an example can only ever
 * show a shape the real page can draw.
 */
import React from "react";
import type { AnalyticsModel } from "../../lib/analyticsModel";
import { exampleModel } from "../../lib/analyticsExample";
import { ExampleRow, Feature } from "./A13Frame";
import { Funnel } from "./A13Figures";

export const A13Empty: React.FC<{ model: AnalyticsModel; onGo: () => void }> = ({ model, onGo }) => {
  const ex = React.useMemo(() => exampleModel(Date.now()), []);
  void ex;
  return (
    <>
      <Feature model={model} onGo={onGo} />
      <ExampleRow heading="Where the book gets to"
        sub="Each stage your queries reach — asked for more, read in full, an offer — and how many went on from the one before.">
        <Funnel model={ex} />
      </ExampleRow>
      <ExampleRow heading="What agents said, against when they replied"
        sub="The response window each agency states, and when each reply actually arrived.">
        {null}
      </ExampleRow>
      <ExampleRow heading="Every query against time"
        sub="One line per query, from the day it went out to today or the day it ended, in its status colour.">
        {null}
      </ExampleRow>
    </>
  );
};
