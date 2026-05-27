import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, Globe, User, Bell, Cpu, Shield, Save } from "lucide-react";

export default function Settings() {
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
      <div className="p-6 max-w-4xl mx-auto">

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Settings</h1>
            <p className="text-sm text-[var(--rh-silver)]">Manage your territory profile, AI preferences, and notifications.</p>
          </div>
          <Button
            onClick={handleSave}
            className="bg-[var(--rh-red)] hover:bg-[var(--rh-red-dark)] text-on-dark px-6 h-10"
          >
            {saved
              ? <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Saved</span>
              : <span className="flex items-center gap-2"><Save className="w-4 h-4" /> Save Changes</span>}
          </Button>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="bg-[var(--rh-charcoal-mid)] border border-[var(--rh-charcoal-light)] p-1 h-auto gap-1">
            <TabsTrigger value="profile" className="flex items-center gap-2 data-[state=active]:bg-[var(--rh-charcoal-light)] data-[state=active]:text-white text-[var(--rh-silver)] px-4 py-2 rounded">
              <User className="w-3.5 h-3.5" /> Profile
            </TabsTrigger>
            <TabsTrigger value="territory" className="flex items-center gap-2 data-[state=active]:bg-[var(--rh-charcoal-light)] data-[state=active]:text-white text-[var(--rh-silver)] px-4 py-2 rounded">
              <Globe className="w-3.5 h-3.5" /> Territory
            </TabsTrigger>
            <TabsTrigger value="ai" className="flex items-center gap-2 data-[state=active]:bg-[var(--rh-charcoal-light)] data-[state=active]:text-white text-[var(--rh-silver)] px-4 py-2 rounded">
              <Cpu className="w-3.5 h-3.5" /> AI Preferences
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2 data-[state=active]:bg-[var(--rh-charcoal-light)] data-[state=active]:text-white text-[var(--rh-silver)] px-4 py-2 rounded">
              <Bell className="w-3.5 h-3.5" /> Notifications
            </TabsTrigger>
            <TabsTrigger value="governance" className="flex items-center gap-2 data-[state=active]:bg-[var(--rh-charcoal-light)] data-[state=active]:text-white text-[var(--rh-silver)] px-4 py-2 rounded">
              <Shield className="w-3.5 h-3.5" /> Governance
            </TabsTrigger>
          </TabsList>

          {/* PROFILE */}
          <TabsContent value="profile">
            <SettingsSection title="User Profile" description="Your Red Hat identity and display preferences.">
              <div className="grid grid-cols-2 gap-6">
                <Field label="Full Name"><Input defaultValue="Sarah Krishnamurthy" className="bg-[var(--rh-charcoal)] border-[var(--rh-charcoal-light)]" /></Field>
                <Field label="Corporate Email"><Input defaultValue="sarah.k@redhat.com" className="bg-[var(--rh-charcoal)] border-[var(--rh-charcoal-light)] font-mono" /></Field>
                <Field label="Role / Title"><Input defaultValue="Senior Account Executive" className="bg-[var(--rh-charcoal)] border-[var(--rh-charcoal-light)]" /></Field>
                <Field label="Display Language">
                  <Select defaultValue="en">
                    <SelectTrigger className="bg-[var(--rh-charcoal)] border-[var(--rh-charcoal-light)]"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-[var(--rh-charcoal-mid)] border-[var(--rh-charcoal-light)] text-white">
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="de">Deutsch</SelectItem>
                      <SelectItem value="fr">Français</SelectItem>
                      <SelectItem value="es">Español</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            </SettingsSection>
          </TabsContent>

          {/* TERRITORY */}
          <TabsContent value="territory">
            <SettingsSection title="Territory Configuration" description="Controls which regional news, regulatory context, and partner content is surfaced.">
              <div className="grid grid-cols-2 gap-6">
                <Field label="Primary Territory">
                  <Select defaultValue="emea-west">
                    <SelectTrigger className="bg-[var(--rh-charcoal)] border-[var(--rh-charcoal-light)]"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-[var(--rh-charcoal-mid)] border-[var(--rh-charcoal-light)] text-white">
                      <SelectItem value="emea-west">EMEA — Western Europe</SelectItem>
                      <SelectItem value="emea-central">EMEA — Central Europe (DACH)</SelectItem>
                      <SelectItem value="emea-nordics">EMEA — Nordics</SelectItem>
                      <SelectItem value="emea-fr">EMEA — France & Benelux</SelectItem>
                      <SelectItem value="apac">APAC</SelectItem>
                      <SelectItem value="na">North America</SelectItem>
                      <SelectItem value="latam">Latin America</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Regulatory Ruleset">
                  <Select defaultValue="eu-gdpr-nis2">
                    <SelectTrigger className="bg-[var(--rh-charcoal)] border-[var(--rh-charcoal-light)]"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-[var(--rh-charcoal-mid)] border-[var(--rh-charcoal-light)] text-white">
                      <SelectItem value="eu-gdpr-nis2">EU — GDPR + NIS2 + EU Data Act</SelectItem>
                      <SelectItem value="de-bsi">Germany — BSI IT-Grundschutz</SelectItem>
                      <SelectItem value="fr-anssi">France — ANSSI / SecNumCloud</SelectItem>
                      <SelectItem value="apac-pdpa">APAC — PDPA / Privacy Act</SelectItem>
                      <SelectItem value="us-fedramp">US — FedRAMP</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Default Partner Focus">
                  <Select defaultValue="t-systems">
                    <SelectTrigger className="bg-[var(--rh-charcoal)] border-[var(--rh-charcoal-light)]"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-[var(--rh-charcoal-mid)] border-[var(--rh-charcoal-light)] text-white">
                      <SelectItem value="t-systems">T-Systems OTC</SelectItem>
                      <SelectItem value="ovhcloud">OVHcloud (SecNumCloud)</SelectItem>
                      <SelectItem value="ionos">Ionos</SelectItem>
                      <SelectItem value="outscale">Outscale / Dassault</SelectItem>
                      <SelectItem value="all">Show All Partners</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Currency / Market Context">
                  <Select defaultValue="eur">
                    <SelectTrigger className="bg-[var(--rh-charcoal)] border-[var(--rh-charcoal-light)]"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-[var(--rh-charcoal-mid)] border-[var(--rh-charcoal-light)] text-white">
                      <SelectItem value="eur">EUR — Europe</SelectItem>
                      <SelectItem value="gbp">GBP — UK</SelectItem>
                      <SelectItem value="usd">USD — Global</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              <div className="mt-6 p-4 rounded-lg bg-[var(--rh-charcoal)] border border-[var(--rh-charcoal-light)]">
                <div className="flex items-center gap-2 mb-3">
                  <Globe className="w-4 h-4 text-[var(--rh-blue)]" />
                  <span className="text-sm font-semibold">Active Context</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {["EMEA — Western Europe", "GDPR + NIS2 + EU Data Act", "T-Systems OTC", "BSI C5"].map(tag => (
                    <Badge key={tag} variant="outline" className="text-[var(--rh-blue)] border-[var(--rh-blue)]/40 bg-[var(--rh-blue)]/10 text-xs">{tag}</Badge>
                  ))}
                </div>
              </div>
            </SettingsSection>
          </TabsContent>

          {/* AI PREFERENCES */}
          <TabsContent value="ai">
            <SettingsSection title="AI Content Preferences" description="Configure how the AI toolkit generates and personalizes content.">
              <div className="space-y-5">
                <Field label="Default Generation Model">
                  <Select defaultValue="gpt4o">
                    <SelectTrigger className="bg-[var(--rh-charcoal)] border-[var(--rh-charcoal-light)]"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-[var(--rh-charcoal-mid)] border-[var(--rh-charcoal-light)] text-white">
                      <SelectItem value="gpt4o">GPT-4o (Recommended)</SelectItem>
                      <SelectItem value="claude">Claude 3.5 Sonnet</SelectItem>
                      <SelectItem value="granite">Red Hat Granite (Sovereign)</SelectItem>
                      <SelectItem value="mistral">Mistral Large (EU Hosted)</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>

                <div className="grid gap-4">
                  {[
                    { label: "Auto-inject territory regulatory context", desc: "Automatically adds relevant GDPR, NIS2, DSGVO references to generated content", defaultOn: true },
                    { label: "Include partner ecosystem references", desc: "Mentions certified sovereign cloud partners (T-Systems OTC, OVHcloud, etc.)", defaultOn: true },
                    { label: "Require SME review before export", desc: "All AI-generated content must pass SME review before field distribution", defaultOn: true },
                    { label: "Auto-translate for territory language", desc: "Optionally generate a translated version alongside English output", defaultOn: false },
                    { label: "Include competitive displacement messaging", desc: "Add relevant VMware and hyperscaler displacement talking points", defaultOn: true },
                    { label: "Confidence score warnings", desc: "Show warnings when AI confidence falls below 80%", defaultOn: true },
                  ].map(opt => (
                    <ToggleRow key={opt.label} label={opt.label} desc={opt.desc} defaultOn={opt.defaultOn} />
                  ))}
                </div>
              </div>
            </SettingsSection>
          </TabsContent>

          {/* NOTIFICATIONS */}
          <TabsContent value="notifications">
            <SettingsSection title="Notification Preferences" description="Choose what alerts and digests you receive.">
              <div className="space-y-4">
                {[
                  { label: "SME Review approvals", desc: "Notify when your submitted content is approved or needs revision", defaultOn: true },
                  { label: "Territory regulatory alerts", desc: "Breaking news on EU Data Act, NIS2, DSGVO, and other EMEA regulations", defaultOn: true },
                  { label: "Weekly territory digest", desc: "Monday morning summary of key regulatory and competitive developments", defaultOn: true },
                  { label: "Partner ecosystem updates", desc: "Announcements from T-Systems OTC, OVHcloud, and other sovereign cloud partners", defaultOn: false },
                  { label: "New content library sources", desc: "Alerts when new EMEA sales plays or product datasheets are added", defaultOn: true },
                  { label: "Competitive intelligence alerts", desc: "VMware pricing changes, hyperscaler sovereign zone announcements", defaultOn: false },
                ].map(opt => (
                  <ToggleRow key={opt.label} label={opt.label} desc={opt.desc} defaultOn={opt.defaultOn} />
                ))}
              </div>
            </SettingsSection>
          </TabsContent>

          {/* GOVERNANCE */}
          <TabsContent value="governance">
            <SettingsSection title="Content Governance" description="Manage your SME review role and approval authorities.">
              <div className="space-y-6">
                <div className="p-4 rounded-lg bg-[var(--rh-charcoal)] border border-[var(--rh-charcoal-light)]">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-semibold text-sm">Your Governance Role</p>
                      <p className="text-xs text-[var(--rh-silver)] mt-1">Determines which content you can approve for field use</p>
                    </div>
                    <Badge className="bg-[var(--rh-blue)]/20 text-[var(--rh-blue)] border-[var(--rh-blue)]/40">Subject Matter Expert</Badge>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {["EMEA — Western Europe", "Sovereign Cloud", "OpenShift", "RHEL", "Ansible"].map(scope => (
                      <Badge key={scope} variant="outline" className="text-[var(--rh-silver)] border-[var(--rh-charcoal-light)] text-xs">{scope}</Badge>
                    ))}
                  </div>
                </div>

                <div className="grid gap-4">
                  {[
                    { label: "Auto-approve high-confidence content (>95%)", desc: "Skip review queue for content with very high AI confidence scores", defaultOn: false },
                    { label: "Delegate reviews when out-of-office", desc: "Automatically route to backup SME when you have an out-of-office set", defaultOn: true },
                    { label: "Require co-review for regulatory-sensitive content", desc: "NIS2 and DSGVO content requires two SME approvals", defaultOn: true },
                  ].map(opt => (
                    <ToggleRow key={opt.label} label={opt.label} desc={opt.desc} defaultOn={opt.defaultOn} />
                  ))}
                </div>
              </div>
            </SettingsSection>
          </TabsContent>
        </Tabs>
      </div>
  );
}

function SettingsSection({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="bg-[var(--rh-charcoal-mid)] rounded-lg border border-[var(--rh-charcoal-light)] p-6">
      <div className="mb-6">
        <h2 className="text-lg font-bold">{title}</h2>
        <p className="text-sm text-[var(--rh-silver)] mt-1">{description}</p>
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="text-xs uppercase text-[var(--rh-silver)] tracking-wider">{label}</Label>
      {children}
    </div>
  );
}

function ToggleRow({ label, desc, defaultOn }: { label: string; desc: string; defaultOn: boolean }) {
  const [on, setOn] = useState(defaultOn);
  return (
    <div className="flex items-center justify-between p-3 rounded-md bg-[var(--rh-charcoal)] border border-[var(--rh-charcoal-light)]">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-[var(--rh-silver)] mt-0.5">{desc}</p>
      </div>
      <Switch checked={on} onCheckedChange={setOn} className="data-[state=checked]:bg-[var(--rh-red)] shrink-0 ml-4" />
    </div>
  );
}
