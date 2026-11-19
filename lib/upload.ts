"use client";

import imageCompression from "browser-image-compression";
import { criarClienteNavegador } from "@/lib/supabase/client";

/** Reduz a foto no próprio celular antes de enviar (≈1600px, ≈500 KB). */
export async function comprimirFoto(arquivo: File): Promise<File> {
  if (!arquivo.type.startsWith("image/")) return arquivo;
  try {
    const comprimido = await imageCompression(arquivo, {
      maxSizeMB: 0.6,
      maxWidthOrHeight: 1600,
      useWebWorker: true,
      fileType: "image/jpeg",
      initialQuality: 0.82,
    });
    return new File([comprimido], arquivo.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return arquivo;
  }
}

function nomeSeguro(nome: string) {
  return nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .slice(-80);
}

/** Envia direto ao Supabase Storage com a sessão do usuário (a RLS confere a permissão). */
export async function enviarArquivo(bucket: string, pasta: string, arquivo: File) {
  const supabase = criarClienteNavegador();
  const path = `${pasta}/${crypto.randomUUID()}-${nomeSeguro(arquivo.name)}`;
  const { error } = await supabase.storage.from(bucket).upload(path, arquivo, {
    contentType: arquivo.type || "application/octet-stream",
    upsert: false,
    cacheControl: "31536000",
  });
  if (error) throw new Error(error.message.includes("row-level security") ? "Sem permissão para enviar arquivos." : error.message);
  return { path, nome: arquivo.name, mime: arquivo.type || null, tamanho: arquivo.size };
}
