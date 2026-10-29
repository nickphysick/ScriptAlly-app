/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Submission packages v39.1 Part G (design-refs/submission-packages-v39-1/, screens 02–04) — the explainer: one quiet line
 * above Your packages (the ref's `.pk-tip` / `.tv-d`): a Harbour tile with the package icon, one sentence, "How it works →"
 * (v39's walkthrough) and ✕.
 *
 * ⚠️ ✕ DISMISSES IT FOR GOOD, IN THE STORE THE PAGE GUIDES USE (`lib/pageGuide`: `markGuideSeen` / `guideSeen`, key
 *    `sa.guide.packages-explainer`). That store is localStorage — PER DEVICE, not per account as the pack assumed; it is
 *    the one the guides use, and the pack names the store. The header's How it works is the way back.
 * Not on the brand-new page, which has its own explanation (the page does not render it there).
 */
import React, { useState } from "react";
import { guideSeen, markGuideSeen } from "../../../lib/pageGuide";

export const TIP_KEY = "packages-explainer";
export const TIP_LEAD = "A package is everything one agent receives:";
export const TIP_REST = " the pages from a version of your book, your query letter and, if they want one, a synopsis. Pick it when you log a query and QueryHawk records exactly what went.";

export const Pk39Tip: React.FC<{ onHow: () => void }> = ({ onHow }) => {
  const [gone, setGone] = useState(() => guideSeen(TIP_KEY));
  const [leaving, setLeaving] = useState(false);
  if (gone) return null;
  const dismiss = () => {
    if (leaving) return;
    markGuideSeen(TIP_KEY);
    setLeaving(true);
    /* the ref's fade and lift (.25s), then it is gone */
    window.setTimeout(() => setGone(true), 260);
  };
  return (
    <section className={`p9-tip${leaving ? " p9-out" : ""}`} aria-label="About packages" data-pk39="tip">
      <div className="p9-tv-d">
        <span className="p9-td-ic" aria-hidden="true"><svg viewBox="0 0 20 20"><path d="M3 7l7-3.5L17 7v8l-7 3.5L3 15z" /><path d="M3 7l7 3.5L17 7M10 10.5V18.5" /></svg></span>
        <p><b>{TIP_LEAD}</b>{TIP_REST}</p>
        <button type="button" className="p9-td-l" onClick={onHow}>How it works →</button>
        <button type="button" className="p9-tip-x" aria-label="Dismiss" data-pk39="tip-x" onClick={dismiss}>✕</button>
      </div>
    </section>
  );
};
