/**
 * Firestore Security Rules — integration tests.
 *
 * Runs entirely against the local Firestore emulator (firebase emulators:exec --only firestore).
 * Zero contact with dev or prod data.
 *
 * Run:  npm run test:rules
 *
 * Coverage:
 *   - Ownership isolation: all per-user collections block cross-user reads/writes and unauthenticated access
 *   - Field validation: valid fixtures pass; invalid values and disallowed fields are rejected
 *   - affectedKeys: update attempts with fields outside the allowlist are rejected
 *   - communityAgents: intended model + open-create finding surfaced
 *   - notes / tasks / taskFlags / genreSuggestions: owner scoping, closed shapes, enum values and
 *     update allowlists — including the tasks committedDate update denial, locked as a KNOWN BUG
 *     (Tier 1 · Phase 3, 4 Aug 2026: the fix is blocked behind a todo-stream-owned artefact lock;
 *     flip that test to assertSucceeds in the same commit that appends 'committedDate' to the
 *     tasks update allowlist and amends todoNotesTasks.test.ts)
 *   - /test/connection: public read allowed, write blocked
 *   - /waitlist, /counters: hard deny
 *
 * FINDINGS:
 *   FINDING-1 (FIXED): communityAgents create/delete are now admin-only (isAdmin() UID in
 *     firestore.rules). Regular users can no longer inject agents into the shared pool; the client
 *     seed write (seedCommunityAgentsIfEmpty) no-ops for non-admin uids. Reads stay open, and the
 *     +1 contributedByCount popularity bump stays open but hard-narrowed (no other field, no jump).
 *   FINDING-2 (FIXED): resultingStatus in isValidActivity() now enforces the QueryStatus enum.
 *     Bogus values are rejected; the three flipped tests confirm this.
 */

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  deleteField,
  getDocs,
  collection,
} from 'firebase/firestore';
import { beforeAll, afterAll, afterEach, describe, it } from 'vitest';

// ─── Test environment ────────────────────────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url));
const RULES_PATH = resolve(__dirname, '../../firestore.rules');
const PROJECT_ID = 'demo-scriptally-test';

