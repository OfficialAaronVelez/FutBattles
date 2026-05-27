// ─────────────────────────────────────────────────────────────────────────────
//  FutBattles  ·  Soccer TCG  ·  Preset Decks
// ─────────────────────────────────────────────────────────────────────────────
import type { TCGCard, TCGStadiumCard, TCGManagerCard } from '../types/tcg'
import { TCG_CARDS } from './tcgCards'

function id(cardId: string): TCGCard {
  const c = TCG_CARDS.find(x => x.id === cardId)
  if (!c) throw new Error(`Card not found: ${cardId}`)
  return c
}
function ids(...cardIds: string[]): TCGCard[] {
  return cardIds.map(id)
}

// ── PLAYER DECK: "Andfield Press" ─────────────────────────────────────────────
// Pressing + Physical style — high pressure, tough defenders, direct tactics

export const PLAYER_MANAGER: TCGManagerCard = id('mgr-002') as TCGManagerCard  // Klöpff
export const PLAYER_STADIUM: TCGStadiumCard  = id('sta-002') as TCGStadiumCard  // Andfield Arena (25 HP)

export const PLAYER_MAIN_DECK: TCGCard[] = ids(
  // Players — Physical powerhouses and Pressing runners
  'plr-004',              // Herlund Aasson (ST, 11 ATK) x1
  'plr-008', 'plr-008',   // Bellmorn (CAM, 8/6) x2
  'plr-013', 'plr-013',   // Sallah (LW, 8/4) x2
  'plr-014', 'plr-014', 'plr-014',  // Rashdan (LW, 7/3) x3
  'plr-016', 'plr-016',   // Rappello (CB, 7/9) x2
  'plr-017', 'plr-017', 'plr-017',  // Casimiro (CDM, 6/9) x3
  'plr-021', 'plr-021', 'plr-021',  // Gavi (CM, 5/6) x3
  'plr-019', 'plr-019',   // Trent Arnolt (RB, 7/7) x2
  'plr-015',              // Virgílio van Dijken (CB, 5/11) x1
  // Tactics
  'tac-001', 'tac-001', 'tac-001',  // El Clásico Press (+2 ATK) x3
  'tac-003', 'tac-003',   // Route One (3 direct) x2
  'tac-008', 'tac-008',   // GEGENPRESS (exhaust all) x2
  'tac-009', 'tac-009',   // Counter-Strike x2
  'tac-010', 'tac-010',   // Offside Trap (negate) x2
  // Upgrades
  'upg-004', 'upg-004', 'upg-004',  // Iron Shin Pads (+2 DEF) x3
  'upg-006', 'upg-006', 'upg-006',  // Press High Kit (deal 1 to attacker) x3
)
// 32 cards

// ── AI DECK: "Galacticos" ──────────────────────────────────────────────────────
// Star Power + Precision — elite individuals, high ATK, card draw

export const AI_MANAGER: TCGManagerCard = id('mgr-003') as TCGManagerCard  // Ancellión
export const AI_STADIUM: TCGStadiumCard  = id('sta-003') as TCGStadiumCard  // Bernabéo Real (28 HP)

export const AI_MAIN_DECK: TCGCard[] = ids(
  // Players — flashy attackers
  'plr-001', 'plr-001',   // Methi Ossian (ST, 9/4) x2
  'plr-002',              // Kristiano Nelzar (ST, 10/5) x1
  'plr-003', 'plr-003', 'plr-003',  // Kylion Macé (ST, 9/3) x3
  'plr-005', 'plr-005',   // Neyval Jr (LW, 9/3) x2
  'plr-010', 'plr-010', 'plr-010',  // Ronalden (CAM, 8/4) x3
  'plr-020', 'plr-020',   // Benzimah (CF, 9/5) x2
  'plr-012', 'plr-012', 'plr-012',  // Vinizan Jr (LW, 8/3) x3
  'plr-006', 'plr-006',   // Moduric (CM, 6/7) x2
  'plr-007', 'plr-007',   // De Bruine (CAM, 8/5) x2
  'plr-022', 'plr-022',   // Jun-Minho Son (LW, 8/4) x2
  // Tactics
  'tac-002', 'tac-002', 'tac-002',  // Tiki-Taka (draw 2) x3
  'tac-004', 'tac-004',   // False Nine (+3 ATK) x2
  'tac-006', 'tac-006',   // Galáctico Signing (tutor legendary) x2
  // Upgrades
  'upg-001', 'upg-001', 'upg-001',  // Golden Boot (+2 ATK) x3
  'upg-005', 'upg-005',   // Playmaker Band x2
)
// 33 cards
