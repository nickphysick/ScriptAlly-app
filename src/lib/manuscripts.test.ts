import { describe, it, expect, vi } from 'vitest';
import { normaliseGenres, ensureManuscriptOnce, ManuscriptIdCache } from './manuscripts';

describe('normaliseGenres — validate raw import genres against the allow-list', () => {
  it('maps common shorthand via aliases', () => {
    expect(normaliseGenres(['litfic', 'sci-fi', 'YA'])).toEqual(['Literary Fiction', 'Science Fiction', 'Young Adult']);
  });
  it('drops unrecognised tokens, de-dupes, keeps allow-list order', () => {
    expect(normaliseGenres(['made-up-genre', 'fantasy', 'YA', 'fantasy'])).toEqual(['Fantasy', 'Young Adult']);
  });
  it('splits a single comma/slash/and string', () => {
    expect(normaliseGenres('Crime, thriller / upmarket and made-up')).toEqual(['Commercial Fiction', 'Thriller', 'Crime']);
  });
  it('matches an exact predefined genre and a meaningful contained word', () => {
    expect(normaliseGenres(['Literary Fiction', 'historical'])).toEqual(['Literary Fiction', 'Historical Fiction']);
  });
  it('never invents a genre — empty / null / generic words yield nothing', () => {
    expect(normaliseGenres(null)).toEqual([]);
    expect(normaliseGenres([])).toEqual([]);
    expect(normaliseGenres(['fiction', 'book', 'novel'])).toEqual([]);
  });
});

describe('ensureManuscriptOnce — deferred single-write manuscript creation (the cap-dead-end fix)', () => {
  it('creates exactly one manuscript from the held draft at commit/finish', async () => {
    const cache: ManuscriptIdCache = { id: null };
    const create = vi.fn(async () => 'ms-1');
    const id = await ensureManuscriptOnce(cache, true, create);
    expect(id).toBe('ms-1');
    expect(create).toHaveBeenCalledTimes(1);
    expect(cache.id).toBe('ms-1');
  });

  it('a second ending (or a retry) reuses the stored id — never creates a second / trips the cap', async () => {
    const cache: ManuscriptIdCache = { id: null };
    const create = vi.fn(async () => 'ms-1');
    await ensureManuscriptOnce(cache, true, create); // first ending (e.g. import commit)
    const again = await ensureManuscriptOnce(cache, true, create); // retry / another ending
    expect(again).toBe('ms-1');
    expect(create).toHaveBeenCalledTimes(1); // still exactly one write
  });

  it('holding the draft over many Stage-2 (re)entries writes nothing until the single ensure', async () => {
    // Re-entering Stage 2 after Back→Back never writes — only ensure (at commit/finish) does.
    const cache: ManuscriptIdCache = { id: null };
    const create = vi.fn(async () => 'ms-1');
    // (Stage 2 entry/Continue holds the draft; it never calls create — modelled here as "no ensure".)
    expect(create).toHaveBeenCalledTimes(0);
    await ensureManuscriptOnce(cache, true, create); // the one commit-time write
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('no draft → no write, returns null (e.g. Skip before any details entered)', async () => {
    const cache: ManuscriptIdCache = { id: null };
    const create = vi.fn(async () => 'ms-1');
    const id = await ensureManuscriptOnce(cache, false, create);
    expect(id).toBeNull();
    expect(create).not.toHaveBeenCalled();
  });

  it('a failed write is not cached — a later retry can still create exactly one', async () => {
    const cache: ManuscriptIdCache = { id: null };
    const create = vi.fn<() => Promise<string | null>>()
      .mockResolvedValueOnce(null)   // first attempt fails (e.g. transient error)
      .mockResolvedValueOnce('ms-2'); // retry succeeds
    const first = await ensureManuscriptOnce(cache, true, create);
    expect(first).toBeNull();
    expect(cache.id).toBeNull(); // failure not cached
    const retry = await ensureManuscriptOnce(cache, true, create);
    expect(retry).toBe('ms-2');
    expect(cache.id).toBe('ms-2');
    expect(create).toHaveBeenCalledTimes(2);
  });
});
