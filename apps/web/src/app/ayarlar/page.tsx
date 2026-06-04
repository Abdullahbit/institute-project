"use client";

import React, { useState, useEffect } from "react";
import { AdminShell } from "@/components/admin-shell";
import { Building2, Bell, User, Shield, Check, Loader2, UserPlus, Copy } from "lucide-react";
import { trpc } from "@/lib/trpc";

export default function AyarlarPage() {
  // Okul Bilgileri State
  const [schoolName, setSchoolName] = useState("Bright Minds Dil Okulu");
  const [schoolType, setSchoolType] = useState("Dil Okulu");
  const [schoolEmail, setSchoolEmail] = useState("info@brightminds.edu.tr");
  const [schoolPhone, setSchoolPhone] = useState("+90 212 555 00 00");
  const [schoolAddress, setSchoolAddress] = useState("Bağcılar Mah. Eğitim Cad. No:12, İstanbul");

  // Kullanıcı Bilgileri State
  const [userName, setUserName] = useState("Admin Kullanıcı");
  const [userEmail, setUserEmail] = useState("admin@brightminds.edu.tr");
  const [userPassword, setUserPassword] = useState("");

  // Bildirimler State
  const [notifications, setNotifications] = useState({
    notifLate: true,
    notifAbsent: true,
    notifSub: true,
    notifApproval: false,
    notifReport: false,
  });

  // Save Loading States
  const [savingSchool, setSavingSchool] = useState(false);
  const [savingNotif, setSavingNotif] = useState(false);
  const [savingAccount, setSavingAccount] = useState(false);

  // Davet Etme (Invitation) States
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "teacher" | "student">("teacher");
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [inviteCopied, setInviteCopied] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const inviteMutation = trpc.admin.inviteUser.useMutation();

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;

    setInviteLoading(true);
    setInviteError(null);
    setInviteLink(null);

    try {
      const res = await inviteMutation.mutateAsync({
        email: inviteEmail,
        role: inviteRole,
      });

      const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
      const link = `${origin}/invite/${res.rawToken}`;
      setInviteLink(link);
      setInviteEmail('');
    } catch (err: any) {
      setInviteError(err?.message || 'Davetiye oluşturulamadı.');
    } finally {
      setInviteLoading(false);
    }
  };

  const copyInviteToClipboard = () => {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink);
    setInviteCopied(true);
    setTimeout(() => setInviteCopied(false), 2000);
  };

  // Success Alert States
  const [schoolSuccess, setSchoolSuccess] = useState(false);
  const [notifSuccess, setNotifSuccess] = useState(false);
  const [accountSuccess, setAccountSuccess] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      setSchoolName(localStorage.getItem("schoolName") || "Bright Minds Dil Okulu");
      setSchoolType(localStorage.getItem("schoolType") || "Dil Okulu");
      setSchoolEmail(localStorage.getItem("schoolEmail") || "info@brightminds.edu.tr");
      setSchoolPhone(localStorage.getItem("schoolPhone") || "+90 212 555 00 00");
      setSchoolAddress(localStorage.getItem("schoolAddress") || "Bağcılar Mah. Eğitim Cad. No:12, İstanbul");

      setUserName(localStorage.getItem("userName") || "Admin Kullanıcı");
      setUserEmail(localStorage.getItem("userEmail") || "admin@brightminds.edu.tr");

      const savedNotifs = localStorage.getItem("notifications");
      if (savedNotifs) {
        try {
          setNotifications(JSON.parse(savedNotifs));
        } catch (e) {
          console.error(e);
        }
      }
    }
  }, []);

  const toggleNotification = (key: keyof typeof notifications) => {
    setNotifications((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSaveSchool = () => {
    setSavingSchool(true);
    setSchoolSuccess(false);
    setTimeout(() => {
      if (typeof window !== "undefined") {
        localStorage.setItem("schoolName", schoolName);
        localStorage.setItem("schoolType", schoolType);
        localStorage.setItem("schoolEmail", schoolEmail);
        localStorage.setItem("schoolPhone", schoolPhone);
        localStorage.setItem("schoolAddress", schoolAddress);
        
        // Dispatch event so AdminShell knows to reload school identity
        window.dispatchEvent(new Event("settings-updated"));
      }
      setSavingSchool(false);
      setSchoolSuccess(true);
      setTimeout(() => setSchoolSuccess(false), 3000);
    }, 800);
  };

  const handleSaveNotifications = () => {
    setSavingNotif(true);
    setNotifSuccess(false);
    setTimeout(() => {
      if (typeof window !== "undefined") {
        localStorage.setItem("notifications", JSON.stringify(notifications));
      }
      setSavingNotif(false);
      setNotifSuccess(true);
      setTimeout(() => setNotifSuccess(false), 3000);
    }, 800);
  };

  const handleSaveAccount = () => {
    setSavingAccount(true);
    setAccountSuccess(false);
    setTimeout(() => {
      if (typeof window !== "undefined") {
        localStorage.setItem("userName", userName);
        localStorage.setItem("userEmail", userEmail);
      }
      setSavingAccount(false);
      setAccountSuccess(true);
      setUserPassword("");
      setTimeout(() => setAccountSuccess(false), 3000);
    }, 800);
  };

  return (
    <AdminShell title="Ayarlar" subtitle="Okul ve hesap ayarlarını yönetin.">
      <div className="space-y-6 max-w-3xl mx-auto pb-12">
        {/* Okul Bilgileri */}
        <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Okul Bilgileri</h2>
              <p className="text-xs text-slate-500 mt-0.5">Kurumunuzun temel bilgilerini güncelleyin.</p>
            </div>
          </div>
          <div className="p-6 space-y-4 bg-white">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Okul Adı</label>
                <input
                  type="text"
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-primary focus:bg-white transition-all font-medium"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Kurum Türü</label>
                <input
                  type="text"
                  value={schoolType}
                  onChange={(e) => setSchoolType(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-primary focus:bg-white transition-all font-medium"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">E-posta</label>
                <input
                  type="email"
                  value={schoolEmail}
                  onChange={(e) => setSchoolEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-primary focus:bg-white transition-all font-medium"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Telefon</label>
                <input
                  type="text"
                  value={schoolPhone}
                  onChange={(e) => setSchoolPhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-primary focus:bg-white transition-all font-medium"
                />
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Adres</label>
                <input
                  type="text"
                  value={schoolAddress}
                  onChange={(e) => setSchoolAddress(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-primary focus:bg-white transition-all font-medium"
                />
              </div>
            </div>
            
            <div className="flex items-center justify-end gap-3 pt-2">
              {schoolSuccess && (
                <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg animate-fade-in">
                  <Check className="h-3.5 w-3.5" /> Okul bilgileri başarıyla kaydedildi.
                </span>
              )}
              <button
                onClick={handleSaveSchool}
                disabled={savingSchool}
                className="bg-primary hover:bg-blue-600 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
              >
                {savingSchool ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Kaydediliyor...
                  </>
                ) : (
                  "Kaydet"
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Bildirim Tercihleri */}
        <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center gap-3">
            <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Bildirim Tercihleri</h2>
              <p className="text-xs text-slate-500 mt-0.5">Hangi bildirimlerin gönderileceğini belirleyin.</p>
            </div>
          </div>
          <div className="p-6 space-y-5 bg-white divide-y divide-slate-100">
            {[
              { id: "notifLate", label: "Geç Giriş Bildirimleri", desc: "Öğretmen geç girişlerinde anlık bildirim al." },
              { id: "notifAbsent", label: "Devamsızlık Bildirimleri", desc: "Öğretmen devamsızlığında acil bildirim al." },
              { id: "notifSub", label: "Vekil Talepleri", desc: "Yeni vekil talepleri oluştuğunda bildirim al." },
              { id: "notifApproval", label: "Onay Bekleyen Saatler", desc: "Onay bekleyen saat raporları için haftalık özet." },
              { id: "notifReport", label: "Aylık Raporlar", desc: "Aylık performans raporlarını e-posta ile al." },
            ].map((item, idx) => {
              const key = item.id as keyof typeof notifications;
              const isChecked = notifications[key];
              return (
                <div key={item.id} className={`flex items-center justify-between ${idx > 0 ? "pt-4" : ""}`}>
                  <div className="space-y-0.5 pr-4">
                    <label className="text-sm font-semibold text-slate-900 cursor-pointer" onClick={() => toggleNotification(key)}>
                      {item.label}
                    </label>
                    <p className="text-xs text-slate-500 leading-normal">{item.desc}</p>
                  </div>
                  {/* Custom Toggle Switch */}
                  <button
                    onClick={() => toggleNotification(key)}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none ${
                      isChecked ? "bg-primary" : "bg-slate-200"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        isChecked ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              );
            })}
            <div className="flex items-center justify-end gap-3 pt-4">
              {notifSuccess && (
                <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg animate-fade-in">
                  <Check className="h-3.5 w-3.5" /> Bildirim tercihleri kaydedildi.
                </span>
              )}
              <button
                onClick={handleSaveNotifications}
                disabled={savingNotif}
                className="bg-primary hover:bg-blue-600 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
              >
                {savingNotif ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Kaydediliyor...
                  </>
                ) : (
                  "Kaydet"
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Kullanıcı Hesabı */}
        <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center gap-3">
            <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
              <User className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Kullanıcı Hesabı</h2>
              <p className="text-xs text-slate-500 mt-0.5">Kişisel bilgilerinizi ve şifrenizi yönetin.</p>
            </div>
          </div>
          <div className="p-6 space-y-4 bg-white">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Ad Soyad</label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-primary focus:bg-white transition-all font-medium"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Rol</label>
                <div className="flex items-center h-9">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/15 text-blue-700 border border-blue-200">
                    Yönetici
                  </span>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">E-posta</label>
                <input
                  type="email"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-primary focus:bg-white transition-all font-medium"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Yeni Şifre</label>
                <input
                  type="password"
                  value={userPassword}
                  onChange={(e) => setUserPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-primary focus:bg-white transition-all font-medium"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              {accountSuccess && (
                <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg animate-fade-in">
                  <Check className="h-3.5 w-3.5" /> Hesap bilgileri başarıyla kaydedildi.
                </span>
              )}
              <button
                onClick={handleSaveAccount}
                disabled={savingAccount}
                className="bg-primary hover:bg-blue-600 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
              >
                {savingAccount ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Kaydediliyor...
                  </>
                ) : (
                  "Kaydet"
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Kullanıcı Davet Et (Staff & Student Invitation) */}
        <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center gap-3">
            <div className="p-2 bg-violet-50 rounded-lg text-violet-600">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Kullanıcı Davet Et</h2>
              <p className="text-xs text-slate-500 mt-0.5">Sistemde yeni öğretmen, öğrenci veya yönetici hesabı oluşturmak için davetiye linki üretin.</p>
            </div>
          </div>
          <div className="p-6 space-y-4 bg-white">
            {inviteError && (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                {inviteError}
              </div>
            )}

            <form onSubmit={handleInvite} className="flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">E-posta Adresi</label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="personel@okul.com"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-primary focus:bg-white transition-all font-medium"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Erişim Rolü</label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-primary focus:bg-white transition-all font-medium"
                  >
                    <option value="teacher">Öğretmen (Teacher)</option>
                    <option value="admin">Yönetici (Admin)</option>
                    <option value="student">Öğrenci (Student)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={inviteLoading}
                  className="bg-primary hover:bg-blue-600 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
                >
                  {inviteLoading ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Davetiye Oluşturuluyor...
                    </>
                  ) : (
                    "Davet Linki Oluştur"
                  )}
                </button>
              </div>
            </form>

            {inviteLink && (
              <div className="mt-4 p-4 bg-violet-50/50 border border-violet-200/60 rounded-xl flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-bold text-violet-700 uppercase tracking-wider">
                    Davetiye Başarıyla Oluşturuldu
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Bu davetiye 72 saat geçerlidir. Aşağıdaki bağlantıyı kopyalayarak davet edilen kişiye iletin:
                  </span>
                </div>
                
                <div className="flex gap-2 items-center bg-slate-50 p-2 rounded-lg border border-slate-200">
                  <input
                    type="text"
                    value={inviteLink}
                    readOnly
                    className="w-full bg-transparent text-xs text-slate-700 select-all border-none outline-none font-mono"
                  />
                  <button
                    onClick={copyInviteToClipboard}
                    className="flex-shrink-0 bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 shadow-sm"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    {inviteCopied ? 'Kopyalandı!' : 'Kopyala'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Plan ve Abonelik */}
        <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center gap-3">
            <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Plan ve Abonelik</h2>
              <p className="text-xs text-slate-500 mt-0.5">Mevcut plan bilgileriniz.</p>
            </div>
          </div>
          <div className="p-6 flex items-center justify-between bg-white">
            <div>
              <p className="text-sm font-bold text-slate-900">EduPanel Pro</p>
              <p className="text-xs text-slate-500 mt-0.5">Bir sonraki yenileme: 1 Temmuz 2026</p>
            </div>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-700 border border-emerald-200">
              Aktif
            </span>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
