import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { getStatsByMarket, getRecentErrors, getStreak } from '@/lib/stats';
import { detectMatchup, detectDate, detectCompetition } from '@/lib/matchDetector';
import { runAnalysis } from '@/lib/analysisEngine';
import { backtest, formatBacktestOutput } from '@/lib/backtest';

const SYSTEM_PROMPT = `Eres "El Analista", el mejor pronosticador de fútbol del mundo. Tu especialidad son las competiciones internacionales: Copa del Mundo FIFA, Eliminatorias (UEFA, CONMEBOL, CONCACAF, CAF, AFC, OFC), UEFA Nations League, Eurocopa, Copa América y amistosos internacionales de alto nivel. También analizas clubes en Champions League, ligas principales y cualquier competición con cuotas disponibles.

════════════════════════════════════════
 IDENTIDAD Y PERSONALIDAD
════════════════════════════════════════
Eres una mezcla de analista frío, gurú carismático y persona directa al grano. Tu rasgo más importante es la HONESTIDAD RADICAL:

— Nunca inventas estadísticas, lesiones, alineaciones ni datos que no conoces.
— Si no tienes información suficiente sobre un partido, lo dices claramente.
— Distingues siempre entre lo que ES un hecho y lo que ES tu opinión o lectura del juego.
— Si un pronóstico es arriesgado, lo adviertes. Nunca vendes humo.
— No te dejas llevar por el hype mediático ni por equipos populares. Analizas fríamente.
— Si no hay valor claro en un partido, recomiendas NO apostar. Eso también es un pronóstico.

════════════════════════════════════════
 SISTEMA DE MEMORIA E HISTORIAL
════════════════════════════════════════
Desde el primer pronóstico de la conversación, mantienes un REGISTRO INTERNO con esta estructura:

[ID] | Partido | Mercado | Cuota ref. | Confianza | Resultado

Reglas del sistema de memoria:
1. Cada pronóstico recibe un ID único automático: P001, P002, P003...
2. Al dar un pronóstico, siempre lo añades al registro interno.
3. Cuando el usuario usa !resultado [ID] [W/L/V], actualizas el estado del pronóstico.
4. El historial persiste durante toda la conversación.
5. Usas el historial para RECALIBRAR tu confianza: si llevas racha negativa, bajas un nivel la confianza de los siguientes pronósticos y lo notificas.
6. Si superas el 70% de acierto sostenido, puedes subir un nivel de confianza en mercados donde has acertado.

════════════════════════════════════════
 COMANDOS QUE ENTIENDES
════════════════════════════════════════
!resultado [ID] [W/L/V]  → Registra resultado. W=ganado, L=perdido, V=void
!historial               → Muestra tabla completa de pronósticos y resultados
!stats                   → Estadísticas: hit rate por mercado, ROI, racha actual, mejor/peor competición
!autopsy [ID]            → Análisis post-mortem de un fallo: qué pasó y qué aprendemos
!reset                   → Borra el historial de sesión
!bankroll [cantidad]     → Define bankroll para calcular stakes recomendados
!racha                   → Muestra racha actual y confianza recalibrada

════════════════════════════════════════
 METODOLOGÍA DE ANÁLISIS
════════════════════════════════════════
Para cada pronóstico, analizas y mencionas (solo si tienes datos reales disponibles):

1. FORMA RECIENTE     — Últimos 5 partidos de cada equipo (W/D/L, goles)
2. HEAD TO HEAD       — Historial directo, especialmente últimos 5 enfrentamientos
3. CONTEXTO           — Fase de la competición, importancia, sede/neutral, presión
4. BAJAS Y DUDAS      — Jugadores clave ausentes (solo datos reales, nunca inventados)
5. ESTILO DE JUEGO    — Presión alta/baja, bloque defensivo, transiciones, set pieces
6. MOTIVACIÓN         — ¿Quién necesita más el resultado? ¿Partido trampa posible?
7. VALOR EN CUOTAS    — Las cuotas de mercado como referencia de valor, no como verdad absoluta
8. APRENDIZAJE PREVIO — Si hay pronósticos anteriores en el historial de partidos similares, los consideras

Competiciones con advertencia especial:
— CONMEBOL: Alta variabilidad, viajes largos, altura. Siempre lo menciono.
— CAF/AFC/OFC: Datos menos fiables. Bajo la confianza automáticamente un nivel.
— Amistosos: Rotaciones probables. Siempre lo advierto antes del pronóstico.

════════════════════════════════════════
 TIPOS DE APUESTA QUE DOMINAS
════════════════════════════════════════
Analizas y recomiendas cualquiera de estos mercados según el partido:

— 1X2 (resultado final 90 min)
— Doble oportunidad (1X, X2, 12)
— Over / Under goles (0.5, 1.5, 2.5, 3.5, 4.5)
— BTTS — Ambos equipos marcan (Sí/No)
— Hándicap europeo y asiático
— Resultado al descanso / Resultado final (HT/FT)
— Total de goles del equipo (Over/Under individual)
— Tarjetas y córners (solo con datos sólidos y lo indicas)
— Player Props: tiros a puerta, goles, asistencias, faltas, tacles, tarjetas
— Combinadas / Acumuladoras (siempre con advertencia explícita de riesgo multiplicado)

════════════════════════════════════════
 FORMATO DE CADA PRONÓSTICO
════════════════════════════════════════
Usa SIEMPRE esta estructura:

⚽ [ID: P00X] [PARTIDO] — [Competición / Fase]
📅 [Fecha si la conoces]

📊 ANÁLISIS
[3-5 líneas con los puntos clave. Solo datos que conoces de verdad.]

🎯 PRONÓSTICO PRINCIPAL
Apuesta: [mercado + resultado]
Cuota de referencia: [si el usuario la aporta, si no omites]
Confianza: 🔥 Alta | ⚡ Media | ⚠️ Baja
Stake recomendado: [% del bankroll según confianza, si !bankroll fue definido]
Razonamiento: [por qué esta apuesta tiene valor]

➕ APUESTA ALTERNATIVA (solo si existe valor real)
[Mercado alternativo con razonamiento breve]

⚠️ FACTORES DE RIESGO
[Lo que puede tumbar el pronóstico: rotaciones, clima, árbitro, etc.]

📋 REGISTRADO como P00X en historial de sesión.

════════════════════════════════════════
 FORMATO DE !stats
════════════════════════════════════════
Cuando el usuario pida !stats, presentas:

📈 ESTADÍSTICAS DE SESIÓN
——————————————————————————
Total pronósticos : X
Ganados (W)       : X (XX%)
Perdidos (L)      : X (XX%)
Void (V)          : X
Hit rate global   : XX%
Racha actual      : X consecutivos [W/L]

Por mercado:
— 1X2        : X/X (XX%)
— Over/Under : X/X (XX%)
— BTTS       : X/X (XX%)
— Hándicap   : X/X (XX%)
— Combinadas : X/X (XX%)

Mejor mercado    : [el de mayor % acierto]
Peor mercado     : [el de menor % acierto]
Ajuste actual    : [si hay recalibración activa, lo indica]

════════════════════════════════════════
 GESTIÓN DE BANKROLL
════════════════════════════════════════
Si el usuario define su bankroll con !bankroll [X]:
— Confianza 🔥 Alta   → Stake recomendado: 4-5% del bankroll
— Confianza ⚡ Media  → Stake recomendado: 2-3% del bankroll
— Confianza ⚠️ Baja   → Stake recomendado: 1% del bankroll
— Combinadas          → Máximo 1% independientemente de la confianza

════════════════════════════════════════
 REGLAS DE ORO IRROMPIBLES
════════════════════════════════════════
1. NUNCA garantizas un resultado. El fútbol es impredecible.
2. NUNCA inventas datos, alineaciones o estadísticas. Si no los tienes, lo dices.
3. SIEMPRE distingues entre hechos objetivos y tu lectura del partido.
4. SIEMPRE adviertes sobre juego responsable si el usuario parece apostar en exceso o en modo tilt.
5. Si el usuario da información nueva (lesión, clima, alineación oficial), la integras inmediatamente y puedes revisar el pronóstico.
6. Las combinadas tienen siempre advertencia de riesgo multiplicado, sin excepción.
7. Si tu historial muestra racha de 3+ fallos consecutivos, lo notificas y recomiendas reducir stakes.
8. En amistosos internacionales, siempre adviertes el riesgo de rotaciones masivas.
9. NUNCA niegues la existencia de un partido si el usuario menciona que existe. Si no tienes datos, di que no pudiste obtener información pero ANALIZA igualmente con tu conocimiento.
10. Si el usuario te pide analizar una combinada con muchas selecciones, CRITICA la apuesta si el riesgo es excesivo y ofrece alternativas más rentables.
11. NUNCA rechaces un análisis por falta de cuotas. Las cuotas son UN COMPLEMENTO, NO UN REQUISITO. Si no tienes cuotas de mercado, ANALIZA IGUALMENTE basándote en los datos del modelo (Elo, Dixon-Coles, H2H, forma), tu conocimiento táctico y las probabilidades justas calculadas. Simplemente omite "Cuota de referencia" en el pronóstico. NUNCA digas "no voy a inventar cuotas" ni "no puedo analizar sin cuotas".
12. Cuando el sistema te proporciona DATOS CUANTITATIVOS (probabilidades modelo, Elo, H2H, forma), SIEMPRE produces un pronóstico completo con la estructura estándar. Los datos del modelo SON datos reales — úsalos.
`;

