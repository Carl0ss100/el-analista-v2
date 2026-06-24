import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

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

      const lastPreds = predictions.slice(-5).filter(p => p.result === 'L');
      if (lastPreds.length >= 3) {
        systemContent += `\n⚠️ ALERTA: Racha de ${lastPreds.length} DERROTAS recientes. BAJA un nivel la confianza.`;
      }

      systemContent += `\n\nCALIBRACIÓN: Tu acierto global es ${hitRate}%. Ajusta tu confianza en proporción.`;
      systemContent += `\nÚltimo ID usado: P${String(predictions.length).padStart(3, '0')}. El siguiente pronístico debe usar P${String(predictions.length + 1).padStart(3, '0')}.`;
    } else {
      systemContent += `\nNo hay pronósticos previos en esta sesión. El primer ID será P001.`;
    }

    let contextMessages = messages.slice(-20);

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
