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
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      ospiti: {
        Row: {
          cognome: string
          created_at: string
          email: string | null
          id: string
          nome: string
          note: string | null
          telefono: string | null
          updated_at: string
        }
        Insert: {
          cognome: string
          created_at?: string
          email?: string | null
          id?: string
          nome: string
          note?: string | null
          telefono?: string | null
          updated_at?: string
        }
        Update: {
          cognome?: string
          created_at?: string
          email?: string | null
          id?: string
          nome?: string
          note?: string | null
          telefono?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      pagamenti: {
        Row: {
          created_at: string
          data_pagamento: string
          id: string
          importo: number
          metodo_pagamento: string | null
          metodo_pagamento_tipo: string | null
          note: string | null
          prenotazione_id: string
        }
        Insert: {
          created_at?: string
          data_pagamento?: string
          id?: string
          importo: number
          metodo_pagamento?: string | null
          metodo_pagamento_tipo?: string | null
          note?: string | null
          prenotazione_id: string
        }
        Update: {
          created_at?: string
          data_pagamento?: string
          id?: string
          importo?: number
          metodo_pagamento?: string | null
          metodo_pagamento_tipo?: string | null
          note?: string | null
          prenotazione_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pagamenti_prenotazione_id_fkey"
            columns: ["prenotazione_id"]
            isOneToOne: false
            referencedRelation: "prenotazioni"
            referencedColumns: ["id"]
          },
        ]
      }
      prenotazioni: {
        Row: {
          annullata_pioggia: boolean
          campo: number
          created_at: string
          data: string
          data_annullamento_pioggia: string | null
          diurno: boolean
          id: string
          importo: number
          note: string | null
          ora_fine: string
          ora_inizio: string
          ospite_id: string | null
          socio_id: string | null
          stato_pagamento: Database["public"]["Enums"]["stato_pagamento"]
          tipo_campo: Database["public"]["Enums"]["tipo_campo"]
          tipo_prenotazione: Database["public"]["Enums"]["tipo_prenotazione"]
          updated_at: string
        }
        Insert: {
          annullata_pioggia?: boolean
          campo: number
          created_at?: string
          data: string
          data_annullamento_pioggia?: string | null
          diurno: boolean
          id?: string
          importo: number
          note?: string | null
          ora_fine: string
          ora_inizio: string
          ospite_id?: string | null
          socio_id?: string | null
          stato_pagamento?: Database["public"]["Enums"]["stato_pagamento"]
          tipo_campo: Database["public"]["Enums"]["tipo_campo"]
          tipo_prenotazione: Database["public"]["Enums"]["tipo_prenotazione"]
          updated_at?: string
        }
        Update: {
          annullata_pioggia?: boolean
          campo?: number
          created_at?: string
          data?: string
          data_annullamento_pioggia?: string | null
          diurno?: boolean
          id?: string
          importo?: number
          note?: string | null
          ora_fine?: string
          ora_inizio?: string
          ospite_id?: string | null
          socio_id?: string | null
          stato_pagamento?: Database["public"]["Enums"]["stato_pagamento"]
          tipo_campo?: Database["public"]["Enums"]["tipo_campo"]
          tipo_prenotazione?: Database["public"]["Enums"]["tipo_prenotazione"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prenotazioni_ospite_id_fkey"
            columns: ["ospite_id"]
            isOneToOne: false
            referencedRelation: "ospiti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prenotazioni_socio_id_fkey"
            columns: ["socio_id"]
            isOneToOne: false
            referencedRelation: "soci"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          nome: string
          ruolo: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          nome: string
          ruolo?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          nome?: string
          ruolo?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      soci: {
        Row: {
          attivo: boolean
          certificato_medico_scadenza: string | null
          classifica_fitp: string | null
          cognome: string
          created_at: string
          email: string | null
          id: string
          nome: string
          note: string | null
          telefono: string | null
          tipo_socio: Database["public"]["Enums"]["tipo_socio"]
          updated_at: string
        }
        Insert: {
          attivo?: boolean
          certificato_medico_scadenza?: string | null
          classifica_fitp?: string | null
          cognome: string
          created_at?: string
          email?: string | null
          id?: string
          nome: string
          note?: string | null
          telefono?: string | null
          tipo_socio: Database["public"]["Enums"]["tipo_socio"]
          updated_at?: string
        }
        Update: {
          attivo?: boolean
          certificato_medico_scadenza?: string | null
          classifica_fitp?: string | null
          cognome?: string
          created_at?: string
          email?: string | null
          id?: string
          nome?: string
          note?: string | null
          telefono?: string | null
          tipo_socio?: Database["public"]["Enums"]["tipo_socio"]
          updated_at?: string
        }
        Relationships: []
      }
      tariffe: {
        Row: {
          attivo: boolean
          created_at: string
          diurno: boolean
          id: string
          nome: string
          prezzo_mezz_ora: number
          prezzo_ora: number
          soci: boolean
          tipo_campo: Database["public"]["Enums"]["tipo_campo"]
          tipo_prenotazione: Database["public"]["Enums"]["tipo_prenotazione"]
          updated_at: string
        }
        Insert: {
          attivo?: boolean
          created_at?: string
          diurno?: boolean
          id?: string
          nome: string
          prezzo_mezz_ora: number
          prezzo_ora: number
          soci?: boolean
          tipo_campo: Database["public"]["Enums"]["tipo_campo"]
          tipo_prenotazione: Database["public"]["Enums"]["tipo_prenotazione"]
          updated_at?: string
        }
        Update: {
          attivo?: boolean
          created_at?: string
          diurno?: boolean
          id?: string
          nome?: string
          prezzo_mezz_ora?: number
          prezzo_ora?: number
          soci?: boolean
          tipo_campo?: Database["public"]["Enums"]["tipo_campo"]
          tipo_prenotazione?: Database["public"]["Enums"]["tipo_prenotazione"]
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      stato_pagamento: "pagato" | "da_pagare"
      tipo_campo: "scoperto" | "coperto"
      tipo_prenotazione: "singolare" | "doppio" | "corso" | "lezione"
      tipo_socio: "frequentatore" | "non_agonista" | "agonista" | "maestro"
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
      stato_pagamento: ["pagato", "da_pagare"],
      tipo_campo: ["scoperto", "coperto"],
      tipo_prenotazione: ["singolare", "doppio", "corso", "lezione"],
      tipo_socio: ["frequentatore", "non_agonista", "agonista", "maestro"],
    },
  },
} as const
