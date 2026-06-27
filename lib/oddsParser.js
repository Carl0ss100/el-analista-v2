const MARKET_NAMES = {
  'Match Winner': '1X2',
  'Home/Away': '12',
  'Double Chance': 'Doble Oportunidad',
  'Both Teams Score': 'BTTS',
  'Goals Over/Under': 'Over/Under Goles',
  'Exact Score': 'Resultado Exacto',
  'HT/FT': 'Descanso/Final',
  'Half Time': 'Descanso',
  'Second Half': '2do Tiempo',
  'Asian Handicap': 'Hándicap Asiático',
  'European Handicap': 'Hándicap Europeo',
  'Corners': 'Córners',
  'Cards': 'Tarjetas',
  'Player To Score': 'Goleador',
  'Player Shots On Target': 'Tiros a Puerta Jugador',
  'Player Shots': 'Tiros Jugador',
  'Player Tackles': 'Tacles Jugador',
  'Player Fouls': 'Faltas Jugador',
  'Player Passes': 'Pases Jugador',
  'Player To Be Carded': 'Tarjeta Jugador',
  'Team To Score': 'Equipo Marca',
  'Clean Sheet': 'Portería a Cero',
  'Win To Nil': 'Gana a Cero',
  'Highest Scoring Half': 'Mitad con Más Goles',
  'Total Goals': 'Total Goles',
  'Team Goals': 'Goles Equipo',
  'Odd/Even': 'Par/Impar',
  'First Goal': 'Primer Gol',
  'Last Goal': 'Último Gol',
};

export function parseAllMarkets(bookmakers, userBookmakers = null) {
  const markets = {};

  for (const bm of bookmakers) {
    const bmName = bm.name;
    if (userBookmakers && !userBookmakers.some(ub => bmName.toLowerCase().includes(ub.toLowerCase()))) {
      continue;
    }

    for (const bet of bm.bets) {
      const marketName = MARKET_NAMES[bet.name] || bet.name;

      if (!markets[marketName]) {
        markets[marketName] = { name: marketName, bookmakers: {} };
      }

      const values = bet.values.map(v => ({
        value: v.value,
        odd: parseFloat(v.odd),
      }));

      markets[marketName].bookmakers[bmName] = values;
    }
  }

  return markets;
}

export function parsePlayerProps(bookmakers) {
  const props = [];
  const propMarketNames = [
    'Player To Score', 'Player Shots On Target', 'Player Shots',
    'Player Tackles', 'Player Fouls', 'Player Passes', 'Player To Be Carded',
  ];

  for (const bm of bookmakers) {
    for (const bet of bm.bets) {
      if (propMarketNames.includes(bet.name)) {
        for (const v of bet.values) {
          props.push({
            market: bet.name,
            marketEs: MARKET_NAMES[bet.name] || bet.name,
            player: v.value,
            odd: parseFloat(v.odd),
            bookmaker: bm.name,
          });
        }
      }
    }
  }

  return props;
}

export function findBestOdds(market) {
  const best = {};
  for (const [bmName, values] of Object.entries(market.bookmakers)) {
    for (const v of values) {
      const key = v.value;
      if (!best[key] || v.odd > best[key].odd) {
        best[key] = { value: key, odd: v.odd, bookmaker: bmName };
      }
    }
  }
  return Object.values(best);
}

export function findValueBets(markets, modelProbabilities) {
  const valueBets = [];

  for (const [marketName, market] of Object.entries(markets)) {
    const bestOdds = findBestOdds(market);

    for (const item of bestOdds) {
      const impliedProb = 1 / item.odd;
      const modelProb = getModelProb(marketName, item.value, modelProbabilities);

      if (modelProb && modelProb > impliedProb) {
        const ev = (modelProb * (item.odd - 1)) - (1 - modelProb);
        if (ev > 0) {
          valueBets.push({
            market: marketName,
            selection: item.value,
            odd: item.odd,
            bookmaker: item.bookmaker,
            impliedProb: (impliedProb * 100).toFixed(1),
            modelProb: (modelProb * 100).toFixed(1),
            ev: (ev * 100).toFixed(1),
          });
        }
      }
    }
  }

  return valueBets.sort((a, b) => parseFloat(b.ev) - parseFloat(a.ev));
}

function getModelProb(market, selection, probs) {
  if (!probs) return null;

  if (market === '1X2') {
    if (selection === 'Home' || selection.includes('1')) return probs.home;
    if (selection === 'Draw' || selection === 'X') return probs.draw;
    if (selection === 'Away' || selection.includes('2')) return probs.away;
  }

  if (market === 'Over/Under Goles' || market === 'Total Goles') {
    const match = selection.match(/(Over|Under)\s+(\d+\.?\d*)/i);
    if (match) {
      const line = parseFloat(match[2]);
      const isOver = match[1].toLowerCase() === 'over';
      const key = `over_${line.toString().replace('.', '_')}`;
      if (probs[key] !== undefined) {
        return isOver ? probs[key] : 1 - probs[key];
      }
    }
  }

  if (market === 'BTTS') {
    if (selection === 'Yes' || selection === 'Sí') return probs.bttsYes;
    if (selection === 'No') return probs.bttsNo;
  }

  if (market === 'Doble Oportunidad') {
    if (selection === 'Home/Draw' || selection === '1X') return (probs.home || 0) + (probs.draw || 0);
    if (selection === 'Draw/Away' || selection === 'X2') return (probs.draw || 0) + (probs.away || 0);
    if (selection === 'Home/Away' || selection === '12') return (probs.home || 0) + (probs.away || 0);
  }

  return null;
}

export function formatOddsForAI(markets, userBookmakers = null) {
  let text = '\n\n📊 CUOTAS DISPONIBLES:\n';
  text += '═'.repeat(50) + '\n';

  const mainMarkets = ['1X2', 'Doble Oportunidad', 'Over/Under Goles', 'BTTS', 'Hándicap Asiático'];
  const otherMarkets = Object.keys(markets).filter(m => !mainMarkets.includes(m));

  for (const marketName of mainMarkets) {
    const market = markets[marketName];
    if (!market) continue;

    text += `\n${marketName}:\n`;
    const best = findBestOdds(market);
    for (const item of best) {
      text += `  ⭐ ${item.value}: ${item.odd} (${item.bookmaker})\n`;
    }
  }

  if (otherMarkets.length > 0) {
    text += '\n--- Otros mercados ---\n';
    for (const marketName of otherMarkets.slice(0, 10)) {
      const market = markets[marketName];
      text += `\n${marketName}:\n`;
      const best = findBestOdds(market);
      for (const item of best.slice(0, 5)) {
        text += `  ${item.value}: ${item.odd} (${item.bookmaker})\n`;
      }
    }
  }

  return text;
}

export function formatPlayerPropsForAI(playerProps) {
  if (!playerProps || playerProps.length === 0) return '';

  let text = '\n\n👤 PLAYER PROPS:\n';
  text += '═'.repeat(50) + '\n';

  const grouped = {};
  for (const prop of playerProps) {
    if (!grouped[prop.player]) grouped[prop.player] = [];
    grouped[prop.player].push(prop);
  }

  for (const [player, props] of Object.entries(grouped).slice(0, 10)) {
    text += `\n${player}:\n`;
    for (const prop of props.slice(0, 5)) {
      text += `  ${prop.marketEs}: ${prop.odd} (${prop.bookmaker})\n`;
    }
  }

  return text;
}
