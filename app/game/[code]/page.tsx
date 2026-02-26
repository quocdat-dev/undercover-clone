'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { checkGameEnd, endGame } from '@/lib/game'
import type { Room, Player, WordPair } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/toast'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog'

export default function GamePage() {
  const params = useParams()
  const router = useRouter()
  const code = params.code as string
  const { addToast } = useToast()
  const [room, setRoom] = useState<Room | null>(null)
  const [wordPair, setWordPair] = useState<WordPair | null>(null)
  const [viewingPlayer, setViewingPlayer] = useState<Player | null>(null)
  const [showWord, setShowWord] = useState(false)
  const [loading, setLoading] = useState(true)
  const gameStartTimeRef = useRef<Date | null>(null)
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0)
  const [showHelp, setShowHelp] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  // Timer state
  const [timer, setTimer] = useState<number>(0)
  const [showTimerSettings, setShowTimerSettings] = useState(false)
  const [timerDuration, setTimerDuration] = useState(60)
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const loadGame = async () => {
      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .eq('code', code)
        .single()

      if (error || !data) {
        addToast({
          title: 'Lỗi',
          description: 'Không tìm thấy game',
          variant: 'error',
        })
        router.push('/')
        return
      }

      const roomData = data as Room
      setRoom(roomData)

      // Load word pair if game is playing
      if (roomData.status === 'playing' && roomData.current_word_pair_id) {
        const { data: wpData } = await supabase
          .from('word_pairs')
          .select('*')
          .eq('id', roomData.current_word_pair_id)
          .single()

        if (wpData) {
          setWordPair(wpData as WordPair)
        }

        if (roomData.status === 'playing' && !gameStartTimeRef.current) {
          gameStartTimeRef.current = new Date()
        }
      }
      setLoading(false)
    }

    loadGame()

    // Subscribe to room changes
    const channel = supabase
      .channel(`game:${code}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rooms',
          filter: `code=eq.${code}`,
        },
        async (payload) => {
          const updatedRoom = payload.new as Room
          setRoom(updatedRoom)

          if (updatedRoom.current_word_pair_id && updatedRoom.current_word_pair_id !== room?.current_word_pair_id) {
            const { data: wpData } = await supabase
              .from('word_pairs')
              .select('*')
              .eq('id', updatedRoom.current_word_pair_id)
              .single()

            if (wpData) {
              setWordPair(wpData as WordPair)
            }
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [code, router, room?.current_word_pair_id, addToast])

  // Timer Sync Logic
  useEffect(() => {
    if (room?.timer_end_at) {
      const endTime = new Date(room.timer_end_at).getTime()

      const updateTimer = () => {
        const now = new Date().getTime()
        const remaining = Math.max(0, Math.ceil((endTime - now) / 1000))
        setTimer(remaining)

        if (remaining <= 0 && timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current)
          timerIntervalRef.current = null
        }
      }

      updateTimer()
      timerIntervalRef.current = setInterval(updateTimer, 1000)
    } else {
      setTimer(0)
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current)
        timerIntervalRef.current = null
      }
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current)
      }
    }
  }, [room?.timer_end_at])

  const startTimer = async () => {
    const endTime = new Date(Date.now() + timerDuration * 1000).toISOString()
    await supabase
      .from('rooms')
      .update({ timer_end_at: endTime })
      .eq('code', code)
    setShowTimerSettings(false)
    addToast({
      title: 'Thành công',
      description: 'Timer đã bắt đầu',
      variant: 'success',
    })
  }

  const stopTimer = async () => {
    await supabase
      .from('rooms')
      .update({ timer_end_at: null })
      .eq('code', code)
  }

  const resetTimer = async () => {
    const endTime = new Date(Date.now() + timerDuration * 1000).toISOString()
    await supabase
      .from('rooms')
      .update({ timer_end_at: endTime })
      .eq('code', code)
  }

  const handlePlayerClick = (player: Player) => {
    setViewingPlayer(player)
    setShowWord(false)
  }

  const handleRevealWord = () => {
    setShowWord(true)
  }

  const handleCloseModal = () => {
    setShowWord(false)
    setViewingPlayer(null)
  }

  const handleEliminatePlayer = async (playerId: string) => {
    if (!room) return

    const players = (room.players || []) as Player[]
    const updatedPlayers = players.map((p) =>
      p.id === playerId ? { ...p, is_alive: false } : p
    )

    const { error } = await supabase
      .from('rooms')
      .update({ players: updatedPlayers })
      .eq('code', code)

    if (error) {
      addToast({
        title: 'Lỗi',
        description: 'Không thể loại người chơi',
        variant: 'error',
      })
      return
    }

    addToast({
      title: 'Thành công',
      description: 'Người chơi đã bị loại',
      variant: 'success',
    })

    // Check if game ended after elimination
    const gameResult = checkGameEnd(updatedPlayers)
    if (gameResult.ended) {
      await endGame(code, gameResult.winners, gameResult.reason, gameStartTimeRef.current || undefined)
      router.push(`/result/${code}`)
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <div className="text-center text-sm text-muted">
          <p>Đang tải game...</p>
        </div>
      </main>
    )
  }

  if (!room || !wordPair) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <div className="text-center">
          <p className="text-muted mb-4 font-serif text-lg">Game chưa bắt đầu hoặc đã kết thúc</p>
          <Button
            onClick={() => router.push(`/room/${code}`)}
            variant="outline"
          >
            Quay lại phòng
          </Button>
        </div>
      </main>
    )
  }

  if (room.status === 'finished') {
    router.push(`/result/${code}`)
    return null
  }

  const players = (room.players || []) as Player[]
  const alivePlayers = players.filter((p) => p.is_alive)
  const currentPlayer = alivePlayers[currentPlayerIndex] || alivePlayers[0]

  // Calculate remaining infiltrators
  const undercoverCount = players.filter(p => p.role === 'undercover' && p.is_alive).length
  const mrWhiteCount = players.filter(p => p.role === 'mr_white' && p.is_alive).length

  return (
    <main className="min-h-screen flex flex-col bg-background text-foreground relative">
      {/* Header */}
      <div className="flex items-center justify-between p-4 px-6 border-b border-border sticky top-0 bg-background z-10">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push(`/room/${code}`)}
          className="text-muted"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
          </svg>
        </Button>

        <span className="font-serif font-semibold text-lg">Phòng: {code}</span>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowHelp(true)}
          className="text-muted"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </Button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center py-8 px-4 pb-24">
        {/* Player Header */}
        <div className="text-center mb-10 w-full max-w-sm">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted mb-2">Lượt Chọn Của</p>
          <h1 className="text-3xl font-bold font-serif text-foreground truncate px-2">
            {currentPlayer?.name || 'Người Chơi'}
          </h1>
        </div>

        {/* Info Boxes */}
        <div className="flex gap-3 mb-8 w-full max-w-sm">
          {/* Remaining Infiltrators */}
          <Card className="flex-1 rounded-sm shadow-none">
            <CardContent className="p-3">
              <div className="text-[10px] font-semibold uppercase tracking-widest text-muted mb-2.5">Phe Biến Chất</div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <Badge variant="secondary" className="w-6 h-6 p-0 flex items-center justify-center rounded-sm">
                    U
                  </Badge>
                  <span className="text-foreground font-semibold text-sm">{undercoverCount}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Badge variant="outline" className="w-6 h-6 p-0 flex items-center justify-center rounded-sm">
                    W
                  </Badge>
                  <span className="text-foreground font-semibold text-sm">{mrWhiteCount}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Cards Grid - 2x3 */}
        <div className="grid grid-cols-3 gap-3 w-full max-w-sm mb-6">
          {alivePlayers.slice(currentPlayerIndex, currentPlayerIndex + 6).map((player) => (
            <button
              key={player.id}
              onClick={() => handlePlayerClick(player)}
              className="aspect-[3/4] bg-background rounded-sm border border-border hover:bg-muted/5 transition-colors flex flex-col items-center justify-center p-2 relative group focus:outline-none focus:ring-1 focus:ring-foreground"
            >
              <div className="w-10 h-10 bg-muted/10 rounded-full flex items-center justify-center mb-2 group-hover:bg-foreground group-hover:text-background transition-colors">
                <span className="text-xl font-serif text-muted group-hover:text-background transition-colors font-medium">?</span>
              </div>
              <span className="text-[10px] font-semibold text-foreground tracking-wide truncate w-full text-center px-1">
                {player.name}
              </span>
            </button>
          ))}
        </div>

        {/* Pagination Dots */}
        {alivePlayers.length > 6 && (
          <div className="flex gap-2 mb-6">
            {Array.from({ length: Math.ceil(alivePlayers.length / 6) }).map((_, pageIndex) => (
              <button
                key={pageIndex}
                onClick={() => setCurrentPlayerIndex(pageIndex * 6)}
                className={`w-2 h-2 rounded-full transition-colors ${Math.floor(currentPlayerIndex / 6) === pageIndex
                    ? 'bg-foreground'
                    : 'bg-border hover:bg-muted'
                  }`}
              />
            ))}
          </div>
        )}

        {/* Timer Display (if running) */}
        {timer > 0 && (
          <div className="mb-4 bg-background border border-border px-6 py-2 rounded-sm select-none">
            <div className={`text-lg font-mono font-medium tracking-widest ${timer <= 10 ? 'text-red-500 animate-pulse' : 'text-foreground'
              }`}>
              {Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, '0')}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Action Buttons */}
      <div className="fixed bottom-6 left-6 right-6 flex justify-between items-end z-20 pointer-events-none">
        <Button
          variant="outline"
          size="icon"
          onClick={() => {
            setCurrentPlayerIndex((prev) => (prev + 6) % (Math.ceil(alivePlayers.length / 6) * 6))
          }}
          className="rounded-full shadow-sm bg-background pointer-events-auto w-10 h-10"
        >
          <svg className="w-4 h-4 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </Button>

        <Button
          variant="outline"
          size="icon"
          onClick={() => setShowSettings(true)}
          className="rounded-full shadow-sm bg-background pointer-events-auto w-10 h-10"
        >
          <svg className="w-4 h-4 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </Button>
      </div>

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-serif">Công Cụ Điều Phối</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Timer Settings */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-widest text-muted mb-3">Đếm Ngược</h3>
              <div className="grid grid-cols-5 gap-2 mb-4">
                {[30, 60, 90, 120, 180].map((t) => (
                  <Button
                    key={t}
                    variant={timerDuration === t ? 'default' : 'outline'}
                    size="sm"
                    className="h-8 text-[11px] font-mono"
                    onClick={() => setTimerDuration(t)}
                  >
                    {t}s
                  </Button>
                ))}
              </div>
              <div className="flex gap-2">
                <Button variant="primary" onClick={startTimer} className="flex-1 h-9 text-xs">
                  Bắt Đầu
                </Button>
                <Button variant="outline" onClick={stopTimer} className="flex-1 h-9 text-xs">
                  Dừng Lại
                </Button>
                <Button variant="outline" onClick={resetTimer} className="flex-1 h-9 text-xs">
                  Nhập Lại
                </Button>
              </div>
            </div>

            {/* Elimination Section */}
            <div className="pt-6 border-t border-border">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-destructive mb-3">Hệ Thống Phán Xét</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                {alivePlayers.map((player) => (
                  <Button
                    key={player.id}
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      if (confirm(`CẢNH BÁO: Phán quyết loại ${player.name} không thể hoàn tác.`)) {
                        handleEliminatePlayer(player.id)
                      }
                    }}
                    className="w-full justify-start h-9 text-sm"
                  >
                    Loại bỏ {player.name}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Help Dialog */}
      <Dialog open={showHelp} onOpenChange={setShowHelp}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-serif">Lưu Trình Ván Đấu</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4 text-sm text-foreground">
            <p>1. <span className="font-medium text-muted">Nhận diện:</span> Mỗi thẻ đại diện cho một người chơi. Chọn thẻ để xem danh tính.</p>
            <p>2. <span className="font-medium text-muted">Bảo mật:</span> Hãy tự xem từ khóa của mình, không tiết lộ cho người khác.</p>
            <p>3. <span className="font-medium text-muted">Thảo luận:</span> Sau khi tất cả nhận từ, hãy dùng những câu nói ám chỉ để tìm đồng minh và loại trừ kẻ thù.</p>
            <p>4. <span className="font-medium text-muted">Phán quyết:</span> Sử dụng trình đơn quản lý để loại bỏ những người bị tình nghi nhiều nhất.</p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reveal Modal */}
      {viewingPlayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/90 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-background border border-border shadow-md overflow-hidden relative">
            <div className="bg-muted/5 p-4 border-b border-border flex justify-between items-center">
              <h3 className="text-sm font-semibold font-serif">
                {showWord ? 'Bí Mật Của Bạn' : 'Xác Nhận Danh Tính'}
              </h3>
              <button
                onClick={handleCloseModal}
                className="text-muted hover:text-foreground transition-colors p-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-8 text-center bg-background min-h-[300px] flex flex-col justify-center">
              {!showWord ? (
                <div className="space-y-8 animate-fade-in">
                  <div>
                    <h2 className="text-3xl font-bold font-serif text-foreground">{viewingPlayer.name}</h2>
                    <p className="text-xs uppercase tracking-widest text-muted mt-2">Vui lòng nhận thiết bị</p>
                  </div>
                  <Button
                    onClick={handleRevealWord}
                    variant="primary"
                    className="w-full py-6 text-sm tracking-wide font-semibold"
                  >
                    XEM BÍ MẬT
                  </Button>
                  <p className="text-xs text-muted">Tuyệt đối không để người khác nhìn thấy</p>
                </div>
              ) : (
                <div className="space-y-8 animate-fade-in">
                  <div>
                    <h2 className="text-lg font-medium font-serif text-foreground mb-6">{viewingPlayer.name}</h2>

                    {viewingPlayer.role === 'mr_white' ? (
                      <div className="bg-muted/5 border border-border p-6 rounded-sm">
                        <p className="text-[10px] font-semibold uppercase tracking-widest mb-3 text-muted">Danh Tính</p>
                        <p className="text-2xl font-serif font-black tracking-tight">MR. WHITE</p>
                        <p className="text-xs text-muted mt-4">Bạn đang che giấu. Hãy lắng nghe và dự đoán từ khóa chung.</p>
                      </div>
                    ) : (
                      <div className="bg-muted/5 border border-border p-6 rounded-sm">
                        <p className="text-[10px] font-semibold uppercase tracking-widest mb-3 text-muted">Từ Khóa</p>
                        <p className="text-3xl font-serif font-bold tracking-tight">
                          {viewingPlayer.role === 'civilian' ? wordPair.word_civilian : wordPair.word_undercover}
                        </p>
                        <p className="text-xs text-muted mt-4">Hãy ghi nhớ thông tin này.</p>
                      </div>
                    )}
                  </div>

                  <Button
                    onClick={handleCloseModal}
                    variant="outline"
                    className="w-full text-sm font-medium"
                  >
                    ĐÃ TIẾP NHẬN
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
