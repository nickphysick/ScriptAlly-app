/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * switcher v2 · S2 at the render level — the cover. The rendered lock (switcherV2.measure.ts) can only
 * see the tile branch: `coverUrl` is outside the manuscript-update rules allowlist, so no record on
 * dev carries one. This renders both branches from the component itself.
 */
import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { BarSwitcher } from "./BarSwitcher";
import { ManuscriptStatus, type Manuscript } from "../../types";

const ms = (over: Partial<Manuscript>): Manuscript =>
  ({ id: "a", userId: "u", title: "Harbour of Glass", genre: "Thriller", wordCount: 50000, status: ManuscriptStatus.QUERYING, logline: "", ...over } as Manuscript);
const render = (m: Manuscript) =>
  renderToStaticMarkup(<BarSwitcher manuscripts={[m]} queries={[]} activeId={m.id} onPick={() => {}} onAdd={() => {}} onOpenActive={() => {}} />);
const tileCover = (html: string) => html.slice(0, html.indexOf('class="ws-ms-tx"'));

describe("S2 · the cover", () => {
  it("coverUrl set: the tile renders the image", () => {
    const html = render(ms({ coverUrl: "https://example.test/cover.jpg" }));
    expect(tileCover(html)).toMatch(/<img[^>]*data-cover="img"[^>]*src="https:\/\/example\.test\/cover\.jpg"/);
  });
  it("coverUrl absent: a tile, and no book-outline icon inside it", () => {
    const html = render(ms({}));
    const cover = tileCover(html);
    expect(cover).toContain('data-cover="tile"');
    expect(cover).not.toContain("<img");
    expect(cover).not.toContain("<svg");
  });
  it("the menu rows take the same cover", () => {
    const html = render(ms({ coverUrl: "https://example.test/cover.jpg" }));
    const menu = html.slice(html.indexOf('class="ws-ms-menu"'));
    expect(menu).toMatch(/<img[^>]*ws-ms-cov--row[^>]*data-cover="img"/);
  });
});
