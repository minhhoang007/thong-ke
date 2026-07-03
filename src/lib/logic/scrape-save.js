/**
 * Cào 1 kỳ Miền Bắc + lưu DB + ghi nhật ký. Dùng chung cho scheduler và API.
 * Idempotent: nếu kỳ đã có trong DB → trả 'skipped', không ghi đè.
 */
import { scrapeResult }         from './scraper.js';
import { saveDraw, findDraw, getDrawWithResults, updateDraw } from '../db/queries/results.js';
import { logScrape }            from '../db/queries/scrape-log.js';
import { validateDrawDate, validatePrizes } from '../server/validation.js';

export async function scrapeAndSave(date) {
  const dateError = validateDrawDate(date);
  if (dateError) return { date, status: 'error', error: dateError };
  const existing = findDraw(date);
  const existingDraw = existing ? getDrawWithResults(existing.id) : null;
  if (existingDraw?.results.length >= 27) {
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

  const validated = validatePrizes(scraped.prizes, { requireComplete: !scraped.partial });
  if (validated.error) {
    logScrape({ draw_date: date, status: 'error', source: scraped.sourceLabel, note: validated.error });
    return { date, status: 'error', error: validated.error };
  }

  const resultCount = Object.values(validated.prizes).reduce(
    (sum, values) => sum + (Array.isArray(values) ? values.length : (values ? 1 : 0)), 0
  );
  if (existingDraw && resultCount <= existingDraw.results.length) {
    logScrape({ draw_date: date, status: 'partial', source: scraped.sourceLabel, note: 'Không có dữ liệu đầy đủ hơn bản hiện có' });
    return { date, status: 'partial', drawId: existingDraw.id, source: scraped.source, sourceLabel: scraped.sourceLabel, partial: true };
  }

  let drawId;
  try {
    if (existingDraw) {
      drawId = updateDraw(existingDraw.id, date, validated.prizes);
    } else {
      drawId = saveDraw(date, validated.prizes);
    }
  } catch (error) {
    if (error?.code === 'SQLITE_CONSTRAINT_UNIQUE') return { date, status: 'skipped' };
    const note = String(error?.message ?? error);
    logScrape({ draw_date: date, status: 'error', source: scraped.sourceLabel, note });
    return { date, status: 'error', error: note };
  }
  const status = scraped.partial ? 'partial' : 'saved';
  logScrape({ draw_date: date, status, source: scraped.sourceLabel });

  return {
    date, status, drawId,
    source:      scraped.source,
    sourceLabel: scraped.sourceLabel,
    partial:     scraped.partial ?? false,
  };
}
