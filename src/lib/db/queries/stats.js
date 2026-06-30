import { getDb } from '../database.js';
import { getLast2 } from '../../logic/parser.js';
import { buildFrequencyMap, buildGrid } from '../../logic/frequency.js';
import { withCache, bust } from '../cache.js';

const TTL = 10 * 60 * 1000; // 10 phút

// Các tháng có dữ liệu (dùng cho dropdown filter)
export function getAvailablePeriods() {
  const db = getDb();
  return db.prepare(`
    SELECT DISTINCT strftime('%Y-%m', draw_date) as period
    FROM draws
    ORDER BY period DESC
  `).all().map(r => r.period);
}

// Thống kê tần suất — lọc theo năm/tháng và/hoặc giải cụ thể
// prize: 'all' | 'giai_db' | 'giai_nhat' | ... (null = 'all')
export function getFrequencyStats(year = null, month = null, prize = null) {
  const db = getDb();

  const dateConditions = [];
  const dateParams = [];

  if (year && month) {
    dateConditions.push("strftime('%Y-%m', d.draw_date) = ?");
    dateParams.push(`${year}-${String(month).padStart(2, '0')}`);
  } else if (year) {
    dateConditions.push("strftime('%Y', d.draw_date) = ?");
    dateParams.push(String(year));
  }

  const allConditions = [...dateConditions];
  const allParams = [...dateParams];
  if (prize && prize !== 'all') {
    allConditions.push('r.prize_name = ?');
    allParams.push(prize);
  }

  const where     = allConditions.length ? allConditions.join(' AND ') : '1=1';
  const dateWhere = dateConditions.length ? dateConditions.join(' AND ') : '1=1';

  const values = db
    .prepare(`SELECT r.value FROM results r JOIN draws d ON d.id = r.draw_id WHERE ${where}`)
    .all(...allParams)
    .map(r => getLast2(r.value))
    .filter(Boolean);

  const totalDraws = db
    .prepare(`SELECT COUNT(*) as n FROM draws d WHERE ${dateWhere}`)
    .get(...dateParams).n;

  const freq = buildFrequencyMap(values);
  const avg  = values.length / 100;

  return {
    totalDraws,
    totalValues: values.length,
    grid: buildGrid(freq, avg),
  };
}

// Phân tích nóng/lạnh trong N kỳ gần nhất
// Trả về top 10 cặp lạnh nhất (streak dài nhất) và nóng nhất (xuất hiện nhiều nhất)
export function getHotColdData(recentN = 30, prize = null) {
  const db = getDb();

  const recentDrawIds = db
    .prepare('SELECT id FROM draws ORDER BY draw_date DESC, id DESC LIMIT ?')
    .all(recentN)
    .map(r => r.id);

  if (recentDrawIds.length === 0) return { hot: [], cold: [], recentN: 0 };

  const placeholders = recentDrawIds.map(() => '?').join(',');
  const prizeClause  = prize && prize !== 'all' ? ' AND r.prize_name = ?' : '';
  const queryParams  = prize && prize !== 'all'
    ? [...recentDrawIds, prize]
    : recentDrawIds;

  const rows = db
    .prepare(`SELECT r.draw_id, r.value FROM results r WHERE r.draw_id IN (${placeholders})${prizeClause}`)
    .all(...queryParams);

  // Map: drawId → Set of pairs xuất hiện trong kỳ đó
  const drawPairs = {};
  for (const id of recentDrawIds) drawPairs[id] = new Set();
  for (const row of rows) {
    const pair = getLast2(row.value);
    if (pair && drawPairs[row.draw_id]) drawPairs[row.draw_id].add(pair);
  }

  // Tính streak (kỳ liên tiếp chưa ra tính từ kỳ mới nhất) và count
  const stats = {};
  for (let i = 0; i < 100; i++) {
    stats[String(i).padStart(2, '0')] = { streak: 0, count: 0 };
  }

  // count: tổng số lần xuất hiện trong recentN kỳ
  for (const pairs of Object.values(drawPairs)) {
    for (const pair of pairs) {
      if (pair in stats) stats[pair].count++;
    }
  }

  // streak: đếm từ kỳ mới nhất ngược về, dừng khi tìm thấy
  for (const pair of Object.keys(stats)) {
    let streak = 0;
    for (const drawId of recentDrawIds) {
      if (!drawPairs[drawId].has(pair)) streak++;
      else break;
    }
    stats[pair].streak = streak;
  }

  const entries = Object.entries(stats).map(([pair, s]) => ({ pair, ...s }));

  const cold = [...entries]
    .filter(e => e.streak > 0)
    .sort((a, b) => b.streak - a.streak || a.count - b.count)
    .slice(0, 10);

  const hot = [...entries]
    .sort((a, b) => b.count - a.count || a.streak - b.streak)
    .slice(0, 10);

  return { hot, cold, recentN: recentDrawIds.length };
}

