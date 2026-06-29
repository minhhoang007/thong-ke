import { json } from '@sveltejs/kit';
import { listDrawsWithCount, saveDraw } from '$lib/db/queries/results.js';

// GET /api/results?page=1&pageSize=20
export function GET({ url }) {
  const page     = parseInt(url.searchParams.get('page') || '1');
  const pageSize = parseInt(url.searchParams.get('pageSize') || '20');
  return json(listDrawsWithCount({ page, pageSize }));
}

// POST /api/results — lưu một kỳ mới
export async function POST({ request }) {
  const body = await request.json();
  const { draw_date, province, prizes } = body;
  if (!draw_date || !province || !prizes) {
    return json({ error: 'Thiếu thông tin bắt buộc: draw_date, province, prizes' }, { status: 400 });
  }
  const drawId = saveDraw(draw_date, province, prizes);
  return json({ success: true, drawId }, { status: 201 });
}
