
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "acessos_dados_pessoais": {
                  Row: {
                    "acessado_em": string,"campo": string,"id": number,"motivo": string | null,"registro_id": string,"tabela": string,"usuario_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "acessado_em"?: string,"campo": string,"id"?: never,"motivo"?: string | null,"registro_id": string,"tabela": string,"usuario_id"?: string
                  }
                  Update: {
                    "acessado_em"?: string,"campo"?: string,"id"?: never,"motivo"?: string | null,"registro_id"?: string,"tabela"?: string,"usuario_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"arquivos": {
                  Row: {
                    "atualizado_em": string,"atualizado_por": string | null,"bucket": string,"capa": boolean,"categoria": Database["public"]['Enums']["categoria_arquivo"],"criado_em": string,"criado_por": string | null,"entidade": Database["public"]['Enums']["entidade_arquivo"],"entidade_id": string,"id": string,"mime": string | null,"nome": string,"ordem": number,"path": string,"sigiloso": boolean,"tamanho": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "atualizado_em"?: string,"atualizado_por"?: string | null,"bucket": string,"capa"?: boolean,"categoria"?: Database["public"]['Enums']["categoria_arquivo"],"criado_em"?: string,"criado_por"?: string | null,"entidade": Database["public"]['Enums']["entidade_arquivo"],"entidade_id": string,"id"?: string,"mime"?: string | null,"nome": string,"ordem"?: number,"path": string,"sigiloso"?: boolean,"tamanho"?: number | null
                  }
                  Update: {
                    "atualizado_em"?: string,"atualizado_por"?: string | null,"bucket"?: string,"capa"?: boolean,"categoria"?: Database["public"]['Enums']["categoria_arquivo"],"criado_em"?: string,"criado_por"?: string | null,"entidade"?: Database["public"]['Enums']["entidade_arquivo"],"entidade_id"?: string,"id"?: string,"mime"?: string | null,"nome"?: string,"ordem"?: number,"path"?: string,"sigiloso"?: boolean,"tamanho"?: number | null
                  }
                  Relationships: [
                    
                  ]
                },"auditoria": {
                  Row: {
                    "acao": string,"antes": Json | null,"ator": string | null,"campos_alterados": (string)[] | null,"criado_em": string,"depois": Json | null,"id": number,"registro_id": string | null,"tabela": string,"usuario_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "acao": string,"antes"?: Json | null,"ator"?: string | null,"campos_alterados"?: (string)[] | null,"criado_em"?: string,"depois"?: Json | null,"id"?: never,"registro_id"?: string | null,"tabela": string,"usuario_id"?: string | null
                  }
                  Update: {
                    "acao"?: string,"antes"?: Json | null,"ator"?: string | null,"campos_alterados"?: (string)[] | null,"criado_em"?: string,"depois"?: Json | null,"id"?: never,"registro_id"?: string | null,"tabela"?: string,"usuario_id"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"clientes": {
                  Row: {
                    "aceita_marketing": boolean,"anonimizado_em": string | null,"atualizado_em": string,"atualizado_por": string | null,"cidade": string | null,"criado_em": string,"criado_por": string | null,"email": string | null,"etapa": Database["public"]['Enums']["etapa_funil"],"id": string,"motivo_perda": Database["public"]['Enums']["motivo_perda"] | null,"motivo_perda_detalhe": string | null,"nome": string,"observacoes": string | null,"origem": Database["public"]['Enums']["origem_lead"],"parceiro_id": string | null,"proximo_contato_em": string | null,"telefone": string | null,"uf": string | null,"ultimo_contato_em": string | null,"vendedor_id": string | null,"whatsapp": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "aceita_marketing"?: boolean,"anonimizado_em"?: string | null,"atualizado_em"?: string,"atualizado_por"?: string | null,"cidade"?: string | null,"criado_em"?: string,"criado_por"?: string | null,"email"?: string | null,"etapa"?: Database["public"]['Enums']["etapa_funil"],"id"?: string,"motivo_perda"?: Database["public"]['Enums']["motivo_perda"] | null,"motivo_perda_detalhe"?: string | null,"nome": string,"observacoes"?: string | null,"origem"?: Database["public"]['Enums']["origem_lead"],"parceiro_id"?: string | null,"proximo_contato_em"?: string | null,"telefone"?: string | null,"uf"?: string | null,"ultimo_contato_em"?: string | null,"vendedor_id"?: string | null,"whatsapp"?: string | null
                  }
                  Update: {
                    "aceita_marketing"?: boolean,"anonimizado_em"?: string | null,"atualizado_em"?: string,"atualizado_por"?: string | null,"cidade"?: string | null,"criado_em"?: string,"criado_por"?: string | null,"email"?: string | null,"etapa"?: Database["public"]['Enums']["etapa_funil"],"id"?: string,"motivo_perda"?: Database["public"]['Enums']["motivo_perda"] | null,"motivo_perda_detalhe"?: string | null,"nome"?: string,"observacoes"?: string | null,"origem"?: Database["public"]['Enums']["origem_lead"],"parceiro_id"?: string | null,"proximo_contato_em"?: string | null,"telefone"?: string | null,"uf"?: string | null,"ultimo_contato_em"?: string | null,"vendedor_id"?: string | null,"whatsapp"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "clientes_parceiro_id_fkey"
      columns: ["parceiro_id"]
isOneToOne: false
      referencedRelation: "parceiros"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "clientes_vendedor_id_fkey"
      columns: ["vendedor_id"]
isOneToOne: false
      referencedRelation: "usuarios"
      referencedColumns: ["id"]
    }
                  ]
                },"clientes_contatos": {
                  Row: {
                    "atualizado_em": string,"atualizado_por": string | null,"canal": Database["public"]['Enums']["canal_contato"],"cliente_id": string,"criado_em": string,"criado_por": string | null,"data_hora": string,"id": string,"proximo_contato_em": string | null,"proximo_passo": string | null,"resumo": string,"usuario_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "atualizado_em"?: string,"atualizado_por"?: string | null,"canal"?: Database["public"]['Enums']["canal_contato"],"cliente_id": string,"criado_em"?: string,"criado_por"?: string | null,"data_hora"?: string,"id"?: string,"proximo_contato_em"?: string | null,"proximo_passo"?: string | null,"resumo": string,"usuario_id"?: string | null
                  }
                  Update: {
                    "atualizado_em"?: string,"atualizado_por"?: string | null,"canal"?: Database["public"]['Enums']["canal_contato"],"cliente_id"?: string,"criado_em"?: string,"criado_por"?: string | null,"data_hora"?: string,"id"?: string,"proximo_contato_em"?: string | null,"proximo_passo"?: string | null,"resumo"?: string,"usuario_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "clientes_contatos_cliente_id_fkey"
      columns: ["cliente_id"]
isOneToOne: false
      referencedRelation: "clientes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "clientes_contatos_cliente_id_fkey"
      columns: ["cliente_id"]
isOneToOne: false
      referencedRelation: "v_clientes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "clientes_contatos_usuario_id_fkey"
      columns: ["usuario_id"]
isOneToOne: false
      referencedRelation: "usuarios"
      referencedColumns: ["id"]
    }
                  ]
                },"clientes_dados_pessoais": {
                  Row: {
                    "atualizado_em": string,"atualizado_por": string | null,"bairro": string | null,"cep": string | null,"cidade": string | null,"cliente_id": string,"complemento": string | null,"cpf": string | null,"cpf_mascarado": string | null,"criado_em": string,"criado_por": string | null,"data_nascimento": string | null,"logradouro": string | null,"numero": string | null,"rg": string | null,"uf": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "atualizado_em"?: string,"atualizado_por"?: string | null,"bairro"?: string | null,"cep"?: string | null,"cidade"?: string | null,"cliente_id": string,"complemento"?: string | null,"cpf"?: string | null,"cpf_mascarado"?: never,"criado_em"?: string,"criado_por"?: string | null,"data_nascimento"?: string | null,"logradouro"?: string | null,"numero"?: string | null,"rg"?: string | null,"uf"?: string | null
                  }
                  Update: {
                    "atualizado_em"?: string,"atualizado_por"?: string | null,"bairro"?: string | null,"cep"?: string | null,"cidade"?: string | null,"cliente_id"?: string,"complemento"?: string | null,"cpf"?: string | null,"cpf_mascarado"?: never,"criado_em"?: string,"criado_por"?: string | null,"data_nascimento"?: string | null,"logradouro"?: string | null,"numero"?: string | null,"rg"?: string | null,"uf"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "clientes_dados_pessoais_cliente_id_fkey"
      columns: ["cliente_id"]
isOneToOne: true
      referencedRelation: "clientes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "clientes_dados_pessoais_cliente_id_fkey"
      columns: ["cliente_id"]
isOneToOne: true
      referencedRelation: "v_clientes"
      referencedColumns: ["id"]
    }
                  ]
                },"clientes_interesses": {
                  Row: {
                    "ativo": boolean,"atualizado_em": string,"atualizado_por": string | null,"cliente_id": string,"criado_em": string,"criado_por": string | null,"descricao": string | null,"id": string,"preco_max": number | null,"veiculo_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "ativo"?: boolean,"atualizado_em"?: string,"atualizado_por"?: string | null,"cliente_id": string,"criado_em"?: string,"criado_por"?: string | null,"descricao"?: string | null,"id"?: string,"preco_max"?: number | null,"veiculo_id"?: string | null
                  }
                  Update: {
                    "ativo"?: boolean,"atualizado_em"?: string,"atualizado_por"?: string | null,"cliente_id"?: string,"criado_em"?: string,"criado_por"?: string | null,"descricao"?: string | null,"id"?: string,"preco_max"?: number | null,"veiculo_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "clientes_interesses_cliente_id_fkey"
      columns: ["cliente_id"]
isOneToOne: false
      referencedRelation: "clientes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "clientes_interesses_cliente_id_fkey"
      columns: ["cliente_id"]
isOneToOne: false
      referencedRelation: "v_clientes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "clientes_interesses_veiculo_id_fkey"
      columns: ["veiculo_id"]
isOneToOne: false
      referencedRelation: "v_veiculos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "clientes_interesses_veiculo_id_fkey"
      columns: ["veiculo_id"]
isOneToOne: false
      referencedRelation: "v_veiculos_gestao"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "clientes_interesses_veiculo_id_fkey"
      columns: ["veiculo_id"]
isOneToOne: false
      referencedRelation: "veiculos"
      referencedColumns: ["id"]
    }
                  ]
                },"configuracoes": {
                  Row: {
                    "alerta_contas_dias": number,"alerta_garantia_dias": number,"assinatura": string,"atualizado_em": string,"atualizado_por": string | null,"cidade": string,"criado_em": string,"criado_por": string | null,"estoque_parado_dias": number,"garantia_cobertura_padrao": string | null,"garantia_dias_padrao": number,"id": boolean,"nome_loja": string,"recebimento_consignado_padrao": string,"regiao_anuncio": string,"telefones_assinatura": string,"uf": string,"whatsapp_numero": string
                  }
                  ComputedFields: never
                  Insert: {
                    "alerta_contas_dias"?: number,"alerta_garantia_dias"?: number,"assinatura"?: string,"atualizado_em"?: string,"atualizado_por"?: string | null,"cidade"?: string,"criado_em"?: string,"criado_por"?: string | null,"estoque_parado_dias"?: number,"garantia_cobertura_padrao"?: string | null,"garantia_dias_padrao"?: number,"id"?: boolean,"nome_loja"?: string,"recebimento_consignado_padrao"?: string,"regiao_anuncio"?: string,"telefones_assinatura"?: string,"uf"?: string,"whatsapp_numero"?: string
                  }
                  Update: {
                    "alerta_contas_dias"?: number,"alerta_garantia_dias"?: number,"assinatura"?: string,"atualizado_em"?: string,"atualizado_por"?: string | null,"cidade"?: string,"criado_em"?: string,"criado_por"?: string | null,"estoque_parado_dias"?: number,"garantia_cobertura_padrao"?: string | null,"garantia_dias_padrao"?: number,"id"?: boolean,"nome_loja"?: string,"recebimento_consignado_padrao"?: string,"regiao_anuncio"?: string,"telefones_assinatura"?: string,"uf"?: string,"whatsapp_numero"?: string
                  }
                  Relationships: [
                    
                  ]
                },"consignacoes": {
                  Row: {
                    "atualizado_em": string,"atualizado_por": string | null,"consignante_id": string,"contrato_arquivo_id": string | null,"criado_em": string,"criado_por": string | null,"data_devolucao": string | null,"data_fim": string | null,"data_inicio": string,"id": string,"motivo_devolucao": string | null,"observacoes": string | null,"recebimento_padrao": Database["public"]['Enums']["recebimento_consignado"] | null,"regra_comissao_id": string | null,"status": Database["public"]['Enums']["status_consignacao"],"valor_minimo_dono": number | null,"veiculo_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "atualizado_em"?: string,"atualizado_por"?: string | null,"consignante_id": string,"contrato_arquivo_id"?: string | null,"criado_em"?: string,"criado_por"?: string | null,"data_devolucao"?: string | null,"data_fim"?: string | null,"data_inicio"?: string,"id"?: string,"motivo_devolucao"?: string | null,"observacoes"?: string | null,"recebimento_padrao"?: Database["public"]['Enums']["recebimento_consignado"] | null,"regra_comissao_id"?: string | null,"status"?: Database["public"]['Enums']["status_consignacao"],"valor_minimo_dono"?: number | null,"veiculo_id": string
                  }
                  Update: {
                    "atualizado_em"?: string,"atualizado_por"?: string | null,"consignante_id"?: string,"contrato_arquivo_id"?: string | null,"criado_em"?: string,"criado_por"?: string | null,"data_devolucao"?: string | null,"data_fim"?: string | null,"data_inicio"?: string,"id"?: string,"motivo_devolucao"?: string | null,"observacoes"?: string | null,"recebimento_padrao"?: Database["public"]['Enums']["recebimento_consignado"] | null,"regra_comissao_id"?: string | null,"status"?: Database["public"]['Enums']["status_consignacao"],"valor_minimo_dono"?: number | null,"veiculo_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "consignacoes_consignante_id_fkey"
      columns: ["consignante_id"]
isOneToOne: false
      referencedRelation: "consignantes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "consignacoes_contrato_arquivo_id_fkey"
      columns: ["contrato_arquivo_id"]
isOneToOne: false
      referencedRelation: "arquivos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "consignacoes_veiculo_id_fkey"
      columns: ["veiculo_id"]
isOneToOne: false
      referencedRelation: "v_veiculos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "consignacoes_veiculo_id_fkey"
      columns: ["veiculo_id"]
isOneToOne: false
      referencedRelation: "v_veiculos_gestao"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "consignacoes_veiculo_id_fkey"
      columns: ["veiculo_id"]
isOneToOne: false
      referencedRelation: "veiculos"
      referencedColumns: ["id"]
    }
                  ]
                },"consignantes": {
                  Row: {
                    "ativo": boolean,"atualizado_em": string,"atualizado_por": string | null,"chave_pix": string | null,"cidade": string | null,"criado_em": string,"criado_por": string | null,"dados_bancarios": string | null,"documento": string | null,"email": string | null,"endereco": string | null,"id": string,"nome": string,"observacoes": string | null,"telefone": string | null,"uf": string | null,"whatsapp": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "ativo"?: boolean,"atualizado_em"?: string,"atualizado_por"?: string | null,"chave_pix"?: string | null,"cidade"?: string | null,"criado_em"?: string,"criado_por"?: string | null,"dados_bancarios"?: string | null,"documento"?: string | null,"email"?: string | null,"endereco"?: string | null,"id"?: string,"nome": string,"observacoes"?: string | null,"telefone"?: string | null,"uf"?: string | null,"whatsapp"?: string | null
                  }
                  Update: {
                    "ativo"?: boolean,"atualizado_em"?: string,"atualizado_por"?: string | null,"chave_pix"?: string | null,"cidade"?: string | null,"criado_em"?: string,"criado_por"?: string | null,"dados_bancarios"?: string | null,"documento"?: string | null,"email"?: string | null,"endereco"?: string | null,"id"?: string,"nome"?: string,"observacoes"?: string | null,"telefone"?: string | null,"uf"?: string | null,"whatsapp"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"custos_veiculo": {
                  Row: {
                    "atualizado_em": string,"atualizado_por": string | null,"cobrar_do_consignante": boolean,"criado_em": string,"criado_por": string | null,"data": string,"descricao": string | null,"fornecedor_id": string | null,"id": string,"observacoes": string | null,"tipo": Database["public"]['Enums']["tipo_custo"],"valor": number,"veiculo_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "atualizado_em"?: string,"atualizado_por"?: string | null,"cobrar_do_consignante"?: boolean,"criado_em"?: string,"criado_por"?: string | null,"data"?: string,"descricao"?: string | null,"fornecedor_id"?: string | null,"id"?: string,"observacoes"?: string | null,"tipo": Database["public"]['Enums']["tipo_custo"],"valor": number,"veiculo_id": string
                  }
                  Update: {
                    "atualizado_em"?: string,"atualizado_por"?: string | null,"cobrar_do_consignante"?: boolean,"criado_em"?: string,"criado_por"?: string | null,"data"?: string,"descricao"?: string | null,"fornecedor_id"?: string | null,"id"?: string,"observacoes"?: string | null,"tipo"?: Database["public"]['Enums']["tipo_custo"],"valor"?: number,"veiculo_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "custos_veiculo_fornecedor_id_fkey"
      columns: ["fornecedor_id"]
isOneToOne: false
      referencedRelation: "fornecedores"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "custos_veiculo_veiculo_id_fkey"
      columns: ["veiculo_id"]
isOneToOne: false
      referencedRelation: "v_veiculos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "custos_veiculo_veiculo_id_fkey"
      columns: ["veiculo_id"]
isOneToOne: false
      referencedRelation: "v_veiculos_gestao"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "custos_veiculo_veiculo_id_fkey"
      columns: ["veiculo_id"]
isOneToOne: false
      referencedRelation: "veiculos"
      referencedColumns: ["id"]
    }
                  ]
                },"fipe_cache": {
                  Row: {
                    "ano_modelo": number,"codigo_fipe": string,"combustivel": string,"consultado_em": string,"marca": string,"mes_referencia": string | null,"modelo": string,"valor": number
                  }
                  ComputedFields: never
                  Insert: {
                    "ano_modelo": number,"codigo_fipe": string,"combustivel"?: string,"consultado_em"?: string,"marca": string,"mes_referencia"?: string | null,"modelo": string,"valor": number
                  }
                  Update: {
                    "ano_modelo"?: number,"codigo_fipe"?: string,"combustivel"?: string,"consultado_em"?: string,"marca"?: string,"mes_referencia"?: string | null,"modelo"?: string,"valor"?: number
                  }
                  Relationships: [
                    
                  ]
                },"fornecedores": {
                  Row: {
                    "ativo": boolean,"atualizado_em": string,"atualizado_por": string | null,"chave_pix": string | null,"cidade": string | null,"contato_nome": string | null,"criado_em": string,"criado_por": string | null,"dados_bancarios": string | null,"documento": string | null,"email": string | null,"id": string,"nome": string,"observacoes": string | null,"razao_social": string | null,"telefone": string | null,"tipo": Database["public"]['Enums']["tipo_fornecedor"],"tipo_pessoa": string | null,"uf": string | null,"whatsapp": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "ativo"?: boolean,"atualizado_em"?: string,"atualizado_por"?: string | null,"chave_pix"?: string | null,"cidade"?: string | null,"contato_nome"?: string | null,"criado_em"?: string,"criado_por"?: string | null,"dados_bancarios"?: string | null,"documento"?: string | null,"email"?: string | null,"id"?: string,"nome": string,"observacoes"?: string | null,"razao_social"?: string | null,"telefone"?: string | null,"tipo": Database["public"]['Enums']["tipo_fornecedor"],"tipo_pessoa"?: never,"uf"?: string | null,"whatsapp"?: string | null
                  }
                  Update: {
                    "ativo"?: boolean,"atualizado_em"?: string,"atualizado_por"?: string | null,"chave_pix"?: string | null,"cidade"?: string | null,"contato_nome"?: string | null,"criado_em"?: string,"criado_por"?: string | null,"dados_bancarios"?: string | null,"documento"?: string | null,"email"?: string | null,"id"?: string,"nome"?: string,"observacoes"?: string | null,"razao_social"?: string | null,"telefone"?: string | null,"tipo"?: Database["public"]['Enums']["tipo_fornecedor"],"tipo_pessoa"?: never,"uf"?: string | null,"whatsapp"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"itens_catalogo": {
                  Row: {
                    "atualizado_em": string,"atualizado_por": string | null,"categoria": string,"criado_em": string,"criado_por": string | null,"id": string,"item": string,"ordem": number
                  }
                  ComputedFields: never
                  Insert: {
                    "atualizado_em"?: string,"atualizado_por"?: string | null,"categoria"?: string,"criado_em"?: string,"criado_por"?: string | null,"id"?: string,"item": string,"ordem"?: number
                  }
                  Update: {
                    "atualizado_em"?: string,"atualizado_por"?: string | null,"categoria"?: string,"criado_em"?: string,"criado_por"?: string | null,"id"?: string,"item"?: string,"ordem"?: number
                  }
                  Relationships: [
                    
                  ]
                },"parceiros": {
                  Row: {
                    "ativo": boolean,"atualizado_em": string,"atualizado_por": string | null,"chave_pix": string | null,"cidade": string | null,"criado_em": string,"criado_por": string | null,"documento": string | null,"email": string | null,"id": string,"nome": string,"observacoes": string | null,"telefone": string | null,"tipo": Database["public"]['Enums']["tipo_parceiro"],"whatsapp": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "ativo"?: boolean,"atualizado_em"?: string,"atualizado_por"?: string | null,"chave_pix"?: string | null,"cidade"?: string | null,"criado_em"?: string,"criado_por"?: string | null,"documento"?: string | null,"email"?: string | null,"id"?: string,"nome": string,"observacoes"?: string | null,"telefone"?: string | null,"tipo"?: Database["public"]['Enums']["tipo_parceiro"],"whatsapp"?: string | null
                  }
                  Update: {
                    "ativo"?: boolean,"atualizado_em"?: string,"atualizado_por"?: string | null,"chave_pix"?: string | null,"cidade"?: string | null,"criado_em"?: string,"criado_por"?: string | null,"documento"?: string | null,"email"?: string | null,"id"?: string,"nome"?: string,"observacoes"?: string | null,"telefone"?: string | null,"tipo"?: Database["public"]['Enums']["tipo_parceiro"],"whatsapp"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"usuarios": {
                  Row: {
                    "ativo": boolean,"atualizado_em": string,"atualizado_por": string | null,"criado_em": string,"criado_por": string | null,"email": string,"id": string,"nome": string,"papel": Database["public"]['Enums']["papel_usuario"],"telefone": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "ativo"?: boolean,"atualizado_em"?: string,"atualizado_por"?: string | null,"criado_em"?: string,"criado_por"?: string | null,"email": string,"id": string,"nome": string,"papel"?: Database["public"]['Enums']["papel_usuario"],"telefone"?: string | null
                  }
                  Update: {
                    "ativo"?: boolean,"atualizado_em"?: string,"atualizado_por"?: string | null,"criado_em"?: string,"criado_por"?: string | null,"email"?: string,"id"?: string,"nome"?: string,"papel"?: Database["public"]['Enums']["papel_usuario"],"telefone"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"veiculo_historico": {
                  Row: {
                    "arquivo_id": string | null,"atualizado_em": string,"atualizado_por": string | null,"comprovado": boolean,"criado_em": string,"criado_por": string | null,"data": string,"descricao": string,"id": string,"tipo": Database["public"]['Enums']["tipo_historico"],"veiculo_id": string,"visivel_anuncio": boolean
                  }
                  ComputedFields: never
                  Insert: {
                    "arquivo_id"?: string | null,"atualizado_em"?: string,"atualizado_por"?: string | null,"comprovado"?: boolean,"criado_em"?: string,"criado_por"?: string | null,"data"?: string,"descricao": string,"id"?: string,"tipo"?: Database["public"]['Enums']["tipo_historico"],"veiculo_id": string,"visivel_anuncio"?: boolean
                  }
                  Update: {
                    "arquivo_id"?: string | null,"atualizado_em"?: string,"atualizado_por"?: string | null,"comprovado"?: boolean,"criado_em"?: string,"criado_por"?: string | null,"data"?: string,"descricao"?: string,"id"?: string,"tipo"?: Database["public"]['Enums']["tipo_historico"],"veiculo_id"?: string,"visivel_anuncio"?: boolean
                  }
                  Relationships: [
                    {
      foreignKeyName: "veiculo_historico_arquivo_id_fkey"
      columns: ["arquivo_id"]
isOneToOne: false
      referencedRelation: "arquivos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "veiculo_historico_veiculo_id_fkey"
      columns: ["veiculo_id"]
isOneToOne: false
      referencedRelation: "v_veiculos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "veiculo_historico_veiculo_id_fkey"
      columns: ["veiculo_id"]
isOneToOne: false
      referencedRelation: "v_veiculos_gestao"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "veiculo_historico_veiculo_id_fkey"
      columns: ["veiculo_id"]
isOneToOne: false
      referencedRelation: "veiculos"
      referencedColumns: ["id"]
    }
                  ]
                },"veiculo_itens": {
                  Row: {
                    "atualizado_em": string,"atualizado_por": string | null,"categoria": string | null,"confirmado": boolean,"criado_em": string,"criado_por": string | null,"fonte": string | null,"id": string,"item": string,"ordem": number,"veiculo_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "atualizado_em"?: string,"atualizado_por"?: string | null,"categoria"?: string | null,"confirmado"?: boolean,"criado_em"?: string,"criado_por"?: string | null,"fonte"?: string | null,"id"?: string,"item": string,"ordem"?: number,"veiculo_id": string
                  }
                  Update: {
                    "atualizado_em"?: string,"atualizado_por"?: string | null,"categoria"?: string | null,"confirmado"?: boolean,"criado_em"?: string,"criado_por"?: string | null,"fonte"?: string | null,"id"?: string,"item"?: string,"ordem"?: number,"veiculo_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "veiculo_itens_veiculo_id_fkey"
      columns: ["veiculo_id"]
isOneToOne: false
      referencedRelation: "v_veiculos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "veiculo_itens_veiculo_id_fkey"
      columns: ["veiculo_id"]
isOneToOne: false
      referencedRelation: "v_veiculos_gestao"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "veiculo_itens_veiculo_id_fkey"
      columns: ["veiculo_id"]
isOneToOne: false
      referencedRelation: "veiculos"
      referencedColumns: ["id"]
    }
                  ]
                },"veiculos": {
                  Row: {
                    "ano_fabricacao": number | null,"ano_modelo": number | null,"atualizado_em": string,"atualizado_por": string | null,"cambio": Database["public"]['Enums']["cambio"] | null,"chassi": string | null,"codigo_fipe": string | null,"combustivel": Database["public"]['Enums']["combustivel"] | null,"cor": string | null,"criado_em": string,"criado_por": string | null,"data_entrada": string,"data_saida": string | null,"descricao": string | null,"fipe_referencia": string | null,"id": string,"km": number | null,"laudo_cautelar": boolean,"laudo_resultado": Database["public"]['Enums']["resultado_laudo"] | null,"marca": string,"modelo": string,"motor": string | null,"observacoes": string | null,"origem": Database["public"]['Enums']["origem_veiculo"],"placa": string | null,"portas": number | null,"preco_anunciado": number | null,"preco_negociavel": number | null,"renavam": string | null,"reservado_ate": string | null,"reservado_para_cliente_id": string | null,"status": Database["public"]['Enums']["status_veiculo"],"tipo": Database["public"]['Enums']["tipo_veiculo"],"valor_fipe": number | null,"versao": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "ano_fabricacao"?: number | null,"ano_modelo"?: number | null,"atualizado_em"?: string,"atualizado_por"?: string | null,"cambio"?: Database["public"]['Enums']["cambio"] | null,"chassi"?: string | null,"codigo_fipe"?: string | null,"combustivel"?: Database["public"]['Enums']["combustivel"] | null,"cor"?: string | null,"criado_em"?: string,"criado_por"?: string | null,"data_entrada"?: string,"data_saida"?: string | null,"descricao"?: string | null,"fipe_referencia"?: string | null,"id"?: string,"km"?: number | null,"laudo_cautelar"?: boolean,"laudo_resultado"?: Database["public"]['Enums']["resultado_laudo"] | null,"marca": string,"modelo": string,"motor"?: string | null,"observacoes"?: string | null,"origem"?: Database["public"]['Enums']["origem_veiculo"],"placa"?: string | null,"portas"?: number | null,"preco_anunciado"?: number | null,"preco_negociavel"?: number | null,"renavam"?: string | null,"reservado_ate"?: string | null,"reservado_para_cliente_id"?: string | null,"status"?: Database["public"]['Enums']["status_veiculo"],"tipo": Database["public"]['Enums']["tipo_veiculo"],"valor_fipe"?: number | null,"versao"?: string | null
                  }
                  Update: {
                    "ano_fabricacao"?: number | null,"ano_modelo"?: number | null,"atualizado_em"?: string,"atualizado_por"?: string | null,"cambio"?: Database["public"]['Enums']["cambio"] | null,"chassi"?: string | null,"codigo_fipe"?: string | null,"combustivel"?: Database["public"]['Enums']["combustivel"] | null,"cor"?: string | null,"criado_em"?: string,"criado_por"?: string | null,"data_entrada"?: string,"data_saida"?: string | null,"descricao"?: string | null,"fipe_referencia"?: string | null,"id"?: string,"km"?: number | null,"laudo_cautelar"?: boolean,"laudo_resultado"?: Database["public"]['Enums']["resultado_laudo"] | null,"marca"?: string,"modelo"?: string,"motor"?: string | null,"observacoes"?: string | null,"origem"?: Database["public"]['Enums']["origem_veiculo"],"placa"?: string | null,"portas"?: number | null,"preco_anunciado"?: number | null,"preco_negociavel"?: number | null,"renavam"?: string | null,"reservado_ate"?: string | null,"reservado_para_cliente_id"?: string | null,"status"?: Database["public"]['Enums']["status_veiculo"],"tipo"?: Database["public"]['Enums']["tipo_veiculo"],"valor_fipe"?: number | null,"versao"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "veiculos_reservado_cliente_fk"
      columns: ["reservado_para_cliente_id"]
isOneToOne: false
      referencedRelation: "clientes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "veiculos_reservado_cliente_fk"
      columns: ["reservado_para_cliente_id"]
isOneToOne: false
      referencedRelation: "v_clientes"
      referencedColumns: ["id"]
    }
                  ]
                },"veiculos_sigilo": {
                  Row: {
                    "atualizado_em": string,"atualizado_por": string | null,"cliente_origem_id": string | null,"criado_em": string,"criado_por": string | null,"data_compra": string | null,"fornecedor_id": string | null,"observacoes_internas": string | null,"preco_minimo": number | null,"valor_compra": number | null,"veiculo_id": string,"venda_origem_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "atualizado_em"?: string,"atualizado_por"?: string | null,"cliente_origem_id"?: string | null,"criado_em"?: string,"criado_por"?: string | null,"data_compra"?: string | null,"fornecedor_id"?: string | null,"observacoes_internas"?: string | null,"preco_minimo"?: number | null,"valor_compra"?: number | null,"veiculo_id": string,"venda_origem_id"?: string | null
                  }
                  Update: {
                    "atualizado_em"?: string,"atualizado_por"?: string | null,"cliente_origem_id"?: string | null,"criado_em"?: string,"criado_por"?: string | null,"data_compra"?: string | null,"fornecedor_id"?: string | null,"observacoes_internas"?: string | null,"preco_minimo"?: number | null,"valor_compra"?: number | null,"veiculo_id"?: string,"venda_origem_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "veiculos_sigilo_cliente_origem_fk"
      columns: ["cliente_origem_id"]
isOneToOne: false
      referencedRelation: "clientes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "veiculos_sigilo_cliente_origem_fk"
      columns: ["cliente_origem_id"]
isOneToOne: false
      referencedRelation: "v_clientes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "veiculos_sigilo_fornecedor_id_fkey"
      columns: ["fornecedor_id"]
isOneToOne: false
      referencedRelation: "fornecedores"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "veiculos_sigilo_veiculo_id_fkey"
      columns: ["veiculo_id"]
isOneToOne: true
      referencedRelation: "v_veiculos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "veiculos_sigilo_veiculo_id_fkey"
      columns: ["veiculo_id"]
isOneToOne: true
      referencedRelation: "v_veiculos_gestao"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "veiculos_sigilo_veiculo_id_fkey"
      columns: ["veiculo_id"]
isOneToOne: true
      referencedRelation: "veiculos"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            "v_clientes": {
                  Row: {
                    "aceita_marketing": boolean,"anonimizado_em": string | null,"atualizado_em": string,"atualizado_por": string | null,"cidade": string | null,"criado_em": string,"criado_por": string | null,"email": string | null,"etapa": Database["public"]['Enums']["etapa_funil"],"followup_pendente": boolean | null,"id": string,"interesses": string | null,"motivo_perda": Database["public"]['Enums']["motivo_perda"] | null,"motivo_perda_detalhe": string | null,"nome": string,"observacoes": string | null,"origem": Database["public"]['Enums']["origem_lead"],"parceiro_id": string | null,"parceiro_nome": string | null,"proximo_contato_em": string | null,"telefone": string | null,"uf": string | null,"ultimo_contato_em": string | null,"vendedor_id": string | null,"vendedor_nome": string | null,"whatsapp": string | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "clientes_parceiro_id_fkey"
      columns: ["parceiro_id"]
isOneToOne: false
      referencedRelation: "parceiros"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "clientes_vendedor_id_fkey"
      columns: ["vendedor_id"]
isOneToOne: false
      referencedRelation: "usuarios"
      referencedColumns: ["id"]
    }
                  ]
                },"v_veiculos": {
                  Row: {
                    "ano_fabricacao": number | null,"ano_modelo": number | null,"atualizado_em": string,"atualizado_por": string | null,"cambio": Database["public"]['Enums']["cambio"] | null,"chassi": string | null,"codigo_fipe": string | null,"combustivel": Database["public"]['Enums']["combustivel"] | null,"cor": string | null,"criado_em": string,"criado_por": string | null,"data_entrada": string,"data_saida": string | null,"descricao": string | null,"dias_em_estoque": number | null,"fipe_referencia": string | null,"foto_capa": string | null,"id": string,"km": number | null,"laudo_cautelar": boolean,"laudo_resultado": Database["public"]['Enums']["resultado_laudo"] | null,"marca": string,"modelo": string,"motor": string | null,"observacoes": string | null,"origem": Database["public"]['Enums']["origem_veiculo"],"placa": string | null,"portas": number | null,"preco_anunciado": number | null,"preco_negociavel": number | null,"qtd_fotos": number | null,"renavam": string | null,"reservado_ate": string | null,"reservado_para_cliente_id": string | null,"status": Database["public"]['Enums']["status_veiculo"],"tipo": Database["public"]['Enums']["tipo_veiculo"],"valor_fipe": number | null,"versao": string | null
                  }
                  ComputedFields: never
                  Insert: {
                           "ano_fabricacao"?: number | null,"ano_modelo"?: number | null,"atualizado_em"?: string | null,"atualizado_por"?: string | null,"cambio"?: Database["public"]['Enums']["cambio"] | null,"chassi"?: string | null,"codigo_fipe"?: string | null,"combustivel"?: Database["public"]['Enums']["combustivel"] | null,"cor"?: string | null,"criado_em"?: string | null,"criado_por"?: string | null,"data_entrada"?: string | null,"data_saida"?: string | null,"descricao"?: string | null,"dias_em_estoque"?: never,"fipe_referencia"?: string | null,"foto_capa"?: never,"id"?: string | null,"km"?: number | null,"laudo_cautelar"?: boolean | null,"laudo_resultado"?: Database["public"]['Enums']["resultado_laudo"] | null,"marca"?: string | null,"modelo"?: string | null,"motor"?: string | null,"observacoes"?: string | null,"origem"?: Database["public"]['Enums']["origem_veiculo"] | null,"placa"?: string | null,"portas"?: number | null,"preco_anunciado"?: number | null,"preco_negociavel"?: number | null,"qtd_fotos"?: never,"renavam"?: string | null,"reservado_ate"?: string | null,"reservado_para_cliente_id"?: string | null,"status"?: Database["public"]['Enums']["status_veiculo"] | null,"tipo"?: Database["public"]['Enums']["tipo_veiculo"] | null,"valor_fipe"?: number | null,"versao"?: string | null
                         }
                        Update: {
                           "ano_fabricacao"?: number | null,"ano_modelo"?: number | null,"atualizado_em"?: string | null,"atualizado_por"?: string | null,"cambio"?: Database["public"]['Enums']["cambio"] | null,"chassi"?: string | null,"codigo_fipe"?: string | null,"combustivel"?: Database["public"]['Enums']["combustivel"] | null,"cor"?: string | null,"criado_em"?: string | null,"criado_por"?: string | null,"data_entrada"?: string | null,"data_saida"?: string | null,"descricao"?: string | null,"dias_em_estoque"?: never,"fipe_referencia"?: string | null,"foto_capa"?: never,"id"?: string | null,"km"?: number | null,"laudo_cautelar"?: boolean | null,"laudo_resultado"?: Database["public"]['Enums']["resultado_laudo"] | null,"marca"?: string | null,"modelo"?: string | null,"motor"?: string | null,"observacoes"?: string | null,"origem"?: Database["public"]['Enums']["origem_veiculo"] | null,"placa"?: string | null,"portas"?: number | null,"preco_anunciado"?: number | null,"preco_negociavel"?: number | null,"qtd_fotos"?: never,"renavam"?: string | null,"reservado_ate"?: string | null,"reservado_para_cliente_id"?: string | null,"status"?: Database["public"]['Enums']["status_veiculo"] | null,"tipo"?: Database["public"]['Enums']["tipo_veiculo"] | null,"valor_fipe"?: number | null,"versao"?: string | null
                         }
                        Relationships: [
                    {
      foreignKeyName: "veiculos_reservado_cliente_fk"
      columns: ["reservado_para_cliente_id"]
isOneToOne: false
      referencedRelation: "clientes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "veiculos_reservado_cliente_fk"
      columns: ["reservado_para_cliente_id"]
isOneToOne: false
      referencedRelation: "v_clientes"
      referencedColumns: ["id"]
    }
                  ]
                },"v_veiculos_gestao": {
                  Row: {
                    "ano_fabricacao": number | null,"ano_modelo": number | null,"atualizado_em": string,"atualizado_por": string | null,"cambio": Database["public"]['Enums']["cambio"] | null,"chassi": string | null,"codigo_fipe": string | null,"combustivel": Database["public"]['Enums']["combustivel"] | null,"consignacao_fim": string | null,"consignacao_id": string | null,"consignacao_inicio": string | null,"consignante_id": string | null,"consignante_nome": string | null,"contrato_arquivo_id": string | null,"cor": string | null,"criado_em": string,"criado_por": string | null,"custo_total": number | null,"custos_cobrados_consignante": number | null,"custos_total": number | null,"data_compra": string | null,"data_entrada": string,"data_saida": string | null,"descricao": string | null,"dias_em_estoque": number | null,"fipe_referencia": string | null,"fornecedor_id": string | null,"fornecedor_nome": string | null,"foto_capa": string | null,"id": string,"km": number | null,"laudo_cautelar": boolean,"laudo_resultado": Database["public"]['Enums']["resultado_laudo"] | null,"marca": string,"margem_prevista": number | null,"modelo": string,"motor": string | null,"observacoes": string | null,"observacoes_internas": string | null,"origem": Database["public"]['Enums']["origem_veiculo"],"pendencias": (string)[] | null,"placa": string | null,"portas": number | null,"preco_anunciado": number | null,"preco_minimo": number | null,"preco_negociavel": number | null,"qtd_fotos": number | null,"recebimento_padrao": Database["public"]['Enums']["recebimento_consignado"] | null,"regra_comissao_id": string | null,"renavam": string | null,"reservado_ate": string | null,"reservado_para_cliente_id": string | null,"status": Database["public"]['Enums']["status_veiculo"],"tipo": Database["public"]['Enums']["tipo_veiculo"],"valor_compra": number | null,"valor_fipe": number | null,"valor_minimo_dono": number | null,"versao": string | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "consignacoes_consignante_id_fkey"
      columns: ["consignante_id"]
isOneToOne: false
      referencedRelation: "consignantes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "consignacoes_contrato_arquivo_id_fkey"
      columns: ["contrato_arquivo_id"]
isOneToOne: false
      referencedRelation: "arquivos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "veiculos_reservado_cliente_fk"
      columns: ["reservado_para_cliente_id"]
isOneToOne: false
      referencedRelation: "clientes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "veiculos_reservado_cliente_fk"
      columns: ["reservado_para_cliente_id"]
isOneToOne: false
      referencedRelation: "v_clientes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "veiculos_sigilo_fornecedor_id_fkey"
      columns: ["fornecedor_id"]
isOneToOne: false
      referencedRelation: "fornecedores"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Functions: {
            "alterar_status_veiculo":
{ Args: { "p_id": string,"p_motivo"?: string,"p_status": Database["public"]['Enums']["status_veiculo"] }; Returns: undefined
                           },
"anonimizar_cliente":
{ Args: { "p_cliente": string }; Returns: undefined
                           },
"atualizar_meu_perfil":
{ Args: { "p_nome": string,"p_telefone": string }; Returns: undefined
                           },
"cliente_existe":
{ Args: { "p_telefone": string }; Returns: {
              "cliente_id": string,"e_meu": boolean,"primeiro_nome": string,"vendedor": string
            }[]
                           },
"documento_valido":
{ Args: { "p": string }; Returns: boolean
                           },
"hoje":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"is_ativo":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_dono":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_gestor":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_vendedor":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"listar_parceiros_ativos":
{ Args: Record<PropertyKey, never>; Returns: {
              "id": string,"nome": string
            }[]
                           },
"listar_vendedores":
{ Args: Record<PropertyKey, never>; Returns: {
              "id": string,"nome": string,"papel": Database["public"]['Enums']["papel_usuario"]
            }[]
                           },
"normalizar":
{ Args: { "p": string }; Returns: string
                           },
"papel":
{ Args: Record<PropertyKey, never>; Returns: Database["public"]['Enums']["papel_usuario"]
                           },
"pode_ver_cliente":
{ Args: { "p_cliente": string }; Returns: boolean
                           },
"pode_ver_entidade":
{ Args: { "p_entidade": Database["public"]['Enums']["entidade_arquivo"],"p_id": string,"p_sigiloso": boolean }; Returns: boolean
                           },
"preparar_tabela":
{ Args: { "p_ocultar"?: string,"p_pk"?: string,"p_tabela": unknown }; Returns: undefined
                           },
"revelar_dado_pessoal":
{ Args: { "p_campo": string,"p_cliente": string,"p_motivo"?: string }; Returns: string
                           },
"salvar_cliente":
{ Args: { "p_cliente": Json,"p_id": string,"p_pessoais"?: Json }; Returns: string
                           },
"salvar_veiculo":
{ Args: { "p_consignacao"?: Json,"p_id": string,"p_sigilo"?: Json,"p_veiculo": Json }; Returns: string
                           }
          }
          Enums: {
            "cambio": "manual"|"automatico"|"cvt"|"automatizado","canal_contato": "whatsapp"|"ligacao"|"loja"|"instagram"|"email"|"outro","categoria_arquivo": "foto"|"crlv"|"laudo"|"contrato"|"nf_xml"|"nf_pdf"|"comprovante"|"documento"|"outro","combustivel": "flex"|"gasolina"|"etanol"|"diesel"|"gnv"|"hibrido"|"eletrico","entidade_arquivo": "veiculo"|"consignacao"|"cliente"|"venda"|"nota"|"extrato"|"garantia"|"lancamento"|"fornecedor"|"consignante","etapa_funil": "lead"|"negociacao"|"ganho"|"perdido","motivo_perda": "preco"|"financiamento_negado"|"comprou_outro_lugar"|"desistiu"|"sem_contato"|"carro_vendido"|"outro","origem_lead": "instagram"|"marketplace"|"olx"|"indicacao"|"loja"|"site"|"whatsapp"|"outro","origem_veiculo": "compra"|"troca"|"consignacao","papel_usuario": "dono"|"gerente"|"vendedor","recebimento_consignado": "loja_repassa"|"direto_dono","resultado_laudo": "aprovado"|"aprovado_apontamentos"|"reprovado","status_consignacao": "vigente"|"vendido"|"devolvido","status_veiculo": "em_preparacao"|"disponivel"|"reservado"|"vendido"|"devolvido","tipo_custo": "funilaria"|"mecanica"|"pintura"|"documentacao"|"lavagem"|"estetica"|"pneus"|"eletrica"|"laudo"|"transporte"|"outros","tipo_fornecedor": "locadora"|"lojista"|"particular"|"oficina"|"despachante"|"outro","tipo_historico": "pintura"|"reparo"|"sinistro"|"revisao"|"manutencao"|"observacao","tipo_parceiro": "indicacao"|"corretor"|"outro","tipo_veiculo": "proprio"|"consignado"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "cambio": ["manual", "automatico", "cvt", "automatizado"],"canal_contato": ["whatsapp", "ligacao", "loja", "instagram", "email", "outro"],"categoria_arquivo": ["foto", "crlv", "laudo", "contrato", "nf_xml", "nf_pdf", "comprovante", "documento", "outro"],"combustivel": ["flex", "gasolina", "etanol", "diesel", "gnv", "hibrido", "eletrico"],"entidade_arquivo": ["veiculo", "consignacao", "cliente", "venda", "nota", "extrato", "garantia", "lancamento", "fornecedor", "consignante"],"etapa_funil": ["lead", "negociacao", "ganho", "perdido"],"motivo_perda": ["preco", "financiamento_negado", "comprou_outro_lugar", "desistiu", "sem_contato", "carro_vendido", "outro"],"origem_lead": ["instagram", "marketplace", "olx", "indicacao", "loja", "site", "whatsapp", "outro"],"origem_veiculo": ["compra", "troca", "consignacao"],"papel_usuario": ["dono", "gerente", "vendedor"],"recebimento_consignado": ["loja_repassa", "direto_dono"],"resultado_laudo": ["aprovado", "aprovado_apontamentos", "reprovado"],"status_consignacao": ["vigente", "vendido", "devolvido"],"status_veiculo": ["em_preparacao", "disponivel", "reservado", "vendido", "devolvido"],"tipo_custo": ["funilaria", "mecanica", "pintura", "documentacao", "lavagem", "estetica", "pneus", "eletrica", "laudo", "transporte", "outros"],"tipo_fornecedor": ["locadora", "lojista", "particular", "oficina", "despachante", "outro"],"tipo_historico": ["pintura", "reparo", "sinistro", "revisao", "manutencao", "observacao"],"tipo_parceiro": ["indicacao", "corretor", "outro"],"tipo_veiculo": ["proprio", "consignado"]
          }
        }
} as const
