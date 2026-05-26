import { useState, useCallback } from 'react'
import { useGameStore } from '../../store/gameStore'
import type { Formation7v7, FormationSlot, UserCard } from '../../types'
import { FORMATIONS } from '../../types'
import { buildEmptyTeam } from '../../utils/battle'
import {
  getChemLinks,
  getSlotChemScore,
  chemToBoost,
  chemToColor,
  applyChemBoost,
} from '../../utils/chemistry'

const FORMATION_LABELS: Record<Formation7v7, string> = {
  '3-2-2': '3-2-2',
  '2-3-2': '2-3-2',
  '3-3-1': '3-3-1',
  '1-3-3': '1-3-3',
  '2-4-1': '2-4-1',
}

function computeOvr(stats: Partial<Record<string, number>>): number {
  const vals = Object.values(stats).filter((v): v is number => typeof v === 'number')
  return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0
}

export function TeamSelector() {
  const { roster, battle, setPlayerTeam, runBattle, resetBattle, savedLineup, saveLineup } = useGameStore()

  // Restore saved lineup on first mount — reconcile card IDs against current roster
  const initFromSaved = useCallback((): { formation: Formation7v7; slots: FormationSlot[] } => {
    const VALID_FORMATIONS = new Set<Formation7v7>(['3-2-2','2-3-2','3-3-1','1-3-3','2-4-1'])
    if (!savedLineup || !VALID_FORMATIONS.has(savedLineup.formation)) {
      return { formation: '3-2-2', slots: buildEmptyTeam('3-2-2') }
    }
    const emptySlots = buildEmptyTeam(savedLineup.formation)
    const rosterMap  = new Map(roster.map(c => [c.id, c]))
    const restored   = emptySlots.map(s => {
      const savedCardId = savedLineup.cardIds[s.id]
      return { ...s, card: savedCardId ? (rosterMap.get(savedCardId) ?? null) : null }
    })
    return { formation: savedLineup.formation, slots: restored }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const init = initFromSaved()
  const [formation, setFormation] = useState<Formation7v7>(init.formation)
  const [slots, setSlots]         = useState<FormationSlot[]>(init.slots)
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null)
  const [savedFlash,     setSavedFlash]     = useState(false)

  if (!battle) return null

  const chemLinks       = getChemLinks(slots)
  const assignedCardIds = new Set(slots.map(s => s.card?.id).filter(Boolean))
  const filledCount     = slots.filter(s => s.card !== null).length
  const canStart        = filledCount === 7

  function handleFormationChange(f: Formation7v7) {
    setFormation(f)
    const newSlots = buildEmptyTeam(f)
    slots.forEach((old, i) => { if (old.card && newSlots[i]) newSlots[i].card = old.card })
    setSlots(newSlots)
    setSelectedSlotId(null)
  }

  function handleSlotClick(slotId: string) {
    setSelectedSlotId(prev => prev === slotId ? null : slotId)
  }

  function handleCardClick(card: UserCard) {
    if (!selectedSlotId) return
    setSlots(prev =>
      prev.map(s => {
        if (s.card?.id === card.id) return { ...s, card: null }
        if (s.id === selectedSlotId) return { ...s, card }
        return s
      })
    )
    setSelectedSlotId(null)
  }

  function handleSaveLineup() {
    saveLineup(formation, slots)
    setSavedFlash(true)
    setTimeout(() => setSavedFlash(false), 2000)
  }

  function handleStartBattle() {
    // Apply chemistry boosts to each card before submitting the team
    const links = getChemLinks(slots)
    const boostedSlots = slots.map(slot => {
      if (!slot.card) return slot
      const score = getSlotChemScore(slot.id, links)
      const boost = chemToBoost(score)
      return { ...slot, card: applyChemBoost(slot.card, boost) }
    })
    setPlayerTeam({ formation, slots: boostedSlots })
    runBattle()
  }

  const rows = [3, 2, 1]

  const ROW_LABELS: Record<number, { label: string; hint: string }> = {
    3: { label: 'ATK', hint: 'ST · CF · LW · RW' },
    2: { label: 'MID', hint: 'CAM · CM · CDM · LM · RM' },
    1: { label: 'DEF', hint: 'CB · LB · RB · LWB · RWB' },
  }

  return (
    <div style={{ padding: '16px 16px 40px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div className="text-center" style={{ padding: '16px 0 8px' }}>
        <div className="eyebrow" style={{ color: 'var(--gold-1)' }}>TEAM SETUP</div>
        <h1 className="font-display" style={{ fontSize: 40, margin: '4px 0', lineHeight: 0.9, color: 'var(--ink-0)' }}>
          {filledCount}/7 PLAYERS
        </h1>
        <div style={{ color: 'var(--ink-3)', fontSize: 12, marginTop: 4 }}>
          {selectedSlotId ? '← Select a player from below' : 'Tap a slot to assign a player'}
        </div>
        {savedLineup && init.slots.some(s => s.card) && (
          <div style={{
            marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 6,
            fontSize: 10, color: 'var(--green-1)', fontFamily: 'var(--font-display)',
            letterSpacing: '0.08em', background: 'rgba(68,255,158,0.07)',
            border: '1px solid rgba(68,255,158,0.2)', borderRadius: 20, padding: '4px 12px',
          }}>
            💾 Saved lineup restored
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 640, margin: '0 auto', width: '100%' }}>
        {/* Formation picker */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
          {FORMATIONS.map(f => (
            <button
              key={f}
              onClick={() => handleFormationChange(f)}
              style={{
                padding: '6px 16px', borderRadius: 8, fontSize: 12, fontWeight: 800,
                letterSpacing: '0.08em', fontFamily: 'var(--font-display)',
                border: formation === f ? 'none' : '1px solid var(--line)',
                background: formation === f
                  ? 'linear-gradient(135deg, var(--gold-1), var(--gold-3))'
                  : 'rgba(255,255,255,0.04)',
                color: formation === f ? '#1a1006' : 'var(--ink-2)',
                cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              {FORMATION_LABELS[f]}
            </button>
          ))}
        </div>

        {/* Chemistry legend */}
        {filledCount >= 2 && (
          <div style={{
            display: 'flex', justifyContent: 'center', gap: 16,
            fontSize: 10, color: 'var(--ink-3)',
          }}>
            <span><span style={{ color: '#44ff9e' }}>●</span> Same club</span>
            <span><span style={{ color: '#ffd700' }}>●</span> Same nation</span>
            <span><span style={{ color: '#ff9a3c' }}>●</span> Partial</span>
          </div>
        )}

        {/* Pitch */}
        <div className="pitch" style={{ padding: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {rows.map(row => {
              const rowSlots = slots.filter(s => s.row === row).sort((a, b) => a.col - b.col)
              if (!rowSlots.length) return null
              const rl = ROW_LABELS[row]
              return (
                <div key={row} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {/* Group label */}
                  <div style={{
                    width: 34, flexShrink: 0, textAlign: 'center',
                  }}>
                    <div style={{
                      fontSize: 9, fontFamily: 'var(--font-display)',
                      color: 'var(--gold-2)', letterSpacing: '0.1em', fontWeight: 800,
                    }}>{rl.label}</div>
                    <div style={{ fontSize: 7, color: 'var(--ink-3)', lineHeight: 1.3, marginTop: 2 }}>
                      {rl.hint.split(' · ').map((p, i) => (
                        <span key={i} style={{ display: 'block' }}>{p}</span>
                      ))}
                    </div>
                  </div>
                  {/* Slots */}
                  <div style={{ flex: 1, display: 'flex', justifyContent: 'center', gap: 8 }}>
                    {rowSlots.map(slot => (
                      <PitchSlot
                        key={slot.id}
                        slot={slot}
                        isSelected={selectedSlotId === slot.id}
                        chemScore={getSlotChemScore(slot.id, chemLinks)}
                        onClick={() => handleSlotClick(slot.id)}
                      />
                    ))}
                  </div>
                  {/* Spacer to balance the label */}
                  <div style={{ width: 34, flexShrink: 0 }} />
                </div>
              )
            })}
          </div>
        </div>

        {/* Kick off */}
        <button
          disabled={!canStart}
          onClick={handleStartBattle}
          className="btn btn-danger"
          style={{ width: '100%', fontSize: 16, padding: '18px', opacity: canStart ? 1 : 0.35 }}
        >
          {canStart ? '⚔️  KICK OFF' : `ADD ${7 - filledCount} MORE PLAYER${7 - filledCount !== 1 ? 'S' : ''}`}
        </button>

        {/* Save lineup */}
        {filledCount > 0 && (
          <button
            onClick={handleSaveLineup}
            style={{
              width: '100%', padding: '12px', borderRadius: 12, fontSize: 13, fontWeight: 800,
              fontFamily: 'var(--font-display)', letterSpacing: '0.08em', cursor: 'pointer',
              transition: 'all 0.25s',
              border: savedFlash ? '1px solid var(--green-1)' : '1px solid var(--line)',
              background: savedFlash ? 'rgba(68,255,158,0.08)' : 'rgba(255,255,255,0.03)',
              color: savedFlash ? 'var(--green-1)' : 'var(--ink-2)',
            }}
          >
            {savedFlash ? '✓  LINEUP SAVED' : '💾  SAVE LINEUP'}
          </button>
        )}

        <button onClick={resetBattle} className="btn-link" style={{ textAlign: 'center' }}>
          ← Back
        </button>
      </div>

      {/* Bench / roster */}
      {roster.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--ink-3)', fontSize: 13, padding: 20 }}>
          No cards yet — open packs first!
        </div>
      ) : (
        <div style={{ maxWidth: 640, margin: '0 auto', width: '100%' }}>
          <div className="eyebrow" style={{ fontSize: 9, color: 'var(--ink-3)', marginBottom: 8, paddingLeft: 4 }}>
            YOUR BENCH
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {roster.map(card => (
              <BenchRow
                key={card.id}
                card={card}
                isAssigned={assignedCardIds.has(card.id)}
                isSelectable={!!selectedSlotId}
                onClick={() => handleCardClick(card)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* ── PitchSlot ── */
function PitchSlot({
  slot, isSelected, chemScore, onClick,
}: {
  slot: FormationSlot; isSelected: boolean; chemScore: number; onClick: () => void
}) {
  const hasCard = slot.card !== null
  const ovr     = hasCard ? computeOvr(slot.card!.stats) : 0
  const boost   = hasCard ? chemToBoost(chemScore) : 0
  const color   = chemToColor(chemScore)

  return (
    <button
      onClick={onClick}
      style={{
        minWidth: 80, borderRadius: 12, padding: '10px 8px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
        cursor: 'pointer', transition: 'all 0.15s', position: 'relative',
        border: isSelected
          ? '2px solid var(--gold-1)'
          : hasCard
            ? '1px solid rgba(255,255,255,0.2)'
            : '2px dashed rgba(255,255,255,0.15)',
        background: isSelected
          ? 'rgba(255,214,107,0.12)'
          : hasCard
            ? 'rgba(255,255,255,0.07)'
            : 'rgba(255,255,255,0.03)',
        boxShadow: isSelected ? '0 0 16px var(--gold-glow)' : 'none',
        transform: isSelected ? 'scale(1.06)' : 'scale(1)',
      }}
    >
      <span className="eyebrow" style={{ fontSize: 8, color: 'var(--ink-3)' }}>{slot.label}</span>
      {hasCard ? (
        <>
          <span className="font-display" style={{ fontSize: 22, color: 'var(--gold-1)', lineHeight: 1 }}>
            {ovr}
          </span>
          <span style={{
            fontSize: 10, fontWeight: 700, color: 'var(--ink-1)',
            maxWidth: 72, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{slot.card!.name}</span>
          {/* Chemistry indicator dot */}
          <div style={{
            position: 'absolute', top: 4, right: 4,
            width: 8, height: 8, borderRadius: '50%',
            background: color,
            boxShadow: chemScore >= 2 ? `0 0 6px ${color}` : 'none',
          }} title={boost > 0 ? `+${boost} chem boost` : 'No chemistry'} />
          {boost > 0 && (
            <span style={{ fontSize: 8, color, fontWeight: 800, letterSpacing: '0.04em' }}>
              +{boost}
            </span>
          )}
        </>
      ) : (
        <>
          <span style={{
            fontSize: 18, color: isSelected ? 'var(--gold-1)' : 'rgba(255,255,255,0.15)',
            lineHeight: 1,
          }}>+</span>
          <span style={{ fontSize: 9, color: isSelected ? 'var(--gold-2)' : 'var(--ink-3)' }}>
            {isSelected ? 'PICK' : 'EMPTY'}
          </span>
        </>
      )}
    </button>
  )
}

/* ── BenchRow ── */
function BenchRow({
  card, isAssigned, isSelectable, onClick,
}: {
  card: UserCard; isAssigned: boolean; isSelectable: boolean; onClick: () => void
}) {
  const ovr = computeOvr(card.stats)

  return (
    <button
      onClick={onClick}
      disabled={isAssigned && !isSelectable}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 14px', borderRadius: 12, textAlign: 'left', cursor: 'pointer',
        border: isAssigned
          ? '1px solid rgba(68,255,158,0.3)'
          : isSelectable
            ? '1px solid rgba(255,214,107,0.5)'
            : '1px solid var(--line)',
        background: isAssigned
          ? 'rgba(68,255,158,0.05)'
          : isSelectable
            ? 'rgba(255,214,107,0.07)'
            : 'rgba(255,255,255,0.02)',
        opacity: isAssigned && !isSelectable ? 0.5 : 1,
        transition: 'all 0.15s',
      }}
    >
      <div className="font-display" style={{
        fontSize: 24, color: 'var(--gold-1)', width: 36, textAlign: 'right', lineHeight: 1,
      }}>{ovr}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--ink-0)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {card.name}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 1 }}>
          <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>{card.position ?? '?'}</span>
          {card.clubAffinity && (
            <span style={{ fontSize: 10, color: 'var(--ink-3)', opacity: 0.7 }}>· {card.clubAffinity}</span>
          )}
          {card.nationAffinity && !card.clubAffinity && (
            <span style={{ fontSize: 10, color: 'var(--ink-3)', opacity: 0.7 }}>· {card.nationAffinity}</span>
          )}
        </div>
      </div>
      {isAssigned && <div style={{ fontSize: 14, color: 'var(--green-1)' }}>✓</div>}
      {isSelectable && !isAssigned && (
        <div className="eyebrow" style={{ fontSize: 9, color: 'var(--gold-2)' }}>SELECT</div>
      )}
    </button>
  )
}
