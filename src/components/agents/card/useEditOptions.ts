/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v25.2 C — the lists the agent editors offer, shared by every shape: the genres already on the writer's
 * list (most used first, as LABELS, so a stored id is never offered as a choice), the writer's own genres, the app's
 * list, and the rule for a typed genre matching nothing — matched in case to one that exists (`commitTypedGenre`), and
 * only a genuinely new one becoming the writer's own (`addPersonalGenre`, which keeps the cap and refuses junk).
 * Lifted from the agent card host so the Contact list's card edits through the same lists.
 */
import { useCallback, useMemo } from "react";
import { useScriptAllyDb } from "../../../lib/db";
import { AGENT_GENRES } from "../../../lib/agentOptions";
import { genreLabel } from "../../../lib/genres";
import { commitTypedGenre } from "../../../lib/quickAdd";

export function useEditOptions(msGenre: string | null) {
  const { agents, currentUser, addPersonalGenre } = useScriptAllyDb();
  const personal = useMemo(() => currentUser?.personalGenres ?? [], [currentUser?.personalGenres]);
  const personalLabels = useMemo(() => personal.map((p) => p.label), [personal]);
  const genrePool = useMemo(() => {
    const freq = new Map<string, number>();
    for (const a of agents) for (const g of a.genres ?? []) {
      const l = genreLabel(g, personal);
      freq.set(l, (freq.get(l) ?? 0) + 1);
    }
    return [...freq.entries()].sort((x, y) => y[1] - x[1]).map(([g]) => g);
  }, [agents, personal]);
  const onNewGenre = useCallback(async (typed: string) => {
    const sources = [...(msGenre ? [msGenre] : []), ...genrePool, ...personalLabels, ...AGENT_GENRES];
    const label = commitTypedGenre(typed, [], sources)?.[0];
    if (!label) return { ok: false as const, reason: "Type a genre first." };
    if (sources.some((s) => s.toLowerCase() === label.toLowerCase())) return { ok: true as const, label };
    const r = await addPersonalGenre(label);
    if (!r) return { ok: false as const, reason: "Couldn’t add that genre just now." };
    return "reason" in r ? { ok: false as const, reason: r.reason } : { ok: true as const, label: r.label };
  }, [msGenre, genrePool, personalLabels, addPersonalGenre]);
  return { personal, personalLabels, genrePool, allGenres: AGENT_GENRES, onNewGenre };
}
