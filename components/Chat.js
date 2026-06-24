'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { createClient } from '@/lib/supabase-browser';

const COMMANDS = [
  '!historial', '!stats', '!racha', '!bankroll', '!reset'
];

export default function Chat({ predictions, settings, onPrediction, initialInput, dbSessionId }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState(initialInput || '');
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const messagesRef = useRef(messages);
  const predictionsRef = useRef(predictions);
  const settingsRef = useRef(settings);
  const loadedRef = useRef(false);

  useEffect(() => { messagesRef.current = messages; }, [messages]);
  useEffect(() => { predictionsRef.current = predictions; }, [predictions]);
  useEffect(() => { settingsRef.current = settings; }, [settings]);

  useEffect(() => {
    if (initialInput) setInput(initialInput);
  }, [initialInput]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (loadedRef.current || !user || !dbSessionId) return;
    loadedRef.current = true;
    const supabase = createClient();
    supabase.from('messages')
      .select('*')
      .eq('user_id', user.id)
      .eq('session_id', dbSessionId)
      .order('created_at', { ascending: true })
      .limit(100)
      .then(({ data }) => {
        if (data && data.length > 0) {
          setMessages(data.map(m => ({
            id: m.id,
            role: m.role,
            content: m.content,
            created_at: m.created_at,
          })));
        }
      });
  }, [user, dbSessionId]);

  const persistMessage = useCallback(async (role, content) => {
    if (!user || !dbSessionId) return;
    const supabase = createClient();
    await supabase.from('messages').insert({
      user_id: user.id,
      session_id: dbSessionId,
      role,
      content,
    });
  }, [user, dbSessionId]);

  const addMessage = useCallback((role, content) => {
    const id = Date.now() + Math.random();
    setMessages(prev => [...prev, { role, content, id }]);
    persistMessage(role, content);
    return id;
  }, [persistMessage]);

  const deleteMessage = useCallback((id) => {
    setMessages(prev => prev.filter(m => m.id !== id));
    if (user && dbSessionId && typeof id === 'string') {
      const supabase = createClient();
      supabase.from('messages').delete().eq('id', id).eq('user_id', user.id);
    }
  }, [user, dbSessionId]);

  const startEdit = useCallback((id, content) => {
    setEditingId(id);
    setEditText(content);
  }, []);

  const saveEdit = useCallback(async (id) => {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, content: editText } : m));
    setEditingId(null);
    if (user && dbSessionId && typeof id === 'string') {
      const supabase = createClient();
      await supabase.from('messages').update({ content: editText, edited_at: new Date().toISOString() }).eq('id', id).eq('user_id', user.id);
    }
  }, [editText, user, dbSessionId]);

  const detectPredictions = useCallback((text) => {
    const regex = /(?:⚽|🏟️)?\s*\[?(P\d{3,4})\]?/g;
    const parts = text.split(regex);
    if (parts.length < 3) return [];

    const results = [];
    const bk = settingsRef.current?.bankroll || 0;

    for (let i = 1; i < parts.length; i += 2) {
      const id = parts[i];
      const block = parts[i + 1];
      let match = 'Partido desconocido';
      const mm = block.match(/^\s*(.+?)(?:\s*—|\n|$)/m);
      if (mm) match = mm[1].replace(/—.*/, '').trim();

      let market = 'Otro';
      const mk = { '1X2': /1X2|resultado final/i, 'Over/Under': /over|under|más de|menos de/i, 'BTTS': /BTTS|ambos.*marcan/i, 'Hándicap': /h[aá]ndicap/i, 'Combinada': /combinada/i, 'Doble oportunidad': /doble oportunidad/i };
      for (const [k, r] of Object.entries(mk)) { if (r.test(block)) { market = k; break; } }

      let confidence = 'Media';
      if (/🔥|[Aa]lta/.test(block)) confidence = 'Alta';
      else if (/⚠️|[Bb]aja/.test(block)) confidence = 'Baja';

      let odds = 0;
      const oddsMatch = block.match(/[Cc]uota[:\s]*(\d+\.?\d*)/);
      if (oddsMatch) odds = parseFloat(oddsMatch[1]);

      let stake = 0;
      const stakeMatch = block.match(/[Ss]take[:\s]*[€$]?\s*(\d+\.?\d*)/);
      if (stakeMatch) stake = parseFloat(stakeMatch[1]);
      else if (bk) {
        if (confidence === 'Alta') stake = +(bk * 0.05).toFixed(2);
        else if (confidence === 'Media') stake = +(bk * 0.03).toFixed(2);
        else stake = +(bk * 0.01).toFixed(2);
      }

      results.push({ id, match_name: match, market, odds, confidence, stake, result: null, pnl: null });
    }
    return results;
  }, []);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    addMessage('user', text);

    const apiMsgs = [...messagesRef.current, { role: 'user', content: text }].slice(-20).map(m => ({ role: m.role, content: m.content }));

    setLoading(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMsgs, predictions: predictionsRef.current, settings: settingsRef.current, userId: user?.id, sessionId: dbSessionId })
      });
      const data = await res.json();
      if (data.error) {
        addMessage('system', `⚠️ Error: ${data.error}`);
      } else {
        addMessage('assistant', data.content);
        const newPreds = detectPredictions(data.content);
        newPreds.forEach(pred => onPrediction(pred));
      }
    } catch (e) {
      addMessage('system', `⚠️ Error de red: ${e.message}`);
    }
    setLoading(false);
  }, [input, loading, addMessage, detectPredictions, onPrediction, user, dbSessionId]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const quickCmd = (cmd) => {
    setInput(cmd);
    setTimeout(() => sendMessage(), 50);
  };

  const renderContent = (content) => {
    let html = content.replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>');
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    return html;
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).catch(() => {});
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="msg system" style={{ alignSelf: 'center' }}>
            🟢 Sistema de memoria activo. Escribe un partido con cuotas o saluda a El Analista.
          </div>
        )}
        {messages.map(m => (
          <div key={m.id} className={`msg ${m.role}`}>
            {editingId === m.id ? (
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                <textarea className="form-input" value={editText} onChange={e => setEditText(e.target.value)} rows={3} style={{ flex: 1, fontSize: '0.85rem' }} autoFocus />
                <button className="msg-action" onClick={() => saveEdit(m.id)} style={{ color: 'var(--accent)' }}>✓</button>
                <button className="msg-action" onClick={() => setEditingId(null)}>✕</button>
              </div>
            ) : (
              <>
                <span dangerouslySetInnerHTML={{ __html: renderContent(m.content) }} />
                <div className="msg-actions">
                  <button className="msg-action" onClick={() => copyToClipboard(m.content)} title="Copiar">📋</button>
                  {m.role !== 'system' && (
                    <button className="msg-action" onClick={() => startEdit(m.id, m.content)} title="Editar">✏️</button>
                  )}
                  <button className="msg-action" onClick={() => deleteMessage(m.id)} title="Eliminar">🗑</button>
                </div>
              </>
            )}
          </div>
        ))}
        {loading && (
          <div className="typing-indicator visible">
            <div className="typing-dot"></div>
            <div className="typing-dot"></div>
            <div className="typing-dot"></div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-commands">
        {COMMANDS.map(cmd => (
          <button key={cmd} className="cmd-btn" onClick={() => quickCmd(cmd)}>{cmd}</button>
        ))}
      </div>

      <div className="chat-input-bar">
        <textarea
          ref={inputRef}
          id="chatInput"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Escribe un partido, pega cuotas..."
          rows={1}
        />
        <button className="send-btn" onClick={sendMessage} disabled={loading}>➤</button>
      </div>
    </div>
  );
}
