import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Target, ChevronRight, ChevronLeft, CheckCircle2, AlertTriangle,
  XCircle, Shield, Globe, Zap, Package, ArrowRight, RotateCcw,
  FileText, Download, Sparkles, Building2, Cloud, Lock
} from "lucide-react";

/* ─── TYPES ─── */
type Step = 1 | 2 | 3 | 4 | "results";

type FormState = {
  accountName: string;
  industry: string;
  country: string;
  orgSize: string;
  primaryCloud: string;
  existingRH: string[];
  workloadTypes: string[];
  regulations: string[];
  painPoints: string[];
};

/* ─── STATIC DATA ─── */
const INDUSTRIES = ["Telecommunications", "Public Sector / Government", "Financial Services", "Energy & Utilities", "Healthcare", "Defense & Intelligence", "Manufacturing", "Retail / CPG"];
const COUNTRIES = ["Germany", "France", "United Kingdom", "Netherlands", "Spain", "Italy", "Nordics (Denmark/Sweden/Norway/Finland)", "APAC (Australia/Japan/Singapore)", "North America"];
const ORG_SIZES = ["< 1,000 employees", "1,000 – 5,000", "5,000 – 20,000", "> 20,000 (Enterprise)"];
const PRIMARY_CLOUDS = ["AWS", "Microsoft Azure", "Google Cloud", "VMware (on-prem)", "Mixed / Multi-cloud", "Mainframe / Legacy on-prem", "No cloud yet"];
const RH_PRODUCTS = ["Red Hat Enterprise Linux (RHEL)", "OpenShift Container Platform", "Ansible Automation Platform", "Advanced Cluster Management", "OpenShift AI", "Red Hat Satellite", "Quay", "None currently"];
const WORKLOAD_TYPES = ["Web / Application workloads", "AI / ML / GenAI", "Sensitive citizen / patient data", "Mission-critical / 24x7", "Air-gapped / disconnected", "Containerized microservices", "Legacy VM workloads", "Financial transaction processing"];
const REGULATIONS: { id: string; label: string; region: string }[] = [
  { id: "nis2", label: "NIS2 Directive", region: "EU" },
  { id: "dsgvo", label: "DSGVO / GDPR", region: "EU/DE" },
  { id: "eu-data-act", label: "EU Data Act", region: "EU" },
  { id: "bsi-c5", label: "BSI C5 / IT-Grundschutz", region: "DE" },
  { id: "secnumcloud", label: "ANSSI SecNumCloud", region: "FR" },
  { id: "nis1", label: "NIS1 (existing)", region: "EU" },
  { id: "fedramp", label: "FedRAMP", region: "US" },
  { id: "irap", label: "IRAP / ISM", region: "AU" },
  { id: "mtcs", label: "MTCS / PDPA", region: "APAC" },
  { id: "none", label: "None / Unsure", region: "Global" },
];
const PAIN_POINTS = [
  "Hyperscaler contractual sovereignty is not enough for our auditors",
  "We need air-gapped / disconnected infrastructure capability",
  "Vendor lock-in concerns — need portability guarantees",
  "NIS2 patch compliance (72h mandate) is operationally difficult",
  "Upcoming audit requires evidence of data residency",
  "VMware cost increase — evaluating alternatives",
  "Executive mandate to reduce US hyperscaler dependency",
  "Need to deploy sovereign AI / GenAI models on-premises",
];

/* ─── SCORING ENGINE ─── */
type ProductRec = { name: string; priority: "Critical" | "High" | "Recommended"; reason: string };
type RegulationMatch = { id: string; label: string; urgency: "High" | "Medium" | "Low"; products: string[] };
type Report = {
  urgencyScore: number;
  tier: "Critical" | "High" | "Standard";
  headline: string;
  regulations: RegulationMatch[];
  products: ProductRec[];
  openers: string[];
  gaps: string[];
};

