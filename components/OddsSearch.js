'use client';

import { useState, useCallback } from 'react';

export default function OddsSearch({ settings, onSendToChat }) {
  const [team, setTeam] = useState('');
  const [status, setStatus] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const search = useCallback(async () => {
    if (!team.trim()) return;
    setLoading(true);
    setStatus('Buscando partidos...');
    setResults([]);

    try {
      const res = await fetch(`/api/football/search?team=${encodeURIComponent(team.trim())}`);
      const data = await res.json();

      if (data.error) {
        setStatus(`❌ ${data.error}`);
      } else if (data.results?.length === 0) {
        setStatus('❌ No se encontraron partidos.');
      } else {
        setStatus(`✅ ${data.results.length} partido(s) encontrado(s).`);
        setResults(data.results);
      }
    } catch (e) {
      setStatus(`❌ Error de red: ${e.message}`);
    }
    setLoading(false);
  }, [team]);

  const fetchOdds = useCallback(async (fixtureId, matchName, leagueName) => {
    setLoading(true);
    setStatus(`Descargando cuotas para ${matchName}...`);

    try {
      const res = await fetch(`/api/football/odds?fixture=${fixtureId}`);
      const data = await res.json();

      if (data.error) {
        setStatus(`⚠️ ${data.error}`);
      } else if (!data.bookmakers?.length) {
        setStatus('⚠️ Las casas aún no han publicado cuotas.');
      } else {
        let text = `📅 ${leagueName}\n${matchName}\n\n`;
        const userBookmakers = settings?.bookmakers || ['Bet365', 'Betfair', 'Winamax'];

        let selected = data.bookmakers.filter(bm =>
          userBookmakers.some(b => bm.name.toLowerCase().includes(b.toLowerCase()) || b.toLowerCase().includes(bm.name.toLowerCase()))
        );
        if (selected.length === 0) selected = data.bookmakers.slice(0, 3);

        selected.forEach(bm => {
          text += `🏦 ${bm.name}\n`;
          bm.bets.forEach(bet => {
            const vals = bet.values.map(v => `${v.value}: ${v.odd}`).join(' | ');
            text += `  ${bet.name}: ${vals}\n`;
          });
          text += '\n';
        });

        text += 'Analiza TODAS estas cuotas, compara el valor entre casas por cada mercado, y dime las mejores apuestas.';
        onSendToChat(text);
        setStatus('');
      }
    } catch (e) {
      setStatus(`❌ Error: ${e.message}`);
    }
    setLoading(false);
  }, [settings, onSendToChat]);

  return (
    <div style={{ padding: '1.25rem' }}>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '1rem' }}>
        <input className="form-input" value={team} onChange={e => setTeam(e.target.value)}
          placeholder="Equipo (ej: Real Madrid, Barcelona)..." style={{ flex: 1 }}
          onKeyDown={e => e.key === 'Enter' && search()} />
        <button className="btn-primary" onClick={search} disabled={loading} style={{ width: 'auto', padding: '0.6rem 1.2rem' }}>
          {loading ? '⏳' : '🔍'} Buscar
        </button>
      </div>

      {status && <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>{status}</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {results.map((r, i) => (
          <button key={i} className="btn-primary" onClick={() => fetchOdds(r.id, `${r.home} vs ${r.away}`, r.league)}
            style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border)', textAlign: 'left' }}>
            <span style={{ color: 'var(--accent)', fontSize: '0.75rem' }}>{new Date(r.date).toLocaleDateString()} · {r.league}</span><br />
            {r.home} vs {r.away}
          </button>
        ))}
      </div>
    </div>
  );
}
