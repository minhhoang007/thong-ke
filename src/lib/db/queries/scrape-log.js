import { getDb } from '../database.js';
import { todayVN } from '../../utils/time.js';

/** Ghi 1 dòng nhật ký cào. */
export function logScrape({ draw_date, province, status, source = null, note = null }) {
  getDb()
    .prepare('INSERT INTO scrape_log (draw_date, province, status, source, note) VALUES (?, ?, ?, ?, ?)')
    .run(draw_date, province, status, source, note);
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
 * Các ngày trong `days` ngày gần nhất mà 1 miền CHƯA có dữ liệu trong DB.
 * Bỏ qua hôm nay nếu chưa tới giờ có kết quả (mặc định coi hôm nay là "có thể thiếu").
 * @returns {{ province, dates: string[] }[]}
 */
export function getMissingDates(provinces = ['mien-bac'], days = 30) {
  const db = getDb();
  const wanted = recentDates(days);
  const from = wanted[wanted.length - 1];

  return provinces.map((province) => {
    const rows = db
      .prepare('SELECT DISTINCT draw_date FROM draws WHERE province = ? AND draw_date >= ?')
      .all(province, from);
    const have = new Set(rows.map((r) => r.draw_date));
    const dates = wanted.filter((dt) => !have.has(dt));
    return { province, dates };
  });
}
