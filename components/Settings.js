'use client';

import { useState } from 'react';

export default function Settings({ settings, onSave, onReset }) {
  const [form, setForm] = useState({ ...settings });
  const [showPanel, setShowPanel] = useState(false);

  const update = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const toggleBookmaker = (bk) => {
    setForm(prev => ({
      ...prev,
      bookmakers: prev.bookmakers.includes(bk)
        ? prev.bookmakers.filter(b => b !== bk)
        : [...prev.bookmakers, bk]
    }));
  };

  const save = () => {
    onSave({ ...form, proxyUrl: form.proxyUrl.replace(/\/$/, '') });
  };

  const ALL_BOOKMAKERS = ['Bet365', 'Betfair', 'Winamax', 'Bwin', 'William Hill', '888sport', 'Unibet', 'Codere'];

  if (!showPanel) {
    return <button className="btn-icon" onClick={() => setShowPanel(true)} title="Configuración">⚙️</button>;
  }

  return (
    <div className="modal-overlay visible" onClick={() => setShowPanel(false)}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>⚙️ Configuración</h2>
          <button className="modal-close" onClick={() => setShowPanel(false)}>✕</button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">Proxy URL (Cloudflare Worker)</label>
            <input className="form-input" value={form.proxyUrl || ''} onChange={e => update('proxyUrl', e.target.value)} placeholder="https://tu-worker.workers.dev" />
            <div className="form-hint">URL de tu Cloudflare Worker que conecta con API-Football y la IA</div>
          </div>

          <div className="form-group">
            <label className="form-label">Football-Data.org Token</label>
            <input className="form-input" value={form.xAuthToken || ''} onChange={e => update('xAuthToken', e.target.value)} placeholder="Tu token de football-data.org" />
            <div className="form-hint">Fallback para buscar resultados (CORS-friendly)</div>
          </div>

          <div className="form-group">
            <label className="form-label">The-Odds-API Key</label>
            <input className="form-input" value={form.oddsApiKey || ''} onChange={e => update('oddsApiKey', e.target.value)} placeholder="Tu API key de the-odds-api.com" />
            <div className="form-hint">Cuotas de Pinnacle + 20 casas EU — valor real detectado (registrate en the-odds-api.com)</div>
          </div>

          <div className="form-group">
            <label className="form-label">Bankroll (€)</label>
            <input className="form-input" type="number" value={form.bankroll || ''} onChange={e => update('bankroll', parseFloat(e.target.value) || 0)} placeholder="0" />
          </div>

          <div className="form-group">
            <label className="form-label">Casas de apuestas</label>
            <div className="checkbox-group">
              {ALL_BOOKMAKERS.map(bk => (
                <label key={bk} className="checkbox-item">
                  <input type="checkbox" checked={(form.bookmakers || []).includes(bk)} onChange={() => toggleBookmaker(bk)} />
                  {bk}
                </label>
              ))}
            </div>
          </div>

          <button className="btn-primary" onClick={save}>Guardar</button>
          <button className="btn-danger" onClick={onReset}>🗑 Borrar todos los datos</button>

          <div className="section-divider">Datos</div>
          <button className="btn-sm btn-export" onClick={() => {
            const data = JSON.stringify({ settings: form, predictions: [] }, null, 2);
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = 'analista_backup.json'; a.click();
            URL.revokeObjectURL(url);
          }}>📦 Exportar backup</button>
        </div>
      </div>
    </div>
  );
}
