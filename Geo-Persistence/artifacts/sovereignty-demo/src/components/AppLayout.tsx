import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useTheme } from "next-themes";
import {
  LayoutDashboard, Settings, FileText, CheckCircle, Search,
  LogOut, User, Target, Swords, Sun, Moon, Map,
  Heart, Bell, Menu, PanelLeftClose, Globe,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import redhatLogo from "@/assets/redhat-logo.svg";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { theme, setTheme } = useTheme();
  const isLight = theme === "light";
  const [location, navigate] = useLocation();
  const [expanded, setExpanded] = useState(false);
  const activePath = location;

  return (
    <div className="flex h-screen w-full font-sans bg-[var(--rh-charcoal)] overflow-hidden">
      {/* ── Sidebar (light theme, collapsible) ── */}
      <aside
        className={`flex flex-col border-r border-[var(--rh-charcoal-light)] bg-[var(--rh-charcoal)] shrink-0 pt-2 pb-3 transition-all duration-200 ease-in-out ${
          expanded ? "w-52" : "w-14"
        }`}
      >
        {/* Hamburger / collapse toggle */}
        <div className={`flex items-center mb-2 ${expanded ? "px-3 justify-between" : "justify-center"}`}>
          {expanded ? (
            <button
              onClick={() => setExpanded(false)}
              className="w-8 h-8 flex items-center justify-center rounded-md text-[var(--rh-silver)] hover:bg-[var(--rh-charcoal-mid)] transition-colors"
            >
              <PanelLeftClose className="w-[18px] h-[18px]" />
            </button>
          ) : (
            <button
              onClick={() => setExpanded(true)}
              className="w-9 h-9 flex items-center justify-center rounded-lg text-[var(--rh-silver)] hover:bg-[var(--rh-charcoal-mid)] transition-colors"
            >
              <Menu className="w-[18px] h-[18px]" />
            </button>
          )}
        </div>

        {/* Navigation section label */}
        {expanded && (
          <div className="text-[10px] font-bold text-[var(--rh-silver)] uppercase tracking-wider mb-2 px-4 opacity-60">
            Navigation
          </div>
        )}

        {/* Nav items */}
        <div className={`flex flex-col gap-1 ${expanded ? "px-2" : "items-center"}`}>
          <NavItem href="/home"               icon={LayoutDashboard} label="Home"            active={activePath === "/home"}           expanded={expanded} />
          <NavItem href="/login"              icon={Map}             label="Sovereignty Map" active={activePath === "/login"}          expanded={expanded} />
          <NavItem href="/ai-toolkit"          icon={FileText}        label="AI Toolkit"      active={activePath === "/ai-toolkit"}     expanded={expanded} />
          <NavItem href="/content"             icon={Search}          label="Content Library" active={activePath === "/content"}        expanded={expanded} />
          <NavItem href="/sme-review"          icon={CheckCircle}     label="SME Review"      active={activePath === "/sme-review"}    expanded={expanded} badge="3" />
        </div>

        {/* Separator */}
        <div className={`my-3 ${expanded ? "mx-4 h-px bg-[var(--rh-charcoal-light)]" : "w-6 h-px bg-[var(--rh-charcoal-light)] mx-auto"}`} />

        {/* Training section */}
        {expanded && (
          <div className="text-[10px] font-bold text-[var(--rh-silver)] uppercase tracking-wider mb-2 px-4 opacity-60">
            Training
          </div>
        )}
        <div className={`flex flex-col gap-1 ${expanded ? "px-2" : "items-center"}`}>
          <NavItem href="/deal-qualifier"      icon={Target}          label="Deal Qualifier"  active={activePath === "/deal-qualifier"}      expanded={expanded} />
          <NavItem href="/objection-simulator" icon={Swords}          label="Objection Sim"   active={activePath === "/objection-simulator"} expanded={expanded} />
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Bottom */}
        <div className={`flex flex-col gap-1 ${expanded ? "px-2" : "items-center"}`}>
          <NavItem href="/settings" icon={Settings} label="Settings" active={activePath === "/settings"} expanded={expanded} />
          {expanded ? (
            <button
              onClick={() => navigate("/login")}
              className="flex items-center gap-3 px-3 py-2 w-full rounded-md text-[var(--rh-silver)] hover:bg-[var(--rh-charcoal-mid)] hover:text-[#151515] transition-colors text-sm"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              <span>Logout</span>
            </button>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => navigate("/login")}
                  className="w-9 h-9 flex items-center justify-center rounded-lg text-[var(--rh-silver)] hover:bg-[var(--rh-charcoal-mid)] hover:text-[#151515] transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-xs">Logout</TooltipContent>
            </Tooltip>
          )}
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Header */}
        <header className="h-14 shrink-0 flex items-center px-5 border-b border-[var(--rh-charcoal-light)] bg-[var(--rh-charcoal)]">
          {/* Left: logo + branding */}
          <div className="flex items-center gap-3 shrink-0">
            <img src={redhatLogo} alt="Red Hat" className="w-8 h-8 shrink-0" />
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-normal">Red Hat</span>
              <span className="text-sm font-bold">Sales Hub</span>
            </div>
          </div>

          {/* Center: search */}
          <div className="flex-1 flex justify-center px-8">
            <div className="relative w-full max-w-lg">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--rh-silver)]" />
              <input
                type="text"
                placeholder="What can I help you find?"
                className="w-full bg-[var(--rh-charcoal-mid)] border border-[var(--rh-charcoal-light)] rounded-full pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-[var(--rh-red)] transition-colors"
              />
            </div>
          </div>

          {/* Right: utility icons */}
          <div className="flex items-center gap-2 shrink-0">
            <button className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[var(--rh-charcoal-mid)] transition-colors">
              <Heart className="w-4 h-4 text-[var(--rh-silver)]" />
            </button>
            <button className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[var(--rh-charcoal-mid)] transition-colors">
              <Bell className="w-4 h-4 text-[var(--rh-silver)]" />
            </button>
            <button
              onClick={() => setTheme(isLight ? "dark" : "light")}
              title={isLight ? "Switch to dark theme" : "Switch to light theme"}
              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[var(--rh-charcoal-mid)] transition-colors"
            >
              {isLight
                ? <Moon className="w-4 h-4 text-[var(--rh-silver)]" />
                : <Sun className="w-4 h-4 text-[var(--rh-silver)]" />}
            </button>
            <div className="flex items-center ml-1 cursor-pointer hover:opacity-80 transition-opacity">
              <div className="w-8 h-8 rounded-full bg-[var(--rh-charcoal-mid)] border border-[var(--rh-charcoal-light)] flex items-center justify-center">
                <User className="w-4 h-4 text-[var(--rh-silver)]" />
              </div>
            </div>
          </div>
        </header>

        {/* Welcome bar */}
        <div className="h-10 shrink-0 flex items-center px-5 border-b border-[var(--rh-charcoal-light)] bg-[var(--rh-charcoal)] text-sm text-[var(--rh-silver)]">
          <span className="font-medium text-[var(--foreground)]">Good morning, Sarah</span>
          <span className="mx-3 text-[var(--rh-charcoal-light)]">|</span>
          <span>EMEA Territory</span>
          <span className="mx-3 text-[var(--rh-charcoal-light)]">|</span>
          <span className="flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-[var(--rh-blue)]" />
            Western Europe
          </span>
        </div>

        {/* Page Content */}
        <div className="flex-1 overflow-auto bg-[var(--rh-charcoal)]">
          {children}
        </div>
      </main>
    </div>
  );
}

