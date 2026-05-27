import { supabase } from './supabase'
import type { BattleRecord, CardCosmetic, UserCard } from '../types'
import type { DailyMissions } from '../store/gameStore'

const url = import.meta.env.VITE_SUPABASE_URL as string

export function isSupabaseConfigured(): boolean {
  return Boolean(url && url !== 'https://your-project.supabase.co')
}

export interface PersistedGameSlice {
  roster: UserCard[]
  coins: number
  battleHistory: BattleRecord[]
  tutorialDone: boolean
  dailyMissions: DailyMissions
  savedLineup: { formation: import('../types').Formation7v7; cardIds: Record<string, string | null> } | null
  claimedBattleRewards: number
}

export interface FetchedGameState {
  coins: number
  roster: UserCard[]
  battleHistory: BattleRecord[]
  tutorialDone: boolean
  hasProfile: boolean
}

export interface LocalMeta {
  tutorialDone?: boolean
  dailyMissions?: DailyMissions
  savedLineup?: PersistedGameSlice['savedLineup']
  claimedBattleRewards?: number
}

function dbCardToUserCard(row: {
  id: string
  name: string
  position: string | null
  stats: Record<string, number>
  cosmetic: string
  club_affinity: string | null
  nation_affinity: string | null
  image_url: string | null
  created_at: string
}): UserCard {
  return {
    id:             row.id,
    name:           row.name,
    position:       row.position as UserCard['position'],
    stats:          row.stats,
    cosmetic:       row.cosmetic as CardCosmetic,
    createdAt:      Date.parse(row.created_at),
    clubAffinity:   row.club_affinity ?? undefined,
    nationAffinity: row.nation_affinity ?? undefined,
    imageUrl:       row.image_url ?? undefined,
  }
}

function dbBattleToRecord(row: {
  id: string
  result: 'win' | 'loss' | 'draw'
  player_goals: number
  ai_goals: number
  formation: string
  coins_earned: number
  created_at: string
}): BattleRecord {
  return {
    id:          row.id,
    date:        Date.parse(row.created_at),
    result:      row.result,
    playerGoals: row.player_goals,
    aiGoals:     row.ai_goals,
    formation:   row.formation,
    coinsEarned: row.coins_earned,
  }
}

function userCardToDb(userId: string, card: UserCard) {
  return {
    id:              card.id,
    user_id:         userId,
    name:            card.name,
    position:        card.position,
    stats:           card.stats,
    cosmetic:        card.cosmetic,
    club_affinity:   card.clubAffinity ?? null,
    nation_affinity: card.nationAffinity ?? null,
    image_url:       card.imageUrl ?? null,
    created_at:      new Date(card.createdAt).toISOString(),
  }
}

function battleRecordToDb(userId: string, record: BattleRecord) {
  return {
    id:           record.id,
    user_id:      userId,
    result:       record.result,
    player_goals: record.playerGoals,
    ai_goals:     record.aiGoals,
    formation:    record.formation,
    coins_earned: record.coinsEarned,
    created_at:   new Date(record.date).toISOString(),
  }
}

export async function fetchRemoteGameState(userId: string): Promise<FetchedGameState | null> {
  if (!isSupabaseConfigured()) return null

  const [profileRes, cardsRes, battlesRes] = await Promise.all([
    supabase.from('profiles').select('coins').eq('id', userId).maybeSingle(),
    supabase.from('user_cards').select('*').eq('user_id', userId).order('created_at'),
    supabase.from('battle_history').select('*').eq('user_id', userId).order('created_at'),
  ])

  if (profileRes.error) console.warn('[gameSync] profile fetch failed', profileRes.error.message)
  if (cardsRes.error) console.warn('[gameSync] cards fetch failed', cardsRes.error.message)
  if (battlesRes.error) console.warn('[gameSync] battles fetch failed', battlesRes.error.message)

  const roster = (cardsRes.data ?? []).map(dbCardToUserCard)
  const battleHistory = (battlesRes.data ?? []).map(dbBattleToRecord)
  const hasProfile = profileRes.data != null
  const coins = profileRes.data?.coins ?? 0

  return {
    coins,
    roster,
    battleHistory,
    hasProfile,
    tutorialDone: roster.length > 0 || battleHistory.length > 0,
  }
}

