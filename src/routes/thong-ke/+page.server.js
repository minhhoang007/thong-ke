import {
  getFrequencyStats, getFrequencyStatsForWindow,
  getAvailablePeriods, getTrendData, getHotColdData,
  getPairCoOccurrence, getDauDuoiStats, getTongGDBStats,
  getFrequencyComparison,
} from '$lib/db/queries/stats.js';

export function load({ url }) {
  const year  = url.searchParams.get('year')   || null;
  const month = url.searchParams.get('month')  || null;
  const prize = url.searchParams.get('prize')  || 'all';
  const win   = parseInt(url.searchParams.get('window')) || null;

  // window (N kỳ gần nhất) được ưu tiên hơn year/month filter
  const stats = win
    ? getFrequencyStatsForWindow(win, prize)
    : getFrequencyStats(year, month, prize);

  const periods      = getAvailablePeriods();
  const trend        = getTrendData(5);
  const hotCold      = getHotColdData(30, prize);
  const coOccurrence = getPairCoOccurrence(20, prize);
  const dauDuoi      = getDauDuoiStats(year, month);
  const tongGDB      = getTongGDBStats(year, month);
  const comparison   = getFrequencyComparison();

  return {
    ...stats, periods, trend, hotCold, coOccurrence,
    dauDuoi, tongGDB, comparison,
    filterYear: win ? null : year,
    filterMonth: win ? null : month,
    filterPrize: prize,
    filterWindow: win,
  };
}
