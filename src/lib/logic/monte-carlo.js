/**
 * Khoảng tin cậy theo lý thuyết xác suất (Monte Carlo / Binomial CI)
 *
 * Câu hỏi: "Tần suất quan sát của cặp số có bình thường không?"
 *
 * Cách hoạt động (mô phỏng Monte Carlo):
 *   Hãy tưởng tượng ta mô phỏng 10.000 lần xổ số ngẫu nhiên hoàn toàn:
 *   mỗi kết quả rút ngẫu nhiên 1 cặp trong 100 cặp có xác suất bằng nhau.
 *   Sau N lần rút (= tổng số kết quả thực tế), ta đếm mỗi cặp ra bao nhiêu lần.
 *
 *   Phân phối Binomial: X ~ B(n, p=1/100)
 *     → E[X] = n/100     (kỳ vọng)
 *     → Var[X] = n × 0.01 × 0.99
 *     → Với n lớn: gần đúng chuẩn tắc N(μ, σ²)
 *
 *   Khoảng tin cậy 95%: [μ − 1.96σ, μ + 1.96σ]
 *   Khoảng tin cậy 99%: [μ − 2.576σ, μ + 2.576σ]
 *
 *   Ý nghĩa:
 *   - Nếu xổ số ngẫu nhiên, 95% cặp phải nằm trong CI 95%.
 *   - Kỳ vọng: ~5 cặp nằm ngoài CI 95% (ngẫu nhiên).
 *   - Nếu nhiều hơn nhiều → phân phối lệch đáng kể.
 */

/**
 * Tính khoảng tin cậy lý thuyết cho tần suất xuất hiện của 1 cặp.
 * @param {number} totalValues  — Tổng số kết quả (tất cả giải, tất cả kỳ)
 * @returns {{ mean, std, lo95, hi95, lo99, hi99 }}
 */
export function theoreticalCI(totalValues) {
  if (totalValues === 0) return { mean: 0, std: 0, lo95: 0, hi95: 0, lo99: 0, hi99: 0 };

  const n    = totalValues;
  const p    = 0.01;                          // xác suất đều cho mỗi cặp
  const mean = n * p;
  const std  = Math.sqrt(n * p * (1 - p));

  return {
    mean:  +mean.toFixed(1),
    std:   +std.toFixed(2),
    lo95:  Math.max(0, Math.round(mean - 1.96 * std)),
    hi95:  Math.round(mean + 1.96 * std),
    lo99:  Math.max(0, Math.round(mean - 2.576 * std)),
    hi99:  Math.round(mean + 2.576 * std),
  };
}

/**
 * Phân loại 1 cặp dựa trên khoảng tin cậy.
 * @returns {'extreme-low' | 'low' | 'normal' | 'high' | 'extreme-high'}
 */
export function classifyCI(count, ci) {
  if (count < ci.lo99)  return 'extreme-low';
  if (count < ci.lo95)  return 'low';
  if (count > ci.hi99)  return 'extreme-high';
  if (count > ci.hi95)  return 'high';
  return 'normal';
}

/** Nhãn tiếng Việt cho từng phân loại */
export const CI_LABEL = {
  'extreme-low':  'Rất thấp (<99%CI)',
  'low':          'Thấp (<95%CI)',
  'normal':       'Bình thường',
  'high':         'Cao (>95%CI)',
  'extreme-high': 'Rất cao (>99%CI)',
};
