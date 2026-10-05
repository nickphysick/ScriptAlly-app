/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The agent card's EDITOR draft (Agent card v1 §4–5; ref design-refs/agent-card-housekeeping-v7.html,
 * Journeys "Edit: the card widens into tabs" → "Leave with changes"). One draft spans the four tabs
 * and one Save writes it; this module is everything about that draft that is not drawing it — how
 * it is read off a record, what counts as a change, what is wrong with it, and the patch a save
 * sends.
 *
 * ⚠️ NOTHING IS FREE-TYPED WHERE THE APP KEEPS A LIST (decision 3). The draft therefore holds the
 * list's VALUES — an ISO country, a `SubmissionMethod`, genre labels, a materials structure — and
 * the patch is built from them, never from text a writer typed into a list.
 *
 * ⚠️ THE PATCH CARRIES ONLY WHAT CHANGED, and three fields carry extra care:
 *   · `socials`: the MSWL link lives there as `{ platform: "MSWL", handle }` (§5). Saving rewrites
 *     that ONE entry; every other entry stays, in its place, byte for byte.
 *   · `submissionMethod`: a stored legacy spelling ("QueryManager", "Agency form") reads as its
 *     enum value and "Other" reads as nothing chosen (ruling 2) — and the field is written ONLY
 *     when the writer chose a method, so a legacy value is never rewritten by an unrelated save.
 *   · reply time and "no reply means no" start at their unstated ORIGIN and have no road back to
 *     it (decision 9): the patch never writes either back to absence.
 */
import { Agent, AgentSocial, SubmissionMethod, SubmissionStatus } from "../types";
import {
  MATERIAL_ROW_NAMES, materialRowsFromAgent, materialsWantedFromRows, type MaterialRow, type SampleUnit, UNIT_CFG,
} from "./agentMaterials";
import { genreLabel, type PersonalGenre } from "./genres";
import { normaliseCountry } from "./territory";
import { hrefFor } from "./quickAdd";
import { isDoorOpen } from "./agentList";
import type { AgentEditPatch } from "./saveAgentEdits";
import { draftFromAgentRecord, type ContactDraft } from "./contactEdit";

export type CardTab = "who" | "want" | "work" | "notes";

/** The four material rows, as the editor holds them (§5). */
export interface CardMats {
  ql: boolean;
  /** `len` is pages, 1–10; null reads "Any length" */
  syn: { on: boolean; len: number | null };
  smp: { on: boolean; unit: SampleUnit; qty: number };
  /** capped at 40 when typed; a longer stored value is kept as it is (ruling 8) */
  oth: { on: boolean; text: string };
}

export interface CardDraft {
  name: string;
  agency: string;
  /** an ISO code, or "" for none */
  country: string;
  city: string;
  email: string;
  website: string;
  mswl: string;
  /** labels (ruling 1) */
  genres: string[];
  wishlist: string;
  mats: CardMats;
  /** null is "Unknown" — the origin; a stored stub 0 reads as it */
  weeks: number | null;
  /** null is "Not stated yet" — the origin */
  nrn: boolean | null;
  /** null is nothing chosen — no stored method, or a stored "Other" */
  method: SubmissionMethod | null;
  door: "open" | "closed";
  /** an ISO date, or "" — not announced */
  reopens: string;
}

/** Every field the editor edits, by the tab it lives on. */
export const TAB_FIELDS: Record<Exclude<CardTab, "notes">, (keyof CardDraft)[]> = {
  who: ["name", "agency", "country", "city", "email", "website", "mswl"],
  want: ["genres", "wishlist", "mats"],
  work: ["weeks", "nrn", "method", "door", "reopens"],
};
export const tabOf = (k: keyof CardDraft): Exclude<CardTab, "notes"> =>
  (Object.keys(TAB_FIELDS) as Exclude<CardTab, "notes">[]).find((t) => TAB_FIELDS[t].includes(k))!;

/* ── reading a record ────────────────────────────────────────────────────────────────────── */