function NavItem({
  href, icon: Icon, label, active, badge, expanded,
}: {
  href: string; icon: React.ComponentType<{ className?: string }>; label: string; active: boolean; badge?: string; expanded: boolean;
}) {
  if (expanded) {
    return (
      <Link
        href={href}
        className={`flex items-center justify-between px-3 py-2 w-full rounded-md transition-colors text-sm cursor-pointer ${
          active
            ? "bg-[var(--rh-charcoal-mid)] text-[#151515] font-medium border-l-[3px] border-[var(--rh-red)]"
            : "text-[var(--rh-silver)] hover:bg-[var(--rh-charcoal-mid)] hover:text-[#151515] border-l-[3px] border-transparent"
        }`}
      >
        <div className="flex items-center gap-3">
          <Icon className={`w-4 h-4 shrink-0 ${active ? "text-[var(--rh-red)]" : ""}`} />
          <span className="whitespace-nowrap">{label}</span>
        </div>
        {badge && (
          <span className="bg-[var(--rh-red)] text-on-dark text-[10px] font-bold px-1.5 py-0.5 rounded">
            {badge}
          </span>
        )}
      </Link>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          href={href}
          className={`relative w-9 h-9 flex items-center justify-center rounded-lg transition-colors cursor-pointer ${
            active
              ? "bg-[var(--rh-charcoal-mid)] text-[var(--rh-red)]"
              : "text-[var(--rh-silver)] hover:bg-[var(--rh-charcoal-mid)] hover:text-[#151515]"
          }`}
        >
          <Icon className="w-[18px] h-[18px]" />
          {active && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-[var(--rh-red)] rounded-r-full" />
          )}
          {badge && (
            <span className="absolute -top-0.5 -right-0.5 bg-[var(--rh-red)] text-on-dark text-[8px] font-bold w-3.5 h-3.5 flex items-center justify-center rounded-full">
              {badge}
            </span>
          )}
        </Link>
      </TooltipTrigger>
      <TooltipContent side="right" className="text-xs font-medium">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}
