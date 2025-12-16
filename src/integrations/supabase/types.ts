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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      auditorias: {
        Row: {
          accion: string
          created_at: string
          detalle: Json | null
          entidad: string | null
          entidad_id: string | null
          id: string
          user_id: string
        }
        Insert: {
          accion: string
          created_at?: string
          detalle?: Json | null
          entidad?: string | null
          entidad_id?: string | null
          id?: string
          user_id: string
        }
        Update: {
          accion?: string
          created_at?: string
          detalle?: Json | null
          entidad?: string | null
          entidad_id?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      cierres_dia: {
        Row: {
          created_at: string
          fecha: string
          id: string
          notas: string | null
          tickets_abiertos: number
          tickets_cancelados: number
          tickets_cerrados: number
          total_cobrado: number
          user_id: string
        }
        Insert: {
          created_at?: string
          fecha: string
          id?: string
          notas?: string | null
          tickets_abiertos?: number
          tickets_cancelados?: number
          tickets_cerrados?: number
          total_cobrado?: number
          user_id: string
        }
        Update: {
          created_at?: string
          fecha?: string
          id?: string
          notas?: string | null
          tickets_abiertos?: number
          tickets_cancelados?: number
          tickets_cerrados?: number
          total_cobrado?: number
          user_id?: string
        }
        Relationships: []
      }
      clientes: {
        Row: {
          codigo_cliente: string | null
          created_at: string
          descuento_porcentaje: number | null
          id: string
          membresia: Database["public"]["Enums"]["tipo_membresia"] | null
          nombre: string
          notas: string | null
          telefono: string | null
          tipo_cliente: Database["public"]["Enums"]["tipo_cliente"]
          updated_at: string
        }
        Insert: {
          codigo_cliente?: string | null
          created_at?: string
          descuento_porcentaje?: number | null
          id?: string
          membresia?: Database["public"]["Enums"]["tipo_membresia"] | null
          nombre: string
          notas?: string | null
          telefono?: string | null
          tipo_cliente?: Database["public"]["Enums"]["tipo_cliente"]
          updated_at?: string
        }
        Update: {
          codigo_cliente?: string | null
          created_at?: string
          descuento_porcentaje?: number | null
          id?: string
          membresia?: Database["public"]["Enums"]["tipo_membresia"] | null
          nombre?: string
          notas?: string | null
          telefono?: string | null
          tipo_cliente?: Database["public"]["Enums"]["tipo_cliente"]
          updated_at?: string
        }
        Relationships: []
      }
      pausas_ticket: {
        Row: {
          created_at: string
          fin_pausa: string | null
          id: string
          inicio_pausa: string
          ticket_id: string
        }
        Insert: {
          created_at?: string
          fin_pausa?: string | null
          id?: string
          inicio_pausa?: string
          ticket_id: string
        }
        Update: {
          created_at?: string
          fin_pausa?: string | null
          id?: string
          inicio_pausa?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pausas_ticket_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          activo: boolean
          created_at: string
          email: string
          id: string
          nombre: string
          updated_at: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          email: string
          id: string
          nombre: string
          updated_at?: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          email?: string
          id?: string
          nombre?: string
          updated_at?: string
        }
        Relationships: []
      }
      servicios: {
        Row: {
          activo: boolean
          created_at: string
          descripcion: string | null
          es_renta: boolean
          icono: string | null
          id: string
          maximo_por_ticket: number | null
          nombre: string
          precio: number
          requiere_inventario: boolean
          stock_actual: number | null
          tipo_costo: Database["public"]["Enums"]["tipo_costo"]
          updated_at: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          descripcion?: string | null
          es_renta?: boolean
          icono?: string | null
          id?: string
          maximo_por_ticket?: number | null
          nombre: string
          precio: number
          requiere_inventario?: boolean
          stock_actual?: number | null
          tipo_costo?: Database["public"]["Enums"]["tipo_costo"]
          updated_at?: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          descripcion?: string | null
          es_renta?: boolean
          icono?: string | null
          id?: string
          maximo_por_ticket?: number | null
          nombre?: string
          precio?: number
          requiere_inventario?: boolean
          stock_actual?: number | null
          tipo_costo?: Database["public"]["Enums"]["tipo_costo"]
          updated_at?: string
        }
        Relationships: []
      }
      tarifas_hora: {
        Row: {
          activo: boolean
          aplicable_desde: string | null
          aplicable_hasta: string | null
          created_at: string
          id: string
          minutos_minimos: number
          nombre: string
          precio_por_hora: number
          tipo_redondeo: Database["public"]["Enums"]["tipo_redondeo"]
          updated_at: string
        }
        Insert: {
          activo?: boolean
          aplicable_desde?: string | null
          aplicable_hasta?: string | null
          created_at?: string
          id?: string
          minutos_minimos?: number
          nombre: string
          precio_por_hora: number
          tipo_redondeo?: Database["public"]["Enums"]["tipo_redondeo"]
          updated_at?: string
        }
        Update: {
          activo?: boolean
          aplicable_desde?: string | null
          aplicable_hasta?: string | null
          created_at?: string
          id?: string
          minutos_minimos?: number
          nombre?: string
          precio_por_hora?: number
          tipo_redondeo?: Database["public"]["Enums"]["tipo_redondeo"]
          updated_at?: string
        }
        Relationships: []
      }
      ticket_servicios: {
        Row: {
          cantidad: number
          created_at: string
          id: string
          monto_total: number
          notas: string | null
          precio_unitario: number
          servicio_id: string
          ticket_id: string
        }
        Insert: {
          cantidad?: number
          created_at?: string
          id?: string
          monto_total: number
          notas?: string | null
          precio_unitario: number
          servicio_id: string
          ticket_id: string
        }
        Update: {
          cantidad?: number
          created_at?: string
          id?: string
          monto_total?: number
          notas?: string | null
          precio_unitario?: number
          servicio_id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_servicios_servicio_id_fkey"
            columns: ["servicio_id"]
            isOneToOne: false
            referencedRelation: "servicios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_servicios_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          cliente_id: string
          codigo: string
          created_at: string
          estado: Database["public"]["Enums"]["estado_ticket"]
          hora_entrada: string
          hora_salida: string | null
          id: string
          imprimir_individual: boolean
          metodo_pago: Database["public"]["Enums"]["metodo_pago"] | null
          monto_servicios: number | null
          monto_tiempo: number | null
          monto_total: number | null
          motivo_cancelacion: string | null
          notas: string | null
          operador_entrada_id: string
          operador_salida_id: string | null
          personas: number
          tarifa_hora_id: string
          total_tiempo_cobrado_minutos: number | null
          updated_at: string
        }
        Insert: {
          cliente_id: string
          codigo?: string
          created_at?: string
          estado?: Database["public"]["Enums"]["estado_ticket"]
          hora_entrada?: string
          hora_salida?: string | null
          id?: string
          imprimir_individual?: boolean
          metodo_pago?: Database["public"]["Enums"]["metodo_pago"] | null
          monto_servicios?: number | null
          monto_tiempo?: number | null
          monto_total?: number | null
          motivo_cancelacion?: string | null
          notas?: string | null
          operador_entrada_id: string
          operador_salida_id?: string | null
          personas?: number
          tarifa_hora_id: string
          total_tiempo_cobrado_minutos?: number | null
          updated_at?: string
        }
        Update: {
          cliente_id?: string
          codigo?: string
          created_at?: string
          estado?: Database["public"]["Enums"]["estado_ticket"]
          hora_entrada?: string
          hora_salida?: string | null
          id?: string
          imprimir_individual?: boolean
          metodo_pago?: Database["public"]["Enums"]["metodo_pago"] | null
          monto_servicios?: number | null
          monto_tiempo?: number | null
          monto_total?: number | null
          motivo_cancelacion?: string | null
          notas?: string | null
          operador_entrada_id?: string
          operador_salida_id?: string | null
          personas?: number
          tarifa_hora_id?: string
          total_tiempo_cobrado_minutos?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_tarifa_hora_id_fkey"
            columns: ["tarifa_hora_id"]
            isOneToOne: false
            referencedRelation: "tarifas_hora"
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
          role?: Database["public"]["Enums"]["app_role"]
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
      calcular_tiempo_cobrable: {
        Args: { p_ticket_id: string }
        Returns: {
          costo_tiempo: number
          tiempo_cobrado_minutos: number
          tiempo_real_minutos: number
        }[]
      }
      check_users_exist: { Args: never; Returns: boolean }
      generar_codigo_cliente: { Args: never; Returns: string }
      generar_codigo_ticket: { Args: never; Returns: string }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin_or_higher: { Args: { _user_id: string }; Returns: boolean }
      is_supervisor_or_higher: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "operador" | "supervisor" | "admin" | "root"
      estado_ticket: "activo" | "pausado" | "cerrado" | "cancelado"
      metodo_pago: "efectivo" | "tarjeta" | "transferencia" | "otro"
      tipo_cliente: "regular" | "miembro" | "invitado"
      tipo_costo: "fijo" | "por_tiempo" | "paquete"
      tipo_membresia: "ninguna" | "basica" | "premium" | "vip"
      tipo_redondeo: "arriba" | "abajo" | "estandar"
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
      app_role: ["operador", "supervisor", "admin", "root"],
      estado_ticket: ["activo", "pausado", "cerrado", "cancelado"],
      metodo_pago: ["efectivo", "tarjeta", "transferencia", "otro"],
      tipo_cliente: ["regular", "miembro", "invitado"],
      tipo_costo: ["fijo", "por_tiempo", "paquete"],
      tipo_membresia: ["ninguna", "basica", "premium", "vip"],
      tipo_redondeo: ["arriba", "abajo", "estandar"],
    },
  },
} as const
