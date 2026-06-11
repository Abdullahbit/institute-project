"use client";

import React, { useState, useEffect } from "react";
import { AdminShell } from "@/components/admin-shell";
import { trpc } from "@/lib/trpc";
import { UserPlus, Eye, Pencil, X, Check, Loader2, Calendar, Copy, Upload, Trash2 } from "lucide-react";

export default function OgrencilerPage() {
  const { data: apiData, isLoading, error, refetch } = trpc.students.list.useQuery();
  const { data: classesData } = trpc.classes.list.useQuery();
  const [students, setStudents] = useState<any[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [successMsg, setSuccessMsg] = useState(false);

  // Form states
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  // Success credentials display state
  const [createdStudent, setCreatedStudent] = useState<{ fullName: string; email: string; password: string } | null>(null);
  const [emailCopied, setEmailCopied] = useState(false);
  const [passCopied, setPassCopied] = useState(false);

  const copyEmail = () => {
    if (!createdStudent) return;
    navigator.clipboard.writeText(createdStudent.email);
    setEmailCopied(true);
    setTimeout(() => setEmailCopied(false), 2000);
  };

  const copyPassword = () => {
    if (!createdStudent) return;
    navigator.clipboard.writeText(createdStudent.password);
    setPassCopied(true);
    setTimeout(() => setPassCopied(false), 2000);
  };


  // Class assignment states
  const enrollStudent = trpc.classes.enrollStudent.useMutation();
  const unenrollStudent = trpc.classes.unenrollStudent.useMutation();
  const [classModalOpen, setClassModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [targetClassId, setTargetClassId] = useState("");
  const [classError, setClassError] = useState<string | null>(null);
  const [classSaving, setClassSaving] = useState(false);

  const createStudent = trpc.students.create.useMutation();
  const bulkCreateStudent = trpc.students.bulkCreate.useMutation();
  const deleteStudent = trpc.students.delete.useMutation();

  // Bulk import states
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [csvStudents, setCsvStudents] = useState<any[]>([]);
  const [csvFileName, setCsvFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  // Load initial students
  useEffect(() => {
    if (apiData) {
      setStudents(apiData);
    }
  }, [apiData]);

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName) return;

    setAdding(true);
    setFormError(null);

    try {
      await createStudent.mutateAsync({
        full_name: fullName,
        email: email || undefined,
        password: password || undefined,
        parent_phone: parentPhone || undefined,
      });

      await refetch();

      // Save credentials for display
      setCreatedStudent({
        fullName: fullName,
        email: email || "E-posta tanımlanmadı",
        password: password || "Şifre tanımlanmadı",
      });

      // Reset Form fields for next time
      setFullName("");
      setEmail("");
      setPassword("");
      setParentPhone("");
    } catch (err: any) {
      setFormError(err?.message || "Öğrenci kaydedilemedi.");
    } finally {
      setAdding(false);
    }
  };

  const handleOpenClassModal = (student: any) => {
    setSelectedStudent(student);
    setTargetClassId(student.class_id || "");
    setClassError(null);
    setClassModalOpen(true);
  };

  const handleSaveClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;

    setClassSaving(true);
    setClassError(null);

    try {
      // If student is currently in a class, and targetClassId is empty or changed:
      if (selectedStudent.class_id && selectedStudent.class_id !== targetClassId) {
        await unenrollStudent.mutateAsync({
          class_id: selectedStudent.class_id,
          student_id: selectedStudent.id,
        });
      }

      // If new class is selected:
      if (targetClassId) {
        await enrollStudent.mutateAsync({
          class_id: targetClassId,
          student_id: selectedStudent.id,
        });
      }

      await refetch();
      setClassModalOpen(false);
      setSelectedStudent(null);
      setTargetClassId("");
    } catch (err: any) {
      setClassError(err?.message || "Sınıf ataması gerçekleştirilemedi.");
    } finally {
      setClassSaving(false);
    }
  };

  const handleDeleteStudent = async (id: string) => {
    if (!confirm("Bu öğrenciyi silmek istediğinize emin misiniz?")) return;
    try {
      await deleteStudent.mutateAsync({ id });
      await refetch();
    } catch (err: any) {
      alert(err?.message || "Silme işlemi başarısız oldu.");
    }
  };

  const parseCSV = (text: string) => {
    const lines = text.split(/\r?\n/);
    if (lines.length === 0) return [];
    
    const firstLine = lines[0];
    const delimiter = firstLine.includes(";") ? ";" : ",";
    const headers = firstLine.split(delimiter).map(h => h.trim().toLowerCase());
    
    const parsedStudents: any[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const columns = line.split(delimiter).map(c => c.trim().replace(/^["']|["']$/g, ""));
      const student: any = {
        full_name: "",
        email: "",
        password: "",
        parent_phone: ""
      };
      
      headers.forEach((header, index) => {
        const val = columns[index] || "";
        if (header.includes("ad") || header.includes("name") || header.includes("soyad")) {
          student.full_name = val;
        } else if (header.includes("mail") || header.includes("eposta") || header.includes("e-posta")) {
          student.email = val;
        } else if (header.includes("şifre") || header.includes("sifre") || header.includes("pass")) {
          student.password = val;
        } else if (header.includes("tel") || header.includes("phone") || header.includes("veli")) {
          student.parent_phone = val;
        }
      });
      
      if (!student.full_name && columns[0]) {
        student.full_name = columns[0];
        student.email = columns[1] || "";
        student.password = columns[2] || "";
        student.parent_phone = columns[3] || "";
      }
      
      if (student.full_name) {
        parsedStudents.push(student);
      }
    }
    
    return parsedStudents;
  };

  const handleCsvFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvFileName(file.name);
    setImportError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        const parsed = parseCSV(text);
        if (parsed.length === 0) {
          setImportError("CSV dosyasından geçerli öğrenci verisi okunamadı. Lütfen formatı kontrol edin.");
        } else {
          setCsvStudents(parsed);
        }
      }
    };
    reader.onerror = () => {
      setImportError("Dosya okunurken bir hata oluştu.");
    };
    reader.readAsText(file);
  };

  const handleImportStudents = async () => {
    if (csvStudents.length === 0) return;

    setImporting(true);
    setImportError(null);

    try {
      const res = await bulkCreateStudent.mutateAsync({
        students: csvStudents.map(s => ({
          full_name: s.full_name,
          email: s.email || undefined,
          password: s.password || undefined,
          parent_phone: s.parent_phone || undefined,
        }))
      });

      if (res.success) {
        await refetch();
        setSuccessMsg(true);
        setTimeout(() => setSuccessMsg(false), 3000);
        setBulkModalOpen(false);
        setCsvStudents([]);
        setCsvFileName("");
      }
    } catch (err: any) {
      setImportError(err?.message || "Öğrenciler içe aktarılamadı.");
    } finally {
      setImporting(false);
    }
  };

  return (
    <AdminShell
      title="Öğrenciler"
      subtitle="Tüm öğrencileri görüntüle ve yönetin."
    >
      <div className="flex justify-between items-center mb-6">
        <div>
          {successMsg ? (
            <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg animate-fade-in">
              <Check className="h-3.5 w-3.5" /> Yeni öğrenci başarıyla eklendi.
            </span>
          ) : (
            students && (
              <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md border border-slate-200">
                Toplam {students.length} Öğrenci
              </span>
            )
          )}
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => {
              setCsvStudents([]);
              setCsvFileName("");
              setImportError(null);
              setBulkModalOpen(true);
            }}
            className="inline-flex items-center gap-2 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold px-4 py-2.5 rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            <Upload className="h-4 w-4 text-slate-500" />
            Toplu Öğrenci Ekle
          </button>
          <button 
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-2 bg-primary hover:bg-blue-600 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            <UserPlus className="h-4 w-4" />
            Yeni Öğrenci Ekle
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="flex justify-center items-center py-20">
          <p className="text-slate-500 font-medium">Yükleniyor…</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm font-semibold mb-6">
          API Hatası — Sunucu çalışıyor mu?
        </div>
      )}

      {students && (
        <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50/50 border-b border-slate-100 text-slate-600 font-medium">
                <tr>
                  <th className="px-6 py-4">Ad Soyad</th>
                  <th className="px-6 py-4">E-posta</th>
                  <th className="px-6 py-4">Şifre</th>
                  <th className="px-6 py-4">Veli Telefonu</th>
                  <th className="px-6 py-4">Rol</th>
                  <th className="px-6 py-4">Kayıtlı Sınıf</th>
                  <th className="px-6 py-4">Durum</th>
                  <th className="px-6 py-4 text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-slate-500 font-medium">
                      Kayıtlı öğrenci bulunmamaktadır.
                    </td>
                  </tr>
                ) : (
                  students.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/30 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-900">{s.full_name}</td>
                      <td className="px-6 py-4 text-slate-600 font-mono text-xs select-all">{s.email || "—"}</td>
                      <td className="px-6 py-4 text-slate-650 font-mono text-xs select-all">{s.password || "—"}</td>
                      <td className="px-6 py-4 text-slate-600 text-xs font-semibold">{s.parent_phone || "—"}</td>
                      <td className="px-6 py-4 text-slate-600 font-medium">Öğrenci</td>
                      <td className="px-6 py-4">
                        {s.class_name ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-primary/10 text-primary border border-primary/20">
                            {s.class_name}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs italic font-medium">Sınıf Atanmamış</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-700 border border-emerald-200">
                          Aktif
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => handleOpenClassModal(s)}
                            className="inline-flex items-center gap-1 border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-800 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg transition-colors"
                          >
                            <Calendar className="h-3.5 w-3.5 text-slate-400" />
                            Sınıf Atama
                          </button>
                          <button 
                            onClick={() => handleDeleteStudent(s.id)}
                            className="inline-flex items-center gap-1 border border-rose-200 hover:bg-rose-50 text-rose-600 hover:text-rose-700 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-rose-400" />
                            Sil
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

      {/* Sınıf Atama Modali */}
      {classModalOpen && selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
            onMouseDown={() => setClassModalOpen(false)}
          />
          <div 
            className="relative bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-lg">Sınıf Yönetimi</h3>
              <button 
                onClick={() => setClassModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="my-4">
              <p className="text-xs text-slate-500 font-medium">
                <span className="font-bold text-slate-800">{selectedStudent.full_name}</span> adlı öğrenciyi bir sınıfa kaydedebilir veya sınıf kaydını güncelleyebilirsiniz.
              </p>
            </div>
            
            {classError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                {classError}
              </div>
            )}

            <form onSubmit={handleSaveClass} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Sınıf Seçin</label>
                <select
                  value={targetClassId}
                  onChange={(e) => setTargetClassId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-primary focus:bg-white transition-all font-medium"
                >
                  <option value="">Sınıf Atama Yok (Sınıfsız)</option>
                  {classesData?.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name} ({cls.levelCode})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setClassModalOpen(false)}
                  disabled={classSaving}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={classSaving}
                  className="px-4 py-2 bg-primary hover:bg-blue-600 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                  {classSaving ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Kaydediliyor...
                    </>
                  ) : (
                    "Değişiklikleri Kaydet"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Dialog */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
            onMouseDown={() => {
              setModalOpen(false);
              setCreatedStudent(null);
            }}
          />
          {/* Modal Container */}
          <div 
            className="relative bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-lg">
                {createdStudent ? "Öğrenci Hesabı Oluşturuldu" : "Yeni Öğrenci Ekle"}
              </h3>
              <button 
                onClick={() => {
                  setModalOpen(false);
                  setCreatedStudent(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            {createdStudent ? (
              <div className="space-y-4 pt-4">
                <div className="flex flex-col items-center justify-center text-center p-2 mb-2">
                  <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                    <Check className="h-6 w-6" />
                  </div>
                  <h4 className="font-bold text-slate-900 text-base">{createdStudent.fullName}</h4>
                  <p className="text-xs text-slate-500 mt-1">Öğrenci hesabı ve giriş bilgileri başarıyla oluşturuldu.</p>
                </div>

                <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200/80">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">E-posta Adresi</span>
                    <div className="flex items-center justify-between gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700">
                      <span className="truncate select-all">{createdStudent.email}</span>
                      <button
                        type="button"
                        onClick={copyEmail}
                        className="inline-flex items-center gap-1 text-primary hover:text-blue-600 text-[10px] font-bold shrink-0 cursor-pointer"
                      >
                        <Copy className="h-3 w-3" />
                        {emailCopied ? "Kopyalandı!" : "Kopyala"}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Geçici Şifre</span>
                    <div className="flex items-center justify-between gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700">
                      <span className="font-mono select-all">{createdStudent.password}</span>
                      <button
                        type="button"
                        onClick={copyPassword}
                        className="inline-flex items-center gap-1 text-primary hover:text-blue-600 text-[10px] font-bold shrink-0 cursor-pointer"
                      >
                        <Copy className="h-3 w-3" />
                        {passCopied ? "Kopyalandı!" : "Kopyala"}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setModalOpen(false);
                      setCreatedStudent(null);
                    }}
                    className="px-4 py-2 bg-primary hover:bg-blue-600 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
                  >
                    Kapat
                  </button>
                </div>
              </div>
            ) : (
              <>
                {formError && (
                  <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                    {formError}
                  </div>
                )}

                <form onSubmit={handleAddStudent} className="space-y-4 pt-4">
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
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">E-posta</label>
                    <input 
                      type="email" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="ogrenci@okul.com"
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

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Veli Telefonu</label>
                    <input 
                      type="text" 
                      value={parentPhone}
                      onChange={(e) => setParentPhone(e.target.value)}
                      placeholder="+90 555 444 33 22"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-primary focus:bg-white transition-all font-medium"
                    />
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
                      className="px-4 py-2 bg-primary hover:bg-blue-600 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {adding ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Kaydediliyor...
                        </>
                      ) : (
                        "Kaydet"
                      )}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* Toplu Öğrenci Ekleme Modali */}
      {bulkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
            onMouseDown={() => setBulkModalOpen(false)}
          />
          {/* Modal Container */}
          <div 
            className="relative bg-white rounded-2xl w-full max-w-2xl p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-lg">Toplu Öğrenci İçe Aktar</h3>
              <button 
                onClick={() => setBulkModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            {importError && (
              <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                {importError}
              </div>
            )}

            {csvStudents.length === 0 ? (
              <div className="space-y-4 pt-4">
                <div className="border border-dashed border-slate-200 rounded-xl p-8 text-center bg-slate-50/50 hover:bg-slate-50 transition-all">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleCsvFileUpload}
                    id="csv-file-input"
                    className="hidden"
                  />
                  <label htmlFor="csv-file-input" className="cursor-pointer flex flex-col items-center gap-3">
                    <Upload className="h-10 w-10 text-slate-400 bg-white p-2 rounded-lg shadow-sm border border-slate-100" />
                    <div>
                      <p className="text-sm font-semibold text-slate-800">CSV Dosyası Yükleyin</p>
                      <p className="text-xs text-slate-500 mt-1">Sürükleyip bırakın veya bilgisayarınızdan seçin</p>
                    </div>
                  </label>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">CSV Şablon Yapısı</h4>
                  <p className="text-xs text-slate-600 font-medium">Dosyanız aşağıdaki gibi sütun başlıklarına sahip olmalıdır (sıralama fark etmez):</p>
                  <code className="block text-[11px] font-mono bg-slate-900 text-slate-100 rounded-lg p-2.5 overflow-x-auto select-all">
                    Ad Soyad,E-posta,Şifre,Veli Telefonu
                  </code>
                  <p className="text-[11px] text-slate-500 font-medium">Not: E-posta ve Şifre girilirse, öğrencilere otomatik giriş hesabı oluşturulacaktır.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4 pt-4">
                <div className="flex justify-between items-center bg-blue-50 border border-blue-100 rounded-xl p-3.5">
                  <span className="text-xs font-semibold text-blue-800">
                    Dosya: <span className="font-bold">{csvFileName}</span> — {csvStudents.length} öğrenci bulundu.
                  </span>
                  <button
                    onClick={() => {
                      setCsvStudents([]);
                      setCsvFileName("");
                      setImportError(null);
                    }}
                    className="text-xs font-bold text-blue-700 hover:text-blue-900 underline"
                  >
                    Dosyayı Değiştir
                  </button>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 border-b border-slate-100 text-slate-600 font-bold uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-2.5">Ad Soyad</th>
                        <th className="px-4 py-2.5">E-posta</th>
                        <th className="px-4 py-2.5">Şifre</th>
                        <th className="px-4 py-2.5">Veli Telefonu</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700 font-sans">
                      {csvStudents.map((student, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="px-4 py-2 font-bold text-slate-900">{student.full_name}</td>
                          <td className="px-4 py-2 font-mono">{student.email || <span className="text-slate-400 italic">yok</span>}</td>
                          <td className="px-4 py-2 font-mono">{student.password || <span className="text-slate-400 italic">yok</span>}</td>
                          <td className="px-4 py-2">{student.parent_phone || <span className="text-slate-400 italic">yok</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setCsvStudents([]);
                      setCsvFileName("");
                      setImportError(null);
                      setBulkModalOpen(false);
                    }}
                    disabled={importing}
                    className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
                  >
                    İptal
                  </button>
                  <button
                    onClick={handleImportStudents}
                    disabled={importing}
                    className="px-4 py-2 bg-primary hover:bg-blue-600 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                  >
                    {importing ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        İçe Aktarılıyor...
                      </>
                    ) : (
                      "İçe Aktarmayı Başlat"
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </AdminShell>
  );
}

