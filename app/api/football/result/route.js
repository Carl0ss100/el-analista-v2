import { NextResponse } from 'next/server';
import { translate, matchTeam } from '@/lib/teamTranslations';

const FD_BASE = 'https://api.football-data.org/v4';

async function searchApiFootball(proxyUrl, team1, team2) {
  const en1 = translate(team1);
  const en2 = team2 ? translate(team2) : '';
  const allMatches = [];

  for (let i = 0; i < 14; i++) {
    const date = new Date(Date.now() - i * 86400000).toISOString().split('T')[0];
    try {
      const res = await fetch(`${proxyUrl}/fixtures?date=${date}`);
      const data = await res.json();
      if (!data.response?.length) continue;

      for (const f of data.response) {
        if (f.goals.home === null || f.goals.away === null) continue;
        const homeScore = matchTeam(f.teams.home.name, en1) + (en2 ? matchTeam(f.teams.away.name, en2) : 0);
        const awayScore = matchTeam(f.teams.away.name, en1) + (en2 ? matchTeam(f.teams.home.name, en2) : 0);
        const score = Math.max(homeScore, awayScore);
        if (score >= 2) allMatches.push({ match: f, score });
      }
    } catch {}
  }

  if (allMatches.length === 0) return null;

  allMatches.sort((a, b) => b.score - a.score);
  const best = allMatches[0].match;
  const status = best.fixture.status.short;

  return {
    home: best.teams.home.name,
    away: best.teams.away.name,
    goalsHome: best.goals.home,
    goalsAway: best.goals.away,
    status,
    league: best.league.name,
    score: `${best.teams.home.name} ${best.goals.home} - ${best.goals.away} ${best.teams.away.name}`,
    finished: ['FT','AET','PEN','WO','AW'].includes(status),
    date: best.fixture.date,
    fixtureId: best.fixture.id,
    alternatives: allMatches.slice(1, 4).map(a => ({
      home: a.match.teams.home.name,
      away: a.match.teams.away.name,
      score: `${a.match.teams.home.name} ${a.match.goals.home} - ${a.match.goals.away} ${a.match.teams.away.name}`,
      league: a.match.league.name
    }))
  };
}

async function searchFootballData(token, team1, team2) {
  if (!token) return null;
  const en1 = translate(team1);
  const en2 = team2 ? translate(team2) : '';
  const now = new Date();
  const from = new Date(now.getTime() - 14 * 86400000).toISOString().split('T')[0];
  const to = now.toISOString().split('T')[0];

  try {
    const res = await fetch(`${FD_BASE}/matches?status=FINISHED&dateFrom=${from}&dateTo=${to}`, {
      headers: { 'X-Auth-Token': token }
    });
    if (!res.ok) return null;
    const data = await res.json();

    let bestMatch = null, bestScore = 0;
    for (const m of (data.matches || [])) {
      const homeScore = matchTeam(m.homeTeam.name, en1) + (en2 ? matchTeam(m.awayTeam.name, en2) : 0);
      const awayScore = matchTeam(m.awayTeam.name, en1) + (en2 ? matchTeam(m.homeTeam.name, en2) : 0);
      const maxScore = Math.max(homeScore, awayScore);
      if (maxScore >= 2 && maxScore > bestScore) {
        bestScore = maxScore;
        bestMatch = m;
      }
    }

    if (!bestMatch) return null;
    return {
      home: bestMatch.homeTeam.name,
      away: bestMatch.awayTeam.name,
      goalsHome: bestMatch.score.fullTime.home,
      goalsAway: bestMatch.score.fullTime.away,
      status: 'FT',
      league: bestMatch.competition?.name || '',
      score: `${bestMatch.homeTeam.name} ${bestMatch.score.fullTime.home} - ${bestMatch.score.fullTime.away} ${bestMatch.awayTeam.name}`,
      finished: true,
      date: bestMatch.utcDate
    };
  } catch {
    return null;
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const team1 = searchParams.get('team1');
  const team2 = searchParams.get('team2');
  if (!team1) return NextResponse.json({ error: 'Missing team1 param' }, { status: 400 });

  const proxyUrl = searchParams.get('proxyUrl') || process.env.PROXY_URL;
  const fdToken = searchParams.get('xAuthToken') || process.env.FOOTBALL_DATA_TOKEN;

  let result = null;
  if (proxyUrl) {
    result = await searchApiFootball(proxyUrl, team1, team2);
  }
  if (!result && fdToken) {
    result = await searchFootballData(fdToken, team1, team2);
  }
  if (!result) {
    return NextResponse.json({ error: `Partido no encontrado para "${team1}" vs "${team2 || ''}"` }, { status: 404 });
  }

  return NextResponse.json(result);
}
