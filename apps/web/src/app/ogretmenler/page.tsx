"use client";

import React, { useState, useEffect } from "react";
import { AdminShell } from "@/components/admin-shell";
import { trpc } from "@/lib/trpc";
import { UserPlus, Eye, Pencil, X, Check } from "lucide-react";

function getStatusBadge(status: string) {
  switch (status) {
    case "active":
    case "Aktif":
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-700 border border-emerald-200">
          Aktif
        </span>
      );
    case "on_leave":
    case "İzinli":
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-700 border border-amber-200">
          İzinli
        </span>
      );
    case "inactive":
    case "Pasif":
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-500 border border-slate-200">
          Pasif
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-50 text-slate-400 border border-slate-200">
          {status}
        </span>
      );
  }
}

export default function OgretmenlerPage() {
  const { data: apiData, isLoading, error, refetch } = trpc.teachers.list.useQuery();
  const [teachers, setTeachers] = useState<any[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [successMsg, setSuccessMsg] = useState(false);

  // Form states
  const [fullName, setFullName] = useState("");
  const [branch, setBranch] = useState("İngilizce");
  const [activeClasses, setActiveClasses] = useState(0);
  const [monthlyHours, setMonthlyHours] = useState(0);
  const [status, setStatus] = useState("active");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const createTeacher = trpc.teachers.create.useMutation();

  // Load initial teachers
  useEffect(() => {
    if (apiData) {
      setTeachers(apiData);
    }
  }, [apiData]);

  const handleAddTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName) return;

    setAdding(true);
    setFormError(null);

    try {
      await createTeacher.mutateAsync({
        full_name: fullName,
        branch: branch,
        email: email || undefined,
        password: password || undefined,
        status: status as any,
      });

      await refetch();

      // Reset Form & Close Modal
      setFullName("");
      setBranch("İngilizce");
      setActiveClasses(0);
      setMonthlyHours(0);
      setStatus("active");
      setEmail("");
      setPassword("");
      setModalOpen(false);

      setSuccessMsg(true);
      setTimeout(() => setSuccessMsg(false), 3000);
    } catch (err: any) {
      setFormError(err?.message || "Öğretmen kaydedilemedi.");
    } finally {
      setAdding(false);
    }
  };

  return (
    <AdminShell
      title="Öğretmenler"
      subtitle="Tüm öğretmenleri görüntüle ve yönetin."
    >
      <div className="flex justify-between items-center mb-6">
        <div>
          {successMsg ? (
            <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg animate-fade-in">
              <Check className="h-3.5 w-3.5" /> Yeni öğretmen başarıyla eklendi.
            </span>
          ) : (
            teachers && (
              <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md border border-slate-200">
                Toplam {teachers.length} Öğretmen
              </span>
            )
          )}
        </div>
        <button 
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 bg-primary hover:bg-blue-600 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-sm transition-colors"
        >
          <UserPlus className="h-4 w-4" />
          Yeni Öğretmen Ekle
        </button>
      </div>

      {isLoading && (
        <div className="flex justify-center items-center py-20">
          <p className="text-slate-500 font-medium">Yükleniyor…</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm font-semibold mb-6">
          API Hatası — Port 4000 çalışıyor mu?
        </div>
      )}

      {teachers && (
        <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50/50 border-b border-slate-100 text-slate-600 font-medium">
                <tr>
                  <th className="px-6 py-4">Ad Soyad</th>
                  <th className="px-6 py-4">Branş</th>
                  <th className="px-6 py-4 text-center">Aktif Dersler</th>
                  <th className="px-6 py-4 text-center">Aylık Saat</th>
                  <th className="px-6 py-4">Durum</th>
                  <th className="px-6 py-4 text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {teachers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-slate-500 font-medium">
                      Kayıtlı öğretmen bulunmamaktadır.
                    </td>
                  </tr>
                ) : (
                  teachers.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/30 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-900">{t.full_name}</td>
                      <td className="px-6 py-4 text-slate-600 font-medium">{t.branch}</td>
                      <td className="px-6 py-4 text-center text-slate-700 font-medium">{t.active_class_count}</td>
                      <td className="px-6 py-4 text-center text-slate-700 font-semibold">{t.monthly_hours} saat</td>
                      <td className="px-6 py-4">{getStatusBadge(t.status)}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button className="inline-flex items-center gap-1 border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-800 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg transition-colors">
                            <Eye className="h-3.5 w-3.5" />
                            Görüntüle
                          </button>
                          <button className="inline-flex items-center gap-1 border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-800 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg transition-colors">
                            <Pencil className="h-3.5 w-3.5" />
                            Düzenle
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Dialog */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
            onMouseDown={() => setModalOpen(false)}
          />
          {/* Modal Container */}
          <div 
            className="relative bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-lg">Yeni Öğretmen Ekle</h3>
              <button 
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            {formError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                {formError}
              </div>
            )}

            <form onSubmit={handleAddTeacher} className="space-y-4 pt-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Ad Soyad</label>
                <input 
                  type="text" 
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="örn: Can Arslan"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-primary focus:bg-white transition-all font-medium"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Branş</label>
                <select
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-primary focus:bg-white transition-all font-medium"
                >
                  <option value="İngilizce">İngilizce</option>
                  <option value="Almanca">Almanca</option>
                  <option value="Fransızca">Fransızca</option>
                  <option value="İspanyolca">İspanyolca</option>
                  <option value="Diğer">Diğer</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">E-posta</label>
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ogretmen@okul.com"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-primary focus:bg-white transition-all font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Şifre</label>
                  <input 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-primary focus:bg-white transition-all font-medium"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Durum</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-primary focus:bg-white transition-all font-medium"
                >
                  <option value="active">Aktif</option>
                  <option value="on_leave">İzinli</option>
                  <option value="inactive">Pasif</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  disabled={adding}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={adding}
                  className="px-4 py-2 bg-primary hover:bg-blue-600 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50 flex items-center gap-1"
                >
                  {adding ? "Kaydediliyor..." : "Kaydet"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
