// AUTO-GENERATED — bate com supabase/migrations/0001_business_schema.sql
// PROTEGIDO: não editar manualmente. Regenerar ao alterar o schema.

export type AppointmentStatus =
  | "scheduled"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "no_show";

export interface Database {
  public: {
    Tables: {
      clients: {
        Row: {
          id: string;
          owner_id: string;
          full_name: string;
          email: string;
          phone: string;
          company: string;
          notes: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["clients"]["Row"], "id" | "owner_id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["clients"]["Insert"]>;
      };
      services: {
        Row: {
          id: string;
          name: string;
          description: string;
          duration_minutes: number;
          price: number;
          color: string;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["services"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["services"]["Insert"]>;
      };
      team_members: {
        Row: {
          id: string;
          full_name: string;
          email: string;
          role: string;
          specialty: string;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["team_members"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["team_members"]["Insert"]>;
      };
      appointments: {
        Row: {
          id: string;
          owner_id: string;
          client_id: string;
          service_id: string;
          team_member_id: string;
          title: string;
          notes: string;
          appointment_date: string;
          appointment_time: string;
          duration_minutes: number;
          status: AppointmentStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["appointments"]["Row"], "id" | "owner_id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["appointments"]["Insert"]>;
      };
    };
  };
}
