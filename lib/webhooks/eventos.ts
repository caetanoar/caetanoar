/** Eventos que podem ser assinados por webhook (mesma lista do banco). */
export const EVENTOS_WEBHOOK: Record<string, string> = {
  "venda.fechada": "Venda fechada",
  "venda.cancelada": "Venda cancelada",
  "venda.bloqueio_liberado": "Venda com impeditivo liberada pelo dono",
  "orcamento.aceito": "Orçamento aceito pelo cliente",
  "veiculo.criado": "Carro cadastrado",
  "veiculo.status_alterado": "Situação do carro alterada (ex.: disponível, vendido)",
  "veiculo.preco_alterado": "Preço anunciado alterado",
  "cliente.criado": "Novo cliente (lead)",
  "nota.autorizada": "NF-e autorizada",
};
