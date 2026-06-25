import { NextResponse } from 'next/server';
import { runAnalysis } from '@/lib/analysisEngine';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const team1 = searchParams.get('team1');
  const team2 = searchParams.get('team2');
  if (!team1 || !team2) return NextResponse.json({ error: 'Missing team1 and team2' }, { status: 400 });

  const proxyUrl = searchParams.get('proxyUrl') || process.env.PROXY_URL;
  if (!proxyUrl) return NextResponse.json({ error: 'PROXY_URL not configured' }, { status: 500 });

  const result = await runAnalysis(team1, team2, proxyUrl);

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }

  return NextResponse.json({
    poisson: result.probs,
    elo: result.elo1X2 ? { '1X2': result.elo1X2 } : null,
    h2h: result.h2h,
    h2hSummary: result.h2h ? {
      total: result.h2h.length,
      team1Wins: result.h2h.filter(h => h.winner === 'home').length,
      draws: result.h2h.filter(h => h.winner === 'draw').length,
      team2Wins: result.h2h.filter(h => h.winner === 'away').length,
      avgGoals: +(result.h2h.reduce((s, h) => s + h.goals, 0) / result.h2h.length).toFixed(1),
      bttsRate: +((result.h2h.filter(h => h.bothScored).length / result.h2h.length) * 100).toFixed(0),
    } : null,
    form: result.form,
    lambdas: result.lambdas,
    league: result.league,
    leagueAvg: result.leagueAvg,
    odds: result.valueBets?.length ? undefined : null,
    valueBets: result.valueBets,
    modelText: result.modelText,
  });
}
