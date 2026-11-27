/**
 * MOCK v169 (review build) — the Query Centre list as rows in one card, the Contact list's way: a cap pinned under the
 * toolbar's strip (a navy index bar of the groups, then the column heads), and under it each group's heading and rows.
 * Each row is the grid card itself (QcCard154, same facts, track, label, materials tile and Next box), laid out across
 * one line by qcv169.css — so a row shows exactly what a card shows.
 */
import React, { useEffect, useRef, useState } from "react";
import { pressSort, type Sort151, type SortKey151 } from "../../../lib/qc151";

const COLS: { key: SortKey151 | null; label: string; cls: string }[] = [
  { key: "agent", label: "Agent", cls: "c-ag" },
  { key: "stage", label: "Sent, and where it stands", cls: "c-ws" },
  { key: "queried", label: "Sent", cls: "c-sent" },
  { key: null, label: "Materials", cls: "c-mat" },
  { key: "due", label: "Next", cls: "c-nx" },
];

const COLS170: { key: SortKey151 | null; label: string; cls: string }[] = [
  { key: "agent", label: "Agent", cls: "c-ag" }, { key: "stage", label: "Where it stands", cls: "c-j" }, { key: null, label: "Sent by", cls: "c-sm" }, { key: null, label: "Materials", cls: "c-mat" }, { key: "due", label: "Next", cls: "c-nx" },
];
export const ListCap169: React.FC<{ sections: { key: string; label: string; n: number }[]; sort: Sort151; onSort: (s: Sort151) => void; cur?: string | null; variant?: string }> = ({ sections, sort, onSort, cur, variant }) => {
  const cols = variant === "ledger" ? COLS170 : COLS;
  const ref = useRef<HTMLDivElement>(null);
  const [stuck, setStuck] = useState(false);
  /* pinned only: the cap paints the page's ground round its white top (the Contact list's `data-clq-stuck`) */
  useEffect(() => {
    const el = ref.current; if (!el) return undefined;
    const sc = el.closest(".wpg-scroll") as HTMLElement | null; const tgt: HTMLElement | Window = sc ?? window;
    const on = () => { const top = parseFloat(getComputedStyle(el).top) || 0; const box = (sc ?? document.documentElement).getBoundingClientRect(); setStuck(el.getBoundingClientRect().top - (sc ? box.top : 0) <= top + 0.5); };
    on(); tgt.addEventListener("scroll", on, { passive: true }); window.addEventListener("resize", on);
    return () => { tgt.removeEventListener("scroll", on); window.removeEventListener("resize", on); };
  }, []);
  const jump = (k: string) => {
    const t = ref.current?.closest(".qc169-card")?.querySelector<HTMLElement>(`[data-qc1511="group"][data-k="${CSS.escape(k)}"]`);
    const sc = ref.current?.closest(".wpg-scroll") as HTMLElement | null;
    if (!t || !sc || !ref.current) return;
    const capB = ref.current.getBoundingClientRect().height + (parseFloat(getComputedStyle(ref.current).top) || 0);
    sc.scrollTo({ top: sc.scrollTop + t.getBoundingClientRect().top - sc.getBoundingClientRect().top - capB + 1, behavior: "smooth" });
  };
  const arrow = sort.desc ? "↓" : "↑";
  return (
    <div className="qc169-cap" ref={ref} data-qc169="cap" data-stuck={stuck ? "" : undefined}>
      <div className="qc169-capin">
        <div className="qc169-top">
          {sections.length > 1 && variant !== "ledger" ? (
            <nav className="qc169-ix" aria-label="Jump to a group" data-qc169="index">
              {sections.map((s) => <button key={s.key} type="button" aria-current={cur === s.label || undefined} onClick={() => jump(s.key)}>{s.label}<small>{s.n}</small></button>)}
            </nav>
          ) : null}
          <div className="qc169-th" data-qc169="heads">
            {cols.map((c) => (
              <span key={c.label} className={`qc169-thc ${c.cls}`}>
                {c.key ? <button type="button" className={sort.key === c.key ? "on" : ""} onClick={() => onSort(pressSort(sort, c.key!))}>{c.label}{sort.key === c.key ? <i>{arrow}</i> : null}</button> : c.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

/* MOCK ONLY — the review switches, fixed at the foot of the window */
import { createPortal } from "react-dom";
import { setMock169, useMock169 } from "../../../mock169";
export const Mock169Panel: React.FC<{ view: string }> = ({ view }) => {
  const m = useMock169();
  const [open, setOpen] = useState(true);
  const opt = <K extends "list" | "tint" | "line" | "next" | "mats" | "ws" | "wsl" | "tl" | "fp" | "g1" | "fold" | "bars" | "hint" | "views" | "slate" | "mpills" | "cw" | "head">(k: K, v: string, label: string) => (
    <button type="button" aria-pressed={m[k] === v} onClick={() => setMock169({ [k]: v } as never)}>{label}</button>
  );
  return createPortal(
    <div className="mk169" data-open={open ? "" : undefined}>
      <button type="button" className="mk169-t" onClick={() => setOpen(!open)}>{open ? "Hide switches" : "Review switches"}</button>
      {open ? <>
        {view === "list" ? <>
          <div><b>List</b>{opt("list", "ledger", "New list (v7)")}{opt("list", "rows", "Rows (v6)")}{opt("list", "cards", "Cards (as built)")}</div>
          {m.list === "ledger" ? <div><b>Layout</b>{opt("tl", "steps", "1 Steps with dates")}{opt("tl", "beside", "2 Track, status beside")}{opt("tl", "under", "3 Status by the name")}{opt("tl", "lead", "4 Track leads the row")}</div> : null}
          {m.list === "rows" ? <div><b>Agent and stage</b>{opt("wsl", "band", "Band, sent date first (new)")}{opt("wsl", "steps", "1 Steps with dates")}{opt("wsl", "bar", "2 Progress bar")}{opt("wsl", "chip", "3 Chip and age")}{opt("wsl", "seal", "4 On the seal")}{opt("wsl", "ledger", "5 One band")}{opt("wsl", "status", "6 Status first")}</div> : null}
          <div><b>Next box</b>{opt("next", "act", "The action (proposed)")}{opt("next", "built", "As built")}</div>
          {m.list === "rows" ? <div><b>Materials</b>{opt("mats", "icons", "Icon pill")}{opt("mats", "clip", "Paperclip tile (as built)")}</div> : null}
        </> : null}
        <div><b>Filter panel</b>{opt("fp", "smart", "Smart (new)")}{opt("fp", "built", "As built")}</div>
        <div><b>Heading row</b>{opt("head", "blush", "Blush")}{opt("head", "blushd", "Deeper blush")}{opt("head", "sand", "Sand")}{opt("head", "navy", "Navy")}{opt("head", "line", "White, navy rule")}{opt("head", "slate", "Slate (Agents)")}{opt("head", "cream", "Cream (now)")}</div>
        <div><b>Close wording</b>{opt("cw", "consider", "Consider closing")}{opt("cw", "close", "Close it")}</div>
      </> : null}
    </div>, document.body);
};
