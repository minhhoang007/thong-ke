import { countDraws, getLatestDraw, findDraw } from '$lib/db/queries/results.js';
import { getTopPairs, getSoiCauRecs } from '$lib/db/queries/stats.js';

const VN_OFFSET_MS = 7 * 3600 * 1000;
const RESULT_HOUR  = 18;
const RESULT_MIN   = 35;

export function load() {
  const nowVN    = new Date(Date.now() + VN_OFFSET_MS);
  const todayVN  = nowVN.toISOString().slice(0, 10);
  const vnHour   = nowVN.getUTCHours();
  const vnMin    = nowVN.getUTCMinutes();
  const pastCutoff = vnHour > RESULT_HOUR || (vnHour === RESULT_HOUR && vnMin >= RESULT_MIN);

  const total    = countDraws();
  const latest   = getLatestDraw();
  const topPairs = total > 0 ? getTopPairs(1) : [];
  const soiCau   = total > 0 ? getSoiCauRecs(5) : [];

  // Đã có kết quả hôm nay trong DB chưa?
  const todayInDb = !!findDraw(todayVN, 'mien-bac');
  // Kết quả hôm nay có thể scrape được chưa (sau 18:35 VN)?
  const resultsAvailable = pastCutoff;

  return { total, latest, topPairs, soiCau, todayVN, todayInDb, resultsAvailable };
}
