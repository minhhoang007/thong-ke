import { json }                      from '@sveltejs/kit';
import { scrapeResult }              from '$lib/logic/scraper.js';
import { saveDraw, findDraw }        from '$lib/db/queries/results.js';

const VN_OFFSET_MS = 7 * 3600 * 1000;

function nowVN()     { return new Date(Date.now() + VN_OFFSET_MS); }
function dateVN(d)   { return d.toISOString().slice(0, 10); }
function yesterday(d){ return new Date(d - 86400000); }

/**
 * POST /api/daily-scrape
 * Body (optional JSON): { provinces: ['mien-bac', 'mien-trung', 'mien-nam'] }
 * Default: chỉ mien-bac.
 * Luôn scrape hôm nay + hôm qua, bỏ qua nếu đã có.
 */
export async function POST({ request }) {
  let body = {};
  try { body = await request.json(); } catch { /* body trống hoặc không phải JSON */ }

  const allProvinces = ['mien-bac', 'mien-trung', 'mien-nam'];
  const requested    = Array.isArray(body?.provinces) ? body.provinces : ['mien-bac'];
  const provinces    = requested.filter(p => allProvinces.includes(p));
  if (provinces.length === 0) provinces.push('mien-bac');

  const vn        = nowVN();
  const todayVN   = dateVN(vn);
  const yestVN    = dateVN(yesterday(vn));
  const dates     = [todayVN, yestVN];

  // Scrape song song: tất cả tổ hợp (province × date) chạy đồng thời
  const tasks = provinces.flatMap(province =>
    dates.map(async (date) => {
      if (findDraw(date, province)) {
        return { date, province, status: 'skipped' };
      }
      try {
        const scraped = await scrapeResult(province, date);
        if (!scraped.success) {
          return { date, province, status: 'no_data', errors: scraped.errors };
        }
        const drawId = saveDraw(date, province, scraped.prizes);
        return {
          date,
          province,
          status:      'saved',
          drawId,
          source:      scraped.source,
          sourceLabel: scraped.sourceLabel,
          partial:     scraped.partial ?? false,
        };
      } catch (e) {
        return { date, province, status: 'error', error: String(e) };
      }
    })
  );

  const results = await Promise.all(tasks);

  const saved   = results.filter(r => r.status === 'saved').length;
  const skipped = results.filter(r => r.status === 'skipped').length;
  return json({ results, saved, skipped });
}
