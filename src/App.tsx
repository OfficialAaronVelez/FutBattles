import { useState, useEffect, useMemo } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import { BackgroundMusic } from './components/Audio/BackgroundMusic'
import { AuthScreen } from './components/Auth/AuthScreen'
import { TutorialFlow } from './components/Tutorial/TutorialFlow'
import { PackOpening } from './components/PackOpening/PackOpening'
import { Roster } from './components/Team/Roster'
import { TeamSelector } from './components/Battle/TeamSelector'
import { BattleScreen } from './components/Battle/BattleScreen'
import { BattleHistory } from './components/Battle/BattleHistory'
import { TCGStudio } from './components/TCG/TCGStudio'
import { useGameStore, initGameStoreForUser, clearGameStoreOnLogout } from './store/gameStore'
import type { DailyMissions } from './store/gameStore'
import { circleAvatar } from './utils/portrait'
import type { BattleRecord, UserCard } from './types'

type Tab = 'home' | 'pack' | 'roster' | 'battle' | 'tcg'
type BattleSubTab = 'play' | 'history'

const DESKTOP_MQ = '(min-width: 900px)'

function initialTab(): Tab {
  if (typeof window !== 'undefined' && window.matchMedia(DESKTOP_MQ).matches) return 'pack'
  return 'home'
}

/* ── Live feed ───────────────────────────────────────────────────── */
type FeedEvent = { accent: string; emoji: string; who: string; what: string; ts: number }

/** LCG seeded random — stable for a given seed value. */
function seededRand(seed: number) {
  let s = seed >>> 0
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 0x100000000 }
}

function timeAgo(ts: number): string {
  const diff = Math.max(0, Date.now() - ts)
  const mins = Math.floor(diff / 60_000)
  if (mins < 1)  return 'now'
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(diff / 3_600_000)
  if (hrs < 24)  return `${hrs}h`
  return `${Math.floor(diff / 86_400_000)}d`
}

function buildLiveFeed(history: BattleRecord[], roster: UserCard[], username: string): FeedEvent[] {
  // ── Real user events ──
  const user: FeedEvent[] = []

  for (const r of [...history].reverse().slice(0, 6)) {
    const win  = r.result === 'win'
    const draw = r.result === 'draw'
    user.push({
      accent: win ? 'var(--green-1)' : draw ? 'var(--ink-2)' : 'var(--red-1)',
      emoji:  win ? '🏆' : draw ? '🤝' : '💀',
      who:    username,
      what:   `${win ? 'won' : draw ? 'drew' : 'lost'} ${r.playerGoals}–${r.aiGoals} ${win || draw ? 'vs' : 'to'} AI`,
      ts:     r.date,
    })
  }

  const recentCards = [...roster]
    .filter(c => c.createdAt != null)
    .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
    .slice(0, 3)
  for (const card of recentCards) {
    const vals = Object.values(card.stats).filter((v): v is number => typeof v === 'number')
    const ovr  = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 70
    user.push({
      accent: 'var(--gold-1)', emoji: '⭐',
      who:    username,
      what:   `forged ${card.name} (${ovr} OVR${card.position ? ' · ' + card.position : ''})`,
      ts:     card.createdAt!,
    })
  }

  // ── Simulated AI events — re-seed every hour so they feel fresh but stable ──
  const rand = seededRand(Math.floor(Date.now() / 3_600_000))
  const RIVALS    = ['ZARA_99','MARQUEZ_7','TOPSPIN','GHOST.04','ECHO_X','VOLT.7','NOVA_42','WRAITH','KIRA_88','DELTA_5']
  const POSITIONS = ['ST','CAM','CM','CB','LW','RW','CDM','LB','RB']
  const COSMETICS = ['Neon','Flame','Ice','Gold','Shadow','Phantom']
  const OPPS      = ['AI','FROST_RX','ECLIPSE_77','KIRA_88','DELTA_5','BOLT_23']
  const now = Date.now()

  const ai: FeedEvent[] = []
  for (let i = 0; i < 16; i++) {
    const who  = RIVALS[Math.floor(rand() * RIVALS.length)]
    const kind = Math.floor(rand() * 5)
    // Spread events across the last 2 hours, randomised within that window
    const ts   = now - Math.floor(rand() * 7_200_000)

    if (kind === 0) {
      const pg = Math.floor(rand() * 4) + 1
      const ag = Math.floor(rand() * pg)
      const opp = OPPS[Math.floor(rand() * OPPS.length)]
      ai.push({ accent: 'var(--green-1)', emoji: '🏆', who, what: `won ${pg}–${ag} vs ${opp}`, ts })
    } else if (kind === 1) {
      const ag = Math.floor(rand() * 4) + 1
      const pg = Math.floor(rand() * ag)
      const opp = OPPS[Math.floor(rand() * OPPS.length)]
      ai.push({ accent: 'var(--red-1)', emoji: '💀', who, what: `lost ${pg}–${ag} to ${opp}`, ts })
    } else if (kind === 2) {
      const rating = Math.floor(rand() * 16) + 78
      const pos    = POSITIONS[Math.floor(rand() * POSITIONS.length)]
      ai.push({ accent: 'var(--gold-1)', emoji: '⭐', who, what: `pulled a ${rating}-rated ${pos}`, ts })
    } else if (kind === 3) {
      const streak = Math.floor(rand() * 8) + 3
      ai.push({ accent: 'var(--purple-1)', emoji: '🔥', who, what: `hit a ${streak}-win streak`, ts })
    } else {
      const cosm = COSMETICS[Math.floor(rand() * COSMETICS.length)]
      ai.push({ accent: 'var(--cyan-1)', emoji: '⚡', who, what: `forged a ${cosm} cosmetic`, ts })
    }
  }

  return [...user, ...ai].sort((a, b) => b.ts - a.ts).slice(0, 8)
}

