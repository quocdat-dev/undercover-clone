'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getGameStatistics } from '@/lib/game'
import type { GameStatistics } from '@/types/database'
import { Button } from '@/components/ui/button'

export default function StatisticsPage() {
  const params = useParams()
  const router = useRouter()
  const code = params.code as string
  const [stats, setStats] = useState<GameStatistics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadStats = async () => {
      const data = await getGameStatistics(code)
      setStats(data)
      setLoading(false)
    }

    loadStats()
  }, [code])

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}m ${secs}s`
  }

  const calculateWinRate = (wins: number, total: number) => {
    if (total === 0) return 0
    return Math.round((wins / total) * 100)
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <div className="text-center text-sm text-muted">
          <p>Đang tải thống kê...</p>
        </div>
      </main>
    )
  }

  if (!stats || stats.total_games === 0) {
    return (
      <main className="min-h-screen bg-background text-foreground flex flex-col items-center">
        <div className="w-full max-w-2xl px-4 py-12">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4 mb-8">
            <h1 className="text-2xl font-bold font-serif tracking-tight">Thống Kê Sinh Tồn</h1>
            <div className="text-sm font-mono text-muted border border-border px-3 py-1 rounded-sm bg-muted/5 self-start">
              PHÒNG: {code}
            </div>
          </div>

          <div className="border border-border rounded-sm p-12 text-center flex flex-col items-center justify-center space-y-6">
            <p className="text-muted text-sm font-serif italic">
              Chưa có dữ liệu thống kê.
            </p>
            <Button
              onClick={() => router.push(`/room/${code}`)}
              variant="outline"
            >
              Về Phòng Quản Lý
            </Button>
          </div>
        </div>
      </main>
    )
  }

  const totalWins = stats.civilian_wins + stats.undercover_wins + stats.mr_white_wins

  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col items-center p-4 md:p-8">
      <div className="w-full max-w-2xl space-y-12 pb-12 pt-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
          <h1 className="text-2xl font-bold font-serif tracking-tight">Thống Kê Sinh Tồn</h1>
          <div className="text-sm font-mono text-muted border border-border px-3 py-1 rounded-sm bg-muted/5 self-start">
            PHÒNG: {code}
          </div>
        </div>

        {/* Overall Stats */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted">Tổng Quan</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-background rounded-sm border border-border flex flex-col justify-between">
              <p className="text-[10px] font-bold text-muted uppercase tracking-widest mb-2">Số Ván</p>
              <p className="text-2xl font-serif font-medium text-foreground">
                {stats.total_games}
              </p>
            </div>
            <div className="p-4 bg-background rounded-sm border border-border flex flex-col justify-between">
              <p className="text-[10px] font-bold text-muted uppercase tracking-widest mb-2">Người Chơi</p>
              <p className="text-2xl font-serif font-medium text-foreground">
                {stats.total_players}
              </p>
            </div>
            <div className="p-4 bg-background rounded-sm border border-border flex flex-col justify-between">
              <p className="text-[10px] font-bold text-muted uppercase tracking-widest mb-2">Thời Gian TB</p>
              <p className="text-xl font-mono text-foreground mt-1">
                {formatDuration(stats.average_game_duration)}
              </p>
            </div>
            <div className="p-4 bg-background rounded-sm border border-border flex flex-col justify-between">
              <p className="text-[10px] font-bold text-muted uppercase tracking-widest mb-2">Lần Thắng</p>
              <p className="text-2xl font-serif font-medium text-foreground">
                {totalWins}
              </p>
            </div>
          </div>
        </div>

        {/* Win Statistics */}
        <div className="space-y-6">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted border-b border-border pb-2">Tỷ Lệ Chiến Thắng</h2>

          <div className="space-y-8">
            {/* Civilian Wins */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium text-sm">Dân thường</span>
                <div className="text-right">
                  <span className="font-semibold text-foreground mr-2">
                    {stats.civilian_wins}
                  </span>
                  <span className="text-muted text-xs font-mono">
                    {calculateWinRate(stats.civilian_wins, stats.total_games)}%
                  </span>
                </div>
              </div>
              <div className="w-full bg-muted/20 rounded-none h-2 border border-border overflow-hidden">
                <div
                  className="bg-foreground h-full transition-all duration-1000 ease-out"
                  style={{
                    width: `${calculateWinRate(stats.civilian_wins, stats.total_games)}%`,
                  }}
                ></div>
              </div>
            </div>

            {/* Undercover Wins */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium text-sm">Undercover</span>
                <div className="text-right">
                  <span className="font-semibold text-foreground mr-2">
                    {stats.undercover_wins}
                  </span>
                  <span className="text-muted text-xs font-mono">
                    {calculateWinRate(stats.undercover_wins, stats.total_games)}%
                  </span>
                </div>
              </div>
              <div className="w-full bg-muted/20 rounded-none h-2 border border-border overflow-hidden">
                <div
                  className="bg-foreground h-full transition-all duration-1000 ease-out"
                  style={{
                    width: `${calculateWinRate(stats.undercover_wins, stats.total_games)}%`,
                  }}
                ></div>
              </div>
            </div>

            {/* Mr. White Wins */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium text-sm">Mr. White</span>
                <div className="text-right">
                  <span className="font-semibold text-foreground mr-2">
                    {stats.mr_white_wins}
                  </span>
                  <span className="text-muted text-xs font-mono">
                    {calculateWinRate(stats.mr_white_wins, stats.total_games)}%
                  </span>
                </div>
              </div>
              <div className="w-full bg-muted/20 rounded-none h-2 border border-border overflow-hidden">
                <div
                  className="bg-foreground h-full transition-all duration-1000 ease-out"
                  style={{
                    width: `${calculateWinRate(stats.mr_white_wins, stats.total_games)}%`,
                  }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 pt-8 border-t border-border">
          <Button
            variant="primary"
            onClick={() => router.push(`/room/${code}`)}
            className="flex-1"
          >
            Về Phòng Quản Lý
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
