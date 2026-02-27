import type { Player } from '@/types/database'

// ========================
// Base Points Configuration
// ========================
const BASE_POINTS: Record<string, number> = {
  civilian: 2,
  mr_white: 6,
  undercover: 10,
}

// ========================
// Types
// ========================
export interface PointBreakdown {
  playerId: string
  playerName: string
  role: string | null
  specialRole: string | null
  basePoints: number
  bonusPoints: number
  bonusReasons: string[]
  totalGamePoints: number
  accumulatedPoints: number // total points including previous games
}

interface GameState {
  currentRound: number
  firstEliminationDone: boolean
}

// ========================
// Main Calculator
// ========================
export function calculateGamePoints(
  players: Player[],
  winnerIds: string[],
  gameState: GameState
): PointBreakdown[] {
  const breakdowns: PointBreakdown[] = []

  // Find duelists
  const duelists = players.filter(p => p.special_role === 'duelists')
  const duelistEliminated = duelists.filter(p => !p.is_alive)
  const duelistAlive = duelists.filter(p => p.is_alive)

  // Find lovers
  const lovers = players.filter(p => p.special_role === 'lovers')

  // Check if Mr. Meme is on winning team  
  const mrMeme = players.find(p => p.special_role === 'mr_meme')
  const mrMemeOnWinningTeam = mrMeme && winnerIds.includes(mrMeme.id)

  for (const player of players) {
    const isWinner = winnerIds.includes(player.id)
    let basePoints = 0
    let bonusPoints = 0
    const bonusReasons: string[] = []

    // 1. Base points for winners
    if (isWinner && player.role) {
      basePoints = BASE_POINTS[player.role] || 0
    }

    // 2. Joy Fool: +4 if eliminated first (round 1)
    if (player.special_role === 'joy_fool' && player.elimination_round === 1) {
      bonusPoints += 4
      bonusReasons.push('Joy Fool: bị loại đầu tiên (+4)')
    }

    // 3. Lovers: +1 per round survived
    if (player.special_role === 'lovers' && player.rounds_survived > 0) {
      bonusPoints += player.rounds_survived
      bonusReasons.push(`Lovers: sống sót ${player.rounds_survived} round (+${player.rounds_survived})`)
    }

    // 3b. Lovers: half partner's points if partner won without them
    if (player.special_role === 'lovers' && !player.is_alive) {
      const partner = lovers.find(l => l.id !== player.id)
      if (partner && winnerIds.includes(partner.id) && partner.role) {
        const partnerBase = BASE_POINTS[partner.role] || 0
        const halfPoints = Math.floor(partnerBase / 2)
        if (halfPoints > 0) {
          bonusPoints += halfPoints
          bonusReasons.push(`Lovers: nửa điểm partner (+${halfPoints})`)
        }
      }
    }

    // 4. Mr. Meme bonus: winning team gets +2 if Mr. Meme is among them
    if (mrMemeOnWinningTeam && isWinner) {
      bonusPoints += 2
      bonusReasons.push('Mr. Meme trong team (+2)')
    }

    // 5. Duelists: first eliminated -2, other +2
    if (player.special_role === 'duelists') {
      if (duelistEliminated.length > 0 && duelistAlive.length > 0) {
        // One eliminated, one alive — clear result
        if (!player.is_alive) {
          bonusPoints -= 2
          bonusReasons.push('Duelists: bị loại trước (-2)')
        } else {
          bonusPoints += 2
          bonusReasons.push('Duelists: thắng đấu tay đôi (+2)')
        }
      } else if (duelistEliminated.length === 2) {
        // Both eliminated — first one loses, second wins
        const firstElim = duelistEliminated.reduce((a, b) =>
          (a.elimination_round || 999) < (b.elimination_round || 999) ? a : b
        )
        if (player.id === firstElim.id) {
          bonusPoints -= 2
          bonusReasons.push('Duelists: bị loại trước (-2)')
        } else {
          bonusPoints += 2
          bonusReasons.push('Duelists: thắng đấu tay đôi (+2)')
        }
      }
      // Both alive at game end → no duel points
    }

    const totalGamePoints = basePoints + bonusPoints

    breakdowns.push({
      playerId: player.id,
      playerName: player.name,
      role: player.role,
      specialRole: player.special_role || null,
      basePoints,
      bonusPoints,
      bonusReasons,
      totalGamePoints,
      accumulatedPoints: player.points + totalGamePoints,
    })
  }

  return breakdowns
}

/**
 * Apply calculated points back to players array
 */
export function applyPointsToPlayers(
  players: Player[],
  breakdowns: PointBreakdown[]
): Player[] {
  return players.map(player => {
    const bd = breakdowns.find(b => b.playerId === player.id)
    if (!bd) return player
    return {
      ...player,
      points: bd.accumulatedPoints,
    }
  })
}
