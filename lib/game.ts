import { supabase } from './supabase'
import { getDefaultRoleSettings, normalizeRoleSettings } from './role-utils'
import { resolveFalafelVendor, selectMrMemeTarget } from './special-role-effects'
import { calculateGamePoints, applyPointsToPlayers } from './points'
import type {
  Room,
  Player,
  WordPair,
  GameHistory,
  GameStatistics,
  RoomSettings,
} from '@/types/database'

/**
 * Get a random word pair that hasn't been used in this room
 */
export async function getRandomWordPair(
  usedWordIds: number[],
  difficulty?: 1 | 2 | 3 | 4
): Promise<WordPair | null> {
  let query = supabase
    .from('word_pairs')
    .select('*')

  // Filter out used words
  if (usedWordIds.length > 0) {
    query = query.not('id', 'in', `(${usedWordIds.join(',')})`)
  }

  // Filter by difficulty if specified (focus on medium -> hard: 2-3)
  if (difficulty) {
    query = query.eq('difficulty', difficulty)
  } else {
    // Default: prefer medium to hard (2-3)
    query = query.in('difficulty', [2, 3])
  }

  const { data, error } = await query

  if (error || !data || data.length === 0) {
    // Fallback: get any unused word
    const fallbackQuery = supabase
      .from('word_pairs')
      .select('*')
    
    if (usedWordIds.length > 0) {
      fallbackQuery.not('id', 'in', `(${usedWordIds.join(',')})`)
    }

    const { data: fallbackData } = await fallbackQuery
    if (fallbackData && fallbackData.length > 0) {
      const randomIndex = Math.floor(Math.random() * fallbackData.length)
      return fallbackData[randomIndex] as WordPair
    }
    return null
  }

  const randomIndex = Math.floor(Math.random() * data.length)
  return data[randomIndex] as WordPair
}

/**
 * Assign roles to players based on room settings
 * Returns updated players array with roles assigned
 */
export function assignRoles(players: Player[], settings?: RoomSettings): Player[] {
  if (players.length < 3) {
    return players // Need at least 3 players
  }

  const shuffled = [...players].sort(() => Math.random() - 0.5)
  const totalPlayers = shuffled.length

  // Default settings if not provided
  let { undercoverCount, mrWhiteCount } = getDefaultRoleSettings(totalPlayers)

  if (settings?.randomRoleMode) {
    // Random mode: generate valid random role counts
    const maxEnemies = Math.floor(totalPlayers / 2)
    // Undercover: 1 to floor(totalPlayers / 3), at least 1
    const maxU = Math.max(1, Math.floor(totalPlayers / 3))
    undercoverCount = 1 + Math.floor(Math.random() * maxU)
    // Mr. White: 0 to floor(totalPlayers / 5), but only if 5+ players
    const maxW = totalPlayers >= 5 ? Math.max(1, Math.floor(totalPlayers / 5)) : 0
    mrWhiteCount = Math.floor(Math.random() * (maxW + 1))
    // Clamp total enemies to ensure civilians > enemies
    if (undercoverCount + mrWhiteCount > maxEnemies) {
      const overflow = (undercoverCount + mrWhiteCount) - maxEnemies
      mrWhiteCount = Math.max(0, mrWhiteCount - overflow)
      if (undercoverCount + mrWhiteCount > maxEnemies) {
        undercoverCount = maxEnemies - mrWhiteCount
      }
    }
    // Ensure at least 1 enemy
    if (undercoverCount + mrWhiteCount === 0) {
      undercoverCount = 1
    }
  } else if (settings) {
    const normalized = normalizeRoleSettings(
      totalPlayers,
      settings.undercoverCount,
      settings.mrWhiteCount
    )
    undercoverCount = normalized.undercoverCount
    mrWhiteCount = normalized.mrWhiteCount
  }

  // Pre-calculate special role distribution
  const specialRolesList: string[] = []
  if (settings?.specialRoles) {
    for (const roleId of settings.specialRoles) {
      if (roleId === 'lovers' || roleId === 'duelists') {
        specialRolesList.push(roleId, roleId)
      } else {
        specialRolesList.push(roleId)
      }
    }
  }

  // Assign special roles randomly across all players
  // One player can only have one special role (max)
  const specialRoleAssignments = new Map<number, string>()
  const shuffledIndicesForSpecial = [...Array(totalPlayers).keys()].sort(() => Math.random() - 0.5)
  
  for (let i = 0; i < Math.min(specialRolesList.length, totalPlayers); i++) {
    specialRoleAssignments.set(shuffledIndicesForSpecial[i], specialRolesList[i])
  }

  // Resolve Falafel Vendor — assign a random ability from the pool
  const existingRoles = settings?.specialRoles || []

  const assignedPlayers = shuffled.map((player, index) => {
    let role: Player['role'] = 'civilian'

    if (index < undercoverCount) {
      role = 'undercover'
    } else if (index < undercoverCount + mrWhiteCount) {
      role = 'mr_white'
    }
    
    const special_role = specialRoleAssignments.get(index) || null

    // Resolve Falafel Vendor to a random ability
    let state: Record<string, any> = {}
    if (special_role === 'falafel') {
      const resolvedRole = resolveFalafelVendor(existingRoles)
      state = { resolved_falafel_role: resolvedRole }
    }

    return {
      ...player,
      role,
      special_role,
      state,
      is_alive: true,
      is_ghost: false,
      rounds_survived: 0,
      elimination_round: null,
      // Preserve accumulated points from previous games
      points: player.points || 0,
    }
  })

  return assignedPlayers
}

