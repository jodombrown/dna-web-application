// Generated from the canonical Supabase project (dgspjevjoblujcoljvkn) with the Supabase MCP
// generate_typescript_types tool on the merge of #58 into handoff 31-A's branch, after both
// handoffs' migrations were applied and recorded: 30-D's 20260922120000_p2_guest_path and
// 20260922160000_r382_live_arms_guest_functions, and 31-A's 20260922150000_p2_discovery_schema and
// 20260922150100_p2_discovery_projection.
//
// Nothing here is hand-written except this header and the `Views` helper at the end, which the
// generator drops and every regeneration restores (`src/lib/feed.ts` reads it). The regeneration
// waits for the apply for the reason the earlier headers give: ruling 225 commits a migration before
// it is applied, so a regeneration taken inside that window reads the project as it was and silently
// removes what the window is holding. Every version is recorded on the project, its md5 matches its
// file byte for byte, and `tests/migration-drift.cjs` reads it, so the generator returns it. Every
// object the generator returns is explained by a migration in this tree, so nothing is left out.
//
// What 30-D adds here: `event_registrations.conversion_offered_at`, the once-only on-return offer
// (1034); the table `guest_link_requests`, a hash of each requesting address with the event and the
// time, which no client role reads or writes; and three functions: `guest_link_request` and
// `guest_rsvp`, the guest's one write path, executable by the service role alone and called only by
// the guest-rsvp Edge Function (1026); and `claim_guest_registrations`, which a signed-in member with
// a confirmed address calls after sign-in to take their guest rows with their edges (1033).
// 20260922160000 is a grant to `live_arms` and changes no type.
//
// What 31-A adds here: `events.family` (1037); the tables `convene_families`, `convene_lenses`,
// `member_subscriptions`, `editors`, `convene_picks` and `discovery_dismissals`; and the functions
// `convene_discovery`, Discovery's one read projection, and `set_subscription` and
// `dismiss_discovery_item`, its two member write paths (1039, 1044).
//
// The private helpers of both handoffs (`private.guest_event`, `private.guest_mail_facts`,
// `private.viewer_local_tz`, `private.convene_threshold`, `private.is_editor` and the table
// `private.convene_thresholds`) are absent by design: the private schema is not exposed by
// PostgREST, so the generator does not see it and no surface may reach it.

