import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

/**
 * Tier 3 · Phase 5 — status writes are locked to the CREATE SEED (addQuery: the status before
 * any activity exists) and the DERIVATION ENGINE (recomputeQuery).
 *
 * Why the rules door stays open: recomputeQuery writes via updateDoc — an UPDATE at the rules
 * layer — and affectedKeys() carries 'status' exactly when a transition happens, so removing
 * 'status' from the queries update allowlist would deny every real transition (the brief's
 * preferred option is structurally unavailable). This suite closes the door at the source:
 * the known query-mutation paths carry no bare `status:` write key.
 *
 * The pattern is the lowercase write-key form `status:` — `resultingStatus:`, `newStatus`,
 * `rejectedFromStatus:` and `submissionStatus:` all fail the word boundary or the case, so
 * only a genuine query-status write can match. Anchored slices per the string-spec law.
 */
const here = dirname(fileURLToPath(import.meta.url));
const read = (rel: string) => readFileSync(resolve(here, rel), 'utf8');
const WRITE_KEY = /\bstatus\s*:/;

describe('status writes: the create seed and the derivation engine only', () => {
  it('recomputeQuery carries the derived status write (the engine anchor)', () => {
    const src = read('recomputeQuery.ts');
    expect(src).toContain('status: fields.status');
  });

  it('addQuery keeps its create seed — the one legitimate direct status', () => {
    const src = read('db.tsx');
    const anchor = 'const addQuery = async (';
    expect(src).toContain(anchor); // anchor before slicing
    const end = 'const updateQueryStatus = async';
    expect(src).toContain(end);
    const slice = src.slice(src.indexOf(anchor), src.indexOf(end));
    expect(slice).toMatch(/status:\s*q\.status \|\| QueryStatus\.QUERIED/);
  });

  it('updateQueryStatus mutates the LOG, never the status field itself', () => {
    const src = read('db.tsx');
    const anchor = 'const updateQueryStatus = async';
    expect(src).toContain(anchor); // anchor before slicing
    const end = 'const recordMaterialsSent = async';
    expect(src).toContain(end);
    const slice = src.slice(src.indexOf(anchor), src.indexOf(end));
    expect(slice).not.toMatch(WRITE_KEY);
  });

  it('recordQueryResponse writes response details only — no status key in the whole file', () => {
    expect(read('recordResponse.ts')).not.toMatch(WRITE_KEY);
  });

  it('commitQueryEdits (the drawer save) never writes status', () => {
    const src = read('saveQueryEdits.ts');
    const anchor = 'export async function commitQueryEdits';
    expect(src).toContain(anchor); // anchor before slicing — dodges the draft interface's type line
    const slice = src.slice(src.indexOf(anchor));
    expect(slice).not.toMatch(WRITE_KEY);
  });
});
