"use client";

import React from "react";
import { AdminShell } from "@/components/admin-shell";
import { MessagingContainer } from "@/components/messaging-container";
import { useLanguage } from "@/context/LanguageContext";

export default function TeacherMesajlarPage() {
  const { language } = useLanguage();

  return (
    <AdminShell
      title={language === "tr" ? "Mesajlar" : "Messages"}
      subtitle={
        language === "tr"
          ? "Okul içi yöneticiler, öğretmenler ve öğrencilerle mesajlaşın."
          : "Message with administrators, teachers, and students within the school."
      }
    >
      <MessagingContainer />
    </AdminShell>
  );
}
