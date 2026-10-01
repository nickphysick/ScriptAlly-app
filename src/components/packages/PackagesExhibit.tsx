/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE SUBMISSION PACKAGES EXHIBITION (living headers v3 §5) — how the page looks once the writer has
 * made a package, drawn by the page's OWN parts (`PkgBand`, `PkgCard`) over a SAMPLE constant declared
 * here and nowhere else. The sample follows the ref (living-headers-v3.html): "Standard", out on eleven
 * queries with three requests from eight answered, beside a second package not yet sent.
 *
 * ⚠️ IT READS NOTHING LIVE AND DOES NOTHING. No store, no fetch, no listener; `LivingExhibition`
 * makes the band `inert` and `aria-hidden`, and every card is a `ghost` (no actions, no note controls).
 *
 * ⚠️ THE MATERIALS RAIL IS NOT IN THE PICTURE, AND THAT IS DELIBERATE. On this page the real rail
 * stays beside the empty state, because it is where a first letter and synopsis are added — the one
 * thing an empty page needs. A second, inert rail inside the band would draw the same control twice.
 */
import React from "react";
import type { SubmissionPackage } from "../../types";
import type { EditionResults } from "../../lib/packageResults";
import { LivingExhibition } from "../shell/LivingExhibition";
import { PkgBand } from "./PkgBand";
import { PkgCard } from "./PkgCard";

export const PACKAGES_EXHIBIT_LABEL = "HOW THE PAGE LOOKS ONCE YOU’VE MADE ONE";

const pkg = (id: string, packageName: string, firstSentAt: string | undefined, note: string): SubmissionPackage => ({
  id, userId: "", manuscriptId: "", packageName, queryLetterVersionId: "x", synopsisVersionId: "x",
  samplePagesVersionId: "", status: "Active", createdDate: "", firstSentAt, note,
});

const results = (sent: number, requests: number, passes: number, noReply: number): EditionResults => ({
  sent, out: sent - requests - passes - noReply, requests, offers: 0, passes, noReply,
  answered: requests + passes + noReply, withdrawnEarly: 0, firstSentMs: null, lastSentMs: null,
  rows: [], withChanges: [], onlyMigrated: false,
});

/** The sample, in the ref's order: the package in use first. */
export const PACKAGES_SAMPLE = [
  { pkg: pkg("s-standard", "Standard", "2026-08-14T09:00:00.000Z", "Sending in batches of five, Tuesdays."),
    letter: { name: "Query letter v3", words: 310 }, synopsis: { name: "Synopsis, 1 page", words: 480 },
    version: "Fast-paced opening", res: results(11, 3, 4, 1) },
  { pkg: pkg("s-full", "Full package", undefined, "For agents who ask for the first fifty pages."),
    letter: { name: "Query letter v3", words: 310 }, synopsis: { name: "Synopsis, 2 pages", words: 940 },
    version: "Second draft", res: results(0, 0, 0, 0) },
] as const;

const nobody = () => ({ name: "", initials: "" });

export const PackagesExhibit: React.FC = () => (
  <LivingExhibition label={PACKAGES_EXHIBIT_LABEL}>
    <section className="ppv-pksec">
      <PkgBand band="packages" title="Your packages" count={PACKAGES_SAMPLE.length} hint={<><b>Standard</b> is used for new queries</>} />
      <div className="ppv-list">
        {PACKAGES_SAMPLE.map((s, i) => (
          <PkgCard key={s.pkg.id} pkg={s.pkg} active={i === 0} ghost letter={s.letter} synopsis={s.synopsis}
            version={s.version} editions={[]} results={() => s.res} who={nobody} />
        ))}
      </div>
    </section>
  </LivingExhibition>
);
