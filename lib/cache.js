import { getSupabase, getSupabaseAdmin } from './supabase';

const TTL = {
  team_id: 365 * 24 * 60 * 60 * 1000,
  form: 60 * 60 * 1000,
  h2h: 6 * 60 * 60 * 1000,
  odds: 5 * 60 * 60 * 1000,
  result: 24 * 60 * 60 * 1000,
  injuries: 60 * 60 * 1000,
  lineups: 30 * 60 * 1000,
  match_stats: 6 * 60 * 60 * 1000,
  player_season: 24 * 60 * 60 * 1000,
};

export async function getCached(dataType, key) {
  const supabase = getSupabase();
  if (!supabase) return null;

  if (dataType === 'team_id') {
    const { data } = await supabase
      .from('team_cache')
      .select('*')
      .ilike('name', key)
      .order('last_fetched', { ascending: false })
      .limit(1);
    if (data?.length && Date.now() - new Date(data[0].last_fetched).getTime() < TTL.team_id) {
      const row = data[0];
      row.fifaRank = row.fifaRank || row.fifa_rank || null;
      return row;
    }
    return null;
  }

  const { data } = await supabase
    .from('match_results')
    .select('*')
    .eq('cache_key', `${dataType}:${key}`)
    .gt('expires_at', new Date().toISOString())
    .limit(1);

  if (data?.length) return data[0];
  return null;
}

export async function setCache(dataType, key, payload, ttlMs) {
  const supabase = getSupabaseAdmin() || getSupabase();
  if (!supabase) return;

  const expiresAt = new Date(Date.now() + (ttlMs || TTL[dataType] || 3600000)).toISOString();

  if (dataType === 'team_id') {
    const { api_id, name, alternate_names, league_id, league_name, national, fifaRank, confederation } = payload;
    await supabase
      .from('team_cache')
      .upsert({
        api_id,
        name,
        alternate_names: alternate_names || [],
        league_id: league_id || null,
        league_name: league_name || null,
        national: national || false,
        fifa_rank: fifaRank || null,
        confederation: confederation || null,
        last_fetched: new Date().toISOString(),
      }, { onConflict: 'api_id' });
    return;
  }

  await supabase
    .from('match_results')
    .upsert({
      cache_key: `${dataType}:${key}`,
      fixture_id: key,
      data_type: dataType,
      payload,
      expires_at: expiresAt,
      home_team: payload?.home_team || '',
      away_team: payload?.away_team || '',
      fetched_at: new Date().toISOString(),
    }, { onConflict: 'cache_key' });
}

export async function getTeamIdFromCache(teamName) {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data } = await supabase
    .from('team_cache')
    .select('*')
    .or(`name.ilike.%${teamName}%,alternate_names.cs.{${teamName}}`)
    .order('last_fetched', { ascending: false })
    .limit(1);

  if (data?.length && Date.now() - new Date(data[0].last_fetched).getTime() < TTL.team_id) {
    const row = data[0];
    row.fifaRank = row.fifaRank || row.fifa_rank || null;
    return row;
  }
  return null;
}
