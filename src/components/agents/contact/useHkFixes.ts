/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Housekeeping's fix handlers — ONE place, called by the Contact list (`AgentList`, for its drawer) and by the phone's
 * gap-filling sheet (Phone app v5, `GapsSheetV5`). Lifted verbatim out of `AgentList` (Nick, 12 Nov): the same
 * callbacks, the same writes in the same order, the same Undo. Nothing here decides a gap; the drawer and the sheet
 * only call these.
 *
 * ── Housekeeping's fixes — THE CARD'S SAVE PATH (lib/agentCardSave), never `updateAgent`:
 *    the snapshot first, the reply-time deadline fan-out in the same batch, the data-quality flag, and
 *    a snapshot Undo. In the lab the card's sandbox writer stands in, with the inverse patch as Undo.
 */
import { useCallback } from "react";
import type { Agent } from "../../../types";
import type { useScriptAllyDb } from "../../../lib/db";
import { savedLine, type HkBook, type HkItem } from "../../../lib/contactHousekeeping";
import { laterPath, settledPath, settledRestorePath, showAllPath, type ContactPrefs } from "../../../lib/contactPrefs";
import { applyPatch, cardPatch, draftOf, inversePatch, type CardDraft } from "../../../lib/cardDraft";
import { commitCardSave } from "../../../lib/agentCardSave";
import type { AgentEditPatch, SaveAgentResult } from "../../../lib/saveAgentEdits";
import { commitAgentEdits } from "../../../lib/saveAgentEdits";
import { db as firestoreDb } from "../../../lib/firebase";
import { fitsGenre } from "../../../lib/contactStrip";
import type { FixResult, HkFix } from "./ContactHousekeeping";

type Db = ReturnType<typeof useScriptAllyDb>;

export interface HkFixesInput {
  agents: Db["agents"];
  queries: Db["queries"];
  currentUser: Db["currentUser"];
  updateUserPaths: Db["updateUserPaths"];
  addUserTask: Db["addUserTask"];
  deleteUserTask: Db["deleteUserTask"];
  resolveTaskFlag: Db["resolveTaskFlag"];
  /** the writer's Housekeeping prefs (`contactPrefsOf(currentUser, hkToday)`) */
  hkPrefs: ContactPrefs;
  hkToday: Date;
  hkBook: HkBook;
  /** the dev lab's own writer (Agent card v1's sandbox) — the fixes write through it there */
  sandbox?: { writeAgent?: (agentId: string, patch: AgentEditPatch) => Promise<SaveAgentResult> };
}

export function useHkFixes(i: HkFixesInput) {
  const { agents, queries, currentUser, updateUserPaths, addUserTask, deleteUserTask, resolveTaskFlag, hkPrefs, hkToday, hkBook, sandbox } = i;
  const personalGenres = currentUser?.personalGenres ?? [];
  const writeFix = useCallback(async (agent: Agent, patch: AgentEditPatch): Promise<FixResult | { ok: true; undo?: () => Promise<boolean> }> => {
    if (Object.keys(patch).length === 0) return { ok: false, error: "Nothing to save." };
    if (sandbox?.writeAgent) {
      const write = sandbox.writeAgent;
      const before = { ...agent } as Agent;
      const r = await write(agent.id, patch);
      if ("error" in r) return { ok: false, error: r.error };
      return { ok: true, undo: async () => !("error" in (await write(before.id, inversePatch(before, patch)))) };
    }
    if (!currentUser) return { ok: false, error: "Not signed in." };
    const out = await commitCardSave({ uid: currentUser.id, agent, queries, patch, resolveTaskFlag });
    if ("error" in out.res) return { ok: false, error: out.res.error };
    return { ok: true, undo: out.undo };
  }, [sandbox, currentUser, queries, resolveTaskFlag]);

  const onHkFix = useCallback(async (item: HkItem, fix: HkFix): Promise<FixResult> => {
    const agent = agents.find((a) => a.id === item.agent.id) ?? item.agent;
    if (fix.kind === "settled") {
      const before = hkPrefs.settled;
      try { await updateUserPaths(settledPath(hkPrefs, agent.id)); } catch (e) { return { ok: false, error: (e as Error).message || "the setting did not save" }; }
      return { ok: true, line: savedLine(item, { settled: true }), undo: async () => { try { await updateUserPaths(settledRestorePath(before)); return true; } catch { return false; } } };
    }
    if (fix.kind === "remind") {
      const name = (agent.name ?? "").trim() || (agent.agency ?? "").trim();
      let id: string | undefined;
      try { id = await addUserTask({ agentId: agent.id, dueDate: fix.on, text: `Check ${name} has reopened to queries` }); } catch (e) { return { ok: false, error: (e as Error).message || "the reminder did not save" }; }
      return { ok: true, line: savedLine(item, { remindOn: fix.on }), undo: id ? async () => { try { await deleteUserTask(id!); return true; } catch { return false; } } : undefined };
    }
    const base = draftOf(agent, personalGenres);
    const change: Partial<CardDraft> = fix.kind === "weeks" ? { weeks: fix.weeks }
      : fix.kind === "mats" ? { mats: fix.mats } : fix.kind === "genres" ? { genres: fix.genres }
      : fix.kind === "agency" ? { agency: fix.agency, agencyUnknown: false } : { wishlist: fix.text };
    const patch = cardPatch(agent, base, { ...base, ...change }, new Date().toISOString());
    const r = await writeFix(agent, patch);
    if ("error" in r) return r;
    const after = applyPatch(agent, patch);
    return {
      ok: true,
      line: savedLine(item, { weeks: fix.kind === "weeks" ? fix.weeks : undefined, genres: fix.kind === "genres" ? fix.genres : undefined, fitsAfter: fitsGenre(after, hkBook.genres), book: hkBook }),
      undo: r.undo,
    };
  }, [agents, hkPrefs, updateUserPaths, addUserTask, deleteUserTask, personalGenres, writeFix, hkBook]);

  const onWishlistStill = useCallback(async (agentId: string) => {
    const agent = agents.find((a) => a.id === agentId);
    if (!agent) return;
    const patch: AgentEditPatch = { mswlCheckedAt: new Date().toISOString() };
    if (sandbox?.writeAgent) { await sandbox.writeAgent(agentId, patch); return; }
    if (!currentUser) return;
    await commitAgentEdits(firestoreDb, currentUser.id, agentId, patch);
  }, [agents, sandbox, currentUser]);

  /* the drawer's "Later" and "Show all" — plain closures, as they were inline in AgentList's JSX */
  const onLater = async (item: HkItem) => { await updateUserPaths(laterPath(item.agent.id, item.gap, hkToday)); };
  const onShowAll = async () => { await updateUserPaths(showAllPath()); };

  return { writeFix, onHkFix, onLater, onShowAll, onWishlistStill };
}