// PROVISIONAL (handoff 32-B, Chat's condition on Addenda 1 to 3): the entries for
// 20260924100000_p2_discovery_lanes, 20260924110000_p2_event_links and
// 20260924120000_p2_home_ladders_and_rail are written by hand from those files, in the generator's
// layout, because Chat applies the four 32-B migrations only once the surface is ready for its
// enforcing run. They are `convene_lanes`, `event_aliases`, `reserved_link_words`,
// `member_rail_state`, `events.custom_slug` and `events.short_code`, `discovery_dismissals`' section
// key now on `convene_lanes`, and the functions `convene_places`, `event_alias_check`,
// `resolve_event_link` and `convene_discovery` with `p_places` and `p_home_rung`.
// 20260924130000_p2_persona_comments changes only comments and no type. The regeneration after the
// apply replaces this whole file before the enforcing run starts, and this paragraph goes with it.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      attestations: {
        Row: {
          accepted_at: string | null;
          attested_at: string;
          attester_member_id: string;
          attester_role: string;
          c_category: Database["public"]["Enums"]["c_category"];
          created_at: string;
          id: string;
          member_id: string;
          object_id: string;
          object_kind: Database["public"]["Enums"]["anchor_kind"];
        };
        Insert: {
          accepted_at?: string | null;
          attested_at?: string;
          attester_member_id: string;
          attester_role: string;
          c_category: Database["public"]["Enums"]["c_category"];
          created_at?: string;
          id?: string;
          member_id: string;
          object_id: string;
          object_kind: Database["public"]["Enums"]["anchor_kind"];
        };
        Update: {
          accepted_at?: string | null;
          attested_at?: string;
          attester_member_id?: string;
          attester_role?: string;
          c_category?: Database["public"]["Enums"]["c_category"];
          created_at?: string;
          id?: string;
          member_id?: string;
          object_id?: string;
          object_kind?: Database["public"]["Enums"]["anchor_kind"];
        };
        Relationships: [
          {
            foreignKeyName: "attestations_attester_member_id_fkey";
            columns: ["attester_member_id"];
            isOneToOne: false;
            referencedRelation: "members";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "attestations_member_id_fkey";
            columns: ["member_id"];
            isOneToOne: false;
            referencedRelation: "members";
            referencedColumns: ["id"];
          },
        ];
      };
      connection_requests: {
        Row: {
          created_at: string;
          expires_at: string | null;
          from_member_id: string;
          id: string;
          message: string;
          responded_at: string | null;
          status: Database["public"]["Enums"]["request_status"];
          to_member_id: string | null;
          to_name: string;
          why: string | null;
        };
        Insert: {
          created_at?: string;
          expires_at?: string | null;
          from_member_id: string;
          id?: string;
          message: string;
          responded_at?: string | null;
          status?: Database["public"]["Enums"]["request_status"];
          to_member_id?: string | null;
          to_name?: string;
          why?: string | null;
        };
        Update: {
          created_at?: string;
          expires_at?: string | null;
          from_member_id?: string;
          id?: string;
          message?: string;
          responded_at?: string | null;
          status?: Database["public"]["Enums"]["request_status"];
          to_member_id?: string | null;
          to_name?: string;
          why?: string | null;
        };
        Relationships: [];
      };
      convene_families: {
        Row: {
          created_at: string;
          family: string;
          label: string;
          position: number;
          schema_org: string[];
        };
        Insert: {
          created_at?: string;
          family: string;
          label: string;
          position: number;
          schema_org?: string[];
        };
        Update: {
          created_at?: string;
          family?: string;
          label?: string;
          position?: number;
          schema_org?: string[];
        };
        Relationships: [];
      };
      convene_lanes: {
        Row: {
          lane: string;
          name: string;
          position: number;
        };
        Insert: {
          lane: string;
          name: string;
          position: number;
        };
        Update: {
          lane?: string;
          name?: string;
          position?: number;
        };
        Relationships: [];
      };
      convene_lenses: {
        Row: {
          icon: string;
          lens: string;
          name: string;
          position: number;
          scope: string;
          short: string;
        };
        Insert: {
          icon: string;
          lens: string;
          name: string;
          position: number;
          scope: string;
          short: string;
        };
        Update: {
          icon?: string;
          lens?: string;
          name?: string;
          position?: number;
          scope?: string;
          short?: string;
        };
        Relationships: [];
      };
      convene_picks: {
        Row: {
          event_id: string;
          id: string;
          line: string;
          picked_at: string;
          picked_by: string;
          withdrawn_at: string | null;
        };
        Insert: {
          event_id: string;
          id?: string;
          line: string;
          picked_at?: string;
          picked_by: string;
          withdrawn_at?: string | null;
        };
        Update: {
          event_id?: string;
          id?: string;
          line?: string;
          picked_at?: string;
          picked_by?: string;
          withdrawn_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "convene_picks_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "convene_picks_picked_by_fkey";
            columns: ["picked_by"];
            isOneToOne: false;
            referencedRelation: "editors";
            referencedColumns: ["member_id"];
          },
        ];
      };
      corridors: {
        Row: {
          continental_place: string;
          created_at: string;
          diaspora_place: string;
          id: string;
          sector: string | null;
          status: string;
        };
        Insert: {
          continental_place: string;
          created_at?: string;
          diaspora_place: string;
          id: string;
          sector?: string | null;
          status?: string;
        };
        Update: {
          continental_place?: string;
          created_at?: string;
          diaspora_place?: string;
          id?: string;
          sector?: string | null;
          status?: string;
        };
        Relationships: [];
      };
      countries: {
        Row: {
          name: string;
          position: number;
        };
        Insert: {
          name: string;
          position: number;
        };
        Update: {
          name?: string;
          position?: number;
        };
        Relationships: [];
      };
      discovery_dismissals: {
        Row: {
          created_at: string;
          event_id: string;
          member_id: string;
          section: string;
        };
        Insert: {
          created_at?: string;
          event_id: string;
          member_id: string;
          section: string;
        };
        Update: {
          created_at?: string;
          event_id?: string;
          member_id?: string;
          section?: string;
        };
        Relationships: [
          {
            foreignKeyName: "discovery_dismissals_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "discovery_dismissals_member_id_fkey";
            columns: ["member_id"];
            isOneToOne: false;
            referencedRelation: "members";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "discovery_dismissals_section_fkey";
            columns: ["section"];
            isOneToOne: false;
            referencedRelation: "convene_lanes";
            referencedColumns: ["lane"];
          },
        ];
      };
      dismissed_suggestions: {
        Row: {
          created_at: string;
          dismissed_id: string;
          member_id: string;
        };
        Insert: {
          created_at?: string;
          dismissed_id: string;
          member_id: string;
        };
        Update: {
          created_at?: string;
          dismissed_id?: string;
          member_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "dismissed_suggestions_dismissed_id_fkey";
            columns: ["dismissed_id"];
            isOneToOne: false;
            referencedRelation: "members";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "dismissed_suggestions_member_id_fkey";
            columns: ["member_id"];
            isOneToOne: false;
            referencedRelation: "members";
            referencedColumns: ["id"];
          },
        ];
      };
      edges: {
        Row: {
          created_at: string;
          edge_type: Database["public"]["Enums"]["edge_type"];
          from_id: string;
          id: string;
          revoked_at: string | null;
          to_id: string;
        };
        Insert: {
          created_at?: string;
          edge_type: Database["public"]["Enums"]["edge_type"];
          from_id: string;
          id?: string;
          revoked_at?: string | null;
          to_id: string;
        };
        Update: {
          created_at?: string;
          edge_type?: Database["public"]["Enums"]["edge_type"];
          from_id?: string;
          id?: string;
          revoked_at?: string | null;
          to_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "edges_from_id_fkey";
            columns: ["from_id"];
            isOneToOne: false;
            referencedRelation: "members";
            referencedColumns: ["id"];
          },
        ];
      };
      editors: {
        Row: {
          granted_at: string;
          member_id: string;
        };
        Insert: {
          granted_at?: string;
          member_id: string;
        };
        Update: {
          granted_at?: string;
          member_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "editors_member_id_fkey";
            columns: ["member_id"];
            isOneToOne: true;
            referencedRelation: "members";
            referencedColumns: ["id"];
          },
        ];
      };
      event_aliases: {
        Row: {
          alias: string;
          created_at: string;
          event_id: string;
          retired_at: string | null;
        };
        Insert: {
          alias: string;
          created_at?: string;
          event_id: string;
          retired_at?: string | null;
        };
        Update: {
          alias?: string;
          created_at?: string;
          event_id?: string;
          retired_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "event_aliases_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
        ];
      };
      event_delivery: {
        Row: {
          city: string | null;
          country: string | null;
          created_at: string;
          event_id: string;
          external_link: boolean;
          id: string;
          kind: Database["public"]["Enums"]["delivery_kind"];
          lat: number | null;
          lng: number | null;
          map_link: string | null;
          place_id: string | null;
          place_name: string | null;
          place_text: string | null;
          position: number;
          region: string | null;
          url: string | null;
        };
        Insert: {
          city?: string | null;
          country?: string | null;
          created_at?: string;
          event_id: string;
          external_link?: boolean;
          id?: string;
          kind: Database["public"]["Enums"]["delivery_kind"];
          lat?: number | null;
          lng?: number | null;
          map_link?: string | null;
          place_id?: string | null;
          place_name?: string | null;
          place_text?: string | null;
          position?: number;
          region?: string | null;
          url?: string | null;
        };
        Update: {
          city?: string | null;
          country?: string | null;
          created_at?: string;
          event_id?: string;
          external_link?: boolean;
          id?: string;
          kind?: Database["public"]["Enums"]["delivery_kind"];
          lat?: number | null;
          lng?: number | null;
          map_link?: string | null;
          place_id?: string | null;
          place_name?: string | null;
          place_text?: string | null;
          position?: number;
          region?: string | null;
          url?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "event_delivery_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
        ];
      };
      event_host_settings: {
        Row: {
          capacity: number | null;
          event_id: string;
          updated_at: string;
        };
        Insert: {
          capacity?: number | null;
          event_id: string;
          updated_at?: string;
        };
        Update: {
          capacity?: number | null;
          event_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "event_host_settings_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: true;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
        ];
      };
      event_parties: {
        Row: {
          created_at: string;
          event_id: string;
          id: string;
          member_id: string;
          responded_at: string | null;
          role: string;
          status: Database["public"]["Enums"]["event_party_status"];
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          event_id: string;
          id?: string;
          member_id: string;
          responded_at?: string | null;
          role: string;
          status?: Database["public"]["Enums"]["event_party_status"];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          event_id?: string;
          id?: string;
          member_id?: string;
          responded_at?: string | null;
          role?: string;
          status?: Database["public"]["Enums"]["event_party_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "event_parties_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "event_parties_member_id_fkey";
            columns: ["member_id"];
            isOneToOne: false;
            referencedRelation: "members";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "event_parties_role_fkey";
            columns: ["role"];
            isOneToOne: false;
            referencedRelation: "event_role_kinds";
            referencedColumns: ["role"];
          },
        ];
      };
      event_registrations: {
        Row: {
          audience_override: Database["public"]["Enums"]["audience"] | null;
          contact_consent: boolean;
          conversion_offered_at: string | null;
          created_at: string;
          event_id: string;
          guest_email: string | null;
          id: string;
          member_id: string | null;
          status: Database["public"]["Enums"]["registration_status"];
          updated_at: string;
        };
        Insert: {
          audience_override?: Database["public"]["Enums"]["audience"] | null;
          contact_consent?: boolean;
          conversion_offered_at?: string | null;
          created_at?: string;
          event_id: string;
          guest_email?: string | null;
          id?: string;
          member_id?: string | null;
          status: Database["public"]["Enums"]["registration_status"];
          updated_at?: string;
        };
        Update: {
          audience_override?: Database["public"]["Enums"]["audience"] | null;
          contact_consent?: boolean;
          conversion_offered_at?: string | null;
          created_at?: string;
          event_id?: string;
          guest_email?: string | null;
          id?: string;
          member_id?: string | null;
          status?: Database["public"]["Enums"]["registration_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "event_registrations_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "event_registrations_member_id_fkey";
            columns: ["member_id"];
            isOneToOne: false;
            referencedRelation: "members";
            referencedColumns: ["id"];
          },
        ];
      };
      event_role_kinds: {
        Row: {
          label: string;
          position: number;
          role: string;
          verb: string;
        };
        Insert: {
          label: string;
          position: number;
          role: string;
          verb: string;
        };
        Update: {
          label?: string;
          position?: number;
          role?: string;
          verb?: string;
        };
        Relationships: [];
      };
      events: {
        Row: {
          attachments: Json;
          cancelled_at: string | null;
          cancelled_reason: string | null;
          created_at: string;
          custom_slug: string;
          date_confirmed: boolean;
          delivery_intent: string;
          doors_at: string | null;
          ends_at: string | null;
          expected_window_end: string | null;
          expected_window_start: string | null;
          family: string | null;
          host_member_id: string;
          id: string;
          mode: Database["public"]["Enums"]["event_mode"];
          short_code: string;
          slug: string;
          space_id: string | null;
          starts_at: string | null;
          status: Database["public"]["Enums"]["event_status"];
          ticket_kind: Database["public"]["Enums"]["ticket_kind"];
          time_confirmed: boolean;
          timezone: string | null;
          title: string;
          when_text: string;
          window_basis: string | null;
        };
        Insert: {
          attachments?: Json;
          cancelled_at?: string | null;
          cancelled_reason?: string | null;
          created_at?: string;
          custom_slug: string;
          date_confirmed?: boolean;
          delivery_intent?: string;
          doors_at?: string | null;
          ends_at?: string | null;
          expected_window_end?: string | null;
          expected_window_start?: string | null;
          family?: string | null;
          host_member_id: string;
          id?: string;
          mode?: Database["public"]["Enums"]["event_mode"];
          short_code: string;
          slug: string;
          space_id?: string | null;
          starts_at?: string | null;
          status?: Database["public"]["Enums"]["event_status"];
          ticket_kind?: Database["public"]["Enums"]["ticket_kind"];
          time_confirmed?: boolean;
          timezone?: string | null;
          title: string;
          when_text?: string;
          window_basis?: string | null;
        };
        Update: {
          attachments?: Json;
          cancelled_at?: string | null;
          cancelled_reason?: string | null;
          created_at?: string;
          custom_slug?: string;
          date_confirmed?: boolean;
          delivery_intent?: string;
          doors_at?: string | null;
          ends_at?: string | null;
          expected_window_end?: string | null;
          expected_window_start?: string | null;
          family?: string | null;
          host_member_id?: string;
          id?: string;
          mode?: Database["public"]["Enums"]["event_mode"];
          short_code?: string;
          slug?: string;
          space_id?: string | null;
          starts_at?: string | null;
          status?: Database["public"]["Enums"]["event_status"];
          ticket_kind?: Database["public"]["Enums"]["ticket_kind"];
          time_confirmed?: boolean;
          timezone?: string | null;
          title?: string;
          when_text?: string;
          window_basis?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "events_family_fkey";
            columns: ["family"];
            isOneToOne: false;
            referencedRelation: "convene_families";
            referencedColumns: ["family"];
          },
          {
            foreignKeyName: "events_space_id_fkey";
            columns: ["space_id"];
            isOneToOne: false;
            referencedRelation: "spaces";
            referencedColumns: ["id"];
          },
        ];
      };
      focus_areas: {
        Row: {
          name: string;
          position: number;
        };
        Insert: {
          name: string;
          position: number;
        };
        Update: {
          name?: string;
          position?: number;
        };
        Relationships: [];
      };
      guest_link_requests: {
        Row: {
          email_hash: string;
          event_id: string;
          id: string;
          requested_at: string;
        };
        Insert: {
          email_hash: string;
          event_id: string;
          id?: string;
          requested_at?: string;
        };
        Update: {
          email_hash?: string;
          event_id?: string;
          id?: string;
          requested_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "guest_link_requests_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
        ];
      };
      industries: {
        Row: {
          name: string;
          position: number;
        };
        Insert: {
          name: string;
          position: number;
        };
        Update: {
          name?: string;
          position?: number;
        };
        Relationships: [];
      };
      intents: {
        Row: {
          name: string;
          position: number;
        };
        Insert: {
          name: string;
          position: number;
        };
        Update: {
          name?: string;
          position?: number;
        };
        Relationships: [];
      };
      interests: {
        Row: {
          name: string;
          position: number;
        };
        Insert: {
          name: string;
          position: number;
        };
        Update: {
          name?: string;
          position?: number;
        };
        Relationships: [];
      };
      languages: {
        Row: {
          name: string;
          position: number;
        };
        Insert: {
          name: string;
          position: number;
        };
        Update: {
          name?: string;
          position?: number;
        };
        Relationships: [];
      };
      media: {
        Row: {
          bucket: string;
          byte_size: number;
          created_at: string;
          crop: Json | null;
          focal_point: Json | null;
          height: number;
          id: string;
          kind: string;
          mime: string;
          optimized: boolean;
          owner_id: string;
          storage_path: string;
          width: number;
        };
        Insert: {
          bucket: string;
          byte_size: number;
          created_at?: string;
          crop?: Json | null;
          focal_point?: Json | null;
          height: number;
          id?: string;
          kind: string;
          mime: string;
          optimized?: boolean;
          owner_id: string;
          storage_path: string;
          width: number;
        };
        Update: {
          bucket?: string;
          byte_size?: number;
          created_at?: string;
          crop?: Json | null;
          focal_point?: Json | null;
          height?: number;
          id?: string;
          kind?: string;
          mime?: string;
          optimized?: boolean;
          owner_id?: string;
          storage_path?: string;
          width?: number;
        };
        Relationships: [
          {
            foreignKeyName: "media_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "members";
            referencedColumns: ["id"];
          },
        ];
      };
      member_about: {
        Row: {
          about: string;
          member_id: string;
          updated_at: string;
        };
        Insert: {
          about: string;
          member_id: string;
          updated_at?: string;
        };
        Update: {
          about?: string;
          member_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "member_about_member_id_fkey";
            columns: ["member_id"];
            isOneToOne: true;
            referencedRelation: "members";
            referencedColumns: ["id"];
          },
        ];
      };
      member_blocks: {
        Row: {
          blocked_id: string;
          blocker_id: string;
          created_at: string;
        };
        Insert: {
          blocked_id: string;
          blocker_id: string;
          created_at?: string;
        };
        Update: {
          blocked_id?: string;
          blocker_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "member_blocks_blocked_id_fkey";
            columns: ["blocked_id"];
            isOneToOne: false;
            referencedRelation: "members";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "member_blocks_blocker_id_fkey";
            columns: ["blocker_id"];
            isOneToOne: false;
            referencedRelation: "members";
            referencedColumns: ["id"];
          },
        ];
      };
      member_connections: {
        Row: {
          created_at: string;
          member_id: string;
          other_id: string;
          source_request_id: string | null;
        };
        Insert: {
          created_at?: string;
          member_id: string;
          other_id: string;
          source_request_id?: string | null;
        };
        Update: {
          created_at?: string;
          member_id?: string;
          other_id?: string;
          source_request_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "member_connections_member_id_fkey";
            columns: ["member_id"];
            isOneToOne: false;
            referencedRelation: "members";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "member_connections_other_id_fkey";
            columns: ["other_id"];
            isOneToOne: false;
            referencedRelation: "members";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "member_connections_source_request_id_fkey";
            columns: ["source_request_id"];
            isOneToOne: false;
            referencedRelation: "connection_requests";
            referencedColumns: ["id"];
          },
        ];
      };
      member_corridors: {
        Row: {
          corridor_id: string;
          created_at: string;
          member_id: string;
        };
        Insert: {
          corridor_id: string;
          created_at?: string;
          member_id: string;
        };
        Update: {
          corridor_id?: string;
          created_at?: string;
          member_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "member_corridors_corridor_id_fkey";
            columns: ["corridor_id"];
            isOneToOne: false;
            referencedRelation: "corridors";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "member_corridors_member_id_fkey";
            columns: ["member_id"];
            isOneToOne: false;
            referencedRelation: "members";
            referencedColumns: ["id"];
          },
        ];
      };
      member_embeddings: {
        Row: {
          embedding: string;
          member_id: string;
          updated_at: string;
        };
        Insert: {
          embedding: string;
          member_id: string;
          updated_at?: string;
        };
        Update: {
          embedding?: string;
          member_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "member_embeddings_member_id_fkey";
            columns: ["member_id"];
            isOneToOne: true;
            referencedRelation: "members";
            referencedColumns: ["id"];
          },
        ];
      };
      member_focus_areas: {
        Row: {
          member_id: string;
          name: string;
        };
        Insert: {
          member_id: string;
          name: string;
        };
        Update: {
          member_id?: string;
          name?: string;
        };
        Relationships: [
          {
            foreignKeyName: "member_focus_areas_member_id_fkey";
            columns: ["member_id"];
            isOneToOne: false;
            referencedRelation: "members";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "member_focus_areas_name_fkey";
            columns: ["name"];
            isOneToOne: false;
            referencedRelation: "focus_areas";
            referencedColumns: ["name"];
          },
        ];
      };
      member_follows: {
        Row: {
          created_at: string;
          follower_id: string;
          member_id: string;
        };
        Insert: {
          created_at?: string;
          follower_id: string;
          member_id: string;
        };
        Update: {
          created_at?: string;
          follower_id?: string;
          member_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "member_follows_follower_id_fkey";
            columns: ["follower_id"];
            isOneToOne: false;
            referencedRelation: "members";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "member_follows_member_id_fkey";
            columns: ["member_id"];
            isOneToOne: false;
            referencedRelation: "members";
            referencedColumns: ["id"];
          },
        ];
      };
      member_homes: {
        Row: {
          city: string;
          country: string;
          created_at: string;
          id: string;
          lat: number;
          lng: number;
          member_id: string;
          place_id: string;
          place_name: string;
          position: number;
          region: string | null;
          timezone: string;
        };
        Insert: {
          city: string;
          country: string;
          created_at?: string;
          id?: string;
          lat: number;
          lng: number;
          member_id: string;
          place_id: string;
          place_name: string;
          position?: number;
          region?: string | null;
          timezone: string;
        };
        Update: {
          city?: string;
          country?: string;
          created_at?: string;
          id?: string;
          lat?: number;
          lng?: number;
          member_id?: string;
          place_id?: string;
          place_name?: string;
          position?: number;
          region?: string | null;
          timezone?: string;
        };
        Relationships: [
          {
            foreignKeyName: "member_homes_member_id_fkey";
            columns: ["member_id"];
            isOneToOne: false;
            referencedRelation: "members";
            referencedColumns: ["id"];
          },
        ];
      };
      member_industries: {
        Row: {
          member_id: string;
          name: string;
        };
        Insert: {
          member_id: string;
          name: string;
        };
        Update: {
          member_id?: string;
          name?: string;
        };
        Relationships: [
          {
            foreignKeyName: "member_industries_member_id_fkey";
            columns: ["member_id"];
            isOneToOne: false;
            referencedRelation: "members";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "member_industries_name_fkey";
            columns: ["name"];
            isOneToOne: false;
            referencedRelation: "industries";
            referencedColumns: ["name"];
          },
        ];
      };
      member_intent: {
        Row: {
          member_id: string;
          note: string | null;
          updated_at: string;
        };
        Insert: {
          member_id: string;
          note?: string | null;
          updated_at?: string;
        };
        Update: {
          member_id?: string;
          note?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "member_intent_member_id_fkey";
            columns: ["member_id"];
            isOneToOne: true;
            referencedRelation: "members";
            referencedColumns: ["id"];
          },
        ];
      };
      member_intents: {
        Row: {
          member_id: string;
          name: string;
        };
        Insert: {
          member_id: string;
          name: string;
        };
        Update: {
          member_id?: string;
          name?: string;
        };
        Relationships: [
          {
            foreignKeyName: "member_intents_member_id_fkey";
            columns: ["member_id"];
            isOneToOne: false;
            referencedRelation: "members";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "member_intents_name_fkey";
            columns: ["name"];
            isOneToOne: false;
            referencedRelation: "intents";
            referencedColumns: ["name"];
          },
        ];
      };
      member_interests: {
        Row: {
          member_id: string;
          name: string;
        };
        Insert: {
          member_id: string;
          name: string;
        };
        Update: {
          member_id?: string;
          name?: string;
        };
        Relationships: [
          {
            foreignKeyName: "member_interests_member_id_fkey";
            columns: ["member_id"];
            isOneToOne: false;
            referencedRelation: "members";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "member_interests_name_fkey";
            columns: ["name"];
            isOneToOne: false;
            referencedRelation: "interests";
            referencedColumns: ["name"];
          },
        ];
      };
      member_languages: {
        Row: {
          member_id: string;
          name: string;
        };
        Insert: {
          member_id: string;
          name: string;
        };
        Update: {
          member_id?: string;
          name?: string;
        };
        Relationships: [
          {
            foreignKeyName: "member_languages_member_id_fkey";
            columns: ["member_id"];
            isOneToOne: false;
            referencedRelation: "members";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "member_languages_name_fkey";
            columns: ["name"];
            isOneToOne: false;
            referencedRelation: "languages";
            referencedColumns: ["name"];
          },
        ];
      };
      member_links: {
        Row: {
          kind: Database["public"]["Enums"]["link_kind"];
          member_id: string;
          url: string;
        };
        Insert: {
          kind: Database["public"]["Enums"]["link_kind"];
          member_id: string;
          url: string;
        };
        Update: {
          kind?: Database["public"]["Enums"]["link_kind"];
          member_id?: string;
          url?: string;
        };
        Relationships: [
          {
            foreignKeyName: "member_links_member_id_fkey";
            columns: ["member_id"];
            isOneToOne: false;
            referencedRelation: "members";
            referencedColumns: ["id"];
          },
        ];
      };
      member_origin: {
        Row: {
          heritage: Database["public"]["Enums"]["heritage_kind"] | null;
          member_id: string;
          pathway: Database["public"]["Enums"]["return_pathway"] | null;
          updated_at: string;
        };
        Insert: {
          heritage?: Database["public"]["Enums"]["heritage_kind"] | null;
          member_id: string;
          pathway?: Database["public"]["Enums"]["return_pathway"] | null;
          updated_at?: string;
        };
        Update: {
          heritage?: Database["public"]["Enums"]["heritage_kind"] | null;
          member_id?: string;
          pathway?: Database["public"]["Enums"]["return_pathway"] | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "member_origin_member_id_fkey";
            columns: ["member_id"];
            isOneToOne: true;
            referencedRelation: "members";
            referencedColumns: ["id"];
          },
        ];
      };
      member_rail_state: {
        Row: {
          collapsed: boolean;
          member_id: string;
          surface: string;
          updated_at: string;
          width_band: string;
        };
        Insert: {
          collapsed: boolean;
          member_id: string;
          surface: string;
          updated_at?: string;
          width_band: string;
        };
        Update: {
          collapsed?: boolean;
          member_id?: string;
          surface?: string;
          updated_at?: string;
          width_band?: string;
        };
        Relationships: [
          {
            foreignKeyName: "member_rail_state_member_id_fkey";
            columns: ["member_id"];
            isOneToOne: false;
            referencedRelation: "members";
            referencedColumns: ["id"];
          },
        ];
      };
      member_regional_expertise: {
        Row: {
          member_id: string;
          name: string;
        };
        Insert: {
          member_id: string;
          name: string;
        };
        Update: {
          member_id?: string;
          name?: string;
        };
        Relationships: [
          {
            foreignKeyName: "member_regional_expertise_member_id_fkey";
            columns: ["member_id"];
            isOneToOne: false;
            referencedRelation: "members";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "member_regional_expertise_name_fkey";
            columns: ["name"];
            isOneToOne: false;
            referencedRelation: "regional_expertise";
            referencedColumns: ["name"];
          },
        ];
      };
      member_skills: {
        Row: {
          member_id: string;
          name: string;
        };
        Insert: {
          member_id: string;
          name: string;
        };
        Update: {
          member_id?: string;
          name?: string;
        };
        Relationships: [
          {
            foreignKeyName: "member_skills_member_id_fkey";
            columns: ["member_id"];
            isOneToOne: false;
            referencedRelation: "members";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "member_skills_name_fkey";
            columns: ["name"];
            isOneToOne: false;
            referencedRelation: "skills";
            referencedColumns: ["name"];
          },
        ];
      };
      member_stance_details: {
        Row: {
          base: string | null;
          member_id: string;
          needs: string | null;
          offer: string | null;
          return_timeline: Database["public"]["Enums"]["return_timeline"] | null;
          stance: Database["public"]["Enums"]["stance"];
          support: string | null;
          updated_at: string;
        };
        Insert: {
          base?: string | null;
          member_id: string;
          needs?: string | null;
          offer?: string | null;
          return_timeline?: Database["public"]["Enums"]["return_timeline"] | null;
          stance: Database["public"]["Enums"]["stance"];
          support?: string | null;
          updated_at?: string;
        };
        Update: {
          base?: string | null;
          member_id?: string;
          needs?: string | null;
          offer?: string | null;
          return_timeline?: Database["public"]["Enums"]["return_timeline"] | null;
          stance?: Database["public"]["Enums"]["stance"];
          support?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "member_stance_details_member_id_fkey";
            columns: ["member_id"];
            isOneToOne: false;
            referencedRelation: "members";
            referencedColumns: ["id"];
          },
        ];
      };
      member_stances: {
        Row: {
          label: string;
          position: number;
          stance: Database["public"]["Enums"]["stance"];
        };
        Insert: {
          label: string;
          position: number;
          stance: Database["public"]["Enums"]["stance"];
        };
        Update: {
          label?: string;
          position?: number;
          stance?: Database["public"]["Enums"]["stance"];
        };
        Relationships: [];
      };
      member_subscriptions: {
        Row: {
          created_at: string;
          family: string | null;
          home_id: string | null;
          id: string;
          kind: string;
          member_id: string;
        };
        Insert: {
          created_at?: string;
          family?: string | null;
          home_id?: string | null;
          id?: string;
          kind: string;
          member_id: string;
        };
        Update: {
          created_at?: string;
          family?: string | null;
          home_id?: string | null;
          id?: string;
          kind?: string;
          member_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "member_subscriptions_family_fkey";
            columns: ["family"];
            isOneToOne: false;
            referencedRelation: "convene_families";
            referencedColumns: ["family"];
          },
          {
            foreignKeyName: "member_subscriptions_home_id_fkey";
            columns: ["home_id"];
            isOneToOne: false;
            referencedRelation: "member_homes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "member_subscriptions_member_id_fkey";
            columns: ["member_id"];
            isOneToOne: false;
            referencedRelation: "members";
            referencedColumns: ["id"];
          },
        ];
      };
      member_visibility: {
        Row: {
          audience: Database["public"]["Enums"]["audience"];
          member_id: string;
          section: Database["public"]["Enums"]["profile_section"];
        };
        Insert: {
          audience?: Database["public"]["Enums"]["audience"];
          member_id: string;
          section: Database["public"]["Enums"]["profile_section"];
        };
        Update: {
          audience?: Database["public"]["Enums"]["audience"];
          member_id?: string;
          section?: Database["public"]["Enums"]["profile_section"];
        };
        Relationships: [
          {
            foreignKeyName: "member_visibility_member_id_fkey";
            columns: ["member_id"];
            isOneToOne: false;
            referencedRelation: "members";
            referencedColumns: ["id"];
          },
        ];
      };
      members: {
        Row: {
          avatar_path: string | null;
          cover_focus: string;
          cover_path: string | null;
          created_at: string;
          current_country: string | null;
          current_place: string | null;
          handle: string;
          headline: string | null;
          id: string;
          identified_at: string | null;
          local_tz: string | null;
          name: string;
          onboarded_at: string | null;
          origin_country: string | null;
          pattern: Database["public"]["Enums"]["masthead_pattern"];
          profile_private: boolean;
          profile_shared: boolean;
          stance: Database["public"]["Enums"]["stance"];
          stance_declared_at: string | null;
          updated_at: string;
          username_changes: number;
          who_completed_at: string | null;
        };
        Insert: {
          avatar_path?: string | null;
          cover_focus?: string;
          cover_path?: string | null;
          created_at?: string;
          current_country?: string | null;
          current_place?: string | null;
          handle: string;
          headline?: string | null;
          id: string;
          identified_at?: string | null;
          local_tz?: string | null;
          name: string;
          onboarded_at?: string | null;
          origin_country?: string | null;
          pattern?: Database["public"]["Enums"]["masthead_pattern"];
          profile_private?: boolean;
          profile_shared?: boolean;
          stance?: Database["public"]["Enums"]["stance"];
          stance_declared_at?: string | null;
          updated_at?: string;
          username_changes?: number;
          who_completed_at?: string | null;
        };
        Update: {
          avatar_path?: string | null;
          cover_focus?: string;
          cover_path?: string | null;
          created_at?: string;
          current_country?: string | null;
          current_place?: string | null;
          handle?: string;
          headline?: string | null;
          id?: string;
          identified_at?: string | null;
          local_tz?: string | null;
          name?: string;
          onboarded_at?: string | null;
          origin_country?: string | null;
          pattern?: Database["public"]["Enums"]["masthead_pattern"];
          profile_private?: boolean;
          profile_shared?: boolean;
          stance?: Database["public"]["Enums"]["stance"];
          stance_declared_at?: string | null;
          updated_at?: string;
          username_changes?: number;
          who_completed_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "members_current_country_fkey";
            columns: ["current_country"];
            isOneToOne: false;
            referencedRelation: "world_countries";
            referencedColumns: ["name"];
          },
          {
            foreignKeyName: "members_origin_country_fkey";
            columns: ["origin_country"];
            isOneToOne: false;
            referencedRelation: "countries";
            referencedColumns: ["name"];
          },
        ];
      };
      notifications: {
        Row: {
          actor_id: string | null;
          actor_kind: Database["public"]["Enums"]["anchor_kind"] | null;
          c_category: Database["public"]["Enums"]["c_category"];
          created_at: string;
          id: string;
          kind: Database["public"]["Enums"]["notification_kind"];
          object_id: string | null;
          object_kind: Database["public"]["Enums"]["anchor_kind"] | null;
          read_at: string | null;
          recipient_member_id: string;
        };
        Insert: {
          actor_id?: string | null;
          actor_kind?: Database["public"]["Enums"]["anchor_kind"] | null;
          c_category?: Database["public"]["Enums"]["c_category"];
          created_at?: string;
          id?: string;
          kind: Database["public"]["Enums"]["notification_kind"];
          object_id?: string | null;
          object_kind?: Database["public"]["Enums"]["anchor_kind"] | null;
          read_at?: string | null;
          recipient_member_id: string;
        };
        Update: {
          actor_id?: string | null;
          actor_kind?: Database["public"]["Enums"]["anchor_kind"] | null;
          c_category?: Database["public"]["Enums"]["c_category"];
          created_at?: string;
          id?: string;
          kind?: Database["public"]["Enums"]["notification_kind"];
          object_id?: string | null;
          object_kind?: Database["public"]["Enums"]["anchor_kind"] | null;
          read_at?: string | null;
          recipient_member_id?: string;
        };
        Relationships: [];
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
            referencedRelation: "feed";
            referencedColumns: ["id"];
          },
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
            referencedRelation: "feed";
            referencedColumns: ["id"];
          },
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
            referencedRelation: "feed";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "post_media_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "posts";
            referencedColumns: ["id"];
          },
        ];
      };
      post_reactions: {
        Row: {
          created_at: string;
          member_id: string;
          post_id: string;
        };
        Insert: {
          created_at?: string;
          member_id: string;
          post_id: string;
        };
        Update: {
          created_at?: string;
          member_id?: string;
          post_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "post_reactions_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "feed";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "post_reactions_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "posts";
            referencedColumns: ["id"];
          },
        ];
      };
      post_saves: {
        Row: {
          created_at: string;
          member_id: string;
          post_id: string;
        };
        Insert: {
          created_at?: string;
          member_id: string;
          post_id: string;
        };
        Update: {
          created_at?: string;
          member_id?: string;
          post_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "post_saves_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "feed";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "post_saves_post_id_fkey";
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
      regional_expertise: {
        Row: {
          name: string;
          position: number;
        };
        Insert: {
          name: string;
          position: number;
        };
        Update: {
          name?: string;
          position?: number;
        };
        Relationships: [];
      };
      reserved_link_words: {
        Row: {
          created_at: string;
          word: string;
        };
        Insert: {
          created_at?: string;
          word: string;
        };
        Update: {
          created_at?: string;
          word?: string;
        };
        Relationships: [];
      };
      second_degree: {
        Row: {
          fof_id: string;
          member_id: string;
          refreshed_at: string;
          sample_via_ids: string[];
          via_count: number;
        };
        Insert: {
          fof_id: string;
          member_id: string;
          refreshed_at?: string;
          sample_via_ids?: string[];
          via_count: number;
        };
        Update: {
          fof_id?: string;
          member_id?: string;
          refreshed_at?: string;
          sample_via_ids?: string[];
          via_count?: number;
        };
        Relationships: [
          {
            foreignKeyName: "second_degree_fof_id_fkey";
            columns: ["fof_id"];
            isOneToOne: false;
            referencedRelation: "members";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "second_degree_member_id_fkey";
            columns: ["member_id"];
            isOneToOne: false;
            referencedRelation: "members";
            referencedColumns: ["id"];
          },
        ];
      };
      skills: {
        Row: {
          name: string;
          position: number;
        };
        Insert: {
          name: string;
          position: number;
        };
        Update: {
          name?: string;
          position?: number;
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
      world_countries: {
        Row: {
          name: string;
          position: number;
        };
        Insert: {
          name: string;
          position: number;
        };
        Update: {
          name?: string;
          position?: number;
        };
        Relationships: [];
      };
    };
    Views: {
      feed: {
        Row: {
          anchor_id: string | null;
          anchor_kind: Database["public"]["Enums"]["anchor_kind"] | null;
          audience: Database["public"]["Enums"]["audience"] | null;
          author_avatar_path: string | null;
          author_handle: string | null;
          author_id: string | null;
          author_kind: Database["public"]["Enums"]["anchor_kind"] | null;
          author_name: string | null;
          body: string | null;
          c_category: Database["public"]["Enums"]["c_category"] | null;
          created_at: string | null;
          created_by: string | null;
          created_object_id: string | null;
          created_object_kind: Database["public"]["Enums"]["anchor_kind"] | null;
          id: string | null;
          published_at: string | null;
          status: Database["public"]["Enums"]["post_status"] | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      claim_guest_registrations: { Args: never; Returns: Json };
      connect_cards: {
        Args: {
          p_cursor?: string;
          p_filters?: Json;
          p_lens: string;
          p_limit?: number;
        };
        Returns: Json;
      };
      connect_filter_options: { Args: never; Returns: Json };
      connect_where: { Args: never; Returns: Json };
      connection_request_intros: {
        Args: { p_ids: string[] };
        Returns: {
          created_at: string;
          from_member_id: string;
          id: string;
          message: string;
          to_member_id: string;
          to_name: string;
          why: string;
        }[];
      };
      convene_discovery: {
        Args: {
          p_families?: string[];
          p_format?: string[];
          p_home?: string;
          p_home_rung?: string;
          p_lens?: string;
          p_places?: string[];
          p_price?: string[];
          p_when?: string;
        };
        Returns: Json;
      };
      convene_places: { Args: never; Returns: Json };
      dismiss_discovery_item: {
        Args: { p_event: string; p_section: string };
        Returns: undefined;
      };
      dismiss_suggestion: { Args: { p_target: string }; Returns: undefined };
      event_alias_check: {
        Args: { p_alias: string; p_event: string };
        Returns: string;
      };
      event_media_object: {
        Args: { p_key: string; p_kind: string; p_slug: string };
        Returns: {
          bucket: string;
          path: string;
        }[];
      };
      event_page: { Args: { p_event: string }; Returns: Json };
      event_public_page: { Args: { p_slug: string }; Returns: Json };
      event_speakers: {
        Args: { p_events: string[] };
        Returns: {
          avatar_path: string;
          event_id: string;
          handle: string;
          label: string;
          member_id: string;
          name: string;
          party_id: string;
          role: string;
        }[];
      };
      guest_link_request: {
        Args: { p_email: string; p_slug: string };
        Returns: Json;
      };
      guest_rsvp: {
        Args: { p_action: string; p_email: string; p_event: string };
        Returns: Json;
      };
      invite_event_party: {
        Args: { p_event: string; p_member: string; p_role: string };
        Returns: Json;
      };
      onboard_relationship: {
        Args: {
          p_stance: Database["public"]["Enums"]["stance"];
          p_touched: boolean;
        };
        Returns: Json;
      };
      onboard_where: {
        Args: { p_city: string; p_country: string };
        Returns: Json;
      };
      onboard_who: {
        Args: { p_avatar_path?: string; p_name: string; p_username?: string };
        Returns: Json;
      };
      onboarding_state: { Args: never; Returns: Json };
      profile_view: {
        Args: { p_as_public?: boolean; p_handle?: string };
        Returns: Json;
      };
      public_attestations: { Args: never; Returns: Json };
      publish_post: { Args: { payload: Json }; Returns: string };
      rate_limit_check: { Args: { p_action: string }; Returns: boolean };
      remove_event_party: { Args: { p_party: string }; Returns: Json };
      resolve_event_link: {
        Args: { p_kind: string; p_segment: string };
        Returns: string;
      };
      respond_to_event_role: {
        Args: { p_accept: boolean; p_party: string };
        Returns: Json;
      };
      respond_to_request: {
        Args: { p_accept: boolean; p_sender: string };
        Returns: undefined;
      };
      rsvp_event: {
        Args: {
          p_audience_override?: Database["public"]["Enums"]["audience"];
          p_contact_consent?: boolean;
          p_event: string;
          p_status: Database["public"]["Enums"]["registration_status"];
        };
        Returns: Json;
      };
      save_profile_section: {
        Args: { payload: Json; section: string };
        Returns: undefined;
      };
      send_introduction: {
        Args: { p_message: string; p_recipient: string };
        Returns: string;
      };
      set_follow: {
        Args: { p_on: boolean; p_target: string };
        Returns: undefined;
      };
      set_subscription: {
        Args: { p_family: string; p_on: boolean };
        Returns: undefined;
      };
      vocabularies: { Args: never; Returns: Json };
      withdraw_request: { Args: { p_recipient: string }; Returns: undefined };
    };
    Enums: {
      anchor_kind:
        | "member"
        | "space"
        | "event"
        | "opportunity"
        | "connection_request"
        | "story"
        | "event_party";
      audience: "everyone" | "connections" | "anchored";
      c_category: "connect" | "convene" | "collaborate" | "contribute" | "convey" | "system";
      contribute_instrument: "time" | "skills" | "in_kind";
      delivery_kind: "physical" | "meeting_link" | "to_be_announced";
      edge_type:
        | "connect"
        | "follow"
        | "event_rsvp"
        | "event_attested"
        | "space_role"
        | "space_role_completed"
        | "contribution_fulfilled"
        | "story_about"
        | "authored";
      event_mode: "in_person" | "virtual" | "hybrid";
      event_party_status: "invited" | "accepted" | "declined";
      event_status: "draft" | "published" | "cancelled";
      heritage_kind:
        "First generation" | "Second generation" | "Third generation or later" | "Continental";
      link_kind: "website" | "linkedin" | "x" | "instagram";
      masthead_pattern: "kente" | "adinkra" | "mudcloth";
      notification_kind:
        | "connection_accepted"
        | "attestation_received"
        | "space_role_approved"
        | "event_reminder"
        | "role_invitation"
        | "role_accepted";
      post_status: "draft" | "published";
      profile_section:
        | "about"
        | "stance"
        | "origin"
        | "where"
        | "work"
        | "skills"
        | "languages"
        | "intent"
        | "links"
        | "convene"
        | "collaborate"
        | "contribute"
        | "convey"
        | "badges";
      registration_status: "going" | "not_going";
      request_status: "pending" | "accepted" | "declined" | "withdrawn";
      return_pathway:
        | "Already returned"
        | "Planning a return"
        | "Circular, both places"
        | "Not planning a return";
      return_timeline:
        "Already back" | "Within a year" | "One to three years" | "Someday, not fixed";
      space_role: "lead" | "member";
      space_role_status: "active" | "invited" | "left";
      space_status: "active" | "paused" | "completed";
      stance: "returnee" | "kin" | "anchor" | "ally" | "exploring";
      ticket_kind: "free" | "paid" | "donation";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

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
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
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
  public: {
    Enums: {
      anchor_kind: [
        "member",
        "space",
        "event",
        "opportunity",
        "connection_request",
        "story",
        "event_party",
      ],
      audience: ["everyone", "connections", "anchored"],
      c_category: ["connect", "convene", "collaborate", "contribute", "convey", "system"],
      contribute_instrument: ["time", "skills", "in_kind"],
      delivery_kind: ["physical", "meeting_link", "to_be_announced"],
      edge_type: [
        "connect",
        "follow",
        "event_rsvp",
        "event_attested",
        "space_role",
        "space_role_completed",
        "contribution_fulfilled",
        "story_about",
        "authored",
      ],
      event_mode: ["in_person", "virtual", "hybrid"],
      event_party_status: ["invited", "accepted", "declined"],
      event_status: ["draft", "published", "cancelled"],
      heritage_kind: [
        "First generation",
        "Second generation",
        "Third generation or later",
        "Continental",
      ],
      link_kind: ["website", "linkedin", "x", "instagram"],
      masthead_pattern: ["kente", "adinkra", "mudcloth"],
      notification_kind: [
        "connection_accepted",
        "attestation_received",
        "space_role_approved",
        "event_reminder",
        "role_invitation",
        "role_accepted",
      ],
      post_status: ["draft", "published"],
      profile_section: [
        "about",
        "stance",
        "origin",
        "where",
        "work",
        "skills",
        "languages",
        "intent",
        "links",
        "convene",
        "collaborate",
        "contribute",
        "convey",
        "badges",
      ],
      registration_status: ["going", "not_going"],
      request_status: ["pending", "accepted", "declined", "withdrawn"],
      return_pathway: [
        "Already returned",
        "Planning a return",
        "Circular, both places",
        "Not planning a return",
      ],
      return_timeline: [
        "Already back",
        "Within a year",
        "One to three years",
        "Someday, not fixed",
      ],
      space_role: ["lead", "member"],
      space_role_status: ["active", "invited", "left"],
      space_status: ["active", "paused", "completed"],
      stance: ["returnee", "kin", "anchor", "ally", "exploring"],
      ticket_kind: ["free", "paid", "donation"],
    },
  },
} as const;

/** Row type of a view (app addition kept across regenerations; the generator emits Tables only). */
export type Views<T extends keyof DefaultSchema["Views"]> = DefaultSchema["Views"][T]["Row"];
