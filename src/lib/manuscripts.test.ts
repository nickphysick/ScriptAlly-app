import { describe, it, expect } from 'vitest';
import { normaliseGenres } from './manuscripts';

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
