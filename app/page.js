'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import Chat from '@/components/Chat';
import Dashboard from '@/components/Dashboard';
import History from '@/components/History';
import OddsSearch from '@/components/OddsSearch';
import Settings from '@/components/Settings';
import Auth from '@/components/Auth';
import { useAuth } from '@/lib/auth';
import { createClient } from '@/lib/supabase-browser';

const STORAGE_KEY = 'analista_v2';
const DEFAULT_SETTINGS = { apiKey: '', proxyUrl: '', xAuthToken: '', bankroll: 0, bookmakers: ['Bet365', 'Betfair', 'Winamax'] };

function loadLocalData() {
  if (typeof window === 'undefined') return { settings: DEFAULT_SETTINGS, predictions: [] };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { settings: DEFAULT_SETTINGS, predictions: [] };
}

function saveLocalData(data) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export default function Home() {
  const { user, loading: authLoading, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [data, setData] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [dbSessionId, setDbSessionId] = useState(null);
  const syncRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!user) {
      setData(loadLocalData());
      return;
    }
    const supabase = createClient();
    let cancelled = false;

    async function loadRemote() {
      const { data: sessions } = await supabase.from('sessions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1);
      let sessionId;
      if (sessions && sessions.length > 0) {
        sessionId = sessions[0].id;
      } else {
        const { data: newSession } = await supabase.from('sessions').insert({ user_id: user.id, name: 'Sesión Principal' }).select().single();
        sessionId = newSession?.id || crypto.randomUUID();
      }
      if (cancelled) return;
      setDbSessionId(sessionId);

      const { data: preds } = await supabase.from('predictions').select('*').eq('user_id', user.id).eq('session_id', sessionId).order('created_at', { ascending: true });
      const { data: settingsRow } = await supabase.from('user_settings').select('*').eq('user_id', user.id).single();

      if (cancelled) return;
      const settings = settingsRow || DEFAULT_SETTINGS;
      const predictions = (preds || []).map(p => ({
        ...p,
        match_name: p.match_name,
        odds: parseFloat(p.odds) || 0,
        stake: parseFloat(p.stake) || 0,
        pnl: p.pnl !== null ? parseFloat(p.pnl) : null,
      }));
      setData({ settings, predictions });
      syncRef.current = true;
    }

    loadRemote();
    return () => { cancelled = true; };
  }, [user]);

  const showToast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }, []);

  const persistPrediction = useCallback(async (pred, action) => {
    if (!user || !dbSessionId) return;
    const supabase = createClient();
    const row = {
      id: pred.id,
      user_id: user.id,
      session_id: dbSessionId,
      match_name: pred.match_name,
      market: pred.market || 'Otro',
      bookmaker: pred.bookmaker,
      odds: pred.odds,
      confidence: pred.confidence || 'Media',
      stake: pred.stake,
      result: pred.result,
      pnl: pred.pnl,
    };
    if (action === 'insert') {
      await supabase.from('predictions').insert(row);
    } else if (action === 'update') {
      await supabase.from('predictions').update(row).eq('id', pred.id).eq('user_id', user.id).eq('session_id', dbSessionId);
    }
  }, [user, dbSessionId]);

  const onPrediction = useCallback((pred) => {
    setData(prev => {
      const preds = [...prev.predictions];
      const existingIdx = preds.findIndex(p => p.id === pred.id);
      let action;
      if (existingIdx !== -1) {
        preds[existingIdx] = { ...preds[existingIdx], ...pred };
        action = 'update';
      } else {
        preds.push({ ...pred, created_at: new Date().toISOString(), session_id: dbSessionId || 'local' });
        action = 'insert';
      }
      const next = { ...prev, predictions: preds };
      if (!user) saveLocalData(next);
      else persistPrediction({ ...pred, user_id: user.id, session_id: dbSessionId }, action);
      showToast(`📋 Pronóstico ${pred.id} registrado`, 'success');
      return next;
    });
  }, [showToast, user, dbSessionId, persistPrediction]);

  const handleUpdatePred = useCallback((id, updates) => {
    setData(prev => {
      const preds = prev.predictions.map(p => {
        if (p.id !== id) return p;
        const updated = { ...p, ...updates };
        if (updates.result) {
          if (prev.settings.bankroll && updated.stake) {
            if (updates.result === 'W') updated.pnl = +(updated.stake * (updated.odds - 1)).toFixed(2);
            else if (updates.result === 'L') updated.pnl = -updated.stake;
            else updated.pnl = 0;
          }
        }
        return updated;
      });
      const next = { ...prev, predictions: preds };
      if (!user) saveLocalData(next);
      return next;
    });
    if (user && dbSessionId) {
      const pred = data?.predictions?.find(p => p.id === id);
      if (pred) persistPrediction({ ...pred, ...updates, user_id: user.id, session_id: dbSessionId }, 'update');
    }
    const icon = updates.result === 'W' ? '✅' : updates.result === 'L' ? '❌' : '⬜';
    if (updates.result) showToast(`${icon} ${id} marcado como ${updates.result}`, updates.result === 'W' ? 'success' : updates.result === 'L' ? 'error' : 'info');
  }, [showToast, user, dbSessionId, persistPrediction, data]);

  const handleDeletePred = useCallback((id) => {
    setData(prev => {
      const preds = prev.predictions.filter(p => p.id !== id);
      const next = { ...prev, predictions: preds };
      if (!user) saveLocalData(next);
      return next;
    });
    if (user && dbSessionId) {
      const supabase = createClient();
      supabase.from('predictions').delete().eq('id', id).eq('user_id', user.id).eq('session_id', dbSessionId);
    }
    showToast(`❌ ${id} eliminado`, 'error');
  }, [showToast, user, dbSessionId]);

  const saveSettings = useCallback((newSettings) => {
    setData(prev => {
      const next = { ...prev, settings: newSettings };
      if (!user) saveLocalData(next);
      return next;
    });
    if (user) {
      const supabase = createClient();
      supabase.from('user_settings').upsert({
        user_id: user.id,
        bankroll: newSettings.bankroll || 0,
        bookmakers: newSettings.bookmakers || [],
        proxy_url: newSettings.proxyUrl || '',
        x_auth_token: newSettings.xAuthToken || '',
      }, { onConflict: 'user_id' });
    }
    showToast('⚙️ Configuración guardada', 'success');
  }, [showToast, user]);

  const resetAll = useCallback(() => {
    if (!confirm('⚠️ ¿Borrar TODOS los datos?')) return;
    if (!confirm('¿Estás SEGURO? Se perderán todos los pronósticos y configuración.')) return;
    localStorage.removeItem(STORAGE_KEY);
    if (user && dbSessionId) {
      const supabase = createClient();
      supabase.from('predictions').delete().eq('user_id', user.id).eq('session_id', dbSessionId);
    }
    setData({ settings: DEFAULT_SETTINGS, predictions: [] });
    showToast('🗑️ Datos borrados', 'info');
  }, [showToast, user, dbSessionId]);

  const sendToChat = useCallback((text) => {
    setChatInput(text);
    setActiveTab('chat');
    setTimeout(() => setChatInput(''), 100);
  }, []);

  if (authLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--text-secondary)' }}>
        <div className="typing-indicator visible"><div className="typing-dot"></div><div className="typing-dot"></div><div className="typing-dot"></div></div>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <header className="app-header">
          <div className="header-top">
            <div className="logo">
              <div className="logo-icon">⚽</div>
              <div className="logo-text"><h1>El Analista</h1><span>Pronósticos inteligentes</span></div>
            </div>
          </div>
        </header>
        <Auth />
        <div className="toast-container">
          {toasts.map(t => (
            <div key={t.id} className={`toast ${t.type}`}>
              <span className="toast-icon">{t.type === 'success' ? '✅' : t.type === 'error' ? '❌' : 'ℹ️'}</span> {t.message}
            </div>
          ))}
        </div>
      </>
    );
  }

  if (!data) return null;

  const pendingCount = data.predictions.filter(p => !p.result).length;
  const tabs = [
    { id: 'dashboard', label: '📊 Dashboard' },
    { id: 'chat', label: '💬 Chat' },
    { id: 'history', label: '📋 Historial', badge: pendingCount || null },
    { id: 'odds', label: '🔍 Cuotas' },
  ];

  return (
    <>
      <header className="app-header">
        <div className="header-top">
          <div className="logo">
            <div className="logo-icon">⚽</div>
            <div className="logo-text">
              <h1>El Analista</h1>
              <span>{user.email}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <Settings settings={data.settings} onSave={saveSettings} onReset={resetAll} />
            <button className="btn-icon" onClick={signOut} title="Cerrar sesión">🚪</button>
          </div>
        </div>
        <nav className="header-tabs">
          {tabs.map(tab => (
            <button key={tab.id} className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}>
              {tab.label}
              {tab.badge && <span className="tab-badge">{tab.badge}</span>}
            </button>
          ))}
        </nav>
      </header>

      <main className="app-content">
        <div className={`tab-panel ${activeTab === 'dashboard' ? 'active' : ''}`}>
          <Dashboard predictions={data.predictions} settings={data.settings} />
        </div>
        <div className={`tab-panel ${activeTab === 'chat' ? 'active' : ''}`}>
          <Chat predictions={data.predictions} settings={data.settings} onPrediction={onPrediction} initialInput={chatInput} dbSessionId={dbSessionId} />
        </div>
        <div className={`tab-panel ${activeTab === 'history' ? 'active' : ''}`}>
          <History predictions={data.predictions} onUpdate={handleUpdatePred} onDelete={handleDeletePred} />
        </div>
        <div className={`tab-panel ${activeTab === 'odds' ? 'active' : ''}`}>
          <OddsSearch settings={data.settings} onSendToChat={sendToChat} />
        </div>
      </main>

      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast ${t.type}`}>
            <span className="toast-icon">{t.type === 'success' ? '✅' : t.type === 'error' ? '❌' : 'ℹ️'}</span> {t.message}
          </div>
        ))}
      </div>
    </>
  );
}
