-- Add timer_end_at column to rooms table
ALTER TABLE rooms 
ADD COLUMN timer_end_at TIMESTAMPTZ DEFAULT NULL;
