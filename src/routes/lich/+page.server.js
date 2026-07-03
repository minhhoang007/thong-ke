import { getDrawsForMonth } from '$lib/db/queries/results.js';
import { nowVN } from '$lib/utils/time.js';
import { boundedInt } from '$lib/server/validation.js';

export function load({ url }) {
  const vn    = nowVN();
  const year  = boundedInt(url.searchParams.get('year'), vn.getUTCFullYear(), { min: 2000, max: vn.getUTCFullYear() + 1 });
  const month = boundedInt(url.searchParams.get('month'), vn.getUTCMonth() + 1, { min: 1, max: 12 });

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
