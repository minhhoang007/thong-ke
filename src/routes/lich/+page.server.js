import { getDrawsForMonth } from '$lib/db/queries/results.js';

export function load({ url }) {
  const now   = new Date();
  const year  = parseInt(url.searchParams.get('year'))  || now.getFullYear();
  const month = parseInt(url.searchParams.get('month')) || now.getMonth() + 1;

  const draws = getDrawsForMonth(year, month);

  // Tạo map: draw_date → [draws] (có thể nhiều tỉnh cùng ngày)
  const byDate = {};
  for (const d of draws) {
    if (!byDate[d.draw_date]) byDate[d.draw_date] = [];
    byDate[d.draw_date].push(d);
  }

  return { byDate, year, month };
}