function generateReport(form: FormState): Report {
  let score = 0;

  // Industry weighting
  if (["Public Sector / Government", "Defense & Intelligence", "Financial Services"].includes(form.industry)) score += 25;
  else if (["Telecommunications", "Energy & Utilities", "Healthcare"].includes(form.industry)) score += 20;
  else score += 10;

  // Country weighting
  if (["Germany", "France"].includes(form.country)) score += 20;
  else if (["Netherlands", "Spain", "Italy", "United Kingdom"].includes(form.country)) score += 15;
  else score += 8;

  // Regulation exposure
  const highUrgencyRegs = ["bsi-c5", "secnumcloud", "nis2"];
  const matchedHigh = form.regulations.filter(r => highUrgencyRegs.includes(r));
  score += matchedHigh.length * 10;
  score += (form.regulations.length - matchedHigh.length) * 5;

  // Pain points
  score += form.painPoints.length * 4;

  // Workloads
  if (form.workloadTypes.includes("Air-gapped / disconnected")) score += 10;
  if (form.workloadTypes.includes("Sensitive citizen / patient data")) score += 8;
  if (form.workloadTypes.includes("AI / ML / GenAI")) score += 5;

  // Cap
  score = Math.min(score, 100);

  const tier: Report["tier"] = score >= 75 ? "Critical" : score >= 50 ? "High" : "Standard";

  const headline = tier === "Critical"
    ? `${form.accountName} faces immediate sovereignty compliance risk — regulatory mandates demand a technical isolation strategy, not just contractual promises.`
    : tier === "High"
    ? `${form.accountName} has significant sovereignty exposure. Proactive engagement now positions Red Hat as a long-term strategic partner ahead of regulatory enforcement.`
    : `${form.accountName} has emerging sovereignty considerations. Red Hat's open-source stack future-proofs against tightening EMEA data regulations.`;

  // Regulation matches
  const regulationMap: Record<string, RegulationMatch> = {
    nis2:         { id: "nis2", label: "NIS2 Directive", urgency: "High", products: ["RHEL + Satellite", "Ansible AAP", "OpenShift + ACS"] },
    dsgvo:        { id: "dsgvo", label: "DSGVO / GDPR", urgency: "High", products: ["OpenShift (on-prem / sovereign cloud)", "Quay", "RHEL"] },
    "eu-data-act":{ id: "eu-data-act", label: "EU Data Act", urgency: "Medium", products: ["OpenShift Platform Plus", "ACM + GitOps"] },
    "bsi-c5":     { id: "bsi-c5", label: "BSI C5 / IT-Grundschutz", urgency: "High", products: ["RHEL (FIPS 140-3)", "OpenShift on T-Systems OTC", "Satellite"] },
    secnumcloud:  { id: "secnumcloud", label: "ANSSI SecNumCloud", urgency: "High", products: ["OpenShift on OVHcloud SecNumCloud", "Quay", "AAP"] },
    nis1:         { id: "nis1", label: "NIS1 (existing)", urgency: "Medium", products: ["Ansible AAP", "RHEL + Satellite"] },
    fedramp:      { id: "fedramp", label: "FedRAMP", urgency: "Medium", products: ["ROSA", "OpenShift Platform Plus", "ACM"] },
    irap:         { id: "irap", label: "IRAP / ISM", urgency: "Medium", products: ["RHEL", "OpenShift", "Satellite"] },
    mtcs:         { id: "mtcs", label: "MTCS / PDPA", urgency: "Low", products: ["OpenShift", "RHEL", "Quay"] },
  };
  const matchedRegs = form.regulations.filter(r => r !== "none").map(r => regulationMap[r]).filter(Boolean);

  // Product recommendations
  const productRecs: ProductRec[] = [];
  const addProduct = (name: string, priority: ProductRec["priority"], reason: string) => {
    if (!productRecs.find(p => p.name === name)) productRecs.push({ name, priority, reason });
  };

  if (form.regulations.includes("nis2") || form.regulations.includes("dsgvo")) {
    addProduct("RHEL 10 + Red Hat Satellite", "Critical", "FIPS 140-3 certified OS with air-gapped lifecycle management — directly satisfies NIS2 patch mandate and DSGVO data processing requirements.");
    addProduct("Ansible Automation Platform", "Critical", "Automated compliance evidence collection for NIS2 audit trails. Disconnected AAP mirrors all content locally — no call-home required.");
  }
  if (form.regulations.some(r => ["nis2", "bsi-c5", "secnumcloud", "dsgvo"].includes(r)) || form.workloadTypes.includes("Air-gapped / disconnected")) {
    addProduct("OpenShift Platform Plus", "Critical", "Runs fully air-gapped. Includes ACS for NIS2 incident detection and Quay for sovereign container registry. The complete sovereign Kubernetes platform.");
  }
  if (form.workloadTypes.includes("AI / ML / GenAI")) {
    addProduct("OpenShift AI", "High", "MLOps fully on-premises — models, training data, and inference never leave the jurisdiction. Rules out SaaS AI APIs that violate data residency requirements.");
  }
  if (form.primaryCloud === "VMware (on-prem)" || form.painPoints.includes("VMware cost increase — evaluating alternatives")) {
    addProduct("OpenShift Virtualization + MTV", "High", "Run existing VMs natively on OpenShift. Migration Toolkit for Virtualization automates conversion from vSphere. Average TCO savings 40-60% vs post-Broadcom VMware.");
  }
  addProduct("Advanced Cluster Management (ACM)", "Recommended", "Governs sovereign clusters across jurisdictions with policy-as-code. Enforces data boundary policies — workloads cannot schedule outside approved sovereign cluster sets.");
  if (form.regulations.includes("bsi-c5")) {
    addProduct("OpenShift on T-Systems OTC", "Critical", "T-Systems OTC is BSI C5-certified, operated under German law. The only hyperscaler-alternative with full legal sovereignty guarantee for German public sector.");
  }
  if (form.regulations.includes("secnumcloud")) {
    addProduct("OpenShift on OVHcloud SecNumCloud", "Critical", "OVHcloud holds SecNumCloud L3+ qualification. Only sovereign cloud for ANSSI-mandated French public sector workloads.");
  }

  // Conversation openers
  const openers = [
    `"With NIS2 enforcement underway, ${form.accountName} as a ${form.industry.toLowerCase()} operator is likely already under scrutiny. What's your current patch-to-production SLA for critical CVEs?"`,
    `"When your auditors ask for evidence of data residency — not just contractual promises — what documentation can you provide today?"`,
    `"If ${form.primaryCloud === "VMware (on-prem)" ? "Broadcom triples your VMware renewal" : "your hyperscaler receives a foreign government subpoena for your data"} tomorrow, what's your fallback plan?"`,
    `"Have you evaluated the difference between a hyperscaler 'sovereign zone' and a technically isolated sovereign cloud operated by an EU legal entity?"`,
  ];

  // Gaps
  const gaps: string[] = [];
  if (!form.existingRH.includes("Red Hat Enterprise Linux (RHEL)") && !form.existingRH.includes("None currently")) gaps.push("No RHEL deployment — missing the FIPS 140-3 certified OS foundation required for most EU sovereign frameworks.");
  if (form.workloadTypes.includes("AI / ML / GenAI")) gaps.push("AI workloads present — no sovereign AI platform (OpenShift AI) currently in scope.");
  if (form.regulations.includes("nis2") && !form.existingRH.includes("Ansible Automation Platform")) gaps.push("NIS2 requires automated compliance evidence collection. No AAP deployment means manual audit preparation — high operational risk.");
  if (form.painPoints.includes("Air-gapped / disconnected infrastructure capability") && !form.existingRH.includes("OpenShift Container Platform")) gaps.push("Air-gapped requirement identified but no OpenShift deployment — the only Kubernetes platform with certified disconnected install.");
  if (gaps.length === 0) gaps.push("No critical architecture gaps identified — focus on deepening existing Red Hat footprint and sovereign cloud partner certification.");

  return { urgencyScore: score, tier, headline, regulations: matchedRegs, products: productRecs, openers, gaps };
}

