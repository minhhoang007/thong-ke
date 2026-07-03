import { json } from '@sveltejs/kit';
import { listDrawsWithCount, saveDraw, findDraw } from '$lib/db/queries/results.js';
import { boundedInt, validateDrawDate, validatePrizes } from '$lib/server/validation.js';

// GET /api/results?page=1&pageSize=20
export function GET({ url }) {
  const page     = boundedInt(url.searchParams.get('page'), 1, { min: 1, max: 1_000_000 });
  const pageSize = boundedInt(url.searchParams.get('pageSize'), 20, { min: 1, max: 100 });
  return json(listDrawsWithCount({ page, pageSize }));
}

// POST /api/results — lưu một kỳ mới (Miền Bắc)
// Body: { draw_date, prizes, skip_if_exists? }
export async function POST({ request }) {
  const contentLength = Number(request.headers.get('content-length') ?? 0);
  if (contentLength > 32_768) return json({ error: 'Payload quá lớn.' }, { status: 413 });

  let body;
  try { body = await request.json(); }
  catch { return json({ error: 'JSON không hợp lệ.' }, { status: 400 }); }

  const { draw_date, skip_if_exists } = body ?? {};
  const dateError = validateDrawDate(draw_date);
  if (dateError) return json({ error: dateError }, { status: 400 });
  const validated = validatePrizes(body?.prizes, { requireComplete: true });
  if (validated.error) return json({ error: validated.error }, { status: 400 });

  const existing = findDraw(draw_date);
  if (existing) {
    if (skip_if_exists) {
      return json({ success: true, skipped: true, existingId: existing.id }, { status: 200 });
    }
    return json({ error: `Kỳ ngày ${draw_date} đã tồn tại (ID: ${existing.id})` }, { status: 409 });
  }
  try {
    const drawId = saveDraw(draw_date, validated.prizes);
    return json({ success: true, drawId }, { status: 201 });
  } catch (error) {
    if (error?.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      const raced = findDraw(draw_date);
      if (skip_if_exists && raced) return json({ success: true, skipped: true, existingId: raced.id });
      return json({ error: `Kỳ ngày ${draw_date} đã tồn tại.` }, { status: 409 });
    }
    console.error('[api/results] create failed:', error);
    return json({ error: 'Không thể lưu kết quả.' }, { status: 500 });
  }
}
