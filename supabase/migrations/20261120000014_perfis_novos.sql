-- =============================================================================
-- Caetano Auto CRM — 0014 Perfis novos e categorias de arquivo
-- Fica num arquivo próprio porque um valor novo de enum só pode ser usado
-- depois de gravado (as regras que usam estes valores estão na 0015).
-- =============================================================================

alter type public.papel_usuario add value if not exists 'atendimento';
alter type public.papel_usuario add value if not exists 'preparador';
alter type public.papel_usuario add value if not exists 'administrativo';

alter type public.categoria_arquivo add value if not exists 'termo_ciencia';
alter type public.categoria_arquivo add value if not exists 'baixa_gravame';
alter type public.categoria_arquivo add value if not exists 'atpv';
alter type public.categoria_arquivo add value if not exists 'vistoria';
alter type public.categoria_arquivo add value if not exists 'comprovante_debitos';
