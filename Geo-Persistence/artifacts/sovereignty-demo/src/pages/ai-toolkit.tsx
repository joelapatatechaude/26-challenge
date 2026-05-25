import { useState, useEffect, useRef } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Sparkles, Loader2, CheckCircle2, FileText, Edit3, Mail, BookOpen, Share2, Download, Languages } from "lucide-react";

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

export default function AIToolkit() {
  const [outputLang, setOutputLang] = useState<OutputLang>("en");
  const lang = OUTPUT_LANGS.find(l => l.value === outputLang)!;

  return (
    <AppLayout activePath="/ai-toolkit">
      <div className="p-6 h-full flex flex-col max-w-7xl mx-auto">

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">AI Content Toolkit</h1>
            <p className="text-sm text-[var(--rh-silver)]">Generate highly-contextualized assets tailored for your region.</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Output Language picker */}
            <div className="flex items-center gap-2 bg-[var(--rh-charcoal-mid)] border border-[var(--rh-charcoal-light)] rounded-lg px-3 py-1.5">
              <Languages className="w-3.5 h-3.5 text-[var(--rh-silver)]" />
              <span className="text-xs text-[var(--rh-silver)] font-medium">Output:</span>
              <Select value={outputLang} onValueChange={v => setOutputLang(v as OutputLang)}>
                <SelectTrigger className="h-6 border-0 bg-transparent p-0 text-xs font-bold text-white w-28 focus:ring-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[var(--rh-charcoal-mid)] border-[var(--rh-charcoal-light)] text-white">
                  {OUTPUT_LANGS.map(l => (
                    <SelectItem key={l.value} value={l.value} className="text-xs">
                      <span className="mr-1.5">{l.flag}</span>{l.label}
                      <span className="ml-2 text-[var(--rh-silver)] text-[10px]">({l.regulatory})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {outputLang !== "en" && (
              <Badge className="bg-[var(--rh-blue)]/20 text-[var(--rh-blue)] border border-[var(--rh-blue)]/30 px-2 py-1 text-[10px]">
                {lang.flag} Localized: {lang.regulatory}
              </Badge>
            )}
            <Badge className="bg-[var(--rh-charcoal-mid)] text-white border-[var(--rh-charcoal-light)] px-3 py-1 text-xs">
              Context: <span className="text-[var(--rh-blue)] ml-1 font-bold">EMEA Territory</span>
            </Badge>
          </div>
        </div>

        <Tabs defaultValue="presentation" className="flex-1 flex flex-col min-h-0">
          <TabsList className="bg-[var(--rh-charcoal-mid)] border-b border-[var(--rh-charcoal-light)] p-0 h-auto justify-start w-full rounded-none">
            <TabsTrigger value="presentation" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-[var(--rh-red)] data-[state=active]:text-white rounded-none px-6 py-3 text-[var(--rh-silver)]">Presentation Generator</TabsTrigger>
            <TabsTrigger value="asset" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-[var(--rh-red)] data-[state=active]:text-white rounded-none px-6 py-3 text-[var(--rh-silver)]">Asset Customizer</TabsTrigger>
            <TabsTrigger value="draft" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-[var(--rh-red)] data-[state=active]:text-white rounded-none px-6 py-3 text-[var(--rh-silver)]">Draft Creator</TabsTrigger>
          </TabsList>

          <TabsContent value="presentation" className="flex-1 min-h-0 mt-6 outline-none">
            <PresentationTab outputLang={outputLang} />
          </TabsContent>

          <TabsContent value="asset" className="flex-1 min-h-0 mt-6 outline-none">
            <AssetCustomizerTab outputLang={outputLang} />
          </TabsContent>

          <TabsContent value="draft" className="flex-1 min-h-0 mt-6 outline-none">
            <DraftCreatorTab outputLang={outputLang} />
          </TabsContent>
        </Tabs>
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
  slide_index: number;
  element: string;
  purpose: string;
  section_marker?: string;
  source_hint?: string;
};

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
    const num = String(i + 1).padStart(2, "0");
    const type = s.element.replace(/-/g, " ").toUpperCase();
    const purpose = s.purpose || "(no description)";
    const hint = s.source_hint ? `\n   📎 ${s.source_hint.slice(0, 90)}` : "";
    return `  ${num} · ${type}\n   ${purpose}${hint}`;
  }).join("\n\n");
  return `${header}\n${slides}\n\n💬 What would you like to change? Or click **Approve & Build** to generate the PPTX.`;
}

