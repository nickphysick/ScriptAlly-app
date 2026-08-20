/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * AccountHeader — the one fixed point on the settings page.
 *
 * ⚠️ IT IS RENDERED ONCE, ABOVE THE GRID, AND IS IDENTICAL IN ALL SEVEN SECTIONS. That is the whole
 * job. Before it existed, every section card repeated the monogram, the name and the email, so the
 * only thing on screen that could have held still while you navigated was the thing that moved
 * most, and changing section read as changing page.
 *
 * ⚠️ SO IT TAKES NO SECTION PROP AND SITS OUTSIDE THE SECTION SUBTREE. There is nothing here that
 * CAN change when the route does, which is stronger than remembering not to change it.
 *
 * Three parts, per the ref: the main block (monogram · pre-label · name · email), the illustration
 * plate on the right, and the facts strip along the foot under a hairline.
 *
 * ⚠️ THE PLATE HIDES BELOW 900px AND THE FACTS STRIP DOES NOT. The plate is decoration and the
 * facts are information; when width runs out, decoration is what goes.
 */
import React from "react";
import { MountPanel } from "../MountPanel";
import { AccountFact } from "../../lib/accountHeaderFacts";
import { initialsOf } from "../../lib/searchSuggestionsCore";
import { SettingsIllo } from "./SettingsIllo";

export const AccountHeader: React.FC<{
  name: string;
  email: string;
  facts: AccountFact[];
}> = ({ name, email, facts }) => (
  <MountPanel className="acct-hdr" fill>
    <div className="acct-hdr-top">
      <div className="acct-hdr-main">
        {/* The app's ONE avatar treatment — parchment fill, burgundy Playfair initials — read
            through the same `initialsOf` the rail foot and the search palette use. A settings page
            whose monogram could disagree with the same person's monogram four centimetres away in
            the rail is the fault this shares a helper to avoid. */}
        <span className="acct-hdr-av" aria-hidden="true">{initialsOf(name || email)}</span>
        <div className="acct-hdr-who">
          <span className="acct-hdr-pre">Account</span>
          <h1 className="acct-hdr-name">{name || "Your account"}</h1>
          <span className="acct-hdr-mail">{email}</span>
        </div>
      </div>
      <div className="acct-hdr-plate">
        <SettingsIllo slot="header" />
      </div>
    </div>

    {/* ⚠️ FULL WIDTH, UNDER BOTH — not a column beside the name. The facts are about the account as
        a whole, and a strip along the foot lets them grow with their values instead of competing
        with the plate for a fixed 238px. */}
    <dl className="acct-hdr-facts">
      {facts.map((f) => (
        <div key={f.key} className="acct-hdr-fact">
          <dt className="acct-hdr-k">{f.key}</dt>
          <dd className="acct-hdr-v">{f.value}</dd>
        </div>
      ))}
    </dl>
  </MountPanel>
);
