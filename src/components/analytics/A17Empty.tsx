/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Analytics page for a manuscript with no queries yet (v17): the band stays; beneath it one frame
 * saying where the numbers come from, with "+ Log a query"; then the funnel and the training log as FADED
 * examples tagged "Example". No zeros anywhere — nothing here states a figure about the writer's book.
 *
 * ⚠️ THE EXAMPLES ARE THE PAGE'S OWN COMPONENTS drawing `exampleModel` (invented queries run through the
 * real `analyticsModel`), never a drawing of them, so an example can only show a shape the page can draw.
 */
import React from "react";
import { exampleModel } from "../../lib/analyticsExample";
import { openQueryDrawer } from "../../lib/queryActions/drawerStore";
import { ExampleRow } from "./A17Frame";
import { Funnel, TrainingLog } from "./A17Figures";

export const A17Empty: React.FC = () => {
  const ex = React.useMemo(() => exampleModel(Date.now()), []);
  return (
    <>
      <div className="a17-frame a17-first" data-a17="first">
        <h2 className="a17-tw">Your numbers start with your first query</h2>
        <p>Log a query and this page fills in as replies come back: how far each query gets, how long agents take, and what has changed over the campaign.</p>
        <button type="button" data-a17="log" onClick={() => openQueryDrawer({ mode: "log" })}>+ Log a query</button>
      </div>
      <ExampleRow title="Where the queries got to"><Funnel model={ex} /></ExampleRow>
      <ExampleRow title="Queries sent"><TrainingLog model={ex} /></ExampleRow>
    </>
  );
};
