import { getLoGanStats } from '$lib/db/queries/stats.js';

export function load() {
  return getLoGanStats();
}
