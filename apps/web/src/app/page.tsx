"use client";

import React, { useState, useEffect } from "react";
import { AdminShell } from "@/components/admin-shell";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { 
  Building,
  Mail,
  Lock,
  User,
  Check,
  ShieldAlert,
  Loader2,
  Copy,
  Plus,
  Clock,
  AlertCircle,
  UserX,
  CheckSquare,
  MessageSquare,
  Globe,
  PlusCircle,
  LayoutGrid,
  ChevronRight,
  BookOpen,
  Users,
  GraduationCap,
  CheckCircle2
} from "lucide-react";

function getStatusBadge(status: string) {
  switch (status) {
    case "in_progress":
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-700 border border-emerald-200">
          Devam Ediyor
        </span>
      );
    case "completed":
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
          Tamamlandı
        </span>
      );
    case "cancelled":
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-500/15 text-red-700 border border-red-200">
          İptal
        </span>
      );
    case "substitute_needed":
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-700 border border-amber-200">
          Vekil Bekleniyor
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-50 text-slate-500 border border-slate-200">
          Bekliyor
        </span>
      );
  }
}

function getAlertConfig(type: string) {
  switch (type) {
    case "late_check_in":
      return {
        icon: Clock,
        color: "text-orange-500",
        bg: "bg-orange-50/10",
        label: "Geç Giriş"
      };
    case "substitute_request":
      return {
        icon: AlertCircle,
        color: "text-blue-500",
        bg: "bg-blue-50/10",
        label: "Vekil Talebi"
      };
    case "no_show":
      return {
        icon: UserX,
        color: "text-red-500",
        bg: "bg-red-50/10",
        label: "Devamsızlık"
      };
    case "hour_approval":
      return {
        icon: CheckSquare,
        color: "text-emerald-500",
        bg: "bg-emerald-50/10",
        label: "Saat Onayı"
      };
    default:
      return {
        icon: MessageSquare,
        color: "text-slate-500",
        bg: "bg-slate-50/10",
        label: "Bildirim"
      };
  }
}

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const isFounder = user?.email === "simaalouzi@gmail.com";

  // Queries & Mutations
  const { data: summary, isLoading: alertsLoading, error: summaryError, refetch: refetchSummary } = trpc.dashboard.summary.useQuery(undefined, {
    enabled: !isFounder,
  });
  const { data: openSubstitutes, refetch: refetchSubstitutes } = trpc.alerts.getOpenSubstituteRequests.useQuery(undefined, {
    enabled: !isFounder,
  });
  const createSubMutation = trpc.alerts.createSubstituteRequest.useMutation();

  const { data: schoolsList, isLoading: schoolsLoading, refetch: refetchSchools } = trpc.admin.listSchools.useQuery(undefined, {
    enabled: isFounder,
  });
  const createSchoolMutation = trpc.admin.createSchoolAndAdmin.useMutation();

  // Form states
  const [courseName, setCourseName] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [adminFullName, setAdminFullName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [displaySchoolName, setDisplaySchoolName] = useState("Bright Minds Dil Okulu");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedName = localStorage.getItem("schoolName") || "Bright Minds Dil Okulu";
      setDisplaySchoolName(storedName);
    }
  }, []);

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseName || !subdomain || !adminFullName || !adminEmail || !adminPassword) {
      setFormError("Lütfen tüm alanları doldurun.");
      return;
    }

    setSubmitting(true);
    setFormError(null);
    setSuccessMessage(null);

    try {
      const res = await createSchoolMutation.mutateAsync({
        name: courseName,
        subdomain: subdomain.toLowerCase().trim(),
        adminEmail: adminEmail.trim(),
        adminPassword,
        adminFullName,
      });

      setSuccessMessage(`Kurs başarıyla oluşturuldu!\nOluşturulan Kurs ID: ${res.schoolId}\nYönetici e-postası: ${adminEmail}`);
      
      // Clear form
      setCourseName("");
      setSubdomain("");
      setAdminFullName("");
      setAdminEmail("");
      setAdminPassword("");
      
      // Reload schools
      await refetchSchools();
    } catch (err: any) {
      setFormError(err?.message || "Kurs ve Yönetici oluşturulurken bir hata oluştu.");
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (isFounder) return;

    const channel = supabase
      .channel("alerts")
      .on("broadcast", { event: "alerts_update" }, () => {
        refetchSummary();
      })
      .on("broadcast", { event: "substitute_request_resolved" }, () => {
        refetchSummary();
        refetchSubstitutes();
      })
      .on("broadcast", { event: "substitute_request_created" }, () => {
        refetchSummary();
        refetchSubstitutes();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetchSummary, refetchSubstitutes, isFounder]);

  // Loading States
  if (isFounder && schoolsLoading) {
    return (
      <AdminShell title="Yönetim Paneli" subtitle="Yükleniyor...">
        <div className="flex justify-center items-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      </AdminShell>
    );
  }

  if (!isFounder && alertsLoading) {
    return (
      <AdminShell title="Ana Sayfa" subtitle="Yükleniyor...">
        <div className="flex justify-center items-center py-20">
          <div className="text-slate-500 font-medium">Veriler API'den alınıyor…</div>
        </div>
      </AdminShell>
    );
  }

  if (!isFounder && summaryError) {
    return (
      <AdminShell title="Ana Sayfa">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700">
          <h3 className="font-bold text-lg mb-2">API Bağlantı Hatası</h3>
          <p className="text-sm">
            API sunucusuna bağlanılamadı. Lütfen arka uç sunucusunun port 4000 üzerinde çalıştığından emin olun.
          </p>
        </div>
      </AdminShell>
    );
  }

  // --- FOUNDER VIEW ---
  if (isFounder) {
    return (
      <AdminShell
        title="Yönetim Paneli"
        subtitle="Kurs ID yönetimi, okul kurulumları ve sistem bildirimleri."
      >
        <div className="grid grid-cols-1 gap-6">
          <div className="space-y-6">
            
            {/* Kurs & Admin Ekleme Formu */}
            <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm p-6">
              <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100 mb-6">
                <div className="p-2 bg-violet-50 text-violet-600 rounded-lg">
                  <PlusCircle className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-bold text-base text-slate-900">Yeni Kurs (Okul ID) ve Yönetici Oluştur</h2>
                  <p className="text-xs text-slate-500">Sistemde yeni bir kurs ve bu kursu yönetecek yetkili hesabı tanımlayın.</p>
                </div>
              </div>

              {formError && (
                <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {successMessage && (
                <div className="mb-5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center gap-2">
                  <Check className="h-4 w-4 shrink-0" />
                  <span className="whitespace-pre-line">{successMessage}</span>
                </div>
              )}

              <form onSubmit={handleCreateCourse} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Kurs / Okul Adı</label>
                    <div className="relative">
                      <Building className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <input 
                        type="text" 
                        value={courseName}
                        onChange={(e) => setCourseName(e.target.value)}
                        placeholder="örn: Amerikan Kültür Dil Okulu"
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-primary focus:bg-white transition-all font-medium"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Alt Alan Adı (Subdomain)</label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <input 
                        type="text" 
                        value={subdomain}
                        onChange={(e) => setSubdomain(e.target.value)}
                        placeholder="örn: amerikankultur"
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-primary focus:bg-white transition-all font-medium font-mono"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t border-dashed border-slate-100 pt-4 mt-2">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Kurs Yöneticisi (Admin) Bilgileri</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Adı Soyadı</label>
                      <div className="relative">
                        <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                        <input 
                          type="text" 
                          value={adminFullName}
                          onChange={(e) => setAdminFullName(e.target.value)}
                          placeholder="örn: Canan Yılmaz"
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-primary focus:bg-white transition-all font-medium"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">E-posta Adresi</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                        <input 
                          type="email" 
                          value={adminEmail}
                          onChange={(e) => setAdminEmail(e.target.value)}
                          placeholder="admin@okuldomain.com"
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-primary focus:bg-white transition-all font-medium"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Şifre</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                        <input 
                          type="password" 
                          value={adminPassword}
                          onChange={(e) => setAdminPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-primary focus:bg-white transition-all font-medium"
                          required
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-3">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-3 bg-primary hover:bg-blue-600 text-white text-xs font-bold rounded-lg shadow-sm transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Oluşturuluyor...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4" />
                        Kurs ve Admin Oluştur
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Mevcut Kurslar Listesi */}
            <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-2">
                <LayoutGrid className="h-5 w-5 text-slate-400" />
                <h2 className="font-bold text-base text-slate-900">Sistemdeki Aktif Kurslar (Course IDs)</h2>
              </div>
              
              {schoolsLoading ? (
                <div className="flex justify-center items-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50/50 border-b border-slate-100 text-slate-600 font-bold">
                      <tr>
                        <th className="px-6 py-4">Kurs Adı</th>
                        <th className="px-6 py-4">Subdomain</th>
                        <th className="px-6 py-4">Kurs ID</th>
                        <th className="px-6 py-4">Yönetici E-posta</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {schoolsList?.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-6 py-8 text-center text-slate-500 font-medium">
                            Henüz hiçbir kurs oluşturulmamış.
                          </td>
                        </tr>
                      ) : (
                        schoolsList?.map((sch) => (
                          <tr key={sch.id} className="hover:bg-slate-50/30 transition-colors">
                            <td className="px-6 py-4 font-bold text-slate-900">{sch.name}</td>
                            <td className="px-6 py-4">
                              <span className="px-2 py-0.5 rounded bg-violet-50 text-violet-750 text-xs font-semibold border border-violet-100 font-mono">
                                {sch.subdomain}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-1.5 font-mono text-xs text-slate-600 bg-slate-50 border border-slate-200 p-1.5 rounded-lg max-w-[200px] justify-between">
                                <span className="truncate">{sch.id}</span>
                                <button 
                                  onClick={() => copyText(sch.id)}
                                  className="text-slate-400 hover:text-slate-700 transition-colors shrink-0"
                                  title="Kurs ID Kopyala"
                                >
                                  {copiedText === sch.id ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                                </button>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-slate-600 font-medium">
                              {sch.admins?.[0]?.email || "Tanımlanmamış"}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        </div>
      </AdminShell>
    );
  }

  // --- SCHOOL ADMIN VIEW ---
  return (
    <AdminShell
      title="Ana Sayfa"
      subtitle={`${displaySchoolName} günlük özet tablosu.`}
    >
      {/* Metrics Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {[
          { label: "Bugünkü Dersler", value: summary!.lessons_today, icon: BookOpen, bg: "bg-blue-50", text: "text-blue-600" },
          { label: "Aktif Öğretmenler", value: summary!.active_teachers, icon: Users, bg: "bg-emerald-50", text: "text-emerald-600" },
          { label: "Toplam Öğrenci", value: summary!.total_students, icon: GraduationCap, bg: "bg-purple-50", text: "text-purple-600" },
          { label: "Bekleyen Onaylar", value: summary!.pending_approvals, icon: CheckCircle2, bg: "bg-amber-50", text: "text-amber-600" },
        ].map((card) => (
          <div
            key={card.label}
            className="bg-white rounded-xl border border-slate-200/60 p-6 shadow-sm flex items-center gap-4 transition-all hover:shadow-md"
          >
            <div className={`p-3 rounded-lg ${card.bg} ${card.text}`}>
              <card.icon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-500">{card.label}</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{card.value}</h3>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Schedule Table */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200/60 shadow-sm overflow-hidden flex flex-col">
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-semibold text-lg text-slate-900">Bugünkü Program</h2>
            <button 
              onClick={() => router.push("/program")}
              className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
            >
              Tümünü Gör <ChevronRight className="h-3 w-3" />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50/50 border-b border-slate-100 text-slate-600 font-medium">
                <tr>
                  <th className="px-6 py-4">Saat</th>
                  <th className="px-6 py-4">Sınıf</th>
                  <th className="px-6 py-4">Öğretmen</th>
                  <th className="px-6 py-4 text-center">Öğrenci</th>
                  <th className="px-6 py-4 text-center">Durum</th>
                  <th className="px-6 py-4 text-right">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {summary!.today_schedule.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-slate-500 font-medium">
                      Bugün için planlanmış bir ders bulunmamaktadır.
                    </td>
                  </tr>
                ) : (
                  summary!.today_schedule.map((lesson) => {
                    const hasCoverRequest = openSubstitutes?.some(
                      (req) => req.lesson_session_id === lesson.id
                    );
                    return (
                      <tr key={lesson.id} className="hover:bg-slate-50/30 transition-colors">
                        <td className="px-6 py-4 font-semibold text-slate-600">{lesson.time_label}</td>
                        <td className="px-6 py-4 text-slate-950 font-medium">{lesson.class_name}</td>
                        <td className="px-6 py-4 text-slate-600 font-medium">{lesson.teacher_name}</td>
                        <td className="px-6 py-4 text-center text-slate-600 font-medium">{lesson.student_count}</td>
                        <td className="px-6 py-4 text-center">{getStatusBadge(lesson.status)}</td>
                        <td className="px-6 py-4 text-right">
                          {lesson.status !== "completed" && lesson.status !== "cancelled" ? (
                            hasCoverRequest ? (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-700 border border-amber-200">
                                Vekil Bekleniyor
                              </span>
                            ) : (
                              <button
                                onClick={async () => {
                                  try {
                                    await createSubMutation.mutateAsync({ session_id: lesson.id });
                                    refetchSubstitutes();
                                    refetchSummary();
                                  } catch (err) {
                                    console.error("Vekil çağırma hatası:", err);
                                  }
                                }}
                                disabled={createSubMutation.isPending}
                                className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                              >
                                {createSubMutation.isPending ? "Çağrılıyor..." : "Vekil Çağır"}
                              </button>
                            )
                          ) : null}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Alerts Card */}
        <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm p-6 flex flex-col">
          <h2 className="font-semibold text-lg text-slate-900 mb-4 pb-1">Son Uyarılar</h2>
          <div className="flex-1 space-y-4">
            {summary!.recent_alerts.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-8 font-medium">Aktif uyarı bulunmuyor.</p>
            ) : (
              summary!.recent_alerts.map((alert) => {
                const config = getAlertConfig(alert.type);
                return (
                  <div 
                    key={alert.id} 
                    className="flex items-start gap-4 p-3 rounded-lg border border-slate-100 bg-slate-50/50 transition-colors hover:bg-slate-50"
                  >
                    <div className={`mt-0.5 p-2 rounded-md ${config.bg} ${config.color}`}>
                      <config.icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 space-y-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-slate-900 truncate">{config.label}</p>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {new Date(alert.occurred_at).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed break-words">
                        <span className="font-semibold text-slate-700">{alert.teacher_name || "Sistem"}</span>: {alert.description}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <button 
            onClick={() => router.push("/uyarilar")}
            className="w-full mt-4 py-2.5 border border-slate-200/80 rounded-lg text-xs font-semibold text-primary hover:bg-blue-50 transition-colors"
          >
            Tüm Uyarıları Görüntüle
          </button>
        </div>
      </div>
    </AdminShell>
  );
}