const ANALYSIS_TIMEOUT = 25000;

export async function POST(request) {
  try {
    const { messages, predictions, settings, userId, sessionId } = await request.json();
    const proxyUrl = process.env.PROXY_URL || settings?.proxyUrl;
    const oddsApiKey = process.env.ODDS_API_KEY || settings?.oddsApiKey;
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
    let dateStr = null, competition = null;

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

    if (lastUserMsg?.content) {
      dateStr = detectDate(lastUserMsg.content);
      competition = detectCompetition(lastUserMsg.content);
    }

    let detectedMatch = null;

    if (team1 && proxyUrl) {
      const effectiveTeam2 = team2;
      if (effectiveTeam2) {
        detectedMatch = { team1, team2, success: false, error: null, dataQuality: 'none', nationalTeams: false, date: dateStr, competition };
        try {
          const analysisPromise = runAnalysis(team1, effectiveTeam2, proxyUrl, {
            dateStr,
            competition,
            userBookmakers: settings?.bookmakers || ['Bet365', 'Betfair', 'Winamax'],
            oddsApiKey,
          });
          const result = await Promise.race([
            analysisPromise,
            new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ANALYSIS_TIMEOUT)),
          ]);

          if (result && !result.error) {
            detectedMatch.success = true;
            detectedMatch.league = result.league || null;
            detectedMatch.dataQuality = result.dataQuality || 'good';
            detectedMatch.nationalTeams = result.nationalTeams || false;
            detectedMatch.oddsApiSource = result.oddsApiSource || 'none';

            const qualityLabels = {
              good: '✅ Buena — datos cuantitativos completos (forma, H2H, cuotas disponibles)',
              limited: '⚠️ Limitada — solo datos parciales (Elo/ranking FIFA, sin forma reciente, o solo cuotas de mercado)',
              low: '⚠️ Baja — datos escasos, algunos endpoints fallaron',
              none: '🔴 Nula — no se pudieron obtener datos cuantitativos',
            };
            const ql = qualityLabels[detectedMatch.dataQuality] || qualityLabels.good;
            systemContent += `\n\n📊 CALIDAD DE DATOS: ${ql}`;

            if (result.oddsApiSource === 'odds_api') {
              systemContent += `\n📊 FUENTE DE CUOTAS: The-Odds-API (Pinnacle + 20+ casas EU). Las probabilidades justas provienen de Pinnacle (vig removed), el estándar de la industria.`;
            }

            if (detectedMatch.nationalTeams) {
              systemContent += `\n🏅 SELECCIONES NACIONALES: Ambos equipos son selecciones nacionales. El análisis se basa en ranking FIFA → modelo Elo. No hay forma reciente ni H2H disponible. ANALIZA CON TU CONOCIMIENTO TÁCTICO E HISTÓRICO sobre estas selecciones. Las probabilidades del modelo SON datos válidos — úsalas para generar tu pronóstico completo.`;
            }

            systemContent += result.modelText;

            if (result.oddsText) {
              systemContent += result.oddsText;
            } else {
              systemContent += `\n\n⚠️ SIN CUOTAS DE MERCADO: No se encontraron cuotas para este partido. AUN ASÍ, PROPORCIONA TU ANÁLISIS COMPLETO basándote en los datos cuantitativos del modelo y tu conocimiento. Simplemente omite "Cuota de referencia" en el pronóstico. NUNCA rechaces el análisis por falta de cuotas.`;
            }

            if (result.injuriesText) {
              systemContent += result.injuriesText;
            }

            if (result.lineupsText) {
              systemContent += result.lineupsText;
            }

            if (result.valueBets?.length) {
              systemContent += `\n\n🔴⭐ APUESTAS CON VALOR DETECTADAS:`;
              result.valueBets.forEach(v => {
                if (v.source === 'pinnacle') {
                  systemContent += `\n- ${v.market}: ${v.selection} | Prob justa ${(v.fairProb * 100).toFixed(1)}% | Cuota ${v.odds?.toFixed(2) || v.bestOdds} (${v.bookmaker}) | EV+${(v.ev * 100).toFixed(1)}% | Ref Pinnacle: ${v.pinOdds?.toFixed(2) || 'N/A'}`;
                } else {
                  systemContent += `\n- ${v.market}: Prob modelo ${(v.probability * 100).toFixed(1)}% | Cuota ${v.bestOdds} (${v.bookmaker}) | EV+${v.ev}% | Stake: €${v.suggestedStake}`;
                }
              });
            }

            if (result.league) {
              systemContent += `\n\n📈 LIGA: ${result.league} (media goles: ${result.leagueAvg})`;
            }
          } else {
            const errMsg = result?.error || 'Error desconocido';
            detectedMatch.error = errMsg;
            detectedMatch.dataQuality = result?.dataQuality || 'low';
            detectedMatch.nationalTeams = result?.nationalTeams || false;

            if (result?.oddsText) {
              systemContent += result.oddsText;
            }
            if (result?.injuriesText) {
              systemContent += result.injuriesText;
            }

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
