export type RoomStatus = 'waiting' | 'playing' | 'finished'

export interface RoomSettings {
  undercoverCount: number
  mrWhiteCount: number
  specialRoles?: string[]
}

export interface Room {
  id: string
  code: string
  status: RoomStatus
  current_word_pair_id: number | null
  used_word_ids: number[]
  players: Player[]
  settings: RoomSettings
  timer_end_at?: string | null
  created_at?: string
  updated_at?: string
}

export interface Player {
  id: string
  name: string
  role: 'civilian' | 'undercover' | 'mr_white' | null
  special_role?: string | null
  state?: Record<string, any>
  is_alive: boolean
  order: number
}

export interface WordPair {
  id: number
  word_civilian: string
  word_undercover: string
  category: string
  difficulty: 1 | 2 | 3 | 4
  pack_id: number | null
}

export interface GameHistory {
  id: string
  room_code: string
  word_pair_id: number
  players: Player[]
  winners: Player[]
  game_result: string
  started_at: string
  ended_at: string
  duration_seconds: number | null
  created_at: string
}

export interface GameStatistics {
  id: string
  room_code: string
  total_games: number
  civilian_wins: number
  undercover_wins: number
  mr_white_wins: number
  total_players: number
  average_game_duration: number
  most_played_category: string | null
  created_at: string
  updated_at: string
}
