/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Record a response v2 — THE DOORS, AT SOURCE (the rendered doors are tests/e2e/recordResponse2.measure.ts V1). This
 * repo's tests read source; each door named here is read off its own file, so a door that grows its own form again
 * turns this red.
 *
 *   D1  one listener: `subscribeResponse` is called by the response journey's panel and by nothing else, and the panel
 *       is mounted once, in App
 *   D2  every desktop door calls `openResponse` (the shell's navigate bridge, search's per-query action, the Query Centre's
 *       card reply box and its `respondOn`, the agent cards, the To-do desk, the Dashboard, Responses, Analytics)
 *   D3  the card's reply box: on the desktop its "reply" journey is the response journey for the card's own query
 *   D4  the save tells the door once (`responseSaved`), after the one batch (`commitMany`)
 *   D5  the practice query is handed to the guided walk (`openPipResponse`), never saved by the host
 */
import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const read = (p: string) => readFileSync(p, "utf8");
function walk(dir: string, out: string[] = []): string[] {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(f) && !/\.test\.(ts|tsx)$/.test(f)) out.push(p);
  }
  return out;
}

describe("D1 · one listener, mounted once", () => {
  it("subscribeResponse( is called only by RespondStagesPanel; App mounts the panel once", () => {
    const callers = walk("src").filter((p) => read(p).includes("subscribeResponse(") && !p.endsWith("queryPanelStore.ts"));
    expect(callers).toEqual(["src/components/queries/centre/RespondStagesPanel.tsx"]);
    expect(read("src/App.tsx").match(/<RespondStagesPanel \/>/g)?.length).toBe(1);
  });
});

describe("D2 · every desktop door calls openResponse", () => {
  const DOORS: [string, RegExp][] = [
    ["src/App.tsx", /if \(subPageName === "Record a response"\) \{[^}]*openResponse\(\);/],
    ["src/components/shell/SearchPalette.tsx", /case "recordFor": openResponse\(\{ queryId: run\.queryId/],
    ["src/components/Queries.tsx", /if \(a === "resp" && !qmPhone\) \{ openResponse\(\{ queryId: id, from: o\.from, back: o\.back, reply: o\.reply \?\? null \}\); return; \}/],
    ["src/components/agents/AgentList.tsx", /responseHosted\(\)\) \{ openResponse\(\{ queryId, back: agentBack\(x\.agent\) \}\)/],
    ["src/components/agents/card/AgentCardHost.tsx", /responseHosted\(\)\) \{ openResponse\(\{ queryId: q\.id, back: agentBack\(agent\) \}\)/],
    ["src/components/agents/card/HostAgentCard.tsx", /responseHosted\(\)\) \{ openResponse\(\{ queryId, back: agentBack\(agent\) \}\)/],
    ["src/components/todo/ws/useWsCore.ts", /openResponse\(\{ queryId: sel\.query\.id, onSaved:/],
    ["src/components/dashboard/v58/Dash58.tsx", /responseHosted\(\)\) \{ openResponse\(\{ queryId: a\.request\.queryId, from: "dashboard" \}\)/],
    ["src/components/responses/ResponsesPage.tsx", /openResponse\(\{ queryId: i\.id, from: "other" \}\)/],
    ["src/components/responses/RspPanel.tsx", /openResponse\(\{ queryId: item\.id, from: "other" \}\)/],
    ["src/components/QueryAnalytics.tsx", /openResponse\(\);/],
  ];
  for (const [f, re] of DOORS) it(f, () => { expect(read(f)).toMatch(re); });
});

describe("D3 · the card's reply box is the journey", () => {
  it("open1522's reply, on the desktop, opens the journey for the card's query", () => {
    const s = read("src/components/Queries.tsx");
    expect(s).toMatch(/if \(j === "reply" && !qmPhone && id && !isPracticeId\(id\)\) \{ openResponse\(\{ queryId: id, reply \}\); return; \}/);
    /* the card's query is known before the door can be pressed (assigned at render, read in the handler) */
    expect(s.indexOf("const cardIdFor1522 = useRef")).toBeLessThan(s.indexOf("cardIdFor1522.current = cardQueryId;"));
  });
});

describe("D4 · the save tells the door once, after the one batch", () => {
  it("responseSaved once in the host's onSave, after commitMany", () => {
    const s = read("src/components/queries/centre/RespondStagesHost.tsx");
    expect(s.match(/responseSaved\(id\)/g)?.length).toBe(1);
    expect(s.indexOf("await commitMany(")).toBeGreaterThan(0);
    expect(s.indexOf("await commitMany(")).toBeLessThan(s.indexOf("responseSaved(id)"));
  });
});

describe("D5 · the practice query", () => {
  it("is handed to the guided walk, never to the host", () => {
    const s = read("src/components/queries/centre/RespondStagesPanel.tsx");
    expect(s).toMatch(/if \(r\.queryId && isPracticeId\(r\.queryId\)\) \{ openPipResponse\(\); return; \}/);
    expect(read("src/components/Queries.tsx")).toContain("pipRespRef.current = openPipResp;");
  });
});
