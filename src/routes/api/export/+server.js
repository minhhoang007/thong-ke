import { getFrequencyStats } from '$lib/db/queries/stats.js';

const PRIZE_LABELS = {
  all: 'Tất cả giải', giai_db: 'Giải đặc biệt', giai_nhat: 'Giải nhất',
  giai_nhi: 'Giải nhì', giai_ba: 'Giải ba', giai_tu: 'Giải tư',
  giai_nam: 'Giải năm', giai_sau: 'Giải sáu', giai_bay: 'Giải bảy',
};

// GET /api/export?year=&month=&prize= — trả về CSV tần suất
export function GET({ url }) {
  const yearRaw = url.searchParams.get('year');
  const monthRaw = url.searchParams.get('month');
  const prizeRaw = url.searchParams.get('prize') || 'all';
  const year = /^20\d{2}$/.test(yearRaw ?? '') ? yearRaw : null;
  const month = /^(?:[1-9]|1[0-2])$/.test(monthRaw ?? '') ? monthRaw : null;
  const prize = prizeRaw in PRIZE_LABELS ? prizeRaw : 'all';

  const { grid, totalDraws, totalValues } = getFrequencyStats(year, month, prize);
  const prizeLabel = PRIZE_LABELS[prize] ?? prize;

  // Header metadata
  const lines = [
    `# XoSo Stats — Export tần suất`,
    `# Giải: ${prizeLabel} | Số kỳ: ${totalDraws} | Tổng lần: ${totalValues}`,
    ``,
    `Cặp số,Số lần,Xếp loại`,
  ];

  const cells = grid.flat().sort((a, b) => b.count - a.count || a.pair.localeCompare(b.pair));
  const LABEL_VI = { manh: 'Mạnh', vua: 'Vừa', yeu: 'Yếu', 'tham-khao': 'Tham khảo' };
  for (const cell of cells) {
    lines.push(`${cell.pair},${cell.count},${LABEL_VI[cell.label] ?? cell.label}`);
  }

  const csv = lines.join('\r\n');
  const filename = `xoso-tanSuat-${prize}${year ? `-${year}` : ''}${month ? `-${month}` : ''}.csv`;

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
