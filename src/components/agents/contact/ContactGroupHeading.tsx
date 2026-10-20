/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v20 §D — THE CARDS VIEW'S GROUP HEADING, "ruled": it spans the grid, 58 tall on the grid's ground; the
 * group's mark (18), its name in the typewriter at 21, "N AGENTS" in mono, then a 1px hairline at 16% ink running to the
 * right edge, 16px after the count. Its left edge is the cards' left edge; it sticks under the toolbar as the list's
 * headings do. (The list's own heading, the cream "ledger", is ContactGroupBand in ContactRows.)
 */
import React from "react";
import { ContactGroupMark } from "./ContactGroupMark";
import type { ContactGroup, GroupKey } from "../../../lib/contactList";

export const groupCountWords = (n: number) => `${n} ${n === 1 ? "agent" : "agents"}`;

export const ContactCardsHeading: React.FC<{ groupKey: GroupKey; g: ContactGroup }> = ({ groupKey, g }) => {
  const isLetter = groupKey === "letter";
  return (
    <div className="cl20-rh" data-cl20="ruled" data-clv="band" data-gkey={g.key ?? g.label}
      data-letter={isLetter && /^[A-Z#]$/.test(g.label) ? g.label : undefined}>
      {isLetter ? null : <ContactGroupMark groupKey={groupKey} gkey={g.key ?? g.label} label={g.label} size={18} />}
      <b className="cl20-rhl" data-cl20="ruled-label">{g.label}</b>
      <em className="cl20-rhn" data-cl20="ruled-count">{groupCountWords(g.ids.length)}</em>
      <i className="cl20-rhr" data-cl20="ruled-rule" aria-hidden="true" />
    </div>
  );
};
