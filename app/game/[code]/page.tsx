'use client'

import { useEffect, useState, useRef, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { checkGameEnd, endGame, restartGame } from '@/lib/game'
import { SPECIAL_ROLES } from '@/lib/role-utils'
import {
  handleElimination as processElimination,
  applyRevengerChoice,
  incrementLoversRoundsSurvived,
  selectMrMemeTarget,
} from '@/lib/special-role-effects'
import type { Room, Player, WordPair } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { useToast } from '@/components/ui/toast'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

type GamePhase = 'viewing_cards' | 'discussion' | 'voting'

const AVATAR_COLORS = [
  'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20',
  'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
  'bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20',
  'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
  'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20',
  'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
  'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
  'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20',
  'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20',
]

export default function GamePage() {
  const params = useParams()
  const router = useRouter()
  const code = params.code as string
  const { addToast } = useToast()

  const [room, setRoom] = useState<Room | null>(null)
  const [wordPair, setWordPair] = useState<WordPair | null>(null)
  const [loading, setLoading] = useState(true)
  const gameStartTimeRef = useRef<Date | null>(null)

  // Game Flow States
  const [gamePhase, setGamePhase] = useState<GamePhase>('viewing_cards')
  const [viewedPlayerIds, setViewedPlayerIds] = useState<Set<string>>(new Set())
  const [speakingOrder, setSpeakingOrder] = useState<Record<string, number>>({})
  const [assignedSlots, setAssignedSlots] = useState<Record<number, Player>>({})
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number | null>(null)

  // Modals & Temp States
  const [viewingPlayer, setViewingPlayer] = useState<Player | null>(null)
  const [showWord, setShowWord] = useState(false)
  const [confirmVotePlayer, setConfirmVotePlayer] = useState<Player | null>(null)
  const [eliminationRevealPlayer, setEliminationRevealPlayer] = useState<Player | null>(null)
  const [isProcessingElimination, setIsProcessingElimination] = useState(false)

  const [showRefreshConfirm, setShowRefreshConfirm] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [revengerPickMode, setRevengerPickMode] = useState(false)
  const [revengerSourceId, setRevengerSourceId] = useState<string | null>(null)
  const [isAmnesicMode, setIsAmnesicMode] = useState(false)
  const [amnesicTargetPlayer, setAmnesicTargetPlayer] = useState<Player | null>(null)
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const [boomerangRevealPlayer, setBoomerangRevealPlayer] = useState<Player | null>(null)

  useEffect(() => {
    const loadGame = async () => {
      const { data, error } = await supabase.from('rooms').select('*').eq('code', code).single()
      if (error || !data) {
        addToast({ title: 'Lỗi', description: 'Không tìm thấy game', variant: 'error' })
        router.push('/')
        return
      }
      const roomData = data as Room
      setRoom(roomData)

      if (roomData.status === 'playing' && roomData.current_word_pair_id) {
        const { data: wpData } = await supabase.from('word_pairs').select('*').eq('id', roomData.current_word_pair_id).single()
        if (wpData) setWordPair(wpData as WordPair)
        if (roomData.status === 'playing' && !gameStartTimeRef.current) gameStartTimeRef.current = new Date()
      }
      setLoading(false)
    }

    loadGame()

    const channel = supabase.channel(`game:${code}`).on('postgres_changes', { event: '*', schema: 'public', table: 'rooms', filter: `code=eq.${code}` },
      async (payload) => {
        const updatedRoom = payload.new as Room
        setRoom(updatedRoom)
        if (updatedRoom.current_word_pair_id && updatedRoom.current_word_pair_id !== room?.current_word_pair_id) {
          const { data: wpData } = await supabase.from('word_pairs').select('*').eq('id', updatedRoom.current_word_pair_id).single()
          if (wpData) setWordPair(wpData as WordPair)
          // Reset local states for new round
          setGamePhase('viewing_cards')
          setViewedPlayerIds(new Set())
          setSpeakingOrder({})
          setEliminationRevealPlayer(null)
          setAssignedSlots({})
          setSelectedSlotIndex(null)
        }
      }
    ).subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [code, router, room?.current_word_pair_id, addToast])

  // Logic Phase Transitions
  useEffect(() => {
    if (!room) return
    const players = (room.players || []) as Player[]
    const alivePlayers = players.filter((p) => p.is_alive)

    if (gamePhase === 'viewing_cards' && alivePlayers.length > 0) {
      const allViewed = alivePlayers.every(p => viewedPlayerIds.has(p.id))
      if (allViewed && !viewingPlayer) {
        setGamePhase('discussion')
        const orderMap: Record<string, number> = {}
        const shuffledIndices = Array.from({ length: alivePlayers.length }, (_, i) => i + 1).sort(() => Math.random() - 0.5)
        alivePlayers.forEach((p, index) => orderMap[p.id] = shuffledIndices[index])
        setSpeakingOrder(orderMap)

        // Mr. Meme toast notification
        const currentMrMemeTargetId = room?.mr_meme_target_id
        if (currentMrMemeTargetId) {
          const targetPlayer = players.find(p => p.id === currentMrMemeTargetId)
          if (targetPlayer) {
            addToast({
              title: '🤫 Mr. Meme!',
              description: `${targetPlayer.name} phải mô tả bằng hành động round này!`,
              variant: 'warning',
            })
          }
        }
      }
    }
  }, [viewedPlayerIds, gamePhase, room, viewingPlayer, addToast])

  // Callbacks
  const handleRefreshGame = async () => {
    setIsRefreshing(true)
    const result = await restartGame(code)
    if (!result.success) {
      addToast({ title: 'Lỗi', description: result.error || 'Không thể tạo ván mới', variant: 'error' })
    }
    setIsRefreshing(false)
    setShowRefreshConfirm(false)
  }

  const handlePlayerClick = (player: Player) => {
    if (!player.is_alive) return

    if (isAmnesicMode) {
      setAmnesicTargetPlayer(player)
      return
    }

    if (gamePhase === 'viewing_cards') {
      setViewingPlayer(player)
      setShowWord(false)
    } else if (gamePhase === 'voting') {
      setConfirmVotePlayer(player)
    }
  }

  const handleCloseViewModal = () => {
    setViewedPlayerIds(prev => {
      const next = new Set(prev)
      if (viewingPlayer) next.add(viewingPlayer.id)
      return next
    })

    if (selectedSlotIndex !== null && viewingPlayer) {
      setAssignedSlots(prev => ({
        ...prev,
        [selectedSlotIndex]: viewingPlayer
      }))
    }

    setShowWord(false)
    setViewingPlayer(null)
    setSelectedSlotIndex(null)
  }

  const handleEliminatePlayer = async (playerId: string) => {
    if (!room) return
    setIsProcessingElimination(true)
    const players = (room.players || []) as Player[]
    const currentRound = room.current_round || 1
    const firstEliminationDone = room.first_elimination_done || false

    // Use centralized effects engine
    const result = processElimination(playerId, players, currentRound, firstEliminationDone)

    // Show toasts
    for (const t of result.toasts) {
      addToast(t)
    }

    if (!result.shouldEliminate) {
      // Boomerang blocked — update state and show reveal modal
      await supabase.from('rooms').update({ players: result.updatedPlayers }).eq('code', code)
      const blockedPlayer = players.find(p => p.id === playerId)
      setConfirmVotePlayer(null)
      setBoomerangRevealPlayer(blockedPlayer || null)
      setIsProcessingElimination(false)
      return
    }

    // Increment Lovers rounds_survived for alive lovers
    let updatedPlayers = incrementLoversRoundsSurvived(result.updatedPlayers)

    // Select new Mr. Meme target for next round
    const alivePlayers = updatedPlayers.filter(p => p.is_alive)
    const hasMrMeme = updatedPlayers.some(p => p.special_role === 'mr_meme')
    const newMrMemeTarget = hasMrMeme ? selectMrMemeTarget(alivePlayers) : null

    // Update room with new round
    await supabase.from('rooms').update({
      players: updatedPlayers,
      current_round: currentRound + 1,
      first_elimination_done: true,
      mr_meme_target_id: newMrMemeTarget,
    }).eq('code', code)

    const playerToEliminate = players.find(p => p.id === playerId)
    setConfirmVotePlayer(null)
    setEliminationRevealPlayer(playerToEliminate || null)
    setIsProcessingElimination(false)

    // Check if Revenger needs to pick
    if (result.requiresRevengePick) {
      setRevengerSourceId(playerId)
      setRevengerPickMode(true)
    }

    // Check game end
    const gameResult = checkGameEnd(updatedPlayers)
    if (gameResult.ended) {
      await endGame(code, gameResult.winners, gameResult.reason, gameStartTimeRef.current || undefined)
    }
  }

  const handleRevengerPick = async (targetId: string) => {
    if (!room) return
    const players = (room.players || []) as Player[]
    const currentRound = room.current_round || 1
    const { updatedPlayers, toast } = applyRevengerChoice(targetId, players, currentRound)
    addToast(toast)

    await supabase.from('rooms').update({ players: updatedPlayers }).eq('code', code)
    setRevengerPickMode(false)
    setRevengerSourceId(null)

    const gameResult = checkGameEnd(updatedPlayers)
    if (gameResult.ended) {
      await endGame(code, gameResult.winners, gameResult.reason, gameStartTimeRef.current || undefined)
    }
  }

  const closeEliminationReveal = () => {
    setEliminationRevealPlayer(null)
    if (!room) return
    const updatedPlayers = (room.players || []) as Player[]
    const gameResult = checkGameEnd(updatedPlayers)
    if (gameResult.ended) {
      router.push(`/result/${code}`)
    } else {
      setGamePhase('discussion')
    }
  }

  // Derived state (Must be before early returns)
  const players = useMemo(() => (room?.players || []) as Player[], [room?.players])
  const alivePlayers = useMemo(() => players.filter((p: Player) => p.is_alive || p.is_ghost), [players])
  const currentPlayer = useMemo(() => alivePlayers.find((p: Player) => !viewedPlayerIds.has(p.id)), [alivePlayers, viewedPlayerIds])

  const playersToDisplay = useMemo(() => {
    if (gamePhase === 'discussion' || gamePhase === 'voting') {
      return [...players].sort((a: Player, b: Player) => {
        const aIsAlive = a.is_alive ? 0 : 1;
        const bIsAlive = b.is_alive ? 0 : 1;

        // Both dead or both alive but in voting phase (where speaking order doesn't matter as much, or we just keep same order)
        if (aIsAlive !== bIsAlive) {
          return aIsAlive - bIsAlive; // Alive players first (0) then dead players (1)
        }

        // If both are alive (or both dead) inside discussion, sort by speaking order
        // In voting, it's also nice to keep the same speaking order layout for consistency among alive players
        const orderA = speakingOrder[a.id] || 999;
        const orderB = speakingOrder[b.id] || 999;
        return orderA - orderB;
      });
    }
    return players;
  }, [players, gamePhase, speakingOrder]);

  const gridItems = useMemo(() => {
    if (gamePhase === 'viewing_cards') {
      return players.map((p: Player, i: number) => {
        if (!p.is_alive) return p; // Dead players stay in their original visual slot
        if (assignedSlots[i]) return assignedSlots[i]; // Alive player who already picked THIS slot
        return null; // Represents a random '?' card
      });
    } else {
      return playersToDisplay;
    }
  }, [gamePhase, players, assignedSlots, playersToDisplay]);

  // Helpers
  if (loading) return (
    <main className="flex min-h-screen items-center justify-center bg-background text-foreground">
      <p className="text-sm text-muted animate-pulse">Đang tải phòng...</p>
    </main>
  )

  if (!room || !wordPair) return (
    <main className="flex min-h-screen items-center justify-center bg-background text-foreground">
      <div className="text-center">
        <p className="text-muted mb-4 font-serif text-lg">Phòng không tồn tại hoặc đã kết thúc</p>
        <Button onClick={() => router.push(`/room/${code}`)} variant="outline">Trở Về Phòng Chờ</Button>
      </div>
    </main>
  )

  const undercoverCount = players.filter((p: Player) => p.role === 'undercover' && p.is_alive).length
  const mrWhiteCount = players.filter((p: Player) => p.role === 'mr_white' && p.is_alive).length
  const activeSpecialRoles = Array.from(new Set(
    players.filter((p: Player) => (p.is_alive || p.is_ghost) && p.special_role).map((p: Player) => SPECIAL_ROLES.find(r => r.id === p.special_role)?.name).filter((name): name is string => !!name)
  ))
  const mrMemeTargetId = room?.mr_meme_target_id || null
  const justicePlayer = players.find(p => p.special_role === 'justice')

  const getPlayerColorClass = (id: string) => {
    const hash = id.split('').reduce((acc, char) => char.charCodeAt(0) + acc, 0)
    return AVATAR_COLORS[hash % AVATAR_COLORS.length]
  }

  return (
    <main className="min-h-screen flex flex-col bg-background text-foreground font-sans relative overflow-hidden">

      {/* 🚀 Header */}
      <header className="flex items-start justify-between border-b border-border bg-background px-4 py-4 sm:px-6 sticky top-0 z-30 transition-all duration-300">
        <Button variant="ghost" size="icon" onClick={() => router.push(`/room/${code}`)} className="text-muted hover:text-foreground mt-1">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" /></svg>
        </Button>

        <div className="text-center flex-1 mx-4 animate-fade-in" key={gamePhase + (isAmnesicMode ? '-amnesic' : '')}>
          {isAmnesicMode ? (
            <>
              <h2 className="text-xl font-bold font-serif tracking-tight text-foreground">Chế Độ Xem Lại</h2>
              <p className="text-sm text-yellow-600 dark:text-yellow-400 font-medium mt-1 leading-snug">Chạm vào tên bạn để xem lại từ khóa</p>
            </>
          ) : (
            <>
              {gamePhase === 'viewing_cards' && currentPlayer && (
                <>
                  <h2 className="text-xl font-bold font-serif tracking-tight text-foreground">{currentPlayer.name}</h2>
                  <p className="text-sm text-muted font-medium mt-1 leading-snug">Vui lòng bốc một thẻ</p>
                </>
              )}
              {gamePhase === 'discussion' && (
                <>
                  <h2 className="text-xl font-bold font-serif tracking-tight text-foreground">Thời Gian Mô Tả</h2>
                  <p className="text-sm text-muted font-medium mt-1 leading-snug">Mô tả từ khóa theo thứ tự,<br />chỉ dùng 1 từ hoặc cụm từ ngắn.</p>
                </>
              )}
              {gamePhase === 'voting' && (
                <>
                  <h2 className="text-xl font-bold font-serif tracking-tight text-foreground">Thời Gian Biểu Quyết</h2>
                  <p className="text-sm text-muted font-medium mt-1 leading-snug">Thảo luận để tìm ra kẻ nằm vùng<br />và vote loại họ!</p>
                </>
              )}
            </>
          )}
        </div>
        {/* Add empty div to balance the back button and keep title centered */}
        <div className="w-10 mt-1 h-8"></div>
      </header>

      {/* 📊 Main Scrollable Content */}
      <div className="flex-1 flex flex-col items-center py-6 px-4 pb-24 max-w-lg mx-auto w-full z-0 h-full overflow-y-auto overflow-x-hidden">

        {/* Info Boxes Section */}
        {/* Info Boxes Section */}
        <div className="flex flex-row justify-center gap-3 mb-8 w-full">
          <Card className="rounded-md shadow-sm bg-muted/10 border-border flex-1 max-w-[150px]">
            <CardContent className="p-3 flex flex-col items-center text-center">
              <span className="text-[11px] font-medium text-muted uppercase tracking-wider mb-1">Cần Loại Bỏ</span>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-foreground">
                  <span className="text-base">🕵️</span>
                  <span className="font-mono text-sm font-semibold">{undercoverCount}</span>
                </div>
                <div className="flex items-center gap-1.5 text-foreground">
                  <span className="text-base">👻</span>
                  <span className="font-mono text-sm font-semibold">{mrWhiteCount}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-md shadow-sm bg-muted/10 border-border flex-1 max-w-[140px] flex flex-col justify-center">
            <CardContent className="p-3 flex flex-col items-center text-center">
              <span className="text-[11px] font-medium text-muted uppercase tracking-wider mb-2">Vai Trò Ẩn</span>
              <div className="flex items-center gap-1 flex-wrap justify-center min-h-[22px]">
                {activeSpecialRoles.length > 0 ? (
                  activeSpecialRoles.map((role, idx) => (
                    <Badge key={idx} variant="secondary" className="text-[10px] font-semibold px-2 py-0.5 border-border rounded-sm">
                      {role}
                    </Badge>
                  ))
                ) : (
                  <Badge variant="outline" className="text-[10px] font-semibold px-3 py-0.5 border-border rounded-sm text-muted">
                    Trống
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 🤫 Mr. Meme Announcement Banner */}
        {mrMemeTargetId && (gamePhase === 'discussion' || gamePhase === 'voting') && (() => {
          const targetPlayer = players.find(p => p.id === mrMemeTargetId)
          if (!targetPlayer || !targetPlayer.is_alive) return null
          return (
            <div className="w-full mb-6 animate-fade-in">
              <div className="flex items-center gap-3 p-3 border border-dashed border-zinc-400 dark:border-zinc-600 rounded-sm bg-zinc-800/5 dark:bg-zinc-800/30">
                <div className="w-9 h-9 rounded-full bg-zinc-800 dark:bg-zinc-700 flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-sm">
                  🤫
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-foreground">
                    Mr. Meme — <span className="text-zinc-600 dark:text-zinc-300">{targetPlayer.name}</span>
                  </p>
                  <p className="text-[10px] text-muted leading-tight mt-0.5">
                    Phải mô tả từ khóa bằng hành động thay vì nói!
                  </p>
                </div>
              </div>
            </div>
          )
        })()}

        {/* 🎮 GRID AREA */}
        <div className="grid grid-cols-3 gap-x-4 gap-y-6 w-full mb-12 place-items-start justify-items-center px-1">
          {gridItems.map((item: Player | null, index: number) => {
            if (item === null) {
              // 🏷️ PHASE 1: Card View (Unviewed)
              return (
                <div key={`slot-${index}`} className="flex flex-col items-center justify-start relative gap-2 w-full max-w-[85px] animate-fade-in">
                  <button
                    onClick={() => {
                      if (currentPlayer) {
                        setViewingPlayer(currentPlayer)
                        setSelectedSlotIndex(index)
                        setShowWord(true)
                      }
                    }}
                    className={cn(
                      "w-[85px] h-[85px] bg-card hover:bg-muted border border-dashed border-border rounded-full shadow-sm flex flex-col items-center justify-center transition-all group",
                      "active:scale-95 cursor-pointer ring-2 ring-primary/0 hover:ring-primary/50"
                    )}
                  >
                    <span className="text-3xl text-muted font-serif opacity-50 group-hover:text-foreground group-hover:opacity-100 transition-colors">?</span>
                  </button>
                  {/* Empty name placeholder to keep layout stable */}
                  <div className="h-[26px] w-full" />
                </div>
              )
            }

            // 👤 STANDARD AVATAR (Viewed or Dead or Discussion/Voting Phase)
            const player = item;
            const isAlive = player.is_alive || !!player.is_ghost
            const isGhost = !!player.is_ghost && !player.is_alive
            const isUndercover = player.role === 'undercover'
            const isMrMemeTarget = mrMemeTargetId === player.id && player.is_alive
            const isJustice = player.special_role === 'justice'
            const isMrWhite = player.role === 'mr_white'

            return (
              <div key={`player-${player.id}`} className="flex flex-col items-center justify-start relative gap-2 w-full max-w-[85px] animate-fade-in">
                {/* Mr. Meme Badge */}
                {isMrMemeTarget && gamePhase === 'discussion' && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
                    <div className="bg-zinc-800 text-white text-[9px] font-bold uppercase px-2 py-0.5 rounded-sm shadow-sm">🤫 Gesture</div>
                  </div>
                )}
                {/* Ghost Badge */}
                {isGhost && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
                    <div className="bg-slate-400 text-white text-[9px] font-bold uppercase px-2 py-0.5 rounded-sm shadow-sm">👻 Ghost</div>
                  </div>
                )}
                {/* Justice Badge */}
                {isJustice && gamePhase === 'voting' && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
                    <div className="bg-emerald-600 text-white text-[9px] font-bold uppercase px-2 py-0.5 rounded-sm shadow-sm">⚖️ Judge</div>
                  </div>
                )}
                {/* Vote Badge */}
                {gamePhase === 'voting' && isAlive && !isGhost && !isJustice && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
                    <div className="bg-foreground text-background text-[10px] font-bold uppercase px-2 py-0.5 rounded-sm shadow-sm animate-bounce">Vote</div>
                  </div>
                )}

                {/* Avatar + Order Badge */}
                <div className="relative">
                  {gamePhase === 'discussion' && isAlive && speakingOrder[player.id] && (
                    <div className="absolute top-0 right-0 z-20 bg-foreground text-background w-6 h-6 rounded-full flex items-center justify-center text-[12px] font-bold shadow-sm border border-background translate-x-[20%] -translate-y-[10%]">
                      {speakingOrder[player.id]}
                    </div>
                  )}
                  <button
                    onClick={() => {
                      if (revengerPickMode && player.is_alive && player.id !== revengerSourceId) {
                        handleRevengerPick(player.id)
                        return
                      }
                      handlePlayerClick(player)
                    }}
                    disabled={(!isAlive && !isGhost) || gamePhase === 'viewing_cards'}
                    className={cn(
                      "w-[85px] h-[85px] rounded-full flex items-center justify-center text-4xl font-serif font-semibold transition-all shadow-sm border",
                      isAlive ? getPlayerColorClass(player.id) : "bg-muted/10 border-border text-muted",
                      isAlive && gamePhase !== 'viewing_cards' && "hover:ring-2 hover:ring-foreground"
                    )}
                  >
                    {!isAlive ? (
                      <>
                        <div className="absolute inset-0 bg-background/50 rounded-full flex items-center justify-center" />
                        <div className="absolute -top-1 -right-1 bg-background rounded-full w-8 h-8 flex items-center justify-center shadow-sm border border-border z-20">
                          <span className="text-sm">
                            {player.role === 'civilian' ? '👤' :
                              player.role === 'undercover' ? '🕵️‍♂️' : '👻'}
                          </span>
                        </div>
                        <span className="drop-shadow-sm select-none opacity-40 blur-[1px]">{player.name.charAt(0).toUpperCase()}</span>
                      </>
                    ) : (
                      <span className="drop-shadow-sm select-none">{player.name.charAt(0).toUpperCase()}</span>
                    )}
                  </button>
                </div>

                {/* Name Plate */}
                <div className="text-center w-full min-w-0 flex justify-center mt-1">
                  <div className={cn(
                    "text-[13px] font-medium truncate max-w-[90px] px-2 py-0.5 rounded-sm transition-colors cursor-default",
                    !isAlive ? "text-muted line-through" : "bg-muted/40 border border-border text-foreground"
                  )}>
                    {player.name}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* 🔘 Phase Action Buttons Bottom Area */}
        <div className="w-full mt-auto pt-6 flex flex-col justify-end items-center gap-6 z-10">
          {(gamePhase === 'discussion' || (gamePhase === 'viewing_cards' && alivePlayers.every(p => viewedPlayerIds.has(p.id)))) && (
            <Button
              variant="primary"
              onClick={() => setGamePhase('voting')}
              className="w-full max-w-[280px] h-[50px] text-lg font-bold rounded-sm shadow-md transition-transform active:scale-95"
            >
              Chuyển Sang Bỏ Phiếu
            </Button>
          )}

          {gamePhase === 'voting' && (
            <Button
              variant="outline"
              onClick={() => setGamePhase('discussion')}
              className="w-full max-w-[280px] h-[50px] text-lg font-bold rounded-sm shadow-sm transition-transform active:scale-95 border-dashed"
            >
              Tiếp Tục Thảo Luận
            </Button>
          )}

          {/* Bottom Circle Action Buttons */}
          {gamePhase !== 'viewing_cards' && (
            <div className="flex items-center justify-center gap-4 w-full mt-2">
              <Button
                variant={isAmnesicMode ? "default" : "outline"}
                size="icon"
                className={cn(
                  "w-12 h-12 rounded-full border shadow-sm transition-transform active:scale-95",
                  isAmnesicMode ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted hover:text-foreground bg-background"
                )}
                onClick={() => setIsAmnesicMode(!isAmnesicMode)}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="w-12 h-12 rounded-full border border-border text-muted hover:text-foreground shadow-sm transition-transform active:scale-95 bg-background"
                onClick={() => setShowLeaderboard(true)}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="w-12 h-12 rounded-full border border-border text-muted hover:text-foreground shadow-sm transition-transform active:scale-95 bg-background"
                onClick={() => setShowRefreshConfirm(true)}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* 📌 Modals Section */}

      {/* Vote Confirmation */}
      <Dialog open={!!confirmVotePlayer} onOpenChange={(open) => !open && setConfirmVotePlayer(null)}>
        <DialogContent className="p-0 border-border rounded-sm max-w-[320px] overflow-hidden">
          <DialogHeader>
            <div className="px-6 pt-6 pb-4 border-b border-border bg-background w-full">
              <DialogTitle className="font-serif text-xl">Bạn có chắc chắn?</DialogTitle>
            </div>
          </DialogHeader>
          <div className="p-6 space-y-6 bg-background">
            <p className="text-sm text-muted leading-relaxed">Hành động này sẽ loại bỏ <strong className="text-foreground">{confirmVotePlayer?.name}</strong> khỏi ván chơi hiện tại.</p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 h-10 w-full font-medium"
                onClick={() => setConfirmVotePlayer(null)}
              >
                Hủy
              </Button>
              <Button
                variant="destructive"
                className="flex-1 h-10 w-full font-medium"
                onClick={() => confirmVotePlayer && handleEliminatePlayer(confirmVotePlayer.id)}
                isDisabled={isProcessingElimination}
              >
                Bỏ Phiếu Loại
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Elimination Reveal Reveal */}
      {eliminationRevealPlayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-background/80 backdrop-blur-sm animate-fade-in">
          <Card className="w-full max-w-[320px] rounded-sm shadow-xl border-border bg-background">
            <CardContent className="p-8 flex flex-col items-center">
              <h3 className="text-[10px] font-semibold uppercase tracking-widest text-muted mb-6">Kết quả Loại trừ</h3>

              <div className="relative mb-6">
                <div className={cn(
                  "w-24 h-24 rounded-full flex items-center justify-center text-4xl font-serif font-semibold shadow-inner border border-border",
                  getPlayerColorClass(eliminationRevealPlayer.id)
                )}>
                  {eliminationRevealPlayer.name.charAt(0).toUpperCase()}
                </div>
                <div className="absolute -bottom-2 -right-2 bg-background border border-border rounded-full w-10 h-10 flex items-center justify-center shadow-sm text-xl z-20">
                  <span className="text-xl">
                    {eliminationRevealPlayer.role === 'civilian' ? '👤' :
                      eliminationRevealPlayer.role === 'undercover' ? '🕵️' : '👻'}
                  </span>
                </div>
              </div>

              <h2 className="text-xl font-medium text-center mb-1 text-foreground">{eliminationRevealPlayer.name}</h2>
              <p className="text-sm font-semibold text-foreground mb-8">đã bị phát hiện là <span className="text-red-500">{eliminationRevealPlayer.role === 'civilian' ? 'Dân thường' : eliminationRevealPlayer.role === 'undercover' ? 'Kẻ nằm vùng' : 'Kẻ giấu mặt'}</span></p>

              <Button onClick={closeEliminationReveal} variant="primary" className="w-full font-medium h-10">
                XÁC NHẬN
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Boomerang Reveal */}
      {boomerangRevealPlayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-background/80 backdrop-blur-sm animate-fade-in">
          <Card className="w-full max-w-[320px] rounded-sm shadow-xl border-border bg-background">
            <CardContent className="p-8 flex flex-col items-center">
              <h3 className="text-[10px] font-semibold uppercase tracking-widest text-muted mb-6">Hiệu Ứng Đặc Biệt</h3>

              <div className="relative mb-6">
                <div className={cn(
                  "w-24 h-24 rounded-full flex items-center justify-center text-4xl font-serif font-semibold shadow-inner border border-border",
                  getPlayerColorClass(boomerangRevealPlayer.id)
                )}>
                  {boomerangRevealPlayer.name.charAt(0).toUpperCase()}
                </div>
                <div className="absolute -bottom-2 -right-2 bg-orange-500 border border-orange-400 rounded-full w-10 h-10 flex items-center justify-center shadow-sm text-xl z-20">
                  <span className="text-lg">🪃</span>
                </div>
              </div>

              <h2 className="text-xl font-medium text-center mb-1 text-foreground">{boomerangRevealPlayer.name}</h2>
              <p className="text-sm font-semibold text-center text-foreground mb-2">
                đã kích hoạt <span className="text-orange-500">Boomerang!</span>
              </p>
              <p className="text-xs text-muted text-center mb-8 leading-relaxed">
                Phiếu bầu bị dội lại! Người chơi này được miễn loại lần này.
              </p>

              <Button
                onClick={() => {
                  setBoomerangRevealPlayer(null)
                  setGamePhase('discussion')
                }}
                variant="primary"
                className="w-full font-medium h-10"
              >
                XÁC NHẬN
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Secret Word Reveal (Refined Notion View) */}
      {viewingPlayer && !eliminationRevealPlayer && (
        <Dialog open={true} onOpenChange={(open) => { if (!open) handleCloseViewModal(); }}>
          <DialogContent className="p-0 border-border rounded-sm max-w-[340px] bg-background overflow-hidden [&>button]:hidden">
            <DialogHeader>
              <div className="px-6 pt-6 pb-4 border-b border-border bg-muted/5 text-center w-full">
                <DialogTitle className="font-serif text-xl text-foreground">Bí Mật Ngôn Từ</DialogTitle>
              </div>
            </DialogHeader>

            <div className="px-6 py-8 text-center flex flex-col justify-center bg-background">
              <div className="space-y-6 animate-fade-in">
                <div className="flex flex-col items-center">
                  <div className="relative">
                    <div className={cn(
                      "w-20 h-20 rounded-full flex items-center justify-center text-3xl font-serif font-bold shadow-sm border",
                      getPlayerColorClass(viewingPlayer.id)
                    )}>
                      {viewingPlayer.name.charAt(0).toUpperCase()}
                    </div>
                    {/* Role Badge */}
                    <div className="absolute -bottom-1 -right-1 bg-background border border-border rounded-full w-9 h-9 flex items-center justify-center z-20 shadow-md">
                      <span className="text-lg">
                        {viewingPlayer.role === 'civilian' ? '👤' :
                          viewingPlayer.role === 'undercover' ? '🕵️' : '👻'}
                      </span>
                    </div>
                  </div>
                  <h2 className="text-lg font-bold text-foreground tracking-wide mt-4 mb-0.5">{viewingPlayer.name}</h2>
                  <span className={cn(
                    "text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-sm",
                    viewingPlayer.role === 'civilian' ? "text-blue-600 dark:text-blue-400 bg-blue-500/10" :
                      viewingPlayer.role === 'undercover' ? "text-red-500 bg-red-500/10" :
                        "text-zinc-500 bg-zinc-500/10"
                  )}>
                    {viewingPlayer.role === 'civilian' ? 'Dân thường' :
                      viewingPlayer.role === 'undercover' ? 'Undercover' : 'Mr. White'}
                  </span>
                </div>

                <div className="w-full text-center flex flex-col items-center mt-2">
                  {viewingPlayer.role === 'mr_white' ? (
                    <div className="w-full p-6 rounded-sm border border-dashed border-border bg-muted/10">
                      <p className="text-xs font-semibold uppercase mb-3 text-muted">Thân phận</p>
                      <p className="text-2xl font-serif font-black tracking-tight text-foreground uppercase">
                        Mr. White
                      </p>
                    </div>
                  ) : (
                    <div className="w-full p-6 rounded-sm border border-border bg-muted/5 shadow-sm">
                      <p className="text-xs font-semibold uppercase mb-3 text-muted">Từ khóa của bạn</p>
                      <p className="text-2xl font-serif font-black tracking-tight text-foreground uppercase">
                        {viewingPlayer.role === 'civilian' ? wordPair.word_civilian : wordPair.word_undercover}
                      </p>
                    </div>
                  )}

                  {viewingPlayer.special_role && (() => {
                    const specRole = SPECIAL_ROLES.find(r => r.id === viewingPlayer.special_role)
                    if (!specRole) return null
                    // For Falafel Vendor, show the resolved ability
                    const resolvedFalafelRole = viewingPlayer.state?.resolved_falafel_role
                    const resolvedSpecRole = resolvedFalafelRole ? SPECIAL_ROLES.find(r => r.id === resolvedFalafelRole) : null
                    const isDuelist = viewingPlayer.special_role === 'duelists'
                    return (
                      <>
                        <div className="mt-4 p-3 border border-border rounded-sm flex items-start gap-3 text-left bg-background w-full">
                          <div className={cn("w-8 h-8 rounded-sm shrink-0 flex items-center justify-center text-white text-sm font-bold shadow-sm", specRole.color)}>
                            {specRole.name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-foreground">{specRole.name}</p>
                            <p className="text-[10px] text-muted leading-tight mt-0.5">{specRole.description}</p>
                          </div>
                        </div>
                        {isDuelist && (
                          <div className="mt-2 p-3 border border-dashed border-amber-500/50 rounded-sm flex items-center gap-3 text-left bg-amber-500/5 w-full">
                            <span className="text-lg">⚔️</span>
                            <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                              Bạn đang trong cuộc đấu tay đôi bí mật! Nếu bị loại trước đối thủ, bạn mất 2 điểm.
                            </p>
                          </div>
                        )}
                        {resolvedSpecRole && (
                          <div className="mt-2 p-3 border border-dashed border-yellow-500/50 rounded-sm flex items-start gap-3 text-left bg-yellow-500/5 w-full">
                            <div className={cn("w-8 h-8 rounded-sm shrink-0 flex items-center justify-center text-white text-sm font-bold shadow-sm", resolvedSpecRole.color)}>
                              {resolvedSpecRole.name.charAt(0)}
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-yellow-600 dark:text-yellow-400">🎲 Khả năng nhận được: {resolvedSpecRole.name}</p>
                              <p className="text-[10px] text-muted leading-tight mt-0.5">{resolvedSpecRole.description}</p>
                            </div>
                          </div>
                        )}
                      </>
                    )
                  })()}
                </div>

                <div className="pt-2 w-full">
                  <Button onClick={handleCloseViewModal} variant="outline" className="w-full h-11 text-sm font-medium">
                    ĐÃ GHI NHỚ
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Amnesic Warning Modal */}
      <Dialog open={!!amnesicTargetPlayer} onOpenChange={(open) => !open && setAmnesicTargetPlayer(null)}>
        <DialogContent className="p-0 border-border rounded-sm max-w-[320px] overflow-hidden">
          <DialogHeader>
            <div className="px-6 pt-6 pb-4 border-b border-border bg-background w-full">
              <DialogTitle className="font-serif text-xl text-yellow-600">Cảnh Báo</DialogTitle>
            </div>
          </DialogHeader>
          <div className="p-6 space-y-6 bg-background">
            <p className="text-sm text-muted leading-relaxed">
              Bạn đang yêu cầu xem lại từ khóa. Hãy đảm bảo bạn chính là <strong>{amnesicTargetPlayer?.name}</strong> và không có ai đang nhìn lén màn hình của bạn!
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 h-10 w-full font-medium"
                onClick={() => setAmnesicTargetPlayer(null)}
              >
                Hủy
              </Button>
              <Button
                variant="primary"
                className="flex-1 h-10 w-full font-medium"
                onClick={() => {
                  setViewingPlayer(amnesicTargetPlayer)
                  setAmnesicTargetPlayer(null)
                  setIsAmnesicMode(false)
                }}
              >
                Xem Lại
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Refresh Confirmation Modal */}
      <Dialog open={showRefreshConfirm} onOpenChange={setShowRefreshConfirm}>
        <DialogContent className="p-0 border-border rounded-sm max-w-[320px] overflow-hidden">
          <DialogHeader>
            <div className="px-6 pt-6 pb-4 border-b border-border bg-background w-full">
              <DialogTitle className="font-serif text-xl">Đổi Bộ Từ Mới?</DialogTitle>
            </div>
          </DialogHeader>
          <div className="p-6 space-y-6 bg-background">
            <p className="text-sm text-muted leading-relaxed">
              Bạn có chắc chắn muốn bỏ qua ván này và làm mới lại với <strong>một bộ từ khóa khác</strong>? Mọi người sẽ cần bốc thẻ lại từ đầu.
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 h-10 w-full font-medium"
                onClick={() => setShowRefreshConfirm(false)}
              >
                Hủy
              </Button>
              <Button
                variant="primary"
                className="flex-1 h-10 w-full font-medium"
                onClick={handleRefreshGame}
                isDisabled={isRefreshing}
              >
                {isRefreshing ? 'Đang Đổi...' : 'Xác Nhận Đổi'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Leaderboard Modal */}
      <Dialog open={showLeaderboard} onOpenChange={setShowLeaderboard}>
        <DialogContent className="p-0 border-border rounded-sm max-w-[360px] overflow-hidden">
          <DialogHeader>
            <div className="px-6 pt-6 pb-4 border-b border-border bg-background w-full">
              <DialogTitle className="font-serif text-xl flex items-center gap-2">
                🏆 Bảng Xếp Hạng
              </DialogTitle>
              <DialogDescription className="text-xs text-muted mt-1">
                Điểm tích lũy qua các ván trong phòng
              </DialogDescription>
            </div>
          </DialogHeader>
          <div className="p-4 space-y-1 bg-background max-h-[400px] overflow-y-auto">
            {[...players].sort((a, b) => (b.points || 0) - (a.points || 0)).map((player, index) => {
              const rank = index + 1
              const medalEmoji = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null
              return (
                <div key={player.id} className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-sm transition-colors",
                  rank <= 3 ? "bg-muted/10 border border-border" : "hover:bg-muted/5"
                )}>
                  <div className="w-7 text-center shrink-0">
                    {medalEmoji ? (
                      <span className="text-base">{medalEmoji}</span>
                    ) : (
                      <span className="text-xs font-mono font-bold text-muted">{rank}</span>
                    )}
                  </div>
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-serif font-semibold shrink-0 border",
                    getPlayerColorClass(player.id)
                  )}>
                    {player.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="flex-1 text-sm font-medium text-foreground truncate">
                    {player.name}
                  </span>
                  <span className="text-sm font-bold font-mono text-foreground">
                    {player.points || 0}
                    <span className="text-[10px] text-muted font-normal ml-0.5">đ</span>
                  </span>
                </div>
              )
            })}
            {players.every(p => (p.points || 0) === 0) && (
              <p className="text-sm text-muted text-center py-6 italic">
                Chưa có ai ghi điểm. Hãy chơi xong ván đầu tiên!
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </main>
  )
}
