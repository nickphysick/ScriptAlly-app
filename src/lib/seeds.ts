/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Manuscript,
  ManuscriptStatus,
  ManuscriptVersion,
  ComponentType,
  SubmissionPackage,
  Agent,
  SubmissionStatus,
  SubmissionMethod,
  Query,
  QueryStatus,
  Activity,
  ActivityType,
  JournalEntry
} from "../types";

export const SEED_USER_ID = "writer-pro-lucy";

export const seedManuscripts: Manuscript[] = [
  {
    id: "ms-1",
    userId: SEED_USER_ID,
    title: "The Book of Lost Clockworks",
    genre: "Historical Fantasy",
    ageCategory: "Young Adult",
    wordCount: 92400,
    logline: "In an alternate 1880 London, a clockmaker's apprentice discovers that her mechanical pocket watch holds the memories of the city's lost library.",
    comparableTitles: "The Starless Sea meets Jonathan Strange & Mr Norrell",
    status: ManuscriptStatus.QUERYING,
    statusChangedDate: "2026-04-10T14:30:00Z",
  }
];

export const seedVersions: ManuscriptVersion[] = [
  {
    id: "ver-ql-1",
    manuscriptId: "ms-1",
    userId: SEED_USER_ID,
    componentType: ComponentType.QUERY_LETTER,
    versionName: "Query Letter v1 (Focus: Concept)",
    fileAttached: true,
    fileName: "Lost_Clockworks_QL_v1.pdf",
    createdDate: "2026-04-01T09:00:00Z",
    contentDraft: "Dear [Agent Name],\n\nI am thrilled to present THE BOOK OF LOST CLOCKWORKS, a 92,400-word standalone historical fantasy with series potential..."
  },
  {
    id: "ver-ql-2",
    manuscriptId: "ms-1",
    userId: SEED_USER_ID,
    componentType: ComponentType.QUERY_LETTER,
    versionName: "Query Letter v2 (Focus: Character Voice)",
    fileAttached: true,
    fileName: "Lost_Clockworks_QL_v2_Voice.pdf",
    createdDate: "2026-04-12T11:45:00Z",
    contentDraft: "Dear [Agent Name],\n\nIn alternate 1880 London, memories aren't remembered—they are wound. Seventeen-year-old Emily knows exactly how many ticks her clockwork heart has left..."
  },
  {
    id: "ver-syn-1",
    manuscriptId: "ms-1",
    userId: SEED_USER_ID,
    componentType: ComponentType.SYNOPSIS,
    versionName: "Synopsis v1 (Full Outline)",
    fileAttached: true,
    fileName: "Clockworks_Synopsis_3Page.pdf",
    createdDate: "2026-04-01T09:20:00Z",
    contentDraft: "THE BOOK OF LOST CLOCKWORKS centers on EMILY, an apprentice clockmaker who lives in London's gear-driven subterranean sector..."
  },
  {
    id: "ver-syn-2",
    manuscriptId: "ms-1",
    userId: SEED_USER_ID,
    componentType: ComponentType.SYNOPSIS,
    versionName: "Synopsis v2 (1-Page Fast)",
    fileAttached: true,
    fileName: "Clockworks_Synopsis_1Page.pdf",
    createdDate: "2026-04-14T08:30:00Z",
    contentDraft: "In an alternate London, mechanical gear-watches register municipal memories. Emily, an orphan watchmaker, inherits a copper gears-dial..."
  },
  {
    id: "ver-sp-1",
    manuscriptId: "ms-1",
    userId: SEED_USER_ID,
    componentType: ComponentType.SAMPLE_PAGES,
    versionName: "Sample Chapters (First 3)",
    fileAttached: true,
    fileName: "Clockworks_First_3_Chaps.pdf",
    createdDate: "2026-04-01T09:40:00Z",
    contentDraft: "Chapter 1: The Tick of Memory\n\nThe brass bellows of Sector 4 hummed like a drowsy bumblebee..."
  },
  {
    id: "ver-sp-2",
    manuscriptId: "ms-1",
    userId: SEED_USER_ID,
    componentType: ComponentType.SAMPLE_PAGES,
    versionName: "Sample Chapters (First 50 Pages)",
    fileAttached: true,
    fileName: "Clockworks_First_50_Pages.pdf",
    createdDate: "2026-04-15T10:15:00Z",
    contentDraft: "Chapter 1: The Tick of Memory...\nChapter 2: Subterranean Clocksmith...\nChapter 3: Copper Watch Gears..."
  },
  {
    id: "ver-fm-1",
    manuscriptId: "ms-1",
    userId: SEED_USER_ID,
    componentType: ComponentType.FULL_MANUSCRIPT,
    versionName: "Full Manuscript (Master Draft)",
    fileAttached: true,
    fileName: "The_Book_of_Lost_Clockworks_FINAL_April26.docx",
    createdDate: "2026-04-01T10:00:00Z",
    contentDraft: "FULL MANUSCRIPT STATE:\nChapters 1 through 32 complete."
  }
];

