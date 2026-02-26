'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getGameHistory } from '@/lib/game'
import type { GameHistory } from '@/types/database'
import { Button } from '@/components/ui/button'

export default function HistoryPage() {
  const params = useParams()
  const router = useRouter()
  const code = params.code as string
  const [history, setHistory] = useState<GameHistory[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadHistory = async () => {
      const data = await getGameHistory(code)
      setHistory(data)
      setLoading(false)
    }

    loadHistory()
  }, [code])

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return 'N/A'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}m ${secs}s`
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('vi-VN')
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <div className="text-center text-sm text-muted">
          <p>Đang tải lịch sử...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background text-foreground p-4 md:p-8 flex flex-col items-center">
      <div className="w-full max-w-2xl space-y-8 pb-12 pt-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
          <div>
            <h1 className="text-2xl font-bold font-serif tracking-tight">Lịch Sử Ván Đấu</h1>
          </div>
          <div className="text-sm font-mono text-muted border border-border px-3 py-1 rounded-sm bg-muted/5 self-start">
            PHÒNG: {code}
          </div>
        </div>

        {/* History List */}
        {history.length === 0 ? (
          <div className="border border-border rounded-sm p-8 sm:p-12 text-center flex flex-col items-center justify-center space-y-6">
            <p className="text-muted text-sm font-serif italic">
              Chưa có lịch sử game nào.
            </p>
            <Button
              onClick={() => router.push(`/room/${code}`)}
              variant="outline"
            >
              Về Phòng Quản Lý
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {history.map((game, index) => (
              <div
                key={game.id}
                className="bg-background rounded-sm border border-border p-5 hover:bg-muted/5 transition-colors group flex flex-col"
              >
                <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                  <h3 className="text-base font-semibold font-serif flex items-center gap-2">
                    <span>Ván #{history.length - index}</span>
                  </h3>
                  <div className="flex items-center gap-3 text-xs text-muted font-mono">
                    <span>{formatDate(game.started_at)}</span>
                    <span className="hidden sm:inline">•</span>
                    <span>{formatDuration(game.duration_seconds)}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-6 text-sm mb-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-muted mb-1 font-semibold">Kết Quả</p>
                    <p className="font-medium text-foreground">
                      {game.game_result === 'civilian_win' ? 'Dân thường thắng' :
                        game.game_result === 'undercover_win' ? 'Undercover thắng' :
                          'Không rõ'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-muted mb-1 font-semibold">Số Người Chơi</p>
                    <p className="font-medium text-foreground">{game.players.length}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-muted mb-1 font-semibold">Người Sống Sót</p>
                    <p className="font-medium text-foreground">{game.winners.length}</p>
                  </div>
                </div>

                {game.winners.length > 0 && (
                  <div className="mt-2 pt-4 border-t border-border">
                    <p className="text-[10px] font-bold text-muted uppercase tracking-widest mb-3">Danh Sách Sống Sót</p>
                    <div className="flex flex-wrap gap-2">
                      {game.winners.map((winner: any) => (
                        <span
                          key={winner.id}
                          className="px-2.5 py-1 bg-muted/5 border border-border rounded-sm text-xs font-medium text-foreground"
                        >
                          {winner.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4 pt-8 border-t border-border">
          <Button
            variant="primary"
            onClick={() => router.push(`/room/${code}`)}
            className="flex-1"
          >
            Quay Về Phòng
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push('/')}
            className="flex-1"
          >
            Trang Chủ
          </Button>
        </div>
      </div>
    </main>
  )
}
