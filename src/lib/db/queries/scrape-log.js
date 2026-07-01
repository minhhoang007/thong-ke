import { getDb } from '../database.js';
import { todayVN } from '../../utils/time.js';

const PROVINCE = 'mien-bac';

/** Ghi 1 dòng nhật ký cào (Miền Bắc). */
export function logScrape({ draw_date, status, source = null, note = null }) {
  getDb()
    .prepare('INSERT INTO scrape_log (draw_date, province, status, source, note) VALUES (?, ?, ?, ?, ?)')
    .run(draw_date, PROVINCE, status, source, note);
}

/** N dòng nhật ký gần nhất (mới → cũ). */
export function getRecentLogs(limit = 50) {
  return getDb()
    .prepare('SELECT * FROM scrape_log ORDER BY run_at DESC, id DESC LIMIT ?')
    .all(limit);
}

/** Sinh danh sách ngày 'YYYY-MM-DD' của `days` ngày gần nhất tính từ hôm nay VN (mới → cũ). */
function recentDates(days) {
  const [y, m, d] = todayVN().split('-').map(Number);
  const base = Date.UTC(y, m - 1, d);
  return Array.from({ length: days }, (_, i) =>
    new Date(base - i * 86400000).toISOString().slice(0, 10)
  );
}

/**
 * Các ngày trong `days` ngày gần nhất mà Miền Bắc CHƯA có dữ liệu trong DB.
 * @returns {string[]} (mới → cũ)
 */
export function getMissingDates(days = 30) {
  const db = getDb();
  const wanted = recentDates(days);
  const from = wanted[wanted.length - 1];

  const rows = db
    .prepare('SELECT DISTINCT draw_date FROM draws WHERE province = ? AND draw_date >= ?')
    .all(PROVINCE, from);
  const have = new Set(rows.map((r) => r.draw_date));
  return wanted.filter((dt) => !have.has(dt));
}
