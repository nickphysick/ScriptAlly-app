/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import "./onboarding/onboarding.css";
import "./onboarding/importFlow.css";
import "./import/importMatcher.css";
import { importedAgentDoc } from "../lib/importedAgent";
import { findExistingAgent, isSameQuery } from "../lib/importDuplicates";
import { writeImportedHistory } from "../lib/smartImportCommit";
import { OpenTitle, OptionGroup, OptionRow } from "./onboarding/setupParts";
import {
  MATCHER_TITLE, MATCHER_SUB, MATCHER_BACK, MATCHER_STEPS, KIND_QUESTION, KINDS, FILE_QUESTION, FILE_DROP, FILE_PASTE, FILE_READ,
  MAP_FIELD, MAP_SKIP, MAP_REQUIRED, MAP_LINK_NOTE, MAP_START_AGAIN, importRowsLabel, RUN_WORKING, RUN_KEEP_OPEN, RUN_PROGRESS,
  RUN_FINISHED, COUNT_IMPORTED, COUNT_NOT, COUNT_DECIDE, LOG_TITLE, DECIDE_NOTE, AFTER_ANOTHER, afterOpenLabel, LOG, ERR, matcherDate, undatedQueryLine,
} from "../lib/importMatcher";
import { useScriptAllyDb } from "../lib/db";
import { agentPrimary, AGENT_NOT_SPECIFIED } from "../lib/agentDisplay";
import { parseLegacyComps } from "../lib/comps";
import {
  UserPlan,
  QueryStatus,
  ManuscriptStatus,
  SubmissionMethod,
  SubmissionStatus,
  Agent,
  Manuscript,
  Query,
  Activity,
  ActivityType,
  User
} from "../types";
import {
  UploadCloud,
  CheckCircle,
  Database,
  Columns,
  AlertTriangle,
  FileText,
  Sparkles,
  ChevronRight,
  RefreshCw,
  Users,
  BookOpen,
  FileSpreadsheet,
  HelpCircle,
  User as UserIcon,
  Activity as ActivityIcon,
  Trash2
} from "lucide-react";

// Standard CSV Parsing Utility compliant with quoted linebreaks and escapes
function parseCSV(text: string): string[][] {
  const lines: string[][] = [];
  let row: string[] = [""];
  let insideQuote = false;
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];
    
    if (char === '"') {
      if (insideQuote && nextChar === '"') {
        row[row.length - 1] += '"';
        i++; // skip next quote
      } else {
        insideQuote = !insideQuote;
      }
    } else if (char === ',' && !insideQuote) {
      row.push("");
    } else if ((char === '\r' || char === '\n') && !insideQuote) {
      if (char === '\r' && nextChar === '\n') {
        i++; // skip next \n
      }
      lines.push(row);
      row = [""];
    } else {
      row[row.length - 1] += char;
    }
  }
  if (row.length > 1 || row[0] !== "") {
    lines.push(row);
  }
  
  // Filter out completely empty rows
  return lines.filter(r => r.some(cell => cell.trim() !== ""));
}

// Fuzzy Header Match Helper
function findFuzzyMatch(headers: string[], targetFields: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  
  const rules: Record<string, string[]> = {
    name: ["name", "agent", "contact", "full name", "agent name", "person", "representative", "username", "pen name"],
    agency: ["agency", "literary agency", "company", "firm", "organization"],
    email: ["email", "e-mail", "email address", "contact email", "address", "registered email"],
    website: ["website", "site", "url", "web page", "web", "link"],
    genres: ["genres", "categories", "subjects", "genre list", "tags"],
    mswlNotes: ["mswl", "mswl notes", "manuscript wish list", "wishlist", "interests"],
    starRating: ["rating", "stars", "star rating", "rank", "importance", "priority"],
    notes: ["notes", "comments", "remarks", "memo", "description"],
    
    title: ["title", "book title", "work", "manuscript title", "novel", "manuscript", "story"],
    genre: ["genre", "category", "manuscript genre", "book genre"],
    wordCount: ["word count", "words", "wordcount", "length", "size"],
    logline: ["logline", "hook", "pitch", "one line", "elevator pitch", "summary"],
    comps: ["comps", "comparable titles", "comparables", "similar books"],
    ageCategory: ["age category", "audience", "target audience", "age", "category classification"],
    
    manuscriptId: ["manuscript", "manuscript title", "book", "story", "work to query", "related title"],
    agentId: ["agent", "agent name", "recipient", "contact queried"],
    status: ["status", "query status", "outcome", "state", "result", "action", "status state", "subscription state"],
    dateSent: ["date sent", "sent date", "date", "lodged", "dispatched", "sent"],
    personalisationNotes: ["personalization", "personalisation", "pitch intro", "personalized notes"],

    queryId: ["query", "query id", "queryid", "related query", "submission"],
    activityType: ["type", "activity type", "action", "event", "event type"],
    description: ["description", "summary", "activity desc", "short explanation", "message", "subject"],
    date: ["date", "timestamp", "recorded date", "created date", "recorded", "time", "sign up date"],
    details: ["details", "body", "further info", "payload", "extra", "notes"],

    plan: ["plan", "user plan", "account level", "level", "tier", "plan tier"],
    trialStartDate: ["trial start", "trial startDate", "start date", "subscribed date"]
  };

  for (const field of targetFields) {
    const matchedHeader = headers.find(h => {
      const cleanHeader = h.toLowerCase().trim().replace(/[_\-\s]+/g, "");
      const fieldList = rules[field] || [field];
      return fieldList.some(keyword => {
        const cleanKeyword = keyword.replace(/[_\-\s]+/g, "");
        return cleanHeader === cleanKeyword || cleanHeader.includes(cleanKeyword) || cleanKeyword.includes(cleanHeader);
      });
    });
    if (matchedHeader) {
      mapping[field] = matchedHeader;
    } else {
      mapping[field] = "";
    }
  }
  
  return mapping;
}

