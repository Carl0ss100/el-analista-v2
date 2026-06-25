import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { getStatsByMarket, getRecentErrors, getStreak } from '@/lib/stats';
import { poissonProbabilities, estimateLambdas, eloTo1X2, findValueBets, formatModelOutput } from '@/lib/models';

const SYSTEM_PROMPT = `Eres "El Analista", el mejor pronosticador de fútbol del mundo. Especializado en TODAS las competiciones: Copa del Mundo FIFA, Eliminatorias, UEFA Nations League, Eurocopa, Copa América, Champions League, La Liga, Premier League, Serie A, Bundesliga, Ligue 1, y cualquier competición con cuotas disponibles.

════════════════════════════════════════════
 IDENTIDAD Y PERSONALIDAD
════════════════════════════════════════════
Eres una mezcla de analista frío, gurú carismático y persona directa al grano. Tu rasgo más importante es la HONESTIDAD RADICAL:
— Nunca inventas estadísticas, lesiones, alineaciones ni datos que no conoces.
— Si no tienes información suficiente sobre un partido, lo dices claramente.
— Distingues siempre entre lo que ES un hecho y lo que ES tu opinión.
— Si un pronóstico es arriesgado, lo adviertes. Nunca vendes humo.
— No te dejas llevar por el hype mediático. Analizas fríamente.
— Si no hay valor claro, recomiendas NO apostar. Eso también es un pronóstico.

════════════════════════════════════════════
 SISTEMA DE MEMORIA E HISTORIAL
════════════════════════════════════════════
Mantienes un REGISTRO INTERNO de todos los pronósticos:
[ID] | Partido | Mercado | Casa | Cuota | Confianza | Resultado

Reglas:
1. Cada pronóstico recibe un ID único: P001, P002, P003...
2. Al dar un pronóstico, SIEMPRE incluyes el ID en el formato: [P00X]
3. Si llevas racha negativa de 3+, bajas la confianza y lo notificas.
4. Si superas 70% acierto sostenido, puedes subir confianza.

════════════════════════════════════════════
 ANÁLISIS DE CUOTAS — TU ESPECIALIDAD
════════════════════════════════════════════
Cuando el usuario te da cuotas de varias casas de apuestas:
1. COMPARA las cuotas entre casas y marca la MEJOR (⭐) para cada mercado.
2. DETECTA cuotas sospechosas: si la diferencia entre casas supera el 5%, lo señalas.
3. RECOMIENDA en qué casa apostar cada cosa.
4. CALCULA el payout exacto usando el bankroll del usuario.
5. SUGIERE combinadas SOLO si hay 2+ picks de confianza alta.
6. MUESTRA un resumen de inversión total al final.

════════════════════════════════════════════
 METODOLOGÍA DE ANÁLISIS
════════════════════════════════════════════
Para cada pronóstico analizas (solo si tienes datos reales):
1. FORMA RECIENTE — Últimos 5 partidos (W/D/L, goles)
2. HEAD TO HEAD — Historial directo reciente
3. CONTEXTO — Fase, importancia, sede, presión
4. BAJAS — Jugadores clave ausentes (solo datos reales)
5. ESTILO DE JUEGO — Presión alta/baja, transiciones
6. MOTIVACIÓN — ¿Quién necesita más el resultado?
7. VALOR EN CUOTAS — Cuotas como referencia, no como verdad

════════════════════════════════════════════
 FORMATO OBLIGATORIO DE PRONÓSTICO
════════════════════════════════════════════
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

════════════════════════════════════════════
 COMANDOS
════════════════════════════════════════════
!resultado [ID] [W/L/V] → Registra resultado
!historial → Tabla de pronósticos
!stats → Estadísticas completas
!autopsy [ID] → Post-mortem de un fallo
!eliminar [ID] → Elimina un pronóstico del registro
!editar [ID] campo=valor → Editar campos
!reset → Borra historial
!bankroll [cantidad] → Define bankroll
!racha → Racha actual y recalibración
!analyze Equipo1 vs Equipo2 → Análisis cuantitativo (Poisson, Elo, H2H, valor)

════════════════════════════════════════════
 REGLAS IRROMPIBLES
════════════════════════════════════════════
1. NUNCA garantizas un resultado.
2. NUNCA inventas datos.
3. SIEMPRE distingues hecho vs opinión.
4. SIEMPRE adviertes sobre juego responsable si notas exceso.
5. Combinadas SIEMPRE con advertencia de riesgo multiplicado.
6. Racha 3+ fallos → notificar y reducir stakes.
7. NUNCA inventes el resultado de un partido terminado.
`;

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

      systemContent += `\n\nCALIBRACIÓN: Tu acierto global es ${hitRate}%. Ajusta tu confianza en proporción. NO seas más confiado de lo que tu historial justifica.`;
      systemContent += `\nÚltimo ID usado: P${String(predictions.length).padStart(3, '0')}. El siguiente pronóstico debe usar P${String(predictions.length + 1).padStart(3, '0')}.`;
    } else {
      systemContent += `\nNo hay pronósticos previos en esta sesión. El primer ID será P001.`;
    }

    let contextMessages = messages.slice(-20);

    const lastUserMsg = contextMessages.filter(m => m.role === 'user').pop();
    const analyzeMatch = lastUserMsg?.content?.match(/!analyze\s+(.+?)\s+vs\.?\s+(.+)/i);
    if (analyzeMatch && proxyUrl) {
      const aTeam1 = analyzeMatch[1].trim();
      const aTeam2 = analyzeMatch[2].trim();
      try {
        const { translate } = await import('@/lib/teamTranslations');
        const { matchTeam } = await import('@/lib/teamTranslations');
        const en1 = translate(aTeam1);
        const en2 = translate(aTeam2);

        let teamId1 = null, teamId2 = null;
        const [res1, res2] = await Promise.all([
          fetch(`${proxyUrl}/teams?search=${encodeURIComponent(en1)}`),
          fetch(`${proxyUrl}/teams?search=${encodeURIComponent(en2)}`),
        ]);
        const [data1, data2] = await Promise.all([res1.json(), res2.json()]);

        if (data1.response?.length) {
          for (const t of data1.response) {
            if (matchTeam(t.team.name, en1) >= 2) { teamId1 = t.team.id; break; }
          }
        }
        if (data2.response?.length) {
          for (const t of data2.response) {
            if (matchTeam(t.team.name, en2) >= 2) { teamId2 = t.team.id; break; }
          }
        }

        let homeForm = [], awayForm = [], h2hData = null, oddsData = null, fixtureId = null;

        if (teamId1 && teamId2) {
          const [lastR1, lastR2, h2hR] = await Promise.all([
            fetch(`${proxyUrl}/fixtures?team=${teamId1}&last=5`),
            fetch(`${proxyUrl}/fixtures?team=${teamId2}&last=5`),
            fetch(`${proxyUrl}/fixtures/headtohead?h2h=${teamId1}-${teamId2}&last=10`),
          ]);
          const [lastD1, lastD2, h2hD] = await Promise.all([lastR1.json(), lastR2.json(), h2hR.json()]);

          homeForm = (lastD1.response || []).map(f => ({
            goalsFor: f.teams.home.id === teamId1 ? f.goals.home : f.goals.away,
            goalsAgainst: f.teams.home.id === teamId1 ? f.goals.away : f.goals.home,
          }));
          awayForm = (lastD2.response || []).map(f => ({
            goalsFor: f.teams.away.id === teamId2 ? f.goals.away : f.goals.home,
            goalsAgainst: f.teams.away.id === teamId2 ? f.goals.home : f.goals.away,
          }));

          if (h2hD.response?.length) {
            h2hData = h2hD.response.map(f => {
              const hg = f.goals.home, ag = f.goals.away;
              const isT1Home = f.teams.home.id === teamId1;
              let winner;
              if (hg > ag) winner = isT1Home ? 'home' : 'away';
              else if (hg < ag) winner = isT1Home ? 'away' : 'home';
              else winner = 'draw';
              return {
                home: f.teams.home.name, away: f.teams.away.name,
                homeGoals: hg, awayGoals: ag, winner,
                goals: hg + ag, bothScored: hg > 0 && ag > 0,
                date: f.fixture.date?.split('T')[0] || '',
                competition: f.league?.name || '',
              };
            });
          }

          for (let offset = -2; offset <= 7 && !fixtureId; offset++) {
            const d = new Date(); d.setDate(d.getDate() + offset);
            try {
              const fRes = await fetch(`${proxyUrl}/fixtures?date=${d.toISOString().split('T')[0]}&team=${teamId1}`);
              const fData = await fRes.json();
              for (const f of (fData.response || [])) {
                if (f.teams.home.id === teamId2 || f.teams.away.id === teamId2) { fixtureId = f.fixture.id; break; }
              }
            } catch {}
          }

          if (fixtureId) {
            try {
              const oddsR = await fetch(`${proxyUrl}/odds?fixture=${fixtureId}`);
              const oddsJ = await oddsR.json();
              if (oddsJ.response?.length) {
                oddsData = oddsJ.response[0].bookmakers.slice(0, 5).map(bm => ({
                  name: bm.name,
                  bets: bm.bets.filter(b => !b.name.toLowerCase().includes('correct score'))
                    .map(bet => ({ name: bet.name, values: bet.values.slice(0, 8).map(v => ({ value: v.value, odd: v.odd })) })),
                }));
              }
            } catch {}
          }
        }

        if (homeForm.length > 0 || awayForm.length > 0) {
          const homeAvgG = homeForm.length > 0 ? homeForm.reduce((s, f) => s + f.goalsFor, 0) / homeForm.length : 1.2;
          const homeAvgC = homeForm.length > 0 ? homeForm.reduce((s, f) => s + f.goalsAgainst, 0) / homeForm.length : 1.0;
          const awayAvgG = awayForm.length > 0 ? awayForm.reduce((s, f) => s + f.goalsFor, 0) / awayForm.length : 1.0;
          const awayAvgC = awayForm.length > 0 ? awayForm.reduce((s, f) => s + f.goalsAgainst, 0) / awayForm.length : 1.1;

          const lambdas = estimateLambdas(homeAvgG, awayAvgG, homeAvgC, awayAvgC);
          const probs = poissonProbabilities(lambdas.homeLambda, lambdas.awayLambda);
          const eloH = 1500 + (homeForm.filter(f => f.result === 'W').length - homeForm.filter(f => f.result === 'L').length) * 40;
          const eloA = 1500 + (awayForm.filter(f => f.result === 'W').length - awayForm.filter(f => f.result === 'L').length) * 40;
          const elo1X2 = eloTo1X2(eloH, eloA);

          systemContent += formatModelOutput(probs, h2hData, elo1X2);

          if (oddsData) {
            const vb = findValueBets(probs, oddsData);
            if (vb.length) {
              systemContent += `\n\n🔴⭐ APUESTAS CON VALOR DETECTADAS:`;
              vb.forEach(v => {
                systemContent += `\n- ${v.market}: Prob modelo ${(v.probability * 100).toFixed(1)}% | Cuota ${v.bestOdds} (${v.bookmaker}) | EV+${v.ev}% | Stake: €${v.suggestedStake}`;
              });
            }
          }
        }
      } catch {}
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
    return NextResponse.json({ content });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
