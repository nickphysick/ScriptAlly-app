/**
 * firestore — THE Firestore handle. Every function imports `db` from here and nowhere else.
 *
 * ⚠️ NO OTHER FILE IN functions/src MAY CALL `admin.firestore()` OR `getFirestore(`. That is not
 * a convention, it is locked (`firestoreHandle.test.ts`), because the bug this replaces is
 * invisible on dev and expensive on prod — see firestoreTarget.ts for what it was and how it was
 * verified. One file called it wrongly eight times; the lock is what stops the ninth.
 *
 * ⚠️ THIS FILE OWNS THE ONE `initializeApp()`, and the eight per-function guards it replaces were
 * DELETED in the same commit rather than left as harmless duplicates. They could not have fired
 * anyway: an import is evaluated before the importing module's body, so by the time
 * `emailImport.ts` reached its own guard this module had already initialised. A guard that can
 * never fire is worse than none — it reads as the thing keeping the ordering safe, so the next
 * person reorders around it.
 */

import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { isDefaultDatabase, resolveDatabaseId } from "./firestoreTarget";

/** The resolved target. Exported so a startup log or a health check can state it without re-deriving. */
export const DATABASE_ID = resolveDatabaseId(process.env);

const app = admin.apps.length === 0 ? admin.initializeApp() : admin.app();

/**
 * ⚠️ `getFirestore(app)` AND `getFirestore(app, "(default)")` ARE NOT INTERCHANGEABLE in every
 * version of the SDK, so the sentinel branches rather than being passed through — exactly as
 * `src/lib/firebase.ts` does on the client. Two tiers, one shape.
 */
export const db = isDefaultDatabase(DATABASE_ID)
  ? getFirestore(app)
  : getFirestore(app, DATABASE_ID);
