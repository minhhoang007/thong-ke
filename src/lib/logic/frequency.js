// Đếm tần suất xuất hiện của từng cặp 00–99
// Input:  ['56', '12', '56', '99', ...]
// Output: { '00': 0, '01': 0, ..., '56': 2, ..., '99': 1 }
export function buildFrequencyMap(last2List) {
  const freq = {};
  for (let i = 0; i < 100; i++) {
    freq[String(i).padStart(2, '0')] = 0;
  }
  for (const pair of last2List) {
    if (pair in freq) freq[pair]++;
  }
  return freq;
}

// Phân loại một cặp số dựa trên tần suất so với trung bình
// Trả về: 'manh' | 'vua' | 'yeu' | 'tham-khao'
export function classify(count, avg) {
  if (!count)              return 'tham-khao'; // 0, undefined, null — chưa xuất hiện
  if (!avg)                return 'vua';       // không có baseline, coi là trung bình
  if (count >= avg * 1.5) return 'manh';       // xuất hiện nhiều hơn 50% so với TB
  if (count <= avg * 0.5) return 'yeu';        // xuất hiện ít hơn 50% so với TB
  return 'vua';
}

// Chuyển freq map thành mảng 10×10 để hiển thị dạng bảng
// Hàng = chữ số hàng chục (0–9), Cột = chữ số hàng đơn vị (0–9)
export function buildGrid(freqMap, avg) {
  const grid = [];
  for (let row = 0; row < 10; row++) {
    const cells = [];
    for (let col = 0; col < 10; col++) {
      const pair = String(row * 10 + col).padStart(2, '0');
      const count = freqMap[pair];
      cells.push({ pair, count, label: classify(count, avg) });
    }
    grid.push(cells);
  }
  return grid;
}
