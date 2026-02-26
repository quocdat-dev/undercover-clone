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
    id: 'lovers',
    name: 'The Lovers',
    description: 'Hai người chơi yêu nhau. Nếu một người bị loại, người kia cũng sẽ bị loại (cần ít nhất 5 người chơi).',
    minPlayers: 5,
    color: 'bg-pink-500' // Using color classes for placeholders
  },
  {
    id: 'boomerang',
    name: 'The Boomerang',
    description: 'Lần đầu tiên bị bầu chọn nhiều nhất, thay vì bị loại, những người bỏ phiếu cho họ sẽ nhận lại phiếu.',
    minPlayers: 3,
    color: 'bg-orange-500'
  },
  {
    id: 'revenger',
    name: 'The Revenger',
    description: 'Khi bị loại, có thể kéo theo một người khác bị loại cùng (cần ít nhất 5 người chơi).',
    minPlayers: 5,
    color: 'bg-purple-500'
  },
  {
    id: 'joy_fool',
    name: 'The Joy Fool',
    description: 'Thắng nếu bị loại ĐẦU TIÊN!',
    minPlayers: 3,
    color: 'bg-yellow-500'
  },
  {
    id: 'ghost',
    name: 'The Ghost',
    description: 'Vẫn có thể thảo luận và bỏ phiếu dù đã bị loại!',
    minPlayers: 3,
    color: 'bg-slate-300'
  },
  {
    id: 'mr_meme',
    name: 'Mr. Meme',
    description: 'Chỉ được phép diễn tả từ khóa bằng hành động, không được nói chuyện!',
    minPlayers: 3,
    color: 'bg-zinc-800'
  },
  {
    id: 'justice',
    name: 'Goddess of Justice',
    description: 'Trong trường hợp hòa phiếu, nữ thần quyết định ai bị loại (kể cả khi đã bị loại).',
    minPlayers: 3,
    color: 'bg-emerald-600'
  },
  {
    id: 'duelists',
    name: 'The Duelists',
    description: 'Hai người chơi quyết đấu bí mật. Kẻ bị loại trước thua cuộc (cần ít nhất 5 người chơi).',
    minPlayers: 5,
    color: 'bg-amber-700'
  },
  {
    id: 'falafel',
    name: 'The Falafel Vendor',
    description: 'Nhận ngẫu nhiên quyền năng của một vai trò đặc biệt khác (cần 4 người chơi).',
    minPlayers: 4,
    color: 'bg-yellow-700'
  }
]
