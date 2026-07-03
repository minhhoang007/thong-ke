/**
 * Cron script: scrape kết quả XSMB hôm nay rồi lưu vào DB.
 * Chạy: node scripts/cron-daily-scrape.mjs
 */

import { fileURLToPath } from 'url';
import { dirname, resolve }  from 'path';

const dir = dirname(fileURLToPath(import.meta.url));

// Set DATABASE_PATH trước khi import module db
process.env.DATABASE_PATH = resolve(dir, '../data/xoso.db');

// Import sau khi set DATABASE_PATH vì ESM static import luôn được evaluate trước phần thân module.
const { scrapeAndSave } = await import('../src/lib/logic/scrape-save.js');

// Ngày hôm nay theo giờ VN (UTC+7)
const nowVN   = new Date(Date.now() + 7 * 3600 * 1000);
const todayVN = nowVN.toISOString().slice(0, 10);
const tag     = `[cron ${new Date().toISOString().slice(0, 16)}]`;

console.log(`${tag} Kiểm tra kỳ ${todayVN} (Miền Bắc)...`);

console.log(`${tag} Đang scrape...`);
try {
  const result = await scrapeAndSave(todayVN);
  if (result.status === 'skipped') {
    console.log(`${tag} Đã có dữ liệu ${todayVN} — bỏ qua.`);
    process.exit(0);
  }
  if (result.status !== 'saved' && result.status !== 'partial') {
    console.error(`${tag} Scrape thất bại:`, result.error ?? result.errors ?? result.status);
    process.exit(1);
  }
  console.log(`${tag} ✓ Đã lưu kỳ ${todayVN} — drawId: ${result.drawId}${result.partial ? ' (thiếu giải)' : ''}`);
} catch (err) {
  console.error(`${tag} Lỗi:`, err.message);
  process.exit(1);
}
