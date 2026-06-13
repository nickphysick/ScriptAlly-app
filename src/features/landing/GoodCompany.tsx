/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React from "react";
import { REJECTIONS } from "./content";

export const GoodCompany: React.FC = () => (
  <section className="company">
    <div className="company-in">
      <div className="eye">You're in good company</div>
      <h2>Every writer you love was<br />told <em>no.</em> Often. For years.</h2>
      <p className="lede">
        The difference between a drawer manuscript and a beloved one is rarely talent. It's the will
        to keep sending — and a record steady enough to survive the wait.
      </p>

      <div className="rejects">
        {REJECTIONS.map((r) => (
          <div className="rej" key={r.title}>
            <div className="n">{r.n}</div>
            <div className="tt">{r.title}</div>
            <div className="lbl">{r.label}</div>
          </div>
        ))}
      </div>

      <div className="turn">
        <div className="ln" />
        <p>
          Hundreds of letters between them. And then, for each — <em>one yes.</em>
          <br />ScriptAlly is built for the long road to it, and the day it finally comes.
        </p>
      </div>
    </div>
  </section>
);
