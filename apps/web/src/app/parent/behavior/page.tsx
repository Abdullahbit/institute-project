"use client";

import React, { useState } from "react";
import { AdminShell } from "@/components/admin-shell";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/context/AuthContext";
import { Loader2, Heart, Star, ThumbsUp, AlertTriangle, AlertCircle, Calendar } from "lucide-react";

const categoryConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  excellent: { label: "Mükemmel", color: "text-yellow-600 bg-yellow-50 border-yellow-200", icon: <Star className="h-5 w-5" /> },
  good: { label: "İyi", color: "text-emerald-600 bg-emerald-50 border-emerald-200", icon: <ThumbsUp className="h-5 w-5" /> },
  warning: { label: "Dikkat", color: "text-amber-600 bg-amber-50 border-amber-200", icon: <AlertTriangle className="h-5 w-5" /> },
  issue: { label: "Sorun", color: "text-rose-600 bg-rose-50 border-rose-200", icon: <AlertCircle className="h-5 w-5" /> },
};

export default function ParentBehaviorPage() {
  const { user, loading: authLoading } = useAuth();
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("");

  const { data: children, isLoading: loadingChildren } = trpc.parents.getMyChildren.useQuery(
    undefined,
    { enabled: !authLoading && !!user }
  );

  React.useEffect(() => {
    if (children && children.length > 0 && !selectedChildId) {
      setSelectedChildId(children[0].student_id);
    }
  }, [children, selectedChildId]);

  const { data: feedbacks, isLoading: loadingFeedbacks } = trpc.parents.getChildBehaviorFeedbacks.useQuery(
    { 
      student_id: selectedChildId!,
      category: selectedCategory ? (selectedCategory as any) : undefined
    },
    { enabled: !!selectedChildId }
  );

  if (authLoading || loadingChildren) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AdminShell title="Davranış Notları" subtitle="Öğretmenlerin sınıf içi geri bildirimleri">
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        {/* Child Selector */}
        {children && children.length > 1 && (
          <div className="flex gap-2 flex-wrap">
            {children.map((child) => (
              <button
                key={child.student_id}
                onClick={() => setSelectedChildId(child.student_id)}
                className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all border ${
                  selectedChildId === child.student_id
                    ? "bg-primary text-white border-primary shadow-md shadow-primary/20"
                    : "bg-white text-slate-700 border-slate-200 hover:border-primary/40 hover:bg-primary/5"
                }`}
              >
                {child.student_name}
              </button>
            ))}
          </div>
        )}

        <div className="md:ml-auto">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full md:w-48 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">Tüm Notlar</option>
            <option value="excellent">Mükemmel</option>
            <option value="good">İyi</option>
            <option value="warning">Dikkat</option>
            <option value="issue">Sorun</option>
          </select>
        </div>
      </div>

      {loadingFeedbacks ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : !feedbacks || feedbacks.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm p-12 text-center">
          <Heart className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-700">Henüz Geri Bildirim Yok</h3>
          <p className="text-sm text-slate-500 mt-2">Bu öğrenci için henüz bir davranış notu girilmemiş.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {feedbacks.map((fb) => {
            const config = categoryConfig[fb.category] || categoryConfig.good;
            
            return (
              <div key={fb.id} className={`bg-white rounded-xl shadow-sm overflow-hidden border ${config.color.split(' ')[2]}`}>
                <div className={`px-5 py-4 border-b flex items-center justify-between ${config.color.split(' ')[1]}`}>
                  <div className={`flex items-center gap-3 ${config.color.split(' ')[0]}`}>
                    {config.icon}
                    <h3 className="font-bold text-sm">{fb.title}</h3>
                  </div>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-white/50">
                    {config.label}
                  </span>
                </div>
                
                <div className="p-5">
                  {fb.description ? (
                    <p className="text-sm text-slate-700 leading-relaxed mb-4">{fb.description}</p>
                  ) : (
                    <p className="text-sm text-slate-400 italic mb-4">Açıklama girilmemiş.</p>
                  )}
                  
                  <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-100 text-xs text-slate-500">
                    <div className="flex items-center gap-1.5 font-medium">
                      <span>Öğretmen:</span> <span className="text-slate-700">{fb.teacher_name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {fb.feedback_date}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AdminShell>
  );
}
