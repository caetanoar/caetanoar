
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
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "atualizar_meu_perfil":
{ Args: { "p_nome": string,"p_telefone": string }; Returns: undefined
                           },
"documento_valido":
{ Args: { "p": string }; Returns: boolean
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
"normalizar":
{ Args: { "p": string }; Returns: string
                           },
"papel":
{ Args: Record<PropertyKey, never>; Returns: Database["public"]['Enums']["papel_usuario"]
                           },
"pode_ver_entidade":
{ Args: { "p_entidade": Database["public"]['Enums']["entidade_arquivo"],"p_id": string,"p_sigiloso": boolean }; Returns: boolean
                           },
"preparar_tabela":
{ Args: { "p_ocultar"?: string,"p_pk"?: string,"p_tabela": unknown }; Returns: undefined
                           }
          }
          Enums: {
            "categoria_arquivo": "foto"|"crlv"|"laudo"|"contrato"|"nf_xml"|"nf_pdf"|"comprovante"|"documento"|"outro","entidade_arquivo": "veiculo"|"consignacao"|"cliente"|"venda"|"nota"|"extrato"|"garantia"|"lancamento"|"fornecedor"|"consignante","papel_usuario": "dono"|"gerente"|"vendedor","tipo_fornecedor": "locadora"|"lojista"|"particular"|"oficina"|"despachante"|"outro","tipo_parceiro": "indicacao"|"corretor"|"outro"
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
            "categoria_arquivo": ["foto", "crlv", "laudo", "contrato", "nf_xml", "nf_pdf", "comprovante", "documento", "outro"],"entidade_arquivo": ["veiculo", "consignacao", "cliente", "venda", "nota", "extrato", "garantia", "lancamento", "fornecedor", "consignante"],"papel_usuario": ["dono", "gerente", "vendedor"],"tipo_fornecedor": ["locadora", "lojista", "particular", "oficina", "despachante", "outro"],"tipo_parceiro": ["indicacao", "corretor", "outro"]
          }
        }
} as const
