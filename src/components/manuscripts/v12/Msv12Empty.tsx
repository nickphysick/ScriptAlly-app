/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Manuscripts v12 — the empty state (no manuscript yet): the same hero grid with the invitation,
 * then EVERY section the filled page holds, numbered 1–5, each carrying one-line guidance and
 * faded EXAMPLE data (D10 — the faded treatment is Nick's approval for this page, overriding the
 * Query Centre's full-opacity pattern).
 *
 * ⚠️ THE EXAMPLES ARE FURNITURE, NOT DATA: `.msv12-ghost` is pointer-events:none and
 * user-select:none, each block is aria-hidden, and every section wears an Example tag — a page
 * that looks stocked must say so five times, or the first screenshot a writer sends is of records
 * they never made. The mock's own example copy, verbatim.
 *
 * ⚠️ THE CTA OPENS THE EXISTING CREATE FLOW (D14) — `onCreate` routes to the app's Add-a-manuscript
 * interception. No second create form.
 */
import React from "react";
import trayArt from "../../../assets/manuscripts/comps-tray-archivist.png";

const ExampleTag: React.FC = () => <span className="msv12-ex" data-msv12="example-tag">Example</span>;

const Dotish: React.FC<{ fill: string }> = ({ fill }) => (
  /* the ghosts draw NO StatusDot — they are pictures of a page, not statuses of any query; a
     bare tinted ring inside an aria-hidden ghost would still be swept by L5's "no .dot" probe if
     it wore the mock's class, so it wears its own and stays out of the status grammar */
  <span aria-hidden="true" style={{
    display: "inline-block", width: 10, height: 10, borderRadius: "50%",
    background: fill, boxShadow: "inset 0 0 0 1.5px rgba(28,19,15,.55)", flex: "none",
  }} />
);

export const Msv12Empty: React.FC<{ heroArt: string; onCreate: () => void }> = ({ heroArt, onCreate }) => (
  <>
    <div className="msv12-group">
      <section className="msv12-hero msv12-hero--empty" data-msv12="empty-hero">
        <div className="msv12-heroart" data-msv12="hero-art">
          <img className="msv12-heroimg" data-msv12="hero-img" src={heroArt} alt="The Archivist writing in an open manuscript with a quill" />
        </div>
        <div data-msv12="hero-text">
          <div className="msv12-kick"><span className="msv12-lbl">Your manuscript</span></div>
          <h1 className="msv12-title">Your manuscript starts here</h1>
          <p className="msv12-log">
            Add your title, genre and word count. This page then keeps everything that goes out
            with your book: the versions you edit, your query letters and synopses, the books you
            compare it to and the packages you send.
          </p>
          <div className="msv12-ecta">
            <button type="button" className="msv12-btn msv12-btn--dark" data-msv12="empty-cta" onClick={onCreate}>
              + Add your manuscript
            </button>
            <span className="msv12-esteps">Then fill in the sections below</span>
          </div>
        </div>
        <div className="msv12-cover" data-msv12="cover">
          <div className="msv12-coverph" aria-hidden="true" style={{ cursor: "default" }}>
            <svg width="26" height="26" viewBox="0 0 26 26" fill="none" stroke="currentColor" strokeWidth="1.4">
              <rect x="4" y="3" width="18" height="20" rx="2" /><circle cx="10" cy="9.5" r="2" />
              <path d="M4.5 19l5.5-5.5 4 4 3-3 4.5 4.5" />
            </svg>
            <span className="msv12-ct">Book cover</span>
            <span className="msv12-cadd">Optional</span>
          </div>
        </div>
      </section>

      <div className="msv12-col" data-msv12="col">
        <section className="msv12-sec msv12-sec--e" data-msv12-esec="versions">
          <div className="msv12-sech">
            <h2><span className="msv12-step">1</span>Versions</h2>
            <ExampleTag />
          </div>
          <p className="msv12-cap">
            Name each edit for what changed, like “Fast-paced opening”. Partials and fulls are cut
            from a version, so you’ll know which one an agent read.
          </p>
          <div className="msv12-ghost" data-msv12-ghost="" aria-hidden="true">
            <div className="msv12-vlist">
              <div className="msv12-vrow msv12-vrow--cur">
                <span className="msv12-vmark" />
                <div>
                  <div className="msv12-vname">Fast-paced opening<span className="msv12-curtag">Current</span></div>
                  <div className="msv12-vnote">Cut the prologue; opens on the ferry.</div>
                </div>
                <div className="msv12-vfacts">Saved 2 Sep<br />50,000 words</div>
                <div className="msv12-vused">
                  <span><Dotish fill="var(--state-queried)" />6</span>
                  <span><Dotish fill="var(--state-you)" />2</span>
                </div>
              </div>
              <div className="msv12-vrow">
                <span className="msv12-vmark" />
                <div>
                  <div className="msv12-vname">Dual timeline edit</div>
                  <div className="msv12-vnote">1998 chapters interleaved.</div>
                </div>
                <div className="msv12-vfacts">Saved 14 Jun<br />53,200 words</div>
                <div className="msv12-vused">
                  <span><Dotish fill="var(--state-queried)" />4</span>
                  <span><Dotish fill="var(--state-closed)" />2</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="msv12-mat2">
          <section className="msv12-sec msv12-sec--e" data-msv12-esec="letters">
            <div className="msv12-sech">
              <h2><span className="msv12-step">2</span>Query letters</h2>
              <ExampleTag />
            </div>
            <p className="msv12-cap">Keep every draft and see which one went into each query.</p>
            <div className="msv12-ghost msv12-mlist" data-msv12-ghost="" aria-hidden="true">
              <div className="msv12-mrow msv12-mrow--cur">
                <i />
                <div>
                  <div className="msv12-mn">Query letter v3<span className="msv12-curtag msv12-curtag--och">In use</span></div>
                  <div className="msv12-mf2">310 words · in 11 queries</div>
                </div>
              </div>
              <div className="msv12-mrow">
                <i />
                <div>
                  <div className="msv12-mn">Query letter v2</div>
                  <div className="msv12-mf2">355 words · in 5 queries</div>
                </div>
              </div>
            </div>
          </section>
          <section className="msv12-sec msv12-sec--e" data-msv12-esec="synopses">
            <div className="msv12-sech">
              <h2><span className="msv12-step">3</span>Synopses</h2>
              <ExampleTag />
            </div>
            <p className="msv12-cap">Agents ask for different lengths. Keep each one ready.</p>
            <div className="msv12-ghost msv12-mlist" data-msv12-ghost="" aria-hidden="true">
              <div className="msv12-mrow">
                <i />
                <div>
                  <div className="msv12-mn">Synopsis, 1 page</div>
                  <div className="msv12-mf2">480 words · in 9 queries</div>
                </div>
              </div>
              <div className="msv12-mrow">
                <i />
                <div>
                  <div className="msv12-mn">Synopsis, 3 pages</div>
                  <div className="msv12-mf2">1,420 words · in 3 queries</div>
                </div>
              </div>
            </div>
          </section>
        </div>

        <section className="msv12-sec msv12-sec--e" data-msv12-esec="packages">
          <div className="msv12-sech">
            <h2><span className="msv12-step">4</span>Submission packages<span className="msv12-pro">Pro</span></h2>
            <ExampleTag />
          </div>
          <p className="msv12-cap">
            Bundle a letter, a synopsis and a sample for a round of querying, then see which agents
            received it and how they replied.
          </p>
          <div className="msv12-ghost msv12-pgrid" data-msv12-ghost="" aria-hidden="true">
            <div className="msv12-pkg">
              <div className="msv12-pkgh">
                <div className="msv12-pkgname"><i />Autumn round</div>
                <span className="msv12-lbl">3 materials</span>
              </div>
              <ul>
                <li>Query letter v3</li>
                <li>Synopsis, 1 page</li>
                <li>Opening pages <span className="msv12-pv">Fast-paced opening</span></li>
              </ul>
              <div className="msv12-pkgf">
                <div className="msv12-discs">
                  <span className="msv12-disc">JM</span><span className="msv12-disc">TA</span><span className="msv12-disc">+5</span>
                </div>
                <div className="msv12-used">
                  <span><Dotish fill="var(--state-queried)" />5</span>
                  <span><Dotish fill="var(--state-you)" />2</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <aside className="msv12-rail" data-msv12="rail" data-msv12-esec="comps">
        <div className="msv12-tray" data-msv12="tray">
          <div className="msv12-traytext" data-msv12="tray-text">
            <div className="msv12-lbl">Comparable titles</div>
            <h3 className="msv12-trayh">Your comps</h3>
            <div className="msv12-traysub">Books like yours, and why.</div>
          </div>
          <img className="msv12-trayart" data-msv12="tray-art" src={trayArt} alt="" aria-hidden="true" />
        </div>
        <div className="msv12-railbody">
          <div className="msv12-rh"><span className="msv12-step">5</span>Comps <ExampleTag /></div>
          <p className="msv12-cap" style={{ margin: "0 4px 4px" }}>
            Note in your own words why each book compares. The ones named in your query letter are
            marked.
          </p>
          <div className="msv12-ghost" data-msv12-ghost="" aria-hidden="true" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div className="msv12-comp">
              <div className="msv12-spine"><span className="msv12-si">T</span><span className="msv12-sy">2021</span></div>
              <div>
                <div className="msv12-ct2">The Tidewater Line</div>
                <div className="msv12-ca">R. Okafor · Harvill, 2021</div>
                <div className="msv12-why">A single day on the water, told close to one narrator.</div>
                <div className="msv12-inl"><span className="msv12-tag">In query letter</span></div>
              </div>
            </div>
            <div className="msv12-comp">
              <div className="msv12-spine"><span className="msv12-si">S</span><span className="msv12-sy">2023</span></div>
              <div>
                <div className="msv12-ct2">Salt Road</div>
                <div className="msv12-ca">Imogen Hale · Faber, 2023</div>
                <div className="msv12-why">Coastal setting, a missing brother, short chapters.</div>
              </div>
            </div>
          </div>
          <div className="msv12-sooncard" data-msv12="scout">
            <div className="msv12-rh2">Scout<span className="msv12-soon msv12-soon--teal">Coming soon</span></div>
            <p>Suggests recently published comps from your genre and word count.</p>
          </div>
        </div>
      </aside>
    </div>
  </>
);
