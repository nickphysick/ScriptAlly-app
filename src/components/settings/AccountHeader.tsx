/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * AccountHeader — the one fixed point on the settings page.
 *
 * ⚠️ IT IS RENDERED ONCE, ABOVE THE GRID, AND IS IDENTICAL IN ALL SIX SECTIONS. That is the whole
 * job. Before this, every section card repeated the monogram, the name and the email, so the only
 * thing on screen that could have held still while you navigated was the thing that moved most —
 * the page had no fixed point, and changing section felt like changing page.
 *
 * ⚠️ SO IT MUST NOT BE KEYED, ANIMATED, OR REBUILT PER SECTION. It sits outside the section's
 * subtree and takes no section prop; there is nothing here that CAN change when the route does,
 * which is stronger than remembering not to change it. The acceptance measurement asserts its
 * geometry is identical across all six routes, to the pixel.
 *
 * ⚠️ AND THE PAGE TITLE IS GONE. A centred "Account settings" over an empty plane gave the content
 * nothing to sit against; this header is the top edge, and it says whose account it is — which the
 * title never did.
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
  <MountPanel className="acct-hdr">
    <div className="acct-hdr-row">
      <div className="acct-hdr-main">
        {/* The monogram is the app's ONE avatar treatment — parchment fill, burgundy Playfair
            initials — read through the same `initialsOf` the rail foot and the search palette use.
            A settings page whose monogram could disagree with the same person's monogram four
            centimetres away in the rail is the fault this shares a helper to avoid. */}
        <span className="acct-hdr-av" aria-hidden="true">{initialsOf(name || email)}</span>
        <div className="acct-hdr-who">
          <span className="acct-hdr-pre">Account</span>
          <h1 className="acct-hdr-name">{name || "Your account"}</h1>
          <span className="acct-hdr-mail">{email}</span>
        </div>
      </div>

      {/* ⚠️ THE PANEL DROPS BENEATH THE MAIN BLOCK BELOW 900px, IT DOES NOT SQUEEZE. At 280px it is
          already the narrowest a three-row key/value list reads at; taking width off it wraps the
          values onto second lines and the "rows" stop being rows. */}
      <div className="acct-hdr-side">
        <SettingsIllo slot="header" />
        <dl className="acct-hdr-facts">
          {facts.map((f) => (
            <div key={f.key} className="acct-hdr-fact">
              <dt className="acct-hdr-k">{f.key}</dt>
              <dd className="acct-hdr-v">{f.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  </MountPanel>
);
