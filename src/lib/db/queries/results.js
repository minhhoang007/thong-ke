import { getDb } from '../database.js';
import { bust } from '../cache.js';

export function saveDraw(draw_date, prizes) {
  const db = getDb();
  const drawId = db.transaction(() => {
    const { lastInsertRowid: id } = db
      .prepare("INSERT INTO draws (draw_date, province) VALUES (?, 'mien-bac')")
      .run(draw_date);
    const ins = db.prepare('INSERT INTO results (draw_id, prize_name, value) VALUES (?, ?, ?)');
    for (const [prizeName, values] of Object.entries(prizes)) {
      for (const val of (Array.isArray(values) ? values : [values])) {
        if (val && val.trim()) ins.run(id, prizeName, val.trim());
      }
    }
    return id;
  })();
  bust(); // xóa toàn bộ cache stats
  return drawId;
}

function getDrawResults(drawId) {
  return getDb().prepare('SELECT * FROM results WHERE draw_id = ? ORDER BY id').all(drawId);
}

export function getLatestDraw() {
  const draw = getDb().prepare('SELECT * FROM draws ORDER BY draw_date DESC LIMIT 1').get();
  if (!draw) return null;
  return { ...draw, results: getDrawResults(draw.id) };
}

export function deleteDraw(id) {
  const result = getDb().prepare('DELETE FROM draws WHERE id = ?').run(id);
  bust();
  return result;
}

export function countDraws() {
  return getDb().prepare('SELECT COUNT(*) as total FROM draws').get().total;
}

export function listDrawsWithCount({ page = 1, pageSize = 20 } = {}) {
  const db     = getDb();
  const total  = db.prepare('SELECT COUNT(*) as n FROM draws').get().n;
  const offset = (page - 1) * pageSize;
  const draws  = db.prepare(`
    SELECT d.id, d.draw_date, d.province, d.created_at,
           COUNT(r.id) as result_count
    FROM draws d
    LEFT JOIN results r ON r.draw_id = d.id
    GROUP BY d.id
    ORDER BY d.draw_date DESC, d.id DESC
    LIMIT ? OFFSET ?
  `).all(pageSize, offset);
  return { draws, total, page, pageSize, hasMore: offset + draws.length < total };
}

export function getDrawWithResults(id) {
  const draw = getDb().prepare('SELECT * FROM draws WHERE id = ?').get(id);
  if (!draw) return null;
  return { ...draw, results: getDrawResults(draw.id) };
}

export function updateDraw(id, draw_date, prizes) {
  const db = getDb();
  const result = db.transaction(() => {
    db.prepare('UPDATE draws SET draw_date = ? WHERE id = ?').run(draw_date, id);
    db.prepare('DELETE FROM results WHERE draw_id = ?').run(id);
    const ins = db.prepare('INSERT INTO results (draw_id, prize_name, value) VALUES (?, ?, ?)');
    for (const [prizeName, values] of Object.entries(prizes)) {
      for (const val of (Array.isArray(values) ? values : [values])) {
        if (val && String(val).trim()) ins.run(id, prizeName, String(val).trim());
      }
    }
    return id;
  })();
  bust();
  return result;
}

export function getDrawsForMonth(year, month) {
  const period = `${year}-${String(month).padStart(2, '0')}`;
  return getDb().prepare(`
    SELECT d.id, d.draw_date,
           SUBSTR(r.value, -2) as gdb_pair
    FROM draws d
    LEFT JOIN results r ON r.draw_id = d.id AND r.prize_name = 'giai_db'
    WHERE strftime('%Y-%m', d.draw_date) = ?
    ORDER BY d.draw_date
  `).all(period);
}

export function findDraw(draw_date) {
  return getDb().prepare("SELECT id FROM draws WHERE draw_date = ? AND province = 'mien-bac'").get(draw_date) ?? null;
}

export function searchDraws({ fromDate, toDate, pair, limit = 100 } = {}) {
  const conditions = [];
  const params     = [];
  if (fromDate) { conditions.push('d.draw_date >= ?'); params.push(fromDate); }
  if (toDate)   { conditions.push('d.draw_date <= ?'); params.push(toDate); }
  if (pair && /^\d{2}$/.test(pair)) {
    conditions.push('d.id IN (SELECT draw_id FROM results WHERE SUBSTR(value, -2) = ?)');
    params.push(pair);
  }
  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
  return getDb().prepare(`
    SELECT d.id, d.draw_date, d.province,
           COUNT(r.id) as result_count
    FROM draws d
    LEFT JOIN results r ON r.draw_id = d.id
    ${where}
    GROUP BY d.id
    ORDER BY d.draw_date DESC
    LIMIT ?
  `).all(...params, limit);
}
