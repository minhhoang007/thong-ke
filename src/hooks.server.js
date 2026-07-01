import { scrapeAndSave } from '$lib/logic/scrape-save.js';
import { nowVN, todayVN } from '$lib/utils/time.js';
import { env } from '$env/dynamic/private';

const SCRAPE_HOUR = 18;
const SCRAPE_MIN  = 45;

// AUTO_SCRAPE_ENABLED=false → tắt scheduler in-process (dùng khi có cron ngoài gọi /api/daily-scrape)
const ENABLED = (env.AUTO_SCRAPE_ENABLED ?? 'true').toLowerCase() !== 'false';

function msUntilNext() {
  const vn   = nowVN();
  const next = new Date(vn);
  // Dùng setUTCHours vì nowVN() trả về Date "fake-UTC" (đã cộng +7h)
  next.setUTCHours(SCRAPE_HOUR, SCRAPE_MIN, 0, 0);
  if (vn >= next) next.setUTCDate(next.getUTCDate() + 1);
  return next.getTime() - vn.getTime();
}

async function scrapeDay(date, attempt = 1) {
  const tag = '[auto-scrape]';
  const r = await scrapeAndSave(date);

  if (r.status === 'saved' || r.status === 'partial') {
    console.log(tag, `${date} OK — id:${r.drawId}, nguồn:${r.sourceLabel}${r.partial ? ' (thiếu giải)' : ''}`);
    return;
  }
  if (r.status === 'skipped') {
    console.log(tag, `${date} đã có, bỏ qua`);
    return;
  }

  console.error(tag, `${date} ${r.status}:`, r.error ?? r.errors ?? '');
  // Retry — tối đa 3 lần, 5/10 phút
  if (attempt < 3) {
    const retry = attempt * 5 * 60 * 1000;
    console.log(tag, `Thử lại sau ${attempt * 5} phút...`);
    setTimeout(() => scrapeDay(date, attempt + 1), retry);
  }
}

function schedule() {
  const delay  = msUntilNext();
  const nextAt = new Date(Date.now() + delay).toISOString().replace('T', ' ').slice(0, 16);
  console.log(`[auto-scrape] Lịch tiếp: ${nextAt} UTC (${Math.round(delay / 60000)} phút nữa)`);
  setTimeout(async () => {
    await scrapeDay(todayVN());
    schedule();
  }, delay);
}

export async function init() {
  if (!ENABLED) {
    console.log('[auto-scrape] Đã tắt (AUTO_SCRAPE_ENABLED=false) — dùng cron ngoài.');
    return;
  }
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
