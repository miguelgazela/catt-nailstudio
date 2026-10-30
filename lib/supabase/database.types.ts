export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      admins: {
        Row: {
          created_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      appointments: {
        Row: {
          cancel_token_hash: string | null;
          cancelled_at: string | null;
          cancelled_by: string | null;
          client_id: string;
          created_at: string;
          ends_at: string;
          id: string;
          note: string | null;
          origin: Database["public"]["Enums"]["appointment_origin"];
          price_cents: number;
          service_id: string;
          starts_at: string;
          status: Database["public"]["Enums"]["appointment_status"];
        };
        ComputedFields: never;
        Insert: {
          cancel_token_hash?: string | null;
          cancelled_at?: string | null;
          cancelled_by?: string | null;
          client_id: string;
          created_at?: string;
          ends_at: string;
          id?: string;
          note?: string | null;
          origin?: Database["public"]["Enums"]["appointment_origin"];
          price_cents: number;
          service_id: string;
          starts_at: string;
          status?: Database["public"]["Enums"]["appointment_status"];
        };
        Update: {
          cancel_token_hash?: string | null;
          cancelled_at?: string | null;
          cancelled_by?: string | null;
          client_id?: string;
          created_at?: string;
          ends_at?: string;
          id?: string;
          note?: string | null;
          origin?: Database["public"]["Enums"]["appointment_origin"];
          price_cents?: number;
          service_id?: string;
          starts_at?: string;
          status?: Database["public"]["Enums"]["appointment_status"];
        };
        Relationships: [
          {
            foreignKeyName: "appointments_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "appointments_service_id_fkey";
            columns: ["service_id"];
            isOneToOne: false;
            referencedRelation: "services";
            referencedColumns: ["id"];
          },
        ];
      };
      audit_log: {
        Row: {
          action: string;
          actor: string | null;
          at: string;
          details: Json | null;
          entity: string;
          entity_id: string | null;
          id: number;
        };
        ComputedFields: never;
        Insert: {
          action: string;
          actor?: string | null;
          at?: string;
          details?: Json | null;
          entity: string;
          entity_id?: string | null;
          id?: never;
        };
        Update: {
          action?: string;
          actor?: string | null;
          at?: string;
          details?: Json | null;
          entity?: string;
          entity_id?: string | null;
          id?: never;
        };
        Relationships: [];
      };
      clients: {
        Row: {
          anonymized_at: string | null;
          blocked: boolean;
          created_at: string;
          email: string | null;
          id: string;
          name: string;
          no_show_count: number;
          notes: string | null;
          phone: string | null;
          user_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          anonymized_at?: string | null;
          blocked?: boolean;
          created_at?: string;
          email?: string | null;
          id?: string;
          name: string;
          no_show_count?: number;
          notes?: string | null;
          phone?: string | null;
          user_id?: string | null;
        };
        Update: {
          anonymized_at?: string | null;
          blocked?: boolean;
          created_at?: string;
          email?: string | null;
          id?: string;
          name?: string;
          no_show_count?: number;
          notes?: string | null;
          phone?: string | null;
          user_id?: string | null;
        };
        Relationships: [];
      };
      services: {
        Row: {
          active: boolean;
          created_at: string;
          description: string;
          id: string;
          name: string;
          photo_url: string | null;
          price_cents: number;
          sort_order: number;
        };
        ComputedFields: never;
        Insert: {
          active?: boolean;
          created_at?: string;
          description?: string;
          id?: string;
          name: string;
          photo_url?: string | null;
          price_cents: number;
          sort_order?: number;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          description?: string;
          id?: string;
          name?: string;
          photo_url?: string | null;
          price_cents?: number;
          sort_order?: number;
        };
        Relationships: [];
      };
      settings: {
        Row: {
          address: string | null;
          cancel_window_hours: number;
          contact_email: string | null;
          contact_phone: string | null;
          id: boolean;
          instagram: string | null;
          max_advance_days: number;
          min_notice_minutes: number;
          policy_text: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          address?: string | null;
          cancel_window_hours?: number;
          contact_email?: string | null;
          contact_phone?: string | null;
          id?: boolean;
          instagram?: string | null;
          max_advance_days?: number;
          min_notice_minutes?: number;
          policy_text?: string;
          updated_at?: string;
        };
        Update: {
          address?: string | null;
          cancel_window_hours?: number;
          contact_email?: string | null;
          contact_phone?: string | null;
          id?: boolean;
          instagram?: string | null;
          max_advance_days?: number;
          min_notice_minutes?: number;
          policy_text?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      time_off: {
        Row: {
          ends_at: string;
          id: string;
          reason: string | null;
          starts_at: string;
        };
        ComputedFields: never;
        Insert: {
          ends_at: string;
          id?: string;
          reason?: string | null;
          starts_at: string;
        };
        Update: {
          ends_at?: string;
          id?: string;
          reason?: string | null;
          starts_at?: string;
        };
        Relationships: [];
      };
      weekly_hours: {
        Row: {
          end_time: string;
          id: string;
          start_time: string;
          weekday: number;
        };
        ComputedFields: never;
        Insert: {
          end_time: string;
          id?: string;
          start_time: string;
          weekday: number;
        };
        Update: {
          end_time?: string;
          id?: string;
          start_time?: string;
          weekday?: number;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      anonymize_client: { Args: { p_client: string }; Returns: undefined };
      available_slots: {
        Args: { p_from: string; p_to: string };
        Returns: {
          starts_at: string;
        }[];
      };
      book_appointment: {
        Args: {
          p_email?: string;
          p_name: string;
          p_phone: string;
          p_service: string;
          p_starts_at: string;
          p_user_id?: string;
        };
        Returns: Json;
      };
      cancel_appointment: {
        Args: { p_appointment?: string; p_token?: string; p_user_id?: string };
        Returns: Json;
      };
      is_admin: { Args: Record<PropertyKey, never>; Returns: boolean };
      rate_limit_hit: {
        Args: { p_key: string; p_limit: number; p_window_seconds: number };
        Returns: boolean;
      };
    };
    Enums: {
      appointment_origin: "online" | "admin";
      appointment_status: "confirmed" | "cancelled" | "no_show" | "done";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      appointment_origin: ["online", "admin"],
      appointment_status: ["confirmed", "cancelled", "no_show", "done"],
    },
  },
} as const;
