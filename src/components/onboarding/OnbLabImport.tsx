/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * #/onb-lab — the import's steps (onboarding v5, part 2), each held over a fixture inside the real
 * `SetupFrame`:
 *
 *   ?s=reading[&hold=work|done]      the reading loader — looping, or held in one state
 *   ?s=overview&fx=review|dupes|clear
 *   ?s=review&fx=review|dupes|clear   the three review steps, start to finish
 *   ?s=importing[&done=1]
 *   ?s=flow&fx=…[&skip=N][&none=1][&floor=ms]   the real branch from the summary to the hand-over
 *
 * These replace the five older dev routes (`#/import-review`, `#/import-review-dupes`,
 * `#/import-loader`, `#/scatter-loader`, `#/reconcile-card`), which were gated on `DEV` and so
 * reached no build at all. Nothing here writes: `onImport` records its result on
 * `window.__onbLab.result`, where lock V4 reads it.
 */
import React, { useEffect, useState } from "react";
import { QueryStatus } from "../../types";
import { SmartImportResult } from "../../types/smartImport";
import { validateSmartImport } from "../../lib/smartImport";
import { CommitOutcome } from "../../lib/smartImportCommit";
import { ScatterSettleLoader, LoaderCard } from "./ScatterSettleLoader";
import { ImportingLoader } from "./ImportingLoader";
import { ImportOverview } from "./ImportOverview";
import { SmartImportReview } from "./SmartImportReview";
import { REVIEW_FIXTURE, REVIEW_FIXTURE_DUPES, REVIEW_FIXTURE_CLEAR } from "./SmartImportReviewFixture";

declare global {
  interface Window { __onbLab?: { calls: Array<{ name: string; arg?: unknown }>; result?: unknown } }
}
const spy = (name: string) => (arg?: unknown) => {
  if (typeof window === "undefined") return;
  (window.__onbLab ??= { calls: [] }).calls.push({ name, arg: typeof arg === "string" ? arg : undefined });
};

export const LAB_FILE = "my agents FINAL v3.csv";
export const labFixture = (fx: string | null): SmartImportResult =>
  fx === "dupes" ? REVIEW_FIXTURE_DUPES : fx === "clear" ? REVIEW_FIXTURE_CLEAR : REVIEW_FIXTURE;

const SAMPLE: { messy: string; name: string; agency: string; date: string; status: QueryStatus }[] = [
  { messy: 'J. Carter · Carter & Vale · "replied, wants pages" · 44621', name: "Jamal Carter", agency: "Carter & Vale", date: "1 Mar 2022", status: QueryStatus.PARTIAL_REQUESTED },
  { messy: "Okonkwo Lit · fulls req · 12.4.24", name: "Maria Okonkwo", agency: "Okonkwo Literary", date: "12 Apr 2024", status: QueryStatus.FULL_REQUESTED },
  { messy: "Vidal · Quill · sent · 6 May", name: "Tomas Vidal", agency: "The Quill Agency", date: "6 May 2024", status: QueryStatus.QUERIED },
  { messy: "G. Salt · offer!! · 02/13/2024", name: "Gregory Salt", agency: "Penhallow Literary", date: "13 Feb 2024", status: QueryStatus.OFFER },
  { messy: "Mercer · R&R · 18 Apr", name: "Daniel Mercer", agency: "Saltmarsh Literary", date: "18 Apr 2024", status: QueryStatus.REVISE_RESUBMIT },
  { messy: "Webb · rejected · 5.2.24", name: "Marianne Webb", agency: "The Greenhouse", date: "5 Feb 2024", status: QueryStatus.REJECTED },
];

/** The reading loader: mock raw cells and a simulated 2.2s read, looping so both halves can be
 *  seen. `hold=work` never finishes; `hold=done` finishes once and stays on its last frame. */
export const LabReading: React.FC<{ hold: string | null }> = ({ hold }) => {
  const [complete, setComplete] = useState(false);
  useEffect(() => {
    if (hold === "work") return;
    if (hold === "done") { const t = setTimeout(() => setComplete(true), 400); return () => clearTimeout(t); }
    let inner: ReturnType<typeof setTimeout>;
    const cycle = () => { setComplete(false); inner = setTimeout(() => setComplete(true), 2200); };
    cycle();
    const id = setInterval(cycle, 8000);
    return () => { clearInterval(id); clearTimeout(inner); };
  }, [hold]);
  const cards: LoaderCard[] = SAMPLE.map((s) => (complete ? { ...s } : { messy: s.messy }));
  return <ScatterSettleLoader cards={cards} complete={complete} total={28} onProceed={spy("proceed")} onTimeout={spy("timeout")} />;
};

/** A stand-in commit for the lab's whole run: it writes nothing and reports an outcome shaped by the
 *  query (`skip` rows skipped at commit time, `none=1` for nothing imported). */
export const labCommit = (opts: { skip: number; none: boolean }) => async (result: SmartImportResult): Promise<CommitOutcome> => {
  const { importable, skipped } = validateSmartImport(result);
  spy("commit")();
  (window.__onbLab ??= { calls: [] }).result = JSON.parse(JSON.stringify(result));
  const commitSkips = Math.min(opts.skip, importable.length);
  return {
    agentsCreated: opts.none ? 0 : result.agents.length, agentsMerged: 0,
    queriesImported: opts.none ? 0 : importable.length - commitSkips,
    queriesSkipped: skipped.length + commitSkips,
    errors: importable.slice(0, commitSkips).map((q) => `Skipped a ${q.status} query — its agent couldn't be saved.`),
  };
};
export const LAB_UID = "onb-lab";

export const LabImporting: React.FC<{ done: boolean; loop: boolean }> = ({ done, loop }) => {
  const [complete, setComplete] = useState(done);
  useEffect(() => {
    if (!loop) return;
    const id = setInterval(() => setComplete((c) => !c), 4000);
    return () => clearInterval(id);
  }, [loop]);
  return <ImportingLoader complete={complete} onProceed={spy("proceed")} />;
};

export const LabOverview: React.FC<{ fx: string | null; title: string }> = ({ fx, title }) => (
  <ImportOverview result={labFixture(fx)} manuscriptTitle={title} fileName={LAB_FILE} onContinue={spy("continue")} />
);

export const LabReview: React.FC<{ fx: string | null }> = ({ fx }) => (
  <SmartImportReview
    result={labFixture(fx)}
    manuscriptTitle="Murphy's Day Out"
    onBack={spy("back")}
    onImport={(r) => {
      spy("import")();
      (window.__onbLab ??= { calls: [] }).result = JSON.parse(JSON.stringify(r));
    }}
  />
);
