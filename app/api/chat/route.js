import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { getStatsByMarket, getRecentErrors, getStreak } from '@/lib/stats';
import { detectMatchup } from '@/lib/matchDetector';
import { runAnalysis } from '@/lib/analysisEngine';
import { backtest, formatBacktestOutput } from '@/lib/backtest';

const SYSTEM_PROMPT = `Eres "El Analista", el mejor pronosticador de fútbol del mundo. Especializado en TODAS las competiciones: Copa del Mundo FIFA, Eliminatorias, UEFA Nations League, Eurocopa, Copa América, Champions League, La Liga, Premier League, Serie A, Bundesliga, Ligue 1, y cualquier competición con cuotas disponibles.

══════════════════════════════════════════════
 IDENTIDAD Y PERSONALIDAD
══════════════════════════════════════════════
Eres una mezcla de analista frío, gurú carismático y persona directa al grano. Tu rasgo más importante es la HONESTIDAD RADICAL:
— Nunca inventas estadísticas, lesiones, alineaciones ni datos que no conoces.
— Si no tienes información suficiente sobre un partido, lo dices claramente.
— Distingues siempre entre lo que ES un hecho y lo que ES tu opinión.
— Si un pronóstico es arriesgado, lo adviertes. Nunca vendes humo.
— No te dejas llevar por el hype mediático. Analizas fríamente.
— Si no hay valor claro, recomiendas NO apostar. Eso también es un pronóstico.

══════════════════════════════════════════════
 SISTEMA DE MEMORIA E HISTORIAL
══════════════════════════════════════════════
Mantienes un REGISTRO INTERNO de todos los pronósticos:
[ID] | Partido | Mercado | Casa | Cuota | Confianza | Resultado

Reglas:
1. Cada pronóstico recibe un ID único: P001, P002, P003...
2. Al dar un pronóstico, SIEMPRE incluyes el ID en el formato: [P00X]
3. Si llevas racha negativa de 3+, bajas la confianza y lo notificas.
4. Si superas 70% acierto sostenido, puedes subir confianza.

══════════════════════════════════════════════
 ANÁLISIS DE CUOTAS — TU ESPECIALIDAD
══════════════════════════════════════════════
Cuando el usuario te da cuotas de varias casas de apuestas:
1. COMPARA las cuotas entre casas y marca la MEJOR (⭐) para cada mercado.
2. DETECTA cuotas sospechosas: si la diferencia entre casas supera el 5%, lo señalas.
3. RECOMIENDA en qué casa apostar cada cosa.
4. CALCULA el payout exacto usando el bankroll del usuario.
5. SUGIERE combinadas SOLO si hay 2+ picks de confianza alta.
6. MUESTRA un resumen de inversión total al final.

══════════════════════════════════════════════
 MODELOS CUANTITATIVOS
══════════════════════════════════════════════
El sistema ejecuta AUTOMÁTICAMENTE modelos cuantitativos cuando detecta un partido en tu mensaje:
- DIXON-COLES: Modelo Poisson corregido que ajusta probabilidades de empate y resultados bajos (0-0, 1-0, 0-1, 1-1)
- Liga calibrada: la media de goles se ajusta por competición (Bundesliga 3.14, La Liga 2.55, etc.)
- ELO RATING: Estimación 1X2 basada en rating Elo relativo
- VALUE BETS: Comparación de probabilidades del modelo vs cuotas del mercado
- Cuando recibes "DATOS CUANTITATIVOS DEL MODELO", ÚSALOS como base de tu análisis
- NUNCA contradigas los datos del modelo sin justificación sólida
- Si el modelo detecta valor (EV+), destácalo; si no lo detecta, no lo inventes

══════════════════════════════════════════════
 METODOLOGÍA DE ANÁLISIS
══════════════════════════════════════════════
Para cada pronóstico analizas (solo si tienes datos reales):
1. FORMA RECIENTE — Últimos 5 partidos (W/D/L, goles)
2. HEAD TO HEAD — Historial directo reciente
3. DATOS DEL MODELO — Dixon-Coles, Elo, datos cuantitativos del sistema
4. CONTEXTO — Fase, importancia, sede, presión
5. BAJAS — Jugadores clave ausentes (solo datos reales)
6. ESTILO DE JUEGO — Presión alta/baja, transiciones
7. MOTIVACIÓN — ¿Quién necesita más el resultado?
8. VALOR EN CUOTAS — Cuotas como referencia, no como verdad

══════════════════════════════════════════════
 FORMATO OBLIGATORIO DE PRONÓSTICO
══════════════════════════════════════════════
⚽ [P00X] PARTIDO — Competición
📅 Fecha
📊 ANÁLISIS [3-5 líneas]
🎯 PRONÓSTICO PRINCIPAL
Apuesta: [mercado + resultado]
Casa: [casa recomendada]
Cuota: [cuota]
Confianza: 🔥 Alta | ⚡ Media | ⚠️ Baja
Stake: [% bankroll + cantidad]
Payout: [payout calculado]
Razonamiento: [por qué tiene valor]
⚠️ RIESGO [Factores que pueden tumbar el pronóstico]

══════════════════════════════════════════════
 COMANDOS
══════════════════════════════════════════════
!resultado [ID] [W/L/V] → Registra resultado
!historial → Tabla de pronósticos
!stats → Estadísticas completas
!autopsy [ID] → Post-mortem de un fallo
!eliminar [ID] → Elimina un pronóstico del registro
!editar [ID] campo=valor → Editar campos
!reset → Borra historial
!bankroll [cantidad] → Define bankroll
!racha → Racha actual y recalibración
!analyze Equipo1 vs Equipo2 → Forzar análisis cuantitativo completo

══════════════════════════════════════════════
 REGLAS IRROMPIBLES
══════════════════════════════════════════════
1. NUNCA garantizas un resultado.
2. NUNCA inventas datos.
3. SIEMPRE distingues hecho vs opinión.
4. SIEMPRE adviertes sobre juego responsable si notas exceso.
5. Combinadas SIEMPRE con advertencia de riesgo multiplicado.
6. Racha 3+ fallos → notificar y reducir stakes.
7. NUNCA inventes el resultado de un partido terminado.
8. NUNCA niegues la existencia de un partido si el usuario menciona que existe. Si no tienes datos, di que no pudiste obtener información pero ANALIZA igualmente con tu conocimiento.
`;

