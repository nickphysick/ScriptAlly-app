/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phone app v5, Phase C — Housekeeping on the phone: the Contact list's own model and handlers, read once for Today's
 * Agents tab (List health) and the gap-filling sheet.
 *   - the model is lib/dashList `houseModel` (the Contact list's five facts per agent, `hkModel`, the writer's prefs);
 *   - List health is lib/contactHealth `listHealth` over that model (the drawer's points share and gap count);
 *   - every fix is the shared `useHkFixes` (the handlers lifted out of AgentList), so the phone writes nothing itself.
 * The book in scope is the shell's own (`resolveScopedManuscript` over the stored id), as on the Contact list.
 */
import { useMemo } from "react";
import { useV3Data } from "../v3/V3Provider";
import { houseModel } from "../../../lib/dashList";
import { listHealth } from "../../../lib/contactHealth";
import { contactPrefsOf } from "../../../lib/contactPrefs";
import { bookGenres } from "../../../lib/genreMatch";
import { resolveScopedManuscript } from "../../../lib/shellSidebar";
import type { HkBook } from "../../../lib/contactHousekeeping";
import { useHkFixes } from "../../agents/contact/useHkFixes";

export function usePhoneHk() {
  const v = useV3Data();
  const { agents, queries, manuscripts, currentUser, userTasks, updateUserPaths, addUserTask, deleteUserTask, resolveTaskFlag } = v.core.db;
  const ms = useMemo(() => {
    let stored: string | null = null;
    try { stored = window.localStorage.getItem("scriptally_active_manuscript_id"); } catch { /* storage refused */ }
    return resolveScopedManuscript(manuscripts, stored) ?? null;
  }, [manuscripts]);
  const today = useMemo(() => new Date(v.now), [v.now]);
  const model = useMemo(() => houseModel({
    agents, queries, qcRowsAll: v.qs.map((q) => q.row), userTasks, manuscript: ms, user: currentUser ?? null, now: today,
  }), [agents, queries, v.qs, userTasks, ms, currentUser, today]);
  const health = useMemo(() => (agents.length ? listHealth(agents, model) : null), [agents, model]);
  const prefs = useMemo(() => contactPrefsOf(currentUser, today), [currentUser, today]);
  const book: HkBook = useMemo(() => ({ title: ms?.title?.trim() || null, genre: ms?.genre?.trim() || null, genres: bookGenres(ms) }), [ms]);
  const fixes = useHkFixes({ agents, queries, currentUser, updateUserPaths, addUserTask, deleteUserTask, resolveTaskFlag, hkPrefs: prefs, hkToday: today, hkBook: book });
  return { model, health, book, today, fixes, agents };
}
