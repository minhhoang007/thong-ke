import { json }          from '@sveltejs/kit';
import { scrapeAndSave }  from '$lib/logic/scrape-save.js';
import { nowVN }          from '$lib/utils/time.js';
import { env }            from '$env/dynamic/private';

const ALL_PROVINCES = ['mien-bac', 'mien-trung', 'mien-nam'];

function dateVN(d)    { return d.toISOString().slice(0, 10); }
function yesterday(d) { return new Date(d.getTime() - 86400000); }

/**
 * POST /api/daily-scrape
 * Body (optional JSON):
 *   { provinces?: string[], dates?: string[] }
 *   - provinces mặc định: cả 3 miền
 *   - dates mặc định: [hôm nay, hôm qua] theo giờ VN
 *
 * Bảo vệ: nếu đặt env CRON_SECRET → yêu cầu header `x-cron-secret` khớp
 * (hoặc query ?secret=). Không đặt → mở (tiện dev/local).
 */
export async function POST({ request, url }) {
  const secret = env.CRON_SECRET;
  if (secret) {
    const provided = request.headers.get('x-cron-secret') ?? url.searchParams.get('secret');
    if (provided !== secret) {
      return json({ error: 'unauthorized' }, { status: 401 });
    }
  }

  let body = {};
  try { body = await request.json(); } catch { /* body trống hoặc không phải JSON */ }

  const reqProvinces = Array.isArray(body?.provinces) ? body.provinces : ALL_PROVINCES;
  const provinces    = reqProvinces.filter(p => ALL_PROVINCES.includes(p));
  if (provinces.length === 0) provinces.push('mien-bac');

  let dates;
  if (Array.isArray(body?.dates) && body.dates.length) {
    dates = body.dates.filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d));
  } else {
    const vn = nowVN();
    dates = [dateVN(vn), dateVN(yesterday(vn))];
  }
  if (dates.length === 0) return json({ error: 'no valid dates' }, { status: 400 });

  // Chạy song song tất cả tổ hợp (province × date)
  const results = await Promise.all(
    provinces.flatMap(province => dates.map(date => scrapeAndSave(province, date)))
  );

  const count = (s) => results.filter(r => r.status === s).length;
  return json({
    results,
    saved:   count('saved'),
    partial: count('partial'),
    skipped: count('skipped'),
    failed:  count('no_data') + count('error'),
  });
}
