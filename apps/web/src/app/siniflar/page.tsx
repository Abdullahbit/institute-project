"use client";

import React, { useState } from "react";
import Link from "next/link";
import { AdminShell } from "@/components/admin-shell";
import { trpc } from "@/lib/trpc";
import { Plus, Pencil, Trash2, Users, X, Check, Loader2, UserPlus, BookOpen } from "lucide-react";

export default function SiniflarPage() {
  const { data: classes, isLoading: loadingClasses, refetch: refetchClasses } = trpc.classes.list.useQuery();
  const { data: allStudents } = trpc.students.list.useQuery();

  // Class CRUD modal states
  const [classModalOpen, setClassModalOpen] = useState(false);
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [className, setClassName] = useState("");
  const [levelCode, setLevelCode] = useState("");
  const [quantity, setQuantity] = useState<number>(0);
  const [quantityType, setQuantityType] = useState<"classes" | "hours">("classes");
  const [classSaving, setClassSaving] = useState(false);
  const [classError, setClassError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Roster modal states
  const [rosterModalOpen, setRosterModalOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<any | null>(null);
  const [studentToEnrollId, setStudentToEnrollId] = useState("");
  const [rosterSaving, setRosterSaving] = useState(false);
  const [rosterError, setRosterError] = useState<string | null>(null);

  // tRPC Queries & Mutations
  const createClassMutation = trpc.classes.create.useMutation();
  const updateClassMutation = trpc.classes.update.useMutation();
  const deleteClassMutation = trpc.classes.delete.useMutation();
  
  const enrollStudentMutation = trpc.classes.enrollStudent.useMutation();
  const unenrollStudentMutation = trpc.classes.unenrollStudent.useMutation();

  // Fetch roster dynamically for selected class
  const { data: roster, refetch: refetchRoster, isLoading: loadingRoster } = trpc.classes.listClassStudents.useQuery(
    { class_id: selectedClass?.id || "" },
    { enabled: !!selectedClass?.id }
  );

  // Helpers
  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const handleLevelCodeChange = (val: string) => {
    setLevelCode(val);
    const cleaned = val.trim().toUpperCase();
    if (cleaned === "A1" || cleaned === "A2") {
      setQuantity(40);
      setQuantityType("classes");
    } else if (cleaned === "B1" || cleaned === "B2") {
      setQuantity(60);
      setQuantityType("classes");
    } else if (cleaned === "C1" || cleaned === "C2") {
      setQuantity(80);
      setQuantityType("classes");
    } else if (cleaned !== "") {
      setQuantity(20);
      setQuantityType("hours");
    }
  };

  const handleOpenClassModal = (cls?: any) => {
    setClassError(null);
    if (cls) {
      setEditingClassId(cls.id);
      setClassName(cls.name);
      setLevelCode(cls.levelCode);
      setQuantity(cls.quantity || 0);
      setQuantityType((cls.quantityType as "classes" | "hours") || "classes");
    } else {
      setEditingClassId(null);
      setClassName("");
      setLevelCode("");
      setQuantity(0);
      setQuantityType("classes");
    }
    setClassModalOpen(true);
  };

  const handleSaveClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!className || !levelCode) return;

    setClassSaving(true);
    setClassError(null);

    try {
      if (editingClassId) {
        await updateClassMutation.mutateAsync({
          id: editingClassId,
          data: {
            name: className,
            level_code: levelCode,
            quantity: quantity,
            quantity_type: quantityType,
          },
        });
        showSuccess("Sınıf başarıyla güncellendi.");
      } else {
        await createClassMutation.mutateAsync({
          name: className,
          level_code: levelCode,
          quantity: quantity,
          quantity_type: quantityType,
        });
        showSuccess("Yeni sınıf başarıyla oluşturuldu.");
      }
      await refetchClasses();
      setClassModalOpen(false);
    } catch (err: any) {
      setClassError(err?.message || "Sınıf bilgileri kaydedilemedi.");
    } finally {
      setClassSaving(false);
    }
  };

  const handleDeleteClass = async (id: string, name: string) => {
    if (!confirm(`"${name}" sınıfını silmek istediğinize emin misiniz?`)) return;

    try {
      await deleteClassMutation.mutateAsync({ id });
      showSuccess("Sınıf başarıyla silindi.");
      refetchClasses();
    } catch (err: any) {
      alert(err?.message || "Sınıf silinirken hata oluştu.");
    }
  };

  const handleOpenRosterModal = (cls: any) => {
    setSelectedClass(cls);
    setStudentToEnrollId("");
    setRosterError(null);
    setRosterModalOpen(true);
  };

  const handleEnrollStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClass || !studentToEnrollId) return;

    setRosterSaving(true);
    setRosterError(null);

    try {
      await enrollStudentMutation.mutateAsync({
        class_id: selectedClass.id,
        student_id: studentToEnrollId,
      });
      await refetchRoster();
      setStudentToEnrollId("");
      showSuccess("Öğrenci sınıfa başarıyla kaydedildi.");
      refetchClasses(); // Refresh counts
    } catch (err: any) {
      setRosterError(err?.message || "Öğrenci sınıfa eklenemedi.");
    } finally {
      setRosterSaving(false);
    }
  };

  const handleUnenrollStudent = async (studentId: string) => {
    if (!selectedClass) return;
    if (!confirm("Bu öğrenciyi sınıftan çıkarmak istediğinize emin misiniz?")) return;

    setRosterSaving(true);
    setRosterError(null);

    try {
      await unenrollStudentMutation.mutateAsync({
        class_id: selectedClass.id,
        student_id: studentId,
      });
      await refetchRoster();
      showSuccess("Öğrenci sınıf kaydı silindi.");
      refetchClasses(); // Refresh counts
    } catch (err: any) {
      setRosterError(err?.message || "Öğrenci sınıftan çıkarılamadı.");
    } finally {
      setRosterSaving(false);
    }
  };

  // Filter out students already enrolled in this class
  const enrolledIds = roster?.map((r) => r.id) || [];
  const availableStudents = allStudents?.filter((s) => !enrolledIds.includes(s.id)) || [];

  return (
    <AdminShell
      title="Sınıflar & Kontenjan"
      subtitle="Dil okulu sınıf şubelerini ve kayıtlı öğrenci listelerini (roster) yönetin."
    >
      <div className="flex justify-between items-center mb-6">
        <div>
          {successMsg ? (
            <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg animate-fade-in">
              <Check className="h-3.5 w-3.5" /> {successMsg}
            </span>
          ) : (
            classes && (
              <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md border border-slate-200">
                Toplam {classes.length} Sınıf
              </span>
            )
          )}
        </div>
        <button
          onClick={() => handleOpenClassModal()}
          className="inline-flex items-center gap-2 bg-primary hover:bg-blue-600 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-sm transition-colors cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Yeni Sınıf Ekle
        </button>
      </div>

      {loadingClasses && (
        <div className="flex justify-center items-center py-20 bg-white border border-slate-200 rounded-xl shadow-sm">
          <Loader2 className="h-6 w-6 text-primary animate-spin mr-2" />
          <p className="text-slate-500 font-medium">Sınıflar yükleniyor…</p>
        </div>
      )}

      {classes && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50/50 border-b border-slate-100 text-slate-600 font-semibold text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Sınıf Adı</th>
                  <th className="px-6 py-4">Seviye Kodu</th>
                  <th className="px-6 py-4">Miktar / Süre</th>
                  <th className="px-6 py-4 text-center">Öğrenci Listesi (Roster)</th>
                  <th className="px-6 py-4">Durum</th>
                  <th className="px-6 py-4 text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {classes.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500 font-medium">
                      Kayıtlı aktif sınıf bulunmamaktadır.
                    </td>
                  </tr>
                ) : (
                  classes.map((cls) => (
                    <tr key={cls.id} className="hover:bg-slate-50/30 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-900">{cls.name}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-150">
                          {cls.levelCode}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          <BookOpen className="h-3.5 w-3.5 text-slate-400" />
                          {cls.quantity} {cls.quantityType === "hours" ? "Saat" : "Ders"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex flex-col gap-1.5 items-center justify-center">
                          <button
                            onClick={() => handleOpenRosterModal(cls)}
                            className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-blue-700 font-bold border border-primary/20 hover:bg-primary/5 px-3 py-1.5 rounded-lg transition-all cursor-pointer w-full max-w-[120px] justify-center"
                          >
                            <Users className="h-3.5 w-3.5 text-primary" />
                            Listeyi Yönet
                          </button>
                          <Link
                            href={`/siniflar/${cls.id}`}
                            className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-800 font-bold border border-slate-200 hover:bg-slate-50 px-3 py-1 rounded-lg transition-all cursor-pointer w-full max-w-[120px] justify-center"
                          >
                            <BookOpen className="h-3.5 w-3.5 text-slate-500" />
                            Deftere Git
                          </Link>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Aktif
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenClassModal(cls)}
                            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition-colors"
                            title="Düzenle"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteClass(cls.id, cls.name)}
                            className="p-1.5 rounded-lg border border-slate-200 hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors"
                            title="Sil"
                          >
                            <Trash2 className="h-4 w-4" />
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

      {/* Class Create / Edit Modal */}
      {classModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setClassModalOpen(false)}
          />
          <div className="relative bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-lg">
                {editingClassId ? "Sınıf Düzenle" : "Yeni Sınıf Oluştur"}
              </h3>
              <button
                onClick={() => setClassModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {classError && (
              <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                {classError}
              </div>
            )}

            <form onSubmit={handleSaveClass} className="space-y-4 pt-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Sınıf Şube Adı</label>
                <input
                  type="text"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  placeholder="Örn: B1 Orta Seviye A Şubesi"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-primary focus:bg-white transition-all font-medium"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Seviye Kodu</label>
                <input
                  type="text"
                  value={levelCode}
                  onChange={(e) => handleLevelCodeChange(e.target.value)}
                  placeholder="Örn: B1, A2, C1"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-primary focus:bg-white transition-all font-medium"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Miktar Tipi</label>
                  <select
                    value={quantityType}
                    onChange={(e) => setQuantityType(e.target.value as "classes" | "hours")}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-primary focus:bg-white transition-all font-medium cursor-pointer"
                  >
                    <option value="classes">Ders Sayısı (Klasik Seviye)</option>
                    <option value="hours">Ders Saati (Özel Ders)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Adet / Süre</label>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-primary focus:bg-white transition-all font-medium"
                    min="0"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setClassModalOpen(false)}
                  disabled={classSaving}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={classSaving}
                  className="px-4 py-2 bg-primary hover:bg-blue-600 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  {classSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Class Roster Management Modal */}
      {rosterModalOpen && selectedClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setRosterModalOpen(false)}
          />
          <div className="relative bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <h3 className="font-bold text-slate-900 text-lg">
                  {selectedClass.name} — Sınıf Listesi (Roster)
                </h3>
              </div>
              <button
                onClick={() => setRosterModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {rosterError && (
              <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold shrink-0">
                {rosterError}
              </div>
            )}

            {/* Enroll New Student form */}
            <form onSubmit={handleEnrollStudent} className="py-4 border-b border-slate-100 shrink-0 flex items-end gap-3">
              <div className="flex-1 space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Öğrenci Kaydet</label>
                <select
                  value={studentToEnrollId}
                  onChange={(e) => setStudentToEnrollId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-primary focus:bg-white transition-all font-medium cursor-pointer"
                  required
                >
                  <option value="">Öğrenci Seçin...</option>
                  {availableStudents.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.full_name}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                disabled={rosterSaving || !studentToEnrollId}
                className="bg-primary hover:bg-blue-600 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-sm transition-colors flex items-center gap-1.5 h-[38px] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {rosterSaving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <UserPlus className="h-4 w-4" />
                )}
                Ekle
              </button>
            </form>

            {/* Current Roster List */}
            <div className="flex-1 overflow-y-auto py-4 min-h-[200px]">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Kayıtlı Öğrenciler</h4>
              
              {loadingRoster ? (
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="h-5 w-5 text-primary animate-spin mr-2" />
                  <p className="text-slate-500 text-xs">Yükleniyor...</p>
                </div>
              ) : !roster || roster.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs italic font-medium">
                  Sınıfa henüz hiçbir öğrenci kaydedilmemiş.
                </div>
              ) : (
                <div className="space-y-2">
                  {roster.map((student) => (
                    <div
                      key={student.id}
                      className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl"
                    >
                      <span className="font-semibold text-slate-800 text-sm">{student.full_name}</span>
                      <button
                        type="button"
                        onClick={() => handleUnenrollStudent(student.id)}
                        disabled={rosterSaving}
                        className="text-xs text-rose-500 hover:text-rose-700 font-bold border border-rose-100 hover:bg-rose-50/50 px-2 py-1 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Kayıt Sil
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
