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
 *   - /test/connection: public read allowed, write blocked
 *   - /waitlist, /counters: hard deny
 *
 * FINDINGS surfaced in comments where rules confirm a security concern:
 *   FINDING-1: communityAgents.create is open to any signed-in user (known, documented in rules)
 *   FINDING-2: activities.update allows resultingStatus with no type validation
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
  comparableTitles: '',
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

  /**
   * FINDING-2: resultingStatus is in the activities update affectedKeys allowlist but is absent
   * from isValidActivity(). Any value — even a nonsense string — passes the update rule.
   * Impact: malformed resultingStatus values won't be caught server-side; recomputeQuery
   * ignores them, but the data quality gap is a latent correctness risk.
   * Fix: add `(!data.keys().hasAny(['resultingStatus']) || data.resultingStatus is string &&
   *       data.resultingStatus.size() <= 64)` (or an enum check) to isValidActivity().
   */
  it('[FINDING-2] activities update accepts resultingStatus with any value (no type validation)', async () => {
    await asAdmin(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'users', ALICE, 'activities', 'act-1'), validActivity(ALICE));
    });
    const db = aliceCtx().firestore();
    // This SHOULD succeed — confirming the unvalidated field passes through
    await assertSucceeds(
      updateDoc(doc(db, 'users', ALICE, 'activities', 'act-1'), {
        ...validActivity(ALICE),
        resultingStatus: 'not-a-real-status',
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

// ─── /users/{userId}/activity (top-level sync log) ───────────────────────────

describe('/users/{userId}/activity (top-level sync)', () => {
  const validTopLevel = () => ({
    type: 'status_change',
    createdAt: '2026-01-01T00:00:00.000Z',
    note: 'Status changed',
  });

  it('owner can create top-level activity', async () => {
    const db = aliceCtx().firestore();
    await assertSucceeds(
      setDoc(doc(db, 'users', ALICE, 'activity', 'tl-1'), validTopLevel())
    );
  });

  it('blocks cross-user write', async () => {
    await assertFails(
      setDoc(doc(bobCtx().firestore(), 'users', ALICE, 'activity', 'tl-1'), validTopLevel())
    );
  });

  it('blocks unauthenticated read', async () => {
    await asAdmin(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'users', ALICE, 'activity', 'tl-1'), validTopLevel());
    });
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
   * FINDING-1: communityAgents.create is open to ANY signed-in user.
   * The rules comment acknowledges this: seeding is currently client-side (seedCommunityAgentsIfEmpty).
   * Confirmed here: a regular user can create a community agent with a valid payload.
   * Impact: any authenticated user can inject arbitrary agents into the shared community pool.
   * Fix: move seeding to an Admin SDK script or Cloud Function, then change create rule to `if false`.
   */
  it('[FINDING-1] any signed-in user can create a community agent (open create — known concern)', async () => {
    await assertSucceeds(
      setDoc(doc(aliceCtx().firestore(), 'communityAgents', 'ca-1'), validCommunityAgent())
    );
  });

  it('signed-in user can increment contributedByCount by exactly 1', async () => {
    await asAdmin(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'communityAgents', 'ca-1'), validCommunityAgent());
    });
    await assertSucceeds(
      updateDoc(doc(aliceCtx().firestore(), 'communityAgents', 'ca-1'), {
        contributedByCount: 1,
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

  it('blocks signed-in user from updating community agent name', async () => {
    await asAdmin(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'communityAgents', 'ca-1'), validCommunityAgent());
    });
    await assertFails(
      updateDoc(doc(aliceCtx().firestore(), 'communityAgents', 'ca-1'), {
        name: 'Replaced Name', // only contributedByCount updates are allowed
      })
    );
  });

  it('blocks signed-in user from deleting a community agent', async () => {
    await asAdmin(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'communityAgents', 'ca-1'), validCommunityAgent());
    });
    await assertFails(
      deleteDoc(doc(aliceCtx().firestore(), 'communityAgents', 'ca-1'))
    );
  });

  it('blocks unauthenticated read', async () => {
    await asAdmin(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'communityAgents', 'ca-1'), validCommunityAgent());
    });
    await assertFails(getDoc(doc(unauthed().firestore(), 'communityAgents', 'ca-1')));
  });

  it('blocks unauthenticated create', async () => {
    await assertFails(
      setDoc(doc(unauthed().firestore(), 'communityAgents', 'ca-1'), validCommunityAgent())
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
