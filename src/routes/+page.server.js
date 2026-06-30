import { countDraws, getLatestDraw } from '$lib/db/queries/results.js';
import { getTopPairs, getSoiCauRecs } from '$lib/db/queries/stats.js';

export function load() {
  const total    = countDraws();
  const latest   = getLatestDraw();
  const topPairs = total > 0 ? getTopPairs(1) : [];
  const soiCau   = total > 0 ? getSoiCauRecs(5) : [];
  return { total, latest, topPairs, soiCau };
}
