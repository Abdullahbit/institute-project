"use client";

import React, { useState, useEffect } from "react";
import { AdminShell } from "@/components/admin-shell";
import { trpc } from "@/lib/trpc";
import { UserPlus, Eye, EyeOff, Pencil, X, Check, Copy } from "lucide-react";

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

  // Modal mode states
  const [modalMode, setModalMode] = useState<"create" | "edit" | "view">("create");
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null);
  const [selectedTeacherDetails, setSelectedTeacherDetails] = useState<any>(null);

  // Form states
  const [fullName, setFullName] = useState("");
  const [branch, setBranch] = useState("İngilizce");
  const [status, setStatus] = useState("active");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({});

  const createTeacher = trpc.teachers.create.useMutation();
  const updateTeacher = trpc.teachers.update.useMutation();
  const deleteTeacher = trpc.teachers.delete.useMutation();

  // Load initial teachers
  useEffect(() => {
    if (apiData) {
      setTeachers(apiData);
    }
  }, [apiData]);

  const handleOpenCreateModal = () => {
    setModalMode("create");
    setSelectedTeacherId(null);
    setFullName("");
    setBranch("İngilizce");
    setStatus("active");
    setEmail("");
    setPassword("");
    setFormError(null);
    setModalOpen(true);
  };

  const handleOpenEditModal = (teacher: any) => {
    setModalMode("edit");
    setSelectedTeacherId(teacher.id);
    setFullName(teacher.full_name);
    setBranch(teacher.branch);
    setStatus(teacher.status);
    setFormError(null);
    setModalOpen(true);
  };

  const handleOpenViewModal = (teacher: any) => {
    setModalMode("view");
    setSelectedTeacherDetails(teacher);
    setModalOpen(true);
  };

  const handleSaveTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName) return;

    setAdding(true);
    setFormError(null);

    try {
      if (modalMode === "edit" && selectedTeacherId) {
        await updateTeacher.mutateAsync({
          id: selectedTeacherId,
          data: {
            full_name: fullName,
            branch: branch,
            status: status as any,
          }
        });
      } else {
        await createTeacher.mutateAsync({
          full_name: fullName,
          branch: branch,
          email: email || undefined,
          password: password || undefined,
          status: status as any,
        });
      }

      await refetch();

      // Reset Form & Close Modal
      setFullName("");
      setBranch("İngilizce");
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

  const handleDeleteTeacher = async (id: string) => {
    if (!confirm("Bu öğretmeni silmek istediğinize emin misiniz?")) return;
    try {
      await deleteTeacher.mutateAsync({ id });
      await refetch();
      setModalOpen(false);
    } catch (err: any) {
      alert(err?.message || "Silme işlemi başarısız oldu.");
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
              <Check className="h-3.5 w-3.5" /> İşlem başarıyla tamamlandı.
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
          onClick={handleOpenCreateModal}
          className="inline-flex items-center gap-2 bg-primary hover:bg-blue-600 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-sm transition-colors cursor-pointer"
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
                  <th className="px-6 py-4">E-posta</th>
                  <th className="px-6 py-4">Şifre</th>
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
                      {/* Email */}
                      <td className="px-6 py-4">
                        {t.email ? (
                          <span className="text-xs font-mono text-slate-700 bg-slate-50 border border-slate-200 px-2 py-1 rounded-md">{t.email}</span>
                        ) : (
                          <span className="text-xs text-slate-400 italic">—</span>
                        )}
                      </td>
                      {/* Password */}
                      <td className="px-6 py-4">
                        {t.password ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-mono text-slate-700 bg-slate-50 border border-slate-200 px-2 py-1 rounded-md">
                              {showPassword[t.id] ? t.password : "••••••"}
                            </span>
                            <button
                              type="button"
                              onClick={() => setShowPassword((prev) => ({ ...prev, [t.id]: !prev[t.id] }))}
                              className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
                              title={showPassword[t.id] ? "Gizle" : "Göster"}
                            >
                              {showPassword[t.id] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center text-slate-700 font-medium">{t.active_class_count}</td>
                      <td className="px-6 py-4 text-center text-slate-700 font-semibold">{t.monthly_hours} saat</td>
                      <td className="px-6 py-4">{getStatusBadge(t.status)}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => handleOpenViewModal(t)}
                            className="inline-flex items-center gap-1 border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-800 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            Görüntüle
                          </button>
                          <button 
                            onClick={() => handleOpenEditModal(t)}
                            className="inline-flex items-center gap-1 border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-800 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                          >
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
              <h3 className="font-bold text-slate-900 text-lg">
                {modalMode === "view" && "Öğretmen Detayları"}
                {modalMode === "edit" && "Öğretmen Profilini Düzenle"}
                {modalMode === "create" && "Yeni Öğretmen Ekle"}
              </h3>
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

            {modalMode === "view" ? (
              <div className="space-y-4 pt-4 text-sm text-slate-700">
                <div className="grid grid-cols-2 gap-2 border-b border-slate-100 pb-2">
                  <span className="font-bold text-slate-500">Ad Soyad:</span>
                  <span className="font-semibold text-slate-900">{selectedTeacherDetails?.full_name}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 border-b border-slate-100 pb-2">
                  <span className="font-bold text-slate-500">Branş:</span>
                  <span className="font-semibold text-slate-900">{selectedTeacherDetails?.branch}</span>
                </div>
                {selectedTeacherDetails?.email && (
                  <div className="grid grid-cols-2 gap-2 border-b border-slate-100 pb-2 items-center">
                    <span className="font-bold text-slate-500">E-posta:</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs text-slate-800 bg-slate-50 border border-slate-200 px-2 py-1 rounded-md break-all">{selectedTeacherDetails.email}</span>
                      <button
                        type="button"
                        onClick={() => { navigator.clipboard.writeText(selectedTeacherDetails.email); }}
                        className="p-1 text-slate-400 hover:text-slate-600"
                        title="Kopyala"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )}
                {selectedTeacherDetails?.password && (
                  <div className="grid grid-cols-2 gap-2 border-b border-slate-100 pb-2 items-center">
                    <span className="font-bold text-slate-500">Şifre:</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs text-slate-800 bg-amber-50 border border-amber-200 px-2 py-1 rounded-md">
                        {showPassword[selectedTeacherDetails.id] ? selectedTeacherDetails.password : "••••••"}
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => ({ ...prev, [selectedTeacherDetails.id]: !prev[selectedTeacherDetails.id] }))}
                        className="p-1 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword[selectedTeacherDetails.id] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => { navigator.clipboard.writeText(selectedTeacherDetails.password); }}
                        className="p-1 text-slate-400 hover:text-slate-600"
                        title="Kopyala"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2 border-b border-slate-100 pb-2">
                  <span className="font-bold text-slate-500">Aylık Raporlanan Saat:</span>
                  <span className="font-semibold text-slate-900">{selectedTeacherDetails?.monthly_hours} saat</span>
                </div>
                <div className="grid grid-cols-2 gap-2 border-b border-slate-100 pb-2">
                  <span className="font-bold text-slate-500">Aktif Sınıf Sayısı:</span>
                  <span className="font-semibold text-slate-900">{selectedTeacherDetails?.active_class_count}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 border-b border-slate-100 pb-2">
                  <span className="font-bold text-slate-500">Durum:</span>
                  <span>{getStatusBadge(selectedTeacherDetails?.status)}</span>
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    onClick={() => {
                      setModalOpen(false);
                      handleOpenEditModal(selectedTeacherDetails);
                    }}
                    className="px-4 py-2 bg-primary hover:bg-blue-600 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
                  >
                    Profilini Düzenle
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                  >
                    Kapat
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSaveTeacher} className="space-y-4 pt-4">
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

                {modalMode === "create" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">E-posta</label>
                      <input 
                        type="email" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="ogretmen@okul.com"
                        autoComplete="new-password"
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
                        autoComplete="new-password"
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-primary focus:bg-white transition-all font-medium"
                      />
                    </div>
                  </div>
                )}

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

                <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                  <div>
                    {modalMode === "edit" && (
                      <button
                        type="button"
                        onClick={() => handleDeleteTeacher(selectedTeacherId!)}
                        className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                      >
                        Öğretmeni Sil
                      </button>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setModalOpen(false)}
                      disabled={adding}
                      className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      İptal
                    </button>
                    <button
                      type="submit"
                      disabled={adding}
                      className="px-4 py-2 bg-primary hover:bg-blue-600 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50 flex items-center gap-1 cursor-pointer"
                    >
                      {adding ? "Kaydediliyor..." : "Kaydet"}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </AdminShell>
  );
}
