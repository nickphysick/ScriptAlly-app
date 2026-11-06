/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * QueryLettersPage — `/materials/letters` (Query letters v1, 6 Nov; design-refs/query-letters-v1, 01–05).
 *
 * The header (the Contact list's open-header grammar: the Courier on the left, the title, the rule-flanked manuscript,
 * the line, two buttons) with the in-use card on its right; "Your letters", a grid of cards; "Which letter is landing?",
 * a navy band with a table; and the letter drawer.
 *
 * ⚠️ EVERY FIGURE IS `lib/queryLetters`. "In use" is `inUseLetter` (the log journey's individual send reads the same
 * function); a query's letter is `resolveLetters`; replies and "asked for more" are Versions' `isReply` / `isMore` over
 * Analytics' rows. Nothing on this page derives them a second way.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useScriptAllyDb } from "../../lib/db";
import type { Agent, ManuscriptVersion, Query } from "../../types";
import { scopedManuscript } from "../../lib/manuscriptSummary";
import { buildRows } from "../../lib/analytics";
import { PACKAGES_PATH } from "../../lib/packagesRoute";
import { ESC_LEVEL, useEscapeLayer } from "../../lib/escapeStack";
import {
  changedLine, firstLetter, inUseLetter, isLiveLetter, letterFacts, lettersFor, lettersTitle, packageLetterDiffers, pageOrder, resolveLetters,
  type LetterFacts,
} from "../../lib/queryLetters";
import { LetterCard, NewLetterTile } from "./LetterCard";
import { LandingBand } from "./LandingBand";
import "../shell/lightHeader.css";
import "./queryLetters.css";

export const QUERY_LETTERS_TITLE = "Query letters";
export const QUERY_LETTERS_LINE = "Write and keep every version of your letter, then see which one gets agents asking for more.";

const ACTIVE_MS_KEY = "scriptally_active_manuscript_id";

/** The ring on the in-use card: "{more}/{sent} asked for more", or "Not sent yet". */
const Ring: React.FC<{ more: number; sent: number }> = ({ more, sent }) => {
  const r = 34, c = 2 * Math.PI * r, p = sent ? more / sent : 0;
  return (
    <span className="qlp-ring" data-ql="ring">
      <svg viewBox="0 0 84 84" aria-hidden="true">
        <circle cx="42" cy="42" r={r} fill="none" stroke="rgba(28,19,15,.1)" strokeWidth="7" />
        {sent > 0 && p > 0 && (
          <circle cx="42" cy="42" r={r} fill="none" stroke="#a2452a" strokeWidth="7" strokeLinecap="butt"
            strokeDasharray={`${c * p} ${c}`} transform="rotate(-90 42 42)" />
        )}
      </svg>
      <b>{more}<small>/{sent}</small></b>
    </span>
  );
};

