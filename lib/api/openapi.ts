/** Documento OpenAPI 3.1 da API pública da Caetano Auto. */
export function documentoOpenApi(urlBase: string) {
  const erro = { $ref: "#/components/schemas/Erro" };
  const respostasErro = {
    "401": { description: "Sem chave, chave inválida, revogada ou expirada", content: { "application/json": { schema: erro } } },
    "403": { description: "A chave não tem o escopo necessário", content: { "application/json": { schema: erro } } },
  };
  return {
    openapi: "3.1.0",
    info: {
      title: "Caetano Auto CRM — API",
      version: "1.0.0",
      description:
        "API para integrar o site e outros sistemas ao CRM. Autentique com `Authorization: Bearer <chave>` (as chaves são criadas pelo dono em Configurações → Integrações, cada uma com seus escopos). Use a chave só no servidor, nunca no navegador.\n\n" +
        "Webhooks: o CRM envia POST JSON `{id, tipo, criado_em, dados}` com os cabeçalhos `X-Caetano-Evento`, `X-Caetano-Entrega` e `X-Caetano-Assinatura: t=<unix>,v1=<hex>`, onde v1 = HMAC-SHA256(segredo, `${t}.${corpo}`). Responda 2xx em até 10 s; falhas são reenviadas com espera crescente (até 8 tentativas). Eventos: venda.fechada, venda.cancelada, veiculo.criado, veiculo.status_alterado, veiculo.preco_alterado, cliente.criado, nota.autorizada.",
    },
    servers: [{ url: `${urlBase}/api/v1` }],
    security: [{ chave: [] }],
    components: {
      securitySchemes: { chave: { type: "http", scheme: "bearer", description: "Chave da API (ca_...)" } },
      schemas: {
        Erro: {
          type: "object",
          properties: { erro: { type: "object", properties: { codigo: { type: "string" }, mensagem: { type: "string" } }, required: ["codigo", "mensagem"] } },
        },
        Veiculo: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            marca: { type: "string" },
            modelo: { type: "string" },
            versao: { type: ["string", "null"] },
            motor: { type: ["string", "null"] },
            ano_fabricacao: { type: ["integer", "null"] },
            ano_modelo: { type: ["integer", "null"] },
            cor: { type: ["string", "null"] },
            km: { type: ["integer", "null"] },
            combustivel: { type: ["string", "null"], enum: ["flex", "gasolina", "etanol", "diesel", "gnv", "hibrido", "eletrico", null] },
            cambio: { type: ["string", "null"], enum: ["manual", "automatico", "cvt", "automatizado", null] },
            portas: { type: ["integer", "null"] },
            preco_anunciado: { type: ["number", "null"] },
            status: { type: "string", enum: ["disponivel", "reservado"] },
            data_entrada: { type: "string", format: "date" },
            laudo_cautelar: { type: ["string", "null"], enum: ["aprovado", "aprovado_apontamentos", "reprovado", null], description: "Resultado do laudo cautelar, se houver" },
            descricao: { type: ["string", "null"] },
            fotos: { type: "array", items: { type: "string", format: "uri" } },
            itens_confirmados: { type: "array", items: { type: "string" } },
          },
        },
        Lead: {
          type: "object",
          required: ["nome", "telefone"],
          properties: {
            nome: { type: "string", minLength: 2, maxLength: 120 },
            telefone: { type: "string", description: "Com DDD; aceita +55" },
            email: { type: "string", format: "email" },
            mensagem: { type: "string", maxLength: 1000 },
            veiculo_id: { type: "string", format: "uuid", description: "Carro de interesse" },
            origem: { type: "string", enum: ["site", "instagram", "marketplace", "olx", "indicacao", "whatsapp", "outro"], default: "site" },
          },
        },
        Venda: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            numero: { type: "string", example: "V-2026-0001" },
            data_venda: { type: "string", format: "date" },
            veiculo_id: { type: "string", format: "uuid" },
            veiculo_nome: { type: "string" },
            veiculo_ano: { type: ["integer", "null"] },
            tipo_veiculo: { type: "string", enum: ["proprio", "consignado"] },
            valor_venda: { type: "number" },
            formas: { type: ["string", "null"] },
            qtd_trocas: { type: "integer" },
          },
        },
      },
    },
    paths: {
      "/veiculos": {
        get: {
          summary: "Carros à venda",
          description: "Escopo: estoque:ler",
          parameters: [
            { name: "status", in: "query", schema: { type: "string", default: "disponivel" }, description: "disponivel, reservado ou os dois separados por vírgula" },
            { name: "limite", in: "query", schema: { type: "integer", minimum: 1, maximum: 100, default: 50 } },
            { name: "pagina", in: "query", schema: { type: "integer", minimum: 1, default: 1 } },
          ],
          responses: {
            "200": {
              description: "Lista paginada",
              content: { "application/json": { schema: { type: "object", properties: { dados: { type: "array", items: { $ref: "#/components/schemas/Veiculo" } }, pagina: { type: "integer" }, limite: { type: "integer" }, total: { type: "integer" } } } } },
            },
            ...respostasErro,
          },
        },
      },
      "/veiculos/{id}": {
        get: {
          summary: "Um carro à venda",
          description: "Escopo: estoque:ler",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
          responses: {
            "200": { description: "Carro", content: { "application/json": { schema: { type: "object", properties: { dados: { $ref: "#/components/schemas/Veiculo" } } } } } },
            "404": { description: "Não encontrado ou não está à venda", content: { "application/json": { schema: erro } } },
            ...respostasErro,
          },
        },
      },
      "/leads": {
        post: {
          summary: "Enviar um lead",
          description: "Escopo: leads:criar. Se o telefone já for de um cliente, registra o contato nele em vez de duplicar.",
          requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/Lead" } } } },
          responses: {
            "201": { description: "Cliente criado", content: { "application/json": { schema: { type: "object", properties: { dados: { type: "object", properties: { cliente_id: { type: "string" }, novo: { type: "boolean" } } } } } } } },
            "200": { description: "Telefone já cadastrado: contato registrado no cliente existente" },
            "422": { description: "Dados inválidos", content: { "application/json": { schema: erro } } },
            ...respostasErro,
          },
        },
      },
      "/vendas": {
        get: {
          summary: "Vendas fechadas no período",
          description: "Escopo: vendas:ler. Sem dados do cliente, lucro ou comissão.",
          parameters: [
            { name: "de", in: "query", schema: { type: "string", format: "date" } },
            { name: "ate", in: "query", schema: { type: "string", format: "date" } },
          ],
          responses: {
            "200": { description: "Vendas", content: { "application/json": { schema: { type: "object", properties: { dados: { type: "array", items: { $ref: "#/components/schemas/Venda" } } } } } } },
            ...respostasErro,
          },
        },
      },
    },
  };
}
