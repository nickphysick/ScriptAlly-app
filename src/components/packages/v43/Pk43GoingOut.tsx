/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Submission packages v43 Phase 3 (ref screens 01, 04) — THE HEADER'S RIGHT BLOCK: what new queries go out with. The
 * package's icon in an outlined tile; "New queries go out with" in italic; its name in the typewriter; "<sent> sent ·
 * <asked> asked for more" ("Not sent yet" before anything has gone); and an outline "Change".
 *
 * CHANGE opens a small listbox of the packages that can go out — live, with a version and a letter (v40's Ready or Out
 * with agents) — each line its name and "<n> sent" / "not sent yet", the current one marked, and the rule beneath.
 * Choosing one calls the model's `makeActive` (the one writer of the manuscript's active package; the builder's "Use
 * for new queries" calls the same), which raises the app's snackbar with Undo. The page then opens that package and the
 * list's flag stamps in on its row. Esc and a click outside close the menu; focus returns to Change.
 *
 * Absent with no package going out. Hidden under 1100 wide (pk43.css §3): the list's flag still says it.
 */
import React, { useEffect, useRef, useState } from "react";
import type { SubmissionPackage } from "../../../types";
import { packageStage } from "../../../lib/packagesV40";
import { ESC_LEVEL, useEscapeLayer } from "../../../lib/escapeStack";
import { CHANGE, CHANGE_NOTE, GO_OUT_LEAD, changeLineSent } from "../../../lib/packagesV43";
import { iconOf } from "../../../lib/packagesV26";
import { Pic } from "../v26/icons";
import type { Pk26Model } from "../v26/usePk26Model";

/** The packages Change offers: live, and able to go out (a version and a letter). */
export const canGoOut = (p: SubmissionPackage) => { const s = packageStage(p); return s === "ready" || s === "out"; };

export const Pk43GoingOut: React.FC<{
  model: Pk26Model;
  going: SubmissionPackage;
  onChosen: (p: SubmissionPackage) => void;
}> = ({ model, going, onChosen }) => {
  const [open, setOpen] = useState(false);
  const btn = useRef<HTMLButtonElement | null>(null);
  const box = useRef<HTMLDivElement | null>(null);
  const f = model.figPk(going);
  const options = model.live.filter(canGoOut);
  const close = (focus = true) => { setOpen(false); if (focus) btn.current?.focus(); };
  useEscapeLayer(open, () => close(), ESC_LEVEL.page);
  /* a click outside closes it */
  useEffect(() => {
    if (!open) return undefined;
    const down = (e: PointerEvent) => { if (!box.current?.contains(e.target as Node)) close(false); };
    document.addEventListener("pointerdown", down, true);
    return () => document.removeEventListener("pointerdown", down, true);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  /* opening puts focus on the current line */
  useEffect(() => {
    if (!open) return;
    const sel = box.current?.querySelector<HTMLButtonElement>('[role="option"][aria-selected="true"]') ?? box.current?.querySelector<HTMLButtonElement>('[role="option"]');
    sel?.focus();
  }, [open]);
  const choose = (p: SubmissionPackage) => {
    close();
    if (p.id === going.id) return;
    void model.makeActive(p);
    onChosen(p);
  };
  const onKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const opts = [...(box.current?.querySelectorAll<HTMLButtonElement>('[role="option"]') ?? [])];
    const i = opts.indexOf(document.activeElement as HTMLButtonElement);
    opts[Math.max(0, Math.min(opts.length - 1, i + (e.key === "ArrowDown" ? 1 : -1)))]?.focus();
  };
  return (
    <div className="pk43-go" ref={box} data-pk43="going-out">
      <span className="pk43-go-ic" aria-hidden="true"><Pic ic={iconOf(going)} cls="pk43-go-pic" /></span>
      <div className="pk43-go-t">
        <span className="pk43-go-k">{GO_OUT_LEAD}</span>
        <b className="pk43-go-n" data-pk43="going-name">{going.packageName}</b>
        <span className="pk43-go-s" data-pk43="going-line">{f.sent > 0 ? <><b>{f.sent}</b> sent · <b>{f.more}</b> asked for more</> : "Not sent yet"}</span>
        <button ref={btn} type="button" className="pk43-go-ch" data-pk43="change" aria-haspopup="listbox" aria-expanded={open}
          onClick={() => (open ? close() : setOpen(true))}>{CHANGE}</button>
      </div>
      {open ? (
        <div className="pk43-pick" role="listbox" aria-label="What new queries go out with" data-pk43="change-menu" onKeyDown={onKey}>
          {options.map((p) => {
            const sent = model.figPk(p).sent;
            return (
              <button key={p.id} type="button" role="option" aria-selected={p.id === going.id} data-pk43-option={p.id} onClick={() => choose(p)}>
                <b>{p.packageName}</b><span>{changeLineSent(sent)}</span>
              </button>
            );
          })}
          <p>{CHANGE_NOTE}</p>
        </div>
      ) : null}
    </div>
  );
};