// Convert common statuses to official enums
function normalizeQueryStatus(val: string): QueryStatus {
  const clean = val.toLowerCase().trim();
  if (clean.includes("reject") || clean === "pass" || clean === "no" || clean === "no thanks" || clean === "no reply") {
    return QueryStatus.REJECTED;
  }
  if (clean.includes("partial req") || clean.includes("request partial")) {
    return QueryStatus.PARTIAL_REQUESTED;
  }
  if (clean.includes("partial sent") || clean.includes("sent partial")) {
    return QueryStatus.PARTIAL_SENT;
  }
  if (clean.includes("full req") || clean.includes("request full")) {
    return QueryStatus.FULL_REQUESTED;
  }
  if (clean.includes("full sent") || clean.includes("sent full")) {
    return QueryStatus.FULL_SENT;
  }
  if (clean.includes("r&r") || clean.includes("revise") || clean.includes("resubmit")) {
    return QueryStatus.REVISE_RESUBMIT;
  }
  if (clean.includes("offer") || clean.includes("representation")) {
    return QueryStatus.OFFER;
  }
  if (clean.includes("withdraw")) {
    return QueryStatus.WITHDRAWN;
  }
  if (clean.includes("cnr") || clean.includes("no response") || clean.includes("closed")) {
    return QueryStatus.NO_RESPONSE;
  }
  return QueryStatus.QUERIED; // Default
}

// ⚠️ NO "user" ROW TYPE. It mapped spreadsheet columns onto the signed-in user's own profile —
// including `plan`, so a cell reading "Pro" upgraded the account for free. `plan` has been removed
// from the rules' user-update allowlist, so the writer could not work now even if it returned.
// An import brings the writer's QUERYING HISTORY across; it does not edit their account.
type ImportType = "agents" | "manuscripts" | "queries" | "activities";

