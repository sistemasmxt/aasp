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
      admin_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          record_id: string | null
          table_name: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          record_id?: string | null
          table_name: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          record_id?: string | null
          table_name?: string
          user_id?: string
        }
        Relationships: []
      }
      admin_notifications: {
        Row: {
          created_at: string
          details: Json | null
          id: string
          is_read: boolean
          message: string
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          details?: Json | null
          id?: string
          is_read?: boolean
          message: string
          type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          details?: Json | null
          id?: string
          is_read?: boolean
          message?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      anonymous_reports: {
        Row: {
          created_at: string
          description: string
          id: string
          image_url: string | null
          latitude: number | null
          location_description: string | null
          longitude: number | null
          report_type: string
          reporter_user_id: string | null
          status: Database["public"]["Enums"]["report_status_enum"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          image_url?: string | null
          latitude?: number | null
          location_description?: string | null
          longitude?: number | null
          report_type: string
          reporter_user_id?: string | null
          status?: Database["public"]["Enums"]["report_status_enum"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          image_url?: string | null
          latitude?: number | null
          location_description?: string | null
          longitude?: number | null
          report_type?: string
          reporter_user_id?: string | null
          status?: Database["public"]["Enums"]["report_status_enum"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "anonymous_reports_reporter_user_id_fkey"
            columns: ["reporter_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      attachments: {
        Row: {
          created_at: string
          file_size: number | null
          file_type: string
          file_url: string
          id: string
          message_id: string
        }
        Insert: {
          created_at?: string
          file_size?: number | null
          file_type: string
          file_url: string
          id?: string
          message_id: string
        }
        Update: {
          created_at?: string
          file_size?: number | null
          file_type?: string
          file_url?: string
          id?: string
          message_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attachments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      cameras: {
        Row: {
          city: string | null
          created_at: string
          id: string
          ip_address: string
          is_active: boolean
          latitude: number
          longitude: number
          name: string
          neighborhood: string | null
          stream_url: string | null
          street: string | null
          updated_at: string
        }
        Insert: {
          city?: string | null
          created_at?: string
          id?: string
          ip_address: string
          is_active?: boolean
          latitude: number
          longitude: number
          name: string
          neighborhood?: string | null
          stream_url?: string | null
          street?: string | null
          updated_at?: string
        }
        Update: {
          city?: string | null
          created_at?: string
          id?: string
          ip_address?: string
          is_active?: boolean
          latitude?: number
          longitude?: number
          name?: string
          neighborhood?: string | null
          stream_url?: string | null
          street?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      emergency_alerts: {
        Row: {
          alert_type: string
          created_at: string
          id: string
          is_active: boolean
          latitude: number
          longitude: number
          message: string | null
          resolved_at: string | null
          user_id: string
        }
        Insert: {
          alert_type: string
          created_at?: string
          id?: string
          is_active?: boolean
          latitude: number
          longitude: number
          message?: string | null
          resolved_at?: string | null
          user_id: string
        }
        Update: {
          alert_type?: string
          created_at?: string
          id?: string
          is_active?: boolean
          latitude?: number
          longitude?: number
          message?: string | null
          resolved_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      group_members: {
        Row: {
          group_id: string
          id: string
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          group_id: string
          id?: string
          joined_at?: string
          role?: string
          user_id: string
        }
        Update: {
          group_id?: string
          id?: string
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string | null
          created_at: string
          delivered_at: string | null
          group_id: string | null
          id: string
          is_group: boolean
          message_type: string
          read_at: string | null
          receiver_id: string | null
          sender_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          delivered_at?: string | null
          group_id?: string | null
          id?: string
          is_group?: boolean
          message_type: string
          read_at?: string | null
          receiver_id?: string | null
          sender_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          delivered_at?: string | null
          group_id?: string | null
          id?: string
          is_group?: boolean
          message_type?: string
          read_at?: string | null
          receiver_id?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          due_date: string
          id: string
          paid_at: string | null
          payment_type: Database["public"]["Enums"]["payment_type_enum"]
          status: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          due_date: string
          id?: string
          paid_at?: string | null
          payment_type?: Database["public"]["Enums"]["payment_type_enum"]
          status?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          due_date?: string
          id?: string
          paid_at?: string | null
          payment_type?: Database["public"]["Enums"]["payment_type_enum"]
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          created_at: string
          full_name: string
          id: string
          initial_payment_status: Database["public"]["Enums"]["initial_payment_status_enum"]
          is_approved: boolean
          latitude: number | null
          longitude: number | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          created_at?: string
          full_name: string
          id: string
          initial_payment_status?: Database["public"]["Enums"]["initial_payment_status_enum"]
          is_approved?: boolean
          latitude?: number | null
          longitude?: number | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id?: string
          initial_payment_status?: Database["public"]["Enums"]["initial_payment_status_enum"]
          is_approved?: boolean
          latitude?: number | null
          longitude?: number | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      public_utility_contacts: {
        Row: {
          color_class: string
          created_at: string
          description: string | null
          icon_name: string
          id: string
          name: string
          phone: string
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          color_class: string
          created_at?: string
          description?: string | null
          icon_name: string
          id?: string
          name: string
          phone: string
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          color_class?: string
          created_at?: string
          description?: string | null
          icon_name?: string
          id?: string
          name?: string
          phone?: string
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      sos_pets: {
        Row: {
          breed: string | null
          contact_email: string | null
          contact_phone: string
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          last_seen_location: string | null
          latitude: number | null
          longitude: number | null
          pet_name: string
          species: string
          status: Database["public"]["Enums"]["pet_status_enum"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          breed?: string | null
          contact_email?: string | null
          contact_phone: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          last_seen_location?: string | null
          latitude?: number | null
          longitude?: number | null
          pet_name: string
          species: string
          status?: Database["public"]["Enums"]["pet_status_enum"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          breed?: string | null
          contact_email?: string | null
          contact_phone?: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          last_seen_location?: string | null
          latitude?: number | null
          longitude?: number | null
          pet_name?: string
          species?: string
          status?: Database["public"]["Enums"]["pet_status_enum"]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sos_pets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      public_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          full_name: string | null
          id: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_group_member: {
        Args: { _group_id: string; _user_id: string }
        Returns: boolean
      }
      "process-payment-notification": { // Renamed Edge Function
        Args: Record<PropertyKey, never>;
        Returns: Json;
      }
      "trigger-full-backup": {
        Args: Record<PropertyKey, never>;
        Returns: Json;
      }
    }
    Enums: {
      app_role: "admin" | "user"
      initial_payment_status_enum: "unpaid" | "pending" | "paid"
      payment_type_enum: "initial" | "recurring"
      pet_status_enum: "missing" | "found" | "resolved"
      report_status_enum: "pending" | "investigating" | "resolved"
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
      app_role: ["admin", "user"],
      initial_payment_status_enum: ["unpaid", "pending", "paid"],
      payment_type_enum: ["initial", "recurring"],
      pet_status_enum: ["missing", "found", "resolved"],
      report_status_enum: ["pending", "investigating", "resolved"],
    },
  },
} as const