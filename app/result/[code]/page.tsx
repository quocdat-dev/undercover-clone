'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { restartGame } from '@/lib/game'
import type { Room, Player } from '@/types/database'
import { Button } from '@/components/ui/button'

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

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <div className="text-center text-sm text-muted">
          <p>Đang tải kết quả...</p>
        </div>
      </main>
    )
  }

  if (!room) {
    return null
  }

  const players = (room.players || []) as Player[]
  const alivePlayers = players.filter((p) => p.is_alive)
  const deadPlayers = players.filter((p) => !p.is_alive)

  // Determine winners (alive players)
  const winners = alivePlayers
  const losers = deadPlayers

  // Group by role
  const winnersByRole = {
    civilian: winners.filter((p) => p.role === 'civilian'),
    undercover: winners.filter((p) => p.role === 'undercover'),
    mr_white: winners.filter((p) => p.role === 'mr_white'),
  }

  const losersByRole = {
    civilian: losers.filter((p) => p.role === 'civilian'),
    undercover: losers.filter((p) => p.role === 'undercover'),
    mr_white: losers.filter((p) => p.role === 'mr_white'),
  }

  const getRoleLabel = (role: string | null) => {
    switch (role) {
      case 'civilian':
        return 'Dân thường'
      case 'undercover':
        return 'Undercover'
      case 'mr_white':
        return 'Mr. White'
      default:
        return 'Chưa xác định'
    }
  }

  const getRoleStyle = (role: string | null) => {
    switch (role) {
      case 'civilian':
        return 'border-border bg-background text-foreground'
      case 'undercover':
        return 'border-border bg-muted/5 text-foreground'
      case 'mr_white':
        return 'border-border bg-muted/10 text-foreground'
      default:
        return 'border-border bg-background text-muted'
    }
  }

  return (
    <main className="min-h-screen bg-background text-foreground p-4 sm:p-8 flex flex-col items-center">
      <div className="w-full max-w-xl space-y-12 pb-24 pt-4 sm:pt-8 animate-fade-in">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl sm:text-4xl font-bold font-serif tracking-tight text-foreground">Ván Đấu Kết Thúc</h1>
          <p className="text-muted font-mono text-xs uppercase tracking-widest mt-2 border border-border inline-block px-3 py-1 rounded-sm bg-muted/5">Phòng: {code}</p>
        </div>

        {/* Winners Section */}
        <div className="space-y-6">
          <h2 className="text-lg font-semibold font-serif border-b border-border pb-2 flex items-center justify-between">
            <span>Người Chiến Thắng</span>
            <span className="text-sm opacity-50">🏆</span>
          </h2>
          {winners.length === 0 ? (
            <p className="text-muted text-sm italic py-4">Không có người thắng cuộc</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {winners.map((player) => (
                <div
                  key={player.id}
                  className={`flex flex-col p-4 rounded-sm border ${getRoleStyle(player.role)} relative group hover:bg-muted/10 transition-colors`}
                >
                  <div className="font-semibold flex items-center justify-between">
                    <span>{player.name}</span>
                  </div>
                  <div className="text-[10px] text-muted uppercase tracking-widest mt-1 font-mono">
                    {getRoleLabel(player.role)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Losers Section */}
        {losers.length > 0 && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold font-serif border-b border-border pb-2 text-muted flex items-center justify-between">
              <span>Bị Loại</span>
              <span className="text-sm opacity-50">💀</span>
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {losers.map((player) => (
                <div
                  key={player.id}
                  className={`flex flex-col p-3 rounded-sm border ${getRoleStyle(player.role)} opacity-60 hover:opacity-100 transition-opacity`}
                >
                  <div className="font-medium text-sm line-through decoration-muted">{player.name}</div>
                  <div className="text-[10px] text-muted uppercase tracking-widest mt-1 font-mono">
                    {getRoleLabel(player.role)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stats Summary */}
        <div className="space-y-6">
          <h2 className="text-lg font-semibold font-serif border-b border-border pb-2">Thống Kê Sinh Tồn</h2>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="border border-border p-3 sm:p-4 rounded-sm">
              <div className="text-[10px] sm:text-xs font-semibold uppercase tracking-widest mb-2 text-muted">Dân Thường</div>
              <div className="text-sm text-muted">
                Sống <span className="font-semibold text-foreground">{winnersByRole.civilian.length}</span> / Chết <span>{losersByRole.civilian.length}</span>
              </div>
            </div>
            <div className="border border-border p-3 sm:p-4 rounded-sm bg-muted/5">
              <div className="text-[10px] sm:text-xs font-semibold uppercase tracking-widest mb-2 text-muted">Undercover</div>
              <div className="text-sm text-muted">
                Sống <span className="font-semibold text-foreground">{winnersByRole.undercover.length}</span> / Chết <span>{losersByRole.undercover.length}</span>
              </div>
            </div>
            <div className="border border-border p-3 sm:p-4 rounded-sm bg-muted/10">
              <div className="text-[10px] sm:text-xs font-semibold uppercase tracking-widest mb-2 text-muted">Mr. White</div>
              <div className="text-sm text-muted">
                Sống <span className="font-semibold text-foreground">{winnersByRole.mr_white.length}</span> / Chết <span>{losersByRole.mr_white.length}</span>
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
