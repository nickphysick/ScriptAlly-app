import React, { useState } from "react";
import { 
  BookOpen, 
  Search, 
  Compass, 
  Layers, 
  HelpCircle, 
  Clock, 
  FileText, 
  UploadCloud,
  ChevronRight, 
  CheckCircle2, 
  AlertCircle,
  TrendingUp,
  Mail,
  ArrowRight,
  Info,
  ExternalLink
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface FAQItem {
  id: string;
  category: "all" | "dashboard" | "queries" | "agents" | "manuscripts" | "migration";
  question: string;
  answer: string | React.ReactNode;
  tags: string[];
}

export function HelpCentre() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<"all" | "dashboard" | "queries" | "agents" | "manuscripts" | "migration">("all");
  const [expandedFaqId, setExpandedFaqId] = useState<string | null>(null);

  const categories = [
    { id: "all", label: "All Topics", icon: BookOpen, count: 12 },
    { id: "dashboard", label: "Dashboard & Fortnight", icon: Clock, count: 3 },
    { id: "queries", label: "Query Pipeline", icon: Layers, count: 3 },
    { id: "agents", label: "Agent Discovery", icon: Compass, count: 2 },
    { id: "manuscripts", label: "Manuscript Packages", icon: FileText, count: 2 },
    { id: "migration", label: "CSV Migration", icon: UploadCloud, count: 2 },
  ] as const;

  const faqs: FAQItem[] = [
    {
      id: "dash-1",
      category: "dashboard",
      question: "What is the 'Fortnight in Focus' view, and how do I read it?",
      answer: (
        <div className="space-y-3">
          <p>
            The <strong>Fortnight in Focus</strong> is a dynamic, high-fidelity visual map. It aggregates and charts crucial submission milestones 
            across a rolling 14-day window centered around today.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/60 text-xs">
              <span className="font-bold text-[#7c3d3d] flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#7c3d3d]" /> Past Events / Deadlines
              </span>
              <p className="text-stone-600 mt-1">
                Completed steps or overdue items appear on your left with a solid left accent border, alerting you immediately to queries needing your focus.
              </p>
            </div>
            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/60 text-xs">
              <span className="font-bold text-[#a08070] flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#dbbdb5] border-dashed border" /> Upcoming Events
              </span>
              <p className="text-stone-600 mt-1">
                Upcoming deadlines, expected response dates, or follow-ups appear on the right with a soft dotted border to signal what is on the horizon.
              </p>
            </div>
          </div>
        </div>
      ),
      tags: ["dashboard", "fortnight", "timeline", "deadlines"],
    },
    {
      id: "dash-2",
      category: "dashboard",
      question: "How do overdue items work, and what determines urgent actions?",
      answer: "Overdue tasks automatically trigger a crimson warning stripe on your timeline. For instance, if an agent had set a deadline to receive your requested partial manuscript and it passes without a logged response, the system displays a '!' exclamation mark instead of a status circle, guiding you to follow up or log the submission to restore order.",
      tags: ["overdue", "alerts", "calendar", "timeline"],
    },
    {
      id: "dash-3",
      category: "dashboard",
      question: "What does the 'Final day of response window' status indicate?",
      answer: "Based on each individual literary agent's typical or advertised response windows (e.g., 4 weeks, 6 weeks, or 8 weeks), ScriptCore projects a response date. As that deadline lands in your active fortnight, the system flags it as the 'final day of the response window' and shows an inline action prompt suggestion to consider sending a polite 'nudge' email.",
      tags: ["nudge", "expected", "agent-response"],
    },
    {
      id: "queries-1",
      category: "queries",
      question: "How do I change a query's status (e.g. from 'Queried' to 'Partial Requested')?",
      answer: "Go to your Queries pipeline view, locate the query card, and select 'Update Status'. Logging partial and full manuscript requests triggers a specialized state that prompts you to upload corresponding notes or document specific materials (synopsis, query variant, chapters) sent to that particular agent.",
      tags: ["status", "partial", "full", "update"],
    },
    {
      id: "queries-2",
      category: "queries",
      question: "What is a 'Nudge reminder' and when should I send one?",
      answer: "A nudge reminder is triggered once the agent's expected response window has officially completed. The agent moves from 'Response expected' to 'Overdue' or 'Nudge window open'. Navigate to the Agent details or the specific Query Card to generate a customized, polite nudge email using your tailored presets.",
      tags: ["queries", "nudge", "follow-up"],
    },
    {
      id: "queries-3",
      category: "queries",
      question: "Can I track multiple manuscript submissions at once?",
      answer: "Absolutely. In the Manuscripts tab, you can view all active projects. Individual queries link back to a specific manuscript version. This is critical for authors with multiple novels in the pipeline or those submitting revised & resubmitted (R&R) drafts.",
      tags: ["manuscript", "submissions", "projects"],
    },
    {
      id: "agents-1",
      category: "agents",
      question: "How does ScriptAlly suggest agents who might suit a manuscript?",
      answer: "Open any manuscript from the Manuscripts tab and look for 'Agents who might suit this manuscript'. ScriptAlly scores verified agents from the community catalogue against that manuscript's genre and wish-list (MSWL) fit, shows the closest few ranked by fit, and lets you add any of them to your own agent list in one click. Matching uses genre and wish list for now — response-time data will follow.",
      tags: ["suggestions", "agents", "mswl", "match"],
    },
    {
      id: "agents-2",
      category: "agents",
      question: "How do I add a private literary agent not in the database?",
      answer: "Simply click 'Add an Agent' in the navigation bar. You can enter customized response windows, submission email addresses, agency websites, and personal interaction notes. This custom profile becomes instantly queryable in your personal workspace.",
      tags: ["add-agent", "custom-agent", "agency"],
    },
    {
      id: "manuscripts-1",
      category: "manuscripts",
      question: "How do I manage different files and packages for a single novel?",
      answer: "Under the 'Submission Packages' section inside the Manuscripts tab, you can organize a project's query letters, brief elevator pitches, synopses (both 1-page and 5-page variants), and manuscript files. When sending a query, you can specify exactly which package variant was delivered for clear reference later.",
      tags: ["manuscripts", "files", "materials", "package"],
    },
    {
      id: "manuscripts-2",
      category: "manuscripts",
      question: "What are 'Query Letter Variants' and why use them?",
      answer: "A single novel might appeal to different agents for different reasons. ScriptAlly lets you draft custom variations of your query letter—such as focusing on the romance aspect for a character-driven agent, or highlighting high-concept thriller elements for a plot-oriented agent. Associating these with individual queries lets you find your highest-performing hook.",
      tags: ["manuscripts", "query-letter", "variants"],
    },
    {
      id: "migration-1",
      category: "migration",
      question: "What is the 'Migration Desk' and how does it support CSV uploads?",
      answer: "If you are transitioning from another spreadsheet or tracking tool like QueryTracker, the CSV Migration Desk allows you to upload existing logs. It maps headers like 'Agent Name', 'Manuscript Title', 'Date Sent', and 'Agency' into your ScriptAlly Firestore database to let you hit the ground running without entering historical data manually.",
      tags: ["csv", "import", "migration", "querytracker"],
    },
    {
      id: "migration-2",
      category: "migration",
      question: "How do I troubleshoot unmapped columns during a CSV import?",
      answer: "ScriptAlly features an interactive column-mapper interface. If a column is named differently (e.g., 'Submission Date' vs 'Date Sent'), you can drag and drop headers to reconcile the differences. Always confirm that Dates are in an recognizable format (e.g. YYYY-MM-DD or MM/DD/YYYY) for seamless timeline generation.",
      tags: ["csv", "mapping", "import", "troubleshooting"],
    }
  ];

  const filteredFaqs = faqs.filter(faq => {
    const matchesCategory = selectedCategory === "all" || faq.category === selectedCategory;
    const matchesSearch = faq.question.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (typeof faq.answer === 'string' && faq.answer.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          faq.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const toggleFaq = (id: string) => {
    setExpandedFaqId(expandedFaqId === id ? null : id);
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-8 md:py-12 animate-fade-in font-sans" id="help-centre-page">
      {/* Header section with brand-aligned aesthetic styling */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#FAF1EF] border border-[#7c3a2a]/15 text-[#7c3a2a] rounded-full text-[10px] font-bold tracking-wider uppercase mb-3">
          <HelpCircle className="w-3.5 h-3.5 stroke-[2.5]" />
          Knowledge Resource
        </div>
        <h1 className="font-serif text-3.5xl md:text-4xl text-[#3a1c14] font-semibold tracking-tight leading-none mb-3">
          ScriptAlly Help Centre
        </h1>
        <p className="text-[#a08070] text-sm max-w-2xl mx-auto font-light leading-relaxed">
          Welcome to your querying command centre manual. Discover expert tips and tools for tracking submissions, 
          discovering literary representation, and moving closer to publication.
        </p>
      </div>

      {/* Styled search engine bar */}
      <div className="relative max-w-xl mx-auto mb-10">
        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-stone-400">
          <Search className="w-5 h-5" />
        </div>
        <input
          type="text"
          placeholder="Search topics, status labels, nudge rules..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-11 pr-5 py-3.5 bg-white border border-[#EBDCD3] rounded-2xl shadow-[0_3px_10px_rgba(58,28,20,0.03)] focus:border-[#7c3a2a] focus:ring-1 focus:ring-[#7c3a2a] focus:outline-none transition-all text-xs font-medium placeholder-stone-400 text-[#3a1c14]"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-[#c9a89e] hover:text-[#7c3a2a] transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* Categories Horizontal Selector Grid */}
      <div className="flex overflow-x-auto gap-2 pb-4 mb-8 -mx-4 px-4 scrollbar-hide">
        {categories.map((cat) => {
          const IconComponent = cat.icon;
          const isActive = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => {
                setSelectedCategory(cat.id);
                setExpandedFaqId(null);
              }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-[11px] font-bold tracking-tight whitespace-nowrap transition-all cursor-pointer shadow-3xs hover:scale-[1.02] active:scale-[0.98] ${
                isActive
                  ? "bg-[#7c3a2a] border-[#7c3a2a] text-white"
                  : "bg-white border-[#EBDCD3] text-stone-600 hover:text-[#7c3a2a] hover:border-[#7c3a2a]/30"
              }`}
            >
              <IconComponent className={`w-4 h-4 ${isActive ? 'text-white' : 'text-stone-500'}`} />
              <span>{cat.label}</span>
              <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-mono ${
                isActive ? "bg-white/20 text-white" : "bg-stone-100 text-stone-500"
              }`}>
                {cat.count === 12 ? faqs.length : faqs.filter(f => f.category === cat.id).length}
              </span>
            </button>
          );
        })}
      </div>

      {/* Main Content Layout Block: Q&A on left, Quick Sidebar Stats on right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* FAQ list */}
        <div className="lg:col-span-2 space-y-3.5 order-2 lg:order-1">
          <div className="flex items-center justify-between px-1 mb-2">
            <h3 className="font-serif text-[15px] font-semibold text-[#3a1c14]">
              {categories.find(c => c.id === selectedCategory)?.label} FAQ
            </h3>
            <span className="text-[10px] font-mono font-bold text-stone-400">
              Showing {filteredFaqs.length} item{filteredFaqs.length !== 1 ? 's' : ''}
            </span>
          </div>

          {filteredFaqs.length === 0 ? (
            <div className="p-10 text-center bg-white border border-[#EBDCD3]/50 rounded-2xl flex flex-col items-center justify-center">
              <Info className="w-8 h-8 text-[#c9a89e] mb-3" />
              <p className="font-serif text-sm text-[#3a1c14] font-medium">No resources found</p>
              <p className="text-stone-400 text-xs mt-1">Try searching with a different term or picking another filter.</p>
              <button
                onClick={() => { setSearchQuery(""); setSelectedCategory("all"); }}
                className="mt-4 px-4 py-2 bg-[#FAF1EF] border border-[#7c3a2a]/15 text-[#7c3a2a] rounded-lg text-xs font-bold hover:bg-[#7c3a2a] hover:text-white transition-all cursor-pointer"
              >
                Reset Search Filters
              </button>
            </div>
          ) : (
            filteredFaqs.map((faq) => {
              const isExpanded = expandedFaqId === faq.id;
              return (
                <div 
                  key={faq.id}
                  className={`bg-white rounded-2xl border transition-all duration-200 overflow-hidden ${
                    isExpanded 
                      ? "border-[#7c3a2a]/30 shadow-[0_4px_16px_rgba(124,58,42,0.03)]" 
                      : "border-[#EBDCD3]/50 hover:border-[#7c3a2a]/20 shadow-3xs"
                  }`}
                >
                  <button
                    onClick={() => toggleFaq(faq.id)}
                    className="w-full px-5 py-4 flex items-center justify-between text-left gap-4 cursor-pointer focus:outline-none"
                  >
                    <span className="font-serif text-[13px] md:text-[14px] font-medium text-[#3a1c14] hover:text-[#7c3a2a] transition-colors leading-tight">
                      {faq.question}
                    </span>
                    <span className={`w-5 h-5 flex items-center justify-center rounded-full bg-stone-50 text-[#3a1c14] transition-all transform shrink-0 ${
                      isExpanded ? "rotate-90 bg-[#FAF1EF] text-[#7c3a2a]" : ""
                    }`}>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </button>

                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="px-5 pb-5 pt-1 text-xs text-stone-600 border-t border-[#EBDCD3]/30 bg-[#FCFAF7]/40 leading-relaxed font-light">
                          {faq.answer}
                          <div className="flex flex-wrap gap-1.5 mt-4 pt-3 border-t border-[#EBDCD3]/20">
                            {faq.tags.map((tag) => (
                              <span 
                                key={tag} 
                                onClick={() => setSearchQuery(tag)}
                                className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-stone-100 text-stone-500 hover:text-[#7c3a2a] hover:bg-[#FAF1EF] cursor-pointer transition-colors"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })
          )}
        </div>

        {/* Brand-aligned Side panel with useful links and submission statistics guidelines */}
        <div className="space-y-6 order-1 lg:order-2">
          {/* Quick Guide card */}
          <div className="bg-[#FCFAF7] border border-[#EBDCD3] rounded-3xl p-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-[#7c3a2a]/5 rounded-full -translate-y-8 translate-x-8 blur-xl pointer-events-none" />
            <h4 className="font-serif text-[14px] font-semibold text-[#3a1c14] mb-3 flex items-center gap-2">
              <TrendingUp className="w-4.5 h-4.5 text-[#7c3a2a]" />
              Querier's Cheat Sheet
            </h4>
            <ul className="space-y-3.5 text-xs text-stone-600 font-light leading-snug">
              <li className="flex gap-2.5 items-start">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-medium text-[#3a1c14]">Pristine Statuses:</strong> Always update statuses promptly. Logging details ensures your timeline and dashboard accurately alert you when follow-up windows open.
                </div>
              </li>
              <li className="flex gap-2.5 items-start">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-medium text-[#3a1c14]">The Art of the Nudge:</strong> Avoid nudging before the 6-8 week window has completed, unless a tier-1 agent has specifically requested partial or full manuscript folders with shorter periods.
                </div>
              </li>
              <li className="flex gap-2.5 items-start">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-medium text-[#3a1c14]">Polished Packages:</strong> Keep elevator pitches and query letters paired per agent inside Manuscripts to maintain a tailored submissions footprint.
                </div>
              </li>
            </ul>
          </div>

          {/* Quick Status Pill Glossary Decoders */}
          <div className="bg-white border border-[#EBDCD3]/60 rounded-3xl p-5">
            <h4 className="font-serif text-[14px] font-semibold text-[#3a1c14] mb-3.5 flex items-center gap-2">
              <AlertCircle className="w-4.5 h-4.5 text-[#7c3a2a]" />
              Status & Overdue Guide
            </h4>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between p-2 rounded-xl bg-[#FDFAF8] border border-dashed border-[#c9a89e]/80 text-[10px] font-bold text-[#c9a89e]">
                <span>Planned Follow-ups</span>
                <span className="font-mono text-[9px] uppercase px-1.5 py-0.5 rounded bg-white text-stone-500">Dotted border</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-[#FFFAF8] border-l-2 border-r-0 border-y-0 border-[#7c3d3d] text-[10px] font-bold text-[#7c3d3d]">
                <span>Overdue submissions</span>
                <span className="font-mono text-[9px] uppercase px-1.5 py-0.5 rounded bg-white text-stone-500">Left crimson bar</span>
              </div>
            </div>
          </div>

          {/* Customer support or further assistance card */}
          <div className="bg-[#7c3a2a] text-[#F8F5F0] rounded-3xl p-5 relative overflow-hidden shadow-md">
            <div className="absolute -bottom-10 -left-10 w-28 h-28 bg-[#dbbdb5]/10 rounded-full blur-xl pointer-events-none" />
            <h4 className="font-serif text-[14px] font-semibold text-white mb-2 flex items-center gap-2">
              <Mail className="w-4.5 h-4.5 text-[#dbbdb5]" />
              Further Enquiries?
            </h4>
            <p className="text-[11px] text-[#dbbdb5] font-light leading-relaxed mb-4">
              Can't find documentation for your exact workflow or looking to suggest an agent database expansion? Pitch our design team.
            </p>
            <a 
              href="mailto:support@scriptally.com"
              className="inline-flex items-center gap-1.5 bg-white text-[#7c3a2a] hover:bg-[#FAF1EF] text-[10px] font-bold px-3.5 py-2 rounded-xl transition-all shadow-sm active:scale-95"
            >
              Contact Support
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
