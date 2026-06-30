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

  // Lấy toàn bộ ngày kỳ xổ (desc) để đếm "bao nhiêu kỳ sau last_date"
  const allDates = db.prepare('SELECT draw_date FROM draws ORDER BY draw_date DESC').all().map(r => r.draw_date);

  const ganMap = {};
  for (let i = 0; i < 100; i++) {
    ganMap[String(i).padStart(2, '0')] = { gan: totalDraws, lastDate: null };
  }

  for (const { pair, last_date } of appeared) {
    if (!pair || pair.length !== 2 || !/^\d{2}$/.test(pair)) continue;
    const gan = allDates.filter(d => d > last_date).length;
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
