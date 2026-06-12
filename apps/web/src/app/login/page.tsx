'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { getSchoolSlugFromHostname } from '../../utils/slug';
import { trpc } from '@/lib/trpc';
import Image from 'next/image';
import { Mail, Lock, Loader2, Sparkles, ShieldAlert, Check, Globe } from 'lucide-react';

export default function LoginPage() {
  const { user, role, loading: authLoading, setLocalSchoolSlug } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentSlug, setCurrentSlug] = useState('');
  const router = useRouter();

  // tRPC Mutation Hooks
  const seedMutation = trpc.admin.seed.useMutation();

  useEffect(() => {
    // Check if hostname resolves subdomain or fallback to local storage
    const slug = getSchoolSlugFromHostname() || '';
    setCurrentSlug(slug);

    // If already logged in and auth finished loading, redirect to correct workspace
    if (!authLoading && user && role) {
      if (role === 'admin') {
        router.push('/');
      } else if (role === 'teacher') {
        router.push('/teacher/dashboard');
      } else if (role === 'student') {
        router.push('/student/dashboard');
      } else if (role === 'parent') {
        router.push('/parent/dashboard');
      }
    }
  }, [user, role, authLoading, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Lütfen tüm giriş alanlarını doldurun.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: authErr } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authErr) {
        setError(authErr.message === 'Invalid login credentials' ? 'Geçersiz e-posta veya şifre.' : authErr.message);
        setLoading(false);
        return;
      }

      const u = data.user;
      if (!u) {
        setError('Kimlik doğrulama başarısız oldu.');
        setLoading(false);
        return;
      }

      if (typeof window !== 'undefined' && u.user_metadata?.school_id) {
        localStorage.setItem('x-school-id', u.user_metadata.school_id);
      }

      // Check is_active status
      const isActive = u.user_metadata?.is_active ?? true;
      if (!isActive) {
        await supabase.auth.signOut();
        setError('Hesabınız şu anda aktif değil. Lütfen yöneticinizle iletişime geçin.');
        setLoading(false);
        return;
      }

      const userRole = u.user_metadata?.role;

      if (userRole === 'admin') {
        router.push('/');
      } else if (userRole === 'teacher') {
        router.push('/teacher/dashboard');
      } else if (userRole === 'student') {
        router.push('/student/dashboard');
      } else if (userRole === 'parent') {
        router.push('/parent/dashboard');
      } else {
        setError('Yetkisiz: Bilinmeyen kullanıcı rolü.');
        await supabase.auth.signOut();
      }
    } catch (err: any) {
      setError(err?.message || 'Giriş yapılırken beklenmedik bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const handleSlugSwitch = (slug: string) => {
    setLocalSchoolSlug(slug);
  };

  const schoolTitle = currentSlug
    ? currentSlug.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ')
    : 'EduPanel Portal';

  return (
    <div className="min-h-screen bg-[#090A0F] text-white flex flex-col lg:grid lg:grid-cols-12 overflow-x-hidden">
      
      {/* SOL PANEL (Form & Switcher) - 40% Width on Large Screens */}
      <div className="lg:col-span-5 flex flex-col justify-between p-6 sm:p-12 min-h-screen z-10 relative bg-[#0D0E14] border-r border-slate-900">
        
        {/* Soft glowing ambient backgrounds on the left */}
        <div className="absolute top-1/4 left-1/4 w-72 h-72 rounded-full bg-violet-600/5 blur-[80px] pointer-events-none"></div>
        <div className="absolute bottom-1/4 right-1/4 w-72 h-72 rounded-full bg-indigo-600/5 blur-[80px] pointer-events-none"></div>

        {/* Top Logo branding */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center font-bold text-lg text-white shadow-lg shadow-violet-500/10">
            EP
          </div>
          <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            EduPanel
          </span>
        </div>

        {/* Center Login Form */}
        <div className="my-auto py-8 max-w-sm w-full mx-auto">
          <div className="mb-6">
            <h2 className="text-2xl font-bold tracking-tight text-white mb-1.5">Giriş Yap</h2>
            <p className="text-xs text-slate-450 font-semibold uppercase tracking-wider">
              {currentSlug ? `Okul Girişi: ${schoolTitle}` : 'Eğitim Yönetim Portalı'}
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div className="space-y-1">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                E-posta Adresi
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-600" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="name@school.com"
                  className="w-full bg-[#14151F] border border-slate-850 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-slate-650 focus:outline-none focus:border-violet-500 transition-colors font-medium"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Şifre
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-600" />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#14151F] border border-slate-850 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-slate-650 focus:outline-none focus:border-violet-500 transition-colors font-medium"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || authLoading}
              className="mt-2 w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-bold py-3.5 px-4 rounded-xl transition-all shadow-lg shadow-violet-500/10 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-1.5"
            >
              {(loading || authLoading) && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? 'Giriş Yapılıyor...' : 'Giriş Yap'}
            </button>
          </form>
        </div>

        {/* Empty space/footer */}
        <div className="pt-6 border-t border-slate-900/10 flex flex-col gap-2 max-w-sm w-full mx-auto">
          <p className="text-[10px] text-center text-slate-600 font-medium">
            EduPanel © 2026. Tüm hakları saklıdır.
          </p>
        </div>
      </div>

      {/* SAĞ PANEL (Görsel & İllüstrasyon) - 60% Width on Large Screens */}
      <div className="hidden lg:col-span-7 bg-gradient-to-br from-[#7C3AED] via-[#6D28D9] to-[#4C1D95] lg:flex flex-col justify-start pt-20 items-center p-12 relative overflow-hidden">
        
        {/* Abstract shapes & lights */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-white/5 blur-[120px] pointer-events-none -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full bg-violet-900/40 blur-[120px] pointer-events-none translate-y-1/2 -translate-x-1/2"></div>

        {/* Content Box */}
        <div className="max-w-4xl w-full text-center flex flex-col items-center gap-8 z-10 animate-in fade-in zoom-in-95 duration-500">
          <div className="space-y-3">
            <h1 className="text-4xl font-extrabold tracking-tight text-white leading-none">
              Welcome to student portal
            </h1>
            <p className="text-sm text-violet-100 max-w-md leading-relaxed font-medium">
              Giriş yapın ve ders programınızı, ders saat raporlarınızı ve karne gelişim grafiklerinizi hemen izlemeye başlayın.
            </p>
          </div>

          {/* Premium Framed Illustration Card */}
          <div className="relative w-full max-w-[740px] aspect-[4/3] rounded-2xl overflow-hidden bg-white/5 backdrop-blur-md border border-white/10 shadow-2xl p-4 flex items-center justify-center transform hover:scale-[1.01] transition-transform">
            <Image
              src="/login_page_illustration.png"
              alt="Student Portal Illustration"
              width={700}
              height={525}
              className="object-contain drop-shadow-xl rounded-xl"
              priority
            />
          </div>
        </div>
      </div>
    </div>
  );
}
