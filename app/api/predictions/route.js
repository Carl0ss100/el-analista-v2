import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const sessionId = searchParams.get('sessionId');

  if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 });

  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });

  let query = supabase.from('predictions').select('*').eq('user_id', userId);
  if (sessionId) query = query.eq('session_id', sessionId);
  query = query.order('created_at', { ascending: true });

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ predictions: data });
}

export async function POST(request) {
  const body = await request.json();
  const { user_id, session_id, id, match_name, bet_description, market, bookmaker, odds, confidence, stake, result, pnl } = body;

  if (!user_id || !session_id || !id || !match_name) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });

  const { data, error } = await supabase.from('predictions').insert({
    id, user_id, session_id, match_name, bet_description, market: market || 'Otro',
    bookmaker, odds, confidence: confidence || 'Media', stake: stake || 0, result, pnl
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ prediction: data }, { status: 201 });
}

export async function PATCH(request) {
  const body = await request.json();
  const { user_id, id, session_id, ...updates } = body;

  if (!user_id || !id || !session_id) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });

  if (updates.result) {
    const { data: pred } = await supabase.from('predictions')
      .select('stake, odds').eq('id', id).eq('user_id', user_id).eq('session_id', session_id).single();

    if (pred) {
      if (updates.result === 'W') updates.pnl = +(pred.stake * (pred.odds - 1)).toFixed(2);
      else if (updates.result === 'L') updates.pnl = -pred.stake;
      else updates.pnl = 0;
      updates.resolved_at = new Date().toISOString();
    }
  }

  const { data, error } = await supabase.from('predictions')
    .update(updates).eq('id', id).eq('user_id', user_id).eq('session_id', session_id)
    .select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ prediction: data });
}

export async function DELETE(request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const id = searchParams.get('id');
  const sessionId = searchParams.get('sessionId');

  if (!userId || !id || !sessionId) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });

  const { error } = await supabase.from('predictions')
    .delete().eq('id', id).eq('user_id', userId).eq('session_id', sessionId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
