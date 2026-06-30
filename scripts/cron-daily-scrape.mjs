/**
 * Cron script: scrape kết quả XSMB hôm nay rồi lưu vào DB.
 * Chạy: node scripts/cron-daily-scrape.mjs
 */

import { fileURLToPath } from 'url';
import { dirname, resolve }  from 'path';

const dir = dirname(fileURLToPath(import.meta.url));

// Set DATABASE_PATH trước khi import module db
process.env.DATABASE_PATH = resolve(dir, '../data/xoso.db');

// Static imports — hoạt động tốt hơn dynamic import trên Windows
import { scrapeResult } from '../src/lib/logic/scraper.js';
import { saveDraw, findDraw } from '../src/lib/db/queries/results.js';

// Ngày hôm nay theo giờ VN (UTC+7)
const nowVN   = new Date(Date.now() + 7 * 3600 * 1000);
const todayVN = nowVN.toISOString().slice(0, 10);
const tag     = `[cron ${new Date().toISOString().slice(0, 16)}]`;

console.log(`${tag} Kiểm tra kỳ ${todayVN} (Miền Bắc)...`);

if (findDraw(todayVN, 'mien-bac')) {
  console.log(`${tag} Đã có dữ liệu ${todayVN} — bỏ qua.`);
  process.exit(0);
}

console.log(`${tag} Đang scrape...`);
try {
  const result = await scrapeResult('mien-bac', todayVN);
  if (!result.success) {
    console.error(`${tag} Scrape thất bại:`, result.error);
    process.exit(1);
  }
  const drawId = saveDraw(todayVN, 'mien-bac', result.prizes);
  console.log(`${tag} ✓ Đã lưu kỳ ${todayVN} — drawId: ${drawId}`);
} catch (err) {
  console.error(`${tag} Lỗi:`, err.message);
  process.exit(1);
}
