# CL24 unit locks — red first (25 Oct 2026)

Run in the worktree; each mutation applied to `src/lib/contactV24.ts`, restored from a path-derived backup.

| Lock | Mutation | Reading under mutation | Restored |
|---|---|---|---|
| CL24-E1 | case-sensitive match (`exact.has(g)` for `keys.has(genreKey(g))`) | `× matches whatever the case` · 1 failed / 14 passed | 15 passed |
| CL24-E2 | warn when this agent is live (`holdFor = others.find(live)`) | `× warns only when this agent has no live query and a colleague does` · 1 failed / 14 passed | 15 passed |
