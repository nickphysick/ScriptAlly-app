import {StrictMode, type ComponentType} from 'react';
import {createRoot} from 'react-dom/client';
import {reloadOnceForStaleChunk} from './lib/chunkReload';

/**
 * Split v1, phase 4 — the root is chosen by the build-time flag. A landing-only build (production,
 * queryhawk.net) loads the public site and nothing else; every other build loads the whole app.
 *
 * ⚠️ THE CONDITION READS `import.meta.env` DIRECTLY, NOT `LANDING_ONLY` FROM siteMode. Vite replaces
 * it with a string literal, so the minifier sees `"true" === "true"` and drops the other branch,
 * and with it the other `import()` — a production bundle then holds no App chunk at all, not even
 * a lazy one. A constant imported from another module is not always folded.
 *
 * ⚠️ AND APPROOT IS NAMED FIRST, ON PURPOSE. The CSS of a build is ordered by the order modules are
 * first met, and that walk reaches both imports before the dead branch is dropped. With PublicRoot
 * first, the whole app's stylesheet came out with the 1,147 marketing rules moved to its front; with
 * AppRoot first it is byte-identical to the build before the split.
 */
const load: () => Promise<{ default: ComponentType }> =
  import.meta.env.VITE_LANDING_ONLY !== "true"
    ? () => import('./AppRoot')
    : () => import('./marketing/PublicRoot');

/**
 * STALE-1: a tab opened before a deploy asks for the previous build's chunk after it, which is gone.
 * Both ways that surfaces (this import, and Vite's preload helper for any lazy chunk later) reload
 * the page once, which fetches the new build. lib/chunkReload stops a second reload looping.
 */
window.addEventListener('vite:preloadError', (event) => {
  if (reloadOnceForStaleChunk()) event.preventDefault();
});

load().then(({ default: Root }) => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <Root />
    </StrictMode>,
  );
}).catch((err) => {
  if (!reloadOnceForStaleChunk()) throw err;
});