/**
 * Start a game by assigning roles and selecting a word pair
 */
export async function startGame(
  roomCode: string,
  category?: string
): Promise<{
  success: boolean
  error?: string
}> {
  try {
    // Get current room
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('*')
      .eq('code', roomCode)
      .single()

    if (roomError || !room) {
      return { success: false, error: 'Không tìm thấy phòng' }
    }

    const players = (room.players || []) as Player[]
    if (players.length < 3) {
      return { success: false, error: 'Cần ít nhất 3 người chơi' }
    }

    // Get random word pair (with category filter if specified)
    let wordPair: WordPair | null = null
    if (category) {
      // Get word pair from specific category
      let query = supabase
        .from('word_pairs')
        .select('*')
        .eq('category', category)

      if (room.used_word_ids && room.used_word_ids.length > 0) {
        query = query.not('id', 'in', `(${room.used_word_ids.join(',')})`)
      }

      const { data, error } = await query
      if (!error && data && data.length > 0) {
        const randomIndex = Math.floor(Math.random() * data.length)
        wordPair = data[randomIndex] as WordPair
      }
    }

    // Fallback to random if category filter didn't work
    if (!wordPair) {
      wordPair = await getRandomWordPair(room.used_word_ids || [])
    }

    if (!wordPair) {
      return { success: false, error: 'Không còn từ nào để chơi' }
    }

    // Assign roles using room settings
    const playersWithRoles = assignRoles(players, room.settings)

    // Select Mr. Meme target if active
    const hasMrMeme = playersWithRoles.some(p => p.special_role === 'mr_meme')
    const mrMemeTargetId = hasMrMeme
      ? selectMrMemeTarget(playersWithRoles.filter(p => p.is_alive))
      : null

    // Update room
    const { error: updateError } = await supabase
      .from('rooms')
      .update({
        status: 'playing',
        current_word_pair_id: wordPair.id,
        used_word_ids: [...(room.used_word_ids || []), wordPair.id],
        players: playersWithRoles,
        current_round: 1,
        first_elimination_done: false,
        mr_meme_target_id: mrMemeTargetId,
      })
      .eq('code', roomCode)

    if (updateError) {
      return { success: false, error: 'Không thể bắt đầu game' }
    }

    return { success: true }
  } catch (error) {
    console.error('Error starting game:', error)
    return { success: false, error: 'Lỗi không xác định' }
  }
}

/**
 * Check if game has ended and determine winners
 * Returns: { ended: boolean, winners: string[], reason: string }
 */
export function checkGameEnd(players: Player[]): {
  ended: boolean
  winners: string[]
  reason: string
} {
  const alivePlayers = players.filter((p) => p.is_alive)
  const aliveCivilians = alivePlayers.filter((p) => p.role === 'civilian')
  const aliveUndercover = alivePlayers.filter((p) => p.role === 'undercover')
  const aliveMrWhite = alivePlayers.filter((p) => p.role === 'mr_white')

  // Civilians win: All Undercover and Mr. White are eliminated
  if (aliveUndercover.length === 0 && aliveMrWhite.length === 0) {
    return {
      ended: true,
      winners: aliveCivilians.map((p) => p.id),
      reason: 'Dân thường thắng! Đã loại bỏ tất cả Undercover và Mr. White.',
    }
  }

  // Undercover/Mr. White win: Only 1-2 players left (must be Undercover/Mr. White)
  if (alivePlayers.length <= 2) {
    // Check if remaining players are Undercover or Mr. White
    const remainingAreBad = alivePlayers.every(
      (p) => p.role === 'undercover' || p.role === 'mr_white'
    )

    if (remainingAreBad) {
      return {
        ended: true,
        winners: alivePlayers.map((p) => p.id),
        reason: `${aliveUndercover.length > 0 ? 'Undercover' : ''}${aliveMrWhite.length > 0 ? ' Mr. White' : ''} thắng! Đã loại bỏ tất cả Dân thường.`,
      }
    }
  }

  // Game continues
  return {
    ended: false,
    winners: [],
    reason: '',
  }
}

