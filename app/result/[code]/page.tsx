'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { restartGame } from '@/lib/game'
import { calculateGamePoints, type PointBreakdown } from '@/lib/points'
import { SPECIAL_ROLES } from '@/lib/role-utils'
import type { Room, Player } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

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

export default function ResultPage() {
  const params = useParams()
  const router = useRouter()
  const code = params.code as string
  const [room, setRoom] = useState<Room | null>(null)
  const [loading, setLoading] = useState(true)
  const [isRestarting, setIsRestarting] = useState(false)

  useEffect(() => {
    const loadRoom = async () => {
      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .eq('code', code)
        .single()

      if (error || !data) {
        router.push('/')
        return
      }

      setRoom(data as Room)
      setLoading(false)
    }

    loadRoom()
  }, [code, router])

  const handleRestart = async () => {
    setIsRestarting(true)
    const result = await restartGame(code)
    if (result.success) {
      router.push(`/game/${code}`)
    } else {
      alert(result.error || 'Không thể khởi động lại game')
      setIsRestarting(false)
    }
  }

  const handleBackToRoom = () => {
    router.push(`/room/${code}`)
  }

  const players = useMemo(() => (room?.players || []) as Player[], [room?.players])
  const winners = useMemo(() => players.filter(p => p.is_alive), [players])
  const losers = useMemo(() => players.filter(p => !p.is_alive), [players])

  // Calculate point breakdowns for this game
  const pointBreakdowns = useMemo(() => {
    if (!room || players.length === 0) return []
    const gameState = {
      currentRound: room.current_round || 1,
      firstEliminationDone: room.first_elimination_done || false,
    }
    const winnerIds = winners.map(p => p.id)
    return calculateGamePoints(players, winnerIds, gameState)
  }, [room, players, winners])

  // Leaderboard: sorted by accumulated points (descending)
  const leaderboard = useMemo(() => {
    return [...players].sort((a, b) => (b.points || 0) - (a.points || 0))
  }, [players])

  // Active special roles this game
  const activeSpecialRoles = useMemo(() => {
    return players
      .filter(p => p.special_role)
      .map(p => ({
        player: p,
        role: SPECIAL_ROLES.find(r => r.id === p.special_role),
        resolvedRole: p.state?.resolved_falafel_role
          ? SPECIAL_ROLES.find(r => r.id === p.state?.resolved_falafel_role)
          : null,
      }))
      .filter(e => e.role)
  }, [players])

  const getPlayerColorClass = (id: string) => {
    const hash = id.split('').reduce((acc, char) => char.charCodeAt(0) + acc, 0)
    return AVATAR_COLORS[hash % AVATAR_COLORS.length]
  }

  const getRoleLabel = (role: string | null) => {
    switch (role) {
      case 'civilian': return 'Dân thường'
      case 'undercover': return 'Undercover'
      case 'mr_white': return 'Mr. White'
      default: return 'Chưa xác định'
    }
  }

  const getRoleEmoji = (role: string | null) => {
    switch (role) {
      case 'civilian': return '👤'
      case 'undercover': return '🕵️'
      case 'mr_white': return '👻'
      default: return '❓'
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <p className="text-sm text-muted animate-pulse">Đang tải kết quả...</p>
      </main>
    )
  }

  if (!room) return null

  return (
    <main className="min-h-screen bg-background text-foreground p-4 sm:p-8 flex flex-col items-center">
      <div className="w-full max-w-xl space-y-10 pb-28 pt-4 sm:pt-8">

        {/* Header */}
        <div className="text-center space-y-2 animate-fade-in">
          <h1 className="text-3xl sm:text-4xl font-bold font-serif tracking-tight text-foreground">Ván Đấu Kết Thúc</h1>
          <p className="text-muted font-mono text-xs uppercase tracking-widest mt-2 border border-border inline-block px-3 py-1 rounded-sm bg-muted/5">Phòng: {code}</p>
        </div>

        {/* Winners Section */}
        <div className="space-y-4 animate-fade-in" style={{ animationDelay: '100ms' }}>
          <h2 className="text-lg font-semibold font-serif border-b border-border pb-2 flex items-center justify-between">
            <span>Người Chiến Thắng</span>
            <span className="text-sm opacity-50">🏆</span>
          </h2>
          {winners.length === 0 ? (
            <p className="text-muted text-sm italic py-4">Không có người thắng cuộc</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {winners.map((player) => {
                const bd = pointBreakdowns.find(b => b.playerId === player.id)
                return (
                  <div key={player.id} className="flex flex-col items-center p-4 rounded-sm border border-border bg-background hover:bg-muted/10 transition-colors relative">
                    {/* Avatar */}
                    <div className={cn(
                      "w-14 h-14 rounded-full flex items-center justify-center text-2xl font-serif font-semibold shadow-sm border mb-2",
                      getPlayerColorClass(player.id)
                    )}>
                      {player.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-semibold text-foreground">{player.name}</span>
                    <span className="text-[10px] text-muted uppercase tracking-widest font-mono mt-0.5">{getRoleLabel(player.role)}</span>
                    {bd && bd.totalGamePoints > 0 && (
                      <Badge variant="secondary" className="mt-2 text-[10px] font-bold px-2 py-0.5 rounded-sm">
                        +{bd.totalGamePoints} đ
                      </Badge>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Losers Section */}
        {losers.length > 0 && (
          <div className="space-y-4 animate-fade-in" style={{ animationDelay: '200ms' }}>
            <h2 className="text-lg font-semibold font-serif border-b border-border pb-2 text-muted flex items-center justify-between">
              <span>Bị Loại</span>
              <span className="text-sm opacity-50">💀</span>
            </h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {losers.map((player) => {
                const bd = pointBreakdowns.find(b => b.playerId === player.id)
                return (
                  <div key={player.id} className="flex flex-col items-center p-3 rounded-sm border border-border opacity-60 hover:opacity-100 transition-opacity">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center text-lg font-serif font-semibold shadow-sm border mb-1.5 opacity-50",
                      getPlayerColorClass(player.id)
                    )}>
                      {player.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-xs font-medium text-foreground line-through decoration-muted truncate max-w-full">{player.name}</span>
                    <span className="text-[9px] text-muted uppercase tracking-widest font-mono mt-0.5">{getRoleLabel(player.role)}</span>
                    {bd && bd.totalGamePoints !== 0 && (
                      <Badge variant={bd.totalGamePoints > 0 ? "secondary" : "outline"} className="mt-1.5 text-[9px] font-bold px-1.5 py-0 rounded-sm">
                        {bd.totalGamePoints > 0 ? '+' : ''}{bd.totalGamePoints} đ
                      </Badge>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Points Breakdown */}
        {pointBreakdowns.some(bd => bd.bonusReasons.length > 0 || bd.basePoints > 0) && (
          <div className="space-y-4 animate-fade-in" style={{ animationDelay: '300ms' }}>
            <h2 className="text-lg font-semibold font-serif border-b border-border pb-2 flex items-center justify-between">
              <span>Chi Tiết Điểm</span>
              <span className="text-sm opacity-50">📊</span>
            </h2>
            <div className="space-y-2">
              {pointBreakdowns
                .filter(bd => bd.totalGamePoints !== 0 || bd.bonusReasons.length > 0)
                .sort((a, b) => b.totalGamePoints - a.totalGamePoints)
                .map((bd) => (
                  <div key={bd.playerId} className="flex items-start gap-3 p-3 border border-border rounded-sm bg-background hover:bg-muted/5 transition-colors">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-sm font-serif font-semibold shrink-0 border",
                      getPlayerColorClass(bd.playerId)
                    )}>
                      {bd.playerName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground truncate">{bd.playerName}</span>
                        <span className={cn(
                          "text-sm font-bold font-mono",
                          bd.totalGamePoints > 0 ? "text-green-600 dark:text-green-400" :
                            bd.totalGamePoints < 0 ? "text-red-500" : "text-muted"
                        )}>
                          {bd.totalGamePoints > 0 ? '+' : ''}{bd.totalGamePoints}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {bd.basePoints > 0 && (
                          <span className="text-[10px] text-muted bg-muted/10 px-1.5 py-0.5 rounded-sm">
                            Base: +{bd.basePoints}
                          </span>
                        )}
                        {bd.bonusReasons.map((reason, i) => (
                          <span key={i} className="text-[10px] text-muted bg-muted/10 px-1.5 py-0.5 rounded-sm">
                            {reason}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Special Roles Reveal */}
        {activeSpecialRoles.length > 0 && (
          <div className="space-y-4 animate-fade-in" style={{ animationDelay: '400ms' }}>
            <h2 className="text-lg font-semibold font-serif border-b border-border pb-2 flex items-center justify-between">
              <span>Vai Trò Ẩn</span>
              <span className="text-sm opacity-50">🎭</span>
            </h2>
            <div className="space-y-2">
              {activeSpecialRoles.map(({ player, role, resolvedRole }) => (
                <div key={player.id} className="flex items-center gap-3 p-3 border border-border rounded-sm bg-background">
                  <div className={cn("w-8 h-8 rounded-sm shrink-0 flex items-center justify-center text-white text-sm font-bold shadow-sm", role!.color)}>
                    {role!.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">{player.name}</span>
                      <span className="text-[10px] text-muted">—</span>
                      <span className="text-xs font-medium text-foreground">{role!.name}</span>
                    </div>
                    {resolvedRole && (
                      <p className="text-[10px] text-yellow-600 dark:text-yellow-400 mt-0.5">
                        🎲 Nhận được: {resolvedRole.name}
                      </p>
                    )}
                  </div>
                  <span className="text-lg shrink-0">{getRoleEmoji(player.role)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Leaderboard */}
        {players.some(p => (p.points || 0) > 0) && (
          <div className="space-y-4 animate-fade-in" style={{ animationDelay: '500ms' }}>
            <h2 className="text-lg font-semibold font-serif border-b border-border pb-2 flex items-center justify-between">
              <span>Bảng Xếp Hạng</span>
              <span className="text-sm opacity-50">🥇</span>
            </h2>
            <div className="space-y-1">
              {leaderboard.map((player, index) => {
                const rank = index + 1
                const medalEmoji = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null
                return (
                  <div key={player.id} className={cn(
                    "flex items-center gap-3 p-3 rounded-sm border transition-colors",
                    rank <= 3 ? "border-border bg-muted/5" : "border-transparent hover:bg-muted/5"
                  )}>
                    {/* Rank */}
                    <div className="w-8 text-center shrink-0">
                      {medalEmoji ? (
                        <span className="text-lg">{medalEmoji}</span>
                      ) : (
                        <span className="text-sm font-mono font-bold text-muted">{rank}</span>
                      )}
                    </div>
                    {/* Avatar */}
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-sm font-serif font-semibold shrink-0 border",
                      getPlayerColorClass(player.id)
                    )}>
                      {player.name.charAt(0).toUpperCase()}
                    </div>
                    {/* Name */}
                    <span className={cn(
                      "flex-1 text-sm font-medium truncate",
                      rank === 1 ? "text-foreground font-semibold" : "text-foreground"
                    )}>
                      {player.name}
                    </span>
                    {/* Points */}
                    <span className="text-sm font-bold font-mono text-foreground">
                      {player.points || 0}
                      <span className="text-[10px] text-muted font-normal ml-0.5">đ</span>
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Stats Summary */}
        <div className="space-y-4 animate-fade-in" style={{ animationDelay: '600ms' }}>
          <h2 className="text-lg font-semibold font-serif border-b border-border pb-2">Thống Kê</h2>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="border border-border p-3 rounded-sm">
              <div className="text-[10px] font-semibold uppercase tracking-widest mb-1.5 text-muted">Dân Thường</div>
              <div className="text-sm text-muted">
                <span className="font-semibold text-foreground">{winners.filter(p => p.role === 'civilian').length}</span> / {players.filter(p => p.role === 'civilian').length}
              </div>
            </div>
            <div className="border border-border p-3 rounded-sm bg-muted/5">
              <div className="text-[10px] font-semibold uppercase tracking-widest mb-1.5 text-muted">Undercover</div>
              <div className="text-sm text-muted">
                <span className="font-semibold text-foreground">{winners.filter(p => p.role === 'undercover').length}</span> / {players.filter(p => p.role === 'undercover').length}
              </div>
            </div>
            <div className="border border-border p-3 rounded-sm bg-muted/10">
              <div className="text-[10px] font-semibold uppercase tracking-widest mb-1.5 text-muted">Mr. White</div>
              <div className="text-sm text-muted">
                <span className="font-semibold text-foreground">{winners.filter(p => p.role === 'mr_white').length}</span> / {players.filter(p => p.role === 'mr_white').length}
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="fixed bottom-0 left-0 w-full p-4 border-t border-border bg-background flex gap-3 sm:relative sm:bg-transparent sm:border-none sm:p-0 z-20">
          <Button
            variant="primary"
            className="flex-1 h-12 text-sm font-medium tracking-wide"
            onClick={handleRestart}
            isDisabled={isRestarting}
          >
            {isRestarting ? 'Đang chuẩn bị...' : 'CHƠI LẠI VÁN MỚI'}
          </Button>
          <Button
            variant="outline"
            className="flex-1 h-12 text-sm font-medium tracking-wide"
            onClick={handleBackToRoom}
          >
            VỀ PHÒNG CHỜ
          </Button>
        </div>
      </div>
    </main>
  )
}
