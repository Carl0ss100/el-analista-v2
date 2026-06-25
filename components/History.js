'use client';

import { useState, useCallback } from 'react';
import { matchTeam } from '@/lib/teamTranslations';

export default function History({ predictions, onUpdate, onDelete }) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [marketFilter, setMarketFilter] = useState('all');

  let preds = [...predictions].reverse();

  if (search) preds = preds.filter(p => (p.match_name || '').toLowerCase().includes(search.toLowerCase()));
  if (filter === 'pending') preds = preds.filter(p => !p.result);
  else if (filter !== 'all') preds = preds.filter(p => p.result === filter);
  if (marketFilter !== 'all') preds = preds.filter(p => p.market === marketFilter);

  const pendingCount = predictions.filter(p => !p.result).length;
  const markets = [...new Set(predictions.map(p => p.market || 'Otro'))];

  const handleMarkResult = useCallback((id, result) => {
    onUpdate(id, { result });
  }, [onUpdate]);

  const handleEdit = useCallback((id, field, value) => {
    let clean = value.replace(/—/g, '').trim();
    if (field === 'confidence') clean = clean.replace(/🔥|⚠️|⚡/g, '').trim();
    if (field === 'stake') clean = clean.replace(/€/g, '').trim();
    if (!clean) return;
    onUpdate(id, { [field]: clean });
  }, [onUpdate]);

  const resolveAll = useCallback(async () => {
    const pending = predictions.filter(p => !p.result && p.match_name);
    for (const pred of pending) {
      const parts = pred.match_name.split(/\s*vs\.?\s*|\s*-\s*/i).filter(Boolean);
      if (parts.length < 2) continue;
      try {
        const res = await fetch(`/api/football/result?team1=${encodeURIComponent(parts[0].trim())}&team2=${encodeURIComponent(parts[1].trim())}`);
        const data = await res.json();
        if (data.finished) {
          let result = 'V';
          const gh = data.goalsHome;
          const ga = data.goalsAway;
          const homeWon = gh > ga;
          const awayWon = ga > gh;
          const draw = gh === ga;
          const market = (pred.market || '').toLowerCase();

          if (data.home && data.away) {
            const homeScore = matchTeam(data.home, parts[0].trim());
            const awayScore = matchTeam(data.away, parts[1].trim());
            const isHome = homeScore >= awayScore;
            const homeTeam = isHome;
            const awayTeam = !isHome;

            if (market.includes('1x2') || market.includes('resultado')) {
              if (draw) result = 'V';
              else if ((homeTeam && homeWon) || (awayTeam && awayWon)) result = 'W';
              else result = 'L';
            } else if (market.includes('over') || market.includes('más')) {
              const total = gh + ga;
              const lineMatch = (pred.bet_description || pred.match_name).match(/(\d+\.?\d*)/);
              const line = lineMatch ? parseFloat(lineMatch[1]) : 2.5;
              result = total > line ? 'W' : 'L';
            } else if (market.includes('under') || market.includes('menos')) {
              const total = gh + ga;
              const lineMatch = (pred.bet_description || pred.match_name).match(/(\d+\.?\d*)/);
              const line = lineMatch ? parseFloat(lineMatch[1]) : 2.5;
              result = total < line ? 'W' : 'L';
            } else if (market.includes('btts') || market.includes('ambos')) {
              result = (gh > 0 && ga > 0) ? 'W' : 'L';
            } else {
              if (draw) result = 'V';
              else if ((homeTeam && homeWon) || (awayTeam && awayWon)) result = 'W';
              else result = 'L';
            }
          } else {
            if (market.includes('1x2') || market.includes('resultado')) {
              const isHomePred = pred.match_name.toLowerCase().startsWith(parts[0].toLowerCase());
              if (draw) result = 'V';
              else if ((isHomePred && homeWon) || (!isHomePred && awayWon)) result = 'W';
              else result = 'L';
            } else if (market.includes('over') || market.includes('más')) {
              const total = gh + ga;
              const lineMatch = (pred.bet_description || pred.match_name).match(/(\d+\.?\d*)/);
              const line = lineMatch ? parseFloat(lineMatch[1]) : 2.5;
              result = total > line ? 'W' : 'L';
            } else if (market.includes('under') || market.includes('menos')) {
              const total = gh + ga;
              const lineMatch = (pred.bet_description || pred.match_name).match(/(\d+\.?\d*)/);
              const line = lineMatch ? parseFloat(lineMatch[1]) : 2.5;
              result = total < line ? 'W' : 'L';
            } else if (market.includes('btts') || market.includes('ambos')) {
              result = (gh > 0 && ga > 0) ? 'W' : 'L';
            } else {
              result = homeWon || awayWon ? 'W' : 'V';
            }
          }
          onUpdate(pred.id, { result });
        }
      } catch {}
    }
  }, [predictions, onUpdate]);

  const exportCSV = useCallback(() => {
    if (predictions.length === 0) return;
    let csv = 'ID,Partido,Mercado,Casa,Cuota,Confianza,Stake,Resultado,P/L,Fecha\n';
    predictions.forEach(p => {
      csv += `${p.id},"${p.match_name || ''}",${p.market || ''},${p.bookmaker || ''},${p.odds || ''},${p.confidence || ''},${p.stake || ''},${p.result || 'Pendiente'},${p.pnl || 0},${p.created_at || ''}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `analista_historial_${new Date().toISOString().split('T')[0]}.csv`; a.click();
    URL.revokeObjectURL(url);
  }, [predictions]);

  return (
    <div className="history-panel">
      <div className="history-toolbar">
        <input placeholder="Buscar partido..." value={search} onChange={e => setSearch(e.target.value)} />
        <select value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="all">Todos</option>
          <option value="pending">Pendientes</option>
          <option value="W">Ganados</option>
          <option value="L">Perdidos</option>
          <option value="V">Nulos</option>
        </select>
        <select value={marketFilter} onChange={e => setMarketFilter(e.target.value)}>
          <option value="all">Todos los mercados</option>
          {markets.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        {pendingCount > 0 && (
          <button className="btn-sm btn-export" onClick={resolveAll} style={{ background: 'var(--blue)', color: 'white', borderColor: 'var(--blue)' }}>
            🔄 Resolver ({pendingCount})
          </button>
        )}
        <button className="btn-sm btn-export" onClick={exportCSV}>📥 CSV</button>
      </div>

      {preds.length === 0 ? (
        <div className="empty-state"><div className="icon">📋</div><p>No hay pronósticos que mostrar</p></div>
      ) : (
        <table className="history-table">
          <thead><tr>
            <th>ID</th><th>Partido</th><th>Mercado</th><th>Casa</th><th>Cuota</th><th>Confianza</th><th>Stake</th><th>Resultado</th><th>P/L</th><th>Acc.</th>
          </tr></thead>
          <tbody>
            {preds.map(p => {
              const confIcon = p.confidence === 'Alta' ? '🔥' : p.confidence === 'Baja' ? '⚠️' : '⚡';
              const pnlDisplay = p.pnl !== null && p.pnl !== undefined
                ? (p.pnl >= 0 ? <span className="pnl-positive">+€{p.pnl.toFixed(2)}</span> : <span className="pnl-negative">-€{Math.abs(p.pnl).toFixed(2)}</span>)
                : '—';
              return (
                <tr key={p.id}>
                  <td><span style={{ fontFamily: 'var(--mono)', color: 'var(--accent)', fontWeight: 500 }}>{p.id}</span></td>
                  <td className="editable-cell" contentEditable suppressContentEditableWarning onBlur={e => handleEdit(p.id, 'match_name', e.target.innerText)}>{p.match_name || '—'}</td>
                  <td className="editable-cell" contentEditable suppressContentEditableWarning onBlur={e => handleEdit(p.id, 'market', e.target.innerText)}>{p.market || '—'}</td>
                  <td className="editable-cell" contentEditable suppressContentEditableWarning onBlur={e => handleEdit(p.id, 'bookmaker', e.target.innerText)}>{p.bookmaker || '—'}</td>
                  <td className="editable-cell" contentEditable suppressContentEditableWarning style={{ fontFamily: 'var(--mono)' }} onBlur={e => handleEdit(p.id, 'odds', e.target.innerText)}>{p.odds || '—'}</td>
                  <td className="editable-cell" contentEditable suppressContentEditableWarning onBlur={e => handleEdit(p.id, 'confidence', e.target.innerText)}>{confIcon} {p.confidence || '—'}</td>
                  <td className="editable-cell" contentEditable suppressContentEditableWarning style={{ fontFamily: 'var(--mono)' }} onBlur={e => handleEdit(p.id, 'stake', e.target.innerText)}>{p.stake ? `€${p.stake}` : '—'}</td>
                  <td>
                    {!p.result ? (
                      <div className="result-btns">
                        <button className="result-btn w" onClick={() => handleMarkResult(p.id, 'W')}>W</button>
                        <button className="result-btn l" onClick={() => handleMarkResult(p.id, 'L')}>L</button>
                        <button className="result-btn v" onClick={() => handleMarkResult(p.id, 'V')}>V</button>
                      </div>
                    ) : (
                      <span className={`result-badge ${p.result === 'W' ? 'win' : p.result === 'L' ? 'loss' : 'void'}`}>
                        {p.result === 'W' ? '✅ W' : p.result === 'L' ? '❌ L' : '⬜ V'}
                      </span>
                    )}
                  </td>
                  <td>{pnlDisplay}</td>
                  <td>
                    <button className="result-btn" onClick={() => { if (confirm(`¿Eliminar ${p.id}?`)) onDelete(p.id); }}
                      style={{ background: 'var(--danger)', fontSize: '0.65rem', padding: '2px 6px', color: 'white' }}>🗑</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
