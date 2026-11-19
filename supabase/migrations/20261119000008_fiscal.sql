-- =============================================================================
-- Caetano Auto CRM — 0008 Fiscal
-- NF-e de entrada (importação de XML), NF-e de saída (via provedor fiscal
-- plugável) e histórico. Somente dono e gerente; configuração fiscal só o dono.
-- =============================================================================

create type public.tipo_documento_fiscal as enum ('nfe', 'nfse');
create type public.direcao_nota as enum ('entrada', 'saida');
create type public.origem_nota as enum ('xml_importado', 'emitida', 'manual');
create type public.status_nota as enum ('importada', 'rascunho', 'processando', 'autorizada', 'rejeitada', 'cancelada', 'denegada');

create table public.configuracoes_fiscais (
  id boolean primary key default true check (id),
  cnpj text check (cnpj is null or cnpj ~ '^\d{14}$'),
  inscricao_estadual text,
  inscricao_municipal text,
  razao_social text,
  nome_fantasia text,
  regime_tributario text check (regime_tributario in ('simples_nacional', 'simples_excesso', 'lucro_presumido', 'lucro_real', 'mei')),
  logradouro text,
  numero text,
  complemento text,
  bairro text,
  cep text check (cep is null or cep ~ '^\d{8}$'),
  municipio text not null default 'Divinópolis',
  codigo_municipio text not null default '3122306',
  uf text not null default 'MG',
  telefone text,
  email text,
  ambiente text not null default 'homologacao' check (ambiente in ('homologacao', 'producao')),
  serie_nfe integer not null default 1,
  ncm_veiculos text,
  natureza_venda text not null default 'Venda de veículo usado',
  cfop_venda_proprio text,
  cfop_venda_proprio_fora_uf text,
  cfop_venda_consignado text,
  cfop_entrada_compra text,
  cfop_entrada_consignacao text,
  cfop_devolucao_consignacao text,
  csosn_cst_padrao text,
  informacoes_complementares text,
  criado_em timestamptz not null default now(),
  criado_por uuid,
  atualizado_em timestamptz not null default now(),
  atualizado_por uuid
);
comment on table public.configuracoes_fiscais is 'Dados do emitente e padrões fiscais. CFOP/CST devem ser validados pelo contador.';
select public.preparar_tabela('public.configuracoes_fiscais');
insert into public.configuracoes_fiscais (id) values (true);
create policy config_fiscal_ver on public.configuracoes_fiscais for select to authenticated using ((select public.is_gestor()));
create policy config_fiscal_dono on public.configuracoes_fiscais for update to authenticated
  using ((select public.is_dono())) with check ((select public.is_dono()));

create table public.notas_fiscais (
  id uuid primary key default gen_random_uuid(),
  tipo_documento public.tipo_documento_fiscal not null default 'nfe',
  direcao public.direcao_nota not null,
  origem public.origem_nota not null,
  status public.status_nota not null,
  chave_acesso text unique check (chave_acesso is null or chave_acesso ~ '^\d{44}$'),
  numero text,
  serie text,
  modelo text,
  data_emissao timestamptz,
  natureza_operacao text,
  cfop text,
  valor_total numeric(14, 2) not null default 0 check (valor_total >= 0),
  valor_produtos numeric(14, 2),
  valor_icms numeric(14, 2),
  emitente_documento text,
  emitente_nome text,
  destinatario_documento text,
  destinatario_nome text,
  xml_arquivo_id uuid references public.arquivos (id) on delete set null,
  pdf_arquivo_id uuid references public.arquivos (id) on delete set null,
  pdf_url_externa text,
  veiculo_id uuid references public.veiculos (id) on delete set null,
  fornecedor_id uuid references public.fornecedores (id) on delete set null,
  cliente_id uuid references public.clientes (id) on delete set null,
  consignante_id uuid references public.consignantes (id) on delete set null,
  venda_id uuid references public.vendas (id) on delete set null,
  provedor text,
  provedor_ref text,
  protocolo text,
  motivo_status text,
  simulada boolean not null default false,
  dados jsonb,
  observacoes text,
  criado_em timestamptz not null default now(),
  criado_por uuid,
  atualizado_em timestamptz not null default now(),
  atualizado_por uuid
);
create index notas_data_idx on public.notas_fiscais (data_emissao desc);
create index notas_direcao_idx on public.notas_fiscais (direcao, status);
create index notas_venda_idx on public.notas_fiscais (venda_id);
create index notas_veiculo_idx on public.notas_fiscais (veiculo_id);
create index notas_fornecedor_idx on public.notas_fiscais (fornecedor_id);
select public.preparar_tabela('public.notas_fiscais');
create policy notas_gestor on public.notas_fiscais for all to authenticated
  using ((select public.is_gestor())) with check ((select public.is_gestor()));

