import { scrapeResult } from '$lib/logic/scraper.js';
import { saveDraw, findDraw } from '$lib/db/queries/results.js';

// Xổ số Miền Bắc mở thưởng ~18:15 VN — scrape lúc 18:35 để chắc có kết quả
const SCRAPE_HOUR = 18;
const SCRAPE_MIN  = 35;
const VN_OFFSET_MS = 7 * 3600 * 1000; // UTC+7

function nowVN() {
  return new Date(Date.now() + VN_OFFSET_MS);
}

function todayVN() {
  return nowVN().toISOString().slice(0, 10);
}

// Số ms đến lần chạy tiếp theo (18:35 VN)
function msUntilNextScrape() {
  const vn    = nowVN();
  const nextVN = new Date(vn);
  nextVN.setHours(SCRAPE_HOUR, SCRAPE_MIN, 0, 0);
  if (vn >= nextVN) nextVN.setDate(nextVN.getDate() + 1);
  return nextVN.getTime() - vn.getTime();
}

async function runDailyScrape(label = 'scheduled') {
  const today = todayVN();
  const tag   = `[auto-scrape:${label}]`;

  if (findDraw(today, 'mien-bac')) {
    console.log(tag, 'Đã có dữ liệu Miền Bắc ngày', today, '— bỏ qua.');
    return { status: 'skipped', date: today };
  }

  console.log(tag, 'Đang scrape Miền Bắc ngày', today, '...');
  try {
    const result = await scrapeResult('mien-bac', today);
    if (!result.success) {
      console.error(tag, 'Scrape thất bại:', result.error);
      return { status: 'failed', date: today, error: result.error };
    }
    const drawId = saveDraw(today, 'mien-bac', result.prizes);
    console.log(tag, `Đã lưu kỳ ${today} (drawId: ${drawId})`);
    return { status: 'saved', date: today, drawId };
  } catch (err) {
    console.error(tag, 'Exception:', err.message);
    return { status: 'error', date: today, error: err.message };
  }
}

function scheduleScrape() {
  const delay    = msUntilNextScrape();
  const nextTime = new Date(Date.now() + delay).toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
  console.log(`[auto-scrape] Lịch scrape tiếp theo: ${nextTime} (sau ${Math.round(delay / 60000)} phút)`);

  setTimeout(async () => {
    await runDailyScrape('scheduled');
    scheduleScrape(); // lên lịch cho ngày hôm sau
  }, delay);
}

// init() chạy một lần khi SvelteKit server khởi động
export async function init() {
  console.log('[auto-scrape] Khởi động scheduler (mỗi ngày lúc 18:35 VN)...');

  // Catch-up: nếu server restart sau 18:35 VN và hôm nay chưa có dữ liệu
  const vn   = nowVN();
  const hour = vn.getHours();
  const min  = vn.getMinutes();
  if (hour > SCRAPE_HOUR || (hour === SCRAPE_HOUR && min >= SCRAPE_MIN)) {
    console.log('[auto-scrape] Server khởi động sau 18:35 — chạy catch-up ngay...');
    await runDailyScrape('catchup');
  }

  scheduleScrape();
}