// Top N cặp số xuất hiện nhiều nhất (tất cả giải, không filter)
export function getTopPairs(n = 5) {
  const db = getDb();
  return db.prepare(`
    SELECT SUBSTR(value, -2) as pair, COUNT(*) as count
    FROM results
    WHERE LENGTH(TRIM(value)) >= 2
      AND SUBSTR(value, -2) GLOB '[0-9][0-9]'
    GROUP BY pair
    ORDER BY count DESC
    LIMIT ?
  `).all(n);
}

// Thống kê co-occurrence: cặp đôi cùng xuất hiện trong 1 kỳ nhiều nhất
// Trả về top N cặp đôi [a, b, count] với a < b
export function getPairCoOccurrence(topN = 20, prize = null) {
  const db = getDb();
  const prizeWhere = prize && prize !== 'all' ? ' AND prize_name = ?' : '';
  const params     = prize && prize !== 'all' ? [prize] : [];

  // 1 query thay vì N queries (1 mỗi kỳ)
  const rows = db.prepare(`
    SELECT draw_id, SUBSTR(value, -2) as pair
    FROM results
    WHERE LENGTH(TRIM(value)) >= 2${prizeWhere}
  `).all(...params);

  if (rows.length === 0) return [];

  // Group pairs theo draw_id
  const drawPairs = {};
  for (const { draw_id, pair } of rows) {
    if (!/^\d{2}$/.test(pair)) continue;
    if (!drawPairs[draw_id]) drawPairs[draw_id] = new Set();
    drawPairs[draw_id].add(pair);
  }

  const coMatrix = {};
  for (const pairSet of Object.values(drawPairs)) {
    const arr = [...pairSet].sort();
    for (let i = 0; i < arr.length; i++) {
      for (let j = i + 1; j < arr.length; j++) {
        const key = `${arr[i]}-${arr[j]}`;
        coMatrix[key] = (coMatrix[key] || 0) + 1;
      }
    }
  }

  return Object.entries(coMatrix)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([key, count]) => { const [a, b] = key.split('-'); return { a, b, count }; });
}

// Lô gan: số kỳ liên tiếp mỗi cặp 00-99 chưa xuất hiện tính từ kỳ mới nhất
export function getLoGanStats() {
  const db = getDb();
  const totalDraws = db.prepare('SELECT COUNT(*) as n FROM draws').get().n;

  // Lấy ngày xuất hiện gần nhất của mỗi cặp
  const appeared = db.prepare(`
    SELECT SUBSTR(r.value, -2) as pair, MAX(d.draw_date) as last_date
    FROM results r
    JOIN draws d ON d.id = r.draw_id
    WHERE LENGTH(TRIM(r.value)) >= 2
    GROUP BY SUBSTR(r.value, -2)
  `).all();

  // Lấy toàn bộ ngày kỳ xổ (asc) để binary search "bao nhiêu kỳ sau last_date"
  const allDatesAsc = db.prepare('SELECT draw_date FROM draws ORDER BY draw_date ASC').all().map(r => r.draw_date);

  // Binary search: trả về số phần tử trong mảng đã sắp xếp tăng dần có giá trị > date
  function countAfter(dates, date) {
    let lo = 0, hi = dates.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (dates[mid] <= date) lo = mid + 1;
      else hi = mid;
    }
    return dates.length - lo;
  }

  const ganMap = {};
  for (let i = 0; i < 100; i++) {
    ganMap[String(i).padStart(2, '0')] = { gan: totalDraws, lastDate: null };
  }

  for (const { pair, last_date } of appeared) {
    if (!pair || pair.length !== 2 || !/^\d{2}$/.test(pair)) continue;
    const gan = countAfter(allDatesAsc, last_date);
    ganMap[pair] = { gan, lastDate: last_date };
  }

  const list = Object.entries(ganMap)
    .map(([pair, v]) => ({ pair, ...v }))
    .sort((a, b) => b.gan - a.gan);

  const grid = [];
  for (let row = 0; row < 10; row++) {
    grid.push([]);
    for (let col = 0; col < 10; col++) {
      const pair = String(row * 10 + col).padStart(2, '0');
      grid[row].push({ pair, ...ganMap[pair] });
    }
  }

  return { list, grid, totalDraws };
}

