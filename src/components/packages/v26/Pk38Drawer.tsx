/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Submission packages v38 — the package drawer (ref `pkDrawer`): what's in a package and how it's doing, opened from a
 * label, the builder's "Figures" button or a Results showcase. It sits in the material drawer's own frame (the 7px
 * white rim and the fine inner border, `p6-cx-drw`); its contents are the ref's, with the `p8-` prefix.
 *
 * ⚠️ READ-ONLY. Its two actions are the only things it does: "Make a copy" (sent packages; opens New package with
 *    "a copy of {name}" chosen) and "Edit in the builder" (not for retired; loads it, closes, scrolls to the builder).
 * ⚠️ EVERY FIGURE IS packageReplies' (lib/packagesV38): the rate shows once MIN_SENDS_FOR_CLAIM agents have answered.
 */
import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { SubmissionPackage } from "../../../types";
import { ESC_LEVEL, useEscapeLayer } from "../../../lib/escapeStack";
import { iconOf } from "../../../lib/packagesV26";
import { drawerLine, drawerStatus, earlyWarning } from "../../../lib/packagesV38";
import { pcStyle } from "../../../lib/packagesV39";
import { Mark, Pic } from "./icons";
import { Ring } from "./Pk39Labels";
import type { Pk26Model } from "./usePk26Model";

export const Pk38Drawer: React.FC<{
  model: Pk26Model;
  p: SubmissionPackage | null;
  onClose: () => void;
  onCopy: (p: SubmissionPackage) => void;
  onEdit: (p: SubmissionPackage) => void;
  onSeeQueries: (ids: string[]) => void;
}> = ({ model, p, onClose, onCopy, onEdit, onSeeQueries }) => {
  const open = !!p;
  const [shown, setShown] = useState(false);
  useEffect(() => { if (!open) { setShown(false); return; } const t = requestAnimationFrame(() => setShown(true)); return () => cancelAnimationFrame(t); }, [open]);
  useEscapeLayer(open, onClose, ESC_LEVEL.pageDrawer);
  if (!p) return null;

  const f = model.figPk(p);
  const all = model.figAll;
  const avg = all.sent ? all.pct : null;
  const retired = p.status === "Retired";
  const use = model.active?.id === p.id;
  const ready = !!p.queryLetterVersionId && !!p.bookVersionId;
  const extras = (p.extraIds ?? []).map((id) => model.extras.find((e) => e.id === id)?.name ?? "").filter(Boolean);
  const L = model.letters.find((x) => x.id === p.queryLetterVersionId) ?? model.lettersAll.find((x) => x.id === p.queryLetterVersionId) ?? null;
  const Y = model.synopses.find((x) => x.id === p.synopsisVersionId) ?? model.synopsesAll.find((x) => x.id === p.synopsisVersionId) ?? null;
  const V = p.bookVersionId ? model.versionRows.find((v) => v.id === p.bookVersionId) ?? null : null;

  const row = (k: "let" | "syn" | "ver", lab: string, name: string | null, sub: string, glyph: React.ReactNode, none: string) => (
    <div className="p8-dpz" key={k}>
      <span className="p8-dpz-l">{lab}</span>
      {name ? (
        <span className="p8-mc"><i className={`p8-tic p8-t-${k}`}>{glyph}</i><span><b>{name}</b>{sub ? <small>{sub}</small> : null}</span></span>
      ) : (
        <span className="p8-mc p8-none"><i className={`p8-tic p8-t-${k}`}>{k === "ver" ? "–" : glyph}</i><span><b>{none}</b></span></span>
      )}
    </div>
  );
  const fn = ([["Sent", f.sent], ["Replied", f.replies], ["Asked for more", f.more], ["Full requests", f.full]] as const);
  const ids = model.creditedQueries(p).map((q) => q.id);

  return createPortal(
    <div className="p6-layer" data-pk38="drawer-layer">
      <div className={`p6-cx-dim${shown ? " p6-on" : ""}`} onClick={onClose} />
      <aside className={`p6-cx-drw${shown ? " p6-on" : ""}`} role="dialog" aria-modal="true" aria-label={p.packageName} data-pk38="pkd" data-pkg={p.id}>
        <div className="p8-dh p8-dpk" style={pcStyle(p)} data-pk39="pkd-head">
          <span className="p8-ddisc"><Pic ic={iconOf(p)} cls="p8-pic" /></span>
          <div className="p8-tx"><h3>{p.packageName}</h3><small>{[p.note, use && "Active", retired && "Retired"].filter(Boolean).join(" · ")}</small></div>
          <button type="button" className="p8-cx-x" aria-label="Close" onClick={onClose}>✕</button>
        </div>
        <div className="p8-db">
          <p className="p8-d-sum">{drawerStatus({ retired, sent: f.sent > 0 || !!p.firstSentAt, ready })}</p>
          <h5>What’s in it</h5>
          <div className="p8-dpzs">
            {row("let", "Query letter", L?.name ?? null, L?.summary ?? "", <Mark k="let" />, "No letter yet")}
            {row("syn", "Synopsis", Y?.name ?? null, Y?.summary ?? "", <Mark k="syn" />, "No synopsis")}
            {row("ver", "Pages from", V?.name ?? null, V?.summary ?? "", V ? (V.original ? "O" : String(V.num)) : "–", "No pages yet")}
            {extras.length ? <div className="p8-dpz"><span className="p8-dpz-l">Also sends</span><span>{extras.join(", ")}</span></div> : null}
          </div>
          <h5>How it’s doing</h5>
          {f.sent ? (
            <>
              <div className="p8-dst" data-pk38="pkd-rate">
                <div className="p8-dst-r"><Ring f={f} /><div><b>{f.ranked ? `${f.pct}%` : "Too early"}</b><span>{drawerLine(f, avg)}</span></div></div>
                <div className="p8-ptx-fn">
                  {fn.map(([l, v]) => <div className="p8-fn-r" key={l}><span>{l}</span><span className="p8-fn-b"><i style={{ width: `${(v / f.sent) * 100}%` }} /></span><b>{v}</b></div>)}
                </div>
              </div>
              {!f.ranked ? <p className="p8-rs-warn">{earlyWarning(f)}</p> : null}
              <div className="p8-ptx-t">
                <div><b>{f.days ?? "–"}</b><span>days to a reply, on average</span></div>
                <div><b>{f.full}</b><span>full manuscript requests</span></div>
              </div>
              <p className="p8-cp-n"><button type="button" className="p8-cx-lnk" onClick={() => onSeeQueries(ids)}>See these {f.sent} queries in the Query Centre</button></p>
            </>
          ) : <p className="p8-ptx-none">Its figures start with its first query.</p>}
        </div>
        <div className="p8-df">
          <span />
          <div className="p8-bt">
            {f.sent || p.firstSentAt ? <button type="button" className="p8-cx-b p8-g" data-pk38="copy" onClick={() => onCopy(p)}>Make a copy</button> : null}
            {retired ? null : <button type="button" className="p8-cx-b p8-p" data-pk38="edit" onClick={() => onEdit(p)}>Edit in the builder</button>}
          </div>
        </div>
      </aside>
    </div>,
    document.body,
  );
};
