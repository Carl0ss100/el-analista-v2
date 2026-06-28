import { translate, matchTeam } from './teamTranslations';
import { dixonColesProbabilities, estimateLambdas, eloTo1X2, findValueBets, formatModelOutput, getLeagueAvg } from './models';
import { getTeamIdFromCache, setCache, getCached } from './cache';
import { getNationalTeamId } from './nationalTeams';
import { getInjuries, getLineups } from './playerData';
import { parseAllMarkets, parsePlayerProps, formatOddsForAI, formatPlayerPropsForAI } from './oddsParser';
import { rateLimitedFetch } from './fetch';
import { searchOddsApiMatch, analyzeOddsApiMatch, formatOddsApiForAI } from './oddsApi';

async function searchTeamId(teamName, proxyUrl) {
  const nationalTeam = getNationalTeamId(teamName);
  if (nationalTeam) {
    return {
      api_id: nationalTeam.apiId,
      name: teamName,
      league_id: null,
      league_name: null,
      national: true,
      fifaRank: nationalTeam.fifaRank,
      confederation: nationalTeam.confederation,
    };
  }

  const cached = await getTeamIdFromCache(teamName);
  if (cached) return cached;

  const en = translate(teamName);
  const data = await rateLimitedFetch(`${proxyUrl}/teams?search=${encodeURIComponent(en)}`);
  if (!data.response?.length) return null;

  let best = null;
  for (const t of data.response) {
    const score = matchTeam(t.team.name, en);
    if (score >= 2 && (!best || score > best.score)) {
      best = { team: t, score };
    }
  }
  if (!best) return null;

  const entry = {
    api_id: best.team.team.id,
    name: best.team.team.name,
    league_id: best.team.team.league?.id || null,
    league_name: best.team.team.league?.name || null,
    national: best.team.team.national || false,
  };
  await setCache('team_id', best.team.team.name, entry);
  return entry;
}

async function fetchForm(teamId, proxyUrl) {
  const cacheKey = `form_${teamId}`;
  const cached = await getCached('form', cacheKey);
  if (cached?.payload?.length >= 2) return cached.payload;

  const currentYear = new Date().getFullYear();
  const years = [currentYear, currentYear - 1];
  let bestFinished = [];

  for (const year of years) {
    const data = await rateLimitedFetch(`${proxyUrl}/fixtures?team=${teamId}&season=${year}`);
    if (data.errors?.rateLimit || data.errors?.plan) break;

    const finished = (data.response || []).filter(f =>
      f.fixture.status?.short === 'FT' || f.fixture.status?.short === 'AET' || f.fixture.status?.short === 'PEN'
    );

    if (finished.length >= 2) {
      bestFinished = finished;
      break;
    }
    if (finished.length > bestFinished.length) {
      bestFinished = finished;
    }
  }

  if (bestFinished.length >= 1) {
    const result = bestFinished.slice(-10).map(f => {
      const isHome = f.teams.home.id === teamId;
      return {
        goalsFor: isHome ? f.goals.home : f.goals.away,
        goalsAgainst: isHome ? f.goals.away : f.goals.home,
        result: isHome
          ? (f.goals.home > f.goals.away ? 'W' : f.goals.home < f.goals.away ? 'L' : 'D')
          : (f.goals.away > f.goals.home ? 'W' : f.goals.away < f.goals.home ? 'L' : 'D'),
        league: f.league?.name || '',
        fixtureId: f.fixture.id,
        homeId: f.teams.home.id,
        awayId: f.teams.away.id,
      };
    });
    await setCache('form', cacheKey, result, 60 * 60 * 1000);
    return result;
  }
  return [];
}

