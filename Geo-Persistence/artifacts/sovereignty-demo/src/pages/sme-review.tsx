import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ShieldAlert, Check, X, Eye, FileText, Video, PenTool, ChevronDown, ChevronUp, MessageSquare } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type ReviewStatus = "Pending Review" | "Under Review" | "Approved" | "Needs Revision";

type ReviewItem = {
  id: number;
  content: string;
  type: string;
  icon: React.ComponentType<{ className?: string }>;
  terr: string;
  req: string;
  conf: number;
  status: ReviewStatus;
  notes?: string;
};

const INITIAL_DATA: ReviewItem[] = [
  { id: 1, content: "Deutsche Telekom OpenShift Deck", type: "Presentation", icon: FileText, terr: "EMEA/Germany", req: "Sarah K.", conf: 94, status: "Pending Review" },
  { id: 2, content: "France Telecom Sovereignty Brief", type: "Asset", icon: PenTool, terr: "EMEA/France", req: "Marc D.", conf: 87, status: "Under Review" },
  { id: 3, content: "APAC Data Residency Training", type: "Training", icon: Video, terr: "APAC", req: "James L.", conf: 91, status: "Approved" },
  { id: 4, content: "Iberia Cloud Brief", type: "Presentation", icon: FileText, terr: "EMEA/Spain", req: "Ana G.", conf: 79, status: "Needs Revision" },
  { id: 5, content: "Nordic Public Sector OpenShift Guide", type: "Asset", icon: PenTool, terr: "EMEA/Nordics", req: "Erik S.", conf: 88, status: "Pending Review" },
];

const statusConfig: Record<ReviewStatus, { color: string; bg: string }> = {
  "Pending Review":  { color: "text-[var(--rh-orange)] border-[var(--rh-orange)]", bg: "bg-[var(--rh-orange)]/10" },
  "Under Review":    { color: "text-[var(--rh-blue)] border-[var(--rh-blue)]", bg: "bg-[var(--rh-blue)]/10" },
  "Approved":        { color: "text-[var(--rh-green)] border-[var(--rh-green)]", bg: "bg-[var(--rh-green)]/10" },
  "Needs Revision":  { color: "text-[var(--rh-red)] border-[var(--rh-red)]", bg: "bg-[var(--rh-red)]/10" },
};

