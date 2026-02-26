'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { startGame } from '@/lib/game'
import { getDefaultRoleSettings, getRoleLimits } from '@/lib/role-utils'
import type { Room, Player } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/toast'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Slider } from '@/components/ui/slider'

type GameMode = 'random' | 'pack'

export default function RoomPage() {
  const params = useParams()
  const router = useRouter()
  const code = params.code as string
  const { addToast } = useToast()
  const [room, setRoom] = useState<Room | null>(null)
  const [loading, setLoading] = useState(true)
  const [gameMode, setGameMode] = useState<GameMode>('random')
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [availableCategories, setAvailableCategories] = useState<string[]>([])
  const [playerCount, setPlayerCount] = useState(6)
  const [undercoverCount, setUndercoverCount] = useState(1)
  const [mrWhiteCount, setMrWhiteCount] = useState(1)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isStarting, setIsStarting] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showHelp, setShowHelp] = useState(false)

  // Auto-adjust roles when player count changes
  useEffect(() => {
    const defaults = getDefaultRoleSettings(playerCount)
    setUndercoverCount(defaults.undercoverCount)
    setMrWhiteCount(defaults.mrWhiteCount)
  }, [playerCount])

  useEffect(() => {
    // Load room data
    const loadRoom = async () => {
      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .eq('code', code)
        .single()

      if (error || !data) {
        addToast({
          title: 'Lỗi',
          description: 'Không tìm thấy phòng',
          variant: 'error',
        })
        router.push('/')
        return
      }

      setRoom(data as Room)
      setLoading(false)
    }

    loadRoom()

    // Load available categories
    const loadCategories = async () => {
      const { data } = await supabase
        .from('word_pairs')
        .select('category')
        .order('category')

      if (data) {
        const uniqueCategories = Array.from(new Set(data.map((d) => d.category)))
        setAvailableCategories(uniqueCategories)
      }
    }

    loadCategories()

    // Subscribe to room changes
    const channel = supabase
      .channel(`room:${code}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rooms',
          filter: `code=eq.${code}`,
        },
        (payload) => {
          setRoom(payload.new as Room)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [code, router, addToast])

  const handleDeleteRoom = async () => {
    setIsDeleting(true)
    try {
      const { error } = await supabase
        .from('rooms')
        .delete()
        .eq('code', code)

      if (error) throw error

      addToast({
        title: 'Thành công',
        description: 'Phòng đã được xóa',
        variant: 'success',
      })
      router.push('/')
    } catch (error) {
      console.error('Error deleting room:', error)
      addToast({
        title: 'Lỗi',
        description: 'Không thể xóa phòng',
        variant: 'error',
      })
      setIsDeleting(false)
    }
  }

  const handleStartGame = async () => {
    if (!room) return

    if (playerCount < 3) {
      addToast({
        title: 'Lỗi',
        description: 'Cần ít nhất 3 người chơi',
        variant: 'error',
      })
      return
    }

    // Validate roles
    const totalEnemies = undercoverCount + mrWhiteCount
    if (totalEnemies === 0) {
      addToast({
        title: 'Lỗi',
        description: 'Cần ít nhất 1 vai phản diện',
        variant: 'error',
      })
      return
    }
    const civilianCount = playerCount - undercoverCount - mrWhiteCount
    if (civilianCount <= 0) {
      addToast({
        title: 'Lỗi',
        description: 'Phải có ít nhất 1 Dân thường!',
        variant: 'error',
      })
      return
    }
    if (civilianCount <= undercoverCount + mrWhiteCount) {
      addToast({
        title: 'Cảnh báo',
        description: 'Phe Dân thường đang thiểu số. Game có thể kết thúc rất nhanh.',
        variant: 'warning',
      })
    }

    setIsStarting(true)

    // Create player list automatically
    const players: Player[] = []
    for (let i = 1; i <= playerCount; i++) {
      players.push({
        id: crypto.randomUUID(),
        name: `Người chơi ${i}`,
        role: null,
        is_alive: true,
        order: i,
      })
    }

    // Update room with players AND settings
    const { error: updateError } = await supabase
      .from('rooms')
      .update({
        players,
        settings: {
          undercoverCount,
          mrWhiteCount
        }
      })
      .eq('code', code)

    if (updateError) {
      addToast({
        title: 'Lỗi',
        description: 'Không thể tạo danh sách người chơi',
        variant: 'error',
      })
      setIsStarting(false)
      return
    }

    // Start game
    const result = await startGame(code, gameMode === 'pack' ? selectedCategory : undefined)
    if (!result.success) {
      addToast({
        title: 'Lỗi',
        description: result.error || 'Không thể bắt đầu game',
        variant: 'error',
      })
      setIsStarting(false)
    } else {
      addToast({
        title: 'Thành công',
        description: 'Game đã bắt đầu!',
        variant: 'success',
      })
      router.push(`/game/${code}`)
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <div className="text-center text-sm text-muted">
          <p>Đang tải phòng...</p>
        </div>
      </main>
    )
  }

  if (!room) {
    return null
  }

  const totalEnemies = undercoverCount + mrWhiteCount
  const canStart = playerCount >= 3 && room.status === 'waiting' && totalEnemies > 0
  const civilianCount = playerCount - undercoverCount - mrWhiteCount

  // Calculate dynamic limits
  const { maxUndercover, maxMrWhite } = getRoleLimits(playerCount, undercoverCount, mrWhiteCount)

  return (
    <main className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border bg-background px-4 py-3 sm:px-6 sticky top-0 z-10">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push('/')}
          className="text-muted"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
          </svg>
        </Button>

        <div className="text-center">
          <h1 className="text-lg font-serif font-semibold tracking-tight">Phòng: {code}</h1>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="text-muted"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </Button>
      </div>

      {/* Main Content */}
      {room.status === 'waiting' && (
        <div className="flex-1 flex flex-col items-center py-8 px-4 pb-20">

          <div className="w-full max-w-sm mb-6 flex justify-between items-center px-1">
            <h2 className="font-serif font-semibold text-lg">Cấu hình ván chơi</h2>
            <Badge variant="outline" className="font-mono">{playerCount} Người</Badge>
          </div>

          {/* Player Count Slider */}
          <div className="w-full max-w-sm mb-6 border border-border bg-background p-5 rounded-sm">
            <label className="text-xs font-semibold text-muted uppercase tracking-widest mb-4 block">Tổng Số Người Chơi</label>
            <Slider
              value={playerCount}
              onValueChange={setPlayerCount}
              min={3}
              max={20}
              step={1}
              className="w-full"
            />
          </div>

          {/* Role Distribution Card */}
          <Card className="w-full max-w-sm mb-6">
            <CardHeader className="pb-2 border-b border-border">
              <CardTitle className="text-xs font-semibold text-muted uppercase tracking-widest">Phân Bổ Vai Trò</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="flex flex-col divide-y divide-border">
                {/* Civilians */}
                <div className="flex items-center justify-between p-4">
                  <span className="text-sm font-medium">Dân thường</span>
                  <Badge variant="default" className="w-8 justify-center rounded-sm">
                    {civilianCount}
                  </Badge>
                </div>

                {/* Undercover */}
                <div className="flex items-center justify-between p-4 bg-muted/5">
                  <span className="text-sm font-medium">Kẻ nằm vùng</span>
                  <div className="flex items-center gap-3">
                    <button
                      className="w-6 h-6 flex items-center justify-center border border-border rounded-sm hover:bg-notion-hover text-muted disabled:opacity-50"
                      onClick={() => setUndercoverCount(Math.max(0, undercoverCount - 1))}
                      disabled={undercoverCount <= 0}
                    >
                      −
                    </button>
                    <Badge variant="secondary" className="w-8 justify-center rounded-sm shadow-none">
                      {undercoverCount}
                    </Badge>
                    <button
                      className="w-6 h-6 flex items-center justify-center border border-border rounded-sm hover:bg-notion-hover text-muted disabled:opacity-50"
                      onClick={() => setUndercoverCount(Math.min(maxUndercover, undercoverCount + 1))}
                      disabled={undercoverCount >= maxUndercover}
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Mr. White */}
                <div className="flex items-center justify-between p-4 bg-muted/5">
                  <span className="text-sm font-medium">Mr. White</span>
                  <div className="flex items-center gap-3">
                    <button
                      className="w-6 h-6 flex items-center justify-center border border-border rounded-sm hover:bg-notion-hover text-muted disabled:opacity-50"
                      onClick={() => setMrWhiteCount(Math.max(0, mrWhiteCount - 1))}
                      disabled={mrWhiteCount <= 0}
                    >
                      −
                    </button>
                    <Badge variant="outline" className="w-8 justify-center rounded-sm">
                      {mrWhiteCount}
                    </Badge>
                    <button
                      className="w-6 h-6 flex items-center justify-center border border-border rounded-sm hover:bg-notion-hover text-muted disabled:opacity-50"
                      onClick={() => setMrWhiteCount(Math.min(maxMrWhite, mrWhiteCount + 1))}
                      disabled={mrWhiteCount >= maxMrWhite}
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Words Setting */}
          <Card className="w-full max-w-sm mb-8">
            <CardContent className="p-4 flex items-center justify-between">
              <span className="text-sm font-medium">Bộ Từ Khóa</span>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 text-xs font-mono">
                    {gameMode === 'random' ? 'Mặc định' : selectedCategory || 'Chọn...'}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="font-serif">Chọn Bộ Từ</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3 py-4">
                    <Button
                      variant={gameMode === 'random' ? 'primary' : 'outline'}
                      className="w-full justify-start"
                      onClick={() => {
                        setGameMode('random')
                        setSelectedCategory('')
                      }}
                    >
                      Ngẫu Nhiên (Toàn bộ)
                    </Button>
                    <Button
                      variant={gameMode === 'pack' ? 'primary' : 'outline'}
                      className="w-full justify-start"
                      onClick={() => setGameMode('pack')}
                    >
                      Theo Chủ Đề
                    </Button>

                    {gameMode === 'pack' && (
                      <div className="pt-2 animate-fade-in space-y-2">
                        <label className="text-xs text-muted uppercase tracking-wider">Danh sách chủ đề</label>
                        <select
                          value={selectedCategory}
                          onChange={(e) => setSelectedCategory(e.target.value)}
                          className="w-full rounded-sm border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground"
                        >
                          <option value="">-- Chọn 1 chủ đề --</option>
                          {availableCategories.map((cat) => (
                            <option key={cat} value={cat}>
                              {cat.charAt(0).toUpperCase() + cat.slice(1)}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>

          {/* Start Button */}
          <Button
            onClick={handleStartGame}
            isDisabled={!canStart || (gameMode === 'pack' && !selectedCategory) || isStarting || civilianCount <= 0}
            className="w-full max-w-sm h-12 text-sm font-semibold tracking-wide"
            variant="primary"
          >
            {isStarting ? 'Đang tải...' : 'BẮT ĐẦU VÁN'}
          </Button>
        </div>
      )}

      {/* Playing State */}
      {room.status === 'playing' && (
        <div className="flex-1 flex flex-col items-center justify-center px-4">
          <Card className="w-full max-w-sm">
            <CardContent className="p-8 text-center space-y-6">
              <div className="space-y-2">
                <h3 className="font-serif text-xl font-semibold">Ván đang diễn ra</h3>
                <p className="text-sm text-muted">Vui lòng tham gia để tiếp tục.</p>
              </div>
              <Button
                onClick={() => router.push(`/game/${code}`)}
                className="w-full font-medium"
              >
                Vào Game Nào
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Bottom Action Buttons */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-20">
        <Button
          variant="outline"
          size="icon"
          className="rounded-full shadow-sm bg-background"
          onClick={() => setShowSettings(true)}
        >
          <svg className="w-4 h-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="rounded-full shadow-sm bg-background"
          onClick={() => setShowHelp(true)}
        >
          <svg className="w-4 h-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </Button>
      </div>

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-serif">Cài Đặt Phòng</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Button
              variant="outline"
              onClick={() => router.push(`/history/${code}`)}
              className="w-full justify-start font-medium"
            >
              Lịch Sử Ván Chơi Của Phòng
            </Button>
            {room.status === 'waiting' && (
              <Button
                variant="destructive"
                onClick={handleDeleteRoom}
                isDisabled={isDeleting}
                className="w-full justify-start font-medium border border-transparent"
              >
                {isDeleting ? 'Đang hủy...' : 'Giải Tán Phòng'}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Help Dialog */}
      <Dialog open={showHelp} onOpenChange={setShowHelp}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-serif">Luật Chơi Nhanh</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4 text-sm text-foreground">
            <p><strong>1. Vai trò:</strong> Dân thường có chung từ, Undercover có từ khác nhưng gần nghĩa. Mr. White không nhận được từ.</p>
            <p><strong>2. Mô tả:</strong> Lần lượt mô tả từ vừa nhận. Mr. White cố gắng lắng nghe để đoán từ của dân thường.</p>
            <p><strong>3. Vạch mặt:</strong> Cuối vòng tìm ra người thiểu số.</p>
            <p><strong>4. Lưu ý:</strong> Mr. White thắng nếu đoán trúng từ của Dân thường.</p>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  )
}
