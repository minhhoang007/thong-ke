// Tên cột CSV tương ứng với từng giải
const CSV_HEADERS = [
  'date', 'province',
  'giai_db',
  'giai_nhat',
  'giai_nhi_1', 'giai_nhi_2',
  'giai_ba_1', 'giai_ba_2', 'giai_ba_3', 'giai_ba_4', 'giai_ba_5', 'giai_ba_6',
  'giai_tu_1', 'giai_tu_2', 'giai_tu_3', 'giai_tu_4',
  'giai_nam_1', 'giai_nam_2', 'giai_nam_3', 'giai_nam_4', 'giai_nam_5', 'giai_nam_6',
  'giai_sau_1', 'giai_sau_2', 'giai_sau_3',
  'giai_bay_1', 'giai_bay_2', 'giai_bay_3', 'giai_bay_4',
];

// Nội dung mẫu để user tải về
export const CSV_TEMPLATE =
  CSV_HEADERS.join(',') + '\n' +
  '2026-06-01,mien-bac,12345,23456,34567,45678,56789,67890,78901,89012,90123,01234,1234,2345,3456,4567,5678,6789,7890,8901,9012,0123,123,234,345,12,23,34,45\n';

// Chuyển một hàng CSV (object cột→giá trị) sang định dạng prizes
function rowToPrizes(row) {
  return {
    giai_db:   row.giai_db,
    giai_nhat: row.giai_nhat,
    giai_nhi:  [row.giai_nhi_1,  row.giai_nhi_2].filter(Boolean),
    giai_ba:   [row.giai_ba_1,   row.giai_ba_2,   row.giai_ba_3,
                row.giai_ba_4,   row.giai_ba_5,   row.giai_ba_6].filter(Boolean),
    giai_tu:   [row.giai_tu_1,   row.giai_tu_2,   row.giai_tu_3,   row.giai_tu_4].filter(Boolean),
    giai_nam:  [row.giai_nam_1,  row.giai_nam_2,  row.giai_nam_3,
                row.giai_nam_4,  row.giai_nam_5,  row.giai_nam_6].filter(Boolean),
    giai_sau:  [row.giai_sau_1,  row.giai_sau_2,  row.giai_sau_3].filter(Boolean),
    giai_bay:  [row.giai_bay_1,  row.giai_bay_2,  row.giai_bay_3,  row.giai_bay_4].filter(Boolean),
  };
}

// Parse toàn bộ nội dung file CSV
// Trả về: { draws: [...], errors: [...] }
export function parseCSV(text) {
  const lines = text.trim().split('\n').filter(l => l.trim());
  if (lines.length < 2) {
    return { draws: [], errors: ['File trống hoặc chỉ có header, không có dữ liệu.'] };
  }

  const headers = lines[0].split(',').map(h => h.trim());
  const draws = [];
  const errors = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map(c => c.trim());
    const row = {};
    headers.forEach((h, j) => { row[h] = cols[j] || ''; });

    if (!row.date || !/^\d{4}-\d{2}-\d{2}$/.test(row.date)) {
      errors.push(`Dòng ${i + 1}: Ngày không đúng định dạng YYYY-MM-DD ("${row.date}")`);
      continue;
    }

    draws.push({
      draw_date: row.date,
      province:  row.province || 'mien-bac',
      prizes:    rowToPrizes(row),
    });
  }

  return { draws, errors };
}
