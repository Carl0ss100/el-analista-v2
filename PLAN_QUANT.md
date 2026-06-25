# PLAN: IA Cuantitativa Nivel Trading Algorítmico

## Estado actual
- `lib/models.js`: Poisson, Elo, EV/Kelly, findValueBets ✅
- `/api/football/h2h`: H2H endpoint ✅
- `/api/football/analyze`: análisis completo ✅
- `!analyze Team1 vs Team2`: inyección manual en chat route ✅
- `match_results` table en Supabase: existe pero sin usar ❌

## Problemas
1. Modelos solo se activan si usuario escribe `!analyze` — pasivo, no automático
2. `leagueAvgGoals=2.6` es genérico — Bundesliga 3.1, La Liga 2.5, Eredivisie 3.4
3. Poisson puro desestima empates y correlación de goles → Dixon-Coles corrige esto
4. Sin backtesting → no sabemos si los modelos funcionan ni qué ajustar

---

## PARÁMETRO 1: Auto-análisis con caché inteligente + detección híbrida

### 1A — Nuevo: `lib/matchDetector.js`
- `detectMatchup(text)` → detecta equipos con regex + lookup local + fallback API
  - Regex principal: `/(.+?)\s+vs\.?\s+(.+)/i` (cubrir "vs", "vs.", " - ")
  - Lookup local: escanear texto contra TEAM_NAME_MAP + TEAM_ALIASES
  - Si regex falla + encuentra 2 nombres conocidos → usarlos
  - Si encuentra 1 nombre conocido → buscar rival vía API (`fixtures?team=X&next=1`)
  - Retorna `{ team1, team2, method }` o `null`

### 1B — Nuevo: `lib/analysisEngine.js`
- Extraer lógica común de `chat/route.js` (líneas 162-278) + `analyze/route.js`
- `async runAnalysis(team1, team2, proxyUrl)`:
  1. Buscar team IDs (con caché en Supabase `team_cache`)
  2. Fetch forma reciente (con caché TTL=1h en `match_results`)
  3. Fetch H2H (con caché TTL=6h en `match_results`)
  4. Fetch cuotas si hay fixture próximo (con caché TTL=5min)
  5. Calcular Poisson, Elo, EV/Kelly, value bets
  6. Retornar `{ probs, h2h, elo1X2, valueBets, modelText, form, league }`

### 1C — Caché inteligente
- Nueva tabla Supabase `team_cache`: `{ api_id, name, alternate_names, league_id, last_fetched }`
- Añadir columnas a `match_results`: `data_type TEXT` (form|h2h|odds), `payload JSONB`, `expires_at TIMESTAMPTZ`
- Función `getCached(type, key)` / `setCache(type, key, data, ttl)`
- Si caché válido → 0 API calls; si no → fetch + guardar

### 1D — Modificar `app/api/chat/route.js`
- Antes de llamar a la API de IA:
  1. `detectMatchup(lastUserMsg.content)` 
  2. Si detecta 2 equipos → `await runAnalysis(team1, team2, proxyUrl)`
  3. Inyectar `modelText` + value bets en `systemContent`
  4. Timeout: 8s máximo; si falla → continuar sin datos
- Mantener `!analyze` como comando explícito (skip detección, forzar análisis)

### 1E — Modificar `app/api/football/analyze/route.js`
- Reemplazar lógica inline por `runAnalysis(team1, team2, proxyUrl)`

---

## PARÁMETRO 2: Calibración por Liga + Dixon-Coles

### 2A — Nuevo: `LEAGUE_AVG` map en `lib/models.js`
- Constante con medias de goles por liga:
  ```
  La Liga: 2.55, Premier League: 2.82, Bundesliga: 3.14, Ligue 1: 2.72,
  Serie A: 2.68, Eredivisie: 3.40, Primeira Liga: 2.52, Premier League Ruso: 2.30,
  Champions League: 2.95, Europa League: 2.78, Conference League: 2.65,
  World Cup: 2.65, Euro: 2.50, Copa América: 2.45, Nations League: 2.60,
  MLS: 2.90, J-League: 2.75, Saudi Pro League: 2.85
  ```
