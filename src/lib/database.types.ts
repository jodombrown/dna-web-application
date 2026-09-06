// Generated from the canonical Supabase project (dgspjevjoblujcoljvkn) after the B1 migrations.
// Regenerate with the Supabase MCP generate_typescript_types tool or `supabase gen types`.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      connection_requests: {
        Row: {
          created_at: string;
          from_member_id: string;
          id: string;
          status: Database["public"]["Enums"]["request_status"];
          to_member_id: string | null;
          to_name: string;
          why: string | null;
        };
        Insert: {
          created_at?: string;
          from_member_id: string;
          id?: string;
          status?: Database["public"]["Enums"]["request_status"];
          to_member_id?: string | null;
          to_name?: string;
          why?: string | null;
        };
        Update: {
          created_at?: string;
          from_member_id?: string;
          id?: string;
          status?: Database["public"]["Enums"]["request_status"];
          to_member_id?: string | null;
          to_name?: string;
          why?: string | null;
        };
        Relationships: [];
      };
      events: {
        Row: {
          created_at: string;
          ends_at: string | null;
          host_member_id: string;
          id: string;
          location: Json | null;
          mode: Database["public"]["Enums"]["event_mode"];
          space_id: string | null;
          starts_at: string | null;
          ticket_kind: Database["public"]["Enums"]["ticket_kind"];
          title: string;
          virtual_url: string | null;
          when_text: string;
        };
        Insert: {
          created_at?: string;
          ends_at?: string | null;
          host_member_id: string;
          id?: string;
          location?: Json | null;
          mode?: Database["public"]["Enums"]["event_mode"];
          space_id?: string | null;
          starts_at?: string | null;
          ticket_kind?: Database["public"]["Enums"]["ticket_kind"];
          title: string;
          virtual_url?: string | null;
          when_text?: string;
        };
        Update: {
          created_at?: string;
          ends_at?: string | null;
          host_member_id?: string;
          id?: string;
          location?: Json | null;
          mode?: Database["public"]["Enums"]["event_mode"];
          space_id?: string | null;
          starts_at?: string | null;
          ticket_kind?: Database["public"]["Enums"]["ticket_kind"];
          title?: string;
          virtual_url?: string | null;
          when_text?: string;
        };
        Relationships: [
          {
            foreignKeyName: "events_space_id_fkey";
            columns: ["space_id"];
            isOneToOne: false;
            referencedRelation: "spaces";
            referencedColumns: ["id"];
          },
        ];
      };
      opportunities: {
        Row: {
          by_date: string | null;
          by_text: string;
          created_at: string;
          event_id: string | null;
          id: string;
          instrument: Database["public"]["Enums"]["contribute_instrument"];
          need: string | null;
          receiver_member_id: string;
          space_id: string | null;
          title: string;
        };
        Insert: {
          by_date?: string | null;
          by_text?: string;
          created_at?: string;
          event_id?: string | null;
          id?: string;
          instrument: Database["public"]["Enums"]["contribute_instrument"];
          need?: string | null;
          receiver_member_id: string;
          space_id?: string | null;
          title: string;
        };
        Update: {
          by_date?: string | null;
          by_text?: string;
          created_at?: string;
          event_id?: string | null;
          id?: string;
          instrument?: Database["public"]["Enums"]["contribute_instrument"];
          need?: string | null;
          receiver_member_id?: string;
          space_id?: string | null;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "opportunities_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "opportunities_space_id_fkey";
            columns: ["space_id"];
            isOneToOne: false;
            referencedRelation: "spaces";
            referencedColumns: ["id"];
          },
        ];
      };
      post_dia: {
        Row: {
          accepted: boolean;
          confidence: number | null;
          created_at: string;
          id: string;
          latency_ms: number | null;
          member_overrode: boolean;
          post_id: string;
          proposed_fields: Json;
          verb: Database["public"]["Enums"]["c_category"] | null;
        };
        Insert: {
          accepted?: boolean;
          confidence?: number | null;
          created_at?: string;
          id?: string;
          latency_ms?: number | null;
          member_overrode?: boolean;
          post_id: string;
          proposed_fields?: Json;
          verb?: Database["public"]["Enums"]["c_category"] | null;
        };
        Update: {
          accepted?: boolean;
          confidence?: number | null;
          created_at?: string;
          id?: string;
          latency_ms?: number | null;
          member_overrode?: boolean;
          post_id?: string;
          proposed_fields?: Json;
          verb?: Database["public"]["Enums"]["c_category"] | null;
        };
        Relationships: [
          {
            foreignKeyName: "post_dia_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: true;
            referencedRelation: "posts";
            referencedColumns: ["id"];
          },
        ];
      };
      post_drafts: {
        Row: {
          created_at: string;
          host_context: string;
          id: string;
          member_id: string;
          payload: Json;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          host_context: string;
          id?: string;
          member_id: string;
          payload?: Json;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          host_context?: string;
          id?: string;
          member_id?: string;
          payload?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };
      post_links: {
        Row: {
          created_at: string;
          description: string | null;
          fetched_at: string | null;
          id: string;
          image_url: string | null;
          post_id: string;
          title: string | null;
          url: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          fetched_at?: string | null;
          id?: string;
          image_url?: string | null;
          post_id: string;
          title?: string | null;
          url: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          fetched_at?: string | null;
          id?: string;
          image_url?: string | null;
          post_id?: string;
          title?: string | null;
          url?: string;
        };
        Relationships: [
          {
            foreignKeyName: "post_links_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: true;
            referencedRelation: "posts";
            referencedColumns: ["id"];
          },
        ];
      };
      post_media: {
        Row: {
          created_at: string;
          height: number;
          id: string;
          position: number;
          post_id: string;
          storage_path: string;
          width: number;
        };
        Insert: {
          created_at?: string;
          height: number;
          id?: string;
          position?: number;
          post_id: string;
          storage_path: string;
          width: number;
        };
        Update: {
          created_at?: string;
          height?: number;
          id?: string;
          position?: number;
          post_id?: string;
          storage_path?: string;
          width?: number;
        };
        Relationships: [
          {
            foreignKeyName: "post_media_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "posts";
            referencedColumns: ["id"];
          },
        ];
      };
      posts: {
        Row: {
          anchor_id: string | null;
          anchor_kind: Database["public"]["Enums"]["anchor_kind"] | null;
          audience: Database["public"]["Enums"]["audience"];
          author_id: string;
          author_kind: Database["public"]["Enums"]["anchor_kind"];
          body: string;
          c_category: Database["public"]["Enums"]["c_category"];
          created_at: string;
          created_by: string;
          created_object_id: string | null;
          created_object_kind: Database["public"]["Enums"]["anchor_kind"] | null;
          id: string;
          published_at: string | null;
          status: Database["public"]["Enums"]["post_status"];
        };
        Insert: {
          anchor_id?: string | null;
          anchor_kind?: Database["public"]["Enums"]["anchor_kind"] | null;
          audience?: Database["public"]["Enums"]["audience"];
          author_id: string;
          author_kind: Database["public"]["Enums"]["anchor_kind"];
          body: string;
          c_category: Database["public"]["Enums"]["c_category"];
          created_at?: string;
          created_by: string;
          created_object_id?: string | null;
          created_object_kind?: Database["public"]["Enums"]["anchor_kind"] | null;
          id?: string;
          published_at?: string | null;
          status?: Database["public"]["Enums"]["post_status"];
        };
        Update: {
          anchor_id?: string | null;
          anchor_kind?: Database["public"]["Enums"]["anchor_kind"] | null;
          audience?: Database["public"]["Enums"]["audience"];
          author_id?: string;
          author_kind?: Database["public"]["Enums"]["anchor_kind"];
          body?: string;
          c_category?: Database["public"]["Enums"]["c_category"];
          created_at?: string;
          created_by?: string;
          created_object_id?: string | null;
          created_object_kind?: Database["public"]["Enums"]["anchor_kind"] | null;
          id?: string;
          published_at?: string | null;
          status?: Database["public"]["Enums"]["post_status"];
        };
        Relationships: [];
      };
      space_roles: {
        Row: {
          created_at: string;
          id: string;
          member_id: string;
          role: Database["public"]["Enums"]["space_role"];
          space_id: string;
          status: Database["public"]["Enums"]["space_role_status"];
        };
        Insert: {
          created_at?: string;
          id?: string;
          member_id: string;
          role?: Database["public"]["Enums"]["space_role"];
          space_id: string;
          status?: Database["public"]["Enums"]["space_role_status"];
        };
        Update: {
          created_at?: string;
          id?: string;
          member_id?: string;
          role?: Database["public"]["Enums"]["space_role"];
          space_id?: string;
          status?: Database["public"]["Enums"]["space_role_status"];
        };
        Relationships: [
          {
            foreignKeyName: "space_roles_space_id_fkey";
            columns: ["space_id"];
            isOneToOne: false;
            referencedRelation: "spaces";
            referencedColumns: ["id"];
          },
        ];
      };
      spaces: {
        Row: {
          category: string | null;
          created_at: string;
          description: string | null;
          id: string;
          owner_member_id: string;
          roles_sought: Json;
          status: Database["public"]["Enums"]["space_status"];
          title: string;
        };
        Insert: {
          category?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          owner_member_id: string;
          roles_sought?: Json;
          status?: Database["public"]["Enums"]["space_status"];
          title: string;
        };
        Update: {
          category?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          owner_member_id?: string;
          roles_sought?: Json;
          status?: Database["public"]["Enums"]["space_status"];
          title?: string;
        };
        Relationships: [];
      };
      stories: {
        Row: {
          author_member_id: string;
          body: string;
          created_at: string;
          id: string;
          origin_id: string | null;
          origin_kind: Database["public"]["Enums"]["anchor_kind"] | null;
          title: string;
        };
        Insert: {
          author_member_id: string;
          body: string;
          created_at?: string;
          id?: string;
          origin_id?: string | null;
          origin_kind?: Database["public"]["Enums"]["anchor_kind"] | null;
          title: string;
        };
        Update: {
          author_member_id?: string;
          body?: string;
          created_at?: string;
          id?: string;
          origin_id?: string | null;
          origin_kind?: Database["public"]["Enums"]["anchor_kind"] | null;
          title?: string;
        };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      publish_post: { Args: { payload: Json }; Returns: string };
    };
    Enums: {
      anchor_kind: "member" | "space" | "event" | "opportunity" | "connection_request" | "story";
      audience: "everyone" | "connections" | "anchored";
      c_category: "connect" | "convene" | "collaborate" | "contribute" | "convey" | "system";
      contribute_instrument: "time" | "skills" | "in_kind";
      event_mode: "in_person" | "virtual" | "hybrid";
      post_status: "draft" | "published";
      request_status: "pending" | "accepted" | "declined" | "withdrawn";
      space_role: "lead" | "member";
      space_role_status: "active" | "invited" | "left";
      space_status: "active" | "paused" | "completed";
      ticket_kind: "free" | "paid";
    };
    CompositeTypes: { [_ in never]: never };
  };
};

type DefaultSchema = Database["public"];
export type Tables<T extends keyof DefaultSchema["Tables"]> = DefaultSchema["Tables"][T]["Row"];
export type TablesInsert<T extends keyof DefaultSchema["Tables"]> =
  DefaultSchema["Tables"][T]["Insert"];
export type Enums<T extends keyof DefaultSchema["Enums"]> = DefaultSchema["Enums"][T];
