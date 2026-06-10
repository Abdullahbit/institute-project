'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { getSchoolSlugFromHostname } from '../../utils/slug';
import { trpc } from '@/lib/trpc';
import Image from 'next/image';
import { Mail, Lock, Loader2, Sparkles, ShieldAlert, Check, Globe, X } from 'lucide-react';

export default function LoginPage() {
  const { language, setLanguage, t } = useLanguage();
  const { user, role, loading: authLoading, setLocalSchoolSlug } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentSlug, setCurrentSlug] = useState('');

  // Remember me & Autofill states
  const [rememberMe, setRememberMe] = useState(false);
  const [savedEmails, setSavedEmails] = useState<string[]>([]);
  const [showEmailDropdown, setShowEmailDropdown] = useState(false);
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
        if (slug) {
          router.push('/');
        } else {
          router.push('/admin/dashboard');
        }
      } else if (role === 'teacher') {
        router.push('/teacher/dashboard');
      } else if (role === 'student') {
        router.push('/student/dashboard');
      }
    }
  }, [user, role, authLoading, router]);

  useEffect(() => {
    // Load saved emails
    const localEmails = localStorage.getItem('edupanel_saved_emails');
    if (localEmails) {
      try {
        setSavedEmails(JSON.parse(localEmails));
      } catch (e) {
        console.error(e);
      }
    }

    // Load remember me settings
    const savedCreds = localStorage.getItem('edupanel_remembered_credentials');
    if (savedCreds) {
      try {
        const { email: savedEmail, password: savedPassword } = JSON.parse(savedCreds);
        if (savedEmail && savedPassword) {
          setEmail(savedEmail);
          setPassword(savedPassword);
          setRememberMe(true);
        }
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError(t('login_error_fields'));
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
        setError(authErr.message === 'Invalid login credentials' ? t('login_error_invalid') : authErr.message);
        setLoading(false);
        return;
      }

      const u = data.user;
      if (!u) {
        setError(t('login_error_auth_failed'));
        setLoading(false);
        return;
      }

      // Check is_active status
      const isActive = u.user_metadata?.is_active ?? true;
      if (!isActive) {
        await supabase.auth.signOut();
        setError(t('login_error_inactive'));
        setLoading(false);
        return;
      }

      const userRole = u.user_metadata?.role;

      if (userRole === 'admin' || userRole === 'teacher' || userRole === 'student') {
        if (rememberMe) {
          localStorage.setItem(
            'edupanel_remembered_credentials',
            JSON.stringify({ email, password })
          );
        } else {
          localStorage.removeItem('edupanel_remembered_credentials');
        }

        let updatedEmails = [email, ...savedEmails.filter((x) => x !== email)];
        if (updatedEmails.length > 5) {
          updatedEmails = updatedEmails.slice(0, 5);
        }
        setSavedEmails(updatedEmails);
        localStorage.setItem('edupanel_saved_emails', JSON.stringify(updatedEmails));
      }

      if (userRole === 'admin') {
        if (currentSlug) {
          router.push('/');
        } else {
          router.push('/admin/dashboard');
        }
      } else if (userRole === 'teacher') {
        router.push('/teacher/dashboard');
      } else if (userRole === 'student') {
        router.push('/student/dashboard');
      } else {
        setError(t('login_error_unauthorized'));
        await supabase.auth.signOut();
      }
    } catch (err: any) {
      setError(err?.message || t('login_error_unexpected'));
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

        {/* Top Logo branding & Language Selector */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center font-bold text-lg text-white shadow-lg shadow-violet-500/10">
              EP
            </div>
            <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              EduPanel
            </span>
          </div>

          <div className="flex items-center bg-slate-900/80 border border-slate-800 rounded-lg p-0.5 z-20">
            <button
              onClick={() => setLanguage('tr')}
              className={`px-2.5 py-1 text-[10px] font-bold rounded transition-all cursor-pointer ${
                language === 'tr'
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              TR
            </button>
            <button
              onClick={() => setLanguage('en')}
              className={`px-2.5 py-1 text-[10px] font-bold rounded transition-all cursor-pointer ${
                language === 'en'
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              EN
            </button>
          </div>
        </div>

        {/* Center Login Form */}
        <div className="my-auto py-8 max-w-sm w-full mx-auto">
          <div className="mb-6">
            <h2 className="text-2xl font-bold tracking-tight text-white mb-1.5">{t('login_title')}</h2>
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
              {currentSlug ? `${t('login_school_login')}: ${schoolTitle}` : t('login_portal_title')}
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
                {t('login_email')}
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-600" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onFocus={() => setShowEmailDropdown(true)}
                  placeholder="name@school.com"
                  className="w-full bg-[#14151F] border border-slate-850 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-slate-650 focus:outline-none focus:border-violet-500 transition-colors font-medium"
                  required
                />
                
                {showEmailDropdown && savedEmails.length > 0 && (
                  <>
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setShowEmailDropdown(false)}
                    />
                    <div className="absolute left-0 right-0 top-full mt-1.5 bg-[#14151F] border border-slate-800 rounded-xl shadow-2xl overflow-hidden z-20 max-h-40 overflow-y-auto">
                      {savedEmails.map((savedEmail, idx) => (
                        <div
                          key={idx}
                          onClick={() => {
                            setEmail(savedEmail);
                            setShowEmailDropdown(false);
                            const savedCreds = localStorage.getItem('edupanel_remembered_credentials');
                            if (savedCreds) {
                              try {
                                const { email: savedEmailName, password: savedPassword } = JSON.parse(savedCreds);
                                if (savedEmailName === savedEmail) {
                                  setPassword(savedPassword);
                                  setRememberMe(true);
                                }
                              } catch (e) {
                                console.error(e);
                              }
                            }
                          }}
                          className="px-4 py-2.5 text-xs text-slate-350 hover:text-white hover:bg-violet-600/20 cursor-pointer transition-colors flex justify-between items-center group/item"
                        >
                          <span>{savedEmail}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const updated = savedEmails.filter(x => x !== savedEmail);
                              setSavedEmails(updated);
                              localStorage.setItem('edupanel_saved_emails', JSON.stringify(updated));
                            }}
                            className="text-slate-500 hover:text-rose-400 p-0.5 rounded opacity-0 group-hover/item:opacity-100 transition-opacity cursor-pointer"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                {t('login_password')}
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

            <div className="flex items-center justify-between mt-1">
              <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-slate-800 bg-[#14151F] text-violet-600 focus:ring-violet-500/20 h-4 w-4 transition-colors cursor-pointer"
                />
                <span>{t('login_remember_me')}</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading || authLoading}
              className="mt-2 w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-bold py-3.5 px-4 rounded-xl transition-all shadow-lg shadow-violet-500/10 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-1.5"
            >
              {(loading || authLoading) && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? t('login_btn_loading') : t('login_btn')}
            </button>
          </form>
        </div>

        {/* Empty space/footer */}
        <div className="pt-6 border-t border-slate-900/10 flex flex-col gap-2 max-w-sm w-full mx-auto">
          <p className="text-[10px] text-center text-slate-600 font-medium">
            {t('login_footer')}
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
              {t('login_welcome')}
            </h1>
            <p className="text-sm text-violet-100 max-w-md leading-relaxed font-medium">
              {t('login_welcome_desc')}
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
