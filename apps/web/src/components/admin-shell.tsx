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
  LogOut,
  BookOpen,
  MessageSquare,
  ClipboardCheck
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { trpc } from "@/lib/trpc";

function hexToHsl(hex: string): string {
  hex = hex.replace(/^#/, "");
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }
  if (hex.length !== 6) {
    return "217 91% 60%";
  }
  let r = parseInt(hex.substring(0, 2), 16) / 255;
  let g = parseInt(hex.substring(2, 4), 16) / 255;
  let b = parseInt(hex.substring(4, 6), 16) / 255;
  let max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    let d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  h = Math.round(h * 360);
  s = Math.round(s * 100);
  l = Math.round(l * 100);
  return `${h} ${s}% ${l}%`;
}

import { useLanguage } from "@/context/LanguageContext";

const adminNavItems = [
  { href: "/", label: "Ana Sayfa", translationKey: "nav_home" as const, icon: Home },
  { href: "/program", label: "Program", translationKey: "nav_program" as const, icon: Calendar },
  { href: "/siniflar", label: "Sınıflar", translationKey: "nav_classes" as const, icon: BookOpen },
  { href: "/ogretmenler", label: "Öğretmenler", translationKey: "nav_teachers" as const, icon: Users },
  { href: "/ogrenciler", label: "Öğrenciler", translationKey: "nav_students" as const, icon: GraduationCap },
  { href: "/yoklama", label: "Yoklama", translationKey: "nav_home" as const, icon: ClipboardCheck },
  { href: "/saat-takibi", label: "Saat Takibi", translationKey: "nav_hours" as const, icon: Clock },
  { href: "/uyarilar", label: "Uyarılar", translationKey: "nav_alerts" as const, icon: Bell },
  { href: "/mesajlar", label: "Mesajlar", translationKey: "nav_messages" as const, icon: MessageSquare },
  { href: "/ayarlar", label: "Ayarlar", translationKey: "nav_settings" as const, icon: Settings },
];

const founderNavItems = [
  { href: "/", label: "Ana Sayfa", translationKey: "nav_home" as const, icon: Home },
  { href: "/mesajlar", label: "Mesajlar", translationKey: "nav_messages" as const, icon: MessageSquare },
  { href: "/ayarlar", label: "Ayarlar", translationKey: "nav_settings" as const, icon: Settings },
];

const teacherNavItems = [
  { href: "/teacher/dashboard", label: "Ana Sayfa", translationKey: "nav_home" as const, icon: Home },
  { href: "/teacher/today", label: "Bugünkü Derslerim", translationKey: "nav_program" as const, icon: Calendar },
  { href: "/teacher/today", label: "Yoklama Al", translationKey: "nav_yoklama" as const, icon: ClipboardCheck },
  { href: "/teacher/mesajlar", label: "Mesajlar", translationKey: "nav_messages" as const, icon: MessageSquare },
];

