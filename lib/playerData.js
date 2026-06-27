import { setCache, getCached } from './cache';
import { rateLimitedFetch } from './fetch';

export async function getPlayerMatchStats(fixtureId, proxyUrl) {
  const cacheKey = `player_stats_${fixtureId}`;
  const cached = await getCached('match_stats', cacheKey);
  if (cached?.payload) return cached.payload;

  try {
    const data = await rateLimitedFetch(`${proxyUrl}/fixtures/players?fixture=${fixtureId}`);
    if (!data.response?.length) return null;

    const result = data.response.map(team => ({
      team: { id: team.team.id, name: team.team.name },
      players: team.players.map(p => ({
        id: p.player.id,
        name: p.player.name,
        position: p.statistics[0]?.games?.position || '',
        minutes: p.statistics[0]?.games?.minutes || 0,
        rating: parseFloat(p.statistics[0]?.games?.rating) || 0,
        shots: {
          total: p.statistics[0]?.shots?.total || 0,
          onTarget: p.statistics[0]?.shots?.on || 0,
        },
        goals: p.statistics[0]?.goals?.total || 0,
        assists: p.statistics[0]?.goals?.assists || 0,
        passes: {
          total: p.statistics[0]?.passes?.total || 0,
          key: p.statistics[0]?.passes?.key || 0,
          accuracy: p.statistics[0]?.passes?.accuracy || 0,
        },
        tackles: {
          total: p.statistics[0]?.tackles?.total || 0,
          blocks: p.statistics[0]?.tackles?.blocks || 0,
          interceptions: p.statistics[0]?.tackles?.interceptions || 0,
        },
        duels: {
          total: p.statistics[0]?.duels?.total || 0,
          won: p.statistics[0]?.duels?.won || 0,
        },
        dribbles: {
          attempts: p.statistics[0]?.dribbles?.attempts || 0,
          success: p.statistics[0]?.dribbles?.success || 0,
        },
        fouls: {
          drawn: p.statistics[0]?.fouls?.drawn || 0,
          committed: p.statistics[0]?.fouls?.committed || 0,
        },
        cards: {
          yellow: p.statistics[0]?.cards?.yellow || 0,
          red: p.statistics[0]?.cards?.red || 0,
        },
        substitutes: {
          in: p.statistics[0]?.substitutes?.in || 0,
          out: p.statistics[0]?.substitutes?.out || 0,
        },
      })),
    }));

    await setCache('match_stats', cacheKey, result);
    return result;
  } catch {
    return null;
  }
}

export async function getPlayerSeasonStats(playerId, season, proxyUrl) {
  const cacheKey = `player_season_${playerId}_${season}`;
  const cached = await getCached('player_season', cacheKey);
  if (cached?.payload) return cached.payload;

  try {
    const data = await rateLimitedFetch(`${proxyUrl}/players?id=${playerId}&season=${season}`);
    if (!data.response?.length) return null;

    const p = data.response[0];
    const stats = p.statistics[0] || {};
    const result = {
      id: p.player.id,
      name: p.player.name,
      age: p.player.age,
      nationality: p.player.nationality,
      team: stats.team?.name || '',
      league: stats.league?.name || '',
      season: stats.league?.season || season,
      appearances: stats.games?.appearences || 0,
      lineups: stats.games?.lineups || 0,
      minutesPerGame: stats.games?.minutes ? Math.round(stats.games.minutes / (stats.games.appearences || 1)) : 0,
      goals: stats.goals?.total || 0,
      assists: stats.goals?.assists || 0,
      shotsPerGame: stats.shots?.total ? (stats.shots.total / (stats.games.appearences || 1)).toFixed(1) : 0,
      shotsOnTargetPerGame: stats.shots?.on ? (stats.shots.on / (stats.games.appearences || 1)).toFixed(1) : 0,
      passesPerGame: stats.passes?.total ? (stats.passes.total / (stats.games.appearences || 1)).toFixed(0) : 0,
      keyPassesPerGame: stats.passes?.key ? (stats.passes.key / (stats.games.appearences || 1)).toFixed(1) : 0,
      tacklesPerGame: stats.tackles?.total ? (stats.tackles.total / (stats.games.appearences || 1)).toFixed(1) : 0,
      interceptionsPerGame: stats.tackles?.interceptions ? (stats.tackles.interceptions / (stats.games.appearences || 1)).toFixed(1) : 0,
      foulsPerGame: stats.fouls?.committed ? (stats.fouls.committed / (stats.games.appearences || 1)).toFixed(1) : 0,
      foulsDrawnPerGame: stats.fouls?.drawn ? (stats.fouls.drawn / (stats.games.appearences || 1)).toFixed(1) : 0,
      yellowCards: stats.cards?.yellow || 0,
      redCards: stats.cards?.red || 0,
      dribblesPerGame: stats.dribbles?.attempts ? (stats.dribbles.attempts / (stats.games.appearences || 1)).toFixed(1) : 0,
    };

    await setCache('player_season', cacheKey, result, 24 * 60 * 60 * 1000);
    return result;
  } catch {
    return null;
  }
}

