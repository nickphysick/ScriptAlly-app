/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ContactPeek — how to reach them, and the ONLY renderer of these five rows.
 *
 * ⚠️ ONE COMPONENT, THREE CONTAINERS. It is the card's back face in Grid, a popover anchored to
 * the contact button in List and Board, and the read half of the drawer's Contact tab. Nothing
 * else re-renders email, submissions page, location, approach-by or socials — not the drawer,
 * not the popover, not a "simplified" copy for a narrow container. Two renderings of one fact are
 * two facts that will eventually disagree, and the disagreement is invisible until someone reads
 * both in the same minute.
 *
 * ⚠️ THE DRAWER APPENDS; IT DOES NOT RE-IMPLEMENT. Its Contact tab carries three rows this peek
 * has no business with — typical response, if-they-don't-reply, and the door — so it passes them
 * as `append`. If a row ever needs different chrome in one container, that is a PROP here, never
 * a second copy there. `variant` exists for exactly that and currently changes only the frame.
 *
 * ⚠️ EVERY ROW CARRIES `data-field`, AND THAT IS A CONTRACT RATHER THAN A HOOK FOR STYLING.
 * `contactFields.test.tsx` renders the editor's Contact tab and this read view and requires the
 * two field sets to be EQUAL, in both directions. The failure it forecloses is a field a writer
 * can edit and then cannot see — they save it, the read view never mentions it, and they have no
 * way to tell whether it took. A row that displays two fields declares both tokens.
 *
 * ⚠️ AND AN ABSENT VALUE IS STATED, NEVER OMITTED. A missing row says nothing; "No email
 * recorded" says the app looked. That is the same rule the packages pane's four always-present
 * slots follow, and the reason the card's material slots ghost rather than vanish.
 */
import React from "react";
import { Agent } from "../../types";
import { countryName, flagFor } from "../../lib/territory";
import { methodShort } from "../../lib/agentList";
import "flag-icons/css/flag-icons.min.css";

/** The five rows this component owns. The drawer's extra rows are NOT in here — it appends. */
export const PEEK_FIELDS = ["email", "website", "country", "city", "submissionMethod", "socials"] as const;

/** Every social this agent has, from the array and the three legacy discrete fields, deduped. */
export function peekSocials(agent: Agent): { platform: string; handle: string }[] {
  const out: { platform: string; handle: string }[] = [];
  const add = (platform: string, handle: string | undefined) => {
    const h = (handle || "").trim();
    if (!h) return;
    if (out.some((s) => s.handle.toLowerCase() === h.toLowerCase())) return;
    out.push({ platform, handle: h });
  };
  for (const s of agent.socials ?? []) add(s.platform, s.handle);
  /* ⚠️ THE DISCRETE FIELDS ARE READ TOO. `socials[]` mirrors them on write, but a legacy or
     imported agent can carry only the discretes — reading the array alone would show a writer an
     empty socials row about an agent whose handle is sitting in the record. */
  add("X / Twitter", agent.twitter);
  add("Bluesky", agent.bluesky);
  add("Instagram", agent.instagram);
  return out;
}

const Row: React.FC<{ field: string; label: string; children: React.ReactNode }> = ({ field, label, children }) => (
  <div className="agl-prow" data-field={field}>
    <span className="agl-pk">{label}</span>
    <span className="agl-pv">{children}</span>
  </div>
);

const Absent: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="agl-pnone">{children}</span>
);

export interface ContactPeekProps {
  agent: Agent;
  /** Frame only — the rows and their words are identical in every container. */
  variant?: "face" | "pop" | "drawer";
  /** Rows the container owns that this component does not. Rendered after the five. */
  append?: React.ReactNode;
  /** The container's own action, e.g. the card back's "Edit contact details". */
  footer?: React.ReactNode;
}

export const ContactPeek: React.FC<ContactPeekProps> = ({ agent, variant = "face", append, footer }) => {
  const email = (agent.email || "").trim();
  const site = (agent.website || "").trim();
  const city = (agent.city || "").trim();
  const country = countryName(agent.country);
  const flag = flagFor(agent.country);
  const socials = peekSocials(agent);
  const [copied, setCopied] = React.useState(false);

  const href = site ? (/^https?:\/\//i.test(site) ? site : `https://${site}`) : "";

  return (
    <div className={`agl-peek agl-peek--${variant}`}>
      <Row field="email" label="Email">
        {email ? (
          <>
            <span className="agl-pemail">{email}</span>
            <button
              type="button"
              className="agl-copy"
              onClick={(e) => {
                e.stopPropagation();
                void navigator.clipboard?.writeText(email).then(() => {
                  setCopied(true);
                  window.setTimeout(() => setCopied(false), 1600);
                });
              }}
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </>
        ) : (
          <Absent>No email recorded</Absent>
        )}
      </Row>

      <Row field="website" label="Submissions page">
        {site ? (
          <a className="agl-plink" href={href} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>{site}</a>
        ) : (
          <Absent>No page recorded</Absent>
        )}
      </Row>

      {/* ⚠️ ONE ROW, TWO FIELDS, and it declares both tokens — the editor has a country picker and
          a city input, and the read view has a sentence. The field-set lock compares tokens, so a
          row that shows two fields must say so or the comparison reports a phantom gap. */}
      <Row field="country city" label="Based in">
        {city || country ? (
          <>
            {flag && <span className={`fl ${flag}`} aria-hidden="true" />}
            <span>{[city, country].filter(Boolean).join(", ")}</span>
          </>
        ) : (
          <Absent>No location recorded</Absent>
        )}
      </Row>

      <Row field="submissionMethod" label="Approach by">{methodShort(agent)}</Row>

      {append}

      <div className="agl-psoc" data-field="socials">
        {socials.length ? (
          socials.map((s) => (
            <span className="agl-psocial" key={`${s.platform}-${s.handle}`} title={s.platform}>{s.handle}</span>
          ))
        ) : (
          <Absent>No social accounts recorded</Absent>
        )}
      </div>

      {footer && <div className="agl-pfoot">{footer}</div>}
    </div>
  );
};
