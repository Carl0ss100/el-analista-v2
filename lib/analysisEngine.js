import { translate, matchTeam } from './teamTranslations';
import { dixonColesProbabilities, estimateLambdas, eloTo1X2, findValueBets, formatModelOutput, getLeagueAvg } from './models';
import { getTeamIdFromCache, setCache } from './cache';

async function searchTeamId(teamName, proxyUrl) {
  const cached = await getTeamIdFromCache(teamName);
  if (cached) return cached;

  const en = translate(teamName);
  const res = await fetch(`${proxyUrl}/teams?search=${encodeURIComponent(en)}`);
  const data = await res.json();

  if (data.response?.length) {
    for (const t of data.response) {
      if (matchTeam(t.team.name, en) >= 2) {
        const entry = {
          api_id: t.team.id,
          name: t.team.name,
          league_id: t.team.league?.id || null,
          league_name: t.team.league?.name || null,
        };
        await setCache('team_id', t.team.name, entry);
        return entry;
      }
    }
  }
  return null;
}

async function fetchForm(teamId, proxyUrl) {
  const res = await fetch(`${proxyUrl}/fixtures?team=${teamId}&last=5`);
  const data = await res.json();
  return (data.response || []).map(f => {
    const isHome = f.teams.home.id === teamId;
    return {
      goalsFor: isHome ? f.goals.home : f.goals.away,
      goalsAgainst: isHome ? f.goals.away : f.goals.home,
      result: isHome
        ? (f.goals.home > f.goals.away ? 'W' : f.goals.home < f.goals.away ? 'L' : 'D')
        : (f.goals.away > f.goals.home ? 'W' : f.goals.away < f.goals.home ? 'L' : 'D'),
      league: f.league?.name || '',
    };
  });
}

async function fetchH2H(teamId1, teamId2, proxyUrl) {
  const res = await fetch(`${proxyUrl}/fixtures/headtohead?h2h=${teamId1}-${teamId2}&last=15`);
  const data = await res.json();
  if (!data.response?.length) return null;

  return data.response.map(f => {
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

async function findFixtureId(teamId1, teamId2, proxyUrl) {
  for (let offset = -2; offset <= 7; offset++) {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    try {
      const res = await fetch(`${proxyUrl}/fixtures?date=${d.toISOString().split('T')[0]}&team=${teamId1}`);
      const data = await res.json();
      for (const f of (data.response || [])) {
        if (f.teams.home.id === teamId2 || f.teams.away.id === teamId2) {
          return { fixtureId: f.fixture.id, league: f.league?.name || '' };
        }
      }
    } catch {}
  }
  return { fixtureId: null, league: '' };
}

async function fetchOdds(fixtureId, proxyUrl) {
  const res = await fetch(`${proxyUrl}/odds?fixture=${fixtureId}`);
  const data = await res.json();
  if (!data.response?.length) return null;

  return data.response[0].bookmakers.slice(0, 5).map(bm => ({
    name: bm.name,
    bets: bm.bets
      .filter(b => !b.name.toLowerCase().includes('correct score'))
      .map(bet => ({
        name: bet.name,
        values: bet.values.slice(0, 8).map(v => ({ value: v.value, odd: v.odd })),
      })),
  }));
}

export async function runAnalysis(team1Name, team2Name, proxyUrl) {
  const t1 = await searchTeamId(team1Name, proxyUrl);
  const t2 = await searchTeamId(team2Name, proxyUrl);

  if (!t1 || !t2) {
    return { error: t1 ? `No se encontró: ${team2Name}` : `No se encontró: ${team1Name}` };
  }

  const [homeForm, awayForm, h2hData] = await Promise.all([
    fetchForm(t1.api_id, proxyUrl),
    fetchForm(t2.api_id, proxyUrl),
    fetchH2H(t1.api_id, t2.api_id, proxyUrl),
  ]);

  const { fixtureId, league } = await findFixtureId(t1.api_id, t2.api_id, proxyUrl);

  let oddsData = null;
  if (fixtureId) {
    oddsData = await fetchOdds(fixtureId, proxyUrl);
  }

  const leagueName = league || homeForm[0]?.league || '';
  const leagueAvg = getLeagueAvg(leagueName);

  const homeAvgG = homeForm.length > 0 ? homeForm.reduce((s, f) => s + f.goalsFor, 0) / homeForm.length : 1.2;
  const homeAvgC = homeForm.length > 0 ? homeForm.reduce((s, f) => s + f.goalsAgainst, 0) / homeForm.length : 1.0;
  const awayAvgG = awayForm.length > 0 ? awayForm.reduce((s, f) => s + f.goalsFor, 0) / awayForm.length : 1.0;
  const awayAvgC = awayForm.length > 0 ? awayForm.reduce((s, f) => s + f.goalsAgainst, 0) / awayForm.length : 1.1;

  const lambdas = estimateLambdas(homeAvgG, awayAvgG, homeAvgC, awayAvgC, leagueAvg);
  const probs = dixonColesProbabilities(lambdas.homeLambda, lambdas.awayLambda, -0.1);

  const eloH = 1500 + (homeForm.filter(f => f.result === 'W').length - homeForm.filter(f => f.result === 'L').length) * 40;
  const eloA = 1500 + (awayForm.filter(f => f.result === 'W').length - awayForm.filter(f => f.result === 'L').length) * 40;
  const elo1X2 = eloTo1X2(eloH, eloA);

  const modelText = formatModelOutput(probs, h2hData, elo1X2);

  let valueBets = [];
  if (oddsData) {
    valueBets = findValueBets(probs, oddsData);
  }

  return {
    probs,
    h2h: h2hData,
    elo1X2,
    valueBets,
    modelText,
    form: { home: homeForm, away: awayForm },
    lambdas,
    league: leagueName,
    leagueAvg,
    fixtureId,
  };
}
