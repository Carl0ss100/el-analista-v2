export function getStats(predictions) {
  const resolved = predictions.filter(p => p.result && p.result !== 'V');
  const wins = resolved.filter(p => p.result === 'W').length;
  const losses = resolved.filter(p => p.result === 'L').length;
  const voids = predictions.filter(p => p.result === 'V').length;
  const pending = predictions.filter(p => !p.result).length;
  const hitRate = resolved.length > 0 ? ((wins / resolved.length) * 100).toFixed(1) : 0;
  const totalPnl = predictions.reduce((s, p) => s + (p.pnl || 0), 0);
  const markets = {};
  resolved.forEach(p => {
    const m = p.market || 'Otro';
    if (!markets[m]) markets[m] = { w: 0, l: 0 };
    if (p.result === 'W') markets[m].w++;
    else markets[m].l++;
  });
  return { total: predictions.length, wins, losses, voids, pending, hitRate, totalPnl, markets, resolved: resolved.length };
}

export function getStreak(predictions) {
  const preds = predictions.filter(p => p.result === 'W' || p.result === 'L');
  if (preds.length === 0) return { type: null, count: 0 };
  const last = preds[preds.length - 1].result;
  let count = 0;
  for (let i = preds.length - 1; i >= 0; i--) {
    if (preds[i].result === last) count++;
    else break;
  }
  return { type: last, count };
}

export function getStatsByMarket(predictions) {
  const preds = predictions.filter(p => p.result && p.result !== 'V');
  const markets = {};
  preds.forEach(p => {
    const m = p.market || 'Otro';
    if (!markets[m]) markets[m] = { wins: 0, losses: 0, total: 0, hitRate: 0, pnl: 0 };
    markets[m].total++;
    if (p.result === 'W') markets[m].wins++;
    else markets[m].losses++;
    markets[m].pnl += (p.pnl || 0);
  });
  for (const m of Object.values(markets)) {
    m.hitRate = m.total > 0 ? +((m.wins / m.total) * 100).toFixed(1) : 0;
  }
  return markets;
}

export function getRecentErrors(predictions, n = 5) {
  return predictions.filter(p => p.result === 'L').slice(-n).map(p => ({
    id: p.id, match: p.match_name || p.match, market: p.market || 'Otro',
    odds: p.odds, confidence: p.confidence, date: p.created_at
  }));
}

export function getWeeklyPL(predictions) {
  const preds = predictions.filter(p => p.result && p.pnl !== null && p.pnl !== undefined);
  const weeks = {};
  preds.forEach(p => {
    const d = new Date(p.created_at || p.date || Date.now());
    const jan1 = new Date(d.getFullYear(), 0, 1);
    const weekNum = Math.ceil(((d - jan1) / 86400000 + jan1.getDay() + 1) / 7);
    const key = `${d.getFullYear()}-W${weekNum}`;
    if (!weeks[key]) weeks[key] = { profit: 0, wins: 0, total: 0 };
    weeks[key].profit += p.pnl;
    weeks[key].total++;
    if (p.result === 'W') weeks[key].wins++;
  });
  return Object.entries(weeks).map(([week, data]) => ({
    week, profit: +data.profit.toFixed(2), wins: data.wins, total: data.total,
    hitRate: data.total > 0 ? +((data.wins / data.total) * 100).toFixed(1) : 0
  }));
}

export function getMonthlyHitRate(predictions) {
  const preds = predictions.filter(p => p.result && p.result !== 'V');
  const months = {};
  preds.forEach(p => {
    const d = new Date(p.created_at || p.date || Date.now());
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!months[key]) months[key] = { wins: 0, total: 0 };
    months[key].total++;
    if (p.result === 'W') months[key].wins++;
  });
  return Object.entries(months).map(([month, data]) => ({
    month, wins: data.wins, total: data.total,
    hitRate: data.total > 0 ? +((data.wins / data.total) * 100).toFixed(1) : 0
  }));
}