const ALICE = 'alice-uid';
const BOB   = 'bob-uid';
// MUST match the isAdmin() UID literal in firestore.rules and ADMIN_UID in src/lib/seedCommunityAgents.ts.
const ADMIN = 'r8kbaKbmguNfaoJTb9wH4BetJab2';

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync(RULES_PATH, 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

afterEach(async () => {
  await testEnv.clearFirestore();
});

// ─── Context helpers ──────────────────────────────────────────────────────────

const adminCtx   = () => testEnv.authenticatedContext(ADMIN);
const aliceCtx   = () => testEnv.authenticatedContext(ALICE);
const bobCtx     = () => testEnv.authenticatedContext(BOB);
const unauthed   = () => testEnv.unauthenticatedContext();

// Write data that bypasses rules (admin SDK path — for pre-seeding update tests)
const asAdmin = (fn: (ctx: ReturnType<typeof testEnv.unauthenticatedContext>) => Promise<void>) =>
  testEnv.withSecurityRulesDisabled(fn);

// ─── Valid fixture factories ──────────────────────────────────────────────────

const validUser = (uid = ALICE) => ({
  id: uid,
  name: 'Alice Writer',
  email: 'alice@example.com',
  plan: 'Free',
  trialStartDate: '2026-01-01T00:00:00.000Z',
  subscriptionStatus: 'trialing',
});

const validManuscript = (uid = ALICE) => ({
  id: 'ms-1',
  userId: uid,
  title: 'My Novel',
  genre: 'Literary Fiction',
  ageCategory: 'Adult',
  wordCount: 90000,
  logline: 'A story.',
  comps: [],
  status: 'Querying',
  statusChangedDate: '2026-01-01T00:00:00.000Z',
});

const validVersion = (uid = ALICE) => ({
  id: 'v-1',
  manuscriptId: 'ms-1',
  userId: uid,
  componentType: 'Query Letter',
  versionName: 'QL v1',
  fileAttached: false,
  createdDate: '2026-01-01T00:00:00.000Z',
});

const validPackage = (uid = ALICE) => ({
  id: 'pkg-1',
  manuscriptId: 'ms-1',
  userId: uid,
  packageName: 'Package A',
  queryLetterVersionId: 'v-1',
  synopsisVersionId: 'v-2',
  samplePagesVersionId: 'v-3',
  status: 'Active',
  createdDate: '2026-01-01T00:00:00.000Z',
});

const validAgent = (uid = ALICE) => ({
  id: 'agent-1',
  userId: uid,
  name: 'Sarah Latham',
  agency: 'Curtis Brown',
  email: '',
  website: '',
  genres: [],
  mswlNotes: '',
  starRating: 3,
  submissionStatus: 'Open',
  responseTimeWeeks: 12,
  noResponseMeansNo: false,
  submissionMethod: 'Email',
  materialsWanted: [],
  dateAdded: '2026-01-01T00:00:00.000Z',
  lastCheckedDate: '2026-01-01T00:00:00.000Z',
  notes: '',
});

const validQuery = (uid = ALICE) => ({
  id: 'q-1',
  userId: uid,
  manuscriptId: 'ms-1',
  agentId: 'agent-1',
  packageId: 'pkg-1',
  status: 'Queried',
  sendMethod: 'Email',
});

const validActivity = (uid = ALICE) => ({
  id: 'act-1',
  userId: uid,
  queryId: 'q-1',
  manuscriptId: 'ms-1',
  activityType: 'Status Changed',
  description: 'Status changed to Queried',
  date: '2026-01-01T00:00:00.000Z',
  details: '',
});

const validNestedActivity = () => ({
  type: 'status_change',
  createdAt: '2026-01-01T00:00:00.000Z',
  note: 'Status changed',
});

const validJournalEntry = (uid = ALICE) => ({
  id: 'je-1',
  userId: uid,
  queryId: 'q-1',
  entryText: 'This rejection hurts.',
  createdAt: '2026-01-01T00:00:00.000Z',
});

const validDismissedTask = (uid = ALICE) => ({
  id: 'dt-1',
  userId: uid,
  taskType: 'nudge_overdue',
  relatedRecordId: 'q-1',
  dismissedDate: '2026-01-01T00:00:00.000Z',
  dismissType: 'permanent',
});

// isValidUserNote uses the `== null` pattern for dueDate/doneAt, which ERRORS on an absent key —
// so the valid shape carries both keys explicitly (null when dateless), exactly as the app writes.
const validUserNote = (uid = ALICE) => ({
  id: 'note-1',
  userId: uid,
  text: 'Ring the bookshop about the launch table.',
  colour: 'sage',
  dueDate: null,
  done: false,
  doneAt: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
});

// Minimal valid UserTask — every optional field (detail, completedAt, record scope, dueDate,
// surfaceOffset, committedDate) is guarded by hasAny in the rules, so absence is fine.
const validUserTask = (uid = ALICE) => ({
  id: 'task-1',
  userId: uid,
  text: 'Follow up with the printers',
  done: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
});

const validTaskFlag = (uid = ALICE) => ({
  id: 'full_requested__q-1',
  userId: uid,
  taskType: 'full_requested',
  queryId: 'q-1',
  snoozeCount: 0,
});

const validGenreSuggestion = (uid = ALICE) => ({
  id: `${uid}__cosy-horror`,
  normalisedLabel: 'cosy-horror',
  label: 'Cosy Horror',
  userId: uid,
  createdAt: '2026-01-01T00:00:00.000Z',
});

const validCommunityAgent = () => ({
  id: 'ca-1',
  name: 'Jane Doe',
  agency: 'BigLit Agency',
  email: '',
  website: '',
  genres: [],
  mswlNotes: '',
  starRating: 3,
  submissionStatus: 'Open',
  responseTimeWeeks: 12,
  noResponseMeansNo: false,
  submissionMethod: 'Email',
  materialsWanted: [],
  dateAdded: '2026-01-01T00:00:00.000Z',
  lastCheckedDate: '2026-01-01T00:00:00.000Z',
  notes: '',
  contributedByCount: 0,
  lastVerifiedDate: '2026-01-01T00:00:00.000Z',
  dataSource: 'seed',
  communityQueryCount: 0,
});

// ─── /test/connection ─────────────────────────────────────────────────────────

describe('/test/connection', () => {
  it('allows unauthenticated read', async () => {
    const db = unauthed().firestore();
    await assertSucceeds(getDoc(doc(db, 'test', 'connection')));
  });

  it('blocks unauthenticated write', async () => {
    const db = unauthed().firestore();
    await assertFails(setDoc(doc(db, 'test', 'connection'), { ok: true }));
  });
});

// ─── /users/{userId} ──────────────────────────────────────────────────────────

describe('/users/{userId}', () => {
  it('owner can create their doc', async () => {
    const db = aliceCtx().firestore();
    await assertSucceeds(setDoc(doc(db, 'users', ALICE), validUser(ALICE)));
  });

  it('owner can read their doc', async () => {
    await asAdmin(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'users', ALICE), validUser(ALICE));
    });
    const db = aliceCtx().firestore();
    await assertSucceeds(getDoc(doc(db, 'users', ALICE)));
  });

  it('owner can delete their doc', async () => {
    await asAdmin(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'users', ALICE), validUser(ALICE));
    });
    const db = aliceCtx().firestore();
    await assertSucceeds(deleteDoc(doc(db, 'users', ALICE)));
  });

  it('owner can update allowed fields (name, onboardingComplete)', async () => {
    await asAdmin(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'users', ALICE), validUser(ALICE));
    });
    const db = aliceCtx().firestore();
    await assertSucceeds(
      updateDoc(doc(db, 'users', ALICE), {
        ...validUser(ALICE),
        name: 'Alice Updated',
        onboardingComplete: true,
      })
    );
  });

  it('owner can set onboardingComplete: false', async () => {
    await asAdmin(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'users', ALICE), validUser(ALICE));
    });
    const db = aliceCtx().firestore();
    await assertSucceeds(
      updateDoc(doc(db, 'users', ALICE), {
        ...validUser(ALICE),
        onboardingComplete: false,
      })
    );
  });

  it('rejects onboardingComplete with a non-boolean', async () => {
    const db = aliceCtx().firestore();
    await assertFails(
      setDoc(doc(db, 'users', ALICE), { ...validUser(ALICE), onboardingComplete: 'yes' })
    );
  });

  it('rejects update with a field outside the affectedKeys allowlist', async () => {
    await asAdmin(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'users', ALICE), validUser(ALICE));
    });
    const db = aliceCtx().firestore();
    // `isAdmin` is not in the allowlist — update must be rejected
    await assertFails(
      updateDoc(doc(db, 'users', ALICE), {
        ...validUser(ALICE),
        isAdmin: true,
      })
    );
  });

  // ── Smart Import entitlement subdoc: users/{uid}/private/entitlement is owner-readable but
  //    NO client can write or delete it (server/admin-SDK only). ──
  it('owner can read their entitlement subdoc', async () => {
    await asAdmin(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'users', ALICE, 'private', 'entitlement'), { smartImportFreeUsed: true });
    });
    const db = aliceCtx().firestore();
    await assertSucceeds(getDoc(doc(db, 'users', ALICE, 'private', 'entitlement')));
  });

  it('client cannot create the entitlement subdoc', async () => {
    const db = aliceCtx().firestore();
    await assertFails(setDoc(doc(db, 'users', ALICE, 'private', 'entitlement'), { smartImportFreeUsed: true }));
  });

  it('client cannot update the entitlement subdoc', async () => {
    await asAdmin(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'users', ALICE, 'private', 'entitlement'), { smartImportFreeUsed: true });
    });
    const db = aliceCtx().firestore();
    await assertFails(updateDoc(doc(db, 'users', ALICE, 'private', 'entitlement'), { smartImportFreeUsed: false }));
  });

  it('client cannot delete the entitlement subdoc (survives a user-doc delete-recreate)', async () => {
    await asAdmin(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'users', ALICE, 'private', 'entitlement'), { smartImportFreeUsed: true });
    });
    const db = aliceCtx().firestore();
    await assertFails(deleteDoc(doc(db, 'users', ALICE, 'private', 'entitlement')));
  });

  it('blocks cross-user read of the entitlement subdoc', async () => {
    await asAdmin(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'users', ALICE, 'private', 'entitlement'), { smartImportFreeUsed: true });
    });
    const db = bobCtx().firestore();
    await assertFails(getDoc(doc(db, 'users', ALICE, 'private', 'entitlement')));
  });

  it('blocks cross-user read', async () => {
    await asAdmin(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'users', ALICE), validUser(ALICE));
    });
    const db = bobCtx().firestore();
    await assertFails(getDoc(doc(db, 'users', ALICE)));
  });

  it('blocks cross-user write', async () => {
    const db = bobCtx().firestore();
    await assertFails(setDoc(doc(db, 'users', ALICE), validUser(ALICE)));
  });

  it('blocks unauthenticated read', async () => {
    await asAdmin(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'users', ALICE), validUser(ALICE));
    });
    await assertFails(getDoc(doc(unauthed().firestore(), 'users', ALICE)));
  });

  it('blocks unauthenticated write', async () => {
    await assertFails(
      setDoc(doc(unauthed().firestore(), 'users', ALICE), validUser(ALICE))
    );
  });
});