/* ─── PRESENTATION TAB ─── */
function PresentationTab({ outputLang }: { outputLang: OutputLang }) {
  const [topic, setTopic] = useState(
    "Deutsche Telekom | OpenShift on sovereign cloud | Data residency compliance focus. Emphasize multi-cloud flexibility and local German support.",
  );
  const [region, setRegion] = useState("de");
  const [slideCount, setSlideCount] = useState("10");
  const [phase, setPhase] = useState<"input" | "planning" | "review" | "building" | "done">("input");
  const [outline, setOutline] = useState<OutlineSlide[]>([]);
  const [jobId, setJobId] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<Array<{ name: string; path: string }>>([]);
  const [activityLog, setActivityLog] = useState<ActivityEntry[]>([]);
  const [currentStep, setCurrentStep] = useState<string | null>(null);
  const [slideProgress, setSlideProgress] = useState<string | null>(null);
  const [deckPath, setDeckPath] = useState<string | null>(null);
  const [deckDownloadUrl, setDeckDownloadUrl] = useState<string | null>(null);
  const [deckPreviewUrl, setDeckPreviewUrl] = useState<string | null>(null);
  const [deckFilename, setDeckFilename] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [extractionStatus, setExtractionStatus] = useState<"none" | "running" | "done" | "failed">("none");
  const [uploadId, setUploadId] = useState<string | null>(null);
  const [planningContext, setPlanningContext] = useState<PlanningContext | null>(null);
  const [agentBuild, setAgentBuild] = useState<string | null>(null);
  const [chatMsgs, setChatMsgs] = useState<ChatMsg[]>([]);
  const [refineInput, setRefineInput] = useState("");
  const [isRefining, setIsRefining] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const slide = SLIDE_CONTENT[outputLang] ?? SLIDE_CONTENT["en"];
  const langMeta = OUTPUT_LANGS.find(l => l.value === outputLang)!;
  const expectedSlides = outline.length > 0 ? outline.length : Number(slideCount) || 10;
  const isBusy = phase === "planning" || phase === "building";

  useEffect(() => {
    fetch("/health")
      .then(r => r.ok ? r.json() : null)
      .then((h: { agent_build?: string } | null) => {
        if (h?.agent_build) setAgentBuild(h.agent_build);
      })
      .catch(() => undefined);
  }, []);

  // Poll extraction status during review phase
  useEffect(() => {
    if (phase !== "review" || extractionStatus !== "running" || !uploadId) return;

    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/v1/jobs/${uploadId}/status`);
        if (response.ok) {
          const data = await response.json();
          const status = data.extraction_status;
          if (status === "done" || status === "failed") {
            setExtractionStatus(status);
            setActivityLog(prev => [
              ...prev,
              {
                id: `ext-${status}-${Date.now()}`,
                message: status === "done"
                  ? "✅ Template styles extracted"
                  : "⚠️ Template analysis failed — using default template",
                at: formatLogTime(),
                level: status === "done" ? "info" : "warn",
              },
            ]);
            clearInterval(interval);
          }
        }
      } catch {
        // ignore polling errors
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [phase, extractionStatus, uploadId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMsgs]);

  const [uploading, setUploading] = useState(false);

  const ingestStreamEvent = (event: string, data: Record<string, unknown>) => {
    if (event === "progress" || event === "heartbeat") {
      setActivityLog(prev => pushActivity(prev, data, event));
      if (event === "progress") {
        const status = String(data.status ?? "");
        if (status) setCurrentStep(status);
      }
      return;
    }
    if (event === "slide_spec") {
      const idx = typeof data.slide_index === "number" ? data.slide_index : null;
      if (idx !== null) {
        setSlideProgress(`Slide ${idx}/${expectedSlides} generated`);
        setActivityLog(prev => [
          ...prev.filter(e => !e.isHeartbeat),
          {
            id: `slide-${idx}-${Date.now()}`,
            message: `✅ Slide ${idx}/${expectedSlides} content ready`,
            at: formatLogTime(),
          },
        ]);
      }
      return;
    }
    if (event === "deck_ready") {
      const path = String(data.path ?? "");
      const downloadUrl = String(
        data.download_url ?? (path ? `/api/v1/download?path=${encodeURIComponent(path)}` : ""),
      );
      const filename = String(data.filename ?? path.split("/").pop() ?? "deck.pptx");
      const previewUrl = String(data.preview_url ?? (filename ? `/office/preview/${encodeURIComponent(filename)}?embed=1` : ""));
      if (path) setDeckPath(path);
      if (downloadUrl) setDeckDownloadUrl(downloadUrl);
      if (previewUrl) setDeckPreviewUrl(previewUrl);
      setDeckFilename(filename);
      setPhase("done");
      setCurrentStep("Your deck is ready");
      setActivityLog(prev => [
        ...prev,
        {
          id: `deck-${Date.now()}`,
          message: `🎉 PPTX ready (${data.size_kb ?? "?"} KB) — use Download below`,
          detail: filename,
          at: formatLogTime(),
        },
      ]);
      return;
    }
    if (event === "completed") {
      if (data.status === "failed" || data.error) {
        setError(String(data.error ?? "Generation failed"));
        setPhase("review");
      } else if (data.status === "outline_ready") {
        // Planning-only completion; review transition handled in handleGenerate
        return;
      }
      // Build stream end: deck_ready normally sets phase=done first
      const msg = String(data.message ?? "");
      if (msg) setCurrentStep(msg);
    }
  };

  const handleFileUpload = async (files: File[]) => {
    if (files.length === 0) return;
    setUploading(true);
    setError(null);
    const names = files.map(f => f.name).join(", ");
    setActivityLog(prev => [
      ...prev,
      { id: `up-${Date.now()}`, message: `📤 Uploading ${files.length} file(s)…`, at: formatLogTime() },
    ]);
    const formData = new FormData();
    files.forEach(f => formData.append("files", f));

    try {
      const response = await fetch("/api/v1/upload", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) throw new Error(`Upload failed (${response.status})`);
      const result = await response.json();
      const paths: string[] = result.paths || [];
      setUploadedFiles(prev => [...prev, ...paths.map((p: string) => ({ name: p.split("/").pop() || p, path: p }))]);

      if (result.upload_id) setUploadId(result.upload_id);
      if (result.extraction_status === "running") {
        setExtractionStatus("running");
      }
      setActivityLog(prev => [
        ...prev,
        {
          id: `up-ok-${Date.now()}`,
          message: `✅ Uploaded: ${names}`,
          detail: result.extraction_status === "running"
            ? "Template analysis started in background"
            : undefined,
          at: formatLogTime(),
        },
      ]);
    } catch (err) {
      console.error("Upload failed:", err);
      const msg = err instanceof Error ? err.message : "Upload failed — is the API server running?";
      setError(msg);
      setActivityLog(prev => [
        ...prev,
        { id: `up-err-${Date.now()}`, message: `❌ ${msg}`, level: "error", at: formatLogTime() },
      ]);
    } finally {
      setUploading(false);
    }
  };

  const handleGenerate = async () => {
    setPhase("planning");
    setActivityLog([
      { id: "start", message: "🚀 Connecting to presentation agent…", at: formatLogTime(), step: "start" },
    ]);
    setCurrentStep("Starting planning…");
    setSlideProgress(null);
    setDeckPath(null);
    setDeckDownloadUrl(null);
    setDeckPreviewUrl(null);
    setDeckFilename(null);
    setError(null);
    setOutline([]);
    setJobId(null);
    setPlanningContext(null);
    setChatMsgs([]);
    setRefineInput("");
    if (!uploadId) setExtractionStatus("none");

    let outlineReceived = false;

    const applyOutlineReady = (data: Record<string, unknown>, ctx?: PlanningContext | null) => {
      const outlineData = Array.isArray(data.outline) ? data.outline as OutlineSlide[] : [];
      if (outlineData.length > 0) outlineReceived = true;
      setOutline(outlineData);
      const id = data.job_id ?? data.jobId;
      if (id) setJobId(String(id));
      if (data.extraction_status) {
        setExtractionStatus(String(data.extraction_status) as "running" | "done" | "failed");
      }
      if (data.upload_id) setUploadId(String(data.upload_id));
      const resolvedCtx = ctx ?? (
        data.planning_context && typeof data.planning_context === "object"
          ? data.planning_context as PlanningContext
          : null
      );
      if (resolvedCtx) setPlanningContext(resolvedCtx);
      const chatText = formatOutlineForChat(outlineData, resolvedCtx);
      setChatMsgs([{
        id: `plan-${Date.now()}`,
        role: "agent",
        text: chatText,
        outline: outlineData,
        at: formatLogTime(),
      }]);
      setCurrentStep("Outline ready — refine or approve to build");
      setActivityLog(prev => [
        ...prev,
        {
          id: `outline-${Date.now()}`,
          message: `✅ Outline ready (${outlineData.length} slides)`,
          detail: "Review in the chat, refine if needed, then Approve & Build",
          at: formatLogTime(),
        },
      ]);
      setPhase("review");
    };

    const payload = {
      topic: topic.trim(),
      deck_type: DECK_TYPE_MAP[slideCount] ?? "competitive",
      geo: GEO_MAP[region] ?? region,
      customer: extractCustomer(topic),
      language: outputLang,
      template_id: "sales-enablement-2022",
      source_documents: uploadedFiles.map(f => f.path),
    };

    try {
      let capturedCtx: PlanningContext | null = null;
      const { lastJobId } = await consumeGenerateStream(payload, (event, data) => {
        if (event === "progress" || event === "heartbeat") {
          ingestStreamEvent(event, data);
        } else if (event === "outline_ready") {
          if (data.planning_context && typeof data.planning_context === "object") {
            capturedCtx = data.planning_context as PlanningContext;
          }
          applyOutlineReady(data, capturedCtx);
        } else if (event === "completed") {
          if (data.status === "failed" || data.error) {
            setError(String(data.error ?? "Planning failed"));
            setPhase("input");
          } else if (data.status === "outline_ready") {
            applyOutlineReady(data, capturedCtx);
          }
        }
      });

      if (!outlineReceived) {
        const recoverId = lastJobId;
        if (recoverId) {
          const job = await fetchJobOutline(recoverId);
          if (job && Array.isArray(job.outline) && (job.outline as unknown[]).length > 0) {
            applyOutlineReady({ ...job, job_id: recoverId });
          } else {
            setError("Planning finished but no outline was returned. Hard-refresh the page and retry.");
            setPhase("input");
          }
        } else {
          setError("Planning stream ended without a job id. Is the API running on port 8200?");
          setPhase("input");
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Generation failed";
      setError(msg);
      setActivityLog(prev => [
        ...prev,
        { id: `err-${Date.now()}`, message: `❌ ${msg}`, level: "error", at: formatLogTime() },
      ]);
      setPhase("input");
    }
  };

  const handleRefine = async () => {
    const instruction = refineInput.trim();
    if (!instruction || !jobId || isRefining) return;
    setIsRefining(true);
    setRefineInput("");
    setChatMsgs(prev => [
      ...prev,
      { id: `user-${Date.now()}`, role: "user", text: instruction, at: formatLogTime() },
    ]);
    try {
      const resp = await fetch(`/api/v1/generate/${jobId}/refine`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instruction, outline }),
      });
      if (!resp.ok) {
        const err = await resp.text();
        throw new Error(err || `Refine failed (${resp.status})`);
      }
      const result = await resp.json() as { outline: OutlineSlide[]; message: string };
      setOutline(result.outline);
      const chatText = formatOutlineForChat(result.outline, planningContext);
      setChatMsgs(prev => [
        ...prev,
        {
          id: `agent-${Date.now()}`,
          role: "agent",
          text: `${result.message}\n\n${chatText}`,
          outline: result.outline,
          at: formatLogTime(),
        },
      ]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Refinement failed";
      setChatMsgs(prev => [
        ...prev,
        { id: `err-${Date.now()}`, role: "agent", text: `⚠️ ${msg}`, at: formatLogTime() },
      ]);
    } finally {
      setIsRefining(false);
    }
  };

  const handleApprove = async () => {
    if (!jobId) return;

    setPhase("building");
    setActivityLog(prev => [
      ...prev,
      { id: `approve-${Date.now()}`, message: "✅ Outline approved — building slides…", at: formatLogTime() },
    ]);
    setCurrentStep("Building presentation…");
    setSlideProgress(null);
    setError(null);

    const payload = { outline };

    try {
      await consumeGenerateStream(
        payload,
        (event, data) => {
          if (event === "completed" && (data.status === "failed" || data.error)) {
            const raw = String(data.error ?? "Build failed");
            const friendly = raw.includes("401") || raw.includes("API key") || raw.includes("LLM")
              ? "LLM API key is invalid or expired — ask your admin for a new key and restart the server."
              : raw;
            setError(friendly);
            setActivityLog(prev => [
              ...prev,
              { id: `build-err-${Date.now()}`, message: `❌ ${friendly}`, level: "error", at: formatLogTime() },
            ]);
            setPhase("review");
            return;
          }
          ingestStreamEvent(event, data);
        },
        `/api/v1/generate/${jobId}/approve`,
      );
    } catch (err) {
      const raw = err instanceof Error ? err.message : "Build failed";
      const friendly = raw.includes("401") || raw.includes("API key") || raw.includes("LLM")
        ? "LLM API key is invalid or expired — ask your admin for a new key and restart the server."
        : raw;
      setError(friendly);
      setActivityLog(prev => [
        ...prev,
        { id: `build-err-${Date.now()}`, message: `❌ ${friendly}`, level: "error", at: formatLogTime() },
      ]);
      setPhase("review");
    }
  };

  const phaseSteps = [
    { key: "input", label: "1. Configure" },
    { key: "planning", label: "2. Planning" },
    { key: "review", label: "3. Review outline" },
    { key: "building", label: "4. Building" },
    { key: "done", label: "5. Done" },
  ] as const;

  return (
    <div className="flex gap-6 h-full min-h-[28rem]">
      <div className="w-1/2 flex flex-col gap-6 bg-[var(--rh-charcoal-mid)] rounded-lg border border-[var(--rh-charcoal-light)] p-6 overflow-y-auto">
        <div className="space-y-2">
          <Label className="text-xs uppercase text-[var(--rh-silver)] tracking-wider">Prompt Context</Label>
          <Textarea
            className="min-h-[120px] bg-[var(--rh-charcoal)] border-[var(--rh-charcoal-light)] focus-visible:ring-[var(--rh-red)] resize-none"
            value={topic}
            onChange={e => setTopic(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs uppercase text-[var(--rh-silver)] tracking-wider">Source Documents (optional)</Label>
          <div
            className="border-2 border-dashed border-[var(--rh-charcoal-light)] rounded-lg p-6 text-center hover:border-[var(--rh-silver)] transition-colors cursor-pointer relative"
            role="button"
            tabIndex={0}
            onClick={() => document.getElementById("file-upload")?.click()}
            onDragEnter={e => { e.preventDefault(); e.stopPropagation(); }}
            onDragOver={e => { e.preventDefault(); e.stopPropagation(); }}
            onDragLeave={e => { e.preventDefault(); e.stopPropagation(); }}
            onDrop={async e => {
              e.preventDefault();
              e.stopPropagation();
              const files = Array.from(e.dataTransfer.files);
              if (files.length > 0) await handleFileUpload(files);
            }}
          >
            <input
              id="file-upload"
              type="file"
              multiple
              accept=".pdf,.docx,.pptx"
              className="hidden"
              onChange={async e => {
                const files = Array.from(e.target.files || []);
                if (files.length > 0) await handleFileUpload(files);
                e.target.value = "";
              }}
            />
            <div className="pointer-events-none flex flex-col items-center gap-1">
              {uploading
                ? <Loader2 className="w-6 h-6 text-[var(--rh-blue)] animate-spin" />
                : <FileText className="w-6 h-6 text-[var(--rh-silver)] opacity-50" />}
              <p className="text-xs text-[var(--rh-silver)]">
                {uploading ? "Uploading..." : "Drop PDF, DOCX, or PPTX files here or click to browse"}
              </p>
            </div>
          </div>
          {uploadedFiles.length > 0 && (
            <div className="space-y-1.5">
              {uploadedFiles.map((f, i) => (
                <div key={i} className="flex items-center gap-2 text-xs bg-[var(--rh-charcoal)] border border-[var(--rh-charcoal-light)] rounded px-3 py-1.5">
                  <FileText className="w-3 h-3 text-[var(--rh-blue)]" />
                  <span className="flex-1 truncate text-[var(--rh-silver)]">{f.name}</span>
                  <button
                    onClick={() => setUploadedFiles(prev => prev.filter((_, j) => j !== i))}
                    className="text-[var(--rh-silver)] hover:text-[var(--rh-red)]"
                  >✕</button>
                </div>
              ))}
            </div>
          )}
          {phase === "input" && activityLog.length > 0 && (
            <ActivityLogPanel
              entries={activityLog}
              currentStep={uploading ? "Uploading…" : currentStep}
              className="mt-2"
            />
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs uppercase text-[var(--rh-silver)] tracking-wider">Region Target</Label>
            <Select value={region} onValueChange={setRegion}>
              <SelectTrigger className="bg-[var(--rh-charcoal)] border-[var(--rh-charcoal-light)]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[var(--rh-charcoal-mid)] border-[var(--rh-charcoal-light)] text-white">
                <SelectItem value="de">Germany (EMEA)</SelectItem>
                <SelectItem value="fr">France (EMEA)</SelectItem>
                <SelectItem value="uk">UK (EMEA)</SelectItem>
                <SelectItem value="es">Spain (EMEA)</SelectItem>
                <SelectItem value="apac">APAC</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase text-[var(--rh-silver)] tracking-wider">Industry</Label>
            <Select defaultValue="telco">
              <SelectTrigger className="bg-[var(--rh-charcoal)] border-[var(--rh-charcoal-light)]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[var(--rh-charcoal-mid)] border-[var(--rh-charcoal-light)] text-white">
                <SelectItem value="telco">Telecommunications</SelectItem>
                <SelectItem value="pubsec">Public Sector</SelectItem>
                <SelectItem value="fsi">Financial Services</SelectItem>
                <SelectItem value="energy">Energy & Utilities</SelectItem>
                <SelectItem value="healthcare">Healthcare</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase text-[var(--rh-silver)] tracking-wider">Slide Count</Label>
            <Select value={slideCount} onValueChange={setSlideCount}>
              <SelectTrigger className="bg-[var(--rh-charcoal)] border-[var(--rh-charcoal-light)]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[var(--rh-charcoal-mid)] border-[var(--rh-charcoal-light)] text-white">
                <SelectItem value="5">5 slides (exec)</SelectItem>
                <SelectItem value="10">10 slides (standard)</SelectItem>
                <SelectItem value="20">20 slides (deep-dive)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase text-[var(--rh-silver)] tracking-wider">Audience</Label>
            <Select defaultValue="cto">
              <SelectTrigger className="bg-[var(--rh-charcoal)] border-[var(--rh-charcoal-light)]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[var(--rh-charcoal-mid)] border-[var(--rh-charcoal-light)] text-white">
                <SelectItem value="cto">CTO / CIO</SelectItem>
                <SelectItem value="arch">Technical Architect</SelectItem>
                <SelectItem value="ciso">CISO / Compliance</SelectItem>
                <SelectItem value="biz">Business Decision Maker</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-auto pt-6 border-t border-[var(--rh-charcoal-light)]">
          <Button
            onClick={handleGenerate}
            disabled={isBusy}
            className="w-full bg-[var(--rh-red)] hover:bg-[var(--rh-red-dark)] h-12 text-sm font-bold tracking-wide"
          >
            {isBusy
              ? <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Generating...</span>
              : <span className="flex items-center gap-2"><Sparkles className="w-4 h-4" /> {uploadedFiles.length > 0 ? "Generate from Documents" : "Generate Presentation"}</span>}
          </Button>
        </div>
      </div>

      <div
        className={`w-1/2 bg-[var(--rh-charcoal)] rounded-lg border border-dashed border-[var(--rh-charcoal-light)] p-6 flex flex-col min-h-[28rem] relative overflow-hidden ${
          phase === "review" || phase === "done"
            ? "items-stretch justify-start"
            : "items-center justify-center"
        }`}
      >
        <div className="w-full mb-4 shrink-0 flex flex-wrap items-center gap-2">
          {phaseSteps.map((step, i) => (
            <span
              key={step.key}
              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded ${
                phase === step.key
                  ? "bg-[var(--rh-red)]/20 text-[var(--rh-red)] border border-[var(--rh-red)]/40"
                  : "text-[var(--rh-silver)] opacity-60"
              }`}
            >
              {step.label}
            </span>
          ))}
          {agentBuild && (
            <span className="text-[10px] text-[var(--rh-blue)] ml-auto font-mono">
              API {agentBuild}
            </span>
          )}
        </div>
        {phase === "input" && (
          <div className="text-center text-[var(--rh-silver)] flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-[var(--rh-charcoal-mid)] flex items-center justify-center">
              <Sparkles className="w-8 h-8 opacity-50" />
            </div>
            <p>Configure options and click Generate</p>
          </div>
        )}
        {phase === "planning" && (
          <div className="flex flex-col items-center gap-4 w-full max-w-lg px-2">
            <Loader2 className="w-12 h-12 text-[var(--rh-red)] animate-spin shrink-0" />
            <p className="font-bold text-lg">Planning your deck</p>
            <ActivityLogPanel entries={activityLog} currentStep={currentStep} className="mt-2" />
            {error && (
              <p className="text-xs text-[var(--rh-red)] text-center">{error}</p>
            )}
          </div>
        )}
        {phase === "review" && (
          <div className="flex flex-col flex-1 min-h-0 w-full">
            {/* Header row */}
            <div className="flex items-center justify-between mb-2 shrink-0">
              <h3 className="font-bold text-[var(--rh-red)] text-sm">Review Plan</h3>
              <div className="flex items-center gap-2">
                {extractionStatus !== "none" && (
                  <span className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded ${
                    extractionStatus === "running" ? "bg-[var(--rh-blue)]/10 text-[var(--rh-blue)]"
                    : extractionStatus === "done" ? "bg-emerald-500/10 text-emerald-400"
                    : "bg-[var(--rh-red)]/10 text-[var(--rh-red)]"
                  }`}>
                    {extractionStatus === "running" && <Loader2 className="w-3 h-3 animate-spin" />}
                    {extractionStatus === "done" && <CheckCircle2 className="w-3 h-3" />}
                    {extractionStatus === "running" ? "Reading template…"
                      : extractionStatus === "done" ? "Template ready"
                      : "Template failed"}
                  </span>
                )}
                <Badge className="bg-[var(--rh-blue)]/20 text-[var(--rh-blue)]">
                  {outline.length} slides
                </Badge>
              </div>
            </div>

            {/* Chat messages */}
            <div className="flex-1 min-h-0 overflow-y-auto space-y-3 mb-3 pr-1">
              {chatMsgs.map(msg => (
                <div
                  key={msg.id}
                  className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
                >
                  {/* Avatar */}
                  <div className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold ${
                    msg.role === "agent"
                      ? "bg-[var(--rh-red)]/20 text-[var(--rh-red)] border border-[var(--rh-red)]/30"
                      : "bg-[var(--rh-blue)]/20 text-[var(--rh-blue)] border border-[var(--rh-blue)]/30"
                  }`}>
                    {msg.role === "agent" ? "AI" : "You"}
                  </div>
                  {/* Bubble */}
                  <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap leading-relaxed ${
                    msg.role === "agent"
                      ? "bg-[var(--rh-charcoal-mid)] border border-[var(--rh-charcoal-light)] text-[var(--rh-silver)] rounded-tl-sm"
                      : "bg-[var(--rh-blue)]/15 border border-[var(--rh-blue)]/25 text-white rounded-tr-sm"
                  }`}>
                    {msg.text}
                    <div className="text-[10px] text-[var(--rh-silver)]/50 mt-1.5 text-right">{msg.at}</div>
                  </div>
                </div>
              ))}

              {/* Typing indicator */}
              {isRefining && (
                <div className="flex gap-2 flex-row">
                  <div className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold bg-[var(--rh-red)]/20 text-[var(--rh-red)] border border-[var(--rh-red)]/30">
                    AI
                  </div>
                  <div className="bg-[var(--rh-charcoal-mid)] border border-[var(--rh-charcoal-light)] rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--rh-silver)]/60 animate-bounce [animation-delay:0ms]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--rh-silver)]/60 animate-bounce [animation-delay:150ms]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--rh-silver)]/60 animate-bounce [animation-delay:300ms]" />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Refinement input */}
            <div className="shrink-0 space-y-2">
              <div className="flex gap-2">
                <input
                  className="flex-1 bg-[var(--rh-charcoal-mid)] border border-[var(--rh-charcoal-light)] rounded-lg px-3 py-2 text-sm text-white placeholder-[var(--rh-silver)]/50 outline-none focus:border-[var(--rh-blue)] transition-colors"
                  placeholder='e.g. "Make slide 3 focus on DSGVO compliance" or "Add a ROI slide after slide 5"'
                  value={refineInput}
                  onChange={e => setRefineInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void handleRefine();
                    }
                  }}
                  disabled={isRefining}
                />
                <Button
                  onClick={() => void handleRefine()}
                  disabled={isRefining || !refineInput.trim()}
                  variant="outline"
                  className="border-[var(--rh-blue)]/40 text-[var(--rh-blue)] hover:bg-[var(--rh-blue)]/10 shrink-0 px-4"
                >
                  {isRefining ? <Loader2 className="w-4 h-4 animate-spin" /> : "Refine"}
                </Button>
              </div>

              {/* Action row */}
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    setPhase("input");
                    setOutline([]);
                    setJobId(null);
                    setPlanningContext(null);
                    setExtractionStatus("none");
                    setChatMsgs([]);
                  }}
                  variant="outline"
                  className="border-[var(--rh-charcoal-light)] text-[var(--rh-silver)] px-3"
                >
                  ← Back
                </Button>
                <Button
                  onClick={handleApprove}
                  disabled={isRefining}
                  className="flex-1 bg-[var(--rh-red)] hover:bg-[var(--rh-red-dark)] font-bold"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  {extractionStatus === "running"
                    ? "Approve & Build (reading template…)"
                    : `Approve & Build (${outline.length} slides)`}
                </Button>
              </div>
            </div>
          </div>
        )}
        {phase === "building" && (
          <div className="flex flex-col items-center gap-4 w-full max-w-lg px-2">
            <Loader2 className="w-12 h-12 text-[var(--rh-red)] animate-spin shrink-0" />
            <p className="font-bold text-lg">Building presentation</p>
            {slideProgress && (
              <p className="text-sm text-[var(--rh-blue)] font-medium">{slideProgress}</p>
            )}
            <ActivityLogPanel entries={activityLog} currentStep={currentStep} className="mt-2" />
            {error && (
              <p className="text-xs text-[var(--rh-red)] text-center">{error}</p>
            )}
          </div>
        )}
        {error && phase !== "planning" && phase !== "building" && (
          <div className="text-center text-[var(--rh-red)] flex flex-col items-center gap-2">
            <p className="font-bold">Generation Error</p>
            <p className="text-sm text-[var(--rh-silver)] max-w-sm">{error}</p>
          </div>
        )}
        {phase === "done" && (
          <div className="w-full h-full flex flex-col animate-in fade-in duration-500">
            <div className="flex items-center justify-between mb-4 shrink-0">
              <h3 className="font-bold">Preview</h3>
              <div className="flex items-center gap-2">
                <Badge className="bg-[var(--rh-green)]/20 text-[var(--rh-green)] border-0 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Sent to SME Review
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
                <Button size="sm" variant="outline" className="border-[var(--rh-charcoal-light)] text-[var(--rh-silver)] h-7">
                  <Download className="w-3 h-3 mr-1" /> Export
                </Button>
              </div>
            </div>
            {outputLang !== "en" && (
              <div className="flex items-center gap-1.5 mb-3 px-1 text-xs text-[var(--rh-blue)] shrink-0">
                <Languages className="w-3.5 h-3.5" />
                Output localized in {langMeta.flag} {langMeta.label} · Regulatory context: {langMeta.regulatory}
              </div>
            )}
            {activityLog.length > 0 && (
              <ActivityLogPanel
                entries={activityLog}
                currentStep={currentStep}
                className="mb-3 shrink-0 max-h-32"
              />
            )}
            <DeckPreviewPanel
              previewUrl={deckPreviewUrl}
              downloadUrl={deckDownloadUrl ?? (deckPath ? `/api/v1/download?path=${encodeURIComponent(deckPath)}` : null)}
              filename={deckFilename}
              fallbackTitle={slide.title}
              fallbackSubtitle={slide.subtitle}
            />
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── ASSET CUSTOMIZER TAB ─── */
const ASSETS = [
  { id: "a1", name: "Red Hat Digital Sovereignty — Solution Brief", type: "PDF", region: "Global" },
  { id: "a2", name: "OpenShift Platform Plus — Data Sheet", type: "PDF", region: "Global" },
  { id: "a3", name: "EMEA Sovereign Cloud — Competitive Brief", type: "PDF", region: "EMEA" },
  { id: "a4", name: "NIS2 Compliance with Red Hat — White Paper", type: "DOC", region: "EMEA" },
  { id: "a5", name: "Ansible Automation for Regulated Environments", type: "Slide", region: "Global" },
  { id: "a6", name: "RHEL 10 — What's New for Public Sector", type: "PDF", region: "Global" },
];

function AssetCustomizerTab({ outputLang }: { outputLang: OutputLang }) {
  const [selectedAsset, setSelectedAsset] = useState(ASSETS[0].id);
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [logoUrl, setLogoUrl] = useState("");

  const asset = ASSETS.find(a => a.id === selectedAsset)!;

  const handleCustomize = () => {
    setIsCustomizing(true);
    setIsDone(false);
    setTimeout(() => { setIsCustomizing(false); setIsDone(true); }, 2200);
  };

  return (
    <div className="flex gap-6 h-full">
      {/* Config Panel */}
      <div className="w-1/2 flex flex-col gap-5 bg-[var(--rh-charcoal-mid)] rounded-lg border border-[var(--rh-charcoal-light)] p-6 overflow-y-auto">
        <div className="space-y-2">
          <Label className="text-xs uppercase text-[var(--rh-silver)] tracking-wider">Base Asset</Label>
          <Select value={selectedAsset} onValueChange={v => { setSelectedAsset(v); setIsDone(false); }}>
            <SelectTrigger className="bg-[var(--rh-charcoal)] border-[var(--rh-charcoal-light)]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[var(--rh-charcoal-mid)] border-[var(--rh-charcoal-light)] text-white">
              {ASSETS.map(a => (
                <SelectItem key={a.id} value={a.id}>
                  <span className="flex items-center gap-2">
                    <span className="text-[10px] bg-[var(--rh-charcoal-light)] px-1.5 py-0.5 rounded font-mono">{a.type}</span>
                    {a.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs uppercase text-[var(--rh-silver)] tracking-wider">Target Account</Label>
            <Input defaultValue="Deutsche Telekom" className="bg-[var(--rh-charcoal)] border-[var(--rh-charcoal-light)]" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase text-[var(--rh-silver)] tracking-wider">Territory</Label>
            <Select defaultValue="de">
              <SelectTrigger className="bg-[var(--rh-charcoal)] border-[var(--rh-charcoal-light)]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[var(--rh-charcoal-mid)] border-[var(--rh-charcoal-light)] text-white">
                <SelectItem value="de">Germany (EMEA)</SelectItem>
                <SelectItem value="fr">France (EMEA)</SelectItem>
                <SelectItem value="uk">UK (EMEA)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-3">
          <Label className="text-xs uppercase text-[var(--rh-silver)] tracking-wider">Customization Options</Label>
          <div className="space-y-2">
            {[
              "Inject account-specific regulatory context (DSGVO, NIS2)",
              "Replace generic stats with territory pipeline data",
              "Add partner ecosystem references (T-Systems OTC, Ionos)",
              "Localize language and compliance terminology",
              "Include account logo on cover page",
            ].map((opt, i) => (
              <label key={i} className="flex items-center gap-3 p-3 rounded-md bg-[var(--rh-charcoal)] border border-[var(--rh-charcoal-light)] cursor-pointer hover:border-[var(--rh-silver)] transition-colors">
                <input type="checkbox" defaultChecked={i < 4} className="accent-[var(--rh-red)] w-4 h-4" />
                <span className="text-sm text-[var(--rh-silver)]">{opt}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs uppercase text-[var(--rh-silver)] tracking-wider">Account Logo URL (optional)</Label>
          <Input
            value={logoUrl}
            onChange={e => setLogoUrl(e.target.value)}
            placeholder="https://example.com/logo.png"
            className="bg-[var(--rh-charcoal)] border-[var(--rh-charcoal-light)] font-mono text-sm"
          />
        </div>

        <div className="mt-auto pt-6 border-t border-[var(--rh-charcoal-light)]">
          <Button
            onClick={handleCustomize}
            disabled={isCustomizing}
            className="w-full bg-[var(--rh-red)] hover:bg-[var(--rh-red-dark)] h-12 text-sm font-bold tracking-wide"
          >
            {isCustomizing
              ? <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Customizing Asset...</span>
              : <span className="flex items-center gap-2"><Edit3 className="w-4 h-4" /> Customize for Account</span>}
          </Button>
        </div>
      </div>

      {/* Preview Panel */}
      <div className="w-1/2 bg-[var(--rh-charcoal)] rounded-lg border border-dashed border-[var(--rh-charcoal-light)] p-6 flex flex-col">
        {!isCustomizing && !isDone && (
          <div className="flex-1 flex flex-col items-center justify-center text-center text-[var(--rh-silver)] gap-4">
            <div className="w-16 h-16 rounded-full bg-[var(--rh-charcoal-mid)] flex items-center justify-center">
              <Edit3 className="w-8 h-8 opacity-50" />
            </div>
            <p>Select an asset and configure options</p>
            <p className="text-xs">Customized version will preview here</p>
          </div>
        )}
        {isCustomizing && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <Loader2 className="w-12 h-12 text-[var(--rh-red)] animate-spin" />
            <p className="font-bold text-lg animate-pulse">Customizing Asset...</p>
            <div className="space-y-1.5 text-xs text-[var(--rh-silver)] text-center">
              {outputLang === "de" ? (
                <><p>DSGVO-Kontext wird eingefügt…</p><p>Für den deutschen Markt lokalisieren…</p><p>T-Systems OTC-Referenzen hinzufügen…</p></>
              ) : outputLang === "fr" ? (
                <><p>Injection du contexte RGPD…</p><p>Localisation pour le marché français…</p><p>Ajout des références OVHcloud SecNumCloud…</p></>
              ) : outputLang === "es" ? (
                <><p>Inyectando contexto LOPDGDD…</p><p>Localizando para el mercado español…</p><p>Añadiendo referencias de Telefónica Tech…</p></>
              ) : (
                <><p>Injecting DSGVO regulatory context…</p><p>Localizing for German market…</p><p>Adding T-Systems OTC references…</p></>
              )}
            </div>
          </div>
        )}
        {isDone && (
          <div className="flex flex-col h-full animate-in fade-in duration-500">
            <div className="flex items-center justify-between mb-4 shrink-0">
              <h3 className="font-bold">Customized: {asset.name}</h3>
              <div className="flex gap-2">
                <Badge className="bg-[var(--rh-green)]/20 text-[var(--rh-green)] border-0 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Ready for Review
                </Badge>
                <Button size="sm" variant="outline" className="border-[var(--rh-charcoal-light)] text-[var(--rh-silver)] h-7">
                  <Download className="w-3 h-3 mr-1" /> Export
                </Button>
              </div>
            </div>
            <div className="flex-1 bg-[var(--rh-charcoal-mid)] rounded-lg border border-[var(--rh-charcoal-light)] p-5 overflow-y-auto space-y-4">
              <div className="flex items-center gap-3 p-3 rounded bg-[var(--rh-charcoal)] border border-[var(--rh-charcoal-light)]">
                <div className="w-8 h-8 bg-[var(--rh-red)] flex items-center justify-center rounded font-black text-xs shrink-0">RH</div>
                <div>
                  <p className="font-bold text-sm">Deutsche Telekom Edition</p>
                  <p className="text-xs text-[var(--rh-silver)]">{asset.name}</p>
                </div>
              </div>
              <ChangesApplied outputLang={outputLang} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ChangesApplied({ outputLang }: { outputLang: OutputLang }) {
  const langMeta = OUTPUT_LANGS.find(l => l.value === outputLang)!;
  const changes = outputLang === "de" ? [
    { label: "Regulatorischer Kontext", detail: "DSGVO §46, NIS2-Anforderungen für wesentliche Einrichtungen auf Seiten 2, 5, 8 eingefügt" },
    { label: "Partnerreferenzen", detail: "T-Systems OTC, Ionos Sovereign Cloud zur Lösungsarchitektur hinzugefügt" },
    { label: "Gebietsspezifische Statistiken", detail: "EMEA-Pipeline-Daten und deutsche Marktgröße im öffentlichen Sektor aktualisiert" },
    { label: "Sprachlokalisierung", detail: "Compliance-Terminologie an deutsches Regulierungsvokabular angepasst" },
  ] : outputLang === "fr" ? [
    { label: "Contexte réglementaire", detail: "RGPD art. 46, exigences NIS2 pour entités essentielles ajoutées pages 2, 5, 8" },
    { label: "Références partenaires", detail: "OVHcloud SecNumCloud L3+, Outscale ajoutés à l'architecture de solution" },
    { label: "Statistiques territoriales", detail: "Données pipeline EMEA et taille du marché secteur public français mises à jour" },
    { label: "Localisation linguistique", detail: "Terminologie de conformité alignée au vocabulaire réglementaire français" },
  ] : [
    { label: "Regulatory context", detail: `${langMeta.regulatory} requirements injected into pages 2, 5, 8` },
    { label: "Partner references", detail: "Regional sovereign cloud partner references added to solution architecture" },
    { label: "Territory statistics", detail: "EMEA pipeline data and regional public sector market size updated" },
    { label: "Language localization", detail: `Compliance terminology aligned to ${langMeta.label} regulatory vocabulary` },
  ];
  return (
    <div className="space-y-3">
      <p className="text-xs text-[var(--rh-silver)] uppercase tracking-wider font-semibold">Changes Applied</p>
      {changes.map((c, i) => (
        <div key={i} className="flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 text-[var(--rh-green)] mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium">{c.label}</p>
            <p className="text-xs text-[var(--rh-silver)]">{c.detail}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── DRAFT CREATOR TAB ─── */
const DRAFT_TYPES = [
  { id: "email", label: "Outreach Email", icon: Mail, desc: "Personalized prospecting or follow-up email" },
  { id: "exec-summary", label: "Executive Summary", icon: BookOpen, desc: "One-pager for C-suite decision makers" },
  { id: "blog", label: "Thought Leadership", icon: FileText, desc: "Blog post or LinkedIn article" },
  { id: "social", label: "Social Post", icon: Share2, desc: "LinkedIn or Twitter content snippet" },
];

const DRAFT_OUTPUTS: Record<string, string> = {
  email: `Subject: Ensuring Deutsche Telekom's Data Sovereignty with Red Hat OpenShift

Hi [Name],

Following the EU Data Act entering force last week, I wanted to share how Red Hat is helping EMEA telcos like Deutsche Telekom navigate the new data portability and sovereignty mandates.

**The challenge:** Hyperscaler sovereign zones provide contractual guarantees — but your data still flows through their infrastructure. That's a compliance gap for NIS2-regulated entities.

**The Red Hat difference:** OpenShift Platform Plus deploys on T-Systems OTC's BSI C5-certified infrastructure. Your workloads stay in German data centres, operated by a German legal entity, with full open-source auditability.

Three things I'd love to discuss:
1. How OpenShift's air-gapped install mode meets your most restrictive data isolation requirements
2. Our joint reference architecture with T-Systems OTC for 5G core sovereign cloud
3. A path from your existing VMware estate to sovereign-ready containers

Would a 30-minute call this week work? I can bring our EMEA sovereign cloud architect.

Best regards,
Sarah K.
Red Hat EMEA — Field Sales`,

  "exec-summary": `**Red Hat Digital Sovereignty: Executive Summary**

**The Regulatory Imperative**
EU Data Act, NIS2, and DSGVO create overlapping obligations for critical infrastructure operators. Non-compliance carries fines up to €10M or 2% of global turnover.

**The Red Hat Solution**
Red Hat's sovereign cloud portfolio enables organisations to meet these obligations without sacrificing cloud agility:

• **OpenShift Platform Plus** — runs fully air-gapped; zero hyperscaler dependency
• **RHEL 10 with FIPS 140-3** — the certified OS foundation for regulated workloads  
• **Ansible Automation Platform** — automated NIS2 compliance evidence collection
• **Advanced Cluster Management** — policy-as-code enforcement across jurisdictions

**Certified Partner Ecosystem**
T-Systems OTC (BSI C5), OVHcloud (SecNumCloud), Ionos, Outscale — all validated to run Red Hat workloads within legal sovereignty guarantees.

**Recommended Next Steps**
1. Sovereign infrastructure assessment (4 weeks)
2. Pilot: sovereign dev/test cluster on T-Systems OTC
3. Production migration with compliance automation`,

  blog: `**Why "Sovereign Zones" Aren't Enough: The Case for True Digital Sovereignty**

The EU Data Act is here. NIS2 is in force. And every hyperscaler now has a "sovereign cloud" offering. So why are EMEA CISOs still losing sleep over data sovereignty?

Because contractual sovereignty and technical sovereignty are not the same thing.

When a hyperscaler operates a "sovereign zone" in Germany, they can promise that your data stays in Frankfurt. What they can't promise is that their US-based engineers won't access it for operational purposes — or that a US court order won't compel disclosure.

**True sovereignty requires technical isolation, not just legal promises.**

This means:
- Your container platform runs on infrastructure operated by an EU legal entity
- Your images, keys, and metadata never leave your jurisdiction
- Your platform team can operate fully air-gapped if required

Red Hat OpenShift, deployed on T-Systems OTC or OVHcloud SecNumCloud, provides exactly this. Open-source means every line of code is auditable. Disconnected install means no call-home to non-EU infrastructure.

For EMEA's critical infrastructure operators, this isn't a nice-to-have — it's a board-level mandate.`,

  social: `🔒 The EU Data Act is in force. NIS2 deadlines are here.

"Sovereign cloud" from hyperscalers = contractual promises.
Red Hat OpenShift on certified EU infrastructure = technical isolation.

There's a difference.

✅ Air-gapped deployments
✅ BSI C5 / SecNumCloud certified partners  
✅ Full open-source auditability
✅ Zero US hyperscaler dependency

Talking to EMEA enterprise and public sector teams this week. Happy to share our sovereign cloud reference architecture.

#DigitalSovereignty #OpenShift #NIS2 #GDPR #RedHat`,
};

/* ─── Localized email drafts ─── */
const DRAFT_OUTPUTS_LOCALIZED: Partial<Record<OutputLang, Partial<Record<string, string>>>> = {
  de: {
    email: `Betreff: Digitale Datensouveränität bei Deutsche Telekom mit Red Hat OpenShift

Sehr geehrte/r [Name],

seit dem Inkrafttreten des EU-Datengesetzes wollte ich Ihnen aufzeigen, wie Red Hat EMEA-Telekommunikationsunternehmen wie Deutsche Telekom bei der Umsetzung der neuen Datenportabilitäts- und Souveränitätsanforderungen unterstützt.

**Die Herausforderung:** Souveräne Zonen von Hyperscalern bieten vertragliche Garantien – Ihre Daten fließen jedoch weiterhin durch deren Infrastruktur. Das stellt eine Compliance-Lücke für NIS2-regulierte Einrichtungen dar.

**Der Red-Hat-Unterschied:** OpenShift Platform Plus wird auf der BSI C5-zertifizierten Infrastruktur von T-Systems OTC betrieben. Ihre Workloads verbleiben in deutschen Rechenzentren, werden von einer deutschen juristischen Person betrieben und sind dank Open Source vollständig prüfbar.

Drei Themen, über die ich gerne sprechen würde:
1. Wie der Air-Gapped-Installationsmodus von OpenShift Ihre strengsten Datenisolierungsanforderungen erfüllt
2. Unsere gemeinsame Referenzarchitektur mit T-Systems OTC für souveräne 5G-Core-Cloud
3. Ein Migrationsweg von Ihrer bestehenden VMware-Umgebung zu souveränen Containern

Hätten Sie diese Woche Zeit für einen 30-minütigen Austausch? Ich kann unseren EMEA-Architekten für souveräne Cloud-Infrastruktur hinzuziehen.

Mit freundlichen Grüßen,
Sarah K.
Red Hat EMEA — Field Sales`,
  },
  fr: {
    email: `Objet: Garantir la souveraineté numérique de Deutsche Telekom avec Red Hat OpenShift

Madame, Monsieur [Nom],

Suite à l'entrée en vigueur du Règlement européen sur les données, je souhaitais vous présenter comment Red Hat aide les opérateurs télécoms EMEA tels que Deutsche Telekom à naviguer dans les nouveaux mandats de portabilité des données et de souveraineté numérique.

**Le défi :** Les zones souveraines des hyperscalers offrent des garanties contractuelles — mais vos données transitent toujours par leur infrastructure. C'est une lacune de conformité pour les entités essentielles réglementées par NIS2.

**La différence Red Hat :** OpenShift Platform Plus se déploie sur l'infrastructure certifiée SecNumCloud L3+ d'OVHcloud. Vos charges de travail restent dans des centres de données français, exploités par une entité juridique française, avec une auditabilité complète en open source.

Trois points que j'aimerais aborder :
1. Comment le mode d'installation air-gapped d'OpenShift répond à vos exigences d'isolation des données les plus strictes
2. Notre architecture de référence conjointe avec OVHcloud pour le cloud souverain
3. Un chemin de migration depuis votre environnement VMware vers des conteneurs souverains

Seriez-vous disponible pour un échange de 30 minutes cette semaine ? Je peux faire participer notre architecte cloud souverain EMEA.

Cordialement,
Sarah K.
Red Hat EMEA — Ventes terrain`,
  },
  es: {
    email: `Asunto: Garantizando la soberanía digital de Deutsche Telekom con Red Hat OpenShift

Estimado/a [Nombre],

Tras la entrada en vigor de la Ley de Datos de la UE, quería compartirle cómo Red Hat está ayudando a operadoras de telecomunicaciones EMEA como Deutsche Telekom a navegar los nuevos mandatos de portabilidad y soberanía de datos.

**El reto:** Las zonas soberanas de los hiperescaladores ofrecen garantías contractuales, pero sus datos siguen fluyendo a través de su infraestructura. Eso es una brecha de cumplimiento para entidades esenciales reguladas por NIS2.

**La diferencia de Red Hat:** OpenShift Platform Plus se despliega en infraestructura certificada ENS de Telefónica Tech. Sus cargas de trabajo permanecen en centros de datos españoles, operados por una entidad jurídica española, con total auditabilidad de código abierto.

Tres temas que me gustaría tratar:
1. Cómo el modo de instalación air-gapped de OpenShift cumple con sus requisitos de aislamiento de datos más estrictos
2. Nuestra arquitectura de referencia conjunta con Telefónica Tech para cloud soberano
3. Un camino de migración desde su entorno VMware existente hacia contenedores soberanos

¿Tendría disponibilidad para una llamada de 30 minutos esta semana?

Atentamente,
Sarah K.
Red Hat EMEA — Ventas`,
  },
};

function DraftCreatorTab({ outputLang }: { outputLang: OutputLang }) {
  const [draftType, setDraftType] = useState("email");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDone, setIsDone] = useState(false);

  const langMeta = OUTPUT_LANGS.find(l => l.value === outputLang)!;

  const handleGenerate = () => {
    setIsGenerating(true);
    setIsDone(false);
    setTimeout(() => { setIsGenerating(false); setIsDone(true); }, 1800);
  };

  const localizedOutputs = DRAFT_OUTPUTS_LOCALIZED[outputLang];
  const output = (localizedOutputs?.[draftType]) ?? DRAFT_OUTPUTS[draftType] ?? "";

  return (
    <div className="flex gap-6 h-full">
      {/* Config Panel */}
      <div className="w-1/2 flex flex-col gap-5 bg-[var(--rh-charcoal-mid)] rounded-lg border border-[var(--rh-charcoal-light)] p-6 overflow-y-auto">
        <div className="space-y-2">
          <Label className="text-xs uppercase text-[var(--rh-silver)] tracking-wider">Draft Type</Label>
          <div className="grid grid-cols-2 gap-2">
            {DRAFT_TYPES.map(t => (
              <button
                key={t.id}
                onClick={() => { setDraftType(t.id); setIsDone(false); }}
                className={`flex items-start gap-2.5 p-3 rounded-md border text-left transition-all ${
                  draftType === t.id
                    ? "bg-[var(--rh-charcoal-light)] border-[var(--rh-red)] text-white"
                    : "bg-[var(--rh-charcoal)] border-[var(--rh-charcoal-light)] text-[var(--rh-silver)] hover:border-[var(--rh-silver)]"
                }`}
              >
                <t.icon className={`w-4 h-4 mt-0.5 shrink-0 ${draftType === t.id ? "text-[var(--rh-red)]" : ""}`} />
                <div>
                  <p className="text-xs font-semibold">{t.label}</p>
                  <p className="text-[10px] mt-0.5 opacity-70">{t.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs uppercase text-[var(--rh-silver)] tracking-wider">Prospect / Account</Label>
            <Input defaultValue="Deutsche Telekom" className="bg-[var(--rh-charcoal)] border-[var(--rh-charcoal-light)]" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase text-[var(--rh-silver)] tracking-wider">Territory</Label>
            <Select defaultValue="de">
              <SelectTrigger className="bg-[var(--rh-charcoal)] border-[var(--rh-charcoal-light)]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[var(--rh-charcoal-mid)] border-[var(--rh-charcoal-light)] text-white">
                <SelectItem value="de">Germany (EMEA)</SelectItem>
                <SelectItem value="fr">France (EMEA)</SelectItem>
                <SelectItem value="uk">UK (EMEA)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase text-[var(--rh-silver)] tracking-wider">Tone</Label>
            <Select defaultValue="professional">
              <SelectTrigger className="bg-[var(--rh-charcoal)] border-[var(--rh-charcoal-light)]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[var(--rh-charcoal-mid)] border-[var(--rh-charcoal-light)] text-white">
                <SelectItem value="professional">Professional</SelectItem>
                <SelectItem value="technical">Technical</SelectItem>
                <SelectItem value="executive">Executive-level</SelectItem>
                <SelectItem value="conversational">Conversational</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase text-[var(--rh-silver)] tracking-wider">Focus Topic</Label>
            <Select defaultValue="sovereignty">
              <SelectTrigger className="bg-[var(--rh-charcoal)] border-[var(--rh-charcoal-light)]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[var(--rh-charcoal-mid)] border-[var(--rh-charcoal-light)] text-white">
                <SelectItem value="sovereignty">Digital Sovereignty</SelectItem>
                <SelectItem value="nis2">NIS2 Compliance</SelectItem>
                <SelectItem value="vmware">VMware Displacement</SelectItem>
                <SelectItem value="ai">Sovereign AI / MLOps</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs uppercase text-[var(--rh-silver)] tracking-wider">Additional Context</Label>
          <Textarea
            placeholder="e.g. Met at KubeCon, interested in air-gapped deployments for their 5G core…"
            className="min-h-[80px] bg-[var(--rh-charcoal)] border-[var(--rh-charcoal-light)] resize-none text-sm"
          />
        </div>

        <div className="mt-auto pt-6 border-t border-[var(--rh-charcoal-light)]">
          <Button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full bg-[var(--rh-red)] hover:bg-[var(--rh-red-dark)] h-12 text-sm font-bold tracking-wide"
          >
            {isGenerating
              ? <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Drafting...</span>
              : <span className="flex items-center gap-2"><Sparkles className="w-4 h-4" /> Generate Draft</span>}
          </Button>
        </div>
      </div>

      {/* Output Panel */}
      <div className="w-1/2 bg-[var(--rh-charcoal)] rounded-lg border border-dashed border-[var(--rh-charcoal-light)] p-6 flex flex-col">
        {!isGenerating && !isDone && (
          <div className="flex-1 flex flex-col items-center justify-center text-center text-[var(--rh-silver)] gap-4">
            <div className="w-16 h-16 rounded-full bg-[var(--rh-charcoal-mid)] flex items-center justify-center">
              <FileText className="w-8 h-8 opacity-50" />
            </div>
            <p>Select type, configure, and generate your draft</p>
          </div>
        )}
        {isGenerating && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <Loader2 className="w-12 h-12 text-[var(--rh-red)] animate-spin" />
            <p className="font-bold text-lg animate-pulse">Writing Draft...</p>
          </div>
        )}
        {isDone && (
          <div className="flex flex-col h-full animate-in fade-in duration-500">
            <div className="flex items-center justify-between mb-4 shrink-0">
              <div className="flex items-center gap-2">
                <h3 className="font-bold">Draft Ready</h3>
                {outputLang !== "en" && (
                  <Badge className="bg-[var(--rh-blue)]/20 text-[var(--rh-blue)] border border-[var(--rh-blue)]/30 flex items-center gap-1 text-[10px]">
                    <Languages className="w-3 h-3" /> {langMeta.flag} {langMeta.label}
                  </Badge>
                )}
                <Badge className="bg-[var(--rh-green)]/20 text-[var(--rh-green)] border-0 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Pending SME Review
                </Badge>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="border-[var(--rh-charcoal-light)] text-[var(--rh-silver)] h-7">
                  <Edit3 className="w-3 h-3 mr-1" /> Edit
                </Button>
                <Button size="sm" variant="outline" className="border-[var(--rh-charcoal-light)] text-[var(--rh-silver)] h-7">
                  <Download className="w-3 h-3 mr-1" /> Copy
                </Button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto bg-[var(--rh-charcoal-mid)] rounded-lg border border-[var(--rh-charcoal-light)] p-5">
              <pre className="text-sm text-[var(--rh-silver)] whitespace-pre-wrap leading-relaxed font-sans">
                {output.split(/(\*\*[^*]+\*\*)/).map((part, i) =>
                  part.startsWith("**") && part.endsWith("**")
                    ? <strong key={i} className="text-white font-semibold">{part.slice(2, -2)}</strong>
                    : <span key={i}>{part}</span>
                )}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
