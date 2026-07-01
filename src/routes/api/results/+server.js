import { json } from '@sveltejs/kit';
import { listDrawsWithCount, saveDraw, findDraw } from '$lib/db/queries/results.js';

// GET /api/results?page=1&pageSize=20
export function GET({ url }) {
  const page     = parseInt(url.searchParams.get('page') || '1');
  const pageSize = parseInt(url.searchParams.get('pageSize') || '20');
  return json(listDrawsWithCount({ page, pageSize }));
}

// POST /api/results — lưu một kỳ mới (Miền Bắc)
// Body: { draw_date, prizes, skip_if_exists? }
export async function POST({ request }) {
  const { draw_date, prizes, skip_if_exists } = await request.json();
  if (!draw_date || !prizes) {
    return json({ error: 'Thiếu thông tin bắt buộc: draw_date, prizes' }, { status: 400 });
  }
  const existing = findDraw(draw_date);
  if (existing) {
    if (skip_if_exists) {
      return json({ success: true, skipped: true, existingId: existing.id }, { status: 200 });
    }
    return json({ error: `Kỳ ngày ${draw_date} đã tồn tại (ID: ${existing.id})` }, { status: 409 });
  }
  const drawId = saveDraw(draw_date, prizes);
  return json({ success: true, drawId }, { status: 201 });
}
