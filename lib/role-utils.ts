export const getMaxTotalEnemies = (playerCount: number) => {
  if (playerCount <= 2) return 0
  return playerCount - 1
}

export const getDefaultRoleSettings = (playerCount: number) => {
  let undercoverCount = 0
  let mrWhiteCount = 0

  if (playerCount <= 2) return { undercoverCount: 0, mrWhiteCount: 0 }

  if (playerCount === 3) {
    // 2 Civ + 1 enemy (either Undercover or Mr. White)
    return { undercoverCount: 1, mrWhiteCount: 0 }
  }

  if (playerCount === 4) {
    // 3 Civ + 1 Undercover (or 1 Mr. White)
    return { undercoverCount: 1, mrWhiteCount: 0 }
  }

  if (playerCount === 5) {
    // 3 Civ + 1 Undercover + 1 Mr. White
    return { undercoverCount: 1, mrWhiteCount: 1 }
  }

  // Default distribution: ~1 enemy per 3 players
  const defaultTotalEnemies = Math.floor((playerCount + 1) / 3)
  mrWhiteCount = playerCount >= 5 ? 1 : 0
  undercoverCount = Math.max(0, defaultTotalEnemies - mrWhiteCount)

  // Ensure at least 1 enemy
  if (undercoverCount + mrWhiteCount === 0) {
    undercoverCount = 1
  }

  return { undercoverCount, mrWhiteCount }
}

export const normalizeRoleSettings = (
  playerCount: number,
  undercoverCount: number,
  mrWhiteCount: number
) => {
  const maxTotalEnemies = getMaxTotalEnemies(playerCount)
  let safeUndercover = Math.max(0, Math.floor(undercoverCount))
  let safeMrWhite = Math.max(0, Math.floor(mrWhiteCount))

  if (maxTotalEnemies === 0) {
    return { undercoverCount: 0, mrWhiteCount: 0 }
  }

  if (safeUndercover + safeMrWhite === 0) {
    return getDefaultRoleSettings(playerCount)
  }

  const overflow = safeUndercover + safeMrWhite - maxTotalEnemies
  if (overflow > 0) {
    const reduceMrWhite = Math.min(safeMrWhite, overflow)
    safeMrWhite -= reduceMrWhite
    const remaining = overflow - reduceMrWhite
    if (remaining > 0) {
      safeUndercover = Math.max(0, safeUndercover - remaining)
    }
  }

  return { undercoverCount: safeUndercover, mrWhiteCount: safeMrWhite }
}

export const getRoleLimits = (
  playerCount: number,
  currentUndercover: number,
  currentMrWhite: number
) => {
  const maxTotalEnemies = getMaxTotalEnemies(playerCount)

  let maxUndercover = maxTotalEnemies - currentMrWhite
  maxUndercover = Math.max(0, maxUndercover)

  let maxMrWhite = maxTotalEnemies - currentUndercover
  maxMrWhite = Math.max(0, maxMrWhite)

  return { maxUndercover, maxMrWhite }
}

export type SpecialRole = {
  id: string
  name: string
  description: string
  minPlayers: number
  color: string
}

export const SPECIAL_ROLES: SpecialRole[] = [
  {
    id: 'joy_fool',
    name: 'The Joy Fool',
    description: 'The Joy Fool thắng 4 điểm thưởng nếu bị vote loại đầu tiên!',
    minPlayers: 3,
    color: 'bg-yellow-500'
  },
  {
    id: 'boomerang',
    name: 'The Boomerang',
    description: 'Lần đầu tiên nhận đa số phiếu, thay vì bị loại, phiếu bầu sẽ bị dội lại!',
    minPlayers: 3,
    color: 'bg-orange-500'
  },
  {
    id: 'justice',
    name: 'Goddess of Justice',
    description: 'Trong trường hợp hòa phiếu, cô ấy sẽ quyết định ai bị loại (kể cả khi đã bị loại).',
    minPlayers: 3,
    color: 'bg-emerald-600'
  },
  {
    id: 'ghost',
    name: 'The Ghost',
    description: 'The Ghost vẫn có thể tham gia bỏ phiếu ngay cả khi đã bị loại!',
    minPlayers: 3,
    color: 'bg-slate-300'
  },
  {
    id: 'lovers',
    name: 'The Lovers',
    description: 'Hai người chơi đang yêu. Nếu một người bị loại, người kia cũng bị loại theo (cần 5 người chơi).',
    minPlayers: 5,
    color: 'bg-pink-500'
  },
  {
    id: 'mr_meme',
    name: 'Mr. Meme',
    description: 'Mỗi round, 1 người chơi phải mô tả từ khóa bằng hành động thay vì nói (chỉ khi chơi trực tiếp).',
    minPlayers: 3,
    color: 'bg-zinc-800'
  },
  {
    id: 'falafel',
    name: 'The Falafel Vendor',
    description: 'Nhận ngẫu nhiên một khả năng đặc biệt mỗi ván! Thử vận may xem! (cần 4 người chơi).',
    minPlayers: 4,
    color: 'bg-yellow-700'
  },
  {
    id: 'revenger',
    name: 'The Revenger',
    description: 'Khi bị loại, có thể kéo theo loại một người khác cùng (cần 5 người chơi).',
    minPlayers: 5,
    color: 'bg-purple-500'
  },
  {
    id: 'duelists',
    name: 'The Duelists',
    description: 'Hai người chơi đấu tay đôi bí mật. Người bị loại trước mất 2 điểm, người kia được 2 điểm (cần 5 người chơi).',
    minPlayers: 5,
    color: 'bg-amber-700'
  }
]