/** The enum value a stored method means (ruling 2) — null for "Other", nothing, or anything else. */
export function methodOf(stored: string | undefined | null): SubmissionMethod | null {
  const v = (stored ?? "").trim().toLowerCase().replace(/\s+/g, "");
  if (v === "email") return SubmissionMethod.EMAIL;
  if (v === "querymanager") return SubmissionMethod.QUERY_MANAGER;
  if (v === "onlineform" || v === "agencyform") return SubmissionMethod.ONLINE_FORM;
  if (v === "post") return SubmissionMethod.POST;
  return null;
}

const isMswl = (s: AgentSocial | undefined) => (s?.platform ?? "").trim().toLowerCase() === "mswl";

/** The four rows, from the one parser. Legacy records holding two sample units keep the first. */
export function matsOf(materialsWanted: readonly string[] | undefined): CardMats {
  const rows = materialRowsFromAgent(materialsWanted);
  const syn = rows.find((r) => r.key === "synopsis") as Extract<MaterialRow, { key: "synopsis" }>;
  const smp = rows.find((r) => r.key === "sample") as Extract<MaterialRow, { key: "sample" }>;
  const oth = rows.find((r) => r.key === "other") as Extract<MaterialRow, { key: "other" }>;
  const len = parseInt(syn.pages, 10);
  const qty = parseInt(smp.amount, 10);
  return {
    ql: rows.some((r) => r.key === "queryLetter" && r.on),
    syn: { on: syn.on, len: Number.isFinite(len) && len > 0 ? Math.min(10, len) : null },
    smp: { on: smp.on, unit: smp.unit, qty: Number.isFinite(qty) && qty > 0 ? qty : UNIT_CFG[smp.unit].def },
    oth: { on: oth.on, text: oth.text },
  };
}

/** The draft a record opens as. Stored genre ids read as their labels (ruling 1). */
export function draftOf(a: Agent, personal: PersonalGenre[] = []): CardDraft {
  const w = a.responseTimeWeeks;
  return {
    name: a.name ?? "",
    agency: a.agency ?? "",
    country: normaliseCountry(a.country) ?? "",
    city: a.city ?? "",
    email: a.email ?? "",
    website: a.website ?? "",
    mswl: (a.socials ?? []).find(isMswl)?.handle ?? "",
    genres: (a.genres ?? []).map((g) => genreLabel(g, personal)),
    wishlist: a.mswlNotes ?? "",
    mats: matsOf(a.materialsWanted as string[] | undefined),
    weeks: typeof w === "number" && w > 0 ? w : null,
    nrn: typeof a.noResponseMeansNo === "boolean" ? a.noResponseMeansNo : null,
    method: methodOf(a.submissionMethod),
    door: isDoorOpen(a) ? "open" : "closed",
    reopens: (a.reopensOn ?? "").trim(),
  };
}

/**
 * A new agent's draft: NOTHING pre-answered. ⚠️ The mock opens its add card with three materials
 * ticked, the UK chosen and Email selected; those are facts about an agency nobody has stated yet,
 * and a born agent OMITS what the writer did not say (the v11 law, and the house's rule against a
 * value invented to fill a hole). The sample row keeps its unit's default amount, ready for the
 * tick. (Email is still what the create writes when no method is chosen, as every creator does.)
 */
export function emptyCardDraft(): CardDraft {
  return {
    name: "", agency: "", country: "", city: "", email: "", website: "", mswl: "",
    genres: [], wishlist: "",
    mats: { ql: false, syn: { on: false, len: null }, smp: { on: false, unit: "Chapters", qty: UNIT_CFG.Chapters.def }, oth: { on: false, text: "" } },
    weeks: null, nrn: null, method: null, door: "open", reopens: "",
  };
}

/* ── the materials, back to storage ──────────────────────────────────────────────────────── */