// ─── /users/{userId}/manuscripts ─────────────────────────────────────────────

describe('/users/{userId}/manuscripts', () => {
  it('owner can create a valid manuscript', async () => {
    const db = aliceCtx().firestore();
    await assertSucceeds(
      setDoc(doc(db, 'users', ALICE, 'manuscripts', 'ms-1'), validManuscript(ALICE))
    );
  });

  it('rejects manuscript with an invalid status', async () => {
    const db = aliceCtx().firestore();
    await assertFails(
      setDoc(doc(db, 'users', ALICE, 'manuscripts', 'ms-1'), {
        ...validManuscript(ALICE),
        status: 'Under Offer', // not a valid enum value
      })
    );
  });

  it('owner can list manuscripts', async () => {
    const db = aliceCtx().firestore();
    await assertSucceeds(getDocs(collection(db, 'users', ALICE, 'manuscripts')));
  });

  it('rejects update with disallowed field', async () => {
    await asAdmin(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'users', ALICE, 'manuscripts', 'ms-1'), validManuscript(ALICE));
    });
    const db = aliceCtx().firestore();
    await assertFails(
      updateDoc(doc(db, 'users', ALICE, 'manuscripts', 'ms-1'), {
        ...validManuscript(ALICE),
        userId: BOB, // userId not in affectedKeys — also breaks isValidManuscript userId check
      })
    );
  });

  it('blocks cross-user read', async () => {
    await asAdmin(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'users', ALICE, 'manuscripts', 'ms-1'), validManuscript(ALICE));
    });
    await assertFails(getDoc(doc(bobCtx().firestore(), 'users', ALICE, 'manuscripts', 'ms-1')));
  });

  it('blocks unauthenticated read', async () => {
    await asAdmin(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'users', ALICE, 'manuscripts', 'ms-1'), validManuscript(ALICE));
    });
    await assertFails(getDoc(doc(unauthed().firestore(), 'users', ALICE, 'manuscripts', 'ms-1')));
  });

  it('the notes subcollection is RETIRED — even the owner is denied, all ops (Tier 2 · Phase 6)', async () => {
    await asAdmin(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'users', ALICE, 'manuscripts', 'ms-1'), validManuscript(ALICE));
      // A legacy note, seeded rules-free — the orphaned data the retirement leaves in place.
      await setDoc(doc(ctx.firestore(), 'users', ALICE, 'manuscripts', 'ms-1', 'notes', 'n-1'), {
        text: 'a legacy jotting',
        createdAt: '2026-01-01T00:00:00.000Z',
      });
    });
    const db = aliceCtx().firestore();
    await assertFails(
      setDoc(doc(db, 'users', ALICE, 'manuscripts', 'ms-1', 'notes', 'n-2'), {
        text: 'a new jotting',
        createdAt: '2026-01-01T00:00:00.000Z',
      })
    );
    await assertFails(getDoc(doc(db, 'users', ALICE, 'manuscripts', 'ms-1', 'notes', 'n-1')));
    await assertFails(deleteDoc(doc(db, 'users', ALICE, 'manuscripts', 'ms-1', 'notes', 'n-1')));
  });
});

// ─── /users/{userId}/versions ────────────────────────────────────────────────

describe('/users/{userId}/versions', () => {
  it('owner can create a valid version', async () => {
    const db = aliceCtx().firestore();
    await assertSucceeds(
      setDoc(doc(db, 'users', ALICE, 'versions', 'v-1'), validVersion(ALICE))
    );
  });

  it('rejects version with invalid componentType', async () => {
    const db = aliceCtx().firestore();
    await assertFails(
      setDoc(doc(db, 'users', ALICE, 'versions', 'v-1'), {
        ...validVersion(ALICE),
        componentType: 'Cover Letter', // not a valid enum value
      })
    );
  });

  it('blocks cross-user write', async () => {
    await assertFails(
      setDoc(doc(bobCtx().firestore(), 'users', ALICE, 'versions', 'v-1'), validVersion(ALICE))
    );
  });

  it('blocks unauthenticated read', async () => {
    await asAdmin(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'users', ALICE, 'versions', 'v-1'), validVersion(ALICE));
    });
    await assertFails(getDoc(doc(unauthed().firestore(), 'users', ALICE, 'versions', 'v-1')));
  });
});

// ─── /users/{userId}/packages ────────────────────────────────────────────────

describe('/users/{userId}/packages', () => {
  it('owner can create a valid package', async () => {
    const db = aliceCtx().firestore();
    await assertSucceeds(
      setDoc(doc(db, 'users', ALICE, 'packages', 'pkg-1'), validPackage(ALICE))
    );
  });

  it('rejects package with invalid status', async () => {
    const db = aliceCtx().firestore();
    await assertFails(
      setDoc(doc(db, 'users', ALICE, 'packages', 'pkg-1'), {
        ...validPackage(ALICE),
        status: 'Draft', // not a valid enum value
      })
    );
  });

  it('blocks cross-user read', async () => {
    await asAdmin(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'users', ALICE, 'packages', 'pkg-1'), validPackage(ALICE));
    });
    await assertFails(getDoc(doc(bobCtx().firestore(), 'users', ALICE, 'packages', 'pkg-1')));
  });
});

// ─── /users/{userId}/agents ──────────────────────────────────────────────────

