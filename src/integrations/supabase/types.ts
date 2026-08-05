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
      ai_memory: {
        Row: {
          created_at: string
          id: string
          memory_key: string
          memory_value: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          memory_key: string
          memory_value: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          memory_key?: string
          memory_value?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_usage: {
        Row: {
          count: number
          created_at: string
          id: string
          kind: string
          updated_at: string
          usage_date: string
          user_id: string
        }
        Insert: {
          count?: number
          created_at?: string
          id?: string
          kind: string
          updated_at?: string
          usage_date?: string
          user_id: string
        }
        Update: {
          count?: number
          created_at?: string
          id?: string
          kind?: string
          updated_at?: string
          usage_date?: string
          user_id?: string
        }
        Relationships: []
      }
      appeals: {
        Row: {
          created_at: string
          id: string
          message: string
          resolved_at: string | null
          status: string
          submitted_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          resolved_at?: string | null
          status?: string
          submitted_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          resolved_at?: string | null
          status?: string
          submitted_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      blocked_chats: {
        Row: {
          chat_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          chat_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          chat_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      gift_codes: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          duration_months: number
          id: string
          is_redeemed: boolean
          plan_tier: string
          redeemed_at: string | null
          redeemed_by: string | null
          tier_expires_at: string | null
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          duration_months?: number
          id?: string
          is_redeemed?: boolean
          plan_tier: string
          redeemed_at?: string | null
          redeemed_by?: string | null
          tier_expires_at?: string | null
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          duration_months?: number
          id?: string
          is_redeemed?: boolean
          plan_tier?: string
          redeemed_at?: string | null
          redeemed_by?: string | null
          tier_expires_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          chat_id: string
          content: string | null
          created_at: string
          id: string
          media_type: string | null
          media_url: string | null
          sender: string
          user_id: string
        }
        Insert: {
          chat_id: string
          content?: string | null
          created_at?: string
          id?: string
          media_type?: string | null
          media_url?: string | null
          sender: string
          user_id: string
        }
        Update: {
          chat_id?: string
          content?: string | null
          created_at?: string
          id?: string
          media_type?: string | null
          media_url?: string | null
          sender?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          ai_credits: number
          avatar_url: string | null
          created_at: string
          display_name: string | null
          frozen_at: string | null
          id: string
          is_admin: boolean
          is_frozen: boolean
          is_suspended: boolean
          nickname: string | null
          onboarded: boolean
          phone: string | null
          spam_reports_count: number
          subscription_expires_at: string | null
          subscription_tier: string
          tier_expires_at: string | null
          updated_at: string
        }
        Insert: {
          ai_credits?: number
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          frozen_at?: string | null
          id: string
          is_admin?: boolean
          is_frozen?: boolean
          is_suspended?: boolean
          nickname?: string | null
          onboarded?: boolean
          phone?: string | null
          spam_reports_count?: number
          subscription_expires_at?: string | null
          subscription_tier?: string
          tier_expires_at?: string | null
          updated_at?: string
        }
        Update: {
          ai_credits?: number
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          frozen_at?: string | null
          id?: string
          is_admin?: boolean
          is_frozen?: boolean
          is_suspended?: boolean
          nickname?: string | null
          onboarded?: boolean
          phone?: string | null
          spam_reports_count?: number
          subscription_expires_at?: string | null
          subscription_tier?: string
          tier_expires_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      purchases: {
        Row: {
          amount_kobo: number
          created_at: string
          id: string
          item_id: string
          item_name: string
          metadata: Json
          reference: string | null
          user_id: string
        }
        Insert: {
          amount_kobo: number
          created_at?: string
          id?: string
          item_id: string
          item_name: string
          metadata?: Json
          reference?: string | null
          user_id: string
        }
        Update: {
          amount_kobo?: number
          created_at?: string
          id?: string
          item_id?: string
          item_name?: string
          metadata?: Json
          reference?: string | null
          user_id?: string
        }
        Relationships: []
      }
      saved_contacts: {
        Row: {
          chat_id: string
          created_at: string
          display_name: string | null
          id: string
          user_id: string
        }
        Insert: {
          chat_id: string
          created_at?: string
          display_name?: string | null
          id?: string
          user_id: string
        }
        Update: {
          chat_id?: string
          created_at?: string
          display_name?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      spam_reports: {
        Row: {
          chat_id: string
          created_at: string
          id: string
          reported_profile_id: string | null
          reporter_id: string
        }
        Insert: {
          chat_id: string
          created_at?: string
          id?: string
          reported_profile_id?: string | null
          reporter_id: string
        }
        Update: {
          chat_id?: string
          created_at?: string
          id?: string
          reported_profile_id?: string | null
          reporter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "spam_reports_reported_profile_id_fkey"
            columns: ["reported_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      unlocked_items: {
        Row: {
          created_at: string
          id: string
          item_id: string
          item_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          item_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          item_type?: string
          user_id?: string
        }
        Relationships: []
      }
      update_views: {
        Row: {
          created_at: string
          id: string
          update_id: string
          viewer_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          update_id: string
          viewer_id: string
        }
        Update: {
          created_at?: string
          id?: string
          update_id?: string
          viewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "update_views_update_id_fkey"
            columns: ["update_id"]
            isOneToOne: false
            referencedRelation: "updates"
            referencedColumns: ["id"]
          },
        ]
      }
      updates: {
        Row: {
          background_color: string | null
          caption: string | null
          created_at: string
          expires_at: string
          id: string
          media_url: string | null
          text_content: string | null
          type: string
          user_id: string
        }
        Insert: {
          background_color?: string | null
          caption?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          media_url?: string | null
          text_content?: string | null
          type: string
          user_id: string
        }
        Update: {
          background_color?: string | null
          caption?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          media_url?: string | null
          text_content?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_set_tier: {
        Args: { _months?: number; _target: string; _tier: string }
        Returns: boolean
      }
      admin_unfreeze: { Args: { _target: string }; Returns: boolean }
      consume_ai_usage: {
        Args: { _daily_limit: number; _kind: string; _monthly_limit?: number }
        Returns: Json
      }
      expire_my_tier: { Args: never; Returns: boolean }
      generate_gift_code: {
        Args: { _duration_months: number; _plan_tier: string }
        Returns: string
      }
      is_spam_immune: { Args: { _user_id: string }; Returns: boolean }
      is_swift_admin: { Args: { _user_id: string }; Returns: boolean }
      phone_account_slots: { Args: { _phone: string }; Returns: number }
      process_freeze_appeals: { Args: { _user_id: string }; Returns: boolean }
      process_my_freeze_appeal: { Args: never; Returns: boolean }
      redeem_gift_code: { Args: { _code: string }; Returns: Json }
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
