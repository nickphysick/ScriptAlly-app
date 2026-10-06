/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * AppFooter (Query Centre v126 §5) — THE MARKETING FOOTER'S CONTENT, IN THE APP'S DRESS.
 *
 * ⚠️ ONE SOURCE FOR EVERY WORD. The tagline and the address come from `lib/companyInfo`, the six
 * glyphs, the plane and the hawk from the marketing tier's own exports — read, never copied — so the
 * two footers cannot come to disagree about what QueryHawk says about itself. `marketing.css` is NOT
 * imported: the tier styles itself under `.mk-scope`, and this footer has its own sheet.
 *
 * ⚠️ OPT-IN, LIKE THE PLATE WAS. A page mounts it at the foot of its own scroller; today the Query Centre,
 * Analytics and the Contact list do. "Help centre" stands where the marketing footer says "Open QueryHawk" — inside the app,
 * the app is already open.
 *
 * ⚠️ ITS CONTENT BOX IS THE CONTENT COLUMN'S, NOT THE WINDOW'S (QC126-11): the ground runs the main
 * column's full width and the footer sits in the page's own group, so the wordmark starts level with
 * the desk.
 */
import React from "react";
import { FOOTER_TAGLINE, SUPPORT_EMAIL } from "../../lib/companyInfo";
import { BRAND_MARK, artUrl } from "../../marketing/brandArt";
import { PaperPlane, StatusGlyph, STATUS_GLYPH_COUNT } from "../../marketing/marketingMarks";
import "./appFooter.css";

export const AppFooter: React.FC<{ onNavigate: (tab: string, sub?: string) => void }> = ({ onNavigate }) => {
  /* buttons, as the marketing footer's are: they route through the app's own navigate bridge */
  const link = (label: string, go: () => void) => (
    <li><button type="button" className="af-link" onClick={go}>{label}</button></li>
  );
  return (
    <footer className="af" data-probe="app-footer">
      <div className="af-in" data-probe="app-footer-in">
        <div className="af-grid">
          <div className="af-brandcol">
            <div className="af-brand">
              {/* alt="": the name beside it already says QueryHawk */}
              <img src={artUrl(BRAND_MARK)} alt="" width={38} height={38} loading="lazy" />
              <span>QueryHawk</span>
            </div>
            <p className="af-tag" data-probe="app-footer-tag">{FOOTER_TAGLINE}</p>
            <div className="af-glyphs" aria-hidden="true" data-probe="app-footer-glyphs">
              {Array.from({ length: STATUS_GLYPH_COUNT }, (_, i) => <StatusGlyph key={i} index={i} />)}
            </div>
          </div>
          <div className="af-col" data-probe="app-footer-col">
            <h4>Product</h4>
            <ul>
              {link("Features", () => onNavigate("landing"))}
              {link("Pricing", () => onNavigate("pricing"))}
              {link("Help centre", () => onNavigate("help"))}
            </ul>
          </div>
          <div className="af-col" data-probe="app-footer-col">
            <h4>Company</h4>
            <ul>
              {link("About", () => onNavigate("about"))}
              {link("Founding writers", () => onNavigate("founders"))}
              {link("Contact", () => onNavigate("contact"))}
            </ul>
          </div>
          <div className="af-col" data-probe="app-footer-col">
            <h4>Legal</h4>
            <ul>
              {link("Privacy", () => onNavigate("privacy"))}
              {link("Terms", () => onNavigate("terms"))}
            </ul>
          </div>
        </div>
        <div className="af-base">
          <p>© {new Date().getFullYear()} QueryHawk</p>
          <p className="af-made"><PaperPlane />Made in the UK, for writers</p>
          <a className="af-link af-mail" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
        </div>
      </div>
    </footer>
  );
};