/** Encoded through the one encoder (`materialsWantedFromRows` → `buildAgentMaterials`). */
export function encodeMats(m: CardMats): string[] {
  const rows: MaterialRow[] = [
    { key: "queryLetter", kind: "binary", name: MATERIAL_ROW_NAMES.queryLetter, on: m.ql },
    { key: "synopsis", kind: "binary", name: MATERIAL_ROW_NAMES.synopsis, on: m.syn.on, pages: m.syn.len ? String(m.syn.len) : "" },
    { key: "sample", kind: "qty", name: MATERIAL_ROW_NAMES.sample, on: m.smp.on, unit: m.smp.unit, amount: String(m.smp.qty) },
    { key: "other", kind: "text", name: MATERIAL_ROW_NAMES.other, on: m.oth.on, text: m.oth.text },
  ];
  return materialsWantedFromRows(rows);
}

/* ── what changed ────────────────────────────────────────────────────────────────────────── */

const norm = (k: keyof CardDraft, v: CardDraft[keyof CardDraft]): string => {
  if (k === "mats") return JSON.stringify(encodeMats(v as CardMats));
  if (typeof v === "string") return v.trim();
  return JSON.stringify(v);
};

/** The fields that differ from the record — what the tab dots and the foot count. */
export function changedFields(base: CardDraft, d: CardDraft): (keyof CardDraft)[] {
  return (Object.values(TAB_FIELDS).flat()).filter((k) => norm(k, base[k]) !== norm(k, d[k]));
}

/** The tabs whose fields differ — what a save pulses afterwards (lib/agentCard `savedPulse`). */
export function changedTabs(base: CardDraft, d: CardDraft): Exclude<CardTab, "notes">[] {
  const ch = new Set(changedFields(base, d));
  return (Object.keys(TAB_FIELDS) as Exclude<CardTab, "notes">[]).filter((t) => TAB_FIELDS[t].some((f) => ch.has(f)));
}

/* ── what is wrong ───────────────────────────────────────────────────────────────────────── */

