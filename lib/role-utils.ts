export const getMaxTotalEnemies = (playerCount: number) => {
  if (playerCount <= 2) return 0

  // Match Undercover-style ratios: ~1 enemy per 3 players.
  return Math.floor((playerCount + 1) / 3)
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

  const maxTotalEnemies = getMaxTotalEnemies(playerCount)
  mrWhiteCount = playerCount >= 5 ? 1 : 0
  undercoverCount = Math.max(0, maxTotalEnemies - mrWhiteCount)

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
  const effectiveMaxEnemies = Math.min(maxTotalEnemies, playerCount - 1)

  let maxUndercover = effectiveMaxEnemies - currentMrWhite
  maxUndercover = Math.max(0, maxUndercover)

  let maxMrWhite = effectiveMaxEnemies - currentUndercover
  maxMrWhite = Math.max(0, maxMrWhite)

  return { maxUndercover, maxMrWhite }
}
