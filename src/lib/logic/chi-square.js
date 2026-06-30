/**
 * Kiểm định Chi-square (χ²) — Kiểm tra phân phối đều
 *
 * Câu hỏi: "100 cặp số 00–99 có xuất hiện đều nhau không?"
 *
 * Cách hoạt động:
 *   1. Nếu xổ số ngẫu nhiên hoàn toàn, mỗi cặp phải xuất hiện ~đều nhau.
 *   2. Tính χ² = Σ (quan_sát - kỳ_vọng)² / kỳ_vọng
 *   3. p-value: xác suất để ngẫu nhiên tạo ra χ² lớn như vậy.
 *      - p > 0.05: KHÔNG có bằng chứng lệch phân phối → hệ thống ngẫu nhiên.
 *      - p ≤ 0.05: CÓ lệch thống kê → một số cặp ra nhiều/ít bất thường.
 *   4. Bậc tự do (df) = 99 (100 cặp − 1).
 */

/**
 * Kiểm định phân phối đều cho 100 cặp 00–99.
 * @param {Record<string,number>} freqMap  — Map pair → số lần xuất hiện
 * @returns {{ chi2, df, pValue, expected, significant, total, min, max } | null}
 */
export function chiSquareUniformTest(freqMap) {
  const pairs    = Array.from({ length: 100 }, (_, i) => String(i).padStart(2, '0'));
  const observed = pairs.map(p => freqMap[p] ?? 0);
  const total    = observed.reduce((s, v) => s + v, 0);
  if (total === 0) return null;

  const expected = total / 100;          // kỳ vọng đều = tổng / 100
  const df       = 99;                   // bậc tự do

  const chi2 = observed.reduce((s, o) => s + (o - expected) ** 2 / expected, 0);
  const pValue = 1 - chi2CDF(chi2, df);

  return {
    chi2:        +chi2.toFixed(2),
    df,
    pValue:      +pValue.toFixed(4),
    expected:    +expected.toFixed(2),
    significant: pValue < 0.05,          // true = có lệch thống kê
    total,
    min: Math.min(...observed),
    max: Math.max(...observed),
  };
}

// ---------------------------------------------------------------------------
// Nội bộ: xấp xỉ Wilson-Hilferty (chính xác với df ≥ 30)
// ---------------------------------------------------------------------------

function chi2CDF(x, df) {
  // Biến đổi χ² → chuẩn tắc N(0,1)
  const h = 2 / (9 * df);
  const z = (Math.cbrt(x / df) - (1 - h)) / Math.sqrt(h);
  return normalCDF(z);
}

function normalCDF(x) {
  return 0.5 * (1 + erf(x / Math.SQRT2));
}

// Xấp xỉ hàm erf — Abramowitz & Stegun (sai số < 1.5 × 10⁻⁷)
function erf(x) {
  const sign = x >= 0 ? 1 : -1;
  x = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * x);
  const y = 1 - (
    ((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t
    + 0.254829592
  ) * t * Math.exp(-x * x);
  return sign * y;
}
