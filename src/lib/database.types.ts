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
        }
        Update: {
          username?: string
          coins?: number
        }
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
          created_at?: string
        }
        Update: {
          name?: string
          position?: string | null
          stats?: Record<string, number>
          cosmetic?: string
        }
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
        Update: Record<string, never>
      }
    }
  }
}
