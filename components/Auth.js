'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth';

export default function Auth() {
  const { signIn, signUp, resetPassword } = useAuth();
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);
    try {
      if (mode === 'login') {
        await signIn(email, password);
      } else if (mode === 'register') {
        await signUp(email, password);
        setSuccess('Cuenta creada. Revisa tu email para confirmar.');
        setMode('login');
      } else if (mode === 'reset') {
        await resetPassword(email);
        setSuccess('Email de recuperación enviado.');
      }
    } catch (err) {
      const msg = err.message || 'Error desconocido';
      if (msg.includes('Invalid login credentials')) setError('Email o contraseña incorrectos');
      else if (msg.includes('Email not confirmed')) setError('Confirma tu email antes de iniciar sesión');
      else if (msg.includes('already registered')) setError('Este email ya está registrado');
      else if (msg.includes('Password should be')) setError('La contraseña debe tener al menos 6 caracteres');
      else setError(msg);
    }
    setSubmitting(false);
  };

  const title = mode === 'login' ? '🔑 Iniciar sesión' : mode === 'register' ? '📝 Crear cuenta' : '🔄 Recuperar contraseña';
  const submitLabel = mode === 'login' ? 'Entrar' : mode === 'register' ? 'Crear cuenta' : 'Enviar email';

  return (
    <div className="modal-overlay visible" style={{ position: 'fixed', inset: 0 }}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
        <div className="modal-header">
          <h2>{title}</h2>
        </div>
        <div className="modal-body">
          {error && <div className="form-error">{error}</div>}
          {success && <div className="form-success">{success}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@email.com" required autoComplete="email" />
            </div>

            {mode !== 'reset' && (
              <div className="form-group">
                <label className="form-label">Contraseña</label>
                <input className="form-input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" required minLength={6} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
              </div>
            )}

            <button className="btn-primary" type="submit" disabled={submitting} style={{ marginTop: '1rem' }}>
              {submitting ? '⏳ ...' : submitLabel}
            </button>
          </form>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '1rem', fontSize: '0.85rem' }}>
            {mode !== 'login' && (
              <button className="btn-link" onClick={() => { setMode('login'); setError(''); setSuccess(''); }}>Ya tengo cuenta</button>
            )}
            {mode !== 'register' && (
              <button className="btn-link" onClick={() => { setMode('register'); setError(''); setSuccess(''); }}>Crear cuenta</button>
            )}
            {mode !== 'reset' && (
              <button className="btn-link" onClick={() => { setMode('reset'); setError(''); setSuccess(''); }}>Olvidé mi contraseña</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
