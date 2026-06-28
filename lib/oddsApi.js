const ODDS_API_BASE = 'https://api.the-odds-api.com/v4';

const SHARP_BOOK = 'pinnacle';

const VALUE_BOOKS = [
  'betfair_ex_eu', 'williamhill', 'unibet_fr', 'unibet_nl', 'unibet_se',
  'betsson', 'marathonbet', 'nordicbet', 'codere_it', 'tipico_de',
  'matchbook', 'leovegas_se', 'sport888', 'betonlineag', 'coolbet',
  'betclic_fr', 'suprabets', 'everygame', 'onexbet', 'winamax_fr', 'gtbets',
];

const BOOK_NAMES = {
  pinnacle: 'Pinnacle', betfair_ex_eu: 'Betfair Exchange', williamhill: 'William Hill',
  unibet_fr: 'Unibet', unibet_nl: 'Unibet', unibet_se: 'Unibet',
  betsson: 'Betsson', marathonbet: 'Marathonbet', nordicbet: 'NordicBet',
  codere_it: 'Codere', tipico_de: 'Tipico', matchbook: 'Matchbook',
  leovegas_se: 'LeoVegas', sport888: '888sport', betonlineag: 'BetOnline',
  coolbet: 'Coolbet', betclic_fr: 'Betclic', suprabets: 'Suprabets',
  everygame: 'Everygame', onexbet: '1xBet', winamax_fr: 'Winamax',
  gtbets: 'GTbets', pmu_fr: 'PMU', bet365: 'Bet365',
  betvivo: 'BetVivo', veikkaus: 'Veikkaus',
};

const SOCCER_LEAGUES = [
  'soccer_epl', 'soccer_spain_la_liga', 'soccer_italy_serie_a',
  'soccer_germany_bundesliga', 'soccer_france_ligue_one',
  'soccer_portugal_primeira_liga', 'soccer_netherlands_eredivisie',
  'soccer_turkish_super_league', 'soccer_belgium_first_div',
  'soccer_scottish_premiership', 'soccer_uefa_champs_league',
  'soccer_uefa_europa_league', 'soccer_uefa_conference_league',
  'soccer_spain_segunda_division', 'soccer_england_league_one',
  'soccer_england_league_two', 'soccer_efl_champ',
  'soccer_usa_mls', 'soccer_brazil_campeonato',
  'soccer_brazil_serie_b', 'soccer_argentina_primera_nacional',
  'soccer_mexico_ligamx', 'soccer_japan_j_league',
  'soccer_fifa_world_cup', 'soccer_conmebol_copa_libertadores',
  'soccer_conmebol_copa_sudamericana', 'soccer_germany_dfb_pokal',
  'soccer_england_efl_cup', 'soccer_china_superleague',
  'soccer_korea_kleague1', 'soccer_finland_veikkausliiga',
  'soccer_league_of_ireland', 'soccer_norway_eliteserien',
  'soccer_sweden_allsvenskan', 'soccer_sweden_superettan',
];

const LEAGUE_LABELS = {
  soccer_epl: 'Premier League', soccer_spain_la_liga: 'La Liga',
  soccer_italy_serie_a: 'Serie A', soccer_germany_bundesliga: 'Bundesliga',
  soccer_france_ligue_one: 'Ligue 1', soccer_portugal_primeira_liga: 'Primeira Liga',
  soccer_netherlands_eredivisie: 'Eredivisie', soccer_turkish_super_league: 'Super Lig',
  soccer_belgium_first_div: 'Pro League', soccer_scottish_premiership: 'Premiership',
  soccer_uefa_champs_league: 'Champions League', soccer_uefa_europa_league: 'Europa League',
  soccer_uefa_conference_league: 'Conference League',
  soccer_spain_segunda_division: 'La Liga 2', soccer_efl_champ: 'Championship',
  soccer_usa_mls: 'MLS', soccer_brazil_campeonato: 'Brasileirao',
  soccer_brazil_serie_b: 'Brasileirao B', soccer_argentina_primera_nacional: 'Primera Division',
  soccer_mexico_ligamx: 'Liga MX', soccer_japan_j_league: 'J-League',
  soccer_fifa_world_cup: 'Copa del Mundo FIFA', soccer_conmebol_copa_libertadores: 'Copa Libertadores',
  soccer_conmebol_copa_sudamericana: 'Copa Sudamericana', soccer_germany_dfb_pokal: 'DFB-Pokal',
  soccer_england_efl_cup: 'EFL Cup', soccer_china_superleague: 'Super League China',
  soccer_korea_kleague1: 'K League 1', soccer_finland_veikkausliiga: 'Veikkausliiga',
  soccer_league_of_ireland: 'League of Ireland', soccer_norway_eliteserien: 'Eliteserien',
  soccer_sweden_allsvenskan: 'Allsvenskan', soccer_sweden_superettan: 'Superettan',
};

