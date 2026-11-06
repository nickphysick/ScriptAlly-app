/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * CbEmpty — the empty Corkboard's examples (Corkboard v2, Part G; ref design-refs/corkboard-v13/, `.gal`, screen 09):
 * "What writers keep here", the line beneath it, and four example post-its, each with "Keep this".
 *
 * ⚠️ THE EXAMPLES ARE THE APP'S OWN DATA (noteboardExamples `NOTE_EXAMPLES`), not the ref's sample text: the four
 *    are the entries the ref's four were cut down from, in the ref's order, with their stored papers read through the
 *    one mapping. Keep this is the page's write; nothing here writes.
 */
import React from "react";
import { NOTE_EXAMPLES, type NoteExample } from "../noteboardExamples";
import { paperHex } from "../../../lib/noteboard";
import { PostIt } from "./CbPostIt";

/** The four the ref shows, by the first words of the entries they were cut from. */
const PICK = ["Heard [agent] on [podcast]", "Standard UK package", "Comp shortlist", "Before saying yes"];
export const EMPTY_EXAMPLES: NoteExample[] = PICK.map((start) => NOTE_EXAMPLES.flatMap((g) => g.items).find((x) => x.body.startsWith(start))!).filter(Boolean);

export const CbEmpty: React.FC<{ onKeep: (ex: NoteExample) => void }> = ({ onKeep }) => (
  <section className="cb2-gal" data-cb2="empty">
    <h2 className="cb2-galh">What writers keep here</h2>
    <p className="cb2-galp">A few ideas to get you going. Keep any of them and it lands on your board, ready to change.</p>
    <div className="cb2-galgrid">
      {EMPTY_EXAMPLES.map((ex) => (
        <div key={ex.body} className="cb2-gitem cb2-note" data-cb2-example="">
          <PostIt
            hex={paperHex(ex.colour)}
            body={ex.body}
            tags={ex.tag ? [ex.tag] : []}
            extra={<button type="button" className="cb2-keep" data-cb2="keep" onClick={() => onKeep(ex)}>Keep this</button>}
          />
        </div>
      ))}
    </div>
  </section>
);
