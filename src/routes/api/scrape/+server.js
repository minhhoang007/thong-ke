import { json } from '@sveltejs/kit';
import { scrapeResult } from '$lib/logic/scraper.js';

// GET /api/scrape?province=mien-bac&date=2026-06-29
export async function GET({ url }) {
  const province = url.searchParams.get('province') || 'mien-bac';
  const date     = url.searchParams.get('date')     || null;

  const result = await scrapeResult(province, date);

  if (!result.success) {
    return json({ error: result.error }, { status: 422 });
  }

  return json(result);
}