export const seedPackages: SubmissionPackage[] = [
  {
    id: "pkg-1",
    manuscriptId: "ms-1",
    userId: SEED_USER_ID,
    packageName: "Standard Premium Package",
    queryLetterVersionId: "ver-ql-2",
    synopsisVersionId: "ver-syn-1",
    samplePagesVersionId: "ver-sp-1",
    status: "Active",
    createdDate: "2026-04-15T12:00:00Z",
  },
  {
    id: "pkg-2",
    manuscriptId: "ms-1",
    userId: SEED_USER_ID,
    packageName: "Express Core Package",
    queryLetterVersionId: "ver-ql-1",
    synopsisVersionId: "ver-syn-2",
    samplePagesVersionId: "ver-sp-2",
    status: "Retired",
    createdDate: "2026-04-01T11:00:00Z",
  }
];

export const seedAgents: Agent[] = [
  {
    id: "agent-1",
    userId: SEED_USER_ID,
    name: "Charlotte Bronte",
    agency: "Highland & Moor Literary",
    email: "charlotte@highlandmoor.com",
    website: "https://highlandmoor.com/charlotte",
    twitter: "cbronte_writes",
    bluesky: "charlottebronte.bsky.social",
    instagram: "charlotte_moor",
    genres: ["Historical Fantasy", "Gothic Romance", "Young Adult"],
    mswlNotes: "Looking for fierce, independent heroines, slow-burn emotional stakes, atmospheric Victorian settings, and magic systems operating as extensions of human desire. No high-action space opera.",
    starRating: 5,
    submissionStatus: SubmissionStatus.OPEN,
    responseTimeWeeks: 6,
    noResponseMeansNo: false,
    submissionMethod: SubmissionMethod.EMAIL,
    materialsWanted: ["Query Letter", "Synopsis", "Sample Pages"],
    dateAdded: "2026-04-10T09:00:00Z",
    lastCheckedDate: "2026-05-25T11:20:00Z",
    notes: "Charlotte is my ultimate dream agent. She represents three authors whose atmospheric work is highly comparable to my manuscript.",
  },
  {
    id: "agent-2",
    userId: SEED_USER_ID,
    name: "Mary Shelley",
    agency: "Gothic Guild Agency",
    email: "sub_mary@gothicguild.com",
    website: "https://gothicguild.com/mary",
    twitter: "mshelley_monsters",
    genres: ["Historical Fantasy", "Science Fiction", "YA Sci-Fi"],
    mswlNotes: "Seeking speculative fiction dealing with the morality of creation, mechanical wonders, subterranean structures, and dark secrets. Wordcounts between 80k-110k preferred.",
    starRating: 5,
    submissionStatus: SubmissionStatus.OPEN,
    responseTimeWeeks: 4,
    noResponseMeansNo: true,
    submissionMethod: SubmissionMethod.ONLINE_FORM,
    materialsWanted: ["Query Letter", "Synopsis", "Sample Pages"],
    dateAdded: "2026-04-11T14:00:00Z",
    lastCheckedDate: "2026-05-18T10:30:00Z",
    notes: "She is extremely fast. If she doesn't respond in 4 weeks, it's a pass. Keep a close eye on the calendar.",
  },
  {
    id: "agent-3",
    userId: SEED_USER_ID,
    name: "Arthur Conan Doyle",
    agency: "Baker Street Associates",
    email: "contact@bakerstreetlit.com",
    website: "https://bakerstreetlit.com/doyle",
    genres: ["Historical Fantasy", "Mystery", "Historical Fiction"],
    mswlNotes: "Looking for clever puzzle-plot narratives, highly technical backgrounds, atmospheric fog, and strong companionships. Love clockworks and historical details.",
    starRating: 4,
    submissionStatus: SubmissionStatus.OPEN,
    responseTimeWeeks: 8,
    noResponseMeansNo: false,
    submissionMethod: SubmissionMethod.EMAIL,
    materialsWanted: ["Query Letter", "Sample Pages"],
    dateAdded: "2026-04-12T10:00:00Z",
    lastCheckedDate: "2026-05-20T16:00:00Z",
    notes: "Prefers very crisp explanations. Wants logic-oriented query letter hooks.",
  },
  {
    id: "agent-4",
    userId: SEED_USER_ID,
    name: "Charles Dickens",
    agency: "Pickwick Editorial",
    email: "queries_charles@pickwickagency.co.uk",
    website: "https://pickwickagency.co.uk/dickens",
    instagram: "dickens_london",
    genres: ["Historical Fiction", "Social Satire", "Gothic Romance"],
    mswlNotes: "Enjoys rich, expansive ensembles, subversion of Victorian values, chimney sweeps, gears, clock towers, and themes of societal inequality.",
    starRating: 3,
    submissionStatus: SubmissionStatus.CLOSED,
    responseTimeWeeks: 10,
    noResponseMeansNo: false,
    submissionMethod: SubmissionMethod.EMAIL,
    materialsWanted: ["Query Letter", "Synopsis"],
    dateAdded: "2026-04-13T11:00:00Z",
    lastCheckedDate: "2026-05-22T09:00:00Z",
    notes: "Currently closed, but says they will reopen in early June. Check her website on June 1st.",
  },
  {
    id: "agent-5",
    userId: SEED_USER_ID,
    name: "Bram Stoker",
    agency: "Transylvania Literary Hub",
    email: "submissions@transylvanialit.com",
    website: "https://transylvanialit.com/bram",
    genres: ["Historical Fantasy", "Gothic Romance", "Horror"],
    mswlNotes: "Drawn to letters, diary entries, news clippings, epistolary formats. Seeking dense Gothic atmospheres, clockwork engines, shadows, and folklore.",
    starRating: 4,
    submissionStatus: SubmissionStatus.OPEN,
    responseTimeWeeks: 12,
    noResponseMeansNo: false,
    submissionMethod: SubmissionMethod.ONLINE_FORM,
    materialsWanted: ["Query Letter", "Synopsis", "Sample Pages"],
    dateAdded: "2026-04-14T10:00:00Z",
    lastCheckedDate: "2026-05-24T14:30:00Z",
    notes: "Loves epistolary story elements. If I can weave letters into the query pitch, she will notice.",
  }
];