/** Is this a link the card can store? Blank is fine; a word with a space is not. */
export function linkOk(v: string): boolean {
  const t = v.trim();
  if (!t) return true;
  if (/\s/.test(t)) return false;
  try {
    const u = new URL(/^https?:\/\//i.test(t) ? t : `https://${t}`);
    return /^https?:$/.test(u.protocol) && /\.[a-z]{2,}$/i.test(u.hostname);
  } catch {
    return false;
  }
}
/** The domain a valid link shows ("✓ agency.co.uk"). */
export function hostOf(v: string): string {
  try {
    const t = v.trim();
    return new URL(/^https?:\/\//i.test(t) ? t : `https://${t}`).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}
export const emailOk = (v: string): boolean => !v.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());

export type CardProblemKey = "name" | "email" | "website" | "mswl" | "oth";
/** The draft's problems, in the order the foot names the first. Save waits on any of them. */
export function problemsOf(d: CardDraft): Partial<Record<CardProblemKey, string>> {
  const p: Partial<Record<CardProblemKey, string>> = {};
  if (!d.name.trim() && !d.agency.trim()) p.name = "A name or an agency is needed";
  if (!emailOk(d.email)) p.email = "That isn’t an email address yet";
  if (!linkOk(d.website)) p.website = "That doesn’t look like a link";
  if (!linkOk(d.mswl)) p.mswl = "That doesn’t look like a link";
  if (d.mats.oth.on && !d.mats.oth.text.trim()) p.oth = "Say what the other material is, or untick it";
  return p;
}
export const PROBLEM_TAB: Record<CardProblemKey, Exclude<CardTab, "notes">> = {
  name: "who", email: "who", website: "who", mswl: "who", oth: "want",
};

/* ── the patch a save sends ──────────────────────────────────────────────────────────────── */

/** `socials` with the MSWL entry set to `url` (or removed) — every other entry kept, in place. */
export function socialsWithMswl(socials: readonly AgentSocial[] | undefined, url: string): AgentSocial[] {
  const list = [...(socials ?? [])];
  const at = list.findIndex(isMswl);
  /* stored through the shared href builder (§5), the one the quick view renders through */
  const handle = hrefFor(url) ?? "";
  if (at >= 0) {
    if (handle) list[at] = { ...list[at], handle };
    else list.splice(at, 1);
  } else if (handle) list.push({ platform: "MSWL", handle });
  return list;
}

/**
 * The write for this draft against the record it opened from: ONLY the changed fields. `nowIso`
 * stamps `mswlCheckedAt` when the wishlist changed — editing it IS checking it.
 */
export function cardPatch(a: Agent, base: CardDraft, d: CardDraft, nowIso: string): AgentEditPatch {
  const changed = new Set(changedFields(base, d));
  const patch: AgentEditPatch = {};
  const text = (k: "name" | "agency" | "email" | "website") => { if (changed.has(k)) patch[k] = d[k].trim(); };
  text("name"); text("agency"); text("email");
  if (changed.has("website")) patch.website = hrefFor(d.website) ?? "";
  /* the location law: "not set" is the key OMITTED, never "" */
  if (changed.has("city")) patch.city = d.city.trim() || null;
  if (changed.has("country")) patch.country = d.country || null;
  if (changed.has("mswl")) patch.socials = socialsWithMswl(a.socials, d.mswl);
  if (changed.has("genres")) patch.genres = [...d.genres];
  if (changed.has("wishlist")) {
    patch.mswlNotes = d.wishlist.trim();
    patch.mswlCheckedAt = nowIso;
  }
  if (changed.has("mats")) patch.materialsWanted = encodeMats(d.mats);
  /* decision 9: no road back to the origin — a change only ever writes a value */
  if (changed.has("weeks") && d.weeks != null) patch.responseTimeWeeks = d.weeks;
  if (changed.has("nrn") && d.nrn != null) patch.noResponseMeansNo = d.nrn;
  /* ruling 2: written only when the writer chose one */
  if (changed.has("method") && d.method != null) patch.submissionMethod = d.method;
  if (changed.has("door")) patch.submissionStatus = d.door === "open" ? SubmissionStatus.OPEN : SubmissionStatus.CLOSED;
  const stored = (a.reopensOn ?? "").trim();
  if (d.door === "open") {
    /* choosing Open clears the reopening date (§5) — choosing it, not merely being open */
    if (changed.has("door") && stored) patch.reopensOn = null;
  } else if ((changed.has("reopens") || changed.has("door")) && d.reopens !== stored) {
    patch.reopensOn = d.reopens || null;
  }
  return patch;
}

/** The record as it stands after a patch — `null` is a field removed (the sanitiser's deletes). */
export function applyPatch(a: Agent, patch: AgentEditPatch): Agent {
  const next = { ...a } as Record<string, unknown>;
  for (const [k, v] of Object.entries(patch)) {
    if (v === null) delete next[k];
    else if (v !== undefined) next[k] = v;
  }
  return next as unknown as Agent;
}

/**
 * The write that puts a patch's fields back as they were: each key the patch touched takes the
 * record's earlier value, and a key the record did not have is removed (`null`). ⚠️ THE ACCOUNT'S
 * UNDO IS A SNAPSHOT (lib/agentCardSnapshot — it also restores the deadlines and the task flag a
 * save moves); this is the LAB's, whose writer is its own cast and has nothing else to restore.
 */
/* fields the rules require on every agent: an absent one goes back as its empty form, never null */
const REQUIRED_EMPTY: Record<string, unknown> = { name: "", agency: "", email: "", website: "", mswlNotes: "", genres: [], materialsWanted: [] };
export function inversePatch(before: Agent, patch: AgentEditPatch): AgentEditPatch {
  const was = before as unknown as Record<string, unknown>;
  const inv: Record<string, unknown> = {};
  for (const k of Object.keys(patch)) {
    if ((patch as Record<string, unknown>)[k] === undefined) continue;
    if (was[k] !== undefined) inv[k] = was[k];
    else if (k in REQUIRED_EMPTY) inv[k] = REQUIRED_EMPTY[k];
    else inv[k] = null;
  }
  return inv as AgentEditPatch;
}

/* ── the lists the inputs offer ──────────────────────────────────────────────────────────── */

/** An agency's key for "the same agency": trimmed, case-folded, a leading "The" ignored (§10). */
export const agencyKey = (s: string | undefined | null): string =>
  (s ?? "").trim().toLowerCase().replace(/^the\s+/, "").replace(/\s+/g, " ");

/** The other agents at this agency. */
export function colleaguesOf(agency: string, agents: readonly Agent[], selfId: string | null): Agent[] {
  const k = agencyKey(agency);
  if (!k) return [];
  return agents.filter((a) => a.id !== selfId && agencyKey(a.agency) === k);
}

/** Their average reply time, rounded to whole weeks — null when no colleague states one. */
export function colleagueWeeks(colleagues: readonly Agent[]): number | null {
  const ws = colleagues.map((a) => a.responseTimeWeeks).filter((w): w is number => typeof w === "number" && w > 0);
  return ws.length ? Math.round(ws.reduce((s, w) => s + w, 0) / ws.length) : null;
}

/** Agencies on the list with how many agents each, the busiest first. */
export function agencyOptions(agents: readonly Agent[]): { name: string; count: number }[] {
  const m = new Map<string, { name: string; count: number }>();
  for (const a of agents) {
    const name = (a.agency ?? "").trim();
    if (!name) continue;
    const k = agencyKey(name);
    const cur = m.get(k);
    if (cur) cur.count += 1;
    else m.set(k, { name, count: 1 });
  }
  return [...m.values()].sort((x, y) => y.count - x.count || x.name.localeCompare(y.name));
}

/** Cities on the list, the most used first. */
export function cityOptions(agents: readonly Agent[]): string[] {
  const m = new Map<string, number>();
  for (const a of agents) {
    const c = (a.city ?? "").trim();
    if (c) m.set(c, (m.get(c) ?? 0) + 1);
  }
  return [...m.entries()].sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0])).map(([c]) => c);
}

