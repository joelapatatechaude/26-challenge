import { useState } from "react";
import { useLocation } from "wouter";
import {
  ComposableMap, Geographies, Geography, Marker, ZoomableGroup,
} from "react-simple-maps";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  LogIn, Globe, Shield, ArrowRight, X, Package,
  CheckCircle2, Languages,
} from "lucide-react";

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

/* India overlay — reflects India's official claimed boundary (J&K + Aksai Chin)
   Source: datameet/maps (Survey of India composite) */
const INDIA_GEO_URL = "https://raw.githubusercontent.com/datameet/maps/master/Country/india-composite.geojson";

/* ─── Legislation database keyed by ISO numeric code ─── */
type Urgency = "critical" | "high" | "medium" | "low";
type Regulation = { name: string; shortDesc: string; deadline?: string };
type CountryData = {
  name: string;
  region: string;
  urgency: Urgency;
  regulations: Regulation[];
  summary: string;
  rhPartner?: string;
  rhProducts: string[];
  /* Native language fields */
  nativeLang?: string;       // e.g. "Deutsch"
  nativeName?: string;       // country name in native script
  nativeSummary?: string;    // summary paragraph in native language
  nativeRegulations?: Regulation[];
};

const COUNTRY_DATA: Record<string, CountryData> = {
  "276": {
    name: "Germany", region: "EMEA", urgency: "critical",
    regulations: [
      { name: "DSGVO / GDPR", shortDesc: "Strict data processing & residency requirements", deadline: "Enforced" },
      { name: "BSI IT-Grundschutz / C5", shortDesc: "Federal cloud security standard for public sector", deadline: "Mandatory" },
      { name: "NIS2 Directive", shortDesc: "Critical infrastructure cybersecurity mandate", deadline: "Oct 2024" },
      { name: "EU Data Act", shortDesc: "Cloud portability & vendor lock-in restrictions", deadline: "Feb 2025" },
    ],
    summary: "Germany has the strictest sovereignty posture in the EU. BSI C5 certification is required for all federal cloud deployments. US hyperscalers face CLOUD Act exposure challenges.",
    rhPartner: "T-Systems OTC (BSI C5 certified)",
    rhProducts: ["OpenShift on T-Systems OTC", "RHEL (FIPS 140-3)", "Satellite", "Ansible AAP"],
    nativeLang: "Deutsch", nativeName: "Deutschland",
    nativeSummary: "Deutschland hat die strengste Datensouveränitätspolitik in der EU. Die BSI C5-Zertifizierung ist für alle Bundes-Cloud-Deployments verpflichtend. Amerikanische Hyperscaler stehen vor erheblichen Herausforderungen durch den US CLOUD Act.",
    nativeRegulations: [
      { name: "Datenschutz-Grundverordnung (DSGVO)", shortDesc: "Strenge Anforderungen an die Datenverarbeitung und den Datenaufenthalt", deadline: "In Kraft" },
      { name: "BSI IT-Grundschutz / C5", shortDesc: "Bundesweiter Cloud-Sicherheitsstandard für den öffentlichen Sektor", deadline: "Verpflichtend" },
      { name: "NIS2-Richtlinie (NISG 2024)", shortDesc: "Cybersicherheitspflichten für kritische Infrastrukturen", deadline: "Okt. 2024" },
      { name: "EU-Datengesetz", shortDesc: "Cloud-Portabilität und Beschränkungen bei Anbieterwechsel", deadline: "Feb. 2025" },
    ],
  },
  "250": {
    name: "France", region: "EMEA", urgency: "critical",
    regulations: [
      { name: "RGPD / GDPR", shortDesc: "Data protection regulation with CNIL enforcement", deadline: "Enforced" },
      { name: "ANSSI SecNumCloud", shortDesc: "National cloud qualification for sensitive data", deadline: "Mandatory" },
      { name: "NIS2 Directive", shortDesc: "Essential entities cybersecurity requirements", deadline: "Oct 2024" },
      { name: "EU Data Act", shortDesc: "Cloud portability obligations", deadline: "Feb 2025" },
    ],
    summary: "France mandates SecNumCloud L3+ for sensitive government workloads. Operators must be French legal entities — rules out US hyperscalers for classified or sensitive public sector data.",
    rhPartner: "OVHcloud (SecNumCloud L3+) / Outscale",
    rhProducts: ["OpenShift on OVHcloud SecNumCloud", "Quay", "Ansible AAP", "RHEL"],
    nativeLang: "Français", nativeName: "France",
    nativeSummary: "La France impose SecNumCloud L3+ pour les charges de travail gouvernementales sensibles. Les opérateurs doivent être des entités juridiques françaises — ce qui exclut les hyperscalers américains pour les données classifiées ou sensibles du secteur public.",
    nativeRegulations: [
      { name: "Règlement Général sur la Protection des Données (RGPD)", shortDesc: "Protection des données avec application par la CNIL", deadline: "En vigueur" },
      { name: "Qualification ANSSI SecNumCloud", shortDesc: "Qualification nationale pour les données sensibles de l'État", deadline: "Obligatoire" },
      { name: "Directive NIS2", shortDesc: "Exigences de cybersécurité pour les entités essentielles", deadline: "Oct. 2024" },
      { name: "Loi sur les données de l'UE", shortDesc: "Obligations de portabilité du cloud", deadline: "Fév. 2025" },
    ],
  },
  "826": {
    name: "United Kingdom", region: "EMEA", urgency: "high",
    regulations: [
      { name: "UK GDPR", shortDesc: "Post-Brexit data protection law", deadline: "Enforced" },
      { name: "Data Protection Act 2018", shortDesc: "National DPA implementation", deadline: "Enforced" },
      { name: "NIS Regulations 2018", shortDesc: "Network & information systems security", deadline: "Enforced" },
      { name: "Cyber Essentials", shortDesc: "Government-backed cyber security scheme", deadline: "Recommended" },
    ],
    summary: "Post-Brexit, UK operates its own GDPR framework. NHS, MOD, and critical infrastructure operators face stringent data localisation requirements. NCSC guidance increasingly favours domestic sovereign cloud.",
    rhPartner: "Redcentric / UKCloud (UK Sovereign Cloud)",
    rhProducts: ["OpenShift Platform Plus", "RHEL", "Ansible AAP", "ACM"],
  },
  "528": {
    name: "Netherlands", region: "EMEA", urgency: "high",
    regulations: [
      { name: "GDPR / AVG", shortDesc: "Data protection with AP (Dutch DPA) enforcement", deadline: "Enforced" },
      { name: "NIS2 Directive", shortDesc: "Essential entities security mandate", deadline: "Oct 2024" },
      { name: "BIO (Baseline Informatiebeveiliging Overheid)", shortDesc: "Government baseline security standard", deadline: "Mandatory" },
      { name: "DORA", shortDesc: "Digital Operational Resilience Act (financial sector)", deadline: "Jan 2025" },
    ],
    summary: "Netherlands has major financial sector sovereignty concerns (ING, Rabobank, ABN AMRO) under DORA. BIO standard applies to all Dutch government IT systems.",
    rhPartner: "KPN / Interxion (Amsterdam DC)",
    rhProducts: ["OpenShift Platform Plus", "RHEL", "ACM", "OpenShift AI"],
    nativeLang: "Nederlands", nativeName: "Nederland",
    nativeSummary: "Nederland kent grote soevereiniteitszorgen in de financiële sector (ING, Rabobank, ABN AMRO) onder DORA. De BIO-norm is van toepassing op alle Nederlandse overheids-IT-systemen.",
    nativeRegulations: [
      { name: "Algemene Verordening Gegevensbescherming (AVG)", shortDesc: "Gegevensbescherming met handhaving door Autoriteit Persoonsgegevens", deadline: "Van kracht" },
      { name: "NIS2-richtlijn", shortDesc: "Cybersecurityverplichting voor essentiële entiteiten", deadline: "Okt. 2024" },
      { name: "Baseline Informatiebeveiliging Overheid (BIO)", shortDesc: "Overheidsstandaard voor informatiebeveiliging", deadline: "Verplicht" },
      { name: "DORA (Digitale Operationele Weerbaarheid)", shortDesc: "Cloudvereisten voor de financiële sector", deadline: "Jan. 2025" },
    ],
  },
  "724": {
    name: "Spain", region: "EMEA", urgency: "high",
    regulations: [
      { name: "LOPDGDD", shortDesc: "Spanish data protection law (GDPR supplement)", deadline: "Enforced" },
      { name: "ENS (Esquema Nacional de Seguridad)", shortDesc: "National security framework for public sector", deadline: "Mandatory" },
      { name: "NIS2 Directive", shortDesc: "Transposed via Ley de Ciberseguridad", deadline: "Oct 2024" },
    ],
    summary: "Spain's ENS certification is mandatory for all ICT systems used in public administration. Telefónica is a key NIS2-regulated essential entity with 5G core sovereignty requirements.",
    rhPartner: "Telefónica Tech / Arsys",
    rhProducts: ["OpenShift", "RHEL", "Ansible AAP", "Satellite"],
    nativeLang: "Español", nativeName: "España",
    nativeSummary: "La certificación ENS es obligatoria para todos los sistemas TIC utilizados en la administración pública española. Telefónica es una entidad esencial regulada por NIS2 con requisitos de soberanía para el núcleo 5G.",
    nativeRegulations: [
      { name: "Ley Orgánica de Protección de Datos (LOPDGDD)", shortDesc: "Ley española de protección de datos, complemento del RGPD", deadline: "En vigor" },
      { name: "Esquema Nacional de Seguridad (ENS)", shortDesc: "Marco de seguridad nacional para el sector público", deadline: "Obligatorio" },
      { name: "Directiva NIS2 / Ley de Ciberseguridad", shortDesc: "Mandato de ciberseguridad para infraestructuras críticas", deadline: "Oct. 2024" },
    ],
  },
  "380": {
    name: "Italy", region: "EMEA", urgency: "high",
    regulations: [
      { name: "GDPR / Codice Privacy", shortDesc: "Italian data protection with Garante enforcement", deadline: "Enforced" },
      { name: "ACN Cloud Strategy", shortDesc: "Agenzia per la Cybersicurezza Nazionale cloud tiers", deadline: "Mandatory" },
      { name: "NIS2 Directive", shortDesc: "Critical infrastructure cybersecurity", deadline: "Oct 2024" },
      { name: "PSN (Polo Strategico Nazionale)", shortDesc: "National sovereign cloud infrastructure", deadline: "2025" },
    ],
    summary: "Italy's PSN (Polo Strategico Nazionale) initiative creates a national sovereign cloud for public administration. ACN classifies workloads into Strategic, Critical, and Ordinary tiers.",
    rhPartner: "Leonardo / TIM (PSN consortium)",
    rhProducts: ["OpenShift Platform Plus", "RHEL", "Satellite", "Ansible AAP"],
    nativeLang: "Italiano", nativeName: "Italia",
    nativeSummary: "Il Polo Strategico Nazionale (PSN) crea un'infrastruttura cloud sovrana per la pubblica amministrazione italiana. L'ACN classifica i carichi di lavoro in categorie Strategiche, Critiche e Ordinarie.",
    nativeRegulations: [
      { name: "GDPR / Codice in materia di protezione dei dati personali", shortDesc: "Protezione dei dati con enforcement del Garante Privacy", deadline: "In vigore" },
      { name: "Strategia Cloud ACN", shortDesc: "Agenzia per la Cybersicurezza Nazionale — livelli cloud", deadline: "Obbligatorio" },
      { name: "Direttiva NIS2", shortDesc: "Cybersicurezza per le infrastrutture critiche", deadline: "Ott. 2024" },
      { name: "Polo Strategico Nazionale (PSN)", shortDesc: "Infrastruttura cloud sovrana nazionale", deadline: "2025" },
    ],
  },
  "840": {
    name: "United States", region: "Americas", urgency: "medium",
    regulations: [
      { name: "FedRAMP", shortDesc: "Federal cloud authorization programme", deadline: "Mandatory (Federal)" },
      { name: "FISMA", shortDesc: "Federal information security framework", deadline: "Enforced" },
      { name: "CMMC 2.0", shortDesc: "Cybersecurity Maturity Model for DoD contractors", deadline: "2025" },
      { name: "CCPA / State Privacy Laws", shortDesc: "California and multi-state data privacy laws", deadline: "Enforced" },
    ],
    summary: "FedRAMP authorization required for federal agency cloud deployments. DoD CMMC 2.0 impacts defence supply chain. No single federal data residency law but CLOUD Act creates international exposure.",
    rhPartner: "AWS GovCloud / Azure Government",
    rhProducts: ["ROSA (FedRAMP)", "OpenShift Platform Plus", "RHEL", "Ansible AAP"],
  },
  "036": {
    name: "Australia", region: "APAC", urgency: "medium",
    regulations: [
      { name: "Privacy Act 1988 (amended)", shortDesc: "Australian privacy law reform 2024", deadline: "2025" },
      { name: "IRAP / ISM", shortDesc: "Information Security Manual for government", deadline: "Mandatory" },
      { name: "SOCI Act", shortDesc: "Security of Critical Infrastructure Act", deadline: "Enforced" },
      { name: "ASD Essential Eight", shortDesc: "Cyber maturity framework", deadline: "Mandatory (Gov)" },
    ],
    summary: "Australia's IRAP assessment required for government cloud. SOCI Act extends security obligations to 11 critical infrastructure sectors. Privacy Act amendments pending stronger enforcement.",
    rhPartner: "Vault Systems (IRAP Protected) / Macquarie Government",
    rhProducts: ["OpenShift (IRAP)", "RHEL", "Ansible AAP", "Satellite"],
  },
  "392": {
    name: "Japan", region: "APAC", urgency: "medium",
    regulations: [
      { name: "APPI (amended 2022)", shortDesc: "Act on Protection of Personal Information", deadline: "Enforced" },
      { name: "ISMAP", shortDesc: "Information System Security Management & Assessment Programme", deadline: "Mandatory (Gov)" },
      { name: "Cybersecurity Basic Act", shortDesc: "Critical infrastructure protection", deadline: "Enforced" },
    ],
    summary: "ISMAP registration required for cloud services sold to Japanese government agencies. APPI amendments introduce cross-border transfer restrictions and breach notification requirements.",
    rhPartner: "NTT DATA / Fujitsu (ISMAP-registered)",
    rhProducts: ["OpenShift (ISMAP)", "RHEL", "Satellite", "Ansible AAP"],
    nativeLang: "日本語", nativeName: "日本",
    nativeSummary: "日本の政府機関向けクラウドサービスにはISMAP登録が必要です。改正個人情報保護法（APPI）は越境データ移転の制限と漏洩通知義務を導入しています。",
    nativeRegulations: [
      { name: "個人情報の保護に関する法律（改正版）", shortDesc: "個人情報保護法 — 越境移転制限と漏洩通知義務を含む", deadline: "施行済" },
      { name: "政府情報システムのためのセキュリティ評価制度（ISMAP）", shortDesc: "政府機関向けクラウドサービスの登録制度", deadline: "政府機関向け必須" },
      { name: "サイバーセキュリティ基本法", shortDesc: "重要インフラのサイバーセキュリティ保護", deadline: "施行済" },
    ],
  },
  "702": {
    name: "Singapore", region: "APAC", urgency: "medium",
    regulations: [
      { name: "PDPA 2012 (amended 2021)", shortDesc: "Personal Data Protection Act with mandatory breach notification", deadline: "Enforced" },
      { name: "MAS TRM / DCOM", shortDesc: "Monetary Authority cloud risk management guidelines", deadline: "Mandatory (FSI)" },
      { name: "MTCS (Multi-Tier Cloud Security)", shortDesc: "Singapore cloud security standard", deadline: "Optional/Recommended" },
    ],
    summary: "Singapore is APAC's financial hub — MAS TRM guidelines impose strict cloud risk management on banks and insurers. PDPA amendments strengthened enforcement with fines up to 10% of annual turnover.",
    rhPartner: "Singtel / AWS Singapore",
    rhProducts: ["OpenShift", "RHEL", "ACM", "OpenShift AI"],
  },
  "156": {
    name: "China", region: "APAC", urgency: "high",
    regulations: [
      { name: "PIPL", shortDesc: "Personal Information Protection Law (China's GDPR)", deadline: "Enforced" },
      { name: "DSL (Data Security Law)", shortDesc: "Data classification and cross-border transfer rules", deadline: "Enforced" },
      { name: "MLPS 2.0", shortDesc: "Multi-Level Protection Scheme for cybersecurity", deadline: "Mandatory" },
      { name: "CAC Regulations", shortDesc: "Cyberspace Administration cross-border data rules", deadline: "Enforced" },
    ],
    summary: "China's data sovereignty laws among the world's strictest. All data generated in China must remain in China. Cross-border transfer requires CAC security assessment. Foreign cloud providers must partner with local entities.",
    rhProducts: ["OpenShift (Air-gapped)", "RHEL", "Satellite", "Ansible AAP"],
    nativeLang: "中文", nativeName: "中国",
    nativeSummary: "中国的数据主权法律是全球最严格的。在中国产生的所有数据必须留在中国境内。跨境数据传输需通过网络安全审查办公室（CAC）的安全评估。外国云服务商必须与本地实体合作。",
    nativeRegulations: [
      { name: "个人信息保护法（PIPL）", shortDesc: "中国版GDPR，规范个人信息的收集、处理和跨境传输", deadline: "已施行" },
      { name: "数据安全法（DSL）", shortDesc: "数据分类分级管理与跨境数据流动规则", deadline: "已施行" },
      { name: "网络安全等级保护制度 2.0（等保2.0）", shortDesc: "信息系统网络安全多级保护方案", deadline: "强制执行" },
      { name: "网络安全审查办法（CAC）", shortDesc: "跨境数据传输的网信办审查规定", deadline: "已施行" },
    ],
  },
  "356": {
    name: "India", region: "APAC", urgency: "medium",
    regulations: [
      { name: "DPDP Act 2023", shortDesc: "Digital Personal Data Protection Act", deadline: "2025 (rules pending)" },
      { name: "RBI Cloud Guidelines", shortDesc: "Reserve Bank cloud risk guidelines for banks", deadline: "Enforced" },
      { name: "MEITY Cloud Policy", shortDesc: "Government cloud procurement (MeghRaj)", deadline: "Mandatory (Gov)" },
    ],
    summary: "India's DPDP Act 2023 establishes a comprehensive data protection framework with Data Protection Board. RBI requires financial institutions to maintain critical data in India. Government workloads on MeghRaj (NIC cloud).",
    rhPartner: "NIC / Airtel Cloud",
    rhProducts: ["OpenShift", "RHEL", "Ansible AAP", "OpenShift AI"],
  },
  "124": {
    name: "Canada", region: "Americas", urgency: "medium",
    regulations: [
      { name: "PIPEDA / Bill C-27", shortDesc: "Personal information protection (reform pending)", deadline: "2025" },
      { name: "ITSG-33", shortDesc: "IT Security Risk Management for government", deadline: "Mandatory (Gov)" },
      { name: "PBMM (Protected B)", shortDesc: "Cloud profile for sensitive government workloads", deadline: "Mandatory (Gov)" },
    ],
    summary: "Canada's PBMM (Protected B) cloud profile required for federal government sensitive workloads. Bill C-27 CPPA reform pending. Quebec Law 25 strongest provincial privacy law.",
    rhPartner: "IBM Cloud (Protected B) / Bell Cloud",
    rhProducts: ["OpenShift (PBMM)", "RHEL", "Ansible AAP", "Satellite"],
  },
  "076": {
    name: "Brazil", region: "Americas", urgency: "medium",
    regulations: [
      { name: "LGPD", shortDesc: "Lei Geral de Proteção de Dados (Brazil's GDPR)", deadline: "Enforced" },
      { name: "Banco Central Cloud Policy", shortDesc: "Financial sector cloud use guidelines", deadline: "Mandatory (FSI)" },
    ],
    summary: "LGPD is Brazil's comprehensive data protection law enforced by ANPD. Financial sector under Banco Central cloud guidelines. Growing sovereign cloud market for government workloads.",
    rhProducts: ["OpenShift", "RHEL", "Ansible AAP"],
    nativeLang: "Português", nativeName: "Brasil",
    nativeSummary: "A LGPD é a lei abrangente de proteção de dados do Brasil, aplicada pela ANPD. O setor financeiro está sujeito às diretrizes de nuvem do Banco Central. Mercado de nuvem soberana em crescimento para cargas de trabalho governamentais.",
    nativeRegulations: [
      { name: "Lei Geral de Proteção de Dados (LGPD)", shortDesc: "Lei de proteção de dados do Brasil, aplicada pela Autoridade Nacional de Proteção de Dados (ANPD)", deadline: "Em vigor" },
      { name: "Política de Nuvem do Banco Central", shortDesc: "Diretrizes para uso de computação em nuvem no setor financeiro", deadline: "Obrigatório (FSI)" },
    ],
  },
  "040": {
    name: "Austria", region: "EMEA", urgency: "high",
    regulations: [
      { name: "DSGVO (Austrian GDPR)", shortDesc: "Austrian implementation with DSB enforcement", deadline: "Enforced" },
      { name: "NIS2 / NISG 2024", shortDesc: "Network and Information Security Act", deadline: "Oct 2024" },
      { name: "E-Government Act", shortDesc: "Digital government sovereignty requirements", deadline: "Enforced" },
    ],
    summary: "Austria implemented NIS2 via NISG 2024. Strong GDPR enforcement by DSB (Datenschutzbehörde). Public sector IT strongly favours EU-hosted sovereign cloud solutions.",
    rhPartner: "A1 Digital / Kapsch BusinessCom",
    rhProducts: ["OpenShift", "RHEL", "Satellite", "Ansible AAP"],
  },
  "756": {
    name: "Switzerland", region: "EMEA", urgency: "high",
    regulations: [
      { name: "nDSG (revised DSG)", shortDesc: "New Swiss data protection law (Sep 2023)", deadline: "Enforced" },
      { name: "FINMA Cloud Circular", shortDesc: "Financial sector outsourcing to cloud rules", deadline: "Enforced" },
      { name: "ISDS", shortDesc: "Information Security in the Confederation Act", deadline: "Mandatory (Gov)" },
    ],
    summary: "Switzerland's revised nDSG aligns closely with GDPR. FINMA cloud guidance is strict for banks — data must remain in Switzerland for certain categories. Non-EU but very high data sovereignty expectations.",
    rhPartner: "Swiss Government Cloud (BIT) / Swisscom",
    rhProducts: ["OpenShift (on-prem/Swiss cloud)", "RHEL", "Satellite", "Ansible AAP"],
  },
};

