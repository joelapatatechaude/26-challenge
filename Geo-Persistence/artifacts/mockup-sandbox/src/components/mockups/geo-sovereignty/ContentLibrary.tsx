import React, { useState, useRef, useEffect } from "react";
import { AppLayout } from "./_shared/AppLayout";
import "./_shared/_group.css";
import {
  FileText, Link2, Upload, Plus, Search, Sparkles, BookOpen,
  MessageSquare, ChevronRight, Mic, ListChecks, AlignLeft,
  HelpCircle, Loader2, Send, X, Globe, FileBadge, ChevronDown,
  RefreshCcw, Pin, Trash2, MoreHorizontal, FileCheck2
} from "lucide-react";
import { streamPptChat } from "@workspace/api-client-react";

type Source = {
  id: string;
  name: string;
  type: "pdf" | "url" | "doc" | "slide";
  region: string;
  size: string;
  pinned?: boolean;
};

type NoteCard = {
  id: string;
  title: string;
  body: string;
  type: "summary" | "guide" | "faq" | "brief" | "outline";
};

type Message = {
  role: "user" | "ai";
  text: string;
};

const SOURCES: Source[] = [
  { id: "s1", name: "Red Hat Digital Sovereignty — Global Messaging Guide", type: "pdf", region: "Global", size: "2.4 MB", pinned: true },
  { id: "s2", name: "EMEA Sales Play — Sovereign Cloud 2025", type: "slide", region: "EMEA", size: "8.1 MB", pinned: true },
  { id: "s3", name: "EU Data Act — Compliance Impact for OpenShift", type: "pdf", region: "EMEA", size: "1.1 MB" },
  { id: "s4", name: "German DSGVO Field Guide for Red Hat Partners", type: "doc", region: "EMEA/DE", size: "540 KB" },
  { id: "s5", name: "NIS2 Directive — Executive Summary", type: "pdf", region: "EMEA", size: "780 KB" },
  { id: "s6", name: "APAC Data Residency Sales Play 2025", type: "slide", region: "APAC", size: "6.3 MB" },
  { id: "s7", name: "Competitive Brief — VMware vs OpenShift (Sovereign Cloud)", type: "pdf", region: "Global", size: "1.9 MB" },
  { id: "s8", name: "France Cloud de Confiance — Customer FAQ", type: "doc", region: "EMEA/FR", size: "310 KB" },
  { id: "s9", name: "OpenShift Platform Plus — Product Datasheet 2025", type: "pdf", region: "Global", size: "1.3 MB", pinned: true },
  { id: "s10", name: "Red Hat Enterprise Linux 10 — What's New", type: "pdf", region: "Global", size: "890 KB" },
  { id: "s11", name: "Ansible Automation Platform — Sovereign Use Cases", type: "slide", region: "Global", size: "4.2 MB" },
  { id: "s12", name: "Advanced Cluster Management — Multi-Cloud Overview", type: "pdf", region: "Global", size: "1.6 MB" },
  { id: "s13", name: "ROSA (Red Hat OpenShift on AWS) — Field Guide", type: "doc", region: "Global", size: "720 KB" },
  { id: "s14", name: "OpenShift AI — MLOps for Sovereign Environments", type: "pdf", region: "EMEA", size: "2.1 MB" },
];

const NOTE_CARDS: NoteCard[] = [
  {
    id: "n1",
    type: "summary",
    title: "Executive Summary",
    body: "Red Hat's Digital Sovereignty portfolio centers on three pillars: data residency (OpenShift on sovereign infrastructure), operational independence (disconnected/air-gapped deployments), and regulatory compliance (GDPR, NIS2, DSGVO, EU Data Act). Key differentiators vs. hyperscalers: open-source auditability, no vendor lock-in, and certified sovereign cloud partnerships across EMEA.",
  },
  {
    id: "n2",
    type: "guide",
    title: "Field Study Guide",
    body: "**Key talking points:** (1) Data never leaves customer jurisdiction. (2) OpenShift supports air-gapped & disconnected installations. (3) Certified partners: T-Systems OTC, OVHcloud, Outscale. (4) EU Data Act compliance roadmap included. **Common objections:** 'We use hyperscaler sovereign zones' → Address: contractual guarantees vs. technical isolation.",
  },
  {
    id: "n3",
    type: "faq",
    title: "Customer FAQ",
    body: "**Q: Does Red Hat store any customer data?** A: No — OpenShift is deployed within the customer's own sovereign infrastructure. **Q: Is OpenShift certified for DSGVO?** A: Yes — BSI C5 attestation available for German public sector. **Q: Can we get a sovereign cloud deployment with an EU-based partner?** A: Yes — T-Systems OTC, OVHcloud SecNumCloud, and Ionos are certified partners.",
  },
  {
    id: "n4",
    type: "brief",
    title: "Competitive Briefing",
    body: "VMware (Broadcom): Post-acquisition pricing concerns create displacement opportunity. Azure/AWS Sovereign: Contractual promises only — data still processed on hyperscaler infrastructure. Google Sovereign: Limited EMEA partner availability. **Red Hat edge:** full open-source stack, customer-controlled encryption keys, certified on-prem sovereign cloud partners with legal guarantees.",
  },
];