describe('/users/{userId}/agents', () => {
  it('owner can create a valid agent', async () => {
    const db = aliceCtx().firestore();
    await assertSucceeds(
      setDoc(doc(db, 'users', ALICE, 'agents', 'agent-1'), validAgent(ALICE))
    );
  });

  it('rejects agent with invalid submissionStatus', async () => {
    const db = aliceCtx().firestore();
    await assertFails(
      setDoc(doc(db, 'users', ALICE, 'agents', 'agent-1'), {
        ...validAgent(ALICE),
        submissionStatus: 'Maybe',
      })
    );
  });

  // Edit Agent · Prompt 1 — "Not set" response time (the relaxed isValidAgent rule).
  it('accepts an agent created with responseTimeWeeks ABSENT ("Not set")', async () => {
    const db = aliceCtx().firestore();
    const { responseTimeWeeks, ...noResponseTime } = validAgent(ALICE);
    await assertSucceeds(
      setDoc(doc(db, 'users', ALICE, 'agents', 'agent-1'), noResponseTime)
    );
  });

  it('accepts an update that deleteField()s responseTimeWeeks ("Not set")', async () => {
    await asAdmin(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'users', ALICE, 'agents', 'agent-1'), validAgent(ALICE));
    });
    const db = aliceCtx().firestore();
    await assertSucceeds(
      updateDoc(doc(db, 'users', ALICE, 'agents', 'agent-1'), {
        responseTimeWeeks: deleteField(),
      })
    );
  });

  it('still rejects a non-negative-int violation when responseTimeWeeks IS present', async () => {
    const db = aliceCtx().firestore();
    await assertFails(
      setDoc(doc(db, 'users', ALICE, 'agents', 'agent-1'), {
        ...validAgent(ALICE),
        responseTimeWeeks: -3,
      })
    );
  });

  it('rejects an UPDATE that sets an invalid submissionStatus', async () => {
    await asAdmin(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'users', ALICE, 'agents', 'agent-1'), validAgent(ALICE));
    });
    const db = aliceCtx().firestore();
    await assertFails(
      updateDoc(doc(db, 'users', ALICE, 'agents', 'agent-1'), {
        submissionStatus: 'Maybe',
      })
    );
  });

  it('the STRIPPED pinned flag is denied on update (off-allowlist since Tier 3+4 · Phase 9)', async () => {
    await asAdmin(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'users', ALICE, 'agents', 'agent-1'), validAgent(ALICE));
    });
    const db = aliceCtx().firestore();
    await assertFails(
      updateDoc(doc(db, 'users', ALICE, 'agents', 'agent-1'), { pinned: true })
    );
  });

  it('rejects agent with invalid requeryPreference', async () => {
    const db = aliceCtx().firestore();
    await assertFails(
      setDoc(doc(db, 'users', ALICE, 'agents', 'agent-1'), {
        ...validAgent(ALICE),
        requeryPreference: 'never',
      })
    );
  });

  it('owner can update allowed fields', async () => {
    await asAdmin(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'users', ALICE, 'agents', 'agent-1'), validAgent(ALICE));
    });
    const db = aliceCtx().firestore();
    await assertSucceeds(
      updateDoc(doc(db, 'users', ALICE, 'agents', 'agent-1'), {
        ...validAgent(ALICE),
        notes: 'Great agent.',
        starRating: 5,
      })
    );
  });

  it('rejects update that changes userId (not in affectedKeys)', async () => {
    await asAdmin(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'users', ALICE, 'agents', 'agent-1'), validAgent(ALICE));
    });
    const db = aliceCtx().firestore();
    // `userId` is not in the agent update affectedKeys list
    await assertFails(
      updateDoc(doc(db, 'users', ALICE, 'agents', 'agent-1'), {
        ...validAgent(ALICE),
        userId: BOB,
      })
    );
  });

  it('blocks cross-user read', async () => {
    await asAdmin(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'users', ALICE, 'agents', 'agent-1'), validAgent(ALICE));
    });
    await assertFails(getDoc(doc(bobCtx().firestore(), 'users', ALICE, 'agents', 'agent-1')));
  });

  it('blocks unauthenticated write', async () => {
    await assertFails(
      setDoc(doc(unauthed().firestore(), 'users', ALICE, 'agents', 'agent-1'), validAgent(ALICE))
    );
  });
});

// ─── /users/{userId}/queries ─────────────────────────────────────────────────

describe('/users/{userId}/queries', () => {
  it('owner can create a valid query', async () => {
    const db = aliceCtx().firestore();
    await assertSucceeds(
      setDoc(doc(db, 'users', ALICE, 'queries', 'q-1'), validQuery(ALICE))
    );
  });

  it('rejects query with camelCase status (enum must be exact)', async () => {
    const db = aliceCtx().firestore();
    await assertFails(
      setDoc(doc(db, 'users', ALICE, 'queries', 'q-1'), {
        ...validQuery(ALICE),
        status: 'partialRequested', // camelCase — should be 'Partial Requested'
      })
    );
  });

  it('rejects query with invalid sendMethod', async () => {
    const db = aliceCtx().firestore();
    await assertFails(
      setDoc(doc(db, 'users', ALICE, 'queries', 'q-1'), {
        ...validQuery(ALICE),
        sendMethod: 'Fax',
      })
    );
  });

  it('owner can update rejectedDate as an ISO string (the derived close-by-rejection date)', async () => {
    await asAdmin(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'users', ALICE, 'queries', 'q-1'), validQuery(ALICE));
    });
    const db = aliceCtx().firestore();
    await assertSucceeds(
      updateDoc(doc(db, 'users', ALICE, 'queries', 'q-1'), { rejectedDate: '2026-03-01T10:00:00.000Z' })
    );
  });

  it('rejects a non-string rejectedDate', async () => {
    await asAdmin(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'users', ALICE, 'queries', 'q-1'), validQuery(ALICE));
    });
    const db = aliceCtx().firestore();
    await assertFails(
      updateDoc(doc(db, 'users', ALICE, 'queries', 'q-1'), { rejectedDate: 42 })
    );
  });

  it('owner can update query status', async () => {
    await asAdmin(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'users', ALICE, 'queries', 'q-1'), validQuery(ALICE));
    });
    const db = aliceCtx().firestore();
    await assertSucceeds(
      updateDoc(doc(db, 'users', ALICE, 'queries', 'q-1'), {
        ...validQuery(ALICE),
        status: 'Full Requested',
      })
    );
  });

  it('blocks cross-user read', async () => {
    await asAdmin(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'users', ALICE, 'queries', 'q-1'), validQuery(ALICE));
    });
    await assertFails(getDoc(doc(bobCtx().firestore(), 'users', ALICE, 'queries', 'q-1')));
  });

  it('blocks unauthenticated read', async () => {
    await asAdmin(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'users', ALICE, 'queries', 'q-1'), validQuery(ALICE));
    });
    await assertFails(getDoc(doc(unauthed().firestore(), 'users', ALICE, 'queries', 'q-1')));
  });

  describe('/queries/{queryId}/activity (nested)', () => {
    it('owner can create nested activity', async () => {
      const db = aliceCtx().firestore();
      await assertSucceeds(
        setDoc(
          doc(db, 'users', ALICE, 'queries', 'q-1', 'activity', 'act-nested-1'),
          validNestedActivity()
        )
      );
    });

    it('blocks cross-user nested activity read', async () => {
      await asAdmin(async (ctx) => {
        await setDoc(
          doc(ctx.firestore(), 'users', ALICE, 'queries', 'q-1', 'activity', 'act-nested-1'),
          validNestedActivity()
        );
      });
      await assertFails(
        getDoc(doc(bobCtx().firestore(), 'users', ALICE, 'queries', 'q-1', 'activity', 'act-nested-1'))
      );
    });
  });
});