/* Countries coloured by urgency */
const URGENCY_FILL: Record<Urgency, { default: string; hover: string; active: string }> = {
  critical: {
    default: "rgba(238,0,0,0.20)",
    hover:   "rgba(238,0,0,0.38)",
    active:  "rgba(238,0,0,0.50)",
  },
  high: {
    default: "rgba(236,122,8,0.18)",
    hover:   "rgba(236,122,8,0.34)",
    active:  "rgba(236,122,8,0.48)",
  },
  medium: {
    default: "rgba(0,102,204,0.14)",
    hover:   "rgba(0,102,204,0.28)",
    active:  "rgba(0,102,204,0.40)",
  },
  low: {
    default: "rgba(62,134,53,0.12)",
    hover:   "rgba(62,134,53,0.24)",
    active:  "rgba(62,134,53,0.36)",
  },
};

const URGENCY_LABEL: Record<Urgency, string> = {
  critical: "Critical", high: "High", medium: "Medium", low: "Low",
};

const URGENCY_BADGE: Record<Urgency, string> = {
  critical: "bg-[var(--rh-red)]/20 text-[var(--rh-red)] border-[var(--rh-red)]/40",
  high:     "bg-[var(--rh-orange)]/20 text-[var(--rh-orange)] border-[var(--rh-orange)]/40",
  medium:   "bg-[var(--rh-blue)]/20 text-[var(--rh-blue)] border-[var(--rh-blue)]/40",
  low:      "bg-[var(--rh-green)]/20 text-[var(--rh-green)] border-[var(--rh-green)]/40",
};

