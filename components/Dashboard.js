'use client';

import { useEffect, useRef } from 'react';
import { getStats, getStreak, getStatsByMarket, getWeeklyPL, getMonthlyHitRate } from '@/lib/stats';

export default function Dashboard({ predictions, settings }) {
  const bankrollRef = useRef(null);
  const weeklyRef = useRef(null);
  const monthlyRef = useRef(null);

  const stats = getStats(predictions);
  const streak = getStreak(predictions);
  const marketStats = getStatsByMarket(predictions);
  const weekly = getWeeklyPL(predictions);
  const monthly = getMonthlyHitRate(predictions);
  const currentBankroll = (settings.bankroll || 0) + stats.totalPnl;

  useEffect(() => {
    drawBankrollChart();
    drawWeeklyPLChart();
    drawMonthlyHRChart();
  }, [predictions, settings]);

  function drawBankrollChart() {
    const canvas = bankrollRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const parent = canvas.parentElement;
    canvas.width = parent.offsetWidth * 2;
    canvas.height = parent.offsetHeight * 2;
    ctx.scale(2, 2);
    const w = parent.offsetWidth, h = parent.offsetHeight;
    ctx.clearRect(0, 0, w, h);

    const resolvedPreds = predictions.filter(p => p.result && p.pnl !== null && p.pnl !== undefined);
    if (!settings.bankroll || resolvedPreds.length === 0) {
      ctx.fillStyle = '#64748B'; ctx.font = '13px Inter, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('Configura bankroll y marca resultados para ver el gráfico', w / 2, h / 2);
      return;
    }

    const points = [settings.bankroll];
    let running = settings.bankroll;
    resolvedPreds.forEach(p => { running += (p.pnl || 0); points.push(running); });

    const min = Math.min(...points) * 0.95;
    const max = Math.max(...points) * 1.05;
    const range = max - min || 1;
    const padL = 50, padR = 20, padT = 20, padB = 30;
    const chartW = w - padL - padR, chartH = h - padT - padB;

    ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padT + (chartH / 4) * i;
      ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(w - padR, y); ctx.stroke();
      ctx.fillStyle = '#64748B'; ctx.font = '10px Inter, sans-serif'; ctx.textAlign = 'right';
      ctx.fillText(`€${(max - (range / 4) * i).toFixed(0)}`, padL - 8, y + 4);
    }

    ctx.beginPath(); ctx.strokeStyle = '#00E68A'; ctx.lineWidth = 2; ctx.lineJoin = 'round';
    points.forEach((v, i) => {
      const x = padL + (chartW / (points.length - 1 || 1)) * i;
      const y = padT + chartH - ((v - min) / range) * chartH;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();

    const gradient = ctx.createLinearGradient(0, padT, 0, h - padB);
    gradient.addColorStop(0, 'rgba(0,230,138,0.15)');
    gradient.addColorStop(1, 'rgba(0,230,138,0)');
    ctx.lineTo(padL + chartW, h - padB); ctx.lineTo(padL, h - padB); ctx.closePath();
    ctx.fillStyle = gradient; ctx.fill();

    points.forEach((v, i) => {
      const x = padL + (chartW / (points.length - 1 || 1)) * i;
      const y = padT + chartH - ((v - min) / range) * chartH;
      ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fillStyle = v >= settings.bankroll ? '#00E68A' : '#EF4444'; ctx.fill();
    });
  }

  function drawWeeklyPLChart() {
    const canvas = weeklyRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const parent = canvas.parentElement;
    canvas.width = parent.offsetWidth * 2; canvas.height = parent.offsetHeight * 2;
    ctx.scale(2, 2);
    const w = parent.offsetWidth, h = parent.offsetHeight;
    ctx.clearRect(0, 0, w, h);

    if (weekly.length === 0) {
      ctx.fillStyle = '#64748B'; ctx.font = '13px Inter, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('Marca resultados para ver P/L semanal', w / 2, h / 2);
      return;
    }

    const padL = 50, padR = 20, padT = 20, padB = 40;
    const chartW = w - padL - padR, chartH = h - padT - padB;
    const gap = chartW / weekly.length;
    const barW = Math.min(gap * 0.6, 40);
    const maxVal = Math.max(...weekly.map(d => Math.abs(d.profit)), 1);
    const zeroY = padT + chartH / 2;

    ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(padL, zeroY); ctx.lineTo(w - padR, zeroY); ctx.stroke();

    weekly.forEach((d, i) => {
      const x = padL + gap * i + gap / 2 - barW / 2;
      const barH = (Math.abs(d.profit) / maxVal) * (chartH / 2) * 0.9;
      const barY = d.profit >= 0 ? zeroY - barH : zeroY;
      ctx.fillStyle = d.profit >= 0 ? 'rgba(0,230,138,0.7)' : 'rgba(239,68,68,0.7)';
      ctx.beginPath(); ctx.roundRect(x, barY, barW, barH, 3); ctx.fill();
      ctx.fillStyle = '#64748B'; ctx.font = '9px Inter, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(d.week.replace(/^\d{4}-/, ''), x + barW / 2, padT + chartH + 14);
    });
  }

  function drawMonthlyHRChart() {
    const canvas = monthlyRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const parent = canvas.parentElement;
    canvas.width = parent.offsetWidth * 2; canvas.height = parent.offsetHeight * 2;
    ctx.scale(2, 2);
    const w = parent.offsetWidth, h = parent.offsetHeight;
    ctx.clearRect(0, 0, w, h);

    if (monthly.length === 0) {
      ctx.fillStyle = '#64748B'; ctx.font = '13px Inter, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('Marca resultados para ver hit rate mensual', w / 2, h / 2);
      return;
    }

    const padL = 50, padR = 20, padT = 20, padB = 40;
    const chartW = w - padL - padR, chartH = h - padT - padB;
    const gap = chartW / monthly.length;
    const barW = Math.min(gap * 0.6, 40);

    ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 1;
    for (let pct = 0; pct <= 100; pct += 25) {
      const y = padT + chartH - (pct / 100) * chartH;
      ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(w - padR, y); ctx.stroke();
      ctx.fillStyle = '#64748B'; ctx.font = '10px Inter, sans-serif'; ctx.textAlign = 'right';
      ctx.fillText(pct + '%', padL - 8, y + 4);
    }

    const thresholdY = padT + chartH - 0.5 * chartH;
    ctx.setLineDash([4, 4]); ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.beginPath(); ctx.moveTo(padL, thresholdY); ctx.lineTo(w - padR, thresholdY); ctx.stroke();
    ctx.setLineDash([]);

    monthly.forEach((d, i) => {
      const x = padL + gap * i + gap / 2 - barW / 2;
      const barH = (d.hitRate / 100) * chartH * 0.9;
      const barY = padT + chartH - barH;
      const color = d.hitRate >= 60 ? 'rgba(0,230,138,0.7)' : d.hitRate >= 40 ? 'rgba(255,170,0,0.7)' : 'rgba(239,68,68,0.7)';
      ctx.fillStyle = color; ctx.beginPath(); ctx.roundRect(x, barY, barW, barH, 3); ctx.fill();
      if (d.total >= 1) {
        ctx.fillStyle = '#e2e8f0'; ctx.font = 'bold 10px Inter, sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(d.hitRate + '%', x + barW / 2, barY - 6);
      }
      ctx.fillStyle = '#64748B'; ctx.font = '9px Inter, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(d.month.replace(/^\d{4}-/, ''), x + barW / 2, padT + chartH + 14);
    });
  }

  const streakIcon = streak.type === 'W' ? '🔥' : '❄️';
  const streakClass = streak.count > 0 ? (streak.type === 'W' ? 'green' : 'danger') : '';
  const bankrollClass = stats.totalPnl >= 0 ? 'green' : 'danger';

  return (
    <div className="dashboard">
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="label">Total</div>
          <div className="value">{stats.total}</div>
          <div className="sub">{stats.pending} pendientes</div>
        </div>
        <div className="metric-card green">
          <div className="glow" />
          <div className="label">Acierto</div>
          <div className="value">{stats.resolved > 0 ? `${stats.hitRate}%` : '—'}</div>
          <div className="sub">{stats.wins}W / {stats.losses}L</div>
        </div>
        <div className={`metric-card ${streakClass}`}>
          <div className="glow" />
          <div className="label">Racha</div>
          <div className="value">{streak.count > 0 ? `${streakIcon} ${streak.count}${streak.type}` : '—'}</div>
          <div className="sub">{streak.type === 'L' && streak.count >= 3 ? '⚠️ ¡Reduce stakes!' : streak.count > 0 ? (streak.type === 'W' ? 'Racha ganadora' : 'Racha perdedora') : 'Sin datos'}</div>
        </div>
        <div className={`metric-card ${bankrollClass}`}>
          <div className="glow" />
          <div className="label">Bankroll</div>
          <div className="value">{settings.bankroll ? `€${currentBankroll.toFixed(0)}` : '—'}</div>
          <div className="sub">{settings.bankroll ? `P/L: ${stats.totalPnl >= 0 ? '+' : ''}€${stats.totalPnl.toFixed(2)}` : 'Sin bankroll'}</div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="panel">
          <div className="panel-title"><span className="icon">📈</span> Evolución Bankroll</div>
          <div className="chart-container"><canvas ref={bankrollRef} /></div>
        </div>
        <div className="panel">
          <div className="panel-title"><span className="icon">📊</span> Por Mercado</div>
          {Object.entries(marketStats).length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', padding: '1rem 0' }}>Sin datos aún</div>
          ) : Object.entries(marketStats).map(([name, data]) => {
            const pct = data.hitRate;
            const color = pct >= 70 ? 'var(--accent)' : pct >= 50 ? 'var(--warning)' : 'var(--danger)';
            return (
              <div key={name} className="market-bar-item">
                <div className="market-bar-header">
                  <span className="name">{name}</span>
                  <span className="pct" style={{ color }}>{pct}% ({data.wins}/{data.total})</span>
                </div>
                <div className="market-bar-track">
                  <div className="market-bar-fill" style={{ width: `${pct}%`, background: color }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="panel">
          <div className="panel-title"><span className="icon">📉</span> P/L Semanal</div>
          <div className="chart-container"><canvas ref={weeklyRef} /></div>
        </div>
        <div className="panel">
          <div className="panel-title"><span className="icon">🎯</span> Hit Rate Mensual</div>
          <div className="chart-container"><canvas ref={monthlyRef} /></div>
        </div>
      </div>
    </div>
  );
}
