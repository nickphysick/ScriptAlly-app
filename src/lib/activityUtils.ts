import { Activity, ActivityType } from "../types";
import { computeResponseDeadline } from "./responseDeadline";

export const getActivityKeyAndDefaults = (description: string, activityType?: ActivityType) => {
  const normalized = (description || "").toLowerCase();
  
  let key: string | null = null;
  let defaultLabel = "Status changed";

  if (activityType !== undefined) {
    if (activityType === ActivityType.AGENT_ADDED) {
      key = "agent_added";
      defaultLabel = "Agent added";
    }
    else if (activityType === ActivityType.AGENT_UPDATED) {
      key = "agent_updated";
      defaultLabel = "Agent updated";
      if (normalized.includes("open to submissions")) {
        defaultLabel = "Now open";
      } else if (normalized.includes("closed to submissions")) {
        defaultLabel = "Now closed";
      } else if (normalized.includes("rating")) {
        defaultLabel = "Rating updated";
      } else if (normalized.includes("wishlist")) {
        defaultLabel = "MSWL updated";
      }
    }
    else if (activityType === ActivityType.MANUSCRIPT_ADDED) {
      key = "ms_added";
      defaultLabel = "Manuscript added";
    }
    else if (activityType === ActivityType.MANUSCRIPT_UPDATED) {
      key = "ms_updated";
      defaultLabel = "Manuscript updated";
      if (normalized.includes("ready to query")) {
        defaultLabel = "Ready to query";
      } else if (normalized.includes("shelved")) {
        defaultLabel = "Shelved";
      }
    }
  }

  if (!key) {
    if (normalized.includes("query sent") || normalized.includes("dispatched")) {
      key = "queried";
      defaultLabel = "Query sent";
    } else if (normalized.includes("partial") && normalized.includes("requested")) {
      key = "partial_req";
      defaultLabel = "Partial requested";
    } else if (normalized.includes("partial") && normalized.includes("sent")) {
      key = "partial_sent";
      defaultLabel = "Partial sent";
    } else if (normalized.includes("full manuscript") && normalized.includes("requested")) {
      key = "full_req";
      defaultLabel = "Full requested";
    } else if (normalized.includes("full manuscript") && normalized.includes("sent")) {
      key = "full_sent";
      defaultLabel = "Full sent";
    } else if (normalized.includes("offer of representation") || normalized.includes("congratulations")) {
      key = "offer";
      defaultLabel = "Offer received";
    } else if (normalized.includes("revise and resubmit") || normalized.includes("r&r")) {
      key = "rr";
      defaultLabel = "Revise & resubmit";
    } else if (normalized.includes("rejected") || normalized.includes("rejection")) {
      key = "rejected";
      defaultLabel = "Rejection";
    } else if (normalized.includes("withdrew") || normalized.includes("withdrawn")) {
      key = "withdrawn";
      defaultLabel = "Withdrawn";
    } else if (normalized.includes("nudge")) {
      key = "nudge_sent";
      defaultLabel = "Nudge sent";
    } else if (normalized.includes("no response") || normalized.includes("timeout")) {
      key = "no_response";
      defaultLabel = "Status changed";
    } else if (normalized.includes("materials sent") || normalized.includes("transmitted")) {
      defaultLabel = "Materials sent";
    }
  }

  return { key, defaultLabel };
};



