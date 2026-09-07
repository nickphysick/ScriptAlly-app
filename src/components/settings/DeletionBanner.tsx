/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The app-wide scheduled-deletion notice.
 *
 * ⚠️ THE FAULT IT FIXES: a writer could request deletion and then use the app for a fortnight with
 * nothing on screen saying so. The notice lived inside the Danger zone card — the one place you
 * only reach by going looking for it, and the last place someone who has changed their mind thinks
 * to look. A pending deletion is a fact about the whole account, so it belongs on every page.
 *
 * ⚠️ IT IS NOT DISMISSIBLE, AND THAT IS THE DIFFERENCE FROM `BetaStrip`. A beta notice dismissed in
 * March should be gone by April; this one is true until it is cancelled or carried out, and the
 * only control that should make it go away is the one that changes the fact.
 *
 * ⚠️ IT DOES NOT SAY "SIGNING IN CANCELS IT" — the ref does, and it is not true of this app.
 * `scheduledDeletion` is written by the request and cleared by the cancel button; there is no
 * auth-time hook anywhere near it. The settings card carries that claim today and it is FALSE; it
 * is reported rather than rewritten, and what must not happen is a second surface repeating it.
 * This names the control that works.
 *
 * ⚠️ AND IT SAYS "DUE FOR DELETION" RATHER THAN "WILL BE DELETED", through `deletionNotice`, for
 * the reason that function's own note gives: `ACCOUNT_DELETION_ENABLED` is false and no job purges
 * an account. The most consequential notice in the app is the last one that may overstate.
 */
import React, { useState } from "react";
import { useScriptAllyDb } from "../../lib/db";
import {
  scheduledDeletion, deletionNotice, deletionCancelled, DELETION_BANNER_ACTION,
} from "../../lib/accountDeletion";
import "./deletionBanner.css";

export const DeletionBanner: React.FC = () => {
  const { currentUser, updateUserProfile } = useScriptAllyDb();
  const [busy, setBusy] = useState(false);

  /* ⚠️ THE SAME READER THE SETTINGS CARD USES. `scheduledDeletion` treats an incomplete record as
     no request, so a cancelled account — whose record is cleared rather than deleted — resolves to
     null here without this component knowing anything about the shape. */
  const pending = scheduledDeletion(currentUser?.scheduledDeletion);
  if (!pending) return null;

  const cancel = async () => {
    setBusy(true);
    try {
      await updateUserProfile({ scheduledDeletion: deletionCancelled() });
    } finally {
      /* ⚠️ `finally`, SO A FAILED WRITE DOES NOT LEAVE A DEAD BUTTON. The banner stays — the
         deletion is still scheduled, which is the truth — and the control can be pressed again. */
      setBusy(false);
    }
  };

  return (
    /* `role="status"` rather than `alert`: it is true on arrival at every page rather than news,
       and an assertive announcement on every navigation would talk over the page itself. */
    <div className="del-banner" role="status">
      <span className="del-banner-t">{deletionNotice(pending)}</span>
      <span className="del-banner-n">Nothing has been removed.</span>
      <button type="button" className="del-banner-a" onClick={() => void cancel()} disabled={busy}>
        {busy ? "Cancelling…" : DELETION_BANNER_ACTION}
      </button>
    </div>
  );
};
