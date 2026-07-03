import { json } from '@sveltejs/kit';
import { scrapeResult } from '$lib/logic/scraper.js';
import { validateDrawDate } from '$lib/server/validation.js';

// GET /api/scrape?date=2026-06-29  — scrape thử Miền Bắc (không lưu)
export async function GET({ url }) {
  const date = url.searchParams.get('date') || null;
  if (date) {
    const dateError = validateDrawDate(date);
    if (dateError) return json({ error: dateError }, { status: 400 });
  }

  const result = await scrapeResult(date);

  if (!result.success) {
    return json({ error: result.error }, { status: 422 });
  }

  return json(result);
}
