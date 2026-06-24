-- Configuración del usuario
CREATE TABLE user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL UNIQUE,
  bankroll DECIMAL DEFAULT 0,
  bookmakers TEXT[] DEFAULT '{"Bet365","Betfair","Winamax"}',
  proxy_url TEXT DEFAULT '',
  x_auth_token TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Pronósticos
CREATE TABLE predictions (
  id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users NOT NULL,
  session_id UUID NOT NULL,
  match_name TEXT NOT NULL,
  bet_description TEXT,
  market TEXT DEFAULT 'Otro',
  bookmaker TEXT,
  odds DECIMAL,
  confidence TEXT DEFAULT 'Media',
  stake DECIMAL DEFAULT 0,
  result TEXT,
  pnl DECIMAL,
  created_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  PRIMARY KEY (id, user_id, session_id)
);

-- Chat (historial completo para contexto de IA)
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  session_id UUID NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  edited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Sesiones
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  name TEXT DEFAULT 'Sesión Principal',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Resultados de partidos (caché para no repetir llamadas a la API)
CREATE TABLE match_results (
  fixture_id INTEGER PRIMARY KEY,
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  home_goals INTEGER,
  away_goals INTEGER,
  league TEXT,
  status TEXT,
  match_date TIMESTAMPTZ,
  fetched_at TIMESTAMPTZ DEFAULT now()
);

-- RLS policies
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own settings" ON user_settings FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Users see own predictions" ON predictions FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Users see own messages" ON messages FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Users see own sessions" ON sessions FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Anyone can read cached results" ON match_results FOR SELECT USING (true);