// ─── /users/{userId}/activities ──────────────────────────────────────────────

describe('/users/{userId}/activities', () => {
  it('owner can create a valid activity', async () => {
    const db = aliceCtx().firestore();
    await assertSucceeds(
      setDoc(doc(db, 'users', ALICE, 'activities', 'act-1'), validActivity(ALICE))
    );
  });

  it('rejects activity with invalid activityType', async () => {
    const db = aliceCtx().firestore();
    await assertFails(
      setDoc(doc(db, 'users', ALICE, 'activities', 'act-1'), {
        ...validActivity(ALICE),
        activityType: 'Email Sent', // not a valid enum value
      })
    );
  });

  it('owner can update allowed activity fields', async () => {
    await asAdmin(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'users', ALICE, 'activities', 'act-1'), validActivity(ALICE));
    });
    const db = aliceCtx().firestore();
    await assertSucceeds(
      updateDoc(doc(db, 'users', ALICE, 'activities', 'act-1'), {
        ...validActivity(ALICE),
        description: 'Updated description',
      })
    );
  });

  it('rejects activity update with a bogus resultingStatus (enum enforced — FINDING-2 fixed)', async () => {
    await asAdmin(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'users', ALICE, 'activities', 'act-1'), validActivity(ALICE));
    });
    const db = aliceCtx().firestore();
    await assertFails(
      updateDoc(doc(db, 'users', ALICE, 'activities', 'act-1'), {
        ...validActivity(ALICE),
        resultingStatus: 'not-a-real-status',
      })
    );
  });

  it('accepts activity update with a valid resultingStatus enum value', async () => {
    await asAdmin(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'users', ALICE, 'activities', 'act-1'), validActivity(ALICE));
    });
    const db = aliceCtx().firestore();
    await assertSucceeds(
      updateDoc(doc(db, 'users', ALICE, 'activities', 'act-1'), {
        ...validActivity(ALICE),
        resultingStatus: 'Queried',
      })
    );
  });

  it('accepts activity update with resultingStatus: "Revise & Resubmit" (ampersand in enum)', async () => {
    await asAdmin(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'users', ALICE, 'activities', 'act-1'), validActivity(ALICE));
    });
    const db = aliceCtx().firestore();
    await assertSucceeds(
      updateDoc(doc(db, 'users', ALICE, 'activities', 'act-1'), {
        ...validActivity(ALICE),
        resultingStatus: 'Revise & Resubmit',
      })
    );
  });

  it('rejects activity update with field outside affectedKeys allowlist', async () => {
    await asAdmin(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'users', ALICE, 'activities', 'act-1'), validActivity(ALICE));
    });
    const db = aliceCtx().firestore();
    await assertFails(
      updateDoc(doc(db, 'users', ALICE, 'activities', 'act-1'), {
        ...validActivity(ALICE),
        secretField: 'injected',
      })
    );
  });

  it('blocks cross-user read', async () => {
    await asAdmin(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'users', ALICE, 'activities', 'act-1'), validActivity(ALICE));
    });
    await assertFails(getDoc(doc(bobCtx().firestore(), 'users', ALICE, 'activities', 'act-1')));
  });

  it('blocks unauthenticated write', async () => {
    await assertFails(
      setDoc(doc(unauthed().firestore(), 'users', ALICE, 'activities', 'act-1'), validActivity(ALICE))
    );
  });
});

// ─── /users/{userId}/activity (RETIRED legacy store — Tier 3 · Phase 7) ──────

describe('/users/{userId}/activity (retired legacy store)', () => {
  const legacyDoc = () => ({
    type: 'status_change',
    createdAt: '2026-01-01T00:00:00.000Z',
    note: 'Status changed',
  });

  it('the store is retired — even the OWNER is denied, all ops (default-deny)', async () => {
    await asAdmin(async (ctx) => {
      // A legacy row, seeded rules-free — the orphaned data the retirement leaves in place.
      await setDoc(doc(ctx.firestore(), 'users', ALICE, 'activity', 'tl-1'), legacyDoc());
    });
    const db = aliceCtx().firestore();
    await assertFails(setDoc(doc(db, 'users', ALICE, 'activity', 'tl-2'), legacyDoc()));
    await assertFails(getDoc(doc(db, 'users', ALICE, 'activity', 'tl-1')));
    await assertFails(deleteDoc(doc(db, 'users', ALICE, 'activity', 'tl-1')));
  });

  it('cross-user and unauthenticated access stay denied too', async () => {
    await assertFails(
      setDoc(doc(bobCtx().firestore(), 'users', ALICE, 'activity', 'tl-1'), legacyDoc())
    );
    await assertFails(getDoc(doc(unauthed().firestore(), 'users', ALICE, 'activity', 'tl-1')));
  });
});

// ─── /users/{userId}/journalEntries ──────────────────────────────────────────

describe('/users/{userId}/journalEntries', () => {
  it('owner can create a valid journal entry', async () => {
    const db = aliceCtx().firestore();
    await assertSucceeds(
      setDoc(doc(db, 'users', ALICE, 'journalEntries', 'je-1'), validJournalEntry(ALICE))
    );
  });

  it('rejects journal entry with empty entryText', async () => {
    const db = aliceCtx().firestore();
    await assertFails(
      setDoc(doc(db, 'users', ALICE, 'journalEntries', 'je-1'), {
        ...validJournalEntry(ALICE),
        entryText: '', // minimum 1 char
      })
    );
  });

  it('blocks cross-user read', async () => {
    await asAdmin(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'users', ALICE, 'journalEntries', 'je-1'), validJournalEntry(ALICE));
    });
    await assertFails(getDoc(doc(bobCtx().firestore(), 'users', ALICE, 'journalEntries', 'je-1')));
  });
});

// ─── /users/{userId}/dismissedTasks ─────────────────────────────────────────

describe('/users/{userId}/dismissedTasks', () => {
  it('owner can create a valid dismissed task', async () => {
    const db = aliceCtx().firestore();
    await assertSucceeds(
      setDoc(doc(db, 'users', ALICE, 'dismissedTasks', 'dt-1'), validDismissedTask(ALICE))
    );
  });

  it('rejects dismissedTask with invalid dismissType', async () => {
    const db = aliceCtx().firestore();
    await assertFails(
      setDoc(doc(db, 'users', ALICE, 'dismissedTasks', 'dt-1'), {
        ...validDismissedTask(ALICE),
        dismissType: 'ignore', // not a valid enum value
      })
    );
  });

  it('blocks cross-user write', async () => {
    await assertFails(
      setDoc(doc(bobCtx().firestore(), 'users', ALICE, 'dismissedTasks', 'dt-1'), validDismissedTask(ALICE))
    );
  });
});