/**
 * The genre list in the editor's order (§5): the manuscript's genre, then genres already on the
 * writer's list, then the writer's own personal genres, then the app's list — each once, by label.
 */
export function genreOptions(msGenre: string | null, pool: readonly string[], personal: readonly string[], all: readonly string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const g of [...(msGenre ? [msGenre] : []), ...pool, ...personal, ...all]) {
    const k = g.trim().toLowerCase();
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(g.trim());
  }
  return out;
}

/* ── the Also-changes engine's view of the draft ─────────────────────────────────────────── */

/**
 * The draft as `alsoChanges` reads it (decision 14 reuses that engine). ⚠️ ONLY WHAT CHANGED is
 * taken from the editor; everything else is the record as stored. The editor's own forms differ
 * from storage without being changes — genre ids read as labels, an "Unknown" door reads as open,
 * an unstated rule as null — and handing those to the engine would report consequences of edits
 * nobody made.
 */
export function toContactDraft(a: Agent, base: CardDraft, d: CardDraft): ContactDraft {
  const ch = new Set(changedFields(base, d));
  const orig = draftFromAgentRecord(a);
  return {
    ...orig,
    name: ch.has("name") ? d.name : orig.name,
    agency: ch.has("agency") ? d.agency : orig.agency,
    email: ch.has("email") ? d.email : orig.email,
    website: ch.has("website") ? d.website : orig.website,
    city: ch.has("city") ? d.city : orig.city,
    country: ch.has("country") ? d.country : orig.country,
    responseTimeWeeks: ch.has("weeks") && d.weeks != null ? d.weeks : orig.responseTimeWeeks,
    noResponseMeansNo: ch.has("nrn") && d.nrn != null ? d.nrn : orig.noResponseMeansNo,
    submissionStatus: ch.has("door") ? (d.door === "open" ? SubmissionStatus.OPEN : SubmissionStatus.CLOSED) : orig.submissionStatus,
    reopensOn: ch.has("reopens") || ch.has("door") ? (d.door === "open" ? "" : d.reopens) : orig.reopensOn,
    genres: ch.has("genres") ? [...d.genres] : orig.genres,
    mswlNotes: ch.has("wishlist") ? d.wishlist : orig.mswlNotes,
    materialsWanted: ch.has("mats") ? encodeMats(d.mats) : orig.materialsWanted,
  };
}
