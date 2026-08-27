/**
 * Cloud Storage Security Rules — integration tests.
 *
 * Runs entirely against the local Storage emulator (firebase emulators:exec --only firestore,storage).
 * Zero contact with dev or prod data.
 *
 * Run:  npm run test:rules
 *
 * ⚠️ THESE CANNOT BE RUN ON THE AUTHOR'S MACHINE AND HAVE NOT BEEN PROVED RED THERE. The emulator
 * is a JVM jar and there is no JRE here, so `npm run test:rules` dies before it starts — which is
 * equally true of the Firestore rules suite beside this one, and always has been. CI is the first
 * and only place either executes.
 *
 * ⚠️ SO A GREEN FIRST RUN IS SUSPECT, NOT REASSURING. A rule that passes without ever having failed
 * has been assumed, not tested. The mutation for each case is written at the case: apply it to
 * storage.rules, watch that one case go green, revert. Until someone has done that, these are
 * "written to be red", which is a weaker claim than "proved red" and should be reported as such.
 *
 * Coverage:
 *   - a valid file for its owner                → ALLOWED
 *   - 26 MB                                     → DENIED (cap is 25 MB)
 *   - a content type outside the allowlist      → DENIED
 *   - another user's path                       → DENIED
 *   - unauthenticated                           → DENIED
 *   - delete by the owner                       → ALLOWED  (the request.resource-is-null trap)
 *   - a path outside the attachments tree       → DENIED  (the terminal deny clause)
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
import { beforeAll, afterAll, afterEach, describe, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const RULES_PATH = resolve(__dirname, '../../storage.rules');
const PROJECT_ID = 'demo-scriptally-test';

const ALICE = 'alice-uid';
const BOB = 'bob-uid';
const MS = 'ms-1';

/** Where Alice's files legitimately live. */
const alicePath = (name: string) => `users/${ALICE}/manuscripts/${MS}/attachments/${name}`;

const bytes = (n: number) => new Uint8Array(n);
const SMALL = bytes(1024);
/** One byte over the cap, so the test proves the BOUNDARY rather than that "huge" is refused. */
const OVER_CAP = bytes(25 * 1024 * 1024 + 1);

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    storage: {
      rules: readFileSync(RULES_PATH, 'utf8'),
      host: '127.0.0.1',
      port: 9199,
    },
  });
});

afterAll(async () => { await testEnv?.cleanup(); });
afterEach(async () => { await testEnv?.clearStorage(); });

/**
 * ⚠️ `ref.put()` RETURNS AN `UploadTask`, NOT A PROMISE. It is thenable, so it works at runtime and
 * fails to typecheck — `assertSucceeds`/`assertFails` take a `Promise`. `Promise.resolve` adopts a
 * thenable, so this is a type adaptation and not a behaviour change: the same rejection still
 * reaches the assertion.
 */
const upload = (
  ref: import('firebase/compat/app').default.storage.Reference,
  data: Uint8Array,
  contentType: string,
): Promise<unknown> => Promise.resolve(ref.put(data, { contentType }));

const asAlice = () => testEnv.authenticatedContext(ALICE).storage();
const asBob = () => testEnv.authenticatedContext(BOB).storage();
const asNobody = () => testEnv.unauthenticatedContext().storage();

describe('Storage rules — manuscript attachments', () => {
  /** MUTATION: none needed — this is the case that must stay green. If it fails, the others prove nothing. */
  it('allows the owner to upload a valid file', async () => {
    await assertSucceeds(
      upload(asAlice().ref(alicePath('draft.pdf')), SMALL, 'application/pdf')
    );
  });

  /** MUTATION to prove red: raise `withinSize()` to `<= 26 * 1024 * 1024`. */
  it('denies a file one byte over 25 MB', async () => {
    await assertFails(
      upload(asAlice().ref(alicePath('huge.pdf')), OVER_CAP, 'application/pdf')
    );
  });

  /** MUTATION to prove red: add `'application/zip'` to the allowlist. */
  it('denies a content type outside the allowlist', async () => {
    await assertFails(
      upload(asAlice().ref(alicePath('archive.zip')), SMALL, 'application/zip')
    );
  });

  /** MUTATION to prove red: change `isOwner()` to `request.auth != null`. */
  it("denies writing into another user's path", async () => {
    await assertFails(
      upload(asBob().ref(alicePath('sneak.pdf')), SMALL, 'application/pdf')
    );
  });

  /** MUTATION to prove red: change `isOwner()` to `true`. */
  it('denies an unauthenticated upload', async () => {
    await assertFails(
      upload(asNobody().ref(alicePath('anon.pdf')), SMALL, 'application/pdf')
    );
  });

  /** MUTATION to prove red: change `isOwner()` to `request.auth != null`. */
  it("denies reading another user's file", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await upload(ctx.storage().ref(alicePath('private.pdf')), SMALL, 'application/pdf');
    });
    await assertFails(asBob().ref(alicePath('private.pdf')).getDownloadURL());
  });

  /**
   * ⚠️ THE TRAP THIS FILE EXISTS FOR AS MUCH AS THE CAPS. On a delete `request.resource` is NULL, so
   * folding the size and type checks into one `allow write` denies EVERY delete while every upload
   * keeps working — a failure that reads as a client bug.
   *
   * MUTATION to prove red: replace the two `allow create, update` / `allow delete` lines with a
   * single `allow write: if isOwner() && withinSize() && allowedType();`.
   */
  it('allows the owner to delete their own file', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await upload(ctx.storage().ref(alicePath('bin.pdf')), SMALL, 'application/pdf');
    });
    await assertSucceeds(asAlice().ref(alicePath('bin.pdf')).delete());
  });

  /** MUTATION to prove red: change the terminal clause to `allow read, write: if request.auth != null`. */
  it('denies a path outside the attachments tree, even for the owner', async () => {
    await assertFails(
      upload(asAlice().ref(`users/${ALICE}/loose.pdf`), SMALL, 'application/pdf')
    );
  });
});
