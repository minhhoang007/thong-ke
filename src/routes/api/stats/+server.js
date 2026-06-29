import { json } from '@sveltejs/kit';
import { getFrequencyStats } from '$lib/db/queries/stats.js';

export function GET({ url }) {
  const year  = url.searchParams.get('year')  || null;
  const month = url.searchParams.get('month') || null;
  const prize = url.searchParams.get('prize') || 'all';
  return json(getFrequencyStats(year, month, prize));
}
