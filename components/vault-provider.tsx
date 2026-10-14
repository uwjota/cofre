"use client";
import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
} from "react";
import { createClient } from "@/lib/supabase/client";
import type { VaultData } from "@/lib/types";
import { loadVault } from "@/lib/load-vault";
import { errorMessage } from "@/lib/utils";
const Context = createContext<{
  data: VaultData;
  userId: string;
  refresh: () => Promise<void>;
} | null>(null);
export function VaultProvider({
  children,
  initial,
  userId,
}: {
  children: React.ReactNode;
  initial: VaultData;
  userId: string;
}) {
  const [data, setData] = useState(initial);
  const version = useRef(0);
  const refresh = useCallback(async () => {
    const current = ++version.current;
    const client = createClient();
    const next = await loadVault(client, userId);
    if (current === version.current) setData(next);
  }, [userId]);
  return (
    <Context.Provider value={{ data, userId, refresh }}>
      {children}
    </Context.Provider>
  );
}
export function useVault() {
  const value = useContext(Context);
  if (!value) throw new Error("VaultProvider ausente.");
  return value;
}
export function useMutation() {
  const { refresh } = useVault();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const locked = useRef(false);
  async function run(
    operation: () => PromiseLike<{ error: unknown }>,
    onSuccess?: () => void,
  ) {
    if (locked.current) return false;
    locked.current = true;
    setBusy(true);
    setError("");
    let committed = false;
    try {
      const result = await operation();
      if (result.error) throw result.error;
      committed = true;
      await refresh();
      onSuccess?.();
      return true;
    } catch (e) {
      setError(
        committed
          ? "Alteração salva, mas a atualização da tela falhou. Recarregue a página antes de tentar novamente."
          : errorMessage(e),
      );
      return false;
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  return { busy, error, run, setError };
}
