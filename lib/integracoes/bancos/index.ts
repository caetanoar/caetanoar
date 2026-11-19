import "server-only";
import { agregadorDesligado, type AgregadorBancario } from "./agregador";
import { criarPluggy } from "./pluggy";

export function agregadorBancario(): AgregadorBancario {
  if (process.env.OPEN_FINANCE_PROVIDER === "pluggy") return criarPluggy(process.env.PLUGGY_CLIENT_ID, process.env.PLUGGY_CLIENT_SECRET);
  return agregadorDesligado();
}
