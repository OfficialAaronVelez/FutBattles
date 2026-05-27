import { create } from 'zustand'
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware'
import {
  cancelRemoteSync,
  fetchRemoteGameState,
  loadLocalMeta,
  mergeRemoteWithLocal,
  pickPersistedSlice,
  persistedSlicesEqual,
  pushRemoteGameState,
  scheduleRemoteSync,
} from '../lib/gameSync'
import type {
  UserCard,
  PackOpeningState,
  StatKey,
  PlayerStats,
  Position,
  LockedSlot,
  PackRarity,
  ActiveBattle,
  Team7v7,
  Formation7v7,
  BattleRecord,
  CardCosmetic,
  RealPlayer,
  TacticType,
} from '../types'
import { getPackPlayers, PLAYERS } from '../data/players'
import { randomCosmetic } from '../data/cosmetics'
import {
  generateAiTeam,
  resolveRound, computeManOfMatch, computePerformanceCoins, TOTAL_ROUNDS,
} from '../utils/battle'
import { MINI_GAMES } from '../types'

const PACK_SIZE   = 8
const BONUS_CARDS = 1

/** Apply random variance to every stat on a player card. Clamped to 40–99. */
function varyStats(player: RealPlayer, rarity: PackRarity): RealPlayer {
  const spread = rarity === 'icon' ? 3 : 5
  const varied: Partial<Record<StatKey, number>> = {}
  for (const [key, val] of Object.entries(player.stats)) {
    if (typeof val === 'number') {
      const delta = Math.floor(Math.random() * (spread * 2 + 1)) - spread
      varied[key as StatKey] = Math.max(40, Math.min(99, val + delta))
    }
  }
  const stats = varied as PlayerStats
  const overall = Math.round(
    Object.values(stats).reduce((sum, v) => sum + v, 0) / Object.values(stats).length
  )
  return { ...player, stats, overall }
}

export const PACK_COSTS: Record<PackRarity, number> = {
  bronze: 100,
  silver: 250,
  gold:   600,
  icon:   1500,
}

export const BATTLE_REWARDS: Record<'win' | 'loss' | 'draw', number> = {
  win:  150,
  draw:  50,
  loss:  25,
}

