import { getDb } from '../database.js';
import { getLast2 } from '../../logic/parser.js';
import { buildFrequencyMap, buildGrid } from '../../logic/frequency.js';

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
  const allLast2 = db
    .prepare('SELECT value FROM results')
    .all()
    .map(r => getLast2(r.value))
    .filter(Boolean);

  const freq = buildFrequencyMap(allLast2);
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([pair, count]) => ({ pair, count }));
}

// Thống kê co-occurrence: cặp đôi cùng xuất hiện trong 1 kỳ nhiều nhất
// Trả về top N cặp đôi [a, b, count] với a < b
export function getPairCoOccurrence(topN = 20, prize = null) {
  const db = getDb();
  const prizeClause = prize && prize !== 'all' ? ' WHERE prize_name = ?' : '';
  const prizeParam  = prize && prize !== 'all' ? [prize] : [];

  const drawIds = db.prepare('SELECT id FROM draws').all().map(r => r.id);
  if (drawIds.length === 0) return [];

  const coMatrix = {};

  for (const drawId of drawIds) {
    const rows = db
      .prepare(`SELECT value FROM results WHERE draw_id = ?${prizeClause.replace('WHERE', 'AND')}`)
      .all(drawId, ...prizeParam);
    const pairs = [...new Set(rows.map(r => getLast2(r.value)).filter(Boolean))];
    for (let i = 0; i < pairs.length; i++) {
      for (let j = i + 1; j < pairs.length; j++) {
        const key = pairs[i] < pairs[j] ? `${pairs[i]}-${pairs[j]}` : `${pairs[j]}-${pairs[i]}`;
        coMatrix[key] = (coMatrix[key] || 0) + 1;
      }
    }
  }

  return Object.entries(coMatrix)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([key, count]) => { const [a, b] = key.split('-'); return { a, b, count }; });
}

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
