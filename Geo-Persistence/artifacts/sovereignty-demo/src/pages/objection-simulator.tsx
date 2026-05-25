import { useState, useRef, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Swords, ChevronRight, RotateCcw, Star, Trophy, AlertCircle,
  CheckCircle2, Loader2, Send, User, Bot, TrendingUp, Target
} from "lucide-react";

/* ─── PERSONAS ─── */
type Persona = {
  id: string;
  name: string;
  title: string;
  company: string;
  country: string;
  flag: string;
  context: string;
  avatar: string;
  style: string;
};

const PERSONAS: Persona[] = [
  {
    id: "de-cio",
    name: "Klaus Bauer",
    title: "CIO",
    company: "Bundesministerium für Inneres",
    country: "Germany",
    flag: "🇩🇪",
    context: "German federal agency, BSI C5 mandatory, existing SAP landscape on-prem, evaluating cloud for non-classified workloads",
    avatar: "KB",
    style: "Formal, data-driven, sceptical of vendor promises, demands certified references and legal guarantees",
  },
  {
    id: "fr-ciso",
    name: "Sophie Marchand",
    title: "CISO",
    company: "Caisse des Dépôts",
    country: "France",
    flag: "🇫🇷",
    context: "French state-owned investment bank, SecNumCloud mandate, ANSSI audits annually, existing VMware + Nutanix",
    avatar: "SM",
    style: "Security-first, asks very detailed technical questions, distrusts marketing claims, needs regulatory proof",
  },
  {
    id: "uk-vp",
    name: "James Whitfield",
    title: "VP Infrastructure",
    company: "NHS England",
    country: "UK",
    flag: "🇬🇧",
    context: "NHS national infrastructure, post-Brexit data residency concerns, budget-constrained, legacy on-prem VMware estate",
    avatar: "JW",
    style: "Pragmatic, cost-sensitive, worried about complexity and migration risk, needs clear TCO justification",
  },
  {
    id: "nl-cto",
    name: "Marieke van den Berg",
    title: "CTO",
    company: "ING Bank",
    country: "Netherlands",
    flag: "🇳🇱",
    context: "Major EU bank, DORA + DSGVO + EBA cloud guidance compliance, cloud-native journey underway on Azure, open to sovereign alternatives for regulated workloads",
    avatar: "MB",
    style: "Technically sophisticated, open-minded but challenges everything, cares about developer experience and time-to-market",
  },
  {
    id: "es-dir",
    name: "Carlos Ruiz",
    title: "IT Director",
    company: "Telefónica",
    country: "Spain",
    flag: "🇪🇸",
    context: "Global telco, NIS2 essential entity, 5G core sovereignty requirement, deep AWS relationship, evaluating hybrid sovereign architecture",
    avatar: "CR",
    style: "Commercial, relationship-driven, focused on ROI and strategic partnerships, wants Red Hat to prove long-term commitment to EMEA",
  },
];

/* ─── OBJECTIONS ─── */
type Objection = { text: string; context: string; idealKeyPoints: string[]; commonMistakes: string[] };

