/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Submission packages v41 Part D (screen 01; states 14, 15) — the current batch row, under the header: what new queries
 * go out with. It names the ACTIVE package (the manuscript's `activePackageId`, the package the log journey picks by
 * default) with its version, letter and synopsis; "Change" opens a short picker of the Ready and Out-with-agents
 * packages, and a pick goes through the model's existing `makeActive` writer; "Open →" opens it in the builder. With no
 * active package it says so and offers "Choose one →"; with no live package at all it is not drawn.
 */
import React, { useEffect, useRef, useState } from "react";
import type { SubmissionPackage } from "../../../types";
import { ESC_LEVEL, useEscapeLayer } from "../../../lib/escapeStack";
import { iconOf } from "../../../lib/packagesV26";
import { packageStage } from "../../../lib/packagesV40";
import { pcStyle } from "../../../lib/packagesV39";
import { BATCH_LEAD, BATCH_LEAD_SHORT, BATCH_NONE, BATCH_NONE_REST, statusWords } from "../../../lib/packagesV41";
import { Mark, Pic } from "../v26/icons";
import type { Pk26Model } from "../v26/usePk26Model";

export const PkTile: React.FC<{ p: SubmissionPackage; cls?: string }> = ({ p, cls = "" }) => (
  <span className={`p41-ic${cls ? ` ${cls}` : ""}`} style={pcStyle(p)} aria-hidden="true"><Pic ic={iconOf(p)} cls="p41-pic" /></span>
);

/** The version disc's number, as everywhere on this page ("O" for the original). */
export const vnumOf = (model: Pk26Model, id: string | undefined) => {
  const v = id ? model.versionRows.find((x) => x.id === id) ?? null : null;
  return v ? { name: v.name, num: v.original ? "O" : String(v.num) } : null;
};

/** The picker: the packages a batch can go out with (Ready, and Out with agents), the active one marked. */
const Picker: React.FC<{ model: Pk26Model; anchor: HTMLElement; onClose: () => void }> = ({ model, anchor, onClose }) => {
  const box = useRef<HTMLDivElement | null>(null);
  useEscapeLayer(true, onClose, ESC_LEVEL.page);
  useEffect(() => {
    box.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const down = (e: PointerEvent) => { const t = e.target as Node; if (box.current?.contains(t) || anchor.contains(t)) return; onClose(); };
    document.addEventListener("pointerdown", down, true);
    return () => document.removeEventListener("pointerdown", down, true);
  }, [anchor, onClose]);
  const choices = model.live.filter((p) => { const s = packageStage(p); return s === "ready" || s === "out"; });
  return (
    <div className="p41-bt-pop" ref={box} role="dialog" aria-label="Choose your current batch's package" data-pk41="batch-picker">
      <p className="p41-bt-pk">Your current batch goes out with</p>
      {choices.length ? choices.map((p) => {
        const on = model.active?.id === p.id;
        return (
          <button type="button" key={p.id} className={`p41-bt-o${on ? " p41-on" : ""}`} aria-pressed={on} data-pk41-pick={p.id}
            onClick={async () => { if (!on) await model.makeActive(p); onClose(); }}>
            <PkTile p={p} /><span><b>{p.packageName}</b><small>{statusWords(packageStage(p), { version: !!p.bookVersionId, letter: !!p.queryLetterVersionId })}</small></span>
            {on ? <em>Current</em> : null}
          </button>
        );
      }) : <p className="p41-bt-none">No package is ready yet. Give one a version and a letter, and it can go out.</p>}
    </div>
  );
};

export const Pk41Batch: React.FC<{ model: Pk26Model; onOpen: (p: SubmissionPackage) => void }> = ({ model, onOpen }) => {
  const [pick, setPick] = useState(false);
  const btn = useRef<HTMLButtonElement | null>(null);
  const close = () => { setPick(false); btn.current?.focus(); };
  if (!model.live.length) return null;
  const a = model.active && model.live.some((p) => p.id === model.active!.id) ? model.active : null;
  const v = a ? vnumOf(model, a.bookVersionId) : null;
  const L = a ? model.matName("let", a.queryLetterVersionId) : null;
  const Y = a ? model.matName("syn", a.synopsisVersionId) : null;
  return (
    <div className="p41-bt" role="region" aria-label="Your current batch" data-pk41="batch" data-active={a?.id ?? ""}>
      {a ? (
        <>
          <span className="p41-bt-k" data-pk41="batch-lead"><span className="p41-bt-kl">{BATCH_LEAD}</span><span className="p41-bt-ks">{BATCH_LEAD_SHORT}</span></span>
          <span className="p41-bt-n"><PkTile p={a} /><b data-pk41="batch-name">{a.packageName}</b></span>
          <span className="p41-bt-p">
            <span className={v ? "" : "p41-no"} data-pk41="batch-ver"><i className="p41-t p41-t-v">{v?.num ?? "–"}</i>{v?.name ?? "No version"}</span>
            <span className={L ? "" : "p41-no"} data-pk41="batch-let"><i className="p41-t p41-t-m"><Mark k="let" /></i>{L ?? "No letter"}</span>
            <span className={`p41-bt-syn${Y ? "" : " p41-no"}`} data-pk41="batch-syn"><i className="p41-t p41-t-m"><Mark k="syn" /></i>{Y ?? "No synopsis"}</span>
          </span>
          <span className="p41-bt-a">
            <button ref={btn} type="button" className="p41-lnk" aria-expanded={pick} aria-haspopup="dialog" data-pk41="batch-change" onClick={() => setPick((x) => !x)}>Change</button>
            <button type="button" className="p41-go" data-pk41="batch-open" onClick={() => onOpen(a)}>Open →</button>
          </span>
        </>
      ) : (
        <>
          <span className="p41-bt-k p41-bt-kn">{BATCH_NONE}</span>
          <span className="p41-bt-e">{BATCH_NONE_REST}</span>
          <span className="p41-bt-a">
            <button ref={btn} type="button" className="p41-go" aria-expanded={pick} aria-haspopup="dialog" data-pk41="batch-choose" onClick={() => setPick((x) => !x)}>Choose one →</button>
          </span>
        </>
      )}
      {pick && btn.current ? <Picker model={model} anchor={btn.current} onClose={close} /> : null}
    </div>
  );
};
