# Retired by Dashboard first visit v2 (30 Oct)

Each line: the lock, where it lived, and why it is retired rather than re-pointed.

- **DFV-A A4 "no scroll"** (`dashFirstVisit.measure.ts`): the one-screen pre-query page's law. Every first-visit state is
  feed v1's three columns now, a page that may scroll (Part A).
- **DFV-A A6 "the answer survives a reload"** (`dashFirstVisit.measure.ts`): the v1 question ("Have you sent any queries
  yet?", Yes / Not yet, stored in `todoPrefs.dash.start`) is gone. The answer is the sign-up answer; changing it writes
  `User.queryingStage` and `Manuscript.status`, re-read from Firestore by FV2 B1.
- **DFV-A A7 "the tip moves on per visit"** (`dashFirstVisit.measure.ts`): the Mentor bubble (`fv1/MentorTip`, deleted) and
  its per-visit tip are replaced by feed v1's Top tip carousel, which is DF1 E2's.

Re-pointed, with a note at each change: DFV-A A1 (the pre-query page is the three columns), A3 (no header; the book's
label), A8 (the loading beat's shape), DFV-C C2 (the last page never wraps round; it may say "finish getting started").
