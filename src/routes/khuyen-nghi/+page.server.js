import { getDailyRecommendation } from '$lib/db/queries/stats.js';
import { todayVN } from '$lib/utils/time.js';

export function load() {
  const rec = getDailyRecommendation(8);
  return { rec, today: todayVN() };
}
