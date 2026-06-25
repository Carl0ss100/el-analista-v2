-- El Analista v2 - Migration 002: Quantitative Models Support
-- Run in: Supabase Dashboard > SQL Editor > New Query > Run

-- Team ID cache (avoids repeated /teams?search= API calls)
CREATE TABLE team_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  alternate_names TEXT[] DEFAULT '{}',
  league_id INTEGER,
  league_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  last_fetched TIMESTAMPTZ DEFAULT now(),
  UNIQUE(api_id)
);

-- Extend match_results with flexible caching
ALTER TABLE match_results ADD COLUMN IF NOT EXISTS data_type TEXT DEFAULT 'result';
ALTER TABLE match_results ADD COLUMN IF NOT EXISTS payload JSONB;
ALTER TABLE match_results ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE match_results DROP CONSTRAINT IF EXISTS match_results_pkey;
ALTER TABLE match_results ADD PRIMARY KEY (fixture_id, data_type);

-- Add model data to predictions for backtesting
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS model_prob DECIMAL;
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS model_type TEXT;
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS model_data JSONB;

-- Indexes for cache lookups
CREATE INDEX IF NOT EXISTS idx_team_cache_name ON team_cache(name);
CREATE INDEX IF NOT EXISTS idx_team_cache_last_fetched ON team_cache(last_fetched);
CREATE INDEX IF NOT EXISTS idx_match_results_data_type ON match_results(data_type);
CREATE INDEX IF NOT EXISTS idx_match_results_expires ON match_results(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_predictions_model_prob ON predictions(model_prob) WHERE model_prob IS NOT NULL;

-- RLS
ALTER TABLE team_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read team cache" ON team_cache FOR SELECT USING (true);
CREATE POLICY "Authenticated users can write team cache" ON team_cache FOR ALL USING (auth.uid() IS NOT NULL);
