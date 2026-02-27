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
    <main className="flex min-h-screen flex-col items-center justify-center p-6 sm:p-12 relative bg-background overflow-hidden selection:bg-foreground selection:text-background">
      {/* Background Decor Effects */}
      <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80 pointer-events-none" aria-hidden="true">
        <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-foreground/5 to-foreground/10 opacity-30 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem] animate-pulse-slow"></div>
      </div>
      <div className="absolute inset-x-0 top-[calc(100%-13rem)] -z-10 transform-gpu overflow-hidden blur-3xl sm:top-[calc(100%-30rem)] pointer-events-none" aria-hidden="true">
        <div className="relative left-[calc(50%+3rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 bg-gradient-to-tr from-foreground/5 to-foreground/10 opacity-30 sm:left-[calc(50%+36rem)] sm:w-[72.1875rem] animate-pulse-slow" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="w-full max-w-md relative z-10 flex flex-col gap-10">

        {/* Header Section */}
        <div className="flex flex-col items-center sm:items-start text-center sm:text-left animate-fade-in group">
          <div className="inline-flex items-center gap-2 px-3 py-1 mb-6 rounded-full bg-muted/20 border border-border text-[11px] font-semibold text-muted tracking-widest uppercase transition-all hover:bg-muted/40 cursor-default">
            <span className="w-1.5 h-1.5 rounded-full bg-foreground animate-pulse-slow"></span>
            Undercover version 1.0
          </div>

          <div className="relative group/title cursor-default w-fit mx-auto sm:mx-0">
            <h1 className="text-5xl sm:text-7xl font-bold font-serif tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-foreground via-muted to-foreground bg-[length:200%_auto] animate-text-shimmer transition-all duration-500 group-hover/title:tracking-[0.03em] drop-shadow-sm">
              Undercover
            </h1>
            <div className="absolute -right-6 sm:-right-8 -top-6 text-3xl sm:text-4xl opacity-0 group-hover/title:opacity-100 group-hover/title:rotate-12 transition-all duration-500 transform scale-50 group-hover/title:scale-110 pointer-events-none drop-shadow-md">
              🕵️
            </div>
            {/* Đường kẻ dưới tinh tế xuất hiện khi hover */}
            <div className="absolute -bottom-1 left-0 h-[2px] w-0 bg-gradient-to-r from-transparent via-foreground/80 to-transparent rounded-full transition-all duration-700 ease-out group-hover/title:w-full opacity-0 group-hover/title:opacity-100"></div>
          </div>

          <div className="mt-4 flex sm:justify-start justify-center">
            <div className="group/badge relative inline-flex items-center gap-2 px-5 py-2 rounded-full border border-border bg-background shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 cursor-default overflow-hidden">
              <div className="absolute inset-0 bg-foreground group-hover/badge:translate-y-0 translate-y-full transition-transform duration-300 ease-out z-0"></div>
              <span className="relative z-10 text-xs font-semibold text-muted group-hover/badge:text-background/80 transition-colors duration-300 tracking-wider">By</span>
              <span className="relative z-10 text-sm font-bold font-serif text-foreground group-hover/badge:text-background transition-colors duration-300 tracking-wide whitespace-nowrap">Lạt và Đi</span>
            </div>
          </div>

          <p className="text-muted text-base font-sans mt-7 max-w-[95%] leading-relaxed">
            Hẹ hẹ mình không thích trả phí thì mình làm thôi.
          </p>
        </div>

        {/* Action Card */}
        <div className="bg-background/80 backdrop-blur-xl border border-border shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl p-6 sm:p-8 space-y-8 animate-slide-in relative overflow-hidden transition-all duration-500 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]">

          {/* Create Room */}
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-foreground font-serif border-b border-border pb-2 flex items-center gap-2">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
              Tạo Ván Mới
            </h2>
            <Button
              variant="primary"
              className="w-full h-12 text-sm font-bold tracking-wide transition-all hover:scale-[1.02] active:scale-[0.98] relative overflow-hidden group/btn"
              onClick={handleCreateRoom}
              isDisabled={isCreating}
            >
              <span className="absolute inset-0 w-full h-full bg-background/10 -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000 ease-in-out" />
              {isCreating ? 'Đang khởi tạo...' : 'Tạo phòng chơi mới'}
            </Button>
          </div>

          <div className="relative flex items-center py-2">
            <div className="flex-grow border-t border-border"></div>
            <span className="flex-shrink-0 mx-4 text-muted/50 text-[10px] font-bold uppercase tracking-[0.2em] bg-background px-2">Hoặc</span>
            <div className="flex-grow border-t border-border"></div>
          </div>

          {/* Join Room */}
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-foreground font-serif border-b border-border pb-2 flex items-center gap-2">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" /></svg>
              Tham Gia Ván
            </h2>
            <div className="flex gap-3">
              <input
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                placeholder="Mã 6 số"
                maxLength={6}
                className="w-full px-4 h-12 bg-transparent border border-border rounded-lg focus:border-foreground focus:ring-1 focus:ring-foreground text-lg tracking-[0.25em] text-foreground placeholder:text-muted/40 transition-all outline-none uppercase font-mono font-bold"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleJoinRoom()
                  }
                }}
              />

              <Button
                variant="outline"
                className="w-24 shrink-0 h-12 text-sm font-bold tracking-wide transition-all hover:border-foreground hover:bg-foreground hover:text-background"
                onClick={() => handleJoinRoom()}
                isDisabled={isJoining || !roomCode.trim()}
              >
                {isJoining ? '...' : 'Vào'}
              </Button>
            </div>
          </div>
        </div>

        {/* Recent Rooms */}
        {recentRooms.length > 0 && (
          <div className="space-y-4 pt-4 animate-scale-in delay-100">
            <h2 className="text-[11px] font-semibold text-muted uppercase tracking-[0.15em] flex items-center gap-2 px-1">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Phòng gần đây
            </h2>
            <div className="flex flex-wrap gap-2">
              {recentRooms.map((room) => (
                <button
                  key={room.code}
                  className="h-9 px-4 rounded-lg text-sm font-mono border border-border bg-background/50 hover:bg-background hover:border-foreground/30 text-muted hover:text-foreground hover:-translate-y-0.5 transition-all flex items-center gap-2 active:scale-95 shadow-sm"
                  onClick={() => handleJoinRoom(room.code)}
                  disabled={isJoining}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse-slow"></span>
                  {room.code}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
