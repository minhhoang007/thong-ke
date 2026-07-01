import { getMissingDates, getRecentLogs } from '$lib/db/queries/scrape-log.js';
import { todayVN } from '$lib/utils/time.js';

export function load() {
  const missing = getMissingDates(30);
  const logs    = getRecentLogs(60);
  return { missing, logs, today: todayVN() };
}
