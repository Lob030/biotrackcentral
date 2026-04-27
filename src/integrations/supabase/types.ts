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
      lineas_geneticas: {
        Row: {
          color_etiqueta: string | null
          created_at: string
          especie: Database["public"]["Enums"]["especie_type"]
          fecha_registro: string | null
          id: string
          nombre: string
          notas: string | null
          organization_id: string
          origen: string | null
          updated_at: string
        }
        Insert: {
          color_etiqueta?: string | null
          created_at?: string
          especie: Database["public"]["Enums"]["especie_type"]
          fecha_registro?: string | null
          id?: string
          nombre: string
          notas?: string | null
          organization_id: string
          origen?: string | null
          updated_at?: string
        }
        Update: {
          color_etiqueta?: string | null
          created_at?: string
          especie?: Database["public"]["Enums"]["especie_type"]
          fecha_registro?: string | null
          id?: string
          nombre?: string
          notas?: string | null
          organization_id?: string
          origen?: string | null
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
          especie: Database["public"]["Enums"]["especie_type"]
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
          tipo: Database["public"]["Enums"]["lote_tipo"]
          updated_at: string
        }
        Insert: {
          caja_id?: string | null
          cantidad_actual?: number | null
          cantidad_inicial?: number | null
          codigo?: string | null
          created_at?: string
          especie: Database["public"]["Enums"]["especie_type"]
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
          tipo?: Database["public"]["Enums"]["lote_tipo"]
          updated_at?: string
        }
        Update: {
          caja_id?: string | null
          cantidad_actual?: number | null
          cantidad_inicial?: number | null
          codigo?: string | null
          created_at?: string
          especie?: Database["public"]["Enums"]["especie_type"]
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
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          nombre: string
        }
        Insert: {
          created_at?: string
          id?: string
          nombre: string
        }
        Update: {
          created_at?: string
          id?: string
          nombre?: string
        }
        Relationships: []
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
    }
    Enums: {
      app_role: "admin" | "trabajador"
      caja_estado: "libre" | "ocupada" | "limpieza"
      caja_uso: "reproductor" | "engorda"
      especie_type: "ASF" | "Raton" | "Rata"
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
      app_role: ["admin", "trabajador"],
      caja_estado: ["libre", "ocupada", "limpieza"],
      caja_uso: ["reproductor", "engorda"],
      especie_type: ["ASF", "Raton", "Rata"],
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
    },
  },
} as const
