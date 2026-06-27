const LEAGUE_AVG = {
  'la liga': 2.55, 'primera division': 2.55, 'laliga': 2.55,
  'premier league': 2.82, 'premier': 2.82,
  'bundesliga': 3.14, '1. bundesliga': 3.14,
  'serie a': 2.68, 'italian serie a': 2.68,
  'ligue 1': 2.72, 'french ligue 1': 2.72,
  'eredivisie': 3.40, 'dutch eredivisie': 3.40,
  'primeira liga': 2.52, 'portuguese primeira liga': 2.52,
  'premier league ruso': 2.30, 'russian premier league': 2.30,
  'champions league': 2.95, 'uefa champions league': 2.95,
  'europa league': 2.78, 'uefa europa league': 2.78,
  'conference league': 2.65, 'uefa conference league': 2.65,
  'world cup': 2.65, 'fifa world cup': 2.65,
  'euro': 2.50, 'european championship': 2.50, 'uefa euro': 2.50,
  'copa america': 2.45, 'copa américa': 2.45,
  'nations league': 2.60, 'uefa nations league': 2.60,
  'mls': 2.90, 'major league soccer': 2.90,
  'j-league': 2.75, 'j1 league': 2.75,
  'saudi pro league': 2.85, 'saudi professional league': 2.85,
  'scottish premiership': 2.65, 'scottish premier': 2.65,
  'belgian pro league': 2.75, 'jupiler pro league': 2.75,
  'turkish super lig': 2.70, 'süper lig': 2.70,
  'super liga': 2.55, 'argentinian primera division': 2.55,
  'segunda division': 2.35, 'la liga 2': 2.35, 'laliga smartbank': 2.35,
  'championship': 2.60, 'efl championship': 2.60,
  'serie b': 2.45, '2. bundesliga': 2.85,
  'default': 2.6,
};

export function getLeagueAvg(leagueName) {
  if (!leagueName) return LEAGUE_AVG['default'];
  const lower = leagueName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  for (const [key, avg] of Object.entries(LEAGUE_AVG)) {
    if (lower.includes(key) || key.includes(lower)) return avg;
  }
  return LEAGUE_AVG['default'];
}

function factorial(n) {
  if (n <= 1) return 1;
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}

export function poissonProb(lambda, k) {
  return (Math.pow(lambda, k) * Math.exp(-lambda)) / factorial(k);
}

export function poissonMatrix(homeLambda, awayLambda, maxGoals = 7) {
  const matrix = [];
  for (let h = 0; h <= maxGoals; h++) {
    matrix[h] = [];
    for (let a = 0; a <= maxGoals; a++) {
      matrix[h][a] = poissonProb(homeLambda, h) * poissonProb(awayLambda, a);
    }
  }
  return matrix;
}

export function poissonProbabilities(homeLambda, awayLambda) {
  return buildProbabilities(homeLambda, awayLambda, 'poisson', 0);
}

export function dixonColesProbabilities(homeLambda, awayLambda, rho = -0.1) {
  return buildProbabilities(homeLambda, awayLambda, 'dixon-coles', rho);
}

function buildProbabilities(homeLambda, awayLambda, modelType, rho) {
  const matrix = poissonMatrix(homeLambda, awayLambda);
  const maxG = matrix.length - 1;

  if (modelType === 'dixon-coles' && rho !== 0) {
    for (let h = 0; h <= maxG; h++) {
      for (let a = 0; a <= maxG; a++) {
        if (h <= 1 && a <= 1) {
          let adj = 0;
          if (h === 0 && a === 0) adj = -homeLambda * awayLambda * rho;
          else if (h === 1 && a === 0) adj = homeLambda * awayLambda * rho;
          else if (h === 0 && a === 1) adj = homeLambda * awayLambda * rho;
          else if (h === 1 && a === 1) adj = -homeLambda * awayLambda * rho;
          matrix[h][a] = Math.max(0, matrix[h][a] + adj);
        }
      }
    }
    let total = 0;
    for (let h = 0; h <= maxG; h++) {
      for (let a = 0; a <= maxG; a++) {
        total += matrix[h][a];
      }
    }
    for (let h = 0; h <= maxG; h++) {
      for (let a = 0; a <= maxG; a++) {
        matrix[h][a] /= total;
      }
    }
  }

  let home = 0, draw = 0, away = 0, over25 = 0, under25 = 0, btts = 0;

  for (let h = 0; h <= maxG; h++) {
    for (let a = 0; a <= maxG; a++) {
      const p = matrix[h][a];
      if (h > a) home += p;
      else if (h === a) draw += p;
      else away += p;
      if (h + a > 2) over25 += p;
      else under25 += p;
      if (h > 0 && a > 0) btts += p;
    }
  }

  const overUnderLines = {};
  for (let line = 0.5; line <= 6.5; line += 0.5) {
    let over = 0, under = 0;
    for (let h = 0; h <= maxG; h++) {
      for (let a = 0; a <= maxG; a++) {
        if (h + a > line) over += matrix[h][a];
        else under += matrix[h][a];
      }
    }
    overUnderLines[`${line}`] = { over: +over.toFixed(4), under: +under.toFixed(4) };
  }

  const scores = [];
  for (let h = 0; h <= maxG; h++) {
    for (let a = 0; a <= maxG; a++) {
      scores.push({ score: `${h}-${a}`, prob: +matrix[h][a].toFixed(4) });
    }
  }
  scores.sort((a, b) => b.prob - a.prob);

  const modelLabel = modelType === 'dixon-coles' ? 'DIXON-COLES' : 'POISSON';

  return {
    modelType: modelLabel,
    '1X2': { '1': +home.toFixed(4), 'X': +draw.toFixed(4), '2': +away.toFixed(4) },
    overUnder25: { over: +over25.toFixed(4), under: +under25.toFixed(4) },
    btts: { yes: +btts.toFixed(4), no: +(1 - btts).toFixed(4) },
    overUnderLines,
    expectedGoals: { home: +homeLambda.toFixed(2), away: +awayLambda.toFixed(2), total: +(homeLambda + awayLambda).toFixed(2) },
    topScores: scores.slice(0, 5),
  };
}

