-- Undercover Clone Database Schema
-- Run this SQL in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Word Pairs Table
CREATE TABLE word_pairs (
  id BIGSERIAL PRIMARY KEY,
  word_civilian TEXT NOT NULL,
  word_undercover TEXT NOT NULL,
  category TEXT NOT NULL,
  difficulty SMALLINT NOT NULL CHECK (difficulty >= 1 AND difficulty <= 4),
  pack_id BIGINT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX idx_word_pairs_category ON word_pairs(category);
CREATE INDEX idx_word_pairs_difficulty ON word_pairs(difficulty);
CREATE INDEX idx_word_pairs_pack_id ON word_pairs(pack_id);

-- Rooms Table
CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'playing', 'finished')),
  current_word_pair_id BIGINT REFERENCES word_pairs(id),
  used_word_ids BIGINT[] DEFAULT '{}',
  players JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for room code lookups
CREATE INDEX idx_rooms_code ON rooms(code);
CREATE INDEX idx_rooms_status ON rooms(status);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_rooms_updated_at
  BEFORE UPDATE ON rooms
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS) - Optional, adjust based on your needs
ALTER TABLE word_pairs ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;

-- Policy: Allow anyone to read word_pairs
CREATE POLICY "Allow public read access to word_pairs"
  ON word_pairs FOR SELECT
  USING (true);

-- Policy: Allow anyone to read rooms
CREATE POLICY "Allow public read access to rooms"
  ON rooms FOR SELECT
  USING (true);

-- Policy: Allow anyone to insert/update rooms (for game logic)
CREATE POLICY "Allow public insert to rooms"
  ON rooms FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update to rooms"
  ON rooms FOR UPDATE
  USING (true);

-- Enable Realtime for rooms table
ALTER PUBLICATION supabase_realtime ADD TABLE rooms;

-- Game History Table
CREATE TABLE game_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_code TEXT NOT NULL,
  word_pair_id BIGINT REFERENCES word_pairs(id),
  players JSONB NOT NULL,
  winners JSONB NOT NULL,
  game_result TEXT NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  duration_seconds INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX idx_game_history_room_code ON game_history(room_code);
CREATE INDEX idx_game_history_started_at ON game_history(started_at DESC);

-- Statistics Table (aggregated per room/session)
CREATE TABLE game_statistics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_code TEXT UNIQUE NOT NULL,
  total_games INTEGER DEFAULT 0,
  civilian_wins INTEGER DEFAULT 0,
  undercover_wins INTEGER DEFAULT 0,
  mr_white_wins INTEGER DEFAULT 0,
  total_players INTEGER DEFAULT 0,
  average_game_duration INTEGER DEFAULT 0,
  most_played_category TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for statistics
CREATE INDEX idx_game_statistics_room_code ON game_statistics(room_code);

-- Function to update statistics
CREATE OR REPLACE FUNCTION update_game_statistics()
RETURNS TRIGGER AS $$
DECLARE
  player_count INTEGER;
  duration INTEGER;
BEGIN
  player_count := jsonb_array_length(NEW.players);
  duration := COALESCE(NEW.duration_seconds, 0);
  
  INSERT INTO game_statistics (room_code, total_games, civilian_wins, undercover_wins, mr_white_wins, total_players, average_game_duration, updated_at)
  VALUES (
    NEW.room_code,
    1,
    CASE WHEN NEW.game_result LIKE '%Dân thường%' THEN 1 ELSE 0 END,
    CASE WHEN NEW.game_result LIKE '%Undercover%' THEN 1 ELSE 0 END,
    CASE WHEN NEW.game_result LIKE '%Mr. White%' THEN 1 ELSE 0 END,
    player_count,
    duration,
    NOW()
  )
  ON CONFLICT (room_code) DO UPDATE SET
    total_games = game_statistics.total_games + 1,
    civilian_wins = game_statistics.civilian_wins + CASE WHEN NEW.game_result LIKE '%Dân thường%' THEN 1 ELSE 0 END,
    undercover_wins = game_statistics.undercover_wins + CASE WHEN NEW.game_result LIKE '%Undercover%' THEN 1 ELSE 0 END,
    mr_white_wins = game_statistics.mr_white_wins + CASE WHEN NEW.game_result LIKE '%Mr. White%' THEN 1 ELSE 0 END,
    total_players = GREATEST(game_statistics.total_players, player_count),
    average_game_duration = CASE 
      WHEN game_statistics.average_game_duration = 0 THEN duration
      ELSE (game_statistics.average_game_duration + duration) / 2
    END,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update statistics
CREATE TRIGGER update_statistics_on_game_end
  AFTER INSERT ON game_history
  FOR EACH ROW
  EXECUTE FUNCTION update_game_statistics();

-- Enable RLS for new tables
ALTER TABLE game_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_statistics ENABLE ROW LEVEL SECURITY;

-- Policy: Allow public read access
CREATE POLICY "Allow public read access to game_history"
  ON game_history FOR SELECT
  USING (true);

CREATE POLICY "Allow public read access to game_statistics"
  ON game_statistics FOR SELECT
  USING (true);

-- Policy: Allow public insert to game_history
CREATE POLICY "Allow public insert to game_history"
  ON game_history FOR INSERT
  WITH CHECK (true);