// ─── /users/{userId}/notes (desk notes / dated tasks) ───────────────────────

describe('/users/{userId}/notes', () => {
  it('owner can create a valid note (dueDate/doneAt present as null — the app always writes them)', async () => {
    const db = aliceCtx().firestore();
    await assertSucceeds(setDoc(doc(db, 'users', ALICE, 'notes', 'note-1'), validUserNote(ALICE)));
  });

  it('rejects a note with an invalid colour (enum is pink | sage | yellow)', async () => {
    const db = aliceCtx().firestore();
    await assertFails(
      setDoc(doc(db, 'users', ALICE, 'notes', 'note-1'), { ...validUserNote(ALICE), colour: 'butter' })
    );
  });

  it('rejects a note with a field outside the closed shape', async () => {
    const db = aliceCtx().firestore();
    await assertFails(
      setDoc(doc(db, 'users', ALICE, 'notes', 'note-1'), { ...validUserNote(ALICE), pinned: true })
    );
  });

  it('a create MISSING the dueDate key is denied — the `== null` pattern needs the key present', async () => {
    // Documents the sharp edge (see isValidUserTask's completedAt comment in firestore.rules):
    // rules error on absent-key access, so the app writes dueDate: null for dateless notes.
    const db = aliceCtx().firestore();
    const { dueDate, ...missingDueDate } = validUserNote(ALICE);
    await assertFails(setDoc(doc(db, 'users', ALICE, 'notes', 'note-1'), missingDueDate));
  });

  it('owner can update allowlisted fields (text · done · doneAt · updatedAt)', async () => {
    await asAdmin(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'users', ALICE, 'notes', 'note-1'), validUserNote(ALICE));
    });
    const db = aliceCtx().firestore();
    await assertSucceeds(
      updateDoc(doc(db, 'users', ALICE, 'notes', 'note-1'), {
        text: 'Ring the bookshop — table confirmed.',
        done: true,
        doneAt: '2026-01-02T09:00:00.000Z',
        updatedAt: '2026-01-02T09:00:00.000Z',
      })
    );
  });

  it('rejects an update touching createdAt (outside the update allowlist)', async () => {
    await asAdmin(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'users', ALICE, 'notes', 'note-1'), validUserNote(ALICE));
    });
    const db = aliceCtx().firestore();
    await assertFails(
      updateDoc(doc(db, 'users', ALICE, 'notes', 'note-1'), { createdAt: '2020-01-01T00:00:00.000Z' })
    );
  });

  it('owner can list their notes', async () => {
    await assertSucceeds(getDocs(collection(aliceCtx().firestore(), 'users', ALICE, 'notes')));
  });

  it('blocks cross-user read', async () => {
    await asAdmin(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'users', ALICE, 'notes', 'note-1'), validUserNote(ALICE));
    });
    await assertFails(getDoc(doc(bobCtx().firestore(), 'users', ALICE, 'notes', 'note-1')));
  });

  it('blocks unauthenticated write', async () => {
    await assertFails(
      setDoc(doc(unauthed().firestore(), 'users', ALICE, 'notes', 'note-1'), validUserNote(ALICE))
    );
  });
});

// ─── /users/{userId}/tasks (UserTask — the canonical stored to-do object) ───

describe('/users/{userId}/tasks', () => {
  it('owner can create a valid minimal task', async () => {
    const db = aliceCtx().firestore();
    await assertSucceeds(setDoc(doc(db, 'users', ALICE, 'tasks', 'task-1'), validUserTask(ALICE)));
  });

  it('owner can create a task WITH dueDate, surfaceOffset and committedDate (all in the create shape)', async () => {
    const db = aliceCtx().firestore();
    await assertSucceeds(
      setDoc(doc(db, 'users', ALICE, 'tasks', 'task-1'), {
        ...validUserTask(ALICE),
        dueDate: '2026-02-14',
        surfaceOffset: 'day-before',
        committedDate: '2026-02-13',
      })
    );
  });

  it('rejects a create with an invalid surfaceOffset (enum is on-day | day-before | week-before)', async () => {
    const db = aliceCtx().firestore();
    await assertFails(
      setDoc(doc(db, 'users', ALICE, 'tasks', 'task-1'), { ...validUserTask(ALICE), surfaceOffset: 'fortnight-before' })
    );
  });

  it('rejects a create with a non-string committedDate', async () => {
    const db = aliceCtx().firestore();
    await assertFails(
      setDoc(doc(db, 'users', ALICE, 'tasks', 'task-1'), { ...validUserTask(ALICE), committedDate: 42 })
    );
  });

  it('rejects a create with a field outside the closed shape', async () => {
    const db = aliceCtx().firestore();
    await assertFails(
      setDoc(doc(db, 'users', ALICE, 'tasks', 'task-1'), { ...validUserTask(ALICE), priority: 'high' })
    );
  });

  it('owner can update allowlisted fields (text · done · completedAt · updatedAt)', async () => {
    await asAdmin(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'users', ALICE, 'tasks', 'task-1'), validUserTask(ALICE));
    });
    const db = aliceCtx().firestore();
    await assertSucceeds(
      updateDoc(doc(db, 'users', ALICE, 'tasks', 'task-1'), {
        text: 'Printers chased.',
        done: true,
        completedAt: '2026-01-03T12:00:00.000Z',
        updatedAt: '2026-01-03T12:00:00.000Z',
      })
    );
  });

  it('rejects an update touching queryId (record scope is create-only input)', async () => {
    await asAdmin(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'users', ALICE, 'tasks', 'task-1'), validUserTask(ALICE));
    });
    const db = aliceCtx().firestore();
    await assertFails(
      updateDoc(doc(db, 'users', ALICE, 'tasks', 'task-1'), { queryId: 'q-9' })
    );
  });

  /**
   * ⚠️ KNOWN BUG, locked deliberately (Tier 1 · Phase 3, 4 Aug 2026).
   *
   * committedDate IS client-updated post-create — Today's-list commit/uncommit (ToDoPage
   * toggleToday) and FocusFlow's Monday seeding both route through db.tsx updateUserTask — but
   * the tasks update allowlist omits it, so every such write is silently denied (updateUserTask
   * swallows the error; the optimistic patch rolls back on the next snapshot).
   *
   * The one-line fix (append 'committedDate' to the hasOnly list) is blocked for this stream:
   * todoNotesTasks.test.ts pins the exact list string and src/components/todo/** is out of
   * scope. FLIP THIS TEST to assertSucceeds in the same commit that lands both halves.
   */
  it('[KNOWN BUG] a Today\'s-list commit — update {committedDate, updatedAt} — is DENIED by the allowlist', async () => {
    await asAdmin(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'users', ALICE, 'tasks', 'task-1'), validUserTask(ALICE));
    });
    const db = aliceCtx().firestore();
    await assertFails(
      updateDoc(doc(db, 'users', ALICE, 'tasks', 'task-1'), {
        committedDate: '2026-08-04',
        updatedAt: '2026-08-04T10:00:00.000Z',
      })
    );
  });

  it('blocks cross-user read', async () => {
    await asAdmin(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'users', ALICE, 'tasks', 'task-1'), validUserTask(ALICE));
    });
    await assertFails(getDoc(doc(bobCtx().firestore(), 'users', ALICE, 'tasks', 'task-1')));
  });

  it('blocks unauthenticated write', async () => {
    await assertFails(
      setDoc(doc(unauthed().firestore(), 'users', ALICE, 'tasks', 'task-1'), validUserTask(ALICE))
    );
  });
});

