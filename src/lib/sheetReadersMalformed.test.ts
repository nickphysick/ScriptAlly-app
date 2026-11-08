/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * A BROKEN .xlsx FAILS CLEANLY (dependency audit fix, 8 Nov 2026).
 *
 * A truncated workbook must throw an ordinary Error from the reader, promptly, so it lands in the
 * import's existing error path: `fileToCsv` rejects inside `runSmartImport` BEFORE the callable is
 * built, the template read rejects into ImportFlow's catch, and the loader's sample is caught by
 * its own `.catch`. Never a hang, never a crash, and never a call to `smartImportMap`.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { bufferToCsv } from "./sheetText";
import { fileToCsv, sampleRawFromBuffer } from "./smartImport";
import { readTemplateBuffer } from "./templateImport";

const good = new Uint8Array(readFileSync(resolve(__dirname, "../../tests/fixtures/import/smart-messy.xlsx")));
const BROKEN: Record<string, Uint8Array> = {
  "truncated at half": good.subarray(0, Math.floor(good.length / 2)),
  "only the zip header": good.subarray(0, 40),
};

describe("a malformed .xlsx fails through the existing error path", () => {
  it("the fixture really is a zip, so the cut copies are broken workbooks rather than text", () => {
    expect([...good.subarray(0, 4)]).toEqual([0x50, 0x4b, 0x03, 0x04]);
  });

  for (const [name, bytes] of Object.entries(BROKEN)) {
    it(`${name}: every reader throws an Error, promptly`, { timeout: 2000 }, async () => {
      expect(() => bufferToCsv(bytes)).toThrow(Error);
      expect(() => sampleRawFromBuffer(bytes)).toThrow(Error);
      await expect(readTemplateBuffer(bytes)).rejects.toBeInstanceOf(Error);
      await expect(fileToCsv(new File([bytes], "broken.xlsx"))).rejects.toBeInstanceOf(Error);
    });
  }
});
