/**
 * Cào 1 kỳ Miền Bắc + lưu DB + ghi nhật ký. Dùng chung cho scheduler và API.
 * Idempotent: nếu kỳ đã có trong DB → trả 'skipped', không ghi đè.
 */
import { scrapeResult }         from './scraper.js';
import { saveDraw, findDraw }   from '../db/queries/results.js';
import { logScrape }            from '../db/queries/scrape-log.js';

export async function scrapeAndSave(date) {
  if (findDraw(date)) {
    return { date, status: 'skipped' };
  }

  let scraped;
  try {
    scraped = await scrapeResult(date);
  } catch (e) {
    const note = String(e?.message ?? e);
    logScrape({ draw_date: date, status: 'error', note });
    return { date, status: 'error', error: note };
  }

  if (!scraped.success) {
    logScrape({ draw_date: date, status: 'no_data', note: scraped.error });
    return { date, status: 'no_data', errors: scraped.errors };
  }

  const drawId = saveDraw(date, scraped.prizes);
  const status = scraped.partial ? 'partial' : 'saved';
  logScrape({ draw_date: date, status, source: scraped.sourceLabel });

  return {
    date, status, drawId,
    source:      scraped.source,
    sourceLabel: scraped.sourceLabel,
    partial:     scraped.partial ?? false,
  };
}
