import React, { useState, useEffect } from "react";
import "./_shared/_group.css";
import { Button } from "@/components/ui/button";
import { LogIn, Globe, Shield, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";

export function MapLogin() {
  const [zoomed, setZoomed] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoggingIn(true);
    setTimeout(() => {
      setZoomed(true);
    }, 800);
  };

  return (
    <div className="relative w-full h-screen bg-[var(--rh-charcoal)] overflow-hidden rh-font text-white selection:bg-[var(--rh-red)]">
      {/* Top Bar */}
      <div className="absolute top-0 w-full h-16 flex items-center px-8 z-20 pointer-events-none">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[var(--rh-red)] flex items-center justify-center rounded-sm shadow-lg shadow-red-900/20">
            <span className="text-xs font-black leading-none uppercase tracking-tighter">RH</span>
          </div>
          <span className="font-bold text-lg tracking-tight uppercase text-[var(--rh-silver)]">
            <span className="text-white">Red Hat</span> Digital Sovereignty Field Enablement
          </span>
        </div>
      </div>

      {/* Map Background container */}
      <div 
        className={`absolute inset-0 transition-transform duration-[2000ms] ease-in-out origin-[55%_35%] ${zoomed ? 'scale-[3.5]' : 'scale-100'}`}
      >
        {/* SVG World Map */}
        <div className="w-full h-full flex items-center justify-center opacity-40">
          <svg viewBox="0 0 1008 650" className="w-full h-full max-w-[1400px]" fill="none" xmlns="http://www.w3.org/2000/svg">
            <g stroke="var(--rh-charcoal-light)" strokeWidth="0.5" fill="var(--rh-charcoal-mid)">
              {/* North America */}
              <path d="M110,120 Q150,90 200,100 T280,180 Q250,250 180,220 T110,120 Z" />
              <path d="M220,230 Q280,260 250,300 T200,320 Q180,280 220,230 Z" />
              {/* South America */}
              <path d="M250,310 Q320,320 350,450 T300,550 Q280,480 250,310 Z" />
              {/* Europe/EMEA - This is what we'll zoom in on */}
              <path id="europe" className={zoomed ? "fill-[var(--rh-charcoal-light)] transition-colors duration-1000" : ""} d="M480,150 Q550,130 600,180 T530,260 Q460,250 480,150 Z" />
              {/* Africa */}
              <path d="M470,270 Q550,260 620,380 T550,520 Q480,420 470,270 Z" />
              {/* Asia */}
              <path d="M610,150 Q750,100 850,180 T900,300 Q800,380 650,280 Z" />
              {/* Oceania */}
              <path d="M820,400 Q880,380 920,450 T850,520 Q780,450 820,400 Z" />
            </g>

            {/* Grid overlay for tactical feel */}
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="var(--rh-charcoal-mid)" strokeWidth="0.5" />
            </pattern>
            <rect width="100%" height="100%" fill="url(#grid)" pointerEvents="none" />
          </svg>
        </div>

        {/* Hotspots */}
        <div className="absolute top-[28%] left-[53%] -translate-x-1/2 -translate-y-1/2">
          <div className="relative">
            <div className="w-3 h-3 bg-[var(--rh-red)] rounded-full absolute z-10" />
            <div className="w-3 h-3 bg-[var(--rh-red)] rounded-full pulsing-dot" />
            <div className={`absolute top-4 -left-6 text-[10px] font-bold text-[var(--rh-red)] tracking-widest uppercase transition-opacity duration-500 ${zoomed ? 'opacity-100' : 'opacity-0'}`}>
              EMEA HQ
            </div>
          </div>
        </div>
        
        <div className="absolute top-[35%] left-[22%] -translate-x-1/2 -translate-y-1/2">
          <div className="relative">
            <div className="w-2 h-2 bg-[var(--rh-blue)] rounded-full absolute z-10" />
            <div className="w-2 h-2 bg-[var(--rh-blue)] rounded-full pulsing-dot" style={{ animationDelay: '1s' }} />
          </div>
        </div>

        <div className="absolute top-[48%] left-[82%] -translate-x-1/2 -translate-y-1/2">
          <div className="relative">
            <div className="w-2 h-2 bg-[var(--rh-orange)] rounded-full absolute z-10" />
            <div className="w-2 h-2 bg-[var(--rh-orange)] rounded-full pulsing-dot" style={{ animationDelay: '0.5s' }} />
          </div>
        </div>
      </div>

      {/* Login Overlay */}
      <div className={`absolute inset-0 flex items-center justify-center z-30 transition-all duration-1000 ${zoomed ? 'opacity-0 pointer-events-none scale-110 blur-sm' : 'opacity-100 scale-100'}`}>
        <div className="w-full max-w-md bg-[var(--rh-charcoal-mid)]/90 backdrop-blur-md p-8 rounded-lg border border-[var(--rh-charcoal-light)] shadow-2xl">
          <div className="flex flex-col items-center mb-8">
            <div className="w-12 h-12 bg-[var(--rh-red)] flex items-center justify-center rounded-md mb-4">
              <span className="text-xl font-black leading-none uppercase">RH</span>
            </div>
            <h2 className="text-2xl font-bold">Field Enablement</h2>
            <p className="text-[var(--rh-silver)] text-sm mt-2 text-center">
              Authenticate to access geo-personalized sales intelligence and sovereign cloud resources.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[var(--rh-silver)] uppercase tracking-wider">Corporate ID</label>
              <Input 
                defaultValue="sarah.k@redhat.com" 
                className="bg-[var(--rh-charcoal)] border-[var(--rh-charcoal-light)] focus-visible:ring-[var(--rh-red)] font-mono text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[var(--rh-silver)] uppercase tracking-wider">Password / Token</label>
              <Input 
                type="password"
                defaultValue="••••••••••••" 
                className="bg-[var(--rh-charcoal)] border-[var(--rh-charcoal-light)] focus-visible:ring-[var(--rh-red)]"
              />
            </div>
            
            <Button 
              type="submit" 
              className="w-full bg-[var(--rh-red)] hover:bg-[var(--rh-red-dark)] text-white mt-4 h-12 text-sm font-bold tracking-wide"
              disabled={loggingIn}
            >
              {loggingIn ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  AUTHENTICATING...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <LogIn className="w-4 h-4" />
                  SINGLE SIGN-ON
                </span>
              )}
            </Button>
          </form>

          <div className="mt-6 flex items-center justify-center gap-2 text-xs text-[var(--rh-silver)]">
            <Shield className="w-3 h-3" />
            <span>Secured by Red Hat Identity</span>
          </div>
        </div>
      </div>

      {/* Success state before redirecting (mockup) */}
      <div className={`absolute bottom-12 right-12 transition-all duration-700 delay-1000 ${zoomed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8 pointer-events-none'}`}>
        <div className="bg-[var(--rh-charcoal-mid)] border border-[var(--rh-charcoal-light)] p-6 rounded-lg shadow-2xl w-80">
          <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
            <Globe className="w-5 h-5 text-[var(--rh-blue)]" />
            EMEA Context Active
          </h3>
          <p className="text-sm text-[var(--rh-silver)] mb-4">
            Territory configuration loaded. Western Europe regulatory ruleset applied.
          </p>
          <Button 
            variant="outline" 
            className="w-full border-[var(--rh-charcoal-light)] hover:bg-[var(--rh-charcoal-light)] hover:text-white"
            onClick={() => window.location.href = '/home'}
          >
            Enter Dashboard <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}
