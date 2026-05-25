import { AppLayout } from "@/components/AppLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Plus, Edit, Globe, Activity, TrendingUp, AlertTriangle } from "lucide-react";
import { useLocation } from "wouter";

export default function HomeDashboard() {
  const [, setLocation] = useLocation();

  return (
    <AppLayout activePath="/home">
      <div className="p-6 h-full flex flex-col gap-6 max-w-7xl mx-auto">

        <div className="flex-1 flex gap-6 min-h-0">
          {/* LEFT: Territory News */}
          <div className="flex-[2] flex flex-col min-h-0 bg-[var(--rh-charcoal-mid)] rounded-lg border border-[var(--rh-charcoal-light)] shadow-sm">
            <div className="p-5 border-b border-[var(--rh-charcoal-light)] flex items-center justify-between">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Globe className="w-5 h-5 text-[var(--rh-blue)]" />
                Your Territory News
              </h2>
              <Badge variant="outline" className="bg-[var(--rh-charcoal)] text-[var(--rh-silver)]">Western Europe Context</Badge>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <NewsCard
                title="EU Data Act enters force: Implications for cloud portability"
                source="European Commission"
                time="2 hours ago"
                type="Legislative"
                typeColor="text-[var(--rh-blue)] border-[var(--rh-blue)]"
                content="New provisions affecting vendor lock-in and data sharing mandates for connected devices."
              />
              <NewsCard
                title="German DSGVO update strictly regulates third-country transfers"
                source="BfDI Germany"
                time="5 hours ago"
                type="Regulatory"
                typeColor="text-[var(--rh-red)] border-[var(--rh-red)]"
                content="Stringent requirements for using US-based cloud providers for public sector data."
              />
              <NewsCard
                title="NIS2 Compliance Deadline Approaching"
                source="ENISA"
                time="1 day ago"
                type="Regulatory"
                typeColor="text-[var(--rh-red)] border-[var(--rh-red)]"
                content="Essential entities must implement risk management measures by Q3."
              />
              <NewsCard
                title="French 'Cloud de Confiance' label gains market traction"
                source="ANSSI"
                time="2 days ago"
                type="Market"
                typeColor="text-[var(--rh-green)] border-[var(--rh-green)]"
                content="SecNumCloud certification becoming de facto standard for large enterprises."
              />
              <NewsCard
                title="T-Systems OTC expands OpenShift managed service to GovCloud tier"
                source="T-Systems"
                time="3 days ago"
                type="Partner"
                typeColor="text-[var(--rh-orange)] border-[var(--rh-orange)]"
                content="New sovereign cloud tier enables BSI C5 workloads for German federal agencies."
              />
            </div>
          </div>

          {/* RIGHT: Quick Actions & Alerts */}
          <div className="flex-1 flex flex-col gap-6">
            <Card className="bg-[var(--rh-charcoal-mid)] border-[var(--rh-charcoal-light)] text-white">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  className="w-full justify-start gap-3 bg-[var(--rh-red)] hover:bg-[var(--rh-red-dark)] text-white h-11"
                  onClick={() => setLocation("/ai-toolkit")}
                >
                  <Plus className="w-4 h-4" />
                  Generate Presentation
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start gap-3 border-[var(--rh-charcoal-light)] hover:bg-[var(--rh-charcoal-light)] hover:text-white h-11 text-[var(--rh-silver)] bg-[var(--rh-charcoal)]"
                  onClick={() => setLocation("/ai-toolkit")}
                >
                  <Edit className="w-4 h-4" />
                  Customize Asset
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start gap-3 border-[var(--rh-charcoal-light)] hover:bg-[var(--rh-charcoal-light)] hover:text-white h-11 text-[var(--rh-silver)] bg-[var(--rh-charcoal)]"
                  onClick={() => setLocation("/content")}
                >
                  <FileText className="w-4 h-4" />
                  Draft Content
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-[var(--rh-charcoal-mid)] border-[var(--rh-charcoal-light)] text-white flex-1">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Governance</CardTitle>
                <Badge className="bg-[var(--rh-orange)] text-white border-0">3 Pending</Badge>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-3 rounded-md bg-[var(--rh-charcoal)] border border-[var(--rh-charcoal-light)]">
                    <AlertTriangle className="w-5 h-5 text-[var(--rh-orange)] mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium">SME Review Required</p>
                      <p className="text-xs text-[var(--rh-silver)] mt-1">3 generated assets are awaiting SME approval before field use.</p>
                      <Button
                        variant="link"
                        className="h-auto p-0 text-[var(--rh-blue)] text-xs mt-2"
                        onClick={() => setLocation("/sme-review")}
                      >
                        View Queue →
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* BOTTOM: Regional Stats */}
        <div className="h-24 shrink-0 bg-[var(--rh-charcoal-mid)] rounded-lg border border-[var(--rh-charcoal-light)] flex items-center px-8 justify-between">
          <Stat label="Active Accounts" value="12" icon={Activity} />
          <div className="w-px h-12 bg-[var(--rh-charcoal-light)]"></div>
          <Stat label="Territory Pipeline" value="€4.2M" icon={TrendingUp} />
          <div className="w-px h-12 bg-[var(--rh-charcoal-light)]"></div>
          <Stat label="Content Generated This Month" value="47" icon={FileText} />
        </div>
      </div>
    </AppLayout>
  );
}

function NewsCard({ title, source, time, type, typeColor, content }: {
  title: string; source: string; time: string; type: string; typeColor: string; content: string;
}) {
  return (
    <div className="p-4 rounded-md bg-[var(--rh-charcoal)] border border-[var(--rh-charcoal-light)] hover:border-[var(--rh-silver)] transition-colors cursor-pointer">
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-bold text-sm leading-snug pr-2">{title}</h3>
        <Badge variant="outline" className={`text-[10px] uppercase bg-transparent shrink-0 ${typeColor}`}>{type}</Badge>
      </div>
      <p className="text-xs text-[var(--rh-silver)] mb-3">{content}</p>
      <div className="flex items-center gap-3 text-[10px] text-[var(--rh-silver)] font-medium">
        <span className="uppercase tracking-wider">{source}</span>
        <span>•</span>
        <span>{time}</span>
      </div>
    </div>
  );
}

function Stat({ label, value, icon: Icon }: { label: string; value: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="flex items-center gap-4">
      <div className="w-10 h-10 rounded-full bg-[var(--rh-charcoal)] flex items-center justify-center border border-[var(--rh-charcoal-light)]">
        <Icon className="w-5 h-5 text-[var(--rh-red)]" />
      </div>
      <div>
        <div className="text-2xl font-bold tracking-tight">{value}</div>
        <div className="text-xs text-[var(--rh-silver)] uppercase tracking-wider">{label}</div>
      </div>
    </div>
  );
}