async function fetchH2H(teamId1, teamId2, proxyUrl) {
  const cacheKey = `h2h_${Math.min(teamId1, teamId2)}_${Math.max(teamId1, teamId2)}`;
  const cached = await getCached('h2h', cacheKey);
  if (cached?.payload) return cached.payload;

  const data = await rateLimitedFetch(`${proxyUrl}/fixtures/headtohead?h2h=${teamId1}-${teamId2}&season=${new Date().getFullYear()}`);
  if (!data.response?.length) return null;

  const result = data.response.map(f => {
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

  await setCache('h2h', cacheKey, result, 6 * 60 * 60 * 1000);
  return result;
}

async function findFixtureId(teamId1, teamId2, proxyUrl, dateStr = null, formFixtures = []) {
  for (const f of formFixtures) {
    if (f.fixtureId && f.homeId && f.awayId) {
      const involvesBoth =
        (f.homeId === teamId1 && f.awayId === teamId2) ||
        (f.homeId === teamId2 && f.awayId === teamId1);
      if (involvesBoth) {
        return { fixtureId: f.fixtureId, league: f.league || '', leagueId: null };
      }
    }
  }

  if (dateStr) {
    const data = await rateLimitedFetch(`${proxyUrl}/fixtures?date=${dateStr}`);
    for (const f of (data.response || [])) {
      if ((f.teams.home.id === teamId1 && f.teams.away.id === teamId2) ||
          (f.teams.home.id === teamId2 && f.teams.away.id === teamId1)) {
        return { fixtureId: f.fixture.id, league: f.league?.name || '', leagueId: f.league?.id || null };
      }
    }
  }

  const nextData = await rateLimitedFetch(`${proxyUrl}/fixtures?team=${teamId1}&next=5`);
  for (const f of (nextData.response || [])) {
    if (f.teams.home.id === teamId2 || f.teams.away.id === teamId2) {
      return { fixtureId: f.fixture.id, league: f.league?.name || '', leagueId: f.league?.id || null };
    }
  }

  return { fixtureId: null, league: '', leagueId: null };
}

async function fetchOdds(fixtureId, proxyUrl) {
  const data = await rateLimitedFetch(`${proxyUrl}/odds?fixture=${fixtureId}`);
  if (!data.response?.length) return null;
  return data.response[0].bookmakers;
}

export async function runAnalysis(team1Name, team2Name, proxyUrl, options = {}) {
  const { dateStr = null, competition = null, userBookmakers = null, oddsApiKey = null } = options;

  const [t1, t2] = await Promise.all([
    searchTeamId(team1Name, proxyUrl),
    searchTeamId(team2Name, proxyUrl),
  ]);

  if (!t1 || !t2) {
    return { error: t1 ? `No se encontró: ${team2Name}` : `No se encontró: ${team1Name}` };
  }

  const nationalTeams = t1.national || t2.national;

  let oddsApiResult = null;
  if (oddsApiKey) {
    const en1 = translate(team1Name);
    const en2 = translate(team2Name);
    oddsApiResult = await searchOddsApiMatch(en1, en2, oddsApiKey, competition);
    if (!oddsApiResult) {
      oddsApiResult = await searchOddsApiMatch(team1Name, team2Name, oddsApiKey, competition);
    }
  }

  if (nationalTeams) {
    const leagueName = competition || 'Copa del Mundo';
    const leagueAvg = getLeagueAvg('World Cup');
    const eloBase1 = t1.fifaRank ? 2100 - t1.fifaRank * 5 : 1500;
    const eloBase2 = t2.fifaRank ? 2100 - t2.fifaRank * 5 : 1500;
    const isNeutralVenue = competition && /world cup|copa del mundo|mundial|euro|nations league|copa america/i.test(competition);
    const homeAdv = isNeutralVenue ? 0 : 65;
    const elo1X2 = eloTo1X2(eloBase1, eloBase2, homeAdv);
    const probs = elo1X2;
    const modelText = formatModelOutput(probs, null, elo1X2);

    let oddsText = '';
    let valueBets = [];
    let oddsApiText = '';
    let oddsApiValueBets = [];
    let dataQuality = 'limited';

    if (oddsApiResult) {
      const analysis = analyzeOddsApiMatch(oddsApiResult, userBookmakers);
      oddsApiText = formatOddsApiForAI(analysis);
      oddsApiValueBets = analysis.valueBets;
      if (analysis.source === 'pinnacle' && analysis.fairProbs1X2) {
        dataQuality = 'good';
      } else if (analysis.source === 'market_average') {
        dataQuality = 'limited';
      }
    }

    let apiFootballOdds = null;
    if (oddsApiResult?.id) {
      try {
        apiFootballOdds = await fetchOdds(oddsApiResult.id, proxyUrl).catch(() => null);
      } catch {}
    }

    if (apiFootballOdds) {
      const parsedMarkets = parseAllMarkets(apiFootballOdds, userBookmakers);
      const playerProps = parsePlayerProps(apiFootballOdds);
      oddsText = formatOddsForAI(parsedMarkets, userBookmakers);
      if (playerProps.length > 0) {
        oddsText += formatPlayerPropsForAI(playerProps);
      }
      valueBets = findValueBets(probs, apiFootballOdds);
    }

    const finalOddsText = oddsApiText + (oddsText ? '\n\n' + oddsText : '');
    const finalValueBets = oddsApiValueBets.length > 0 ? oddsApiValueBets : valueBets;

    return {
      probs,
      h2h: null,
      elo1X2,
      valueBets: finalValueBets,
      modelText,
      oddsText: finalOddsText,
      injuriesText: '',
      lineupsText: '',
      form: { home: [], away: [] },
      lambdas: null,
      league: leagueName,
      leagueAvg,
      fixtureId: null,
      dataQuality,
      nationalTeams: true,
      teams: { team1: t1.name, team2: t2.name },
      injuries: { team1: [], team2: [] },
      lineups: null,
      playerProps: [],
      parsedMarkets: {},
      oddsApiSource: oddsApiResult ? 'odds_api' : 'none',
    };
  }

  const [homeForm, awayForm] = await Promise.all([
    fetchForm(t1.api_id, proxyUrl),
    fetchForm(t2.api_id, proxyUrl),
  ]);

  const allFixtures = [...homeForm, ...awayForm].filter(f => f.fixtureId);
  const { fixtureId, league } = await findFixtureId(t1.api_id, t2.api_id, proxyUrl, dateStr, allFixtures);

  let h2hData = null;
  let oddsData = null;
  let parsedMarkets = {};
  let playerProps = [];
  let oddsText = '';
  let injuries1 = [], injuries2 = [], lineups = null;

  if (fixtureId) {
    const results = await Promise.all([
      fetchH2H(t1.api_id, t2.api_id, proxyUrl).catch(() => null),
      fetchOdds(fixtureId, proxyUrl).catch(() => null),
      getInjuries(t1.api_id, proxyUrl).catch(() => []),
      getInjuries(t2.api_id, proxyUrl).catch(() => []),
      getLineups(fixtureId, proxyUrl).catch(() => null),
    ]);
    h2hData = results[0];
    oddsData = results[1];
    injuries1 = results[2];
    injuries2 = results[3];
    lineups = results[4];
  }

  if (oddsData) {
    parsedMarkets = parseAllMarkets(oddsData, userBookmakers);
    playerProps = parsePlayerProps(oddsData);
    oddsText = formatOddsForAI(parsedMarkets, userBookmakers);
    if (playerProps.length > 0) {
      oddsText += formatPlayerPropsForAI(playerProps);
    }
  }

  let oddsApiText = '';
  let oddsApiValueBets = [];
  if (oddsApiResult) {
    const analysis = analyzeOddsApiMatch(oddsApiResult, userBookmakers);
    oddsApiText = formatOddsApiForAI(analysis);
    oddsApiValueBets = analysis.valueBets;
  }

  const finalOddsText = oddsApiText + (oddsText ? '\n\n' + oddsText : '');

  const leagueName = competition || league || homeForm[0]?.league || awayForm[0]?.league || '';
  const leagueAvg = getLeagueAvg(leagueName);

  const validHome = homeForm.filter(f => !f.upcoming);
  const validAway = awayForm.filter(f => !f.upcoming);
  const hasForm = validHome.length >= 2 && validAway.length >= 2;

  let probs, elo1X2, lambdas;
  let dataQuality = 'none';

  if (hasForm) {
    const homeAvgG = validHome.reduce((s, f) => s + f.goalsFor, 0) / validHome.length;
    const homeAvgC = validHome.reduce((s, f) => s + f.goalsAgainst, 0) / validHome.length;
    const awayAvgG = validAway.reduce((s, f) => s + f.goalsFor, 0) / validAway.length;
    const awayAvgC = validAway.reduce((s, f) => s + f.goalsAgainst, 0) / validAway.length;

    lambdas = estimateLambdas(homeAvgG, awayAvgG, homeAvgC, awayAvgC, leagueAvg);
    probs = dixonColesProbabilities(lambdas.homeLambda, lambdas.awayLambda, -0.1);

    const eloH = 1500 + (validHome.filter(f => f.result === 'W').length - validHome.filter(f => f.result === 'L').length) * 40;
    const eloA = 1500 + (validAway.filter(f => f.result === 'W').length - validAway.filter(f => f.result === 'L').length) * 40;
    elo1X2 = eloTo1X2(eloH, eloA);
    dataQuality = 'good';
  } else {
    elo1X2 = eloTo1X2(1500, 1500);
    probs = elo1X2;
    dataQuality = 'none';
  }

  if (oddsApiResult && dataQuality !== 'good') {
    dataQuality = 'limited';
  }

  const modelText = formatModelOutput(probs, h2hData, elo1X2);

  let valueBets = [];
  if (oddsData) {
    valueBets = findValueBets(probs, oddsData);
  }
  const finalValueBets = oddsApiValueBets.length > 0
    ? [...oddsApiValueBets, ...valueBets.filter(vb =>
        !oddsApiValueBets.some(oav => oav.market === vb.market && oav.selection === vb.selection)
      )]
    : valueBets;

  let injuriesText = '';
  if (injuries1.length > 0 || injuries2.length > 0) {
    injuriesText = '\n\n🏥 LESIONES/SUSPENSIONES:\n';
    if (injuries1.length > 0) {
      injuriesText += `${t1.name}: ${injuries1.map(i => `${i.player} (${i.reason})`).join(', ')}\n`;
    }
    if (injuries2.length > 0) {
      injuriesText += `${t2.name}: ${injuries2.map(i => `${i.player} (${i.reason})`).join(', ')}\n`;
    }
  }

  let lineupsText = '';
  if (lineups) {
    lineupsText = '\n\n📋 ALINEACIONES PROBABLES:\n';
    for (const lu of lineups) {
      lineupsText += `${lu.team.name} (${lu.formation}) - DT: ${lu.coach}\n`;
      lineupsText += `  XI: ${lu.startXI.map(p => p.name).join(', ')}\n`;
    }
  }

  return {
    probs,
    h2h: h2hData,
    elo1X2,
    valueBets: finalValueBets,
    modelText,
    oddsText: finalOddsText,
    injuriesText,
    lineupsText,
    form: { home: homeForm, away: awayForm },
    lambdas,
    league: leagueName,
    leagueAvg,
    fixtureId,
    dataQuality,
    nationalTeams: false,
    teams: { team1: t1.name, team2: t2.name },
    injuries: { team1: injuries1, team2: injuries2 },
    lineups,
    playerProps,
    parsedMarkets,
    oddsApiSource: oddsApiResult ? 'odds_api' : 'none',
  };
}