const TEAM_ALIASES_ODDS_API = {
  'Tottenham Hotspur': ['Tottenham', 'Spurs'],
  'Manchester United': ['Man United', 'Man Utd', 'MU'],
  'Manchester City': ['Man City', 'MCFC'],
  'Wolverhampton Wanderers': ['Wolves', 'Wolverhampton'],
  'Newcastle United': ['Newcastle', 'Newcastle Utd'],
  'Nottingham Forest': ['Nottm Forest'],
  'Aston Villa': ['Villa'],
  'Brighton and Hove Albion': ['Brighton'],
  'Leicester City': ['Leicester'],
  'Crystal Palace': ['Palace'],
  'West Ham United': ['West Ham', 'WHU'],
  'Borussia Dortmund': ['Dortmund'],
  'Borussia Monchengladbach': ['Gladbach', 'Monchengladbach'],
  'Bayern Munich': ['Bayern'],
  'Paris Saint Germain': ['PSG', 'Paris SG'],
  'Inter Miami': ['Inter Miami CF'],
  'Real Sociedad': ['Sociedad'],
  'Atletico Madrid': ['Atletico'],
  'Athletic Bilbao': ['Athletic Club', 'Athletic'],
  'Celta Vigo': ['Celta'],
  'Real Betis': ['Betis'],
  'Deportivo Alaves': ['Alaves'],
  'Rayo Vallecano': ['Rayo'],
  'Villarreal': ['Villarreal CF'],
  'Barcelona': ['Barca'],
  'Bayern München': ['Bayern Munich', 'Bayern'],
  'Sporting CP': ['Sporting Lisbon', 'Sporting'],
  'SL Benfica': ['Benfica'],
  'FC Porto': ['Porto'],
  'RSC Anderlecht': ['Anderlecht'],
  'Club Brugge': ['Brugge', 'Club Brugge KV'],
  'Ivory Coast': ['Cote d\'Ivoire', 'Costa de Marfil'],
  'Cape Verde': ['Cabo Verde', 'Cape Verde Islands'],
  'Bosnia & Herzegovina': ['Bosnia', 'Bosnia Herzegovina', 'Bosnia-Herzegovina'],
  'United States': ['USA', 'USMNT', 'Estados Unidos'],
  'South Korea': ['Korea Republic', 'Corea del Sur'],
  'North Korea': ['DPR Korea', 'Korea DPR'],
  'Republic of Ireland': ['Ireland', 'Irlanda'],
  'Czech Republic': ['Czechia', 'Chequia', 'Rep Checa'],
  'Turkey': ['Turkiye', 'Turquia'],
  'Russia': ['Rusia'],
  'China PR': ['China', 'China PR'],
  'Curacao': ['Curazao'],
  'South Africa': ['SudAfrica'],
};

