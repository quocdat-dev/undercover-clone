'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { generateRoomCode } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { getRecentRooms, saveRecentRoom, RecentRoom } from '@/lib/storage'

export default function Home() {
  const router = useRouter()
  const [roomCode, setRoomCode] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [isJoining, setIsJoining] = useState(false)
  const [recentRooms, setRecentRooms] = useState<RecentRoom[]>([])

  useEffect(() => {
    setRecentRooms(getRecentRooms())
  }, [])

  const handleCreateRoom = async () => {
    setIsCreating(true)
    try {
      const code = generateRoomCode()
      const { data, error } = await supabase
        .from('rooms')
        .insert({
          code,
          status: 'waiting',
          players: [],
          used_word_ids: [],
        })
        .select()
        .single()

      if (error) throw error

      saveRecentRoom(code)
      router.push(`/room/${code}`)
    } catch (error) {
      console.error('Error creating room:', error)
      alert('Không thể tạo phòng. Vui lòng thử lại.')
    } finally {
      setIsCreating(false)
    }
  }

  const handleJoinRoom = async (codeToJoin?: string) => {
    const code = typeof codeToJoin === 'string' ? codeToJoin : roomCode
    const formattedCode = code.trim().toUpperCase()

    if (!formattedCode) {
      alert('Vui lòng nhập mã phòng')
      return
    }

    setIsJoining(true)
    try {
      const { data, error } = await supabase
        .from('rooms')
        .select('code')
        .eq('code', formattedCode)
        .single()

      if (error || !data) {
        throw new Error('Không tìm thấy phòng')
      }

      saveRecentRoom(formattedCode)
      router.push(`/room/${formattedCode}`)
    } catch (error) {
      console.error('Error joining room:', error)
      alert('Không tìm thấy phòng. Vui lòng kiểm tra lại mã phòng.')
    } finally {
      setIsJoining(false)
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 sm:p-12 relative bg-background">
      <div className="w-full max-w-sm space-y-10 relative z-10 animate-fade-in">
        {/* Header */}
        <div className="space-y-3 text-center sm:text-left transition-all">
          <h1 className="text-4xl sm:text-5xl font-bold font-serif tracking-tight text-foreground">
            Undercover
          </h1>
          <p className="text-muted text-base font-sans">
            Ai là kẻ nằm vùng? Tạo hoặc tham gia một ván game mới.
          </p>
        </div>

        {/* Actions Container */}
        <div className="flex flex-col gap-8">

          {/* Create Room */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground font-serif border-b border-border pb-2">Tạo ván mới</h2>
            <Button
              variant="primary"
              className="w-full h-10 text-sm font-medium"
              onClick={handleCreateRoom}
              isDisabled={isCreating}
            >
              🚀 {isCreating ? 'Đang khởi tạo...' : 'Tạo phòng chơi'}
            </Button>
          </div>

          <div className="relative flex items-center py-2">
            <div className="flex-grow border-t border-border"></div>
            <span className="flex-shrink-0 mx-4 text-muted text-xs font-medium uppercase tracking-wider">Hoặc</span>
            <div className="flex-grow border-t border-border"></div>
          </div>

          {/* Join Room */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground font-serif border-b border-border pb-2">Tham gia</h2>
            <div className="flex flex-col gap-3">
              <input
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                placeholder="Nhập mã phòng"
                maxLength={6}
                className="w-full px-3 h-10 bg-transparent border border-border rounded-sm focus:border-foreground focus:ring-1 focus:ring-foreground text-base tracking-widest text-foreground placeholder-muted transition-all outline-none uppercase font-mono"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleJoinRoom()
                  }
                }}
              />

              <Button
                variant="outline"
                className="w-full h-10 text-sm font-medium"
                onClick={() => handleJoinRoom()}
                isDisabled={isJoining || !roomCode.trim()}
              >
                👋 {isJoining ? 'Đang kết nối...' : 'Vào phòng'}
              </Button>
            </div>
          </div>

          {/* Recent Rooms */}
          {recentRooms.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-border animate-fade-in">
              <h2 className="text-xs font-semibold text-muted uppercase tracking-wider">Phòng của bạn</h2>
              <div className="flex flex-wrap gap-2">
                {recentRooms.map((room) => (
                  <Button
                    key={room.code}
                    variant="outline"
                    className="h-8 text-xs font-mono px-3 hover:bg-muted/10"
                    onClick={() => handleJoinRoom(room.code)}
                    isDisabled={isJoining}
                  >
                    Phòng {room.code}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center sm:text-left text-muted text-xs pt-8">
          <p>© 2026 Undercover • Clone by Dlqnchill</p>
        </div>
      </div>
    </main>
  )
}
