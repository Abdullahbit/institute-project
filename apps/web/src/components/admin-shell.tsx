import Link from "next/link";

const nav = [
  { href: "/", label: "Ana Sayfa" },
  { href: "/program", label: "Program" },
  { href: "/ogretmenler", label: "Öğretmenler" },
  { href: "/uyarilar", label: "Uyarılar" },
];

export function AdminShell({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="min-h-screen flex">
      <aside className="w-56 bg-white border-r border-slate-200 p-4 shrink-0">
        <p className="font-semibold text-slate-900 mb-6">EduPanel</p>
        <nav className="space-y-1">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block px-3 py-2 rounded-md text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <p className="mt-8 text-xs text-slate-400">Next.js 14 · tRPC · Supabase</p>
      </aside>
      <main className="flex-1 p-8">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
          {subtitle ? (
            <p className="text-sm text-slate-500 mt-1">{subtitle}</p>
          ) : null}
        </header>
        {children}
      </main>
    </div>
  );
}
