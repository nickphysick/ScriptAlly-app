/**
 * A2, gate ON. A file of its own because the flag is mocked for the whole module: with
 * `INVITE_GATE_ENABLED` true the invite field is the FIRST thing in the sign-up card's form, in
 * its own box, and is absent on sign-in. (`accountScreens.test.tsx` holds the gate-off half.)
 */
import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderPage } from "../../test/pageSmoke";

vi.mock("../../lib/db", async () => (await import("../../test/pageSmoke")).dbMock());
vi.mock("../../lib/firebase", async () => (await import("../../test/pageSmoke")).firebaseMock());
vi.mock("../toast/ToastProvider", async () => (await import("../../test/pageSmoke")).toastMock());
vi.mock("../../lib/beta", async (orig) => ({ ...(await orig<typeof import("../../lib/beta")>()), BETA_MODE: true, INVITE_GATE_ENABLED: true }));

import { Auth } from "../Auth";
import { INVITE_LABEL, INVITE_PLACEHOLDER } from "../../lib/inviteCode";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/'/g, "&#x27;").replace(/"/g, "&quot;");

describe("A2 the invite field follows the flag as built — gate ON", () => {
  const up = () => renderPage(<Auth initialMode="signup" />, "/");

  it("the invite field is drawn, with its built label and placeholder", () => {
    const h = up();
    expect(h).toContain('id="au-invite"');
    expect(h).toContain(esc(INVITE_LABEL));
    expect(h).toContain(`placeholder="${esc(INVITE_PLACEHOLDER)}"`);
  });

  it("it is first in the card: before Google, before every other field", () => {
    const h = up();
    const at = (needle: string) => { const i = h.indexOf(needle); expect(i, needle).toBeGreaterThan(-1); return i; };
    const invite = at('id="au-invite"');
    expect(invite).toBeLessThan(at('class="sf-google"'));
    expect(invite).toBeLessThan(at('id="au-name"'));
    expect(invite).toBeLessThan(at('id="au-email"'));
    expect(h.slice(0, invite), "and it sits in its own box").toMatch(/class="sf-invite"/);
  });

  it("sign-in never shows it", () => {
    expect(renderPage(<Auth initialMode="login" />, "/")).not.toContain('id="au-invite"');
  });
});
