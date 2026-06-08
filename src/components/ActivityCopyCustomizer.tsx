import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  X, 
  Sparkles, 
  Copy, 
  Check, 
  UserPlus, 
  Users, 
  BookOpen, 
  FileText, 
  Send, 
  Bell, 
  FilePlus,
  RefreshCw,
  HelpCircle,
  FileCheck,
  AlertOctagon,
  Ban,
  Clock,
  Briefcase
} from "lucide-react";

interface ActivityCopyCustomizerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ActivityCopyCustomizer: React.FC<ActivityCopyCustomizerProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"pipeline" | "general">("pipeline");
  const [promptOpened, setPromptOpened] = useState(false);

  // States with Local Storage persistence for the 10 Pipeline Status transitions
  const [queriedDesc, setQueriedDesc] = useState(() => localStorage.getItem("sc_custom_desc_queried") || "");
  const [queriedDetails, setQueriedDetails] = useState(() => localStorage.getItem("sc_custom_details_queried") || "");

  const [partialRequestedDesc, setPartialRequestedDesc] = useState(() => localStorage.getItem("sc_custom_desc_partial_req") || "");
  const [partialRequestedDetails, setPartialRequestedDetails] = useState(() => localStorage.getItem("sc_custom_details_partial_req") || "");

  const [partialSentDesc, setPartialSentDesc] = useState(() => localStorage.getItem("sc_custom_desc_partial_sent") || "");
  const [partialSentDetails, setPartialSentDetails] = useState(() => localStorage.getItem("sc_custom_details_partial_sent") || "");

  const [fullRequestedDesc, setFullRequestedDesc] = useState(() => localStorage.getItem("sc_custom_desc_full_req") || "");
  const [fullRequestedDetails, setFullRequestedDetails] = useState(() => localStorage.getItem("sc_custom_details_full_req") || "");

  const [fullSentDesc, setFullSentDesc] = useState(() => localStorage.getItem("sc_custom_desc_full_sent") || "");
  const [fullSentDetails, setFullSentDetails] = useState(() => localStorage.getItem("sc_custom_details_full_sent") || "");

  const [rrDesc, setRrDesc] = useState(() => localStorage.getItem("sc_custom_desc_rr") || "");
  const [rrDetails, setRrDetails] = useState(() => localStorage.getItem("sc_custom_details_rr") || "");

  const [offerDesc, setOfferDesc] = useState(() => localStorage.getItem("sc_custom_desc_offer") || "");
  const [offerDetails, setOfferDetails] = useState(() => localStorage.getItem("sc_custom_details_offer") || "");

  const [rejectedDesc, setRejectedDesc] = useState(() => localStorage.getItem("sc_custom_desc_rejected") || "");
  const [rejectedDetails, setRejectedDetails] = useState(() => localStorage.getItem("sc_custom_details_rejected") || "");

  const [withdrawnDesc, setWithdrawnDesc] = useState(() => localStorage.getItem("sc_custom_desc_withdrawn") || "");
  const [withdrawnDetails, setWithdrawnDetails] = useState(() => localStorage.getItem("sc_custom_details_withdrawn") || "");

  const [noResponseDesc, setNoResponseDesc] = useState(() => localStorage.getItem("sc_custom_desc_no_response") || "");
  const [noResponseDetails, setNoResponseDetails] = useState(() => localStorage.getItem("sc_custom_details_no_response") || "");

  // General Activity Events
  const [agentAddedDesc, setAgentAddedDesc] = useState(() => localStorage.getItem("sc_custom_desc_agent_added") || "");
  const [agentAddedDetails, setAgentAddedDetails] = useState(() => localStorage.getItem("sc_custom_details_agent_added") || "");

  const [agentUpdatedDesc, setAgentUpdatedDesc] = useState(() => localStorage.getItem("sc_custom_desc_agent_updated") || "");
  const [agentUpdatedDetails, setAgentUpdatedDetails] = useState(() => localStorage.getItem("sc_custom_details_agent_updated") || "");

  const [manuscriptAddedDesc, setManuscriptAddedDesc] = useState(() => localStorage.getItem("sc_custom_desc_ms_added") || "");
  const [manuscriptAddedDetails, setManuscriptAddedDetails] = useState(() => localStorage.getItem("sc_custom_details_ms_added") || "");

  const [manuscriptUpdatedDesc, setManuscriptUpdatedDesc] = useState(() => localStorage.getItem("sc_custom_desc_ms_updated") || "");
  const [manuscriptUpdatedDetails, setManuscriptUpdatedDetails] = useState(() => localStorage.getItem("sc_custom_details_ms_updated") || "");

  const [nudgeSentDesc, setNudgeSentDesc] = useState(() => localStorage.getItem("sc_custom_desc_nudge_sent") || "");
  const [nudgeSentDetails, setNudgeSentDetails] = useState(() => localStorage.getItem("sc_custom_details_nudge_sent") || "");

  // States with Local Storage persistence for Manuscript Title Tag Pills (Default to shown/true)
  const [queriedMsShow, setQueriedMsShow] = useState(() => localStorage.getItem("sc_custom_ms_show_queried") !== "false");
  const [partialRequestedMsShow, setPartialRequestedMsShow] = useState(() => localStorage.getItem("sc_custom_ms_show_partial_req") !== "false");
  const [partialSentMsShow, setPartialSentMsShow] = useState(() => localStorage.getItem("sc_custom_ms_show_partial_sent") !== "false");
  const [fullRequestedMsShow, setFullRequestedMsShow] = useState(() => localStorage.getItem("sc_custom_ms_show_full_req") !== "false");
  const [fullSentMsShow, setFullSentMsShow] = useState(() => localStorage.getItem("sc_custom_ms_show_full_sent") !== "false");
  const [rrMsShow, setRrMsShow] = useState(() => localStorage.getItem("sc_custom_ms_show_rr") !== "false");
  const [offerMsShow, setOfferMsShow] = useState(() => localStorage.getItem("sc_custom_ms_show_offer") !== "false");
  const [rejectedMsShow, setRejectedMsShow] = useState(() => localStorage.getItem("sc_custom_ms_show_rejected") !== "false");
  const [withdrawnMsShow, setWithdrawnMsShow] = useState(() => localStorage.getItem("sc_custom_ms_show_withdrawn") !== "false");
  const [noResponseMsShow, setNoResponseMsShow] = useState(() => localStorage.getItem("sc_custom_ms_show_no_response") !== "false");

  const [agentAddedMsShow, setAgentAddedMsShow] = useState(() => localStorage.getItem("sc_custom_ms_show_agent_added") !== "false");
  const [agentUpdatedMsShow, setAgentUpdatedMsShow] = useState(() => localStorage.getItem("sc_custom_ms_show_agent_updated") !== "false");
  const [manuscriptAddedMsShow, setManuscriptAddedMsShow] = useState(() => localStorage.getItem("sc_custom_ms_show_ms_added") !== "false");
  const [manuscriptUpdatedMsShow, setManuscriptUpdatedMsShow] = useState(() => localStorage.getItem("sc_custom_ms_show_ms_updated") !== "false");
  const [nudgeSentMsShow, setNudgeSentMsShow] = useState(() => localStorage.getItem("sc_custom_ms_show_nudge_sent") !== "false");

  // States with Local Storage persistence for Manuscript Title Tag Label Overrides
  const [queriedMsLabel, setQueriedMsLabel] = useState(() => localStorage.getItem("sc_custom_ms_label_queried") || "");
  const [partialRequestedMsLabel, setPartialRequestedMsLabel] = useState(() => localStorage.getItem("sc_custom_ms_label_partial_req") || "");
  const [partialSentMsLabel, setPartialSentMsLabel] = useState(() => localStorage.getItem("sc_custom_ms_label_partial_sent") || "");
  const [fullRequestedMsLabel, setFullRequestedMsLabel] = useState(() => localStorage.getItem("sc_custom_ms_label_full_req") || "");
  const [fullSentMsLabel, setFullSentMsLabel] = useState(() => localStorage.getItem("sc_custom_ms_label_full_sent") || "");
  const [rrMsLabel, setRrMsLabel] = useState(() => localStorage.getItem("sc_custom_ms_label_rr") || "");
  const [offerMsLabel, setOfferMsLabel] = useState(() => localStorage.getItem("sc_custom_ms_label_offer") || "");
  const [rejectedMsLabel, setRejectedMsLabel] = useState(() => localStorage.getItem("sc_custom_ms_label_rejected") || "");
  const [withdrawnMsLabel, setWithdrawnMsLabel] = useState(() => localStorage.getItem("sc_custom_ms_label_withdrawn") || "");
  const [noResponseMsLabel, setNoResponseMsLabel] = useState(() => localStorage.getItem("sc_custom_ms_label_no_response") || "");

  const [agentAddedMsLabel, setAgentAddedMsLabel] = useState(() => localStorage.getItem("sc_custom_ms_label_agent_added") || "");
  const [agentUpdatedMsLabel, setAgentUpdatedMsLabel] = useState(() => localStorage.getItem("sc_custom_ms_label_agent_updated") || "");
  const [manuscriptAddedMsLabel, setManuscriptAddedMsLabel] = useState(() => localStorage.getItem("sc_custom_ms_label_ms_added") || "");
  const [manuscriptUpdatedMsLabel, setManuscriptUpdatedMsLabel] = useState(() => localStorage.getItem("sc_custom_ms_label_ms_updated") || "");
  const [nudgeSentMsLabel, setNudgeSentMsLabel] = useState(() => localStorage.getItem("sc_custom_ms_label_nudge_sent") || "");

  // States with Local Storage persistence for the Category Tag Pills
  const [queriedPillShow, setQueriedPillShow] = useState(() => localStorage.getItem("sc_custom_pill_show_queried") !== "false");
  const [queriedPillLabel, setQueriedPillLabel] = useState(() => localStorage.getItem("sc_custom_pill_label_queried") || "");

  const [partialRequestedPillShow, setPartialRequestedPillShow] = useState(() => localStorage.getItem("sc_custom_pill_show_partial_req") !== "false");
  const [partialRequestedPillLabel, setPartialRequestedPillLabel] = useState(() => localStorage.getItem("sc_custom_pill_label_partial_req") || "");

  const [partialSentPillShow, setPartialSentPillShow] = useState(() => localStorage.getItem("sc_custom_pill_show_partial_sent") !== "false");
  const [partialSentPillLabel, setPartialSentPillLabel] = useState(() => localStorage.getItem("sc_custom_pill_label_partial_sent") || "");

  const [fullRequestedPillShow, setFullRequestedPillShow] = useState(() => localStorage.getItem("sc_custom_pill_show_full_req") !== "false");
  const [fullRequestedPillLabel, setFullRequestedPillLabel] = useState(() => localStorage.getItem("sc_custom_pill_label_full_req") || "");

  const [fullSentPillShow, setFullSentPillShow] = useState(() => localStorage.getItem("sc_custom_pill_show_full_sent") !== "false");
  const [fullSentPillLabel, setFullSentPillLabel] = useState(() => localStorage.getItem("sc_custom_pill_label_full_sent") || "");

  const [rrPillShow, setRrPillShow] = useState(() => localStorage.getItem("sc_custom_pill_show_rr") !== "false");
  const [rrPillLabel, setRrPillLabel] = useState(() => localStorage.getItem("sc_custom_pill_label_rr") || "");

  const [offerPillShow, setOfferPillShow] = useState(() => localStorage.getItem("sc_custom_pill_show_offer") !== "false");
  const [offerPillLabel, setOfferPillLabel] = useState(() => localStorage.getItem("sc_custom_pill_label_offer") || "");

  const [rejectedPillShow, setRejectedPillShow] = useState(() => localStorage.getItem("sc_custom_pill_show_rejected") !== "false");
  const [rejectedPillLabel, setRejectedPillLabel] = useState(() => localStorage.getItem("sc_custom_pill_label_rejected") || "");

  const [withdrawnPillShow, setWithdrawnPillShow] = useState(() => localStorage.getItem("sc_custom_pill_show_withdrawn") !== "false");
  const [withdrawnPillLabel, setWithdrawnPillLabel] = useState(() => localStorage.getItem("sc_custom_pill_label_withdrawn") || "");

  const [noResponsePillShow, setNoResponsePillShow] = useState(() => localStorage.getItem("sc_custom_pill_show_no_response") !== "false");
  const [noResponsePillLabel, setNoResponsePillLabel] = useState(() => localStorage.getItem("sc_custom_pill_label_no_response") || "");

  // General Activity Events
  const [agentAddedPillShow, setAgentAddedPillShow] = useState(() => localStorage.getItem("sc_custom_pill_show_agent_added") !== "false");
  const [agentAddedPillLabel, setAgentAddedPillLabel] = useState(() => localStorage.getItem("sc_custom_pill_label_agent_added") || "");

  const [agentUpdatedPillShow, setAgentUpdatedPillShow] = useState(() => localStorage.getItem("sc_custom_pill_show_agent_updated") !== "false");
  const [agentUpdatedPillLabel, setAgentUpdatedPillLabel] = useState(() => localStorage.getItem("sc_custom_pill_label_agent_updated") || "");

  const [manuscriptAddedPillShow, setManuscriptAddedPillShow] = useState(() => localStorage.getItem("sc_custom_pill_show_ms_added") !== "false");
  const [manuscriptAddedPillLabel, setManuscriptAddedPillLabel] = useState(() => localStorage.getItem("sc_custom_pill_label_ms_added") || "");

  const [manuscriptUpdatedPillShow, setManuscriptUpdatedPillShow] = useState(() => localStorage.getItem("sc_custom_pill_show_ms_updated") !== "false");
  const [manuscriptUpdatedPillLabel, setManuscriptUpdatedPillLabel] = useState(() => localStorage.getItem("sc_custom_pill_label_ms_updated") || "");

  const [nudgeSentPillShow, setNudgeSentPillShow] = useState(() => localStorage.getItem("sc_custom_pill_show_nudge_sent") !== "false");
  const [nudgeSentPillLabel, setNudgeSentPillLabel] = useState(() => localStorage.getItem("sc_custom_pill_label_nudge_sent") || "");

  // Sync state changes to localStorage
  useEffect(() => {
    localStorage.setItem("sc_custom_desc_queried", queriedDesc);
    localStorage.setItem("sc_custom_details_queried", queriedDetails);
    localStorage.setItem("sc_custom_desc_partial_req", partialRequestedDesc);
    localStorage.setItem("sc_custom_details_partial_req", partialRequestedDetails);
    localStorage.setItem("sc_custom_desc_partial_sent", partialSentDesc);
    localStorage.setItem("sc_custom_details_partial_sent", partialSentDetails);
    localStorage.setItem("sc_custom_desc_full_req", fullRequestedDesc);
    localStorage.setItem("sc_custom_details_full_req", fullRequestedDetails);
    localStorage.setItem("sc_custom_desc_full_sent", fullSentDesc);
    localStorage.setItem("sc_custom_details_full_sent", fullSentDetails);
    localStorage.setItem("sc_custom_desc_rr", rrDesc);
    localStorage.setItem("sc_custom_details_rr", rrDetails);
    localStorage.setItem("sc_custom_desc_offer", offerDesc);
    localStorage.setItem("sc_custom_details_offer", offerDetails);
    localStorage.setItem("sc_custom_desc_rejected", rejectedDesc);
    localStorage.setItem("sc_custom_details_rejected", rejectedDetails);
    localStorage.setItem("sc_custom_desc_withdrawn", withdrawnDesc);
    localStorage.setItem("sc_custom_details_withdrawn", withdrawnDetails);
    localStorage.setItem("sc_custom_desc_no_response", noResponseDesc);
    localStorage.setItem("sc_custom_details_no_response", noResponseDetails);

    localStorage.setItem("sc_custom_desc_agent_added", agentAddedDesc);
    localStorage.setItem("sc_custom_details_agent_added", agentAddedDetails);
    localStorage.setItem("sc_custom_desc_agent_updated", agentUpdatedDesc);
    localStorage.setItem("sc_custom_details_agent_updated", agentUpdatedDetails);
    localStorage.setItem("sc_custom_desc_ms_added", manuscriptAddedDesc);
    localStorage.setItem("sc_custom_details_ms_added", manuscriptAddedDetails);
    localStorage.setItem("sc_custom_desc_ms_updated", manuscriptUpdatedDesc);
    localStorage.setItem("sc_custom_details_ms_updated", manuscriptUpdatedDetails);
    localStorage.setItem("sc_custom_desc_nudge_sent", nudgeSentDesc);
    localStorage.setItem("sc_custom_details_nudge_sent", nudgeSentDetails);

    // Pill variables Sync
    localStorage.setItem("sc_custom_pill_show_queried", queriedPillShow ? "true" : "false");
    localStorage.setItem("sc_custom_pill_label_queried", queriedPillLabel);
    localStorage.setItem("sc_custom_pill_show_partial_req", partialRequestedPillShow ? "true" : "false");
    localStorage.setItem("sc_custom_pill_label_partial_req", partialRequestedPillLabel);
    localStorage.setItem("sc_custom_pill_show_partial_sent", partialSentPillShow ? "true" : "false");
    localStorage.setItem("sc_custom_pill_label_partial_sent", partialSentPillLabel);
    localStorage.setItem("sc_custom_pill_show_full_req", fullRequestedPillShow ? "true" : "false");
    localStorage.setItem("sc_custom_pill_label_full_req", fullRequestedPillLabel);
    localStorage.setItem("sc_custom_pill_show_full_sent", fullSentPillShow ? "true" : "false");
    localStorage.setItem("sc_custom_pill_label_full_sent", fullSentPillLabel);
    localStorage.setItem("sc_custom_pill_show_rr", rrPillShow ? "true" : "false");
    localStorage.setItem("sc_custom_pill_label_rr", rrPillLabel);
    localStorage.setItem("sc_custom_pill_show_offer", offerPillShow ? "true" : "false");
    localStorage.setItem("sc_custom_pill_label_offer", offerPillLabel);
    localStorage.setItem("sc_custom_pill_show_rejected", rejectedPillShow ? "true" : "false");
    localStorage.setItem("sc_custom_pill_label_rejected", rejectedPillLabel);
    localStorage.setItem("sc_custom_pill_show_withdrawn", withdrawnPillShow ? "true" : "false");
    localStorage.setItem("sc_custom_pill_label_withdrawn", withdrawnPillLabel);
    localStorage.setItem("sc_custom_pill_show_no_response", noResponsePillShow ? "true" : "false");
    localStorage.setItem("sc_custom_pill_label_no_response", noResponsePillLabel);

    localStorage.setItem("sc_custom_pill_show_agent_added", agentAddedPillShow ? "true" : "false");
    localStorage.setItem("sc_custom_pill_label_agent_added", agentAddedPillLabel);
    localStorage.setItem("sc_custom_pill_show_agent_updated", agentUpdatedPillShow ? "true" : "false");
    localStorage.setItem("sc_custom_pill_label_agent_updated", agentUpdatedPillLabel);
    localStorage.setItem("sc_custom_pill_show_ms_added", manuscriptAddedPillShow ? "true" : "false");
    localStorage.setItem("sc_custom_pill_label_ms_added", manuscriptAddedPillLabel);
    localStorage.setItem("sc_custom_pill_show_ms_updated", manuscriptUpdatedPillShow ? "true" : "false");
    localStorage.setItem("sc_custom_pill_label_ms_updated", manuscriptUpdatedPillLabel);
    localStorage.setItem("sc_custom_pill_show_nudge_sent", nudgeSentPillShow ? "true" : "false");
    localStorage.setItem("sc_custom_pill_label_nudge_sent", nudgeSentPillLabel);

    // Manuscript Pill variables Sync
    localStorage.setItem("sc_custom_ms_show_queried", queriedMsShow ? "true" : "false");
    localStorage.setItem("sc_custom_ms_show_partial_req", partialRequestedMsShow ? "true" : "false");
    localStorage.setItem("sc_custom_ms_show_partial_sent", partialSentMsShow ? "true" : "false");
    localStorage.setItem("sc_custom_ms_show_full_req", fullRequestedMsShow ? "true" : "false");
    localStorage.setItem("sc_custom_ms_show_full_sent", fullSentMsShow ? "true" : "false");
    localStorage.setItem("sc_custom_ms_show_rr", rrMsShow ? "true" : "false");
    localStorage.setItem("sc_custom_ms_show_offer", offerMsShow ? "true" : "false");
    localStorage.setItem("sc_custom_ms_show_rejected", rejectedMsShow ? "true" : "false");
    localStorage.setItem("sc_custom_ms_show_withdrawn", withdrawnMsShow ? "true" : "false");
    localStorage.setItem("sc_custom_ms_show_no_response", noResponseMsShow ? "true" : "false");

    localStorage.setItem("sc_custom_ms_show_agent_added", agentAddedMsShow ? "true" : "false");
    localStorage.setItem("sc_custom_ms_show_agent_updated", agentUpdatedMsShow ? "true" : "false");
    localStorage.setItem("sc_custom_ms_show_ms_added", manuscriptAddedMsShow ? "true" : "false");
    localStorage.setItem("sc_custom_ms_show_ms_updated", manuscriptUpdatedMsShow ? "true" : "false");
    localStorage.setItem("sc_custom_ms_show_nudge_sent", nudgeSentMsShow ? "true" : "false");

    localStorage.setItem("sc_custom_ms_label_queried", queriedMsLabel);
    localStorage.setItem("sc_custom_ms_label_partial_req", partialRequestedMsLabel);
    localStorage.setItem("sc_custom_ms_label_partial_sent", partialSentMsLabel);
    localStorage.setItem("sc_custom_ms_label_full_req", fullRequestedMsLabel);
    localStorage.setItem("sc_custom_ms_label_full_sent", fullSentMsLabel);
    localStorage.setItem("sc_custom_ms_label_rr", rrMsLabel);
    localStorage.setItem("sc_custom_ms_label_offer", offerMsLabel);
    localStorage.setItem("sc_custom_ms_label_rejected", rejectedMsLabel);
    localStorage.setItem("sc_custom_ms_label_withdrawn", withdrawnMsLabel);
    localStorage.setItem("sc_custom_ms_label_no_response", noResponseMsLabel);

    localStorage.setItem("sc_custom_ms_label_agent_added", agentAddedMsLabel);
    localStorage.setItem("sc_custom_ms_label_agent_updated", agentUpdatedMsLabel);
    localStorage.setItem("sc_custom_ms_label_ms_added", manuscriptAddedMsLabel);
    localStorage.setItem("sc_custom_ms_label_ms_updated", manuscriptUpdatedMsLabel);
    localStorage.setItem("sc_custom_ms_label_nudge_sent", nudgeSentMsLabel);
  }, [
    queriedDesc, queriedDetails, partialRequestedDesc, partialRequestedDetails,
    partialSentDesc, partialSentDetails, fullRequestedDesc, fullRequestedDetails,
    fullSentDesc, fullSentDetails, rrDesc, rrDetails, offerDesc, offerDetails,
    rejectedDesc, rejectedDetails, withdrawnDesc, withdrawnDetails, noResponseDesc, noResponseDetails,
    agentAddedDesc, agentAddedDetails, agentUpdatedDesc, agentUpdatedDetails,
    manuscriptAddedDesc, manuscriptAddedDetails, manuscriptUpdatedDesc, manuscriptUpdatedDetails,
    nudgeSentDesc, nudgeSentDetails,
    queriedPillShow, queriedPillLabel, partialRequestedPillShow, partialRequestedPillLabel,
    partialSentPillShow, partialSentPillLabel, fullRequestedPillShow, fullRequestedPillLabel,
    fullSentPillShow, fullSentPillLabel, rrPillShow, rrPillLabel,
    offerPillShow, offerPillLabel, rejectedPillShow, rejectedPillLabel,
    withdrawnPillShow, withdrawnPillLabel, noResponsePillShow, noResponsePillLabel,
    agentAddedPillShow, agentAddedPillLabel, agentUpdatedPillShow, agentUpdatedPillLabel,
    manuscriptAddedPillShow, manuscriptAddedPillLabel, manuscriptUpdatedPillShow, manuscriptUpdatedPillLabel,
    nudgeSentPillShow, nudgeSentPillLabel,
    queriedMsShow, partialRequestedMsShow, partialSentMsShow, fullRequestedMsShow,
    fullSentMsShow, rrMsShow, offerMsShow, rejectedMsShow, withdrawnMsShow, noResponseMsShow,
    agentAddedMsShow, agentUpdatedMsShow, manuscriptAddedMsShow, manuscriptUpdatedMsShow, nudgeSentMsShow,
    queriedMsLabel, partialRequestedMsLabel, partialSentMsLabel, fullRequestedMsLabel,
    fullSentMsLabel, rrMsLabel, offerMsLabel, rejectedMsLabel, withdrawnMsLabel, noResponseMsLabel,
    agentAddedMsLabel, agentUpdatedMsLabel, manuscriptAddedMsLabel, manuscriptUpdatedMsLabel, nudgeSentMsLabel
  ]);

  // Reset to default helper
  const handleReset = () => {
    setQueriedDesc("");
    setQueriedDetails("");
    setPartialRequestedDesc("");
    setPartialRequestedDetails("");
    setPartialSentDesc("");
    setPartialSentDetails("");
    setFullRequestedDesc("");
    setFullRequestedDetails("");
    setFullSentDesc("");
    setFullSentDetails("");
    setRrDesc("");
    setRrDetails("");
    setOfferDesc("");
    setOfferDetails("");
    setRejectedDesc("");
    setRejectedDetails("");
    setWithdrawnDesc("");
    setWithdrawnDetails("");
    setNoResponseDesc("");
    setNoResponseDetails("");

    setAgentAddedDesc("");
    setAgentAddedDetails("");
    setAgentUpdatedDesc("");
    setAgentUpdatedDetails("");
    setManuscriptAddedDesc("");
    setManuscriptAddedDetails("");
    setManuscriptUpdatedDesc("");
    setManuscriptUpdatedDetails("");
    setNudgeSentDesc("");
    setNudgeSentDetails("");

    // Reset Pill variables
    setQueriedPillShow(true);
    setQueriedPillLabel("");
    setPartialRequestedPillShow(true);
    setPartialRequestedPillLabel("");
    setPartialSentPillShow(true);
    setPartialSentPillLabel("");
    setFullRequestedPillShow(true);
    setFullRequestedPillLabel("");
    setFullSentPillShow(true);
    setFullSentPillLabel("");
    setRrPillShow(true);
    setRrPillLabel("");
    setOfferPillShow(true);
    setOfferPillLabel("");
    setRejectedPillShow(true);
    setRejectedPillLabel("");
    setWithdrawnPillShow(true);
    setWithdrawnPillLabel("");
    setNoResponsePillShow(true);
    setNoResponsePillLabel("");

    setAgentAddedPillShow(true);
    setAgentAddedPillLabel("");
    setAgentUpdatedPillShow(true);
    setAgentUpdatedPillLabel("");
    setManuscriptAddedPillShow(true);
    setManuscriptAddedPillLabel("");
    setManuscriptUpdatedPillShow(true);
    setManuscriptUpdatedPillLabel("");
    setNudgeSentPillShow(true);
    setNudgeSentPillLabel("");

    // Reset Manuscript Pill variables
    setQueriedMsShow(true);
    setPartialRequestedMsShow(true);
    setPartialSentMsShow(true);
    setFullRequestedMsShow(true);
    setFullSentMsShow(true);
    setRrMsShow(true);
    setOfferMsShow(true);
    setRejectedMsShow(true);
    setWithdrawnMsShow(true);
    setNoResponseMsShow(true);

    setAgentAddedMsShow(true);
    setAgentUpdatedMsShow(true);
    setManuscriptAddedMsShow(true);
    setManuscriptUpdatedMsShow(true);
    setNudgeSentMsShow(true);

    setQueriedMsLabel("");
    setPartialRequestedMsLabel("");
    setPartialSentMsLabel("");
    setFullRequestedMsLabel("");
    setFullSentMsLabel("");
    setRrMsLabel("");
    setOfferMsLabel("");
    setRejectedMsLabel("");
    setWithdrawnMsLabel("");
    setNoResponseMsLabel("");

    setAgentAddedMsLabel("");
    setAgentUpdatedMsLabel("");
    setManuscriptAddedMsLabel("");
    setManuscriptUpdatedMsLabel("");
    setNudgeSentMsLabel("");
  };

  // Pipeline configuration schema
  const pipelineConfig = [
    {
      label: "Queried Stage",
      icon: Send,
      description: "Triggered upon query dispatch initialization.",
      descValue: queriedDesc,
      descOnChange: setQueriedDesc,
      defaultDesc: "Query sent to {Agent Name} at {Agency Name}",
      descPlaceholder: "e.g., Query dispatched to {Agent Name} at {Agency Name}",
      detailsValue: queriedDetails,
      detailsOnChange: setQueriedDetails,
      defaultDetails: "Expect a response by {Response Deadline}",
      detailsPlaceholder: "e.g., Expecting reply on or before {Response Deadline}",
      pillShowValue: queriedPillShow,
      pillShowOnChange: setQueriedPillShow,
      pillLabelValue: queriedPillLabel,
      pillLabelOnChange: setQueriedPillLabel,
      defaultPillLabel: "Query sent",
      pillPlaceholder: "e.g., Query Dispatched",
      msShowValue: queriedMsShow,
      msShowOnChange: setQueriedMsShow,
      msLabelValue: queriedMsLabel,
      msLabelOnChange: setQueriedMsLabel,
      defaultMsLabel: "{Manuscript Title}"
    },
    {
      label: "Partial Requested",
      icon: FileText,
      description: "Triggered when an agent requests a partial sample.",
      descValue: partialRequestedDesc,
      descOnChange: setPartialRequestedDesc,
      defaultDesc: "Great news! {Agent Name} at {Agency Name} requested a partial manuscript!",
      descPlaceholder: "e.g., Exciting request! {Agent Name} @ {Agency Name} is asking for a partial!",
      detailsValue: partialRequestedDetails,
      detailsOnChange: setPartialRequestedDetails,
      defaultDetails: "{System Notes}",
      detailsPlaceholder: "e.g., Moving forward: {System Notes}",
      pillShowValue: partialRequestedPillShow,
      pillShowOnChange: setPartialRequestedPillShow,
      pillLabelValue: partialRequestedPillLabel,
      pillLabelOnChange: setPartialRequestedPillLabel,
      defaultPillLabel: "Partial requested",
      pillPlaceholder: "e.g., Partial Asked",
      msShowValue: partialRequestedMsShow,
      msShowOnChange: setPartialRequestedMsShow,
      msLabelValue: partialRequestedMsLabel,
      msLabelOnChange: setPartialRequestedMsLabel,
      defaultMsLabel: "{Manuscript Title}"
    },
    {
      label: "Partial Sent",
      icon: FileCheck,
      description: "Triggered when partial materials are delivered.",
      descValue: partialSentDesc,
      descOnChange: setPartialSentDesc,
      defaultDesc: "Sent partial manuscript to {Agent Name} at {Agency Name}.",
      descPlaceholder: "e.g., Standard partial packet submitted to {Agent Name} at {Agency Name}.",
      detailsValue: partialSentDetails,
      detailsOnChange: setPartialSentDetails,
      defaultDetails: "If you haven't heard back by {Response Deadline}, we'll suggest sending a follow-up.",
      detailsPlaceholder: "e.g., Response tracking active. Nudge warning at {Response Deadline}.",
      pillShowValue: partialSentPillShow,
      pillShowOnChange: setPartialSentPillShow,
      pillLabelValue: partialSentPillLabel,
      pillLabelOnChange: setPartialSentPillLabel,
      defaultPillLabel: "Partial sent",
      pillPlaceholder: "e.g., Partial Pack Sent",
      msShowValue: partialSentMsShow,
      msShowOnChange: setPartialSentMsShow,
      msLabelValue: partialSentMsLabel,
      msLabelOnChange: setPartialSentMsLabel,
      defaultMsLabel: "{Manuscript Title}"
    },
    {
      label: "Full Requested",
      icon: FilePlus,
      description: "Triggered when the full manuscript is requested.",
      descValue: fullRequestedDesc,
      descOnChange: setFullRequestedDesc,
      defaultDesc: "Amazing news! {Agent Name} at {Agency Name} requested a full manuscript!",
      descPlaceholder: "e.g., Brilliant milestone! {Agent Name} at {Agency Name} requested the full novel!",
      detailsValue: fullRequestedDetails,
      detailsOnChange: setFullRequestedDetails,
      defaultDetails: "Polish your manuscript and send as soon as you can.",
      detailsPlaceholder: "e.g., Prep full dispatch soon for the desk of {Agent Name}.",
      pillShowValue: fullRequestedPillShow,
      pillShowOnChange: setFullRequestedPillShow,
      pillLabelValue: fullRequestedPillLabel,
      pillLabelOnChange: setFullRequestedPillLabel,
      defaultPillLabel: "Full requested",
      pillPlaceholder: "e.g., Full Asked",
      msShowValue: fullRequestedMsShow,
      msShowOnChange: setFullRequestedMsShow,
      msLabelValue: fullRequestedMsLabel,
      msLabelOnChange: setFullRequestedMsLabel,
      defaultMsLabel: "{Manuscript Title}"
    },
    {
      label: "Full Sent",
      icon: Briefcase,
      description: "Triggered when full manuscript is delivered.",
      descValue: fullSentDesc,
      descOnChange: setFullSentDesc,
      defaultDesc: "Full manuscript sent to {Agent Name} at {Agency Name}.",
      descPlaceholder: "e.g., Dynamic complete digital manuscript dispatched to {Agent Name} at {Agency Name}.",
      detailsValue: fullSentDetails,
      detailsOnChange: setFullSentDetails,
      defaultDetails: "If you haven't heard back by {Response Deadline}, we'll suggest sending a follow-up.",
      detailsPlaceholder: "e.g., Follow up checks enabled. Calendar due date: {Response Deadline}.",
      pillShowValue: fullSentPillShow,
      pillShowOnChange: setFullSentPillShow,
      pillLabelValue: fullSentPillLabel,
      pillLabelOnChange: setFullSentPillLabel,
      defaultPillLabel: "Full sent",
      pillPlaceholder: "e.g., Full Package Sent",
      msShowValue: fullSentMsShow,
      msShowOnChange: setFullSentMsShow,
      msLabelValue: fullSentMsLabel,
      msLabelOnChange: setFullSentMsLabel,
      defaultMsLabel: "{Manuscript Title}"
    },
    {
      label: "Revise & Resubmit",
      icon: RefreshCw,
      description: "Triggered when an R&R request is logged.",
      descValue: rrDesc,
      descOnChange: setRrDesc,
      defaultDesc: "{Agent Name} from {Agency Name} has requested that you revise and resubmit your materials.",
      descPlaceholder: "e.g., Received encouraging R&R request from {Agent Name} at {Agency Name}!",
      detailsValue: rrDetails,
      detailsOnChange: setRrDetails,
      defaultDetails: "{System Notes}",
      detailsPlaceholder: "e.g., Read reviewer direction notes carefully: {System Notes}",
      pillShowValue: rrPillShow,
      pillShowOnChange: setRrPillShow,
      pillLabelValue: rrPillLabel,
      pillLabelOnChange: setRrPillLabel,
      defaultPillLabel: "Revise & resubmit",
      pillPlaceholder: "e.g., R&R Asked",
      msShowValue: rrMsShow,
      msShowOnChange: setRrMsShow,
      msLabelValue: rrMsLabel,
      msLabelOnChange: setRrMsLabel,
      defaultMsLabel: "{Manuscript Title}"
    },
    {
      label: "Offer of Rep",
      icon: Sparkles,
      description: "Triggered when representation is offered.",
      descValue: offerDesc,
      descOnChange: setOfferDesc,
      defaultDesc: "Congratulations! You've received an offer of representation from {Agent Name} at {Agency Name}!",
      descPlaceholder: "e.g., Life-changing landmark! Offer of representation received from {Agent Name} at {Agency Name}!",
      detailsValue: offerDetails,
      detailsOnChange: setOfferDetails,
      defaultDetails: "{System Notes}",
      detailsPlaceholder: "e.g., Representation details: {System Notes}",
      pillShowValue: offerPillShow,
      pillShowOnChange: setOfferPillShow,
      pillLabelValue: offerPillLabel,
      pillLabelOnChange: setOfferPillLabel,
      defaultPillLabel: "Offer received",
      pillPlaceholder: "e.g., Offer of Rep",
      msShowValue: offerMsShow,
      msShowOnChange: setOfferMsShow,
      msLabelValue: offerMsLabel,
      msLabelOnChange: setOfferMsLabel,
      defaultMsLabel: "{Manuscript Title}"
    },
    {
      label: "Rejected",
      icon: Ban,
      description: "Triggered on query/submission rejection pass.",
      descValue: rejectedDesc,
      descOnChange: setRejectedDesc,
      defaultDesc: "{Agent Name} from {Agency Name} has rejected your query. Keep going — it's all part of the journey.",
      descPlaceholder: "e.g., Formal pass recorded from {Agent Name} at {Agency Name} on this ledger.",
      detailsValue: rejectedDetails,
      detailsOnChange: setRejectedDetails,
      defaultDetails: "{System Notes}",
      detailsPlaceholder: "e.g., Author notes: {System Notes}",
      pillShowValue: rejectedPillShow,
      pillShowOnChange: setRejectedPillShow,
      pillLabelValue: rejectedPillLabel,
      pillLabelOnChange: setRejectedPillLabel,
      defaultPillLabel: "Rejection",
      pillPlaceholder: "e.g., Rejected/Closed",
      msShowValue: rejectedMsShow,
      msShowOnChange: setRejectedMsShow,
      msLabelValue: rejectedMsLabel,
      msLabelOnChange: setRejectedMsLabel,
      defaultMsLabel: "{Manuscript Title}"
    },
    {
      label: "Withdrawn",
      icon: AlertOctagon,
      description: "Triggered when query is manually withdrawn.",
      descValue: withdrawnDesc,
      descOnChange: setWithdrawnDesc,
      defaultDesc: "Withdrew query from {Agent Name} at {Agency Name}.",
      descPlaceholder: "e.g., Formally retracted submission from {Agent Name} at {Agency Name}.",
      detailsValue: withdrawnDetails,
      detailsOnChange: setWithdrawnDetails,
      defaultDetails: "{System Notes}",
      detailsPlaceholder: "e.g., Reason notes: {System Notes}",
      pillShowValue: withdrawnPillShow,
      pillShowOnChange: setWithdrawnPillShow,
      pillLabelValue: withdrawnPillLabel,
      pillLabelOnChange: setWithdrawnPillLabel,
      defaultPillLabel: "Withdrawn",
      pillPlaceholder: "e.g., Retracted",
      msShowValue: withdrawnMsShow,
      msShowOnChange: setWithdrawnMsShow,
      msLabelValue: withdrawnMsLabel,
      msLabelOnChange: setWithdrawnMsLabel,
      defaultMsLabel: "{Manuscript Title}"
    },
    {
      label: "No Response",
      icon: Clock,
      description: "Triggered when the tracking time window closes.",
      descValue: noResponseDesc,
      descOnChange: setNoResponseDesc,
      defaultDesc: "Status updated to No Response",
      descPlaceholder: "e.g., Query reached active tracking deadline with zero response.",
      detailsValue: noResponseDetails,
      detailsOnChange: setNoResponseDetails,
      defaultDetails: "{System Notes}",
      detailsPlaceholder: "e.g., Closed ledger thread as timeout reached ({System Notes}).",
      pillShowValue: noResponsePillShow,
      pillShowOnChange: setNoResponsePillShow,
      pillLabelValue: noResponsePillLabel,
      pillLabelOnChange: setNoResponsePillLabel,
      defaultPillLabel: "Status changed",
      pillPlaceholder: "e.g., No Response",
      msShowValue: noResponseMsShow,
      msShowOnChange: setNoResponseMsShow,
      msLabelValue: noResponseMsLabel,
      msLabelOnChange: setNoResponseMsLabel,
      defaultMsLabel: "{Manuscript Title}"
    }
  ];

  // General configuration schema
  const generalConfig = [
    {
      label: "Agent Added",
      icon: UserPlus,
      description: "Logged whenever a new agent is registered.",
      descValue: agentAddedDesc,
      descOnChange: setAgentAddedDesc,
      defaultDesc: "Added new agent {Agent Name} at {Agency Name} to your agent list",
      descPlaceholder: "e.g., Registered contact {Agent Name} ({Agency Name}) into local archives.",
      detailsValue: agentAddedDetails,
      detailsOnChange: setAgentAddedDetails,
      defaultDetails: "",
      detailsPlaceholder: "e.g., Profile initialized safely.",
      pillShowValue: agentAddedPillShow,
      pillShowOnChange: setAgentAddedPillShow,
      pillLabelValue: agentAddedPillLabel,
      pillLabelOnChange: setAgentAddedPillLabel,
      defaultPillLabel: "Agent added",
      pillPlaceholder: "e.g., Agent Added",
      msShowValue: agentAddedMsShow,
      msShowOnChange: setAgentAddedMsShow,
      msLabelValue: agentAddedMsLabel,
      msLabelOnChange: setAgentAddedMsLabel,
      defaultMsLabel: "[agent's full name] at [agency name]"
    },
    {
      label: "Agent Updated",
      icon: Users,
      description: "Triggered on rating, sub status, or wishlist changes.",
      descValue: agentUpdatedDesc,
      descOnChange: setAgentUpdatedDesc,
      defaultDesc: "Updated profile details for {Agent Name} at {Agency Name}",
      descPlaceholder: "e.g., Profile adjustment logged for {Agent Name} of {Agency Name}.",
      detailsValue: agentUpdatedDetails,
      detailsOnChange: setAgentUpdatedDetails,
      defaultDetails: "",
      detailsPlaceholder: "e.g., Ledger records synced.",
      pillShowValue: agentUpdatedPillShow,
      pillShowOnChange: setAgentUpdatedPillShow,
      pillLabelValue: agentUpdatedPillLabel,
      pillLabelOnChange: setAgentUpdatedPillLabel,
      defaultPillLabel: "Agent updated",
      pillPlaceholder: "e.g., Agent Profile Sync",
      msShowValue: agentUpdatedMsShow,
      msShowOnChange: setAgentUpdatedMsShow,
      msLabelValue: agentUpdatedMsLabel,
      msLabelOnChange: setAgentUpdatedMsLabel,
      defaultMsLabel: "[agent's full name] at [agency name]"
    },
    {
      label: "Manuscript Added",
      icon: FilePlus,
      description: "Triggered when a new project is created.",
      descValue: manuscriptAddedDesc,
      descOnChange: setManuscriptAddedDesc,
      defaultDesc: "Added new title {Manuscript Title} to your manuscripts",
      descPlaceholder: "e.g., Registered manuscript project {Manuscript Title} into active database.",
      detailsValue: manuscriptAddedDetails,
      detailsOnChange: setManuscriptAddedDetails,
      defaultDetails: "",
      detailsPlaceholder: "e.g., Draft metadata stored.",
      pillShowValue: manuscriptAddedPillShow,
      pillShowOnChange: setManuscriptAddedPillShow,
      pillLabelValue: manuscriptAddedPillLabel,
      pillLabelOnChange: setManuscriptAddedPillLabel,
      defaultPillLabel: "Manuscript added",
      pillPlaceholder: "e.g., MS Added",
      msShowValue: manuscriptAddedMsShow,
      msShowOnChange: setManuscriptAddedMsShow,
      msLabelValue: manuscriptAddedMsLabel,
      msLabelOnChange: setManuscriptAddedMsLabel,
      defaultMsLabel: "{Manuscript Title}"
    },
    {
      label: "Manuscript Updated",
      icon: BookOpen,
      description: "Triggered when project updates are saved.",
      descValue: manuscriptUpdatedDesc,
      descOnChange: setManuscriptUpdatedDesc,
      defaultDesc: "Updated details for {Manuscript Title}",
      descPlaceholder: "e.g., Detail updates logged for {Manuscript Title} file.",
      detailsValue: manuscriptUpdatedDetails,
      detailsOnChange: setManuscriptUpdatedDetails,
      defaultDetails: "",
      detailsPlaceholder: "e.g., System schema synchronized.",
      pillShowValue: manuscriptUpdatedPillShow,
      pillShowOnChange: setManuscriptUpdatedPillShow,
      pillLabelValue: manuscriptUpdatedPillLabel,
      pillLabelOnChange: setManuscriptUpdatedPillLabel,
      defaultPillLabel: "Manuscript updated",
      pillPlaceholder: "e.g., MS Profile Sync",
      msShowValue: manuscriptUpdatedMsShow,
      msShowOnChange: setManuscriptUpdatedMsShow,
      msLabelValue: manuscriptUpdatedMsLabel,
      msLabelOnChange: setManuscriptUpdatedMsLabel,
      defaultMsLabel: "{Manuscript Title}"
    },
    {
      label: "Nudge Sent",
      icon: Bell,
      description: "Triggered when delivery of a query nudge is logged.",
      descValue: nudgeSentDesc,
      descOnChange: setNudgeSentDesc,
      defaultDesc: "Nudge sent to {Agent Name} at {Agency Name}.",
      descPlaceholder: "e.g., Courteous nudge dispatched to {Agent Name} at {Agency Name}.",
      detailsValue: nudgeSentDetails,
      detailsOnChange: setNudgeSentDetails,
      defaultDetails: "Sent polite followup nudge as response window passed.",
      detailsPlaceholder: "e.g., Expecting reply soon following standard polite nudge.",
      pillShowValue: nudgeSentPillShow,
      pillShowOnChange: setNudgeSentPillShow,
      pillLabelValue: nudgeSentPillLabel,
      pillLabelOnChange: setNudgeSentPillLabel,
      defaultPillLabel: "Nudge sent",
      pillPlaceholder: "e.g., Nudged Agent",
      msShowValue: nudgeSentMsShow,
      msShowOnChange: setNudgeSentMsShow,
      msLabelValue: nudgeSentMsLabel,
      msLabelOnChange: setNudgeSentMsLabel,
      defaultMsLabel: "{Manuscript Title}"
    }
  ];

  // Code Prompt Generator
  const generateAIPrompt = () => {
    let p = `Please update the activity timeline templates inside \`/src/lib/db.tsx\` using my custom messaging style instead of the default values. Let's make sure that both the main description (caption) and details underneath (sub-caption details line) are replaced.

We should configure \`/src/lib/db.tsx\` so that it reads these templates or hardcodes them directly according to my custom specs below. Here are my templates:

`;

    p += `### Part A: Pipeline Query Status Transitions\n`;
    pipelineConfig.forEach(item => {
      const customD = item.descValue.trim();
      const customS = item.detailsValue.trim();
      p += `#### ${item.label}\n`;
      p += `- **Headline Template**: ${customD ? `"${customD}"` : `Default: "${item.defaultDesc}"`}\n`;
      p += `- **Sub-caption Template**: ${customS ? `"${customS}"` : `Default: "${item.defaultDetails}"`}\n`;
      p += `- **Category Tag Pill**: Show: ${item.pillShowValue ? "YES" : "NO"}, Custom Text: "${item.pillLabelValue || item.defaultPillLabel}"\n`;
      p += `- **Bottom Manuscript Pill**: Show: ${item.msShowValue ? "YES" : "NO"}, Custom Text: "${item.msLabelValue || item.defaultMsLabel}"\n\n`;
    });

    p += `### Part B: General Ledger Activity Events\n`;
    generalConfig.forEach(item => {
      const customD = item.descValue.trim();
      const customS = item.detailsValue.trim();
      p += `#### ${item.label}\n`;
      p += `- **Headline Template**: ${customD ? `"${customD}"` : `Default: "${item.defaultDesc}"`}\n`;
      p += `- **Sub-caption Template**: ${customS ? `"${customS}"` : `Default: "${item.defaultDetails}"`}\n`;
      p += `- **Category Tag Pill**: Show: ${item.pillShowValue ? "YES" : "NO"}, Custom Text: "${item.pillLabelValue || item.defaultPillLabel}"\n`;
      p += `- **Bottom Manuscript Pill**: Show: ${item.msShowValue ? "YES" : "NO"}, Custom Text: "${item.msLabelValue || item.defaultMsLabel}"\n\n`;
    });

    p += `Please look inside \`/src/lib/db.tsx\` and implement these string templates for each activity instantiation. 
Ensure to use standard JavaScript template literal strings or variable concatenation to preserve dynamic placeholder values, such as:
- \`{Agent Name}\` → \`agentObj?.name\` or \`agent?.name\`
- \`{Agency Name}\` → \`agentObj?.agency\` or \`agent?.agency\`
- \`{Manuscript Title}\` → \`msTitle\` or \`newMs.title\`
- \`{Response Deadline}\` → \`formattedDeadStr\` or \`dead ? formatHumanDate(dead) : "the expected date"\`
- \`{System Notes}\` → \`systemNotes\` or \`detailsLine\` or \`fields.notes\`

Let's apply these modifications flawlessly, run tests and compile successfully.`;
    return p;
  };

  const handleCopyPrompt = () => {
    const promptText = generateAIPrompt();
    navigator.clipboard.writeText(promptText)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(err => {
        console.error("Failed to copy prompt to clipboard:", err);
      });
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-[#3a1c14]/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-[#FBF9F6] border border-[#EBDCD3]/90 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col md:max-h-[90vh]"
        >
          {/* Header */}
          <div className="bg-[#3a1c14] px-6 py-4 flex items-center justify-between text-left select-none shrink-0">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <div>
                <h3 className="font-serif text-sm font-bold text-[#F8F5F0]">Ledger Language & Sub-captions Customizer</h3>
                <p className="text-[9px] text-stone-300 font-mono tracking-wider uppercase">Tailor your workspace narration</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-1 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {!promptOpened ? (
            /* Main Form View */
            <>
              {/* Category tabs */}
              <div className="border-b border-[#EBDCD3]/50 bg-[#FCFAF7] px-6 py-2 flex gap-4 select-none shrink-0">
                <button
                  onClick={() => setActiveTab("pipeline")}
                  className={`text-[10px] font-mono uppercase tracking-widest font-bold pb-2 pt-2 border-b-2 transition-all cursor-pointer ${
                    activeTab === "pipeline" 
                      ? "border-[#7c3a2a] text-[#7c3a2a]" 
                      : "border-transparent text-stone-400 hover:text-stone-600"
                  }`}
                >
                  Pipeline Status Changes ({pipelineConfig.length})
                </button>
                <button
                  onClick={() => setActiveTab("general")}
                  className={`text-[10px] font-mono uppercase tracking-widest font-bold pb-2 pt-2 border-b-2 transition-all cursor-pointer ${
                    activeTab === "general" 
                      ? "border-[#7c3a2a] text-[#7c3a2a]" 
                      : "border-transparent text-stone-400 hover:text-stone-600"
                  }`}
                >
                  General Ledger Events ({generalConfig.length})
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-5 text-left flex-1 scrollbar-thin">
                <div className="bg-[#FAF1EF] border border-[#F2DDD5] rounded-xl p-4 text-[11px] text-[#3a1c14] leading-relaxed">
                  <p className="font-serif font-bold mb-1 text-stone-800">Dynamic Braced Placeholders Supported</p>
                  Customize either the main event caption or the detail description underneath. Use placeholders such as <code className="bg-white/70 px-1 rounded font-mono font-bold text-[#7c3a2a]">{`{Agent Name}`}</code>, <code className="bg-white/70 px-1 rounded font-mono font-bold text-[#7c3a2a]">{`{Agency Name}`}</code>, <code className="bg-white/70 px-1 rounded font-mono font-bold text-[#7c3a2a]">{`{Manuscript Title}`}</code>, <code className="bg-white/70 px-1 rounded font-mono font-bold text-[#7c3a2a]">{`{Response Deadline}`}</code> or <code className="bg-white/70 px-1 rounded font-mono font-bold text-[#7c3a2a]">{`{System Notes}`}</code> to place information dynamically.
                </div>

                <div className="space-y-4">
                  {(activeTab === "pipeline" ? pipelineConfig : generalConfig).map((item, idx) => {
                    const IconComponent = item.icon;
                    return (
                      <div 
                        key={idx} 
                        className="bg-white border border-[#EBDCD3]/50 p-4 rounded-xl hover:shadow-2xs transition-all flex flex-col gap-3"
                      >
                        {/* Upper Section Info */}
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2 select-none">
                            <span className="p-1.5 rounded-lg bg-stone-100 text-[#7c3a2a] shrink-0">
                              <IconComponent className="w-4 h-4" />
                            </span>
                            <div>
                              <span className="text-xs font-serif font-bold text-[#3a1c14] ml-1">{item.label}</span>
                              <p className="text-[10px] text-stone-400 ml-1">{item.description}</p>
                            </div>
                          </div>
                        </div>

                        {/* Dual Input Section */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-stone-50 pt-3">
                          {/* Heading field */}
                          <div className="space-y-1 text-left">
                            <label className="text-[9px] font-mono uppercase text-[#7c3a2a] font-bold block">
                              Main Headline Style
                            </label>
                            <div className="text-[9px] bg-stone-50 text-stone-400 px-2.5 py-1.5 rounded-md border border-stone-100 italic line-clamp-1 mb-1 shadow-3xs">
                              Default: "{item.defaultDesc}"
                            </div>
                            <input 
                              type="text"
                              value={item.descValue}
                              onChange={(e) => item.descOnChange(e.target.value)}
                              placeholder={item.descPlaceholder}
                              className="w-full text-xs font-sans px-2.5 py-1.5 rounded-lg border border-[#EBDCD3] bg-[#FCFAF7] focus:outline-hidden focus:border-[#7c3a2a] focus:ring-1 focus:ring-[#7c3a2a]/20 transition-all font-medium text-stone-700"
                            />
                          </div>

                          {/* Sub-caption details field */}
                          <div className="space-y-1 text-left">
                            <label className="text-[9px] font-mono uppercase text-[#7c3a2a] font-bold block">
                              Sub-caption Details Beneath
                            </label>
                            <div className="text-[9px] bg-stone-50 text-stone-400 px-2.5 py-1.5 rounded-md border border-stone-100 italic line-clamp-1 mb-1 shadow-3xs">
                              Default: "{item.defaultDetails || "(Empty Line)"}"
                            </div>
                            <input 
                              type="text"
                              value={item.detailsValue}
                              onChange={(e) => item.detailsOnChange(e.target.value)}
                              placeholder={item.detailsPlaceholder}
                              className="w-full text-xs font-sans px-2.5 py-1.5 rounded-lg border border-[#EBDCD3] bg-[#FCFAF7] focus:outline-hidden focus:border-[#7c3a2a] focus:ring-1 focus:ring-[#7c3a2a]/20 transition-all font-medium text-stone-700"
                            />
                          </div>
                        </div>

                        {/* Pill Tag Selection Row */}
                        <div className="border-t border-stone-50 pt-3 mt-1 grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                          {/* Toggle Switch to show pill */}
                          <div className="flex items-center justify-between bg-stone-50/50 p-2.5 rounded-lg border border-stone-100 shadow-3xs">
                            <div className="select-none text-left">
                              <span className="text-[10px] font-mono uppercase text-[#7c3a2a] font-bold block">
                                Category Tag Pill
                              </span>
                              <span className="text-[9px] text-stone-400 font-sans block mt-0.5">
                                Toggle if pill should appear in timeline
                              </span>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer select-none">
                              <input 
                                type="checkbox" 
                                checked={item.pillShowValue} 
                                onChange={(e) => item.pillShowOnChange(e.target.checked)}
                                className="sr-only peer" 
                              />
                              <div className="w-8 h-4.5 bg-stone-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-[#7c3a2a]"></div>
                            </label>
                          </div>

                          {/* Pill Custom Text Label Input */}
                          {item.pillShowValue ? (
                            <div className="space-y-1 text-left">
                              <label className="text-[9px] font-mono uppercase text-[#7c3a2a] font-bold block">
                                Custom Pill Text
                              </label>
                              <div className="text-[9px] bg-stone-50 text-stone-400 px-2.5 py-1 rounded-md border border-stone-100 italic line-clamp-1 mb-1 shadow-3xs">
                                Default: "{item.defaultPillLabel}"
                              </div>
                              <input 
                                type="text"
                                value={item.pillLabelValue}
                                onChange={(e) => item.pillLabelOnChange(e.target.value)}
                                placeholder={item.pillPlaceholder}
                                className="w-full text-xs font-sans px-2.5 py-1.5 rounded-lg border border-[#EBDCD3] bg-[#FCFAF7] focus:outline-hidden focus:border-[#7c3a2a] focus:ring-1 focus:ring-[#7c3a2a]/20 transition-all font-medium text-stone-700"
                              />
                            </div>
                          ) : (
                            <div className="flex items-center justify-start bg-amber-50/40 p-2.5 rounded-lg border border-amber-100 text-stone-500 font-sans text-[10px]">
                              <span>Pill tag hidden for this timeline item.</span>
                            </div>
                          )}
                        </div>

                        {/* Manuscript Name Pill Selection Row */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left border-t border-stone-50/50 pt-3">
                          {/* Toggle Switch to show manuscript name pill */}
                          <div className="flex items-center justify-between bg-stone-50/50 p-2.5 rounded-lg border border-stone-100 shadow-3xs w-full">
                            <div className="select-none text-left">
                              <span className="text-[10px] font-mono uppercase text-[#7c3a2a] font-bold block">
                                Bottom Manuscript Name Pill
                              </span>
                              <span className="text-[9px] text-stone-400 font-sans block mt-0.5">
                                Toggle if manuscript project tag appears at bottom
                              </span>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer select-none">
                              <input 
                                type="checkbox" 
                                checked={item.msShowValue} 
                                onChange={(e) => item.msShowOnChange(e.target.checked)}
                                className="sr-only peer" 
                              />
                              <div className="w-8 h-4.5 bg-stone-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-[#7c3a2a]"></div>
                            </label>
                          </div>
                          
                          {item.msShowValue ? (
                            <div className="space-y-1 text-left">
                              <label className="text-[9px] font-mono uppercase text-[#7c3a2a] font-bold block">
                                Custom Bottom Pill Text
                              </label>
                              <div className="text-[9px] bg-stone-50 text-stone-400 px-2.5 py-1 rounded-md border border-stone-100 italic line-clamp-1 mb-1 shadow-3xs">
                                Default: "{item.defaultMsLabel || "{Manuscript Title}"}"
                              </div>
                              <input 
                                type="text"
                                value={item.msLabelValue}
                                onChange={(e) => item.msLabelOnChange(e.target.value)}
                                placeholder="e.g., Manuscript: **{Manuscript Title}**"
                                className="w-full text-xs font-sans px-2.5 py-1.5 rounded-lg border border-[#EBDCD3] bg-[#FCFAF7] focus:outline-hidden focus:border-[#7c3a2a] focus:ring-1 focus:ring-[#7c3a2a]/20 transition-all font-medium text-stone-700"
                              />
                              <span className="block text-[8px] text-stone-400 font-sans leading-tight mt-0.5">
                                Supports **bold**, *italics*, and <code className="bg-stone-100 px-0.5 rounded text-[#7c3a2a]font-mono font-bold">{`{Manuscript Title}`}</code>
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center justify-start bg-stone-50/40 p-2.5 rounded-lg border border-stone-100/50 text-stone-500 font-sans text-[10px]">
                              <span>Manuscript Name pill is disabled for this timeline item.</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Bottom Actions Row */}
              <div className="bg-[#FAF1EF]/40 px-6 py-4.5 border-t border-[#EBDCD3]/50 flex items-center justify-between shrink-0 select-none">
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-xs text-stone-400 hover:text-stone-600 transition-colors font-semibold"
                >
                  Reset all custom copy
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="text-xs border border-[#EBDCD3] px-3.5 py-2 rounded-xl text-stone-600 hover:bg-stone-50 transition-all cursor-pointer font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => setPromptOpened(true)}
                    className="text-xs bg-[#7c3a2a] hover:bg-[#642d22] text-white px-4 py-2 rounded-xl flex items-center gap-1.5 transition-all shadow-sm font-semibold cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Configure Prompters
                  </button>
                </div>
              </div>
            </>
          ) : (
            /* Prompt Copier Overlay View */
            <div className="p-6 space-y-5 text-left flex-1 flex flex-col justify-between overflow-y-auto">
              <div>
                <span className="text-[9px] font-mono tracking-widest font-bold text-[#BA7517] uppercase bg-amber-50 border border-amber-200/50 rounded-full px-2.5 py-1 select-none">
                  Instruction Pipeline Manifest Compiled
                </span>
                <h4 className="font-serif font-bold text-[#3a1c14] text-base mt-2">Transmit specifications to the AI Coding Agent</h4>
                <p className="text-[11px] text-stone-500 leading-relaxed mt-1.5">
                  Your customized styles are now encapsulated in the command script below. Copy this instruction block and send it over so I can automatically update your timeline messaging and details captions!
                </p>

                <div className="mt-4 relative bg-stone-900 rounded-xl p-4 overflow-hidden border border-stone-800">
                  <div className="absolute top-2.5 right-2.5 flex items-center gap-1">
                    <span className="text-[8.5px] font-mono text-stone-500 select-none mr-1 bg-stone-800 px-1.5 py-0.5 rounded uppercase font-bold">ledger-copy-directive</span>
                    <button
                      onClick={handleCopyPrompt}
                      className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white transition-all cursor-pointer"
                      title="Copy to clipboard"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <textarea
                    readOnly
                    value={generateAIPrompt()}
                    className="w-full h-48 bg-transparent text-stone-300 font-mono text-[9px] leading-relaxed resize-none focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-3 border-t border-[#EBDCD3]/40 items-center justify-between shrink-0 select-none">
                <p className="text-[10px] text-stone-400 font-sans text-center sm:text-left">
                  {copied ? "✓ Prompt compiled & copied to clipboard!" : "Select Copy Prompt below to secure contents."}
                </p>
                <div className="flex gap-2 w-full sm:w-auto shrink-0 justify-end">
                  <button
                    type="button"
                    onClick={() => setPromptOpened(false)}
                    className="text-xs border border-[#EBDCD3] px-3.5 py-2 rounded-xl text-stone-600 hover:bg-stone-50 transition-all cursor-pointer font-medium w-full sm:w-auto"
                  >
                    Back to edit
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyPrompt}
                    className="text-xs bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-sm font-semibold cursor-pointer w-full sm:w-auto"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        Copy Prompt
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
