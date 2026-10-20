/**
 * Smart Import progress — counts completed rows in the model's reply AS IT STREAMS.
 *
 * The reply is `{"agents":[{…},{…}],"queries":[{…},{…}]}`: one agent and one query per data row
 * (the prompt asks for exactly that), written agents first. A row is "read" once both its objects
 * are out, so progress is HALF the completed objects at depth one of either array:
 *
 *   rows = ⌊(agents + queries) / 2⌋
 *
 * Counting only the query objects — the obvious choice — holds the count at 0 while every agent is
 * written, which is 32–39% of the reply (measured on the dev fixtures), and then runs at ~1.6× the
 * true rate. Counting both rises steadily from the first object to the last and ends on the number
 * of rows the model read.
 *
 * Pure and incremental: push text in any chunks; braces inside JSON strings (escaped quotes included)
 * are ignored, and objects nested inside a row (a timeline entry) are not counted. Anything before the
 * first `{` — a code fence, a stray word — is skipped. A truncated reply simply stops counting.
 */

export interface RowCounts {
  agents: number;
  queries: number;
  /** ⌊(agents + queries) / 2⌋ — the rows read so far. */
  rows: number;
}

type Frame = { kind: "object" } | { kind: "array"; key: string | null };

export function createRowCounter() {
  const stack: Frame[] = [];
  let inString = false;
  let escaped = false;
  let started = false;
  /** The text of the string being read, kept only while it could be a key of the root object. */
  let str = "";
  let lastRootString: string | null = null;
  /** The key the next value of the root object belongs to. */
  let rootKey: string | null = null;
  let agents = 0;
  let queries = 0;

  const atRoot = () => stack.length === 1 && stack[0].kind === "object";

  function push(text: string): void {
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (!started) {
        if (ch !== "{") continue;
        started = true;
      }
      if (inString) {
        if (escaped) { escaped = false; if (atRoot()) str += ch; continue; }
        if (ch === "\\") { escaped = true; continue; }
        if (ch === '"') { inString = false; if (atRoot()) lastRootString = str; continue; }
        if (atRoot()) str += ch;
        continue;
      }
      switch (ch) {
        case '"':
          inString = true; str = "";
          break;
        case ":":
          if (atRoot()) rootKey = lastRootString;
          break;
        case "{":
          stack.push({ kind: "object" });
          break;
        case "[":
          stack.push({ kind: "array", key: atRoot() ? rootKey : null });
          break;
        case "}": {
          stack.pop();
          // A row object has just closed when the frame now on top is one of the two root arrays.
          // ⚠️ THE DEPTH CHECK IS A SECOND GUARD NO TEST CAN SEE: an array's key is only ever recorded
          // at the root, so a nested array (a timeline) carries no key and its objects already fail
          // the key test. Removing the depth check was tried and turned nothing red. It stays so the
          // rule reads as stated — objects at the depth of the two arrays, and nowhere else.
          const top = stack[stack.length - 1];
          if (stack.length === 2 && top?.kind === "array") {
            if (top.key === "agents") agents++;
            else if (top.key === "queries") queries++;
          }
          break;
        }
        case "]":
          stack.pop();
          break;
        case ",":
          if (atRoot()) rootKey = null;
          break;
      }
    }
  }

  function counts(): RowCounts {
    return { agents, queries, rows: Math.floor((agents + queries) / 2) };
  }

  return { push, counts };
}
