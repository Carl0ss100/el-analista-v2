export function brierScore(prob, outcome) {
  return (prob - outcome) ** 2;
}

export function logLoss(prob, outcome) {
  const p = Math.max(0.001, Math.min(0.999, outcome ? prob : 1 - prob));
  return -Math.log(p);
}

export function backtest(predictions) {
  const withModel = predictions.filter(p =>
    p.result && p.result !== 'V' && p.model_prob != null
  );

  if (withModel.length < 5) return null;

  let totalBrier = 0, totalLogLoss = 0;
  const byMarket = {};
  const byLeague = {};
  const calibration = { bins: [] };

  for (const p of withModel) {
    const outcome = p.result === 'W' ? 1 : 0;
    const prob = p.model_prob;
    const bs = brierScore(prob, outcome);
    const ll = logLoss(prob, outcome);
    totalBrier += bs;
    totalLogLoss += ll;

    const market = p.market || 'Otro';
    if (!byMarket[market]) byMarket[market] = { brier: 0, logLoss: 0, count: 0, wins: 0, probs: [] };
    byMarket[market].brier += bs;
    byMarket[market].logLoss += ll;
    byMarket[market].count++;
    if (outcome) byMarket[market].wins++;
    byMarket[market].probs.push({ prob, outcome });

    const league = p.model_data?.league || 'Desconocido';
    if (!byLeague[league]) byLeague[league] = { brier: 0, logLoss: 0, count: 0, wins: 0 };
    byLeague[league].brier += bs;
    byLeague[league].logLoss += ll;
    byLeague[league].count++;
    if (outcome) byLeague[league].wins++;
  }

  const n = withModel.length;
  const overall = {
    brier: +(totalBrier / n).toFixed(4),
    logLoss: +(totalLogLoss / n).toFixed(4),
    count: n,
    wins: withModel.filter(p => p.result === 'W').length,
  };

  const marketResults = {};
  for (const [m, d] of Object.entries(byMarket)) {
    marketResults[m] = {
      brier: +(d.brier / d.count).toFixed(4),
      logLoss: +(d.logLoss / d.count).toFixed(4),
      count: d.count,
      hitRate: +((d.wins / d.count) * 100).toFixed(1),
      avgProb: +(d.probs.reduce((s, p) => s + p.prob, 0) / d.count * 100).toFixed(1),
    };
  }

  const leagueResults = {};
  for (const [l, d] of Object.entries(byLeague)) {
    leagueResults[l] = {
      brier: +(d.brier / d.count).toFixed(4),
      logLoss: +(d.logLoss / d.count).toFixed(4),
      count: d.count,
      hitRate: +((d.wins / d.count) * 100).toFixed(1),
    };
  }

  const bins = buildCalibration(withModel);
  calibration.bins = bins;

  const alerts = generateAlerts(marketResults, leagueResults, overall);

  return { overall, byMarket: marketResults, byLeague: leagueResults, calibration, alerts };
}

function buildCalibration(predictions) {
  const bucketSize = 0.1;
  const buckets = {};

  for (const p of predictions) {
    const outcome = p.result === 'W' ? 1 : 0;
    const bin = Math.floor(p.model_prob / bucketSize) * bucketSize;
    const key = `${bin.toFixed(1)}-${(bin + bucketSize).toFixed(1)}`;
    if (!buckets[key]) buckets[key] = { sumProb: 0, sumOutcome: 0, count: 0 };
    buckets[key].sumProb += p.model_prob;
    buckets[key].sumOutcome += outcome;
    buckets[key].count++;
  }

  return Object.entries(buckets)
    .map(([range, d]) => ({
      range,
      avgProb: +(d.sumProb / d.count).toFixed(3),
      actualWinRate: +(d.sumOutcome / d.count).toFixed(3),
      count: d.count,
      deviation: +((d.sumOutcome / d.count) - (d.sumProb / d.count)).toFixed(3),
    }))
    .sort((a, b) => parseFloat(a.range) - parseFloat(b.range));
}

function generateAlerts(marketResults, leagueResults, overall) {
  const alerts = [];

  if (overall.brier > 0.33) {
    alerts.push('Modelo poco calibrado (Brier > 0.33). Considera ajustar parámetros o cambiar de modelo.');
  }

  for (const [market, d] of Object.entries(marketResults)) {
    if (d.count >= 5 && Math.abs(parseFloat(d.avgProb) - parseFloat(d.hitRate)) > 15) {
      const direction = parseFloat(d.avgProb) > parseFloat(d.hitRate) ? 'sobreestima' : 'subestima';
      alerts.push(`Modelo ${direction} aciertos en ${market} (prob media: ${d.avgProb}%, acierto real: ${d.hitRate}%).`);
    }
    if (d.brier > 0.35 && d.count >= 3) {
      alerts.push(`${market} tiene Brier alto (${d.brier}). Considera evitar o recalibrar.`);
    }
  }

  return alerts;
}

export function formatBacktestOutput(result) {
  if (!result) return '';

  let out = '\n\n═════════════════════════════════════════════\n BACKTESTING DEL MODELO\n═════════════════════════════════════════════';
  out += `\n📊 General: Brier=${result.overall.brier} | LogLoss=${result.overall.logLoss} | ${result.overall.count} predicciones analizadas`;

  if (Object.keys(result.byMarket).length > 0) {
    out += '\n\nPor mercado:';
    for (const [m, d] of Object.entries(result.byMarket)) {
      out += `\n- ${m}: Brier=${d.brier} | HitRate=${d.hitRate}% | ProbMedia=${d.avgProb}% | n=${d.count}`;
    }
  }

  if (result.alerts.length > 0) {
    out += '\n\n⚠️ ALERTAS DE CALIBRACIÓN:';
    result.alerts.forEach(a => { out += `\n- ${a}`; });
  }

  out += '\n═════════════════════════════════════════════';
  return out;
}
