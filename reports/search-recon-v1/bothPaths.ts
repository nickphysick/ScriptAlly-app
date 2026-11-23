/**
 * Search recon v1 — every seed agent through BOTH real code paths, read-only.
 *   search:       buildCorpus (src/lib/searchPalette.ts) → the agent row's `status`
 *   Contact list: standingQuery(agentRows(rows, agent, the shell's book)) (src/lib/contactList.ts), for comparison
 *   Query Centre: buildQcRows (src/lib/qcSummary.ts) over every query, scope null (the page's arrival state)
 * The active manuscript is resolved by the app's own resolveScopedManuscript, once per possible stored choice
 * (none stored, then each manuscript), with manuscripts in document-id order (db.tsx subscribes with no orderBy).
 * Run: npx vite-node reports/search-recon-v1/bothPaths.ts > reports/search-recon-v1/both-paths.json
 */
import { readFileSync } from "node:fs";
import { buildCorpus } from "../../src/lib/searchPalette";
import { buildQcRows } from "../../src/lib/qcSummary";
import { resolveScopedManuscript } from "../../src/lib/shellSidebar";
import { isClosedStatus } from "../../src/lib/qcStages";
import { agentRows, standingQuery } from "../../src/lib/contactList";

const docs = JSON.parse(readFileSync("tests/emulator-seed/harness.json", "utf8")).docs as Record<string, any>;
const of = (c: string) => Object.entries(docs).filter(([k]) => k.split("/")[2] === c && k.split("/").length === 4)
  .map(([k, v]) => ({ ...v, id: k.split("/")[3] })).sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
const agents = of("agents"), queries = of("queries"), activities = of("activities"), manuscripts = of("manuscripts");
const NOW = Date.parse("2026-11-23T12:00:00Z");
const qcRows = buildQcRows(queries as any, agents as any, activities as any, NOW);
const agentOfQuery = new Map(queries.map((q: any) => [q.id, q.agentId]));
const msTitle = new Map(manuscripts.map((m: any) => [m.id, m.title]));

const choices: (string | null)[] = [null, ...manuscripts.map((m: any) => m.id)];
const out: any = { manuscriptsInOrder: manuscripts.map((m: any) => ({ id: m.id, title: m.title, createdDate: m.createdDate ?? null })), runs: [] };
for (const stored of choices) {
  const active = resolveScopedManuscript(manuscripts as any, stored);
  const corpus = buildCorpus({ agents: agents as any, queries: queries as any, agentLabel: (a) => ({ primary: a.name ?? "", secondary: a.agency ?? "" }), activeManuscriptId: active?.id ?? null, activeManuscriptTitle: active?.title });
  const rows: any[] = [];
  for (const a of agents as any[]) {
    const item = corpus.find((i) => i.id === `agent:${a.id}`);
    const search = item?.status ?? "Not queried";
    const qc = qcRows.filter((r: any) => agentOfQuery.get(r.id) === a.id);
    const onActive = qc.filter((r: any) => r.manuscriptId === active?.id);
    const liveOnActive = onActive.filter((r: any) => !isClosedStatus(r.status));
    const contact = standingQuery(agentRows(qcRows as any, a.id, active?.id ?? null))?.status ?? "Not queried";
    let kind: string | null = null;
    if (qc.length && search === "Not queried") kind = "A: cards on the Query Centre, none on the active book";
    else if (onActive.length > 1 && liveOnActive.length && isClosedStatus(search)) kind = "B: several on the active book, search shows a closed one";
    else if (onActive.length > 1 && !onActive.every((r: any) => r.status === search)) kind = "C: several on the active book, search shows one of them";
    rows.push({ agentId: a.id, name: a.name, search, contact, qc: qc.map((r: any) => `${r.status} · ${msTitle.get(r.manuscriptId) ?? r.manuscriptId}`), kind });
  }
  out.runs.push({ stored, active: active?.id ?? null, activeTitle: active?.title ?? null, agents: rows.length,
    withQueries: rows.filter((r) => r.qc.length).length, disagree: rows.filter((r) => r.kind) });
}
console.log(JSON.stringify(out, null, 1));
