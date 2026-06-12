"use client";

import React from "react";
import { AdminShell } from "@/components/admin-shell";
import { MessagingContainer } from "@/components/messaging-container";
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";

export default function ParentMessagesPage() {
  const { user, loading: authLoading } = useAuth();

  if (authLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <AdminShell
      title="Mesajlar"
      subtitle="Öğretmenler ile iletişim"
    >
      <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 overflow-hidden" style={{ height: "calc(100vh - 180px)" }}>
        <MessagingContainer />
      </div>
    </AdminShell>
  );
}
