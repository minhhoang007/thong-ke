import { json } from '@sveltejs/kit';
import { searchDraws } from '$lib/db/queries/results.js';

// GET /api/results/search?pair=73&from=2026-01-01&to=2026-06-30
export function GET({ url }) {
  const fromDate = url.searchParams.get('from') || null;
  const toDate   = url.searchParams.get('to')   || null;
  const pair     = url.searchParams.get('pair') || null;

  if (!fromDate && !toDate && !pair) {
    return json({ error: 'Cần ít nhất 1 điều kiện tìm kiếm' }, { status: 400 });
  }

  const draws = searchDraws({ fromDate, toDate, pair });
  return json({ draws, total: draws.length });
}