const OBJECTIONS: Record<string, Objection[]> = {
  "de-cio": [
    {
      text: "We already use BSI-certified data centres on-prem. Why do we need OpenShift? Our workloads run fine on RHEL VMs.",
      context: "Probing for differentiation — wants to understand what OpenShift adds beyond what RHEL already provides.",
      idealKeyPoints: ["OpenShift adds container orchestration, GitOps, and policy-as-code on top of RHEL", "ACM enables centralized sovereignty policy enforcement across all clusters", "Air-gapped install means no new external dependencies", "Transition from VMs to containers is optional — OpenShift Virtualization runs VMs too"],
      commonMistakes: ["Saying OpenShift replaces RHEL (it runs on top of it)", "Overselling complexity", "Ignoring the existing RHEL relationship — build on it"],
    },
    {
      text: "We had a vendor come in last year with the same sovereign cloud pitch. They couldn't answer our legal team's questions about US CLOUD Act exposure. How is Red Hat different?",
      context: "Core trust objection — this is the most important sovereignty question. He's been burned before.",
      idealKeyPoints: ["T-Systems OTC is operated under German law — no US entity in the chain", "Open-source auditability means legal team can inspect every line of code", "Red Hat is not in the data flow — we're a software vendor, not a cloud provider", "IBM (Red Hat parent) has a separate EU entity structure — different from AWS/Azure/Google"],
      commonMistakes: ["Dismissing the concern", "Getting defensive about IBM", "Not having a clear answer on CLOUD Act — must differentiate on technical isolation vs contractual"],
    },
    {
      text: "We need to patch 400 RHEL servers within 72 hours when a critical CVE drops. We tried automation before and it broke production. How do we manage that risk?",
      context: "NIS2 operational challenge — he wants a concrete process answer, not a product pitch.",
      idealKeyPoints: ["Satellite Content Views allow patch testing in dev/staging before production promotion", "Ansible AAP with approval gates — automated rollout with human checkpoints", "Reference: BfDI and German Bundesbehörden use this pattern with documented 4-hour patch-to-prod", "Compliance reporting built into Satellite — audit evidence generated automatically"],
      commonMistakes: ["Being vague about the automation approach", "Not acknowledging the production risk concern", "Skipping straight to product names without explaining the process"],
    },
  ],
  "fr-ciso": [
    {
      text: "SecNumCloud L3+ requires the operator to be a French legal entity. Red Hat is an American company. So how exactly does this work?",
      context: "Core legal question — she knows the regulation well and is testing whether the rep understands it.",
      idealKeyPoints: ["Red Hat provides the software — OVHcloud (French entity) is the SecNumCloud-qualified operator", "OpenShift runs on OVHcloud's SecNumCloud L3+ infrastructure", "Red Hat never touches customer data — we are a software ISV in this model", "The qualification covers the infrastructure+platform stack — OVHcloud is responsible for compliance", "Outscale (Dassault Systèmes, French) is an alternative qualified operator"],
      commonMistakes: ["Claiming Red Hat itself is SecNumCloud certified", "Saying IBM's French presence resolves the issue — it doesn't under SecNumCloud L3+", "Not knowing OVHcloud's qualification status"],
    },
    {
      text: "We're running a mixed VMware and Nutanix estate. Any migration to OpenShift will take years and cost a fortune. We don't have that kind of budget or runway.",
      context: "Migration risk and cost objection — she's been through painful migrations before.",
      idealKeyPoints: ["Phased approach — start with new workloads on OpenShift, keep existing VMs running", "OpenShift Virtualization runs VMs natively on the same platform — no VMware licence needed", "MTV (Migration Toolkit for Virtualization) automates VM conversion — not a manual rewrite", "Start with non-regulated dev/test workloads, build confidence, then expand"],
      commonMistakes: ["Proposing a big-bang migration", "Not acknowledging the Nutanix complexity", "Underestimating migration costs in your pitch"],
    },
    {
      text: "I ran a pen test on an OpenShift cluster six months ago with another customer. We found several default misconfigurations. How do you address security hardening out of the box?",
      context: "Technical credibility challenge — she knows what she's talking about.",
      idealKeyPoints: ["Advanced Cluster Security (ACS) included in Platform Plus — runtime threat detection + policy enforcement", "RHEL CoreOS nodes — immutable OS, reduced attack surface vs standard Linux", "CIS benchmark profiles and DISA STIG compliance profiles built into OpenShift", "Red Hat Product Security team patches CVEs and issues errata within days — transparent timeline published"],
      commonMistakes: ["Being defensive about the pen test finding", "Not knowing what ACS does", "Generic security claims without specifics"],
    },
  ],
  "uk-vp": [
    {
      text: "We got a quote for OpenShift Platform Plus and it was three times our current VMware spend. How do you justify that?",
      context: "Pure cost objection — NHS is under serious budget pressure. He needs a number, not a story.",
      idealKeyPoints: ["VMware post-Broadcom pricing is often 3-5x — what's the renewal quote?", "OpenShift includes ACS, ACM, Quay, GitOps — compare apples to apples with the VMware full bundle", "TCO modelling: operational savings from automation (AAP), reduced licensing sprawl", "NHS reference: offer to connect with NHSX who have done this modelling"],
      commonMistakes: ["Defending the list price without asking about their VMware renewal", "Not doing TCO modelling", "Ignoring budget constraints — must validate the pain point"],
    },
    {
      text: "Our developers have never used Kubernetes. They'd need retraining. We can't afford 6 months of productivity loss.",
      context: "Change management and skills gap objection — a real operational concern, not a blocker if handled correctly.",
      idealKeyPoints: ["Red Hat training and certification programmes — OpenShift Developer and Admin tracks", "OpenShift Developer Console abstracts Kubernetes complexity for app teams", "Managed service option (ROSA on AWS or OCP on OTC) — platform team managed, developers just use it", "Phased rollout — start with one team, build internal champions before wider rollout"],
      commonMistakes: ["Dismissing the training concern", "Overselling 'easy' Kubernetes — it does have complexity", "Not mentioning the managed service options"],
    },
    {
      text: "What happens if Red Hat gets acquired again or the OpenShift roadmap changes? We can't afford another vendor lock-in situation like we had with VMware.",
      context: "Vendor risk objection — this is a very legitimate concern post-Broadcom/VMware.",
      idealKeyPoints: ["OpenShift is built on Kubernetes — 100% open source, no lock-in to Red Hat for the runtime", "Upstream: CNCF governance means Red Hat can't unilaterally change Kubernetes direction", "Red Hat's RHEL source code released through CentOS Stream — community can fork if needed", "IBM acquired Red Hat in 2019 and has maintained the open-source model — 5-year track record"],
      commonMistakes: ["Dismissing the VMware comparison — it's legitimate", "Overselling IBM stability without acknowledging the concern", "Not knowing the Kubernetes open-source governance model"],
    },
  ],
  "nl-cto": [
    {
      text: "We're 70% through a cloud-native migration to Azure. Why would we introduce another platform now? That seems like massive technical debt.",
      context: "'We're already on our journey' objection — she's not hostile, just needs a compelling reason to add complexity.",
      idealKeyPoints: ["Not replacing Azure — positioning OpenShift as the sovereign layer for regulated workloads that can't go on Azure", "DORA + EBA cloud guidance: financial regulators require exit plans and concentration risk mitigation — multi-cloud is the strategy", "ACM manages both Azure and sovereign clusters from one control plane — reduces operational complexity", "Same developer experience on Azure and on-prem — GitOps pipeline runs identically on both"],
      commonMistakes: ["Arguing against Azure — don't, it creates conflict", "Not knowing DORA/EBA cloud guidance for financial services", "Presenting OpenShift as a replacement rather than a complement"],
    },
    {
      text: "Our platform team is 8 people for 200 developers. We can't manage another control plane.",
      context: "Operational capacity objection — a very real constraint at her scale.",
      idealKeyPoints: ["ACM is the single control plane for all clusters — not N separate things to manage", "Managed OpenShift on T-Systems OTC reduces Day 2 ops burden significantly", "GitOps with ArgoCD means cluster config is declarative YAML — not manual operations", "Red Hat Managed Services (ROSA, OSD) options exist if platform team capacity is the blocker"],
      commonMistakes: ["Proposing more things to manage", "Ignoring the 8-person constraint", "Not offering managed service options"],
    },
  ],
  "es-dir": [
    {
      text: "We have a $200M AWS deal with 3 years remaining. We're not walking away from that relationship. What can you actually offer us?",
      context: "Commercial loyalty objection — he's not against Red Hat, but needs a path that doesn't blow up his AWS deal.",
      idealKeyPoints: ["ROSA (Red Hat OpenShift on AWS) runs on AWS — deepens the AWS relationship, not a replacement", "Sovereign workloads (5G core, citizen data) go on OCP on T-Systems OTC — non-sovereign workloads stay on AWS", "Red Hat is AWS's ISV partner — this is a complementary, not competitive, motion", "Hybrid story: same platform on AWS and sovereign cloud — one skill set, one pipeline, two environments"],
      commonMistakes: ["Attacking AWS — don't", "Not knowing ROSA exists and runs on AWS", "Presenting as an either/or choice"],
    },
    {
      text: "Your competitor Rancher/SUSE told us their sovereign cloud story is identical to OpenShift but 40% cheaper. Why should I pay more?",
      context: "Competitive price challenge — he's been briefed by a competitor and is using it as leverage.",
      idealKeyPoints: ["SUSE/Rancher doesn't have ACS, ACM, or Quay built in — separate licences required", "Platform Plus is an all-in bundle — ACS alone is priced competitively with Rancher's full stack", "Ecosystem: Red Hat is the only vendor with certified sovereign cloud partners across all EMEA jurisdictions", "Support: Red Hat support SLAs in 80+ countries, SUSE has limited EMEA sovereign cloud support capacity", "Ask for a like-for-like comparison of the full stack, not just the container platform"],
      commonMistakes: ["Attacking SUSE's product quality — stay factual", "Not knowing the competitive positioning in detail", "Conceding on price without clarifying what's included in each"],
    },
  ],
};

