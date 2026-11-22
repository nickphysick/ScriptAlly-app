/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Submission packages v62 §5.1–5.2 — the shared navy header (shell/OpenHeader, as v43 used it) with this page's slots:
 *   title     "{n} packages" / "No packages yet", and the Pro tag once a founding writer has dismissed the note
 *   by-line   "for {manuscript title}"
 *   buttons   "+ New package" (or "+ Make your first package") and "How it works"
 *   right     what new queries go out with, and Change (hidden with no package going out)
 * And the collapsed bar that shows on scroll (shell/SlimBar, as v43's).
 */
import React, { useEffect, useId, useRef, useState } from "react";
import { OpenHeader } from "../../shell/OpenHeader";
import { SlimBar } from "../../shell/SlimBar";
import { HAWK_STANDING } from "../../../lib/packagesV43";
import { ESC_LEVEL, useEscapeLayer } from "../../../lib/escapeStack";
import { iconOf } from "../../../lib/packagesV26";
import { FINISH_NOTE, FOUNDING_HAWK, PRO_TAG, PRO_TIP, goingLine, pickLine } from "../../../lib/packagesV62";
import type { SubmissionPackage } from "../../../types";
import { Pic } from "../v26/icons";
import type { Pk62 } from "./usePk62";

const ProTag: React.FC = () => {
  const tip = useId();
  return (
    <button type="button" className="k62-pro" aria-describedby={tip} data-pk62="pro-tag">
      {PRO_TAG}<span role="tooltip" id={tip} className="k62-pro-tip">{PRO_TIP}</span>
    </button>
  );
};

const GoingOut: React.FC<{ d: Pk62; going: SubmissionPackage; options: SubmissionPackage[]; onScreen: boolean; onChoose: (p: SubmissionPackage) => void }> = ({ d, going, options, onScreen, onChoose }) => {
  const [open, setOpen] = useState(false);
  const btn = useRef<HTMLButtonElement | null>(null);
  const box = useRef<HTMLDivElement | null>(null);
  const g = d.info(going);
  const close = (focus = true) => { setOpen(false); if (focus) btn.current?.focus(); };
  useEscapeLayer(open && onScreen, () => close(), ESC_LEVEL.page);
  useEffect(() => {
    if (!open) return undefined;
    const down = (e: PointerEvent) => { if (!box.current?.contains(e.target as Node)) close(false); };
    document.addEventListener("pointerdown", down, true);
    return () => document.removeEventListener("pointerdown", down, true);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!open) return;
    (box.current?.querySelector<HTMLButtonElement>('[role="option"][aria-selected="true"]') ?? box.current?.querySelector<HTMLButtonElement>('[role="option"]'))?.focus();
  }, [open]);
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const opts = [...(box.current?.querySelectorAll<HTMLButtonElement>('[role="option"]') ?? [])];
    const i = opts.indexOf(document.activeElement as HTMLButtonElement);
    opts[Math.max(0, Math.min(opts.length - 1, i + (e.key === "ArrowDown" ? 1 : -1)))]?.focus();
  };
  return (
    <div className="k62-cb" ref={box} data-pk62="going-out">
      <span className="k62-cb-k">New queries go out with</span>
      <b className="k62-cb-n" data-pk62="going-name"><span className="k62-disc"><Pic ic={iconOf(going)} cls="k62-pic" /></span><span>{going.packageName}</span></b>
      <span className="k62-cb-s" data-pk62="going-line">{goingLine(g.counts, g.sent, g.version?.name ?? null, g.letter?.name ?? null)}</span>
      <button ref={btn} type="button" className="k62-hb" data-pk62="change" aria-haspopup="listbox" aria-expanded={open}
        onClick={() => (open ? close() : setOpen(true))}>Change</button>
      {open ? (
        <div className="k62-pick" role="listbox" aria-label="Package for new queries" data-pk62="change-menu" onKeyDown={onKey}>
          {options.map((p) => {
            const i = d.info(p);
            return (
              <button key={p.id} type="button" role="option" aria-selected={p.id === going.id} data-pk62-option={p.id}
                onClick={() => { close(); if (p.id !== going.id) onChoose(p); }}>
                <span className="k62-disc"><Pic ic={iconOf(p)} cls="k62-pic" /></span>
                <span><b>{p.packageName}</b><em>{pickLine(i.counts, i.sent)}</em></span>
              </button>
            );
          })}
          <p>{FINISH_NOTE}</p>
        </div>
      ) : null}
    </div>
  );
};

export const Pk62Header: React.FC<{
  d: Pk62;
  title: string;
  msTitle: string | null;
  proTag: boolean;
  newLabel: string;
  onNew: () => void;
  onHow: () => void;
  going: SubmissionPackage | null;
  options: SubmissionPackage[];
  onScreen: boolean;
  onChoose: (p: SubmissionPackage) => void;
}> = ({ d, title, msTitle, proTag, newLabel, onNew, onHow, going, options, onScreen, onChoose }) => (
  <div className="qc151 qc153 pk43-hdw" data-pk43="header-wrap">
    <OpenHeader
      className="pk43-hd"
      attrs={{ "data-pk43": "header", "data-pk62": "header", "data-own-header": "" }}
      art={<img src={HAWK_STANDING} alt="" width={178} height={220} draggable={false} data-pk43="art" />}
      artClassName="pk43-art"
      title={<>{title}{proTag ? <ProTag /> : null}</>}
      titleAttrs={{ "data-pk62": "title", tabIndex: "-1" }}
      forLine={msTitle ? { lead: "for", text: msTitle, attrs: { "data-pk62": "for" } } : null}
      actions={<>
        <button type="button" className="qc1531-b qc1531-b--n" data-pk62="new" onClick={onNew}>{newLabel}</button>
        <button type="button" className="qc1531-b qc1531-b--g" data-pk62="how" onClick={onHow}>How it works</button>
      </>}
      ring={going ? <GoingOut d={d} going={going} options={options} onScreen={onScreen} onChoose={onChoose} /> : null}
    />
  </div>
);

const slimHeader = (row: HTMLElement) => row.parentElement?.querySelector<HTMLElement>(":scope > .pk43-hdw > header");
const noCover = (): null => null;

/** The collapsed header: the title, "{name} goes out with new queries", and New package. */
export const Pk62Slim: React.FC<{ title: string; going: string | null; onNew: () => void }> = ({ title, going, onNew }) => (
  <SlimBar hook="data-pk43" header={slimHeader} cover={noCover} title={title}
    right={going ? <span className="qc156-sw" data-pk62="slim-going"><b>{going}</b><em>goes out with new queries</em></span> : null}
    button={{ label: "New package", onClick: onNew, probe: "slim-new" }} />
);

/** §5.2 — the first-visit note: once per founding writer; "Got it" hides it for good. */
export const Pk62Note: React.FC<{ onOk: () => void }> = ({ onOk }) => (
  <div className="k62-note" role="note" data-pk62="note">
    <span className="k62-hdisc" aria-hidden="true"><img alt="" src={FOUNDING_HAWK} /></span>
    <p><b>Packages is a Pro page.</b> It’s free for you as a founding writer.</p>
    <button type="button" className="k62-btn" data-pk62="note-ok" onClick={onOk}>Got it</button>
  </div>
);