// ─── Daily missions ───────────────────────────────────────────────
export interface DailyMissions {
  date:              string   // YYYY-MM-DD
  battlesWon:        number   // wins earned today (cap display at 3)
  goldPackOpened:    boolean
  cosmeticForged:    boolean
  // reward already paid flags (prevent double-paying)
  battlesRewarded:   boolean
  goldPackRewarded:  boolean
  cosmeticRewarded:  boolean
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

function freshDaily(): DailyMissions {
  return {
    date: todayStr(),
    battlesWon: 0, goldPackOpened: false, cosmeticForged: false,
    battlesRewarded: false, goldPackRewarded: false, cosmeticRewarded: false,
  }
}

/** Returns the current daily missions, resetting to fresh if it's a new day. */
function ensureDaily(d: DailyMissions | null | undefined): DailyMissions {
  if (!d || d.date !== todayStr()) return freshDaily()
  return d
}

export const STORAGE_BASE = 'futbattles-storage'

let activeUserId: string | null = null
let skipPersistWrite = false
let syncUnsub: (() => void) | null = null

function userStorageKey() {
  return activeUserId ? `${STORAGE_BASE}:${activeUserId}` : `${STORAGE_BASE}:anonymous`
}

const userScopedStorage: StateStorage = {
  getItem: () => localStorage.getItem(userStorageKey()),
  setItem: (_name, value) => {
    if (skipPersistWrite || !activeUserId) return
    localStorage.setItem(userStorageKey(), value)
  },
  removeItem: () => {
    if (!activeUserId) return
    localStorage.removeItem(userStorageKey())
  },
}

/** Move pre-auth global saves onto the signed-in account once. */
export function migrateLegacyStorage(userId: string) {
  const userKey = `${STORAGE_BASE}:${userId}`
  if (localStorage.getItem(userKey)) return
  const legacy = localStorage.getItem(STORAGE_BASE)
  if (legacy) localStorage.setItem(userKey, legacy)
}

export async function initGameStoreForUser(userId: string): Promise<void> {
  syncUnsub?.()
  syncUnsub = null
  cancelRemoteSync()

  activeUserId = userId
  migrateLegacyStorage(userId)
  await useGameStore.persist.rehydrate()

  // Mark the store as hydrated immediately after local storage is loaded.
  // This flag is NOT persisted — it resets to false whenever the store module
  // is recreated (e.g. during Vite HMR), which lets App.tsx detect the reset
  // and re-run initialisation instead of showing a stale tutorialDone: false state.
  useGameStore.setState({ storeHydrated: true })

  const meta = loadLocalMeta(userId)
  if (meta) {
    const current = useGameStore.getState()
    useGameStore.setState({
      tutorialDone:         meta.tutorialDone         ?? current.tutorialDone,
      dailyMissions:        meta.dailyMissions        ?? current.dailyMissions,
      savedLineup:          meta.savedLineup          ?? current.savedLineup,
      claimedBattleRewards: meta.claimedBattleRewards ?? current.claimedBattleRewards,
    })
  }

  try {
    const remote = await fetchRemoteGameState(userId)
    if (remote) {
      const merged = mergeRemoteWithLocal(
        pickPersistedSlice(useGameStore.getState()),
        remote,
        meta,
      )
      useGameStore.setState({ ...merged, packSession: null, battle: null })
      await pushRemoteGameState(userId, pickPersistedSlice(useGameStore.getState()))
    }
  } catch (err) {
    console.warn('[gameStore] remote init failed', err)
  }

  let prevSlice = pickPersistedSlice(useGameStore.getState())
  syncUnsub = useGameStore.subscribe(state => {
    if (!activeUserId) return
    const nextSlice = pickPersistedSlice(state)
    if (!persistedSlicesEqual(prevSlice, nextSlice)) {
      prevSlice = nextSlice
      scheduleRemoteSync(activeUserId, nextSlice)
    }
  })
}

export function clearGameStoreOnLogout(): void {
  syncUnsub?.()
  syncUnsub = null
  cancelRemoteSync()

  skipPersistWrite = true
  activeUserId = null
  useGameStore.setState({
    roster:               [],
    coins:                2000,
    battleHistory:        [],
    packSession:          null,
    battle:               null,
    tutorialDone:         false,
    dailyMissions:        freshDaily(),
    savedLineup:          null,
    claimedBattleRewards: 0,
    storeHydrated:        false,
  })
  skipPersistWrite = false
}

interface GameStore {
  roster:               UserCard[]
  coins:                number
  battleHistory:        BattleRecord[]
  packSession:          PackOpeningState | null
  battle:               ActiveBattle | null
  tutorialDone:         boolean
  dailyMissions:        DailyMissions
  savedLineup:          { formation: Formation7v7; cardIds: Record<string, string | null> } | null
  claimedBattleRewards: number   // how many 3-win milestone rewards have been claimed
  /** Runtime flag — true once initGameStoreForUser has rehydrated from storage.
   *  NOT persisted. Resets to false whenever the store module is recreated (e.g. during HMR)
   *  which forces a re-initialisation and prevents the tutorial from flashing. */
  storeHydrated:        boolean
  saveLineup:           (formation: Formation7v7, slots: import('../types').FormationSlot[]) => void

  // Tutorial
  setTutorialDone:       () => void
  addCoins:              (amount: number) => void
  startFreePackOpening:  (playerName: string, rarity: PackRarity) => void

  // Pack opening
  startPackOpening:    (playerName: string, rarity: PackRarity) => void
  cancelPackOpening:   () => void   // refunds coins; only valid from PackIntro phase
  advanceToOpening:    () => void
  selectStat:        (stat: StatKey, value: number, fromPlayer: string) => void
  selectPosition:    (position: Position, fromPlayer: string) => void
  selectCosmetic:    (cosmetic: CardCosmetic) => void
  replaceStat:       (stat: StatKey, value: number, fromPlayer: string) => void
  skipCard:          () => void
  finalizeCard:      (imageUrl?: string, cardId?: string) => void
  resetPackSession:  () => void