export function estimateLambdas(homeGoals, awayGoals, homeConceded, awayConceded, leagueAvgOrName = 2.6) {
  const leagueAvgGoals = typeof leagueAvgOrName === 'string' ? getLeagueAvg(leagueAvgOrName) : leagueAvgOrName;
  const homeAttack = homeGoals > 0 ? homeGoals / (leagueAvgGoals / 2) : 0.8;
  const homeDefense = homeConceded > 0 ? homeConceded / (leagueAvgGoals / 2) : 1.0;
  const awayAttack = awayGoals > 0 ? awayGoals / (leagueAvgGoals / 2) : 0.8;
  const awayDefense = awayConceded > 0 ? awayConceded / (leagueAvgGoals / 2) : 1.0;
  const homeAdvantage = 1.12;
  const homeLambda = Math.max(0.3, awayAttack * homeDefense * (leagueAvgGoals / 2) * homeAdvantage);
  const awayLambda = Math.max(0.3, homeAttack * awayDefense * (leagueAvgGoals / 2));
  return { homeLambda: +homeLambda.toFixed(3), awayLambda: +awayLambda.toFixed(3) };
}

const ELO_K = 32;
const ELO_HOME_ADVANTAGE = 65;

export function eloExpected(eloHome, eloAway) {
  const dr = eloHome - eloAway + ELO_HOME_ADVANTAGE;
  const eHome = 1 / (1 + Math.pow(10, -dr / 400));
  const eAway = 1 - eHome;
  return { home: +eHome.toFixed(4), away: +eAway.toFixed(4) };
}

export function eloUpdate(eloHome, eloAway, result, k = ELO_K) {
  const expected = eloExpected(eloHome, eloAway);
  let sHome, sAway;
  if (result === 'W') { sHome = 1; sAway = 0; }
  else if (result === 'D') { sHome = 0.5; sAway = 0.5; }
  else { sHome = 0; sAway = 1; }
  const newHome = eloHome + k * (sHome - expected.home);
  const newAway = eloAway + k * (sAway - expected.away);
  return { home: +newHome.toFixed(1), away: +newAway.toFixed(1) };
}

export function eloTo1X2(eloHome, eloAway) {
  const eHome = eloExpected(eloHome, eloAway).home;
  const drawLine = 0.26;
  const drawChance = drawLine * (1 - Math.abs(2 * eHome - 1));
  const homeChance = eHome * (1 - drawChance) + drawChance * 0.5;
  const awayChance = 1 - homeChance - drawChance;
  return { '1': +homeChance.toFixed(4), 'X': +drawChance.toFixed(4), '2': +awayChance.toFixed(4) };
}

export function expectedValue(prob, odds) {
  return +(prob * (odds - 1) - (1 - prob)).toFixed(4);
}

export function kellyStake(prob, odds, bankroll, fraction = 0.25) {
  const ev = prob * odds;
  if (ev <= 1) return 0;
  const fullKelly = (prob * odds - 1) / (odds - 1);
  const stake = Math.max(0, fullKelly * fraction * bankroll);
  return +stake.toFixed(2);
}

export function impliedProbability(odds) {
  return odds > 1 ? +(1 / odds).toFixed(4) : 0;
}

export function findValueBets(probabilities, oddsOffers) {
  const valueBets = [];
  const markets = [
    { key: '1', prob: probabilities['1X2']?.['1'], label: 'Local' },
    { key: 'X', prob: probabilities['1X2']?.['X'], label: 'Empate' },
    { key: '2', prob: probabilities['1X2']?.['2'], label: 'Visitante' },
    { key: 'over25', prob: probabilities.overUnder25?.over, label: 'Over 2.5' },
    { key: 'under25', prob: probabilities.overUnder25?.under, label: 'Under 2.5' },
    { key: 'btts_yes', prob: probabilities.btts?.yes, label: 'BTTS Sí' },
    { key: 'btts_no', prob: probabilities.btts?.no, label: 'BTTS No' },
  ];

  for (const m of markets) {
    if (m.prob == null) continue;
    const best = findBestOdds(m.key, oddsOffers);
    if (!best) continue;
    const ev = expectedValue(m.prob, best.odds);
    const kelly = kellyStake(m.prob, best.odds, 1000, 0.25);
    if (ev > 0) {
      valueBets.push({
        market: m.label,
        probability: m.prob,
        bestOdds: best.odds,
        bookmaker: best.bookmaker,
        ev: +(ev * 100).toFixed(1),
        suggestedStake: kelly,
      });
    }
  }
  return valueBets;
}

