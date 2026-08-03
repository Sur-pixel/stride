export type Profile = {
  id: string;
  name: string;
  onboarding_complete: boolean;
  partner_id: string | null;
  created_at: string;
};

export type Semester = {
  id: string;
  profile_id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at: string;
};

export type Course = {
  id: string;
  semester_id: string;
  name: string;
  target_study_sessions_per_week: number;
};

export type GymSchedule = {
  id: string;
  semester_id: string;
  days_per_week: number;
  monday: boolean;
  tuesday: boolean;
  wednesday: boolean;
  thursday: boolean;
  friday: boolean;
  saturday: boolean;
  sunday: boolean;
};

export type DailyProgress = {
  id: string;
  semester_id: string;
  date: string;
  study_sessions_completed: number;
  gym_completed: boolean;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: {
          id: string;
          name: string;
          onboarding_complete?: boolean;
          partner_id?: string | null;
          created_at?: string;
        };
        Update: {
          name?: string;
          onboarding_complete?: boolean;
          partner_id?: string | null;
        };
        Relationships: [];
      };
      semesters: {
        Row: Semester;
        Insert: {
          id?: string;
          profile_id: string;
          name: string;
          start_date: string;
          end_date: string;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          name?: string;
          start_date?: string;
          end_date?: string;
          is_active?: boolean;
        };
        Relationships: [];
      };
      courses: {
        Row: Course;
        Insert: {
          id?: string;
          semester_id: string;
          name: string;
          target_study_sessions_per_week: number;
        };
        Update: {
          name?: string;
          target_study_sessions_per_week?: number;
        };
        Relationships: [];
      };
      gym_schedule: {
        Row: GymSchedule;
        Insert: {
          id?: string;
          semester_id: string;
          days_per_week: number;
          monday?: boolean;
          tuesday?: boolean;
          wednesday?: boolean;
          thursday?: boolean;
          friday?: boolean;
          saturday?: boolean;
          sunday?: boolean;
        };
        Update: {
          days_per_week?: number;
          monday?: boolean;
          tuesday?: boolean;
          wednesday?: boolean;
          thursday?: boolean;
          friday?: boolean;
          saturday?: boolean;
          sunday?: boolean;
        };
        Relationships: [];
      };
      daily_progress: {
        Row: DailyProgress;
        Insert: {
          id?: string;
          semester_id: string;
          date: string;
          study_sessions_completed?: number;
          gym_completed?: boolean;
          created_at?: string;
        };
        Update: {
          study_sessions_completed?: number;
          gym_completed?: boolean;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_semester_owner: {
        Args: { p_semester_id: string };
        Returns: boolean;
      };
      complete_onboarding: {
        Args: {
          p_semester_name: string;
          p_start_date: string;
          p_end_date: string;
          p_courses?:
            | {
                name: string;
                target_study_sessions_per_week: number;
              }[]
            | null;
          p_gym_schedule?: {
            days_per_week: number;
            monday: boolean;
            tuesday: boolean;
            wednesday: boolean;
            thursday: boolean;
            friday: boolean;
            saturday: boolean;
            sunday: boolean;
          } | null;
        };
        Returns: string;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