// ─── /users/{userId}/taskFlags (stances on derived tasks) ───────────────────

describe('/users/{userId}/taskFlags', () => {
  it('owner can create a valid flag', async () => {
    const db = aliceCtx().firestore();
    await assertSucceeds(
      setDoc(doc(db, 'users', ALICE, 'taskFlags', 'full_requested__q-1'), validTaskFlag(ALICE))
    );
  });

  it('rejects a flag with a field outside the closed shape', async () => {
    const db = aliceCtx().firestore();
    await assertFails(
      setDoc(doc(db, 'users', ALICE, 'taskFlags', 'full_requested__q-1'), { ...validTaskFlag(ALICE), sneaky: true })
    );
  });

  it('rejects a negative snoozeCount', async () => {
    const db = aliceCtx().firestore();
    await assertFails(
      setDoc(doc(db, 'users', ALICE, 'taskFlags', 'full_requested__q-1'), { ...validTaskFlag(ALICE), snoozeCount: -1 })
    );
  });

  it('rejects a committedDate over 16 chars (date-only strings, never datetimes)', async () => {
    const db = aliceCtx().firestore();
    await assertFails(
      setDoc(doc(db, 'users', ALICE, 'taskFlags', 'full_requested__q-1'), {
        ...validTaskFlag(ALICE),
        committedDate: '2026-08-04T10:00:00.000Z', // 24 chars — the field is "YYYY-MM-DD"
      })
    );
  });

  it('owner can full-overwrite with committedDate — the upsert path derived tasks commit through', async () => {
    // Contrast with the tasks suite's KNOWN BUG: derived-task Today commits go through
    // upsertTaskFlag's whole-doc setDoc, whose closed shape includes committedDate — so THIS
    // path works today while the stored-task update path is denied.
    await asAdmin(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'users', ALICE, 'taskFlags', 'full_requested__q-1'), validTaskFlag(ALICE));
    });
    const db = aliceCtx().firestore();
    await assertSucceeds(
      setDoc(doc(db, 'users', ALICE, 'taskFlags', 'full_requested__q-1'), {
        ...validTaskFlag(ALICE),
        committedDate: '2026-08-04',
      })
    );
  });

  it('owner can list and delete their flags', async () => {
    await asAdmin(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'users', ALICE, 'taskFlags', 'full_requested__q-1'), validTaskFlag(ALICE));
    });
    const db = aliceCtx().firestore();
    await assertSucceeds(getDocs(collection(db, 'users', ALICE, 'taskFlags')));
    await assertSucceeds(deleteDoc(doc(db, 'users', ALICE, 'taskFlags', 'full_requested__q-1')));
  });

  it('blocks cross-user write', async () => {
    await assertFails(
      setDoc(doc(bobCtx().firestore(), 'users', ALICE, 'taskFlags', 'full_requested__q-1'), validTaskFlag(ALICE))
    );
  });

  it('blocks unauthenticated read', async () => {
    await asAdmin(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'users', ALICE, 'taskFlags', 'full_requested__q-1'), validTaskFlag(ALICE));
    });
    await assertFails(getDoc(doc(unauthed().firestore(), 'users', ALICE, 'taskFlags', 'full_requested__q-1')));
  });
});

// ─── /communityAgents ────────────────────────────────────────────────────────

