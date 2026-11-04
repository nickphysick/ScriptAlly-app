/**
 * Smart Import from photos, phase 2 — the photos screen, the fork's and the Import page's "Use
 * photos", and the flow's photo picker (smart-import-photos-v1; ref #photos, #fork-a).
 */
import React from "react";
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PhotosScreen, type PhotoThumb } from "./PhotosScreen";
import { CONFIRM_TITLE, CONFIRM_SUB } from "./ConfirmScreen";
import { PHOTOS_WORDS } from "../../lib/photoImport";

/* Comments stripped only where one can start (after whitespace or a brace), so the `/*` inside
   accept="image/*" is not read as a comment opening. */
const code = (p: string) => readFileSync(join(...p.split("/")), "utf8").replace(/(^|[\s{(;,])\/\*[\s\S]*?\*\//g, "$1").replace(/(^|\s)\/\/[^\n]*/g, "$1");
const noop = () => {};
const pg = (id: string, over: Partial<PhotoThumb> = {}): PhotoThumb => ({ id, url: `blob:${id}`, status: "ready", blurry: false, kept: false, ...over });
const screen = (pages: PhotoThumb[], extra: Partial<React.ComponentProps<typeof PhotosScreen>> = {}) =>
  renderToStaticMarkup(
    <PhotosScreen pages={pages} onAdd={noop} onReplace={noop} onRemove={noop} onKeep={noop} onMove={noop} onBack={noop} onRead={noop} {...extra} />,
  ).replace(/<!-- -->/g, "").replace(/&#x27;/g, "'");
const text = (h: string) => h.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

describe("the photos screen", () => {
  it("has its own heading (v1.1), word for word, over the hand-off's subline", () => {
    const h = screen([pg("a")]);
    expect(PHOTOS_WORDS.title).toBe("Ok. Let's turn your photos into a smart QueryHawk database.");
    expect(h).toContain(`<h1 class="sf-title">${PHOTOS_WORDS.title}</h1>`);
    expect(h).not.toContain(CONFIRM_TITLE);
    expect(CONFIRM_TITLE).toBe("Let QueryHawk Smart Import take it from here.");
    expect(h).toContain(CONFIRM_SUB);
    expect(h).toContain("The photos you chose");
  });
  it("empty (v1.1): one large Add a page tile, the tip, and Choose photos as the primary", () => {
    const h = screen([]);
    expect(h).toContain(PHOTOS_WORDS.title);
    expect(h).toMatch(/<button type="button" class="o9-addpg o9-addpg--empty" data-act="add" data-sf="photos-empty"><span aria-hidden="true">\+<\/span>Add a page<\/button>/);
    expect(h).not.toContain('data-sf="photos"');
    expect(h).toContain(PHOTOS_WORDS.tip);
    expect(h).toMatch(/<button type="button" class="sf-btn" data-act="choose">Choose photos<\/button>/);
    expect(h).not.toContain('data-act="read"');
    expect(text(h)).toContain("What happens next");
    expect(screen([pg("a")])).toMatch(/data-act="read"[^>]*>Read my photos</);
  });
  it("Choose photos and the empty tile open the picker from their own click (onAdd), nothing else", () => {
    const f = code("src/components/onboarding/PhotosScreen.tsx");
    expect(f).toContain('data-act="choose" onClick={onAdd}');
    expect(f).toContain('data-sf="photos-empty" onClick={onAdd}');
    const i = code("src/components/import/ImportFlow.tsx");
    expect(i).toContain("onAdd={() => photoInputRef.current?.click()}");
  });
  it("numbers the pages in order, each with Replace and Remove as words", () => {
    const h = screen([pg("a"), pg("b"), pg("c")]);
    expect([...h.matchAll(/data-page="(\d+)"/g)].map((m) => m[1])).toEqual(["1", "2", "3"]);
    expect(text(h)).toMatch(/Page 1 Replace Remove Page 2 Replace Remove Page 3 Replace Remove/);
    expect(h).toMatch(/<img src="blob:a" alt="" draggable="false"\/>/);
    expect(h).not.toContain("×");
  });
  it("ends the row with Add a page, switched off at ten", () => {
    expect(screen([pg("a")])).toMatch(/<button type="button" class="o9-addpg" data-act="add"><span aria-hidden="true">\+<\/span>Add a page<\/button>/);
    expect(screen(Array.from({ length: 10 }, (_, i) => pg(`p${i}`)))).toMatch(/class="o9-addpg" data-act="add" disabled=""/);
  });
  it("names the first blurry page under the grid, with Replace and Keep it — and never blocks", () => {
    const h = screen([pg("a"), pg("b", { blurry: true }), pg("c", { blurry: true })]);
    expect(text(h)).toContain("Page 2 looks blurry. A sharper photo means fewer questions later.");
    expect(h).toContain(">Replace page 2</button>");
    expect(h).toContain(">Keep it</button>");
    expect((h.match(/data-sf="photo-hard"/g) ?? []).length).toBe(2);
    expect(h).not.toMatch(/data-act="read"[^>]*disabled/);
    expect(text(screen([pg("a"), pg("b", { blurry: true, kept: true }), pg("c", { blurry: true })]))).toContain("Page 3 looks blurry.");
  });
  it("a page that can't be opened says so, offers Remove only, and isn't counted", () => {
    const h = screen([pg("a", { status: "failed", url: null }), pg("b")]);
    expect(text(h)).toContain("Can't open this photo");
    expect(text(h)).toMatch(/Page 1 Remove Page 2 Replace Remove/);
    expect(text(h)).toContain("We'll read your page and");
  });
  it("Read my photos is off with no readable page, while a page is being got ready, and while fitting", () => {
    /* v1.1: with no page at all the primary is Choose photos (the empty test above). */
    expect(screen([pg("a", { status: "failed", url: null })])).toMatch(/data-act="read"[^>]*disabled/);
    expect(text(screen([]))).toContain("Add a photo of each page of your list.");
    expect(screen([pg("a", { status: "preparing", url: null })])).toMatch(/data-act="read"[^>]*disabled/);
    expect(screen([pg("a")], { busy: true })).toMatch(/data-act="read"[^>]*disabled/);
    expect(screen([pg("a"), pg("b")])).toMatch(/<button type="button" class="sf-btn" data-act="read">Read my photos<\/button>/);
  });
  it("the tip and the three steps are the ref's", () => {
    const t = text(screen([pg("a")]));
    expect(t).toContain("Up to 10 pages, read in this order. Drag a page to move it. For the clearest read, get the whole page in, flat, in good light.");
    expect(t).toContain("Your list, as it is A notebook page, a printout, a screenshot. Nothing to tidy first.");
    expect(t).toContain("QueryHawk reads every line Agents, queries, dates and statuses, sorted into place.");
    expect(t).toContain("You check what lands Anything we couldn't read is asked about, with your own writing beside it.");
  });
  it("each page can be moved from the keyboard", () => {
    expect(screen([pg("a"), pg("b")])).toMatch(/tabindex="0" role="img" data-photo-id="a" aria-label="Page 1 of 2\. Press Alt and an arrow key to move it\."/);
    expect(code("src/components/onboarding/PhotosScreen.tsx")).toMatch(/e\.altKey[\s\S]*ArrowLeft[\s\S]*onMove\(i, to\)/);
  });
  it("no green, and no new mono eyebrow", () => {
    const css = readFileSync(join("src", "components", "onboarding", "photoImport.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    expect(css).not.toMatch(/--go\b|#4e7d60|sage|green/i);
    expect(css).not.toMatch(/text-transform:\s*uppercase/);
  });
});

describe("the ways in (locked)", () => {
  it("the flow's photo picker takes images, several at once, with no capture attribute", () => {
    const f = code("src/components/import/ImportFlow.tsx");
    const at = f.indexOf('data-picker="photos"');
    const input = f.slice(f.lastIndexOf("<input", at), f.indexOf("/>", at));
    expect(input).toContain('accept="image/*"');
    expect(input).toMatch(/\bmultiple\b/);
    expect(input).not.toMatch(/capture/);
    /* v1.1: "Use photos" opens the screen; nothing but the screen's own buttons clicks the input */
    expect(f).toContain("openPhotos,");
    const at2 = f.indexOf("const openPhotos");
    const body = f.slice(at2, f.indexOf("};", at2));
    expect(body).toContain('setScreen("photos")');
    expect(body).not.toContain("click");
    expect(f).not.toContain("choosePhotos");
    expect(f).toContain("dropPhotos: pickPhotos,");
  });
  it("the photos screen takes the confirm's place for photos; the sheet's confirm is unchanged", () => {
    const f = code("src/components/import/ImportFlow.tsx");
    expect(f).toMatch(/if \(screen === "photos"\)[\s\S]*<PhotosScreen/);
    expect(f).toMatch(/if \(screen === "confirm"\)[\s\S]*<ConfirmScreen/);
  });
  it("photos go through the same client gate as a file", () => {
    const f = code("src/components/import/ImportFlow.tsx");
    const gate = f.indexOf("const photosAllowed");
    expect(f.slice(gate, f.indexOf("};", gate))).toMatch(/if \(entitlement\.allowed\) return true;[\s\S]*setScreen\("blocked"\)/);
    for (const fn of ["const pickPhotos", "const openPhotos"]) {
      const at = f.indexOf(fn);
      expect(f.slice(at, f.indexOf("};", at))).toContain("photosAllowed()");
    }
  });
  it("BranchB wires Use photos and a photo drop to the flow", () => {
    const b = code("src/components/onboarding/BranchB.tsx");
    expect(b).toContain("onUsePhotos={() => flowRef.current?.openPhotos()}");
    expect(b).toContain("onDropPhotos={(fs) => flowRef.current?.dropPhotos(fs)}");
  });
  it("the Import page offers Use photos beside its Smart Import action, gated the same", () => {
    const p = code("src/components/import/ImportPage.tsx");
    expect(p).toMatch(/data-act="smart" onClick=\{chooseSmart\} disabled=\{!entitlement\.allowed\}>\{TILE_SMART\.action\}<\/button>\s*<button type="button" className="impg-btn impg-btn--line" data-act="photos" onClick=\{usePhotos\} disabled=\{!entitlement\.allowed\}>\{CAPTURE_PHOTOS_ACTION\}<\/button>/);
    expect(p).toContain('kind === "photos" ? flowRef.current?.openPhotos()');
  });
});
