/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v25.2 C2 — THE AGENT FORM, as a hook: the draft, what changed, what is wrong, the duplicate, the
 * Also-changes dry run, the discard ask and the save. It is `AgentCardEditor`'s state, validation and save lifted out
 * whole, so the card's edit mode (in the Contact list's panel, the wide card and the app-level panel) and the new-agent
 * state share one copy of every rule.
 *
 * ⚠️ THE BASE IS FROZEN AT THE OPEN — what "changed" is measured against must not move because a snapshot of the same
 *    record arrived while the writer was typing.
 * ⚠️ A DIRTY LEAVE ASKS; a clean one leaves. Nothing is discarded in silence.
 */
import { useCallback, useMemo, useState } from "react";
import type { Agent } from "../../../types";
import { findDuplicateAgent } from "../../../lib/contactList";
import type { AlsoNote } from "../../../lib/contactEdit";
import { type CardDraft, changedFields, draftOf, emptyCardDraft, problemsOf } from "../../../lib/cardDraft";
import type { PersonalGenre } from "../../../lib/genres";

export type EditorSaveResult = { ok: true } | { ok: false; error: string };

export interface AgentFormOptions {
  mode: "edit" | "new";
  agent: Agent | null;
  /** answers carried over from elsewhere (Housekeeping) — applied, and marked dirty */
  prefill?: Partial<CardDraft>;
  personal: PersonalGenre[];
  agents: readonly Agent[];
  /** the real engine's dry run (decision 14) */
  alsoFor: (d: CardDraft, base: CardDraft) => AlsoNote[];
  onSave: (d: CardDraft, base: CardDraft) => Promise<EditorSaveResult>;
  /** a clean leave, or a confirmed discard */
  onLeave: () => void;
  /** a new agent starts in the UK, as the panel's add form always has */
  defaultCountry?: string;
}

export function useAgentForm(o: AgentFormOptions) {
  const { mode, agent, agents } = o;
  const [base] = useState<CardDraft>(() => (agent ? draftOf(agent, o.personal) : { ...emptyCardDraft(), ...(o.defaultCountry ? { country: o.defaultCountry } : {}) }));
  const [initial] = useState<CardDraft>(() => ({ ...base, ...(o.prefill ?? {}) }));
  const [d, setD] = useState<CardDraft>(initial);
  /* carried-over answers say so in the foot until the next edit */
  const [carried, setCarried] = useState(() => Object.keys(o.prefill ?? {}).length > 0);
  const [ask, setAsk] = useState(false);
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const set = useCallback((patch: Partial<CardDraft>) => {
    setD((prev) => ({ ...prev, ...patch }));
    setCarried(false);
    setFailure(null);
  }, []);

  const changed = useMemo(() => changedFields(base, d), [base, d]);
  const problems = useMemo(() => problemsOf(d), [d]);
  const firstProblem = (Object.values(problems)[0] as string | undefined) ?? null;
  const dirty = changed.length > 0;
  const alsoFor = o.alsoFor;
  const also = useMemo(() => (mode === "edit" && dirty ? alsoFor(d, base) : []), [mode, dirty, alsoFor, d, base]);
  const dup = useMemo(() => {
    const hit = findDuplicateAgent(d.name, agents);
    return hit && hit.id !== agent?.id ? hit : null;
  }, [d.name, agents, agent]);
  const canSave = !saving && !firstProblem && !dup && (mode === "new" || dirty);

  const onLeave = o.onLeave;
  const leave = useCallback(() => {
    if (saving) return;
    if (dirty) { setAsk(true); return; }
    onLeave();
  }, [saving, dirty, onLeave]);
  const discard = useCallback(() => { setAsk(false); onLeave(); }, [onLeave]);

  const onSave = o.onSave;
  const save = useCallback(async () => {
    if (!canSave) return;
    setSaving(true);
    const r = await onSave(d, base);
    setSaving(false);
    /* "in", not `!r.ok`: with strictNullChecks off a boolean discriminant does not narrow */
    if ("error" in r) setFailure(r.error);
  }, [canSave, onSave, d, base]);

  return { base, d, set, changed, problems, firstProblem, dirty, also, dup, canSave, saving, failure, carried, ask, setAsk, leave, discard, save };
}

export type AgentForm = ReturnType<typeof useAgentForm>;
