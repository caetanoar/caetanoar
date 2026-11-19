import { z } from "zod";
import { autenticar, erroApi, json } from "@/lib/api/http";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { dispararWebhooks } from "@/lib/webhooks/entregar";

const Lead = z.object({
  nome: z.string().trim().min(2).max(120),
  telefone: z.string().trim().min(10).max(20),
  email: z.email().max(200).optional(),
  mensagem: z.string().max(1000).optional(),
  veiculo_id: z.uuid().optional(),
  origem: z.enum(["site", "instagram", "marketplace", "olx", "indicacao", "whatsapp", "outro"]).optional(),
});

/** POST /api/v1/leads — cria o cliente (ou registra o contato se o telefone já existir). */
export async function POST(req: Request) {
  const auth = await autenticar(req, "leads:criar");
  if (!auth.ok) return auth.resposta;
  if (Number(req.headers.get("content-length") ?? 0) > 10_000) return erroApi(413, "muito_grande", "Corpo maior que 10 KB.");

  let corpo: unknown;
  try {
    corpo = await req.json();
  } catch {
    return erroApi(400, "json_invalido", "Envie um JSON válido.");
  }
  const lead = Lead.safeParse(corpo);
  if (!lead.success) {
    return erroApi(422, "dados_invalidos", lead.error.issues.map((i) => `${i.path.join(".") || "corpo"}: ${i.message}`).join("; "));
  }

  const { data, error } = await criarClienteAdmin().rpc("api_registrar_lead", { p_chave: auth.chave.nome, p_dados: lead.data });
  if (error) {
    return error.code === "22023" ? erroApi(422, "dados_invalidos", error.message) : erroApi(500, "erro_interno", "Não foi possível registrar o lead.");
  }
  dispararWebhooks();
  const r = data as { cliente_id: string; novo: boolean };
  return json({ dados: r }, r.novo ? 201 : 200);
}
