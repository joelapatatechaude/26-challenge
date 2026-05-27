import { Link, useLocation } from "wouter";
import { useTheme } from "next-themes";
import {
  LayoutDashboard, Settings, FileText, CheckCircle, Search,
  LogOut, ChevronDown, User, Globe, Target, Swords, Sun, Moon, Map,
} from "lucide-react";

interface AppLayoutProps {
  children: React.ReactNode;
  activePath: string;
}

export function AppLayout({ children, activePath }: AppLayoutProps) {
  const { theme, setTheme } = useTheme();
  const isLight = theme === "light";
  const [, navigate] = useLocation();

  return (
    <div className="flex h-screen w-full font-sans bg-[var(--rh-charcoal)] overflow-hidden">
      {/* ── Sidebar (always dark) ── */}
      <aside className="w-64 flex flex-col border-r border-[var(--rh-sidebar-border)] bg-[var(--rh-sidebar-bg)] shrink-0">
        <div className="h-16 flex items-center px-4 border-b border-[var(--rh-sidebar-border)]">
          <Link href="/home" className="flex items-center gap-2 font-bold text-lg text-[var(--rh-sidebar-text-active)]">
            <div className="w-6 h-6 bg-[var(--rh-red)] flex items-center justify-center rounded-sm">
              <span className="text-[10px] font-black leading-none uppercase text-white">RH</span>
            </div>
            <span>Sales Hub</span>
          </Link>
        </div>

        <div className="p-4 py-6 flex-1 flex flex-col gap-2 overflow-y-auto">
          <div className="text-[10px] font-bold text-[var(--rh-sidebar-text)] uppercase tracking-wider mb-2 px-3">
            Navigation
          </div>
          <NavItem href="/home"               icon={LayoutDashboard} label="Home"               active={activePath === "/home"} />
          <NavItem href="/login"              icon={Map}             label="Sovereignty Map"    active={activePath === "/login"} />
          <NavItem href="/ai-toolkit"          icon={FileText}        label="AI Toolkit"         active={activePath === "/ai-toolkit"} />
          <NavItem href="/content"             icon={Search}          label="Content Library"    active={activePath === "/content"} />
          <NavItem href="/sme-review"          icon={CheckCircle}     label="SME Review"         active={activePath === "/sme-review"} badge="3" />

          <div className="text-[10px] font-bold text-[var(--rh-sidebar-text)] uppercase tracking-wider mt-4 mb-2 px-3">
            Training
          </div>
          <NavItem href="/deal-qualifier"      icon={Target}          label="Deal Qualifier"     active={activePath === "/deal-qualifier"} />
          <NavItem href="/objection-simulator" icon={Swords}          label="Objection Sim"      active={activePath === "/objection-simulator"} />
        </div>

        <div className="p-4 border-t border-[var(--rh-sidebar-border)] flex flex-col gap-2">
          <NavItem href="/settings" icon={Settings} label="Settings" active={activePath === "/settings"} />
          <button
            onClick={() => navigate("/login")}
            className="flex items-center gap-3 px-3 py-2 w-full rounded-md text-[var(--rh-sidebar-text)] hover:bg-[var(--rh-sidebar-surface)] hover:text-[var(--rh-sidebar-text-active)] transition-colors text-sm"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
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

          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--rh-silver)]" />
              <input
                type="text"
                placeholder="Search resources..."
                className="bg-[var(--rh-charcoal-mid)] border border-[var(--rh-charcoal-light)] rounded-full pl-9 pr-4 py-1.5 text-sm focus:outline-none focus:border-[var(--rh-red)] transition-colors w-56"
              />
            </div>

            {/* Theme toggle */}
            <button
              onClick={() => setTheme(isLight ? "dark" : "light")}
              title={isLight ? "Switch to dark theme" : "Switch to light theme"}
              className="w-8 h-8 rounded-full flex items-center justify-center border border-[var(--rh-charcoal-light)] bg-[var(--rh-charcoal-mid)] hover:border-[var(--rh-red)] transition-colors"
            >
              {isLight
                ? <Moon className="w-4 h-4 text-[var(--rh-silver)]" />
                : <Sun className="w-4 h-4 text-[var(--rh-silver)]" />}
            </button>

            {/* User avatar */}
            <div className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity">
              <div className="w-8 h-8 rounded-full bg-[var(--rh-charcoal-light)] flex items-center justify-center">
                <User className="w-4 h-4" />
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

function NavItem({
  href, icon: Icon, label, active, badge,
}: {
  href: string; icon: React.ComponentType<{ className?: string }>; label: string; active: boolean; badge?: string;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center justify-between px-3 py-2 w-full rounded-md transition-colors text-sm cursor-pointer ${
        active
          ? "bg-[var(--rh-sidebar-surface)] border-l-4 border-[var(--rh-red)] font-medium text-[var(--rh-sidebar-text-active)]"
          : "text-[var(--rh-sidebar-text)] hover:bg-[var(--rh-sidebar-surface)] hover:text-[var(--rh-sidebar-text-active)] border-l-4 border-transparent"
      }`}
    >
      <div className="flex items-center gap-3">
        <Icon className={`w-4 h-4 ${active ? "text-[var(--rh-red)]" : ""}`} />
        <span>{label}</span>
      </div>
      {badge && (
        <span className="bg-[var(--rh-red)] text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
          {badge}
        </span>
      )}
    </Link>
  );
}