function normalizeTeamName(name) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function matchOddsApiTeam(oddsApiTeam, searchName) {
  const normA = normalizeTeamName(oddsApiTeam);
  const normB = normalizeTeamName(searchName);
  if (normA === normB) return 3;
  if (normA.includes(normB) || normB.includes(normA)) return 2;
  const aliases = TEAM_ALIASES_ODDS_API[oddsApiTeam] || [];
  for (const alias of aliases) {
    const normAlias = normalizeTeamName(alias);
    if (normAlias === normB || normAlias.includes(normB) || normB.includes(normAlias)) return 2;
  }
  const wordsA = normA.split(/(?=[a-z])/).filter(w => w.length >= 3);
  const wordsB = normB.split(/(?=[a-z])/).filter(w => w.length >= 3);
  const overlap = wordsA.filter(w => wordsB.includes(w)).length;
  if (overlap > 0 && (overlap / Math.max(wordsA.length, wordsB.length)) >= 0.5) return 1;
  return 0;
}

function removeVig(decimalOddsList) {
  const implied = decimalOddsList.map(o => 1 / o).filter((_, i) => decimalOddsList[i] > 1);
  if (implied.length !== decimalOddsList.length) return [];
  const total = implied.reduce((a, b) => a + b, 0);
  return implied.map(p => p / total);
}

function calcEV(trueProb, decimalOdds) {
  return (trueProb * decimalOdds) - 1;
}

export async function fetchOddsApiLeague(leagueKey, apiKey) {
  if (!apiKey) return [];
  try {
    const url = `${ODDS_API_BASE}/sports/${leagueKey}/odds/?apiKey=${apiKey}&regions=eu&markets=h2h,totals,spreads&oddsFormat=decimal&dateFormat=iso`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) {
      if (res.status === 422 || res.status === 404) return [];
      console.error(`Odds-API ${leagueKey}: error ${res.status}`);
      return [];
    }
    const remaining = res.headers.get('x-requests-remaining');
    const games = await res.json();
    console.log(`Odds-API ${leagueKey}: ${games.length} partidos (${remaining} credits restantes)`);
    return games;
  } catch (e) {
    console.error(`Odds-API ${leagueKey}: ${e.message}`);
    return [];
  }
}

export function findMatchInOddsApi(games, team1, team2) {
  for (const game of games) {
    const s1 = matchOddsApiTeam(game.home_team, team1) + matchOddsApiTeam(game.away_team, team2);
    const s2 = matchOddsApiTeam(game.home_team, team2) + matchOddsApiTeam(game.away_team, team1);
    const score = Math.max(s1, s2);
    if (score >= 4) {
      const swapped = s2 > s1;
      return {
        id: game.id,
        home: swapped ? game.away_team : game.home_team,
        away: swapped ? game.home_team : game.away_team,
        commence: game.commence_time,
        bookmakers: game.bookmakers || [],
      };
    }
  }
  return null;
}

const NATIONAL_TEAM_COUNTRIES = new Set([
  'argentina','brazil','colombia','uruguay','chile','peru','paraguay','bolivia','venezuela','ecuador',
  'france','germany','spain','italy','england','portugal','netherlands','belgium','croatia','serbia',
  'switzerland','denmark','sweden','norway','poland','austria','czech republic','wales','scotland',
  'ireland','turkey','russia','ukraine','romania','hungary','greece',
  'usa','mexico','canada','costa rica','panama','jamaica','honduras',
  'japan','south korea','australia','china','india','iran','saudi arabia','qatar',
  'morocco','nigeria','cameroon','senegal','ghana','tunisia','egypt','algeria','south africa',
  'ivory coast','cape verde','bosnia','paraguay','bosnia and herzegovina',
]);

const COMPETITION_LEAGUE_MAP = {
  'world cup': ['soccer_fifa_world_cup'],
  'copa del mundo': ['soccer_fifa_world_cup'],
  'mundial': ['soccer_fifa_world_cup'],
  'champions league': ['soccer_uefa_champs_league'],
  'champions': ['soccer_uefa_champs_league'],
  'europa league': ['soccer_uefa_europa_league'],
  'europa': ['soccer_uefa_europa_league'],
  'conference league': ['soccer_uefa_conference_league'],
  'conference': ['soccer_uefa_conference_league'],
  'libertadores': ['soccer_conmebol_copa_libertadores'],
  'sudamericana': ['soccer_conmebol_copa_sudamericana'],
};

