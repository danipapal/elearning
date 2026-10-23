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
export type QuestionType = "single" | "multiple" | "true_false";

// Cuestionario completo (editor de admin, incluye las respuestas correctas).
export type AdminQuiz = {
  passing_score: number;
  max_attempts: number | null;
  questions: {
    id: string;
    type: QuestionType;
    prompt: string;
    explanation: string;
    options: { id: string; label: string; is_correct: boolean }[];
  }[];
};

export type QuizResult = {
  score: number;
  passed: boolean;
  correct_count: number;
  total: number;
  attempts_used: number;
  max_attempts: number | null;
  results: { question_id: string; correct: boolean }[];
  correct_options: string[] | null;
};

export type QuizReview = { correct_options: string[]; explanations: Record<string, string> };

type Quiz = { lesson_id: string; passing_score: number; max_attempts: number | null; updated_at: string };
type QuizQuestion = { id: string; lesson_id: string; type: QuestionType; prompt: string; position: number };
type QuizOption = { id: string; question_id: string; label: string; position: number };
type QuizAttempt = {
  id: string;
  user_id: string;
  lesson_id: string;
  score: number;
  passed: boolean;
  answers: Record<string, string[]>;
  created_at: string;
};
type Certificate = {
  id: string;
  user_id: string;
  course_id: string;
  code: string;
  full_name: string;
  course_title: string;
  issued_at: string;
};
export type CertificateSettings = {
  id: boolean;
  title: string;
  recipient_label: string;
  body: string;
  signer_name: string;
  signer_title: string;
  logo_path: string | null;
  signature_path: string | null;
  updated_at: string;
};

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

export type AuditEntry = {
  id: number;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  summary: string;
  details: {
    changed?: string[];
    user_id?: string;
    course_id?: string;
    expires_at?: string;
    email?: string;
    from?: { role: UserRole; status: UserStatus };
    to?: { role: UserRole; status: UserStatus };
  };
  created_at: string;
};

export type AdminUserRow = {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  status: UserStatus;
  created_at: string;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
  enrollments_count: number;
  total_count: number;
};

export type AdminEnrollmentRow = {
  enrollment_id: string;
  user_id: string;
  email: string;
  full_name: string;
  course_id: string;
  course_title: string;
  course_slug: string;
  source: EnrollmentSource;
  status: EnrollmentStatus;
  enrolled_at: string;
  expires_at: string | null;
  last_accessed_at: string | null;
  total_lessons: number;
  completed_lessons: number;
};

export type WeekCount = { week: string; count: number };

export type AdminStats = {
  users_total: number;
  students_total: number;
  users_new_7d: number;
  enrollments_total: number;
  enrollments_7d: number;
  courses_published: number;
  lessons_completed: number;
  courses_completed: number;
  users_by_week: WeekCount[];
  enrollments_by_week: WeekCount[];
  top_lessons: { lesson: string; course: string; completed: number }[];
};

export type FunnelRow = {
  lesson_id: string;
  lesson_title: string;
  module_title: string;
  enrolled: number;
  completed: number;
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
      quizzes: {
        Row: Quiz;
        Insert: never;
        Update: never;
        Relationships: [];
      };
      quiz_questions: {
        Row: QuizQuestion;
        Insert: never;
        Update: never;
        Relationships: [
          {
            foreignKeyName: "quiz_questions_lesson_id_fkey";
            columns: ["lesson_id"];
            isOneToOne: false;
            referencedRelation: "quizzes";
            referencedColumns: ["lesson_id"];
          },
        ];
      };
      quiz_options: {
        Row: QuizOption;
        Insert: never;
        Update: never;
        Relationships: [
          {
            foreignKeyName: "quiz_options_question_id_fkey";
            columns: ["question_id"];
            isOneToOne: false;
            referencedRelation: "quiz_questions";
            referencedColumns: ["id"];
          },
        ];
      };
      quiz_attempts: {
        Row: QuizAttempt;
        Insert: never;
        Update: never;
        Relationships: [];
      };
      certificates: {
        Row: Certificate;
        Insert: never;
        Update: never;
        Relationships: [
          {
            foreignKeyName: "certificates_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
        ];
      };
      certificate_settings: {
        Row: CertificateSettings;
        Insert: never;
        Update: Partial<Omit<CertificateSettings, "id" | "updated_at">>;
        Relationships: [];
      };
      audit_log: {
        Row: AuditEntry;
        Insert: never;
        Update: never;
        Relationships: [
          {
            foreignKeyName: "audit_log_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
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
      is_active_user: { Args: Record<string, never>; Returns: boolean };
      assert_admin: { Args: Record<string, never>; Returns: undefined };
      admin_list_users: {
        Args: {
          p_search?: string | null;
          p_role?: UserRole | null;
          p_status?: UserStatus | null;
          p_course_id?: string | null;
          p_from?: string | null;
          p_to?: string | null;
          p_limit?: number;
          p_offset?: number;
        };
        Returns: AdminUserRow[];
      };
      admin_get_user: {
        Args: { p_user_id: string };
        Returns: Omit<AdminUserRow, "enrollments_count" | "total_count">[];
      };
      admin_enrollment_progress: {
        Args: { p_user_id?: string | null; p_course_id?: string | null };
        Returns: AdminEnrollmentRow[];
      };
      admin_user_activity: {
        Args: { p_user_id: string; p_limit?: number };
        Returns: { completed_at: string; lesson_id: string; lesson_title: string; course_title: string }[];
      };
      admin_set_role: { Args: { p_user_id: string; p_role: UserRole }; Returns: undefined };
      admin_set_status: { Args: { p_user_id: string; p_status: UserStatus }; Returns: undefined };
      admin_delete_user: { Args: { p_user_id: string }; Returns: undefined };
      admin_enroll: {
        Args: { p_user_id: string; p_course_id: string; p_expires_at?: string | null };
        Returns: undefined;
      };
      admin_enroll_emails: {
        Args: { p_course_id: string; p_emails: string[]; p_expires_at?: string | null };
        Returns: { email: string; result: "enrolled" | "updated" | "not_found" }[];
      };
      admin_stats: { Args: Record<string, never>; Returns: AdminStats };
      admin_course_funnel: { Args: { p_course_id: string }; Returns: FunnelRow[] };
      admin_get_quiz: { Args: { p_lesson_id: string }; Returns: AdminQuiz | null };
      admin_save_quiz: { Args: { p_lesson_id: string; p_quiz: unknown }; Returns: undefined };
      admin_delete_quiz: { Args: { p_lesson_id: string }; Returns: undefined };
      submit_quiz: { Args: { p_lesson_id: string; p_answers: Record<string, string[]> }; Returns: QuizResult };
      quiz_review: { Args: { p_lesson_id: string }; Returns: QuizReview | null };
      verify_certificate: {
        Args: { p_code: string };
        Returns: { code: string; full_name: string; course_title: string; course_slug: string | null; issued_at: string }[];
      };
      admin_quiz_stats: {
        Args: Record<string, never>;
        Returns: {
          lesson_id: string;
          lesson_title: string;
          course_title: string;
          attempts: number;
          students: number;
          average_score: number | null;
          passed_students: number;
        }[];
      };
      admin_user_quizzes: {
        Args: { p_user_id: string };
        Returns: {
          lesson_id: string;
          lesson_title: string;
          course_title: string;
          attempts: number;
          best_score: number;
          passed: boolean;
          last_attempt_at: string;
        }[];
      };
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
      question_type: QuestionType;
    };
    CompositeTypes: Record<string, never>;
  };
};