- `getLeagueAvg(leagueName)` → fuzzy match contra keys
- Modificar `estimateLambdas()` para aceptar `leagueName` param, usar `getLeagueAvg()`

### 2B — Dixon-Coles en `lib/models.js`
- `dixonColesProbabilities(homeLambda, awayLambda, rho, tau)`:
  - Calcular Poisson matrix
  - Ajustar celdas 0-0, 1-0, 0-1, 1-1 con parámetros ρ (rho) y τ (tau):
    - `τ(home, away) = ...` (fórmula Dixon-Coles)
    - Si (home=0,away=0): `τ = 1 - (1-p_home)(1-p_away) * rho`
    - Si (home=1,away=0) o (home=0,away=1): ajuste lineal
    - Si (home=1,away=1): ajuste opuesto
  - ρ default = -0.1 (draw enhancement), τ = 0 (simplificado)
  - Renormalizar la matriz (suma = 1)
  - Mismas salidas que `poissonProbabilities`
- `formatModelOutput()` actualizar para mostrar "DIXON-COLES" en vez de "POISSON"
- Mantener `poissonProbabilities` como fallback (si no hay datos de liga)

---

## PARÁMETRO 3: Backtesting + Calibración

### 3A — Nuevo: `lib/backtest.js`
- `backtest(predictions, modelResults)`:
  - Para cada predicción resuelta que tenga `modelProb` guardado:
    - Brier score = `(prob_model - outcome_real)^2`
    - Log loss = `-log(p_real)` si acierto, `-log(1-p_model)` si fallo
  - Agregar por mercado, liga, nivel de confianza
  - Retornar: `{ overall, byMarket, byLeague, calibration }`

### 3B — Columna nueva en `predictions` table
- `model_prob DECIMAL` — probabilidad del modelo al momento del pronóstico
- `model_type TEXT` — "poisson" | "dixon-coles"
- `model_data JSONB` — lambdas, probs, etc (para backtesting futuro)

### 3C — Inyectar backtest en system prompt
- Si hay >=10 predicciones con `model_prob`:
  - Brier score global + por mercado
  - "Tu modelo Poisson sobreestima empates en La Liga (Brier: 0.31 vs 0.25 ideal)"
  - Ajustar ρ de Dixon-Coles basado en residuos

### 3D — Endpoint `/api/backtest`
- GET → ejecuta backtest contra todas las predicciones resueltas del usuario
- Retorna métricas + recomendaciones de ajuste

---

## Orden de ejecución

1. **ANÁLISIS 1A**: `lib/matchDetector.js` — detección de equipos
2. **CACHÉ 1C**: Migration SQL + `lib/cache.js` — caché inteligente  
3. **ANÁLISIS 1B**: `lib/analysisEngine.js` — motor reutilizable
4. **LIGA AVG 2A**: `LEAGUE_AVG` + `getLeagueAvg()` en models.js
5. **DIXON-COLES 2B**: `dixonColesProbabilities()` en models.js
6. **BACKTEST 3A-B**: `lib/backtest.js` + migration SQL
7. **WIRE UP 1D**: Modificar chat route — auto-análisis
8. **WIRE UP 1E**: Refactorizar analyze route
9. **WIRE UP 3C**: Inyectar backtest en system prompt
10. **BUILD + DEPLOY**

---

## Archivos nuevos
- `lib/matchDetector.js`
- `lib/analysisEngine.js`  
- `lib/cache.js`
- `lib/backtest.js`
- `supabase/migrations/002_quantitative.sql`

## Archivos modificados
- `lib/models.js` — LEAGUE_AVG, getLeagueAvg(), dixonColesProbabilities()
- `lib/stats.js` — exportar función de calibración si hace falta
- `app/api/chat/route.js` — auto-análisis + backtest inyección
- `app/api/football/analyze/route.js` — usar analysisEngine
- `components/Chat.js` — posible indicador "📊 Analizando..." 