  // Battle
  startBattle:          () => void
  setPlayerTeam:        (team: Team7v7) => void
  runBattle:            () => void                    // sets up AI team, goes to round-pick
  confirmBattleRound:   (attackerId: string, defenderId: string, tactic: TacticType | null) => void
  advanceBattleRound:   () => void                    // after animation: next round or result
  completeBattle:       () => void
  resetBattle:          () => void
  confirmSub:           (cardId: string, slotId: string) => void
}

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      roster:               [],
      coins:                2000,
      battleHistory:        [],
      packSession:          null,
      battle:               null,
      tutorialDone:         false,
      dailyMissions:        freshDaily(),
      savedLineup:          null,
      claimedBattleRewards: 0,
      storeHydrated:        false,

      setTutorialDone: () => set({ tutorialDone: true }),

      saveLineup: (formation, slots) => {
        // Store only slotId → cardId mapping so the saved data stays light
        // and always uses the freshest card stats when re-loaded
        const cardIds: Record<string, string | null> = {}
        for (const s of slots) cardIds[s.id] = s.card?.id ?? null
        set({ savedLineup: { formation, cardIds } })
      },

      addCoins: (amount) => set(s => ({ coins: s.coins + amount })),

      startFreePackOpening: (playerName, rarity) => {
        const rawCards   = getPackPlayers(rarity, PACK_SIZE)
        const cosmeticIdx = Math.floor(Math.random() * (PACK_SIZE - BONUS_CARDS))
        const packCards  = rawCards.map((p, i) => ({
          realPlayer:    varyStats(p, rarity),
          isBonus:       i >= PACK_SIZE - BONUS_CARDS,
          cosmeticOffer: i === cosmeticIdx ? randomCosmetic() : undefined,
        }))
        const miniGames = [...MINI_GAMES].sort(() => Math.random() - 0.5)
        set({
          packSession: {
            packCards,
            currentCardIndex: 0,
            lockedStats:    {},
            lockedPosition: null,
            lockedCosmetic: null,
            playerName,
            rarity,
            phase: 'intro',
            costPaid: 0,
            miniGames,
          },
        })
      },

      startPackOpening: (playerName, rarity) => {
        const cost = PACK_COSTS[rarity]
        if (get().coins < cost) return

        const rawCards = getPackPlayers(rarity, PACK_SIZE)

        // Place cosmetic offer on one random non-bonus card
        const cosmeticIdx = Math.floor(Math.random() * (PACK_SIZE - BONUS_CARDS))

        const packCards = rawCards.map((p, i) => ({
          realPlayer: varyStats(p, rarity),
          isBonus:       i >= PACK_SIZE - BONUS_CARDS,
          cosmeticOffer: i === cosmeticIdx ? randomCosmetic() : undefined,
        }))

        const miniGames = [...MINI_GAMES].sort(() => Math.random() - 0.5)

        set(s => ({
          coins: s.coins - cost,
          packSession: {
            packCards,
            currentCardIndex: 0,
            lockedStats:    {},
            lockedPosition: null,
            lockedCosmetic: null,
            playerName,
            rarity,
            phase: 'intro',
            costPaid: cost,
            miniGames,
          },
        }))
      },

      cancelPackOpening: () => {
        const { packSession } = get()
        if (!packSession) return
        // Only refund if still in intro phase — once the pack is opened, coins are spent
        if (packSession.phase === 'intro') {
          set(s => ({ coins: s.coins + packSession.costPaid, packSession: null }))
        } else {
          set({ packSession: null })
        }
      },

      advanceToOpening: () => {
        const { packSession } = get()
        if (!packSession) return
        set({ packSession: { ...packSession, phase: 'opening' } })
      },