const SUGGESTIONS = [
  "How does OpenShift Platform Plus address EU data sovereignty requirements?",
  "Compare RHEL 10 vs RHEL 9 for air-gapped sovereign deployments",
  "What role does Ansible Automation Platform play in NIS2 compliance?",
  "How does OpenShift AI support MLOps in sovereign cloud environments?",
  "Generate a 3-slide outline for a Deutsche Telekom sovereign cloud pitch",
  "What competitive objections should I expect from a VMware customer?",
  "Which Red Hat partners are certified for French Cloud de Confiance?",
];

const RH_PRODUCTS = [
  { name: "OpenShift", color: "#EE0000" },
  { name: "RHEL", color: "#CC0000" },
  { name: "Ansible", color: "#0066CC" },
  { name: "ACM", color: "#3E8635" },
  { name: "ROSA", color: "#EC7A08" },
  { name: "OpenShift AI", color: "#7B4FC1" },
  { name: "Quay", color: "#0066CC" },
  { name: "Satellite", color: "#3E8635" },
];

const typeIcon = (type: Source["type"]) => {
  if (type === "pdf") return <FileBadge className="w-3.5 h-3.5 text-[var(--rh-red)]" />;
  if (type === "slide") return <FileCheck2 className="w-3.5 h-3.5 text-[var(--rh-orange)]" />;
  if (type === "doc") return <FileText className="w-3.5 h-3.5 text-[var(--rh-blue)]" />;
  return <Link2 className="w-3.5 h-3.5 text-[var(--rh-silver)]" />;
};

const noteTypeIcon = (type: NoteCard["type"]) => {
  if (type === "summary") return <AlignLeft className="w-3.5 h-3.5 text-[var(--rh-blue)]" />;
  if (type === "guide") return <BookOpen className="w-3.5 h-3.5 text-[var(--rh-green)]" />;
  if (type === "faq") return <HelpCircle className="w-3.5 h-3.5 text-[var(--rh-orange)]" />;
  if (type === "brief") return <ListChecks className="w-3.5 h-3.5 text-[var(--rh-red)]" />;
  return <AlignLeft className="w-3.5 h-3.5 text-[var(--rh-silver)]" />;
};

const noteTypeBadge: Record<NoteCard["type"], string> = {
  summary: "bg-[#0066CC]/20 text-[#5599dd]",
  guide: "bg-[#3E8635]/20 text-[#6bbf62]",
  faq: "bg-[#EC7A08]/20 text-[#f0a050]",
  brief: "bg-[var(--rh-red)]/20 text-[#ff6666]",
  outline: "bg-[var(--rh-silver)]/10 text-[var(--rh-silver)]",
};

const noteTypeLabel: Record<NoteCard["type"], string> = {
  summary: "Summary",
  guide: "Study Guide",
  faq: "FAQ",
  brief: "Briefing Doc",
  outline: "Outline",
};