// Thống kê đầu/đuôi: tần suất chữ số hàng chục (đầu) và hàng đơn vị (đuôi)
export function getDauDuoiStats(year = null, month = null) {
  const db = getDb();

  const conditions = ['LENGTH(TRIM(r.value)) >= 2'];
  const params = [];
  if (year && month) {
    conditions.push("strftime('%Y-%m', d.draw_date) = ?");
    params.push(`${year}-${String(month).padStart(2, '0')}`);
  } else if (year) {
    conditions.push("strftime('%Y', d.draw_date) = ?");
    params.push(String(year));
  }
  const where = conditions.join(' AND ');

  const values = db.prepare(`
    SELECT r.value FROM results r
    JOIN draws d ON d.id = r.draw_id
    WHERE ${where}
  `).all(...params).map(r => r.value.trim());

  const dauCount  = Array(10).fill(0);
  const duoiCount = Array(10).fill(0);

  for (const val of values) {
    if (val.length < 2) continue;
    const dau  = parseInt(val[val.length - 2]);
    const duoi = parseInt(val[val.length - 1]);
    if (!isNaN(dau))  dauCount[dau]++;
    if (!isNaN(duoi)) duoiCount[duoi]++;
  }

  return {
    dau:   dauCount.map((count, digit) => ({ digit, count })),
    duoi:  duoiCount.map((count, digit) => ({ digit, count })),
    total: values.length,
  };
}

// Tổng giải đặc biệt: tổng 2 chữ số cuối (0-18) + chẵn/lẻ
export function getTongGDBStats(year = null, month = null) {
  const db = getDb();

  const conditions = ["r.prize_name = 'giai_db'", 'LENGTH(TRIM(r.value)) >= 2'];
  const params = [];
  if (year && month) {
    conditions.push("strftime('%Y-%m', d.draw_date) = ?");
    params.push(`${year}-${String(month).padStart(2, '0')}`);
  } else if (year) {
    conditions.push("strftime('%Y', d.draw_date) = ?");
    params.push(String(year));
  }
  const where = conditions.join(' AND ');

  const values = db.prepare(`
    SELECT r.value FROM results r
    JOIN draws d ON d.id = r.draw_id
    WHERE ${where}
  `).all(...params).map(r => r.value.trim());

  const tongCount = Array(19).fill(0);
  let chan = 0, le = 0;

  for (const val of values) {
    if (val.length < 2) continue;
    const d1 = parseInt(val[val.length - 2]);
    const d2 = parseInt(val[val.length - 1]);
    if (isNaN(d1) || isNaN(d2)) continue;
    const tong = d1 + d2;
    if (tong >= 0 && tong <= 18) tongCount[tong]++;
    const pair = d1 * 10 + d2;
    if (pair % 2 === 0) chan++; else le++;
  }

  return {
    tong:  tongCount.map((count, value) => ({ value, count })),
    chan,
    le,
    total: values.length,
  };
}

