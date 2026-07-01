/**
 * Cào 1 kỳ + lưu DB + ghi nhật ký. Dùng chung cho scheduler và API.
 * Idempotent: nếu kỳ đã có trong DB → trả 'skipped', không ghi đè.
 */
import { scrapeResult }         from './scraper.js';
import { saveDraw, findDraw }   from '../db/queries/results.js';
import { logScrape }            from '../db/queries/scrape-log.js';

export async function scrapeAndSave(province, date) {
  if (findDraw(date, province)) {
    return { date, province, status: 'skipped' };
  }

  let scraped;
  try {
    scraped = await scrapeResult(province, date);
  } catch (e) {
    const note = String(e?.message ?? e);
    logScrape({ draw_date: date, province, status: 'error', note });
    return { date, province, status: 'error', error: note };
  }

  if (!scraped.success) {
    logScrape({ draw_date: date, province, status: 'no_data', note: scraped.error });
    return { date, province, status: 'no_data', errors: scraped.errors };
  }

  const drawId = saveDraw(date, province, scraped.prizes);
  const status = scraped.partial ? 'partial' : 'saved';
  logScrape({ draw_date: date, province, status, source: scraped.sourceLabel });

  return {
    date, province, status, drawId,
    source:      scraped.source,
    sourceLabel: scraped.sourceLabel,
    partial:     scraped.partial ?? false,
  };
}
