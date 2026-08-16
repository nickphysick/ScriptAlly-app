import { describe, it, expect } from 'vitest';
import { sliceBetween } from "../test/sliceBetween";
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

/**
 * lastCheckedDate means "last VERIFIED", never "last edited" (Tier 1 · Phase 4).
 *
 * Source-artefact locks, because updateAgent/addAgent live inside the DbProvider closure
 * (Firebase-coupled, not unit-invokable). Per the string-spec law, every slice anchors first —
 * one expect per anchor, restated inside each `it` that consumes it.
 */
const here = dirname(fileURLToPath(import.meta.url));
const read = (rel: string) => readFileSync(resolve(here, rel), 'utf8');

describe('lastCheckedDate = last verified, not last edited', () => {
  it('updateAgent does not stamp — or even mention — lastCheckedDate (an edit is not a verification)', () => {
    const src = read('db.tsx');
    const anchor = 'const updateAgent = async (id: string, fields: Partial<Agent>)';
    expect(src).toContain(anchor); // anchor before slicing
    const end = 'const saveAgentEdits = (';
    expect(src).toContain(end); // the next provider function — closes the slice
    const slice = sliceBetween(src, anchor, end);
    expect(slice).not.toContain('lastCheckedDate');
  });

  it('addAgent still stamps it at creation (creating a record is verifying it)', () => {
    const src = read('db.tsx');
    const anchor = 'const addAgent = async (';
    expect(src).toContain(anchor); // anchor before slicing
    const end = 'const updateAgent = async (';
    expect(src).toContain(end);
    const slice = sliceBetween(src, anchor, end);
    expect(slice).toContain('lastCheckedDate: new Date().toISOString()');
  });

  it('commitAgentEdits (the drawer save path) never writes the field either', () => {
    const src = read('saveAgentEdits.ts');
    expect(src).toContain('export async function commitAgentEdits'); // anchor: the right file
    // The write-key form only — the file discusses the field in prose, which is fine.
    expect(src).not.toMatch(/lastCheckedDate\s*:/);
  });
});