export const QueryLettersPage: React.FC<{ active?: boolean }> = ({ active = true }) => {
  const db = useScriptAllyDb();
  const { manuscripts, packages, queries, activities, agents, versions, updateManuscriptQuiet } = db;
  const location = useLocation();
  const navigate = useNavigate();
  const stored = useMemo(() => { try { return localStorage.getItem(ACTIVE_MS_KEY); } catch { return null; } }, [location.key]);
  const ms = useMemo(() => scopedManuscript(manuscripts, stored), [manuscripts, stored]);

  const msQueries = useMemo(() => (ms ? (queries as Query[]).filter((q) => q.manuscriptId === ms.id) : []), [ms, queries]);
  const rows = useMemo(() => new Map(buildRows(msQueries, activities, agents as Agent[], Date.now()).map((r) => [r.id, r])), [msQueries, activities, agents]);
  const letters = useMemo(() => (ms ? lettersFor(ms.id, versions) : []), [ms, versions]);
  const live = useMemo(() => letters.filter(isLiveLetter), [letters]);
  const retired = useMemo(() => letters.filter((v) => !isLiveLetter(v)), [letters]);
  const use = useMemo(() => inUseLetter(ms, versions, packages), [ms, versions, packages]);
  const differs = useMemo(() => packageLetterDiffers(ms, versions, packages), [ms, versions, packages]);
  const resolved = useMemo(() => (ms ? resolveLetters(ms.id, msQueries, versions, packages) : new Map()), [ms, msQueries, versions, packages]);
  const facts = useMemo(() => new Map<string, LetterFacts>(letters.map((v) => [v.id, letterFacts(v, msQueries, resolved, rows)])), [letters, msQueries, resolved, rows]);

  const [showRetired, setShowRetired] = useState(false);
  const [picker, setPicker] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const pickRef = useRef<HTMLDivElement>(null);
  useEscapeLayer(picker && active, () => setPicker(false), ESC_LEVEL.page);
  useEffect(() => {
    if (!picker) return;
    const down = (e: PointerEvent) => { if (!pickRef.current?.contains(e.target as Node)) setPicker(false); };
    document.addEventListener("pointerdown", down, true);
    return () => document.removeEventListener("pointerdown", down, true);
  }, [picker]);

  const firstId = ms ? firstLetter(ms.id, versions)?.id ?? null : null;
  const useFacts = use ? facts.get(use.id) : undefined;
  const ordered = pageOrder(live, use?.id ?? null);

  const chooseInUse = (id: string) => {
    setPicker(false);
    if (!ms || id === use?.id) return;
    void updateManuscriptQuiet(ms.id, { inUseLetterId: id });
  };
  const jump = () => document.getElementById("ql-landing")?.scrollIntoView({ behavior: "smooth", block: "start" });
  const newLetter = () => setOpenId("new");
  void openId;

  return (
    <div className="qlp" data-ql="page">
      <header className="qlp-head" data-ql="header" data-own-header="">
        <img className="qlp-hawk" src="/images/dash/courier.png" alt="" />
        <div className="qlp-hm">
          <h1 className="qlp-title" data-page-title="" tabIndex={-1}>{lettersTitle(live.length)}</h1>
          {ms && (
            <p className="qlp-by" data-ql="for"><i /><span><em>for</em> <b>{ms.title}</b></span><i /></p>
          )}
          <p className="qlp-sub" data-ql="line">{QUERY_LETTERS_LINE}</p>
          <div className="qlp-acts">
            <button type="button" className="qlp-b1" data-ql="new" onClick={newLetter}>+ New letter</button>
            <button type="button" className="qlp-b2" data-ql="jump" onClick={jump}>Which letter is landing?</button>
          </div>
        </div>
        {use && (
          <div className="qlp-use" data-ql="in-use">
            <div className="qlp-use-l">
              <span className="qlp-use-k">Going out with new queries</span>
              <b className="qlp-use-n">{use.versionName}</b>
              {changedLine(use, use.id === firstId) && <span className="qlp-use-d">{changedLine(use, use.id === firstId)}</span>}
              {differs && (
                <span className="qlp-use-pk" data-ql="pkg-letter">
                  Package sends go with{" "}
                  <a href={`${PACKAGES_PATH}?pkg=${differs.pkg.id}`} onClick={(e) => { e.preventDefault(); navigate(`${PACKAGES_PATH}?pkg=${differs.pkg.id}`); }}>
                    {differs.pkg.packageName}
                  </a>'s letter: {differs.letter.versionName}
                </span>
              )}
              <div className="qlp-chw" ref={pickRef}>
                <button type="button" className="qlp-use-ch" data-ql="change" aria-expanded={picker} onClick={() => setPicker((o) => !o)}>Change</button>
                {picker && (
                  <div className="qlp-pick" role="listbox" aria-label="Letter for new queries" data-ql="picker">
                    {pageOrder(live, null).map((v) => (
                      <button key={v.id} type="button" role="option" aria-selected={v.id === use.id} className="qlp-pick-o" onClick={() => chooseInUse(v.id)}>
                        <b>{v.versionName}</b>
                        <span>{(facts.get(v.id)?.sent ?? 0) ? `${facts.get(v.id)?.sent} sent` : "Not sent yet"}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="qlp-use-r">
              {useFacts && useFacts.sent > 0 ? (
                <>
                  <Ring more={useFacts.more} sent={useFacts.sent} />
                  <span className="qlp-use-rl">asked for more</span>
                </>
              ) : (
                <span className="qlp-use-rl qlp-use-none" data-ql="ring-none">Not sent yet</span>
              )}
            </div>
          </div>
        )}
      </header>

      <section className="qlp-sec" data-ql="letters">
        <div className="qlp-sech">
          <h2>Your letters</h2>
          <span className="qlp-sech-r">Click a letter to read, edit or see how it's doing</span>
        </div>
        <div className="qlp-grid" data-ql="grid">
          {ordered.map((v: ManuscriptVersion) => (
            <LetterCard key={v.id} facts={facts.get(v.id)!} inUse={v.id === use?.id} first={v.id === firstId} onOpen={setOpenId} />
          ))}
          <NewLetterTile onNew={newLetter} />
        </div>
        {retired.length > 0 && (
          <div className="qlp-retired">
            <button type="button" className="qlp-lnk" data-ql="show-retired" aria-expanded={showRetired} onClick={() => setShowRetired((s) => !s)}>
              {showRetired ? "Hide retired" : `Show retired · ${retired.length}`}
            </button>
            {showRetired && (
              <div className="qlp-grid qlp-grid--retired" data-ql="retired">
                {retired.map((v) => <LetterCard key={v.id} facts={facts.get(v.id)!} inUse={false} first={v.id === firstId} onOpen={setOpenId} />)}
              </div>
            )}
          </div>
        )}
      </section>

      <LandingBand facts={live.map((v) => facts.get(v.id)!).concat(retired.map((v) => facts.get(v.id)!))} inUseId={use?.id ?? null} firstId={firstId} onOpen={setOpenId} />
    </div>
  );
};