export const seedQueries: Query[] = [
  {
    id: "q-1",
    userId: SEED_USER_ID,
    manuscriptId: "ms-1",
    agentId: "agent-1",
    packageId: "pkg-1",
    status: QueryStatus.FULL_SENT,
    dateSent: "2026-04-16T10:00:00Z",
    personalisationNotes: "Mentioned I loved her client's atmospheric treatment in 'The Clockmaker's Ghost'.",
    sendMethod: SubmissionMethod.EMAIL,
    partialRequestedDate: "2026-04-20T11:00:00Z",
    partialSentDate: "2026-04-22T09:30:00Z",
    fullRequestedDate: "2026-05-10T14:00:00Z",
    fullSentDate: "2026-05-12T16:15:00Z",
    nudgeDate: "2026-06-30T09:00:00Z",
    // 6 weeks response time after material submittal
    responseDeadline: "2026-06-23T16:15:00Z",
  },
  {
    id: "q-2",
    userId: SEED_USER_ID,
    manuscriptId: "ms-1",
    agentId: "agent-2",
    packageId: "pkg-1",
    status: QueryStatus.QUERIED,
    // Sent 20 days ago (relative to June 1st) => May 12th
    dateSent: "2026-05-12T11:00:00Z",
    personalisationNotes: "Complimented her monster MSWL tweet.",
    sendMethod: SubmissionMethod.ONLINE_FORM,
    // Mary Shelley has 4 weeks response time, so expected by June 9th.
    responseDeadline: "2026-06-09T11:00:00Z",
  },
  {
    id: "q-3",
    userId: SEED_USER_ID,
    manuscriptId: "ms-1",
    agentId: "agent-3",
    packageId: "pkg-1",
    status: QueryStatus.PARTIAL_REQUESTED,
    // Sent 30 days ago => May 2nd. Request came in May 28th.
    dateSent: "2026-05-02T15:00:00Z",
    personalisationNotes: "Mentioned London mechanical geography.",
    sendMethod: SubmissionMethod.EMAIL,
    partialRequestedDate: "2026-05-28T10:15:00Z",
    // Not sent yet, making it a critical, overdue task! Nudge due/follow up expected.
    responseDeadline: "2026-06-04T10:15:00Z",
  },
  {
    id: "q-4",
    userId: SEED_USER_ID,
    manuscriptId: "ms-1",
    agentId: "agent-4",
    packageId: "pkg-2",
    status: QueryStatus.REJECTED,
    dateSent: "2026-04-02T13:00:00Z",
    personalisationNotes: "Discussed PICKWICK papers matching mechanical gears.",
    sendMethod: SubmissionMethod.EMAIL,
    responseDeadline: "2026-04-20T13:00:00Z",
  },
  {
    id: "q-5",
    userId: SEED_USER_ID,
    manuscriptId: "ms-1",
    agentId: "agent-5",
    packageId: "pkg-1",
    status: QueryStatus.QUERIED,
    // Sent 48 days ago => April 14th! Time window (12 weeks) is active. Expected on July 7th.
    dateSent: "2026-04-14T09:00:00Z",
    personalisationNotes: "Shared love for epistolary diaries.",
    sendMethod: SubmissionMethod.ONLINE_FORM,
    responseDeadline: "2026-07-07T09:00:00Z",
  }
];

