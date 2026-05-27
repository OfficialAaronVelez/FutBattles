// Auto-generated shape matching our Supabase schema.
// Re-run `npx supabase gen types typescript` after schema changes.

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string
          coins: number
          created_at: string
        }
        Insert: {
          id: string
          username: string
          coins?: number
          created_at?: string
        }
        Update: {
          username?: string
          coins?: number
          created_at?: string
        }
        Relationships: []
      }
      user_cards: {
        Row: {
          id: string
          user_id: string
          name: string
          position: string | null
          stats: Record<string, number>
          cosmetic: string
          club_affinity: string | null
          nation_affinity: string | null
          image_url: string | null
          created_at: string
        }
        Insert: {
          id: string
          user_id: string
          name: string
          position?: string | null
          stats: Record<string, number>
          cosmetic: string
          club_affinity?: string | null
          nation_affinity?: string | null
          image_url?: string | null
          created_at?: string
        }
        Update: {
          name?: string
          position?: string | null
          stats?: Record<string, number>
          cosmetic?: string
          club_affinity?: string | null
          nation_affinity?: string | null
          image_url?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'user_cards_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      battle_history: {
        Row: {
          id: string
          user_id: string
          result: 'win' | 'loss' | 'draw'
          player_goals: number
          ai_goals: number
          formation: string
          coins_earned: number
          created_at: string
        }
        Insert: {
          id: string
          user_id: string
          result: 'win' | 'loss' | 'draw'
          player_goals: number
          ai_goals: number
          formation: string
          coins_earned: number
          created_at?: string
        }
        Update: {
          result?: 'win' | 'loss' | 'draw'
          player_goals?: number
          ai_goals?: number
          formation?: string
          coins_earned?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'battle_history_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
