"use client";
import { APP_TIME_ZONE } from "@/lib/utils";
import Link from "next/link";
import {
  Wallet,
  CheckCheck,
  Timer,
  FolderKanban,
  ArrowUpRight,
  Network,
  Sparkles,
} from "lucide-react";
import { useVault } from "./vault-provider";
import { PageHeading } from "./ui";
import { money, balance, localDate } from "@/lib/utils";
import { Tasks } from "./tasks";
import { ExpenseChart } from "./finances";
import { Pomodoro } from "./pomodoro";
import { Projects } from "./projects";
import { News } from "./news";
export function Dashboard() {
  const { data } = useVault();
  const completed = data.tasks.filter((t) => t.completed).length;
  const minutes = data.pomodoro_sessions
    .filter((s) => localDate(new Date(s.completed_at)) === localDate())
    .reduce((sum, s) => sum + s.duration_minutes, 0);
  const cards = [
    {
      label: "Saldo atual",
      value: money(balance(data.finances)),
      detail: "Receitas menos despesas",
      icon: Wallet,
      href: "/finances",
    },
    {
      label: "Tarefas concluídas",
      value: `${completed}`,
      detail: `de ${data.tasks.length} tarefas no seu espaço`,
      icon: CheckCheck,
      href: "/tasks",
    },
    {
      label: "Tempo de foco",
      value: `${minutes} min`,
      detail: "Sua concentração hoje",
      icon: Timer,
      href: "/studies",
    },
    {
      label: "Projetos ativos",
      value: String(data.projects.filter((p) => p.status === "active").length),
      detail: "Ideias ganhando forma",
      icon: FolderKanban,
      href: "/projects",
    },
  ];
  return (
    <>
      <PageHeading
        eyebrow={new Date().toLocaleDateString("pt-BR", {
          timeZone: APP_TIME_ZONE,
          weekday: "long",
          day: "numeric",
          month: "long",
        })}
        title="Um bom dia começa aqui."
        description="Organize o presente. Abra espaço para o que importa."
        action={
          <Link href="/notes" className="btn-secondary">
            <Sparkles size={15} />
            Capturar uma ideia
          </Link>
        }
      />
      <div className="mb-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, detail, icon: Icon, href }) => (
          <Link
            href={href}
            className="panel group transition hover:border-[#b7caaa]"
            key={label}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted">{label}</span>
              <span className="rounded-lg bg-[#f0f4e9] p-2 text-accent">
                <Icon size={17} strokeWidth={1.5} />
              </span>
            </div>
            <p className="mt-4 text-[27px] font-semibold tracking-tight">
              {value}
            </p>
            <div className="mt-3 flex items-center justify-between">
              <p className="text-[10px] text-muted">{detail}</p>
              <ArrowUpRight
                size={13}
                className="text-[#a5b599] group-hover:text-accent"
              />
            </div>
          </Link>
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.65fr_1fr]">
        <div className="space-y-6">
          <Tasks compact />
          <div className="grid gap-6 md:grid-cols-2">
            <Projects compact />
            <ExpenseChart />
          </div>
        </div>
        <div className="space-y-6">
          <Pomodoro compact />
          <Link
            href="/notes"
            className="panel block overflow-hidden bg-ink! text-white"
          >
            <div className="flex items-start justify-between">
              <Network size={29} strokeWidth={1.2} className="text-[#c7dda5]" />
              <ArrowUpRight size={17} className="text-[#c7dda5]" />
            </div>
            <p className="mt-5 text-lg font-medium">
              Conhecimento que se conecta.
            </p>
            <p className="mt-2 text-xs leading-relaxed text-[#b5c9b6]">
              Uma nova perspectiva pode estar a uma conexão de distância.
            </p>
            <div className="mt-6 flex gap-6 border-t border-white/15 pt-4">
              <span>
                <strong className="text-xl font-medium">
                  {data.notes.length}
                </strong>
                <span className="ml-2 text-[10px] text-[#b5c9b6]">notas</span>
              </span>
              <span>
                <strong className="text-xl font-medium">
                  {data.note_links.length}
                </strong>
                <span className="ml-2 text-[10px] text-[#b5c9b6]">
                  conexões
                </span>
              </span>
            </div>
          </Link>
        </div>
      </div>
      <div className="mt-6">
        <News compact />
      </div>
      <footer className="mt-8 flex justify-between text-[10px] text-muted">
        <span>Um pouco de organização. Muito mais espaço mental.</span>
        <span>Cofre pessoal</span>
      </footer>
    </>
  );
}
