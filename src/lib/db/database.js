import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join } from 'path';

// process.cwd() luôn trỏ đến thư mục gốc project khi chạy npm run dev
const DB_PATH = join(process.cwd(), 'data', 'xoso.db');
const MIGRATION_PATH = join(process.cwd(), 'src', 'lib', 'db', 'migrations', '001_init.sql');

// Singleton: mở kết nối một lần, dùng chung
let _db;

export function getDb() {
  if (!_db) {
    _db = new Database(DB_PATH);
    _db.pragma('journal_mode = WAL'); // Tăng tốc đọc/ghi đồng thời
    _db.pragma('foreign_keys = ON');  // Bắt buộc kiểm tra khóa ngoại

    // Chạy migration nếu bảng chưa tồn tại
    const migration = readFileSync(MIGRATION_PATH, 'utf-8');
    _db.exec(migration);
  }
  return _db;
}
