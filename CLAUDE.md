# XoSo Stats — CLAUDE.md

## Tổng quan dự án

Ứng dụng web phân tích kết quả xổ số Việt Nam. Người dùng nhập kết quả từng kỳ (tay hoặc CSV), app thống kê tần suất xuất hiện của 100 cặp số (00–99) theo các giải, hiển thị xu hướng theo tháng.

**Stack:** SvelteKit 2 (Svelte 5 runes) · better-sqlite3 · Tailwind CSS v4 · Vite 8

## Lệnh phát triển

```bash
cd xoso-app
npm run dev      # dev server tại http://localhost:5173
npm run build    # build production
npm run preview  # xem build production
```

## Cấu trúc thư mục

```
xoso-app/
├── data/
│   └── xoso.db                          # SQLite database (tự tạo khi chạy lần đầu)
├── src/
│   ├── components/
│   │   ├── FrequencyChart.svelte        # Biểu đồ cột SVG 100 cặp 00–99
│   │   └── TrendChart.svelte            # Biểu đồ xu hướng top 5 cặp theo tháng
│   ├── lib/
│   │   ├── db/
│   │   │   ├── database.js              # Singleton SQLite connection + auto-migrate
│   │   │   ├── migrations/001_init.sql  # Schema: bảng draws + results
│   │   │   └── queries/
│   │   │       ├── results.js           # CRUD: saveDraw, listDraws, deleteDraw, saveDrawsBatch
│   │   │       └── stats.js             # Thống kê: tần suất, xu hướng, top pairs
│   │   └── logic/
│   │       ├── parser.js                # getLast2(value) — tách 2 số cuối
│   │       ├── frequency.js             # buildFrequencyMap, buildGrid, classify
│   │       └── csv-parser.js            # parseCSV, CSV_TEMPLATE
│   └── routes/
│       ├── +layout.svelte               # Nav bar chung
│       ├── +page.svelte                 # Dashboard: 4 ô tổng quan + kỳ gần nhất
│       ├── +page.server.js              # Load: total, topPairs, latest draw
│       ├── nhap-lieu/+page.svelte       # Nhập tay và import CSV
│       ├── lich-su/+page.svelte         # Danh sách kỳ, expand, xóa
│       ├── thong-ke/+page.svelte        # Bảng 10×10 + biểu đồ + filter tháng
│       ├── thong-ke/+page.server.js     # Load: getFrequencyStats + getTrendData
│       └── api/
│           ├── results/+server.js       # POST /api/results (nhập 1 kỳ)
│           ├── results/[id]/+server.js  # GET/DELETE /api/results/:id
│           ├── results/batch/+server.js # POST /api/results/batch (CSV import)
│           └── stats/+server.js         # GET /api/stats
└── static/
```

## Database schema

```sql
draws   (id, draw_date TEXT "YYYY-MM-DD", province TEXT, created_at TEXT)
results (id, draw_id FK→draws, prize_name TEXT, value TEXT)
-- ON DELETE CASCADE: xóa draw → tự xóa results
```

**Giá trị `province`:** `mien-bac` | `mien-trung` | `mien-nam`

**Giá trị `prize_name`:** `giai_db` · `giai_nhat` · `giai_nhi` · `giai_ba` · `giai_tu` · `giai_nam` · `giai_sau` · `giai_bay`

## Logic phân tích tần suất

1. `getLast2(value)` — lấy 2 ký tự cuối của chuỗi số (vd `"56789"` → `"89"`)
2. `buildFrequencyMap(list)` — đếm số lần xuất hiện của mỗi cặp 00–99
3. `classify(count, avg)` — phân loại theo ngưỡng so với trung bình:
   - **Mạnh**: count ≥ avg × 1.5
   - **Vừa**: khoảng avg × 0.5 đến avg × 1.5
   - **Yếu**: count ≤ avg × 0.5
   - **Tham khảo**: count = 0 (chưa xuất hiện lần nào)
4. `buildGrid(freqMap, avg)` → mảng 10×10 cho bảng hiển thị

## Alias import

`$components` → `src/components` (cấu hình trong `vite.config.js`)

## Svelte 5 runes

Toàn bộ project dùng **runes mode** (bắt buộc, cấu hình trong `vite.config.js`). Dùng `$state`, `$derived`, `$props` — không dùng `$:` hay `export let`.

## API endpoints

| Method | Path | Mô tả |
|--------|------|--------|
| POST | `/api/results` | Lưu 1 kỳ: `{ draw_date, province, prizes }` |
| GET | `/api/results/:id` | Lấy chi tiết 1 kỳ kèm kết quả |
| DELETE | `/api/results/:id` | Xóa 1 kỳ |
| POST | `/api/results/batch` | Nhập nhiều kỳ: `{ draws: [...] }` |
| GET | `/api/stats` | Tần suất tổng thể |

## CSV import format

Header cố định 29 cột: `date, province, giai_db, giai_nhat, giai_nhi_1, giai_nhi_2, giai_ba_1..6, giai_tu_1..4, giai_nam_1..6, giai_sau_1..3, giai_bay_1..4`

Tải file mẫu từ trang `/nhap-lieu` → tab "Import CSV".

## Các trang

| Route | Chức năng |
|-------|-----------|
| `/` | Dashboard: tổng kỳ, cặp nổi bật, kỳ gần nhất |
| `/nhap-lieu` | Nhập tay (auto-focus next input) hoặc import CSV |
| `/lich-su` | Danh sách tất cả kỳ, expand xem chi tiết, nút xóa |
| `/thong-ke` | Bảng 10×10 tần suất, biểu đồ cột SVG, xu hướng top 5 cặp 12 tháng, filter tháng |

## Quy ước code

- Server-side data loading dùng `+page.server.js` (SvelteKit load function), gọi thẳng SQLite — không fetch API từ server
- API routes chỉ dùng cho client-side mutations (POST/DELETE từ trình duyệt)
- `getDb()` là singleton — không tạo nhiều connection
- Mọi write đều dùng `db.transaction()` để đảm bảo atomic
- Không có test suite — verify bằng cách chạy app thực tế
