-- Migration 004: Add odds_api_key to user_settings
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS odds_api_key TEXT DEFAULT '';
