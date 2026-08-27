/**
 * ⚠️ THE PORTION THAT WENT (Part B, D5–D8) — DERIVED FROM `materialsWanted`, NEVER A SECOND FIELD.
 *
 * A package is a covering letter, a synopsis and a version. What portion of the manuscript actually
 * went is the agency's decision, so it belongs to the QUERY — and the query already records it.
 * `Query.materialsWanted` is described in `Queries.tsx` in as many words as "the record of what was
 * sent": it pre-fills from the agent's stated set, stores nothing until edited, holds free text
 * through `QueryMaterial{ type: "other" }`, has one writer, an allowlist entry and an undo.
 *
 * A second stored field would have been two answers to one question, one allowlist entry apart —
 * the shape the retired `attachPackage` path already cost this surface once, whose own note records
 * that its second model "contributed to no scorecard at all".
 *
 * ⚠️ THE PORTION IS THE SAMPLE-AND-OTHER MEMBERS, and the split comes from `classifyQueryMaterial`
 * rather than from a list here. The letter and the synopsis are stated by the PACKAGE now, so on a
 * packaged send those members are vestigial; a loose query still uses all of them, unchanged.
 *
 * ⚠️ AND `recorded` IS THE WHOLE HONESTY OF THIS MODULE (D6). When the query holds nothing, the
 * agent's stated requirement is shown as a stand-in — the pattern `baseMaterialsFor` already
 * follows — but that is what they ASKED FOR, not what went. Rendering it as a record would be the
 * app stating something the writer never said, and D6 forbids it becoming a claim. `recorded` is
 * true ONLY when the text came from the query's own `materialsWanted`, so a caller cannot present
 * an expectation as a fact without ignoring a field it had to read.
 */
import { Agent, Query, QueryMaterial } from "../types";
import { classifyQueryMaterial } from "./agentMaterials";
import { formatQueryMaterial } from "./materials";

/** What a caller renders. `text` is null when nothing at all is known — D6's "not recorded". */
export interface QueryPortion {
  text: string | null;
  /** True only when this came from the QUERY. False = the agent's stated requirement, shown as a stand-in. */
  recorded: boolean;
}

/** The wording for a portion nobody has stated. Never stored — the absence is the record. */
export const PORTION_UNRECORDED = "Not recorded";

/**
 * ⚠️ THE SAME PRECEDENCE `baseMaterialsFor` USES, and deliberately not a second one: the query's own
 * list wins whole, and the agent's is consulted only when the query holds nothing. Merging the two
 * would invent a set neither of them states.
 */
const isPortionMember = (m: string | QueryMaterial): boolean => {
  const k = classifyQueryMaterial(m);
  return k === "sample" || k === "other";
};

export const queryPortion = (
  q: Pick<Query, "materialsWanted">,
  agent: Pick<Agent, "materialsWanted"> | null | undefined,
): QueryPortion => {
  const own = Array.isArray(q.materialsWanted) ? q.materialsWanted : [];
  const fromQuery = own.length > 0;
  const source: (string | QueryMaterial)[] = fromQuery
    ? own
    : (agent && Array.isArray(agent.materialsWanted) ? agent.materialsWanted : []);

  const parts = source.filter(isPortionMember).map(formatQueryMaterial).filter((t) => t.trim());
  /**
   * ⚠️ AN EMPTY PORTION IS `null` EVEN WHEN THE QUERY HOLDS MATERIALS. A query recording a letter
   * and a synopsis and nothing else has stated no portion — the honest answer is "not recorded",
   * not an empty string rendered as though something were there.
   */
  if (parts.length === 0) return { text: null, recorded: false };
  return { text: parts.join(" · "), recorded: fromQuery };
};

/**
 * The free-text edit, as a WRITE-BACK onto `materialsWanted` — the existing single writer's shape.
 *
 * ⚠️ IT REPLACES THE PORTION MEMBERS AND LEAVES THE REST ALONE. The letter and synopsis members are
 * not this control's business: on a packaged send the package states them, and on a loose one the
 * writer manages them through the material chips. Rewriting the whole list here would make one
 * control the owner of facts it does not show.
 *
 * ⚠️ AND IT WRITES ONE `type: "other"` MEMBER, because the field is free text. "first 3 chapters +
 * 1-page pitch" is a real ask and no unit-and-quantity pair can hold it; `QueryMaterial` already
 * models exactly this, which is why no new shape was needed.
 *
 * ⚠️ EMPTY CLEARS THE PORTION RATHER THAN STORING `""`. An empty string would be a stated portion
 * of nothing; removing the members returns the query to "not recorded", which is the truth.
 */
export const withPortion = (
  existing: readonly (string | QueryMaterial)[] | undefined,
  text: string,
): (string | QueryMaterial)[] => {
  const kept = (existing ?? []).filter((m) => !isPortionMember(m));
  const t = text.trim();
  return t ? [...kept, { material: "Sample Pages", type: "other", quantity: t }] : kept;
};
