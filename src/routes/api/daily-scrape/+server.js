import { json }          from '@sveltejs/kit';
import { scrapeAndSave }  from '$lib/logic/scrape-save.js';
import { nowVN }          from '$lib/utils/time.js';
import { env }            from '$env/dynamic/private';
import { isAdminRequest, isCronRequest } from '$lib/server/auth.js';
import { isValidDate, validateDrawDate } from '$lib/server/validation.js';

function dateVN(d)    { return d.toISOString().slice(0, 10); }
function yesterday(d) { return new Date(d.getTime() - 86400000); }

/**
 * POST /api/daily-scrape — cào kết quả Miền Bắc.
 * Body (optional JSON): { dates?: string[] }  — mặc định [hôm nay, hôm qua] theo giờ VN.
 *
 * Bảo vệ fail-closed: yêu cầu `x-cron-secret` hoặc phiên Basic Auth quản trị hợp lệ.
 */
export async function POST({ request, url }) {
  const origin = request.headers.get('origin');
  if (origin && origin !== url.origin) return json({ error: 'cross-origin request rejected' }, { status: 403 });
  const adminRequest = isAdminRequest(request);
  if (!env.CRON_SECRET && !adminRequest) return json({ error: 'Cron access is not configured.' }, { status: 503 });
  if (!adminRequest && !isCronRequest(request)) {
    return json({ error: 'unauthorized' }, { status: 401 });
  }

  let body = {};
  try { body = await request.json(); } catch { /* body trống */ }

  let dates;
  if (Array.isArray(body?.dates) && body.dates.length) {
    if (body.dates.length > 100) return json({ error: 'Tối đa 100 ngày mỗi request.' }, { status: 400 });
    dates = [...new Set(body.dates)].filter(isValidDate);
  } else {
    const vn = nowVN();
    dates = [dateVN(vn), dateVN(yesterday(vn))];
  }
  if (dates.length === 0) return json({ error: 'no valid dates' }, { status: 400 });
  const invalidDate = dates.find((date) => validateDrawDate(date));
  if (invalidDate) return json({ error: validateDrawDate(invalidDate) }, { status: 400 });

  const results = [];
  for (let i = 0; i < dates.length; i += 3) {
    results.push(...await Promise.all(dates.slice(i, i + 3).map(date => scrapeAndSave(date))));
  }

  const count = (s) => results.filter(r => r.status === s).length;
  return json({
    results,
    saved:   count('saved'),
    partial: count('partial'),
    skipped: count('skipped'),
    failed:  count('no_data') + count('error'),
  });
}
