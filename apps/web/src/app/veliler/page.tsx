"use client";

import React, { useState } from "react";
import { AdminShell } from "@/components/admin-shell";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/context/AuthContext";
import { 
  Users, 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  Loader2, 
  Mail, 
  Phone, 
  UserCheck, 
  Link as LinkIcon,
  X,
  AlertTriangle,
  GraduationCap
} from "lucide-react";

export default function ParentsAdminPage() {
  const { user, role } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [studentSearchTerm, setStudentSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLinkingModalOpen, setIsLinkingModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Create Parent State
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    selectedStudentIds: [] as string[],
  });
  
  // Link Student State
  const [linkingParentId, setLinkingParentId] = useState<string | null>(null);
  const [linkingStudentId, setLinkingStudentId] = useState("");
  const [linkingRelationship, setLinkingRelationship] = useState<"parent" | "guardian">("parent");

  const { data: parents, isLoading, refetch } = trpc.parents.listParents.useQuery(undefined, {
    enabled: !!user && role === "admin",
  });

  const { data: students } = trpc.students.list.useQuery(undefined, {
    enabled: !!user && role === "admin",
  });

  const createParentMutation = trpc.parents.createParent.useMutation({
    onSuccess: () => {
      setIsModalOpen(false);
      setFormData({ fullName: "", email: "", phone: "", password: "", selectedStudentIds: [] });
      setErrorMessage(null);
      refetch();
    },
    onError: (err) => {
      setErrorMessage(err.message);
    }
  });

  const linkStudentMutation = trpc.parents.linkParentToStudent.useMutation({
    onSuccess: () => {
      setIsLinkingModalOpen(false);
      setLinkingParentId(null);
      setLinkingStudentId("");
      refetch();
    }
  });

  const deleteParentMutation = trpc.parents.deleteParent.useMutation({
    onSuccess: () => refetch()
  });

  // Derived state
  const filteredParents = parents?.filter(p => 
    p.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (p.email && p.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (p.phone && p.phone.includes(searchTerm))
  ) || [];

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName || !formData.email || !formData.password) return;
    
    createParentMutation.mutate({
      full_name: formData.fullName,
      email: formData.email,
      phone: formData.phone || undefined,
      password: formData.password,
      student_ids: formData.selectedStudentIds,
    });
  };

  const handleLinkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkingParentId || !linkingStudentId) return;

    linkStudentMutation.mutate({
      parent_id: linkingParentId,
      student_id: linkingStudentId,
      relationship: linkingRelationship,
    });
  };

  const handleDelete = (id: string) => {
    if (confirm("Bu veliyi silmek istediğinize emin misiniz? Veli sisteme giriş yapamayacaktır.")) {
      deleteParentMutation.mutate({ id });
    }
  };

  const handleStudentToggle = (studentId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedStudentIds: prev.selectedStudentIds.includes(studentId)
        ? prev.selectedStudentIds.filter(id => id !== studentId)
        : [...prev.selectedStudentIds, studentId]
    }));
  };

  return (
    <AdminShell 
      title="Veliler" 
      subtitle="Veli hesapları ve öğrenci bağlantılarını yönetin"
    >
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div className="relative w-full md:w-96">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-slate-400" />
          </div>
          <input
            type="text"
            placeholder="Veli adı, e-posta veya telefon ile ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl leading-5 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary sm:text-sm transition-all shadow-sm"
          />
        </div>
        
        <button
          onClick={() => {
            setErrorMessage(null);
            setIsModalOpen(true);
          }}
          className="w-full md:w-auto flex items-center justify-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm hover:shadow-md hover:bg-primary/90 transition-all active:scale-95"
        >
          <Plus className="h-4 w-4" /> Yeni Veli Ekle
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-bold text-slate-500">
              <tr>
                <th className="px-6 py-4 rounded-tl-xl">Veli Bilgileri</th>
                <th className="px-6 py-4">İletişim</th>
                <th className="px-6 py-4">Bağlı Öğrenciler</th>
                <th className="px-6 py-4 rounded-tr-xl text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                  </td>
                </tr>
              ) : filteredParents.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                    <Users className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                    Kayıtlı veli bulunamadı.
                  </td>
                </tr>
              ) : (
                filteredParents.map((parent) => (
                  <tr key={parent.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
                          {parent.full_name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-slate-800">{parent.full_name}</div>
                          <div className="text-xs text-slate-500 mt-0.5 font-mono">
                            Parola: {parent.password}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-slate-600 text-xs">
                          <Mail className="h-3.5 w-3.5 text-slate-400" />
                          {parent.email}
                        </div>
                        {parent.phone && (
                          <div className="flex items-center gap-2 text-slate-600 text-xs">
                            <Phone className="h-3.5 w-3.5 text-slate-400" />
                            {parent.phone}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        {parent.children.map(child => (
                          <div key={child.student_id} className="inline-flex items-center gap-1.5 text-xs bg-slate-100 border border-slate-200 text-slate-700 px-2 py-1 rounded-md w-fit">
                            <GraduationCap className="h-3.5 w-3.5 text-slate-500" />
                            <span className="font-bold">{child.student_name}</span>
                            <span className="text-slate-400">({child.relationship})</span>
                          </div>
                        ))}
                        <button
                          onClick={() => {
                            setLinkingParentId(parent.id);
                            setIsLinkingModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1 text-[10px] font-bold text-primary hover:text-primary/80 uppercase tracking-wider mt-1 w-fit"
                        >
                          <LinkIcon className="h-3 w-3" /> Öğrenci Ekle
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleDelete(parent.id)}
                          disabled={deleteParentMutation.isPending}
                          className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Veliyi Sil"
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

      {/* ─── Create Parent Modal ─── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white w-full max-w-lg rounded-2xl shadow-xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-primary" /> Yeni Veli Hesabı
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto">
              {errorMessage && (
                <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm font-medium rounded-lg border border-red-200 flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}
              <form onSubmit={handleCreateSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Ad Soyad *</label>
                    <input
                      type="text"
                      required
                      value={formData.fullName}
                      onChange={e => setFormData(p => ({ ...p, fullName: e.target.value }))}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                    />
                  </div>
                  <div className="col-span-2 md:col-span-1">
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">E-posta (Giriş İçin) *</label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                    />
                  </div>
                  <div className="col-span-2 md:col-span-1">
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Geçici Şifre *</label>
                    <input
                      type="text"
                      required
                      value={formData.password}
                      onChange={e => setFormData(p => ({ ...p, password: e.target.value }))}
                      placeholder="Min 6 karakter"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none font-mono"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Telefon (İsteğe Bağlı)</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                    />
                  </div>
                  
                  <div className="col-span-2 mt-2">
                    <label className="block text-xs font-bold text-slate-700 mb-2">Bağlı Öğrenciler (Seçiniz)</label>
                    <div className="mb-2 relative">
                      <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-slate-400" />
                      </div>
                      <input
                        type="text"
                        placeholder="Öğrenci ara..."
                        value={studentSearchTerm}
                        onChange={(e) => setStudentSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                      />
                    </div>
                    <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-lg p-2 space-y-1 bg-slate-50/50">
                      {students?.filter(s => s.full_name.toLowerCase().includes(studentSearchTerm.toLowerCase()) || s.email.toLowerCase().includes(studentSearchTerm.toLowerCase())).map((student) => (
                        <label key={student.id} className="flex items-center gap-3 p-2 hover:bg-slate-100 rounded-md cursor-pointer border border-transparent hover:border-slate-200 transition-colors bg-white">
                          <input
                            type="checkbox"
                            checked={formData.selectedStudentIds.includes(student.id)}
                            onChange={() => handleStudentToggle(student.id)}
                            className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                          />
                          <div>
                            <span className="text-sm font-bold text-slate-700 block">{student.full_name}</span>
                            <span className="text-xs text-slate-500">{student.email}</span>
                          </div>
                        </label>
                      ))}
                      {students?.filter(s => s.full_name.toLowerCase().includes(studentSearchTerm.toLowerCase()) || s.email.toLowerCase().includes(studentSearchTerm.toLowerCase())).length === 0 && (
                        <div className="text-xs text-slate-500 text-center py-4">
                          Öğrenci bulunamadı.
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors"
                  >
                    İptal
                  </button>
                  <button
                    type="submit"
                    disabled={createParentMutation.isPending}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {createParentMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                    Hesap Oluştur
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ─── Link Student Modal ─── */}
      {isLinkingModalOpen && linkingParentId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsLinkingModalOpen(false)} />
          <div className="relative bg-white w-full max-w-sm rounded-2xl shadow-xl flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-800">Öğrenci Bağla</h2>
              <button onClick={() => setIsLinkingModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              <form onSubmit={handleLinkSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Öğrenci Seçin</label>
                  <select
                    required
                    value={linkingStudentId}
                    onChange={(e) => setLinkingStudentId(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                  >
                    <option value="" disabled>-- Öğrenci Seçin --</option>
                    {students?.map(s => (
                      <option key={s.id} value={s.id}>{s.full_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Yakınlık Derecesi</label>
                  <select
                    value={linkingRelationship}
                    onChange={(e) => setLinkingRelationship(e.target.value as "parent" | "guardian")}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                  >
                    <option value="parent">Ebeveyn (Anne/Baba)</option>
                    <option value="guardian">Vasi</option>
                  </select>
                </div>

                <div className="pt-4 flex gap-3">
                  <button
                    type="submit"
                    disabled={linkStudentMutation.isPending || !linkingStudentId}
                    className="w-full px-4 py-2.5 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {linkStudentMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Bağlantıyı Kaydet"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