/* ─── EVALUATION ENGINE ─── */
type EvalResult = {
  score: 1 | 2 | 3 | 4 | 5;
  label: string;
  what_worked: string;
  what_missed: string;
  ideal_answer: string;
};

function evaluateResponse(response: string, objection: Objection): EvalResult {
  const r = response.toLowerCase();
  const hits = objection.idealKeyPoints.filter(kp =>
    kp.toLowerCase().split(" ").filter(w => w.length > 4).some(w => r.includes(w))
  ).length;
  const total = objection.idealKeyPoints.length;
  const hitRate = hits / total;

  const hasMistake = objection.commonMistakes.some(m =>
    m.toLowerCase().split(" ").filter(w => w.length > 4).some(w => r.includes(w))
  );

  let score: 1 | 2 | 3 | 4 | 5 =
    hitRate >= 0.7 && !hasMistake ? 5 :
    hitRate >= 0.5 && !hasMistake ? 4 :
    hitRate >= 0.35 ? 3 :
    hitRate >= 0.2 ? 2 : 1;

  const labels = ["", "Needs Work", "Developing", "Good", "Strong", "Excellent"];
  const label = labels[score];

  const workedIdx = Math.floor(hitRate * objection.idealKeyPoints.length);
  const missedIdx = objection.idealKeyPoints.findIndex(kp =>
    !kp.toLowerCase().split(" ").filter(w => w.length > 4).some(w => r.includes(w))
  );

  return {
    score,
    label,
    what_worked: score >= 3
      ? `You addressed ${hits} of ${total} key points. ${objection.idealKeyPoints[Math.min(workedIdx, total - 1)]?.split(" ").slice(0, 12).join(" ")}… was a strong inclusion.`
      : `You touched on some relevant points but the response was too surface-level for a sceptical ${score < 2 ? "senior executive" : "buyer"}.`,
    what_missed: missedIdx >= 0
      ? `Key point missing: "${objection.idealKeyPoints[missedIdx]}"`
      : hasMistake
      ? `Watch out: ${objection.commonMistakes[0]}`
      : `Solid coverage — in a live conversation, add a specific customer reference to reinforce credibility.`,
    ideal_answer: `Strong response should cover: ${objection.idealKeyPoints.slice(0, 3).join("; ")}.${objection.idealKeyPoints.length > 3 ? ` Also worth mentioning: ${objection.idealKeyPoints.slice(3).join("; ")}.` : ""}`,
  };
}

