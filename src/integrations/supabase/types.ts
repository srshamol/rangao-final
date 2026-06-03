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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      blocked_entities: {
        Row: {
          blocked_by: string | null
          created_at: string
          id: string
          reason: string | null
          type: string
          value: string
        }
        Insert: {
          blocked_by?: string | null
          created_at?: string
          id?: string
          reason?: string | null
          type: string
          value: string
        }
        Update: {
          blocked_by?: string | null
          created_at?: string
          id?: string
          reason?: string | null
          type?: string
          value?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          parent_id: string | null
          slug: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          parent_id?: string | null
          slug: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          parent_id?: string | null
          slug?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          code: string
          created_at: string | null
          discount_type: Database["public"]["Enums"]["discount_type"] | null
          discount_value: number
          id: string
          is_active: boolean | null
          max_discount: number | null
          min_order: number | null
          updated_at: string | null
          usage_limit: number | null
          used_count: number | null
          valid_from: string | null
          valid_to: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          discount_type?: Database["public"]["Enums"]["discount_type"] | null
          discount_value?: number
          id?: string
          is_active?: boolean | null
          max_discount?: number | null
          min_order?: number | null
          updated_at?: string | null
          usage_limit?: number | null
          used_count?: number | null
          valid_from?: string | null
          valid_to?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          discount_type?: Database["public"]["Enums"]["discount_type"] | null
          discount_value?: number
          id?: string
          is_active?: boolean | null
          max_discount?: number | null
          min_order?: number | null
          updated_at?: string | null
          usage_limit?: number | null
          used_count?: number | null
          valid_from?: string | null
          valid_to?: string | null
        }
        Relationships: []
      }
      customer_profiles: {
        Row: {
          created_at: string
          default_address: Json | null
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          saved_addresses: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          default_address?: Json | null
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          saved_addresses?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          default_address?: Json | null
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          saved_addresses?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      incomplete_orders: {
        Row: {
          converted_order_id: string | null
          created_at: string
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          form_data: Json | null
          id: string
          ip_address: string | null
          notes: string | null
          page_source: string | null
          product_info: Json | null
          session_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          converted_order_id?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          form_data?: Json | null
          id?: string
          ip_address?: string | null
          notes?: string | null
          page_source?: string | null
          product_info?: Json | null
          session_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          converted_order_id?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          form_data?: Json | null
          id?: string
          ip_address?: string | null
          notes?: string | null
          page_source?: string | null
          product_info?: Json | null
          session_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "incomplete_orders_converted_order_id_fkey"
            columns: ["converted_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_log: {
        Row: {
          created_at: string | null
          id: string
          note: string | null
          product_id: string
          quantity_change: number
          stock_after: number
          stock_before: number
          type: Database["public"]["Enums"]["inventory_type"]
        }
        Insert: {
          created_at?: string | null
          id?: string
          note?: string | null
          product_id: string
          quantity_change: number
          stock_after?: number
          stock_before?: number
          type: Database["public"]["Enums"]["inventory_type"]
        }
        Update: {
          created_at?: string | null
          id?: string
          note?: string | null
          product_id?: string
          quantity_change?: number
          stock_after?: number
          stock_before?: number
          type?: Database["public"]["Enums"]["inventory_type"]
        }
        Relationships: [
          {
            foreignKeyName: "inventory_log_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      order_history: {
        Row: {
          action: string
          created_at: string
          details: string | null
          id: string
          order_id: string
          staff_name: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: string | null
          id?: string
          order_id: string
          staff_name?: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: string | null
          id?: string
          order_id?: string
          staff_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          product_id: string | null
          product_name: string
          quantity: number
          total_price: number
          unit_price: number
        }
        Insert: {
          id?: string
          order_id: string
          product_id?: string | null
          product_name: string
          quantity?: number
          total_price?: number
          unit_price?: number
        }
        Update: {
          id?: string
          order_id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      order_notes: {
        Row: {
          created_at: string
          id: string
          note: string
          order_id: string
          staff_name: string
        }
        Insert: {
          created_at?: string
          id?: string
          note: string
          order_id: string
          staff_name?: string
        }
        Update: {
          created_at?: string
          id?: string
          note?: string
          order_id?: string
          staff_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_notes_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          coupon_code: string | null
          discount_amount: number | null
          created_at: string | null
          customer_email: string | null
          customer_name: string
          customer_phone: string
          delivery_charge: number | null
          fraud_score: number | null
          id: string
          ip_address: string | null
          notes: string | null
          order_number: string
          order_status: Database["public"]["Enums"]["order_status"] | null
          payment_method: string | null
          payment_status: Database["public"]["Enums"]["payment_status"] | null
          shipping_address: Json | null
          subtotal: number | null
          total_amount: number
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          coupon_code?: string | null
          discount_amount?: number | null
          created_at?: string | null
          customer_email?: string | null
          customer_name: string
          customer_phone: string
          delivery_charge?: number | null
          fraud_score?: number | null
          id?: string
          ip_address?: string | null
          notes?: string | null
          order_number: string
          order_status?: Database["public"]["Enums"]["order_status"] | null
          payment_method?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          shipping_address?: Json | null
          subtotal?: number | null
          total_amount?: number
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          coupon_code?: string | null
          discount_amount?: number | null
          created_at?: string | null
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string
          delivery_charge?: number | null
          fraud_score?: number | null
          id?: string
          ip_address?: string | null
          notes?: string | null
          order_number?: string
          order_status?: Database["public"]["Enums"]["order_status"] | null
          payment_method?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          shipping_address?: Json | null
          subtotal?: number | null
          total_amount?: number
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      products: {
        Row: {
          brand: string | null
          category: string
          cost_price: number | null
          created_at: string | null
          description: string | null
          featured: boolean | null
          id: string
          images: string[] | null
          low_stock_alert: number | null
          name: string
          rating: number | null
          regular_price: number
          review_count: number | null
          sale_price: number | null
          short_description: string | null
          sku: string | null
          specifications: Json | null
          status: Database["public"]["Enums"]["product_status"] | null
          stock_quantity: number
          tags: string[] | null
          updated_at: string | null
        }
        Insert: {
          brand?: string | null
          category?: string
          cost_price?: number | null
          created_at?: string | null
          description?: string | null
          featured?: boolean | null
          id?: string
          images?: string[] | null
          low_stock_alert?: number | null
          name: string
          rating?: number | null
          regular_price?: number
          review_count?: number | null
          sale_price?: number | null
          short_description?: string | null
          sku?: string | null
          specifications?: Json | null
          status?: Database["public"]["Enums"]["product_status"] | null
          stock_quantity?: number
          tags?: string[] | null
          updated_at?: string | null
        }
        Update: {
          brand?: string | null
          category?: string
          cost_price?: number | null
          created_at?: string | null
          description?: string | null
          featured?: boolean | null
          id?: string
          images?: string[] | null
          low_stock_alert?: number | null
          name?: string
          rating?: number | null
          regular_price?: number
          review_count?: number | null
          sale_price?: number | null
          short_description?: string | null
          sku?: string | null
          specifications?: Json | null
          status?: Database["public"]["Enums"]["product_status"] | null
          stock_quantity?: number
          tags?: string[] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      store_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wishlists: {
        Row: {
          created_at: string
          id: string
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlists_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "manager"
        | "editor"
        | "sales"
        | "marketing"
        | "accountant"
      discount_type: "percentage" | "flat"
      inventory_type: "sale" | "return" | "stock_in" | "adjustment"
      order_status:
        | "pending"
        | "confirmed"
        | "in_review"
        | "processing"
        | "shipped"
        | "delivered"
        | "cancelled"
        | "courier_cancelled"
      payment_status: "pending" | "completed" | "failed" | "refunded"
      product_status: "active" | "inactive" | "draft"
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
      app_role: [
        "admin",
        "manager",
        "editor",
        "sales",
        "marketing",
        "accountant",
      ],
      discount_type: ["percentage", "flat"],
      inventory_type: ["sale", "return", "stock_in", "adjustment"],
      order_status: [
        "pending",
        "confirmed",
        "in_review",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
        "courier_cancelled",
      ],
      payment_status: ["pending", "completed", "failed", "refunded"],
      product_status: ["active", "inactive", "draft"],
    },
  },
} as const
