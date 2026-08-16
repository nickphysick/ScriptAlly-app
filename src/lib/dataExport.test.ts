/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The export and the deletion confirm — the mechanisms behind two promises the privacy policy
 * already makes.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import {
  ACCOUNT_DELETION_ENABLED, EXPORT_COLLECTIONS, ExportSources,
  buildExport, deletionConfirmed, exportFilename,
} from "./dataExport";

const sources: ExportSources = {
  user: { id: "u1", email: "m@webb.co.uk" },
  manuscripts: [{ id: "m1" }],
  versions: [{ id: "v1" }],
  packages: [{ id: "p1" }],
  agents: [{ id: "a1" }],
  queries: [{ id: "q1" }],
  activities: [{ id: "act1" }],
  notes: [{ id: "n1" }],
  userTasks: [{ id: "t1" }],
};

const NOW = new Date(Date.UTC(2026, 7, 17, 9, 30));

describe("⚠️ the export carries everything the policy says it does", () => {
  /**
   * The old export sent manuscripts, agents and queries — three of the six the policy names. A
   * writer exercising a data right was handed a file called everything that was not.
   */
  it("includes every collection the app holds", () => {
    const bundle = buildExport(sources, NOW);
    for (const key of EXPORT_COLLECTIONS) {
      expect(bundle.data).toHaveProperty(key);
    }
  });

  /**
   * ⚠️ THE LIST AND THE SHAPE ARE ASSERTED AGAINST EACH OTHER. A collection added to ExportSources
   * and forgotten in EXPORT_COLLECTIONS is exactly the omission this catches — and a hand-written
   * expectation here would go green the day someone forgot both.
   */
  it("names exactly the collections the shape declares", () => {
    const bundle = buildExport(sources, NOW);
    expect(Object.keys(bundle.data).sort()).toEqual([...EXPORT_COLLECTIONS].sort());
  });

  it("carries the three the policy calls out by name", () => {
    const bundle = buildExport(sources, NOW);
    expect(bundle.data.packages).toEqual(sources.packages);
    expect(bundle.data.notes).toEqual(sources.notes);
    expect(bundle.data.activities).toEqual(sources.activities);
  });

  /** A file found on a hard drive in three years should say what produced it and when. */
  it("stamps its own provenance", () => {
    const bundle = buildExport(sources, NOW);
    expect(bundle.source).toBe("ScriptAlly");
    expect(bundle.format).toBe(1);
    expect(bundle.exportedAt).toBe(NOW.toISOString());
  });

  it("survives an empty account without throwing away the shape", () => {
    const empty = buildExport(
      { user: null, manuscripts: [], versions: [], packages: [], agents: [], queries: [], activities: [], notes: [], userTasks: [] },
      NOW,
    );
    expect(Object.keys(empty.data).sort()).toEqual([...EXPORT_COLLECTIONS].sort());
  });

  it("dates the filename", () => {
    expect(exportFilename(NOW)).toBe("ScriptAlly-export-2026-08-17.json");
  });
});

describe("⚠️ deletion is built and disabled", () => {
  /**
   * Nothing in this repo deletes a user's records. The flag exists so the mechanism gets reviewed
   * before it is switched on, and this assertion is what makes flipping it a deliberate act rather
   * than a passing edit.
   */
  it("ships off", () => {
    expect(ACCOUNT_DELETION_ENABLED).toBe(false);
  });

  it("no purge is wired anywhere behind it", () => {
    const source = readFileSync(resolve(__dirname, "dataExport.ts"), "utf8");
    for (const forbidden of ["deleteUser", "deleteDoc", "writeBatch", "firebase/auth", "firebase/firestore"]) {
      expect(source).not.toContain(forbidden);
    }
  });
});

describe("the deletion confirm", () => {
  /**
   * ⚠️ THE ACCOUNT EMAIL, NOT A CHECKBOX AND NOT THE WORD "DELETE". A checkbox is ticked by the
   * same reflex that dismissed the dialog, and "DELETE" is a word anyone types without reading;
   * your own address is the one string that differs per account.
   */
  it("accepts the account's own email", () => {
    expect(deletionConfirmed("m@webb.co.uk", "m@webb.co.uk")).toBe(true);
  });

  it("forgives case and surrounding space — it is intent, not a spelling test", () => {
    expect(deletionConfirmed("  M@Webb.CO.uk ", "m@webb.co.uk")).toBe(true);
  });

  it("refuses a different address", () => {
    expect(deletionConfirmed("someone@else.com", "m@webb.co.uk")).toBe(false);
  });

  it("refuses the word DELETE", () => {
    expect(deletionConfirmed("DELETE", "m@webb.co.uk")).toBe(false);
  });

  /**
   * ⚠️ AN EMPTY ACCOUNT EMAIL CAN NEVER MATCH. Without this, a half-loaded user document plus an
   * empty box would satisfy the confirm — the emptiest possible input arming the most destructive
   * control in the app.
   */
  it("cannot be satisfied when the account has no email to match", () => {
    expect(deletionConfirmed("", undefined)).toBe(false);
    expect(deletionConfirmed("", "")).toBe(false);
    expect(deletionConfirmed("   ", "  ")).toBe(false);
  });
});
