import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isConfigured } from "@/lib/supabase/config";
import { VaultProvider } from "@/components/vault-provider";
import { PomodoroProvider } from "@/components/pomodoro";
import { Sidebar } from "@/components/sidebar";
import { loadVault } from "@/lib/load-vault";
export const dynamic = "force-dynamic";
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!isConfigured()) redirect("/login");
  const client = await createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) redirect("/login");
  const initial = await loadVault(client, user.id);
  const { data: profile } = await client
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  const name =
    profile?.full_name ||
    user.user_metadata.full_name ||
    user.email?.split("@")[0] ||
    "Meu Cofre";
  return (
    <VaultProvider initial={initial} userId={user.id}>
      <PomodoroProvider>
        <Sidebar name={name} email={user.email || ""} />
        <main className="min-h-screen px-4 pb-12 pt-20 sm:px-8 lg:ml-64 lg:px-10 lg:pt-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-8 flex items-center justify-between border-b border-[#e4e9df] pb-5 text-xs text-muted">
              <span>
                Meu espaço <span className="mx-2 text-[#c3cdbb]">/</span> Cofre
                pessoal
              </span>
              <span className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                Seu espaço privado
              </span>
            </div>
            {children}
          </div>
        </main>
      </PomodoroProvider>
    </VaultProvider>
  );
}
