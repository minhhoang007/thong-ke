import { getDrawsForMonth } from '$lib/db/queries/results.js';
import { nowVN } from '$lib/utils/time.js';

export function load({ url }) {
  const vn    = nowVN();
  const year  = parseInt(url.searchParams.get('year'))  || vn.getUTCFullYear();
  const month = parseInt(url.searchParams.get('month')) || vn.getUTCMonth() + 1;

  const draws = getDrawsForMonth(year, month);

  const byDate   = {};
  const pairFreq = {};

  for (const d of draws) {
    if (!byDate[d.draw_date]) byDate[d.draw_date] = [];
    byDate[d.draw_date].push(d);
    if (d.gdb_pair) pairFreq[d.gdb_pair] = (pairFreq[d.gdb_pair] ?? 0) + 1;
  }

  return { byDate, pairFreq, year, month };
}