/* ── Season leaderboard ──────────────────────────────────────────── */
// AI rivals: headStart = games played before the user arrived this season
//            rate      = games they play per 1 user game (activity ratio)
//            wr / dr   = win rate / draw rate
const AI_RIVALS = [
  { name: 'ZARA_99',   headStart: 5, rate: 0.90, wr: 0.70, dr: 0.10 },
  { name: 'MARQUEZ_7', headStart: 4, rate: 0.80, wr: 0.65, dr: 0.08 },
  { name: 'TOPSPIN',   headStart: 3, rate: 0.70, wr: 0.60, dr: 0.12 },
  { name: 'GHOST.04',  headStart: 2, rate: 0.60, wr: 0.55, dr: 0.10 },
]

type LBEntry = {
  rank: number; cls: 'gold' | 'silver' | 'bronze' | ''
  name: string; seed: string
  pts: number; wins: number; draws: number; losses: number
  isUser: boolean
}

function computeLeaderboard(history: BattleRecord[], username: string): LBEntry[] {
  const userWins   = history.filter(r => r.result === 'win').length
  const userDraws  = history.filter(r => r.result === 'draw').length
  const userLosses = history.filter(r => r.result === 'loss').length
  const userPts    = userWins * 3 + userDraws
  const n          = history.length   // total games user has played

  const rows: Omit<LBEntry, 'rank' | 'cls'>[] = [
    {
      name: username.length > 12 ? username.slice(0, 11) + '…' : username,
      seed: username,
      pts: userPts, wins: userWins, draws: userDraws, losses: userLosses,
      isUser: true,
    },
    ...AI_RIVALS.map(ai => {
      const games  = Math.round(ai.headStart + n * ai.rate)
      const wins   = Math.round(games * ai.wr)
      const draws  = Math.round(games * ai.dr)
      const losses = Math.max(0, games - wins - draws)
      return { name: ai.name, seed: ai.name, pts: wins * 3 + draws, wins, draws, losses, isUser: false }
    }),
  ]

  rows.sort((a, b) => b.pts - a.pts || (a.isUser ? 1 : -1))
  const CLASSES: LBEntry['cls'][] = ['gold', 'silver', 'bronze', '', '']
  return rows.map((r, i) => ({ ...r, rank: i + 1, cls: CLASSES[i] ?? '' }))
}

