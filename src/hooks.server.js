import { scrapeResult } from '$lib/logic/scraper.js';
import { saveDraw, findDraw } from '$lib/db/queries/results.js';

const SCRAPE_HOUR = 18;
const SCRAPE_MIN  = 45;
const VN_OFFSET   = 7 * 3600 * 1000;

function nowVN()   { return new Date(Date.now() + VN_OFFSET); }
function todayVN() { return nowVN().toISOString().slice(0, 10); }

function msUntilNext() {
  const vn   = nowVN();
  const next = new Date(vn);
  next.setHours(SCRAPE_HOUR, SCRAPE_MIN, 0, 0);
  if (vn >= next) next.setDate(next.getDate() + 1);
  return next.getTime() - vn.getTime();
}

async function scrapeDay(date, attempt = 1) {
  const tag = '[auto-scrape]';
  if (findDraw(date, 'mien-bac')) {
    console.log(tag, `${date} đã có, bỏ qua`);
    return;
  }
  try {
    const result = await scrapeResult('mien-bac', date);
    if (!result.success) {
      console.error(tag, `${date} thất bại (lần ${attempt}):`, result.error);
      if (attempt < 3) {
        const retry = attempt * 5 * 60 * 1000; // 5 phút, 10 phút
        console.log(tag, `Thử lại sau ${attempt * 5} phút...`);
        setTimeout(() => scrapeDay(date, attempt + 1), retry);
      }
      return;
    }
    const drawId = saveDraw(date, 'mien-bac', result.prizes);
    console.log(tag, `${date} OK — id:${drawId}, nguồn:${result.sourceLabel}${result.partial ? ' (thiếu giải)' : ''}`);
  } catch (err) {
    console.error(tag, `${date} exception:`, err.message);
    if (attempt < 3) setTimeout(() => scrapeDay(date, attempt + 1), attempt * 5 * 60 * 1000);
  }
}

function schedule() {
  const delay = msUntilNext();
  const nextAt = new Date(Date.now() + delay).toISOString().replace('T', ' ').slice(0, 16);
  console.log(`[auto-scrape] Lịch tiếp: ${nextAt} UTC (${Math.round(delay / 60000)} phút nữa)`);
  setTimeout(async () => {
    await scrapeDay(todayVN());
    schedule();
  }, delay);
}

export async function init() {
  console.log('[auto-scrape] Khởi động scheduler (18:45 VN, Miền Bắc)...');
  const vn = nowVN();
  const h  = vn.getUTCHours();
  const m  = vn.getUTCMinutes();
  if (h > SCRAPE_HOUR || (h === SCRAPE_HOUR && m >= SCRAPE_MIN)) {
    console.log('[auto-scrape] Khởi động sau 18:45 — chạy catch-up...');
    await scrapeDay(todayVN());
  }
  schedule();
}
