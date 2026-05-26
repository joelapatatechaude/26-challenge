import { useState, useEffect, useRef } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Loader2, CheckCircle2, FileText, Download, Languages, Paperclip, LayoutGrid, X, ChevronDown, ChevronUp } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

/* ─── Output Language catalogue ─── */
export type OutputLang = "en" | "de" | "fr" | "es" | "it" | "nl" | "ja" | "pt-br";

export const OUTPUT_LANGS: { value: OutputLang; label: string; flag: string; regulatory: string }[] = [
  { value: "en",    label: "English",    flag: "🇺🇸", regulatory: "GDPR / NIS2" },
  { value: "de",    label: "Deutsch",    flag: "🇩🇪", regulatory: "DSGVO / BSI C5" },
  { value: "fr",    label: "Français",   flag: "🇫🇷", regulatory: "RGPD / SecNumCloud" },
  { value: "es",    label: "Español",    flag: "🇪🇸", regulatory: "LOPDGDD / ENS" },
  { value: "it",    label: "Italiano",   flag: "🇮🇹", regulatory: "GDPR / PSN" },
  { value: "nl",    label: "Nederlands", flag: "🇳🇱", regulatory: "AVG / BIO" },
  { value: "ja",    label: "日本語",      flag: "🇯🇵", regulatory: "APPI / ISMAP" },
  { value: "pt-br", label: "Português",  flag: "🇧🇷", regulatory: "LGPD" },
];

/* ─── Deck type catalogue ─── */
export const DECK_TYPES = [
  {
    id: "competitive",
    label: "15-min Competitive Edge",
    icon: "⚔️",
    description: "Position Red Hat against a specific competitor",
    templatePrompt: "Create a 15-minute competitive edge presentation targeting [customer] comparing Red Hat OpenShift vs [competitor]. Focus on key differentiators and customer value.",
    deckType: "competitive",
    slideCount: 10,
  },
  {
    id: "power_hour",
    label: "Power Hour",
    icon: "⚡",
    description: "Deep-dive technical session for architects",
    templatePrompt: "Build a Power Hour deep-dive session on [topic] for [customer]'s technical architects. Cover architecture, implementation patterns, and hands-on scenarios.",
    deckType: "power_hour",
    slideCount: 20,
  },
  {
    id: "elevator",
    label: "Elevator Pitch",
    icon: "🚀",
    description: "5-minute exec-level value story",
    templatePrompt: "Create a 5-minute elevator pitch for [customer]'s executive leadership on Red Hat [product/solution]. Lead with business value and ROI.",
    deckType: "elevator",
    slideCount: 5,
  },
  {
    id: "sales_enablement",
    label: "Sales Enablement",
    icon: "📊",
    description: "Full sales enablement deck with discovery questions",
    templatePrompt: "Build a sales enablement presentation for [customer] covering Red Hat's portfolio, discovery questions, objection handling, and next steps.",
    deckType: "competitive",
    slideCount: 15,
  },
  {
    id: "rh_standard",
    label: "Red Hat Standard",
    icon: "🎯",
    description: "Standard Red Hat branded presentation",
    templatePrompt: "Create a standard Red Hat presentation on [topic] for [customer]. Follow Red Hat messaging guidelines with clear structure and call to action.",
    deckType: "competitive",
    slideCount: 10,
  },
  {
    id: "assessment",
    label: "Assessment / Questionnaire",
    icon: "📋",
    description: "Discovery questionnaire and maturity assessment",
    templatePrompt: "Build a [customer] maturity assessment and discovery questionnaire covering infrastructure, cloud readiness, and automation capabilities.",
    deckType: "assessment",
    slideCount: 10,
  },
] as const;

export type DeckTypeId = typeof DECK_TYPES[number]["id"];
export type DeckTypeEntry = typeof DECK_TYPES[number];

export default function AIToolkit() {
  const [outputLang] = useState<OutputLang>("en");

  return (
    <AppLayout activePath="/ai-toolkit">
      <div className="h-full flex flex-col w-full overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-2 border-b border-[var(--rh-charcoal-light)] shrink-0">
          <h1 className="text-base font-bold">AI Content Toolkit</h1>
          <span className="text-xs text-[var(--rh-silver)]">Generate highly-contextualized assets tailored for your region.</span>
        </div>

        <div className="flex-1 min-h-0 overflow-hidden">
          <PresentationChat outputLang={outputLang} />
        </div>
      </div>
    </AppLayout>
  );
}

/* ─── Localized slide preview content ─── */
const SLIDE_CONTENT: Record<string, { title: string; subtitle: string; footer: string }> = {
  en:    { title: "Deutsche Telekom\nDigital Sovereignty with OpenShift", subtitle: "Securing cloud portability and data residency in Germany.", footer: "EMEA Sales Enablement" },
  de:    { title: "Deutsche Telekom\nDigitale Souveränität mit OpenShift", subtitle: "Cloud-Portabilität und Datenresidenz in Deutschland sicherstellen.", footer: "EMEA Vertriebsbefähigung" },
  fr:    { title: "Deutsche Telekom\nSouveraineté numérique avec OpenShift", subtitle: "Assurer la portabilité cloud et la résidence des données en Allemagne.", footer: "Enablement commercial EMEA" },
  es:    { title: "Deutsche Telekom\nSoberanía digital con OpenShift", subtitle: "Garantizando la portabilidad en la nube y la residencia de datos en Alemania.", footer: "Habilitación de ventas EMEA" },
  it:    { title: "Deutsche Telekom\nSovranità digitale con OpenShift", subtitle: "Garantire la portabilità cloud e la residenza dei dati in Germania.", footer: "Abilitazione vendite EMEA" },
  nl:    { title: "Deutsche Telekom\nDigitale soevereiniteit met OpenShift", subtitle: "Cloud-portabiliteit en dataverblijf in Duitsland waarborgen.", footer: "EMEA verkoopondersteuning" },
  ja:    { title: "ドイツテレコム\nOpenShiftによるデジタル主権", subtitle: "ドイツにおけるクラウドの可搬性とデータ常駐の確保。", footer: "EMEA セールスイネーブルメント" },
  "pt-br": { title: "Deutsche Telekom\nSoberania digital com OpenShift", subtitle: "Garantindo portabilidade de nuvem e residência de dados na Alemanha.", footer: "Capacitação de vendas EMEA" },
};

/* ─── PPT Agent API helpers ─── */
const GEO_MAP: Record<string, string> = {
  de: "EMEA - Germany",
  fr: "EMEA - France",
  uk: "EMEA - UK",
  es: "EMEA - Spain",
  apac: "APAC",
};

const DECK_TYPE_MAP: Record<string, string> = {
  "5": "elevator",
  "10": "competitive",
  "20": "power_hour",
};

function extractCustomer(topic: string): string {
  const first = topic.split("|")[0]?.trim();
  if (first && first.length > 0 && first.length < 80) return first;
  return "Account";
}

type ActivityEntry = {
  id: string;
  message: string;
  step?: string;
  detail?: string;
  level?: string;
  isHeartbeat?: boolean;
  at: string;
};

