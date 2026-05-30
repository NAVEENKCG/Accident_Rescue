"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Activity,
  MapPin,
  Bell,
  Phone,
  ScrollText,
  Settings,
  Shield,
  X,
  Menu,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/cn";

const NAV_ITEMS = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/live-sensors", label: "Live Sensors", icon: Activity },
  { href: "/gps-tracker", label: "GPS Tracker", icon: MapPin },
  { href: "/alerts", label: "Alerts", icon: Bell },
  { href: "/emergency-contacts", label: "Emergency Contacts", icon: Phone },
  { href: "/incident-log", label: "Incident Log", icon: ScrollText },
  { href: "/settings", label: "Settings", icon: Settings },
];

// ── Desktop Sidebar ───────────────────────────────────────────────────────────
export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="hidden md:flex flex-col fixed left-0 top-0 h-screen w-[220px] z-30 glass-sidebar"
      aria-label="Main navigation"
    >
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 py-6 border-b border-white/[0.06]">
        <div className="w-8 h-8 rounded-xl bg-[var(--accent)]/20 flex items-center justify-center">
          <Shield className="w-4 h-4 text-[var(--accent)]" />
        </div>
        <span className="font-display font-bold text-sm tracking-widest uppercase text-white">
          AccidentGuard
        </span>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors duration-200 group",
                isActive
                  ? "text-white"
                  : "text-white/50 hover:text-white/80 hover:bg-white/[0.04]"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="sidebar-active-pill"
                  className="absolute inset-0 rounded-xl bg-[var(--accent)]/15 border border-[var(--accent)]/25"
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                />
              )}
              <Icon
                className={cn(
                  "relative z-10 w-4 h-4 flex-shrink-0 transition-colors duration-200",
                  isActive ? "text-[var(--accent)]" : "group-hover:text-white/70"
                )}
              />
              <span className="relative z-10 font-medium">{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-white/[0.06]">
        <p className="text-xs text-white/30 font-mono">v1.0.0 · TN-09-AB-1234</p>
      </div>
    </aside>
  );
}

// ── Mobile Drawer ─────────────────────────────────────────────────────────────
export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Open navigation menu"
        className="md:hidden p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/[0.06] transition-colors"
      >
        <Menu className="w-5 h-5" />
      </button>

      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 bg-black/60 z-40 md:hidden"
            />

            {/* Drawer */}
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 400, damping: 40 }}
              className="fixed left-0 top-0 h-screen w-72 z-50 glass-sidebar md:hidden flex flex-col"
            >
              <div className="flex items-center justify-between px-5 py-5 border-b border-white/[0.06]">
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-[var(--accent)]" />
                  <span className="font-display font-bold text-sm tracking-widest uppercase">
                    AccidentGuard
                  </span>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  aria-label="Close navigation"
                  className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/[0.08]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <nav className="flex-1 px-3 py-4 space-y-1">
                {NAV_ITEMS.map(({ href, label, icon: Icon }, i) => {
                  const isActive = pathname === href;
                  return (
                    <motion.div
                      key={href}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <Link
                        href={href}
                        onClick={() => setOpen(false)}
                        className={cn(
                          "flex items-center gap-3 px-3 py-3 rounded-xl text-sm transition-colors",
                          isActive
                            ? "bg-[var(--accent)]/15 border border-[var(--accent)]/25 text-white"
                            : "text-white/50 hover:text-white hover:bg-white/[0.05]"
                        )}
                      >
                        <Icon
                          className={cn(
                            "w-4 h-4",
                            isActive ? "text-[var(--accent)]" : ""
                          )}
                        />
                        {label}
                      </Link>
                    </motion.div>
                  );
                })}
              </nav>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