      selectStat: (stat, value, fromPlayer) => {
        const { packSession } = get()
        if (!packSession) return
        set({
          packSession: {
            ...packSession,
            lockedStats: { ...packSession.lockedStats, [stat]: { stat, value, fromPlayer } as LockedSlot },
            currentCardIndex: packSession.currentCardIndex + 1,
          },
        })
      },

      selectPosition: (position, fromPlayer) => {
        const { packSession } = get()
        if (!packSession) return
        // Does NOT advance the card — position is a free side-pick alongside a stat
        set({ packSession: { ...packSession, lockedPosition: { position, fromPlayer } } })
      },

      selectCosmetic: (cosmetic) => {
        const { packSession } = get()
        if (!packSession) return
        // Does NOT advance the card — cosmetic is a free side-pick alongside a stat
        set({ packSession: { ...packSession, lockedCosmetic: cosmetic } })
      },

      replaceStat: (stat, value, fromPlayer) => {
        const { packSession } = get()
        if (!packSession) return
        set({
          packSession: {
            ...packSession,
            lockedStats: { ...packSession.lockedStats, [stat]: { stat, value, fromPlayer } as LockedSlot },
            currentCardIndex: packSession.currentCardIndex + 1,
          },
        })
      },

      skipCard: () => {
        const { packSession } = get()
        if (!packSession) return
        set({ packSession: { ...packSession, currentCardIndex: packSession.currentCardIndex + 1 } })
      },

      finalizeCard: (imageUrl, cardId) => {
        const { packSession, roster, coins } = get()
        if (!packSession) return
        const stats: Partial<Record<StatKey, number>> = {}
        for (const [key, slot] of Object.entries(packSession.lockedStats)) {
          stats[key as StatKey] = slot.value
        }
        // Look up the real player who donated the position to get club/nation affinity
        const posFromName  = packSession.lockedPosition?.fromPlayer
        const sourcePlayer = posFromName ? PLAYERS.find(p => p.name === posFromName) : null

        const newCard: UserCard = {
          id:             cardId ?? crypto.randomUUID(),
          name:           packSession.playerName,
          position:       packSession.lockedPosition?.position ?? null,
          stats,
          cosmetic:       packSession.lockedCosmetic ?? 'base',
          createdAt:      Date.now(),
          clubAffinity:   sourcePlayer?.club,
          nationAffinity: sourcePlayer?.nation,
          imageUrl,
        }

        // ── Daily mission rewards ──
        let daily = ensureDaily(get().dailyMissions)
        let bonus = 0

        if (packSession.rarity === 'gold' && !daily.goldPackOpened) {
          daily = { ...daily, goldPackOpened: true, goldPackRewarded: true }
          bonus += 250
        }
        if (packSession.lockedCosmetic && !daily.cosmeticForged) {
          daily = { ...daily, cosmeticForged: true, cosmeticRewarded: true }
          bonus += 1000
        }

        set({ roster: [...roster, newCard], packSession: null, coins: coins + bonus, dailyMissions: daily })
      },

      resetPackSession: () => set({ packSession: null }),

      startBattle: () =>
        set({
          battle: {
            phase:           'team-select',
            playerTeam:      null,
            aiPlayers:       [],
            aiFormation:     '3-2-2',
            result:          null,
            currentRound:    1,
            totalRounds:     TOTAL_ROUNDS,
            playerGoals:     0,
            aiGoals:         0,
            completedRounds: [],
            momentumPlayer:  0,
            momentumAi:      0,
            subUsed:         false,
            subSlotId:       null,
            lastAttackerId:  null,
            currentTactic:   null,
          },
        }),

      setPlayerTeam: (team) => {
        const { battle } = get()
        if (!battle) return
        set({ battle: { ...battle, playerTeam: team } })
      },

