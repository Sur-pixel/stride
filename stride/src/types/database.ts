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
  created_at: string;
};

export type Course = {
  id: string;
  semester_id: string;
  name: string;
  difficulty_rank: number;
  total_sessions: number;
  sessions_completed: number;
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
  gym_completed: boolean;
  completed_course_ids: string[];
  created_at: string;
};

export type InvitationStatus =
  | 'pending'
  | 'accepted'
  | 'declined'
  | 'cancelled';

export type PartnerInvitation = {
  id: string;
  from_user_id: string;
  to_email: string;
  to_user_id: string | null;
  status: InvitationStatus;
  created_at: string;
  responded_at: string | null;
};

type RankedCourseInsert = {
  name: string;
  difficulty_rank: number;
  total_sessions: number;
};

type GymScheduleInsert = {
  days_per_week: number;
  monday: boolean;
  tuesday: boolean;
  wednesday: boolean;
  thursday: boolean;
  friday: boolean;
  saturday: boolean;
  sunday: boolean;
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
          created_at?: string;
        };
        Update: {
          name?: string;
          start_date?: string;
          end_date?: string;
        };
        Relationships: [];
      };
      courses: {
        Row: Course;
        Insert: {
          id?: string;
          semester_id: string;
          name: string;
          difficulty_rank: number;
          total_sessions: number;
          sessions_completed?: number;
        };
        Update: {
          name?: string;
          difficulty_rank?: number;
          total_sessions?: number;
          sessions_completed?: number;
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
          gym_completed?: boolean;
          completed_course_ids?: string[];
          created_at?: string;
        };
        Update: {
          gym_completed?: boolean;
          completed_course_ids?: string[];
        };
        Relationships: [];
      };
      partner_invitations: {
        Row: PartnerInvitation;
        Insert: {
          id?: string;
          from_user_id: string;
          to_email: string;
          to_user_id?: string | null;
          status?: InvitationStatus;
          created_at?: string;
          responded_at?: string | null;
        };
        Update: {
          status?: InvitationStatus;
          responded_at?: string | null;
          to_user_id?: string | null;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      can_read_semester: {
        Args: { p_semester_id: string };
        Returns: boolean;
      };
      current_partner_id: {
        Args: Record<string, never>;
        Returns: string | null;
      };
      complete_onboarding: {
        Args: {
          p_semester_name: string;
          p_start_date: string;
          p_end_date: string;
          p_ranked_courses?: RankedCourseInsert[] | null;
          p_gym_schedule?: GymScheduleInsert | null;
        };
        Returns: string;
      };
      complete_study_session: {
        Args: { p_course_id: string };
        Returns: void;
      };
      undo_study_session: {
        Args: { p_course_id: string };
        Returns: void;
      };
      send_partner_invitation: {
        Args: { p_to_email: string };
        Returns: string;
      };
      accept_partner_invitation: {
        Args: { p_invitation_id: string };
        Returns: void;
      };
      decline_partner_invitation: {
        Args: { p_invitation_id: string };
        Returns: void;
      };
      cancel_partner_invitation: {
        Args: { p_invitation_id: string };
        Returns: void;
      };
      unpair_partner: {
        Args: Record<string, never>;
        Returns: void;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
