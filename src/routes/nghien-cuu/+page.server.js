import { getAllFreqMapStats, getGapStatsAll, getGDBSequence } from '$lib/db/queries/stats.js';
import { chiSquareUniformTest } from '$lib/logic/chi-square.js';
import { theoreticalCI, classifyCI } from '$lib/logic/monte-carlo.js';

export function load() {
  // 1. Tần suất toàn bộ lịch sử
  const { freqMap, totalDraws, totalValues } = getAllFreqMapStats();

  // 2. Kiểm định chi-square: phân phối có đều không?
  const chiSquare = chiSquareUniformTest(freqMap);

  // 3. Khoảng tin cậy lý thuyết (Monte Carlo / Binomial)
  const ci = theoreticalCI(totalValues);

  // Gán phân loại CI cho từng cặp và tạo mảng hiển thị
  const pairsCI = Array.from({ length: 100 }, (_, i) => {
    const pair  = String(i).padStart(2, '0');
    const count = freqMap[pair] ?? 0;
    return { pair, count, ciClass: classifyCI(count, ci) };
  });

  const outsideCI95 = pairsCI.filter(p => p.ciClass !== 'normal');
  const outsideCI99 = pairsCI.filter(p => p.ciClass === 'extreme-low' || p.ciClass === 'extreme-high');

  // 4. Phân tích khoảng cách (gap)
  const gapStats = getGapStatsAll();

  // Chuyển thành mảng, sắp xếp theo overdueScore giảm dần
  const gapList = Object.entries(gapStats.pairs)
    .map(([pair, v]) => ({ pair, ...v }))
    .sort((a, b) => {
      // Cặp chưa bao giờ ra → currentGap = totalDraws → đưa lên đầu
      if (a.overdueScore === null && b.overdueScore === null) return b.currentGap - a.currentGap;
      if (a.overdueScore === null) return -1;
      if (b.overdueScore === null) return 1;
      return b.overdueScore - a.overdueScore;
    });

  // 5. Tự tương quan GĐB (Autocorrelation)
  const gdbSeq    = getGDBSequence(200);
  const gdbValues = gdbSeq.map(r => parseInt(r.pair, 10));
  const acf       = computeACF(gdbValues, 7);
  const critValue = gdbValues.length > 0 ? +(2 / Math.sqrt(gdbValues.length)).toFixed(3) : 0;

  // Các cặp GĐB gần nhất (30 kỳ) để hiển thị chuỗi
  const gdbLast30 = gdbSeq.slice(-30).map(r => ({ date: r.draw_date, pair: r.pair }));

  return {
    chiSquare,
    ci,
    pairsCI,
    outsideCI95: outsideCI95.length,
    outsideCI99: outsideCI99.length,
    pairsOutside: outsideCI95,
    gapList,
    totalDraws,
    totalValues,
    acf,
    critValue,
    gdbLast30,
    gdbN: gdbValues.length,
  };
}

/**
 * Hệ số tự tương quan (ACF) tại lag 1..maxLag.
 *
 * ACF(lag k) = Cov(Xₜ, Xₜ₊ₖ) / Var(X)
 *
 * Nếu |ACF(k)| < 2/√n → không có ý nghĩa thống kê → chuỗi độc lập tại lag đó.
 */
function computeACF(values, maxLag = 7) {
  const n = values.length;
  if (n < maxLag + 5) return [];

  const mean   = values.reduce((s, v) => s + v, 0) / n;
  const denom  = values.reduce((s, v) => s + (v - mean) ** 2, 0);
  if (denom === 0) return [];

  return Array.from({ length: maxLag }, (_, k) => {
    const lag = k + 1;
    let num = 0;
    for (let i = 0; i < n - lag; i++) {
      num += (values[i] - mean) * (values[i + lag] - mean);
    }
    return { lag, acf: +(num / denom).toFixed(3) };
  });
}