      runBattle: () => {
        const { battle } = get()
        if (!battle?.playerTeam) return

        // Calculate avg OVR to calibrate AI difficulty
        const avgOverall = Math.round(
          battle.playerTeam.slots
            .map(s => {
              if (!s.card) return 75
              const vals = Object.values(s.card.stats).filter(Boolean) as number[]
              return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 75
            })
            .reduce((a, b) => a + b, 0) / 7
        )

        const aiPlayers = generateAiTeam(battle.playerTeam.formation, avgOverall)
        set({
          battle: {
            ...battle,
            phase:           'round-pick',
            aiPlayers,
            result:          null,
            currentRound:    1,
            totalRounds:     TOTAL_ROUNDS,
            playerGoals:     0,
            aiGoals:         0,
            completedRounds: [],
            momentumPlayer:  0,
            momentumAi:      0,
            subUsed:         false,
            subSlotId:       null,
            lastAttackerId:  null,
            currentTactic:   null,
          },
        })
      },

      confirmBattleRound: (attackerId, defenderId, tactic) => {
        const { battle } = get()
        if (!battle?.playerTeam || battle.phase !== 'round-pick') return

        const round = resolveRound(
          attackerId,
          defenderId,
          battle.currentRound,
          battle.playerTeam,
          battle.aiPlayers,
          battle.momentumPlayer,
          battle.momentumAi,
          battle.lastAttackerId,
          tactic,
        )

        set({
          battle: {
            ...battle,
            phase:           'battling',
            completedRounds: [...battle.completedRounds, round],
            lastAttackerId:  attackerId,
            currentTactic:   null,
          },
        })
      },

      confirmSub: (cardId, slotId) => {
        const { battle, roster } = get()
        if (!battle?.playerTeam || battle.subUsed) return

        const incomingCard = roster.find(c => c.id === cardId)
        if (!incomingCard) return

        const newSlots = battle.playerTeam.slots.map(slot =>
          slot.id === slotId ? { ...slot, card: incomingCard } : slot,
        )

        set({
          battle: {
            ...battle,
            playerTeam: { ...battle.playerTeam, slots: newSlots },
            subUsed:     true,
            subSlotId:   slotId,
          },
        })
      },

      advanceBattleRound: () => {
        const { battle } = get()
        if (!battle || battle.phase !== 'battling') return

        const lastRound = battle.completedRounds[battle.completedRounds.length - 1]
        if (!lastRound) return

        const newPlayerGoals = battle.playerGoals + (lastRound.playerScored ? 1 : 0)
        const newAiGoals     = battle.aiGoals     + (lastRound.aiScored     ? 1 : 0)

        if (battle.currentRound < battle.totalRounds) {
          // More rounds to play
          set({
            battle: {
              ...battle,
              phase:          'round-pick',
              currentRound:   battle.currentRound + 1,
              playerGoals:    newPlayerGoals,
              aiGoals:        newAiGoals,
              momentumPlayer: lastRound.momentumAfter.player,
              momentumAi:     lastRound.momentumAfter.ai,
            },
          })
        } else {
          // All rounds done — build final result
          const winner: 'player' | 'ai' | 'draw' = newPlayerGoals > newAiGoals ? 'player'
                       : newAiGoals > newPlayerGoals ? 'ai'
                       : 'draw'
          const { battleHistory } = get()
          const winStreak = [...battleHistory].reverse()
            .reduce((s, r) => s.done ? s : r.result === 'win' ? { count: s.count + 1, done: false } : { count: s.count, done: true },
              { count: 0, done: false }).count

          const result = {
            rounds:           battle.completedRounds,
            playerGoals:      newPlayerGoals,
            aiGoals:          newAiGoals,
            winner,
            manOfMatch:       computeManOfMatch(battle.completedRounds),
            performanceCoins: computePerformanceCoins(newPlayerGoals, newAiGoals, winner, winStreak),
            streakMultiplier: winStreak >= 5 ? 2.0 : winStreak >= 3 ? 1.5 : winStreak >= 2 ? 1.25 : 1.0,
          }
          set({ battle: { ...battle, phase: 'result', result, playerGoals: newPlayerGoals, aiGoals: newAiGoals } })
        }
      },

