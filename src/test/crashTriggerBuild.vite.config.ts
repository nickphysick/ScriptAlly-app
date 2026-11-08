/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * A one-module build for src/test/crashTriggerProd.test.ts: PageBoundary as a library, with the
 * app's own React plugin and the mode the test asks for. React is external, so the build is a few
 * seconds and holds only what the boundary itself pulls in.
 */
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  logLevel: "error",
  build: {
    outDir: process.env.SA_TRIGGER_OUT,
    emptyOutDir: true,
    minify: true,
    lib: { entry: resolve(__dirname, "../components/PageBoundary.tsx"), formats: ["es"], fileName: "boundary" },
    rollupOptions: { external: [/^react(\/|$)/, /^react-dom(\/|$)/] },
  },
});