const DOMESTIC_KEYWORDS = {
  'premier': 'soccer_epl', 'inglaterra': 'soccer_epl', 'england': 'soccer_epl',
  'la liga': 'soccer_spain_la_liga', 'españa': 'soccer_spain_la_liga', 'spain': 'soccer_spain_la_liga',
  'serie a': 'soccer_italy_serie_a', 'italia': 'soccer_italy_serie_a', 'italy': 'soccer_italy_serie_a',
  'bundesliga': 'soccer_germany_bundesliga', 'alemania': 'soccer_germany_bundesliga', 'germany': 'soccer_germany_bundesliga',
  'ligue 1': 'soccer_france_ligue_one', 'francia': 'soccer_france_ligue_one', 'france': 'soccer_france_ligue_one',
  'primeira liga': 'soccer_portugal_primeira_liga', 'portugal': 'soccer_portugal_primeira_liga',
  'eredivisie': 'soccer_netherlands_eredivisie', 'paises bajos': 'soccer_netherlands_eredivisie', 'netherlands': 'soccer_netherlands_eredivisie',
  'mls': 'soccer_usa_mls', 'usa': 'soccer_usa_mls',
  'brasileirao': 'soccer_brazil_campeonato', 'brasil': 'soccer_brazil_campeonato', 'brazil': 'soccer_brazil_campeonato',
  'liga mx': 'soccer_mexico_ligamx', 'mexico': 'soccer_mexico_ligamx',
  'j-league': 'soccer_japan_j_league', 'japon': 'soccer_japan_j_league', 'japan': 'soccer_japan_j_league',
};

const PRIORITY_LEAGUES = [
  'soccer_fifa_world_cup', 'soccer_uefa_champs_league', 'soccer_uefa_europa_league',
  'soccer_conmebol_copa_libertadores', 'soccer_epl', 'soccer_spain_la_liga',
  'soccer_italy_serie_a', 'soccer_germany_bundesliga', 'soccer_france_ligue_one',
];

const REMAINING_LEAGUES = SOCCER_LEAGUES.filter(l => !PRIORITY_LEAGUES.includes(l));

export async function searchOddsApiMatch(team1, team2, apiKey, competition = null) {
  if (!apiKey) return null;
  const t1low = team1.toLowerCase();
  const t2low = team2.toLowerCase();
  const isNational = NATIONAL_TEAM_COUNTRIES.has(t1low) || NATIONAL_TEAM_COUNTRIES.has(t2low);

  let orderedLeagues = [...PRIORITY_LEAGUES, ...REMAINING_LEAGUES];

  if (competition) {
    const compLow = competition.toLowerCase();
    for (const [keyword, leagues] of Object.entries(COMPETITION_LEAGUE_MAP)) {
      if (compLow.includes(keyword)) {
        orderedLeagues = [...leagues, ...orderedLeagues.filter(l => !leagues.includes(l))];
        break;
      }
    }
    for (const [keyword, leagueKey] of Object.entries(DOMESTIC_KEYWORDS)) {
      if (compLow.includes(keyword)) {
        orderedLeagues = [leagueKey, ...orderedLeagues.filter(l => l !== leagueKey)];
        break;
      }
    }
  }

  if (isNational) {
    if (!orderedLeagues.includes('soccer_fifa_world_cup')) {
      orderedLeagues = ['soccer_fifa_world_cup', ...orderedLeagues];
    }
    if (!competition) {
      orderedLeagues = [
        'soccer_fifa_world_cup',
        'soccer_uefa_champs_league',
        ...orderedLeagues.filter(l => l !== 'soccer_fifa_world_cup' && l !== 'soccer_uefa_champs_league'),
      ];
    }
  }

  let bestMatch = null;
  let bestScore = 0;
  let apiCalls = 0;
  const MAX_API_CALLS = 8;

  for (const leagueKey of orderedLeagues) {
    if (apiCalls >= MAX_API_CALLS) break;
    const games = await fetchOddsApiLeague(leagueKey, apiKey);
    apiCalls++;
    for (const game of games) {
      const s1 = matchOddsApiTeam(game.home_team, team1) + matchOddsApiTeam(game.away_team, team2);
      const s2 = matchOddsApiTeam(game.home_team, team2) + matchOddsApiTeam(game.away_team, team1);
      const score = Math.max(s1, s2);
      if (score > bestScore && score >= 4) {
        bestScore = score;
        const swapped = s2 > s1;
        bestMatch = {
          id: game.id,
          home: swapped ? game.away_team : game.home_team,
          away: swapped ? game.home_team : game.away_team,
          commence: game.commence_time,
          bookmakers: game.bookmakers || [],
          leagueKey,
        };
      }
      if (bestScore >= 6) break;
    }
    if (bestScore >= 4) break;
  }

  return bestMatch;
}