export const replacePlaceholders = (
  text: string,
  msTitle: string,
  agent: { name: string; agency: string } | null,
  q?: any,
  originalDetails?: string
): string => {
  if (!text) return "";

  const agentName = agent ? agent.name : "Agent";
  const agencyName = agent ? agent.agency : "Agency";
  
  let deadlineStr = "the expected date";
  if (q && q.responseDeadline) {
    try {
      deadlineStr = new Date(q.responseDeadline).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric"
      });
    } catch (e) {
      deadlineStr = "the expected date";
    }
  } else if (q && q.dateSent && agent && (agent as any).responseTimeWeeks) {
    try {
      // Same canonical formula the stored deadline + the Prompt-3 fan-out use → zero drift.
      const d = new Date(computeResponseDeadline(q.dateSent, (agent as any).responseTimeWeeks));
      deadlineStr = d.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric"
      });
    } catch (e) {
      deadlineStr = "the expected date";
    }
  }

  let daysDiff = 45; // default fallback
  if (q && q.dateSent) {
    try {
      const sentTime = new Date(q.dateSent).getTime();
      const diff = Date.now() - sentTime;
      daysDiff = Math.max(1, Math.floor(diff / (1000 * 60 * 60 * 24)));
    } catch (e) {
      daysDiff = 45;
    }
  }

  const sendMethodStr = q?.sendMethod || (agent as any)?.submissionMethod || "Email";

  let res = text;

  // 1. Manuscript title in bold
  res = res.replace(/[\{\[]\s*(manuscript\s*title\s*in\s*bold|manuscript\s*in\s*bold)\s*[\}\]]/gi, `**${msTitle || "Manuscript"}**`);

  // 2. Manuscript Title standard
  res = res.replace(/[\{\[]\s*(manuscript\s*title|manuscript|manuscripttitle|title|mstitle|book\s*title|work\s*title)\s*[\}\]]/gi, msTitle || "Manuscript");

  // 3. Agent full Name / Agent Name
  res = res.replace(/[\{\[]\s*(agent\'s\s*full\s*name|agent\s*full\s*name|agent\'s\s*name|agent\s*name|agentname|agent)\s*[\}\]]/gi, agentName);

  // 4. Agency Name
  res = res.replace(/[\{\[]\s*(agency\s*name|agency|agencyname)\s*[\}\]]/gi, agencyName);

  // 5. Send method
  res = res.replace(/[\{\[]\s*(send\s*method|submission\s*method)\s*[\}\]]/gi, sendMethodStr);

  // 6. Response Deadline / Expected Response Date
  res = res.replace(/[\{\[]\s*(expected\s*user\s*response\s*date|expected\s*response\s*date|response\s*deadline|deadline|expected\s*response|target\s*date)\s*[\}\]]/gi, deadlineStr);

  // 7. Days since query sent
  res = res.replace(/[\{\[]\s*days\s*since\s*query\s*sent\s*[\}\]]/gi, String(daysDiff));

  // 8. System notes
  res = res.replace(/[\{\[]\s*(system\s*notes|details|detail|notes|comments|original\s*details)\s*[\}\]]/gi, originalDetails || "");

  return res;
};

export const extractAgentFromText = (desc: string): { name: string; agency: string } | null => {
  if (!desc) return null;
  
  // Try pattern: "for [Agent] at [Agency]" or "Added [Agent] at [Agency]" or beginning of line
  const match = desc.match(/(?:Added\s+|for\s+|^)([^.]+?)\s+at\s+([^,]+)/i);
  if (match) {
    let name = match[1].trim();
    let agency = match[2].trim();
    
    // Support sentence boundaries (dot followed by space and capital letter/number) while keeping abbreviation periods
    const sentenceBoundary = agency.match(/\.\s+[A-Z0-9]/);
    if (sentenceBoundary && sentenceBoundary.index !== undefined) {
      agency = agency.substring(0, sentenceBoundary.index).trim();
    }
    
    // Remove trailing period at the end of sentence
    agency = agency.replace(/\.$/, "").trim();
    
    // clean up prefixes from name
    const prefixes = [
      /^Query sent to\s+/i,
      /^Sent partial manuscript to\s+/i,
      /^Partial manuscript sent to\s+/i,
      /^Full manuscript sent to\s+/i,
      /^Sent full manuscript to\s+/i,
      /^Rejection received from\s+/i,
      /^Withdrew query from\s+/i,
      /^No response received from\s+/i,
      /^Great news!\s+/i,
      /^Amazing news!\s+/i,
      /^Congratulations!\s+You've\s+received\s+an\s+offer\s+of\s+representation\s+from\s+/i,
      /^Revise\s*&\s*Resubmit\s+request\s+received\s+from\s+/i,
      /^You\s+added\s+/i,
      /^You\s+updated\s+details\s+for\s+/i,
      /^You\s+updated\s+/i,
      /^You\s+/i,
      /^Status\s+updated\s+to\s+/i
    ];
    
    for (const p of prefixes) {
      name = name.replace(p, "").trim();
    }
    
    // clean up suffixes from agency
    const toIndex = agency.toLowerCase().indexOf(" to ");
    if (toIndex !== -1) {
      agency = agency.substring(0, toIndex).trim();
    }
    const isIndex = agency.toLowerCase().indexOf(" is ");
    if (isIndex !== -1) {
      agency = agency.substring(0, isIndex).trim();
    }
    const fromIndex = agency.toLowerCase().indexOf(" from ");
    if (fromIndex !== -1) {
      agency = agency.substring(0, fromIndex).trim();
    }
    return { name, agency };
  }
  return null;
};

export const boldAgentAndAgencyInText = (
  text: string,
  agentName?: string,
  agencyName?: string
): string => {
  if (!text) return "";
  
  // First, strip ALL existing double asterisks to prevent duplicate formatting or other items from being bolded
  let res = text.replace(/\*\*/g, "");
  
  // Bold "new title" and "new agent" case-insensitively using regex
  res = res.replace(/\b(new title)\b/gi, '**$1**');
  res = res.replace(/\b(new agent)\b/gi, '**$1**');
  
  if (agentName) {
    const cleanAgent = agentName.replace(/\*\*/g, "").trim();
    if (cleanAgent) {
      const escaped = cleanAgent.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const rx = new RegExp(`(?<!\\*\\*)${escaped}(?!\\*\\*)`, 'g');
      res = res.replace(rx, `**${cleanAgent}**`);
    }
  }
  
  if (agencyName) {
    const cleanAgency = agencyName.replace(/\*\*/g, "").trim();
    if (cleanAgency && cleanAgency.toLowerCase() !== "independent" && cleanAgency.toLowerCase() !== "unknown agency") {
      const escaped = cleanAgency.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const rx = new RegExp(`(?<!\\*\\*)${escaped}(?!\\*\\*)`, 'g');
      res = res.replace(rx, `**${cleanAgency}**`);
    }
  }
  
  return res;
};

export const getDynamicActivityText = (
  act: Activity,
  key: string | null,
  msTitle: string,
  agent: { name: string; agency: string } | null,
  q?: { responseDeadline?: string | null } | null
) => {
  // The AI-style copy-customizer (the only writer of sc_custom_desc_/sc_custom_details_) has been
  // removed, so the timeline text is always the stored activity copy.
  return { description: act.description, details: act.details || "" };
};
