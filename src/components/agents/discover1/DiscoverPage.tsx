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
import { memoryIO, reviewFixture, reviewHoldMs, reviewLive, reviewState, type ReviewState } from "../../../lib/discoverReviewAid";
import { resolveScopedManuscript } from "../../../lib/shellSidebar";
import { WorkspacePageGrid } from "../../shell/WorkspacePageGrid";
import { AppFooter } from "../../shell/AppFooter";
import { DvEmptyHeader, DvHeader, type HeaderTitle } from "./DvHeader";
import { DvPicks, type DecideKind, type Leaving } from "./DvPicks";
import { DvHowModal, DvPassedModal, DvToast, DvTune, type ToastState } from "./DvLayers";
import { decisionDoc, type ScoutPick } from "../../../lib/scout";
import { openQueryDrawer } from "../../../lib/queryActions/drawerStore";
import { bookGenres } from "../../../lib/genreMatch";
import { countryName } from "../../../lib/territory";
import { useScout, type Fixture } from "./useScout";
import "./discover1.css";

type Nav = (tab: string, sub?: string, opts?: { agentId?: string; manuscriptId?: string }) => void;

/** What the page should be: the prod gate, unless a dev build's review aid says otherwise. */
function useFace(): { face: "soon" | "live"; fixtureState: ReviewState | null } {
  /* ⚠️ THE MODE CHECK IS AT THE CALL SITE so the bundler can drop the aid (see the file header) */
  const aidState = import.meta.env.MODE !== "production" ? reviewState() : null;
  const aidLive = import.meta.env.MODE !== "production" ? reviewLive() : false;
  if (aidState === "empty") return { face: "soon", fixtureState: null };
  if (aidState) return { face: "live", fixtureState: aidState };
  if (aidLive) return { face: "live", fixtureState: null };
  return { face: DISCOVER_LIVE ? "live" : "soon", fixtureState: null };
}

export const DiscoverPage: React.FC<{ onNavigate?: Nav }> = ({ onNavigate }) => {
  const { face, fixtureState } = useFace();
  const nav: Nav = onNavigate ?? (() => {});
  return (
    <WorkspacePageGrid className="dv1-wpg" scrollLabel="Discover" masthead={null}>
      <div className="dv1-page" data-dv1="page" data-face={face}>
        {face === "soon" ? <ComingSoon onNavigate={nav} /> : <LivePage fixtureState={fixtureState} onNavigate={nav} />}
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
  return <DvEmptyHeader msTitle={msTitle} notified={notified} onNotify={toggle} onHow={() => {}} />;
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

const LivePage: React.FC<{ fixtureState: ReviewState | null; onNavigate: Nav }> = ({ fixtureState, onNavigate }) => {
  /* the fixture and its in-memory store are made once per visit */
  const [aid] = useState(() => {
    /* ⚠️ THE MODE CHECK FIRST, so a production build folds the aid away */
    if (import.meta.env.MODE === "production") return { fixture: null as Fixture | null, memory: null, holdMs: 0 };
    const holdMs = reviewHoldMs();
    if (!fixtureState) return { fixture: null as Fixture | null, memory: null, holdMs };
    const fixture = reviewFixture(fixtureState);
    return { fixture, memory: memoryIO(fixture.decisions), holdMs };
  });
  const s = useScout(aid);
  const ms = s.manuscript;

  const [leaving, setLeaving] = useState<LeavingPick | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const toastSeq = useRef(0);
  const say = (t: Omit<ToastState, "id">) => setToast({ ...t, id: ++toastSeq.current });
  const [tune, setTune] = useState(false);
  const [how, setHow] = useState<{ step?: number } | null>(null);
  const [passedOpen, setPassedOpen] = useState(false);

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
        onTune={() => setTune(true)} onShare={() => {}} onHow={() => setHow({})} onPassed={() => setPassedOpen(true)} />
      {s.loading ? null : (
        <DvPicks queue={shown} view={leaving ? "live" : s.view} manuscript={ms} prefs={s.prefs} lens={s.lens} skipped={s.skipped}
          passedCount={s.passed.length} leaving={leaving} pickIdx={s.decidedHere + 1} pickTotal={s.decidedHere + shown.length}
          onDecide={(k) => { void decide(k); }} onLead={(id) => s.setLeadId(id)} onTune={() => setTune(true)}
          onHow={(step) => setHow({ step })} onPassed={() => setPassedOpen(true)} onShare={() => {}} />
      )}
      <DvTune open={tune} onClose={() => setTune(false)} prefs={s.prefs} lens={s.lens} lenses={s.lenses} hasLocations={s.hasLocations}
        homeName={countryName(s.homeCountry) ?? null} genres={bookGenres(ms)} ageCategory={ms?.ageCategory ?? null} msTitle={ms?.title ?? null}
        onLens={(l) => { void s.setPref("lens", l); }} onSwitch={(k, v) => { void s.setPref(k, v); }}
        onManuscripts={() => { setTune(false); onNavigate("manuscripts"); }} />
      <DvPassedModal open={passedOpen} rows={s.passed} onBringBack={(id) => { void bringBack(id); }} onClose={() => setPassedOpen(false)} />
      <DvHowModal open={!!how} step={how?.step} onClose={() => setHow(null)} />
      <DvToast toast={toast} ms={TOAST_MS} onDone={() => setToast(null)} />
    </>
  );
};
