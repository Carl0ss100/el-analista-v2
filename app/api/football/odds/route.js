import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const fixtureId = searchParams.get('fixture');
  if (!fixtureId) return NextResponse.json({ error: 'Missing fixture param' }, { status: 400 });

  const proxyUrl = process.env.PROXY_URL;
  if (!proxyUrl) return NextResponse.json({ error: 'PROXY_URL not configured' }, { status: 500 });

  try {
    const res = await fetch(`${proxyUrl}/odds?fixture=${fixtureId}`);
    const data = await res.json();

    if (data.errors && Object.keys(data.errors).length > 0) {
      return NextResponse.json({ error: Object.values(data.errors)[0] }, { status: 400 });
    }

    if (!data.response?.length) {
      return NextResponse.json({ error: 'No odds available' }, { status: 404 });
    }

    const oddsData = data.response[0].bookmakers;
    const formatted = oddsData.slice(0, 5).map(bm => ({
      name: bm.name,
      bets: bm.bets
        .filter(b => !b.name.toLowerCase().includes('correct score') && !b.name.toLowerCase().includes('exact score'))
        .map(bet => ({
          name: bet.name,
          values: bet.values.slice(0, 8).map(v => ({ value: v.value, odd: v.odd }))
        }))
    }));

    return NextResponse.json({ bookmakers: formatted });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
