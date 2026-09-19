/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * appArt — the app's own copy of the brand mark (the v34 mockup, 19 Sep).
 */
import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { APP_MARK, artUrl } from "./appArt";

const file = resolve(__dirname, "../..", "public" + APP_MARK.src);

describe("the sidebar's mark", () => {
  it("is versioned by its own bytes, is the size it declares, and is transparent", () => {
    const png = readFileSync(file);
    expect(APP_MARK.version, "the version IS the file").toBe(createHash("md5").update(png).digest("hex").slice(0, 8));
    expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([APP_MARK.width, APP_MARK.height]);
    expect([3, 6]).toContain(png[25]);
    if (png[25] === 3) expect(png.includes(Buffer.from("tRNS"))).toBe(true);
    expect(artUrl(APP_MARK)).toBe(`/images/app/queryhawk-mark.png?v=${APP_MARK.version}`);
  });

  /* ⚠️ THE WHOLE POINT OF THE COPY. The landing nav's roundel is 245KB; it was derived to 120px so a
     40px slot on every workspace route does not pay for it. A mark that crept back up is the
     original file arriving through the side door. */
  it("⚠️ is small — 3× its 40px slot, and a fraction of the marketing file it was derived from", () => {
    expect([APP_MARK.width, APP_MARK.height]).toEqual([120, 120]);
    expect(statSync(file).size).toBeLessThan(20 * 1024);
    const source = resolve(__dirname, "../..", "public/images/queryhawk-logo.png");
    expect(statSync(file).size * 10, "an order of magnitude under its source").toBeLessThan(statSync(source).size);
  });

  it("⚠️ the app reads ITS copy — never the marketing tier's file, and never an import from that tier", () => {
    const shell = readFileSync(resolve(__dirname, "../components/shell/WorkspaceShell.tsx"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "").replace(/\{\/\*[\s\S]*?\*\/\}/g, "");
    expect(shell).toContain('import { APP_MARK, artUrl } from "../../lib/appArt"');
    expect(shell).toContain("src={artUrl(APP_MARK)}");
    expect(shell).not.toContain("queryhawk-logo.png");
    expect(shell).not.toMatch(/from "\.\.\/\.\.\/marketing\/brandArt"/);
  });
});
