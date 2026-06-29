import { json } from '@sveltejs/kit';
import { saveDrawsBatch } from '$lib/db/queries/results.js';

// POST /api/results/batch — lưu nhiều kỳ cùng lúc từ CSV import
export async function POST({ request }) {
  const { draws } = await request.json();

  if (!Array.isArray(draws) || draws.length === 0) {
    return json({ error: 'Không có dữ liệu để nhập' }, { status: 400 });
  }

  const ids = saveDrawsBatch(draws);
  return json({ success: true, count: ids.length, ids }, { status: 201 });
}
