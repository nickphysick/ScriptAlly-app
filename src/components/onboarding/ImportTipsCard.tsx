/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * "Did you know?" — a card on Smart Import's reading screen, shown while a file is read. Built to
 * design-refs/onboarding/smart-import-loader-v2/loader-v2.dc.html. A new tip every TIP_EVERY_MS;
 * "Next tip" shows the next one and restarts that clock. Under reduced motion there is no fade and
 * no auto-advance — Next tip only. Every import starts at tip 1 (the card mounts fresh each read).
 *
 * ⚠️ There is no "carry on" or "leave" anywhere on this card, or on the screen it sits on (Nick's
 * ruling): the read finishes, and the screen moves on by itself.
 */
import { useIsMobile } from "../shell/mobileChrome";
import React, { useEffect, useState } from "react";
import { IMPORT_TIPS, IMPORT_TIP_ART, TIP_EVERY_MS } from "../../lib/importTips";

export const ImportTipsCard: React.FC<{ reduced: boolean }> = ({ reduced }) => {
  const isMobile = useIsMobile();
  const [at, setAt] = useState(0);
  /* Bumped by Next tip so the auto-advance clock restarts even when the index ends where it began. */
  const [press, setPress] = useState(0);
  const n = IMPORT_TIPS.length;

  useEffect(() => {
    if (reduced) return;
    const id = setTimeout(() => setAt((i) => (i + 1) % n), TIP_EVERY_MS);
    return () => clearTimeout(id);
  }, [at, press, reduced, n]);

  const next = () => { setAt((i) => (i + 1) % n); setPress((p) => p + 1); };

  return (
    <section className="im-tip" data-im="tips" aria-label="Did you know">
      <div className="im-tip-art" aria-hidden>
        <img src={`${IMPORT_TIP_ART.src}?v=${IMPORT_TIP_ART.version}`} alt="" width={IMPORT_TIP_ART.width} height={IMPORT_TIP_ART.height} />
      </div>
      <div className="im-tip-main">
        <div className="im-tip-head">
          {/* Sentence case on a phone (set-up on phones v1, 2B); the desktop's capitals unchanged. */}
          <span className="im-tip-kick">{isMobile ? "Did you know?" : "DID YOU KNOW?"}</span>
          <span className="im-tip-num" data-im="tip-num">{at + 1} / {n}</span>
        </div>
        <div className="im-tip-stack" data-im="tip-stack" aria-live="polite">
          {IMPORT_TIPS.map((t, i) => (
            <div key={t.title} className={`im-tip-one${i === at ? " is-on" : ""}`} data-im="tip" aria-hidden={i === at ? undefined : true}>
              <h2 className="im-tip-title">{t.title}</h2>
              <p className="im-tip-body">{t.body}</p>
            </div>
          ))}
        </div>
        <div className="im-tip-foot">
          <div className="im-tip-dots" aria-hidden>
            {IMPORT_TIPS.map((t, i) => <span key={t.title} className={i === at ? "is-on" : undefined} />)}
          </div>
          <button type="button" className="im-tip-next" data-im="tip-next" onClick={next}>
            Next tip
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 12h14M13 6l6 6-6 6" /></svg>
          </button>
        </div>
      </div>
    </section>
  );
};
