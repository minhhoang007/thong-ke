-- Bảng lưu thông tin từng kỳ xổ số
CREATE TABLE IF NOT EXISTS draws (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  draw_date   TEXT NOT NULL,       -- Ngày xổ, dạng YYYY-MM-DD
  province    TEXT NOT NULL,       -- Tên tỉnh / miền: "mien-bac", "mien-nam"...
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Bảng lưu từng giải trong một kỳ
CREATE TABLE IF NOT EXISTS results (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  draw_id     INTEGER NOT NULL REFERENCES draws(id) ON DELETE CASCADE,
  prize_name  TEXT NOT NULL,   -- Tên giải: "giai_db", "giai_nhat", "giai_nhi"...
  value       TEXT NOT NULL    -- Số trúng thưởng, ví dụ: "123456"
);

-- Index để tìm kiếm nhanh theo ngày
CREATE INDEX IF NOT EXISTS idx_draws_date ON draws(draw_date);

-- Index để tìm kiếm nhanh theo kỳ
CREATE INDEX IF NOT EXISTS idx_results_draw ON results(draw_id);