/* ─── SCORE DISPLAY ─── */
function ScoreDot({ score }: { score: 1 | 2 | 3 | 4 | 5 }) {
  const colors = ["", "bg-[var(--rh-red)]", "bg-[var(--rh-orange)]", "bg-yellow-500", "bg-[var(--rh-green)]", "bg-emerald-400"];
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className={`w-3 h-3 rounded-full transition-all ${i <= score ? colors[score] : "bg-[var(--rh-charcoal-light)]"}`} />
      ))}
    </div>
  );
}

/* ─── MAIN PAGE ─── */
export default function ObjectionSimulator() {
  const [phase, setPhase] = useState<"setup" | "play" | "summary">("setup");
  const [persona, setPersona] = useState<Persona | null>(null);
  const [round, setRound] = useState(0);
  const [response, setResponse] = useState("");
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evalResult, setEvalResult] = useState<EvalResult | null>(null);
  const [history, setHistory] = useState<{ objection: Objection; eval: EvalResult; response: string }[]>([]);
  const [showIdeal, setShowIdeal] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [round, evalResult]);

  const objections = persona ? (OBJECTIONS[persona.id] ?? []) : [];
  const currentObjection = objections[round];
  const totalRounds = objections.length;
  const avgScore = history.length > 0 ? Math.round(history.reduce((s, h) => s + h.eval.score, 0) / history.length * 10) / 10 : 0;

  const startSession = (p: Persona) => {
    setPersona(p);
    setRound(0);
    setHistory([]);
    setResponse("");
    setEvalResult(null);
    setShowIdeal(false);
    setPhase("play");
  };

  const handleSubmit = () => {
    if (!response.trim() || !currentObjection) return;
    setIsEvaluating(true);
    setEvalResult(null);
    setTimeout(() => {
      const result = evaluateResponse(response, currentObjection);
      setEvalResult(result);
      setIsEvaluating(false);
    }, 1500);
  };

  const handleNext = () => {
    if (!evalResult || !currentObjection) return;
    setHistory(prev => [...prev, { objection: currentObjection, eval: evalResult, response }]);
    if (round + 1 >= totalRounds) {
      setPhase("summary");
    } else {
      setRound(r => r + 1);
      setResponse("");
      setEvalResult(null);
      setShowIdeal(false);
    }
  };

  const scoreColor = (s: number) =>
    s >= 4 ? "text-[var(--rh-green)]" : s >= 3 ? "text-yellow-400" : s >= 2 ? "text-[var(--rh-orange)]" : "text-[var(--rh-red)]";

  const scoreBg = (s: number) =>
    s >= 4 ? "bg-[var(--rh-green)]/10 border-[var(--rh-green)]/30" : s >= 3 ? "bg-yellow-500/10 border-yellow-500/30" : s >= 2 ? "bg-[var(--rh-orange)]/10 border-[var(--rh-orange)]/30" : "bg-[var(--rh-red)]/10 border-[var(--rh-red)]/30";

  return (
    <AppLayout activePath="/objection-simulator">
      <div className="p-6 h-full overflow-y-auto">
        <div className="max-w-3xl mx-auto">

          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Swords className="w-6 h-6 text-[var(--rh-red)]" />
                Objection Simulator
              </h1>
              <p className="text-sm text-[var(--rh-silver)] mt-1">
                Practice live objection handling with AI-powered customer personas. Get scored and coached.
              </p>
            </div>
            {phase === "play" && persona && (
              <Button variant="outline" onClick={() => setPhase("setup")} className="border-[var(--rh-charcoal-light)] text-[var(--rh-silver)] hover:text-white h-8 text-xs">
                <RotateCcw className="w-3 h-3 mr-1" /> Change Persona
              </Button>
            )}
          </div>

          {/* ── SETUP: PERSONA PICKER ── */}
          {phase === "setup" && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <p className="text-[var(--rh-silver)] text-sm mb-6">
                Choose a customer persona. The AI will roleplay that buyer and throw real objections. Type your response and get scored.
              </p>
              {PERSONAS.map(p => (
                <button
                  key={p.id}
                  onClick={() => startSession(p)}
                  className="w-full text-left p-5 rounded-xl bg-[var(--rh-charcoal-mid)] border border-[var(--rh-charcoal-light)] hover:border-[var(--rh-red)]/60 hover:bg-[var(--rh-charcoal-light)]/30 transition-all group"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-[var(--rh-charcoal)] border border-[var(--rh-charcoal-light)] flex items-center justify-center text-sm font-bold text-white shrink-0 group-hover:border-[var(--rh-red)]/40 transition-colors">
                      {p.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1 flex-wrap">
                        <span className="font-bold text-white">{p.flag} {p.name}</span>
                        <span className="text-[var(--rh-silver)] text-sm">{p.title}</span>
                        <Badge variant="outline" className="text-[10px] border-[var(--rh-charcoal-light)] text-[var(--rh-silver)]">{p.company}</Badge>
                      </div>
                      <p className="text-xs text-[var(--rh-silver)] leading-relaxed mb-2">{p.context}</p>
                      <p className="text-[10px] text-[var(--rh-silver)]/60 italic">{p.style}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 text-xs text-[var(--rh-silver)]">
                      <Target className="w-3.5 h-3.5" />
                      <span>{(OBJECTIONS[p.id] ?? []).length} objections</span>
                      <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* ── PLAY ── */}
          {phase === "play" && persona && currentObjection && (
            <div className="space-y-5 animate-in fade-in duration-300">
              {/* Progress */}
              <div className="flex items-center gap-3">
                <span className="text-xs text-[var(--rh-silver)] uppercase tracking-wider">Round {round + 1} of {totalRounds}</span>
                <div className="flex-1 h-1 bg-[var(--rh-charcoal-light)] rounded-full overflow-hidden">
                  <div className="h-full bg-[var(--rh-red)] transition-all duration-500" style={{ width: `${((round) / totalRounds) * 100}%` }} />
                </div>
                {history.length > 0 && (
                  <span className={`text-xs font-bold ${scoreColor(avgScore)}`}>Avg: {avgScore}/5</span>
                )}
              </div>

              {/* Persona header */}
              <div className="flex items-center gap-3 p-3 bg-[var(--rh-charcoal-mid)] rounded-lg border border-[var(--rh-charcoal-light)]">
                <div className="w-9 h-9 rounded-full bg-[var(--rh-charcoal)] border border-[var(--rh-charcoal-light)] flex items-center justify-center text-xs font-bold text-white shrink-0">{persona.avatar}</div>
                <div>
                  <p className="text-sm font-semibold text-white">{persona.flag} {persona.name} <span className="text-[var(--rh-silver)] font-normal">— {persona.title}, {persona.company}</span></p>
                  <p className="text-[10px] text-[var(--rh-silver)]/60">{persona.style}</p>
                </div>
              </div>

              {/* Objection bubble */}
              <div className="flex gap-3">
                <div className="w-9 h-9 rounded-full bg-[var(--rh-charcoal)] border border-[var(--rh-charcoal-light)] flex items-center justify-center text-xs font-bold text-white shrink-0 mt-1">{persona.avatar}</div>
                <div className="flex-1 bg-[var(--rh-charcoal-mid)] border border-[var(--rh-charcoal-light)] rounded-xl rounded-tl-sm p-4">
                  <p className="text-sm text-white leading-relaxed">"{currentObjection.text}"</p>
                  <p className="text-[10px] text-[var(--rh-silver)]/50 mt-2 italic">{currentObjection.context}</p>
                </div>
              </div>

              {/* Response input */}
              <div className="flex gap-3">
                <div className="w-9 h-9 rounded-full bg-[var(--rh-red)] flex items-center justify-center shrink-0 mt-1">
                  <User className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 space-y-2">
                  <Textarea
                    value={response}
                    onChange={e => setResponse(e.target.value)}
                    placeholder="Type your response to this objection… Be specific. Reference products, regulations, and customer scenarios."
                    disabled={!!evalResult}
                    className="min-h-[120px] bg-[var(--rh-charcoal)] border-[var(--rh-charcoal-light)] text-sm resize-none focus-visible:ring-[var(--rh-red)] disabled:opacity-70"
                  />
                  {!evalResult && (
                    <Button
                      onClick={handleSubmit}
                      disabled={!response.trim() || isEvaluating}
                      className="bg-[var(--rh-red)] hover:bg-[var(--rh-red-dark)] h-10 text-sm font-bold"
                    >
                      {isEvaluating
                        ? <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Evaluating…</span>
                        : <span className="flex items-center gap-2"><Send className="w-4 h-4" /> Submit Response</span>}
                    </Button>
                  )}
                </div>
              </div>

              {/* Evaluation result */}
              {evalResult && (
                <div className={`rounded-xl border p-5 space-y-4 animate-in fade-in duration-400 ${scoreBg(evalResult.score)}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Bot className="w-5 h-5 text-[var(--rh-silver)]" />
                      <span className="font-bold text-sm">AI Coach Feedback</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <ScoreDot score={evalResult.score} />
                      <span className={`font-black text-lg ${scoreColor(evalResult.score)}`}>{evalResult.score}/5</span>
                      <Badge variant="outline" className={`text-xs ${scoreColor(evalResult.score)} border-current`}>{evalResult.label}</Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5 text-[var(--rh-green)]">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span className="text-xs font-semibold uppercase tracking-wider">What worked</span>
                      </div>
                      <p className="text-xs text-[var(--rh-silver)] leading-relaxed">{evalResult.what_worked}</p>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5 text-[var(--rh-orange)]">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span className="text-xs font-semibold uppercase tracking-wider">What to improve</span>
                      </div>
                      <p className="text-xs text-[var(--rh-silver)] leading-relaxed">{evalResult.what_missed}</p>
                    </div>
                  </div>

                  <div>
                    <button
                      onClick={() => setShowIdeal(v => !v)}
                      className="text-xs text-[var(--rh-blue)] hover:text-white transition-colors flex items-center gap-1"
                    >
                      {showIdeal ? "▲ Hide" : "▼ Show"} ideal answer framework
                    </button>
                    {showIdeal && (
                      <div className="mt-2 p-3 rounded-lg bg-[var(--rh-charcoal)] border border-[var(--rh-charcoal-light)]">
                        <p className="text-xs text-[var(--rh-silver)] leading-relaxed">{evalResult.ideal_answer}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={handleNext} className="bg-[var(--rh-red)] hover:bg-[var(--rh-red-dark)] h-9 text-sm">
                      {round + 1 >= totalRounds ? (
                        <span className="flex items-center gap-2"><Trophy className="w-4 h-4" /> View Summary</span>
                      ) : (
                        <span className="flex items-center gap-2">Next Objection <ChevronRight className="w-4 h-4" /></span>
                      )}
                    </Button>
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>
          )}

          {/* ── SUMMARY ── */}
          {phase === "summary" && persona && (
            <div className="space-y-6 animate-in fade-in duration-400">
              {/* Overall score */}
              <div className="bg-[var(--rh-charcoal-mid)] rounded-xl border border-[var(--rh-charcoal-light)] p-6 text-center">
                <Trophy className="w-10 h-10 text-yellow-400 mx-auto mb-3" />
                <h2 className="text-xl font-bold mb-1">Session Complete</h2>
                <p className="text-[var(--rh-silver)] text-sm mb-4">{persona.flag} {persona.name} — {persona.title}, {persona.company}</p>
                <div className="flex items-center justify-center gap-3 mb-2">
                  <span className={`text-5xl font-black ${scoreColor(Math.round(avgScore))}`}>{avgScore}</span>
                  <span className="text-[var(--rh-silver)] text-xl">/5</span>
                </div>
                <p className="text-sm text-[var(--rh-silver)]">
                  {avgScore >= 4.5 ? "Outstanding — you're ready for this persona in the field." :
                   avgScore >= 3.5 ? "Strong performance. Review the missed points before your next call." :
                   avgScore >= 2.5 ? "Good foundation. Study the ideal answers and practice again." :
                   "Keep practising. Review the content library for deeper product knowledge."}
                </p>
              </div>

              {/* Per-round breakdown */}
              <div className="bg-[var(--rh-charcoal-mid)] rounded-xl border border-[var(--rh-charcoal-light)] p-5">
                <h3 className="font-bold text-sm uppercase tracking-wider text-[var(--rh-silver)] mb-4 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-[var(--rh-red)]" /> Round Breakdown
                </h3>
                <div className="space-y-4">
                  {history.map((h, i) => (
                    <div key={i} className="p-4 rounded-lg bg-[var(--rh-charcoal)] border border-[var(--rh-charcoal-light)]">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <p className="text-sm text-white leading-snug">"{h.objection.text.slice(0, 80)}…"</p>
                        <div className="flex items-center gap-2 shrink-0">
                          <ScoreDot score={h.eval.score} />
                          <span className={`font-bold text-sm ${scoreColor(h.eval.score)}`}>{h.eval.score}/5</span>
                        </div>
                      </div>
                      <p className="text-xs text-[var(--rh-silver)]/70 leading-relaxed">{h.eval.what_missed}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Stars */}
              <div className="bg-[var(--rh-charcoal-mid)] rounded-xl border border-[var(--rh-charcoal-light)] p-5">
                <h3 className="font-bold text-sm uppercase tracking-wider text-[var(--rh-silver)] mb-3 flex items-center gap-2">
                  <Star className="w-4 h-4 text-yellow-400" /> Study Recommendations
                </h3>
                <div className="space-y-2 text-xs text-[var(--rh-silver)]">
                  {avgScore < 4 && <p>→ Review the <strong className="text-white">Content Library</strong> for detailed product-to-regulation mapping.</p>}
                  {history.some(h => h.eval.score < 3) && <p>→ Practice the rounds scored below 3 again with a different persona for the same topic.</p>}
                  <p>→ Try <strong className="text-white">French CISO Sophie Marchand</strong> for deep technical sovereignty questions.</p>
                  <p>→ Run a <strong className="text-white">Deal Qualifier</strong> for this account to generate a structured conversation guide.</p>
                </div>
              </div>

              <div className="flex gap-3 pb-4">
                <Button onClick={() => startSession(persona)} className="bg-[var(--rh-red)] hover:bg-[var(--rh-red-dark)] flex-1 h-10">
                  <RotateCcw className="w-4 h-4 mr-2" /> Retry Same Persona
                </Button>
                <Button onClick={() => setPhase("setup")} variant="outline" className="border-[var(--rh-charcoal-light)] text-[var(--rh-silver)] hover:text-white flex-1 h-10">
                  Try Different Persona
                </Button>
              </div>
            </div>
          )}

        </div>
      </div>
    </AppLayout>
  );
}
