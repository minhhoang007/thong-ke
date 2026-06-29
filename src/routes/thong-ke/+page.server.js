import { getFrequencyStats, getAvailablePeriods, getTrendData, getHotColdData, getPairCoOccurrence } from '$lib/db/queries/stats.js';

export function load({ url }) {
  const year  = url.searchParams.get('year')  || null;
  const month = url.searchParams.get('month') || null;
  const prize = url.searchParams.get('prize') || 'all';

  const stats       = getFrequencyStats(year, month, prize);
  const periods     = getAvailablePeriods();
  const trend       = getTrendData(5);
  const hotCold     = getHotColdData(30, prize);
  const coOccurrence = getPairCoOccurrence(20, prize);

  return { ...stats, periods, trend, hotCold, coOccurrence, filterYear: year, filterMonth: month, filterPrize: prize };
}
