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
      customer_ledger: {
        Row: {
          created_at: string
          customer_id: number
          deleted_at: string | null
          description: string | null
          entry_date: string
          id: number
          order_id: number | null
          paid_amount: number
          total_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          customer_id: number
          deleted_at?: string | null
          description?: string | null
          entry_date?: string
          id?: never
          order_id?: number | null
          paid_amount?: number
          total_amount?: number
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          customer_id?: number
          deleted_at?: string | null
          description?: string | null
          entry_date?: string
          id?: never
          order_id?: number | null
          paid_amount?: number
          total_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_ledger_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_ledger_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          created_at: string
          deleted_at: string | null
          id: number
          name: string
          phone: string | null
          photo_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: never
          name: string
          phone?: string | null
          photo_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: never
          name?: string
          phone?: string | null
          photo_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_production: {
        Row: {
          chakpate_rate: number
          chakpate_suits: number
          created_at: string
          deleted_at: string | null
          id: number
          notes: string | null
          order_id: number | null
          production_date: string
          rate_per_suit: number
          simple_rate: number
          simple_suits: number
          suits_count: number
          total_amount: number
          updated_at: string
          user_id: string
          worker_id: number | null
        }
        Insert: {
          chakpate_rate?: number
          chakpate_suits?: number
          created_at?: string
          deleted_at?: string | null
          id?: never
          notes?: string | null
          order_id?: number | null
          production_date?: string
          rate_per_suit?: number
          simple_rate?: number
          simple_suits?: number
          suits_count?: number
          total_amount?: number
          updated_at?: string
          user_id?: string
          worker_id?: number | null
        }
        Update: {
          chakpate_rate?: number
          chakpate_suits?: number
          created_at?: string
          deleted_at?: string | null
          id?: never
          notes?: string | null
          order_id?: number | null
          production_date?: string
          rate_per_suit?: number
          simple_rate?: number
          simple_suits?: number
          suits_count?: number
          total_amount?: number
          updated_at?: string
          user_id?: string
          worker_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_production_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory: {
        Row: {
          category: string | null
          created_at: string
          deleted_at: string | null
          id: number
          item_name: string
          low_stock_threshold: number
          notes: string | null
          quantity: number
          unit: string | null
          unit_price: number
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: never
          item_name: string
          low_stock_threshold?: number
          notes?: string | null
          quantity?: number
          unit?: string | null
          unit_price?: number
          updated_at?: string
          user_id?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: never
          item_name?: string
          low_stock_threshold?: number
          notes?: string | null
          quantity?: number
          unit?: string | null
          unit_price?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      invoices: {
        Row: {
          created_at: string
          customer_id: number
          deleted_at: string | null
          id: number
          invoice_date: string
          notes: string | null
          order_id: number | null
          paid_amount: number
          price_per_suit: number
          total_amount: number
          total_suits: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          customer_id: number
          deleted_at?: string | null
          id?: never
          invoice_date?: string
          notes?: string | null
          order_id?: number | null
          paid_amount?: number
          price_per_suit?: number
          total_amount?: number
          total_suits?: number
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          customer_id?: number
          deleted_at?: string | null
          id?: never
          invoice_date?: string
          notes?: string | null
          order_id?: number | null
          paid_amount?: number
          price_per_suit?: number
          total_amount?: number
          total_suits?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      measurements: {
        Row: {
          asteen: string | null
          asteen_description: string | null
          asteen_type: string | null
          chorai: string | null
          collar_size: string | null
          collar_type: string | null
          created_at: string
          cuff_paimaish: string | null
          customer_id: number
          daman: string | null
          deleted_at: string | null
          fabric_image_url: string | null
          id: number
          jeb: string | null
          lambai: string | null
          notes: string | null
          panja: string | null
          shalwar_size: string | null
          tera: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          asteen?: string | null
          asteen_description?: string | null
          asteen_type?: string | null
          chorai?: string | null
          collar_size?: string | null
          collar_type?: string | null
          created_at?: string
          cuff_paimaish?: string | null
          customer_id: number
          daman?: string | null
          deleted_at?: string | null
          fabric_image_url?: string | null
          id?: never
          jeb?: string | null
          lambai?: string | null
          notes?: string | null
          panja?: string | null
          shalwar_size?: string | null
          tera?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          asteen?: string | null
          asteen_description?: string | null
          asteen_type?: string | null
          chorai?: string | null
          collar_size?: string | null
          collar_type?: string | null
          created_at?: string
          cuff_paimaish?: string | null
          customer_id?: number
          daman?: string | null
          deleted_at?: string | null
          fabric_image_url?: string | null
          id?: never
          jeb?: string | null
          lambai?: string | null
          notes?: string | null
          panja?: string | null
          shalwar_size?: string | null
          tera?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "measurements_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          assigned_rate: number
          assigned_worker_id: number | null
          color: string | null
          created_at: string
          customer_id: number
          deleted_at: string | null
          delivery_date: string | null
          design_type: string | null
          fabric_image_url: string | null
          id: number
          instructions: string | null
          notes: string | null
          order_date: string
          paid_amount: number
          status: string
          total_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_rate?: number
          assigned_worker_id?: number | null
          color?: string | null
          created_at?: string
          customer_id: number
          deleted_at?: string | null
          delivery_date?: string | null
          design_type?: string | null
          fabric_image_url?: string | null
          id?: never
          instructions?: string | null
          notes?: string | null
          order_date?: string
          paid_amount?: number
          status?: string
          total_amount?: number
          updated_at?: string
          user_id?: string
        }
        Update: {
          assigned_rate?: number
          assigned_worker_id?: number | null
          color?: string | null
          created_at?: string
          customer_id?: number
          deleted_at?: string | null
          delivery_date?: string | null
          design_type?: string | null
          fabric_image_url?: string | null
          id?: never
          instructions?: string | null
          notes?: string | null
          order_date?: string
          paid_amount?: number
          status?: string
          total_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_assigned_worker_id_fkey"
            columns: ["assigned_worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      worker_ledger: {
        Row: {
          created_at: string
          deleted_at: string | null
          description: string | null
          earned_amount: number
          entry_date: string
          id: number
          paid_amount: number
          updated_at: string
          user_id: string
          worker_id: number
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          earned_amount?: number
          entry_date?: string
          id?: never
          paid_amount?: number
          updated_at?: string
          user_id?: string
          worker_id: number
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          earned_amount?: number
          entry_date?: string
          id?: never
          paid_amount?: number
          updated_at?: string
          user_id?: string
          worker_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "worker_ledger_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      workers: {
        Row: {
          active: boolean
          address: string | null
          created_at: string
          deleted_at: string | null
          id: number
          name: string
          notes: string | null
          phone: string | null
          rate_per_suit: number
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          address?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: never
          name: string
          notes?: string | null
          phone?: string | null
          rate_per_suit?: number
          updated_at?: string
          user_id?: string
        }
        Update: {
          active?: boolean
          address?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: never
          name?: string
          notes?: string | null
          phone?: string | null
          rate_per_suit?: number
          updated_at?: string
          user_id?: string
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
      [_ in never]: never
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
    Enums: {},
  },
} as const
