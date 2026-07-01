import { countDraws, getLatestDraw, findDraw } from '$lib/db/queries/results.js';
import { getTopPairs, getSoiCauRecs } from '$lib/db/queries/stats.js';
import { nowVN, todayVN } from '$lib/utils/time.js';

const RESULT_HOUR = 18;
const RESULT_MIN  = 35;

export function load() {
  const vn       = nowVN();
  const today    = todayVN();
  const vnHour   = vn.getUTCHours();
  const vnMin    = vn.getUTCMinutes();
  const pastCutoff = vnHour > RESULT_HOUR || (vnHour === RESULT_HOUR && vnMin >= RESULT_MIN);

  const total    = countDraws();
  const latest   = getLatestDraw();
  const topPairs = total > 0 ? getTopPairs(1) : [];
  const soiCau   = total > 0 ? getSoiCauRecs(5) : [];

  const todayInDb        = !!findDraw(today);
  const resultsAvailable = pastCutoff;

  return { total, latest, topPairs, soiCau, todayVN: today, todayInDb, resultsAvailable };
}
