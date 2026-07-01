import { getMissingDates, getRecentLogs } from '$lib/db/queries/scrape-log.js';
import { todayVN } from '$lib/utils/time.js';

const ALL_PROVINCES = ['mien-bac', 'mien-trung', 'mien-nam'];

export function load() {
  const missing = getMissingDates(ALL_PROVINCES, 30);
  const logs    = getRecentLogs(60);
  return { missing, logs, today: todayVN() };
}
