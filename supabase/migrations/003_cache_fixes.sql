-- Fix 6: Add national team columns to team_cache
ALTER TABLE team_cache ADD COLUMN IF NOT EXISTS national BOOLEAN DEFAULT FALSE;
ALTER TABLE team_cache ADD COLUMN IF NOT EXISTS fifa_rank INTEGER;
ALTER TABLE team_cache ADD COLUMN IF NOT EXISTS confederation TEXT;

-- Fix 7: Add cache_key TEXT column to match_results for reliable lookups
ALTER TABLE match_results ADD COLUMN IF NOT EXISTS cache_key TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_match_results_cache_key ON match_results(cache_key);

-- Fix 8: Allow service role to write (API routes use service role, not auth.uid())
DROP POLICY IF EXISTS "Authenticated users can write team cache" ON team_cache;
DROP POLICY IF EXISTS "Authenticated users can write match cache" ON match_results;

CREATE POLICY "Service role can write team cache" ON team_cache
  FOR ALL USING (TRUE);

CREATE POLICY "Service role can write match cache" ON match_results
  FOR ALL USING (TRUE);
