/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * "Add a password" — the way out of a single point of failure.
 *
 * ⚠️ THE FAULT THIS FIXES: an account that signs in through Google only had a password block that
 * said "there's nothing here to change" and offered nothing. Losing access to that Google account
 * meant losing access to every manuscript, agent and query in this one, with no route back that
 * the app could offer. The provider was the single point of failure and the page said so without
 * doing anything about it.
 *
 * ⚠️ IT IS `linkWithCredential`, NOT A SECOND ACCOUNT. The credential attaches to the SAME uid, so
 * the Firestore document, the manuscripts and the history are untouched. Creating an
 * email/password user with the same address instead would make a second account holding none of
 * the writer's work — the two calls are one word apart and only one of them is safe. See
 * `addPassword` in `lib/accountAuthFacts`.
 *
 * ⚠️ THE FORM IS CLOSED UNTIL ASKED FOR. Two password fields standing open in a security section
 * read as something you have failed to fill in; behind a button they read as an offer.
 */
import React, { useRef, useState } from "react";
import { addPassword } from "../../lib/accountAuthFacts";
import { ADD_PASSWORD_MESSAGE, ADD_PASSWORD_DONE } from "../../lib/accountSecurity";
import { validateNewPassword, PASSWORD_MIN } from "../../lib/accountValidation";

export interface AddPasswordProps {
  /** Rendered as the row's control — the page owns the button styling. */
  buttonStyle: React.CSSProperties;
  /** Called after a successful link, so the page can re-read the auth facts. */
  onAdded: () => void;
}

type Status =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "error"; msg: string }
  | { kind: "done" };

export const AddPassword: React.FC<AddPasswordProps> = ({ buttonStyle, onAdded }) => {
  const [open, setOpen] = useState(false);
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const firstRef = useRef<HTMLInputElement>(null);

  const submit = async () => {
    const v = validateNewPassword(pw, confirm);
    if (!v.ok) {
      setStatus({ kind: "error", msg: v.error! });
      return;
    }
    setStatus({ kind: "saving" });
    const res = await addPassword(v.value);
    if (res.outcome === "ok") {
      /* ⚠️ THE FIELDS ARE CLEARED AND THE FORM CLOSES ON SUCCESS. A password left sitting in an
         input after it has been set is a value on screen that no longer needs to be, and the
         closed form is what says the action was consumed — the same structural guard against a
         second submit that the founding sign-up uses (there is nothing left to submit). */
      setPw("");
      setConfirm("");
      setOpen(false);
      setStatus({ kind: "done" });
      onAdded();
      return;
    }
    setStatus({ kind: "error", msg: ADD_PASSWORD_MESSAGE[res.outcome] });
  };

  if (status.kind === "done") {
    return <span className="acct-note" style={{ margin: 0 }}>{ADD_PASSWORD_DONE}</span>;
  }

  if (!open) {
    return (
      <button
        type="button"
        style={buttonStyle}
        onClick={() => {
          setOpen(true);
          setStatus({ kind: "idle" });
          requestAnimationFrame(() => firstRef.current?.focus());
        }}
      >
        Add a password
      </button>
    );
  }

  return (
    <div className="ap-form">
      {/* ⚠️ `autoComplete="new-password"` ON BOTH, so a password manager offers to GENERATE one
          rather than filling in the password for some other site. The pair is a new credential
          being created, not an existing one being recalled. */}
      <label className="ap-lbl" htmlFor="acct-newpw">New password</label>
      <input
        id="acct-newpw"
        ref={firstRef}
        type="password"
        autoComplete="new-password"
        className="acct-input"
        value={pw}
        onChange={(e) => setPw(e.target.value)}
        aria-describedby="acct-newpw-hint"
      />
      <label className="ap-lbl" htmlFor="acct-newpw2">Confirm it</label>
      <input
        id="acct-newpw2"
        type="password"
        autoComplete="new-password"
        className="acct-input"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        /* Enter submits, because a two-field form with a button below it is still a form. */
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void submit(); } }}
      />
      <p className="ap-hint" id="acct-newpw-hint">At least {PASSWORD_MIN} characters.</p>

      {status.kind === "error" && (
        /* ⚠️ `role="alert"`, because this arrives AFTER a submit the reader has already made — the
           one case where interrupting to say what happened is the correct behaviour. */
        <p className="acct-err" role="alert">{status.msg}</p>
      )}

      <div className="ap-acts">
        <button type="button" style={buttonStyle} onClick={() => void submit()} disabled={status.kind === "saving"}>
          {status.kind === "saving" ? "Saving…" : "Save password"}
        </button>
        <button
          type="button"
          style={buttonStyle}
          onClick={() => { setOpen(false); setPw(""); setConfirm(""); setStatus({ kind: "idle" }); }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
};
