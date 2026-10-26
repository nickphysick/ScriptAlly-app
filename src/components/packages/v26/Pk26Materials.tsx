/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Submission packages v26 — the Query letters and Synopses tabs (ref `#vMat`, `renderMat`): a full-width header
 * with its illustration placeholder and the add button, then one white table like the Contact list's. A row opens
 * the material drawer.
 */
import React from "react";
import { compsLine, iconOf, materialSummary } from "../../../lib/packagesV26";
import { Mark, Pic } from "./icons";
import type { MaterialRow, Pk26Model } from "./usePk26Model";

export const Pk26Materials: React.FC<{
  model: Pk26Model;
  kind: "let" | "syn";
  onOpen: (id: string) => void;
  onAdd: () => void;
  onOpenComps: () => void;
}> = ({ model, kind, onOpen, onAdd, onOpenComps }) => {
  const L = kind === "let";
  /* put-away ones last, tagged, so they keep a way back (their drawer offers "Bring it back") */
  const list: MaterialRow[] = L ? model.lettersAll : model.synopsesAll;
  const compNames = (m: MaterialRow) => (m.compIds ?? []).map((id) => model.comps.find((c) => c.id === id)?.title).filter((t): t is string => !!t);
  return (
    <section className="p6-lx" data-pk26="materials" data-kind={kind}>
      <div className={`p6-lx2 p6-t-${kind}`}>
        <header className="p6-lx2-h">
          <div className="p6-lx-art" aria-hidden="true" data-art="lx"><span>Art<small>{L ? "Hawk sealing a letter" : "Hawk with spectacles"}</small></span></div>
          <div className="p6-lx2-t">
            <h2>{L ? "Query letters" : "Synopses"}</h2>
            <p>{L ? <>Every letter you’ve written, and the comps each one names. Comps come from your <button type="button" className="p6-cx-lnk" onClick={onOpenComps}>Comparable titles</button> library.</> : "One page, two pages: whatever agents ask for. A synopsis only goes to agents who want one."}</p>
          </div>
          <button type="button" className="p6-hb-p" onClick={onAdd}>+ {L ? "Add a query letter" : "Add a synopsis"}</button>
        </header>
        <div className="p6-xtb">
          <div className="p6-xtb-r p6-h"><span>{L ? "Letter" : "Synopsis"}</span><span>{L ? "Comps it names" : "Length"}</span><span>In packages</span><span className="p6-r">Sent</span><span /></div>
          {list.map((m) => {
            const cl = L ? compsLine(compNames(m)) : null;
            return (
              <button type="button" key={m.id} className="p6-xtb-r" data-mat={`${kind}:${m.id}`} onClick={() => onOpen(m.id)}>
                <span className="p6-xtb-n"><i className={`p6-tic p6-t-${kind}`}><Mark k={kind} /></i><span><b>{m.name}{m.inUse ? <em>In use</em> : m.retired ? <em>Put away</em> : null}</b>{materialSummary(m.summary, m.sent, m.inPackages.length) ? <small>{materialSummary(m.summary, m.sent, m.inPackages.length)}</small> : null}</span></span>
                <span className="p6-xtb-c">{L
                  ? (cl ? <>{cl.text}{cl.more ? <> <i>+{cl.more}</i></> : null}</> : <i className="p6-o">None</i>)
                  : (m.words ? `${m.words.toLocaleString("en-GB")} words` : <i className="p6-o">Not counted</i>)}</span>
                <span className="p6-xtb-p">{m.inPackages.length ? m.inPackages.map((p) => <span key={p.id} className="p6-pkg"><Pic ic={iconOf(p)} />{p.packageName}</span>) : <i className="p6-o">None yet</i>}</span>
                <span className="p6-r p6-xtb-s">{m.sent || 0}</span>
                <span className="p6-xtb-e"><Mark k="pen" /></span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};
