import React, { useState } from "react";
import { AppLayout } from "./_shared/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Sparkles, Loader2, CheckCircle2 } from "lucide-react";

export function AIToolkit() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDone, setIsDone] = useState(false);

  const handleGenerate = () => {
    setIsGenerating(true);
    setIsDone(false);
    setTimeout(() => {
      setIsGenerating(false);
      setIsDone(true);
    }, 2000);
  };

  return (
    <AppLayout activePath="/ai-toolkit">
      <div className="p-6 h-full flex flex-col max-w-7xl mx-auto">
        
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">AI Content Toolkit</h1>
            <p className="text-sm text-[var(--rh-silver)]">Generate highly-contextualized assets tailored for your region.</p>
          </div>
          <Badge className="bg-[var(--rh-charcoal-mid)] text-white border-[var(--rh-charcoal-light)] px-3 py-1 text-xs">
            Context: <span className="text-[var(--rh-blue)] ml-1 font-bold">EMEA Territory</span>
          </Badge>
        </div>

        <Tabs defaultValue="presentation" className="flex-1 flex flex-col min-h-0">
          <TabsList className="bg-[var(--rh-charcoal-mid)] border-b border-[var(--rh-charcoal-light)] p-0 h-auto justify-start w-full rounded-none">
            <TabsTrigger value="presentation" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-[var(--rh-red)] data-[state=active]:text-white rounded-none px-6 py-3 text-[var(--rh-silver)]">Presentation Generator</TabsTrigger>
            <TabsTrigger value="asset" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-[var(--rh-red)] data-[state=active]:text-white rounded-none px-6 py-3 text-[var(--rh-silver)]">Asset Customizer</TabsTrigger>
            <TabsTrigger value="draft" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-[var(--rh-red)] data-[state=active]:text-white rounded-none px-6 py-3 text-[var(--rh-silver)]">Draft Creator</TabsTrigger>
          </TabsList>

          <TabsContent value="presentation" className="flex-1 min-h-0 mt-6 outline-none">
            <div className="flex gap-6 h-full">
              
              {/* Left Form */}
              <div className="w-1/2 flex flex-col gap-6 bg-[var(--rh-charcoal-mid)] rounded-lg border border-[var(--rh-charcoal-light)] p-6 overflow-y-auto">
                <div className="space-y-2">
                  <Label className="text-xs uppercase text-[var(--rh-silver)] tracking-wider">Prompt Context</Label>
                  <Textarea 
                    className="min-h-[120px] bg-[var(--rh-charcoal)] border-[var(--rh-charcoal-light)] focus-visible:ring-[var(--rh-red)] resize-none"
                    defaultValue="Deutsche Telekom | OpenShift on sovereign cloud | Data residency compliance focus. Emphasize multi-cloud flexibility and local German support."
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs uppercase text-[var(--rh-silver)] tracking-wider">Region Target</Label>
                    <Select defaultValue="de">
                      <SelectTrigger className="bg-[var(--rh-charcoal)] border-[var(--rh-charcoal-light)] focus:ring-[var(--rh-red)]">
                        <SelectValue placeholder="Select region" />
                      </SelectTrigger>
                      <SelectContent className="bg-[var(--rh-charcoal-mid)] border-[var(--rh-charcoal-light)] text-white">
                        <SelectItem value="de">Germany (EMEA)</SelectItem>
                        <SelectItem value="fr">France (EMEA)</SelectItem>
                        <SelectItem value="uk">UK (EMEA)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs uppercase text-[var(--rh-silver)] tracking-wider">Industry</Label>
                    <Select defaultValue="telco">
                      <SelectTrigger className="bg-[var(--rh-charcoal)] border-[var(--rh-charcoal-light)] focus:ring-[var(--rh-red)]">
                        <SelectValue placeholder="Select industry" />
                      </SelectTrigger>
                      <SelectContent className="bg-[var(--rh-charcoal-mid)] border-[var(--rh-charcoal-light)] text-white">
                        <SelectItem value="telco">Telecommunications</SelectItem>
                        <SelectItem value="pubsec">Public Sector</SelectItem>
                        <SelectItem value="fsi">Financial Services</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="mt-auto pt-6 border-t border-[var(--rh-charcoal-light)]">
                  <Button 
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className="w-full bg-[var(--rh-red)] hover:bg-[var(--rh-red-dark)] h-12 text-sm font-bold tracking-wide"
                  >
                    {isGenerating ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> Generating...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4" /> Generate Presentation
                      </span>
                    )}
                  </Button>
                </div>
              </div>

              {/* Right Preview */}
              <div className="w-1/2 bg-[var(--rh-charcoal)] rounded-lg border border-[var(--rh-charcoal-light)] border-dashed p-6 flex flex-col items-center justify-center relative overflow-hidden">
                {!isGenerating && !isDone && (
                  <div className="text-center text-[var(--rh-silver)] flex flex-col items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-[var(--rh-charcoal-mid)] flex items-center justify-center">
                      <Sparkles className="w-8 h-8 opacity-50" />
                    </div>
                    <p>Preview will appear here</p>
                  </div>
                )}
                
                {isGenerating && (
                  <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-12 h-12 text-[var(--rh-red)] animate-spin" />
                    <p className="font-bold text-lg animate-pulse">AI Processing...</p>
                    <div className="w-48 h-1 bg-[var(--rh-charcoal-mid)] rounded-full overflow-hidden mt-2">
                      <div className="h-full bg-[var(--rh-red)] animate-[pulse_2s_ease-in-out_infinite]" style={{ width: '60%' }}></div>
                    </div>
                  </div>
                )}

                {isDone && (
                  <div className="w-full h-full flex flex-col animate-in fade-in duration-500">
                    <div className="flex items-center justify-between mb-4 shrink-0">
                      <h3 className="font-bold">Preview</h3>
                      <Badge className="bg-[var(--rh-green)]/20 text-[var(--rh-green)] border-0 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Sent to SME Review
                      </Badge>
                    </div>
                    
                    <div className="flex-1 bg-white rounded-md shadow-lg flex flex-col p-8 text-black overflow-hidden transform hover:scale-[1.02] transition-transform cursor-pointer">
                      <div className="mb-auto">
                        <div className="w-12 h-12 bg-[var(--rh-red)] text-white font-black flex items-center justify-center text-xl mb-12">
                          RH
                        </div>
                      </div>
                      <div>
                        <h2 className="text-3xl font-bold mb-4 font-sans tracking-tight">
                          Deutsche Telekom <br/> Digital Sovereignty with OpenShift
                        </h2>
                        <p className="text-gray-600 font-medium">Securing cloud portability and data residency in Germany.</p>
                      </div>
                      <div className="mt-12 text-xs text-gray-400 font-bold uppercase tracking-widest border-t pt-4">
                        October 2023 / EMEA Sales Enablement
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
            </div>
          </TabsContent>
          
          <TabsContent value="asset" className="flex-1 p-8 text-center text-[var(--rh-silver)]">Asset customizer placeholder...</TabsContent>
          <TabsContent value="draft" className="flex-1 p-8 text-center text-[var(--rh-silver)]">Draft creator placeholder...</TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
