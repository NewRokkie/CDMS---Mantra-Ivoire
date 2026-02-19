import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  global: {
    headers: {
      'x-application': 'depot-manager'
    }
  }
});

export type Database = {
  public: {
    Tables: {
      clients: {
        Row: {
          id: string;
          code: string;
          name: string;
          contact_person: string | null;
          email: string | null;
          phone: string | null;
          address: string | null;
          free_days_allowed: number;
          daily_storage_rate: number;
          currency: string;
          auto_edi: boolean;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          name: string;
          contact_person?: string | null;
          email?: string | null;
          phone?: string | null;
          address?: string | null;
          free_days_allowed?: number;
          daily_storage_rate?: number;
          currency?: string;
          auto_edi?: boolean;
          active?: boolean;
        };
        Update: Partial<Database['public']['Tables']['clients']['Insert']>;
      };
      containers: {
        Row: {
          id: string;
          number: string;
          type: string;
          size: string;
          status: string;
          is_high_cube: boolean;               // Added: 20260219000000 - High Cube from Gate In
          full_empty: string | null;           // Added: 20251107120001
          location: string | null;
          yard_id: string | null;
          client_id: string | null;
          client_code: string | null;
          gate_in_date: string | null;
          gate_out_date: string | null;
          classification: string | null;       // Added: 20251112000000
          transaction_type: string | null;     // Added: 20250212000000
          damage: any;
          booking_reference: string | null;
          created_by: string | null;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
          // Soft delete fields - Added: 20251208100000
          is_deleted: boolean;
          deleted_at: string | null;
          deleted_by: string | null;
        };
        Insert: {
          id?: string;
          number: string;
          type: string;
          size: string;
          status?: string;
          is_high_cube?: boolean;
          full_empty?: string | null;
          location?: string | null;
          yard_id?: string | null;
          client_id?: string | null;
          client_code?: string | null;
          gate_in_date?: string | null;
          gate_out_date?: string | null;
          classification?: string | null;
          transaction_type?: string | null;
          damage?: any;
          booking_reference?: string | null;
          created_by?: string | null;
          updated_by?: string | null;
          is_deleted?: boolean;
          deleted_at?: string | null;
          deleted_by?: string | null;
        };
        Update: Partial<Database['public']['Tables']['containers']['Insert']>;
      };
      release_orders: {
        Row: {
          id: string;
          booking_number: string;
          client_id: string | null;
          client_code: string;
          client_name: string;
          booking_type: string;
          total_containers: number;
          remaining_containers: number;
          status: string;
          valid_from: string | null;
          valid_until: string | null;
          notes: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          booking_number: string;
          client_id?: string | null;
          client_code: string;
          client_name: string;
          booking_type: string;
          total_containers?: number;
          remaining_containers?: number;
          status?: string;
          valid_from?: string | null;
          valid_until?: string | null;
          notes?: string | null;
          created_by?: string | null;
        };
        Update: Partial<Database['public']['Tables']['release_orders']['Insert']>;
      };
      gate_in_operations: {
        Row: {
          id: string;
          container_id: string | null;
          container_number: string;
          client_code: string;
          client_name: string;
          container_type: string;
          container_size: string;
          is_high_cube: boolean;
          container_iso_code: string | null;
          transport_company: string | null;
          driver_name: string | null;
          vehicle_number: string | null;
          assigned_location: string | null;
          classification: string | null;
          damage_reported: boolean;
          damage_description: string | null;
          damage_assessment_stage: string | null; // Now defaults to 'assignment' stage
          damage_assessed_by: string | null;
          damage_assessed_at: string | null;
          damage_type: string | null;
          status: string;
          operator_id: string | null;
          operator_name: string | null;
          yard_id: string | null;
          edi_transmitted: boolean;
          edi_transmission_date: string | null;
          created_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          container_id?: string | null;
          container_number: string;
          client_code: string;
          client_name: string;
          container_type: string;
          container_size: string;
          is_high_cube?: boolean;
          container_iso_code?: string | null;
          transport_company?: string | null;
          driver_name?: string | null;
          vehicle_number?: string | null;
          assigned_location?: string | null;
          classification?: string | null;
          damage_reported?: boolean;
          damage_description?: string | null;
          damage_assessment_stage?: string | null; // Now defaults to 'assignment' stage
          damage_assessed_by?: string | null;
          damage_assessed_at?: string | null;
          damage_type?: string | null;
          status?: string;
          operator_id?: string | null;
          operator_name?: string | null;
          yard_id?: string | null;
          edi_transmitted?: boolean;
          edi_transmission_date?: string | null;
          completed_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['gate_in_operations']['Insert']>;
      };
      gate_out_operations: {
        Row: {
          id: string;
          release_order_id: string | null;
          booking_number: string;
          client_code: string;
          client_name: string;
          booking_type: string | null;
          total_containers: number | null;
          processed_containers: number | null;
          remaining_containers: number | null;
          processed_container_ids: any;
          transport_company: string | null;
          driver_name: string | null;
          vehicle_number: string | null;
          status: string;
          operator_id: string | null;
          operator_name: string | null;
          yard_id: string | null;
          edi_transmitted: boolean;
          edi_transmission_date: string | null;
          created_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          release_order_id?: string | null;
          booking_number: string;
          client_code: string;
          client_name: string;
          booking_type?: string | null;
          total_containers?: number | null;
          processed_containers?: number | null;
          remaining_containers?: number | null;
          processed_container_ids?: any;
          transport_company?: string | null;
          driver_name?: string | null;
          vehicle_number?: string | null;
          status?: string;
          operator_id?: string | null;
          operator_name?: string | null;
          yard_id?: string | null;
          edi_transmitted?: boolean;
          edi_transmission_date?: string | null;
          completed_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['gate_out_operations']['Insert']>;
      };
      users: {
        Row: {
          id: string;
          auth_user_id: string | null;
          name: string;
          email: string;
          role: string;
          yard_ids: any;
          module_access: any;
          active: boolean;
          last_login: string | null;
          created_at: string;
          updated_at: string;
          created_by: string | null;
          updated_by: string | null;
          // Soft delete fields
          is_deleted: boolean;
          deleted_at: string | null;
          deleted_by: string | null;
        };
        Insert: {
          id?: string;
          auth_user_id?: string | null;
          name: string;
          email: string;
          role?: string;
          yard_ids?: any;
          module_access?: any;
          active?: boolean;
          last_login?: string | null;
          created_by?: string | null;
          updated_by?: string | null;
          // Soft delete fields
          is_deleted?: boolean;
          deleted_at?: string | null;
          deleted_by?: string | null;
        };
        Update: Partial<Database['public']['Tables']['users']['Insert']>;
      };
      audit_logs: {
        Row: {
          id: string;
          entity_type: string;
          entity_id: string;
          action: string;
          changes: any;
          user_id: string | null;
          user_name: string | null;
          timestamp: string;
          ip_address: string | null;
          user_agent: string | null;
        };
        Insert: {
          id?: string;
          entity_type: string;
          entity_id: string;
          action: string;
          changes?: any;
          user_id?: string | null;
          user_name?: string | null;
          ip_address?: string | null;
          user_agent?: string | null;
        };
        Update: Partial<Database['public']['Tables']['audit_logs']['Insert']>;
      };
    };
  };
};
