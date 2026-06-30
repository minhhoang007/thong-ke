import { getDrawsForMonth } from '$lib/db/queries/results.js';

export function load({ url }) {
  const now   = new Date();
  const year  = parseInt(url.searchParams.get('year'))  || now.getFullYear();
  const month = parseInt(url.searchParams.get('month')) || now.getMonth() + 1;

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
