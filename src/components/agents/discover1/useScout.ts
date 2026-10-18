/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * useScout — Discover v1's one source of state: the catalogue, the writer's list and book, their decisions, shares
 * and tuning, read through ONE store (`ScoutIO`), and every figure derived by `lib/scout`. Nothing on the page counts
 * for itself.
 *
 * ⚠️ THE BOOK IS THE SIDEBAR'S. `resolveScopedManuscript` over the shell's own storage key, re-read on every route
 *    visit (`useLocation().key`) — the page has no switcher of its own (decision 7).
 * ⚠️ "SKIP FOR NOW" AND "MAKE THIS ONE THE LEAD" ARE SESSION ORDER, NOT STORED. They reorder the derived queue and
 *    nothing else: a skipped agent goes to the back, a chosen one to the front, for as long as the page is open.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useScriptAllyDb } from "../../../lib/db";
import { resolveScopedManuscript } from "../../../lib/shellSidebar";
import { getHomeCountry } from "../../../lib/territory";
import { availableLenses, locationCoverage } from "../../../lib/discoverAgents";
import {
  discoverPrefs, passedList, pickQueue, scoutTally, yourPart, type ScoutDecision, type ScoutInput, type ScoutPick,
} from "../../../lib/scout";
import { firestoreIO, type ScoutIO } from "../../../lib/scoutStore";
import type { Agent, CommunityAgent, Manuscript } from "../../../types";

const ACTIVE_MS_KEY = "scriptally_active_manuscript_id";

export type ScoutView = "live" | "done" | "none";

export interface Fixture { catalogue: CommunityAgent[]; agents: Agent[]; manuscript: Manuscript; decisions: ScoutDecision[] }

/** Apply the session's order to the derived queue: chosen lead first, skipped to the back in skip order. */
export function sessionOrder(queue: readonly ScoutPick[], skipped: readonly string[], leadId: string | null): ScoutPick[] {
  const byId = new Map(queue.map((p) => [p.agent.id, p]));
  const back = skipped.filter((id) => byId.has(id));
  const backSet = new Set(back);
  const front = queue.filter((p) => !backSet.has(p.agent.id));
  const out = [...front, ...back.map((id) => byId.get(id)!)];
  if (leadId && byId.has(leadId)) {
    const i = out.findIndex((p) => p.agent.id === leadId);
    if (i > 0) out.unshift(...out.splice(i, 1));
  }
  return out;
}

export function useScout(opts: { fixture: Fixture | null; memory: ScoutIO | null; holdMs?: number }) {
  const db = useScriptAllyDb();
  const { key: locationKey } = useLocation();
  const fx = opts.fixture;

  const catalogue = fx ? fx.catalogue : db.communityAgents;
  const agents = fx ? fx.agents : db.agents;
  const manuscript: Manuscript | null = useMemo(() => {
    if (fx) return fx.manuscript;
    let id: string | null = null;
    try { id = window.localStorage.getItem(ACTIVE_MS_KEY); } catch { id = null; }
    return resolveScopedManuscript(db.manuscripts, id) ?? null;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the key is the sidebar switch's signal
  }, [fx, db.manuscripts, locationKey]);

  const uid = db.currentUser?.id ?? null;
  const io: ScoutIO | null = useMemo(
    () => opts.memory ?? (uid ? firestoreIO(uid, db.addAgent, db.updateUserPaths) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the store is per writer; its functions are stable enough
    [opts.memory, uid],
  );

  const [decisions, setDecisions] = useState<ScoutDecision[]>(fx ? fx.decisions : []);
  const [shared, setShared] = useState<Set<string>>(new Set());
  const [decisionsReady, setDecisionsReady] = useState(false);
  useEffect(() => {
    if (!io) return;
    setDecisionsReady(false);
    return io.subscribe((d) => { setDecisions(d); setDecisionsReady(true); }, setShared);
  }, [io]);

  /* the tuning: stored by leaf on the user doc; the fixture holds it locally so a review never writes */
  const [localPrefs, setLocalPrefs] = useState<unknown>(undefined);
  const prefs = discoverPrefs(fx ? localPrefs : db.currentUser?.discoverPrefs);
  const setPref = async <K extends keyof typeof prefs>(k: K, v: (typeof prefs)[K]) => {
    if (fx) { setLocalPrefs({ ...prefs, [k]: v }); return; }
    await io?.setPrefs({ [`discoverPrefs.${String(k)}`]: v });
  };

  const homeCountry = getHomeCountry(db.currentUser);
  const nowMs = useMemo(() => Date.now(), [decisions]); // one clock per derivation pass
  const input: ScoutInput = { catalogue, agents, manuscript, decisions, prefs, nowMs, homeCountry };

  const derived = useMemo(() => pickQueue(input),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [catalogue, agents, manuscript, decisions, prefs.lens, prefs.openOnly, prefs.notOnList, prefs.ukIreland, nowMs, homeCountry]);
  const tally = useMemo(() => scoutTally(input, derived),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [derived, decisions, catalogue, manuscript, nowMs]);
  const passed = useMemo(() => passedList(decisions, catalogue, nowMs), [decisions, catalogue, nowMs]);
  const part = useMemo(() => yourPart(catalogue, agents, shared), [catalogue, agents, shared]);
  const lenses = useMemo(() => availableLenses(catalogue), [catalogue]);
  const hasLocations = useMemo(() => locationCoverage(catalogue) > 0, [catalogue]);

  /* the session's order */
  const [skipped, setSkipped] = useState<string[]>([]);
  const [leadId, setLeadId] = useState<string | null>(null);
  const queue = useMemo(() => sessionOrder(derived, skipped, leadId), [derived, skipped, leadId]);
  /* decisions made on this visit — the "Pick 2 of 6" counter's first term */
  const [decidedHere, setDecidedHere] = useState(0);
  const firstLen = useRef<number | null>(null);
  if (firstLen.current === null && decisionsReady) firstLen.current = derived.length;

  /* the dev review aid's hold (0 in production — the page passes it only from behind its mode gate) */
  const [held, setHeld] = useState(() => (opts.holdMs ?? 0) > 0);
  useEffect(() => {
    if (!held) return;
    const t = setTimeout(() => setHeld(false), opts.holdMs);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const loading = held || (fx ? false : !(db.collectionsReady && (db.communityAgentsReady ?? true) && decisionsReady));
  const view: ScoutView = queue.length > 0 ? "live" : tally.decided > 0 ? "done" : "none";

  return {
    io, uid, loading, view, manuscript, catalogue, agents, decisions, shared, prefs, setPref, lenses, hasLocations, homeCountry,
    queue, derived, tally, passed, part, decidedHere, setDecidedHere, skipped, setSkipped, setLeadId,
  };
}

export type Scout = ReturnType<typeof useScout>;
