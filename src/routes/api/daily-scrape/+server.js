import { json } from '@sveltejs/kit';
import { scrapeResult } from '$lib/logic/scraper.js';
import { saveDraw, findDraw } from '$lib/db/queries/results.js';

// POST /api/daily-scrape
// Tự động scrape hôm nay + hôm qua (Miền Bắc), bỏ qua nếu đã có
export async function POST() {
  // Giờ Việt Nam UTC+7
  const nowVN = new Date(Date.now() + 7 * 3600 * 1000);
  const todayVN     = nowVN.toISOString().slice(0, 10);
  const yesterdayVN = new Date(nowVN - 86400000).toISOString().slice(0, 10);

  const results = [];

  for (const date of [todayVN, yesterdayVN]) {
    const existing = findDraw(date, 'mien-bac');
    if (existing) {
      results.push({ date, status: 'skipped' });
      continue;
    }
    try {
      const scraped = await scrapeResult('mien-bac', date);
      if (!scraped.success) {
        results.push({ date, status: 'no_data', error: scraped.error });
        continue;
      }
      const drawId = saveDraw(date, 'mien-bac', scraped.prizes);
      results.push({ date, status: 'saved', drawId });
    } catch (e) {
      results.push({ date, status: 'error', error: String(e) });
    }
  }

  const saved   = results.filter(r => r.status === 'saved').length;
  const skipped = results.filter(r => r.status === 'skipped').length;
  return json({ results, saved, skipped });
}
