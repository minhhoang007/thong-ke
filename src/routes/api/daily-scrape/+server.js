import { json }          from '@sveltejs/kit';
import { scrapeAndSave }  from '$lib/logic/scrape-save.js';
import { nowVN }          from '$lib/utils/time.js';
import { env }            from '$env/dynamic/private';

function dateVN(d)    { return d.toISOString().slice(0, 10); }
function yesterday(d) { return new Date(d.getTime() - 86400000); }

/**
 * POST /api/daily-scrape — cào kết quả Miền Bắc.
 * Body (optional JSON): { dates?: string[] }  — mặc định [hôm nay, hôm qua] theo giờ VN.
 *
 * Bảo vệ: nếu đặt env CRON_SECRET → yêu cầu header `x-cron-secret` (hoặc ?secret=) khớp.
 */
export async function POST({ request, url }) {
  const secret = env.CRON_SECRET;
  if (secret) {
    const provided = request.headers.get('x-cron-secret') ?? url.searchParams.get('secret');
    if (provided !== secret) return json({ error: 'unauthorized' }, { status: 401 });
  }

  let body = {};
  try { body = await request.json(); } catch { /* body trống hoặc không phải JSON */ }

  let dates;
  if (Array.isArray(body?.dates) && body.dates.length) {
    dates = body.dates.filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d));
  } else {
    const vn = nowVN();
    dates = [dateVN(vn), dateVN(yesterday(vn))];
  }
  if (dates.length === 0) return json({ error: 'no valid dates' }, { status: 400 });

  const results = await Promise.all(dates.map(date => scrapeAndSave(date)));

  const count = (s) => results.filter(r => r.status === s).length;
  return json({
    results,
    saved:   count('saved'),
    partial: count('partial'),
    skipped: count('skipped'),
    failed:  count('no_data') + count('error'),
  });
}
