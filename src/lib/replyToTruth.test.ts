/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * R1 · The functions no longer claim the from-address is "not currently delivering".
 *
 * That was true of scriptally.ink, whose mail was forwarded by Namecheap and lost. It is not true of
 * queryhawk.net: nick@queryhawk.net is a real mailbox with real MX records. A warning that says
 * replies are lost, when they are not, trains whoever reads the logs to ignore it. So the claim
 * may not reappear in code, comments stripped.
 */

import { readFileSync, readdirSync, statSync } from "fs";
import { join, relative } from "path";
import { describe, expect, it } from "vitest";
import { replyToWarning, REPLY_TO_ENV } from "../../functions/src/emailConfig";

const ROOT = process.cwd();
const walk = (d: string): string[] =>
  readdirSync(d).flatMap((n) => (statSync(join(d, n)).isDirectory() ? walk(join(d, n)) : [join(d, n)]));
/* A `//` inside a URL string is not a comment; a naive strip turns "https://…" into "https:". */
const strip = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`\w])\/\/[^\n]*/g, "$1");

/* ⚠️ JOIN CONCATENATED STRINGS BEFORE MATCHING. The original warning was split as
   `"…not currently " + "delivering…"`, so a literal search of the file never saw the phrase it was
   hunting: a false green on exactly the file this lock is for. */
const joined = (s: string) => s.replace(/["'`]\s*\+\s*["'`]/g, "").replace(/\s+/g, " ");
const STALE = [/not currently delivering/i, /forwarding delivers/i];

describe("R1 · the reply-to warning tells the truth about queryhawk.net", () => {
  it("no file under functions/src states the old claim, comments stripped", () => {
    const files = walk(join(ROOT, "functions/src")).filter((f) => /\.ts$/.test(f));
    expect(files.length, "the sweep read a real population").toBeGreaterThan(20);
    const hits = files.filter((f) => STALE.some((re) => re.test(joined(strip(readFileSync(f, "utf8"))))))
      .map((f) => relative(ROOT, f));
    expect(hits).toEqual([]);
  });

  it("the warning is the agreed sentence, and only when the key is unset", () => {
    expect(replyToWarning({})).toBe("WAITLIST_REPLY_TO is unset — replies will go to the from-address.");
    expect(replyToWarning({ [REPLY_TO_ENV]: "nick@queryhawk.net" })).toBeNull();
  });
});