export default function SMEReview() {
  const [data, setData] = useState<ReviewItem[]>(INITIAL_DATA);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [revisionNote, setRevisionNote] = useState("");

  const updateStatus = (id: number, status: ReviewStatus) => {
    setData(prev => prev.map(item => item.id === id ? { ...item, status } : item));
    setExpandedId(null);
    setRevisionNote("");
  };

  const pending = data.filter(d => d.status === "Pending Review" || d.status === "Under Review").length;

  return (
    <AppLayout activePath="/sme-review">
      <div className="p-6 h-full flex flex-col max-w-7xl mx-auto">

        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">Content Governance</h1>
            <p className="text-sm text-[var(--rh-silver)] mt-1">SME Review Queue — AI-generated content requiring approval before field use</p>
          </div>
          <Badge className="bg-[var(--rh-blue)]/20 text-[var(--rh-blue)] border-[var(--rh-blue)]/50 px-3 py-1 font-bold">
            Role: Subject Matter Expert
          </Badge>
        </div>

        <div className="bg-[var(--rh-orange)]/10 border border-[var(--rh-orange)]/30 rounded-md p-3 mb-6 flex items-center gap-3 text-[var(--rh-orange)]">
          <ShieldAlert className="w-5 h-5 shrink-0" />
          <p className="text-sm font-medium">
            {pending > 0
              ? `${pending} item${pending > 1 ? "s" : ""} awaiting SME approval — content is blocked from field use until reviewed.`
              : "All items have been reviewed. No pending approvals."}
          </p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {(["Pending Review", "Under Review", "Approved", "Needs Revision"] as ReviewStatus[]).map(status => {
            const count = data.filter(d => d.status === status).length;
            const cfg = statusConfig[status];
            return (
              <div key={status} className={`${cfg.bg} border rounded-lg p-4`} style={{ borderColor: `hsl(from currentColor h s l / 30%)` }}>
                <div className={`text-3xl font-bold ${cfg.color.split(" ")[0]}`}>{count}</div>
                <div className="text-xs text-[var(--rh-silver)] mt-1 font-medium">{status}</div>
              </div>
            );
          })}
        </div>

        <div className="bg-[var(--rh-charcoal-mid)] border border-[var(--rh-charcoal-light)] rounded-lg overflow-hidden flex-1 flex flex-col">
          <Table>
            <TableHeader className="bg-[var(--rh-charcoal)]">
              <TableRow className="border-b border-[var(--rh-charcoal-light)] hover:bg-transparent">
                <TableHead className="text-[var(--rh-silver)]">Content</TableHead>
                <TableHead className="text-[var(--rh-silver)]">Type</TableHead>
                <TableHead className="text-[var(--rh-silver)]">Territory</TableHead>
                <TableHead className="text-[var(--rh-silver)]">Requested By</TableHead>
                <TableHead className="text-[var(--rh-silver)]">AI Confidence</TableHead>
                <TableHead className="text-[var(--rh-silver)]">Status</TableHead>
                <TableHead className="text-right text-[var(--rh-silver)]">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map(item => (
                <>
                  <TableRow
                    key={item.id}
                    className="border-b border-[var(--rh-charcoal-light)] hover:bg-[var(--rh-charcoal-light)]/50 cursor-pointer"
                    onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <item.icon className="w-4 h-4 text-[var(--rh-silver)]" />
                        {item.content}
                      </div>
                    </TableCell>
                    <TableCell className="text-[var(--rh-silver)]">{item.type}</TableCell>
                    <TableCell className="text-[var(--rh-silver)]">{item.terr}</TableCell>
                    <TableCell className="text-[var(--rh-silver)]">{item.req}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-[var(--rh-charcoal)] rounded-full overflow-hidden">
                          <div
                            className={`h-full ${item.conf > 90 ? "bg-[var(--rh-green)]" : item.conf > 80 ? "bg-[var(--rh-orange)]" : "bg-[var(--rh-red)]"}`}
                            style={{ width: `${item.conf}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-[var(--rh-silver)]">{item.conf}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusConfig[item.status].color}>
                        {item.status}{item.status === "Approved" && " ✓"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" className="h-8 hover:bg-[var(--rh-charcoal)] text-[var(--rh-silver)]">
                        {expandedId === item.id ? <ChevronUp className="w-4 h-4 mr-1" /> : <Eye className="w-4 h-4 mr-1" />}
                        {expandedId === item.id ? "Close" : "View"}
                      </Button>
                    </TableCell>
                  </TableRow>

                  {expandedId === item.id && (
                    <TableRow key={`${item.id}-expanded`} className="border-b border-[var(--rh-charcoal-light)] bg-[var(--rh-charcoal)]/50">
                      <TableCell colSpan={7} className="p-0">
                        <div className="p-6 flex gap-6">
                          <div className="flex-1 bg-[var(--rh-charcoal-mid)] rounded border border-[var(--rh-charcoal-light)] p-4 space-y-4">
                            <h4 className="font-bold text-sm uppercase tracking-wider text-[var(--rh-silver)]">AI Reasoning Notes</h4>
                            <div className="space-y-2 text-sm text-[var(--rh-silver)]">
                              <p><strong className="text-white">Context match:</strong> Aligned with {item.terr} regulatory requirements. Emphasized relevant sovereign cloud partners and compliance frameworks.</p>
                              <p><strong className="text-white">Tone check:</strong> Formal, technical — aligned with enterprise sales standards.</p>
                              <p><strong className="text-white">Confidence breakdown:</strong> Product accuracy {item.conf + 2}% · Regulatory accuracy {item.conf - 5}% · Messaging alignment {item.conf}%</p>
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-[var(--rh-silver)] text-xs">
                                <MessageSquare className="w-3.5 h-3.5" />
                                <span className="font-semibold uppercase tracking-wider">Revision note (optional)</span>
                              </div>
                              <Textarea
                                value={revisionNote}
                                onChange={e => setRevisionNote(e.target.value)}
                                placeholder="Describe what needs to change..."
                                className="bg-[var(--rh-charcoal)] border-[var(--rh-charcoal-light)] text-sm resize-none h-20"
                              />
                            </div>
                          </div>

                          <div className="w-[280px] flex flex-col gap-3">
                            <h4 className="font-bold text-sm uppercase tracking-wider text-[var(--rh-silver)]">Review Actions</h4>
                            <Button
                              className="w-full bg-[var(--rh-green)] hover:bg-green-700 text-white justify-start"
                              onClick={() => updateStatus(item.id, "Approved")}
                            >
                              <Check className="w-4 h-4 mr-2" /> Approve for Field
                            </Button>
                            <Button
                              variant="outline"
                              className="w-full border-[var(--rh-orange)] text-[var(--rh-orange)] hover:bg-[var(--rh-orange)] hover:text-white justify-start"
                              onClick={() => updateStatus(item.id, "Needs Revision")}
                            >
                              <PenTool className="w-4 h-4 mr-2" /> Request Revisions
                            </Button>
                            <Button
                              variant="outline"
                              className="w-full border-[var(--rh-red)] text-[var(--rh-red)] hover:bg-[var(--rh-red)] hover:text-white justify-start"
                              onClick={() => updateStatus(item.id, "Needs Revision")}
                            >
                              <X className="w-4 h-4 mr-2" /> Reject Concept
                            </Button>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </AppLayout>
  );
}