export function ContentLibrary() {
  const [selectedSources, setSelectedSources] = useState<Set<string>>(new Set(["s1", "s2", "s3"]));
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "ai",
      text: "Hi Sarah — I'm grounded in your 14 sources and have full knowledge of the Red Hat product portfolio: **OpenShift**, **RHEL**, **Ansible Automation Platform**, **Advanced Cluster Management**, **ROSA**, **OpenShift AI**, **Quay**, and **Satellite**. Ask me how any product maps to a sovereignty requirement, compliance mandate, or customer scenario — or ask me to generate pitch content, objection handlers, or study guides.",
    },
  ]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [activeNote, setActiveNote] = useState<NoteCard | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generatingType, setGeneratingType] = useState<string>("");
  const [notes, setNotes] = useState<NoteCard[]>(NOTE_CARDS);
  const [searchQ, setSearchQ] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);
  const sessionIdRef = useRef<string | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  const toggleSource = (id: string) => {
    setSelectedSources(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const filteredSources = SOURCES.filter(s =>
    s.name.toLowerCase().includes(searchQ.toLowerCase()) ||
    s.region.toLowerCase().includes(searchQ.toLowerCase())
  );

  const handleSend = async (text?: string) => {
    const msg = text ?? input.trim();
    if (!msg || thinking) return;
    setMessages(prev => [...prev, { role: "user", text: msg }]);
    setInput("");
    setThinking(true);
    // Add empty AI message that will be filled as tokens stream in
    setMessages(prev => [...prev, { role: "ai", text: "" }]);
    let accumulated = "";
    try {
      for await (const chunk of streamPptChat(msg, {
        sessionId: sessionIdRef.current,
      })) {
        if (chunk.type === "session") {
          sessionIdRef.current = chunk.content;
        } else if (chunk.type === "text" || chunk.type === "tool") {
          if (thinking) setThinking(false);
          accumulated += chunk.content;
          setMessages(prev => {
            const next = [...prev];
            next[next.length - 1] = { role: "ai", text: accumulated };
            return next;
          });
        } else if (chunk.type === "error") {
          setMessages(prev => {
            const next = [...prev];
            next[next.length - 1] = { role: "ai", text: `Sorry, something went wrong: ${chunk.content}` };
            return next;
          });
        }
      }
    } catch {
      setMessages(prev => {
        const next = [...prev];
        next[next.length - 1] = { role: "ai", text: "Could not reach the agent. Please check your connection and try again." };
        return next;
      });
    } finally {
      setThinking(false);
    }
  };

  const handleGenerateNote = (type: NoteCard["type"], label: string) => {
    setGenerating(true);
    setGeneratingType(label);
    setTimeout(() => {
      setGenerating(false);
      setGeneratingType("");
      const newNote: NoteCard = {
        id: "n" + Date.now(),
        type,
        title: label + " — EMEA Territory",
        body: "AI-generated from " + selectedSources.size + " selected sources. This " + label.toLowerCase() + " synthesizes key insights across your EMEA enablement materials, including EU Data Act implications, NIS2 compliance requirements, and sovereign cloud partner landscape. Content has been tailored to Western Europe territory context and is pending SME review before field use.",
      };
      setNotes(prev => [newNote, ...prev]);
      setActiveNote(newNote);
    }, 2000);
  };

  return (
    <AppLayout activePath="/content">
      <div className="flex h-full overflow-hidden">

        {/* LEFT — Sources Panel */}
        <aside className="w-64 shrink-0 border-r border-[var(--rh-charcoal-light)] flex flex-col bg-[var(--rh-charcoal-mid)]">
          <div className="px-4 pt-4 pb-3 border-b border-[var(--rh-charcoal-light)]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold text-[var(--rh-silver)] uppercase tracking-wider">Sources</span>
              <span className="text-[10px] text-[var(--rh-silver)] bg-[var(--rh-charcoal-light)] px-2 py-0.5 rounded-full">{selectedSources.size}/{SOURCES.length}</span>
            </div>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--rh-silver)]" />
              <input
                value={searchQ}
                onChange={e => setSearchQ(e.target.value)}
                placeholder="Filter sources..."
                className="w-full bg-[var(--rh-charcoal)] border border-[var(--rh-charcoal-light)] rounded pl-7 pr-3 py-1.5 text-xs focus:outline-none focus:border-[var(--rh-red)] text-white placeholder:text-[var(--rh-silver)]/50 transition-colors"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto py-2 px-2">
            {filteredSources.map(s => (
              <button
                key={s.id}
                onClick={() => toggleSource(s.id)}
                className={`w-full text-left flex items-start gap-2.5 px-2 py-2.5 rounded-md mb-1 transition-all group ${
                  selectedSources.has(s.id)
                    ? "bg-[var(--rh-charcoal-light)] text-white"
                    : "text-[var(--rh-silver)] hover:bg-[var(--rh-charcoal-light)]/50"
                }`}
              >
                <div className={`w-4 h-4 mt-0.5 rounded border flex items-center justify-center shrink-0 transition-all ${
                  selectedSources.has(s.id)
                    ? "bg-[var(--rh-red)] border-[var(--rh-red)]"
                    : "border-[var(--rh-charcoal-light)]"
                }`}>
                  {selectedSources.has(s.id) && <div className="w-2 h-2 bg-white rounded-sm" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1 mb-0.5">
                    {typeIcon(s.type)}
                    {s.pinned && <Pin className="w-2.5 h-2.5 text-[var(--rh-orange)]" />}
                  </div>
                  <p className="text-[11px] leading-tight line-clamp-2 font-medium">{s.name}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-[9px] text-[var(--rh-silver)]/70 bg-[var(--rh-charcoal)] px-1.5 py-0.5 rounded">{s.region}</span>
                    <span className="text-[9px] text-[var(--rh-silver)]/50">{s.size}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="p-3 border-t border-[var(--rh-charcoal-light)]">
            <button className="w-full flex items-center justify-center gap-2 py-2 rounded-md border border-dashed border-[var(--rh-charcoal-light)] text-[var(--rh-silver)] hover:border-[var(--rh-red)] hover:text-white transition-all text-xs">
              <Plus className="w-3.5 h-3.5" />
              Add Source
            </button>
            <div className="flex gap-2 mt-2">
              <button className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded text-[10px] text-[var(--rh-silver)] hover:text-white hover:bg-[var(--rh-charcoal-light)] transition-all">
                <Link2 className="w-3 h-3" /> URL
              </button>
              <button className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded text-[10px] text-[var(--rh-silver)] hover:text-white hover:bg-[var(--rh-charcoal-light)] transition-all">
                <Upload className="w-3 h-3" /> File
              </button>
            </div>
          </div>
        </aside>

        {/* CENTER — Chat */}
        <div className="flex-1 flex flex-col min-w-0 border-r border-[var(--rh-charcoal-light)]">
          {/* Header */}
          <div className="px-6 py-3 border-b border-[var(--rh-charcoal-light)] shrink-0">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[var(--rh-red)]" />
                <h1 className="font-bold text-base">Content Library</h1>
                <span className="text-[10px] bg-[var(--rh-red)]/20 text-[#ff6666] px-2 py-0.5 rounded-full font-medium">EMEA Territory</span>
              </div>
              <div className="flex items-center gap-2">
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[var(--rh-charcoal-light)] text-[11px] text-[var(--rh-silver)] hover:text-white hover:border-white/20 transition-all">
                  <Globe className="w-3 h-3" /> EMEA Focus <ChevronDown className="w-3 h-3" />
                </button>
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[var(--rh-red)] text-white text-[11px] font-medium hover:bg-[var(--rh-red-dark)] transition-all">
                  <RefreshCcw className="w-3 h-3" /> New Session
                </button>
              </div>
            </div>
            {/* Product knowledge pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[9px] text-[var(--rh-silver)]/50 uppercase tracking-wider font-semibold mr-0.5">Product knowledge:</span>
              {RH_PRODUCTS.map(p => (
                <span
                  key={p.name}
                  className="text-[9px] font-semibold px-2 py-0.5 rounded-full border"
                  style={{ color: p.color, borderColor: p.color + "40", backgroundColor: p.color + "12" }}
                >
                  {p.name}
                </span>
              ))}
            </div>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {/* Suggestion chips — shown at top */}
            {messages.length <= 1 && (
              <div className="mb-2">
                <p className="text-[10px] text-[var(--rh-silver)]/60 uppercase tracking-wider mb-2 font-semibold">Suggested questions</p>
                <div className="flex flex-col gap-1.5">
                  {SUGGESTIONS.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => handleSend(s)}
                      className="text-left flex items-center gap-2 px-3 py-2 rounded-md bg-[var(--rh-charcoal-mid)] border border-[var(--rh-charcoal-light)] text-[11px] text-[var(--rh-silver)] hover:text-white hover:border-[var(--rh-red)]/50 transition-all group"
                    >
                      <ChevronRight className="w-3 h-3 text-[var(--rh-red)] shrink-0 group-hover:translate-x-0.5 transition-transform" />
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={`flex gap-3 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                {m.role === "ai" && (
                  <div className="w-7 h-7 rounded-full bg-[var(--rh-red)] flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles className="w-3.5 h-3.5 text-white" />
                  </div>
                )}
                <div className={`max-w-[80%] rounded-xl px-4 py-3 text-sm leading-relaxed ${
                  m.role === "user"
                    ? "bg-[var(--rh-red)] text-white rounded-tr-sm"
                    : "bg-[var(--rh-charcoal-mid)] text-[var(--rh-silver)] rounded-tl-sm border border-[var(--rh-charcoal-light)]"
                }`}>
                  {m.text.split("\n").map((line, j) => (
                    <span key={j}>
                      {line.split(/(\*\*[^*]+\*\*)/).map((part, k) =>
                        part.startsWith("**") && part.endsWith("**")
                          ? <strong key={k} className="text-white font-semibold">{part.slice(2, -2)}</strong>
                          : <span key={k}>{part}</span>
                      )}
                      {j < m.text.split("\n").length - 1 && <br />}
                    </span>
                  ))}
                </div>
                {m.role === "user" && (
                  <div className="w-7 h-7 rounded-full bg-[var(--rh-charcoal-light)] flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-[10px] font-bold text-white">SK</span>
                  </div>
                )}
              </div>
            ))}

            {thinking && (
              <div className="flex gap-3 justify-start">
                <div className="w-7 h-7 rounded-full bg-[var(--rh-red)] flex items-center justify-center shrink-0">
                  <Sparkles className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="bg-[var(--rh-charcoal-mid)] border border-[var(--rh-charcoal-light)] rounded-xl rounded-tl-sm px-4 py-3 flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 text-[var(--rh-red)] animate-spin" />
                  <span className="text-xs text-[var(--rh-silver)]">Analyzing {selectedSources.size} sources…</span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div className="px-5 pb-5 pt-3 shrink-0 border-t border-[var(--rh-charcoal-light)]">
            <div className="flex items-end gap-2 bg-[var(--rh-charcoal-mid)] border border-[var(--rh-charcoal-light)] rounded-xl px-4 py-3 focus-within:border-[var(--rh-red)]/60 transition-colors">
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder={`Ask about ${selectedSources.size} selected sources…`}
                rows={2}
                className="flex-1 bg-transparent text-sm text-white placeholder:text-[var(--rh-silver)]/40 resize-none focus:outline-none"
              />
              <div className="flex items-center gap-1.5 shrink-0">
                <button className="p-1.5 rounded-md text-[var(--rh-silver)] hover:text-white hover:bg-[var(--rh-charcoal-light)] transition-all">
                  <Mic className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleSend()}
                  disabled={!input.trim()}
                  className="p-1.5 rounded-md bg-[var(--rh-red)] text-white hover:bg-[var(--rh-red-dark)] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
            <p className="text-[10px] text-[var(--rh-silver)]/40 mt-1.5 text-center">AI responses are grounded in your selected sources · Requires SME review before field use</p>
          </div>
        </div>

        {/* RIGHT — Notes & Generated Content */}
        <aside className="w-72 shrink-0 flex flex-col bg-[var(--rh-charcoal-mid)]">
          <div className="px-4 pt-4 pb-3 border-b border-[var(--rh-charcoal-light)]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold text-[var(--rh-silver)] uppercase tracking-wider">Generated Notes</span>
              <span className="text-[10px] text-[var(--rh-silver)] bg-[var(--rh-charcoal-light)] px-2 py-0.5 rounded-full">{notes.length}</span>
            </div>

            {/* Generate buttons */}
            <div className="grid grid-cols-2 gap-1.5">
              {([
                ["summary", "Summary", AlignLeft],
                ["guide", "Study Guide", BookOpen],
                ["faq", "FAQ", HelpCircle],
                ["brief", "Briefing Doc", ListChecks],
              ] as const).map(([type, label, Icon]) => (
                <button
                  key={type}
                  onClick={() => handleGenerateNote(type, label)}
                  disabled={generating}
                  className="flex items-center gap-1.5 px-2 py-2 rounded-md bg-[var(--rh-charcoal)] border border-[var(--rh-charcoal-light)] text-[10px] text-[var(--rh-silver)] hover:text-white hover:border-[var(--rh-red)]/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {generating && generatingType === label
                    ? <Loader2 className="w-3 h-3 text-[var(--rh-red)] animate-spin" />
                    : <Icon className="w-3 h-3 text-[var(--rh-red)]" />
                  }
                  {label}
                </button>
              ))}
            </div>
            {generating && (
              <div className="mt-2 flex items-center gap-2 text-[10px] text-[var(--rh-silver)]/70">
                <div className="flex-1 h-1 bg-[var(--rh-charcoal-light)] rounded-full overflow-hidden">
                  <div className="h-full bg-[var(--rh-red)] rounded-full animate-pulse" style={{ width: "60%" }} />
                </div>
                Generating {generatingType}…
              </div>
            )}
          </div>

          {/* Notes list or expanded note */}
          <div className="flex-1 overflow-y-auto">
            {activeNote ? (
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <button onClick={() => setActiveNote(null)} className="text-[10px] text-[var(--rh-silver)] hover:text-white flex items-center gap-1 transition-colors">
                    <ChevronRight className="w-3 h-3 rotate-180" /> All notes
                  </button>
                  <div className="flex items-center gap-1">
                    <button className="p-1 rounded hover:bg-[var(--rh-charcoal-light)] transition-colors">
                      <MoreHorizontal className="w-3.5 h-3.5 text-[var(--rh-silver)]" />
                    </button>
                  </div>
                </div>
                <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wider mb-2 ${noteTypeBadge[activeNote.type]}`}>
                  {noteTypeIcon(activeNote.type)}
                  {noteTypeLabel[activeNote.type]}
                </div>
                <h3 className="font-semibold text-sm text-white mb-3">{activeNote.title}</h3>
                <div className="text-[11px] text-[var(--rh-silver)] leading-relaxed">
                  {activeNote.body.split("\n").map((line, i) => (
                    <span key={i}>
                      {line.split(/(\*\*[^*]+\*\*)/).map((part, k) =>
                        part.startsWith("**") && part.endsWith("**")
                          ? <strong key={k} className="text-white">{part.slice(2, -2)}</strong>
                          : <span key={k}>{part}</span>
                      )}
                      {i < activeNote.body.split("\n").length - 1 && <br />}
                    </span>
                  ))}
                </div>
                <div className="mt-4 pt-3 border-t border-[var(--rh-charcoal-light)] flex flex-col gap-1.5">
                  <button className="w-full flex items-center justify-center gap-1.5 py-2 rounded-md bg-[var(--rh-red)] text-white text-[10px] font-medium hover:bg-[var(--rh-red-dark)] transition-all">
                    <Send className="w-3 h-3" /> Send to AI Toolkit
                  </button>
                  <button className="w-full flex items-center justify-center gap-1.5 py-2 rounded-md border border-[var(--rh-charcoal-light)] text-[var(--rh-silver)] text-[10px] hover:text-white hover:border-white/20 transition-all">
                    <FileCheck2 className="w-3 h-3" /> Route to SME Review
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-3 space-y-2">
                {notes.map(note => (
                  <button
                    key={note.id}
                    onClick={() => setActiveNote(note)}
                    className="w-full text-left p-3 rounded-md bg-[var(--rh-charcoal)] border border-[var(--rh-charcoal-light)] hover:border-[var(--rh-red)]/40 hover:bg-[var(--rh-charcoal-light)]/30 transition-all group"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wider ${noteTypeBadge[note.type]}`}>
                        {noteTypeIcon(note.type)}
                        {noteTypeLabel[note.type]}
                      </div>
                      <ChevronRight className="w-3 h-3 text-[var(--rh-silver)]/40 group-hover:text-[var(--rh-silver)] group-hover:translate-x-0.5 transition-all mt-0.5 shrink-0" />
                    </div>
                    <p className="text-[11px] font-medium text-white line-clamp-1">{note.title}</p>
                    <p className="text-[10px] text-[var(--rh-silver)]/60 line-clamp-2 mt-0.5">{note.body.replace(/\*\*/g, "")}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Audio Overview teaser */}
          <div className="p-3 border-t border-[var(--rh-charcoal-light)]">
            <button className="w-full flex items-center gap-2.5 p-3 rounded-md bg-gradient-to-r from-[var(--rh-charcoal-light)] to-[#2a1a1a] border border-[var(--rh-red)]/30 hover:border-[var(--rh-red)]/60 transition-all group">
              <div className="w-8 h-8 rounded-full bg-[var(--rh-red)]/20 flex items-center justify-center shrink-0 group-hover:bg-[var(--rh-red)]/30 transition-colors">
                <Mic className="w-4 h-4 text-[var(--rh-red)]" />
              </div>
              <div className="text-left">
                <p className="text-[11px] font-semibold text-white">Audio Overview</p>
                <p className="text-[9px] text-[var(--rh-silver)]/60">Generate a 5-min podcast from sources</p>
              </div>
              <Sparkles className="w-3.5 h-3.5 text-[var(--rh-red)] ml-auto shrink-0" />
            </button>
          </div>
        </aside>
      </div>
    </AppLayout>
  );
}
