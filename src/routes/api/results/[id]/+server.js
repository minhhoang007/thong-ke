import { json } from '@sveltejs/kit';
import { deleteDraw, getDrawWithResults, updateDraw } from '$lib/db/queries/results.js';

export function GET({ params }) {
  const draw = getDrawWithResults(Number(params.id));
  if (!draw) return json({ error: 'Không tìm thấy' }, { status: 404 });
  return json(draw);
}

export async function PUT({ params, request }) {
  const id = Number(params.id);
  const { draw_date, prizes } = await request.json();
  if (!draw_date || !prizes) {
    return json({ error: 'Thiếu thông tin bắt buộc' }, { status: 400 });
  }
  try {
    updateDraw(id, draw_date, prizes);
    return json({ success: true });
  } catch {
    return json({ error: 'Cập nhật thất bại' }, { status: 500 });
  }
}

export function DELETE({ params }) {
  const result = deleteDraw(Number(params.id));
  if (result.changes === 0) return json({ error: 'Không tìm thấy' }, { status: 404 });
  return json({ success: true });
}
