import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase';

export async function POST() {
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: 'Service role key not configured on server.' },
      { status: 500 }
    );
  }

  try {
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // 1. Delete tweets older than 14 days
    const { count: tweetCount, error: tErr } = await supabaseAdmin
      .from('tweets')
      .delete()
      .lt('published_at', fourteenDaysAgo);

    if (tErr) throw tErr;

    // 2. Delete news articles older than 30 days
    const { count: newsCount, error: nErr } = await supabaseAdmin
      .from('news_articles')
      .delete()
      .lt('published_at', thirtyDaysAgo);

    if (nErr) throw nErr;

    return NextResponse.json({
      message: 'Prune completed successfully.',
      details: {
        tweets_deleted: tweetCount || 0,
        news_deleted: newsCount || 0,
      },
    });
  } catch (err: any) {
    console.error('Database pruning failure:', err);
    return NextResponse.json({ error: err.message || 'Pruning failed.' }, { status: 500 });
  }
}
