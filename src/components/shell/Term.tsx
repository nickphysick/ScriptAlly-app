/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Help system v1, Part D — A DEFINITION ON ONE OF QUERYHAWK'S OWN WORDS (design-refs/help-system-v1, screens 06 and 07).
 *
 *   `<Term id="listHealth">List health</Term>` — the word takes a 1.5px dotted underline (ink 42%; on navy, cream 55%),
 *   rust with a blush wash on hover. Its card (in the one pop-up layer) opens on hover after 350ms, stays while the
 *   pointer is on the word or the card, and closes 180ms after leaving both; it also opens on keyboard focus (Tab then
 *   moves into the card's link) and on tap. Escape closes it and returns focus; scrolling closes it.
 *
 * ⚠️ A TERM INSIDE A BUTTON OR LINK NEVER TAKES THE CLICK. The mock's first version swallowed it: "list health" sits in
 *    the List health ring's button, a capture-phase handler on the word stopped the press, and the guide's housekeeping
 *    step never ticked. Inside a control the term opens on hover and on the CONTROL's focus only, and a press does the
 *    control's own job: this component registers no click handler at all there, in either phase.
 */
import React, { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { GLOSSARY, type GlossRun } from "../../lib/glossary";
import { articleHref, HELP_ARTICLES } from "../../lib/helpArticles";
import { StatusDot } from "../StatusDot";
import { AnchoredPortal, useAnchoredPopover } from "./useAnchoredPopover";
import "./term.css";

export const TERM_OPEN_MS = 350;
export const TERM_CLOSE_MS = 180;
const CONTROL = "button, a[href], [role='button'], label, summary";

/* one card at a time, app-wide */
type L = (id: string) => void;
const opened = new Set<L>();
const announce = (id: string) => [...opened].forEach((l) => l(id));

/** The card's article link. ⚠️ Its own component so the router is only asked for while a card is open: a term
 *  rendered outside a Router (a string-rendering test, a lab) must still render. */
const TermLink: React.FC<{ href: string; label: string; onGo: () => void; onTab: (shift: boolean) => void }> = ({ href, label, onGo, onTab }) => {
  const navigate = useNavigate();
  return (
    <a href={href} data-term-link=""
      onClick={(e) => { e.preventDefault(); onGo(); navigate(href); }}
      onKeyDown={(e) => { if (e.key === "Tab") { e.preventDefault(); onTab(e.shiftKey); } }}>{label}</a>
  );
};

export const Term: React.FC<{
  id: string;
  children: React.ReactNode;
  /** the status to draw on a status term's card (the closed set shares an entry; the dot is the row's own) */
  status?: string;
  /** a live example in place of the entry's own (List health states the writer's own gaps) */
  example?: readonly GlossRun[];
  /** on a navy ground: the underline is cream */
  onDark?: boolean;
  className?: string;
}> = ({ id, children, status, example, onDark, className }) => {
  const entry = GLOSSARY[id];
  const uid = useId().replace(/:/g, "");
  const cardId = `qh-term-${uid}`;
  const termRef = useRef<HTMLSpanElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [inControl, setInControl] = useState(false);
  const [open, setOpen] = useState(false);
  const openT = useRef<number | undefined>(undefined);
  /* after the link, Tab leaves the card and goes on from the word */
  const skipLink = useRef(false);
  const closeT = useRef<number | undefined>(undefined);
  const placed = useAnchoredPopover(termRef, cardRef, open, { align: "center", gap: 10 });

  useLayoutEffect(() => { setInControl(!!termRef.current?.parentElement?.closest(CONTROL)); }, []);

  const clear = () => { window.clearTimeout(openT.current); window.clearTimeout(closeT.current); };
  const show = useCallback(() => { clear(); setOpen(true); announce(uid); }, [uid]);
  const hide = useCallback(() => { clear(); setOpen(false); }, []);
  const hideSoon = () => { window.clearTimeout(closeT.current); closeT.current = window.setTimeout(() => setOpen(false), TERM_CLOSE_MS); };
  const showSoon = () => { window.clearTimeout(closeT.current); window.clearTimeout(openT.current); openT.current = window.setTimeout(show, TERM_OPEN_MS); };
  useEffect(() => () => clear(), []);

  /* another term opened: this one closes */
  useEffect(() => {
    const l: L = (other) => { if (other !== uid) setOpen(false); };
    opened.add(l);
    return () => { opened.delete(l); };
  }, [uid]);

  /* inside a control: the CONTROL's keyboard focus opens it, its blur closes it (the control keeps its click) */
  useEffect(() => {
    if (!inControl) return undefined;
    const ctl = termRef.current?.parentElement?.closest<HTMLElement>(CONTROL);
    if (!ctl) return undefined;
    const f = () => { if (ctl.matches(":focus-visible")) show(); };
    const b = () => hideSoon();
    ctl.addEventListener("focus", f);
    ctl.addEventListener("blur", b);
    return () => { ctl.removeEventListener("focus", f); ctl.removeEventListener("blur", b); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inControl, show]);

  /* open: scrolling closes it; Escape closes it and returns focus */
  useEffect(() => {
    if (!open) return undefined;
    const sc = (e: Event) => { if (cardRef.current && e.target instanceof Node && cardRef.current.contains(e.target)) return; hide(); };
    const key = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopImmediatePropagation(); e.preventDefault();
      hide();
      const back = inControl ? termRef.current?.parentElement?.closest<HTMLElement>(CONTROL) : termRef.current;
      back?.focus();
    };
    window.addEventListener("scroll", sc, true);
    window.addEventListener("keydown", key, true);
    return () => { window.removeEventListener("scroll", sc, true); window.removeEventListener("keydown", key, true); };
  }, [open, hide, inControl]);

  /* a tap or a click anywhere else closes it */
  useEffect(() => {
    if (!open) return undefined;
    const down = (e: PointerEvent) => {
      const t = e.target as Node;
      if (cardRef.current?.contains(t) || termRef.current?.contains(t)) return;
      hide();
    };
    window.addEventListener("pointerdown", down, true);
    return () => window.removeEventListener("pointerdown", down, true);
  }, [open, hide]);

  if (!entry) return <>{children}</>;
  const art = HELP_ARTICLES[entry.article];
  const ex = example ?? entry.example;
  const dot = status ?? entry.status;
  const card = open ? (
    <AnchoredPortal>
      <div ref={cardRef} id={cardId} role="tooltip" className="qh-def" data-term-card={id} style={placed.style}
        onMouseEnter={() => window.clearTimeout(closeT.current)} onMouseLeave={hideSoon}>
        <div className="qh-def-fr">
          <div className="qh-def-eb">{entry.eyebrow}</div>
          <h4 className="qh-def-t">{dot ? <StatusDot status={dot} overrideSize={16} decorative /> : null}<span>{entry.title}</span></h4>
          <p className="qh-def-b">{entry.body}</p>
          {ex ? <div className="qh-def-ex">{ex.map((r, i) => (typeof r === "string" ? <React.Fragment key={i}>{r}</React.Fragment> : <b key={i}>{r.b}</b>))}</div> : null}
          <div className="qh-def-ft">
            <TermLink href={articleHref(entry.article)} label={`${art?.title ?? entry.title} →`} onGo={hide}
              onTab={(back) => {
                hide(); skipLink.current = !back;
                const el = inControl ? termRef.current?.parentElement?.closest<HTMLElement>(CONTROL) : termRef.current;
                el?.focus();
              }} />
            <span>HELP</span>
          </div>
        </div>
      </div>
    </AnchoredPortal>
  ) : null;

  return (
    <>
      <span
        ref={termRef}
        className={`qh-term${onDark ? " qh-term--dark" : ""}${open ? " on" : ""}${className ? ` ${className}` : ""}`}
        data-term={id}
        aria-describedby={open ? cardId : undefined}
        {...(inControl ? {} : {
          tabIndex: 0,
          role: "button",
          "aria-expanded": open,
          onClick: () => { if (open) hide(); else show(); },
          onKeyDown: (e: React.KeyboardEvent) => {
            if (e.key === "Enter" || e.key === " ") { e.preventDefault(); if (open) hide(); else show(); }
            else if (e.key === "Tab" && !e.shiftKey && open && !skipLink.current) {
              const link = cardRef.current?.querySelector<HTMLElement>("[data-term-link]");
              if (link) { e.preventDefault(); link.focus(); }
            } else if (e.key === "Tab") { skipLink.current = false; }
          },
          onFocus: () => { if (termRef.current?.matches(":focus-visible")) show(); },
          onBlur: (e: React.FocusEvent) => { if (!cardRef.current?.contains(e.relatedTarget as Node)) hideSoon(); },
        })}
        onMouseEnter={showSoon}
        onMouseLeave={() => { window.clearTimeout(openT.current); if (open) hideSoon(); }}
      >{children}</span>
      {card}
    </>
  );
};