function formatLogTime(d = new Date()): string {
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function pushActivity(
  prev: ActivityEntry[],
  data: Record<string, unknown>,
  event: string,
): ActivityEntry[] {
  const message = String(data.status ?? data.message ?? "");
  if (!message) return prev;

  if (event === "heartbeat") {
    const withoutHb = prev.filter(e => !e.isHeartbeat);
    return [
      ...withoutHb,
      {
        id: `hb-${Date.now()}`,
        message,
        isHeartbeat: true,
        at: formatLogTime(),
      },
    ];
  }

  return [
    ...prev.filter(e => !e.isHeartbeat),
    {
      id: `${Date.now()}-${prev.length}`,
      message,
      step: data.step ? String(data.step) : undefined,
      detail: data.detail ? String(data.detail) : undefined,
      level: data.level ? String(data.level) : "info",
      at: formatLogTime(),
    },
  ];
}

function DeckPreviewPanel({
  previewUrl,
  downloadUrl,
  filename,
  fallbackTitle,
  fallbackSubtitle,
}: {
  previewUrl: string | null;
  downloadUrl: string | null;
  filename: string | null;
  fallbackTitle: string;
  fallbackSubtitle: string;
}) {
  if (previewUrl) {
    return (
      <div className="flex-1 flex flex-col min-h-0 rounded-md overflow-hidden border border-[var(--rh-charcoal-light)] bg-[#151515]">
        <iframe
          src={previewUrl}
          title={filename ? `Preview: ${filename}` : "Presentation preview"}
          className="flex-1 w-full min-h-[420px] border-0"
          allow="fullscreen"
          data-testid="pptx-preview-iframe"
        />
        <p className="text-[10px] text-[var(--rh-silver)] px-2 py-1.5 border-t border-[var(--rh-charcoal-light)] shrink-0">
          Powered by ONLYOFFICE · Start preview stack:{" "}
          <code className="text-[var(--rh-blue)]">podman compose -f compose.onlyoffice.yml up -d</code>
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-white rounded-md shadow-lg flex flex-col p-8 text-black overflow-hidden min-h-[320px]">
      <div className="mb-auto">
        <div className="w-12 h-12 bg-[var(--rh-red)] text-white font-black flex items-center justify-center text-xl mb-12">RH</div>
      </div>
      <div>
        <h2 className="text-3xl font-bold mb-4 tracking-tight whitespace-pre-line">{fallbackTitle}</h2>
        <p className="text-gray-600 font-medium">{fallbackSubtitle}</p>
      </div>
      {downloadUrl && (
        <a
          href={downloadUrl}
          download
          className="mt-6 inline-flex items-center gap-2 text-sm text-[var(--rh-red)] font-semibold"
        >
          <Download className="w-4 h-4" /> Download PPTX to view locally
        </a>
      )}
    </div>
  );
}

function ActivityLogPanel({
  entries,
  currentStep,
  className = "",
}: {
  entries: ActivityEntry[];
  currentStep: string | null;
  className?: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [entries]);

  if (entries.length === 0 && !currentStep) return null;

  return (
    <div className={`flex flex-col gap-2 w-full ${className}`}>
      {currentStep && (
        <p className="text-sm font-medium text-white truncate">{currentStep}</p>
      )}
      <div
        ref={scrollRef}
        data-testid="sse-progress"
        className="w-full max-h-52 overflow-y-auto rounded-md bg-[var(--rh-charcoal-mid)] border border-[var(--rh-charcoal-light)] p-3 text-left font-mono text-[11px] space-y-2"
      >
        {entries.length === 0 ? (
          <p className="text-[var(--rh-silver)] animate-pulse">Waiting for first update…</p>
        ) : (
          entries.map(entry => (
            <div
              key={entry.id}
              className={`flex gap-2 ${
                entry.isHeartbeat ? "opacity-60" : ""
              } ${entry.level === "warn" ? "text-amber-400" : entry.level === "error" ? "text-[var(--rh-red)]" : "text-[var(--rh-silver)]"}`}
            >
              <span className="text-[var(--rh-charcoal-light)] shrink-0 tabular-nums">{entry.at}</span>
              <div className="min-w-0 flex-1">
                <p className="break-words">{entry.message}</p>
                {entry.detail && !entry.isHeartbeat && (
                  <p className="text-[var(--rh-charcoal-light)] mt-0.5 truncate">{entry.detail}</p>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

async function fetchJobOutline(jobId: string): Promise<Record<string, unknown> | null> {
  try {
    const response = await fetch(`/api/v1/jobs/${jobId}/status`);
    if (!response.ok) return null;
    return (await response.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function consumeGenerateStream(
  body: Record<string, unknown>,
  onEvent: (event: string, data: Record<string, unknown>) => void,
  url: string = "/api/v1/generate",
): Promise<{ lastJobId: string | null }> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Generation failed (${response.status})`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response stream");

  const decoder = new TextDecoder();
  let buffer = "";
  let currentEvent = "message";
  let currentData = "";
  let lastJobId: string | null = null;

  const dispatch = () => {
    if (!currentData) return;
    try {
      const parsed = JSON.parse(currentData) as Record<string, unknown>;
      const jid = parsed.job_id ?? parsed.jobId;
      if (jid) lastJobId = String(jid);
      onEvent(currentEvent, parsed);
    } catch {
      onEvent(currentEvent, { status: currentData });
    }
    currentEvent = "message";
    currentData = "";
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      dispatch();
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const rawLine of lines) {
      const line = rawLine.replace(/\r$/, "");
      if (line.startsWith("event:")) {
        if (currentData) dispatch();
        currentEvent = line.slice(6).trim();
      } else if (line.startsWith("data:")) {
        const chunk = line.slice(5).trimStart();
        currentData = currentData ? `${currentData}\n${chunk}` : chunk;
      } else if (line === "") {
        dispatch();
      }
    }
  }
  return { lastJobId };
}

type OutlineSlide = {
  order?: number;
  slide_index?: number;
  element: string;
  title?: string;
  purpose?: string;
  summary?: string;
  key_points?: string[];
  speaker_notes?: string;
  section_marker?: string;
  source_hint?: string;
};

function outlineSlideOrder(slide: OutlineSlide, index: number): number {
  return slide.order ?? slide.slide_index ?? index + 1;
}

type PlanningContext = {
  deck_type?: string;
  geo?: string;
  slide_count?: number;
  documents?: string[];
  document_chars?: number;
  used_llm?: boolean;
};

type ChatMsg = {
  id: string;
  role: "agent" | "user";
  text: string;
  outline?: OutlineSlide[];
  at: string;
};

function formatOutlineForChat(outline: OutlineSlide[], ctx?: PlanningContext | null): string {
  const deckLabel = ctx?.deck_type?.replace(/_/g, " ") ?? "deck";
  const geoLabel = ctx?.geo ? ` for ${ctx.geo}` : "";
  const docNote = (ctx?.documents?.length ?? 0) > 0
    ? ` (sources: ${ctx!.documents!.join(", ")})`
    : "";
  const header = `Here's my plan for your ${outline.length}-slide ${deckLabel}${geoLabel}${docNote}:\n`;
  const slides = outline.map((s, i) => {
    const num = String(outlineSlideOrder(s, i)).padStart(2, "0");
    const title = s.title || s.element.replace(/-/g, " ").toUpperCase();
    const body = s.summary || s.purpose || "(no description)";
    const bullets = (s.key_points?.length ?? 0) > 0
      ? `\n   ${s.key_points!.map(p => `• ${p}`).join("\n   ")}`
      : "";
    const hint = s.source_hint ? `\n   📎 ${s.source_hint.slice(0, 90)}` : "";
    return `  ${num} · ${title}\n   ${body}${bullets}${hint}`;
  }).join("\n\n");
  return `${header}\n${slides}\n\n💬 What would you like to change? Or click **Approve & Build** to generate the PPTX.`;
}

/* ─── PRESENTATION CHAT ─── */
type GenerationState = "idle" | "clarifying" | "planning" | "reviewing" | "building" | "done";

type FileRole = "theme" | "reference";

type FileChip = {
  id: string;
  file: File;
  name: string;
  uploadId?: string;
  paths?: string[];
  role: FileRole;
  uploadState: "uploading" | "done" | "error";
};

type ChatMsgType =
  | "user"
  | "ai-text"
  | "ai-thinking"
  | "ai-clarification"
  | "ai-comprehension"
  | "ai-outline"
  | "ai-error"
  | "ai-done";

type ComprehensionData = {
  deck_mode: "baseline" | "localise" | "fresh";
  summary: string;
  geo_context: string;
  document_ref: string;
  audience: string;
  gaps: string[];
  template_filename?: string;
};

type PresentationChatMsg = {
  id: string;
  type: ChatMsgType;
  text?: string;
  comprehension?: ComprehensionData;
  outline?: OutlineSlide[];
  attachments?: { name: string; role: FileRole }[];
  at: string;
};

function createWelcomeChatMsg(): PresentationChatMsg {
  return {
    id: "welcome",
    type: "ai-text",
    text: "Hi! Describe the presentation you need and I'll plan it for you. You can attach a PPTX template or reference document using the paperclip below.",
    at: formatLogTime(),
  };
}

type SlideCard = {
  index: number;
  title: string;
};

function slideIndexFromEvent(data: Record<string, unknown>, prevLength: number): number {
  const raw = data.slide_index;
  if (typeof raw === "number" && !Number.isNaN(raw)) return raw;
  if (typeof raw === "string" && raw.trim() !== "") {
    const parsed = Number(raw);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return prevLength + 1;
}

type PendingContext = {
  geo: string;
  language: string;
  topic: string;
};

const REGION_CHIPS: { code: string; label: string; flag: string; language: string }[] = [
  { code: "de", label: "Germany", flag: "🇩🇪", language: "de" },
  { code: "fr", label: "France", flag: "🇫🇷", language: "fr" },
  { code: "uk", label: "UK", flag: "🇬🇧", language: "en" },
  { code: "es", label: "Spain", flag: "🇪🇸", language: "es" },
  { code: "apac", label: "APAC", flag: "🌏", language: "en" },
];

const LANG_CHIPS: { code: string; label: string; flag: string }[] = [
  { code: "en", label: "EN", flag: "🇺🇸" },
  { code: "de", label: "DE", flag: "🇩🇪" },
  { code: "fr", label: "FR", flag: "🇫🇷" },
  { code: "es", label: "ES", flag: "🇪🇸" },
  { code: "ja", label: "JA", flag: "🇯🇵" },
];

const GEO_KEYWORDS: Array<{ pattern: RegExp; geo: string; language: string }> = [
  { pattern: /\bgermany\b|\bgerman\b|\bdeutschland\b/i, geo: "de", language: "de" },
  { pattern: /\bfrance\b|\bfrench\b|\bfrançais\b/i, geo: "fr", language: "fr" },
  { pattern: /\buk\b|\bunited kingdom\b|\bbritain\b/i, geo: "uk", language: "en" },
  { pattern: /\bspain\b|\bspanish\b|\bespaña\b/i, geo: "es", language: "es" },
  { pattern: /\bitaly\b|\bitalian\b/i, geo: "it", language: "it" },
  { pattern: /\bnetherlands\b|\bdutch\b/i, geo: "nl", language: "nl" },
  { pattern: /\bjapan\b|\bjapanese\b/i, geo: "jp", language: "ja" },
  { pattern: /\bbrazil\b|\bportuguese\b/i, geo: "br", language: "pt-br" },
  { pattern: /\bapac\b|\basia\b/i, geo: "apac", language: "en" },
];

const GENERATE_INTENT_PATTERNS = [
  /^generate$/i,
  /^build it$/i,
  /^build slides$/i,
  /^go ahead$/i,
  /^looks good$/i,
  /^approve$/i,
];

export function inferGeoFromText(text: string): { geo: string; language: string } | null {
  for (const entry of GEO_KEYWORDS) {
    if (entry.pattern.test(text)) {
      return { geo: entry.geo, language: entry.language };
    }
  }
  return null;
}

export function isGenerateIntent(text: string): boolean {
  const trimmed = text.trim();
  return GENERATE_INTENT_PATTERNS.some(p => p.test(trimmed));
}

export function isPresentationRequest(text: string): boolean {
  const lower = text.toLowerCase().trim();
  // Too short to be a real request
  if (lower.split(/\s+/).length < 4) return false;
  // Greetings / filler
  const greetings = ["hi", "hello", "hey", "howdy", "yo", "sup", "test", "testing"];
  if (greetings.includes(lower)) return false;
  // Must contain at least one presentation-related keyword
  const keywords = [
    "presentation", "deck", "slide", "ppt", "pptx", "pitch",
    "create", "build", "generate", "make", "want", "need",
    "customer", "client", "topic", "about", "for", "show",
  ];
  return keywords.some(k => lower.includes(k));
}

function defaultRoleForFile(name: string): FileRole {
  return name.toLowerCase().endsWith(".pptx") ? "theme" : "reference";
}

function isPptx(name: string): boolean {
  return name.toLowerCase().endsWith(".pptx");
}

function FileRoleChip({
  chip,
  onRemove,
  onRoleChange,
}: {
  chip: FileChip;
  onRemove: (id: string) => void;
  onRoleChange: (id: string, role: FileRole) => void;
}) {
  const pptx = isPptx(chip.name);

  return (
    <div
      data-testid={`file-chip-${chip.name}`}
      className="flex items-center gap-2 text-xs bg-[var(--rh-charcoal)] border border-[var(--rh-charcoal-light)] rounded px-3 py-1.5"
    >
      <FileText className="w-3 h-3 text-[var(--rh-blue)] shrink-0" />
      <span className="truncate text-[var(--rh-silver)] max-w-[140px]">{chip.name}</span>
      {chip.uploadState === "uploading" && <Loader2 className="w-3 h-3 animate-spin text-[var(--rh-blue)]" />}
      {chip.uploadState === "done" && <CheckCircle2 className="w-3 h-3 text-[var(--rh-green)]" />}
      {chip.uploadState === "error" && <span className="text-[var(--rh-red)]">!</span>}
      {pptx ? (
        <button
          type="button"
          data-testid={`file-role-toggle-${chip.name}`}
          onClick={() => onRoleChange(chip.id, chip.role === "theme" ? "reference" : "theme")}
          className="text-[10px] px-2 py-0.5 rounded bg-[var(--rh-charcoal-mid)] border border-[var(--rh-charcoal-light)] text-[var(--rh-blue)] hover:border-[var(--rh-blue)]/40"
        >
          {chip.role === "theme" ? "Theme template ▾" : "Reference doc"}
        </button>
      ) : (
        <span className="text-[10px] text-[var(--rh-silver)]">Reference</span>
      )}
      <button
        type="button"
        onClick={() => onRemove(chip.id)}
        className="text-[var(--rh-silver)] hover:text-[var(--rh-red)] ml-auto"
        aria-label={`Remove ${chip.name}`}
      >
        ✕
      </button>
    </div>
  );
}

function ClarificationCard({
  selectedLang,
  onRegionSelect,
  onLanguageSelect,
}: {
  selectedLang?: string;
  onRegionSelect: (geo: string, language: string) => void;
  onLanguageSelect: (language: string) => void;
}) {
  return (
    <div
      data-testid="clarification-card"
      className="bg-[var(--rh-charcoal-mid)] border border-[var(--rh-charcoal-light)] rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-[var(--rh-silver)] max-w-[90%]"
    >
      <p className="mb-3">Before I start planning, which region is this presentation for?</p>
      <div className="flex flex-wrap gap-2 mb-3">
        {REGION_CHIPS.map(r => (
          <button
            key={r.code}
            type="button"
            data-testid={`region-chip-${r.code}`}
            onClick={() => onRegionSelect(r.code, selectedLang ?? r.language)}
            className="text-xs px-3 py-1.5 rounded-full border border-[var(--rh-charcoal-light)] bg-[var(--rh-charcoal)] hover:border-[var(--rh-blue)]/50 text-white"
          >
            {r.flag} {r.label}
          </button>
        ))}
      </div>
      <p className="text-[10px] uppercase tracking-wider text-[var(--rh-silver)] mb-2">Language override (optional)</p>
      <div className="flex flex-wrap gap-2">
        {LANG_CHIPS.map(l => (
          <button
            key={l.code}
            type="button"
            data-testid={`lang-chip-${l.code}`}
            onClick={() => onLanguageSelect(l.code)}
            className={`text-xs px-2.5 py-1 rounded-full border ${
              selectedLang === l.code
                ? "border-[var(--rh-blue)] bg-[var(--rh-blue)]/15 text-white"
                : "border-[var(--rh-charcoal-light)] bg-[var(--rh-charcoal)] text-[var(--rh-silver)]"
            }`}
          >
            {l.flag} {l.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function ComprehensionCard({
  comprehension,
  gapsDismissed,
  onDismissGaps,
}: {
  comprehension: ComprehensionData;
  gapsDismissed: boolean;
  onDismissGaps: () => void;
}) {
  const modeStyles = {
    baseline: { icon: "🎨", accent: "var(--rh-blue)" },
    localise: { icon: "🌍", accent: "var(--rh-indigo, #6366f1)" },
    fresh: { icon: "✨", accent: "var(--rh-red)" },
  }[comprehension.deck_mode];

  return (
    <div
      data-testid="comprehension-card"
      className="bg-[var(--rh-charcoal-mid)] border border-[var(--rh-charcoal-light)] rounded-2xl rounded-tl-sm px-4 py-3 text-sm max-w-[90%]"
      style={{ borderLeftColor: modeStyles.accent, borderLeftWidth: 3 }}
    >
      <p className="font-medium text-white mb-2">
        <span className="mr-2">{modeStyles.icon}</span>
        Understanding your request
      </p>
      <p className="text-[var(--rh-silver)] whitespace-pre-wrap">{comprehension.summary}</p>
      {comprehension.deck_mode === "baseline" && comprehension.template_filename && (
        <span
          data-testid="template-locked-pill"
          className="inline-flex mt-3 text-[10px] px-2 py-1 rounded-full bg-[var(--rh-blue)]/10 text-[var(--rh-blue)] border border-[var(--rh-blue)]/20"
        >
          🔒 Template locked: {comprehension.template_filename}
        </span>
      )}
      {!gapsDismissed && comprehension.gaps.length > 0 && (
        <div
          data-testid="gaps-nudge"
          className="mt-3 flex items-start gap-2 text-xs text-[var(--rh-silver)] bg-[var(--rh-charcoal)]/80 rounded-lg px-3 py-2"
        >
          <span className="flex-1">
            💡 You could also tell me: {comprehension.gaps.join(", ")}
          </span>
          <button type="button" onClick={onDismissGaps} className="text-[var(--rh-silver)] hover:text-white shrink-0">
            ✕
          </button>
        </div>
      )}
    </div>
  );
}

function DeckTypeMenu({ onSelect }: { onSelect: (entry: DeckTypeEntry) => void }) {
  const [open, setOpen] = useState(false);

  const handleSelect = (entry: DeckTypeEntry) => {
    setOpen(false);
    onSelect(entry);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          data-testid="deck-type-menu-btn"
          className="shrink-0 p-2 rounded-lg border border-[var(--rh-charcoal-light)] text-[var(--rh-silver)] hover:border-[var(--rh-blue)]/40 hover:text-[var(--rh-blue)]"
          aria-label="Choose presentation type"
        >
          <LayoutGrid className="w-4 h-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="start"
        sideOffset={8}
        className="w-[420px] p-0 bg-[var(--rh-charcoal-mid)] border-[var(--rh-charcoal-light)] text-white"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--rh-charcoal-light)]">
          <p className="text-sm font-medium">Choose a presentation type</p>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-[var(--rh-silver)] hover:text-white"
            aria-label="Close menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2 p-3">
          {DECK_TYPES.map(entry => (
            <button
              key={entry.id}
              type="button"
              data-testid={`deck-type-card-${entry.id}`}
              onClick={() => handleSelect(entry)}
              className="text-left rounded-lg border border-[var(--rh-charcoal-light)] bg-[var(--rh-charcoal)] px-3 py-2.5 hover:border-[var(--rh-blue)]/50 hover:bg-[var(--rh-charcoal-mid)] transition-colors"
            >
              <p className="text-sm font-medium text-white">
                {entry.icon} {entry.label}
              </p>
              <p className="text-[11px] text-[var(--rh-silver)] mt-1 line-clamp-2">{entry.description}</p>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function DeckTypeQuickStartChips({ onSelect }: { onSelect: (entry: DeckTypeEntry) => void }) {
  return (
    <div className="flex justify-start max-w-[90%]">
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
        {DECK_TYPES.map(entry => (
          <button
            key={entry.id}
            type="button"
            data-testid={`deck-type-chip-${entry.id}`}
            onClick={() => onSelect(entry)}
            className="shrink-0 text-xs px-3 py-1.5 rounded-full border border-[var(--rh-charcoal-light)] bg-[var(--rh-charcoal)] text-white hover:border-[var(--rh-blue)]/50 whitespace-nowrap"
          >
            {entry.icon} {entry.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function OutlineSlideItem({ slide, index }: { slide: OutlineSlide; index: number }) {
  const order = outlineSlideOrder(slide, index);
  const [expanded, setExpanded] = useState(index < 2);
  const hasKeyPoints = (slide.key_points?.length ?? 0) > 0;
  const displayTitle = slide.title || slide.element.replace(/-/g, " ");

  return (
    <li
      data-testid={`outline-slide-${index}`}
      className="rounded-lg border border-[var(--rh-charcoal-light)] bg-[var(--rh-charcoal)]/50 p-3"
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--rh-charcoal-mid)] text-[var(--rh-silver)]">
            Slide {order}
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full border border-[var(--rh-charcoal-light)] text-[var(--rh-silver)]">
            {slide.element.replace(/-/g, " ")}
          </span>
        </div>
        {hasKeyPoints && (
          <button
            type="button"
            onClick={() => setExpanded(v => !v)}
            className="shrink-0 p-1 text-[var(--rh-silver)] hover:text-white"
            aria-label={expanded ? "Collapse slide details" : "Expand slide details"}
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        )}
      </div>
      <p className="font-semibold text-white text-base leading-snug">{displayTitle}</p>
      {slide.summary && (
        <p className="text-xs text-[var(--rh-silver)] mt-1 leading-relaxed">{slide.summary}</p>
      )}
      {!slide.summary && slide.purpose && (
        <p className="text-xs text-[var(--rh-silver)] mt-1 opacity-80 leading-relaxed">{slide.purpose}</p>
      )}
      {hasKeyPoints && expanded && (
        <ul className="mt-2 space-y-1 text-xs text-[var(--rh-silver)]">
          {slide.key_points!.map((point, j) => (
            <li key={j} className="flex gap-2">
              <span className="shrink-0">•</span>
              <span>{point}</span>
            </li>
          ))}
        </ul>
      )}
      {expanded && slide.speaker_notes && (
        <p className="mt-2 text-xs italic text-[var(--rh-silver)]/75 border-t border-[var(--rh-charcoal-light)] pt-2">
          🎤 {slide.speaker_notes}
        </p>
      )}
    </li>
  );
}

function OutlineCard({
  outline,
  onApprove,
  onFewer,
  onAddSection,
}: {
  outline: OutlineSlide[];
  onApprove: () => void;
  onFewer: () => void;
  onAddSection: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? outline : outline.slice(0, 5);
  const hasMore = outline.length > 5;

  return (
    <div
      data-testid="outline-card"
      className="bg-[var(--rh-charcoal-mid)] border border-[var(--rh-charcoal-light)] rounded-2xl rounded-tl-sm px-4 py-3 text-sm max-w-[90%]"
    >
      <p className="font-medium text-white mb-3">Proposed outline ({outline.length} slides)</p>
      <ol className="space-y-2 mb-3">
        {visible.map((slide, i) => (
          <OutlineSlideItem key={outlineSlideOrder(slide, i)} slide={slide} index={i} />
        ))}
      </ol>
      {hasMore && !expanded && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="text-xs text-[var(--rh-blue)] mb-3 hover:underline"
        >
          Show all {outline.length} slides
        </button>
      )}
      <div className="flex flex-wrap gap-2 pt-2 border-t border-[var(--rh-charcoal-light)]">
        <button
          type="button"
          data-testid="chip-generate"
          onClick={onApprove}
          className="text-xs px-3 py-1.5 rounded-full bg-[var(--rh-red)]/20 text-[var(--rh-red)] border border-[var(--rh-red)]/30 hover:bg-[var(--rh-red)]/30"
        >
          Generate slides ✓
        </button>
        <button
          type="button"
          data-testid="chip-fewer"
          onClick={onFewer}
          className="text-xs px-3 py-1.5 rounded-full border border-[var(--rh-charcoal-light)] text-[var(--rh-silver)] hover:border-[var(--rh-silver)]"
        >
          Fewer slides
        </button>
        <button
          type="button"
          data-testid="chip-add-section"
          onClick={onAddSection}
          className="text-xs px-3 py-1.5 rounded-full border border-[var(--rh-charcoal-light)] text-[var(--rh-silver)] hover:border-[var(--rh-silver)]"
        >
          Add a section
        </button>
      </div>
    </div>
  );
}

function ChatComposer({
  generationState,
  value,
  onChange,
  onSend,
  fileInputRef,
  onAttachClick,
  onFilesSelected,
  fileChips,
  onRemoveChip,
  onRoleChange,
  composerRef,
  onDeckTypeSelect,
}: {
  generationState: GenerationState;
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onAttachClick: () => void;
  onFilesSelected: (files: File[]) => void;
  fileChips: FileChip[];
  onRemoveChip: (id: string) => void;
  onRoleChange: (id: string, role: FileRole) => void;
  composerRef: React.RefObject<HTMLTextAreaElement | null>;
  onDeckTypeSelect: (entry: DeckTypeEntry) => void;
}) {
  const disabled = generationState === "planning" || generationState === "building";

  const sendLabel =
    generationState === "idle"
      ? "Plan my presentation"
      : generationState === "reviewing"
        ? "Refine"
        : "Send";

  useEffect(() => {
    const el = composerRef.current;
    if (!el) return;
    el.style.height = "auto";
    const lineHeight = 24;
    const maxRows = 5;
    const rows = Math.min(maxRows, Math.max(1, Math.ceil(el.scrollHeight / lineHeight)));
    el.style.height = `${rows * lineHeight}px`;
  }, [value, composerRef]);

  return (
    <div className={`shrink-0 space-y-2 ${disabled ? "pointer-events-none opacity-50" : ""}`}>
      {fileChips.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {fileChips.map(chip => (
            <FileRoleChip key={chip.id} chip={chip} onRemove={onRemoveChip} onRoleChange={onRoleChange} />
          ))}
        </div>
      )}
      <div className="flex gap-2 items-end">
        <button
          type="button"
          data-testid="composer-attach"
          onClick={onAttachClick}
          className="shrink-0 p-2 rounded-lg border border-[var(--rh-charcoal-light)] text-[var(--rh-silver)] hover:border-[var(--rh-blue)]/40 hover:text-[var(--rh-blue)]"
          aria-label="Attach files"
        >
          <Paperclip className="w-4 h-4" />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.docx,.pptx"
          className="hidden"
          onChange={e => {
            const files = Array.from(e.target.files || []);
            if (files.length > 0) onFilesSelected(files);
            e.target.value = "";
          }}
        />
        <DeckTypeMenu onSelect={onDeckTypeSelect} />
        <Textarea
          ref={composerRef}
          data-testid="composer-input"
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
          placeholder="Describe your presentation…"
          rows={1}
          className={`flex-1 min-h-[24px] max-h-[120px] resize-none bg-[var(--rh-charcoal)] border-[var(--rh-charcoal-light)] focus-visible:ring-[var(--rh-red)] ${
            disabled ? "pointer-events-none" : ""
          }`}
        />
        <Button
          type="button"
          data-testid="composer-send"
          onClick={onSend}
          disabled={disabled || !value.trim()}
          className="shrink-0 bg-[var(--rh-red)] hover:bg-[var(--rh-red-dark)] h-10 px-4 text-xs font-bold"
        >
          {sendLabel}
        </Button>
      </div>
    </div>
  );
}

function SlideProgressPanel({
  generationState,
  outline,
  slideCards,
  comprehension,
  deckPreviewUrl,
  deckDownloadUrl,
  deckPath,
  deckFilename,
  fallbackTitle,
  fallbackSubtitle,
  outputLang,
}: {
  generationState: GenerationState;
  outline: OutlineSlide[];
  slideCards: SlideCard[];
  comprehension: ComprehensionData | null;
  deckPreviewUrl: string | null;
  deckDownloadUrl: string | null;
  deckPath: string | null;
  deckFilename: string | null;
  fallbackTitle: string;
  fallbackSubtitle: string;
  outputLang: OutputLang;
}) {
  const langMeta = OUTPUT_LANGS.find(l => l.value === outputLang)!;
  const previewState = generationState === "clarifying" ? "clarifying" : generationState;
  const templateLocked =
    comprehension?.deck_mode === "baseline" && comprehension.template_filename;

  return (
    <div
      data-testid="preview-panel"
      className="flex-1 h-full overflow-hidden bg-[var(--rh-charcoal)] p-4 flex flex-col relative"
    >
      <div className="w-full mb-4 shrink-0 flex flex-wrap items-center gap-2">
        {generationState === "reviewing" && (
          <Badge className="bg-[var(--rh-blue)]/20 text-[var(--rh-blue)] border-0 text-[10px]">
            Reviewing outline
          </Badge>
        )}
        {generationState === "building" && (
          <Badge className="bg-[var(--rh-red)]/20 text-[var(--rh-red)] border-0 text-[10px]">
            Building — {slideCards.length}/{outline.length || slideCards.length || "?"} slides
          </Badge>
        )}
        {templateLocked && (
          <span
            data-testid="template-locked-pill"
            className="text-[10px] px-2 py-1 rounded-full bg-[var(--rh-blue)]/10 text-[var(--rh-blue)] border border-[var(--rh-blue)]/20"
          >
            🔒 Template locked: {comprehension!.template_filename}
          </span>
        )}
      </div>

      <div className="flex-1 flex flex-col min-h-0" data-testid={`preview-state-${previewState}`}>
        {(generationState === "idle" || previewState === "idle") && generationState === "idle" && (
          <div className="flex-1 flex flex-col items-center justify-center text-center text-[var(--rh-silver)] gap-4">
            <div className="w-16 h-16 rounded-full bg-[var(--rh-charcoal-mid)] flex items-center justify-center">
              <Sparkles className="w-8 h-8 opacity-50" />
            </div>
            <p>Your preview will appear here</p>
          </div>
        )}

        {(generationState === "planning" || generationState === "clarifying") && (
          <div className="flex-1 flex flex-col justify-center gap-3 px-4 max-w-md mx-auto w-full">
            {[0, 1, 2, 3].map(i => (
              <div
                key={i}
                className="h-4 rounded bg-[var(--rh-charcoal-mid)] animate-pulse"
                style={{ width: `${85 - i * 12}%` }}
              />
            ))}
          </div>
        )}

        {generationState === "reviewing" && (
          <div className="flex-1 overflow-y-auto">
            <ol className="space-y-2 text-sm">
              {outline.map((slide, i) => {
                const order = outlineSlideOrder(slide, i);
                const title = slide.title || slide.element.replace(/-/g, " ");
                const firstPoint = slide.key_points?.[0];
                return (
                  <li
                    key={slide.slide_index ?? slide.order ?? i}
                    className="rounded-lg border border-[var(--rh-charcoal-light)] bg-[var(--rh-charcoal-mid)] p-3"
                  >
                    <div className="flex gap-2">
                      <span className="text-white font-bold w-6 shrink-0">{order}.</span>
                      <div className="min-w-0">
                        <p className="text-white font-medium truncate">{title}</p>
                        {firstPoint && (
                          <p className="text-xs text-[var(--rh-silver)] mt-0.5 line-clamp-2">• {firstPoint}</p>
                        )}
                        {!firstPoint && slide.summary && (
                          <p className="text-xs text-[var(--rh-silver)] mt-0.5 line-clamp-2">{slide.summary}</p>
                        )}
                        {!firstPoint && !slide.summary && slide.purpose && (
                          <p className="text-xs text-[var(--rh-silver)] mt-0.5 opacity-70 line-clamp-2">{slide.purpose}</p>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        )}

        {(generationState === "building" || generationState === "done") && slideCards.length > 0 && (
          <div
            className={
              generationState === "building"
                ? "flex-1 overflow-y-auto grid grid-cols-2 gap-3 content-start"
                : "grid grid-cols-3 gap-2 mb-4 shrink-0"
            }
          >
            {slideCards.map((card, i) => (
              <div
                key={card.index}
                data-testid={`slide-card-${i}`}
                className="rounded-lg border border-[var(--rh-charcoal-light)] bg-[var(--rh-charcoal-mid)] p-4 min-h-[100px]"
              >
                <span className="text-[10px] text-[var(--rh-silver)]">Slide {card.index}</span>
                <p className="text-sm font-medium text-white mt-1 truncate">{card.title}</p>
              </div>
            ))}
          </div>
        )}

        {generationState === "done" && (
          <div className="flex-1 flex flex-col min-h-0 animate-in fade-in duration-500">
            <div className="flex items-center justify-between mb-4 shrink-0">
              <h3 className="font-bold">Preview</h3>
              <div className="flex items-center gap-2">
                <Badge className="bg-[var(--rh-green)]/20 text-[var(--rh-green)] border-0 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Ready
                </Badge>
                {(deckDownloadUrl || deckPath) && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-[var(--rh-green)]/40 text-[var(--rh-green)] h-7"
                    data-testid="deck-download"
                    asChild
                  >
                    <a
                      href={deckDownloadUrl ?? `/api/v1/download?path=${encodeURIComponent(deckPath!)}`}
                      download
                    >
                      <Download className="w-3 h-3 mr-1" /> Download PPTX
                    </a>
                  </Button>
                )}
              </div>
            </div>
            {outputLang !== "en" && (
              <div className="flex items-center gap-1.5 mb-3 px-1 text-xs text-[var(--rh-blue)] shrink-0">
                <Languages className="w-3.5 h-3.5" />
                Output localized in {langMeta.flag} {langMeta.label}
              </div>
            )}
            <DeckPreviewPanel
              previewUrl={deckPreviewUrl}
              downloadUrl={deckDownloadUrl ?? (deckPath ? `/api/v1/download?path=${encodeURIComponent(deckPath)}` : null)}
              filename={deckFilename}
              fallbackTitle={fallbackTitle}
              fallbackSubtitle={fallbackSubtitle}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function PresentationChat({ outputLang }: { outputLang: OutputLang }) {
  const [generationState, setGenerationState] = useState<GenerationState>("idle");
  const [composerText, setComposerText] = useState("");
  const [fileChips, setFileChips] = useState<FileChip[]>([]);
  const [chatMsgs, setChatMsgs] = useState<PresentationChatMsg[]>(() => [createWelcomeChatMsg()]);
  const [pendingContext, setPendingContext] = useState<PendingContext | null>(null);
  const [clarifyLang, setClarifyLang] = useState<string | undefined>();
  const [jobId, setJobId] = useState<string | null>(null);
  const [outline, setOutline] = useState<OutlineSlide[]>([]);
  const [comprehension, setComprehension] = useState<ComprehensionData | null>(null);
  const [gapsDismissed, setGapsDismissed] = useState(false);
  const [slideCards, setSlideCards] = useState<SlideCard[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [deckPath, setDeckPath] = useState<string | null>(null);
  const [deckDownloadUrl, setDeckDownloadUrl] = useState<string | null>(null);
  const [deckPreviewUrl, setDeckPreviewUrl] = useState<string | null>(null);
  const [deckFilename, setDeckFilename] = useState<string | null>(null);
  const [selectedDeckType, setSelectedDeckType] = useState<string | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const slide = SLIDE_CONTENT[outputLang] ?? SLIDE_CONTENT["en"];

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMsgs, isThinking]);

  const resetAll = () => {
    setGenerationState("idle");
    setComposerText("");
    setFileChips([]);
    setChatMsgs([createWelcomeChatMsg()]);
    setPendingContext(null);
    setClarifyLang(undefined);
    setJobId(null);
    setOutline([]);
    setComprehension(null);
    setGapsDismissed(false);
    setSlideCards([]);
    setIsThinking(false);
    setDeckPath(null);
    setDeckDownloadUrl(null);
    setDeckPreviewUrl(null);
    setDeckFilename(null);
    setSelectedDeckType(null);
  };

  const handleDeckTypeSelect = (entry: DeckTypeEntry) => {
    setComposerText(entry.templatePrompt);
    setSelectedDeckType(entry.deckType);
    requestAnimationFrame(() => composerRef.current?.focus());
  };

  const addUserMessage = (text: string, attachments?: { name: string; role: FileRole }[]) => {
    setChatMsgs(prev => [
      ...prev,
      {
        id: `user-${Date.now()}`,
        type: "user",
        text,
        attachments,
        at: formatLogTime(),
      },
    ]);
  };

  const uploadFiles = async (files: File[]) => {
    for (const file of files) {
      const id = `chip-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const role = defaultRoleForFile(file.name);
      setFileChips(prev => {
        let next = [...prev, { id, file, name: file.name, role, uploadState: "uploading" as const }];
        if (role === "theme") {
          next = next.map(c =>
            c.id !== id && c.role === "theme" && isPptx(c.name) ? { ...c, role: "reference" as const } : c,
          );
        }
        return next;
      });

      const formData = new FormData();
      formData.append("files", file);
      try {
        const response = await fetch("/api/v1/upload", { method: "POST", body: formData });
        if (!response.ok) throw new Error("Upload failed");
        const result = await response.json() as { upload_id?: string; paths?: string[] };
        setFileChips(prev =>
          prev.map(c =>
            c.id === id
              ? {
                  ...c,
                  uploadState: "done",
                  uploadId: result.upload_id,
                  paths: result.paths,
                }
              : c,
          ),
        );
      } catch {
        setFileChips(prev => prev.map(c => (c.id === id ? { ...c, uploadState: "error" } : c)));
      }
    }
  };

  const handleRoleChange = (id: string, role: FileRole) => {
    setFileChips(prev => {
      let next = prev.map(c => (c.id === id ? { ...c, role } : c));
      if (role === "theme") {
        next = next.map(c =>
          c.id !== id && c.role === "theme" && isPptx(c.name) ? { ...c, role: "reference" } : c,
        );
      }
      return next;
    });
  };

  const buildGeneratePayload = (ctx: PendingContext) => {
    const themeChip = fileChips.find(c => c.role === "theme" && c.uploadState === "done");
    const referencePaths = fileChips
      .filter(c => c.role === "reference" && c.paths?.length)
      .flatMap(c => c.paths!);

    return {
      topic: ctx.topic,
      geo: ctx.geo ?? "",
      language: ctx.language ?? "",
      source_documents: referencePaths,
      template_id: themeChip?.uploadId ?? "default",
      deck_type: selectedDeckType ?? "competitive",
    };
  };

  const runGenerate = async (ctx: PendingContext) => {
    setGenerationState("planning");
    setIsThinking(true);
    setOutline([]);
    setJobId(null);
    setSlideCards([]);
    setDeckPath(null);
    setDeckDownloadUrl(null);
    setDeckPreviewUrl(null);
    setDeckFilename(null);
    setGapsDismissed(false);

    const payload = buildGeneratePayload(ctx);

    try {
      let outlineReceived = false;
      const { lastJobId } = await consumeGenerateStream(payload, (event, data) => {
        if (event === "progress" || event === "heartbeat") {
          return;
        }
        if (event === "comprehension") {
          const comp = data as unknown as ComprehensionData;
          if (data.deck_mode) {
            setComprehension(comp);
            setChatMsgs(prev => [
              ...prev.filter(m => m.type !== "ai-thinking"),
              {
                id: `comp-${Date.now()}`,
                type: "ai-comprehension",
                comprehension: comp,
                at: formatLogTime(),
              },
            ]);
          }
          return;
        }
        if (event === "outline_ready") {
          outlineReceived = true;
          const outlineData = Array.isArray(data.outline) ? (data.outline as OutlineSlide[]) : [];
          const id = data.job_id ?? data.jobId;
          if (id) setJobId(String(id));
          setOutline(outlineData);
          setGenerationState("reviewing");
          setIsThinking(false);
          setChatMsgs(prev => [
            ...prev.filter(m => m.type !== "ai-thinking"),
            {
              id: `outline-${Date.now()}`,
              type: "ai-outline",
              outline: outlineData,
              at: formatLogTime(),
            },
          ]);
          return;
        }
        if (event === "completed") {
          if (data.status === "failed" || data.error) {
            setIsThinking(false);
            setGenerationState("idle");
            setChatMsgs(prev => [
              ...prev.filter(m => m.type !== "ai-thinking"),
              {
                id: `err-${Date.now()}`,
                type: "ai-error",
                text: String(data.error ?? "Generation failed"),
                at: formatLogTime(),
              },
            ]);
          }
        }
      });

      if (!outlineReceived && lastJobId) {
        const job = await fetchJobOutline(lastJobId);
        if (job && Array.isArray(job.outline) && (job.outline as unknown[]).length > 0) {
          setJobId(lastJobId);
          setOutline(job.outline as OutlineSlide[]);
          setGenerationState("reviewing");
          setIsThinking(false);
        }
      }
    } catch (err) {
      setIsThinking(false);
      setGenerationState("idle");
      const msg = err instanceof Error ? err.message : "Generation failed";
      setChatMsgs(prev => [
        ...prev.filter(m => m.type !== "ai-thinking"),
        { id: `err-${Date.now()}`, type: "ai-error", text: msg, at: formatLogTime() },
      ]);
    }
  };

  const runApprove = async () => {
    if (!jobId) return;
    setGenerationState("building");
    setSlideCards([]);
    setIsThinking(true);

    try {
      await consumeGenerateStream(
        {},
        (event, data) => {
          if (event === "slide_spec") {
            setSlideCards(prev => {
              const idx = slideIndexFromEvent(data, prev.length);
              const title = String(data.title ?? data.element ?? `Slide ${idx}`);
              if (prev.some(s => s.index === idx)) return prev;
              return [...prev, { index: idx, title }];
            });
            return;
          }
          if (event === "deck_ready") {
            const path = String(data.path ?? "");
            const downloadUrl = String(
              data.download_url ?? (path ? `/api/v1/download?path=${encodeURIComponent(path)}` : ""),
            );
            const filename = String(data.filename ?? path.split("/").pop() ?? "deck.pptx");
            const previewUrl = String(
              data.preview_url ?? (filename ? `/office/preview/${encodeURIComponent(filename)}?embed=1` : ""),
            );
            if (path) setDeckPath(path);
            if (downloadUrl) setDeckDownloadUrl(downloadUrl);
            if (previewUrl) setDeckPreviewUrl(previewUrl);
            setDeckFilename(filename);
            setGenerationState("done");
            setIsThinking(false);
            setChatMsgs(prev => [
              ...prev,
              {
                id: `done-${Date.now()}`,
                type: "ai-done",
                text: "Your presentation is ready!",
                at: formatLogTime(),
              },
            ]);
            return;
          }
          if (event === "completed" && (data.status === "failed" || data.error)) {
            setIsThinking(false);
            setGenerationState("reviewing");
            setChatMsgs(prev => [
              ...prev,
              {
                id: `err-${Date.now()}`,
                type: "ai-error",
                text: String(data.error ?? "Build failed"),
                at: formatLogTime(),
              },
            ]);
          }
        },
        `/api/v1/generate/${jobId}/approve`,
      );
    } catch (err) {
      setIsThinking(false);
      setGenerationState("reviewing");
      const msg = err instanceof Error ? err.message : "Build failed";
      setChatMsgs(prev => [
        ...prev,
        { id: `err-${Date.now()}`, type: "ai-error", text: msg, at: formatLogTime() },
      ]);
    }
  };

  const runRefine = async (instruction: string) => {
    if (!jobId) return;
    setIsThinking(true);
    try {
      const resp = await fetch(`/api/v1/generate/${jobId}/refine`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instruction }),
      });
      if (!resp.ok) throw new Error(await resp.text());
      const result = await resp.json() as { outline: OutlineSlide[] };
      setOutline(result.outline);
      setChatMsgs(prev => [
        ...prev.filter(m => m.type !== "ai-thinking"),
        {
          id: `outline-${Date.now()}`,
          type: "ai-outline",
          outline: result.outline,
          at: formatLogTime(),
        },
      ]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Refinement failed";
      setChatMsgs(prev => [
        ...prev.filter(m => m.type !== "ai-thinking"),
        { id: `err-${Date.now()}`, type: "ai-error", text: msg, at: formatLogTime() },
      ]);
    } finally {
      setIsThinking(false);
    }
  };

  const handleSend = () => {
    const text = composerText.trim();
    if (!text) return;

    if (generationState === "reviewing" && isGenerateIntent(text)) {
      addUserMessage(text);
      setComposerText("");
      void runApprove();
      return;
    }

    if (generationState === "reviewing" && jobId) {
      addUserMessage(text);
      setComposerText("");
      void runRefine(text);
      return;
    }

    const attachments = fileChips
      .filter(c => c.uploadState === "done")
      .map(c => ({ name: c.name, role: c.role }));
    addUserMessage(text, attachments.length ? attachments : undefined);
    setComposerText("");
    setSelectedDeckType(null);

    if (!isPresentationRequest(text)) {
      setChatMsgs(prev => [
        ...prev,
        {
          id: `ai-greeting-${Date.now()}`,
          type: "ai-text",
          text: "Hi! I'm here to help you build presentations. Tell me what you need — describe the topic, customer, or goal and I'll take it from there. You can also attach a PPTX template or reference document.",
          at: formatLogTime(),
        },
      ]);
      return;
    }

    const inferred = inferGeoFromText(text);
    if (!inferred) {
      setPendingContext({ geo: "", language: "", topic: text });
      setGenerationState("clarifying");
      setChatMsgs(prev => [
        ...prev,
        { id: `clarify-${Date.now()}`, type: "ai-clarification", at: formatLogTime() },
      ]);
      return;
    }

    const ctx: PendingContext = { geo: inferred.geo, language: inferred.language, topic: text };
    setPendingContext(ctx);
    void runGenerate(ctx);
  };

  const handleRegionSelect = (geo: string, language: string) => {
    if (!pendingContext?.topic) return;
    const ctx: PendingContext = {
      geo,
      language: clarifyLang ?? language,
      topic: pendingContext.topic,
    };
    setPendingContext(ctx);
    setChatMsgs(prev => prev.filter(m => m.type !== "ai-clarification"));
    void runGenerate(ctx);
  };

  return (
    <div className="flex gap-0 h-full w-full">
      <div className="w-[42%] flex flex-col border-r border-[var(--rh-charcoal-light)] h-full overflow-hidden bg-[var(--rh-charcoal-mid)]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--rh-charcoal-light)] shrink-0">
          <h2 className="text-sm font-bold text-white">Presentation chat</h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            data-testid="new-presentation-btn"
            onClick={resetAll}
            className="border-[var(--rh-charcoal-light)] text-[var(--rh-silver)] h-7 text-xs"
          >
            New presentation
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0">
          {chatMsgs.map(msg => (
            <div
              key={msg.id}
              className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.type === "user" && (
                <div className="max-w-[85%] rounded-2xl rounded-tr-sm px-4 py-3 text-sm bg-[var(--rh-blue)]/15 border border-[var(--rh-blue)]/25 text-white">
                  <p>{msg.text}</p>
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {msg.attachments.map(a => (
                        <span key={a.name} className="text-[10px] px-2 py-0.5 rounded bg-[var(--rh-charcoal)]/60">
                          {a.name}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="text-[10px] text-[var(--rh-silver)]/50 mt-1.5 text-right">{msg.at}</div>
                </div>
              )}
              {msg.type === "ai-text" && msg.text && (
                <div className="flex flex-col gap-2 max-w-[90%]">
                  <div className="rounded-2xl rounded-tl-sm px-4 py-3 text-sm bg-[var(--rh-charcoal-mid)] border border-[var(--rh-charcoal-light)] text-[var(--rh-silver)]">
                    <p>{msg.text}</p>
                    <div className="text-[10px] text-[var(--rh-silver)]/50 mt-1.5">{msg.at}</div>
                  </div>
                  {msg.id === "welcome" && generationState === "idle" && (
                    <DeckTypeQuickStartChips onSelect={handleDeckTypeSelect} />
                  )}
                </div>
              )}
              {msg.type === "ai-clarification" && (
                <ClarificationCard
                  selectedLang={clarifyLang}
                  onRegionSelect={handleRegionSelect}
                  onLanguageSelect={setClarifyLang}
                />
              )}
              {msg.type === "ai-comprehension" && msg.comprehension && (
                <ComprehensionCard
                  comprehension={msg.comprehension}
                  gapsDismissed={gapsDismissed}
                  onDismissGaps={() => setGapsDismissed(true)}
                />
              )}
              {msg.type === "ai-outline" && msg.outline && (
                <OutlineCard
                  outline={msg.outline}
                  onApprove={() => void runApprove()}
                  onFewer={() => void runRefine("Make the deck shorter")}
                  onAddSection={() => composerRef.current?.focus()}
                />
              )}
              {msg.type === "ai-error" && (
                <div className="max-w-[85%] rounded-2xl rounded-tl-sm px-4 py-3 text-sm bg-[var(--rh-red)]/10 border border-[var(--rh-red)]/30 text-[var(--rh-red)]">
                  {msg.text}
                </div>
              )}
              {msg.type === "ai-done" && (
                <div className="max-w-[85%] rounded-2xl rounded-tl-sm px-4 py-3 text-sm bg-[var(--rh-green)]/10 border border-[var(--rh-green)]/30 text-[var(--rh-green)]">
                  {msg.text}
                </div>
              )}
            </div>
          ))}
          {isThinking && (
            <div className="flex justify-start">
              <div className="bg-[var(--rh-charcoal-mid)] border border-[var(--rh-charcoal-light)] rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--rh-silver)]/60 animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--rh-silver)]/60 animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--rh-silver)]/60 animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <div className="px-4 py-3 border-t border-[var(--rh-charcoal-light)] shrink-0">
          <ChatComposer
            generationState={generationState}
            value={composerText}
            onChange={setComposerText}
            onSend={handleSend}
            fileInputRef={fileInputRef}
            onAttachClick={() => fileInputRef.current?.click()}
            onFilesSelected={files => void uploadFiles(files)}
            fileChips={fileChips}
            onRemoveChip={id => setFileChips(prev => prev.filter(c => c.id !== id))}
            onRoleChange={handleRoleChange}
            composerRef={composerRef}
            onDeckTypeSelect={handleDeckTypeSelect}
          />
        </div>
      </div>

      <SlideProgressPanel
        generationState={generationState}
        outline={outline}
        slideCards={slideCards}
        comprehension={comprehension}
        deckPreviewUrl={deckPreviewUrl}
        deckDownloadUrl={deckDownloadUrl}
        deckPath={deckPath}
        deckFilename={deckFilename}
        fallbackTitle={slide.title}
        fallbackSubtitle={slide.subtitle}
        outputLang={outputLang}
      />
    </div>
  );
}
