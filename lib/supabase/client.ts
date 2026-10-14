"use client";
import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/types";
import { getConfig } from "./config";
export function createClient() {
  const { url, key } = getConfig();
  return createBrowserClient<Database>(url, key);
}
