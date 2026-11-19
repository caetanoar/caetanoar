"use client";
import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";

let cliente: ReturnType<typeof createBrowserClient<Database>> | undefined;

/** Cliente Supabase no navegador (uploads diretos ao Storage, por exemplo). */
export function criarClienteNavegador() {
  cliente ??= createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  return cliente;
}