      completeBattle: () => {
        const { battle, battleHistory, coins, claimedBattleRewards } = get()
        if (!battle?.result || !battle.playerTeam) return

        const coinsEarned = battle.result.performanceCoins
        const isWin = battle.result.winner === 'player'
        const record: BattleRecord = {
          id:          crypto.randomUUID(),
          date:        Date.now(),
          result:      isWin ? 'win' : battle.result.winner === 'ai' ? 'loss' : 'draw',
          playerGoals: battle.result.playerGoals,
          aiGoals:     battle.result.aiGoals,
          formation:   battle.playerTeam.formation,
          coinsEarned,
        }

        // ── Daily mission: Win 3 battles ──
        let daily = ensureDaily(get().dailyMissions)
        let missionBonus = 0
        if (isWin) {
          const newWins = daily.battlesWon + 1
          daily = { ...daily, battlesWon: newWins }
          if (newWins >= 3 && !daily.battlesRewarded) {
            daily = { ...daily, battlesRewarded: true }
            missionBonus = 500
          }
        }

        // ── Milestone reward: every 3 cumulative wins → 500 coins ──
        let milestoneBonus = 0
        let newClaimedRewards = claimedBattleRewards
        if (isWin) {
          const totalWinsAfter = battleHistory.filter(r => r.result === 'win').length + 1
          if (totalWinsAfter >= (newClaimedRewards + 1) * 3) {
            milestoneBonus = 500
            newClaimedRewards += 1
          }
        }

        set({
          coins:                coins + coinsEarned + missionBonus + milestoneBonus,
          battleHistory:        [...battleHistory, record],
          dailyMissions:        daily,
          claimedBattleRewards: newClaimedRewards,
        })
      },

      resetBattle: () => set({ battle: null }),
    }),
    {
      name: STORAGE_BASE,
      storage: createJSONStorage(() => userScopedStorage),
      partialize: state => pickPersistedSlice(state),
      skipHydration: true,
      version: 7,
      migrate: (persisted: unknown, fromVersion: number) => {
        const s = (persisted ?? {}) as Record<string, unknown>
        const coins        = typeof s.coins === 'number' ? s.coins : 0
        const roster       = Array.isArray(s.roster)        ? s.roster        : []
        const history      = Array.isArray(s.battleHistory)  ? s.battleHistory  : []
        // v2→v3: tutorialDone — existing users with data skip tutorial
        const tutorialDone = fromVersion >= 2
          ? (roster.length > 0 || history.length > 0 || s.tutorialDone === true)
          : false

        // v6: auto-assign positions to any card that still has position: null
        // Rule: ATK (SHO+PAC+DRI), MID (PAS+DRI+PHY), DEF (DEF+PHY+PAC)
        const fixedRoster = roster.map((card: Record<string, unknown>) => {
          if (card.position !== null && card.position !== undefined) return card
          const st = (card.stats ?? {}) as Record<string, number>
          const atkScore = (st.SHO ?? 70) * 0.4 + (st.PAC ?? 70) * 0.3 + (st.DRI ?? 70) * 0.3
          const midScore = (st.PAS ?? 70) * 0.4 + (st.DRI ?? 70) * 0.3 + (st.PHY ?? 70) * 0.3
          const defScore = (st.DEF ?? 70) * 0.5 + (st.PHY ?? 70) * 0.4 + (st.PAC ?? 70) * 0.1
          const pos = atkScore >= midScore && atkScore >= defScore ? 'ST'
                    : midScore >= defScore ? 'CM'
                    : 'CB'
          return { ...card, position: pos }
        })

        // Carry over today's daily missions if they exist; otherwise start fresh
        const dailyMissions = ensureDaily(s.dailyMissions as DailyMissions | null | undefined)

        return {
          ...s,
          coins:        coins < 500 ? 1000 : coins,
          roster:       fixedRoster,
          tutorialDone,
          dailyMissions,
          battle:       null,   // always clear battle on migration (schema changed in v7)
          packSession:  null,
        }
      },
    }
  )
)
