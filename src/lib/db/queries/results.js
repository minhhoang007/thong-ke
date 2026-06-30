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

// Kiểm tra xem kỳ (date, province) đã tồn tại chưa
export function findDraw(draw_date, province) {
  const db = getDb();
  return db.prepare('SELECT id FROM draws WHERE draw_date = ? AND province = ?').get(draw_date, province) ?? null;
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
