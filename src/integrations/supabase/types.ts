export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ai_action_logs: {
        Row: {
          created_at: string
          error: string | null
          id: string
          plan: Json
          prompt: string
          result: Json
          status: string
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          id?: string
          plan?: Json
          prompt: string
          result?: Json
          status?: string
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          error?: string | null
          id?: string
          plan?: Json
          prompt?: string
          result?: Json
          status?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_action_logs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      alertas_personalizadas: {
        Row: {
          activa: boolean
          cada_x_dias: number | null
          condicion_operador: string | null
          condicion_referencia: string | null
          condicion_tipo: string | null
          condicion_valor_1: number | null
          condicion_valor_2: number | null
          created_at: string
          created_by: string | null
          emoji: string
          fecha_dia_mes: number | null
          fecha_tipo: string | null
          fecha_unica: string | null
          id: string
          mensaje: string
          nombre: string
          organization_id: string
          se_repite: boolean
          tipo: string
          ultima_generacion: string | null
          updated_at: string
        }
        Insert: {
          activa?: boolean
          cada_x_dias?: number | null
          condicion_operador?: string | null
          condicion_referencia?: string | null
          condicion_tipo?: string | null
          condicion_valor_1?: number | null
          condicion_valor_2?: number | null
          created_at?: string
          created_by?: string | null
          emoji?: string
          fecha_dia_mes?: number | null
          fecha_tipo?: string | null
          fecha_unica?: string | null
          id?: string
          mensaje: string
          nombre: string
          organization_id: string
          se_repite?: boolean
          tipo: string
          ultima_generacion?: string | null
          updated_at?: string
        }
        Update: {
          activa?: boolean
          cada_x_dias?: number | null
          condicion_operador?: string | null
          condicion_referencia?: string | null
          condicion_tipo?: string | null
          condicion_valor_1?: number | null
          condicion_valor_2?: number | null
          created_at?: string
          created_by?: string | null
          emoji?: string
          fecha_dia_mes?: number | null
          fecha_tipo?: string | null
          fecha_unica?: string | null
          id?: string
          mensaje?: string
          nombre?: string
          organization_id?: string
          se_repite?: boolean
          tipo?: string
          ultima_generacion?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      alertas_sistema_config: {
        Row: {
          activa: boolean
          alerta_key: string
          created_at: string
          id: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          activa?: boolean
          alerta_key: string
          created_at?: string
          id?: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          activa?: boolean
          alerta_key?: string
          created_at?: string
          id?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      cajas: {
        Row: {
          capacidad: number | null
          codigo: string
          created_at: string
          estado: Database["public"]["Enums"]["caja_estado"]
          id: string
          notas: string | null
          organization_id: string
          ubicacion: string | null
          updated_at: string
          uso: Database["public"]["Enums"]["caja_uso"]
        }
        Insert: {
          capacidad?: number | null
          codigo: string
          created_at?: string
          estado?: Database["public"]["Enums"]["caja_estado"]
          id?: string
          notas?: string | null
          organization_id: string
          ubicacion?: string | null
          updated_at?: string
          uso: Database["public"]["Enums"]["caja_uso"]
        }
        Update: {
          capacidad?: number | null
          codigo?: string
          created_at?: string
          estado?: Database["public"]["Enums"]["caja_estado"]
          id?: string
          notas?: string | null
          organization_id?: string
          ubicacion?: string | null
          updated_at?: string
          uso?: Database["public"]["Enums"]["caja_uso"]
        }
        Relationships: [
          {
            foreignKeyName: "cajas_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          ciudad: string | null
          codigo_postal: string | null
          contacto_principal: string | null
          created_at: string
          direccion: string | null
          email: string | null
          estado: string | null
          estado_cliente: Database["public"]["Enums"]["cliente_estado"]
          id: string
          nombre: string
          notas: string | null
          organization_id: string
          pais: string | null
          rfc: string | null
          telefono: string | null
          tipo_cliente: Database["public"]["Enums"]["cliente_tipo"]
          updated_at: string
        }
        Insert: {
          ciudad?: string | null
          codigo_postal?: string | null
          contacto_principal?: string | null
          created_at?: string
          direccion?: string | null
          email?: string | null
          estado?: string | null
          estado_cliente?: Database["public"]["Enums"]["cliente_estado"]
          id?: string
          nombre: string
          notas?: string | null
          organization_id: string
          pais?: string | null
          rfc?: string | null
          telefono?: string | null
          tipo_cliente?: Database["public"]["Enums"]["cliente_tipo"]
          updated_at?: string
        }
        Update: {
          ciudad?: string | null
          codigo_postal?: string | null
          contacto_principal?: string | null
          created_at?: string
          direccion?: string | null
          email?: string | null
          estado?: string | null
          estado_cliente?: Database["public"]["Enums"]["cliente_estado"]
          id?: string
          nombre?: string
          notas?: string | null
          organization_id?: string
          pais?: string | null
          rfc?: string | null
          telefono?: string | null
          tipo_cliente?: Database["public"]["Enums"]["cliente_tipo"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clientes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      gastos: {
        Row: {
          categoria: string
          created_at: string
          descripcion: string
          fecha: string
          id: string
          monto: number
          notas: string | null
          organization_id: string
          proveedor: string | null
          recurrente: boolean
          subcategoria: string | null
          updated_at: string
        }
        Insert: {
          categoria: string
          created_at?: string
          descripcion: string
          fecha?: string
          id?: string
          monto?: number
          notas?: string | null
          organization_id: string
          proveedor?: string | null
          recurrente?: boolean
          subcategoria?: string | null
          updated_at?: string
        }
        Update: {
          categoria?: string
          created_at?: string
          descripcion?: string
          fecha?: string
          id?: string
          monto?: number
          notas?: string | null
          organization_id?: string
          proveedor?: string | null
          recurrente?: boolean
          subcategoria?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gastos_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      growth_classifications: {
        Row: {
          code: string
          created_at: string
          display_name: string
          display_order: number
          id: string
          max_value: number | null
          metadata: Json
          min_value: number | null
          rule_type: string
          species_profile_id: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          display_name: string
          display_order?: number
          id?: string
          max_value?: number | null
          metadata?: Json
          min_value?: number | null
          rule_type?: string
          species_profile_id: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          display_name?: string
          display_order?: number
          id?: string
          max_value?: number | null
          metadata?: Json
          min_value?: number | null
          rule_type?: string
          species_profile_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "growth_classifications_species_profile_id_fkey"
            columns: ["species_profile_id"]
            isOneToOne: false
            referencedRelation: "workspace_species_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lineas_geneticas: {
        Row: {
          color_etiqueta: string | null
          created_at: string
          fecha_registro: string | null
          id: string
          nombre: string
          notas: string | null
          organization_id: string
          origen: string | null
          species_profile_id: string
          updated_at: string
        }
        Insert: {
          color_etiqueta?: string | null
          created_at?: string
          fecha_registro?: string | null
          id?: string
          nombre: string
          notas?: string | null
          organization_id: string
          origen?: string | null
          species_profile_id: string
          updated_at?: string
        }
        Update: {
          color_etiqueta?: string | null
          created_at?: string
          fecha_registro?: string | null
          id?: string
          nombre?: string
          notas?: string | null
          organization_id?: string
          origen?: string | null
          species_profile_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lineas_geneticas_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lineas_geneticas_species_profile_id_fkey"
            columns: ["species_profile_id"]
            isOneToOne: false
            referencedRelation: "workspace_species_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lote_eventos: {
        Row: {
          caja_destino_id: string | null
          cantidad: number
          created_at: string
          created_by: string | null
          fecha: string
          id: string
          lote_id: string
          notas: string | null
          organization_id: string
          precio_unitario: number | null
          tipo: Database["public"]["Enums"]["lote_evento_tipo"]
        }
        Insert: {
          caja_destino_id?: string | null
          cantidad?: number
          created_at?: string
          created_by?: string | null
          fecha?: string
          id?: string
          lote_id: string
          notas?: string | null
          organization_id: string
          precio_unitario?: number | null
          tipo: Database["public"]["Enums"]["lote_evento_tipo"]
        }
        Update: {
          caja_destino_id?: string | null
          cantidad?: number
          created_at?: string
          created_by?: string | null
          fecha?: string
          id?: string
          lote_id?: string
          notas?: string | null
          organization_id?: string
          precio_unitario?: number | null
          tipo?: Database["public"]["Enums"]["lote_evento_tipo"]
        }
        Relationships: []
      }
      lotes: {
        Row: {
          caja_id: string | null
          cantidad_actual: number | null
          cantidad_inicial: number | null
          codigo: string | null
          created_at: string
          estado: Database["public"]["Enums"]["lote_estado"]
          fecha_introduccion_caja: string | null
          fecha_nacimiento: string
          fecha_nacimiento_original: string | null
          hembras: number | null
          id: string
          linea_genetica_id: string | null
          lote_padre_id: string | null
          machos: number | null
          notas: string | null
          organization_id: string
          sexo: Database["public"]["Enums"]["lote_sexo"] | null
          species_profile_id: string
          tipo: Database["public"]["Enums"]["lote_tipo"]
          updated_at: string
        }
        Insert: {
          caja_id?: string | null
          cantidad_actual?: number | null
          cantidad_inicial?: number | null
          codigo?: string | null
          created_at?: string
          estado?: Database["public"]["Enums"]["lote_estado"]
          fecha_introduccion_caja?: string | null
          fecha_nacimiento: string
          fecha_nacimiento_original?: string | null
          hembras?: number | null
          id?: string
          linea_genetica_id?: string | null
          lote_padre_id?: string | null
          machos?: number | null
          notas?: string | null
          organization_id: string
          sexo?: Database["public"]["Enums"]["lote_sexo"] | null
          species_profile_id: string
          tipo?: Database["public"]["Enums"]["lote_tipo"]
          updated_at?: string
        }
        Update: {
          caja_id?: string | null
          cantidad_actual?: number | null
          cantidad_inicial?: number | null
          codigo?: string | null
          created_at?: string
          estado?: Database["public"]["Enums"]["lote_estado"]
          fecha_introduccion_caja?: string | null
          fecha_nacimiento?: string
          fecha_nacimiento_original?: string | null
          hembras?: number | null
          id?: string
          linea_genetica_id?: string | null
          lote_padre_id?: string | null
          machos?: number | null
          notas?: string | null
          organization_id?: string
          sexo?: Database["public"]["Enums"]["lote_sexo"] | null
          species_profile_id?: string
          tipo?: Database["public"]["Enums"]["lote_tipo"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lotes_caja_id_fkey"
            columns: ["caja_id"]
            isOneToOne: false
            referencedRelation: "cajas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lotes_linea_genetica_id_fkey"
            columns: ["linea_genetica_id"]
            isOneToOne: false
            referencedRelation: "lineas_geneticas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lotes_lote_padre_id_fkey"
            columns: ["lote_padre_id"]
            isOneToOne: false
            referencedRelation: "lotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lotes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lotes_species_profile_id_fkey"
            columns: ["species_profile_id"]
            isOneToOne: false
            referencedRelation: "workspace_species_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          logo_url: string | null
          nombre: string
          nombre_bioterio: string | null
          plan: string
          plan_expira_en: string | null
          plan_gratis_trial: boolean
        }
        Insert: {
          created_at?: string
          id?: string
          logo_url?: string | null
          nombre: string
          nombre_bioterio?: string | null
          plan?: string
          plan_expira_en?: string | null
          plan_gratis_trial?: boolean
        }
        Update: {
          created_at?: string
          id?: string
          logo_url?: string | null
          nombre?: string
          nombre_bioterio?: string | null
          plan?: string
          plan_expira_en?: string | null
          plan_gratis_trial?: boolean
        }
        Relationships: []
      }
      pedidos: {
        Row: {
          cliente_id: string
          created_at: string
          estado: Database["public"]["Enums"]["pedido_estado"]
          fecha_entrega_realizada: string | null
          fecha_entrega_solicitada: string | null
          fecha_pedido: string
          id: string
          monto_descuento: number
          notas: string | null
          numero_pedido: string
          organization_id: string
          porcentaje_descuento: number
          subtotal: number
          total: number
          updated_at: string
        }
        Insert: {
          cliente_id: string
          created_at?: string
          estado?: Database["public"]["Enums"]["pedido_estado"]
          fecha_entrega_realizada?: string | null
          fecha_entrega_solicitada?: string | null
          fecha_pedido?: string
          id?: string
          monto_descuento?: number
          notas?: string | null
          numero_pedido: string
          organization_id: string
          porcentaje_descuento?: number
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Update: {
          cliente_id?: string
          created_at?: string
          estado?: Database["public"]["Enums"]["pedido_estado"]
          fecha_entrega_realizada?: string | null
          fecha_entrega_solicitada?: string | null
          fecha_pedido?: string
          id?: string
          monto_descuento?: number
          notas?: string | null
          numero_pedido?: string
          organization_id?: string
          porcentaje_descuento?: number
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pedidos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      pedidos_detalles: {
        Row: {
          cantidad: number
          created_at: string
          especie: string
          etapa: string
          id: string
          pedido_id: string
          precio_unitario: number
          subtotal: number | null
          updated_at: string
        }
        Insert: {
          cantidad?: number
          created_at?: string
          especie: string
          etapa: string
          id?: string
          pedido_id: string
          precio_unitario?: number
          subtotal?: number | null
          updated_at?: string
        }
        Update: {
          cantidad?: number
          created_at?: string
          especie?: string
          etapa?: string
          id?: string
          pedido_id?: string
          precio_unitario?: number
          subtotal?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pedidos_detalles_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_historial: {
        Row: {
          cambiado_por: string | null
          created_at: string
          id: string
          motivo: string | null
          organization_id: string
          plan_anterior: string | null
          plan_nuevo: string
        }
        Insert: {
          cambiado_por?: string | null
          created_at?: string
          id?: string
          motivo?: string | null
          organization_id: string
          plan_anterior?: string | null
          plan_nuevo: string
        }
        Update: {
          cambiado_por?: string | null
          created_at?: string
          id?: string
          motivo?: string | null
          organization_id?: string
          plan_anterior?: string | null
          plan_nuevo?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_historial_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          id: string
          nombre: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id: string
          nombre: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          nombre?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      species_operational_settings: {
        Row: {
          created_at: string
          default_breeding_cycle_days: number | null
          id: string
          lot_tracking_mode: string
          quantity_unit: string
          settings: Json
          species_profile_id: string
          track_breeding: boolean
          track_mortality: boolean
          updated_at: string
          weaning_age_days: number | null
        }
        Insert: {
          created_at?: string
          default_breeding_cycle_days?: number | null
          id?: string
          lot_tracking_mode?: string
          quantity_unit?: string
          settings?: Json
          species_profile_id: string
          track_breeding?: boolean
          track_mortality?: boolean
          updated_at?: string
          weaning_age_days?: number | null
        }
        Update: {
          created_at?: string
          default_breeding_cycle_days?: number | null
          id?: string
          lot_tracking_mode?: string
          quantity_unit?: string
          settings?: Json
          species_profile_id?: string
          track_breeding?: boolean
          track_mortality?: boolean
          updated_at?: string
          weaning_age_days?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "species_operational_settings_species_profile_id_fkey"
            columns: ["species_profile_id"]
            isOneToOne: true
            referencedRelation: "workspace_species_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      species_pricing_profiles: {
        Row: {
          base_price: number
          created_at: string
          currency: string
          id: string
          is_active: boolean
          pricing_rules: Json
          size_class_id: string | null
          species_profile_id: string
          updated_at: string
        }
        Insert: {
          base_price?: number
          created_at?: string
          currency?: string
          id?: string
          is_active?: boolean
          pricing_rules?: Json
          size_class_id?: string | null
          species_profile_id: string
          updated_at?: string
        }
        Update: {
          base_price?: number
          created_at?: string
          currency?: string
          id?: string
          is_active?: boolean
          pricing_rules?: Json
          size_class_id?: string | null
          species_profile_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "species_pricing_profiles_size_class_id_fkey"
            columns: ["size_class_id"]
            isOneToOne: false
            referencedRelation: "species_size_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "species_pricing_profiles_species_profile_id_fkey"
            columns: ["species_profile_id"]
            isOneToOne: false
            referencedRelation: "workspace_species_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      species_size_classes: {
        Row: {
          code: string
          created_at: string
          display_name: string
          display_order: number
          id: string
          is_default: boolean
          is_sale_eligible: boolean
          max_age_days: number | null
          max_weight_g: number | null
          metadata: Json
          min_age_days: number | null
          min_weight_g: number | null
          species_profile_id: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          display_name: string
          display_order?: number
          id?: string
          is_default?: boolean
          is_sale_eligible?: boolean
          max_age_days?: number | null
          max_weight_g?: number | null
          metadata?: Json
          min_age_days?: number | null
          min_weight_g?: number | null
          species_profile_id: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          display_name?: string
          display_order?: number
          id?: string
          is_default?: boolean
          is_sale_eligible?: boolean
          max_age_days?: number | null
          max_weight_g?: number | null
          metadata?: Json
          min_age_days?: number | null
          min_weight_g?: number | null
          species_profile_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "species_size_classes_species_profile_id_fkey"
            columns: ["species_profile_id"]
            isOneToOne: false
            referencedRelation: "workspace_species_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      workspace_species_profiles: {
        Row: {
          capability_profile: Json
          code: string
          created_at: string
          display_name: string
          id: string
          is_active: boolean
          notes: string | null
          scientific_name: string | null
          taxonomy_class: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          capability_profile?: Json
          code: string
          created_at?: string
          display_name: string
          id?: string
          is_active?: boolean
          notes?: string | null
          scientific_name?: string | null
          taxonomy_class?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          capability_profile?: Json
          code?: string
          created_at?: string
          display_name?: string
          id?: string
          is_active?: boolean
          notes?: string | null
          scientific_name?: string | null
          taxonomy_class?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_species_profiles_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          animal_class: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          organization_id: string
          purpose: string
          species: string | null
          subtype: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          animal_class?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          organization_id: string
          purpose: string
          species?: string | null
          subtype?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          animal_class?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
          purpose?: string
          species?: string | null
          subtype?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspaces_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_org: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      user_owns_species_profile: {
        Args: { _profile_id: string }
        Returns: boolean
      }
      user_owns_workspace: { Args: { _workspace_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "trabajador" | "super_admin"
      caja_estado: "libre" | "ocupada" | "limpieza"
      caja_uso: "reproductor" | "engorda"
      cliente_estado: "activo" | "inactivo" | "bloqueado"
      cliente_tipo:
        | "general"
        | "laboratorio"
        | "centro_investigacion"
        | "veterinario"
      lote_estado: "activo" | "dividido" | "finalizado"
      lote_evento_tipo:
        | "mortalidad"
        | "venta"
        | "traslado_caja"
        | "ajuste"
        | "separacion_sexo"
        | "nota"
      lote_sexo: "machos" | "hembras" | "mixto"
      lote_tipo: "nacimiento" | "engorda" | "reproduccion"
      pedido_estado:
        | "pendiente"
        | "confirmado"
        | "en_preparacion"
        | "listo"
        | "entregado"
        | "cancelado"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

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
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "trabajador", "super_admin"],
      caja_estado: ["libre", "ocupada", "limpieza"],
      caja_uso: ["reproductor", "engorda"],
      cliente_estado: ["activo", "inactivo", "bloqueado"],
      cliente_tipo: [
        "general",
        "laboratorio",
        "centro_investigacion",
        "veterinario",
      ],
      lote_estado: ["activo", "dividido", "finalizado"],
      lote_evento_tipo: [
        "mortalidad",
        "venta",
        "traslado_caja",
        "ajuste",
        "separacion_sexo",
        "nota",
      ],
      lote_sexo: ["machos", "hembras", "mixto"],
      lote_tipo: ["nacimiento", "engorda", "reproduccion"],
      pedido_estado: [
        "pendiente",
        "confirmado",
        "en_preparacion",
        "listo",
        "entregado",
        "cancelado",
      ],
    },
  },
} as const
