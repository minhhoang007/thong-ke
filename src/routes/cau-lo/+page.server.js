import { getCauLoStats } from '$lib/db/queries/stats.js';

export function load() {
  return getCauLoStats();
}
