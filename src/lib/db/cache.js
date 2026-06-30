/**
 * In-memory TTL cache — dùng cho các hàm stats tốn kém.
 * Tự động xóa khi có draw mới được lưu/xóa (qua bust()).
 */
const store = new Map();

/**
 * Đọc từ cache; nếu miss hoặc hết TTL, gọi fn() để tính lại.
 * @param {string}   key
 * @param {number}   ttlMs  - thời gian sống (ms)
 * @param {Function} fn     - hàm tính giá trị (sync)
 */
export function withCache(key, ttlMs, fn) {
  const now = Date.now();
  const hit = store.get(key);
  if (hit && now - hit.ts < ttlMs) return hit.val;
  const val = fn();
  store.set(key, { val, ts: now });
  return val;
}

/** Xóa 1 entry (hoặc toàn bộ cache nếu không truyền key). */
export function bust(key) {
  if (key) store.delete(key);
  else store.clear();
}
