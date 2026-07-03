import { json } from '@sveltejs/kit';
import { deleteDraw, getDrawWithResults, updateDraw } from '$lib/db/queries/results.js';
import { validateDrawDate, validatePrizes } from '$lib/server/validation.js';

function parseId(value) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export function GET({ params }) {
  const id = parseId(params.id);
  if (!id) return json({ error: 'ID không hợp lệ' }, { status: 400 });
  const draw = getDrawWithResults(id);
  if (!draw) return json({ error: 'Không tìm thấy' }, { status: 404 });
  return json(draw);
}

export async function PUT({ params, request }) {
  const id = parseId(params.id);
  if (!id) return json({ error: 'ID không hợp lệ' }, { status: 400 });
  if (!getDrawWithResults(id)) return json({ error: 'Không tìm thấy' }, { status: 404 });

  let body;
  try { body = await request.json(); }
  catch { return json({ error: 'JSON không hợp lệ.' }, { status: 400 }); }
  const dateError = validateDrawDate(body?.draw_date);
  if (dateError) return json({ error: dateError }, { status: 400 });
  const validated = validatePrizes(body?.prizes, { requireComplete: true });
  if (validated.error) return json({ error: validated.error }, { status: 400 });

  try {
    updateDraw(id, body.draw_date, validated.prizes);
    return json({ success: true });
  } catch (error) {
    if (error?.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return json({ error: `Kỳ ngày ${body.draw_date} đã tồn tại.` }, { status: 409 });
    }
    console.error('[api/results] update failed:', error);
    return json({ error: 'Cập nhật thất bại' }, { status: 500 });
  }
}

export function DELETE({ params }) {
  const id = parseId(params.id);
  if (!id) return json({ error: 'ID không hợp lệ' }, { status: 400 });
  const result = deleteDraw(id);
  if (result.changes === 0) return json({ error: 'Không tìm thấy' }, { status: 404 });
  return json({ success: true });
}