/* ─── MULTI-SELECT PILL COMPONENT ─── */
function MultiSelect({ options, selected, onChange }: {
  options: string[]; selected: string[]; onChange: (v: string[]) => void;
}) {
  const toggle = (v: string) => onChange(selected.includes(v) ? selected.filter(x => x !== v) : [...selected, v]);
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => (
        <button
          key={opt}
          type="button"
          onClick={() => toggle(opt)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
            selected.includes(opt)
              ? "bg-[var(--rh-red)] border-[var(--rh-red)] text-on-dark"
              : "bg-[var(--rh-charcoal)] border-[var(--rh-charcoal-light)] text-[var(--rh-silver)] hover:border-[var(--rh-silver)]"
          }`}
        >
          {selected.includes(opt) && <span className="mr-1">✓</span>}
          {opt}
        </button>
      ))}
    </div>
  );
}

/* ─── PROGRESS BAR ─── */
function StepProgress({ step }: { step: Step }) {
  const steps = [
    { n: 1, label: "Account" },
    { n: 2, label: "Cloud Setup" },
    { n: 3, label: "Regulations" },
    { n: 4, label: "Pain Points" },
  ];
  const current = step === "results" ? 5 : (step as number);
  return (
    <div className="flex items-center gap-0 mb-8">
      {steps.map((s, i) => (
        <div key={s.n} className="flex items-center flex-1">
          <div className={`flex items-center gap-2 ${current >= s.n ? "text-white" : "text-[var(--rh-silver)]/50"}`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
              current > s.n ? "bg-[var(--rh-red)] border-[var(--rh-red)]" :
              current === s.n ? "bg-transparent border-[var(--rh-red)] text-[var(--rh-red)]" :
              "bg-transparent border-[var(--rh-charcoal-light)]"
            }`}>
              {current > s.n ? <CheckCircle2 className="w-3.5 h-3.5" /> : s.n}
            </div>
            <span className="text-xs font-medium hidden sm:block">{s.label}</span>
          </div>
          {i < steps.length - 1 && (
            <div className={`flex-1 h-0.5 mx-3 transition-all ${current > s.n ? "bg-[var(--rh-red)]" : "bg-[var(--rh-charcoal-light)]"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

/* ─── MAIN PAGE ─── */
const EMPTY: FormState = {
  accountName: "", industry: "", country: "", orgSize: "",
  primaryCloud: "", existingRH: [], workloadTypes: [], regulations: [], painPoints: [],
};

export default function DealQualifier() {
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<FormState>({ ...EMPTY, accountName: "Deutsche Telekom", industry: "Telecommunications", country: "Germany", orgSize: "> 20,000 (Enterprise)" });
  const [report, setReport] = useState<Report | null>(null);

  const set = (k: keyof FormState, v: any) => setForm(f => ({ ...f, [k]: v }));

  const canNext = (s: Step): boolean => {
    if (s === 1) return !!form.accountName && !!form.industry && !!form.country && !!form.orgSize;
    if (s === 2) return !!form.primaryCloud && form.workloadTypes.length > 0;
    if (s === 3) return form.regulations.length > 0;
    if (s === 4) return true;
    return false;
  };

  const next = () => {
    if (step === 4) {
      setReport(generateReport(form));
      setStep("results");
    } else {
      setStep((prev => ((prev as number) + 1) as Step));
    }
  };
  const back = () => setStep((prev => Math.max(1, (prev as number) - 1) as Step));
  const reset = () => { setStep(1); setForm({ ...EMPTY }); setReport(null); };

  return (
      <div className="p-6 h-full overflow-y-auto">
        <div className="max-w-3xl mx-auto">

          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Target className="w-6 h-6 text-[var(--rh-red)]" />
                Deal Qualifier
              </h1>
              <p className="text-sm text-[var(--rh-silver)] mt-1">Assess sovereignty readiness and get a tailored Red Hat product recommendation.</p>
            </div>
            {step !== 1 && step !== "results" && (
              <Badge className="bg-[var(--rh-charcoal-mid)] border-[var(--rh-charcoal-light)] text-[var(--rh-silver)]">
                Step {step} of 4
              </Badge>
            )}
          </div>

          {step !== "results" && <StepProgress step={step} />}

          {/* ── STEP 1: Account Basics ── */}
          {step === 1 && (
            <StepCard title="Account & Territory" icon={Building2}>
              <div className="grid grid-cols-2 gap-5">
                <div className="col-span-2 space-y-2">
                  <Label className="text-xs uppercase text-[var(--rh-silver)] tracking-wider">Account Name</Label>
                  <Input value={form.accountName} onChange={e => set("accountName", e.target.value)} placeholder="e.g. Deutsche Telekom" className="bg-[var(--rh-charcoal)] border-[var(--rh-charcoal-light)]" />
                </div>
                <DropField label="Industry" value={form.industry} onChange={v => set("industry", v)} options={INDUSTRIES} />
                <DropField label="Country / Region" value={form.country} onChange={v => set("country", v)} options={COUNTRIES} />
                <div className="col-span-2">
                  <DropField label="Organisation Size" value={form.orgSize} onChange={v => set("orgSize", v)} options={ORG_SIZES} />
                </div>
              </div>
            </StepCard>
          )}

          {/* ── STEP 2: Cloud Setup ── */}
          {step === 2 && (
            <StepCard title="Current Cloud & Workloads" icon={Cloud}>
              <div className="space-y-6">
                <DropField label="Primary Cloud / Infrastructure Today" value={form.primaryCloud} onChange={v => set("primaryCloud", v)} options={PRIMARY_CLOUDS} />
                <div className="space-y-2">
                  <Label className="text-xs uppercase text-[var(--rh-silver)] tracking-wider">Existing Red Hat Products (select all)</Label>
                  <MultiSelect options={RH_PRODUCTS} selected={form.existingRH} onChange={v => set("existingRH", v)} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase text-[var(--rh-silver)] tracking-wider">Workload Types in Scope (select all)</Label>
                  <MultiSelect options={WORKLOAD_TYPES} selected={form.workloadTypes} onChange={v => set("workloadTypes", v)} />
                </div>
              </div>
            </StepCard>
          )}

          {/* ── STEP 3: Regulations ── */}
          {step === 3 && (
            <StepCard title="Regulatory Exposure" icon={Shield}>
              <div className="space-y-2">
                <Label className="text-xs uppercase text-[var(--rh-silver)] tracking-wider">Which regulations apply to this account? (select all)</Label>
                <div className="grid grid-cols-2 gap-2 mt-3">
                  {REGULATIONS.map(reg => (
                    <button
                      key={reg.id}
                      type="button"
                      onClick={() => {
                        const cur = form.regulations;
                        set("regulations", cur.includes(reg.id) ? cur.filter(r => r !== reg.id) : [...cur, reg.id]);
                      }}
                      className={`flex items-center justify-between px-4 py-3 rounded-lg border text-left transition-all ${
                        form.regulations.includes(reg.id)
                          ? "bg-[var(--rh-red)]/10 border-[var(--rh-red)] text-[var(--rh-red)]"
                          : "bg-[var(--rh-charcoal)] border-[var(--rh-charcoal-light)] text-[var(--rh-silver)] hover:border-[var(--rh-silver)]"
                      }`}
                    >
                      <span className="text-sm font-medium">{reg.label}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                        form.regulations.includes(reg.id) ? "bg-[var(--rh-red)]/30 text-[var(--rh-red)]" : "bg-[var(--rh-charcoal-light)] text-[var(--rh-silver)]"
                      }`}>{reg.region}</span>
                    </button>
                  ))}
                </div>
              </div>
            </StepCard>
          )}

          {/* ── STEP 4: Pain Points ── */}
          {step === 4 && (
            <StepCard title="Key Pain Points" icon={Zap}>
              <div className="space-y-2">
                <Label className="text-xs uppercase text-[var(--rh-silver)] tracking-wider">What is the customer most concerned about? (select all that apply)</Label>
                <div className="space-y-2 mt-3">
                  {PAIN_POINTS.map(pt => (
                    <button
                      key={pt}
                      type="button"
                      onClick={() => {
                        const cur = form.painPoints;
                        set("painPoints", cur.includes(pt) ? cur.filter(p => p !== pt) : [...cur, pt]);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border text-left text-sm transition-all ${
                        form.painPoints.includes(pt)
                          ? "bg-[var(--rh-red)]/10 border-[var(--rh-red)] text-[var(--rh-red)]"
                          : "bg-[var(--rh-charcoal)] border-[var(--rh-charcoal-light)] text-[var(--rh-silver)] hover:border-[var(--rh-silver)]"
                      }`}
                    >
                      <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${form.painPoints.includes(pt) ? "bg-[var(--rh-red)] border-[var(--rh-red)]" : "border-[var(--rh-charcoal-light)]"}`}>
                        {form.painPoints.includes(pt) && <CheckCircle2 className="w-3 h-3 text-white" />}
                      </div>
                      {pt}
                    </button>
                  ))}
                </div>
              </div>
            </StepCard>
          )}

          {/* ── RESULTS ── */}
          {step === "results" && report && (
            <Results report={report} form={form} onReset={reset} />
          )}

          {/* Nav buttons */}
          {step !== "results" && (
            <div className="flex items-center justify-between mt-6">
              <Button variant="outline" onClick={back} disabled={step === 1} className="border-[var(--rh-charcoal-light)] text-[var(--rh-silver)] hover:text-white">
                <ChevronLeft className="w-4 h-4 mr-1" /> Back
              </Button>
              <Button onClick={next} disabled={!canNext(step)} className="bg-[var(--rh-red)] hover:bg-[var(--rh-red-dark)] text-on-dark px-8">
                {step === 4 ? (
                  <span className="flex items-center gap-2"><Sparkles className="w-4 h-4" /> Generate Report</span>
                ) : (
                  <span className="flex items-center gap-2">Next <ChevronRight className="w-4 h-4" /></span>
                )}
              </Button>
            </div>
          )}

        </div>
      </div>
  );
}