function findBestOdds(marketKey, oddsOffers) {
  const keyMap = {
    '1': 'Match Winner', 'X': 'Match Winner', '2': 'Match Winner',
    'over25': 'Over/Under', 'under25': 'Over/Under',
    'btts_yes': 'Both Teams Score', 'btts_no': 'Both Teams Score',
  };

  let best = null;
  for (const offer of oddsOffers) {
    const bet = offer.bets?.find(b => b.name === keyMap[marketKey]);
    if (!bet) continue;
    const val = bet.values?.find(v => {
      if (marketKey === '1') return v.value === 'Home';
      if (marketKey === 'X') return v.value === 'Draw';
      if (marketKey === '2') return v.value === 'Away';
      if (marketKey === 'over25') return v.value === 'Over 2.5';
      if (marketKey === 'under25') return v.value === 'Under 2.5';
      if (marketKey === 'btts_yes') return v.value === 'Yes';
      if (marketKey === 'btts_no') return v.value === 'No';
      return false;
    });
    if (val && (!best || parseFloat(val.odd) > best.odds)) {
      best = { odds: parseFloat(val.odd), bookmaker: offer.name || offer.bookmaker };
    }
  }
  return best;
}

export function formatModelOutput(probs, h2h, elo1X2) {
  let out = '\n\n═════════════════════════════════════════════\n DATOS CUANTITATIVOS DEL MODELO\n═════════════════════════════════════════════';

  if (probs && probs['1X2'] && probs.expectedGoals) {
    out += `\n\n🏀 ${probs.modelType || 'POISSON'} (Goles esperados: Local ${probs.expectedGoals.home} - Visitante ${probs.expectedGoals.away}, Total ${probs.expectedGoals.total})`;
    out += `\n1X2: Local ${((probs['1X2']['1']) * 100).toFixed(1)}% | Empate ${((probs['1X2']['X']) * 100).toFixed(1)}% | Visitante ${((probs['1X2']['2']) * 100).toFixed(1)}%`;
    if (probs.overUnder25) {
      out += `\nOver/Under 2.5: Over ${(probs.overUnder25.over * 100).toFixed(1)}% | Under ${(probs.overUnder25.under * 100).toFixed(1)}%`;
    }
    if (probs.btts) {
      out += `\nBTTS: Sí ${(probs.btts.yes * 100).toFixed(1)}% | No ${(probs.btts.no * 100).toFixed(1)}%`;
    }
    if (probs.topScores) {
      out += `\nScores más probables: ${probs.topScores.map(s => `${s.score} (${(s.prob * 100).toFixed(1)}%)`).join(', ')}`;
    }
  } else if (probs && probs['1X2']) {
    out += `\n\n📊 MODELO ELO (Sin datos de forma reciente — usando rating estimado)`;
    out += `\n1X2: Local ${((probs['1X2']['1']) * 100).toFixed(1)}% | Empate ${((probs['1X2']['X']) * 100).toFixed(1)}% | Visitante ${((probs['1X2']['2']) * 100).toFixed(1)}%`;
  }

  if (elo1X2) {
    out += `\n\n📊 ELO RATING (1X2)`;
    out += `\nLocal ${(elo1X2['1'] * 100).toFixed(1)}% | Empate ${(elo1X2['X'] * 100).toFixed(1)}% | Visitante ${(elo1X2['2'] * 100).toFixed(1)}%`;
  }

  if (h2h && h2h.length > 0) {
    out += `\n\n⚡ HEAD-TO-HEAD (últimos ${h2h.length} enfrentamientos)`;
    const homeWins = h2h.filter(h => h.winner === 'home').length;
    const draws = h2h.filter(h => h.winner === 'draw').length;
    const awayWins = h2h.filter(h => h.winner === 'away').length;
    const avgGoals = +(h2h.reduce((s, h) => s + h.goals, 0) / h2h.length).toFixed(1);
    const bttsCount = h2h.filter(h => h.bothScored).length;
    out += `\nLocal ${homeWins}W | Empate ${draws} | Visitante ${awayWins}W | Media goles: ${avgGoals} | BTTS: ${bttsCount}/${h2h.length}`;
    h2h.slice(0, 5).forEach(h => {
      out += `\n  ${h.date || ''} ${h.home} ${h.homeGoals}-${h.awayGoals} ${h.away}${h.competition ? ` (${h.competition})` : ''}`;
    });
  }

  out += '\n═════════════════════════════════════════════';
  out += '\nUsa estos datos como complemento, NO como sustituto de tu análisis. Compara con las cuotas del mercado para detectar valor.';

  return out;
}