export async function getTeamMatchStats(fixtureId, proxyUrl) {
  const cacheKey = `team_match_stats_${fixtureId}`;
  const cached = await getCached('match_stats', cacheKey);
  if (cached?.payload) return cached.payload;

  try {
    const data = await rateLimitedFetch(`${proxyUrl}/fixtures/statistics?fixture=${fixtureId}`);
    if (!data.response?.length) return null;

    const result = data.response.map(team => ({
      team: { id: team.team.id, name: team.team.name },
      stats: {},
    }));

    for (const team of data.response) {
      const idx = data.response.indexOf(team);
      for (const stat of team.statistics) {
        result[idx].stats[stat.type] = stat.value;
      }
    }

    await setCache('match_stats', cacheKey, result, 6 * 60 * 60 * 1000);
    return result;
  } catch {
    return null;
  }
}

export async function getInjuries(teamId, proxyUrl) {
  const cacheKey = `injuries_${teamId}`;
  const cached = await getCached('injuries', cacheKey);
  if (cached?.payload) return cached.payload;

  try {
    const data = await rateLimitedFetch(`${proxyUrl}/injuries?team=${teamId}`);
    if (!data.response?.length) return [];

    const result = data.response.map(inj => ({
      player: inj.player.name,
      type: inj.player.type,
      reason: inj.player.reason,
      date: inj.fixture?.date?.split('T')[0] || '',
    }));

    await setCache('injuries', cacheKey, result, 60 * 60 * 1000);
    return result;
  } catch {
    return [];
  }
}

export async function getLineups(fixtureId, proxyUrl) {
  const cacheKey = `lineups_${fixtureId}`;
  const cached = await getCached('lineups', cacheKey);
  if (cached?.payload) return cached.payload;

  try {
    const data = await rateLimitedFetch(`${proxyUrl}/fixtures/lineups?fixture=${fixtureId}`);
    if (!data.response?.length) return null;

    const result = data.response.map(team => ({
      team: { id: team.team.id, name: team.team.name },
      formation: team.formation,
      coach: team.coach?.name || '',
      startXI: team.startXI.map(p => ({
        id: p.player.id,
        name: p.player.name,
        number: p.player.number,
        pos: p.player.pos,
        grid: p.player.grid,
      })),
      substitutes: team.substitutes.map(p => ({
        id: p.player.id,
        name: p.player.name,
        number: p.player.number,
        pos: p.player.pos,
        grid: p.player.grid,
      })),
    }));

    await setCache('lineups', cacheKey, result, 30 * 60 * 1000);
    return result;
  } catch {
    return null;
  }
}

export async function getMatchEvents(fixtureId, proxyUrl) {
  const cacheKey = `events_${fixtureId}`;
  const cached = await getCached('match_stats', cacheKey);
  if (cached?.payload) return cached.payload;

  try {
    const data = await rateLimitedFetch(`${proxyUrl}/fixtures/events?fixture=${fixtureId}`);
    if (!data.response?.length) return [];

    const result = data.response.map(evt => ({
      time: { elapsed: evt.time.elapsed, extra: evt.time.extra },
      team: { id: evt.team.id, name: evt.team.name },
      player: { id: evt.player.id, name: evt.player.name },
      assist: evt.assist ? { id: evt.assist.id, name: evt.assist.name } : null,
      type: evt.type,
      detail: evt.detail,
    }));

    await setCache('match_stats', cacheKey, result, 6 * 60 * 60 * 1000);
    return result;
  } catch {
    return [];
  }
}

export async function getRecentPlayerStats(playerIds, season, proxyUrl) {
  const results = {};
  const promises = playerIds.slice(0, 10).map(async (id) => {
    const stats = await getPlayerSeasonStats(id, season, proxyUrl);
    if (stats) results[id] = stats;
  });
  await Promise.all(promises);
  return results;
}