/* ─── STEP CARD WRAPPER ─── */
function StepCard({ title, icon: Icon, children }: { title: string; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <div className="bg-[var(--rh-charcoal-mid)] rounded-xl border border-[var(--rh-charcoal-light)] p-6">
      <h2 className="text-lg font-bold flex items-center gap-2 mb-6">
        <Icon className="w-5 h-5 text-[var(--rh-red)]" />
        {title}
      </h2>
      {children}
    </div>
  );
}

/* ─── DROP FIELD ─── */
function DropField({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div className="space-y-2">
      <Label className="text-xs uppercase text-[var(--rh-silver)] tracking-wider">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="bg-[var(--rh-charcoal)] border-[var(--rh-charcoal-light)]"><SelectValue placeholder="Select…" /></SelectTrigger>
        <SelectContent className="bg-[var(--rh-charcoal-mid)] border-[var(--rh-charcoal-light)] text-white">
          {options.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

/* ─── RESULTS PAGE ─── */
function Results({ report, form, onReset }: { report: Report; form: FormState; onReset: () => void }) {
  const tierColor = report.tier === "Critical" ? "text-[var(--rh-red)]" : report.tier === "High" ? "text-[var(--rh-orange)]" : "text-[var(--rh-green)]";
  const tierBg = report.tier === "Critical" ? "bg-[var(--rh-red)]/10 border-[var(--rh-red)]/30" : report.tier === "High" ? "bg-[var(--rh-orange)]/10 border-[var(--rh-orange)]/30" : "bg-[var(--rh-green)]/10 border-[var(--rh-green)]/30";
  const tierIcon = report.tier === "Critical" ? XCircle : report.tier === "High" ? AlertTriangle : CheckCircle2;
  const TierIcon = tierIcon;

  const priorityColor = (p: string) =>
    p === "Critical" ? "bg-[var(--rh-red)]/20 text-[var(--rh-red)] border-[var(--rh-red)]/40" :
    p === "High" ? "bg-[var(--rh-orange)]/20 text-[var(--rh-orange)] border-[var(--rh-orange)]/40" :
    "bg-[var(--rh-blue)]/20 text-[var(--rh-blue)] border-[var(--rh-blue)]/40";

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Score banner */}
      <div className={`rounded-xl border p-6 ${tierBg}`}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-[var(--rh-charcoal)] border-4 border-[var(--rh-charcoal-light)] flex flex-col items-center justify-center shrink-0">
              <span className={`text-2xl font-black ${tierColor}`}>{report.urgencyScore}</span>
              <span className="text-[9px] text-[var(--rh-silver)] uppercase tracking-wider">/ 100</span>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <TierIcon className={`w-5 h-5 ${tierColor}`} />
                <span className={`font-bold text-lg ${tierColor}`}>{report.tier} Sovereignty Urgency</span>
              </div>
              <p className="text-sm text-[var(--rh-silver)] max-w-xl leading-relaxed">{report.headline}</p>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button size="sm" variant="outline" className="border-[var(--rh-charcoal-light)] text-[var(--rh-silver)] hover:text-white h-8">
              <Download className="w-3.5 h-3.5 mr-1" /> Export Brief
            </Button>
            <Button size="sm" variant="outline" onClick={onReset} className="border-[var(--rh-charcoal-light)] text-[var(--rh-silver)] hover:text-white h-8">
              <RotateCcw className="w-3.5 h-3.5 mr-1" /> New Assessment
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Product Recommendations */}
        <div className="bg-[var(--rh-charcoal-mid)] rounded-xl border border-[var(--rh-charcoal-light)] p-5">
          <h3 className="font-bold text-sm uppercase tracking-wider text-[var(--rh-silver)] mb-4 flex items-center gap-2">
            <Package className="w-4 h-4 text-[var(--rh-red)]" /> Recommended Stack
          </h3>
          <div className="space-y-3">
            {report.products.map(p => (
              <div key={p.name} className="p-3 rounded-lg bg-[var(--rh-charcoal)] border border-[var(--rh-charcoal-light)]">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-semibold text-white">{p.name}</span>
                  <Badge variant="outline" className={`text-[10px] ${priorityColor(p.priority)}`}>{p.priority}</Badge>
                </div>
                <p className="text-xs text-[var(--rh-silver)] leading-relaxed">{p.reason}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-5">
          {/* Regulations */}
          {report.regulations.length > 0 && (
            <div className="bg-[var(--rh-charcoal-mid)] rounded-xl border border-[var(--rh-charcoal-light)] p-5">
              <h3 className="font-bold text-sm uppercase tracking-wider text-[var(--rh-silver)] mb-3 flex items-center gap-2">
                <Shield className="w-4 h-4 text-[var(--rh-red)]" /> Applicable Regulations
              </h3>
              <div className="space-y-2">
                {report.regulations.map(r => (
                  <div key={r.id} className="flex items-start gap-2">
                    <div className={`mt-0.5 shrink-0 ${r.urgency === "High" ? "text-[var(--rh-red)]" : r.urgency === "Medium" ? "text-[var(--rh-orange)]" : "text-[var(--rh-blue)]"}`}>
                      <AlertTriangle className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-white">{r.label}</p>
                      <p className="text-[10px] text-[var(--rh-silver)]">Products: {r.products.join(", ")}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Architecture gaps */}
          <div className="bg-[var(--rh-charcoal-mid)] rounded-xl border border-[var(--rh-charcoal-light)] p-5">
            <h3 className="font-bold text-sm uppercase tracking-wider text-[var(--rh-silver)] mb-3 flex items-center gap-2">
              <Lock className="w-4 h-4 text-[var(--rh-red)]" /> Architecture Gaps
            </h3>
            <div className="space-y-2">
              {report.gaps.map((g, i) => (
                <div key={i} className="flex items-start gap-2">
                  <XCircle className="w-3.5 h-3.5 text-[var(--rh-red)] mt-0.5 shrink-0" />
                  <p className="text-xs text-[var(--rh-silver)] leading-relaxed">{g}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Conversation openers */}
      <div className="bg-[var(--rh-charcoal-mid)] rounded-xl border border-[var(--rh-charcoal-light)] p-5">
        <h3 className="font-bold text-sm uppercase tracking-wider text-[var(--rh-silver)] mb-4 flex items-center gap-2">
          <FileText className="w-4 h-4 text-[var(--rh-red)]" /> Discovery Conversation Starters
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {report.openers.map((o, i) => (
            <div key={i} className="flex items-start gap-2 p-3 rounded-lg bg-[var(--rh-charcoal)] border border-[var(--rh-charcoal-light)]">
              <ArrowRight className="w-3.5 h-3.5 text-[var(--rh-red)] mt-0.5 shrink-0" />
              <p className="text-xs text-[var(--rh-silver)] leading-relaxed italic">{o}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-center pb-4">
        <Button onClick={onReset} variant="outline" className="border-[var(--rh-charcoal-light)] text-[var(--rh-silver)] hover:text-white gap-2">
          <RotateCcw className="w-4 h-4" /> Assess Another Account
        </Button>
      </div>
    </div>
  );
}
