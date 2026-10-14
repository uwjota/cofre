import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, VaultData } from "./types";
const tables = [
  "tasks",
  "finances",
  "projects",
  "notes",
  "note_links",
  "pomodoro_sessions",
] as const;
// Pagina explicitamente para não truncar totais no limite padrão do PostgREST.
export async function loadVault(
  client: SupabaseClient<Database>,
  userId: string,
): Promise<VaultData> {
  const entries = await Promise.all(
    tables.map(async (table) => {
      const rows: unknown[] = [];
      const size = 500;
      for (let from = 0; ; from += size) {
        const { data, error } = await client
          .from(table)
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .order("id")
          .range(from, from + size - 1);
        if (error) throw error;
        rows.push(...data);
        if (data.length < size) break;
      }
      return [table, rows];
    }),
  );
  return Object.fromEntries(entries) as VaultData;
}
