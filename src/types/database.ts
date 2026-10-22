// Tipos de la base de datos. Más adelante se pueden regenerar con:
// npx supabase gen types typescript --project-id <id> > src/types/database.ts

export type UserRole = "superadmin" | "admin" | "instructor" | "student";
export type UserStatus = "active" | "suspended";

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          avatar_url: string | null;
          role: UserRole;
          status: UserStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: never;
        Update: {
          full_name?: string;
          avatar_url?: string | null;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_admin: { Args: Record<string, never>; Returns: boolean };
      is_superadmin: { Args: Record<string, never>; Returns: boolean };
    };
    Enums: {
      user_role: UserRole;
      user_status: UserStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};
