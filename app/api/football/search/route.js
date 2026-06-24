import { NextResponse } from 'next/server';
import { translate, matchTeam } from '@/lib/teamTranslations';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const team = searchParams.get('team');
  if (!team) return NextResponse.json({ error: 'Missing team param' }, { status: 400 });

  const proxyUrl = searchParams.get('proxyUrl') || process.env.PROXY_URL || settings?.proxyUrl;
  if (!proxyUrl) return NextResponse.json({ error: 'PROXY_URL not configured' }, { status: 500 });

  const searchName = translate(team);
  const allFixtures = [];

  for (let dayOffset = -2; dayOffset < 7 && allFixtures.length < 20; dayOffset++) {
    const date = new Date();
    date.setDate(date.getDate() + dayOffset);
    const dateStr = date.toISOString().split('T')[0];

    try {
      const res = await fetch(`${proxyUrl}/fixtures?date=${dateStr}`);
      const data = await res.json();
      if (data.response?.length) {
        allFixtures.push(...data.response);
      }
    } catch {}
  }

  const scored = allFixtures.map(f => {
    const homeScore = matchTeam(f.teams.home.name, searchName);
    const awayScore = matchTeam(f.teams.away.name, searchName);
    return { fixture: f, score: Math.max(homeScore, awayScore) };
  }).filter(s => s.score >= 2);

  scored.sort((a, b) => b.score - a.score);

  const results = scored.slice(0, 10).map(s => ({
    id: s.fixture.fixture.id,
    home: s.fixture.teams.home.name,
    away: s.fixture.teams.away.name,
    date: s.fixture.fixture.date,
    league: s.fixture.league.name,
    status: s.fixture.fixture.status.short,
    score: s.score
  }));

  return NextResponse.json({ results });
}
