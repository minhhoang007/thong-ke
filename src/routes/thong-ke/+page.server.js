import {
  getFrequencyStats, getFrequencyStatsForWindow,
  getAvailablePeriods, getTrendData, getHotColdData,
  getPairCoOccurrence, getDauDuoiStats, getTongGDBStats,
  getFrequencyComparison,
} from '$lib/db/queries/stats.js';
import { boundedInt } from '$lib/server/validation.js';

const VALID_PRIZES = new Set(['all', 'giai_db', 'giai_nhat', 'giai_nhi', 'giai_ba', 'giai_tu', 'giai_nam', 'giai_sau', 'giai_bay']);

export function load({ url }) {
  const rawYear = url.searchParams.get('year');
  const rawMonth = url.searchParams.get('month');
  const rawPrize = url.searchParams.get('prize') || 'all';
  const year = /^20\d{2}$/.test(rawYear ?? '') ? rawYear : null;
  const month = /^(?:[1-9]|1[0-2])$/.test(rawMonth ?? '') ? rawMonth : null;
  const prize = VALID_PRIZES.has(rawPrize) ? rawPrize : 'all';
  const win = url.searchParams.has('window')
    ? boundedInt(url.searchParams.get('window'), 30, { min: 1, max: 365 })
    : null;

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