export const seedActivities: Activity[] = [
  {
    id: "act-1",
    userId: SEED_USER_ID,
    queryId: "q-1",
    manuscriptId: "ms-1",
    activityType: ActivityType.QUERY_SENT,
    description: "Query sent to Charlotte Bronte at Highland & Moor Literary",
    date: "2026-04-16T10:00:00Z",
    details: "Expect a response by 28 May 2026",
  },
  {
    id: "act-2",
    userId: SEED_USER_ID,
    queryId: "q-1",
    manuscriptId: "ms-1",
    activityType: ActivityType.STATUS_CHANGED,
    description: "Great news! Charlotte Bronte at Highland & Moor Literary requested a partial manuscript!",
    date: "2026-04-20T11:00:00Z",
    details: "Requested first 50 pages. Quote: 'I must read more of Emily and her watchwork heart'!",
  },
  {
    id: "act-3",
    userId: SEED_USER_ID,
    queryId: "q-1",
    manuscriptId: "ms-1",
    activityType: ActivityType.MATERIALS_SENT,
    description: "Sent partial manuscript to Charlotte Bronte at Highland & Moor Literary.",
    date: "2026-04-22T09:30:00Z",
    details: "If you haven't heard back by 3 Jun 2026, we'll suggest sending a follow-up.",
  },
  {
    id: "act-4",
    userId: SEED_USER_ID,
    queryId: "q-1",
    manuscriptId: "ms-1",
    activityType: ActivityType.STATUS_CHANGED,
    description: "Amazing news! Charlotte Bronte at Highland & Moor Literary requested a full manuscript!",
    date: "2026-05-10T14:00:00Z",
    details: "Polish your manuscript and send to Charlotte as soon as you can.",
  },
  {
    id: "act-5",
    userId: SEED_USER_ID,
    queryId: "q-1",
    manuscriptId: "ms-1",
    activityType: ActivityType.MATERIALS_SENT,
    description: "Full manuscript sent to Charlotte Bronte at Highland & Moor Literary.",
    date: "2026-05-12T16:15:00Z",
    details: "If you haven't heard back by 23 Jun 2026, we'll suggest sending a follow-up.",
  },
  {
    id: "act-6",
    userId: SEED_USER_ID,
    queryId: "q-2",
    manuscriptId: "ms-1",
    activityType: ActivityType.QUERY_SENT,
    description: "Query sent to Mary Shelley at Gothic Guild Agency",
    date: "2026-05-12T11:00:00Z",
    details: "Expect a response by 9 Jun 2026",
  },
  {
    id: "act-7",
    userId: SEED_USER_ID,
    queryId: "q-3",
    manuscriptId: "ms-1",
    activityType: ActivityType.QUERY_SENT,
    description: "Query sent to Arthur Conan Doyle at Baker Street Associates",
    date: "2026-05-02T15:00:00Z",
    details: "Expect a response by 27 Jun 2026",
  },
  {
    id: "act-8",
    userId: SEED_USER_ID,
    queryId: "q-3",
    manuscriptId: "ms-1",
    activityType: ActivityType.STATUS_CHANGED,
    description: "Great news! Arthur Conan Doyle at Baker Street Associates requested a partial manuscript!",
    date: "2026-05-28T10:15:00Z",
    details: "Requested Sample Chapters. Quote: 'Intrigued by the puzzle aspect of Emily's heart gear.'",
  },
  {
    id: "act-9",
    userId: SEED_USER_ID,
    queryId: "q-4",
    manuscriptId: "ms-1",
    activityType: ActivityType.QUERY_SENT,
    description: "Query sent to Charles Dickens at Pickwick Editorial",
    date: "2026-04-02T13:00:00Z",
    details: "Expect a response by 11 Jun 2026",
  },
  {
    id: "act-10",
    userId: SEED_USER_ID,
    queryId: "q-4",
    manuscriptId: "ms-1",
    activityType: ActivityType.STATUS_CHANGED,
    description: "Charles Dickens from Pickwick Editorial has rejected your query. Keep going — it's all part of the journey.",
    date: "2026-04-20T13:00:00Z",
    details: "Quote: 'The writing is lovely, but pickwickian ensembles are my focus and this space doesn't quite fit.'",
  },
  {
    id: "act-11",
    userId: SEED_USER_ID,
    queryId: "q-5",
    manuscriptId: "ms-1",
    activityType: ActivityType.QUERY_SENT,
    description: "Query sent to Bram Stoker at Transylvania Literary Hub",
    date: "2026-04-14T09:00:00Z",
    details: "Expect a response by 7 Jul 2026",
  }
];

