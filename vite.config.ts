import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import {execSync} from 'node:child_process';

/* Crash reporting v1: the release Sentry files errors under is the commit the build came from. */
const release = (() => {
  try { return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); }
  catch { return 'unknown'; }
})();

/* Cloudflare Web Analytics is no longer written into the built HTML: src/lib/cfAnalytics.ts adds the
   beacon at app start, on the live hosts only (2 Nov). */
export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    /* Help system v1 E — the feedback panel's VERSION line ("Beta, 19 Oct") is the build's date */
    define: {
      __QH_BUILD_DATE__: JSON.stringify(new Date().toISOString().slice(0, 10)),
      __QH_RELEASE__: JSON.stringify(release),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
