/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * QueryLettersPage — `/materials/letters` (sidebar materials v1, 6 Nov). A PLACEHOLDER: the Materials section's
 * first page has a route and a header so the nav has no dead link. The Query letters pack replaces the body.
 *
 * The header is the light header's own classes (shell/lightHeader.css) with the title and one line only: no eyebrow,
 * no by-line, no buttons and no card, because there is nothing on the page for them to describe yet.
 */
import React from "react";
import "../shell/lightHeader.css";
import "./queryLetters.css";

export const QUERY_LETTERS_TITLE = "Query letters";
export const QUERY_LETTERS_LINE = "Write and keep every version of your letter, then see which one gets agents asking for more.";

export const QueryLettersPage: React.FC = () => (
  <div className="qlp" data-ql="page">
    <header className="slh qlp-head" data-slh="header" data-own-header="">
      <div className="slh-row" data-slh="header-row">
        <div className="slh-tb" data-slh="title-block">
          <h1 className="slh-h1" data-page-title="" data-slh="title" tabIndex={-1}>{QUERY_LETTERS_TITLE}</h1>
          <p className="qlp-line" data-ql="line">{QUERY_LETTERS_LINE}</p>
        </div>
      </div>
    </header>
  </div>
);
