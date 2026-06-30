import { scrapeResult } from '$lib/logic/scraper.js';
import { saveDraw, findDraw } from '$lib/db/queries/results.js';

// Xổ số mở thưởng ~18:15 VN — scrape lúc 18:35 để chắc có kết quả
const SCRAPE_HOUR  = 18;
const SCRAPE_MIN   = 35;
const VN_OFFSET_MS = 7 * 3600 * 1000;

// Scrape cả 3 miền mỗi ngày
const PROVINCES = ['mien-bac', 'mien-trung', 'mien-nam'];

function nowVN()   { return new Date(Date.now() + VN_OFFSET_MS); }
function todayVN() { return nowVN().toISOString().slice(0, 10); }

function msUntilNextScrape() {
  const vn     = nowVN();
  const nextVN = new Date(vn);
  nextVN.setHours(SCRAPE_HOUR, SCRAPE_MIN, 0, 0);
  if (vn >= nextVN) nextVN.setDate(nextVN.getDate() + 1);
  return nextVN.getTime() - vn.getTime();
}

async function scrapeProvince(province, date, tag) {
  if (findDraw(date, province)) {
    console.log(tag, `${province} ${date} — đã có, bỏ qua.`);
    return 'skipped';
  }
  try {
    const result = await scrapeResult(province, date);
    if (!result.success) {
      console.error(tag, `${province} thất bại:`, result.error,
        result.errors?.map(e => `[${e.source}] ${e.error}`).join(' | '));
      return 'failed';
    }
    const drawId = saveDraw(date, province, result.prizes);
    console.log(tag, `${province} ${date} — đã lưu (id:${drawId}, nguồn: ${result.sourceLabel}${result.partial ? ', thiếu giải' : ''})`);
    return 'saved';
  } catch (err) {
    console.error(tag, `${province} exception:`, err.message);
    return 'error';
  }
}

async function runDailyScrape(label = 'scheduled') {
  const today = todayVN();
  const tag   = `[auto-scrape:${label}]`;
  console.log(tag, `Bắt đầu scrape ${today} (${PROVINCES.length} miền)...`);
  for (const province of PROVINCES) {
    await scrapeProvince(province, today, tag);
  }
}

function scheduleScrape() {
  const delay    = msUntilNextScrape();
  const nextTime = new Date(Date.now() + delay).toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
  console.log(`[auto-scrape] Lịch tiếp theo: ${nextTime} (sau ${Math.round(delay / 60000)} phút)`);

  setTimeout(async () => {
    await runDailyScrape('scheduled');
    scheduleScrape();
  }, delay);
}

export async function init() {
  console.log('[auto-scrape] Khởi động scheduler (18:35 VN, 3 miền)...');

  const vn   = nowVN();
  const hour = vn.getUTCHours(); // đã cộng offset trong nowVN()
  const min  = vn.getUTCMinutes();
  if (hour > SCRAPE_HOUR || (hour === SCRAPE_HOUR && min >= SCRAPE_MIN)) {
    console.log('[auto-scrape] Server khởi động sau 18:35 — chạy catch-up...');
    await runDailyScrape('catchup');
  }

  scheduleScrape();
}
