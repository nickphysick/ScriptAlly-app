/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Discover v1 — the Scout's page (`/agents/discover`). Ref: design-refs/discover-v1/discover-v1.html.
 *
 * Two faces, one route:
 *   · COMING SOON while `DISCOVER_LIVE` is false (prod): the navy panel, how it works, the catalogue so far.
 *   · LIVE: the light header, the share notice, the Scout's picks (live / done / none), the community catalogue.
 *
 * ⚠️ THE LIVE FACE NEVER MOUNTS WHILE THE FLAG IS OFF — except through the dev review aid, which is gated HERE on
 *    `import.meta.env.MODE !== "production"`, so a production build folds the branch away and the aid's module is
 *    absent from the bundle (lock E1 greps `dist/`).
 * ⚠️ PRO: the pill only. There is no Pro gate on this route today and none is invented here (the report says so).
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useScriptAllyDb } from "../../../lib/db";
import { DISCOVER_LIVE } from "../../../lib/discoverShared";
import { notifyPrefs } from "../../../lib/accountPrefs";
import { devAid, type DevAid } from "../../../lib/discoverReviewAid";
import { resolveScopedManuscript } from "../../../lib/shellSidebar";
import { WorkspacePageGrid } from "../../shell/WorkspacePageGrid";
import { AppFooter } from "../../shell/AppFooter";
import { DvEmptyHeader, DvHeader, type HeaderTitle } from "./DvHeader";
import { DvPicks, type DecideKind, type Leaving } from "./DvPicks";
import { DvHowModal, DvPassedModal, DvSteps, DvToast, DvTune, type ToastState } from "./DvLayers";
import { DvCatalogue, DvShareNotice, DvShareSheet } from "./DvShare";
import { catalogueFigures, decisionDoc, hasAnyFigure, type ScoutPick } from "../../../lib/scout";
import type { Agent } from "../../../types";
import { openQueryDrawer } from "../../../lib/queryActions/drawerStore";
import { bookGenres } from "../../../lib/genreMatch";
import { countryName } from "../../../lib/territory";
import { useScout } from "./useScout";
import "./discover1.css";

type Nav = (tab: string, sub?: string, opts?: { agentId?: string; manuscriptId?: string }) => void;

const NO_AID: DevAid = { face: null, fixture: null, memory: null, holdMs: 0 };

export const DiscoverPage: React.FC<{ onNavigate?: Nav }> = ({ onNavigate }) => {
  /* ⚠️ THE MODE CHECK IS AT THE CALL SITE, AS A TERNARY ON THE BUILD CONSTANT — a production build folds this to
     NO_AID and the aid's module is absent from the bundle (lock E1 greps it). Read once per visit. */
  const [aid] = useState<DevAid>(() => (import.meta.env.MODE !== "production" ? devAid() : NO_AID));
  const face: "soon" | "live" = aid.face ?? (DISCOVER_LIVE ? "live" : "soon");
  const nav: Nav = onNavigate ?? (() => {});
  return (
    <WorkspacePageGrid className="dv1-wpg" scrollLabel="Discover" masthead={null}>
      <div className="dv1-page" data-dv1="page" data-face={face}>
        {face === "soon" ? <ComingSoon onNavigate={nav} /> : <LivePage aid={aid} onNavigate={nav} />}
        <AppFooter onNavigate={nav} />
      </div>
    </WorkspacePageGrid>
  );
};

/* ── COMING SOON ─────────────────────────────────────────────────────────── */

const ComingSoon: React.FC<{ onNavigate: Nav }> = () => {
  const db = useScriptAllyDb();
  const msTitle = useScoutBook();
  const notified = notifyPrefs(db.currentUser?.notifyPrefs).discover;
  /* ⚠️ ONE LEAF, `notifyPrefs.discover` — the whole map would drop Settings' other two keys */
  const toggle = () => { void db.updateUserPaths({ "notifyPrefs.discover": !notified }); };
  const [how, setHow] = useState(false);
  const figs = catalogueFigures();
  return (
    <>
      <DvEmptyHeader msTitle={msTitle} titleLoading={!db.collectionsReady} notified={notified} onNotify={toggle} onHow={() => setHow(true)}>
        <DvSteps headingId="dv1SoonH" />
        <div className="dv1-sofar" data-dv1="so-far">
          <div>
            <h3>The catalogue so far.</h3>
            {/* ⚠️ NO FIGURE HAS A READABLE SOURCE YET (decision 8), so this says so in words — no number, no dash, no zero */}
            <p data-dv1="so-far-line">The count goes here once it’s ready to share. The Scout opens when there are enough verified agents in your genre to be useful.</p>
          </div>
          {hasAnyFigure(figs) ? (
            <div className="dv1-figs" data-dv1="cat-figures">
              {figs.contributed != null ? <div className="dv1-fig"><b>{figs.contributed.toLocaleString("en-GB")}</b><span>agents contributed by writers</span></div> : null}
              {figs.verified != null ? <div className="dv1-fig"><b>{figs.verified.toLocaleString("en-GB")}</b><span>verified so far</span></div> : null}
            </div>
          ) : null}
        </div>
      </DvEmptyHeader>
      <DvHowModal open={how} onClose={() => setHow(false)} />
    </>
  );
};

