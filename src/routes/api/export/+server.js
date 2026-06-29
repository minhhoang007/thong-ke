import { getFrequencyStats } from '$lib/db/queries/stats.js';

const PRIZE_LABELS = {
  all: 'Tất cả giải', giai_db: 'Giải đặc biệt', giai_nhat: 'Giải nhất',
  giai_nhi: 'Giải nhì', giai_ba: 'Giải ba', giai_tu: 'Giải tư',
  giai_nam: 'Giải năm', giai_sau: 'Giải sáu', giai_bay: 'Giải bảy',
};

// GET /api/export?year=&month=&prize= — trả về CSV tần suất
export function GET({ url }) {
  const year  = url.searchParams.get('year')  || null;
  const month = url.searchParams.get('month') || null;
  const prize = url.searchParams.get('prize') || 'all';

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
