import { getFrequencyStats } from '$lib/db/queries/stats.js';

export function load() {
  const { grid, totalDraws } = getFrequencyStats();
  // Chuyển grid thành map pair → { count, label }
  const freqMap = {};
  for (const row of grid) {
    for (const cell of row) {
      freqMap[cell.pair] = { count: cell.count, label: cell.label };
    }
  }
  return { freqMap, totalDraws };
}