create table public.notas_fiscais_itens (
  id uuid primary key default gen_random_uuid(),
  nota_id uuid not null references public.notas_fiscais (id) on delete cascade,
  numero_item integer not null,
  codigo text,
  descricao text not null,
  ncm text,
  cfop text,
  unidade text,
  quantidade numeric(14, 4),
  valor_unitario numeric(14, 4),
  valor_total numeric(14, 2),
  chassi text,
  dados_veiculo jsonb,
  criado_em timestamptz not null default now(),
  criado_por uuid,
  atualizado_em timestamptz not null default now(),
  atualizado_por uuid
);
create index notas_itens_nota_idx on public.notas_fiscais_itens (nota_id);
create index notas_itens_chassi_idx on public.notas_fiscais_itens (chassi);
select public.preparar_tabela('public.notas_fiscais_itens');
create policy notas_itens_gestor on public.notas_fiscais_itens for all to authenticated
  using ((select public.is_gestor())) with check ((select public.is_gestor()));

create table public.notas_fiscais_eventos (
  id bigint generated always as identity primary key,
  nota_id uuid not null references public.notas_fiscais (id) on delete cascade,
  tipo text not null check (tipo in ('importacao', 'envio', 'autorizacao', 'rejeicao', 'consulta', 'cancelamento', 'carta_correcao', 'erro')),
  protocolo text,
  mensagem text,
  payload jsonb,
  usuario_id uuid default auth.uid(),
  criado_em timestamptz not null default now()
);
create index notas_eventos_nota_idx on public.notas_fiscais_eventos (nota_id, criado_em desc);
alter table public.notas_fiscais_eventos enable row level security;
revoke all on public.notas_fiscais_eventos from anon;
create policy notas_eventos_ver on public.notas_fiscais_eventos for select to authenticated using ((select public.is_gestor()));
create policy notas_eventos_inserir on public.notas_fiscais_eventos for insert to authenticated with check ((select public.is_gestor()));

alter table public.lancamentos
  add constraint lancamentos_nota_fk foreign key (nota_fiscal_id) references public.notas_fiscais (id) on delete set null;

-- Arquivos fiscais (XML/PDF): leitura e envio só pela gestão (já coberto pela regra padrão).

create or replace view public.v_notas_fiscais with (security_invoker = true) as
select
  n.*,
  case when ve.id is not null then ve.marca || ' ' || ve.modelo || coalesce(' ' || ve.placa, '') end as veiculo_nome,
  f.nome as fornecedor_nome,
  c.nome as cliente_nome,
  vd.numero as venda_numero,
  (select count(*) from public.notas_fiscais_itens i where i.nota_id = n.id)::int as qtd_itens
from public.notas_fiscais n
left join public.veiculos ve on ve.id = n.veiculo_id
left join public.fornecedores f on f.id = n.fornecedor_id
left join public.clientes c on c.id = n.cliente_id
left join public.vendas vd on vd.id = n.venda_id
where public.is_gestor();
grant select on public.v_notas_fiscais to authenticated;

-- Vendas fechadas ainda sem NF-e de saída autorizada (para o relatório fiscal).
create or replace view public.v_vendas_sem_nota with (security_invoker = true) as
select vd.id, vd.numero, vd.data_venda, vd.valor_venda, vd.tipo_veiculo, vd.veiculo_id, vd.cliente_id
from public.vendas vd
where vd.status = 'fechada'
  and public.is_gestor()
  and not exists (
    select 1 from public.notas_fiscais n where n.venda_id = vd.id and n.direcao = 'saida' and n.status in ('autorizada', 'processando')
  );
grant select on public.v_vendas_sem_nota to authenticated;
