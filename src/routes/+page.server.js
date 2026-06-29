import { countDraws, getLatestDraw } from '$lib/db/queries/results.js';
import { getTopPairs } from '$lib/db/queries/stats.js';

export function load() {
  const total = countDraws();
  const latest = getLatestDraw();
  const topPairs = total > 0 ? getTopPairs(1) : [];
  return { total, latest, topPairs };
}
