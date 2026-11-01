import {StrictMode, type ComponentType} from 'react';
import {createRoot} from 'react-dom/client';

/**
 * Split v1, phase 4 — the root is chosen by the build-time flag. A landing-only build (production,
 * queryhawk.net) loads the public site and nothing else; every other build loads the whole app.
 *
 * ⚠️ THE CONDITION READS `import.meta.env` DIRECTLY, NOT `LANDING_ONLY` FROM siteMode. Vite replaces
 * it with a string literal, so the minifier sees `"true" === "true"` and drops the other branch,
 * and with it the other `import()` — a production bundle then holds no App chunk at all, not even
 * a lazy one. A constant imported from another module is not always folded.
 */
const load: () => Promise<{ default: ComponentType }> =
  import.meta.env.VITE_LANDING_ONLY === "true"
    ? () => import('./marketing/PublicRoot')
    : () => import('./AppRoot');

load().then(({ default: Root }) => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <Root />
    </StrictMode>,
  );
});