const studentNavItems = [
  { href: "/student/dashboard", label: "Ana Sayfa", translationKey: "nav_home" as const, icon: Home },
  { href: "/student/mesajlar", label: "Mesajlar", translationKey: "nav_messages" as const, icon: MessageSquare },
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
  const [logoUrl, setLogoUrl] = useState("");
  const [logoError, setLogoError] = useState(false);
  const [themeColor, setThemeColor] = useState("#3b82f6");
  const { logout, role, user } = useAuth();
  const { language, setLanguage, t } = useLanguage();

  React.useEffect(() => {
    setLogoError(false);
  }, [logoUrl]);

  const { data: branding, refetch } = trpc.admin.getSchoolBranding.useQuery(undefined, {
    enabled: !!user,
  });

  const isFounder = user?.email === "simaalouzi@gmail.com";

  const currentNavItems = 
    role === "student" 
      ? studentNavItems 
      : role === "teacher" 
        ? teacherNavItems 
        : isFounder
          ? founderNavItems
          : adminNavItems;

  React.useEffect(() => {
    const loadIdentity = () => {
      if (typeof window !== "undefined") {
        const storedName = localStorage.getItem("schoolName") || "Bright Minds Dil Okulu";
        const namePart = storedName.replace(" Dil Okulu", "").replace(" Okulu", "");
        setSchoolName(namePart);
        
        const storedType = localStorage.getItem("schoolType") || "Dil Okulu";
        setSchoolType(storedType);

        const storedLogo = localStorage.getItem("logoUrl") || "";
        setLogoUrl(storedLogo);

        const storedColor = localStorage.getItem("themeColor") || "#3b82f6";
        setThemeColor(storedColor);
      }
    };

    loadIdentity();

    const handleUpdate = () => {
      loadIdentity();
      refetch();
    };

    window.addEventListener("settings-updated", handleUpdate);
    return () => {
      window.removeEventListener("settings-updated", handleUpdate);
    };
  }, [refetch]);

  React.useEffect(() => {
    if (branding) {
      const namePart = (branding.name || "Bright Minds").replace(" Dil Okulu", "").replace(" Okulu", "");
      setSchoolName(namePart);
      setLogoUrl(branding.logoUrl || "");
      setThemeColor(branding.themeColor || "#3b82f6");
    }
  }, [branding]);

  const getInitials = (name: string) => {
    if (!name) return "U";
    return name
      .trim()
      .split(/\s+/)
      .map((word) => word.charAt(0))
      .join("")
      .substring(0, 2)
      .toUpperCase();
  };

  const displayName = user?.user_metadata?.full_name || user?.email || "Kullanıcı";
  const displayRole = role === "admin" 
    ? t("role_admin") 
    : role === "teacher" 
      ? t("role_teacher") 
      : role === "student" 
        ? t("role_student") 
        : t("nav_logout").replace(" Yap", "");

  const sidebarContent = (
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground border-r border-sidebar-border shadow-sm">
      {/* Brand */}
      <div className="px-6 py-6 border-b border-sidebar-border">
        <Link href="/" className="flex items-center gap-3">
          {logoUrl && !logoError ? (
            <img 
              src={logoUrl} 
              className="h-8 w-8 object-contain rounded-md bg-white p-0.5" 
              alt={schoolName} 
              onError={() => setLogoError(true)}
            />
          ) : (
            <div className="h-8 w-8 bg-primary rounded-md flex items-center justify-center shadow-sm">
              <GraduationCap className="h-5 w-5 text-primary-foreground" />
            </div>
          )}
          <span className="text-xl font-bold tracking-tight text-white">{schoolName}</span>
        </Link>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
        {currentNavItems.map((item) => {
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
              {t(item.translationKey)}
            </Link>
          );
        })}
      </nav>

      {/* User Identity & Sign Out */}
      <div className="p-4 border-t border-sidebar-border bg-sidebar/50 flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="h-9 w-9 border border-sidebar-border rounded-full bg-primary/20 text-primary font-medium text-xs flex items-center justify-center shrink-0">
            {getInitials(displayName)}
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="text-sm font-medium text-sidebar-foreground leading-none truncate" title={displayName}>
              {displayName}
            </span>
            <span className="text-xs text-sidebar-foreground/60 mt-1 truncate">
              {displayRole}
            </span>
          </div>
        </div>
        <button 
          onClick={async () => {
            const confirmMsg = language === "tr" ? "Çıkış yapmak istediğinize emin misiniz?" : "Are you sure you want to log out?";
            if (confirm(confirmMsg)) {
              await logout();
            }
          }}
          title={t("nav_logout")}
          className="p-2 rounded-lg text-sidebar-foreground/50 hover:bg-rose-500/10 hover:text-rose-500 transition-colors shrink-0"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </div>
    </div>
  );

  return (
    <div 
      className="flex min-h-screen bg-background text-foreground"
      style={
        themeColor 
          ? { "--primary": hexToHsl(themeColor) } as React.CSSProperties 
          : undefined
      }
    >
      {/* Desktop Sidebar */}
      <div className="hidden md:flex w-64 flex-col fixed inset-y-0 z-50">
        {sidebarContent}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:pl-64">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 border-b bg-sidebar text-sidebar-foreground">
          <div className="flex items-center gap-2">
            {logoUrl && !logoError ? (
              <img 
                src={logoUrl} 
                className="h-6 w-6 object-contain rounded bg-white p-0.5" 
                alt={schoolName} 
                onError={() => setLogoError(true)}
              />
            ) : (
              <div className="h-6 w-6 bg-primary rounded flex items-center justify-center">
                <GraduationCap className="h-4 w-4 text-white" />
              </div>
            )}
            <span className="font-semibold text-lg text-white">{schoolName}</span>
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
          <header className="mb-6 flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">{title}</h1>
              {subtitle ? (
                <p className="text-sm text-slate-500 mt-1">{subtitle}</p>
              ) : null}
            </div>
            
            {/* Language Switcher Toggler */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg border border-slate-200 shadow-sm shrink-0">
              <button
                onClick={() => setLanguage("tr")}
                className={cn(
                  "px-2.5 py-1 text-xs font-bold rounded-md transition-all duration-200",
                  language === "tr" 
                    ? "bg-white text-slate-900 shadow-sm" 
                    : "text-slate-500 hover:text-slate-800"
                )}
              >
                TR
              </button>
              <button
                onClick={() => setLanguage("en")}
                className={cn(
                  "px-2.5 py-1 text-xs font-bold rounded-md transition-all duration-200",
                  language === "en" 
                    ? "bg-white text-slate-900 shadow-sm" 
                    : "text-slate-500 hover:text-slate-800"
                )}
              >
                EN
              </button>
            </div>
          </header>
          {children}
        </main>
      </div>
    </div>
  );
}
