import { json } from '@sveltejs/kit';
import { getDb } from '$lib/db/database.js';

// GET /api/health — kiểm tra kết nối database
export function GET() {
  const db = getDb();
  const result = db.prepare("SELECT sqlite_version() as version").get();
  return json({ status: 'ok', sqlite_version: result.version });
}
