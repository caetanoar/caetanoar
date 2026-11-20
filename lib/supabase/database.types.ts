
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
                },"api_chaves": {
                  Row: {
                    "atualizado_em": string,"atualizado_por": string | null,"criado_em": string,"criado_por": string | null,"escopos": (string)[],"expira_em": string | null,"hash": string,"id": string,"nome": string,"prefixo": string,"revogada_em": string | null,"ultimo_uso_em": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "atualizado_em"?: string,"atualizado_por"?: string | null,"criado_em"?: string,"criado_por"?: string | null,"escopos": (string)[],"expira_em"?: string | null,"hash": string,"id"?: string,"nome": string,"prefixo": string,"revogada_em"?: string | null,"ultimo_uso_em"?: string | null
                  }
                  Update: {
                    "atualizado_em"?: string,"atualizado_por"?: string | null,"criado_em"?: string,"criado_por"?: string | null,"escopos"?: (string)[],"expira_em"?: string | null,"hash"?: string,"id"?: string,"nome"?: string,"prefixo"?: string,"revogada_em"?: string | null,"ultimo_uso_em"?: string | null
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
                },"categorias_financeiras": {
                  Row: {
                    "ativa": boolean,"atualizado_em": string,"atualizado_por": string | null,"criado_em": string,"criado_por": string | null,"grupo": string,"id": string,"natureza": Database["public"]['Enums']["natureza_categoria"],"nome": string,"sistema": string | null,"tipo": string
                  }
                  ComputedFields: never
                  Insert: {
                    "ativa"?: boolean,"atualizado_em"?: string,"atualizado_por"?: string | null,"criado_em"?: string,"criado_por"?: string | null,"grupo"?: string,"id"?: string,"natureza"?: Database["public"]['Enums']["natureza_categoria"],"nome": string,"sistema"?: string | null,"tipo": string
                  }
                  Update: {
                    "ativa"?: boolean,"atualizado_em"?: string,"atualizado_por"?: string | null,"criado_em"?: string,"criado_por"?: string | null,"grupo"?: string,"id"?: string,"natureza"?: Database["public"]['Enums']["natureza_categoria"],"nome"?: string,"sistema"?: string | null,"tipo"?: string
                  }
                  Relationships: [
                    
                  ]
                },"checklist_itens": {
                  Row: {
                    "arquivo_id": string | null,"atualizado_em": string,"atualizado_por": string | null,"criado_em": string,"criado_por": string | null,"feito": boolean,"feito_em": string | null,"feito_por": string | null,"id": string,"item": string,"observacao": string | null,"ordem": number,"prazo": string | null,"responsavel_id": string | null,"tipo": Database["public"]['Enums']["tipo_checklist"],"veiculo_id": string | null,"venda_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "arquivo_id"?: string | null,"atualizado_em"?: string,"atualizado_por"?: string | null,"criado_em"?: string,"criado_por"?: string | null,"feito"?: boolean,"feito_em"?: string | null,"feito_por"?: string | null,"id"?: string,"item": string,"observacao"?: string | null,"ordem"?: number,"prazo"?: string | null,"responsavel_id"?: string | null,"tipo": Database["public"]['Enums']["tipo_checklist"],"veiculo_id"?: string | null,"venda_id"?: string | null
                  }
                  Update: {
                    "arquivo_id"?: string | null,"atualizado_em"?: string,"atualizado_por"?: string | null,"criado_em"?: string,"criado_por"?: string | null,"feito"?: boolean,"feito_em"?: string | null,"feito_por"?: string | null,"id"?: string,"item"?: string,"observacao"?: string | null,"ordem"?: number,"prazo"?: string | null,"responsavel_id"?: string | null,"tipo"?: Database["public"]['Enums']["tipo_checklist"],"veiculo_id"?: string | null,"venda_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "checklist_itens_arquivo_id_fkey"
      columns: ["arquivo_id"]
isOneToOne: false
      referencedRelation: "arquivos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "checklist_itens_feito_por_fkey"
      columns: ["feito_por"]
isOneToOne: false
      referencedRelation: "usuarios"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "checklist_itens_responsavel_id_fkey"
      columns: ["responsavel_id"]
isOneToOne: false
      referencedRelation: "usuarios"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "checklist_itens_veiculo_id_fkey"
      columns: ["veiculo_id"]
isOneToOne: false
      referencedRelation: "v_veiculos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "checklist_itens_veiculo_id_fkey"
      columns: ["veiculo_id"]
isOneToOne: false
      referencedRelation: "v_veiculos_gestao"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "checklist_itens_veiculo_id_fkey"
      columns: ["veiculo_id"]
isOneToOne: false
      referencedRelation: "veiculos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "checklist_itens_venda_id_fkey"
      columns: ["venda_id"]
isOneToOne: false
      referencedRelation: "v_lucro_vendas"
      referencedColumns: ["venda_id"]
    },{
      foreignKeyName: "checklist_itens_venda_id_fkey"
      columns: ["venda_id"]
isOneToOne: false
      referencedRelation: "v_lucro_vendas_calc"
      referencedColumns: ["venda_id"]
    },{
      foreignKeyName: "checklist_itens_venda_id_fkey"
      columns: ["venda_id"]
isOneToOne: false
      referencedRelation: "v_vendas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "checklist_itens_venda_id_fkey"
      columns: ["venda_id"]
isOneToOne: false
      referencedRelation: "v_vendas_sem_nota"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "checklist_itens_venda_id_fkey"
      columns: ["venda_id"]
isOneToOne: false
      referencedRelation: "vendas"
      referencedColumns: ["id"]
    }
                  ]
                },"checklist_modelos": {
                  Row: {
                    "ativo": boolean,"atualizado_em": string,"atualizado_por": string | null,"criado_em": string,"criado_por": string | null,"id": string,"item": string,"ordem": number,"prazo_dias": number | null,"tipo": Database["public"]['Enums']["tipo_checklist"]
                  }
                  ComputedFields: never
                  Insert: {
                    "ativo"?: boolean,"atualizado_em"?: string,"atualizado_por"?: string | null,"criado_em"?: string,"criado_por"?: string | null,"id"?: string,"item": string,"ordem"?: number,"prazo_dias"?: number | null,"tipo": Database["public"]['Enums']["tipo_checklist"]
                  }
                  Update: {
                    "ativo"?: boolean,"atualizado_em"?: string,"atualizado_por"?: string | null,"criado_em"?: string,"criado_por"?: string | null,"id"?: string,"item"?: string,"ordem"?: number,"prazo_dias"?: number | null,"tipo"?: Database["public"]['Enums']["tipo_checklist"]
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
                },"comissoes": {
                  Row: {
                    "atualizado_em": string,"atualizado_por": string | null,"base_calculo": string | null,"base_valor": number | null,"consignante_id": string | null,"criado_em": string,"criado_por": string | null,"data_prevista": string | null,"data_quitacao": string | null,"direcao": string,"id": string,"lancamento_id": string | null,"manual": boolean,"observacoes": string | null,"parceiro_id": string | null,"regra_id": string | null,"regra_snapshot": Json | null,"status": Database["public"]['Enums']["status_comissao"],"tipo": Database["public"]['Enums']["tipo_comissao"],"usuario_id": string | null,"valor": number,"venda_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "atualizado_em"?: string,"atualizado_por"?: string | null,"base_calculo"?: string | null,"base_valor"?: number | null,"consignante_id"?: string | null,"criado_em"?: string,"criado_por"?: string | null,"data_prevista"?: string | null,"data_quitacao"?: string | null,"direcao": string,"id"?: string,"lancamento_id"?: string | null,"manual"?: boolean,"observacoes"?: string | null,"parceiro_id"?: string | null,"regra_id"?: string | null,"regra_snapshot"?: Json | null,"status"?: Database["public"]['Enums']["status_comissao"],"tipo": Database["public"]['Enums']["tipo_comissao"],"usuario_id"?: string | null,"valor": number,"venda_id": string
                  }
                  Update: {
                    "atualizado_em"?: string,"atualizado_por"?: string | null,"base_calculo"?: string | null,"base_valor"?: number | null,"consignante_id"?: string | null,"criado_em"?: string,"criado_por"?: string | null,"data_prevista"?: string | null,"data_quitacao"?: string | null,"direcao"?: string,"id"?: string,"lancamento_id"?: string | null,"manual"?: boolean,"observacoes"?: string | null,"parceiro_id"?: string | null,"regra_id"?: string | null,"regra_snapshot"?: Json | null,"status"?: Database["public"]['Enums']["status_comissao"],"tipo"?: Database["public"]['Enums']["tipo_comissao"],"usuario_id"?: string | null,"valor"?: number,"venda_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "comissoes_consignante_id_fkey"
      columns: ["consignante_id"]
isOneToOne: false
      referencedRelation: "consignantes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "comissoes_lancamento_id_fkey"
      columns: ["lancamento_id"]
isOneToOne: false
      referencedRelation: "lancamentos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "comissoes_lancamento_id_fkey"
      columns: ["lancamento_id"]
isOneToOne: false
      referencedRelation: "v_lancamentos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "comissoes_parceiro_id_fkey"
      columns: ["parceiro_id"]
isOneToOne: false
      referencedRelation: "parceiros"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "comissoes_regra_id_fkey"
      columns: ["regra_id"]
isOneToOne: false
      referencedRelation: "regras_comissao"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "comissoes_usuario_id_fkey"
      columns: ["usuario_id"]
isOneToOne: false
      referencedRelation: "usuarios"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "comissoes_venda_id_fkey"
      columns: ["venda_id"]
isOneToOne: false
      referencedRelation: "v_lucro_vendas"
      referencedColumns: ["venda_id"]
    },{
      foreignKeyName: "comissoes_venda_id_fkey"
      columns: ["venda_id"]
isOneToOne: false
      referencedRelation: "v_lucro_vendas_calc"
      referencedColumns: ["venda_id"]
    },{
      foreignKeyName: "comissoes_venda_id_fkey"
      columns: ["venda_id"]
isOneToOne: false
      referencedRelation: "v_vendas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "comissoes_venda_id_fkey"
      columns: ["venda_id"]
isOneToOne: false
      referencedRelation: "v_vendas_sem_nota"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "comissoes_venda_id_fkey"
      columns: ["venda_id"]
isOneToOne: false
      referencedRelation: "vendas"
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
                },"configuracoes_fiscais": {
                  Row: {
                    "ambiente": string,"atualizado_em": string,"atualizado_por": string | null,"bairro": string | null,"cep": string | null,"cfop_devolucao_consignacao": string | null,"cfop_entrada_compra": string | null,"cfop_entrada_consignacao": string | null,"cfop_venda_consignado": string | null,"cfop_venda_proprio": string | null,"cfop_venda_proprio_fora_uf": string | null,"cnpj": string | null,"codigo_municipio": string,"complemento": string | null,"criado_em": string,"criado_por": string | null,"csosn_cst_padrao": string | null,"email": string | null,"id": boolean,"informacoes_complementares": string | null,"inscricao_estadual": string | null,"inscricao_municipal": string | null,"logradouro": string | null,"municipio": string,"natureza_venda": string,"ncm_veiculos": string | null,"nome_fantasia": string | null,"numero": string | null,"razao_social": string | null,"regime_tributario": string | null,"serie_nfe": number,"telefone": string | null,"uf": string
                  }
                  ComputedFields: never
                  Insert: {
                    "ambiente"?: string,"atualizado_em"?: string,"atualizado_por"?: string | null,"bairro"?: string | null,"cep"?: string | null,"cfop_devolucao_consignacao"?: string | null,"cfop_entrada_compra"?: string | null,"cfop_entrada_consignacao"?: string | null,"cfop_venda_consignado"?: string | null,"cfop_venda_proprio"?: string | null,"cfop_venda_proprio_fora_uf"?: string | null,"cnpj"?: string | null,"codigo_municipio"?: string,"complemento"?: string | null,"criado_em"?: string,"criado_por"?: string | null,"csosn_cst_padrao"?: string | null,"email"?: string | null,"id"?: boolean,"informacoes_complementares"?: string | null,"inscricao_estadual"?: string | null,"inscricao_municipal"?: string | null,"logradouro"?: string | null,"municipio"?: string,"natureza_venda"?: string,"ncm_veiculos"?: string | null,"nome_fantasia"?: string | null,"numero"?: string | null,"razao_social"?: string | null,"regime_tributario"?: string | null,"serie_nfe"?: number,"telefone"?: string | null,"uf"?: string
                  }
                  Update: {
                    "ambiente"?: string,"atualizado_em"?: string,"atualizado_por"?: string | null,"bairro"?: string | null,"cep"?: string | null,"cfop_devolucao_consignacao"?: string | null,"cfop_entrada_compra"?: string | null,"cfop_entrada_consignacao"?: string | null,"cfop_venda_consignado"?: string | null,"cfop_venda_proprio"?: string | null,"cfop_venda_proprio_fora_uf"?: string | null,"cnpj"?: string | null,"codigo_municipio"?: string,"complemento"?: string | null,"criado_em"?: string,"criado_por"?: string | null,"csosn_cst_padrao"?: string | null,"email"?: string | null,"id"?: boolean,"informacoes_complementares"?: string | null,"inscricao_estadual"?: string | null,"inscricao_municipal"?: string | null,"logradouro"?: string | null,"municipio"?: string,"natureza_venda"?: string,"ncm_veiculos"?: string | null,"nome_fantasia"?: string | null,"numero"?: string | null,"razao_social"?: string | null,"regime_tributario"?: string | null,"serie_nfe"?: number,"telefone"?: string | null,"uf"?: string
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
      foreignKeyName: "consignacoes_regra_fk"
      columns: ["regra_comissao_id"]
isOneToOne: false
      referencedRelation: "regras_comissao"
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
                },"contas_financeiras": {
                  Row: {
                    "agencia": string | null,"ativa": boolean,"atualizado_em": string,"atualizado_por": string | null,"banco": string | null,"conta": string | null,"criado_em": string,"criado_por": string | null,"data_saldo_inicial": string,"id": string,"nome": string,"observacoes": string | null,"saldo_inicial": number,"tipo": Database["public"]['Enums']["tipo_conta"]
                  }
                  ComputedFields: never
                  Insert: {
                    "agencia"?: string | null,"ativa"?: boolean,"atualizado_em"?: string,"atualizado_por"?: string | null,"banco"?: string | null,"conta"?: string | null,"criado_em"?: string,"criado_por"?: string | null,"data_saldo_inicial"?: string,"id"?: string,"nome": string,"observacoes"?: string | null,"saldo_inicial"?: number,"tipo"?: Database["public"]['Enums']["tipo_conta"]
                  }
                  Update: {
                    "agencia"?: string | null,"ativa"?: boolean,"atualizado_em"?: string,"atualizado_por"?: string | null,"banco"?: string | null,"conta"?: string | null,"criado_em"?: string,"criado_por"?: string | null,"data_saldo_inicial"?: string,"id"?: string,"nome"?: string,"observacoes"?: string | null,"saldo_inicial"?: number,"tipo"?: Database["public"]['Enums']["tipo_conta"]
                  }
                  Relationships: [
                    
                  ]
                },"custos_veiculo": {
                  Row: {
                    "atualizado_em": string,"atualizado_por": string | null,"cobrar_do_consignante": boolean,"criado_em": string,"criado_por": string | null,"data": string,"descricao": string | null,"fornecedor_id": string | null,"id": string,"lancar_financeiro": boolean,"observacoes": string | null,"tipo": Database["public"]['Enums']["tipo_custo"],"valor": number,"veiculo_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "atualizado_em"?: string,"atualizado_por"?: string | null,"cobrar_do_consignante"?: boolean,"criado_em"?: string,"criado_por"?: string | null,"data"?: string,"descricao"?: string | null,"fornecedor_id"?: string | null,"id"?: string,"lancar_financeiro"?: boolean,"observacoes"?: string | null,"tipo": Database["public"]['Enums']["tipo_custo"],"valor": number,"veiculo_id": string
                  }
                  Update: {
                    "atualizado_em"?: string,"atualizado_por"?: string | null,"cobrar_do_consignante"?: boolean,"criado_em"?: string,"criado_por"?: string | null,"data"?: string,"descricao"?: string | null,"fornecedor_id"?: string | null,"id"?: string,"lancar_financeiro"?: boolean,"observacoes"?: string | null,"tipo"?: Database["public"]['Enums']["tipo_custo"],"valor"?: number,"veiculo_id"?: string
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
                },"eventos_saida": {
                  Row: {
                    "criado_em": string,"id": number,"payload": NonNullable<Json>,"tipo": string
                  }
                  ComputedFields: never
                  Insert: {
                    "criado_em"?: string,"id"?: never,"payload": NonNullable<Json>,"tipo": string
                  }
                  Update: {
                    "criado_em"?: string,"id"?: never,"payload"?: NonNullable<Json>,"tipo"?: string
                  }
                  Relationships: [
                    
                  ]
                },"extratos_importacoes": {
                  Row: {
                    "arquivo_id": string | null,"atualizado_em": string,"atualizado_por": string | null,"conta_id": string,"criado_em": string,"criado_por": string | null,"id": string,"nome_arquivo": string | null,"origem": Database["public"]['Enums']["origem_extrato"],"periodo_fim": string | null,"periodo_inicio": string | null,"qtd_novas": number,"qtd_transacoes": number,"saldo_final": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "arquivo_id"?: string | null,"atualizado_em"?: string,"atualizado_por"?: string | null,"conta_id": string,"criado_em"?: string,"criado_por"?: string | null,"id"?: string,"nome_arquivo"?: string | null,"origem": Database["public"]['Enums']["origem_extrato"],"periodo_fim"?: string | null,"periodo_inicio"?: string | null,"qtd_novas"?: number,"qtd_transacoes"?: number,"saldo_final"?: number | null
                  }
                  Update: {
                    "arquivo_id"?: string | null,"atualizado_em"?: string,"atualizado_por"?: string | null,"conta_id"?: string,"criado_em"?: string,"criado_por"?: string | null,"id"?: string,"nome_arquivo"?: string | null,"origem"?: Database["public"]['Enums']["origem_extrato"],"periodo_fim"?: string | null,"periodo_inicio"?: string | null,"qtd_novas"?: number,"qtd_transacoes"?: number,"saldo_final"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "extratos_importacoes_arquivo_id_fkey"
      columns: ["arquivo_id"]
isOneToOne: false
      referencedRelation: "arquivos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "extratos_importacoes_conta_id_fkey"
      columns: ["conta_id"]
isOneToOne: false
      referencedRelation: "contas_financeiras"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "extratos_importacoes_conta_id_fkey"
      columns: ["conta_id"]
isOneToOne: false
      referencedRelation: "v_saldos_contas"
      referencedColumns: ["id"]
    }
                  ]
                },"extratos_layouts_csv": {
                  Row: {
                    "atualizado_em": string,"atualizado_por": string | null,"coluna_credito": string | null,"coluna_data": string,"coluna_debito": string | null,"coluna_descricao": string,"coluna_valor": string | null,"criado_em": string,"criado_por": string | null,"decimal": string,"formato_data": string,"id": string,"linhas_ignorar": number,"nome": string,"separador": string
                  }
                  ComputedFields: never
                  Insert: {
                    "atualizado_em"?: string,"atualizado_por"?: string | null,"coluna_credito"?: string | null,"coluna_data": string,"coluna_debito"?: string | null,"coluna_descricao": string,"coluna_valor"?: string | null,"criado_em"?: string,"criado_por"?: string | null,"decimal"?: string,"formato_data"?: string,"id"?: string,"linhas_ignorar"?: number,"nome": string,"separador"?: string
                  }
                  Update: {
                    "atualizado_em"?: string,"atualizado_por"?: string | null,"coluna_credito"?: string | null,"coluna_data"?: string,"coluna_debito"?: string | null,"coluna_descricao"?: string,"coluna_valor"?: string | null,"criado_em"?: string,"criado_por"?: string | null,"decimal"?: string,"formato_data"?: string,"id"?: string,"linhas_ignorar"?: number,"nome"?: string,"separador"?: string
                  }
                  Relationships: [
                    
                  ]
                },"extratos_transacoes": {
                  Row: {
                    "atualizado_em": string,"atualizado_por": string | null,"conciliado_em": string | null,"conta_id": string,"criado_em": string,"criado_por": string | null,"data": string,"descricao": string,"documento": string | null,"fitid": string | null,"hash": string,"id": string,"importacao_id": string | null,"lancamento_id": string | null,"status": Database["public"]['Enums']["status_transacao"],"valor": number
                  }
                  ComputedFields: never
                  Insert: {
                    "atualizado_em"?: string,"atualizado_por"?: string | null,"conciliado_em"?: string | null,"conta_id": string,"criado_em"?: string,"criado_por"?: string | null,"data": string,"descricao"?: string,"documento"?: string | null,"fitid"?: string | null,"hash": string,"id"?: string,"importacao_id"?: string | null,"lancamento_id"?: string | null,"status"?: Database["public"]['Enums']["status_transacao"],"valor": number
                  }
                  Update: {
                    "atualizado_em"?: string,"atualizado_por"?: string | null,"conciliado_em"?: string | null,"conta_id"?: string,"criado_em"?: string,"criado_por"?: string | null,"data"?: string,"descricao"?: string,"documento"?: string | null,"fitid"?: string | null,"hash"?: string,"id"?: string,"importacao_id"?: string | null,"lancamento_id"?: string | null,"status"?: Database["public"]['Enums']["status_transacao"],"valor"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "extratos_transacoes_conta_id_fkey"
      columns: ["conta_id"]
isOneToOne: false
      referencedRelation: "contas_financeiras"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "extratos_transacoes_conta_id_fkey"
      columns: ["conta_id"]
isOneToOne: false
      referencedRelation: "v_saldos_contas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "extratos_transacoes_importacao_id_fkey"
      columns: ["importacao_id"]
isOneToOne: false
      referencedRelation: "extratos_importacoes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "extratos_transacoes_lancamento_id_fkey"
      columns: ["lancamento_id"]
isOneToOne: false
      referencedRelation: "lancamentos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "extratos_transacoes_lancamento_id_fkey"
      columns: ["lancamento_id"]
isOneToOne: false
      referencedRelation: "v_lancamentos"
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
                },"garantias": {
                  Row: {
                    "atualizado_em": string,"atualizado_por": string | null,"cancelada": boolean,"cliente_id": string,"cobertura": string | null,"criado_em": string,"criado_por": string | null,"data_fim": string | null,"data_inicio": string,"dias": number,"id": string,"observacoes": string | null,"veiculo_id": string,"venda_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "atualizado_em"?: string,"atualizado_por"?: string | null,"cancelada"?: boolean,"cliente_id": string,"cobertura"?: string | null,"criado_em"?: string,"criado_por"?: string | null,"data_fim"?: never,"data_inicio": string,"dias": number,"id"?: string,"observacoes"?: string | null,"veiculo_id": string,"venda_id": string
                  }
                  Update: {
                    "atualizado_em"?: string,"atualizado_por"?: string | null,"cancelada"?: boolean,"cliente_id"?: string,"cobertura"?: string | null,"criado_em"?: string,"criado_por"?: string | null,"data_fim"?: never,"data_inicio"?: string,"dias"?: number,"id"?: string,"observacoes"?: string | null,"veiculo_id"?: string,"venda_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "garantias_cliente_id_fkey"
      columns: ["cliente_id"]
isOneToOne: false
      referencedRelation: "clientes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "garantias_cliente_id_fkey"
      columns: ["cliente_id"]
isOneToOne: false
      referencedRelation: "v_clientes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "garantias_veiculo_id_fkey"
      columns: ["veiculo_id"]
isOneToOne: false
      referencedRelation: "v_veiculos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "garantias_veiculo_id_fkey"
      columns: ["veiculo_id"]
isOneToOne: false
      referencedRelation: "v_veiculos_gestao"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "garantias_veiculo_id_fkey"
      columns: ["veiculo_id"]
isOneToOne: false
      referencedRelation: "veiculos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "garantias_venda_id_fkey"
      columns: ["venda_id"]
isOneToOne: true
      referencedRelation: "v_lucro_vendas"
      referencedColumns: ["venda_id"]
    },{
      foreignKeyName: "garantias_venda_id_fkey"
      columns: ["venda_id"]
isOneToOne: true
      referencedRelation: "v_lucro_vendas_calc"
      referencedColumns: ["venda_id"]
    },{
      foreignKeyName: "garantias_venda_id_fkey"
      columns: ["venda_id"]
isOneToOne: true
      referencedRelation: "v_vendas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "garantias_venda_id_fkey"
      columns: ["venda_id"]
isOneToOne: true
      referencedRelation: "v_vendas_sem_nota"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "garantias_venda_id_fkey"
      columns: ["venda_id"]
isOneToOne: true
      referencedRelation: "vendas"
      referencedColumns: ["id"]
    }
                  ]
                },"garantias_acionamentos": {
                  Row: {
                    "atualizado_em": string,"atualizado_por": string | null,"criado_em": string,"criado_por": string | null,"custo": number,"data_abertura": string,"data_resolucao": string | null,"descricao": string,"fornecedor_id": string | null,"garantia_id": string,"id": string,"lancamento_id": string | null,"solucao": string | null,"status": Database["public"]['Enums']["status_acionamento"]
                  }
                  ComputedFields: never
                  Insert: {
                    "atualizado_em"?: string,"atualizado_por"?: string | null,"criado_em"?: string,"criado_por"?: string | null,"custo"?: number,"data_abertura"?: string,"data_resolucao"?: string | null,"descricao": string,"fornecedor_id"?: string | null,"garantia_id": string,"id"?: string,"lancamento_id"?: string | null,"solucao"?: string | null,"status"?: Database["public"]['Enums']["status_acionamento"]
                  }
                  Update: {
                    "atualizado_em"?: string,"atualizado_por"?: string | null,"criado_em"?: string,"criado_por"?: string | null,"custo"?: number,"data_abertura"?: string,"data_resolucao"?: string | null,"descricao"?: string,"fornecedor_id"?: string | null,"garantia_id"?: string,"id"?: string,"lancamento_id"?: string | null,"solucao"?: string | null,"status"?: Database["public"]['Enums']["status_acionamento"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "garantias_acionamentos_fornecedor_id_fkey"
      columns: ["fornecedor_id"]
isOneToOne: false
      referencedRelation: "fornecedores"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "garantias_acionamentos_garantia_id_fkey"
      columns: ["garantia_id"]
isOneToOne: false
      referencedRelation: "garantias"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "garantias_acionamentos_garantia_id_fkey"
      columns: ["garantia_id"]
isOneToOne: false
      referencedRelation: "v_garantias"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "garantias_acionamentos_lancamento_id_fkey"
      columns: ["lancamento_id"]
isOneToOne: false
      referencedRelation: "lancamentos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "garantias_acionamentos_lancamento_id_fkey"
      columns: ["lancamento_id"]
isOneToOne: false
      referencedRelation: "v_lancamentos"
      referencedColumns: ["id"]
    }
                  ]
                },"ia_geracoes": {
                  Row: {
                    "atualizado_em": string,"atualizado_por": string | null,"avisos": (string)[],"cliente_id": string | null,"criado_em": string,"criado_por": string | null,"entrada": NonNullable<Json>,"id": string,"modelo": string,"saida": NonNullable<Json>,"simulado": boolean,"tipo": Database["public"]['Enums']["tipo_geracao_ia"],"tokens_entrada": number | null,"tokens_saida": number | null,"usuario_id": string,"veiculo_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "atualizado_em"?: string,"atualizado_por"?: string | null,"avisos"?: (string)[],"cliente_id"?: string | null,"criado_em"?: string,"criado_por"?: string | null,"entrada": NonNullable<Json>,"id"?: string,"modelo": string,"saida": NonNullable<Json>,"simulado"?: boolean,"tipo": Database["public"]['Enums']["tipo_geracao_ia"],"tokens_entrada"?: number | null,"tokens_saida"?: number | null,"usuario_id"?: string,"veiculo_id"?: string | null
                  }
                  Update: {
                    "atualizado_em"?: string,"atualizado_por"?: string | null,"avisos"?: (string)[],"cliente_id"?: string | null,"criado_em"?: string,"criado_por"?: string | null,"entrada"?: NonNullable<Json>,"id"?: string,"modelo"?: string,"saida"?: NonNullable<Json>,"simulado"?: boolean,"tipo"?: Database["public"]['Enums']["tipo_geracao_ia"],"tokens_entrada"?: number | null,"tokens_saida"?: number | null,"usuario_id"?: string,"veiculo_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "ia_geracoes_cliente_id_fkey"
      columns: ["cliente_id"]
isOneToOne: false
      referencedRelation: "clientes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ia_geracoes_cliente_id_fkey"
      columns: ["cliente_id"]
isOneToOne: false
      referencedRelation: "v_clientes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ia_geracoes_usuario_id_fkey"
      columns: ["usuario_id"]
isOneToOne: false
      referencedRelation: "usuarios"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ia_geracoes_veiculo_id_fkey"
      columns: ["veiculo_id"]
isOneToOne: false
      referencedRelation: "v_veiculos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ia_geracoes_veiculo_id_fkey"
      columns: ["veiculo_id"]
isOneToOne: false
      referencedRelation: "v_veiculos_gestao"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ia_geracoes_veiculo_id_fkey"
      columns: ["veiculo_id"]
isOneToOne: false
      referencedRelation: "veiculos"
      referencedColumns: ["id"]
    }
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
                },"lancamentos": {
                  Row: {
                    "atualizado_em": string,"atualizado_por": string | null,"categoria_id": string,"cliente_id": string | null,"comissao_id": string | null,"conciliado": boolean,"consignante_id": string | null,"conta_id": string | null,"criado_em": string,"criado_por": string | null,"custo_veiculo_id": string | null,"data_competencia": string,"data_pagamento": string | null,"data_vencimento": string,"descricao": string,"extrato_transacao_id": string | null,"forma_pagamento": Database["public"]['Enums']["forma_pagamento"] | null,"fornecedor_id": string | null,"garantia_acionamento_id": string | null,"grupo_parcelas": string | null,"id": string,"nota_fiscal_id": string | null,"observacoes": string | null,"parceiro_id": string | null,"parcela_numero": number | null,"parcela_total": number | null,"status": Database["public"]['Enums']["status_lancamento"],"tipo": Database["public"]['Enums']["tipo_lancamento"],"transferencia_id": string | null,"usuario_id": string | null,"valor": number,"veiculo_id": string | null,"venda_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "atualizado_em"?: string,"atualizado_por"?: string | null,"categoria_id": string,"cliente_id"?: string | null,"comissao_id"?: string | null,"conciliado"?: boolean,"consignante_id"?: string | null,"conta_id"?: string | null,"criado_em"?: string,"criado_por"?: string | null,"custo_veiculo_id"?: string | null,"data_competencia"?: string,"data_pagamento"?: string | null,"data_vencimento"?: string,"descricao": string,"extrato_transacao_id"?: string | null,"forma_pagamento"?: Database["public"]['Enums']["forma_pagamento"] | null,"fornecedor_id"?: string | null,"garantia_acionamento_id"?: string | null,"grupo_parcelas"?: string | null,"id"?: string,"nota_fiscal_id"?: string | null,"observacoes"?: string | null,"parceiro_id"?: string | null,"parcela_numero"?: number | null,"parcela_total"?: number | null,"status"?: Database["public"]['Enums']["status_lancamento"],"tipo": Database["public"]['Enums']["tipo_lancamento"],"transferencia_id"?: string | null,"usuario_id"?: string | null,"valor": number,"veiculo_id"?: string | null,"venda_id"?: string | null
                  }
                  Update: {
                    "atualizado_em"?: string,"atualizado_por"?: string | null,"categoria_id"?: string,"cliente_id"?: string | null,"comissao_id"?: string | null,"conciliado"?: boolean,"consignante_id"?: string | null,"conta_id"?: string | null,"criado_em"?: string,"criado_por"?: string | null,"custo_veiculo_id"?: string | null,"data_competencia"?: string,"data_pagamento"?: string | null,"data_vencimento"?: string,"descricao"?: string,"extrato_transacao_id"?: string | null,"forma_pagamento"?: Database["public"]['Enums']["forma_pagamento"] | null,"fornecedor_id"?: string | null,"garantia_acionamento_id"?: string | null,"grupo_parcelas"?: string | null,"id"?: string,"nota_fiscal_id"?: string | null,"observacoes"?: string | null,"parceiro_id"?: string | null,"parcela_numero"?: number | null,"parcela_total"?: number | null,"status"?: Database["public"]['Enums']["status_lancamento"],"tipo"?: Database["public"]['Enums']["tipo_lancamento"],"transferencia_id"?: string | null,"usuario_id"?: string | null,"valor"?: number,"veiculo_id"?: string | null,"venda_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "lancamentos_categoria_id_fkey"
      columns: ["categoria_id"]
isOneToOne: false
      referencedRelation: "categorias_financeiras"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lancamentos_cliente_id_fkey"
      columns: ["cliente_id"]
isOneToOne: false
      referencedRelation: "clientes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lancamentos_cliente_id_fkey"
      columns: ["cliente_id"]
isOneToOne: false
      referencedRelation: "v_clientes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lancamentos_comissao_fk"
      columns: ["comissao_id"]
isOneToOne: false
      referencedRelation: "comissoes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lancamentos_consignante_id_fkey"
      columns: ["consignante_id"]
isOneToOne: false
      referencedRelation: "consignantes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lancamentos_conta_id_fkey"
      columns: ["conta_id"]
isOneToOne: false
      referencedRelation: "contas_financeiras"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lancamentos_conta_id_fkey"
      columns: ["conta_id"]
isOneToOne: false
      referencedRelation: "v_saldos_contas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lancamentos_custo_veiculo_id_fkey"
      columns: ["custo_veiculo_id"]
isOneToOne: false
      referencedRelation: "custos_veiculo"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lancamentos_extrato_fk"
      columns: ["extrato_transacao_id"]
isOneToOne: false
      referencedRelation: "extratos_transacoes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lancamentos_extrato_fk"
      columns: ["extrato_transacao_id"]
isOneToOne: false
      referencedRelation: "v_extrato"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lancamentos_fornecedor_id_fkey"
      columns: ["fornecedor_id"]
isOneToOne: false
      referencedRelation: "fornecedores"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lancamentos_garantia_fk"
      columns: ["garantia_acionamento_id"]
isOneToOne: false
      referencedRelation: "garantias_acionamentos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lancamentos_nota_fk"
      columns: ["nota_fiscal_id"]
isOneToOne: false
      referencedRelation: "notas_fiscais"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lancamentos_nota_fk"
      columns: ["nota_fiscal_id"]
isOneToOne: false
      referencedRelation: "v_notas_fiscais"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lancamentos_parceiro_id_fkey"
      columns: ["parceiro_id"]
isOneToOne: false
      referencedRelation: "parceiros"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lancamentos_transferencia_id_fkey"
      columns: ["transferencia_id"]
isOneToOne: false
      referencedRelation: "transferencias"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lancamentos_usuario_id_fkey"
      columns: ["usuario_id"]
isOneToOne: false
      referencedRelation: "usuarios"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lancamentos_veiculo_id_fkey"
      columns: ["veiculo_id"]
isOneToOne: false
      referencedRelation: "v_veiculos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lancamentos_veiculo_id_fkey"
      columns: ["veiculo_id"]
isOneToOne: false
      referencedRelation: "v_veiculos_gestao"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lancamentos_veiculo_id_fkey"
      columns: ["veiculo_id"]
isOneToOne: false
      referencedRelation: "veiculos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lancamentos_venda_fk"
      columns: ["venda_id"]
isOneToOne: false
      referencedRelation: "v_lucro_vendas"
      referencedColumns: ["venda_id"]
    },{
      foreignKeyName: "lancamentos_venda_fk"
      columns: ["venda_id"]
isOneToOne: false
      referencedRelation: "v_lucro_vendas_calc"
      referencedColumns: ["venda_id"]
    },{
      foreignKeyName: "lancamentos_venda_fk"
      columns: ["venda_id"]
isOneToOne: false
      referencedRelation: "v_vendas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lancamentos_venda_fk"
      columns: ["venda_id"]
isOneToOne: false
      referencedRelation: "v_vendas_sem_nota"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lancamentos_venda_fk"
      columns: ["venda_id"]
isOneToOne: false
      referencedRelation: "vendas"
      referencedColumns: ["id"]
    }
                  ]
                },"metas": {
                  Row: {
                    "atualizado_em": string,"atualizado_por": string | null,"criado_em": string,"criado_por": string | null,"id": string,"mes": string,"meta_faturamento": number | null,"meta_lucro": number | null,"meta_qtd_vendas": number | null,"observacoes": string | null,"vendedor_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "atualizado_em"?: string,"atualizado_por"?: string | null,"criado_em"?: string,"criado_por"?: string | null,"id"?: string,"mes": string,"meta_faturamento"?: number | null,"meta_lucro"?: number | null,"meta_qtd_vendas"?: number | null,"observacoes"?: string | null,"vendedor_id"?: string | null
                  }
                  Update: {
                    "atualizado_em"?: string,"atualizado_por"?: string | null,"criado_em"?: string,"criado_por"?: string | null,"id"?: string,"mes"?: string,"meta_faturamento"?: number | null,"meta_lucro"?: number | null,"meta_qtd_vendas"?: number | null,"observacoes"?: string | null,"vendedor_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "metas_vendedor_id_fkey"
      columns: ["vendedor_id"]
isOneToOne: false
      referencedRelation: "usuarios"
      referencedColumns: ["id"]
    }
                  ]
                },"notas_fiscais": {
                  Row: {
                    "atualizado_em": string,"atualizado_por": string | null,"cfop": string | null,"chave_acesso": string | null,"cliente_id": string | null,"consignante_id": string | null,"criado_em": string,"criado_por": string | null,"dados": Json | null,"data_emissao": string | null,"destinatario_documento": string | null,"destinatario_nome": string | null,"direcao": Database["public"]['Enums']["direcao_nota"],"emitente_documento": string | null,"emitente_nome": string | null,"fornecedor_id": string | null,"id": string,"modelo": string | null,"motivo_status": string | null,"natureza_operacao": string | null,"numero": string | null,"observacoes": string | null,"origem": Database["public"]['Enums']["origem_nota"],"pdf_arquivo_id": string | null,"pdf_url_externa": string | null,"protocolo": string | null,"provedor": string | null,"provedor_ref": string | null,"serie": string | null,"simulada": boolean,"status": Database["public"]['Enums']["status_nota"],"tipo_documento": Database["public"]['Enums']["tipo_documento_fiscal"],"valor_icms": number | null,"valor_produtos": number | null,"valor_total": number,"veiculo_id": string | null,"venda_id": string | null,"xml_arquivo_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "atualizado_em"?: string,"atualizado_por"?: string | null,"cfop"?: string | null,"chave_acesso"?: string | null,"cliente_id"?: string | null,"consignante_id"?: string | null,"criado_em"?: string,"criado_por"?: string | null,"dados"?: Json | null,"data_emissao"?: string | null,"destinatario_documento"?: string | null,"destinatario_nome"?: string | null,"direcao": Database["public"]['Enums']["direcao_nota"],"emitente_documento"?: string | null,"emitente_nome"?: string | null,"fornecedor_id"?: string | null,"id"?: string,"modelo"?: string | null,"motivo_status"?: string | null,"natureza_operacao"?: string | null,"numero"?: string | null,"observacoes"?: string | null,"origem": Database["public"]['Enums']["origem_nota"],"pdf_arquivo_id"?: string | null,"pdf_url_externa"?: string | null,"protocolo"?: string | null,"provedor"?: string | null,"provedor_ref"?: string | null,"serie"?: string | null,"simulada"?: boolean,"status": Database["public"]['Enums']["status_nota"],"tipo_documento"?: Database["public"]['Enums']["tipo_documento_fiscal"],"valor_icms"?: number | null,"valor_produtos"?: number | null,"valor_total"?: number,"veiculo_id"?: string | null,"venda_id"?: string | null,"xml_arquivo_id"?: string | null
                  }
                  Update: {
                    "atualizado_em"?: string,"atualizado_por"?: string | null,"cfop"?: string | null,"chave_acesso"?: string | null,"cliente_id"?: string | null,"consignante_id"?: string | null,"criado_em"?: string,"criado_por"?: string | null,"dados"?: Json | null,"data_emissao"?: string | null,"destinatario_documento"?: string | null,"destinatario_nome"?: string | null,"direcao"?: Database["public"]['Enums']["direcao_nota"],"emitente_documento"?: string | null,"emitente_nome"?: string | null,"fornecedor_id"?: string | null,"id"?: string,"modelo"?: string | null,"motivo_status"?: string | null,"natureza_operacao"?: string | null,"numero"?: string | null,"observacoes"?: string | null,"origem"?: Database["public"]['Enums']["origem_nota"],"pdf_arquivo_id"?: string | null,"pdf_url_externa"?: string | null,"protocolo"?: string | null,"provedor"?: string | null,"provedor_ref"?: string | null,"serie"?: string | null,"simulada"?: boolean,"status"?: Database["public"]['Enums']["status_nota"],"tipo_documento"?: Database["public"]['Enums']["tipo_documento_fiscal"],"valor_icms"?: number | null,"valor_produtos"?: number | null,"valor_total"?: number,"veiculo_id"?: string | null,"venda_id"?: string | null,"xml_arquivo_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "notas_fiscais_cliente_id_fkey"
      columns: ["cliente_id"]
isOneToOne: false
      referencedRelation: "clientes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notas_fiscais_cliente_id_fkey"
      columns: ["cliente_id"]
isOneToOne: false
      referencedRelation: "v_clientes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notas_fiscais_consignante_id_fkey"
      columns: ["consignante_id"]
isOneToOne: false
      referencedRelation: "consignantes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notas_fiscais_fornecedor_id_fkey"
      columns: ["fornecedor_id"]
isOneToOne: false
      referencedRelation: "fornecedores"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notas_fiscais_pdf_arquivo_id_fkey"
      columns: ["pdf_arquivo_id"]
isOneToOne: false
      referencedRelation: "arquivos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notas_fiscais_veiculo_id_fkey"
      columns: ["veiculo_id"]
isOneToOne: false
      referencedRelation: "v_veiculos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notas_fiscais_veiculo_id_fkey"
      columns: ["veiculo_id"]
isOneToOne: false
      referencedRelation: "v_veiculos_gestao"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notas_fiscais_veiculo_id_fkey"
      columns: ["veiculo_id"]
isOneToOne: false
      referencedRelation: "veiculos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notas_fiscais_venda_id_fkey"
      columns: ["venda_id"]
isOneToOne: false
      referencedRelation: "v_lucro_vendas"
      referencedColumns: ["venda_id"]
    },{
      foreignKeyName: "notas_fiscais_venda_id_fkey"
      columns: ["venda_id"]
isOneToOne: false
      referencedRelation: "v_lucro_vendas_calc"
      referencedColumns: ["venda_id"]
    },{
      foreignKeyName: "notas_fiscais_venda_id_fkey"
      columns: ["venda_id"]
isOneToOne: false
      referencedRelation: "v_vendas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notas_fiscais_venda_id_fkey"
      columns: ["venda_id"]
isOneToOne: false
      referencedRelation: "v_vendas_sem_nota"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notas_fiscais_venda_id_fkey"
      columns: ["venda_id"]
isOneToOne: false
      referencedRelation: "vendas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notas_fiscais_xml_arquivo_id_fkey"
      columns: ["xml_arquivo_id"]
isOneToOne: false
      referencedRelation: "arquivos"
      referencedColumns: ["id"]
    }
                  ]
                },"notas_fiscais_eventos": {
                  Row: {
                    "criado_em": string,"id": number,"mensagem": string | null,"nota_id": string,"payload": Json | null,"protocolo": string | null,"tipo": string,"usuario_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "criado_em"?: string,"id"?: never,"mensagem"?: string | null,"nota_id": string,"payload"?: Json | null,"protocolo"?: string | null,"tipo": string,"usuario_id"?: string | null
                  }
                  Update: {
                    "criado_em"?: string,"id"?: never,"mensagem"?: string | null,"nota_id"?: string,"payload"?: Json | null,"protocolo"?: string | null,"tipo"?: string,"usuario_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "notas_fiscais_eventos_nota_id_fkey"
      columns: ["nota_id"]
isOneToOne: false
      referencedRelation: "notas_fiscais"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notas_fiscais_eventos_nota_id_fkey"
      columns: ["nota_id"]
isOneToOne: false
      referencedRelation: "v_notas_fiscais"
      referencedColumns: ["id"]
    }
                  ]
                },"notas_fiscais_itens": {
                  Row: {
                    "atualizado_em": string,"atualizado_por": string | null,"cfop": string | null,"chassi": string | null,"codigo": string | null,"criado_em": string,"criado_por": string | null,"dados_veiculo": Json | null,"descricao": string,"id": string,"ncm": string | null,"nota_id": string,"numero_item": number,"quantidade": number | null,"unidade": string | null,"valor_total": number | null,"valor_unitario": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "atualizado_em"?: string,"atualizado_por"?: string | null,"cfop"?: string | null,"chassi"?: string | null,"codigo"?: string | null,"criado_em"?: string,"criado_por"?: string | null,"dados_veiculo"?: Json | null,"descricao": string,"id"?: string,"ncm"?: string | null,"nota_id": string,"numero_item": number,"quantidade"?: number | null,"unidade"?: string | null,"valor_total"?: number | null,"valor_unitario"?: number | null
                  }
                  Update: {
                    "atualizado_em"?: string,"atualizado_por"?: string | null,"cfop"?: string | null,"chassi"?: string | null,"codigo"?: string | null,"criado_em"?: string,"criado_por"?: string | null,"dados_veiculo"?: Json | null,"descricao"?: string,"id"?: string,"ncm"?: string | null,"nota_id"?: string,"numero_item"?: number,"quantidade"?: number | null,"unidade"?: string | null,"valor_total"?: number | null,"valor_unitario"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "notas_fiscais_itens_nota_id_fkey"
      columns: ["nota_id"]
isOneToOne: false
      referencedRelation: "notas_fiscais"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notas_fiscais_itens_nota_id_fkey"
      columns: ["nota_id"]
isOneToOne: false
      referencedRelation: "v_notas_fiscais"
      referencedColumns: ["id"]
    }
                  ]
                },"open_finance_conexoes": {
                  Row: {
                    "atualizado_em": string,"atualizado_por": string | null,"conta_externa_id": string | null,"conta_id": string | null,"criado_em": string,"criado_por": string | null,"id": string,"item_id": string,"nome": string | null,"provedor": string,"status": string,"ultimo_sync": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "atualizado_em"?: string,"atualizado_por"?: string | null,"conta_externa_id"?: string | null,"conta_id"?: string | null,"criado_em"?: string,"criado_por"?: string | null,"id"?: string,"item_id": string,"nome"?: string | null,"provedor"?: string,"status"?: string,"ultimo_sync"?: string | null
                  }
                  Update: {
                    "atualizado_em"?: string,"atualizado_por"?: string | null,"conta_externa_id"?: string | null,"conta_id"?: string | null,"criado_em"?: string,"criado_por"?: string | null,"id"?: string,"item_id"?: string,"nome"?: string | null,"provedor"?: string,"status"?: string,"ultimo_sync"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "open_finance_conexoes_conta_id_fkey"
      columns: ["conta_id"]
isOneToOne: false
      referencedRelation: "contas_financeiras"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "open_finance_conexoes_conta_id_fkey"
      columns: ["conta_id"]
isOneToOne: false
      referencedRelation: "v_saldos_contas"
      referencedColumns: ["id"]
    }
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
                },"regras_comissao": {
                  Row: {
                    "aplica_a": string,"ativa": boolean,"atualizado_em": string,"atualizado_por": string | null,"base": Database["public"]['Enums']["base_comissao"],"consignante_id": string | null,"criado_em": string,"criado_por": string | null,"id": string,"modo": Database["public"]['Enums']["modo_comissao"],"nome": string,"observacoes": string | null,"parceiro_id": string | null,"percentual": number | null,"piso": number | null,"prioridade": number,"teto": number | null,"tipo": Database["public"]['Enums']["tipo_comissao"],"valor_fixo": number | null,"vendedor_id": string | null,"vigente_ate": string | null,"vigente_desde": string
                  }
                  ComputedFields: never
                  Insert: {
                    "aplica_a"?: string,"ativa"?: boolean,"atualizado_em"?: string,"atualizado_por"?: string | null,"base"?: Database["public"]['Enums']["base_comissao"],"consignante_id"?: string | null,"criado_em"?: string,"criado_por"?: string | null,"id"?: string,"modo": Database["public"]['Enums']["modo_comissao"],"nome": string,"observacoes"?: string | null,"parceiro_id"?: string | null,"percentual"?: number | null,"piso"?: number | null,"prioridade"?: number,"teto"?: number | null,"tipo": Database["public"]['Enums']["tipo_comissao"],"valor_fixo"?: number | null,"vendedor_id"?: string | null,"vigente_ate"?: string | null,"vigente_desde"?: string
                  }
                  Update: {
                    "aplica_a"?: string,"ativa"?: boolean,"atualizado_em"?: string,"atualizado_por"?: string | null,"base"?: Database["public"]['Enums']["base_comissao"],"consignante_id"?: string | null,"criado_em"?: string,"criado_por"?: string | null,"id"?: string,"modo"?: Database["public"]['Enums']["modo_comissao"],"nome"?: string,"observacoes"?: string | null,"parceiro_id"?: string | null,"percentual"?: number | null,"piso"?: number | null,"prioridade"?: number,"teto"?: number | null,"tipo"?: Database["public"]['Enums']["tipo_comissao"],"valor_fixo"?: number | null,"vendedor_id"?: string | null,"vigente_ate"?: string | null,"vigente_desde"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "regras_comissao_consignante_id_fkey"
      columns: ["consignante_id"]
isOneToOne: false
      referencedRelation: "consignantes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "regras_comissao_parceiro_id_fkey"
      columns: ["parceiro_id"]
isOneToOne: false
      referencedRelation: "parceiros"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "regras_comissao_vendedor_id_fkey"
      columns: ["vendedor_id"]
isOneToOne: false
      referencedRelation: "usuarios"
      referencedColumns: ["id"]
    }
                  ]
                },"tarefas": {
                  Row: {
                    "atualizado_em": string,"atualizado_por": string | null,"chave_automatica": string | null,"concluida_em": string | null,"concluida_por": string | null,"criado_em": string,"criado_por": string | null,"descricao": string | null,"entidade": Database["public"]['Enums']["entidade_tarefa"] | null,"entidade_id": string | null,"id": string,"origem": string,"prazo": string | null,"responsavel_id": string | null,"status": Database["public"]['Enums']["status_tarefa"],"titulo": string
                  }
                  ComputedFields: never
                  Insert: {
                    "atualizado_em"?: string,"atualizado_por"?: string | null,"chave_automatica"?: string | null,"concluida_em"?: string | null,"concluida_por"?: string | null,"criado_em"?: string,"criado_por"?: string | null,"descricao"?: string | null,"entidade"?: Database["public"]['Enums']["entidade_tarefa"] | null,"entidade_id"?: string | null,"id"?: string,"origem"?: string,"prazo"?: string | null,"responsavel_id"?: string | null,"status"?: Database["public"]['Enums']["status_tarefa"],"titulo": string
                  }
                  Update: {
                    "atualizado_em"?: string,"atualizado_por"?: string | null,"chave_automatica"?: string | null,"concluida_em"?: string | null,"concluida_por"?: string | null,"criado_em"?: string,"criado_por"?: string | null,"descricao"?: string | null,"entidade"?: Database["public"]['Enums']["entidade_tarefa"] | null,"entidade_id"?: string | null,"id"?: string,"origem"?: string,"prazo"?: string | null,"responsavel_id"?: string | null,"status"?: Database["public"]['Enums']["status_tarefa"],"titulo"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "tarefas_concluida_por_fkey"
      columns: ["concluida_por"]
isOneToOne: false
      referencedRelation: "usuarios"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tarefas_responsavel_id_fkey"
      columns: ["responsavel_id"]
isOneToOne: false
      referencedRelation: "usuarios"
      referencedColumns: ["id"]
    }
                  ]
                },"transferencias": {
                  Row: {
                    "atualizado_em": string,"atualizado_por": string | null,"conta_destino_id": string,"conta_origem_id": string,"criado_em": string,"criado_por": string | null,"data": string,"descricao": string | null,"id": string,"valor": number
                  }
                  ComputedFields: never
                  Insert: {
                    "atualizado_em"?: string,"atualizado_por"?: string | null,"conta_destino_id": string,"conta_origem_id": string,"criado_em"?: string,"criado_por"?: string | null,"data"?: string,"descricao"?: string | null,"id"?: string,"valor": number
                  }
                  Update: {
                    "atualizado_em"?: string,"atualizado_por"?: string | null,"conta_destino_id"?: string,"conta_origem_id"?: string,"criado_em"?: string,"criado_por"?: string | null,"data"?: string,"descricao"?: string | null,"id"?: string,"valor"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "transferencias_conta_destino_id_fkey"
      columns: ["conta_destino_id"]
isOneToOne: false
      referencedRelation: "contas_financeiras"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "transferencias_conta_destino_id_fkey"
      columns: ["conta_destino_id"]
isOneToOne: false
      referencedRelation: "v_saldos_contas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "transferencias_conta_origem_id_fkey"
      columns: ["conta_origem_id"]
isOneToOne: false
      referencedRelation: "contas_financeiras"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "transferencias_conta_origem_id_fkey"
      columns: ["conta_origem_id"]
isOneToOne: false
      referencedRelation: "v_saldos_contas"
      referencedColumns: ["id"]
    }
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
    },{
      foreignKeyName: "veiculos_sigilo_venda_origem_fk"
      columns: ["venda_origem_id"]
isOneToOne: false
      referencedRelation: "v_lucro_vendas"
      referencedColumns: ["venda_id"]
    },{
      foreignKeyName: "veiculos_sigilo_venda_origem_fk"
      columns: ["venda_origem_id"]
isOneToOne: false
      referencedRelation: "v_lucro_vendas_calc"
      referencedColumns: ["venda_id"]
    },{
      foreignKeyName: "veiculos_sigilo_venda_origem_fk"
      columns: ["venda_origem_id"]
isOneToOne: false
      referencedRelation: "v_vendas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "veiculos_sigilo_venda_origem_fk"
      columns: ["venda_origem_id"]
isOneToOne: false
      referencedRelation: "v_vendas_sem_nota"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "veiculos_sigilo_venda_origem_fk"
      columns: ["venda_origem_id"]
isOneToOne: false
      referencedRelation: "vendas"
      referencedColumns: ["id"]
    }
                  ]
                },"vendas": {
                  Row: {
                    "abaixo_negociavel": boolean,"aprovada_em": string | null,"aprovada_por": string | null,"atualizado_em": string,"atualizado_por": string | null,"cancelada_em": string | null,"cancelada_por": string | null,"cliente_id": string,"criado_em": string,"criado_por": string | null,"data_venda": string,"garantia_cobertura": string | null,"garantia_dias": number | null,"id": string,"motivo_cancelamento": string | null,"numero": string,"observacoes": string | null,"parceiro_id": string | null,"recebimento_consignado": Database["public"]['Enums']["recebimento_consignado"] | null,"status": Database["public"]['Enums']["status_venda"],"status_veiculo_anterior": Database["public"]['Enums']["status_veiculo"] | null,"tipo_veiculo": Database["public"]['Enums']["tipo_veiculo"] | null,"valor_entrada": number,"valor_venda": number,"veiculo_id": string,"vendedor_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "abaixo_negociavel"?: boolean,"aprovada_em"?: string | null,"aprovada_por"?: string | null,"atualizado_em"?: string,"atualizado_por"?: string | null,"cancelada_em"?: string | null,"cancelada_por"?: string | null,"cliente_id": string,"criado_em"?: string,"criado_por"?: string | null,"data_venda"?: string,"garantia_cobertura"?: string | null,"garantia_dias"?: number | null,"id"?: string,"motivo_cancelamento"?: string | null,"numero"?: string,"observacoes"?: string | null,"parceiro_id"?: string | null,"recebimento_consignado"?: Database["public"]['Enums']["recebimento_consignado"] | null,"status"?: Database["public"]['Enums']["status_venda"],"status_veiculo_anterior"?: Database["public"]['Enums']["status_veiculo"] | null,"tipo_veiculo"?: Database["public"]['Enums']["tipo_veiculo"] | null,"valor_entrada"?: number,"valor_venda": number,"veiculo_id": string,"vendedor_id"?: string
                  }
                  Update: {
                    "abaixo_negociavel"?: boolean,"aprovada_em"?: string | null,"aprovada_por"?: string | null,"atualizado_em"?: string,"atualizado_por"?: string | null,"cancelada_em"?: string | null,"cancelada_por"?: string | null,"cliente_id"?: string,"criado_em"?: string,"criado_por"?: string | null,"data_venda"?: string,"garantia_cobertura"?: string | null,"garantia_dias"?: number | null,"id"?: string,"motivo_cancelamento"?: string | null,"numero"?: string,"observacoes"?: string | null,"parceiro_id"?: string | null,"recebimento_consignado"?: Database["public"]['Enums']["recebimento_consignado"] | null,"status"?: Database["public"]['Enums']["status_venda"],"status_veiculo_anterior"?: Database["public"]['Enums']["status_veiculo"] | null,"tipo_veiculo"?: Database["public"]['Enums']["tipo_veiculo"] | null,"valor_entrada"?: number,"valor_venda"?: number,"veiculo_id"?: string,"vendedor_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "vendas_aprovada_por_fkey"
      columns: ["aprovada_por"]
isOneToOne: false
      referencedRelation: "usuarios"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "vendas_cancelada_por_fkey"
      columns: ["cancelada_por"]
isOneToOne: false
      referencedRelation: "usuarios"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "vendas_cliente_id_fkey"
      columns: ["cliente_id"]
isOneToOne: false
      referencedRelation: "clientes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "vendas_cliente_id_fkey"
      columns: ["cliente_id"]
isOneToOne: false
      referencedRelation: "v_clientes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "vendas_parceiro_id_fkey"
      columns: ["parceiro_id"]
isOneToOne: false
      referencedRelation: "parceiros"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "vendas_veiculo_id_fkey"
      columns: ["veiculo_id"]
isOneToOne: false
      referencedRelation: "v_veiculos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "vendas_veiculo_id_fkey"
      columns: ["veiculo_id"]
isOneToOne: false
      referencedRelation: "v_veiculos_gestao"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "vendas_veiculo_id_fkey"
      columns: ["veiculo_id"]
isOneToOne: false
      referencedRelation: "veiculos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "vendas_vendedor_id_fkey"
      columns: ["vendedor_id"]
isOneToOne: false
      referencedRelation: "usuarios"
      referencedColumns: ["id"]
    }
                  ]
                },"vendas_pagamentos": {
                  Row: {
                    "atualizado_em": string,"atualizado_por": string | null,"banco_financiamento": string | null,"conta_id": string | null,"criado_em": string,"criado_por": string | null,"data_prevista": string | null,"forma": Database["public"]['Enums']["forma_pagamento_venda"],"id": string,"lancamento_id": string | null,"observacoes": string | null,"parcelas": number | null,"recebido": boolean,"valor": number,"venda_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "atualizado_em"?: string,"atualizado_por"?: string | null,"banco_financiamento"?: string | null,"conta_id"?: string | null,"criado_em"?: string,"criado_por"?: string | null,"data_prevista"?: string | null,"forma": Database["public"]['Enums']["forma_pagamento_venda"],"id"?: string,"lancamento_id"?: string | null,"observacoes"?: string | null,"parcelas"?: number | null,"recebido"?: boolean,"valor": number,"venda_id": string
                  }
                  Update: {
                    "atualizado_em"?: string,"atualizado_por"?: string | null,"banco_financiamento"?: string | null,"conta_id"?: string | null,"criado_em"?: string,"criado_por"?: string | null,"data_prevista"?: string | null,"forma"?: Database["public"]['Enums']["forma_pagamento_venda"],"id"?: string,"lancamento_id"?: string | null,"observacoes"?: string | null,"parcelas"?: number | null,"recebido"?: boolean,"valor"?: number,"venda_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "vendas_pagamentos_conta_id_fkey"
      columns: ["conta_id"]
isOneToOne: false
      referencedRelation: "contas_financeiras"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "vendas_pagamentos_conta_id_fkey"
      columns: ["conta_id"]
isOneToOne: false
      referencedRelation: "v_saldos_contas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "vendas_pagamentos_lancamento_id_fkey"
      columns: ["lancamento_id"]
isOneToOne: false
      referencedRelation: "lancamentos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "vendas_pagamentos_lancamento_id_fkey"
      columns: ["lancamento_id"]
isOneToOne: false
      referencedRelation: "v_lancamentos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "vendas_pagamentos_venda_id_fkey"
      columns: ["venda_id"]
isOneToOne: false
      referencedRelation: "v_lucro_vendas"
      referencedColumns: ["venda_id"]
    },{
      foreignKeyName: "vendas_pagamentos_venda_id_fkey"
      columns: ["venda_id"]
isOneToOne: false
      referencedRelation: "v_lucro_vendas_calc"
      referencedColumns: ["venda_id"]
    },{
      foreignKeyName: "vendas_pagamentos_venda_id_fkey"
      columns: ["venda_id"]
isOneToOne: false
      referencedRelation: "v_vendas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "vendas_pagamentos_venda_id_fkey"
      columns: ["venda_id"]
isOneToOne: false
      referencedRelation: "v_vendas_sem_nota"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "vendas_pagamentos_venda_id_fkey"
      columns: ["venda_id"]
isOneToOne: false
      referencedRelation: "vendas"
      referencedColumns: ["id"]
    }
                  ]
                },"vendas_trocas": {
                  Row: {
                    "ano_fabricacao": number | null,"ano_modelo": number | null,"atualizado_em": string,"atualizado_por": string | null,"cambio": Database["public"]['Enums']["cambio"] | null,"codigo_fipe": string | null,"combustivel": Database["public"]['Enums']["combustivel"] | null,"cor": string | null,"criado_em": string,"criado_por": string | null,"id": string,"km": number | null,"marca": string,"modelo": string,"motor": string | null,"observacoes": string | null,"placa": string | null,"valor_avaliacao": number,"valor_fipe": number | null,"veiculo_id": string | null,"venda_id": string,"versao": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "ano_fabricacao"?: number | null,"ano_modelo"?: number | null,"atualizado_em"?: string,"atualizado_por"?: string | null,"cambio"?: Database["public"]['Enums']["cambio"] | null,"codigo_fipe"?: string | null,"combustivel"?: Database["public"]['Enums']["combustivel"] | null,"cor"?: string | null,"criado_em"?: string,"criado_por"?: string | null,"id"?: string,"km"?: number | null,"marca": string,"modelo": string,"motor"?: string | null,"observacoes"?: string | null,"placa"?: string | null,"valor_avaliacao": number,"valor_fipe"?: number | null,"veiculo_id"?: string | null,"venda_id": string,"versao"?: string | null
                  }
                  Update: {
                    "ano_fabricacao"?: number | null,"ano_modelo"?: number | null,"atualizado_em"?: string,"atualizado_por"?: string | null,"cambio"?: Database["public"]['Enums']["cambio"] | null,"codigo_fipe"?: string | null,"combustivel"?: Database["public"]['Enums']["combustivel"] | null,"cor"?: string | null,"criado_em"?: string,"criado_por"?: string | null,"id"?: string,"km"?: number | null,"marca"?: string,"modelo"?: string,"motor"?: string | null,"observacoes"?: string | null,"placa"?: string | null,"valor_avaliacao"?: number,"valor_fipe"?: number | null,"veiculo_id"?: string | null,"venda_id"?: string,"versao"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "vendas_trocas_veiculo_id_fkey"
      columns: ["veiculo_id"]
isOneToOne: false
      referencedRelation: "v_veiculos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "vendas_trocas_veiculo_id_fkey"
      columns: ["veiculo_id"]
isOneToOne: false
      referencedRelation: "v_veiculos_gestao"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "vendas_trocas_veiculo_id_fkey"
      columns: ["veiculo_id"]
isOneToOne: false
      referencedRelation: "veiculos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "vendas_trocas_venda_id_fkey"
      columns: ["venda_id"]
isOneToOne: false
      referencedRelation: "v_lucro_vendas"
      referencedColumns: ["venda_id"]
    },{
      foreignKeyName: "vendas_trocas_venda_id_fkey"
      columns: ["venda_id"]
isOneToOne: false
      referencedRelation: "v_lucro_vendas_calc"
      referencedColumns: ["venda_id"]
    },{
      foreignKeyName: "vendas_trocas_venda_id_fkey"
      columns: ["venda_id"]
isOneToOne: false
      referencedRelation: "v_vendas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "vendas_trocas_venda_id_fkey"
      columns: ["venda_id"]
isOneToOne: false
      referencedRelation: "v_vendas_sem_nota"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "vendas_trocas_venda_id_fkey"
      columns: ["venda_id"]
isOneToOne: false
      referencedRelation: "vendas"
      referencedColumns: ["id"]
    }
                  ]
                },"webhook_entregas": {
                  Row: {
                    "criado_em": string,"entregue_em": string | null,"evento_id": number,"evento_tipo": string,"id": number,"proxima_tentativa_em": string,"status": Database["public"]['Enums']["status_entrega"],"tentativas": number,"ultimo_erro": string | null,"ultimo_status_http": number | null,"webhook_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "criado_em"?: string,"entregue_em"?: string | null,"evento_id": number,"evento_tipo": string,"id"?: never,"proxima_tentativa_em"?: string,"status"?: Database["public"]['Enums']["status_entrega"],"tentativas"?: number,"ultimo_erro"?: string | null,"ultimo_status_http"?: number | null,"webhook_id": string
                  }
                  Update: {
                    "criado_em"?: string,"entregue_em"?: string | null,"evento_id"?: number,"evento_tipo"?: string,"id"?: never,"proxima_tentativa_em"?: string,"status"?: Database["public"]['Enums']["status_entrega"],"tentativas"?: number,"ultimo_erro"?: string | null,"ultimo_status_http"?: number | null,"webhook_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "webhook_entregas_evento_id_fkey"
      columns: ["evento_id"]
isOneToOne: false
      referencedRelation: "eventos_saida"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "webhook_entregas_webhook_id_fkey"
      columns: ["webhook_id"]
isOneToOne: false
      referencedRelation: "webhooks"
      referencedColumns: ["id"]
    }
                  ]
                },"webhooks": {
                  Row: {
                    "ativo": boolean,"atualizado_em": string,"atualizado_por": string | null,"criado_em": string,"criado_por": string | null,"eventos": (string)[],"falhas_consecutivas": number,"id": string,"nome": string,"segredo": string,"ultimo_envio_em": string | null,"ultimo_status": number | null,"url": string
                  }
                  ComputedFields: never
                  Insert: {
                    "ativo"?: boolean,"atualizado_em"?: string,"atualizado_por"?: string | null,"criado_em"?: string,"criado_por"?: string | null,"eventos": (string)[],"falhas_consecutivas"?: number,"id"?: string,"nome": string,"segredo": string,"ultimo_envio_em"?: string | null,"ultimo_status"?: number | null,"url": string
                  }
                  Update: {
                    "ativo"?: boolean,"atualizado_em"?: string,"atualizado_por"?: string | null,"criado_em"?: string,"criado_por"?: string | null,"eventos"?: (string)[],"falhas_consecutivas"?: number,"id"?: string,"nome"?: string,"segredo"?: string,"ultimo_envio_em"?: string | null,"ultimo_status"?: number | null,"url"?: string
                  }
                  Relationships: [
                    
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
                },"v_extrato": {
                  Row: {
                    "atualizado_em": string,"atualizado_por": string | null,"conciliado_em": string | null,"conta_id": string,"conta_nome": string,"criado_em": string,"criado_por": string | null,"data": string,"descricao": string,"documento": string | null,"fitid": string | null,"hash": string,"id": string,"importacao_id": string | null,"lancamento_descricao": string | null,"lancamento_id": string | null,"status": Database["public"]['Enums']["status_transacao"],"valor": number
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "extratos_transacoes_conta_id_fkey"
      columns: ["conta_id"]
isOneToOne: false
      referencedRelation: "contas_financeiras"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "extratos_transacoes_conta_id_fkey"
      columns: ["conta_id"]
isOneToOne: false
      referencedRelation: "v_saldos_contas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "extratos_transacoes_importacao_id_fkey"
      columns: ["importacao_id"]
isOneToOne: false
      referencedRelation: "extratos_importacoes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "extratos_transacoes_lancamento_id_fkey"
      columns: ["lancamento_id"]
isOneToOne: false
      referencedRelation: "lancamentos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "extratos_transacoes_lancamento_id_fkey"
      columns: ["lancamento_id"]
isOneToOne: false
      referencedRelation: "v_lancamentos"
      referencedColumns: ["id"]
    }
                  ]
                },"v_garantias": {
                  Row: {
                    "acionamentos_abertos": number | null,"atualizado_em": string,"atualizado_por": string | null,"cancelada": boolean,"cliente_id": string,"cliente_nome": string,"cliente_telefone": string | null,"cliente_whatsapp": string | null,"cobertura": string | null,"criado_em": string,"criado_por": string | null,"custo_total": number | null,"data_fim": string | null,"data_inicio": string,"dias": number,"dias_restantes": number | null,"id": string,"observacoes": string | null,"status": string | null,"veiculo_id": string,"veiculo_nome": string | null,"vence_em_breve": boolean | null,"venda_id": string,"venda_numero": string | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "garantias_cliente_id_fkey"
      columns: ["cliente_id"]
isOneToOne: false
      referencedRelation: "clientes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "garantias_cliente_id_fkey"
      columns: ["cliente_id"]
isOneToOne: false
      referencedRelation: "v_clientes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "garantias_veiculo_id_fkey"
      columns: ["veiculo_id"]
isOneToOne: false
      referencedRelation: "v_veiculos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "garantias_veiculo_id_fkey"
      columns: ["veiculo_id"]
isOneToOne: false
      referencedRelation: "v_veiculos_gestao"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "garantias_veiculo_id_fkey"
      columns: ["veiculo_id"]
isOneToOne: false
      referencedRelation: "veiculos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "garantias_venda_id_fkey"
      columns: ["venda_id"]
isOneToOne: true
      referencedRelation: "v_lucro_vendas"
      referencedColumns: ["venda_id"]
    },{
      foreignKeyName: "garantias_venda_id_fkey"
      columns: ["venda_id"]
isOneToOne: true
      referencedRelation: "v_lucro_vendas_calc"
      referencedColumns: ["venda_id"]
    },{
      foreignKeyName: "garantias_venda_id_fkey"
      columns: ["venda_id"]
isOneToOne: true
      referencedRelation: "v_vendas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "garantias_venda_id_fkey"
      columns: ["venda_id"]
isOneToOne: true
      referencedRelation: "v_vendas_sem_nota"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "garantias_venda_id_fkey"
      columns: ["venda_id"]
isOneToOne: true
      referencedRelation: "vendas"
      referencedColumns: ["id"]
    }
                  ]
                },"v_lancamentos": {
                  Row: {
                    "atualizado_em": string,"atualizado_por": string | null,"categoria_grupo": string,"categoria_id": string,"categoria_nome": string,"cliente_id": string | null,"comissao_id": string | null,"conciliado": boolean,"consignante_id": string | null,"conta_id": string | null,"conta_nome": string | null,"criado_em": string,"criado_por": string | null,"custo_veiculo_id": string | null,"data_competencia": string,"data_pagamento": string | null,"data_vencimento": string,"descricao": string,"extrato_transacao_id": string | null,"forma_pagamento": Database["public"]['Enums']["forma_pagamento"] | null,"fornecedor_id": string | null,"garantia_acionamento_id": string | null,"grupo_parcelas": string | null,"id": string,"natureza": Database["public"]['Enums']["natureza_categoria"],"nota_fiscal_id": string | null,"observacoes": string | null,"parceiro_id": string | null,"parcela_numero": number | null,"parcela_total": number | null,"pessoa": string | null,"status": Database["public"]['Enums']["status_lancamento"],"tipo": Database["public"]['Enums']["tipo_lancamento"],"transferencia_id": string | null,"usuario_id": string | null,"valor": number,"valor_sinal": number | null,"veiculo_id": string | null,"veiculo_nome": string | null,"vencido": boolean | null,"venda_id": string | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "lancamentos_categoria_id_fkey"
      columns: ["categoria_id"]
isOneToOne: false
      referencedRelation: "categorias_financeiras"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lancamentos_cliente_id_fkey"
      columns: ["cliente_id"]
isOneToOne: false
      referencedRelation: "clientes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lancamentos_cliente_id_fkey"
      columns: ["cliente_id"]
isOneToOne: false
      referencedRelation: "v_clientes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lancamentos_comissao_fk"
      columns: ["comissao_id"]
isOneToOne: false
      referencedRelation: "comissoes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lancamentos_consignante_id_fkey"
      columns: ["consignante_id"]
isOneToOne: false
      referencedRelation: "consignantes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lancamentos_conta_id_fkey"
      columns: ["conta_id"]
isOneToOne: false
      referencedRelation: "contas_financeiras"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lancamentos_conta_id_fkey"
      columns: ["conta_id"]
isOneToOne: false
      referencedRelation: "v_saldos_contas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lancamentos_custo_veiculo_id_fkey"
      columns: ["custo_veiculo_id"]
isOneToOne: false
      referencedRelation: "custos_veiculo"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lancamentos_extrato_fk"
      columns: ["extrato_transacao_id"]
isOneToOne: false
      referencedRelation: "extratos_transacoes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lancamentos_extrato_fk"
      columns: ["extrato_transacao_id"]
isOneToOne: false
      referencedRelation: "v_extrato"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lancamentos_fornecedor_id_fkey"
      columns: ["fornecedor_id"]
isOneToOne: false
      referencedRelation: "fornecedores"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lancamentos_garantia_fk"
      columns: ["garantia_acionamento_id"]
isOneToOne: false
      referencedRelation: "garantias_acionamentos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lancamentos_nota_fk"
      columns: ["nota_fiscal_id"]
isOneToOne: false
      referencedRelation: "notas_fiscais"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lancamentos_nota_fk"
      columns: ["nota_fiscal_id"]
isOneToOne: false
      referencedRelation: "v_notas_fiscais"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lancamentos_parceiro_id_fkey"
      columns: ["parceiro_id"]
isOneToOne: false
      referencedRelation: "parceiros"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lancamentos_transferencia_id_fkey"
      columns: ["transferencia_id"]
isOneToOne: false
      referencedRelation: "transferencias"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lancamentos_usuario_id_fkey"
      columns: ["usuario_id"]
isOneToOne: false
      referencedRelation: "usuarios"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lancamentos_veiculo_id_fkey"
      columns: ["veiculo_id"]
isOneToOne: false
      referencedRelation: "v_veiculos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lancamentos_veiculo_id_fkey"
      columns: ["veiculo_id"]
isOneToOne: false
      referencedRelation: "v_veiculos_gestao"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lancamentos_veiculo_id_fkey"
      columns: ["veiculo_id"]
isOneToOne: false
      referencedRelation: "veiculos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lancamentos_venda_fk"
      columns: ["venda_id"]
isOneToOne: false
      referencedRelation: "v_lucro_vendas"
      referencedColumns: ["venda_id"]
    },{
      foreignKeyName: "lancamentos_venda_fk"
      columns: ["venda_id"]
isOneToOne: false
      referencedRelation: "v_lucro_vendas_calc"
      referencedColumns: ["venda_id"]
    },{
      foreignKeyName: "lancamentos_venda_fk"
      columns: ["venda_id"]
isOneToOne: false
      referencedRelation: "v_vendas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lancamentos_venda_fk"
      columns: ["venda_id"]
isOneToOne: false
      referencedRelation: "v_vendas_sem_nota"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lancamentos_venda_fk"
      columns: ["venda_id"]
isOneToOne: false
      referencedRelation: "vendas"
      referencedColumns: ["id"]
    }
                  ]
                },"v_lucro_vendas": {
                  Row: {
                    "comissao_loja": number | null,"comissao_parceiro": number | null,"comissao_vendedor": number | null,"custo_garantia": number | null,"custos": number | null,"custos_cobrados": number | null,"data_venda": string,"numero": string,"tipo_veiculo": Database["public"]['Enums']["tipo_veiculo"] | null,"valor_compra": number | null,"valor_venda": number,"venda_id": string,"vendedor_id": string
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "vendas_vendedor_id_fkey"
      columns: ["vendedor_id"]
isOneToOne: false
      referencedRelation: "usuarios"
      referencedColumns: ["id"]
    }
                  ]
                },"v_lucro_vendas_calc": {
                  Row: {
                    "comissao_loja": number | null,"comissao_parceiro": number | null,"comissao_vendedor": number | null,"custo_garantia": number | null,"custos": number | null,"custos_cobrados": number | null,"data_venda": string,"lucro": number | null,"numero": string,"resultado_apos_garantia": number | null,"tipo_veiculo": Database["public"]['Enums']["tipo_veiculo"] | null,"valor_compra": number | null,"valor_venda": number,"venda_id": string,"vendedor_id": string
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "vendas_vendedor_id_fkey"
      columns: ["vendedor_id"]
isOneToOne: false
      referencedRelation: "usuarios"
      referencedColumns: ["id"]
    }
                  ]
                },"v_notas_fiscais": {
                  Row: {
                    "atualizado_em": string,"atualizado_por": string | null,"cfop": string | null,"chave_acesso": string | null,"cliente_id": string | null,"cliente_nome": string | null,"consignante_id": string | null,"criado_em": string,"criado_por": string | null,"dados": Json | null,"data_emissao": string | null,"destinatario_documento": string | null,"destinatario_nome": string | null,"direcao": Database["public"]['Enums']["direcao_nota"],"emitente_documento": string | null,"emitente_nome": string | null,"fornecedor_id": string | null,"fornecedor_nome": string | null,"id": string,"modelo": string | null,"motivo_status": string | null,"natureza_operacao": string | null,"numero": string | null,"observacoes": string | null,"origem": Database["public"]['Enums']["origem_nota"],"pdf_arquivo_id": string | null,"pdf_url_externa": string | null,"protocolo": string | null,"provedor": string | null,"provedor_ref": string | null,"qtd_itens": number | null,"serie": string | null,"simulada": boolean,"status": Database["public"]['Enums']["status_nota"],"tipo_documento": Database["public"]['Enums']["tipo_documento_fiscal"],"valor_icms": number | null,"valor_produtos": number | null,"valor_total": number,"veiculo_id": string | null,"veiculo_nome": string | null,"venda_id": string | null,"venda_numero": string | null,"xml_arquivo_id": string | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "notas_fiscais_cliente_id_fkey"
      columns: ["cliente_id"]
isOneToOne: false
      referencedRelation: "clientes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notas_fiscais_cliente_id_fkey"
      columns: ["cliente_id"]
isOneToOne: false
      referencedRelation: "v_clientes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notas_fiscais_consignante_id_fkey"
      columns: ["consignante_id"]
isOneToOne: false
      referencedRelation: "consignantes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notas_fiscais_fornecedor_id_fkey"
      columns: ["fornecedor_id"]
isOneToOne: false
      referencedRelation: "fornecedores"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notas_fiscais_pdf_arquivo_id_fkey"
      columns: ["pdf_arquivo_id"]
isOneToOne: false
      referencedRelation: "arquivos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notas_fiscais_veiculo_id_fkey"
      columns: ["veiculo_id"]
isOneToOne: false
      referencedRelation: "v_veiculos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notas_fiscais_veiculo_id_fkey"
      columns: ["veiculo_id"]
isOneToOne: false
      referencedRelation: "v_veiculos_gestao"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notas_fiscais_veiculo_id_fkey"
      columns: ["veiculo_id"]
isOneToOne: false
      referencedRelation: "veiculos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notas_fiscais_venda_id_fkey"
      columns: ["venda_id"]
isOneToOne: false
      referencedRelation: "v_lucro_vendas"
      referencedColumns: ["venda_id"]
    },{
      foreignKeyName: "notas_fiscais_venda_id_fkey"
      columns: ["venda_id"]
isOneToOne: false
      referencedRelation: "v_lucro_vendas_calc"
      referencedColumns: ["venda_id"]
    },{
      foreignKeyName: "notas_fiscais_venda_id_fkey"
      columns: ["venda_id"]
isOneToOne: false
      referencedRelation: "v_vendas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notas_fiscais_venda_id_fkey"
      columns: ["venda_id"]
isOneToOne: false
      referencedRelation: "v_vendas_sem_nota"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notas_fiscais_venda_id_fkey"
      columns: ["venda_id"]
isOneToOne: false
      referencedRelation: "vendas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notas_fiscais_xml_arquivo_id_fkey"
      columns: ["xml_arquivo_id"]
isOneToOne: false
      referencedRelation: "arquivos"
      referencedColumns: ["id"]
    }
                  ]
                },"v_saldos_contas": {
                  Row: {
                    "a_pagar": number | null,"a_receber": number | null,"ativa": boolean,"banco": string | null,"data_saldo_inicial": string,"id": string,"nome": string,"saldo_atual": number | null,"saldo_inicial": number,"tipo": Database["public"]['Enums']["tipo_conta"]
                  }
                  ComputedFields: never
                  Relationships: [
                    
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
      foreignKeyName: "consignacoes_regra_fk"
      columns: ["regra_comissao_id"]
isOneToOne: false
      referencedRelation: "regras_comissao"
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
                },"v_vendas": {
                  Row: {
                    "abaixo_negociavel": boolean,"aprovada_em": string | null,"aprovada_por": string | null,"atualizado_em": string,"atualizado_por": string | null,"cancelada_em": string | null,"cancelada_por": string | null,"cliente_id": string,"cliente_nome": string | null,"criado_em": string,"criado_por": string | null,"data_venda": string,"formas": string | null,"garantia_cobertura": string | null,"garantia_dias": number | null,"id": string,"motivo_cancelamento": string | null,"numero": string,"observacoes": string | null,"parceiro_id": string | null,"qtd_trocas": number | null,"recebimento_consignado": Database["public"]['Enums']["recebimento_consignado"] | null,"status": Database["public"]['Enums']["status_venda"],"status_veiculo_anterior": Database["public"]['Enums']["status_veiculo"] | null,"tipo_veiculo": Database["public"]['Enums']["tipo_veiculo"] | null,"valor_entrada": number,"valor_venda": number,"veiculo_ano": number | null,"veiculo_id": string,"veiculo_nome": string | null,"veiculo_placa": string | null,"vendedor_id": string,"vendedor_nome": string | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "vendas_aprovada_por_fkey"
      columns: ["aprovada_por"]
isOneToOne: false
      referencedRelation: "usuarios"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "vendas_cancelada_por_fkey"
      columns: ["cancelada_por"]
isOneToOne: false
      referencedRelation: "usuarios"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "vendas_cliente_id_fkey"
      columns: ["cliente_id"]
isOneToOne: false
      referencedRelation: "clientes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "vendas_cliente_id_fkey"
      columns: ["cliente_id"]
isOneToOne: false
      referencedRelation: "v_clientes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "vendas_parceiro_id_fkey"
      columns: ["parceiro_id"]
isOneToOne: false
      referencedRelation: "parceiros"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "vendas_veiculo_id_fkey"
      columns: ["veiculo_id"]
isOneToOne: false
      referencedRelation: "v_veiculos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "vendas_veiculo_id_fkey"
      columns: ["veiculo_id"]
isOneToOne: false
      referencedRelation: "v_veiculos_gestao"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "vendas_veiculo_id_fkey"
      columns: ["veiculo_id"]
isOneToOne: false
      referencedRelation: "veiculos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "vendas_vendedor_id_fkey"
      columns: ["vendedor_id"]
isOneToOne: false
      referencedRelation: "usuarios"
      referencedColumns: ["id"]
    }
                  ]
                },"v_vendas_sem_nota": {
                  Row: {
                    "cliente_id": string,"data_venda": string,"id": string,"numero": string,"tipo_veiculo": Database["public"]['Enums']["tipo_veiculo"] | null,"valor_venda": number,"veiculo_id": string
                  }
                  ComputedFields: never
                  Insert: {
                           "cliente_id"?: string | null,"data_venda"?: string | null,"id"?: string | null,"numero"?: string | null,"tipo_veiculo"?: Database["public"]['Enums']["tipo_veiculo"] | null,"valor_venda"?: number | null,"veiculo_id"?: string | null
                         }
                        Update: {
                           "cliente_id"?: string | null,"data_venda"?: string | null,"id"?: string | null,"numero"?: string | null,"tipo_veiculo"?: Database["public"]['Enums']["tipo_veiculo"] | null,"valor_venda"?: number | null,"veiculo_id"?: string | null
                         }
                        Relationships: [
                    {
      foreignKeyName: "vendas_cliente_id_fkey"
      columns: ["cliente_id"]
isOneToOne: false
      referencedRelation: "clientes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "vendas_cliente_id_fkey"
      columns: ["cliente_id"]
isOneToOne: false
      referencedRelation: "v_clientes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "vendas_veiculo_id_fkey"
      columns: ["veiculo_id"]
isOneToOne: false
      referencedRelation: "v_veiculos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "vendas_veiculo_id_fkey"
      columns: ["veiculo_id"]
isOneToOne: false
      referencedRelation: "v_veiculos_gestao"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "vendas_veiculo_id_fkey"
      columns: ["veiculo_id"]
isOneToOne: false
      referencedRelation: "veiculos"
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
"api_registrar_lead":
{ Args: { "p_chave": string,"p_dados": Json }; Returns: Json
                           },
"atualizar_meu_perfil":
{ Args: { "p_nome": string,"p_telefone": string }; Returns: undefined
                           },
"baixar_lancamento":
{ Args: { "p_conta": string,"p_data": string,"p_forma"?: Database["public"]['Enums']["forma_pagamento"],"p_id": string,"p_valor"?: number }; Returns: undefined
                           },
"calcular_valor_comissao":
{ Args: { "p_base": number,"r": Omit<Database["public"]['Tables']["regras_comissao"]['Row'], Database["public"]['Tables']["regras_comissao"]['ComputedFields']> }; Returns: number
                           },
"calcular_venda":
{ Args: { "p_manuais"?: Json,"p_venda": string }; Returns: Json
                           },
"cancelar_venda":
{ Args: { "p_motivo": string,"p_venda": string }; Returns: undefined
                           },
"categoria_sistema":
{ Args: { "p_codigo": string }; Returns: string
                           },
"cliente_comprador":
{ Args: { "p_cliente": string }; Returns: boolean
                           },
"cliente_existe":
{ Args: { "p_telefone": string }; Returns: {
              "cliente_id": string,"e_meu": boolean,"primeiro_nome": string,"vendedor": string
            }[]
                           },
"conciliar_automatico":
{ Args: { "p_conta": string }; Returns: number
                           },
"conciliar_transacao":
{ Args: { "p_lancamento": string,"p_transacao": string }; Returns: undefined
                           },
"criar_lancamento":
{ Args: { "p_dados": Json,"p_parcelas"?: number }; Returns: string
                           },
"desfazer_conciliacao":
{ Args: { "p_transacao": string }; Returns: undefined
                           },
"documento_valido":
{ Args: { "p": string }; Returns: boolean
                           },
"estornar_baixa":
{ Args: { "p_id": string }; Returns: undefined
                           },
"existe_regra_loja":
{ Args: { "p_consignante": string }; Returns: boolean
                           },
"fechar_venda":
{ Args: { "p_manuais"?: Json,"p_venda": string }; Returns: Json
                           },
"gerar_checklist":
{ Args: { "p_tipo": Database["public"]['Enums']["tipo_checklist"],"p_veiculo": string,"p_venda": string }; Returns: undefined
                           },
"hoje":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"ia_geracoes_hoje":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"is_administrativo":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_atendimento":
{ Args: Record<PropertyKey, never>; Returns: boolean
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
"is_preparador":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_vendedor":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"lancar_custo_preparador":
{ Args: { "p_data"?: string,"p_descricao"?: string,"p_tipo": Database["public"]['Enums']["tipo_custo"],"p_valor": number,"p_veiculo": string }; Returns: string
                           },
"lancar_transacao":
{ Args: { "p_categoria": string,"p_descricao"?: string,"p_transacao": string }; Returns: string
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
"meu_dashboard":
{ Args: { "p_mes": string }; Returns: Json
                           },
"minhas_comissoes":
{ Args: Record<PropertyKey, never>; Returns: {
              "data_prevista": string,"data_quitacao": string,"data_venda": string,"id": string,"status": Database["public"]['Enums']["status_comissao"],"valor": number,"veiculo": string,"venda_id": string,"venda_numero": string
            }[]
                           },
"normalizar":
{ Args: { "p": string }; Returns: string
                           },
"numero_venda":
{ Args: { "p_venda": string }; Returns: string
                           },
"papel":
{ Args: Record<PropertyKey, never>; Returns: Database["public"]['Enums']["papel_usuario"]
                           },
"pode_anexar_venda":
{ Args: { "p_venda": string }; Returns: boolean
                           },
"pode_ver_cliente":
{ Args: { "p_cliente": string }; Returns: boolean
                           },
"pode_ver_entidade":
{ Args: { "p_entidade": Database["public"]['Enums']["entidade_arquivo"],"p_id": string,"p_sigiloso": boolean }; Returns: boolean
                           },
"pode_ver_venda":
{ Args: { "p_venda": string }; Returns: boolean
                           },
"preparar_tabela":
{ Args: { "p_ocultar"?: string,"p_pk"?: string,"p_tabela": unknown }; Returns: undefined
                           },
"reenviar_entrega":
{ Args: { "p_entrega": number }; Returns: undefined
                           },
"registrar_evento":
{ Args: { "p_payload": Json,"p_tipo": string }; Returns: undefined
                           },
"resolver_regra":
{ Args: { "p_consignante": string,"p_data": string,"p_parceiro": string,"p_regra_fixa"?: string,"p_tipo": Database["public"]['Enums']["tipo_comissao"],"p_tipo_veiculo": Database["public"]['Enums']["tipo_veiculo"],"p_vendedor": string }; Returns: {
              "aplica_a": string,
"ativa": boolean,
"atualizado_em": string,
"atualizado_por": string | null,
"base": Database["public"]['Enums']["base_comissao"],
"consignante_id": string | null,
"criado_em": string,
"criado_por": string | null,
"id": string,
"modo": Database["public"]['Enums']["modo_comissao"],
"nome": string,
"observacoes": string | null,
"parceiro_id": string | null,
"percentual": number | null,
"piso": number | null,
"prioridade": number,
"teto": number | null,
"tipo": Database["public"]['Enums']["tipo_comissao"],
"valor_fixo": number | null,
"vendedor_id": string | null,
"vigente_ate": string | null,
"vigente_desde": string
            }
                          SetofOptions: {
        from: "*"
        to: "regras_comissao"
        isOneToOne: true
        isSetofReturn: false
      } },
"revelar_dado_pessoal":
{ Args: { "p_campo": string,"p_cliente": string,"p_motivo"?: string }; Returns: string
                           },
"salvar_cliente":
{ Args: { "p_cliente": Json,"p_id": string,"p_pessoais"?: Json }; Returns: string
                           },
"salvar_veiculo":
{ Args: { "p_consignacao"?: Json,"p_id": string,"p_sigilo"?: Json,"p_veiculo": Json }; Returns: string
                           },
"salvar_venda":
{ Args: { "p_id": string,"p_pagamentos": Json,"p_trocas": Json,"p_venda": Json }; Returns: string
                           },
"sugestoes_conciliacao":
{ Args: { "p_transacao": string }; Returns: {
              "conta_id": string,"data": string,"descricao": string,"lancamento_id": string,"pontuacao": number,"status": Database["public"]['Enums']["status_lancamento"],"valor": number
            }[]
                           },
"tem_papel":
{ Args: { "p_papeis": (Database["public"]['Enums']["papel_usuario"])[] }; Returns: boolean
                           },
"testar_webhook":
{ Args: { "p_webhook": string }; Returns: undefined
                           },
"transferir":
{ Args: { "p_data"?: string,"p_descricao"?: string,"p_destino": string,"p_origem": string,"p_valor": number }; Returns: string
                           },
"venda_fechada":
{ Args: { "p_venda": string }; Returns: boolean
                           },
"webhooks_registrar":
{ Args: { "p_entrega": number,"p_erro": string,"p_ok": boolean,"p_status": number }; Returns: undefined
                           },
"webhooks_reservar":
{ Args: { "p_limite"?: number }; Returns: {
              "entrega_id": number,"evento_em": string,"evento_id": number,"payload": Json,"segredo": string,"tentativas": number,"tipo": string,"url": string,"webhook_id": string
            }[]
                           }
          }
          Enums: {
            "base_comissao": "valor_venda"|"comissao_loja"|"lucro","cambio": "manual"|"automatico"|"cvt"|"automatizado","canal_contato": "whatsapp"|"ligacao"|"loja"|"instagram"|"email"|"outro","categoria_arquivo": "foto"|"crlv"|"laudo"|"contrato"|"nf_xml"|"nf_pdf"|"comprovante"|"documento"|"outro"|"termo_ciencia"|"baixa_gravame"|"atpv"|"vistoria"|"comprovante_debitos","combustivel": "flex"|"gasolina"|"etanol"|"diesel"|"gnv"|"hibrido"|"eletrico","direcao_nota": "entrada"|"saida","entidade_arquivo": "veiculo"|"consignacao"|"cliente"|"venda"|"nota"|"extrato"|"garantia"|"lancamento"|"fornecedor"|"consignante","entidade_tarefa": "veiculo"|"venda"|"cliente"|"garantia"|"orcamento","etapa_funil": "lead"|"negociacao"|"ganho"|"perdido","forma_pagamento": "dinheiro"|"pix"|"ted"|"boleto"|"cartao_credito"|"cartao_debito"|"financiamento"|"cheque"|"permuta"|"outro","forma_pagamento_venda": "dinheiro"|"pix"|"ted"|"cartao_credito"|"cartao_debito"|"financiamento"|"boleto"|"cheque","modo_comissao": "percentual"|"fixo","motivo_perda": "preco"|"financiamento_negado"|"comprou_outro_lugar"|"desistiu"|"sem_contato"|"carro_vendido"|"outro","natureza_categoria": "operacional"|"terceiros"|"transferencia"|"estoque","origem_extrato": "ofx"|"csv"|"open_finance","origem_lead": "instagram"|"marketplace"|"olx"|"indicacao"|"loja"|"site"|"whatsapp"|"outro","origem_nota": "xml_importado"|"emitida"|"manual","origem_veiculo": "compra"|"troca"|"consignacao","papel_usuario": "dono"|"gerente"|"vendedor"|"atendimento"|"preparador"|"administrativo","recebimento_consignado": "loja_repassa"|"direto_dono","resultado_laudo": "aprovado"|"aprovado_apontamentos"|"reprovado","status_acionamento": "aberto"|"em_andamento"|"resolvido"|"negado","status_comissao": "pendente"|"quitada"|"cancelada","status_consignacao": "vigente"|"vendido"|"devolvido","status_entrega": "pendente"|"entregue"|"falhou"|"desistiu","status_lancamento": "pendente"|"pago"|"cancelado","status_nota": "importada"|"rascunho"|"processando"|"autorizada"|"rejeitada"|"cancelada"|"denegada","status_tarefa": "pendente"|"em_andamento"|"concluida"|"cancelada","status_transacao": "pendente"|"conciliada"|"ignorada","status_veiculo": "em_preparacao"|"disponivel"|"reservado"|"vendido"|"devolvido","status_venda": "rascunho"|"aguardando_aprovacao"|"fechada"|"cancelada","tipo_checklist": "preparacao"|"documentacao","tipo_comissao": "loja_consignado"|"vendedor"|"parceiro","tipo_conta": "caixa"|"banco"|"carteira_digital","tipo_custo": "funilaria"|"mecanica"|"pintura"|"documentacao"|"lavagem"|"estetica"|"pneus"|"eletrica"|"laudo"|"transporte"|"outros","tipo_documento_fiscal": "nfe"|"nfse","tipo_fornecedor": "locadora"|"lojista"|"particular"|"oficina"|"despachante"|"outro","tipo_geracao_ia": "anuncio"|"cliente","tipo_historico": "pintura"|"reparo"|"sinistro"|"revisao"|"manutencao"|"observacao","tipo_lancamento": "receita"|"despesa"|"transferencia_saida"|"transferencia_entrada","tipo_parceiro": "indicacao"|"corretor"|"outro","tipo_veiculo": "proprio"|"consignado"
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
            "base_comissao": ["valor_venda", "comissao_loja", "lucro"],"cambio": ["manual", "automatico", "cvt", "automatizado"],"canal_contato": ["whatsapp", "ligacao", "loja", "instagram", "email", "outro"],"categoria_arquivo": ["foto", "crlv", "laudo", "contrato", "nf_xml", "nf_pdf", "comprovante", "documento", "outro", "termo_ciencia", "baixa_gravame", "atpv", "vistoria", "comprovante_debitos"],"combustivel": ["flex", "gasolina", "etanol", "diesel", "gnv", "hibrido", "eletrico"],"direcao_nota": ["entrada", "saida"],"entidade_arquivo": ["veiculo", "consignacao", "cliente", "venda", "nota", "extrato", "garantia", "lancamento", "fornecedor", "consignante"],"entidade_tarefa": ["veiculo", "venda", "cliente", "garantia", "orcamento"],"etapa_funil": ["lead", "negociacao", "ganho", "perdido"],"forma_pagamento": ["dinheiro", "pix", "ted", "boleto", "cartao_credito", "cartao_debito", "financiamento", "cheque", "permuta", "outro"],"forma_pagamento_venda": ["dinheiro", "pix", "ted", "cartao_credito", "cartao_debito", "financiamento", "boleto", "cheque"],"modo_comissao": ["percentual", "fixo"],"motivo_perda": ["preco", "financiamento_negado", "comprou_outro_lugar", "desistiu", "sem_contato", "carro_vendido", "outro"],"natureza_categoria": ["operacional", "terceiros", "transferencia", "estoque"],"origem_extrato": ["ofx", "csv", "open_finance"],"origem_lead": ["instagram", "marketplace", "olx", "indicacao", "loja", "site", "whatsapp", "outro"],"origem_nota": ["xml_importado", "emitida", "manual"],"origem_veiculo": ["compra", "troca", "consignacao"],"papel_usuario": ["dono", "gerente", "vendedor", "atendimento", "preparador", "administrativo"],"recebimento_consignado": ["loja_repassa", "direto_dono"],"resultado_laudo": ["aprovado", "aprovado_apontamentos", "reprovado"],"status_acionamento": ["aberto", "em_andamento", "resolvido", "negado"],"status_comissao": ["pendente", "quitada", "cancelada"],"status_consignacao": ["vigente", "vendido", "devolvido"],"status_entrega": ["pendente", "entregue", "falhou", "desistiu"],"status_lancamento": ["pendente", "pago", "cancelado"],"status_nota": ["importada", "rascunho", "processando", "autorizada", "rejeitada", "cancelada", "denegada"],"status_tarefa": ["pendente", "em_andamento", "concluida", "cancelada"],"status_transacao": ["pendente", "conciliada", "ignorada"],"status_veiculo": ["em_preparacao", "disponivel", "reservado", "vendido", "devolvido"],"status_venda": ["rascunho", "aguardando_aprovacao", "fechada", "cancelada"],"tipo_checklist": ["preparacao", "documentacao"],"tipo_comissao": ["loja_consignado", "vendedor", "parceiro"],"tipo_conta": ["caixa", "banco", "carteira_digital"],"tipo_custo": ["funilaria", "mecanica", "pintura", "documentacao", "lavagem", "estetica", "pneus", "eletrica", "laudo", "transporte", "outros"],"tipo_documento_fiscal": ["nfe", "nfse"],"tipo_fornecedor": ["locadora", "lojista", "particular", "oficina", "despachante", "outro"],"tipo_geracao_ia": ["anuncio", "cliente"],"tipo_historico": ["pintura", "reparo", "sinistro", "revisao", "manutencao", "observacao"],"tipo_lancamento": ["receita", "despesa", "transferencia_saida", "transferencia_entrada"],"tipo_parceiro": ["indicacao", "corretor", "outro"],"tipo_veiculo": ["proprio", "consignado"]
          }
        }
} as const