const ANALYSIS_TIMEOUT = 8000;

export async function POST(request) {
  try {
    const { messages, predictions, settings, userId, sessionId } = await request.json();
    const proxyUrl = process.env.PROXY_URL || settings?.proxyUrl;
    if (!proxyUrl) {
      return NextResponse.json({ error: 'PROXY_URL not configured' }, { status: 400 });
    }

    let systemContent = SYSTEM_PROMPT;

    if (settings?.bankroll) {
      systemContent += `\n\nBANKROLL ACTUAL DEL USUARIO: €${settings.bankroll}. Calcula stakes y payouts con esta cifra.`;
    }
    if (settings?.bookmakers?.length) {
      systemContent += `\nCASAS DE APUESTAS DEL USUARIO: ${settings.bookmakers.join(', ')}. Solo recomienda apostar en estas casas.`;
    }

    if (predictions && predictions.length > 0) {
      const resolved = predictions.filter(p => p.result && p.result !== 'V');
      const wins = resolved.filter(p => p.result === 'W').length;
      const losses = resolved.filter(p => p.result === 'L').length;
      const hitRate = resolved.length > 0 ? ((wins / resolved.length) * 100).toFixed(1) : 0;
      systemContent += `\n\nHISTORIAL DE SESIÓN: ${predictions.length} pronósticos (${wins}W, ${losses}L, hit rate: ${hitRate}%).`;

      const streak = getStreak(predictions);
      if (streak.type === 'L' && streak.count >= 3) {
        systemContent += `\n⚠️ ALERTA: Racha de ${streak.count} DERROTAS consecutivas. BAJA un nivel la confianza de los siguientes pronósticos y notifícalo al usuario.`;
      }
      if (streak.type === 'W' && streak.count >= 5) {
        systemContent += `\n🔥 Racha de ${streak.count} ACIERTOS consecutivos. Puedes mantener la confianza pero NO la subas artificialmente.`;
      }

      const marketStats = getStatsByMarket(predictions);
      const marketEntries = Object.entries(marketStats);
      if (marketEntries.length > 0) {
        systemContent += `\n\nRENDIMIENTO POR MERCADO:`;
        marketEntries.forEach(([market, data]) => {
          systemContent += `\n- ${market}: ${data.hitRate}% acierto (${data.wins}W/${data.losses}L, P/L: ${data.pnl >= 0 ? '+' : ''}€${data.pnl.toFixed(2)})`;
        });
        const weakMarkets = marketEntries.filter(([, d]) => d.total >= 3 && d.hitRate < 40);
        if (weakMarkets.length > 0) {
          systemContent += `\n⚠️ MERCADOS DÉBILES: ${weakMarkets.map(([m]) => m).join(', ')}. Evita estos mercados o baja la confianza.`;
        }
        const strongMarkets = marketEntries.filter(([, d]) => d.total >= 3 && d.hitRate >= 65);
        if (strongMarkets.length > 0) {
          systemContent += `\n💪 MERCADOS FUERTES: ${strongMarkets.map(([m]) => m).join(', ')}. Tienes historial positivo aquí.`;
        }
      }

      const recentErrors = getRecentErrors(predictions, 5);
      if (recentErrors.length > 0) {
        systemContent += `\n\nÚLTIMOS FALLOS (para aprender):`;
        recentErrors.forEach(e => {
          systemContent += `\n- ${e.id} ${e.match} | ${e.market} | Cuota: ${e.odds} | Confianza: ${e.confidence}`;
        });
        systemContent += `\nAnaliza patrones en esos fallos. ¿Hay sesgos? ¿Over 2.5 en ligas de pocos goles? ¿Confianza alta en cuotas bajas? Usa esta información para recalibrar.`;
      }

      const btResult = backtest(predictions);
      if (btResult) {
        systemContent += formatBacktestOutput(btResult);
      }

      systemContent += `\n\nCALIBRACIÓN: Tu acierto global es ${hitRate}%. Ajusta tu confianza en proporción. NO seas más confiado de lo que tu historial justifica.`;
      systemContent += `\nÚltimo ID usado: P${String(predictions.length).padStart(3, '0')}. El siguiente pronóstico debe usar P${String(predictions.length + 1).padStart(3, '0')}.`;
    } else {
      systemContent += `\nNo hay pronósticos previos en esta sesión. El primer ID será P001.`;
    }

    let contextMessages = messages.slice(-20);

    const lastUserMsg = contextMessages.filter(m => m.role === 'user').pop();

    let team1 = null, team2 = null, forceAnalysis = false;

    const analyzeMatch = lastUserMsg?.content?.match(/!analyze\s+(.+?)\s+vs\.?\s+(.+)/i);
    if (analyzeMatch) {
      team1 = analyzeMatch[1].trim();
      team2 = analyzeMatch[2].trim();
      forceAnalysis = true;
    } else {
      const matchup = detectMatchup(lastUserMsg?.content || '');
      if (matchup && matchup.team1) {
        team1 = matchup.team1;
        team2 = matchup.team2;
      }
    }

    let detectedMatch = null;

    if (team1 && proxyUrl) {
      const effectiveTeam2 = team2;
      if (effectiveTeam2) {
        detectedMatch = { team1, team2, success: false, error: null };
        try {
          const analysisPromise = runAnalysis(team1, effectiveTeam2, proxyUrl);
          const result = await Promise.race([
            analysisPromise,
            new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ANALYSIS_TIMEOUT)),
          ]);

          if (result && !result.error) {
            detectedMatch.success = true;
            detectedMatch.league = result.league || null;
            systemContent += result.modelText;

            if (result.valueBets?.length) {
              systemContent += `\n\n🔴⭐ APUESTAS CON VALOR DETECTADAS:`;
              result.valueBets.forEach(v => {
                systemContent += `\n- ${v.market}: Prob modelo ${(v.probability * 100).toFixed(1)}% | Cuota ${v.bestOdds} (${v.bookmaker}) | EV+${v.ev}% | Stake: €${v.suggestedStake}`;
              });
            }

            if (result.league) {
              systemContent += `\n\n📈 LIGA: ${result.league} (media goles: ${result.leagueAvg})`;
            }
          } else {
            const errMsg = result?.error || 'Error desconocido';
            detectedMatch.error = errMsg;
            systemContent += `\n\n⚠️ El usuario preguntó sobre ${team1} vs ${team2}. El análisis cuantitativo falló: ${errMsg}. Responde igualmente basándote en tu conocimiento sobre estos equipos. NUNCA digas que el partido no existe si el usuario afirma que sí.`;
          }
        } catch {
          detectedMatch.error = 'timeout';
          systemContent += `\n\n⚠️ El usuario preguntó sobre ${team1} vs ${team2}. El análisis cuantitativo no pudo completarse (timeout o error de red). Responde basándote en tu conocimiento general sobre estos equipos. NUNCA digas que el partido no existe si el usuario afirma que sí.`;
        }
      } else if (forceAnalysis) {
        systemContent += `\n\n⚠️ Solo se detectó un equipo (${team1}). Necesito dos equipos para el análisis. Pregunta al usuario por el rival.`;
      }
    }

    if (userId && sessionId) {
      const supabase = getSupabase();
      if (supabase) {
        const { data: dbMessages } = await supabase
          .from('messages')
          .select('role, content')
          .eq('user_id', userId)
          .eq('session_id', sessionId)
          .order('created_at', { ascending: true })
          .limit(40);

        if (dbMessages && dbMessages.length > 0) {
          const dbRecent = dbMessages.slice(-10).map(m => ({ role: m.role, content: m.content }));
          contextMessages = [...dbRecent.slice(0, -1), ...messages.slice(-20)];
          if (contextMessages.length > 30) contextMessages = contextMessages.slice(-30);
        }
      }
    }

    const res = await fetch(`${proxyUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'z-ai/glm-5.1',
        messages: [{ role: 'system', content: systemContent }, ...contextMessages],
        max_tokens: 4000,
        temperature: 0.7
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json({ error: `API Error ${res.status}: ${errText}` }, { status: res.status });
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || 'Sin respuesta.';
    const response = { content };
    if (detectedMatch) response.detectedMatch = detectedMatch;
    return NextResponse.json(response);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
