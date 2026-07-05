/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
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

type ImportType = "agents" | "manuscripts" | "queries" | "activities" | "user";

export const ImportCsv: React.FC<{
  onNavigate: (tab: string, subPageName?: string) => void;
}> = ({ onNavigate }) => {
  const {
    currentUser,
    agents,
    manuscripts,
    queries,
    addAgent,
    addManuscript,
    addQuery,
    addActivity,
    updateUserProfile,
    cleanDuplicates,
    wipeAndResetDatabase
  } = useScriptAllyDb();

  const [confirmReset, setConfirmReset] = useState<boolean>(false);
  const [isResetting, setIsResetting] = useState<boolean>(false);
  const [resetSuccess, setResetSuccess] = useState<boolean>(false);

  const [importType, setImportType] = useState<ImportType>("agents");
  const [subTab, setSubTab] = useState<"wizard" | "grids">("wizard");
  const [gridSearch, setGridSearch] = useState<string>("");
  const [activeGridTab, setActiveGridTab] = useState<"agents" | "manuscripts" | "queries" | "activities" | "user">("agents");
  const [step, setStep] = useState<number>(1); // Step 1: Input, Step 2: Mapping, Step 3: Run
  const [rawText, setRawText] = useState<string>("");
  const [csvRows, setCsvRows] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  
  // Field Column mapping
  const [fieldMappings, setFieldMappings] = useState<Record<string, string>>({});
  
  // Execution variables
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [isCleaning, setIsCleaning] = useState<boolean>(false);
  const [cleanStats, setCleanStats] = useState<{ manuscriptsRemoved: number; agentsRemoved: number; queriesMapped: number; queriesRemoved?: number } | null>(null);
  const [importProgress, setImportProgress] = useState<number>(0);
  const [importResults, setImportResults] = useState<{
    successful: number;
    failed: number;
    errors: string[];
    logs: string[];
  }>({ successful: 0, failed: 0, errors: [], logs: [] });

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

  // Load a pre-populated demo CSV mock based on selections
  const loadDemoCsv = () => {
    let demoString = "";
    if (importType === "agents") {
      demoString = `"Agent Name","Literary Agency","E-Mail Address","Official Site","Genres Represented","MSWL Focus","Priority Star Rating","Personal Dossier Notes"
"Alexandra Stone","Foundry Literary + Media","astone@foundrymedia.com","https://foundrymedia.com/stone","Science Fiction, Fantasy, YA","Looking for climate fiction, high concept fantasy, character-driven YA",5,"MSWL details collected during London Book Fair."
"Jonathan Vance","Vanguard Creative Agency","jvance@vanguardcreative.co.uk","https://vanguardcreative.co.uk/jon","Thriller, Horror, Gothic","Dark academe settings, supernatural horrors with literary sensibilities, psychological lock-box thrillers",4,"Met at York Writers Conference."`;
    } else if (importType === "manuscripts") {
      demoString = `"Book Title","Primary Genre","Wordcount Total","One-Sentence Elevator Hook","Comparative Works / Comps","Intended Reader Age"
"The Clockwork Citadel","Steampunk Fantasy",98200,"In a city floating in oil, a guild clockmaker rebuilds her dying sibling into an engine.","SABRIEL meets THE GOLDEN COMPASS","Young Adult (YA)"
"Shadows on the Moors","Gothic Mystery",81000,"A botanist traveling to York discovers her host family claims to raise long-extinct ravens.","Rebecca by Daphne du Maurier, MEXICAN GOTHIC","Adult (18+)"`;
    } else if (importType === "queries") {
      demoString = `"Script Name","Target Agent","Query Status Code","Date Lodged","Personal Intro Segment"
"The Clockwork Citadel","Alexandra Stone","Full Requested","2026-04-12","I noticed on your MSWL that you enjoy high-concept clock engineering!"
"Shadows on the Moors","Jonathan Vance","Rejected","2026-05-01","I appreciated your panel speech about moors settings at York and wanted to send this."`;
    } else if (importType === "activities") {
      demoString = `"Related Query","Related Title","Event Type","Description","Date","Extras"
"My Pitch Query","The Clockwork Citadel","Query Sent","Sent initial query email directly to Agent Alexandra Stone","2026-04-12","Submitted via online form successfully."
"Feedback follow up","Shadows on the Moors","Status Changed","Agent Jonathan Vance requested partial sample chapters!","2026-05-15","Requested 3 chapters."`;
    } else if (importType === "user") {
      demoString = `"Pen Name","Registered Email","Plan Tier","Sign up Date","Subscription State"
"Jane Doe","jane.doe@example.com","Pro","2026-06-01","active"`;
    }
    setRawText(demoString);
  };

  // Handle Initial parsing
  const handleParse = () => {
    if (!rawText.trim()) {
      alert("Please upload a CSV file or paste spreadsheet tabular data first.");
      return;
    }
    
    const rows = parseCSV(rawText);
    if (rows.length < 2) {
      alert("Tabular data must contain at least a header row and one data row.");
      return;
    }
    
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
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setRawText(text);
    };
    reader.readAsText(file);
  };

  // Handle execution of the import
  const handleExecuteImport = async () => {
    setIsImporting(true);
    setImportProgress(0);
    setStep(3);
    
    let successfulCount = 0;
    let failedCount = 0;
    const errorsList: string[] = [];
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
            errorsList.push(`Row ${index + 2} skipped: 'name' field is missing.`);
            continue;
          }

          // Strict de-duplicate matching
          const foundAgent = localAgents.find(a => a.name.toLowerCase() === name.toLowerCase());
          if (foundAgent) {
            runLogs.push(`Agent info "${name}" already present in repository. Skipping duplicate row.`);
            successfulCount++;
            continue;
          }
          
          const agency = getMappedValue("agency") || "Independent";
          const email = getMappedValue("email") || "unlisted@agent.com";
          const website = getMappedValue("website") || "";
          
          // Custom parsing for genres (split by comma, semicolon, etc.)
          const genresRaw = getMappedValue("genres");
          const genres = genresRaw 
            ? genresRaw.split(/[,;|]+/).map(g => g.trim()).filter(Boolean)
            : ["General Fiction"];
            
          const mswlNotes = getMappedValue("mswlNotes") || "Imported MSWL focus points.";
          
          // Star rating parsing
          const starRaw = parseInt(getMappedValue("starRating"), 10);
          const starRating: 1 | 2 | 3 | 4 | 5 = (!isNaN(starRaw) && starRaw >= 1 && starRaw <= 5)
            ? (starRaw as any)
            : 3;
            
          const notes = getMappedValue("notes") || "Imported from Zite archives.";

          const agentData = {
            name,
            agency,
            email,
            website,
            genres,
            mswlNotes,
            starRating,
            submissionStatus: SubmissionStatus.OPEN,
            responseTimeWeeks: 8,
            noResponseMeansNo: true,
            submissionMethod: SubmissionMethod.EMAIL,
            materialsWanted: ["Query Letter", "Synopsis", "Sample Pages"],
            notes
          };

          const newAgId = "agent-imported-" + Math.random().toString(36).substr(2, 9);
          const res = await addAgent({ ...agentData, id: newAgId }, true);
          if (res.success) {
            const addedAgRef = {
              ...agentData,
              id: newAgId,
              userId: currentUser?.id || "",
              dateAdded: new Date().toISOString(),
              lastCheckedDate: new Date().toISOString()
            };
            localAgents.push(addedAgRef);
            successfulCount++;
            runLogs.push(`Successfully added Agent: "${name}" (${agency})`);
          } else {
            failedCount++;
            errorsList.push(`Agent line ${name} fail: ${res.error || "limit cap hit"}`);
          }
          
        } else if (importType === "manuscripts") {
          const title = getMappedValue("title");
          if (!title) {
            failedCount++;
            errorsList.push(`Row ${index + 2} skipped: 'title' header is missing.`);
            continue;
          }

          // De-duplicate matching
          const foundMs = localManuscripts.find(m => m.title.toLowerCase() === title.toLowerCase());
          if (foundMs) {
            runLogs.push(`Manuscript "${title}" already present in catalog. Skipping duplicate row.`);
            successfulCount++;
            continue;
          }

          const genre = getMappedValue("genre") || "Fiction";
          const wordCount = parseInt(getMappedValue("wordCount"), 10) || 85000;
          const logline = getMappedValue("logline") || "A compelling new manuscript.";
          // Comps column → structured titles-only comps (split on commas / " meets ").
          const comps = parseLegacyComps(getMappedValue("comps"));
          const ageCategory = getMappedValue("ageCategory") || "Adult";

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
              statusChangedDate: new Date().toISOString()
            } as any;
            localManuscripts.push(addedMsRef);
            successfulCount++;
            runLogs.push(`Successfully added Manuscript: "${title}" (${genre})`);
          } else {
            failedCount++;
            errorsList.push(`Manuscript "${title}" fail: ${res.error || "limit cap hit"}`);
          }
          
        } else if (importType === "queries") {
          // Queries need linked Manuscript ID and Agent ID
          const msTitleInput = getMappedValue("manuscriptId");
          const agentNameInput = getMappedValue("agentId");
          const statusInput = getMappedValue("status");
          const dateSentInput = getMappedValue("dateSent");
          const personalisationNotes = getMappedValue("personalisationNotes") || "Zite query backup logs.";

          if (!msTitleInput || !agentNameInput) {
            failedCount++;
            errorsList.push(`Row ${index + 2} skipped: Both Manuscript title and Agent name are required.`);
            continue;
          }

          // Case-insensitive lookups on dynamic local caches
          let foundMs = localManuscripts.find(m => m.title.toLowerCase() === msTitleInput.toLowerCase());
          let foundAgent = localAgents.find(a => a.name.toLowerCase() === agentNameInput.toLowerCase());

          // Dynamic recovery/auto-create if not found!
          if (!foundMs) {
            runLogs.push(`Manuscript "${msTitleInput}" not found. Auto-creating database record...`);
            const mockMsId = "ms-autoimport-" + Math.random().toString(36).substr(2, 9);
            const mockMs = {
              title: msTitleInput,
              genre: "Uncategorized Fiction",
              subGenres: [],
              wordCount: 80000,
              logline: "Imported automatically to preserve Query relationships.",
              comps: [],
              ageCategory: "General Adult",
              status: ManuscriptStatus.QUERYING
            };
            const creator = await addManuscript({ ...mockMs, id: mockMsId }, true);
            if (creator.success) {
              const fullMsRecord = {
                ...mockMs,
                id: mockMsId,
                userId: currentUser?.id || "",
                statusChangedDate: new Date().toISOString()
              };
              foundMs = fullMsRecord;
              localManuscripts.push(fullMsRecord);
            }
          }

          if (!foundAgent) {
            runLogs.push(`Agent "${agentNameInput}" not found. Auto-creating directory profile...`);
            const mockAgId = "agent-autoimport-" + Math.random().toString(36).substr(2, 9);
            const mockAg = {
              name: agentNameInput,
              agency: "Pending Match",
              email: "imported@zite.com",
              website: "",
              genres: ["Fiction"],
              mswlNotes: "Auto-profile created via historical query logs.",
              starRating: 3 as any,
              submissionStatus: SubmissionStatus.OPEN,
              responseTimeWeeks: 8,
              noResponseMeansNo: true,
              submissionMethod: SubmissionMethod.EMAIL,
              materialsWanted: ["Query Letter"],
              notes: "Added during Zite CSV import."
            };
            const creator = await addAgent({ ...mockAg, id: mockAgId }, true);
            if (creator.success) {
              const fullAgRecord = {
                ...mockAg,
                id: mockAgId,
                userId: currentUser?.id || "",
                dateAdded: new Date().toISOString(),
                lastCheckedDate: new Date().toISOString()
              };
              foundAgent = fullAgRecord;
              localAgents.push(fullAgRecord);
            }
          }

          // Generate dummy packages to link the queries fully
          const queryId = "q-imported-" + Math.random().toString(36).substr(2, 9);
          const queryData = {
            manuscriptId: foundMs?.id || "ms-seed-fantasy",
            agentId: foundAgent?.id || "agent-seed-alex",
            packageId: "pkg-seed-default", // Fallback standard submittal
            personalisationNotes,
            sendMethod: SubmissionMethod.EMAIL,
            status: normalizeQueryStatus(statusInput),
            dateSent: dateSentInput ? new Date(dateSentInput).toISOString() : new Date().toISOString()
          };

          const res = await addQuery({ ...queryData, id: queryId }, true);
          if (res.success) {
            const addedQRef = {
              ...queryData,
              id: queryId,
              userId: currentUser?.id || "",
              responseDeadline: undefined
            };
            localQueries.push(addedQRef);
            successfulCount++;
            runLogs.push(`Linked query logged: Manuscript "${msTitleInput}" sent to Agent "${agentNameInput}" (Status: ${normalizeQueryStatus(statusInput)})`);
          } else {
            failedCount++;
            errorsList.push(`Query match row ${index + 2} failed to record: ${res.error || "Tier limits exceeded."}`);
          }
        } else if (importType === "activities") {
          const msTitleInput = getMappedValue("manuscriptId");
          const activityTypeInput = getMappedValue("activityType");
          const description = getMappedValue("description") || "Activity logged via CSV Import.";
          const date = getMappedValue("date") ? new Date(getMappedValue("date")).toISOString() : new Date().toISOString();
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

          const actData = {
            queryId: foundQ?.id || "q-seed-fantasy",
            manuscriptId: foundMs?.id || "ms-seed-fantasy",
            activityType,
            description,
            date,
            details
          };

          const res = await addActivity(actData);
          if (res.success) {
            successfulCount++;
            runLogs.push(`Successfully added Activity event: "${description}"`);
          } else {
            failedCount++;
            errorsList.push(`Activity row fail: ${res.error || "System error"}`);
          }
        } else if (importType === "user") {
          const name = getMappedValue("name");
          const email = getMappedValue("email");
          const planInput = getMappedValue("plan");
          const trialRaw = getMappedValue("trialStartDate");
          const subStatusInput = getMappedValue("subscriptionStatus");

          const updateFields: any = {};
          if (name) updateFields.name = name;
          if (email) updateFields.email = email;
          
          if (planInput) {
            const planClean = planInput.toLowerCase();
            if (planClean.includes("pro")) {
              updateFields.plan = UserPlan.PRO;
            } else if (planClean.includes("free")) {
              updateFields.plan = UserPlan.FREE;
            }
          }
          if (trialRaw) {
            updateFields.trialStartDate = new Date(trialRaw).toISOString();
          }
          if (subStatusInput) {
            const statusClean = subStatusInput.toLowerCase();
            if (statusClean.includes("active") || statusClean === "active") updateFields.subscriptionStatus = "active";
            else if (statusClean.includes("trial") || statusClean === "trialing") updateFields.subscriptionStatus = "trialing";
            else if (statusClean.includes("cancel") || statusClean === "canceled") updateFields.subscriptionStatus = "canceled";
            else updateFields.subscriptionStatus = "none";
          }

          if (Object.keys(updateFields).length > 0) {
            await updateUserProfile(updateFields);
            successfulCount++;
            runLogs.push(`Successfully updated your user settings with: ${JSON.stringify(updateFields)}`);
          } else {
            failedCount++;
            errorsList.push(`Row ${index + 2} ignored: no user fields matched column descriptors.`);
          }
        }
      } catch (err: any) {
        failedCount++;
        errorsList.push(`General error parsing row ${index + 2}: ${err?.message || err}`);
      }

      setImportProgress(Math.round(((index + 1) / total) * 100));
      setImportResults({
        successful: successfulCount,
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
    setCsvRows([]);
    setHeaders([]);
    setFieldMappings({});
    setImportProgress(0);
    setImportResults({ successful: 0, failed: 0, errors: [], logs: [] });
  };

  return (
    <div className="min-h-screen bg-[#FCFAF7] pb-16 font-sans text-[#3a1c14]">
      <div className="max-w-4xl mx-auto px-4 pt-8">
        
        {/* HEADER BRANDING */}
        <div className="flex flex-col items-center justify-center text-center py-6 border-b border-[#7c3a2a]/10 mb-8">
          <h1 className="text-3xl md:text-4xl font-serif text-[#3a1c14] tracking-tight flex items-center justify-center gap-2">
            <span className="font-bold text-[#7c3a2a] relative inline-flex items-center gap-1.5">
              ScriptAlly
              <FileSpreadsheet className="w-6 h-6 text-[#7c3a2a]" />
            </span>
            <span className="font-light italic text-[#3a1c14]/90">migration desk</span>
          </h1>
          <p className="text-xs text-stone-500 mt-2 max-w-lg leading-relaxed">
            Transition your legacy rows, agent tracker templates, or Zite export data CSV sheets straight into your synchronized database without losing historical pitch timelines.
          </p>
        </div>

        {/* SUBTAB SWITCHER */}
        <div className="flex justify-center gap-3 mb-8 border-b border-[#7c3a2a]/10 pb-4">
          <button
            onClick={() => setSubTab("wizard")}
            className={`px-5 py-2.5 text-xs font-bold font-mono tracking-wider uppercase rounded-xl transition-all flex items-center gap-2 ${
              subTab === "wizard"
                ? "bg-[#7c3a2a] text-white shadow-md scale-[1.01]"
                : "border border-stone-200 hover:border-[#7c3a2a]/30 text-stone-600 bg-white hover:bg-stone-50"
            }`}
          >
            <UploadCloud className="w-4 h-4" />
            <span>A. CSV Import Wizard</span>
          </button>
          
          <button
            onClick={() => setSubTab("grids")}
            className={`px-5 py-2.5 text-xs font-bold font-mono tracking-wider uppercase rounded-xl transition-all flex items-center gap-2 ${
              subTab === "grids"
                ? "bg-[#7c3a2a] text-white shadow-md scale-[1.01]"
                : "border border-stone-200 hover:border-[#7c3a2a]/30 text-stone-600 bg-white hover:bg-stone-50"
            }`}
          >
            <Database className="w-4 h-4" />
            <span>B. Live Database Grid Viewer</span>
          </button>
        </div>

        {/* DEDU_PLICATE DATA SANITATION PANEL */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex gap-3">
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 text-amber-600 self-start">
              <Sparkles className="w-5 h-5 flex-shrink-0" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-stone-800 text-[14px]">
                Deduplicate & Sanitize Repository Rows
              </h3>
              <p className="text-[12px] text-stone-500 max-w-lg mt-0.5">
                Scan all manuscripts and agents for matching name duplicates. We'll automatically merge those matching records and re-map active pitch query timelines so there are no broken links.
              </p>
            </div>
          </div>
          <button
            onClick={async () => {
              setIsCleaning(true);
              setCleanStats(null);
              try {
                const stats = await cleanDuplicates();
                setCleanStats(stats);
              } catch (e) {
                console.error("Deduplication error", e);
              } finally {
                setIsCleaning(false);
              }
            }}
            disabled={isCleaning}
            className={`px-4 py-2 text-xs font-bold font-mono tracking-wide rounded-xl uppercase transition-all flex items-center gap-2 shrink-0 ${
              isCleaning
                ? "bg-stone-100 text-stone-400 cursor-not-allowed border border-stone-200"
                : "bg-stone-50 border border-stone-200 hover:border-amber-600/30 text-amber-800 hover:bg-amber-50/20"
            }`}
          >
            {isCleaning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            <span>{isCleaning ? "Cleaning..." : "Deduplicate Data"}</span>
          </button>
        </div>

        {cleanStats && (
          <div className="bg-green-50/50 border border-green-200 rounded-2xl p-4 mb-4 text-xs text-green-800 flex items-start gap-3 animate-fadeIn">
            <CheckCircle className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-green-950 mb-1 leading-none">Database Sanitize Successful!</p>
              <ul className="list-disc list-inside space-y-1 text-stone-600 mt-2 font-mono text-[11px]">
                <li>Manuscripts merged and duplicates removed: <span className="font-bold text-stone-800">{cleanStats.manuscriptsRemoved}</span></li>
                <li>Agents merged and duplicates removed: <span className="font-bold text-stone-800">{cleanStats.agentsRemoved}</span></li>
                <li>Queries correctly re-routed and synchronized: <span className="font-bold text-stone-800">{cleanStats.queriesMapped}</span></li>
                {cleanStats.queriesRemoved !== undefined && cleanStats.queriesRemoved > 0 && (
                  <li>Duplicate queries merged and deleted: <span className="font-bold text-stone-800">{cleanStats.queriesRemoved}</span></li>
                )}
              </ul>
              <button
                onClick={() => setCleanStats(null)}
                className="text-[11px] font-bold text-[#7c3a2a] underline hover:text-[#5e2b1e] mt-3 block"
              >
                Dismiss notification
              </button>
            </div>
          </div>
        )}

        {/* RESET DATABASE & SEED SAMPLE DATA PANEL */}
        <div className="bg-white p-5 rounded-2xl border border-red-200/60 shadow-[0_2px_8px_rgba(239,68,68,0.02)] mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex gap-3">
            <div className="p-3 bg-red-50 rounded-xl border border-red-100 text-red-600 self-start shrink-0">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-red-950 text-[14px]">
                Wipe All Data & Recreate Sample Data
              </h3>
              <p className="text-[12px] text-stone-500 max-w-lg mt-0.5">
                Wipes all manuscripts, agent contacts, pitch logs, versions, and activities entirely, and provisions a pristine set of fresh premium sample data. This is great for getting a fully populated environment immediately!
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0 w-full md:w-auto">
            {confirmReset ? (
              <>
                <button
                  onClick={async () => {
                    setIsResetting(true);
                    try {
                      await wipeAndResetDatabase();
                      setResetSuccess(true);
                      setConfirmReset(false);
                      setTimeout(() => setResetSuccess(false), 5000);
                    } catch (e) {
                      console.error("Reset error", e);
                    } finally {
                      setIsResetting(false);
                    }
                  }}
                  disabled={isResetting}
                  className="px-4 py-2 text-xs font-bold font-mono tracking-wide rounded-xl uppercase transition-all bg-red-600 hover:bg-red-700 text-white shrink-0 flex items-center justify-center gap-2"
                >
                  <AlertTriangle className="w-4 h-4 animate-pulse" />
                  <span>{isResetting ? "Wiping..." : "Yes, Wipe & Reset!"}</span>
                </button>
                <button
                  onClick={() => setConfirmReset(false)}
                  disabled={isResetting}
                  className="px-4 py-2 text-xs font-bold font-mono tracking-wide rounded-xl uppercase transition-all border border-stone-200 hover:bg-stone-50 text-stone-600 shrink-0 text-center"
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                onClick={() => setConfirmReset(true)}
                className="px-4 py-2 text-xs font-bold font-mono tracking-wide rounded-xl uppercase transition-all bg-stone-50 border border-red-200 hover:border-red-600/30 text-red-800 hover:bg-red-50/20 shrink-0 text-center flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4 text-red-600" />
                <span>Wipe & Recreate Data</span>
              </button>
            )}
          </div>
        </div>

        {resetSuccess && (
          <div className="bg-[#3B6D11]/10 border border-[#3B6D11]/30 rounded-2xl p-4 mb-8 text-xs text-[#3B6D11] flex items-start gap-3 animate-fadeIn">
            <CheckCircle className="w-5 h-5 text-[#3B6D11] shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-[#2A4D0C] mb-1 leading-none">Database Successfully Wiped & Reconstructed!</p>
              <p className="text-stone-600 mt-1">
                All data tables were successfully cleared, and a fresh premium sample dataset containing manuscripts, queried agents, and linked timelines was fully seeded.
              </p>
            </div>
          </div>
        )}

        {subTab === "wizard" && (
          <>
            {/* WIZARD PROGRESS STEPS BAR */}
            <div className="mb-10 max-w-md mx-auto grid grid-cols-3 text-center text-xs font-mono tracking-wider font-semibold uppercase text-stone-400">
          <div className={step >= 1 ? "text-[#7c3a2a] border-t-2 border-[#7c3a2a] pt-3" : "border-t-2 pt-3"}>
            1. Source CSV
          </div>
          <div className={step >= 2 ? "text-[#7c3a2a] border-t-2 border-[#7c3a2a] pt-3" : "border-t-2 pt-3"}>
            2. Match Headers
          </div>
          <div className={step >= 3 ? "text-[#7c3a2a] border-t-2 border-[#7c3a2a] pt-3" : "border-t-2 pt-3"}>
            3. Process Import
          </div>
        </div>

        {/* STEP 1: INPUT AND TYPE CHOOSE */}
        {step === 1 && (
          <div className="bg-white rounded-2xl border border-[#EBDCD3] p-6 shadow-sm space-y-6">
            
            {/* TYPE CHOOSE BUTTONS */}
            <div>
              <label className="block text-xs font-mono uppercase tracking-widest text-stone-500 mb-3 font-bold">
                A. Choose the data category to migrate
              </label>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <button
                  onClick={() => setImportType("agents")}
                  className={`p-4 rounded-xl border flex flex-col items-center gap-2 text-center transition-all ${
                    importType === "agents"
                      ? "border-[#7c3a2a] bg-[#FAF1EF] text-[#7c3a2a]"
                      : "border-stone-200 hover:border-[#7c3a2a]/30 text-stone-600 bg-[#FCFAF7]"
                  }`}
                >
                  <Users className="w-5 h-5 shrink-0" />
                  <span className="text-xs font-serif font-bold">Agents Database</span>
                  <span className="text-[10px] opacity-75 font-light font-sans hidden sm:block">Fuzzy check bio, MSWL tags</span>
                </button>

                <button
                  onClick={() => setImportType("manuscripts")}
                  className={`p-4 rounded-xl border flex flex-col items-center gap-2 text-center transition-all ${
                    importType === "manuscripts"
                      ? "border-[#7c3a2a] bg-[#FAF1EF] text-[#7c3a2a]"
                      : "border-stone-200 hover:border-[#7c3a2a]/30 text-stone-600 bg-[#FCFAF7]"
                  }`}
                >
                  <BookOpen className="w-5 h-5 shrink-0" />
                  <span className="text-xs font-serif font-bold">Manuscript Titles</span>
                  <span className="text-[10px] opacity-75 font-light font-sans hidden sm:block">Wordcount registers, loglines</span>
                </button>

                <button
                  onClick={() => setImportType("queries")}
                  className={`p-4 rounded-xl border flex flex-col items-center gap-2 text-center transition-all ${
                    importType === "queries"
                      ? "border-[#7c3a2a] bg-[#FAF1EF] text-[#7c3a2a]"
                      : "border-stone-200 hover:border-[#7c3a2a]/30 text-stone-600 bg-[#FCFAF7]"
                  }`}
                >
                  <Database className="w-5 h-5 shrink-0" />
                  <span className="text-xs font-serif font-bold">Query Log Entries</span>
                  <span className="text-[10px] opacity-75 font-light font-sans hidden sm:block">Historic status & dispatch dates</span>
                </button>

                <button
                  onClick={() => setImportType("activities")}
                  className={`p-4 rounded-xl border flex flex-col items-center gap-2 text-center transition-all ${
                    importType === "activities"
                      ? "border-[#7c3a2a] bg-[#FAF1EF] text-[#7c3a2a]"
                      : "border-stone-200 hover:border-[#7c3a2a]/30 text-stone-600 bg-[#FCFAF7]"
                  }`}
                >
                  <ActivityIcon className="w-5 h-5 shrink-0" />
                  <span className="text-xs font-serif font-bold">Activity logs</span>
                  <span className="text-[10px] opacity-75 font-light font-sans hidden sm:block">Historic notifications/records</span>
                </button>

                <button
                  onClick={() => setImportType("user")}
                  className={`p-4 rounded-xl border flex flex-col items-center gap-2 text-center transition-all ${
                    importType === "user"
                      ? "border-[#7c3a2a] bg-[#FAF1EF] text-[#7c3a2a]"
                      : "border-stone-200 hover:border-[#7c3a2a]/30 text-stone-600 bg-[#FCFAF7]"
                  }`}
                >
                  <UserIcon className="w-5 h-5 shrink-0" />
                  <span className="text-xs font-serif font-bold">User profile</span>
                  <span className="text-[10px] opacity-75 font-light font-sans hidden sm:block">Pen names, email, plan settings</span>
                </button>
              </div>
            </div>

            {/* DEMO DATA QUICK FILL TRIGGER */}
            <div className="flex justify-between items-center bg-[#FCFAF7] border border-dashed border-[#EBDCD3] rounded-xl p-3 text-xs">
              <span className="text-stone-500 font-light">Don't have Zite output handy? Load formatting samples!</span>
              <button
                onClick={loadDemoCsv}
                className="text-[#7c3a2a] hover:underline font-bold flex items-center gap-1 shrink-0 bg-white px-2.5 py-1 border border-[#EBDCD3]/75 rounded shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Fill Mock Demo CSV</span>
              </button>
            </div>

            {/* CSV LOAD INPUT / DRAG CONTAINER */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-mono uppercase tracking-widest text-stone-500 font-bold">
                  B. Paste CSV Text or Choose Export File
                </label>
                <div className="text-[11px] text-stone-400 font-mono">
                  Expected header example: {columnExamples[importType]}
                </div>
              </div>

              <div className="border-2 border-dashed border-stone-200 rounded-xl p-4 text-center hover:bg-[#FCFAF7] transition-all relative">
                <UploadCloud className="w-8 h-8 text-[#7c3a2a]/60 mx-auto mb-2" />
                <p className="text-xs text-stone-650 mb-3">
                  Drag and drop your spreadsheet export, or find a <code>.csv</code> file on your computer.
                </p>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="mx-auto block text-xs border border-[#EBDCD3] bg-white rounded p-1 shadow-sm file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-bold file:bg-[#FAF1EF] file:text-[#7c3a2a] cursor-pointer"
                />
              </div>

              <div className="mt-4">
                <div className="text-[11px] uppercase font-mono text-stone-400 mb-1 font-bold">Or paste raw columns (comma separated values)</div>
                <textarea
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder={`Header 1,Header 2,Header 3...\n"Row 1 Column A","Row 1 Column B","Row 1 Column C"...`}
                  className="w-full h-44 text-xs font-mono p-3 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#7c3a2a] text-[#3a1c14]/90"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={handleParse}
                className="bg-[#7c3a2a] text-white hover:bg-[#5e2b1e] text-xs font-bold py-2.5 px-6 rounded-lg shadow-md transition-all flex items-center gap-1.5"
              >
                <span>Parse CSV Table &rarr;</span>
              </button>
            </div>

          </div>
        )}

        {/* STEP 2: MAPPING HEADERS */}
        {step === 2 && (
          <div className="bg-white rounded-2xl border border-[#EBDCD3] p-6 shadow-sm space-y-6 animate-fadeIn">
            <div className="border-b border-stone-100 pb-4">
              <h3 className="font-serif text-lg font-bold text-[#3a1c14] flex items-center gap-2">
                <Columns className="w-4.5 h-4.5 text-[#7c3a2a]" />
                <span>Map spreadsheet headers to ScriptAlly fields</span>
              </h3>
              <p className="text-xs text-[#3a1c14]/70 mt-1">
                We scanned your table's columns. Specify which source column should populate each ScriptAlly target field.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
              {targetFields[importType].map(field => {
                // Determine matches
                const currentMapped = fieldMappings[field] || "";
                
                // Fields required flags
                const isRequired = field === "name" || field === "title" || field === "manuscriptId" || field === "agentId";

                return (
                  <div key={field} className="flex flex-col gap-1 text-xs border-b border-stone-100/50 pb-2.5">
                    <div className="flex justify-between items-center">
                      <span className="font-serif font-bold text-[#3a1c14] capitalize flex items-center gap-1 text-[13px]">
                        {field === "manuscriptId" ? "Reference Manuscript Title" : field === "agentId" ? "Target Agent Name" : field.replace(/([A-Z])/g, " $1")}
                        {isRequired && <span className="text-[#A32D2D] font-bold">* Required</span>}
                      </span>
                      <span className="text-[10px] font-mono text-stone-400">Database field</span>
                    </div>

                    <select
                      value={currentMapped}
                      onChange={(e) => setFieldMappings({ ...fieldMappings, [field]: e.target.value })}
                      className="mt-1 block w-full text-xs border border-stone-200 rounded p-1.5 bg-stone-50 cursor-pointer focus:outline-none focus:border-[#7c3a2a]"
                    >
                      <option value="">-- Skip &amp; Don't Import This --</option>
                      {headers.map(h => (
                        <option key={h} value={h}>Matched to: "{h}"</option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>

            {/* PREVIEW CONTAINER */}
            <div className="bg-[#FCFAF7] border border-[#EBDCD3] rounded-xl p-4">
              <h4 className="text-[11px] font-mono uppercase tracking-wider text-stone-500 font-bold mb-2 flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-stone-400" />
                <span>Quick Row Mapping Sample of parsed table ({csvRows.length} total rows)</span>
              </h4>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left font-sans text-[11px] leading-relaxed border-collapse">
                  <thead>
                    <tr className="border-b border-[#EBDCD3]/70">
                      {targetFields[importType].slice(0, 4).map(f => (
                        <th key={f} className="py-2 px-1 text-stone-500 capitalize font-serif font-bold">
                          {f === "manuscriptId" ? "Manuscript" : f === "agentId" ? "Agent" : f.replace(/([A-Z])/g, " $1")} 
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {csvRows.slice(0, 2).map((row, idx) => (
                      <tr key={idx} className="border-b border-stone-100 last:border-0 text-[#3a1c14]/90">
                        {targetFields[importType].slice(0, 4).map(field => {
                          const colName = fieldMappings[field];
                          const colIdx = headers.indexOf(colName);
                          const value = colIdx !== -1 && row[colIdx] !== undefined ? row[colIdx] : "--";
                          return (
                            <td key={field} className="py-2 px-1 truncate max-w-[150px]" title={value}>
                              {field === "status" && importType === "queries" ? String(normalizeQueryStatus(value)) : String(value)}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* EXPLANATION ABOUT REFERENCE LINKING FOR QUERIES LOG */}
            {importType === "queries" && (
              <div className="p-4 bg-blue-50/70 border border-blue-150-100/50 rounded-xl flex items-start gap-3">
                <HelpCircle className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
                <p className="text-xs text-blue-900 leading-relaxed">
                  <strong>Smart Match linking is active:</strong> historical queries refer to agents and manuscripts by text name. The ScriptAlly migration desk will scan your database for matching Agent names and Book titles. If a matching agent or manuscript isn't registered yet, we will <em>auto-populate directory entries</em> for you so that pitch relationships link correctly!
                </p>
              </div>
            )}

            <div className="pt-2 flex justify-between gap-4">
              <button
                onClick={handleReset}
                className="border border-[#7c3a2a] text-[#7c3a2a] hover:bg-[#FAF1EF] text-xs font-bold py-2.5 px-6 rounded-lg transition-all"
              >
                &larr; Start Over
              </button>
              
              <button
                onClick={handleExecuteImport}
                className="bg-[#7c3a2a] text-white hover:bg-[#5e2b1e] text-xs font-bold py-2.5 px-6 rounded-lg shadow-md transition-all flex items-center gap-1.5"
              >
                <span>Begin Processing Records ({csvRows.length} lines) &rarr;</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: RUN PROCESS PROGRESS AND LOGS */}
        {step === 3 && (
          <div className="bg-white rounded-2xl border border-[#EBDCD3] p-6 shadow-sm space-y-6">
            <div className="border-b border-stone-100 pb-4">
              <h3 className="font-serif text-lg font-bold text-[#3a1c14] flex items-center gap-2">
                <RefreshCw className={isImporting ? "w-5 h-5 text-[#7c3a2a] animate-spin" : "w-5 h-5 text-[#3b6d11]"} />
                <span>
                  {isImporting ? "Injecting records into database..." : "Database migration complete!"}
                </span>
              </h3>
              <p className="text-xs text-[#3a1c14]/70 mt-1">
                Importing parsed data rows. This may take a moment depending on line configurations. Keep tab active.
              </p>
            </div>

            {/* ANIMATED PROGRESS BAR */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-stone-500 font-bold uppercase tracking-wider">Overall progression</span>
                <span className="text-[#7c3a2a] font-bold">{importProgress}%</span>
              </div>
              <div className="w-full bg-stone-100 h-2.5 rounded-full overflow-hidden">
                <div
                  style={{ width: `${importProgress}%` }}
                  className="bg-[#7c3a2a] h-full transition-all duration-150"
                />
              </div>
            </div>

            {/* LIVE SCOREBOARD METRICS */}
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="bg-[#FAF1EF] border border-[#F2DDD5] rounded-xl p-4">
                <span className="block text-3xl font-serif font-bold text-[#7c3a2a]">
                  {importResults.successful}
                </span>
                <span className="text-xs text-stone-600 font-medium">Successfully Imported</span>
              </div>
              
              <div className="bg-stone-50 border border-stone-200 rounded-xl p-4">
                <span className="block text-3xl font-serif font-bold text-stone-600">
                  {importResults.failed}
                </span>
                <span className="text-xs text-stone-600 font-medium">Lines Failed / Skipped</span>
              </div>
            </div>

            {/* DETAILED PROCESSING LOGGER BOX */}
            <div className="space-y-2">
              <label className="block text-xs font-mono uppercase tracking-widest text-[#3a1c14]/60 font-bold">
                Console Processing Streams &amp; Exceptions
              </label>
              
              <div className="w-full bg-stone-900 rounded-lg p-4 text-[10px] font-mono text-[#DCD1C4] h-52 overflow-y-auto space-y-1">
                {importResults.logs.map((log, idx) => (
                  <p key={idx} className="text-[#3B6D11]/90 font-sans"><span className="text-stone-400">&bull;&nbsp;</span>{log}</p>
                ))}
                {importResults.errors.map((err, idx) => (
                  <p key={idx} className="text-red-400 font-sans leading-relaxed"><span className="text-red-500 font-mono font-bold">[!]</span> {err}</p>
                ))}
                {importResults.logs.length === 0 && importResults.errors.length === 0 && (
                  <p className="text-stone-500 italic">Pre-allocation memory allocated. Streams commencing...</p>
                )}
              </div>
            </div>

            {/* FINAL COMPLETION SUMMARY ACTION BUTTONS */}
            {!isImporting && (
              <div className="pt-4 border-t border-stone-100 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-[#3a1c14]/80">
                    Your records are now locked into live cloud synchronization.
                  </p>
                </div>
                
                <div className="flex gap-3">
                  <button
                    onClick={handleReset}
                    className="border border-stone-300 text-stone-650 hover:bg-stone-50 text-xs font-bold py-2 PX-5 rounded-lg transition-all"
                  >
                    Import Another Sheet
                  </button>
                  
                  <button
                    onClick={() => {
                      if (importType === "queries") onNavigate("queries");
                      else if (importType === "manuscripts") onNavigate("manuscripts");
                      else onNavigate("agents");
                    }}
                    className="bg-[#7c3a2a] text-white hover:bg-[#5e2b1e] text-xs font-bold py-2 px-6 rounded-lg shadow transition-all"
                  >
                    Go Inspect Imported Data &rarr;
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
          </>
        )}

        {subTab === "grids" && (
          <div className="bg-white rounded-2xl border border-[#EBDCD3] p-6 shadow-sm space-y-6">
            
            {/* GRID TABLE TABS */}
            <div className="border-b border-stone-100 pb-4 flex flex-col md:flex-row justify-between md:items-center gap-4">
              <div>
                <h3 className="font-serif text-lg font-bold text-[#3a1c14] flex items-center gap-1.5">
                  <Database className="w-5 h-5 text-[#7c3a2a]" />
                  <span>Real-Time Database Inspector Mode</span>
                </h3>
                <p className="text-xs text-stone-500 mt-1">
                  Browse and query your synced records in grid format. Any imported CSV entries are synchronized instantly.
                </p>
              </div>

              {/* SEARCH FILTER */}
              <div className="w-full md:w-64">
                <input
                  type="text"
                  placeholder="Quick search tables..."
                  value={gridSearch}
                  onChange={(e) => setGridSearch(e.target.value)}
                  className="w-full text-xs p-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#7c3a2a]"
                />
              </div>
            </div>

            {/* TAB SELECTOR */}
            <div className="flex flex-wrap gap-2 text-xs">
              {[
                { id: "agents", label: `Agents Directory (${agents.length})`, icon: Users },
                { id: "manuscripts", label: `Manuscripts (${manuscripts.length})`, icon: BookOpen },
                { id: "queries", label: `Query Logs (${queries.length})`, icon: FileSpreadsheet },
                { id: "activities", label: `Activities (${useScriptAllyDb().activities.length})`, icon: ActivityIcon },
                { id: "user", label: "User Pen Profile", icon: UserIcon }
              ].map(tab => {
                const Icon = tab.icon;
                const isActive = activeGridTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveGridTab(tab.id as any);
                      setGridSearch("");
                    }}
                    className={`flex items-center gap-1.5 py-1.5 px-3 rounded-lg border font-medium transition-all ${
                      isActive
                        ? "bg-[#FAF1EF] border-[#7c3a2a] text-[#7c3a2a] font-bold shadow-sm"
                        : "border-stone-100 hover:bg-stone-50 text-stone-600 bg-white"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* GRID DISPLAY CONTAINER */}
            <div className="overflow-x-auto border border-stone-200 rounded-xl bg-[#FCFAF7]">
              
              {/* AGENTS GRID */}
              {activeGridTab === "agents" && (
                <table className="w-full text-left text-xs leading-normal border-collapse">
                  <thead>
                    <tr className="bg-stone-100 border-b border-stone-200 text-stone-600 font-mono text-[10px] uppercase tracking-wider font-bold">
                      <th className="p-3">Agent Name</th>
                      <th className="p-3">Agency</th>
                      <th className="p-3">Email Address</th>
                      <th className="p-3">Website</th>
                      <th className="p-3">Genre Focus</th>
                      <th className="p-3">Priority Rating</th>
                      <th className="p-3">Submission Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-150 bg-white">
                    {agents
                      .filter(a => {
                        const s = gridSearch.toLowerCase();
                        return (
                          a.name.toLowerCase().includes(s) ||
                          a.agency.toLowerCase().includes(s) ||
                          a.email.toLowerCase().includes(s) ||
                          a.genres.join(", ").toLowerCase().includes(s)
                        );
                      })
                      .map(a => (
                        <tr key={a.id} className="hover:bg-[#FAF1EF]/10 transition-colors text-stone-800">
                          <td className="p-3 font-serif font-bold text-[#3a1c14]">{a.name}</td>
                          <td className="p-3 text-stone-600">{a.agency}</td>
                          <td className="p-3 text-stone-600 font-mono text-[11px]">{a.email}</td>
                          <td className="p-3 text-[11px]">
                            {a.website ? (
                              <a href={a.website} target="_blank" rel="noreferrer" className="text-[#7c3a2a] underline hover:text-[#5e2b1e] break-all">
                                {a.website}
                              </a>
                            ) : (
                              "--"
                            )}
                          </td>
                          <td className="p-3">
                            <span className="flex flex-wrap gap-1">
                              {a.genres.map(g => (
                                <span key={g} className="bg-stone-100 border border-stone-200 rounded px-1.5 py-0.5 text-[9px] uppercase font-mono font-medium">
                                  {g}
                                </span>
                              ))}
                            </span>
                          </td>
                          <td className="p-3 tracking-widest text-[#BA7517] font-bold font-mono">{"★".repeat(a.starRating)}</td>
                          <td className="p-3 font-medium text-stone-750">{a.submissionStatus}</td>
                        </tr>
                      ))}
                    {agents.length === 0 && (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-stone-400 italic">
                          No registree agents detected. Upload a CSV of agents above to seed yours instantly!
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}

              {/* MANUSCRIPTS GRID */}
              {activeGridTab === "manuscripts" && (
                <table className="w-full text-left text-xs leading-normal border-collapse">
                  <thead>
                    <tr className="bg-stone-100 border-b border-[#EBDCD3] text-stone-600 font-mono text-[10px] uppercase tracking-wider font-bold">
                      <th className="p-3">Book Title</th>
                      <th className="p-3">Primary Genre</th>
                      <th className="p-3">Audience Age</th>
                      <th className="p-3">Word Count</th>
                      <th className="p-3">Elevator Hook</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EBDCD3] bg-white">
                    {manuscripts
                      .filter(m => {
                        const s = gridSearch.toLowerCase();
                        return (
                          m.title.toLowerCase().includes(s) ||
                          m.genre.toLowerCase().includes(s) ||
                          m.logline.toLowerCase().includes(s)
                        );
                      })
                      .map(m => (
                        <tr key={m.id} className="hover:bg-[#FAF1EF]/10 transition-colors text-stone-800">
                          <td className="p-3 font-serif font-bold text-[#3a1c14]">{m.title}</td>
                          <td className="p-3 text-stone-600">{m.genre}</td>
                          <td className="p-3 text-stone-600">{m.ageCategory}</td>
                          <td className="p-3 font-mono">{m.wordCount?.toLocaleString() || "0"} words</td>
                          <td className="p-3 text-stone-500 max-w-xs truncate" title={m.logline}>{m.logline}</td>
                          <td className="p-3">
                            <span className="bg-[#FAF1EF] text-[#7c3a2a] border border-[#7c3a2a]/20 rounded px-2 py-0.5 text-[10px] font-bold">
                              {m.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    {manuscripts.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-stone-400 italic">
                          No manuscript files loaded. Upload a CSV of book logs above to get started!
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}

              {/* QUERIES GRID */}
              {activeGridTab === "queries" && (
                <table className="w-full text-left text-xs leading-normal border-collapse">
                  <thead>
                    <tr className="bg-stone-100 border-b border-[#EBDCD3] text-stone-600 font-mono text-[10px] uppercase tracking-wider font-bold">
                      <th className="p-3">Reference Manuscript</th>
                      <th className="p-3">Target Agent Recipient</th>
                      <th className="p-3">Query Status</th>
                      <th className="p-3">Date Sent</th>
                      <th className="p-3">Custom Personalisation Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EBDCD3] bg-white">
                    {queries
                      .filter(q => {
                        const s = gridSearch.toLowerCase();
                        const manuscriptText = manuscripts.find(m => m.id === q.manuscriptId)?.title || "";
                        const agentText = agents.find(a => a.id === q.agentId)?.name || "";
                        return (
                          manuscriptText.toLowerCase().includes(s) ||
                          agentText.toLowerCase().includes(s) ||
                          q.status.toLowerCase().includes(s) ||
                          q.personalisationNotes.toLowerCase().includes(s)
                        );
                      })
                      .map(q => {
                        const ms = manuscripts.find(m => m.id === q.manuscriptId);
                        const ag = agents.find(a => a.id === q.agentId);
                        return (
                          <tr key={q.id} className="hover:bg-[#FAF1EF]/10 transition-colors text-stone-800">
                            <td className="p-3 font-serif font-bold text-[#3a1c14]">{ms ? ms.title : "Unknown Manuscript"}</td>
                            <td className="p-3 text-stone-700 font-medium">{ag ? agentPrimary(ag) : AGENT_NOT_SPECIFIED}</td>
                            <td className="p-3">
                              <span className="bg-amber-100/50 text-[#BA7517] border border-amber-200/50 rounded px-1.5 py-0.5 text-[10px] font-mono uppercase font-bold">
                                {q.status}
                              </span>
                            </td>
                            <td className="p-3 text-stone-500 font-mono text-[11px]">{q.dateSent ? new Date(q.dateSent).toLocaleDateString() : "--"}</td>
                            <td className="p-3 text-stone-600 italic text-[11px] max-w-sm truncate" title={q.personalisationNotes}>
                              "{q.personalisationNotes}"
                            </td>
                          </tr>
                        );
                      })
                    }
                    {queries.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-stone-400 italic">
                          No active query logs. Dispatch queries to active agents, or import spreadsheet rows above!
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}

              {/* ACTIVITIES GRID */}
              {activeGridTab === "activities" && (
                <table className="w-full text-left text-xs leading-normal border-collapse">
                  <thead>
                    <tr className="bg-stone-100 border-b border-[#EBDCD3] text-stone-600 font-mono text-[10px] uppercase tracking-wider font-bold">
                      <th className="p-3">Timestamp Date</th>
                      <th className="p-3">Event Type</th>
                      <th className="p-3">Description</th>
                      <th className="p-3">Timeline Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EBDCD3] bg-white">
                    {useScriptAllyDb().activities
                      .filter(act => {
                        const s = gridSearch.toLowerCase();
                        return (
                          act.activityType.toLowerCase().includes(s) ||
                          act.description.toLowerCase().includes(s) ||
                          act.details.toLowerCase().includes(s)
                        );
                      })
                      .map(act => (
                        <tr key={act.id} className="hover:bg-[#FAF1EF]/10 transition-colors text-stone-800">
                          <td className="p-3 font-mono text-stone-500 text-[11px]">{new Date(act.date).toLocaleString()}</td>
                          <td className="p-3">
                            <span className="bg-stone-100 border border-stone-200 text-stone-700 rounded px-1.5 py-0.5 text-[9px] uppercase font-mono font-bold">
                              {act.activityType}
                            </span>
                          </td>
                          <td className="p-3 text-[#3a1c14] font-medium">{act.description}</td>
                          <td className="p-3 text-stone-500 max-w-sm truncate" title={act.details}>
                            {act.details || "--"}
                          </td>
                        </tr>
                      ))}
                    {useScriptAllyDb().activities.length === 0 && (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-stone-400 italic">
                          No activity log events found. Activity streams are triggered as you log queries, and the csv uploader matches histories cleanly.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}

              {/* USER GRID */}
              {activeGridTab === "user" && (
                <div className="p-6 bg-white space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-[#FCFAF7] p-4 rounded-xl border border-stone-200">
                      <span className="text-[10px] uppercase font-mono text-stone-400 font-bold block mb-1">Writer Pen Name</span>
                      <p className="text-sm font-serif font-bold text-[#3a1c14]">{currentUser?.name || "Unconfigured Profile"}</p>
                    </div>
                    
                    <div className="bg-[#FCFAF7] p-4 rounded-xl border border-stone-200">
                      <span className="text-[10px] uppercase font-mono text-stone-400 font-bold block mb-1">Registered Address / Email</span>
                      <p className="text-sm font-mono text-[#7c3a2a]">{currentUser?.email || "No account logged"}</p>
                    </div>

                    <div className="bg-[#FCFAF7] p-4 rounded-xl border border-stone-200">
                      <span className="text-[10px] uppercase font-mono text-stone-400 font-bold block mb-1">Account Service Subscription tier</span>
                      <span className="inline-block mt-1 bg-[#FAF1EF] text-[#7c3a2a] border border-[#7c3a2a]/20 text-xs font-bold font-mono px-2 py-0.5 rounded uppercase">
                        {currentUser?.plan || "Free"}
                      </span>
                    </div>

                    <div className="bg-[#FCFAF7] p-4 rounded-xl border border-stone-200">
                      <span className="text-[10px] uppercase font-mono text-stone-400 font-bold block mb-1">Firebase Syncing Link Status</span>
                      <span className="inline-block mt-1 text-xs font-bold font-mono px-2 py-0.5 rounded uppercase bg-green-150 text-[#3B6D11] border border-green-250">
                        Cloud Real-Time Synchronization Enabled
                      </span>
                    </div>
                  </div>
                </div>
              )}
              
            </div>
            
          </div>
        )}

      </div>
    </div>
  );
};
