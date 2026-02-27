import type { Player } from '@/types/database'

// ========================
// Types
// ========================
export interface ToastMessage {
  title: string
  description: string
  variant: 'success' | 'error' | 'warning' | 'default'
}

export interface EliminationResult {
  shouldEliminate: boolean // false = Boomerang blocks it
  additionalEliminations: string[] // IDs of players also eliminated (Lovers, Revenger)
  toasts: ToastMessage[]
  requiresRevengePick: boolean // needs modal for Revenger to pick target
  updatedPlayers: Player[]
  isJoyFoolTriggered: boolean
}

// Falafel Vendor can receive these abilities
const FALAFEL_POOL = ['boomerang', 'ghost', 'joy_fool', 'revenger'] as const

// ========================
// Role Effect Handlers
// ========================

/**
 * Process elimination with all special role effects
 */
export function handleElimination(
  playerId: string,
  players: Player[],
  currentRound: number,
  firstEliminationDone: boolean
): EliminationResult {
  const toasts: ToastMessage[] = []
  let updatedPlayers = [...players]
  const playerToEliminate = players.find(p => p.id === playerId)

  if (!playerToEliminate) {
    return {
      shouldEliminate: false,
      additionalEliminations: [],
      toasts: [{ title: 'Lỗi', description: 'Không tìm thấy người chơi', variant: 'error' }],
      requiresRevengePick: false,
      updatedPlayers: players,
      isJoyFoolTriggered: false,
    }
  }

  // Resolve effective special role (Falafel Vendor has resolved_role in state)
  const effectiveRole = playerToEliminate.state?.resolved_falafel_role || playerToEliminate.special_role

  // --- BOOMERANG CHECK ---
  if (effectiveRole === 'boomerang' && !playerToEliminate.state?.boomerang_used) {
    toasts.push({
      title: '🪃 Boomerang!',
      description: `${playerToEliminate.name} dội lại phiếu bầu! Miễn bị loại lần này.`,
      variant: 'warning',
    })
    updatedPlayers = updatedPlayers.map(p =>
      p.id === playerId ? { ...p, state: { ...p.state, boomerang_used: true } } : p
    )
    return {
      shouldEliminate: false,
      additionalEliminations: [],
      toasts,
      requiresRevengePick: false,
      updatedPlayers,
      isJoyFoolTriggered: false,
    }
  }

  // --- PROCEED WITH ELIMINATION ---
  updatedPlayers = updatedPlayers.map(p =>
    p.id === playerId
      ? { ...p, is_alive: false, elimination_round: currentRound }
      : p
  )

  const additionalEliminations: string[] = []

  // --- GHOST: mark as ghost instead of fully dead ---
  if (effectiveRole === 'ghost') {
    updatedPlayers = updatedPlayers.map(p =>
      p.id === playerId ? { ...p, is_ghost: true } : p
    )
    toasts.push({
      title: '👻 Ghost!',
      description: `${playerToEliminate.name} bị loại nhưng vẫn có thể bỏ phiếu!`,
      variant: 'warning',
    })
  }

  // --- JOY FOOL: check if first elimination ---
  const isJoyFoolTriggered = effectiveRole === 'joy_fool' && !firstEliminationDone
  if (isJoyFoolTriggered) {
    toasts.push({
      title: '🃏 Joy Fool!',
      description: `${playerToEliminate.name} bị loại đầu tiên! +4 điểm thưởng!`,
      variant: 'success',
    })
  }

  // --- LOVERS: eliminate partner too ---
  if (effectiveRole === 'lovers' || playerToEliminate.special_role === 'lovers') {
    const partner = players.find(
      p => p.id !== playerId && p.special_role === 'lovers' && p.is_alive
    )
    if (partner) {
      toasts.push({
        title: '💔 Lovers!',
        description: `${partner.name} cũng bị loại theo!`,
        variant: 'error',
      })
      updatedPlayers = updatedPlayers.map(p =>
        p.id === partner.id
          ? { ...p, is_alive: false, elimination_round: currentRound }
          : p
      )
      additionalEliminations.push(partner.id)
    }
  }

  // --- REVENGER: needs modal to pick another player ---
  const requiresRevengePick = effectiveRole === 'revenger'
  if (requiresRevengePick) {
    toasts.push({
      title: '⚡ Revenger!',
      description: `${playerToEliminate.name} có thể kéo theo 1 người chơi khác!`,
      variant: 'warning',
    })
  }

  return {
    shouldEliminate: true,
    additionalEliminations,
    toasts,
    requiresRevengePick,
    updatedPlayers,
    isJoyFoolTriggered,
  }
}

/**
 * Apply Revenger's choice — eliminate the target
 */
export function applyRevengerChoice(
  targetId: string,
  players: Player[],
  currentRound: number
): { updatedPlayers: Player[]; toast: ToastMessage } {
  const target = players.find(p => p.id === targetId)
  const updatedPlayers = players.map(p =>
    p.id === targetId
      ? { ...p, is_alive: false, elimination_round: currentRound }
      : p
  )
  return {
    updatedPlayers,
    toast: {
      title: '⚡ Revenger!',
      description: `${target?.name || 'Người chơi'} bị kéo theo bởi Revenger!`,
      variant: 'error',
    },
  }
}

/**
 * Resolve Falafel Vendor — assign a random ability from the pool
 */
export function resolveFalafelVendor(existingRoles: string[]): string {
  // Filter out roles already in use to avoid duplicates
  const available = FALAFEL_POOL.filter(r => !existingRoles.includes(r))
  if (available.length === 0) {
    // Fallback: pick any from pool
    return FALAFEL_POOL[Math.floor(Math.random() * FALAFEL_POOL.length)]
  }
  return available[Math.floor(Math.random() * available.length)]
}

/**
 * Select random Mr. Meme target for this round
 */
export function selectMrMemeTarget(alivePlayers: Player[]): string | null {
  if (alivePlayers.length === 0) return null
  const randomIndex = Math.floor(Math.random() * alivePlayers.length)
  return alivePlayers[randomIndex].id
}

/**
 * Increment rounds_survived for alive Lovers at end of each round
 */
export function incrementLoversRoundsSurvived(players: Player[]): Player[] {
  return players.map(p => {
    if (p.special_role === 'lovers' && p.is_alive) {
      return { ...p, rounds_survived: (p.rounds_survived || 0) + 1 }
    }
    return p
  })
}
