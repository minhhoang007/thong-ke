import { getDrawsForMonth } from '$lib/db/queries/results.js';

const VN_OFFSET_MS = 7 * 3600 * 1000;

export function load({ url }) {
  const nowVN = new Date(Date.now() + VN_OFFSET_MS);
  const year  = parseInt(url.searchParams.get('year'))  || nowVN.getUTCFullYear();
  const month = parseInt(url.searchParams.get('month')) || nowVN.getUTCMonth() + 1;

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
