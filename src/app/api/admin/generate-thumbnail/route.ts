import { NextRequest, NextResponse } from 'next/server';

const CLOUDFLARE_WORKER_URL = process.env.EXPO_PUBLIC_API_URL || 'https://gitfeed-backend.sriram.workers.dev';

export async function POST(req: NextRequest) {
  try {
    const { repoId } = await req.json();
    if (!repoId) {
      return NextResponse.json({ error: 'Repository ID is required' }, { status: 400 });
    }

    const workerUrl = `${CLOUDFLARE_WORKER_URL}/api/admin/generate-thumbnail`;
    const response = await fetch(workerUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repoId }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Worker failed to regenerate thumbnail');
    }

    return NextResponse.json(data);
  } catch (err: any) {
    console.error('Thumbnail regeneration failure:', err);
    return NextResponse.json({ error: err.message || 'Thumbnail regeneration failed.' }, { status: 500 });
  }
}
