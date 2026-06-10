"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

type Language = "tr" | "en";

export const translations = {
  tr: {
    // Navigation
    nav_home: "Ana Sayfa",
    nav_program: "Program",
    nav_classes: "Sınıflar",
    nav_teachers: "Öğretmenler",
    nav_students: "Öğrenciler",
    nav_hours: "Saat Takibi",
    nav_alerts: "Uyarılar",
    nav_settings: "Ayarlar",
    nav_logout: "Çıkış Yap",
    nav_messages: "Mesajlar",
    
    // Roles
    role_admin: "Yönetici",
    role_teacher: "Öğretmen",
    role_student: "Öğrenci",

    // Common UI
    lang_selector: "Dil Seçimi",
    theme_color: "Tema Rengi",
    save: "Kaydet",
    saving: "Kaydediliyor...",
    success: "Başarılı",
    error: "Hata",

    // Dashboard
    dashboard_subtitle: "günlük özet tablosu.",
    metric_today_lessons: "Bugünkü Dersler",
    metric_active_teachers: "Aktif Öğretmenler",
    metric_total_students: "Toplam Öğrenci",
    metric_pending_approvals: "Bekleyen Onaylar",
    title_today_schedule: "Bugünkü Program",
    action_view_all: "Tümünü Gör",
    th_time: "Saat",
    th_class: "Sınıf",
    th_teacher: "Öğretmen",
    th_student: "Öğrenci",
    th_status: "Durum",
    th_action: "İşlem",
    msg_no_lessons: "Bugün için planlanmış bir ders bulunmamaktadır.",
    title_recent_alerts: "Son Uyarılar",
    msg_no_alerts: "Aktif uyarı bulunmuyor.",
    action_view_all_alerts: "Tüm Uyarıları Görüntüle",
    action_call_substitute: "Vekil Çağır",
    action_calling: "Çağrılıyor...",
    status_substitute_needed: "Vekil Bekleniyor",
    status_in_progress: "Devam Ediyor",
    status_completed: "Tamamlandı",
    status_cancelled: "İptal",
    status_pending: "Bekliyor",
    alert_late_check_in: "Geç Giriş",
    alert_substitute_request: "Vekil Talebi",
    alert_no_show: "Devamsızlık",
    alert_hour_approval: "Saat Onayı",
    alert_notification: "Bildirim",

    // Months
    month_0: "Ocak",
    month_1: "Şubat",
    month_2: "Mart",
    month_3: "Nisan",
    month_4: "Mayıs",
    month_5: "Haziran",
    month_6: "Temmuz",
    month_7: "Ağustos",
    month_8: "Eylül",
    month_9: "Ekim",
    month_10: "Kasım",
    month_11: "Aralık",
  },
  en: {
    // Navigation
    nav_home: "Dashboard",
    nav_program: "Schedule",
    nav_classes: "Classes",
    nav_teachers: "Teachers",
    nav_students: "Students",
    nav_hours: "Hours Tracker",
    nav_alerts: "Alerts",
    nav_settings: "Settings",
    nav_logout: "Logout",
    nav_messages: "Messages",
    
    // Roles
    role_admin: "Administrator",
    role_teacher: "Teacher",
    role_student: "Student",

    // Common UI
    lang_selector: "Language",
    theme_color: "Theme Color",
    save: "Save",
    saving: "Saving...",
    success: "Success",
    error: "Error",

    // Dashboard
    dashboard_subtitle: "daily summary dashboard.",
    metric_today_lessons: "Today's Lessons",
    metric_active_teachers: "Active Teachers",
    metric_total_students: "Total Students",
    metric_pending_approvals: "Pending Approvals",
    title_today_schedule: "Today's Schedule",
    action_view_all: "View All",
    th_time: "Time",
    th_class: "Class",
    th_teacher: "Teacher",
    th_student: "Students",
    th_status: "Status",
    th_action: "Action",
    msg_no_lessons: "No classes scheduled for today.",
    title_recent_alerts: "Recent Alerts",
    msg_no_alerts: "No active alerts.",
    action_view_all_alerts: "View All Alerts",
    action_call_substitute: "Call Substitute",
    action_calling: "Calling...",
    status_substitute_needed: "Substitute Needed",
    status_in_progress: "In Progress",
    status_completed: "Completed",
    status_cancelled: "Cancelled",
    status_pending: "Pending",
    alert_late_check_in: "Late Check-In",
    alert_substitute_request: "Substitute Request",
    alert_no_show: "No-Show",
    alert_hour_approval: "Hours Approval",
    alert_notification: "Notification",

    // Months
    month_0: "January",
    month_1: "February",
    month_2: "March",
    month_3: "April",
    month_4: "May",
    month_5: "June",
    month_6: "July",
    month_7: "August",
    month_8: "September",
    month_9: "October",
    month_10: "November",
    month_11: "December",
  }
};

type TranslationKey = keyof typeof translations.tr;

type LanguageContextType = {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey) => string;
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("tr");

  // Load preferred language from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedLang = localStorage.getItem("app_lang") as Language;
      if (savedLang === "tr" || savedLang === "en") {
        setLanguageState(savedLang);
      }
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    if (typeof window !== "undefined") {
      localStorage.setItem("app_lang", lang);
    }
  };

  const t = (key: TranslationKey): string => {
    return translations[language][key] || translations["tr"][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
