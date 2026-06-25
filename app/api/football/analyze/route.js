import { NextResponse } from 'next/server';
import { translate } from '@/lib/teamTranslations';
import { poissonProbabilities, estimateLambdas, eloTo1X2, findValueBets, formatModelOutput } from '@/lib/models';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const team1 = searchParams.get('team1');
  const team2 = searchParams.get('team2');
  if (!team1 || !team2) return NextResponse.json({ error: 'Missing team1 and team2' }, { status: 400 });

  const proxyUrl = searchParams.get('proxyUrl') || process.env.PROXY_URL;
  if (!proxyUrl) return NextResponse.json({ error: 'PROXY_URL not configured' }, { status: 500 });

  const en1 = translate(team1);
  const en2 = translate(team2);
  let teamId1 = null, teamId2 = null, fixtureId = null;
  let homeForm = [], awayForm = [];

  try {
    const [res1, res2] = await Promise.all([
      fetch(`${proxyUrl}/teams?search=${encodeURIComponent(en1)}`),
      fetch(`${proxyUrl}/teams?search=${encodeURIComponent(en2)}`),
    ]);
    const [data1, data2] = await Promise.all([res1.json(), res2.json()]);

    for (const t of (data1.response || [])) {
      const name = t.team.name.toLowerCase();
      if (name.includes(en1.toLowerCase()) || en1.toLowerCase().includes(name)) { teamId1 = t.team.id; break; }
    }
    for (const t of (data2.response || [])) {
      const name = t.team.name.toLowerCase();
      if (name.includes(en2.toLowerCase()) || en2.toLowerCase().includes(name)) { teamId2 = t.team.id; break; }
    }
  } catch {}

  if (!teamId1 || !teamId2) {
    return NextResponse.json({ error: 'No se encontraron equipos' }, { status: 404 });
  }

  try {
    let fixtureRes;
    for (let offset = -2; offset <= 7; offset++) {
      const d = new Date();
      d.setDate(d.getDate() + offset);
      const dStr = d.toISOString().split('T')[0];
      try {
        const res = await fetch(`${proxyUrl}/fixtures?date=${dStr}&team=${teamId1}`);
        const data = await res.json();
        for (const f of (data.response || [])) {
          if (f.teams.home.id === teamId2 || f.teams.away.id === teamId2) {
            fixtureId = f.fixture.id;
            fixtureRes = f;
            break;
          }
        }
        if (fixtureId) break;
      } catch {}
    }

    if (!fixtureRes) {
      try {
        const nextRes = await fetch(`${proxyUrl}/fixtures?team=${teamId1}&next=5`);
        const nextData = await nextRes.json();
        for (const f of (nextData.response || [])) {
          if (f.teams.home.id === teamId2 || f.teams.away.id === teamId2) {
            fixtureId = f.fixture.id;
            fixtureRes = f;
            break;
          }
        }
      } catch {}
    }

    const lastRes1 = await fetch(`${proxyUrl}/fixtures?team=${teamId1}&last=5`);
    const lastData1 = await lastRes1.json();
    homeForm = (lastData1.response || []).map(f => ({
      goalsFor: f.teams.home.id === teamId1 ? f.goals.home : f.goals.away,
      goalsAgainst: f.teams.home.id === teamId1 ? f.goals.away : f.goals.home,
      result: f.teams.home.id === teamId1
        ? (f.goals.home > f.goals.away ? 'W' : f.goals.home < f.goals.away ? 'L' : 'D')
        : (f.goals.away > f.goals.home ? 'W' : f.goals.away < f.goals.home ? 'L' : 'D'),
    }));

    const lastRes2 = await fetch(`${proxyUrl}/fixtures?team=${teamId2}&last=5`);
    const lastData2 = await lastRes2.json();
    awayForm = (lastData2.response || []).map(f => ({
      goalsFor: f.teams.away.id === teamId2 ? f.goals.away : f.goals.home,
      goalsAgainst: f.teams.away.id === teamId2 ? f.goals.home : f.goals.away,
      result: f.teams.away.id === teamId2
        ? (f.goals.away > f.goals.home ? 'W' : f.goals.away < f.goals.home ? 'L' : 'D')
        : (f.goals.home > f.goals.away ? 'W' : f.goals.home < f.goals.away ? 'L' : 'D'),
    }));
  } catch {}

  const homeAvgGoals = homeForm.length > 0 ? homeForm.reduce((s, f) => s + f.goalsFor, 0) / homeForm.length : 1.2;
  const homeAvgConceded = homeForm.length > 0 ? homeForm.reduce((s, f) => s + f.goalsAgainst, 0) / homeForm.length : 1.0;
  const awayAvgGoals = awayForm.length > 0 ? awayForm.reduce((s, f) => s + f.goalsFor, 0) / awayForm.length : 1.0;
  const awayAvgConceded = awayForm.length > 0 ? awayForm.reduce((s, f) => s + f.goalsAgainst, 0) / awayForm.length : 1.1;

  const lambdas = estimateLambdas(homeAvgGoals, awayAvgGoals, homeAvgConceded, awayAvgConceded);
  const poisson = poissonProbabilities(lambdas.homeLambda, lambdas.awayLambda);

  const eloHome = 1500 + (homeForm.filter(f => f.result === 'W').length - homeForm.filter(f => f.result === 'L').length) * 40;
  const eloAway = 1500 + (awayForm.filter(f => f.result === 'W').length - awayForm.filter(f => f.result === 'L').length) * 40;
  const elo1X2 = eloTo1X2(eloHome, eloAway);

  let h2hData = null;
  try {
    const h2hRes = await fetch(`${proxyUrl}/fixtures/headtohead?h2h=${teamId1}-${teamId2}&last=10`);
    const h2hJson = await h2hRes.json();
    if (h2hJson.response?.length) {
      h2hData = h2hJson.response.map(f => {
        const hg = f.goals.home, ag = f.goals.away;
        const isT1Home = f.teams.home.id === teamId1;
        let winner;
        if (hg > ag) winner = isT1Home ? 'home' : 'away';
        else if (hg < ag) winner = isT1Home ? 'away' : 'home';
        else winner = 'draw';
        return {
          home: f.teams.home.name, away: f.teams.away.name,
          homeGoals: hg, awayGoals: ag, winner,
          goals: hg + ag, bothScored: hg > 0 && ag > 0,
          date: f.fixture.date?.split('T')[0] || '',
          competition: f.league?.name || '',
        };
      });
    }
  } catch {}

  let oddsData = null;
  let valueBets = [];
  if (fixtureId) {
    try {
      const oddsRes = await fetch(`${proxyUrl}/odds?fixture=${fixtureId}`);
      const oddsJson = await oddsRes.json();
      if (oddsJson.response?.length) {
        oddsData = oddsJson.response[0].bookmakers.slice(0, 5).map(bm => ({
          name: bm.name,
          bets: bm.bets.filter(b => !b.name.toLowerCase().includes('correct score'))
            .map(bet => ({ name: bet.name, values: bet.values.slice(0, 8).map(v => ({ value: v.value, odd: v.odd })) })),
        }));
        valueBets = findValueBets(poisson, oddsData);
      }
    } catch {}
  }

  const modelText = formatModelOutput(poisson, h2hData, elo1X2);

  return NextResponse.json({
    poisson,
    elo: { home: eloHome, away: eloAway, '1X2': elo1X2 },
    h2h: h2hData,
    h2hSummary: h2hData ? {
      total: h2hData.length,
      team1Wins: h2hData.filter(h => h.winner === 'home').length,
      draws: h2hData.filter(h => h.winner === 'draw').length,
      team2Wins: h2hData.filter(h => h.winner === 'away').length,
      avgGoals: +(h2hData.reduce((s, h) => s + h.goals, 0) / h2hData.length).toFixed(1),
      bttsRate: +((h2hData.filter(h => h.bothScored).length / h2hData.length) * 100).toFixed(0),
    } : null,
    form: { home: homeForm, away: awayForm },
    lambdas,
    odds: oddsData,
    valueBets,
    modelText,
  });
}