/**
 * End game and update room status, save to history
 */
export async function endGame(
  roomCode: string,
  winners: string[],
  reason: string,
  startTime?: Date
): Promise<{
  success: boolean
  error?: string
}> {
  try {
    // Get room data
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('*')
      .eq('code', roomCode)
      .single()

    if (roomError || !room) {
      return { success: false, error: 'Không tìm thấy phòng' }
    }

    const players = (room.players || []) as Player[]
    const endTime = new Date()
    const duration = startTime
      ? Math.floor((endTime.getTime() - startTime.getTime()) / 1000)
      : null

    // Calculate and apply points
    const gameState = {
      currentRound: room.current_round || 1,
      firstEliminationDone: room.first_elimination_done || false,
    }
    const pointBreakdowns = calculateGamePoints(players, winners, gameState)
    const playersWithPoints = applyPointsToPlayers(players, pointBreakdowns)
    const winnerPlayers = playersWithPoints.filter((p) => winners.includes(p.id))

    // Save to game history
    const { error: historyError } = await supabase.from('game_history').insert({
      room_code: roomCode,
      word_pair_id: room.current_word_pair_id,
      players: playersWithPoints,
      winners: winnerPlayers,
      game_result: reason,
      started_at: startTime?.toISOString() || new Date().toISOString(),
      ended_at: endTime.toISOString(),
      duration_seconds: duration,
    })

    if (historyError) {
      console.error('Error saving game history:', historyError)
    }

    // Update room status with accumulated points
    const { error: updateError } = await supabase
      .from('rooms')
      .update({
        status: 'finished',
        players: playersWithPoints,
      })
      .eq('code', roomCode)

    if (updateError) {
      return { success: false, error: 'Không thể kết thúc game' }
    }

    return { success: true }
  } catch (error) {
    console.error('Error ending game:', error)
    return { success: false, error: 'Lỗi không xác định' }
  }
}

/**
 * Get game history for a room
 */
export async function getGameHistory(roomCode: string): Promise<GameHistory[]> {
  try {
    const { data, error } = await supabase
      .from('game_history')
      .select('*')
      .eq('room_code', roomCode)
      .order('started_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('Error fetching game history:', error)
      return []
    }

    return (data || []) as GameHistory[]
  } catch (error) {
    console.error('Error getting game history:', error)
    return []
  }
}

/**
 * Get game statistics for a room
 */
export async function getGameStatistics(roomCode: string): Promise<GameStatistics | null> {
  try {
    const { data, error } = await supabase
      .from('game_statistics')
      .select('*')
      .eq('room_code', roomCode)
      .single()

    if (error || !data) {
      return null
    }

    return data as GameStatistics
  } catch (error) {
    console.error('Error getting game statistics:', error)
    return null
  }
}

/**
 * Restart game (reset players, get new word pair)
 */
export async function restartGame(roomCode: string): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('*')
      .eq('code', roomCode)
      .single()

    if (roomError || !room) {
      return { success: false, error: 'Không tìm thấy phòng' }
    }

    const players = (room.players || []) as Player[]
    
    // Reset per-game fields but PRESERVE accumulated points
    const resetPlayers = players.map((p) => ({
      ...p,
      role: null,
      is_alive: true,
      is_ghost: false,
      rounds_survived: 0,
      elimination_round: null,
      state: {},
      // Keep accumulated points!
      points: p.points || 0,
    }))

    // Get new word pair
    const wordPair = await getRandomWordPair(room.used_word_ids || [])
    if (!wordPair) {
      return { success: false, error: 'Không còn từ nào để chơi' }
    }

    // Assign new roles using room settings
    const playersWithRoles = assignRoles(resetPlayers, room.settings)

    // Select Mr. Meme target if active
    const hasMrMeme = playersWithRoles.some(p => p.special_role === 'mr_meme')
    const mrMemeTargetId = hasMrMeme
      ? selectMrMemeTarget(playersWithRoles.filter(p => p.is_alive))
      : null

    // Update room
    const { error: updateError } = await supabase
      .from('rooms')
      .update({
        status: 'playing',
        current_word_pair_id: wordPair.id,
        used_word_ids: [...(room.used_word_ids || []), wordPair.id],
        players: playersWithRoles,
        current_round: 1,
        first_elimination_done: false,
        mr_meme_target_id: mrMemeTargetId,
      })
      .eq('code', roomCode)

    if (updateError) {
      return { success: false, error: 'Không thể khởi động lại game' }
    }

    return { success: true }
  } catch (error) {
    console.error('Error restarting game:', error)
    return { success: false, error: 'Lỗi không xác định' }
  }
}