/** The sidebar's book title, for the coming-soon paragraph (the live page reads it through useScout). */
function useScoutBook(): string | null {
  const { manuscripts } = useScriptAllyDb();
  return useMemo(() => {
    let id: string | null = null;
    try { id = window.localStorage.getItem("scriptally_active_manuscript_id"); } catch { id = null; }
    return resolveScopedManuscript(manuscripts, id)?.title ?? null;
  }, [manuscripts]);
}

/* ── LIVE ────────────────────────────────────────────────────────────────── */

/** How long the add's toast offers Undo — and so how long the catalogue's +1 is held (lib/scoutStore). */
export const TOAST_MS = 6500;
/** The stamp shows for this long before the card leaves (the mock's 800ms). */
const STAMP_MS = 800;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

type LeavingPick = Leaving & { pick: ScoutPick };

const LivePage: React.FC<{ aid: DevAid; onNavigate: Nav }> = ({ aid, onNavigate }) => {
  const s = useScout(aid);
  const ms = s.manuscript;

  const [leaving, setLeaving] = useState<LeavingPick | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const toastSeq = useRef(0);
  const say = (t: Omit<ToastState, "id">) => setToast({ ...t, id: ++toastSeq.current });
  const [tune, setTune] = useState(false);
  const [how, setHow] = useState<{ step?: number } | null>(null);
  const [passedOpen, setPassedOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [sharing, setSharing] = useState(false);
  const share = async (agents: Agent[]) => {
    if (!s.io || !agents.length) return;
    setSharing(true);
    const r = await s.io.share(agents, Date.now());
    setSharing(false);
    setShareOpen(false);
    const k = r.shared.length;
    /* ⚠️ NO UNDO: the submission cannot be taken back by the client (the sheet said so before the press) */
    say({ msg: r.failed.length
      ? `${k ? `Shared ${k}. ` : ""}${r.failed.length} could not be shared — check your connection and try again.`
      : `Shared ${k} ${k === 1 ? "agent" : "agents"}. ${k === 1 ? "It joins" : "They join"} the catalogue once checked by hand.` });
  };

  /* ⚠️ A HELD +1 IS SENT WHEN THE PAGE IS LEFT OR THE TAB HIDES — the add stood */
  useEffect(() => {
    const io = s.io;
    if (!io) return;
    const flush = () => io.flushIncrements();
    window.addEventListener("pagehide", flush);
    return () => { window.removeEventListener("pagehide", flush); flush(); };
  }, [s.io]);

  const shown: ScoutPick[] = leaving ? [leaving.pick, ...s.queue.filter((p) => p.agent.id !== leaving.pick.agent.id)] : s.queue;

  const decide = async (kind: DecideKind) => {
    const pick = s.queue[0];
    if (!pick || leaving || !s.io || !ms) return;
    const ca = pick.agent;
    const name = ca.name || ca.agency;
    const started = Date.now();
    if (kind === "skip") {
      setLeaving({ id: ca.id, kind, pick });
      await wait(260);
      s.setSkipped((xs) => [...xs.filter((x) => x !== ca.id), ca.id]);
      s.setLeadId(null);
      setLeaving(null);
      say({ msg: `Skipped ${name} — they’ll come round again.` });
      return;
    }
    /* the decision document as it stood (an expired pass is a real document) — Undo puts it back */
    const before = s.decisions.find((d) => d.id === ca.id);
    setLeaving({ id: ca.id, kind, pick });
    let agentId: string | null = null;
    if (kind === "add") {
      const r = await s.io.add(ca, ms.title);
      /* ⚠️ `in`, NOT `r.ok`: strictNullChecks is off here, so a boolean discriminant does not narrow */
      if ("error" in r) { setLeaving(null); say({ msg: r.error }); return; }
      agentId = r.agentId;
    }
    try {
      await s.io.writeDecision({ id: ca.id, ...decisionDoc(kind === "add" ? "added" : "passed", Date.now(), ms.id) });
    } catch {
      if (agentId) await s.io.undoAdd(agentId, ca.id, before).catch(() => {});
      setLeaving(null);
      say({ msg: "That didn’t save. Check your connection and try again." });
      return;
    }
    if (agentId) s.io.scheduleIncrement(ca.id, TOAST_MS + 500);
    await wait(Math.max(0, STAMP_MS - (Date.now() - started)));
    setLeaving(null);
    s.setDecidedHere((n) => n + 1);
    s.setLeadId(null);
    const io = s.io;
    const undo = async () => {
      setToast(null);
      if (agentId) await io.undoAdd(agentId, ca.id, before);
      else await io.restoreDecision(ca.id, before);
      s.setDecidedHere((n) => Math.max(0, n - 1));
      s.setLeadId(ca.id);
    };
    if (kind === "add") {
      say({
        msg: `Added ${name} to your contact list.`, undo,
        action: { label: "Log a query", run: () => { setToast(null); openQueryDrawer(aid.fixture ? { mode: "log" } : { mode: "log", agentId: agentId!, manuscriptId: ms.id }); } },
      });
    } else {
      say({ msg: `Passed on ${name}. You can look again later.`, undo });
    }
  };

  const bringBack = async (id: string) => {
    const row = s.passed.find((r) => r.agent.id === id);
    await s.io?.bringBack(id);
    setPassedOpen(false);
    say({ msg: `${row ? row.agent.name || row.agent.agency : "That agent"} is back in your picks.` });
  };

  const title: HeaderTitle = s.loading ? { kind: "loading" }
    : s.view === "live" ? { kind: "count", n: s.queue.length } : s.view === "done" ? { kind: "done" } : { kind: "none" };
  return (
    <>
      <DvHeader title={title} msTitle={ms?.title ?? null} tally={s.loading ? null : s.tally}
        onTune={() => setTune(true)} onShare={() => setShareOpen(true)} onHow={() => setHow({})} onPassed={() => setPassedOpen(true)} />
      {s.loading ? null : <DvShareNotice n={s.part.notShared} onShare={() => setShareOpen(true)} />}
      {s.loading ? null : (
        <DvPicks queue={shown} view={leaving ? "live" : s.view} manuscript={ms} prefs={s.prefs} lens={s.lens} skipped={s.skipped}
          passedCount={s.passed.length} leaving={leaving} pickIdx={s.decidedHere + 1} pickTotal={s.decidedHere + shown.length}
          onDecide={(k) => { void decide(k); }} onLead={(id) => s.setLeadId(id)} onTune={() => setTune(true)}
          onHow={(step) => setHow({ step })} onPassed={() => setPassedOpen(true)} onShare={() => setShareOpen(true)} />
      )}
      {s.loading ? null : <DvCatalogue figures={catalogueFigures()} part={s.part} onShare={() => setShareOpen(true)} />}
      <DvTune open={tune} onClose={() => setTune(false)} prefs={s.prefs} lens={s.lens} lenses={s.lenses} hasLocations={s.hasLocations}
        homeName={countryName(s.homeCountry) ?? null} genres={bookGenres(ms)} ageCategory={ms?.ageCategory ?? null} msTitle={ms?.title ?? null}
        onLens={(l) => { void s.setPref("lens", l); }} onSwitch={(k, v) => { void s.setPref(k, v); }}
        onManuscripts={() => { setTune(false); onNavigate("manuscripts"); }} />
      <DvPassedModal open={passedOpen} rows={s.passed} onBringBack={(id) => { void bringBack(id); }} onClose={() => setPassedOpen(false)} />
      <DvHowModal open={!!how} step={how?.step} onClose={() => setHow(null)} />
      <DvShareSheet open={shareOpen} candidates={s.part.candidates} uid={s.uid ?? "dvfx"} busy={sharing} onClose={() => setShareOpen(false)} onShare={(a) => { void share(a); }} />
      <DvToast toast={toast} ms={TOAST_MS} onDone={() => setToast(null)} />
    </>
  );
};
