// Tipos de la base de datos. Más adelante se pueden regenerar con:
// npx supabase gen types typescript --project-id <id> > src/types/database.ts

export type UserRole = "superadmin" | "admin" | "instructor" | "student";
export type UserStatus = "active" | "suspended";
export type CourseStatus = "draft" | "published" | "archived";
export type CourseLevel = "all" | "beginner" | "intermediate" | "advanced";
export type CourseAccess = "free" | "paid" | "membership" | "invite";
export type LessonType = "video" | "text" | "pdf" | "mixed" | "quiz";
export type VideoProvider = "vimeo" | "youtube";
export type Faq = { question: string; answer: string };
export type EnrollmentSource = "free" | "manual" | "purchase" | "subscription";
export type EnrollmentStatus = "active" | "cancelled" | "expired";

type Enrollment = {
  id: string;
  user_id: string;
  course_id: string;
  source: EnrollmentSource;
  status: EnrollmentStatus;
  enrolled_at: string;
  expires_at: string | null;
  last_lesson_id: string | null;
  last_accessed_at: string | null;
};

type LessonProgress = {
  user_id: string;
  lesson_id: string;
  completed_at: string;
};

export type OutlineRow = {
  module_id: string;
  module_title: string;
  module_position: number;
  release_after_days: number;
  unlock_at: string | null;
  lesson_id: string | null;
  lesson_title: string | null;
  lesson_type: LessonType | null;
  lesson_position: number | null;
  duration_seconds: number | null;
  is_preview: boolean | null;
  completed: boolean;
};

export type MyLearningRow = {
  course_id: string;
  title: string;
  slug: string;
  cover_path: string | null;
  enrolled_at: string;
  last_lesson_id: string | null;
  last_accessed_at: string | null;
  total_lessons: number;
  completed_lessons: number;
};

type Category = {
  id: string;
  name: string;
  slug: string;
  created_at: string;
};

type Course = {
  id: string;
  title: string;
  slug: string;
  short_description: string;
  description: string;
  cover_path: string | null;
  intro_video_url: string | null;
  intro_video_provider: VideoProvider | null;
  category_id: string | null;
  level: CourseLevel;
  language: string;
  instructor_id: string | null;
  requirements: string[];
  learning_objectives: string[];
  faqs: Faq[];
  access_type: CourseAccess;
  price_cents: number | null;
  currency: string;
  status: CourseStatus;
  published_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

type Module = {
  id: string;
  course_id: string;
  title: string;
  position: number;
  release_after_days: number;
  created_at: string;
  updated_at: string;
};

type Lesson = {
  id: string;
  module_id: string;
  title: string;
  type: LessonType;
  video_url: string | null;
  video_provider: VideoProvider | null;
  duration_seconds: number | null;
  content: string;
  is_preview: boolean;
  position: number;
  created_at: string;
  updated_at: string;
};

type LessonAttachment = {
  id: string;
  lesson_id: string;
  file_path: string;
  file_name: string;
  size_bytes: number;
  mime_type: string;
  created_at: string;
};

// Columnas con valor por defecto o generadas: opcionales al insertar.
type Generated = "id" | "created_at" | "updated_at";
type InsertOf<T, Required extends keyof T> = Pick<T, Required> &
  Partial<Omit<T, Required | Generated>>;

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
      categories: {
        Row: Category;
        Insert: InsertOf<Category, "name" | "slug">;
        Update: Partial<Omit<Category, Generated>>;
        Relationships: [];
      };
      courses: {
        Row: Course;
        Insert: InsertOf<Course, "title" | "slug">;
        Update: Partial<Omit<Course, Generated>>;
        Relationships: [
          {
            foreignKeyName: "courses_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
      modules: {
        Row: Module;
        Insert: InsertOf<Module, "course_id" | "title">;
        Update: Partial<Omit<Module, Generated>>;
        Relationships: [
          {
            foreignKeyName: "modules_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
        ];
      };
      lessons: {
        Row: Lesson;
        Insert: InsertOf<Lesson, "module_id" | "title">;
        Update: Partial<Omit<Lesson, Generated>>;
        Relationships: [
          {
            foreignKeyName: "lessons_module_id_fkey";
            columns: ["module_id"];
            isOneToOne: false;
            referencedRelation: "modules";
            referencedColumns: ["id"];
          },
        ];
      };
      lesson_attachments: {
        Row: LessonAttachment;
        Insert: InsertOf<LessonAttachment, "lesson_id" | "file_path" | "file_name">;
        Update: never;
        Relationships: [
          {
            foreignKeyName: "lesson_attachments_lesson_id_fkey";
            columns: ["lesson_id"];
            isOneToOne: false;
            referencedRelation: "lessons";
            referencedColumns: ["id"];
          },
        ];
      };
      enrollments: {
        Row: Enrollment;
        Insert: Pick<Enrollment, "user_id" | "course_id"> &
          Partial<Omit<Enrollment, "id" | "user_id" | "course_id">>;
        Update: Partial<Omit<Enrollment, "id">>;
        Relationships: [
          {
            foreignKeyName: "enrollments_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
        ];
      };
      lesson_progress: {
        Row: LessonProgress;
        Insert: Pick<LessonProgress, "user_id" | "lesson_id"> & Partial<LessonProgress>;
        Update: never;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_admin: { Args: Record<string, never>; Returns: boolean };
      is_superadmin: { Args: Record<string, never>; Returns: boolean };
      is_course_published: { Args: { p_course_id: string }; Returns: boolean };
      duplicate_course: { Args: { p_course_id: string }; Returns: string };
      module_unlock_at: { Args: { p_module_id: string }; Returns: string | null };
      can_access_lesson: { Args: { p_lesson_id: string }; Returns: boolean };
      is_enrolled: { Args: { p_course_id: string }; Returns: boolean };
      course_outline: { Args: { p_course_id: string }; Returns: OutlineRow[] };
      course_instructor: {
        Args: { p_course_id: string };
        Returns: { full_name: string; avatar_url: string | null }[];
      };
      my_learning: { Args: Record<string, never>; Returns: MyLearningRow[] };
      can_download_file: { Args: { p_path: string }; Returns: boolean };
    };
    Enums: {
      user_role: UserRole;
      user_status: UserStatus;
      course_status: CourseStatus;
      course_level: CourseLevel;
      course_access: CourseAccess;
      lesson_type: LessonType;
      video_provider: VideoProvider;
      enrollment_source: EnrollmentSource;
      enrollment_status: EnrollmentStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};