/* Hotspot markers */
const MARKERS = [
  { label: "EMEA HQ", coords: [8.68, 50.11] as [number, number], color: "var(--rh-red)", size: 5, ring: true },
  { label: "Americas", coords: [-74.0, 40.71] as [number, number], color: "var(--rh-blue)", size: 3, ring: false },
  { label: "APAC", coords: [103.82, 1.35] as [number, number], color: "var(--rh-orange)", size: 3, ring: false },
  { label: "Tokyo", coords: [139.69, 35.68] as [number, number], color: "var(--rh-orange)", size: 2.5, ring: false },
];

type TooltipState = { x: number; y: number; id: string } | null;

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const [loggingIn, setLoggingIn] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const [mapZoom, setMapZoom] = useState(1);
  const [mapCenter, setMapCenter] = useState<[number, number]>([10, 20]);
  const [tooltip, setTooltip] = useState<TooltipState>(null);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [showNative, setShowNative] = useState(false);

  const selectedData = selectedCountry ? COUNTRY_DATA[selectedCountry] : null;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoggingIn(true);
    setSelectedCountry(null);
    setShowNative(false);
    setTimeout(() => { setMapCenter([14, 51]); setMapZoom(4.5); }, 400);
    setTimeout(() => setZoomed(true), 1900);
  };

  return (
    <div className="relative w-full h-screen bg-[#0d0d0d] overflow-hidden font-sans text-white select-none">

      {/* ── Top Bar ── */}
      <div className="absolute top-0 w-full h-14 flex items-center justify-between px-8 z-20 pointer-events-none">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-[var(--rh-red)] flex items-center justify-center rounded-sm">
            <span className="text-[10px] font-black leading-none uppercase tracking-tighter">RH</span>
          </div>
          <span className="font-bold tracking-tight uppercase text-white/70 text-sm">
            <span className="text-white">Red Hat</span> · Digital Sovereignty Field Enablement
          </span>
        </div>
        {/* Legend */}
        <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-wider">
          {(["critical","high","medium","low"] as Urgency[]).map(u => (
            <span key={u} className={`flex items-center gap-1.5 px-2 py-1 rounded-full border ${URGENCY_BADGE[u]}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-current" />
              {URGENCY_LABEL[u]}
            </span>
          ))}
          <span className="text-white/30 ml-1">Sovereignty Urgency</span>
        </div>
      </div>

      {/* ── World Map ── */}
      <div className="absolute inset-0">
        <ComposableMap
          projection="geoMercator"
          projectionConfig={{ scale: 140, center: [10, 20] }}
          style={{ width: "100%", height: "100%" }}
        >
          <defs>
            <pattern id="mapgrid" width="50" height="50" patternUnits="userSpaceOnUse">
              <path d="M 50 0 L 0 0 0 50" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#mapgrid)" />

          <ZoomableGroup
            zoom={mapZoom}
            center={mapCenter}
            style={{ transition: "all 1.6s cubic-bezier(0.4,0,0.2,1)" }}
          >
            <Geographies geography={GEO_URL}>
              {({ geographies }) =>
                geographies.map((geo) => {
                  const data = COUNTRY_DATA[geo.id];
                  const urgency = data?.urgency;
                  const fills = urgency ? URGENCY_FILL[urgency] : null;
                  const isSelected = selectedCountry === geo.id;

                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      onMouseEnter={(e) => {
                        if (data) {
                          setTooltip({ x: e.clientX, y: e.clientY, id: geo.id });
                        }
                      }}
                      onMouseMove={(e) => {
                        if (data && tooltip?.id === geo.id) {
                          setTooltip({ x: e.clientX, y: e.clientY, id: geo.id });
                        }
                      }}
                      onMouseLeave={() => setTooltip(null)}
                  onClick={() => {
                            if (data) {
                              setSelectedCountry(prev => {
                                if (prev !== geo.id) setShowNative(false);
                                return prev === geo.id ? null : geo.id;
                              });
                              setTooltip(null);
                            }
                          }}
                      style={{
                        default: {
                          fill: isSelected
                            ? (fills?.active ?? "rgba(255,255,255,0.07)")
                            : (fills?.default ?? "rgba(255,255,255,0.04)"),
                          stroke: isSelected
                            ? "rgba(255,255,255,0.5)"
                            : (fills ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.08)"),
                          strokeWidth: isSelected ? 0.8 : fills ? 0.5 : 0.3,
                          outline: "none",
                          cursor: data ? "pointer" : "default",
                          transition: "fill 0.15s ease",
                        },
                        hover: {
                          fill: fills?.hover ?? "rgba(255,255,255,0.10)",
                          stroke: fills ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.15)",
                          strokeWidth: 0.6,
                          outline: "none",
                          cursor: data ? "pointer" : "default",
                        },
                        pressed: { outline: "none" },
                      }}
                    />
                  );
                })
              }
            </Geographies>

            {/* ── India overlay — correct boundary per Survey of India ── */}
            <Geographies geography={INDIA_GEO_URL}>
              {({ geographies }) => {
                const indiaData = COUNTRY_DATA["356"];
                const fills = URGENCY_FILL[indiaData.urgency];
                const isSelected = selectedCountry === "356";
                return geographies.map((geo) => (
                  <Geography
                    key={"india-overlay-" + geo.rsmKey}
                    geography={geo}
                    onMouseEnter={(e) =>
                      setTooltip({ x: e.clientX, y: e.clientY, id: "356" })
                    }
                    onMouseMove={(e) => {
                      if (tooltip?.id === "356")
                        setTooltip({ x: e.clientX, y: e.clientY, id: "356" });
                    }}
                    onMouseLeave={() => setTooltip(null)}
                    onClick={() => {
                      setSelectedCountry(prev => {
                        if (prev !== "356") setShowNative(false);
                        return prev === "356" ? null : "356";
                      });
                      setTooltip(null);
                    }}
                    style={{
                      default: {
                        fill: isSelected ? fills.active : fills.default,
                        stroke: isSelected ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.18)",
                        strokeWidth: isSelected ? 0.8 : 0.5,
                        outline: "none",
                        cursor: "pointer",
                        transition: "fill 0.15s ease",
                      },
                      hover: {
                        fill: fills.hover,
                        stroke: "rgba(255,255,255,0.35)",
                        strokeWidth: 0.6,
                        outline: "none",
                        cursor: "pointer",
                      },
                      pressed: { outline: "none" },
                    }}
                  />
                ));
              }}
            </Geographies>

            {MARKERS.map((m) => (
              <Marker key={m.label} coordinates={m.coords}>
                {m.ring && (
                  <circle r={m.size * 2.5} fill="none" stroke={m.color} strokeWidth={0.6}
                    opacity={0.5} style={{ animation: "pulse-ring 2s ease-out infinite" }} />
                )}
                <circle r={m.size / 2} fill={m.color} />
                {m.ring && zoomed && (
                  <text textAnchor="middle" y={-m.size - 1}
                    style={{ fontFamily: "sans-serif", fontSize: "3px", fontWeight: 700, fill: m.color, letterSpacing: "0.05em" }}>
                    {m.label}
                  </text>
                )}
              </Marker>
            ))}
          </ZoomableGroup>
        </ComposableMap>

        {/* vignette */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at center, transparent 35%, rgba(13,13,13,0.65) 100%)" }} />
      </div>

      {/* ── Hover Tooltip ── */}
      {tooltip && COUNTRY_DATA[tooltip.id] && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{ left: tooltip.x + 14, top: tooltip.y - 10 }}
        >
          <div className="bg-[#1a1a1a]/95 backdrop-blur border border-white/15 rounded-lg px-3 py-2.5 shadow-xl min-w-[200px] max-w-[260px]">
            {(() => {
              const d = COUNTRY_DATA[tooltip.id];
              return (
                <>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="font-bold text-sm">{d.name}</span>
                    <Badge variant="outline" className={`text-[9px] shrink-0 ${URGENCY_BADGE[d.urgency]}`}>
                      {URGENCY_LABEL[d.urgency]}
                    </Badge>
                  </div>
                  <div className="space-y-1 mb-2">
                    {d.regulations.slice(0, 3).map(r => (
                      <div key={r.name} className="flex items-center gap-1.5">
                        <div className="w-1 h-1 rounded-full bg-[var(--rh-red)] shrink-0" />
                        <span className="text-[11px] text-white/70">{r.name}</span>
                      </div>
                    ))}
                    {d.regulations.length > 3 && (
                      <span className="text-[10px] text-white/40">+{d.regulations.length - 3} more</span>
                    )}
                  </div>
                  <p className="text-[10px] text-white/40">Click for full breakdown</p>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* ── Country Detail Panel ── */}
      {selectedData && !zoomed && (
        <div className="absolute top-16 right-4 bottom-4 w-80 z-40 flex flex-col">
          <div className="bg-[#141414]/96 backdrop-blur-md border border-white/10 rounded-xl overflow-hidden flex flex-col h-full shadow-2xl">

            {/* Panel header */}
            <div className="px-4 pt-4 pb-3 border-b border-white/10 shrink-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-bold text-base">
                      {showNative && selectedData.nativeName ? selectedData.nativeName : selectedData.name}
                    </h2>
                    {showNative && selectedData.nativeLang && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--rh-blue)]/20 text-[var(--rh-blue)] border border-[var(--rh-blue)]/30 font-medium">
                        {selectedData.nativeLang}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className={`text-[10px] ${URGENCY_BADGE[selectedData.urgency]}`}>
                      {URGENCY_LABEL[selectedData.urgency]} Sovereignty Urgency
                    </Badge>
                    <span className="text-[10px] text-white/40">{selectedData.region}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {/* Language toggle — only show when native content is available */}
                  {selectedData.nativeLang && (
                    <button
                      onClick={() => setShowNative(v => !v)}
                      title={showNative ? "Switch to English" : `Switch to ${selectedData.nativeLang}`}
                      className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium border transition-colors ${
                        showNative
                          ? "bg-[var(--rh-blue)]/20 border-[var(--rh-blue)]/40 text-[var(--rh-blue)]"
                          : "bg-white/5 border-white/15 text-white/50 hover:border-white/30"
                      }`}
                    >
                      <Languages className="w-3 h-3" />
                      {showNative ? "EN" : selectedData.nativeLang}
                    </button>
                  )}
                  <button onClick={() => { setSelectedCountry(null); setShowNative(false); }}
                    className="p-1 rounded hover:bg-white/10 transition-colors">
                    <X className="w-4 h-4 text-white/50" />
                  </button>
                </div>
              </div>

              <p className="text-xs text-white/60 leading-relaxed mt-2.5">
                {showNative && selectedData.nativeSummary ? selectedData.nativeSummary : selectedData.summary}
              </p>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">

              {/* Regulations */}
              <div>
                <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Shield className="w-3 h-3" />
                  {showNative && selectedData.nativeLang ? `Applicable Regulations · ${selectedData.nativeLang}` : "Applicable Regulations"}
                </p>
                <div className="space-y-2">
                  {(showNative && selectedData.nativeRegulations ? selectedData.nativeRegulations : selectedData.regulations).map(r => (
                    <div key={r.name} className="p-2.5 rounded-lg bg-white/5 border border-white/8">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-semibold leading-snug">{r.name}</span>
                        {r.deadline && (
                          <span className="text-[9px] bg-white/10 px-1.5 py-0.5 rounded font-mono shrink-0">{r.deadline}</span>
                        )}
                      </div>
                      <p className="text-[11px] text-white/50 mt-0.5">{r.shortDesc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* RH Products */}
              <div>
                <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Package className="w-3 h-3" /> Recommended Red Hat Stack
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedData.rhProducts.map(p => (
                    <span key={p} className="text-[10px] px-2 py-1 rounded-full bg-[var(--rh-red)]/15 border border-[var(--rh-red)]/30 text-[var(--rh-red)] font-medium">
                      {p}
                    </span>
                  ))}
                </div>
              </div>

              {/* Partner */}
              {selectedData.rhPartner && (
                <div>
                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Globe className="w-3 h-3" /> Sovereign Cloud Partner
                  </p>
                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[var(--rh-blue)]/10 border border-[var(--rh-blue)]/20">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[var(--rh-blue)] shrink-0" />
                    <span className="text-xs text-white/80">{selectedData.rhPartner}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Panel footer */}
            <div className="px-4 pb-4 pt-3 border-t border-white/10 shrink-0">
              <p className="text-[10px] text-white/30 text-center">Log in to generate a {selectedData.name} deal brief</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Login Card ── */}
      <div className={`absolute inset-0 flex items-center justify-center z-30 transition-all duration-700 ${
        zoomed ? "opacity-0 pointer-events-none scale-105 blur-sm" : "opacity-100"
      } ${selectedData ? "pointer-events-none -translate-x-40 opacity-60" : ""}`}>
        <div className="w-full max-w-sm bg-[#141414]/92 backdrop-blur-md p-7 rounded-xl border border-white/12 shadow-2xl">
          <div className="flex flex-col items-center mb-6">
            <div className="w-11 h-11 bg-[var(--rh-red)] flex items-center justify-center rounded-md mb-3">
              <span className="text-lg font-black leading-none uppercase">RH</span>
            </div>
            <h2 className="text-xl font-bold">Field Enablement</h2>
            <p className="text-white/50 text-xs mt-1.5 text-center">
              Geo-personalized sovereign cloud sales intelligence
            </p>
          </div>

          {!selectedData && (
            <p className="text-[11px] text-white/30 text-center mb-4 flex items-center justify-center gap-1.5">
              <Globe className="w-3 h-3" /> Hover a country to explore sovereignty regulations
            </p>
          )}
          {selectedData && (
            <div className="mb-4 p-2.5 rounded-lg bg-white/5 border border-white/10 text-center">
              <p className="text-[11px] text-white/60">
                Viewing <span className="text-white font-semibold">{selectedData.name}</span> — {selectedData.regulations.length} active regulations
              </p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-3.5">
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-white/50 uppercase tracking-wider">Corporate ID</label>
              <Input defaultValue="sarah.k@redhat.com"
                className="bg-white/6 border-white/12 focus-visible:ring-[var(--rh-red)] font-mono text-sm h-9" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-white/50 uppercase tracking-wider">Password / Token</label>
              <Input type="password" defaultValue="••••••••••••"
                className="bg-white/6 border-white/12 focus-visible:ring-[var(--rh-red)] h-9" />
            </div>

            <Button type="submit" disabled={loggingIn}
              className="w-full bg-[var(--rh-red)] hover:bg-[var(--rh-red-dark)] text-white h-11 text-sm font-bold tracking-wide mt-1">
              {loggingIn ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  AUTHENTICATING...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <LogIn className="w-4 h-4" /> SINGLE SIGN-ON
                </span>
              )}
            </Button>
          </form>

          <div className="mt-4 flex items-center justify-center gap-2 text-[11px] text-white/30">
            <Shield className="w-3 h-3" />
            <span>Secured by Red Hat Identity</span>
          </div>
        </div>
      </div>

      {/* ── Post-login EMEA card ── */}
      <div className={`absolute bottom-10 right-10 z-40 transition-all duration-700 delay-300 ${
        zoomed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6 pointer-events-none"
      }`}>
        <div className="bg-[#141414]/96 backdrop-blur border border-white/12 p-5 rounded-xl shadow-2xl w-76">
          <h3 className="font-bold text-base mb-1.5 flex items-center gap-2">
            <Globe className="w-4 h-4 text-[var(--rh-blue)]" />
            EMEA Context Active
          </h3>
          <p className="text-xs text-white/55 mb-3">Western Europe regulatory ruleset applied.</p>
          <div className="flex flex-wrap gap-1.5 mb-4">
            {["GDPR", "NIS2", "EU Data Act", "BSI C5"].map(tag => (
              <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--rh-red)]/20 text-[var(--rh-red)] border border-[var(--rh-red)]/30 font-medium">{tag}</span>
            ))}
          </div>
          <Button variant="outline" className="w-full border-white/15 hover:bg-white/10 hover:text-white text-white/70 h-9 text-xs"
            onClick={() => setLocation("/home")}>
            Enter Dashboard <ArrowRight className="w-3.5 h-3.5 ml-2" />
          </Button>
        </div>
      </div>

      <style>{`
        @keyframes pulse-ring {
          0%   { r: 2; opacity: 0.7; }
          70%  { r: 9; opacity: 0; }
          100% { r: 2; opacity: 0; }
        }
      `}</style>
    </div>
  );
}
