/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ HOW PACKAGES WORK — the explainer drawer ══════════════════════════════════════════════════
 *
 * Design authority: `design-refs/packages-workspace-drawer.html`, the `<aside class="drawer">`.
 *
 * ⚠️ IT REUSES `Form11Drawer` (D5) AND DOES NOT BUILD A SECOND. That component already is a
 * right-hand slide-in with a scrim, an Escape close, a `width` prop and header/body/footer slots —
 * `onPark` and the whole draft-stashing half are optional, so nothing form-shaped comes with it.
 * The Noteboard's "What writers keep here" panel is NOT a primitive: it is inline markup in
 * `TodoNoteboardPage` under page-scoped `nb-` classes, so reusing it would have meant lifting it
 * out first — a bigger change to that page than to this one, in a pack that does not own it.
 *
 * ⚠️ IT NEVER AUTO-OPENS (D7). No stored dismissal, no first-run trigger, nothing on the
 * teach→workspace transition. It opens from the header control and from nowhere else, so it can
 * never interrupt someone who came to the page to do something.
 *
 * ⚠️ AND IT DOES NOT REPLACE THE FIRST-VISIT STAGES STRIP (D8). That strip teaches someone who has
 * never seen a package; this teaches someone who has one and wants the rules. Same three stages,
 * different question — and the strip is on the page, where the drawer has to be asked for.
 */
import React, { useRef } from "react";
import { Form11Drawer, type Form11DrawerHandle } from "../Form11Drawer";
import { IllustrationSlot } from "./IllustrationSlot";
import "./packagesDrawer.css";

/** The plate the drawer's marks sit on. Bigger than the teach strip's disc is NOT the intent — see
 *  the slot inventory: one asset, two placements. */
export const DRAWER_MARK_PX = 46;

interface Stage { eyebrow: string; icon: string; slot: string; title: string; body: string }

/**
 * ⚠️ THE COPY IS THE REF'S, with one amendment carried from Part D. The first note said only that a
 * sent package's CONTENTS are fixed; the pane now offers `Change package` and `Remove`, so the note
 * says which half is frozen and which stays correctable. A writer who reads "a sent package stops
 * changing" and then finds a Change control has been told two things.
 */
const STAGES: Stage[] = [
  {
    eyebrow: "Stage one", icon: "pages", slot: "PKG-STAGE-ADD", title: "Add your materials",
    body: "Versions of your covering letter and synopsis — written here or pasted in. Most writers keep two or three of each, so they can test which one lands.",
  },
  {
    eyebrow: "Stage two", icon: "parcel", slot: "PKG-STAGE-BUNDLE", title: "Bundle them into a package",
    body: "Pick one of each and name the combination. Only the covering letter is required — send what each agency actually asks for.",
  },
  {
    eyebrow: "Stage three", icon: "chart", slot: "PKG-STAGE-TRACK", title: "Track what comes back",
    body: "Attach a package when you log a query. Replies land against it, and each material’s requests are counted across every package that carries it.",
  },
];

const NOTES: { title: React.ReactNode; body: React.ReactNode }[] = [
  {
    title: "A sent package’s contents stop changing",
    body: (
      <>
        Once a package has gone out with a query, the three materials inside it are fixed. That is what
        keeps tracking honest — editing them would rewrite what agents received. Need a different
        combination? <b>Duplicate &amp; edit</b> makes a new one. Which package a query points at is a
        different thing, and stays correctable from the query itself.
      </>
    ),
  },
  {
    title: <>A query takes a package <i>or</i> loose materials</>,
    body: (
      <>
        Not both. Attach a package and its contents go exactly as they are, uneditable from the query.
        Or list materials individually on that query alone — useful when an agent asks for something
        unusual.
      </>
    ),
  },
  {
    title: "Counts, never scores",
    body: (
      <>
        Tracking reports what happened — six sent, two replied, one request. It does not rank your
        materials or tell you which is best. Small numbers rarely mean much; you decide when they do.
      </>
    ),
  },
];

export interface PackagesDrawerProps {
  open: boolean;
  onClose: () => void;
}

export const PackagesDrawer: React.FC<PackagesDrawerProps> = ({ open, onClose }) => {
  /**
   * ⚠️ THE ✕ IS THE CONSUMER'S, ROUTED THROUGH THE HANDLE — `Form11Drawer` renders none, and its own
   * prose says so ("a header ✕ routed through the ref"). Calling `onClose` directly would skip the
   * exit animation the drawer owns and make it vanish rather than leave; `close(false)` plays it and
   * unmounts on the animationend. `false` is "do not park" — there is no draft here to stash.
   */
  const ref = useRef<Form11DrawerHandle>(null);
  if (!open) return null;
  return (
    <Form11Drawer
      ref={ref}
      isOpen={open}
      onClose={onClose}
      /* The ref's 452; `Form11Drawer` caps to the viewport itself, and `max-width: 92vw` on the
         body keeps the narrow case honest. */
      width={452}
      /* ⚠️ SHORTENED — "how packages work" is a sentence in a 24px-wide vertical strip. The tab
         states the mode; the header states the subject. */
      tabLabel="how it works"
      header={
        <div className="pkgd-head">
          <button type="button" className="pkgd-x" aria-label="Close"
                  onClick={() => ref.current?.close(false)}>×</button>
          <h2>How packages work</h2>
          <p>Three stages, and the few rules worth knowing before you build one.</p>
        </div>
      }
      footer={
        <div className="pkgd-foot">
          <button type="button" className="pkgd-done" onClick={onClose}>Got it</button>
        </div>
      }
    >
      <div className="pkgd-body">
        {STAGES.map((s) => (
          <React.Fragment key={s.slot}>
            <div className="pkgd-sec">{s.eyebrow}</div>
            <div className="pkgd-card">
              {/* ⚠️ DASHED PLACEHOLDER, UNCHANGED IN NATURE (D9). Same three subjects as the
                  first-visit strip — one asset, two placements. */}
              <span className="pkgd-art">
                {/* ⚠️ `bare` — NO DASHED RIM (D7). The plate's dashed border says "artwork pending", which is
                 true of the inventory and not of a page a writer is reading. The mark stays; the
                 commission chrome does not. */}
            <IllustrationSlot icon={s.icon} px={DRAWER_MARK_PX} shape="bare" id={s.slot} />
              </span>
              <h4>{s.title}</h4>
              <p>{s.body}</p>
            </div>
          </React.Fragment>
        ))}

        <div className="pkgd-sec">Worth knowing</div>
        {NOTES.map((n, i) => (
          <div className="pkgd-note" key={i}>
            <h5>{n.title}</h5>
            <p>{n.body}</p>
          </div>
        ))}
      </div>
    </Form11Drawer>
  );
};