export const seedJournalEntries: JournalEntry[] = [
  {
    id: "j-1",
    userId: SEED_USER_ID,
    queryId: "q-1",
    entryText: "Sent Charlotte Bronte my query letters pack. My hand was shaking on the send button but she represents some of my all-time favorite speculative works.",
    createdAt: "2026-04-16T10:30:00Z"
  },
  {
    id: "j-2",
    userId: SEED_USER_ID,
    queryId: "q-1",
    entryText: "CHarlotte Bronte just requested fifty pages!! I am absolutely over the moon. She sent such a wonderful personal comment about Emily's watchwork heart. Preparing first 50 pages now.",
    createdAt: "2026-04-20T11:45:00Z"
  },
  {
    id: "j-3",
    userId: SEED_USER_ID,
    queryId: "q-1",
    entryText: "SHE ASKED FOR THE FULL MANUSCRIPT. Oh my god. This is real. This is happening. I spent all night proofing Chapters 14-32 to make sure there are no remaining layout typos. Full Master draft uploaded.",
    createdAt: "2026-05-10T15:00:00Z"
  },
  {
    id: "j-4",
    userId: SEED_USER_ID,
    queryId: "q-2",
    entryText: "Submitted via QueryManager. Mary has a 4-week hard turn policy. If I don't hear by early June I guess that's that, but hoping for the best.",
    createdAt: "2026-05-12T11:15:00Z"
  },
  {
    id: "j-5",
    userId: SEED_USER_ID,
    queryId: "q-3",
    entryText: "Doyle has requested a partial chapter set! But I need to double check version v2 pages to make sure the London map updates align correctly with his query request.",
    createdAt: "2026-05-28T10:30:00Z"
  }
];

export const seedFacts = [
  {
    title: "The Rejections of Classics",
    fact: "Frank Herbert was rejected by 23 publishers before 'Dune' was accepted. One editor wrote: 'I might be making the mistake of the decade, but...'—it sold 20 million copies."
  },
  {
    title: "Astrid Lindgren's Pippi Longstocking",
    fact: "Pippi Longstocking was rejected by Sweden's major publisher in 1944. Astrid Lindgren rewritten and published it elsewhere; it became an international masterpiece."
  },
  {
    title: "Harry Potter's Magical 12",
    fact: "J.K. Rowling’s manuscript for 'Harry Potter and the Philosopher's Stone' was rejected by 12 publishers before bloomsbury paid a small £1,500 advance."
  },
  {
    title: "Lolita and the Five Coffins",
    fact: "Vladimir Nabokov was rejected repeatedly and almost burned the Lolita manuscript in an incinerator; his wife Vera snatched it out of the flames."
  },
  {
    title: "The Carrie Waste Basket",
    fact: "Stephen King threw the first pages of 'Carrie' into the trash. His wife Tabitha retrieved them, urged him to finish, and it launched his legendary career."
  }
];

export const seedQuotes = [
  { text: "Writing is a way of talking without being interrupted.", author: "Jules Renard" },
  { text: "There is no greater agony than bearing an untold story inside you.", author: "Maya Angelou" },
  { text: "First, find out what your hero wants, then just follow him.", author: "Ray Bradbury" },
  { text: "You must write the book that wants to be written.", author: "Madeleine L'Engle" },
  { text: "The first draft is just you telling yourself the story.", author: "Terry Pratchett" }
];