export function analyzeOddsApiMatch(match, userBookmakers) {
  const bmMap = {};
  for (const bm of (match.bookmakers || [])) {
    bmMap[bm.key] = bm;
  }

  if (SHARP_BOOK in bmMap) {
    return analyzeWithPinnacle(match, bmMap, userBookmakers);
  }
  return analyzeWithModelFallback(match, bmMap, userBookmakers);
}

function analyzeWithPinnacle(match, bmMap, userBookmakers) {
  const pin = bmMap[SHARP_BOOK];
  const pinMarkets = {};
  for (const mkt of (pin.markets || [])) {
    pinMarkets[mkt.key] = mkt.outcomes;
  }

  const valueBets = [];

  if ('h2h' in pinMarkets) {
    const outcomes = pinMarkets['h2h'];
    const pinOdds = {};
    for (const o of outcomes) pinOdds[o.name] = o.price;

    const homeName = match.home;
    const awayName = match.away;
    const drawKey = Object.keys(pinOdds).find(k => k.toLowerCase() === 'draw');
    const hasDraw = !!drawKey;
    const order = hasDraw
      ? [homeName, drawKey, awayName]
      : [homeName, awayName];
    const odds = order.map(k => pinOdds[k]);
    const fairProbs = removeVig(odds);

    if (fairProbs.length === order.length) {
      for (const bookKey of VALUE_BOOKS) {
        if (!(bookKey in bmMap)) continue;
        const bm = bmMap[bookKey];
        const bmMkts = {};
        for (const m of (bm.markets || [])) bmMkts[m.key] = m.outcomes;
        if (!('h2h' in bmMkts)) continue;
        const bmOdds = {};
        for (const o of bmMkts['h2h']) bmOdds[o.name] = o.price;

        for (let i = 0; i < order.length; i++) {
          const sel = order[i];
          if (sel in bmOdds) {
            const evVal = calcEV(fairProbs[i], bmOdds[sel]);
            if (evVal > 0) {
              const label = i === 0 ? 'Local' : (hasDraw && i === 1 ? 'Empate' : 'Visitante');
              valueBets.push({
                market: '1X2',
                selection: `${label} (${sel})`,
                bookmaker: BOOK_NAMES[bookKey] || bookKey,
                bookKey,
                odds: bmOdds[sel],
                fairProb: fairProbs[i],
                ev: evVal,
                pinOdds: pinOdds[sel],
                source: 'pinnacle',
              });
            }
          }
        }
      }

      if (userBookmakers) {
        for (const bk of userBookmakers) {
          const normBk = bk.toLowerCase().replace(/[^a-z0-9]/g, '');
          if (normBk in bmMap) continue;
          for (const [key, bm] of Object.entries(bmMap)) {
            if (bm.title?.toLowerCase().includes(normBk) || key.toLowerCase().includes(normBk)) {
              const bmMkts = {};
              for (const m of (bm.markets || [])) bmMkts[m.key] = m.outcomes;
              if (!('h2h' in bmMkts)) continue;
              const bmOdds = {};
              for (const o of bmMkts['h2h']) bmOdds[o.name] = o.price;
              for (let i = 0; i < order.length; i++) {
                const sel = order[i];
                if (sel in bmOdds) {
                  const evVal = calcEV(fairProbs[i], bmOdds[sel]);
                  if (evVal > 0) {
                    const label = i === 0 ? 'Local' : (hasDraw && i === 1 ? 'Empate' : 'Visitante');
                    valueBets.push({
                      market: '1X2',
                      selection: `${label} (${sel})`,
                      bookmaker: bm.title || key,
                      bookKey: key,
                      odds: bmOdds[sel],
                      fairProb: fairProbs[i],
                      ev: evVal,
                      pinOdds: pinOdds[sel],
                      source: 'pinnacle',
                    });
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  if ('totals' in pinMarkets) {
    const pinLines = {};
    for (const o of pinMarkets['totals']) {
      const line = o.point ?? 2.5;
      pinLines[line] = pinLines[line] || {};
      pinLines[line][o.name] = o.price;
    }

    for (const [line, sides] of Object.entries(pinLines)) {
      if (!('Over' in sides) || !('Under' in sides)) continue;
      const fairProbs = removeVig([sides.Over, sides.Under]);
      if (!fairProbs.length) continue;
      const [fairOver, fairUnder] = fairProbs;

      for (const bookKey of VALUE_BOOKS) {
        if (!(bookKey in bmMap)) continue;
        const bm = bmMap[bookKey];
        const bmMkts = {};
        for (const m of (bm.markets || [])) bmMkts[m.key] = m.outcomes;
        if (!('totals' in bmMkts)) continue;
        const bmLines = {};
        for (const o of bmMkts['totals']) {
          const l = o.point ?? 2.5;
          bmLines[l] = bmLines[l] || {};
          bmLines[l][o.name] = o.price;
        }
        if (!(line in bmLines)) continue;
        for (const [name, fairP] of [['Over', fairOver], ['Under', fairUnder]]) {
          if (name in bmLines[line]) {
            const evVal = calcEV(fairP, bmLines[line][name]);
            if (evVal > 0) {
              valueBets.push({
                market: `O/U ${line}`,
                selection: `${name} ${line}`,
                bookmaker: BOOK_NAMES[bookKey] || bookKey,
                bookKey,
                odds: bmLines[line][name],
                fairProb: fairP,
                ev: evVal,
                pinOdds: sides[name],
                source: 'pinnacle',
              });
            }
          }
        }
      }
    }
  }

  if ('spreads' in pinMarkets) {
    const pinSpreads = {};
    for (const o of pinMarkets['spreads']) {
      const line = o.point ?? 0;
      pinSpreads[line] = pinSpreads[line] || {};
      pinSpreads[line][o.name] = o.price;
    }

    for (const [line, sides] of Object.entries(pinSpreads)) {
      const homeName = match.home;
      const awayName = match.away;
      if (!(homeName in sides) || !(awayName in sides)) continue;
      const fairProbs = removeVig([sides[homeName], sides[awayName]]);
      if (!fairProbs.length) continue;
      const fairHomeH = fairProbs[0];
      const fairAwayH = fairProbs[1];

      for (const bookKey of VALUE_BOOKS) {
        if (!(bookKey in bmMap)) continue;
        const bm = bmMap[bookKey];
        const bmMkts = {};
        for (const m of (bm.markets || [])) bmMkts[m.key] = m.outcomes;
        if (!('spreads' in bmMkts)) continue;
        const bmSpreads = {};
        for (const o of bmMkts['spreads']) {
          const l = o.point ?? 0;
          bmSpreads[l] = bmSpreads[l] || {};
          bmSpreads[l][o.name] = o.price;
        }
        if (!(line in bmSpreads)) continue;
        const sign = parseFloat(line) > 0 ? `+${line}` : `${line}`;
        for (const [name, fairP] of [[homeName, fairHomeH], [awayName, fairAwayH]]) {
          if (name in bmSpreads[line]) {
            const evVal = calcEV(fairP, bmSpreads[line][name]);
            if (evVal > 0) {
              const label = name === homeName ? `Local (${sign})` : `Visitante (${parseFloat(line) > 0 ? '-' + line.replace('+', '') : '+' + Math.abs(parseFloat(line))})`;
              valueBets.push({
                market: `Hándicap Asiático ${sign}`,
                selection: label,
                bookmaker: BOOK_NAMES[bookKey] || bookKey,
                bookKey,
                odds: bmSpreads[line][name],
                fairProb: fairP,
                ev: evVal,
                pinOdds: sides[name],
                source: 'pinnacle',
              });
            }
          }
        }
      }
    }
  }

  const seen = {};
  const allBooksWithValue = {};
  for (const bet of valueBets) {
    const key = `${bet.market}|${bet.selection}`;
    const bookLabel = BOOK_NAMES[bet.bookKey] || bet.bookmaker;
    allBooksWithValue[key] = allBooksWithValue[key] || [];
    allBooksWithValue[key].push(`${bookLabel} ${bet.odds.toFixed(2)}`);
    if (!(key in seen) || bet.ev > seen[key].ev) {
      seen[key] = { ...bet, allBooks: [] };
    }
  }
  for (const key of Object.keys(seen)) {
    seen[key].allBooks = allBooksWithValue[key] || [];
  }

  const deduped = Object.values(seen).sort((a, b) => b.ev - a.ev);

  const h2h = pinMarkets.h2h;
  let fairProbs1X2 = null;
  let pinOdds1X2 = null;
  if (h2h) {
    const pinOdds = {};
    for (const o of h2h) pinOdds[o.name] = o.price;
    const homeName = match.home;
    const awayName = match.away;
    const drawKey = Object.keys(pinOdds).find(k => k.toLowerCase() === 'draw');
    const hasDraw = !!drawKey;
    const order = hasDraw ? [homeName, drawKey, awayName] : [homeName, awayName];
    const odds = order.map(k => pinOdds[k]);
    const fp = removeVig(odds);
    if (fp.length === order.length) {
      fairProbs1X2 = {};
      for (let i = 0; i < order.length; i++) fairProbs1X2[order[i]] = fp[i];
      pinOdds1X2 = pinOdds;
    }
  }

  return {
    source: 'pinnacle',
    fairProbs1X2,
    pinOdds1X2,
    valueBets: deduped,
    match,
    bookmakers: match.bookmakers,
  };
}

function analyzeWithModelFallback(match, bmMap, userBookmakers) {
  const allOdds = {};
  for (const bm of Object.values(bmMap)) {
    for (const mkt of (bm.markets || [])) {
      if (mkt.key === 'h2h') {
        for (const o of mkt.outcomes) {
          if (!allOdds[o.name]) allOdds[o.name] = [];
          allOdds[o.name].push({ book: bm.title || bm.key, odds: o.price });
        }
      }
    }
  }

  const bestOdds = {};
  for (const [sel, offers] of Object.entries(allOdds)) {
    offers.sort((a, b) => b.odds - a.odds);
    bestOdds[sel] = offers[0];
  }

  return {
    source: 'market_average',
    fairProbs1X2: null,
    pinOdds1X2: null,
    valueBets: [],
    match,
    bestOdds,
    bookmakers: match.bookmakers,
  };
}

export function formatOddsApiForAI(result) {
  let text = '';

  text += '\n\n══════════════════════════════════════════';
  text += '\n 📊 CUOTAS DE MERCADO (The-Odds-API)';
  text += '\n══════════════════════════════════════════\n';

  if (result.source === 'pinnacle') {
    text += '\n📐 MÉTODO: Pinnacle (vig removed) como referencia de probabilidades reales\n';
    text += 'Esto es el estándar de la industria — Pinnacle es la casa más nítida (sharp) del mercado.\n';
    text += 'Las probabilidades justas se calculan eliminando el margen (vig) de Pinnacle.\n\n';

    if (result.fairProbs1X2) {
      const home = result.match.home;
      const away = result.match.away;
      const drawKey = Object.keys(result.fairProbs1X2).find(k => k.toLowerCase() === 'draw');
      text += '🎯 1X2 — Probabilidades Justas (Pinnacle sin margen):\n';
      text += `  ${home}: ${(result.fairProbs1X2[home] * 100).toFixed(1)}% → Cuota justa: ${(1 / result.fairProbs1X2[home]).toFixed(2)}\n`;
      if (drawKey) {
        text += `  Empate: ${(result.fairProbs1X2[drawKey] * 100).toFixed(1)}% → Cuota justa: ${(1 / result.fairProbs1X2[drawKey]).toFixed(2)}\n`;
      }
      text += `  ${away}: ${(result.fairProbs1X2[away] * 100).toFixed(1)}% → Cuota justa: ${(1 / result.fairProbs1X2[away]).toFixed(2)}\n`;
      text += '\nCUOTAS DE REFERENCIA PINNACLE:\n';
      if (result.pinOdds1X2) {
        for (const [name, odds] of Object.entries(result.pinOdds1X2)) {
          const label = name === home ? home : (name === away ? away : 'Empate');
          text += `  ${label}: ${odds.toFixed(2)}\n`;
        }
      }
    }
  } else {
    text += '\n📐 MÉTODO: Sin Pinnacle para este partido — mostrando mejores cuotas del mercado\n\n';
    if (result.bestOdds) {
      text += 'MEJORES CUOTAS DISPONIBLES:\n';
      for (const [sel, offer] of Object.entries(result.bestOdds)) {
        text += `  ${sel}: ${offer.odds.toFixed(2)} (${offer.book})\n`;
      }
    }
  }

  if (result.valueBets?.length > 0) {
    text += '\n🔴⭐ APUESTAS CON VALOR (EV+ vs Pinnacle):\n';
    for (const bet of result.valueBets.slice(0, 10)) {
      const evPct = (bet.ev * 100).toFixed(1);
      text += `  ${bet.market} → ${bet.selection}\n`;
      text += `    Casa: ${bet.bookmaker} | Cuota: ${bet.odds.toFixed(2)} | EV: +${evPct}%\n`;
      text += `    Prob justa: ${(bet.fairProb * 100).toFixed(1)}% | Cuota Pinnacle: ${bet.pinOdds.toFixed(2)}\n`;
      if (bet.allBooks?.length > 1) {
        text += `    Otras casas con valor: ${bet.allBooks.filter(b => !b.startsWith(bet.bookmaker)).slice(0, 3).join(', ')}\n`;
      }
    }
  }

  const uniqueBooks = new Set();
  for (const bm of (result.bookmakers || [])) {
    uniqueBooks.add(BOOK_NAMES[bm.key] || bm.title || bm.key);
  }
  if (uniqueBooks.size > 0) {
    text += `\n📋 Casas de apuestas con cuotas para este partido: ${[...uniqueBooks].join(', ')}\n`;
  }

  text += '\n══════════════════════════════════════════\n';

  return text;
}

export async function fetchOddsApiScores(leagueKey, apiKey, daysFrom = 3) {
  if (!apiKey) return [];
  try {
    const url = `${ODDS_API_BASE}/sports/${leagueKey}/scores/?apiKey=${apiKey}&daysFrom=${daysFrom}&dateFormat=iso`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export { SOCCER_LEAGUES, BOOK_NAMES, SHARP_BOOK, VALUE_BOOKS, NATIONAL_TEAM_COUNTRIES, matchOddsApiTeam };
