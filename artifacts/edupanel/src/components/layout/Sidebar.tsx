import React from "react";
import { Link } from "wouter";
import { 
  Home, 
  Calendar, 
  Users, 
  Clock, 
  Bell, 
  Settings,
  GraduationCap
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const navItems = [
  { href: "/", label: "Ana Sayfa", icon: Home },
  { href: "/program", label: "Program", icon: Calendar },
  { href: "/ogretmenler", label: "Öğretmenler", icon: Users },
  { href: "/saat-takibi", label: "Saat Takibi", icon: Clock },
  { href: "/uyarilar", label: "Uyarılar", icon: Bell },
  { href: "/ayarlar", label: "Ayarlar", icon: Settings },
];

interface SidebarProps {
  activeRoute: string;
}

export function Sidebar({ activeRoute }: SidebarProps) {
  return (
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground border-r border-sidebar-border shadow-sm">
      {/* Brand */}
      <div className="px-6 py-6 border-b border-sidebar-border">
        <Link href="/" className="flex items-center gap-3">
          <div className="h-8 w-8 bg-primary rounded-md flex items-center justify-center shadow-sm">
            <GraduationCap className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold tracking-tight">EduPanel</span>
        </Link>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = activeRoute === item.href;
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
              data-testid={`nav-${item.href.replace('/', '') || 'home'}`}
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

      {/* School Identity */}
      <div className="p-4 border-t border-sidebar-border bg-sidebar/50">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9 border border-sidebar-border">
            <AvatarFallback className="bg-primary/20 text-primary font-medium text-xs">BM</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-sidebar-foreground leading-none">Bright Minds</span>
            <span className="text-xs text-sidebar-foreground/60 mt-1">Dil Okulu</span>
          </div>
        </div>
      </div>
    </div>
  );
}
