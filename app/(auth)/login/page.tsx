"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Vault, ArrowRight, Network, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { isConfigured } from "@/lib/supabase/config";
import { Field, Notice, Submit } from "@/components/ui";
export default function LoginPage() {
  const router = useRouter();
  const [signup, setSignup] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const configured = isConfigured();
  useEffect(() => {
    if (new URLSearchParams(window.location.search).has("error"))
      setError(
        "O link expirou ou não pôde ser validado. Tente entrar novamente.",
      );
  }, []);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    const form = new FormData(event.currentTarget);
    try {
      const client = createClient();
      const email = String(form.get("email"));
      const password = String(form.get("password"));
      const result = signup
        ? await client.auth.signUp({
            email,
            password,
            options: {
              data: { full_name: String(form.get("name")) },
              emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || window.location.origin}/auth/callback`,
            },
          })
        : await client.auth.signInWithPassword({ email, password });
      if (result.error) {
        setError(
          signup
            ? "Não foi possível criar a conta. Confira os dados e tente novamente."
            : "Não foi possível entrar. Confira e-mail, senha e a confirmação do cadastro.",
        );
        return;
      }
      if (result.data.session) {
        router.replace("/");
        router.refresh();
      } else
        setMessage(
          "Confira seu e-mail para confirmar o cadastro e acessar o Cofre.",
        );
    } catch {
      setError(
        "Não foi possível conectar ao Supabase. Confira a configuração e sua conexão.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function google() {
    setBusy(true);
    setError("");
    try {
      const { error } = await createClient().auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
    } catch {
      setError(
        "Não foi possível entrar com Google. Verifique se o provedor está habilitado no Supabase.",
      );
      setBusy(false);
    }
  }
  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <section className="relative hidden flex-col justify-between overflow-hidden bg-ink p-14 text-white lg:flex">
        <div className="flex items-center gap-3 text-3xl font-bold">
          <Vault className="text-[#c9dda2]" size={36} />
          cofre.
        </div>
        <div className="relative z-10">
          <p className="mb-6 text-xs font-semibold uppercase tracking-[.25em] text-[#b9cfaa]">
            Menos ruído. Mais clareza.
          </p>
          <h1 className="max-w-lg text-6xl font-medium leading-[1.12] tracking-tight">
            Seu dia organizado.
            <br />
            <span className="text-[#c9dda2]">
              Suas ideias
              <br />
              conectadas.
            </span>
          </h1>
          <p className="mt-7 max-w-sm text-base leading-relaxed text-[#b6c7ba]">
            Um espaço para cuidar do presente e construir o que vem depois.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-[#b6c7ba]">
          <ShieldCheck size={16} />
          Pessoal, por natureza.
        </div>
        <Network
          size={420}
          strokeWidth={0.3}
          className="absolute -bottom-24 -right-28 rotate-12 text-[#bad58e]/15"
        />
      </section>
      <section className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm">
          <div className="mb-12 flex items-center gap-2 text-2xl font-bold lg:hidden">
            <Vault />
            cofre.
          </div>
          <p className="eyebrow mb-4">Seu segundo cérebro</p>
          <h2 className="text-3xl font-semibold tracking-tight">
            {signup ? "Comece seu Cofre" : "Bom ter você de volta"}
          </h2>
          <p className="mb-8 mt-3 text-sm text-muted">
            {signup
              ? "Dê um lugar para suas ideias e seus planos."
              : "Entre para continuar de onde parou."}
          </p>
          {!configured && (
            <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <strong>Configure seu Supabase</strong>
              <p className="mt-2">
                Copie <code>.env.example</code> para <code>.env.local</code>,
                preencha a URL e a chave pública e execute{" "}
                <code>supabase/schema.sql</code>. Reinicie o servidor.
              </p>
            </div>
          )}
          <form onSubmit={submit} className="space-y-4">
            {signup && (
              <Field label="Seu nome">
                <input
                  name="name"
                  className="field"
                  required
                  maxLength={100}
                  autoComplete="name"
                  placeholder="Como podemos chamar você?"
                />
              </Field>
            )}
            <Field label="E-mail">
              <input
                name="email"
                className="field"
                required
                type="email"
                autoComplete="email"
                placeholder="voce@exemplo.com"
              />
            </Field>
            <Field label="Senha">
              <input
                name="password"
                className="field"
                required
                type="password"
                minLength={signup ? 8 : 1}
                autoComplete={signup ? "new-password" : "current-password"}
                placeholder="Pelo menos 8 caracteres"
              />
            </Field>
            <Notice message={error} />
            <Notice message={message} success />
            <div className="[&>button]:w-full">
              <Submit busy={busy || !configured}>
                {signup ? "Criar minha conta" : "Entrar no Cofre"}
                <ArrowRight size={16} />
              </Submit>
            </div>
          </form>
          <div className="my-5 flex items-center gap-3 text-xs text-muted">
            <div className="h-px flex-1 bg-[#e0e6da]" />
            ou
            <div className="h-px flex-1 bg-[#e0e6da]" />
          </div>
          <button
            disabled={busy || !configured}
            onClick={google}
            className="btn-secondary w-full"
          >
            Continuar com Google
          </button>
          <p className="mt-7 text-center text-sm text-muted">
            {signup ? "Já tem uma conta?" : "Ainda não tem uma conta?"}{" "}
            <button
              className="font-semibold text-accent"
              onClick={() => {
                setSignup(!signup);
                setError("");
                setMessage("");
              }}
            >
              {signup ? "Entrar" : "Criar conta"}
            </button>
          </p>
        </div>
      </section>
    </main>
  );
}
