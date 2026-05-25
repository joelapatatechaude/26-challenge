import React from "react";
import { AppLayout } from "./_shared/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShieldAlert, Check, X, Eye, FileText, Video, PenTool } from "lucide-react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

const MOCK_DATA = [
  { id: 1, content: "Deutsche Telekom OpenShift Deck", type: "Presentation", icon: FileText, terr: "EMEA/Germany", req: "Sarah K.", conf: 94, status: "Pending Review" },
  { id: 2, content: "France Telecom Sovereignty Brief", type: "Asset", icon: PenTool, terr: "EMEA/France", req: "Marc D.", conf: 87, status: "Under Review" },
  { id: 3, content: "APAC Data Residency Training", type: "Training", icon: Video, terr: "APAC", req: "James L.", conf: 91, status: "Approved" },
  { id: 4, content: "Iberia Cloud Brief", type: "Presentation", icon: FileText, terr: "EMEA/Spain", req: "Ana G.", conf: 79, status: "Needs Revision" },
];

export function SMEReview() {
  return (
    <AppLayout activePath="/sme-review">
      <div className="p-6 h-full flex flex-col max-w-7xl mx-auto">
        
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">Content Governance</h1>
            <p className="text-sm text-[var(--rh-silver)] mt-1">SME Review Queue</p>
          </div>
          <Badge className="bg-[var(--rh-blue)]/20 text-[var(--rh-blue)] border-[var(--rh-blue)]/50 px-3 py-1 font-bold">
            Role: Subject Matter Expert
          </Badge>
        </div>

        <div className="bg-[var(--rh-orange)]/10 border border-[var(--rh-orange)]/30 rounded-md p-3 mb-6 flex items-center gap-3 text-[var(--rh-orange)]">
          <ShieldAlert className="w-5 h-5 shrink-0" />
          <p className="text-sm font-medium">All AI-generated content requires SME approval before field use.</p>
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
              {MOCK_DATA.map((item) => (
                <Collapsible asChild key={item.id}>
                  <>
                    <TableRow className="border-b border-[var(--rh-charcoal-light)] hover:bg-[var(--rh-charcoal-light)]/50 cursor-pointer">
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
                              className={`h-full ${item.conf > 90 ? 'bg-[var(--rh-green)]' : item.conf > 80 ? 'bg-[var(--rh-orange)]' : 'bg-[var(--rh-red)]'}`} 
                              style={{ width: `${item.conf}%` }} 
                            />
                          </div>
                          <span className="text-xs font-bold text-[var(--rh-silver)]">{item.conf}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={
                            item.status === "Approved" ? "text-[var(--rh-green)] border-[var(--rh-green)]" :
                            item.status === "Needs Revision" ? "text-[var(--rh-red)] border-[var(--rh-red)]" :
                            "text-[var(--rh-orange)] border-[var(--rh-orange)]"
                          }
                        >
                          {item.status}
                          {item.status === "Approved" && " ✓"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 hover:bg-[var(--rh-charcoal)] text-[var(--rh-silver)]">
                            <Eye className="w-4 h-4 mr-2" /> View
                          </Button>
                        </CollapsibleTrigger>
                      </TableCell>
                    </TableRow>
                    <CollapsibleContent asChild>
                      <TableRow className="border-b border-[var(--rh-charcoal-light)] bg-[var(--rh-charcoal)]/50">
                        <TableCell colSpan={7} className="p-0">
                          <div className="p-6 flex gap-6">
                            <div className="flex-1 bg-[var(--rh-charcoal-mid)] rounded border border-[var(--rh-charcoal-light)] p-4">
                              <h4 className="font-bold mb-4 flex items-center gap-2 text-sm uppercase tracking-wider text-[var(--rh-silver)]">AI Reasoning Notes</h4>
                              <p className="text-sm text-[var(--rh-silver)] mb-2">
                                <strong>Context match:</strong> Aligned successfully with German DSGVO requirements. Emphasized local data processing centers in Frankfurt.
                              </p>
                              <p className="text-sm text-[var(--rh-silver)]">
                                <strong>Tone check:</strong> Formal, technical, aligned with Public Sector standards.
                              </p>
                            </div>
                            
                            <div className="w-[300px] flex flex-col gap-3">
                              <h4 className="font-bold mb-1 flex items-center gap-2 text-sm uppercase tracking-wider text-[var(--rh-silver)]">Review Actions</h4>
                              <Button className="w-full bg-[var(--rh-green)] hover:bg-green-700 text-white justify-start">
                                <Check className="w-4 h-4 mr-2" /> Approve for Field
                              </Button>
                              <Button variant="outline" className="w-full border-[var(--rh-orange)] text-[var(--rh-orange)] hover:bg-[var(--rh-orange)] hover:text-white justify-start">
                                <PenTool className="w-4 h-4 mr-2" /> Request Revisions
                              </Button>
                              <Button variant="outline" className="w-full border-[var(--rh-red)] text-[var(--rh-red)] hover:bg-[var(--rh-red)] hover:text-white justify-start">
                                <X className="w-4 h-4 mr-2" /> Reject Concept
                              </Button>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    </CollapsibleContent>
                  </>
                </Collapsible>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </AppLayout>
  );
}
