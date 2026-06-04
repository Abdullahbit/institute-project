"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Home, 
  Calendar, 
  Users, 
  Bell, 
  GraduationCap,
  Menu,
  X,
  Clock,
  Settings,
  LogOut
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";

const navItems = [
  { href: "/", label: "Ana Sayfa", icon: Home },
  { href: "/program", label: "Program", icon: Calendar },
  { href: "/ogretmenler", label: "Öğretmenler", icon: Users },
  { href: "/ogrenciler", label: "Öğrenciler", icon: GraduationCap },
  { href: "/saat-takibi", label: "Saat Takibi", icon: Clock },
  { href: "/uyarilar", label: "Uyarılar", icon: Bell },
  { href: "/ayarlar", label: "Ayarlar", icon: Settings },
];

export function AdminShell({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [schoolName, setSchoolName] = useState("Bright Minds");
  const [schoolType, setSchoolType] = useState("Dil Okulu");
  const { logout } = useAuth();

  React.useEffect(() => {
    const loadIdentity = () => {
      if (typeof window !== "undefined") {
        const storedName = localStorage.getItem("schoolName") || "Bright Minds Dil Okulu";
        const namePart = storedName.replace(" Dil Okulu", "").replace(" Okulu", "");
        setSchoolName(namePart);
        
        const storedType = localStorage.getItem("schoolType") || "Dil Okulu";
        setSchoolType(storedType);
      }
    };

    loadIdentity();

    window.addEventListener("settings-updated", loadIdentity);
    return () => {
      window.removeEventListener("settings-updated", loadIdentity);
    };
  }, []);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word.charAt(0))
      .join("")
      .substring(0, 2)
      .toUpperCase();
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground border-r border-sidebar-border shadow-sm">
      {/* Brand */}
      <div className="px-6 py-6 border-b border-sidebar-border">
        <Link href="/" className="flex items-center gap-3">
          <div className="h-8 w-8 bg-primary rounded-md flex items-center justify-center shadow-sm">
            <GraduationCap className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white">EduPanel</span>
        </Link>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link 
              key={item.href} 
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-200 group text-sm font-medium",
                isActive 
                  ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm" 
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}
            >
              <item.icon className={cn(
                "h-5 w-5",
                isActive ? "text-primary" : "text-sidebar-foreground/50 group-hover:text-sidebar-foreground/80"
              )} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* School Identity & Sign Out */}
      <div className="p-4 border-t border-sidebar-border bg-sidebar/50 flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="h-9 w-9 border border-sidebar-border rounded-full bg-primary/20 text-primary font-medium text-xs flex items-center justify-center shrink-0">
            {getInitials(schoolName)}
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="text-sm font-medium text-sidebar-foreground leading-none truncate">{schoolName}</span>
            <span className="text-xs text-sidebar-foreground/60 mt-1 truncate">{schoolType}</span>
          </div>
        </div>
        <button 
          onClick={async () => {
            if (confirm("Çıkış yapmak istediğinize emin misiniz?")) {
              await logout();
            }
          }}
          title="Çıkış Yap"
          className="p-2 rounded-lg text-sidebar-foreground/50 hover:bg-rose-500/10 hover:text-rose-500 transition-colors shrink-0"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex w-64 flex-col fixed inset-y-0 z-50">
        {sidebarContent}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:pl-64">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 border-b bg-sidebar text-sidebar-foreground">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 bg-primary rounded flex items-center justify-center">
              <GraduationCap className="h-4 w-4 text-white" />
            </div>
            <span className="font-semibold text-lg text-white">EduPanel</span>
          </div>
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1 rounded-md text-sidebar-foreground hover:bg-sidebar-accent focus:outline-none"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </header>

        {/* Mobile Drawer Overlay */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-40 flex">
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm"
              onClick={() => setMobileMenuOpen(false)}
            />
            {/* Drawer */}
            <div className="relative flex-1 flex flex-col max-w-xs w-full bg-sidebar">
              {sidebarContent}
            </div>
          </div>
        )}

        <main className="flex-1 p-4 md:p-8 overflow-auto">
          {/* Header */}
          <header className="mb-6">
            <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">{title}</h1>
            {subtitle ? (
              <p className="text-sm text-slate-500 mt-1">{subtitle}</p>
            ) : null}
          </header>
          {children}
        </main>
      </div>
    </div>
  );
}