describe('/communityAgents', () => {
  it('signed-in user can read community agents', async () => {
    await asAdmin(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'communityAgents', 'ca-1'), validCommunityAgent());
    });
    await assertSucceeds(getDoc(doc(aliceCtx().firestore(), 'communityAgents', 'ca-1')));
  });

  it('signed-in user can list community agents', async () => {
    await assertSucceeds(getDocs(collection(aliceCtx().firestore(), 'communityAgents')));
  });

  /**
   * FINDING-1 (FIXED): communityAgents.create is now admin-only. A regular signed-in user can no
   * longer inject agents into the shared pool; only the admin UID may create. Reads stay open so
   * everyone's Discover list still works, and the +1 contributedByCount bump stays open (below).
   */
  it('[FINDING-1] regular signed-in user CANNOT create a community agent (admin-only)', async () => {
    await assertFails(
      setDoc(doc(aliceCtx().firestore(), 'communityAgents', 'ca-1'), validCommunityAgent())
    );
  });

  it('[FINDING-1] admin user CAN create a community agent', async () => {
    await assertSucceeds(
      setDoc(doc(adminCtx().firestore(), 'communityAgents', 'ca-1'), validCommunityAgent())
    );
  });

  it('[FINDING-1] regular user can still READ the pool after the lock', async () => {
    await asAdmin(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'communityAgents', 'ca-1'), validCommunityAgent());
    });
    await assertSucceeds(getDoc(doc(aliceCtx().firestore(), 'communityAgents', 'ca-1')));
  });

  it('blocks unauthenticated create (defence in depth)', async () => {
    await assertFails(
      setDoc(doc(unauthed().firestore(), 'communityAgents', 'ca-1'), validCommunityAgent())
    );
  });

  it('regular signed-in user can increment contributedByCount by exactly 1 (popularity bump kept)', async () => {
    await asAdmin(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'communityAgents', 'ca-1'), validCommunityAgent());
    });
    await assertSucceeds(
      updateDoc(doc(aliceCtx().firestore(), 'communityAgents', 'ca-1'), {
        contributedByCount: 1,
      })
    );
  });

  it('blocks regular user from incrementing contributedByCount by more than 1', async () => {
    await asAdmin(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'communityAgents', 'ca-1'), validCommunityAgent());
    });
    await assertFails(
      updateDoc(doc(aliceCtx().firestore(), 'communityAgents', 'ca-1'), {
        contributedByCount: 5, // +5 — only +1 is allowed
      })
    );
  });

  it('blocks regular user from setting an arbitrary contributedByCount', async () => {
    await asAdmin(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'communityAgents', 'ca-1'), {
        ...validCommunityAgent(),
        contributedByCount: 10,
      });
    });
    await assertFails(
      updateDoc(doc(aliceCtx().firestore(), 'communityAgents', 'ca-1'), {
        contributedByCount: 9999, // arbitrary jump — must be rejected
      })
    );
  });

  it('blocks signed-in user from decrementing contributedByCount', async () => {
    await asAdmin(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'communityAgents', 'ca-1'), {
        ...validCommunityAgent(),
        contributedByCount: 5,
      });
    });
    await assertFails(
      updateDoc(doc(aliceCtx().firestore(), 'communityAgents', 'ca-1'), {
        contributedByCount: 4, // decrement — must be rejected
      })
    );
  });

  it('blocks signed-in user from updating any field other than contributedByCount', async () => {
    await asAdmin(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'communityAgents', 'ca-1'), validCommunityAgent());
    });
    await assertFails(
      updateDoc(doc(aliceCtx().firestore(), 'communityAgents', 'ca-1'), {
        name: 'Replaced Name', // only contributedByCount updates are allowed
      })
    );
  });

  it('blocks signed-in user from bumping count AND editing another field together', async () => {
    await asAdmin(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'communityAgents', 'ca-1'), validCommunityAgent());
    });
    await assertFails(
      updateDoc(doc(aliceCtx().firestore(), 'communityAgents', 'ca-1'), {
        contributedByCount: 1,
        name: 'Sneaky Edit', // piggy-backing another field onto the +1 — must be rejected
      })
    );
  });

  it('blocks regular signed-in user from deleting a community agent (admin-only)', async () => {
    await asAdmin(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'communityAgents', 'ca-1'), validCommunityAgent());
    });
    await assertFails(
      deleteDoc(doc(aliceCtx().firestore(), 'communityAgents', 'ca-1'))
    );
  });

  it('admin user CAN delete a community agent', async () => {
    await asAdmin(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'communityAgents', 'ca-1'), validCommunityAgent());
    });
    await assertSucceeds(
      deleteDoc(doc(adminCtx().firestore(), 'communityAgents', 'ca-1'))
    );
  });

  it('blocks unauthenticated read', async () => {
    await asAdmin(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'communityAgents', 'ca-1'), validCommunityAgent());
    });
    await assertFails(getDoc(doc(unauthed().firestore(), 'communityAgents', 'ca-1')));
  });
});

// ─── /genreSuggestions (taxonomy promotion queue) ────────────────────────────

describe('/genreSuggestions', () => {
  it('signed-in user can create their OWN suggestion', async () => {
    await assertSucceeds(
      setDoc(doc(aliceCtx().firestore(), 'genreSuggestions', `${ALICE}__cosy-horror`), validGenreSuggestion(ALICE))
    );
  });

  it("rejects a suggestion carrying someone else's userId", async () => {
    await assertFails(
      setDoc(doc(aliceCtx().firestore(), 'genreSuggestions', `${ALICE}__cosy-horror`), {
        ...validGenreSuggestion(ALICE),
        userId: BOB,
      })
    );
  });

  it('rejects a suggestion with a field outside the closed shape', async () => {
    await assertFails(
      setDoc(doc(aliceCtx().firestore(), 'genreSuggestions', `${ALICE}__cosy-horror`), {
        ...validGenreSuggestion(ALICE),
        source: 'app',
      })
    );
  });

  it('rejects a label over 64 chars', async () => {
    await assertFails(
      setDoc(doc(aliceCtx().firestore(), 'genreSuggestions', `${ALICE}__cosy-horror`), {
        ...validGenreSuggestion(ALICE),
        label: 'x'.repeat(65),
      })
    );
  });

  it('the creator CANNOT read their own suggestion back (reads are admin-only — privacy)', async () => {
    await asAdmin(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'genreSuggestions', `${ALICE}__cosy-horror`), validGenreSuggestion(ALICE));
    });
    await assertFails(getDoc(doc(aliceCtx().firestore(), 'genreSuggestions', `${ALICE}__cosy-horror`)));
  });

  it('admin CAN read the queue', async () => {
    await asAdmin(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'genreSuggestions', `${ALICE}__cosy-horror`), validGenreSuggestion(ALICE));
    });
    await assertSucceeds(getDoc(doc(adminCtx().firestore(), 'genreSuggestions', `${ALICE}__cosy-horror`)));
  });

  it('non-admin cannot update or delete; admin can delete (promote/dismiss)', async () => {
    await asAdmin(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'genreSuggestions', `${ALICE}__cosy-horror`), validGenreSuggestion(ALICE));
    });
    await assertFails(
      updateDoc(doc(aliceCtx().firestore(), 'genreSuggestions', `${ALICE}__cosy-horror`), { label: 'Cosier Horror' })
    );
    await assertFails(deleteDoc(doc(aliceCtx().firestore(), 'genreSuggestions', `${ALICE}__cosy-horror`)));
    await assertSucceeds(deleteDoc(doc(adminCtx().firestore(), 'genreSuggestions', `${ALICE}__cosy-horror`)));
  });

  it('blocks unauthenticated create', async () => {
    await assertFails(
      setDoc(doc(unauthed().firestore(), 'genreSuggestions', `${ALICE}__cosy-horror`), validGenreSuggestion(ALICE))
    );
  });
});

// ─── /waitlist and /counters (hard deny) ─────────────────────────────────────

describe('/waitlist and /counters', () => {
  it('signed-in user cannot read from /waitlist', async () => {
    await assertFails(getDoc(doc(aliceCtx().firestore(), 'waitlist', 'entry-1')));
  });

  it('signed-in user cannot write to /waitlist', async () => {
    await assertFails(
      setDoc(doc(aliceCtx().firestore(), 'waitlist', 'entry-1'), { email: 'x@example.com' })
    );
  });

  it('signed-in user cannot read from /counters', async () => {
    await assertFails(getDoc(doc(aliceCtx().firestore(), 'counters', 'stats')));
  });

  it('signed-in user cannot write to /counters', async () => {
    await assertFails(
      setDoc(doc(aliceCtx().firestore(), 'counters', 'stats'), { total: 99 })
    );
  });

  it('unauthenticated user cannot read from /waitlist', async () => {
    await assertFails(getDoc(doc(unauthed().firestore(), 'waitlist', 'entry-1')));
  });

  it('unauthenticated user cannot write to /counters', async () => {
    await assertFails(
      setDoc(doc(unauthed().firestore(), 'counters', 'stats'), { total: 0 })
    );
  });
});
