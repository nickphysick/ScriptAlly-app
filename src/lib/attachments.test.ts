/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  MAX_ATTACHMENT_BYTES, MAX_ATTACHMENTS, ALLOWED_CONTENT_TYPES,
  attachmentStoragePath, newAttachmentId, rejectUpload, formatBytes,
} from "./attachments";

const root = join(__dirname, "../..");
const read = (f: string) => readFileSync(join(root, f), "utf8");
/** ⚠️ A source lock asserts over CODE, never over the prose explaining it. */
const decls = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

describe("attachment caps — which are enforced, and by what", () => {
  /**
   * ⚠️ THE SIZE CAP EXISTS IN THREE PLACES AND A DRIFT IS SILENT. If the client permits an upload
   * the rules deny, the writer sees a failure with no explanation; if the rules permit one the
   * client refuses, the cap is a lie. Both files are read, neither is a literal on both sides.
   */
  it("25 MB is the same number in the constant, storage.rules and firestore.rules", () => {
    expect(MAX_ATTACHMENT_BYTES).toBe(26_214_400);
    const storage = decls(read("storage.rules"));
    const firestore = decls(read("firestore.rules"));
    expect(storage, "storage.rules lost its size cap").toContain("request.resource.size <= 25 * 1024 * 1024");
    expect(firestore, "firestore.rules lost its size cap").toContain("data.size <= 25 * 1024 * 1024");
  });

  /**
   * ⚠️ THE ALLOWLIST IS ONE LIST IN TWO FILES, AND THE VARIANTS ARE THE PART THAT DRIFTS. Someone
   * tidying "duplicates" out of either copy reintroduces the unreproducible rejection they exist
   * to prevent, so every member is checked rather than the length.
   */
  it("every allowed content type is in storage.rules, and vice versa", () => {
    const storage = decls(read("storage.rules"));
    const inRules = [...storage.matchAll(/'([a-z]+\/[a-z0-9.+-]+)'/g)].map((m) => m[1]);
    for (const t of ALLOWED_CONTENT_TYPES) {
      expect(inRules, `${t} is allowed in code but not in storage.rules`).toContain(t);
    }
    for (const t of inRules) {
      expect(ALLOWED_CONTENT_TYPES, `${t} is allowed in storage.rules but not in code`).toContain(t);
    }
    /* The variants specifically — the members most likely to be "tidied" away. */
    for (const t of ["text/rtf", "text/x-markdown", "application/csv"]) {
      expect(ALLOWED_CONTENT_TYPES).toContain(t);
    }
  });

  /**
   * ⚠️ THE FILE COUNT MUST NOT APPEAR IN EITHER RULES FILE. This is the assertion that keeps the
   * honesty: the day someone adds a counter clause, this fails and the comments claiming it is a UI
   * limit have to be revisited in the same edit rather than quietly becoming wrong.
   */
  it("the 20-file cap is nowhere in the attachment rules, because it is a UI limit", () => {
    expect(MAX_ATTACHMENTS).toBe(20);

    /**
     * ⚠️ SLICED ON TWO ANCHORS THAT CANNOT NEST, and scoped to the attachment rules rather than the
     * whole file. A sweep over all of firestore.rules matched `<= 20` in an unrelated cap and went
     * red on a correct file — the claim is about THESE rules, not about every number in the sheet.
     */
    const fs = decls(read("firestore.rules"));
    const from = fs.indexOf("match /attachments/{attachmentId} {");
    const to = fs.indexOf("match /queries/{queryId} {", from);
    expect(from, "the attachments match block is gone").toBeGreaterThan(-1);
    expect(to, "the anchor after the attachments block is gone").toBeGreaterThan(from);
    const block = fs.slice(from, to) + decls(read("storage.rules"));
    expect(block, "the attachment rules appear to enforce a file count")
      .not.toMatch(/attachmentCount|count\(\)|MAX_ATTACHMENTS|<=\s*20\b/);
  });

  /**
   * ⚠️ THE PATH IS CHECKED CHARACTER FOR CHARACTER BY `isValidAttachment`, so the builder and the
   * rule are asserted against each other rather than against a literal on both sides.
   */
  it("the storage path the builder makes is the one the rules require", () => {
    expect(attachmentStoragePath("u1", "ms1", "att-9")).toBe("users/u1/manuscripts/ms1/attachments/att-9");
    expect(decls(read("firestore.rules")))
      .toContain("'users/' + userId + '/manuscripts/' + data.manuscriptId + '/attachments/' + data.id");
  });

  /**
   * ⚠️ THE ID CANNOT BE DERIVED FROM A FILENAME. `isValidId` is `^[a-zA-Z0-9_-]+$`, and this repo
   * has already lost every R&R heal write to an ampersand in a generated id. A real filename
   * contains spaces, dots and worse.
   */
  it("generated ids satisfy isValidId", () => {
    for (let i = 0; i < 200; i++) expect(newAttachmentId()).toMatch(/^[a-zA-Z0-9_-]+$/);
  });

  it("rejects by count first, then size, then type", () => {
    const ok = { size: 10, type: "application/pdf" };
    expect(rejectUpload(ok, 0)).toBeNull();
    expect(rejectUpload(ok, MAX_ATTACHMENTS)).toBe("count");
    expect(rejectUpload({ size: MAX_ATTACHMENT_BYTES + 1, type: "application/pdf" }, 0)).toBe("size");
    expect(rejectUpload({ size: 10, type: "application/zip" }, 0)).toBe("type");
    /* The boundary itself is allowed — the cap is "no more than", not "less than". */
    expect(rejectUpload({ size: MAX_ATTACHMENT_BYTES, type: "application/pdf" }, 0)).toBeNull();
  });

  it("formats bytes as a writer reads them", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(2048)).toBe("2 KB");
    expect(formatBytes(3_500_000)).toBe("3.3 MB");
  });
});