export const ImportCsv: React.FC<{
  onNavigate: (tab: string, subPageName?: string) => void;
  /** Back to the Import page's tiles. */
  onBack?: () => void;
}> = ({ onNavigate, onBack }) => {
  const {
    currentUser,
    agents,
    manuscripts,
    queries,
    addAgent,
    addManuscript,
    addQuery,
    addActivity,
    updateQuery,
  } = useScriptAllyDb();

  const [importType, setImportType] = useState<ImportType>("agents");
  const [step, setStep] = useState<number>(1); // Step 1: Input, Step 2: Mapping, Step 3: Run
  const [fileName, setFileName] = useState<string>("");
  const [readError, setReadError] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const [rawText, setRawText] = useState<string>("");
  const [csvRows, setCsvRows] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  
  // Field Column mapping
  const [fieldMappings, setFieldMappings] = useState<Record<string, string>>({});
  
  // Execution variables
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [importProgress, setImportProgress] = useState<number>(0);
  const [importResults, setImportResults] = useState<{
    successful: number;
    failed: number;
    errors: string[];
    logs: string[];
    /**
     * ⚠️ THE THIRD COUNT, AND IT IS NOT A KIND OF FAILURE (D5). A row that imported without a
     * manuscript or an agent is ON THE RECORD — it just has a gap the writer has to close.
     * Counting it as "failed" would say the data is not there; counting it as "successful" would
     * say nothing needs doing. It is its own state because it is its own fact.
     */
    /**
     * ⚠️ IT CARRIES THE CSV'S OWN VALUES AND NOTHING ELSE (D2). `msTitle` and `agentName` are what
     * the row said; there is no genre, logline, word count or email here because the row did not
     * supply them, and creation must not fill what was never given.
     */
    unmatched: {
      row: number; missing: string; detail: string;
      queryId: string; msTitle: string; agentName: string;
      needsMs: boolean; needsAgent: boolean;
    }[];
  }>({ successful: 0, failed: 0, errors: [], logs: [], unmatched: [] });

  const targetFields = {
    agents: ["name", "agency", "email", "website", "genres", "mswlNotes", "starRating", "notes"],
    manuscripts: ["title", "genre", "wordCount", "logline", "comps", "ageCategory"],
    queries: ["manuscriptId", "agentId", "status", "dateSent", "personalisationNotes"],
    activities: ["queryId", "manuscriptId", "activityType", "description", "date", "details"],
    user: ["name", "email", "plan", "trialStartDate", "subscriptionStatus"]
  };

  // Helper template strings for Excel/Google Sheets copy paste instructions
  const columnExamples = {
    agents: "Name, Agency, Email, Website, Genres, MSWL Notes, Star Rating, Notes",
    manuscripts: "Title, Genre, Word Count, Logline, Comps, Audience Age",
    queries: "Manuscript Title, Agent Name, State, Date Sent, Custom Intro Text",
    activities: "Related Query, Related Title, Event Type, Description, Date, Extras",
    user: "Pen Name, Email, Plan Tier, Sign up Date, Subscription State"
  };

  // Handle Initial parsing
  const handleParse = () => {
    if (!rawText.trim()) {
      setReadError("Choose a file or paste the rows first.");
      return;
    }
    
    const rows = parseCSV(rawText);
    if (rows.length < 2) {
      setReadError("The file needs a row of headings and at least one row beneath it.");
      return;
    }
    
    setReadError(null);
    const parsedHeaders = rows[0].map(h => h.trim());
    setHeaders(parsedHeaders);
    setCsvRows(rows.slice(1));
    
    // Attempt fuzzy guess pre-mappings
    const fields = targetFields[importType];
    const initialMapping = findFuzzyMatch(parsedHeaders, fields);
    setFieldMappings(initialMapping);
    
    setStep(2);
  };

  // File Uploader handler
  const readFile = (file: File | undefined | null) => {
    if (!file) return;
    setFileName(file.name);
    setReadError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setRawText(text);
    };
    reader.readAsText(file);
  };
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => readFile(e.target.files?.[0]);

  // Handle execution of the import
  /**
   * ⚠️ CREATION WITH CONSENT, FROM VALUES THE ROW ACTUALLY GAVE (D2).
   *
   * The importer no longer creates anything by itself; this runs only when the writer asks, from
   * the summary. It writes the TITLE the CSV carried and the NAME the CSV carried, and leaves every
   * other field empty — no genre, no logline, no age category, no word count, no email, no star
   * rating. An empty logline is honest; a written one is a sentence about someone's novel that they
   * did not write.
   *
   * ⚠️ AND IT RESOLVES THE FLAG BY LINKING, not by clearing it. The query's `manuscriptId` /
   * `agentId` are filled in, so the row stops being counted by the derived banner because it has
   * what it needed — there is no flag field to unset, which is the point of deriving it.
   */
  const [creating, setCreating] = useState<number | null>(null);
  const createFromRow = async (u: {
    row: number; queryId: string; msTitle: string; agentName: string;
    needsMs: boolean; needsAgent: boolean;
  }) => {
    if (!currentUser) return;
    setCreating(u.row);
    try {
      const patch: { manuscriptId?: string; agentId?: string } = {};
      if (u.needsMs && u.msTitle) {
        const id = "ms-fromrow-" + Math.random().toString(36).slice(2, 11);
        const res = await addManuscript({
          id,
          title: u.msTitle,
          /* ⚠️ EVERY ONE OF THESE IS THE FIELD'S EMPTY FORM, not a default. The rules ask for a
             string or an int; they do not ask for a value, and neither does the writer. */
          genre: "", subGenres: [], wordCount: 0, logline: "", ageCategory: "", comps: [],
          status: ManuscriptStatus.QUERYING,
        } as never, true);
        if (res.success) patch.manuscriptId = id;
      }
      if (u.needsAgent && u.agentName) {
        const id = "agent-fromrow-" + Math.random().toString(36).slice(2, 11);
        /* The row gave a name and nothing else, so the agent holds a name and nothing else. The
           builder writes the fields the rules require in their empty form (see importedAgent.ts). */
        const res = await addAgent({ ...importedAgentDoc({ name: u.agentName }), id }, true);
        if (res.success) patch.agentId = id;
      }
      if (Object.keys(patch).length) {
        await updateQuery(u.queryId, patch as never);
        setImportResults((r) => ({ ...r, unmatched: r.unmatched.filter((x) => x.row !== u.row) }));
      }
    } finally {
      setCreating(null);
    }
  };

  const handleExecuteImport = async () => {
    setIsImporting(true);
    setImportProgress(0);
    setStep(3);
    
    let successfulCount = 0;
    let failedCount = 0;
    const errorsList: string[] = [];
    const unmatchedList: {
    row: number; missing: string; detail: string;
    queryId: string; msTitle: string; agentName: string;
    needsMs: boolean; needsAgent: boolean;
  }[] = [];
    const runLogs: string[] = [];
    
    const total = csvRows.length;

    // Rolling model caches to enforce relational integration and block duplicates generated within the iteration loop
    const localManuscripts = [...manuscripts];
    const localAgents = [...agents];
    const localQueries = [...queries];
    
    for (let index = 0; index < total; index++) {
      const row = csvRows[index];
      
      // Get values mapped by columns
      const getMappedValue = (field: string): string => {
        const colHeader = fieldMappings[field];
        if (!colHeader) return "";
        const colIdx = headers.indexOf(colHeader);
        return colIdx !== -1 && row[colIdx] !== undefined ? row[colIdx].trim() : "";
      };

      try {
        if (importType === "agents") {
          const name = getMappedValue("name");
          if (!name) {
            failedCount++;
            errorsList.push(ERR.noName(index + 2));
            continue;
          }

          // Strict de-duplicate matching
          /* The one agent match every import uses (importDuplicates.ts): same name, and the same
             agency or one side giving none. The row is not imported, and is counted as not imported. */
          const foundAgent = findExistingAgent(localAgents, { name, agency: getMappedValue("agency") });
          if (foundAgent) {
            errorsList.push(LOG.agentExists(name));
            failedCount++;
            continue;
          }
          
          /**
           * ⚠️ NO FABRICATED FIELD VALUES (overnight ruling, rule 8). Seven of these carried a `||`
           * fallback that wrote something the writer never supplied — `"Independent"` for an agency,
           * `"unlisted@agent.com"` for an email, `"A compelling new manuscript."` for a logline,
           * `"Fiction"` for a genre, `"Adult"` for an age category, and invented MSWL and
           * personalisation notes. An empty field is honest; a filled one is a claim.
           *
           * ⚠️ THE EMAIL IS THE ONE TO REMEMBER. A fabricated address sits on a real person's record
           * and can be SENT TO — and nothing downstream distinguishes it from one the writer typed.
           *
           * The last of them went with the import-truth pack: a rating of 3 for an empty cell,
           * "Open", an 8-week reply window, "no response means no", three materials and the genre
           * "General Fiction". The agent is now built by `importedAgentDoc`, which holds what the
           * sheet gave and nothing else.
           */
          const agency = getMappedValue("agency");
          const email = getMappedValue("email");
          const website = getMappedValue("website") || "";
          
          // Custom parsing for genres (split by comma, semicolon, etc.)
          const genresRaw = getMappedValue("genres");
          const genres = genresRaw ? genresRaw.split(/[,;|]+/).map(g => g.trim()).filter(Boolean) : [];
          const mswlNotes = getMappedValue("mswlNotes");
          const notes = getMappedValue("notes");

          /* Only what the sheet gave. A rating is kept when the cell holds 1 to 5; nothing else is
             filled in: no status, no reply window, no reply rule, no materials, no genre. */
          const agentData = importedAgentDoc({
            name, agency, email, website, genres, mswlNotes, notes,
            starRating: getMappedValue("starRating"),
          });

          const newAgId = "agent-imported-" + Math.random().toString(36).substr(2, 9);
          const res = await addAgent({ ...agentData, id: newAgId }, true);
          if (res.success) {
            const addedAgRef = {
              ...agentData,
              id: newAgId,
              userId: currentUser?.id || "",
            } as (typeof localAgents)[number]; // a look-up entry for later rows; it is never written
            localAgents.push(addedAgRef);
            successfulCount++;
            runLogs.push(LOG.agentAdded(name, agency));
          } else {
            failedCount++;
            errorsList.push(ERR.agentFailed(name, res.error));
          }
          
        } else if (importType === "manuscripts") {
          const title = getMappedValue("title");
          if (!title) {
            failedCount++;
            errorsList.push(ERR.noTitle(index + 2));
            continue;
          }

          // De-duplicate matching
          const foundMs = localManuscripts.find(m => m.title.toLowerCase() === title.toLowerCase());
          if (foundMs) {
            errorsList.push(LOG.manuscriptExists(title));
            failedCount++;
            continue;
          }

          const genre = getMappedValue("genre");
          /* ⚠️ `0`, NOT 85000. This read `parseInt(…) || 85000` — a word count for the writer's own
             book, invented when the CSV did not carry one, and indistinguishable afterwards from a
             figure they typed. `0` is the field's not-set form (the rules ask only for an int >= 0)
             and the surfaces already render it as an empty field with a muted placeholder. */
          const wordCount = parseInt(getMappedValue("wordCount"), 10) || 0;
          const logline = getMappedValue("logline");
          // Comps column → structured titles-only comps (split on commas / " meets ").
          const comps = parseLegacyComps(getMappedValue("comps"));
          const ageCategory = getMappedValue("ageCategory");

          const msData = {
            title,
            genre,
            subGenres: [],
            wordCount,
            logline,
            comps,
            ageCategory,
            status: ManuscriptStatus.READY_TO_QUERY
          };

          const newMsId = "ms-imported-" + Math.random().toString(36).substr(2, 9);
          const res = await addManuscript({ ...msData, id: newMsId }, true);
          if (res.success) {
            const addedMsRef = {
              ...msData,
              id: newMsId,
              userId: currentUser?.id || "",
            } as any;
            localManuscripts.push(addedMsRef);
            successfulCount++;
            runLogs.push(LOG.manuscriptAdded(title));
          } else {
            failedCount++;
            errorsList.push(ERR.manuscriptFailed(title, res.error));
          }
          
        } else if (importType === "queries") {
          // Queries need linked Manuscript ID and Agent ID
          const msTitleInput = getMappedValue("manuscriptId");
          const agentNameInput = getMappedValue("agentId");
          const statusInput = getMappedValue("status");
          const dateSentInput = getMappedValue("dateSent");
          const personalisationNotes = getMappedValue("personalisationNotes");

          if (!msTitleInput || !agentNameInput) {
            failedCount++;
            errorsList.push(ERR.needsBoth(index + 2));
            continue;
          }

          // Case-insensitive lookups on dynamic local caches
          let foundMs = localManuscripts.find(m => m.title.toLowerCase() === msTitleInput.toLowerCase());
          let foundAgent = findExistingAgent(localAgents, { name: agentNameInput });

          /**
           * ⚠️ AN UNMATCHED ROW IS FLAGGED, NOT FABRICATED (overnight ruling, D1).
           *
           * This auto-created whatever the CSV did not match — a manuscript with
           * `genre: "Uncategorized Fiction"`, `wordCount: 80000`, `ageCategory: "General Adult"` and
           * a logline reading "Imported automatically to preserve Query relationships", and an
           * agent with `agency: "Pending Match"`, `email: "imported@zite.com"`, `starRating: 3` and
           * a stated response time. Thirteen values in two objects, none of them supplied by the
           * writer, none of them afterwards distinguishable from one that was.
           *
           * ⚠️ A LOGLINE IS THE WRITER'S OWN SENTENCE ABOUT THEIR OWN NOVEL, and a word count is a
           * fact about it. An email address is worse again, because it can be sent to. Preserving
           * the relationship was a good goal; inventing the thing at the other end of it is not the
           * way to do it.
           *
           * ⚠️ SO THE ROW FALLS THROUGH, and the machinery is already there: `manuscriptId: ""` /
           * `agentId: ""` below, the row recorded in `unmatchedList`, the summary's third count, and
           * the banner on the query list that stays until the last one is resolved. Those surfaces
           * shipped quiet precisely because this block never let anything reach them.
           *
           * Creation still happens — from the summary, on the writer's word, out of the values the
           * CSV actually gave (D2).
           */

          /**
           * ⚠️ AN IMPORTED QUERY CARRIES NO PACKAGE, AND `""` IS HOW THAT IS SAID.
           *
           * This wrote `packageId: "pkg-seed-default"` — an id defined NOWHERE in the repo — under
           * the comment "Fallback standard submittal". It was not a fallback to anything: it was a
           * pointer to nothing.
           *
           * ⚠️ AND THE CONSEQUENCE IS SILENCE, NOT A WRONG MESSAGE. I first recorded that such a
           * query would show the pane's "Package no longer exists" state. Measured, it does not:
           * that state belongs to snapshot groups, and a LINK to a missing package matches no
           * render branch at all. The query showed **no strip, no loose row and no fork** — the
           * whole "what went with this query" section blank, with nothing to click and nothing to
           * explain it. The fork is suppressed too, because `packageId` is truthy, so the writer is
           * never even offered the chance to say what they sent.
           *
           * A visible wrong message gets reported. A blank section gets read as "nothing to see".
           *
           * ⚠️ AND THE KEY STAYS PRESENT, because `isValidQuery` requires `data.packageId is
           * string` (firestore.rules:327). Omitting it altogether — the obvious reading of "write
           * no packageId" — is DENIED, so every imported query would silently fail to write.
           * Measured both ways before choosing: absent → PERMISSION_DENIED, `""` → accepted.
           * `""` is already the model's word for "no package": the seed writes it and
           * `materialsLinkWrites` returns it when clearing a link.
           */
          const queryId = "q-imported-" + Math.random().toString(36).substr(2, 9);
          const sent = matcherDate(dateSentInput);
          /* ALREADY HERE: the same agent, the same manuscript and the same sent day (or both with
             none). Nothing is written for the row, and it is counted as not imported. */
          if (foundMs && foundAgent && localQueries.some((ex) => isSameQuery(ex, { agentId: foundAgent!.id, manuscriptId: foundMs!.id, sentDate: sent.iso }))) {
            errorsList.push(LOG.queryExists(msTitleInput, agentNameInput));
            failedCount++;
            continue;
          }
          const queryData = {
            /**
             * ⚠️ NO INVENTED IDS (D1). These were `|| "ms-seed-fantasy"` and `|| "agent-seed-alex"`,
             * neither defined anywhere in the repo. The row was stored and then **invisible in every
             * view**: `matchesFilters` in Queries.tsx opens `if (!agent || !ms) return false`, so a
             * query naming a manuscript or agent that does not exist is dropped from the list at
             * every scope, with no filter selected and nothing to say it is there.
             *
             * ⚠️ `""`, NOT AN OMITTED KEY. `isValidQuery` requires `manuscriptId is string` and
             * `agentId is string`, so absence is DENIED — measured both ways: absent →
             * PERMISSION_DENIED, `""` → accepted, for each field and for both together. `""` is
             * already this model's word for "no link": `packageId` uses it and so does
             * `UNFILLED_SLOT`.
             */
            manuscriptId: foundMs?.id ?? "",
            agentId: foundAgent?.id ?? "",
            packageId: "",
            personalisationNotes,
            sendMethod: SubmissionMethod.EMAIL,
            status: normalizeQueryStatus(statusInput),
            /* The day the sheet wrote, or no sent date. Never the moment of the import. */
            ...(sent.iso ? { dateSent: sent.iso } : {}),
          };

          /* ⚠️ RECORDED BEFORE THE WRITE, so the row is reported whether or not the write succeeds —
             and phrased as a fact rather than a verdict (D8): what is missing, never "invalid". */
          if (!foundMs || !foundAgent) {
            const missing = !foundMs && !foundAgent ? "Needs a manuscript and an agent"
              : !foundMs ? "Needs a manuscript" : "Needs an agent";
            unmatchedList.push({
              row: index + 2,
              queryId,
              msTitle: msTitleInput,
              agentName: agentNameInput,
              needsMs: !foundMs,
              needsAgent: !foundAgent,
              missing,
              detail: [!foundMs ? `manuscript “${msTitleInput}”` : null,
                       !foundAgent ? `agent “${agentNameInput}”` : null]
                .filter(Boolean).join(" · "),
            });
          }
          /* `imported` stops addQuery setting a sent date of now and writing history stamped now;
             the history is then written here, from the sheet (the same writer the template uses). */
          const res = await addQuery({ ...queryData, id: queryId }, true, { imported: true });
          if (res.success) {
            await writeImportedHistory(
              currentUser?.id || "", queryId,
              { agentRef: "", status: queryData.status, sentDate: sent.iso },
              foundAgent?.name ?? agentNameInput, foundMs?.title ?? msTitleInput,
            );
            if (!sent.iso) {
              const line = undatedQueryLine(index + 2, dateSentInput, (sent as { why: "blank" | "ambiguous" | "unreadable" }).why);
              if (line) runLogs.push(line);
            }
            const addedQRef = {
              ...queryData,
              id: queryId,
              userId: currentUser?.id || "",
              responseDeadline: undefined
            };
            localQueries.push(addedQRef);
            successfulCount++;
            runLogs.push(LOG.queryAdded(msTitleInput, agentNameInput, normalizeQueryStatus(statusInput)));
          } else {
            failedCount++;
            errorsList.push(ERR.queryFailed(index + 2, res.error));
          }
        } else if (importType === "activities") {
          const msTitleInput = getMappedValue("manuscriptId");
          const activityTypeInput = getMappedValue("activityType");
          /* ⚠️ SAME RULING. An activity's description is what HAPPENED, in the writer's words;
             "Activity logged via CSV Import" is true about the import and says nothing about the
             event. Empty is honest. */
          const description = getMappedValue("description");
          /* An event is placed by its date. With none that can be read there is nowhere true to put
             it, so the row is not imported and the log says why. Never the moment of the import. */
          const eventDate = matcherDate(getMappedValue("date"));
          if (!eventDate.iso) {
            failedCount++;
            errorsList.push(ERR.eventNoDate(index + 2));
            continue;
          }
          const date = eventDate.iso;
          const details = getMappedValue("details") || "";

          let foundMs = localManuscripts.find(m => m.title.toLowerCase() === msTitleInput.toLowerCase());
          let foundQ = localQueries.find(q => {
            const ms = localManuscripts.find(m => m.id === q.manuscriptId);
            return ms && ms.title.toLowerCase() === msTitleInput.toLowerCase();
          });

          const actVal = activityTypeInput.toLowerCase();
          let activityType = ActivityType.STATUS_CHANGED;
          if (actVal.includes("nudge")) activityType = ActivityType.NUDGE_SENT;
          else if (actVal.includes("query")) activityType = ActivityType.QUERY_SENT;
          else if (actVal.includes("material")) activityType = ActivityType.MATERIALS_SENT;

          /**
           * ⚠️ AN ACTIVITY WITH NO QUERY IS NOT IMPORTED (D4), and this is the one place dropping is
           * right: an event with nothing to attach to is not a record, it is an orphan. It is
           * reported by ROW NUMBER rather than skipped silently — which is the distinction Nick's
           * ruling turns on. `q-seed-fantasy` made it worse than either: the activity was written,
           * attached to a query that does not exist, and visible from nowhere.
           */
          if (!foundQ) {
            failedCount++;
            errorsList.push(`Activity row ${index + 2}: no query matches this manuscript and agent, so there is nothing to attach the event to. Import the query first, then this row.`);
            continue;
          }
          const actData = {
            queryId: foundQ.id,
            manuscriptId: foundMs?.id ?? "",
            activityType,
            description,
            date,
            details
          };

          const res = await addActivity(actData);
          if (res.success) {
            successfulCount++;
            runLogs.push(LOG.eventAdded(description));
          } else {
            failedCount++;
            errorsList.push(ERR.eventFailed(res.error));
          }
        }
      } catch (err: any) {
        failedCount++;
        errorsList.push(ERR.rowUnreadable(index + 2, String(err?.message || err)));
      }

      setImportProgress(Math.round(((index + 1) / total) * 100));
      setImportResults({
        successful: successfulCount,
        unmatched: unmatchedList,
        failed: failedCount,
        errors: errorsList,
        logs: runLogs
      });
      
      // Artificial slight block yield delay for smooth browser rendering of progress logs
      await new Promise(r => setTimeout(r, 60));
    }

    setIsImporting(false);
  };

  const handleReset = () => {
    setStep(1);
    setRawText("");
    setFileName("");
    setReadError(null);
    setCsvRows([]);
    setHeaders([]);
    setFieldMappings({});
    setImportProgress(0);
    setImportResults({ successful: 0, failed: 0, errors: [], logs: [], unmatched: [] });
  };

  const fieldLabel = (field: string) =>
    field === "manuscriptId" ? "Reference Manuscript Title" : field === "agentId" ? "Target Agent Name" : field.replace(/([A-Z])/g, " $1");
  const isRequired = (field: string) => field === "name" || field === "title" || field === "manuscriptId" || field === "agentId";
  const hasLines = importResults.logs.length > 0 || importResults.errors.length > 0;
  /* A finished run is at 100%. The run's own counter is only advanced by rows that reach the end of
     the loop, so a file whose last row was not imported used to finish reading "67%". */
  const shownProgress = isImporting ? importProgress : 100;

  return (
    <div className="sf impg-flow impm" data-impm="" data-impm-step={step} data-impm-kind={importType}>
      {onBack && <button type="button" className="sf-link impm-back" onClick={onBack} data-impm="back">{MATCHER_BACK}</button>}
      <OpenTitle title={MATCHER_TITLE} sub={step === 2 ? MATCHER_SUB : undefined} />

      <ol className="im-steps impm-steps" aria-label="The three steps" data-impm="steps">
        {MATCHER_STEPS.map((label, i) => {
          const state = i + 1 < step ? "done" : i + 1 === step ? "on" : "todo";
          return (
            <React.Fragment key={label}>
              {i > 0 && <li className="im-stln" aria-hidden="true" />}
              <li className={`im-st${state === "on" ? " is-on" : state === "done" ? " is-done" : ""}`} data-state={state} aria-current={state === "on" ? "step" : undefined}>
                <i>{state === "done" ? "✓" : i + 1}</i>{label}
              </li>
            </React.Fragment>
          );
        })}
      </ol>

      {/* ── 1 · Your file ── */}
      {step === 1 && (
        <section className="sf-card impm-card" data-impm="card">
          <p className="sf-qlab" id="impm-kind">{KIND_QUESTION}</p>
          <OptionGroup labelledBy="impm-kind">
            {KINDS.map((k) => (
              <OptionRow key={k.id} title={k.title} desc={k.desc} selected={importType === k.id} onClick={() => setImportType(k.id)} />
            ))}
          </OptionGroup>

          <p className="sf-qlab impm-gap" id="impm-file">{FILE_QUESTION}</p>
          <div
            className={`sf-drop impm-drop${over ? " is-over" : ""}`} role="button" tabIndex={0} data-impm="drop" aria-labelledby="impm-file"
            onClick={() => fileRef.current?.click()}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileRef.current?.click(); } }}
            onDragOver={(e) => { e.preventDefault(); if (!over) setOver(true); }}
            onDragLeave={() => setOver(false)}
            onDrop={(e) => { e.preventDefault(); setOver(false); readFile(e.dataTransfer.files?.[0]); }}
          >
            <p className="sf-droplead">{FILE_DROP}</p>
            <p className="sf-droptypes">{fileName ? fileName : `Expected header example: ${columnExamples[importType]}`}</p>
          </div>
          <input ref={fileRef} type="file" accept=".csv" onChange={handleFileUpload} style={{ display: "none" }} data-impm="file" />

          <label className="sf-lab impm-gap" htmlFor="impm-paste">{FILE_PASTE}</label>
          <textarea
            id="impm-paste" className="impm-paste" rows={6} value={rawText} data-impm="paste"
            onChange={(e) => setRawText(e.target.value)}
            placeholder={columnExamples[importType]}
          />
          {readError && <p className="sf-err sf-err--card" role="alert">{readError}</p>}

          <div className="sf-cfoot sf-cfoot--end">
            <span className="sf-footr">
              <button type="button" className="sf-btn" onClick={handleParse} data-impm="read">{FILE_READ}</button>
            </span>
          </div>
        </section>
      )}

      {/* ── 2 · Match columns ── */}
      {step === 2 && (
        <section className="sf-card impm-card" data-impm="card">
          <table className="impm-map" data-impm="map">
            <thead>
              <tr><th scope="col">{MAP_FIELD}</th><th scope="col">Column in your file</th></tr>
            </thead>
            <tbody>
              {targetFields[importType].map((field) => (
                <tr key={field}>
                  <th scope="row">
                    <span className="impm-field">{fieldLabel(field)}</span>
                    {isRequired(field) && <span className="impm-req">{MAP_REQUIRED}</span>}
                  </th>
                  <td>
                    <select
                      className="sf-in impm-select" value={fieldMappings[field] || ""} aria-label={fieldLabel(field)}
                      onChange={(e) => setFieldMappings({ ...fieldMappings, [field]: e.target.value })}
                    >
                      <option value="">{MAP_SKIP}</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>Matched to: "{h}"</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="impm-preview" data-impm="preview">
            <p className="sf-lab">Quick Row Mapping Sample of parsed table ({csvRows.length} total rows)</p>
            <div className="impm-previewscroll">
              <table className="impm-prev">
                <thead>
                  <tr>
                    {targetFields[importType].slice(0, 4).map((f) => (
                      <th key={f}>{f === "manuscriptId" ? "Manuscript" : f === "agentId" ? "Agent" : f.replace(/([A-Z])/g, " $1")}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {csvRows.slice(0, 2).map((row, idx) => (
                    <tr key={idx}>
                      {targetFields[importType].slice(0, 4).map((field) => {
                        const colName = fieldMappings[field];
                        const colIdx = headers.indexOf(colName);
                        const value = colIdx !== -1 && row[colIdx] !== undefined ? row[colIdx] : "--";
                        return <td key={field} title={value}>{field === "status" && importType === "queries" ? String(normalizeQueryStatus(value)) : String(value)}</td>;
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {importType === "queries" && <p className="impm-note" data-impm="link-note">{MAP_LINK_NOTE}</p>}

          <div className="sf-cfoot">
            <button type="button" className="sf-link sf-link--quiet" onClick={handleReset} data-impm="start-again">{MAP_START_AGAIN}</button>
            <span className="sf-footr">
              <button type="button" className="sf-btn" onClick={handleExecuteImport} data-impm="import">{importRowsLabel(csvRows.length)}</button>
            </span>
          </div>
        </section>
      )}

      {/* ── 3 · Import ── */}
      {step === 3 && (
        <section className="sf-card impm-card" data-impm="card" aria-busy={isImporting}>
          <h2 className="sf-h impm-runh" data-impm="run-title">{isImporting ? RUN_WORKING : RUN_FINISHED}</h2>
          {isImporting && <p className="impm-runsub">{RUN_KEEP_OPEN}</p>}

          <div className="impm-progress" data-impm="progress">
            <span className="sf-lab">{RUN_PROGRESS}</span>
            <span className="impm-track"><span style={{ width: `${shownProgress}%` }} /></span>
            <span className="impm-pc">{shownProgress}%</span>
          </div>

          <dl className="impm-counts" data-impm="counts">
            <div><dd>{importResults.successful}</dd><dt>{COUNT_IMPORTED}</dt></div>
            <div><dd>{importResults.failed}</dd><dt>{COUNT_NOT}</dt></div>
            <div><dd>{importResults.unmatched.length}</dd><dt>{COUNT_DECIDE}</dt></div>
          </dl>

          {/* ⚠️ QUIET WHEN NOTHING IS WRONG (D5). This block renders ONLY when a row needs a call — a
              clean import shows its counts and nothing else. */}
          {importResults.unmatched.length > 0 && (
            <div className="impm-decide" data-impm="decide">
              <p className="sf-lab">Rows that need a decision</p>
              <ul>
                {importResults.unmatched.map((u) => (
                  <li key={u.row} className="impm-drow">
                    <span className="impm-drown">Row {u.row}</span>
                    <span className="impm-drowt"><b>{u.missing}</b>{u.detail ? <span> — no match for {u.detail}</span> : null}</span>
                    {/* ⚠️ THE OFFER, NOT THE DEFAULT (D2). It creates from what the row gave — the title
                        and the name — and leaves everything else empty. */}
                    <button type="button" className="sf-link sf-link--quiet" disabled={creating === u.row} onClick={() => void createFromRow(u)}>
                      {creating === u.row ? "Creating…" : "Create from this row"}
                    </button>
                  </li>
                ))}
              </ul>
              {/* ⚠️ THE SUMMARY IS A MOMENT; THE FLAGS ARE THE RECORD (D6). Closing this loses nothing. */}
              <p className="impm-decidenote">{DECIDE_NOTE}</p>
            </div>
          )}

          {hasLines && (
            <div className="impm-logwrap">
              <p className="sf-lab">{LOG_TITLE}</p>
              <ul className="impm-log" data-impm="log">
                {importResults.logs.map((log, idx) => <li key={`l${idx}`}>{log}</li>)}
                {importResults.errors.map((err, idx) => <li key={`e${idx}`} className="is-err">{err}</li>)}
              </ul>
            </div>
          )}

          {!isImporting && (
            <div className="sf-cfoot">
              <button type="button" className="sf-link sf-link--quiet" onClick={handleReset} data-impm="another">{AFTER_ANOTHER}</button>
              <span className="sf-footr">
                <button
                  type="button" className="sf-btn" data-impm="open"
                  onClick={() => {
                    if (importType === "queries") onNavigate("queries");
                    else if (importType === "manuscripts") onNavigate("manuscripts");
                    else onNavigate("agents");
                  }}
                >
                  {afterOpenLabel(importType)}
                </button>
              </span>
            </div>
          )}
        </section>
      )}
    </div>
  );

};
