-- Add settings column to rooms table
ALTER TABLE rooms 
ADD COLUMN settings JSONB DEFAULT '{"undercoverCount": 1, "mrWhiteCount": 0}'::jsonb;
