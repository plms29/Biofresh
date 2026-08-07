"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Package,
  Brain,
  ScanLine,
  BadgeCheck,
  Leaf,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

const navItems = [
  {
    href: "/",
    label: "Dashboard",
    icon: LayoutDashboard,
    description: "Overview & Analytics",
  },
  {
    href: "/batches",
    label: "Batch Traceability",
    icon: Package,
    description: "Digital Batch Identity",
  },
  {
    href: "/ai-engine",
    label: "Decision Engine",
    icon: Brain,
    description: "Decision Intelligence Engine",
  },
  {
    href: "/quality-vision",
    label: "Computer Vision Diagnostics",
    icon: ScanLine,
    description: "AI Crop Quality Vision",
  },
  {
    href: "/passport",
    label: "Phytosanitary Passport",
    icon: BadgeCheck,
    description: "Quality Assurance Certificate",
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 260 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="fixed left-0 top-0 z-40 h-screen border-r border-sidebar-border bg-sidebar flex flex-col"
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-sidebar-border shrink-0">
        <div className="w-9 h-9 rounded-xl biofresh-gradient flex items-center justify-center shrink-0">
          <Leaf className="w-5 h-5 text-white" />
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <h1 className="font-bold text-lg text-sidebar-foreground tracking-tight">
                BioFresh <span className="text-biofresh-500">OS</span>
              </h1>
              <p className="text-[10px] text-muted-foreground -mt-1">
                Smart Post-Harvest
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group relative",
                isActive
                  ? "bg-biofresh-500 text-white shadow-md shadow-biofresh-500/20"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              )}
            >
              <item.icon
                className={cn(
                  "w-5 h-5 shrink-0 transition-colors",
                  isActive
                    ? "text-white"
                    : "text-biofresh-600 group-hover:text-biofresh-700"
                )}
              />
              <AnimatePresence>
                {!collapsed && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="flex flex-col min-w-0"
                  >
                    <span className="truncate">{item.label}</span>
                    {!isActive && (
                      <span className="text-[10px] text-muted-foreground truncate">
                        {item.description}
                      </span>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
              {/* Active indicator dot for collapsed mode */}
              {collapsed && isActive && (
                <motion.div
                  layoutId="activeIndicator"
                  className="absolute -right-[13px] w-1 h-6 bg-biofresh-500 rounded-l-full"
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <div className="px-3 pb-4 shrink-0">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4" />
              <span>Thu gọn</span>
            </>
          )}
        </button>
      </div>

      {/* Bottom branding */}
      {!collapsed && (
        <div className="px-4 pb-4 shrink-0">
          <div className="glass-green rounded-xl p-3 flex items-center gap-2">
            <Image
              src="/mascot.png"
              alt="BioFresh Mascot"
              width={32}
              height={32}
              className="rounded-lg"
            />
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-biofresh-800 truncate">
                AI Assistant sẵn sàng
              </p>
              <p className="text-[10px] text-biofresh-600">
                Click mascot để hỏi
              </p>
            </div>
          </div>
        </div>
      )}
    </motion.aside>
  );
}