export function mergeRemoteWithLocal(
  local: PersistedGameSlice,
  remote: FetchedGameState,
  meta: LocalMeta | null,
): Partial<PersistedGameSlice> {
  const rosterMap = new Map<string, UserCard>()
  for (const card of remote.roster) rosterMap.set(card.id, card)
  for (const card of local.roster) {
    if (!rosterMap.has(card.id)) rosterMap.set(card.id, card)
  }

  const battleMap = new Map<string, BattleRecord>()
  for (const record of remote.battleHistory) battleMap.set(record.id, record)
  for (const record of local.battleHistory) {
    if (!battleMap.has(record.id)) battleMap.set(record.id, record)
  }

  const roster = [...rosterMap.values()].sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0))
  const battleHistory = [...battleMap.values()].sort((a, b) => a.date - b.date)

  const hasLocalProgress =
    local.roster.length > 0 ||
    local.battleHistory.length > 0 ||
    local.tutorialDone

  const hasRemoteProgress =
    remote.roster.length > 0 ||
    remote.battleHistory.length > 0 ||
    remote.tutorialDone

  const coins = remote.hasProfile
    ? (hasLocalProgress && !hasRemoteProgress ? Math.max(local.coins, remote.coins) : remote.coins)
    : local.coins

  return {
    roster,
    battleHistory,
    coins,
    tutorialDone:
      local.tutorialDone ||
      remote.tutorialDone ||
      meta?.tutorialDone === true ||
      roster.length > 0 ||
      battleHistory.length > 0,
    dailyMissions:        meta?.dailyMissions        ?? local.dailyMissions,
    savedLineup:          meta?.savedLineup          ?? local.savedLineup,
    claimedBattleRewards: meta?.claimedBattleRewards ?? local.claimedBattleRewards,
  }
}

export async function pushRemoteGameState(userId: string, state: PersistedGameSlice): Promise<void> {
  if (!isSupabaseConfigured()) return

  const { error: profileError } = await supabase
    .from('profiles')
    .update({ coins: state.coins })
    .eq('id', userId)

  if (profileError) console.warn('[gameSync] profile sync failed', profileError.message)

  if (state.roster.length > 0) {
    const { error: cardsError } = await supabase
      .from('user_cards')
      .upsert(state.roster.map(card => userCardToDb(userId, card)), { onConflict: 'id' })

    if (cardsError) console.warn('[gameSync] cards sync failed', cardsError.message)
  }

  if (state.battleHistory.length > 0) {
    const { error: battlesError } = await supabase
      .from('battle_history')
      .upsert(state.battleHistory.map(record => battleRecordToDb(userId, record)), { onConflict: 'id' })

    if (battlesError) console.warn('[gameSync] battles sync failed', battlesError.message)
  }

  const meta: LocalMeta = {
    tutorialDone:         state.tutorialDone,
    dailyMissions:        state.dailyMissions,
    savedLineup:          state.savedLineup,
    claimedBattleRewards: state.claimedBattleRewards,
  }
  localStorage.setItem(`futbattles-meta:${userId}`, JSON.stringify(meta))
}

export function loadLocalMeta(userId: string): LocalMeta | null {
  const raw = localStorage.getItem(`futbattles-meta:${userId}`)
  if (!raw) return null
  try {
    return JSON.parse(raw) as LocalMeta
  } catch {
    return null
  }
}

let syncTimer: ReturnType<typeof setTimeout> | null = null

export function scheduleRemoteSync(userId: string, state: PersistedGameSlice): void {
  if (!isSupabaseConfigured()) return
  if (syncTimer) clearTimeout(syncTimer)
  syncTimer = setTimeout(() => {
    syncTimer = null
    void pushRemoteGameState(userId, state)
  }, 900)
}

export function cancelRemoteSync(): void {
  if (syncTimer) {
    clearTimeout(syncTimer)
    syncTimer = null
  }
}

export function pickPersistedSlice(state: {
  roster: UserCard[]
  coins: number
  battleHistory: BattleRecord[]
  tutorialDone: boolean
  dailyMissions: DailyMissions
  savedLineup: PersistedGameSlice['savedLineup']
  claimedBattleRewards: number
}): PersistedGameSlice {
  return {
    roster:               state.roster,
    coins:                state.coins,
    battleHistory:        state.battleHistory,
    tutorialDone:         state.tutorialDone,
    dailyMissions:        state.dailyMissions,
    savedLineup:          state.savedLineup,
    claimedBattleRewards: state.claimedBattleRewards,
  }
}

export function persistedSlicesEqual(a: PersistedGameSlice, b: PersistedGameSlice): boolean {
  return (
    a.coins === b.coins &&
    a.tutorialDone === b.tutorialDone &&
    a.claimedBattleRewards === b.claimedBattleRewards &&
    a.roster.length === b.roster.length &&
    a.battleHistory.length === b.battleHistory.length &&
    a.roster.every((card, i) => card.id === b.roster[i]?.id) &&
    a.battleHistory.every((record, i) => record.id === b.battleHistory[i]?.id)
  )
}
