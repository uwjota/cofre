"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  Vault,
  LayoutDashboard,
  ListTodo,
  Wallet,
  Timer,
  FolderKanban,
  Newspaper,
  Network,
  LogOut,
  Menu,
  X,
  ArrowUpRight,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
const nav = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/tasks", label: "Tarefas", icon: ListTodo },
  { href: "/finances", label: "Finanças", icon: Wallet },
  { href: "/studies", label: "Estudos & Pomodoro", icon: Timer },
  { href: "/projects", label: "Projetos", icon: FolderKanban },
  { href: "/news", label: "Notícias", icon: Newspaper },
  { href: "/notes", label: "Segundo Cérebro", icon: Network },
];
export function Sidebar({ name, email }: { name: string; email: string }) {
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function logout() {
    setBusy(true);
    const { error } = await createClient().auth.signOut();
    if (error) {
      setError("Não foi possível sair. Tente novamente.");
      setBusy(false);
    } else {
      router.replace("/login");
      router.refresh();
    }
  }
  return (
    <>
      <button
        aria-label="Abrir menu"
        aria-expanded={open}
        className="fixed left-4 top-4 z-40 rounded-lg border border-[#dce3d7] bg-white p-2 lg:hidden"
        onClick={() => setOpen(true)}
      >
        <Menu size={20} />
      </button>
      {open && (
        <button
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
          aria-label="Fechar menu"
          onClick={() => setOpen(false)}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-[#e2e7dc] bg-[#f0f3eb] p-5 transition-transform lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="mb-12 mt-3 flex items-center gap-3 px-2">
          <div className="rounded-xl bg-ink p-2 text-[#d3e5af]">
            <Vault size={27} />
          </div>
          <Link href="/" className="text-3xl font-bold tracking-tight">
            cofre<span className="text-accent">.</span>
          </Link>
          <button
            aria-label="Fechar menu"
            className="icon-btn ml-auto lg:hidden"
            onClick={() => setOpen(false)}
          >
            <X size={18} />
          </button>
        </div>
        <p className="eyebrow mb-4 px-3">Seu espaço pessoal</p>
        <nav className="space-y-1">
          {nav.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              aria-current={path === href ? "page" : undefined}
              className={`flex items-center gap-3 rounded-lg px-3 py-3 text-[13px] transition ${path === href ? "bg-ink font-semibold text-white" : "text-[#69786b] hover:bg-[#e5ebdf] hover:text-ink"}`}
            >
              <Icon size={18} strokeWidth={1.6} />
              {label}
              {path === href && (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#c1db96]" />
              )}
            </Link>
          ))}
        </nav>
        <div className="mt-auto pt-8">
          <div className="mb-5 rounded-xl border border-[#dce4d2] bg-[#e8efde] p-4">
            <Network size={22} className="mb-3 text-accent" />
            <p className="text-sm font-semibold">Boas ideias se conectam.</p>
            <p className="mt-2 text-xs leading-relaxed text-muted">
              Dê um lugar para tudo o que você aprende.
            </p>
            <Link
              className="mt-3 flex items-center gap-2 text-xs font-semibold text-accent"
              href="/notes"
              onClick={() => setOpen(false)}
            >
              Explorar meu cérebro <ArrowUpRight size={14} />
            </Link>
          </div>
          <div className="flex items-center gap-3 border-t border-[#dce3d7] pt-5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#dce5d0] text-xs font-bold">
              {name.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold">{name}</p>
              <p className="mt-1 truncate text-[10px] text-muted">{email}</p>
            </div>
            <button
              disabled={busy}
              title="Sair"
              aria-label="Sair"
              onClick={logout}
              className="icon-btn"
            >
              <LogOut size={17} />
            </button>
          </div>
          {error && (
            <p role="alert" className="mt-2 text-xs text-red-700">
              {error}
            </p>
          )}
        </div>
      </aside>
    </>
  );
}
