import React from "react";
import { Link, useLocation } from "wouter";
import { Sidebar } from "./Sidebar";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex w-64 flex-col fixed inset-y-0 z-50">
        <Sidebar activeRoute={location} />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:pl-64">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 border-b bg-sidebar text-sidebar-foreground">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 bg-primary rounded flex items-center justify-center">
              <span className="text-white text-xs font-bold">E</span>
            </div>
            <span className="font-semibold text-lg">EduPanel</span>
          </div>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-sidebar-foreground hover:bg-sidebar-accent">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0 bg-sidebar border-r-0">
              <Sidebar activeRoute={location} />
            </SheetContent>
          </Sheet>
        </header>

        <main className="flex-1 p-4 md:p-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
