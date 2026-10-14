"use client";
import { APP_TIME_ZONE } from "@/lib/utils";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { Play, Pause, RotateCcw, Timer, Coffee } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useVault } from "./vault-provider";
import { Notice, PageHeading } from "./ui";
import { localDate, errorMessage } from "@/lib/utils";
type Clock = {
  mode: "focus" | "break";
  remaining: number;
  endAt: number | null;
  sessionId: string | null;
  pendingAt: string | null;
};
const initial: Clock = {
  mode: "focus",
  remaining: 1500,
  endAt: null,
  sessionId: null,
  pendingAt: null,
};
const Context = createContext<{
  clock: Clock;
  seconds: number;
  ready: boolean;
  error: string;
  saving: boolean;
  toggle: () => void;
  reset: () => void;
  retry: () => void;
} | null>(null);
export function PomodoroProvider({ children }: { children: React.ReactNode }) {
  const { userId, refresh } = useVault();
  const [clock, setClock] = useState<Clock>(initial);
  const [seconds, setSeconds] = useState(1500);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const lock = useRef(false);
  const key = `cofre:pomodoro:${userId}`;
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const value = JSON.parse(raw) as Clock;
        if (
          ["focus", "break"].includes(value.mode) &&
          Number.isFinite(value.remaining) &&
          value.remaining >= 0 &&
          value.remaining <= 1500 &&
          (value.endAt === null || Number.isFinite(value.endAt)) &&
          (value.sessionId === null || typeof value.sessionId === "string") &&
          (value.pendingAt === null || typeof value.pendingAt === "string")
        ) {
          setClock(value);
          setSeconds(
            value.endAt
              ? Math.max(0, Math.ceil((value.endAt - Date.now()) / 1000))
              : value.remaining,
          );
        }
      }
    } catch {
      /* Sem storage: continua em memória. */
    }
    setReady(true);
  }, [key]);
  useEffect(() => {
    if (ready)
      try {
        localStorage.setItem(key, JSON.stringify(clock));
      } catch {
        /* Storage opcional. */
      }
  }, [clock, key, ready]);
  useEffect(() => {
    if (!ready) return;
    function tick() {
      const remaining = clock.endAt
        ? Math.max(0, Math.ceil((clock.endAt - Date.now()) / 1000))
        : clock.remaining;
      setSeconds(remaining);
      if (clock.endAt && remaining === 0) {
        if (clock.mode === "focus")
          setClock({
            ...clock,
            endAt: null,
            remaining: 0,
            pendingAt: new Date(clock.endAt).toISOString(),
          });
        else setClock(initial);
      }
    }
    tick();
    const interval = setInterval(tick, 500);
    return () => clearInterval(interval);
  }, [clock, ready]);
  async function persist(value: Clock) {
    if (lock.current || !value.sessionId || !value.pendingAt) return;
    lock.current = true;
    setSaving(true);
    setError("");
    try {
      const { error } = await createClient().from("pomodoro_sessions").upsert(
        {
          id: value.sessionId,
          user_id: userId,
          duration_minutes: 25,
          completed_at: value.pendingAt,
        },
        { onConflict: "id" },
      );
      if (error) throw error;
      await refresh();
      setClock({
        mode: "break",
        remaining: 300,
        endAt: null,
        sessionId: null,
        pendingAt: null,
      });
    } catch (e) {
      setError(`Sessão concluída, mas ainda não salva: ${errorMessage(e)}`);
    } finally {
      lock.current = false;
      setSaving(false);
    }
  }
  // O UUID é preservado antes do envio; repetir após uma falha não duplica a sessão.
  useEffect(() => {
    if (ready && clock.pendingAt) void persist(clock); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clock.pendingAt, ready]);
  function toggle() {
    if (!ready || clock.pendingAt) return;
    if (clock.endAt)
      setClock({
        ...clock,
        endAt: null,
        remaining: Math.max(0, Math.ceil((clock.endAt - Date.now()) / 1000)),
      });
    else
      setClock({
        ...clock,
        endAt: Date.now() + clock.remaining * 1000,
        sessionId:
          clock.mode === "focus"
            ? clock.sessionId || crypto.randomUUID()
            : null,
      });
  }
  function reset() {
    if (clock.pendingAt) return;
    setClock({
      ...initial,
      mode: clock.mode,
      remaining: clock.mode === "focus" ? 1500 : 300,
    });
  }
  return (
    <Context.Provider
      value={{
        clock,
        seconds,
        ready,
        error,
        saving,
        toggle,
        reset,
        retry: () => void persist(clock),
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function Pomodoro({ compact = false }: { compact?: boolean }) {
  const timer = useContext(Context);
  const { data } = useVault();
  if (!timer) throw new Error("PomodoroProvider ausente.");
  const { clock, seconds, ready, error, saving, toggle, reset, retry } = timer;
  const today = data.pomodoro_sessions.filter(
    (s) => localDate(new Date(s.completed_at)) === localDate(),
  );
  return (
    <>
      {!compact && (
        <PageHeading
          eyebrow="Espaço para se concentrar"
          title="Estudos & Pomodoro"
          description="Uma coisa de cada vez. O progresso vem com a constância."
        />
      )}
      <div
        className={
          compact ? "" : "mx-auto grid max-w-4xl gap-6 md:grid-cols-[1.3fr_1fr]"
        }
      >
        <section className="panel relative overflow-hidden bg-[#edf2e4]!">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-semibold">
              <Timer size={18} />
              Hora de focar
            </h2>
            <span className="text-xs text-muted">25 / 5</span>
          </div>
          <div className="my-6 flex justify-center gap-2 text-xs">
            <span
              className={`rounded-full px-3 py-1.5 ${clock.mode === "focus" ? "bg-ink text-white" : "text-muted"}`}
            >
              Foco · 25 min
            </span>
            <span
              className={`rounded-full px-3 py-1.5 ${clock.mode === "break" ? "bg-ink text-white" : "text-muted"}`}
            >
              Pausa · 5 min
            </span>
          </div>
          <div
            role="timer"
            aria-label="Tempo restante"
            className="text-center text-6xl font-light tracking-[-.05em] tabular-nums"
          >
            {String(Math.floor(seconds / 60)).padStart(2, "0")}
            <span className="text-[#9aac8b]">:</span>
            {String(seconds % 60).padStart(2, "0")}
          </div>
          <p className="mt-3 text-center text-xs text-muted">
            {clock.pendingAt
              ? "Foco concluído! Salvando sua sessão."
              : clock.mode === "focus"
                ? "Um pequeno passo, toda a sua atenção."
                : "Respire, alongue, tome uma água."}
          </p>
          <div className="mt-7 flex justify-center gap-2">
            <button
              className="btn min-w-36"
              disabled={!ready || !!clock.pendingAt}
              onClick={toggle}
            >
              {clock.endAt ? (
                <Pause size={15} />
              ) : clock.mode === "break" ? (
                <Coffee size={15} />
              ) : (
                <Play size={15} />
              )}{" "}
              {clock.endAt
                ? "Pausar"
                : clock.mode === "focus"
                  ? "Iniciar foco"
                  : "Iniciar pausa"}
            </button>
            <button
              className="btn-secondary"
              disabled={!!clock.pendingAt || !ready}
              aria-label="Reiniciar temporizador"
              onClick={reset}
            >
              <RotateCcw size={15} />
            </button>
          </div>
          <Notice message={error} />
          {error && (
            <button
              className="btn-secondary mt-2"
              disabled={saving}
              onClick={retry}
            >
              Tentar salvar sessão
            </button>
          )}
          <div className="mt-7 flex items-center justify-center gap-2 border-t border-[#d9e2ce] pt-4">
            <div className="flex gap-1">
              {[0, 1, 2, 3].map((i) => (
                <span
                  key={i}
                  className={`h-1.5 w-4 rounded-full ${today.length > i ? "bg-accent" : "bg-[#d4dfc7]"}`}
                />
              ))}
            </div>
            <span className="text-[10px] text-muted">
              {today.length} sessões hoje · {today.length * 25} min
            </span>
          </div>
        </section>
        {!compact && (
          <section className="panel">
            <p className="eyebrow">Seu ritmo</p>
            <h2 className="mt-3 text-xl font-semibold">Atenção é um hábito.</h2>
            <p className="mt-4 text-sm leading-relaxed text-muted">
              Escolha uma tarefa, reserve 25 minutos e deixe as distrações para
              depois. Ao terminar, sua sessão é salva e a pausa de 5 minutos
              fica pronta para iniciar.
            </p>
            <div className="my-6 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-[#f4f6f0] p-4">
                <p className="text-2xl font-semibold">
                  {data.pomodoro_sessions.length}
                </p>
                <p className="mt-1 text-xs text-muted">sessões no total</p>
              </div>
              <div className="rounded-xl bg-[#f4f6f0] p-4">
                <p className="text-2xl font-semibold">
                  {data.pomodoro_sessions.reduce(
                    (s, r) => s + r.duration_minutes,
                    0,
                  )}
                </p>
                <p className="mt-1 text-xs text-muted">minutos de foco</p>
              </div>
            </div>
            <h3 className="text-sm font-semibold">Sessões recentes</h3>
            <ul className="mt-3 divide-y divide-[#edf0e8]">
              {data.pomodoro_sessions.slice(0, 5).map((s) => (
                <li
                  key={s.id}
                  className="flex justify-between py-3 text-xs text-muted"
                >
                  <span>
                    {new Date(s.completed_at).toLocaleString("pt-BR", {
                      timeZone: APP_TIME_ZONE,
                    })}
                  </span>
                  <span>{s.duration_minutes} min</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </>
  );
}
