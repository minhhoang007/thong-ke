import { listDrawsWithCount } from '$lib/db/queries/results.js';

export function load() {
  const { draws, total, hasMore } = listDrawsWithCount({ page: 1, pageSize: 20 });
  return { draws, total, hasMore };
}
