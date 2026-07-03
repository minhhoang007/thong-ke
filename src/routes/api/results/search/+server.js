import { json } from '@sveltejs/kit';
import { searchDraws } from '$lib/db/queries/results.js';
import { isValidDate } from '$lib/server/validation.js';

// GET /api/results/search?pair=73&from=2026-01-01&to=2026-06-30
export function GET({ url }) {
  const fromDate = url.searchParams.get('from') || null;
  const toDate   = url.searchParams.get('to')   || null;
  const pair     = url.searchParams.get('pair') || null;

  if (!fromDate && !toDate && !pair) {
    return json({ error: 'Cần ít nhất 1 điều kiện tìm kiếm' }, { status: 400 });
  }
  if ((fromDate && !isValidDate(fromDate)) || (toDate && !isValidDate(toDate))) {
    return json({ error: 'Ngày tìm kiếm không hợp lệ.' }, { status: 400 });
  }
  if (pair && !/^\d{2}$/.test(pair)) return json({ error: 'Cặp số phải gồm 2 chữ số.' }, { status: 400 });
  if (fromDate && toDate && fromDate > toDate) return json({ error: 'Khoảng ngày không hợp lệ.' }, { status: 400 });

  const draws = searchDraws({ fromDate, toDate, pair });
  return json({ draws, total: draws.length });
}
