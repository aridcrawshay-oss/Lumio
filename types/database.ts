export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          name: string
          email: string
          avatar_url: string | null
          tokens: number
          xp: number
          streak: number
          last_active: string
          fc_mastered: number
          pomo_sessions: number
          essays_graded: number
          plans_generated: number
          tokens_spent: number
          level: number
          theme: string
          accent_idx: number
          lb_code: string
          trial_started_at: string
          trial_ends_at: string
          is_subscribed: boolean
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database['public']['Tables']['profiles']['Row']>
        Update: Partial<Database['public']['Tables']['profiles']['Row']>
      }
      subjects: {
        Row: {
          id: string
          user_id: string
          name: string
          icon: string
          color: string
          notes: string
          progress: number
          target_grade: number
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database['public']['Tables']['subjects']['Row']>
        Update: Partial<Database['public']['Tables']['subjects']['Row']>
      }
      assignments: {
        Row: {
          id: string
          user_id: string
          subject_id: string | null
          title: string
          notes: string
          due_date: string | null
          priority: 'high' | 'med' | 'low'
          done: boolean
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database['public']['Tables']['assignments']['Row']>
        Update: Partial<Database['public']['Tables']['assignments']['Row']>
      }
      flashcards: {
        Row: {
          id: string
          user_id: string
          subject_id: string | null
          subject_name: string
          deck_id: string | null
          deck_name: string | null
          source_file_id: string | null
          front: string
          back: string
          ease: number
          interval_days: number
          missed: number
          due_date: string
          last_studied_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database['public']['Tables']['flashcards']['Row']>
        Update: Partial<Database['public']['Tables']['flashcards']['Row']>
      }
      goals: {
        Row: {
          id: string
          user_id: string
          subject_id: string | null
          title: string
          subject_name: string
          target_grade: number
          current_grade: number
          created_at: string
        }
        Insert: Partial<Database['public']['Tables']['goals']['Row']>
        Update: Partial<Database['public']['Tables']['goals']['Row']>
      }
      quests: {
        Row: {
          id: string
          user_id: string
          subject_id: string | null
          title: string
          reward: number
          done: boolean
          quest_date: string
          created_at: string
        }
        Insert: Partial<Database['public']['Tables']['quests']['Row']>
        Update: Partial<Database['public']['Tables']['quests']['Row']>
      }
      files: {
        Row: {
          id: string
          user_id: string
          subject_id: string | null
          name: string
          size_bytes: number
          mime_type: string
          storage_path: string
          text_content: string | null
          created_at: string
        }
        Insert: Partial<Database['public']['Tables']['files']['Row']>
        Update: Partial<Database['public']['Tables']['files']['Row']>
      }
      mood_history: {
        Row: {
          id: string
          user_id: string
          emoji: string
          label: string
          recorded_at: string
          created_at: string
        }
        Insert: Partial<Database['public']['Tables']['mood_history']['Row']>
        Update: Partial<Database['public']['Tables']['mood_history']['Row']>
      }
      inventory: {
        Row: {
          id: string
          user_id: string
          item_id: string
          active: boolean
          purchased_at: string
        }
        Insert: Partial<Database['public']['Tables']['inventory']['Row']>
        Update: Partial<Database['public']['Tables']['inventory']['Row']>
      }
      study_history: {
        Row: {
          id: string
          user_id: string
          study_date: string
          activity_count: number
        }
        Insert: Partial<Database['public']['Tables']['study_history']['Row']>
        Update: Partial<Database['public']['Tables']['study_history']['Row']>
      }
      daily_quests: {
        Row: {
          id: string
          user_id: string
          quest_id: string
          quest_date: string
          progress: number
          done: boolean
        }
        Insert: Partial<Database['public']['Tables']['daily_quests']['Row']>
        Update: Partial<Database['public']['Tables']['daily_quests']['Row']>
      }
      lb_friends: {
        Row: {
          id: string
          user_id: string
          friend_code: string
          friend_name: string
          joined_at: string
        }
        Insert: Partial<Database['public']['Tables']['lb_friends']['Row']>
        Update: Partial<Database['public']['Tables']['lb_friends']['Row']>
      }
    }
  }
}
