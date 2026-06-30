import { getDb } from '../database.js';

// Lưu một kỳ xổ số vào database
// prizes là object: { giai_db: "123456", giai_nhat: ["234567"], giai_nhi: ["345678", "456789"], ... }
export function saveDraw(draw_date, province, prizes) {
  const db = getDb();

  // Dùng transaction: hoặc lưu hết, hoặc không lưu gì (tránh dữ liệu nửa vời)
  const save = db.transaction(() => {
    const { lastInsertRowid: drawId } = db
      .prepare('INSERT INTO draws (draw_date, province) VALUES (?, ?)')
      .run(draw_date, province);

    const insertResult = db.prepare(
      'INSERT INTO results (draw_id, prize_name, value) VALUES (?, ?, ?)'
    );

    for (const [prizeName, values] of Object.entries(prizes)) {
      const list = Array.isArray(values) ? values : [values];
      for (const val of list) {
        if (val && val.trim()) {
          insertResult.run(drawId, prizeName, val.trim());
        }
      }
    }

    return drawId;
  });

  return save();
}

// Lấy danh sách kỳ xổ số, mới nhất trước, giới hạn số lượng
export function listDraws(limit = 20) {
  const db = getDb();
  return db
    .prepare('SELECT * FROM draws ORDER BY draw_date DESC LIMIT ?')
    .all(limit);
}

// Lấy toàn bộ kết quả của một kỳ theo draw_id
export function getDrawResults(drawId) {
  const db = getDb();
  return db
    .prepare('SELECT * FROM results WHERE draw_id = ? ORDER BY id')
    .all(drawId);
}

// Lấy kỳ mới nhất kèm kết quả
export function getLatestDraw() {
  const db = getDb();
  const draw = db
    .prepare('SELECT * FROM draws ORDER BY draw_date DESC LIMIT 1')
    .get();

  if (!draw) return null;

  const results = getDrawResults(draw.id);
  return { ...draw, results };
}

// Xóa một kỳ (results tự xóa theo vì có ON DELETE CASCADE)
export function deleteDraw(id) {
  const db = getDb();
  return db.prepare('DELETE FROM draws WHERE id = ?').run(id);
}

// Đếm tổng số kỳ đã nhập
export function countDraws() {
  const db = getDb();
  return db.prepare('SELECT COUNT(*) as total FROM draws').get().total;
}

// Lấy danh sách kỳ có phân trang (dùng cho trang lịch sử và API)
export function listDrawsWithCount({ page = 1, pageSize = 20 } = {}) {
  const db  = getDb();
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

// Lấy một kỳ kèm toàn bộ kết quả của nó
export function getDrawWithResults(id) {
  const db = getDb();
  const draw = db.prepare('SELECT * FROM draws WHERE id = ?').get(id);
  if (!draw) return null;
  return { ...draw, results: getDrawResults(draw.id) };
}

// Cập nhật một kỳ đã nhập: xóa results cũ rồi insert lại toàn bộ
export function updateDraw(id, draw_date, province, prizes) {
  const db = getDb();
  return db.transaction(() => {
    db.prepare('UPDATE draws SET draw_date = ?, province = ? WHERE id = ?').run(draw_date, province, id);
    db.prepare('DELETE FROM results WHERE draw_id = ?').run(id);
    const ins = db.prepare('INSERT INTO results (draw_id, prize_name, value) VALUES (?, ?, ?)');
    for (const [prizeName, values] of Object.entries(prizes)) {
      const list = Array.isArray(values) ? values : [values];
      for (const val of list) {
        if (val && String(val).trim()) ins.run(id, prizeName, String(val).trim());
      }
    }
    return id;
  })();
}

// Lấy tất cả kỳ trong một tháng kèm cặp GĐB (dùng cho trang lịch)
export function getDrawsForMonth(year, month) {
  const db     = getDb();
  const period = `${year}-${String(month).padStart(2, '0')}`;
  return db.prepare(`
    SELECT d.id, d.draw_date, d.province,
           SUBSTR(r.value, -2) as gdb_pair
    FROM draws d
    LEFT JOIN results r ON r.draw_id = d.id AND r.prize_name = 'giai_db'
    WHERE strftime('%Y-%m', d.draw_date) = ?
    ORDER BY d.draw_date, d.province
  `).all(period);
}

// Kiểm tra xem kỳ (date, province) đã tồn tại chưa
export function findDraw(draw_date, province) {
  const db = getDb();
  return db.prepare('SELECT id FROM draws WHERE draw_date = ? AND province = ?').get(draw_date, province) ?? null;
}

// Tìm kiếm kỳ theo khoảng ngày, cặp số, và/hoặc tỉnh
export function searchDraws({ fromDate, toDate, pair, province, limit = 100 } = {}) {
  const db         = getDb();
  const conditions = [];
  const params     = [];

  if (fromDate) { conditions.push('d.draw_date >= ?'); params.push(fromDate); }
  if (toDate)   { conditions.push('d.draw_date <= ?'); params.push(toDate); }
  if (province) { conditions.push('d.province = ?');   params.push(province); }
  if (pair && /^\d{2}$/.test(pair)) {
    conditions.push('d.id IN (SELECT draw_id FROM results WHERE SUBSTR(value, -2) = ?)');
    params.push(pair);
  }

  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

  return db.prepare(`
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

// Lưu nhiều kỳ cùng lúc trong 1 transaction (dùng cho CSV import)
export function saveDrawsBatch(drawList) {
  const db = getDb();
  const insertDraw   = db.prepare('INSERT INTO draws (draw_date, province) VALUES (?, ?)');
  const insertResult = db.prepare('INSERT INTO results (draw_id, prize_name, value) VALUES (?, ?, ?)');

  const saveAll = db.transaction(() => {
    const ids = [];
    for (const { draw_date, province, prizes } of drawList) {
      const { lastInsertRowid: drawId } = insertDraw.run(draw_date, province);
      for (const [prizeName, values] of Object.entries(prizes)) {
        const list = Array.isArray(values) ? values : [values];
        for (const val of list) {
          if (val && String(val).trim()) insertResult.run(drawId, prizeName, String(val).trim());
        }
      }
      ids.push(drawId);
    }
    return ids;
  });

  return saveAll();
}
