import React from "react";
import { Link } from "wouter";
import { LayoutDashboard, Settings, FileText, CheckCircle, Search, LogOut, ChevronDown, User, Globe } from "lucide-react";
import "./_group.css";
import { Button } from "@/components/ui/button";

interface AppLayoutProps {
  children: React.ReactNode;
  activePath: string;
}

export function AppLayout({ children, activePath }: AppLayoutProps) {
  return (
    <div className="flex h-screen w-full rh-font text-white bg-[var(--rh-charcoal)] overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 flex flex-col border-r border-[var(--rh-charcoal-light)] bg-[var(--rh-charcoal-mid)] shrink-0">
        <div className="h-16 flex items-center px-4 border-b border-[var(--rh-charcoal-light)]">
          <div className="flex items-center gap-2 text-white font-bold text-lg">
            <div className="w-6 h-6 bg-[var(--rh-red)] flex items-center justify-center rounded-sm">
              <span className="text-[10px] font-black leading-none uppercase">RH</span>
            </div>
            <span>Sales Enablement</span>
          </div>
        </div>

        <div className="p-4 py-6 flex-1 flex flex-col gap-2">
          <div className="text-[10px] font-bold text-[var(--rh-silver)] uppercase tracking-wider mb-2 px-3">
            Navigation
          </div>
          <NavItem href="/home" icon={LayoutDashboard} label="Home" active={activePath === "/home"} />
          <NavItem href="/ai-toolkit" icon={FileText} label="AI Toolkit" active={activePath === "/ai-toolkit"} />
          <NavItem href="/content" icon={Search} label="Content Library" active={activePath === "/content"} />
          <NavItem href="/sme-review" icon={CheckCircle} label="SME Review" active={activePath === "/sme-review"} badge="3" />
        </div>

        <div className="p-4 border-t border-[var(--rh-charcoal-light)] flex flex-col gap-2">
          <NavItem href="/settings" icon={Settings} label="Settings" active={activePath === "/settings"} />
          <button className="flex items-center gap-3 px-3 py-2 w-full rounded-md text-[var(--rh-silver)] hover:text-white hover:bg-[var(--rh-charcoal-light)] transition-colors text-sm">
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Header */}
        <header className="h-16 shrink-0 flex items-center justify-between px-6 border-b border-[var(--rh-charcoal-light)] bg-[var(--rh-charcoal)]">
          <div className="flex items-center text-sm">
            <span className="font-semibold">Good morning, Sarah</span>
            <span className="mx-3 text-[var(--rh-charcoal-light)]">|</span>
            <span className="text-[var(--rh-silver)]">EMEA Territory</span>
            <span className="mx-3 text-[var(--rh-charcoal-light)]">|</span>
            <span className="flex items-center gap-1.5 text-[var(--rh-silver)] bg-[var(--rh-charcoal-mid)] px-2 py-1 rounded">
              <Globe className="w-3.5 h-3.5 text-[var(--rh-blue)]" />
              <span>Western Europe</span>
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--rh-silver)]" />
              <input 
                type="text" 
                placeholder="Search resources..." 
                className="bg-[var(--rh-charcoal-mid)] border border-[var(--rh-charcoal-light)] rounded-full pl-9 pr-4 py-1.5 text-sm focus:outline-none focus:border-[var(--rh-red)] transition-colors w-64 text-white"
              />
            </div>
            <div className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity">
              <div className="w-8 h-8 rounded-full bg-[var(--rh-charcoal-light)] flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              <ChevronDown className="w-4 h-4 text-[var(--rh-silver)]" />
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto bg-[var(--rh-charcoal)]">
          {children}
        </div>
      </main>
    </div>
  );
}

function NavItem({ href, icon: Icon, label, active, badge }: { href: string, icon: any, label: string, active: boolean, badge?: string }) {
  return (
    <div 
      className={`flex items-center justify-between px-3 py-2 w-full rounded-md transition-colors text-sm cursor-pointer ${
        active 
          ? 'bg-[var(--rh-charcoal-light)] text-white border-l-4 border-[var(--rh-red)]' 
          : 'text-[var(--rh-silver)] hover:text-white hover:bg-[var(--rh-charcoal-light)] border-l-4 border-transparent'
      }`}
    >
      <div className="flex items-center gap-3">
        <Icon className={`w-4 h-4 ${active ? 'text-[var(--rh-red)]' : ''}`} />
        <span className={active ? 'font-medium' : ''}>{label}</span>
      </div>
      {badge && (
        <span className="bg-[var(--rh-red)] text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
          {badge}
        </span>
      )}
    </div>
  );
}
