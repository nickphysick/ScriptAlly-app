import { describe, it, expect } from "vitest";
import { normaliseForMatch, verifyTitle, type FetchLike } from "./compCatalogue";

const NOW = () => new Date("2026-08-13T09:41:00.000Z");
const ok = (payload: unknown): FetchLike => async () => ({ ok: true, json: async () => payload });

const vol = (info: Record<string, unknown>, id = "gb-1") => ({ items: [{ id, volumeInfo: info }] });

describe("normaliseForMatch", () => {
  /**
   * ⚠️ LOOSE ON PUNCTUATION, STRICT ON WORDS. A catalogue's spelling differs from a model's in ways
   * that are not disagreements — smart quotes, ampersands, casing. Dropping a real book over
   * typography is a false negative the writer never sees an explanation for.
   */
  it("ignores case, punctuation and ampersand spelling", () => {
    expect(normaliseForMatch("Howl’s Moving Castle")).toBe(normaliseForMatch("Howl's moving castle"));
    expect(normaliseForMatch("Jonathan Strange & Mr Norrell"))
      .toBe(normaliseForMatch("Jonathan Strange and Mr Norrell"));
  });

  it("keeps different word content different", () => {
    expect(normaliseForMatch("The Appeal")).not.toBe(normaliseForMatch("The Appeal Returns"));
  });
});

describe("verifyTitle — the check that earns the footer", () => {
  it("matches through a subtitle the model did not have", async () => {
    const f = ok(vol({ title: "Piranesi: A Novel", authors: ["Susanna Clarke"], publishedDate: "2020" }));
    const m = await verifyTitle(f, { title: "Piranesi", author: "Susanna Clarke" }, NOW);
    expect(m?.record.catalogue).toBe("Google Books");
    expect(m?.year).toBe(2020);
  });

  /** catalogues vary on initials, middle names and ordering — the surname is the stable part */
  it("matches on surname rather than on the whole author string", async () => {
    const f = ok(vol({ title: "Piranesi", authors: ["Susanna M. Clarke"], publishedDate: "2020" }));
    expect(await verifyTitle(f, { title: "Piranesi", author: "S. Clarke" }, NOW)).not.toBeNull();
  });

  /**
   * ⚠️ THE FAILURE THAT MATTERS IS A WRONG MATCH, NOT A MISSED ONE. A missed match costs the writer
   * a suggestion; a wrong one puts a verified badge on a book nobody checked.
   */
  it("refuses a volume with the right title and the wrong author", async () => {
    const f = ok(vol({ title: "Piranesi", authors: ["Someone Else"], publishedDate: "2020" }));
    expect(await verifyTitle(f, { title: "Piranesi", author: "Susanna Clarke" }, NOW)).toBeNull();
  });

  it("refuses a volume with the right author and a different book", async () => {
    const f = ok(vol({ title: "Jonathan Strange", authors: ["Susanna Clarke"], publishedDate: "2004" }));
    expect(await verifyTitle(f, { title: "Piranesi", author: "Susanna Clarke" }, NOW)).toBeNull();
  });

  it("refuses a volume with no author at all", async () => {
    const f = ok(vol({ title: "Piranesi", publishedDate: "2020" }));
    expect(await verifyTitle(f, { title: "Piranesi", author: "Susanna Clarke" }, NOW)).toBeNull();
  });

  it("returns null on a non-ok response, a throw, or a shapeless payload", async () => {
    const notOk: FetchLike = async () => ({ ok: false, json: async () => ({}) });
    const boom: FetchLike = async () => { throw new Error("network"); };
    const cand = { title: "Piranesi", author: "Susanna Clarke" };
    expect(await verifyTitle(notOk, cand, NOW)).toBeNull();
    expect(await verifyTitle(boom, cand, NOW)).toBeNull();
    expect(await verifyTitle(ok({}), cand, NOW)).toBeNull();
    expect(await verifyTitle(ok({ items: "nope" }), cand, NOW)).toBeNull();
  });

  it("omits externalId when the catalogue gave none, and records the server's clock", async () => {
    const f: FetchLike = async () => ({
      ok: true,
      json: async () => ({ items: [{ volumeInfo: { title: "Piranesi", authors: ["Susanna Clarke"], publishedDate: "2020" } }] }),
    });
    const m = await verifyTitle(f, { title: "Piranesi", author: "Susanna Clarke" }, NOW);
    expect("externalId" in (m?.record ?? {})).toBe(false);
    expect(m?.record.checkedAt).toBe("2026-08-13T09:41:00.000Z");
  });

  it("reads a four-digit year out of a full publication date, and rejects nonsense", async () => {
    const good = ok(vol({ title: "T", authors: ["A"], publishedDate: "2019-04-02" }));
    expect((await verifyTitle(good, { title: "T", author: "A" }, NOW))?.year).toBe(2019);
    const bad = ok(vol({ title: "T", authors: ["A"], publishedDate: "n.d." }));
    expect((await verifyTitle(bad, { title: "T", author: "A" }, NOW))?.year).toBeUndefined();
  });

  it("scans past a non-matching first result to a matching later one", async () => {
    const f = ok({
      items: [
        { id: "x", volumeInfo: { title: "Wrong Book", authors: ["Susanna Clarke"], publishedDate: "2004" } },
        { id: "y", volumeInfo: { title: "Piranesi", authors: ["Susanna Clarke"], publishedDate: "2020" } },
      ],
    });
    const m = await verifyTitle(f, { title: "Piranesi", author: "Susanna Clarke" }, NOW);
    expect(m?.record.externalId).toBe("y");
  });
});