export default function App() {
  const [session, setSession]     = useState<Session | null | undefined>(undefined)
  const [gameReady, setGameReady]   = useState(false)
  const [tab, setTab]             = useState<Tab>(initialTab)
  const [battleSub, setBattleSub] = useState<BattleSubTab>('play')
  const { roster, packSession, battle, coins, battleHistory, startBattle, resetBattle, tutorialDone, dailyMissions, claimedBattleRewards } = useGameStore()

  const userId = session?.user?.id ?? null

  // Desktop has no home tab — keep packs as the landing view
  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_MQ)
    const syncTab = () => setTab(t => (mq.matches && t === 'home') ? 'pack' : t)
    syncTab()
    mq.addEventListener('change', syncTab)
    return () => mq.removeEventListener('change', syncTab)
  }, [])

  // ── Auth listener ──────────────────────────────────────────
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data }) => setSession(data.session))

    // Subscribe to future changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
    })
    return () => subscription.unsubscribe()
  }, [])

  // ── Per-user game state (local cache + Supabase) ───────────
  useEffect(() => {
    if (session === undefined) return

    if (!userId) {
      clearGameStoreOnLogout()
      setGameReady(false)
      return
    }

    let cancelled = false
    setGameReady(false)

    void initGameStoreForUser(userId).finally(() => {
      if (!cancelled) setGameReady(true)
    })

    return () => { cancelled = true }
  }, [session === undefined ? 'loading' : userId])

  // Still loading initial session — show nothing (avoids flash)
  if (session === undefined) return null

  // Not authenticated — show auth screen
  if (session === null) {
    return (
      <>
        <BackgroundMusic />
        <AuthScreen />
      </>
    )
  }

  // Wait until this account's saved progress has been loaded
  if (!gameReady) {
    return <BackgroundMusic />
  }

  // Derive display name from session metadata
  const username: string =
    (session.user.user_metadata?.username as string | undefined) ??
    session.user.email?.split('@')[0].toUpperCase() ??
    'YOU'

  // ── Tutorial gate ──────────────────────────────────────────
  if (!tutorialDone) {
    return (
      <>
        <BackgroundMusic />
        <div className="page">
        {/* Underlying game content rendered during tutorial steps 1 (pack) & 3 (battle) */}
        <div className="layout layout--immersive">
          <div className="app-shell">
            <main className="tutorial-main" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              {packSession && <PackOpening />}
              {battle && battle.phase !== 'team-select' && <BattleScreen />}
            </main>
          </div>
        </div>
        {/* Tutorial overlay — manages all 5 steps */}
        <TutorialFlow username={username} />
        </div>
      </>
    )
  }

  const isTCGAdmin  = import.meta.env.DEV && session.user.email === 'aaronvelezcoronado@gmail.com'
  const inBattle    = battle !== null
  const isImmersive = !!packSession || (inBattle && battle?.phase !== 'team-select')

  let streak = 0
  for (const r of [...battleHistory].reverse()) {
    if (r.result === 'win') streak++
    else break
  }

  function handleBattleTab() {
    setTab('battle')
    if (!battle) startBattle()
  }

  return (
    <>
      <BackgroundMusic />
      <div className="page">
      <div className={`layout ${isImmersive ? 'layout--immersive' : ''}`}>

        {/* ── Left rail (desktop) ── */}
        {!isImmersive && (
          <aside className="rail rail-left">
            <div className="rail__brand">
              <div className="rail__brand-crest"><span>F</span></div>
              <div className="rail__brand-text">
                <div className="name">FUT<span>BATTLES</span></div>
                <div className="meta">S1 · CHAMPIONS LEAGUE</div>
              </div>
            </div>

            <div className="rail__profile">
              <img className="rail__profile-avatar" src={circleAvatar(username)} alt="" />
              <div className="rail__profile-info">
                <div className="rail__profile-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{username}</div>
                <div className="rail__profile-level">LVL 1 · ROOKIE</div>
                <div className="rail__profile-xp"><div className="rail__profile-xp-fill" /></div>
              </div>
            </div>

            <div className="coin-chip">
              <div className="coin-chip__icon">¢</div>
              <div className="coin-chip__amount">{coins.toLocaleString()}</div>
            </div>

            <nav className="rail__nav">
              <button className={`rail__nav-item ${tab === 'pack'   ? 'active' : ''}`} onClick={() => setTab('pack')}>
                <span className="rail__nav-icon">📦</span> Packs
              </button>
              <button className={`rail__nav-item ${tab === 'roster' ? 'active' : ''}`} onClick={() => setTab('roster')}>
                <span className="rail__nav-icon">⚽</span> Squad
                {roster.length > 0 && <span className="rail__nav-badge">{roster.length}</span>}
              </button>
              <button className={`rail__nav-item ${tab === 'battle' ? 'active' : ''}`} onClick={handleBattleTab}>
                <span className="rail__nav-icon">⚔️</span> Battle
                {streak >= 3 && <span className="rail__nav-streak">🔥{streak}</span>}
              </button>
              {isTCGAdmin && (
                <button className={`rail__nav-item ${tab === 'tcg' ? 'active' : ''}`} onClick={() => setTab('tcg')}
                  style={{ borderTop: '1px solid var(--line)', marginTop: 8, paddingTop: 12 }}
                >
                  <span className="rail__nav-icon">♟️</span> TCG Studio
                  <span style={{ marginLeft: 'auto', fontSize: 7, letterSpacing: '0.1em', color: 'var(--purple-1)', fontFamily: 'var(--font-mono)', background: 'rgba(185,107,255,0.12)', borderRadius: 4, padding: '1px 5px' }}>DEV</span>
                </button>
              )}
            </nav>

            <div className="rail__section">
              <div className="rail__section-title">DAILY MISSIONS</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <MissionRow
                  icon="⚔️"
                  title="Win 3 battles"
                  sub={`${Math.min(dailyMissions.battlesWon, 3)}/3 today`}
                  reward="+500"
                  done={dailyMissions.battlesRewarded}
                />
                <MissionRow
                  icon="📦"
                  title="Open a Gold pack"
                  sub={dailyMissions.goldPackOpened ? 'Completed!' : 'Finalize a Gold pack card'}
                  reward="+250"
                  done={dailyMissions.goldPackOpened}
                />
                <MissionRow
                  icon="⚡"
                  title="Forge a Cosmetic"
                  sub={dailyMissions.cosmeticForged ? 'Completed!' : 'Accept a cosmetic offer in a pack'}
                  reward="+1k"
                  done={dailyMissions.cosmeticForged}
                />
              </div>
            </div>

            <button
              onClick={() => supabase.auth.signOut()}
              style={{
                marginTop: 'auto', width: '100%', padding: '9px 0',
                fontSize: 10, fontFamily: 'var(--font-display)', letterSpacing: '0.12em',
                color: 'var(--ink-3)', border: '1px solid var(--line)',
                borderRadius: 10, background: 'transparent', cursor: 'pointer',
                transition: 'color 0.15s, border-color 0.15s',
              }}
              onMouseOver={e => { e.currentTarget.style.color = 'var(--red-1)'; e.currentTarget.style.borderColor = 'var(--red-1)' }}
              onMouseOut={e => { e.currentTarget.style.color = 'var(--ink-3)'; e.currentTarget.style.borderColor = 'var(--line)' }}
            >
              SIGN OUT
            </button>
          </aside>
        )}

        {/* ── Center app shell ── */}
        <div className="app-shell">
          {/* Mobile top nav */}
          {!packSession && (
            <div className="topnav topnav--mobile-only" style={{
              position: 'sticky', top: 0, zIndex: 10,
              background: 'linear-gradient(180deg, rgba(8,12,22,0.95), rgba(8,12,22,0.85))',
              backdropFilter: 'blur(10px)',
              borderBottom: '1px solid var(--line)',
            }}>
              <div className="topnav__brand" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 28, height: 28,
                    background: 'linear-gradient(180deg, var(--gold-1), var(--gold-3))',
                    clipPath: 'polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%)',
                    display: 'grid', placeItems: 'center',
                    boxShadow: '0 0 12px var(--gold-glow)',
                  }}>
                    <span className="font-display" style={{ fontSize: 18, color: '#1a1006', lineHeight: 1 }}>F</span>
                  </div>
                  <div>
                    <div className="font-display" style={{ fontSize: 22, color: 'var(--ink-0)', letterSpacing: '0.08em', lineHeight: 0.85 }}>
                      FUT<span style={{ color: 'var(--gold-1)' }}>BATTLES</span>
                    </div>
                    <div className="eyebrow" style={{ fontSize: 8, marginTop: 1 }}>S1 · CHAMPIONS LEAGUE</div>
                  </div>
                </div>
                <div className="coin-chip">
                  <div className="coin-chip__icon">¢</div>
                  <div className="coin-chip__amount">{coins.toLocaleString()}</div>
                </div>
              </div>
              <div className="tabs">
                <button className={`tab tab--mobile-only ${tab === 'home' ? 'active' : ''}`} onClick={() => setTab('home')}>HOME</button>
                <button className={`tab ${tab === 'pack'   ? 'active' : ''}`} onClick={() => setTab('pack')}>PACKS</button>
                <button className={`tab ${tab === 'roster' ? 'active' : ''}`} onClick={() => setTab('roster')}>
                  SQUAD {roster.length > 0 && <span className="tab__badge">{roster.length}</span>}
                </button>
                <button className={`tab ${tab === 'battle' ? 'active' : ''}`} onClick={handleBattleTab}>
                  BATTLE {streak >= 3 && <span className="tab__streak">🔥{streak}</span>}
                </button>
                {isTCGAdmin && (
                  <button className={`tab ${tab === 'tcg' ? 'active' : ''}`} onClick={() => setTab('tcg')}
                    style={{ color: tab === 'tcg' ? 'var(--purple-1)' : undefined }}
                  >
                    TCG
                  </button>
                )}
              </div>
            </div>
          )}

          <main className={packSession ? 'main--forge' : undefined} style={{ flex: 1 }}>
            {packSession ? (
              <PackOpening />
            ) : tab === 'home' ? (
              <MobileDashboard
                username={username}
                coins={coins}
                streak={streak}
                battleHistory={battleHistory}
                roster={roster}
                dailyMissions={dailyMissions}
                claimedBattleRewards={claimedBattleRewards}
              />
            ) : tab === 'pack' ? (
              <PackOpening />
            ) : tab === 'roster' ? (
              <Roster />
            ) : tab === 'battle' ? (
              <BattleTab
                inBattle={inBattle}
                battlePhase={battle?.phase ?? null}
                sub={battleSub}
                setSub={setBattleSub}
                onGoHome={() => { resetBattle(); setTab('pack') }}
              />
            ) : tab === 'tcg' && isTCGAdmin ? (
              <TCGStudio />
            ) : null}
          </main>
        </div>

        {/* ── Right rail (desktop) ── */}
        {!isImmersive && (
          <aside className="rail rail-right">
            <div className="rail__section" style={{ marginTop: 0 }}>
              <div className="rail__section-title">
                <span>SEASON STANDINGS</span>
                <span style={{ color: 'var(--gold-1)' }}>
                  WK {Math.max(1, Math.ceil(battleHistory.length / 5))}
                </span>
              </div>
              {/* Column headers */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '0 10px 4px',
                fontSize: 8, color: 'var(--ink-3)',
                fontFamily: 'var(--font-mono)', letterSpacing: '0.08em',
              }}>
                <div style={{ width: 24, textAlign: 'center' }}>#</div>
                <div style={{ width: 28 }} />
                <div style={{ flex: 1 }}>PLAYER</div>
                <div style={{ textAlign: 'right' }}>W-D-L · PTS</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {computeLeaderboard(battleHistory, username).map(r => (
                  <div key={r.name} className={`lb-row ${r.isUser ? 'lb-self' : ''}`}>
                    <div className={`lb-row__rank ${r.cls}`}>{r.rank}</div>
                    <img className="lb-row__avatar" src={circleAvatar(r.seed)} alt="" />
                    {/* Name + record */}
                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <div style={{
                        fontSize: 12, fontWeight: 700,
                        color: r.isUser ? 'var(--gold-1)' : 'var(--ink-0)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {r.name}
                      </div>
                      <div style={{ fontSize: 9, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>
                        {r.wins}W · {r.draws}D · {r.losses}L
                      </div>
                    </div>
                    {/* Points */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flexShrink: 0 }}>
                      <div className="lb-row__score">{r.pts}</div>
                      <div style={{ fontSize: 8, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', lineHeight: 1 }}>pts</div>
                    </div>
                  </div>
                ))}
              </div>
              {battleHistory.length === 0 && (
                <div style={{ fontSize: 10, color: 'var(--ink-3)', textAlign: 'center', padding: '8px 0', fontStyle: 'italic' }}>
                  Play your first battle to appear on the board
                </div>
              )}
            </div>

            <div className="rail__section">
              <div className="rail__section-title">LIVE FEED</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {buildLiveFeed(battleHistory, roster, username).map((f, i) => {
                  const isMe = f.who === username
                  return (
                    <div key={i} style={{
                      display: 'flex', gap: 8, alignItems: 'flex-start',
                      padding: '8px 10px',
                      background: isMe ? 'rgba(255,214,107,0.06)' : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${isMe ? 'rgba(255,214,107,0.2)' : 'var(--line)'}`,
                      borderRadius: 10,
                    }}>
                      <div style={{ fontSize: 16, lineHeight: 1.2 }}>{f.emoji}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 11, color: 'var(--ink-1)', lineHeight: 1.35 }}>
                          <span style={{ color: f.accent, fontWeight: 800 }}>
                            {isMe ? 'YOU' : f.who}
                          </span>{' '}{f.what}
                        </div>
                        <div style={{ fontSize: 9, color: 'var(--ink-3)', marginTop: 2, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                          {timeAgo(f.ts)}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="rail__card">
              {(() => {
                const totalWins   = battleHistory.filter(r => r.result === 'win').length
                const winsInCycle = totalWins % 3
                const remaining   = winsInCycle === 0 ? 3 : 3 - winsInCycle
                const cyclesDone  = claimedBattleRewards
                return (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div className="eyebrow" style={{ color: 'var(--gold-1)' }}>NEXT REWARD</div>
                        <div className="font-display" style={{ fontSize: 22, color: 'var(--ink-0)', letterSpacing: '0.04em', marginTop: 2 }}>
                          +500 COINS
                        </div>
                      </div>
                      <div style={{ fontSize: 24 }}>🎁</div>
                    </div>
                    <div style={{ fontSize: 11, color: winsInCycle === 0 && cyclesDone > 0 ? 'var(--green-1)' : 'var(--ink-2)' }}>
                      {winsInCycle === 0 && cyclesDone > 0
                        ? `✓ Reward ${cyclesDone} claimed! Win 3 more.`
                        : `Win ${remaining} more battle${remaining !== 1 ? 's' : ''} to unlock`}
                    </div>
                    <div className="progress" style={{ height: 6, marginTop: 6 }}>
                      <div className="progress__fill" style={{ width: `${(winsInCycle / 3) * 100}%`, transition: 'width 0.4s ease' }} />
                    </div>
                    {cyclesDone > 0 && (
                      <div style={{ fontSize: 9, color: 'var(--ink-3)', marginTop: 4, fontFamily: 'var(--font-mono)' }}>
                        {cyclesDone} reward{cyclesDone !== 1 ? 's' : ''} earned total
                      </div>
                    )}
                  </>
                )
              })()}
            </div>
          </aside>
        )}
      </div>
    </div>
    </>
  )
}

/* ── MobileDashboard ── */
function MobileDashboard({ username, coins, streak, battleHistory, roster, dailyMissions, claimedBattleRewards }: {
  username: string; coins: number; streak: number
  battleHistory: BattleRecord[]; roster: UserCard[]
  dailyMissions: DailyMissions; claimedBattleRewards: number
}) {
  const leaderboard = useMemo(() => computeLeaderboard(battleHistory, username), [battleHistory, username])
  const feed        = useMemo(() => buildLiveFeed(battleHistory, roster, username), [battleHistory, roster, username])

  const totalWins   = battleHistory.filter(r => r.result === 'win').length
  const winsInCycle = totalWins % 3
  const remaining   = winsInCycle === 0 ? 3 : 3 - winsInCycle

  const sectionTitle = (label: string, right?: string) => (
    <div className="rail__section-title" style={{ marginBottom: 8 }}>
      <span>{label}</span>
      {right && <span style={{ color: 'var(--gold-1)' }}>{right}</span>}
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: '16px 16px 48px' }}>

      {/* ── Profile card ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        background: 'rgba(255,255,255,0.025)', border: '1px solid var(--line)',
        borderRadius: 16, padding: '14px 16px',
      }}>
        <img src={circleAvatar(username)} alt="" style={{ width: 48, height: 48, borderRadius: '50%', flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--ink-0)', letterSpacing: '0.04em', lineHeight: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {username}
          </div>
          <div style={{ fontSize: 10, color: 'var(--ink-2)', letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 3 }}>LVL 1 · ROOKIE</div>
          <div style={{ marginTop: 6, height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 999, overflow: 'hidden' }}>
            <div style={{ width: '64%', height: '100%', background: 'linear-gradient(90deg, var(--gold-2), var(--gold-1))', borderRadius: 999 }} />
          </div>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 5,
          background: 'rgba(255,214,107,0.10)', border: '1px solid rgba(255,214,107,0.25)',
          borderRadius: 10, padding: '6px 10px', flexShrink: 0,
        }}>
          <span style={{ fontSize: 13, lineHeight: 1 }}>¢</span>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: 'var(--gold-1)', letterSpacing: '0.04em' }}>
            {coins.toLocaleString()}
          </span>
        </div>
      </div>

      {/* ── Streak banner ── */}
      {streak >= 3 && (
        <div style={{
          textAlign: 'center', padding: '10px 16px', borderRadius: 12,
          background: 'rgba(255,138,58,0.10)', border: '1px solid rgba(255,138,58,0.3)',
          fontSize: 13, fontWeight: 700, color: '#ff8a3a',
          animation: 'glow-pulse 1s ease-in-out infinite',
        }}>
          🔥 {streak}-WIN STREAK — Keep it going!
        </div>
      )}

      {/* ── Daily missions ── */}
      <div>
        {sectionTitle('DAILY MISSIONS')}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <MissionRow icon="⚔️" title="Win 3 battles"    sub={`${Math.min(dailyMissions.battlesWon, 3)}/3 today`}                   reward="+500" done={dailyMissions.battlesRewarded} />
          <MissionRow icon="📦" title="Open a Gold pack"  sub={dailyMissions.goldPackOpened ? 'Completed!' : 'Finalize a Gold pack card'} reward="+250" done={dailyMissions.goldPackOpened} />
          <MissionRow icon="⚡" title="Forge a Cosmetic"  sub={dailyMissions.cosmeticForged ? 'Completed!' : 'Accept a cosmetic in a pack'} reward="+1k"  done={dailyMissions.cosmeticForged} />
        </div>
      </div>

      {/* ── Next reward ── */}
      <div className="rail__card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div className="eyebrow" style={{ color: 'var(--gold-1)' }}>NEXT REWARD</div>
            <div className="font-display" style={{ fontSize: 22, color: 'var(--ink-0)', letterSpacing: '0.04em', marginTop: 2 }}>+500 COINS</div>
          </div>
          <div style={{ fontSize: 24 }}>🎁</div>
        </div>
        <div style={{ fontSize: 11, color: winsInCycle === 0 && claimedBattleRewards > 0 ? 'var(--green-1)' : 'var(--ink-2)', marginTop: 6 }}>
          {winsInCycle === 0 && claimedBattleRewards > 0
            ? `✓ Reward ${claimedBattleRewards} claimed! Win 3 more.`
            : `Win ${remaining} more battle${remaining !== 1 ? 's' : ''} to unlock`}
        </div>
        <div className="progress" style={{ height: 6, marginTop: 8 }}>
          <div className="progress__fill" style={{ width: `${(winsInCycle / 3) * 100}%`, transition: 'width 0.4s ease' }} />
        </div>
        {claimedBattleRewards > 0 && (
          <div style={{ fontSize: 9, color: 'var(--ink-3)', marginTop: 4, fontFamily: 'var(--font-mono)' }}>
            {claimedBattleRewards} reward{claimedBattleRewards !== 1 ? 's' : ''} earned total
          </div>
        )}
      </div>

      {/* ── Season standings ── */}
      <div>
        {sectionTitle('SEASON STANDINGS', `WK ${Math.max(1, Math.ceil(battleHistory.length / 5))}`)}
        <div style={{ fontSize: 8, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', padding: '0 10px 4px', display: 'flex', gap: 10 }}>
          <div style={{ width: 24, textAlign: 'center' }}>#</div>
          <div style={{ width: 28 }} />
          <div style={{ flex: 1 }}>PLAYER</div>
          <div>W-D-L · PTS</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {leaderboard.map(r => (
            <div key={r.name} className={`lb-row ${r.isUser ? 'lb-self' : ''}`}>
              <div className={`lb-row__rank ${r.cls}`}>{r.rank}</div>
              <img className="lb-row__avatar" src={circleAvatar(r.seed)} alt="" />
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: r.isUser ? 'var(--gold-1)' : 'var(--ink-0)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {r.name}
                </div>
                <div style={{ fontSize: 9, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>
                  {r.wins}W · {r.draws}D · {r.losses}L
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flexShrink: 0 }}>
                <div className="lb-row__score">{r.pts}</div>
                <div style={{ fontSize: 8, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', lineHeight: 1 }}>pts</div>
              </div>
            </div>
          ))}
        </div>
        {battleHistory.length === 0 && (
          <div style={{ fontSize: 10, color: 'var(--ink-3)', textAlign: 'center', padding: '8px 0', fontStyle: 'italic' }}>
            Play your first battle to appear on the board
          </div>
        )}
      </div>

      {/* ── Live feed ── */}
      <div>
        {sectionTitle('LIVE FEED')}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {feed.map((f, i) => {
            const isMe = f.who === username
            return (
              <div key={i} style={{
                display: 'flex', gap: 8, alignItems: 'flex-start', padding: '8px 10px',
                background: isMe ? 'rgba(255,214,107,0.06)' : 'rgba(255,255,255,0.02)',
                border: `1px solid ${isMe ? 'rgba(255,214,107,0.2)' : 'var(--line)'}`,
                borderRadius: 10,
              }}>
                <div style={{ fontSize: 16, lineHeight: 1.2 }}>{f.emoji}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, color: 'var(--ink-1)', lineHeight: 1.35 }}>
                    <span style={{ color: f.accent, fontWeight: 800 }}>{isMe ? 'YOU' : f.who}</span>{' '}{f.what}
                  </div>
                  <div style={{ fontSize: 9, color: 'var(--ink-3)', marginTop: 2, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                    {timeAgo(f.ts)}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

    </div>
  )
}

/* ── MissionRow ── */
function MissionRow({ icon, title, sub, reward, done }: {
  icon: string; title: string; sub: string; reward: string; done: boolean
}) {
  return (
    <div className="mission" style={{
      opacity: done ? 0.6 : 1,
      border: done ? '1px solid rgba(68,255,158,0.25)' : undefined,
      background: done ? 'rgba(68,255,158,0.04)' : undefined,
      transition: 'all 0.3s',
    }}>
      <div className="mission__icon">{done ? '✓' : icon}</div>
      <div className="mission__body">
        <div className="mission__title" style={{ textDecoration: done ? 'line-through' : 'none', color: done ? 'var(--ink-3)' : undefined }}>
          {title}
        </div>
        <div className="mission__sub" style={{ color: done ? 'var(--green-1)' : undefined }}>{sub}</div>
      </div>
      <div className="mission__reward" style={{ color: done ? 'var(--green-1)' : undefined }}>{done ? '✔' : reward}</div>
    </div>
  )
}

function BattleTab({
  inBattle, battlePhase, sub, setSub, onGoHome,
}: {
  inBattle: boolean; battlePhase: string | null
  sub: BattleSubTab; setSub: (s: BattleSubTab) => void
  onGoHome: () => void
}) {
  const showSubTabs = !inBattle || battlePhase === 'team-select'

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {showSubTabs && (
        <div style={{ display: 'flex', gap: 6, padding: '12px 16px 0', borderBottom: '1px solid var(--line)' }}>
          {(['play', 'history'] as const).map(s => (
            <button
              key={s}
              onClick={() => setSub(s)}
              style={{
                position: 'relative', padding: '8px 14px 12px',
                fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase',
                color: sub === s ? 'var(--gold-1)' : 'var(--ink-2)', transition: 'color 0.2s',
              }}
            >
              {s.toUpperCase()}
              {sub === s && (
                <div style={{
                  position: 'absolute', bottom: -1, left: 8, right: 8, height: 2,
                  background: 'var(--gold-1)', boxShadow: '0 0 8px var(--gold-glow)', borderRadius: 2,
                }} />
              )}
            </button>
          ))}
        </div>
      )}
      {sub === 'play' || !showSubTabs ? (
        inBattle ? (
          battlePhase === 'team-select' ? <TeamSelector /> : <BattleScreen onGoHome={onGoHome} />
        ) : (
          <TeamSelector />
        )
      ) : (
        <BattleHistory />
      )}
    </div>
  )
}
