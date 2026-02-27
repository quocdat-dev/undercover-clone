'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { startGame, restartGame } from '@/lib/game'
import { SPECIAL_ROLES } from '@/lib/role-utils'
import type { Room, Player } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/toast'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Slider } from '@/components/ui/slider'
import { Select, ListBox, ListBoxItem } from '@heroui/react'
import { removeRecentRoom } from '@/lib/storage'

type GameMode = 'random' | 'pack'

const DEFAULT_GAME_SETUP: Record<number, { u: number; w: number }> = {
  3: { u: 1, w: 0 },
  4: { u: 1, w: 0 },
  5: { u: 1, w: 1 },
  6: { u: 1, w: 1 },
  7: { u: 2, w: 1 },
  8: { u: 2, w: 1 },
  9: { u: 3, w: 1 },
  10: { u: 3, w: 1 },
  11: { u: 3, w: 2 },
  12: { u: 3, w: 2 },
  13: { u: 4, w: 2 },
  14: { u: 4, w: 2 },
  15: { u: 5, w: 2 },
  16: { u: 5, w: 2 },
  17: { u: 5, w: 3 },
  18: { u: 5, w: 3 },
  19: { u: 6, w: 3 },
  20: { u: 6, w: 3 },
};

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
  const [playerNames, setPlayerNames] = useState<string[]>(['Người chơi 1', 'Người chơi 2', 'Người chơi 3'])
  const playerCount = playerNames.length
  const validInitialTotal = Math.max(3, Math.min(20, playerCount));
  const [undercoverCount, setUndercoverCount] = useState(DEFAULT_GAME_SETUP[validInitialTotal]?.u ?? 1)
  const [mrWhiteCount, setMrWhiteCount] = useState(DEFAULT_GAME_SETUP[validInitialTotal]?.w ?? 0)
  const [specialRoles, setSpecialRoles] = useState<string[]>([])
  const [isDeleting, setIsDeleting] = useState(false)
  const [isStarting, setIsStarting] = useState(false)
  const [isRestarting, setIsRestarting] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [showRestartConfirm, setShowRestartConfirm] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isEditingPlayers, setIsEditingPlayers] = useState(false)

  // Auto-adjust roles when player count changes
  useEffect(() => {
    const validTotal = Math.max(3, Math.min(20, playerCount))
    const defaults = DEFAULT_GAME_SETUP[validTotal] || { u: 1, w: 0 }
    setUndercoverCount(defaults.u)
    setMrWhiteCount(defaults.w)
  }, [playerCount])

  // Lấy các state logic nâng cao (civilians auto tính)
  const civilianCount = playerCount - undercoverCount - mrWhiteCount
  const maxNonCivilians = Math.floor(playerCount / 2)
  const currentNonCivilians = undercoverCount + mrWhiteCount

  // Logic kiểm tra trạng thái các nút
  const canAddUndercover = currentNonCivilians < maxNonCivilians
  // Có thể giảm thoải mái về 0 để dọn chỗ cho role khác
  const canRemoveUndercover = undercoverCount > 0

  const canAddMrWhite = currentNonCivilians < maxNonCivilians
  // Có thể giảm thoải mái về 0 để dọn chỗ cho role khác
  const canRemoveMrWhite = mrWhiteCount > 0

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

      // Remove from recent rooms local storage
      removeRecentRoom(code)

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

    // Validate special roles
    for (const roleId of specialRoles) {
      const roleDef = SPECIAL_ROLES.find(r => r.id === roleId)
      if (roleDef && playerCount < roleDef.minPlayers) {
        addToast({
          title: 'Lỗi',
          description: `Vai trò ${roleDef.name} cần ít nhất ${roleDef.minPlayers} người chơi (hiện có ${playerCount})`,
          variant: 'error',
        })
        return
      }
    }

    setIsStarting(true)

    // Create player list using input names
    const players: Player[] = playerNames.map((name, index) => ({
      id: crypto.randomUUID(),
      name: name.trim() || `Người chơi ${index + 1}`,
      role: null,
      is_alive: true,
      order: index + 1,
    }))

    // Update room with players AND settings
    const { error: updateError } = await supabase
      .from('rooms')
      .update({
        players,
        settings: {
          undercoverCount,
          mrWhiteCount,
          specialRoles
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

  const handleRestartGame = async () => {
    setIsRestarting(true)
    const result = await restartGame(code)
    if (!result.success) {
      addToast({
        title: 'Lỗi',
        description: result.error || 'Không thể khởi động lại game',
        variant: 'error',
      })
      setIsRestarting(false)
    } else {
      addToast({
        title: 'Thành công',
        description: 'Đã tạo ván mới!',
        variant: 'success',
      })
      setIsRestarting(false)
      setShowRestartConfirm(false)
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
  const canStart = playerCount >= 3 && (room.status === 'waiting' || isEditingPlayers) && totalEnemies > 0

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

        {/* Empty div to keep title centered against the back button */}
        <div className="w-10"></div>
      </div>

      {/* Main Content */}
      {(room.status === 'waiting' || isEditingPlayers) && (
        <div className="flex-1 flex flex-col items-center py-8 px-4 pb-20">

          <div className="w-full max-w-sm mb-6 flex justify-between items-center px-1">
            <h2 className="font-serif font-semibold text-lg">Cấu hình ván chơi</h2>
            <Badge variant="outline" className="font-mono">{playerCount} Người</Badge>
          </div>

          {/* Player Names */}
          <div className="w-full max-w-sm mb-6 border border-border bg-background p-5 rounded-sm">
            <label className="text-xs font-semibold text-muted uppercase tracking-widest mb-4 block">Người Chơi</label>
            <div className="space-y-2 mb-4">
              {playerNames.map((name, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => {
                      const newNames = [...playerNames]
                      newNames[index] = e.target.value
                      setPlayerNames(newNames)
                    }}
                    placeholder={`Người chơi ${index + 1}`}
                    maxLength={20}
                    className="flex-1 px-3 h-10 bg-transparent border border-border rounded-sm focus:border-foreground focus:ring-1 focus:ring-foreground text-sm tracking-wide text-foreground placeholder-muted transition-all outline-none"
                  />
                  {playerNames.length > 3 && (
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-10 w-10 shrink-0 text-muted hover:text-red-500 hover:border-red-500 hover:bg-red-50 transition-colors"
                      onClick={() => {
                        const newNames = playerNames.filter((_, i) => i !== index)
                        setPlayerNames(newNames)
                      }}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </Button>
                  )}
                </div>
              ))}
            </div>

            {playerNames.length < 20 && (
              <Button
                variant="outline"
                className="w-full h-10 text-sm font-medium border-dashed text-muted hover:text-foreground hover:border-foreground transition-colors"
                onClick={() => setPlayerNames([...playerNames, `Người chơi ${playerNames.length + 1}`])}
              >
                + Thêm người chơi
              </Button>
            )}
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
                  <div className="w-8 h-8 flex items-center justify-center bg-muted/10 rounded-sm font-mono text-sm border border-border">
                    {civilianCount}
                  </div>
                </div>

                {/* Undercover */}
                <div className="flex items-center justify-between p-4 bg-muted/5">
                  <span className="text-sm font-medium">Kẻ nằm vùng</span>
                  <div className="flex items-center gap-1">
                    <button
                      className={`w-8 h-8 flex items-center justify-center border border-border rounded-sm text-muted transition-colors ${!canRemoveUndercover ? 'opacity-30 cursor-not-allowed' : 'hover:bg-muted/10 cursor-pointer'}`}
                      onClick={() => canRemoveUndercover && setUndercoverCount(prev => prev - 1)}
                      disabled={!canRemoveUndercover}
                    >
                      −
                    </button>
                    <div className="w-8 h-8 flex items-center justify-center bg-muted/10 rounded-sm font-mono text-sm border border-border">
                      {undercoverCount}
                    </div>
                    <button
                      className={`w-8 h-8 flex items-center justify-center border border-border rounded-sm text-muted transition-colors ${!canAddUndercover ? 'opacity-30 cursor-not-allowed' : 'hover:bg-muted/10 cursor-pointer'}`}
                      onClick={() => canAddUndercover && setUndercoverCount(prev => prev + 1)}
                      disabled={!canAddUndercover}
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Mr. White */}
                <div className="flex items-center justify-between p-4 bg-muted/5">
                  <span className="text-sm font-medium">Mr. White</span>
                  <div className="flex items-center gap-1">
                    <button
                      className={`w-8 h-8 flex items-center justify-center border border-border rounded-sm text-muted transition-colors ${!canRemoveMrWhite ? 'opacity-30 cursor-not-allowed' : 'hover:bg-muted/10 cursor-pointer'}`}
                      onClick={() => canRemoveMrWhite && setMrWhiteCount(prev => prev - 1)}
                      disabled={!canRemoveMrWhite}
                    >
                      −
                    </button>
                    <div className="w-8 h-8 flex items-center justify-center bg-muted/10 rounded-sm font-mono text-sm border border-border">
                      {mrWhiteCount}
                    </div>
                    <button
                      className={`w-8 h-8 flex items-center justify-center border border-border rounded-sm text-muted transition-colors ${!canAddMrWhite ? 'opacity-30 cursor-not-allowed' : 'hover:bg-muted/10 cursor-pointer'}`}
                      onClick={() => canAddMrWhite && setMrWhiteCount(prev => prev + 1)}
                      disabled={!canAddMrWhite}
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Special Roles Selector */}
          <div className="w-full max-w-sm mb-6 flex flex-col">
            <Dialog>
              <DialogTrigger className="w-full text-left" asChild>
                <div role="button" className="w-full outline-none">
                  <Card className="w-full cursor-pointer hover:bg-muted/5 transition-colors border-dashed border-2 hover:border-solid hover:border-foreground">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div>
                        <div className="text-sm font-semibold tracking-wide mb-1">Vai Trò Đặc Biệt</div>
                        <div className="text-[11px] text-muted leading-tight">Thêm năng lực ẩn cho người chơi</div>
                      </div>
                      <div className="flex items-center gap-3">
                        {specialRoles.length > 0 ? (
                          <span className="flex items-center justify-center bg-foreground text-background text-xs font-mono font-bold w-6 h-6 rounded-full shadow-sm">
                            {specialRoles.length}
                          </span>
                        ) : (
                          <span className="text-xs text-muted font-mono tracking-widest uppercase">Trống</span>
                        )}
                        <svg className="w-4 h-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" /></svg>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </DialogTrigger>
              <DialogContent className="max-h-[85vh] flex flex-col p-0 gap-0 sm:max-w-md rounded-lg overflow-hidden border-border shadow-2xl">
                <DialogHeader>
                  <div className="px-6 pt-6 pb-4 border-b border-border bg-background text-left w-full">
                    <DialogTitle className="font-serif text-xl">Vai Trò Đặc Biệt</DialogTitle>
                    <div className="text-xs text-muted mt-1.5 leading-relaxed">Người chơi chọn trúng vai trò này vẫn sẽ là Dân thường hoặc Phản diện, nhưng có thêm quyền năng mới.</div>
                  </div>
                </DialogHeader>
                <div className="overflow-y-auto flex-1 flex flex-col p-4 bg-muted/5 space-y-2">
                  {SPECIAL_ROLES.map((role) => {
                    const isEnabled = specialRoles.includes(role.id)
                    const isDisabled = playerCount < role.minPlayers

                    return (
                      <div
                        key={role.id}
                        className={`flex flex-col p-4 rounded-md border transition-all cursor-pointer select-none relative bg-background ${isDisabled ? 'opacity-50 grayscale border-transparent' :
                          isEnabled ? 'border-foreground shadow-sm ring-1 ring-foreground/20' :
                            'border-border hover:border-foreground/40 hover:shadow-sm'
                          }`}
                        onClick={() => {
                          if (isDisabled) return
                          if (isEnabled) setSpecialRoles(specialRoles.filter(id => id !== role.id))
                          else setSpecialRoles([...specialRoles, role.id])
                        }}
                      >
                        <div className="flex items-start gap-4">
                          <div className={`w-10 h-10 rounded-md flex items-center justify-center shrink-0 shadow-inner ${role.color} text-white mt-0.5`}>
                            <span className="text-lg font-bold font-serif">{role.name.charAt(0)}</span>
                          </div>
                          <div className="flex-1 min-w-0 pr-8 text-left">
                            <h4 className={`font-semibold text-sm mb-1 tracking-wide ${isEnabled ? 'text-foreground' : 'text-muted-foreground'}`}>
                              {role.name}
                            </h4>
                            <p className="text-xs text-muted leading-relaxed">
                              {role.description}
                            </p>
                            {isDisabled && (
                              <span className="text-[10px] text-red-500 font-bold block mt-2 uppercase tracking-widest">
                                ! Cần ít nhất {role.minPlayers} người
                              </span>
                            )}
                          </div>
                          <div className="absolute right-5 top-1/2 -translate-y-1/2">
                            <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all duration-200 ${isEnabled ? 'bg-foreground border-foreground text-background scale-110' : 'border-border'
                              }`}>
                              {isEnabled && (
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" viewBox="0 0 24 24">
                                  <path d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </DialogContent>
            </Dialog>
          </div>

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
                        <label className="text-xs text-muted uppercase tracking-wider block mb-2">Danh sách chủ đề</label>
                        <Select
                          aria-label="Danh sách chủ đề"
                          placeholder="-- Chọn 1 chủ đề --"
                          selectedKey={selectedCategory}
                          onSelectionChange={(key) => setSelectedCategory(key as string)}
                        >
                          <Select.Trigger className="w-full rounded-sm border border-border bg-background px-3 h-10 text-sm focus-visible:outline-none flex items-center justify-between data-[focus-visible=true]:ring-1 data-[focus-visible=true]:ring-foreground">
                            <Select.Value />
                          </Select.Trigger>
                          <Select.Popover className="border border-border rounded-sm bg-background p-1 shadow-md w-[var(--trigger-width)]">
                            <ListBox className="space-y-0.5 outline-none">
                              {availableCategories.map((cat) => (
                                <ListBoxItem key={cat} id={cat} textValue={cat.charAt(0).toUpperCase() + cat.slice(1)} className="px-2 py-1.5 text-sm hover:bg-muted/10 data-[focused=true]:bg-muted/10 rounded-sm cursor-pointer outline-none">
                                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                                </ListBoxItem>
                              ))}
                            </ListBox>
                          </Select.Popover>
                        </Select>
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>

          {/* Start Button & Cancel Button if Editing */}
          <div className="w-full max-w-sm space-y-3">
            <Button
              onClick={handleStartGame}
              isDisabled={!canStart || (gameMode === 'pack' && !selectedCategory) || isStarting || civilianCount <= 0}
              className="w-full h-12 text-sm font-semibold tracking-wide"
              variant="primary"
            >
              {isStarting ? 'Đang tải...' : isEditingPlayers ? 'LƯU & BẮT ĐẦU VÁN MỚI' : 'BẮT ĐẦU VÁN'}
            </Button>

            {isEditingPlayers && (
              <Button
                onClick={() => setIsEditingPlayers(false)}
                variant="outline"
                className="w-full h-12 text-sm font-medium"
              >
                Hủy Chỉnh Sửa
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Playing State */}
      {room.status === 'playing' && !isEditingPlayers && (
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
                variant="primary"
              >
                Vào Game Nào
              </Button>

              <div className="pt-4 space-y-3 border-t border-border">
                <Button
                  variant="outline"
                  className="w-full h-10 text-sm"
                  onClick={() => {
                    // Populate current players into the editing state inputs
                    const currentNames = (room.players || []).map(p => p.name);
                    if (currentNames.length) {
                      setPlayerNames(currentNames);
                    }
                    setIsEditingPlayers(true);
                  }}
                >
                  Cập Nhật Người Chơi
                </Button>

                <Dialog open={showRestartConfirm} onOpenChange={setShowRestartConfirm}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full h-10 text-sm">
                      Chơi Lại (Giữ Danh Sách)
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle className="font-serif">Xác nhận chơi lại</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <p className="text-sm">Bạn có chắc chắn muốn bỏ ván hiện tại và bắt đầu ván mới với bộ từ khác không?</p>
                      <Button
                        className="w-full"
                        onClick={handleRestartGame}
                        isDisabled={isRestarting}
                      >
                        {isRestarting ? 'Đang tạo...' : 'Xác Nhận Chơi Lại'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>

                <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full h-10 text-sm text-red-500 hover:text-red-400 hover:bg-neutral-900 border-red-900/50 hover:border-red-800">
                      Xóa Phòng Này
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle className="font-serif text-red-500">Xác nhận Xóa Phòng</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <p className="text-sm">Hành động này sẽ xóa hoàn toàn phòng chơi và lịch sử của phòng. Bạn có chắc chắn không?</p>
                      <Button
                        variant="destructive"
                        className="w-full"
                        onClick={handleDeleteRoom}
                        isDisabled={isDeleting}
                      >
                        {isDeleting ? 'Đang xóa...' : 'Vâng, Xóa Phòng'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
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
