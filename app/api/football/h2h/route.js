import { NextResponse } from 'next/server';
import { translate, matchTeam } from '@/lib/teamTranslations';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const team1 = searchParams.get('team1');
  const team2 = searchParams.get('team2');
  if (!team1 || !team2) return NextResponse.json({ error: 'Missing team1 and team2 params' }, { status: 400 });

  const proxyUrl = searchParams.get('proxyUrl') || process.env.PROXY_URL;
  if (!proxyUrl) return NextResponse.json({ error: 'PROXY_URL not configured' }, { status: 500 });

  const en1 = translate(team1);
  const en2 = translate(team2);

  let teamId1 = null, teamId2 = null;

  try {
    const [res1, res2] = await Promise.all([
      fetch(`${proxyUrl}/teams?search=${encodeURIComponent(en1)}`),
      fetch(`${proxyUrl}/teams?search=${encodeURIComponent(en2)}`),
    ]);
    const [data1, data2] = await Promise.all([res1.json(), res2.json()]);

    if (data1.response?.length) {
      const best1 = data1.response.reduce((best, t) => {
        const score = matchTeam(t.team.name, en1);
        return score > best.score ? { id: t.team.id, name: t.team.name, score } : best;
      }, { id: null, name: '', score: 0 });
      if (best1.score >= 2) teamId1 = best1.id;
    }
    if (data2.response?.length) {
      const best2 = data2.response.reduce((best, t) => {
        const score = matchTeam(t.team.name, en2);
        return score > best.score ? { id: t.team.id, name: t.team.name, score } : best;
      }, { id: null, name: '', score: 0 });
      if (best2.score >= 2) teamId2 = best2.id;
    }
  } catch {
    return NextResponse.json({ error: 'Team search failed' }, { status: 500 });
  }

  if (!teamId1 || !teamId2) {
    return NextResponse.json({ error: `No se encontraron IDs para "${team1}" (${teamId1}) / "${team2}" (${teamId2})` }, { status: 404 });
  }

  try {
    const res = await fetch(`${proxyUrl}/fixtures/headtohead?h2h=${teamId1}-${teamId2}&last=15`);
    const data = await res.json();

    if (!data.response?.length) {
      return NextResponse.json({ h2h: [], summary: null });
    }

    let homeWins = 0, draws = 0, awayWins = 0, totalGoals = 0, bttsCount = 0;

    const matches = data.response.map(f => {
      const hg = f.goals.home;
      const ag = f.goals.away;
      const hName = f.teams.home.name;
      const aName = f.teams.away.name;

      const isT1Home = matchTeam(hName, en1) >= 2;
      let winner;
      if (hg > ag) winner = isT1Home ? 'home' : 'away';
      else if (hg < ag) winner = isT1Home ? 'away' : 'home';
      else winner = 'draw';

      if (winner === 'home') homeWins++;
      else if (winner === 'draw') draws++;
      else awayWins++;

      totalGoals += hg + ag;
      if (hg > 0 && ag > 0) bttsCount++;

      return {
        home: hName,
        away: aName,
        homeGoals: hg,
        awayGoals: ag,
        winner,
        goals: hg + ag,
        bothScored: hg > 0 && ag > 0,
        date: f.fixture.date?.split('T')[0] || '',
        competition: f.league?.name || '',
      };
    });

    const summary = {
      total: matches.length,
      team1Wins: homeWins,
      draws,
      team2Wins: awayWins,
      avgGoals: totalGoals > 0 ? +(totalGoals / matches.length).toFixed(1) : 0,
      bttsRate: matches.length > 0 ? +((bttsCount / matches.length) * 100).toFixed(0) : 0,
      over25Rate: matches.length > 0 ? +((matches.filter(m => m.goals > 2).length / matches.length) * 100).toFixed(0) : 0,
    };

    return NextResponse.json({ h2h: matches, summary });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
