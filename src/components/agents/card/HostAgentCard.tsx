/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Add agent v1 Phase 5 — EVERY "EDIT AGENT" IN THE APP OPENS THE AGENT'S CARD. On every page but the Contact list (whose
 * own card edits in place), the app-level `AgentCardHost` hosts the Contact list's card — `AgentCard262` in its panel,
 * `AgentCardPanel262` — opened in edit mode at the section the door asked for. `AgentEditMode`'s long form is retired.
 *
 * The card's props are built from the same libraries the Contact list builds them from (`agentFacts`, `agentHistory`,
 * `storyBlocks`, `genreFit`, `colleaguesOf`, Housekeeping's `agentGaps`), and its one save is the editor's (`useAgentSave`,
 * through `commitCardSave`: the deadline fan-out, the data-quality flag, the reopen reminder, the snapshot Undo).
 *
 * `preview`: the add journey's finish screen draws the same face, read-only; its "Fill them in →", "+ Website" and the
 * section adds open THIS card in edit mode (the agent is saved by then), and its "Log a query" opens Logging new query.
 */
import React, { useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { db as firestoreDb } from "../../../lib/firebase";
import { useScriptAllyDb } from "../../../lib/db";
import type { Agent } from "../../../types";
import { resolveScopedManuscript } from "../../../lib/shellSidebar";
import { buildQcRows } from "../../../lib/qcSummary";
import { agentFacts, agentRows } from "../../../lib/contactList";
import { agentHistory } from "../../../lib/agentHistory";
import { heardWords, replyWeeksOf, storyBlocks } from "../../../lib/contactStory255";
import { colleaguesOf, genreFit } from "../../../lib/contactV24";
import { genreLabel } from "../../../lib/genres";
import { bookGenreHit, bookGenres } from "../../../lib/genreMatch";
import { alsoChanges, type EditCtx } from "../../../lib/contactEdit";
import { commitAgentEdits } from "../../../lib/saveAgentEdits";
import { draftOf, toContactDraft } from "../../../lib/cardDraft";
import { GAP_FOCUS, agentGaps } from "../../../lib/contactHousekeeping";
import { contactPrefsOf, itemKey } from "../../../lib/contactPrefs";
import { destroyManifest } from "../../../lib/cascade";
import { openQueryDrawer } from "../../../lib/queryActions/drawerStore";
import { closeAgentCard, openAgentCard, stepAgentCard, type AgentCardField, type AgentCardTab } from "../../../lib/agentCardStore";
import { useToast } from "../../toast/ToastProvider";
import { AgentCard262, type AgentCard262Props, type OpenAt } from "../contact/AgentCard262";
import { AgentCardPanel262, type CloseGuard } from "../contact/AgentCardPanel262";
import type { AgentCard24Props, CardEditKit } from "../contact/AgentCard24";
import { useEditOptions } from "./useEditOptions";
import { useAgentSave } from "./useAgentSave";
import { fitToast } from "./agentPills";

const ACTIVE_MS_KEY = "scriptally_active_manuscript_id";
const noop = () => {};

/** the card's props for one agent, from the page's own libraries */
export function useHostCardProps(agentId: string, o: { preview?: boolean; sequence?: string[] }) {
  const { agents, queries, manuscripts, activities, currentUser, taskFlags, userTasks, deleteAgent } = useScriptAllyDb();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const agent = agents.find((a) => a.id === agentId) ?? null;
  const scoped = useMemo(() => {
    let id: string | null = null;
    try { id = window.localStorage.getItem(ACTIVE_MS_KEY); } catch { id = null; }
    return resolveScopedManuscript(manuscripts, id);
  }, [manuscripts]);
  const personal = useMemo(() => currentUser?.personalGenres ?? [], [currentUser?.personalGenres]);
  const nowMs = useMemo(() => Date.now(), [queries, agents, activities]); // eslint-disable-line react-hooks/exhaustive-deps
  const qcRows = useMemo(() => buildQcRows(queries, agents, activities, nowMs), [queries, agents, activities, nowMs]);
  const editOpts = useEditOptions(scoped?.genre ?? null);
  const editCtx: EditCtx = useMemo(() => ({ queries, agents, msGenre: scoped?.genre ?? null, msTitle: scoped?.title ?? null, nowMs }), [queries, agents, scoped, nowMs]);
  const { saveDraft } = useAgentSave({ editCtx });
  const guard = useRef<CloseGuard | null>(null);
  const leave = useRef<(() => void) | null>(null);
  const write = useCallback(async (id: string, notes: string) => {
    if (!currentUser) return false;
    return (await commitAgentEdits(firestoreDb, currentUser.id, id, { notes })).ok;
  }, [currentUser]);
  const openEdit = useCallback((tab?: AgentCardTab, focus?: AgentCardField) => {
    openAgentCard(agentId, { tab: tab ?? "who", ...(focus ? { focus } : {}), host: "panel", from: "button" });
  }, [agentId]);

  const props = useMemo((): AgentCard262Props | null => {
    if (!agent) return null;
    const msId = scoped?.id ?? null;
    const x = agentFacts(agent, qcRows, msId);
    const all = agents.map((a) => (a.id === agent.id ? x : agentFacts(a, qcRows, msId)));
    const toAgent = queries.filter((q) => q.agentId === agent.id);
    const titleOf = (id: string) => manuscripts.find((m) => m.id === id)?.title?.trim() || "Untitled manuscript";
    const book = bookGenres(scoped);
    const hit = bookGenreHit(book);
    const word = (raw: string) => genreLabel(raw, personal);
    const rows = agentRows(qcRows, agent.id, null);
    /* Housekeeping's gaps for the agent (the "{n} details missing" line), and the first one's section */
    const prefs = contactPrefsOf(currentUser, new Date(nowMs));
    const hasReopenTask = (userTasks ?? []).some((t) => (t as { agentId?: string }).agentId === agent.id && !t.done && !!t.dueDate);
    const gaps = agentGaps(agent, { hasReopenTask }, prefs.settled).filter((g) => !prefs.later[itemKey(agent.id, g)]);
    const first = ((agent.name ?? "").trim().split(/\s+/)[0] || (agent.agency ?? "").trim() || "the agent");
    const seq = o.sequence ?? [];
    const at = seq.indexOf(agent.id);
    const edit: CardEditKit | undefined = o.preview ? undefined : {
      draft: draftOf(agent, personal),
      genre: { options: { ms: scoped?.genre ?? null, pool: editOpts.genrePool, personal: editOpts.personalLabels, all: [...editOpts.allGenres] }, isHit: hit, onNew: editOpts.onNewGenre },
      save: async (change) => {
        const base = draftOf(agent, personal);
        const r = await saveDraft(agent, base, { ...base, ...change }, { emit: false });
        if (!r.ok) { showToast({ message: `Couldn’t save that: ${(r as { error: string }).error}` }); return false; }
        const undo = r.undo;
        showToast({ message: change.rating !== undefined ? fitToast(change.rating) : `Saved to ${first}’s profile`, ...(undo ? { undo: async () => { await undo(); } } : {}) });
        return true;
      },
      renderEdit: () => null,
      request: null,
      form: {
        personal: editOpts.personal, agents, msGenre: scoped?.genre ?? null, genrePool: editOpts.genrePool, personalGenres: editOpts.personalLabels,
        allGenres: editOpts.allGenres, nowMs, onNewGenre: editOpts.onNewGenre,
        alsoFor: (d, base) => alsoChanges(agent, toContactDraft(agent, base, d), editCtx),
        onSave: async (d, base) => {
          const r = await saveDraft(agent, base, d, { emit: false });
          if (!r.ok) return { ok: false, error: (r as { error: string }).error };
          const undo = r.undo;
          showToast({ message: `Saved ${first}’s card`, ...(undo ? { undo: async () => { await undo(); } } : {}) });
          return { ok: true };
        },
        leaveRef: leave, closeGuardRef: guard, resumePick: noop,
      },
    };
    const base: AgentCard24Props = {
      x, all, nowMs, bookTitle: scoped?.title?.trim() || null, genreWord: word, genreHit: hit,
      queries: toAgent, titleOf, history: agentHistory({ agent, queries: toAgent, activities, notes: [], titleOf, nowMs }),
      index: at >= 0 ? at : 0, total: at >= 0 ? seq.length : 1,
      onStep: (dd) => { const n = seq[at + dd]; if (n) stepAgentCard(n); },
      onClose: o.preview ? noop : undefined,
      onJourney: (mode, queryId) => openQueryDrawer({ mode: mode as "resp", queryId }),
      onLog: () => openQueryDrawer({ mode: "log", agentId: agent.id, ...(msId ? { manuscriptId: msId } : {}) }),
      onEdit: openEdit,
      onOpenQuery: (queryId) => { closeAgentCard(); navigate(`/queries?q=${encodeURIComponent(queryId)}`); },
      onNotes: (text) => write(agent.id, text),
      fit: genreFit(agent.genres, book, scoped?.title ?? null, word),
      colleagues: colleaguesOf(x, all),
      onOpenAgent: (id) => openAgentCard(id, { tab: "who", host: "panel" }),
      deleteQueries: destroyManifest("agent", agent.id, { queries, activities, taskFlags }).queries,
      onDelete: () => { closeAgentCard(); void deleteAgent(agent.id); },
      edit,
      gaps: gaps.length ? { n: gaps.length, focus: GAP_FOCUS[gaps[0]].focus as AgentCardField, tab: GAP_FOCUS[gaps[0]].tab } : null,
      story: { blocks: storyBlocks(rows, toAgent, activities, (id) => titleOf(id) || null, replyWeeksOf(agent), nowMs), heard: heardWords(rows) },
    };
    return { ...base, preview: o.preview };
  }, [agent, agents, queries, manuscripts, activities, qcRows, scoped, personal, currentUser, userTasks, taskFlags, nowMs, editOpts, editCtx, saveDraft, showToast, write, openEdit, navigate, deleteAgent, o.preview, o.sequence]);
  return { props, guard };
}



/** the card in its panel, in edit mode at the door's section */
export const HostAgentCard: React.FC<{ agentId: string; openAt: OpenAt; sequence?: string[] }> = ({ agentId, openAt, sequence }) => {
  const { props, guard } = useHostCardProps(agentId, { sequence });
  if (!props) return null;
  return (
    <AgentCardPanel262 agentId={agentId} onClose={() => closeAgentCard()} guardRef={guard}>
      <AgentCard262 {...props} openAt={openAt} />
    </AgentCardPanel262>
  );
};

/** the finish screen's preview: the real face, read-only */
export const PreviewHostCard: React.FC<{ agent: Agent }> = ({ agent }) => {
  const { props } = useHostCardProps(agent.id, { preview: true });
  if (!props) return null;
  return <AgentCard262 {...props} />;
};