// Soi cầu: gợi ý top N cặp dựa trên lô gan + tần suất gần đây
export function getSoiCauRecs(n = 5) {
  const db = getDb();
  const totalDraws = db.prepare('SELECT COUNT(*) as c FROM draws').get().c;
  if (totalDraws === 0) return [];

  const loGan = getLoGanStats();

  const recentIds = db
    .prepare('SELECT id FROM draws ORDER BY draw_date DESC LIMIT 30')
    .all().map(r => r.id);

  const recentFreq = {};
  for (let i = 0; i < 100; i++) recentFreq[String(i).padStart(2, '0')] = 0;

  if (recentIds.length > 0) {
    const ph   = recentIds.map(() => '?').join(',');
    const rows = db.prepare(`SELECT value FROM results WHERE draw_id IN (${ph})`).all(...recentIds);
    for (const { value } of rows) {
      const pair = getLast2(value);
      if (pair && pair in recentFreq) recentFreq[pair]++;
    }
  }

  const maxGan  = Math.max(...loGan.list.map(i => i.gan), 1);
  const maxFreq = Math.max(...Object.values(recentFreq), 1);

  return loGan.list
    .filter(({ lastDate }) => lastDate !== null) // bỏ qua cặp chưa bao giờ ra
    .map(({ pair, gan, lastDate }) => {
      const ganScore  = gan / maxGan;
      const freqScore = recentFreq[pair] / maxFreq;
      const score     = ganScore * 0.6 + freqScore * 0.4;
      return { pair, gan, lastDate, recentCount: recentFreq[pair], score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, n);
}

// Cầu lô: cặp số đang xuất hiện LIÊN TIẾP nhiều kỳ gần nhất
export function getCauLoStats() {
  const db = getDb();
  const totalDraws = db.prepare('SELECT COUNT(*) as n FROM draws').get().n;
  if (totalDraws === 0) return { active: [], grid: [], totalDraws: 0 };

  const draws = db.prepare('SELECT id, draw_date FROM draws ORDER BY draw_date DESC, id DESC').all();

  const drawPairMap = new Map(draws.map(d => [d.id, new Set()]));
  const rows = db.prepare(`
    SELECT draw_id, SUBSTR(value, -2) as pair
    FROM results
    WHERE LENGTH(TRIM(value)) >= 2
  `).all();
  for (const { draw_id, pair } of rows) {
    if (/^\d{2}$/.test(pair) && drawPairMap.has(draw_id)) {
      drawPairMap.get(draw_id).add(pair);
    }
  }

  const streakMap = {};
  for (let i = 0; i < 100; i++) {
    const pair = String(i).padStart(2, '0');
    let streak = 0;
    const dates = [];
    for (const draw of draws) {
      if (drawPairMap.get(draw.id)?.has(pair)) {
        streak++;
        dates.push(draw.draw_date);
      } else {
        break;
      }
    }
    streakMap[pair] = { streak, dates };
  }

  const active = Object.entries(streakMap)
    .filter(([, v]) => v.streak >= 2)
    .map(([pair, v]) => ({ pair, ...v }))
    .sort((a, b) => b.streak - a.streak);

  const grid = [];
  for (let row = 0; row < 10; row++) {
    grid.push([]);
    for (let col = 0; col < 10; col++) {
      const pair = String(row * 10 + col).padStart(2, '0');
      grid[row].push({ pair, ...streakMap[pair] });
    }
  }

  return { active, grid, totalDraws };
}

// Tần suất toàn bộ lịch sử — dùng cho nghien-cuu, không cần grid
export function getAllFreqMapStats() {
  return withCache('freqAll', TTL, _getAllFreqMapStats);
}
function _getAllFreqMapStats() {
  const db         = getDb();
  const totalDraws = db.prepare('SELECT COUNT(*) as n FROM draws').get().n;
  const rows       = db.prepare(`
    SELECT SUBSTR(r.value, -2) as pair
    FROM results r
    WHERE LENGTH(TRIM(r.value)) >= 2 AND SUBSTR(r.value, -2) GLOB '[0-9][0-9]'
  `).all();

  const freq = {};
  for (let i = 0; i < 100; i++) freq[String(i).padStart(2, '0')] = 0;
  for (const { pair } of rows) freq[pair]++;

  return { freqMap: freq, totalDraws, totalValues: rows.length };
}

// Thống kê tần suất cho N kỳ gần nhất (không theo tháng)
export function getFrequencyStatsForWindow(drawCount, prize = null) {
  const db = getDb();
  const recentIds = db.prepare('SELECT id FROM draws ORDER BY draw_date DESC LIMIT ?')
    .all(drawCount).map(r => r.id);

  if (recentIds.length === 0) {
    return { totalDraws: 0, totalValues: 0, grid: buildGrid({}, 0), freqMap: {} };
  }

  const ph         = recentIds.map(() => '?').join(',');
  const prizeWhere = prize && prize !== 'all' ? ' AND r.prize_name = ?' : '';
  const params     = prize && prize !== 'all' ? [...recentIds, prize] : recentIds;

  const values = db.prepare(
    `SELECT r.value FROM results r WHERE r.draw_id IN (${ph})${prizeWhere}`
  ).all(...params).map(r => getLast2(r.value)).filter(Boolean);

  const freq = buildFrequencyMap(values);
  const avg  = values.length / 100;

  return {
    totalDraws: recentIds.length,
    totalValues: values.length,
    grid: buildGrid(freq, avg),
    freqMap: freq,
  };
}

// So sánh tần suất 7 kỳ vs 30 kỳ gần nhất — phát hiện cặp đang tăng/giảm
export function getFrequencyComparison() {
  const db = getDb();

  const ids30 = db.prepare('SELECT id FROM draws ORDER BY draw_date DESC LIMIT 30').all().map(r => r.id);
  const ids7  = ids30.slice(0, 7);

  if (ids30.length < 2) return { moversUp: [], moversDown: [], n7: 0, n30: 0 };

  function countPairs(ids) {
    if (ids.length === 0) return {};
    const ph   = ids.map(() => '?').join(',');
    const rows = db.prepare(
      `SELECT SUBSTR(value, -2) as pair FROM results WHERE draw_id IN (${ph})`
    ).all(...ids);
    const freq = {};
    for (let i = 0; i < 100; i++) freq[String(i).padStart(2, '0')] = 0;
    for (const { pair } of rows) {
      if (/^\d{2}$/.test(pair)) freq[pair]++;
    }
    return freq;
  }

  const freq30 = countPairs(ids30);
  const freq7  = countPairs(ids7);

  const comparison = Object.keys(freq30).map(pair => {
    const rate30 = freq30[pair] / ids30.length;
    const rate7  = freq7[pair]  / (ids7.length || 1);
    const diff   = rate7 - rate30;
    return { pair, count7: freq7[pair], count30: freq30[pair], rate7, rate30, diff };
  });

  const moversUp   = comparison.filter(r => r.diff > 0).sort((a, b) => b.diff - a.diff).slice(0, 8);
  const moversDown = comparison.filter(r => r.diff < 0).sort((a, b) => a.diff - b.diff).slice(0, 8);

  // trendMap: pair → 'up' | 'down' | 'stable' — dùng cho mũi tên trong grid
  const trendMap = {};
  for (const r of comparison) {
    trendMap[r.pair] = r.diff > 0.015 ? 'up' : r.diff < -0.015 ? 'down' : 'stable';
  }

  return { moversUp, moversDown, n7: ids7.length, n30: ids30.length, trendMap };
}

// ---------------------------------------------------------------------------
// Phân tích khoảng cách (Gap Analysis) — dùng cho trang Nghiên cứu
// ---------------------------------------------------------------------------

/**
 * Tính khoảng cách xuất hiện cho cả 100 cặp 00–99.
 *
 * "Khoảng cách" (gap) = số kỳ giữa 2 lần xuất hiện liên tiếp của một cặp.
 * Đơn vị: số kỳ xổ (1 kỳ = 1 lần xổ).
 *
 * Trả về cho mỗi cặp:
 *   - appearances:   tổng số kỳ cặp xuất hiện (ít nhất 1 lần)
 *   - avgGap:        khoảng cách trung bình (null nếu <2 lần)
 *   - stdGap:        độ lệch chuẩn khoảng cách
 *   - currentGap:    số kỳ kể từ lần xuất hiện gần nhất đến nay
 *   - overdueScore:  Z-score = (currentGap − avgGap) / stdGap
 *                   > 2: đang "nợ" rất nhiều, < 0: vừa ra gần đây
 */
export function getGapStatsAll() {
  return withCache('gapStats', TTL, _getGapStatsAll);
}
function _getGapStatsAll() {
  const db = getDb();
  const totalDraws = db.prepare('SELECT COUNT(*) as n FROM draws').get().n;
  if (totalDraws === 0) return { pairs: {}, totalDraws: 0 };

  // Lấy tất cả ngày xổ theo thứ tự tăng dần → đánh index vị trí
  const allDates  = db.prepare('SELECT draw_date FROM draws ORDER BY draw_date ASC, id ASC').all().map(r => r.draw_date);
  const dateToIdx = Object.fromEntries(allDates.map((d, i) => [d, i]));

  // Distinct (draw_date, pair): 1 kỳ tính 1 lần dù cặp xuất hiện ở nhiều giải
  const rows = db.prepare(`
    SELECT DISTINCT d.draw_date, SUBSTR(r.value, -2) as pair
    FROM results r JOIN draws d ON d.id = r.draw_id
    WHERE LENGTH(TRIM(r.value)) >= 2 AND SUBSTR(r.value, -2) GLOB '[0-9][0-9]'
    ORDER BY d.draw_date ASC
  `).all();

  // Nhóm index theo từng cặp
  const pairIdxs = {};
  for (let i = 0; i < 100; i++) pairIdxs[String(i).padStart(2, '0')] = [];
  for (const { draw_date, pair } of rows) {
    if (pair in pairIdxs) pairIdxs[pair].push(dateToIdx[draw_date]);
  }

  const lastIdx = totalDraws - 1;
  const result  = {};

  for (const [pair, idxs] of Object.entries(pairIdxs)) {
    const appearances = idxs.length;
    const currentGap  = appearances === 0 ? totalDraws : lastIdx - idxs[idxs.length - 1];

    // Tính các gap giữa lần xuất hiện liên tiếp
    const gaps = [];
    for (let i = 1; i < idxs.length; i++) gaps.push(idxs[i] - idxs[i - 1]);

    let avgGap = null, stdGap = null, overdueScore = null;
    if (gaps.length >= 2) {
      avgGap       = gaps.reduce((s, g) => s + g, 0) / gaps.length;
      const variance = gaps.reduce((s, g) => s + (g - avgGap) ** 2, 0) / gaps.length;
      stdGap       = Math.sqrt(variance);
      overdueScore = stdGap > 0 ? (currentGap - avgGap) / stdGap : 0;
      avgGap       = +avgGap.toFixed(1);
      stdGap       = +stdGap.toFixed(1);
      overdueScore = +overdueScore.toFixed(2);
    }

    result[pair] = { appearances, avgGap, stdGap, currentGap, overdueScore };
  }

  return { pairs: result, totalDraws };
}

/**
 * Lấy chuỗi cặp GĐB (giải đặc biệt) theo thứ tự thời gian (cũ → mới).
 * Dùng cho phân tích tự tương quan (Autocorrelation).
 *
 * Tự tương quan kiểm tra: "Kết quả GĐB hôm nay có phụ thuộc vào hôm qua không?"
 * Nếu có → xổ số không thực sự ngẫu nhiên.
 * Nếu không → mỗi kỳ độc lập (kỳ vọng với xổ số hợp lệ).
 */
export function getGDBSequence(n = 200) {
  const db = getDb();
  return db.prepare(`
    SELECT d.draw_date, SUBSTR(r.value, -2) as pair
    FROM results r JOIN draws d ON d.id = r.draw_id
    WHERE r.prize_name = 'giai_db'
      AND LENGTH(TRIM(r.value)) >= 2
      AND SUBSTR(r.value, -2) GLOB '[0-9][0-9]'
    ORDER BY d.draw_date DESC LIMIT ?
  `).all(n).reverse();  // đảo lại: cũ trước → mới sau
}

// ---------------------------------------------------------------------------

// Xu hướng top N cặp qua các tháng (tối đa 12 tháng gần nhất)
export function getTrendData(topN = 5) {
  const db = getDb();

  const periods = db.prepare(`
    SELECT DISTINCT strftime('%Y-%m', draw_date) as period
    FROM draws ORDER BY period DESC LIMIT 12
  `).all().map(r => r.period).reverse();

  if (periods.length === 0) return { pairs: [], periods: [], series: [] };

  // Lấy tất cả giá trị trong các tháng này bằng 1 query
  const placeholders = periods.map(() => '?').join(',');
  const rows = db.prepare(`
    SELECT strftime('%Y-%m', d.draw_date) as period, r.value
    FROM results r
    JOIN draws d ON d.id = r.draw_id
    WHERE strftime('%Y-%m', d.draw_date) IN (${placeholders})
  `).all(...periods);

  // Đếm tần suất theo tháng và tổng thể
  const totalFreq = {};
  for (let i = 0; i < 100; i++) totalFreq[String(i).padStart(2, '0')] = 0;

  const byPeriod = {};
  for (const period of periods) {
    byPeriod[period] = {};
    for (let i = 0; i < 100; i++) byPeriod[period][String(i).padStart(2, '0')] = 0;
  }

  for (const row of rows) {
    const pair = getLast2(row.value);
    if (!pair) continue;
    totalFreq[pair]++;
    if (byPeriod[row.period]) byPeriod[row.period][pair]++;
  }

  const topPairs = Object.entries(totalFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([pair]) => pair);

  const series = topPairs.map(pair => ({
    pair,
    counts: periods.map(p => byPeriod[p]?.[pair] ?? 0),
  }));

  return { pairs: topPairs, periods, series };
}

// ---------------------------------------------------------------------------
// Ensemble Score — kết hợp 5 tín hiệu thành điểm 0-100 cho mỗi cặp
// ---------------------------------------------------------------------------

/**
 * Tín hiệu:
 *   1. Lô gan (35%) — kỳ liên tiếp không ra, cao = "đến hẹn"
 *   2. Tần suất 30 kỳ thấp (25%) — ít ra gần đây = "còn dư địa"
 *   3. Xu hướng giảm (20%) — rate7 < rate30 = đang giảm → sắp bật lại
 *   4. Không cầu lô (10%) — streak=0 = không "nóng", trở lại sẽ sạch
 *   5. Tần suất dài hạn thấp (10%) — hiếm trong toàn lịch sử
 */
export function getEnsembleData() {
  return withCache('ensemble', TTL, _getEnsembleData);
}

function _getEnsembleData() {
  const db = getDb();
  const totalDraws = db.prepare('SELECT COUNT(*) as n FROM draws').get().n;
  if (totalDraws < 10) return null;

  const pairs100 = Array.from({ length: 100 }, (_, i) => String(i).padStart(2, '0'));

  // -- Signal 1: Lô gan --
  const allDates = db.prepare(
    'SELECT draw_date FROM draws ORDER BY draw_date ASC, id ASC'
  ).all().map(r => r.draw_date);

  function countAfter(date) {
    let lo = 0, hi = allDates.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (allDates[mid] <= date) lo = mid + 1; else hi = mid;
    }
    return allDates.length - lo;
  }

  const lastSeenRows = db.prepare(`
    SELECT SUBSTR(r.value, -2) as pair, MAX(d.draw_date) as last_date
    FROM results r JOIN draws d ON d.id = r.draw_id
    WHERE LENGTH(TRIM(r.value)) >= 2 AND SUBSTR(r.value, -2) GLOB '[0-9][0-9]'
    GROUP BY SUBSTR(r.value, -2)
  `).all();

  const ganMap = {};
  for (const p of pairs100) ganMap[p] = totalDraws;
  for (const { pair, last_date } of lastSeenRows) {
    if (/^\d{2}$/.test(pair)) ganMap[pair] = countAfter(last_date);
  }
  const maxGan = Math.max(...Object.values(ganMap), 1);

  // -- Signal 2 & 3: Freq 30 kỳ + trend 7 vs 30 --
  const ids30 = db.prepare(
    'SELECT id FROM draws ORDER BY draw_date DESC LIMIT 30'
  ).all().map(r => r.id);
  const ids7 = ids30.slice(0, 7);

  const freq30 = {}, freq7 = {};
  for (const p of pairs100) { freq30[p] = 0; freq7[p] = 0; }

  if (ids30.length > 0) {
    const ph30 = ids30.map(() => '?').join(',');
    for (const { pair } of db.prepare(
      `SELECT SUBSTR(value, -2) as pair FROM results WHERE draw_id IN (${ph30})`
    ).all(...ids30)) { if (/^\d{2}$/.test(pair)) freq30[pair]++; }
  }
  if (ids7.length > 0) {
    const ph7 = ids7.map(() => '?').join(',');
    for (const { pair } of db.prepare(
      `SELECT SUBSTR(value, -2) as pair FROM results WHERE draw_id IN (${ph7})`
    ).all(...ids7)) { if (/^\d{2}$/.test(pair)) freq7[pair]++; }
  }
  const maxFreq30 = Math.max(...Object.values(freq30), 1);

  // -- Signal 4: Cầu lô streak (20 kỳ gần nhất) --
  const idsCau = db.prepare(
    'SELECT id FROM draws ORDER BY draw_date DESC LIMIT 20'
  ).all().map(r => r.id);

  const cauDrawSets = new Map(idsCau.map(id => [id, new Set()]));
  if (idsCau.length > 0) {
    const ph = idsCau.map(() => '?').join(',');
    for (const { draw_id, pair } of db.prepare(
      `SELECT draw_id, SUBSTR(value, -2) as pair FROM results WHERE draw_id IN (${ph})`
    ).all(...idsCau)) {
      if (/^\d{2}$/.test(pair) && cauDrawSets.has(draw_id)) cauDrawSets.get(draw_id).add(pair);
    }
  }
  const streakMap = {};
  for (const pair of pairs100) {
    let streak = 0;
    for (const id of idsCau) {
      if (cauDrawSets.get(id)?.has(pair)) streak++; else break;
    }
    streakMap[pair] = streak;
  }

  // -- Signal 5: Tần suất toàn lịch sử --
  const freqAll = {};
  for (const p of pairs100) freqAll[p] = 0;
  for (const { pair } of db.prepare(`
    SELECT SUBSTR(r.value, -2) as pair FROM results r
    WHERE LENGTH(TRIM(r.value)) >= 2 AND SUBSTR(r.value, -2) GLOB '[0-9][0-9]'
  `).all()) { freqAll[pair]++; }
  const maxFreqAll = Math.max(...Object.values(freqAll), 1);

  // -- Tổng hợp --
  const W = { gan: 0.35, freq30: 0.25, trend: 0.20, caulo: 0.10, longTerm: 0.10 };

  const results = pairs100.map(pair => {
    const rate30 = ids30.length > 0 ? freq30[pair] / ids30.length : 0;
    const rate7  = ids7.length  > 0 ? freq7[pair]  / ids7.length  : 0;

    const s1 = ganMap[pair] / maxGan;
    const s2 = 1 - freq30[pair] / maxFreq30;
    const s3 = Math.max(0, Math.min(1, (rate30 - rate7) / 0.25));
    const s4 = Math.max(0, 1 - streakMap[pair] / 5);
    const s5 = 1 - freqAll[pair] / maxFreqAll;

    const score = Math.round((s1*W.gan + s2*W.freq30 + s3*W.trend + s4*W.caulo + s5*W.longTerm) * 100);
    const trend = rate7 > rate30 + 0.02 ? 'up' : rate7 < rate30 - 0.02 ? 'down' : 'stable';

    return {
      pair, score, trend,
      gan:         ganMap[pair],
      count30:     freq30[pair],
      totalCount:  freqAll[pair],
      cauLoStreak: streakMap[pair],
      signals: {
        gan:      Math.round(s1 * 100),
        freq30:   Math.round(s2 * 100),
        trend:    Math.round(s3 * 100),
        caulo:    Math.round(s4 * 100),
        longTerm: Math.round(s5 * 100),
      },
    };
  });

  const sorted = [...results].sort((a, b) => b.score - a.score);
  const byPair = Object.fromEntries(results.map(r => [r.pair, r]));
  const grid = Array.from({ length: 10 }, (_, row) =>
    Array.from({ length: 10 }, (_, col) =>
      byPair[String(row * 10 + col).padStart(2, '0')]
    )
  );

  return { sorted, grid, totalDraws, weights: W };
}

// ---------------------------------------------------------------------------
// Backtest walk-forward — kiểm tra chiến lược trên N kỳ quá khứ
// ---------------------------------------------------------------------------

/**
 * Với mỗi kỳ trong testN kỳ cuối cùng:
 *   - Dùng 90 kỳ trước đó làm training data
 *   - Dự đoán top K bằng ensemble đơn giản (lô gan 60% + freq30 40%)
 *   - Kiểm tra hit (top 1, 3, 5) vs kết quả thực
 * So sánh với xác suất ngẫu nhiên (phân phối hypergeometric, ~26 cặp/kỳ).
 */
export function runBacktest(testN = 30) {
  return withCache(`backtest_${testN}`, TTL, () => _runBacktest(testN));
}

function _runBacktest(testN) {
  const db = getDb();
  const allDraws = db.prepare(
    'SELECT id, draw_date FROM draws ORDER BY draw_date ASC, id ASC'
  ).all();
  if (allDraws.length < testN + 10) return null;

  // Tải toàn bộ pairs-per-draw một lần (tránh N × query)
  const allPairRows = db.prepare(`
    SELECT draw_id, SUBSTR(value, -2) as pair
    FROM results
    WHERE LENGTH(TRIM(value)) >= 2 AND SUBSTR(value, -2) GLOB '[0-9][0-9]'
  `).all();

  const drawPairs = new Map(allDraws.map(d => [d.id, new Set()]));
  for (const { draw_id, pair } of allPairRows) {
    drawPairs.get(draw_id)?.add(pair);
  }

  const pairs100 = Array.from({ length: 100 }, (_, i) => String(i).padStart(2, '0'));
  const testStart = allDraws.length - testN;
  const topKs = [1, 3, 5];
  const hits  = [0, 0, 0];
  const rows  = [];

  for (let t = testStart; t < allDraws.length; t++) {
    const train = allDraws.slice(Math.max(0, t - 90), t);
    if (train.length < 10) continue;

    // Lô gan: đi ngược từ mới → cũ, tìm lần xuất hiện gần nhất
    const gan = {};
    for (const p of pairs100) gan[p] = train.length;
    for (let i = train.length - 1; i >= 0; i--) {
      for (const pair of drawPairs.get(train[i].id) ?? []) {
        if (gan[pair] === train.length) gan[pair] = train.length - 1 - i;
      }
    }

    // Freq 30 kỳ gần nhất trong training
    const recent30 = train.slice(-30);
    const f30 = {};
    for (const p of pairs100) f30[p] = 0;
    for (const d of recent30) { for (const p of drawPairs.get(d.id) ?? []) if (p in f30) f30[p]++; }

    const maxGan = Math.max(...Object.values(gan), 1);
    const maxF30 = Math.max(...Object.values(f30), 1);

    const ranked = pairs100
      .map(p => ({ pair: p, score: (gan[p] / maxGan) * 0.6 + (1 - f30[p] / maxF30) * 0.4 }))
      .sort((a, b) => b.score - a.score);

    const appeared = drawPairs.get(allDraws[t].id) ?? new Set();
    const topSets  = topKs.map(k => new Set(ranked.slice(0, k).map(r => r.pair)));
    const hitFlags = topSets.map(s => [...appeared].some(p => s.has(p)));

    hitFlags.forEach((h, i) => { if (h) hits[i]++; });
    rows.push({
      date: allDraws[t].draw_date,
      hit1: hitFlags[0], hit3: hitFlags[1], hit5: hitFlags[2],
      top5: ranked.slice(0, 5).map(r => r.pair),
    });
  }

  const n = rows.length;

  // Xác suất ngẫu nhiên (hypergeometric, ~26 cặp/kỳ Miền Bắc)
  function pRandom(k) {
    let p = 1;
    for (let i = 0; i < k; i++) p *= (74 - i) / (100 - i);
    return +(( 1 - p) * 100).toFixed(1);
  }

  return {
    testN: n,
    hitRates: topKs.map((k, i) => ({
      k,
      hits:   hits[i],
      rate:   n > 0 ? +(hits[i] / n * 100).toFixed(1) : 0,
      random: pRandom(k),
    })),
    results: rows,
  };
}
