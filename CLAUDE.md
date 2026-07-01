# XoSo Stats — CLAUDE.md

## Dự án thống kê xổ số (bởi Claude)

## Tổng quan dự án

Ứng dụng web phân tích kết quả xổ số Việt Nam. Dữ liệu được **tự động cào (scrape) mỗi ngày lúc 18:45 giờ VN** từ nhiều nguồn, lưu vào SQLite; app thống kê tần suất 100 cặp số (00–99) theo giải/tháng, phân tích lô gan / cầu lô / nóng-lạnh / khoảng cách, kiểm định tính ngẫu nhiên (chi-square, khoảng tin cậy), chấm điểm ensemble và backtest để đưa ra **phương án gợi ý cặp số**. Vẫn hỗ trợ nhập tay khi cần.

**Stack:** SvelteKit 2 (Svelte 5 runes) · better-sqlite3 · Tailwind CSS v4 · Vite 8 · **adapter-node** (SSR, không prerender) · PWA (service worker + manifest)

## Lệnh phát triển

```bash
cd xoso-app
npm run dev      # dev server tại http://localhost:5173
npm run build    # build production (output: build/ — chạy bằng `node build`)
npm run preview  # xem build production
```

Không có test suite — verify bằng cách chạy app thực tế.

## Cấu trúc thư mục

```
xoso-app/
├── data/
│   └── xoso.db                          # SQLite (tự tạo). Override path qua env DATABASE_PATH
├── src/
│   ├── hooks.server.js                  # init(): scheduler tự cào lúc 18:45 VN (Miền Bắc)
│   ├── components/
│   │   ├── FrequencyChart.svelte        # Biểu đồ cột SVG 100 cặp 00–99
│   │   └── TrendChart.svelte            # Biểu đồ xu hướng top 5 cặp theo tháng
│   ├── lib/
│   │   ├── db/
│   │   │   ├── database.js              # Singleton SQLite + auto-migrate (schema inline) + WAL
│   │   │   ├── cache.js                 # Cache TTL in-memory (withCache/bust)
│   │   │   ├── migrations/001_init.sql  # Schema tham khảo (thực thi từ database.js)
│   │   │   └── queries/
│   │   │       ├── results.js           # CRUD draws/results + search + findDraw
│   │   │       ├── scrape-log.js        # Nhật ký cào + getMissingDates (ngày hụt dữ liệu)
│   │   │       └── stats.js             # Toàn bộ hàm thống kê (~950 dòng — trung tâm dự án)
│   │   ├── logic/
│   │   │   ├── parser.js                # getLast2(value) — tách 2 số cuối
│   │   │   ├── frequency.js             # buildFrequencyMap, buildGrid, classify
│   │   │   ├── scraper.js               # Multi-source scraper (race 3 nguồn, Promise.any)
│   │   │   ├── scrape-save.js           # scrapeAndSave() — cào+lưu+log dùng chung scheduler/API
│   │   │   ├── chi-square.js            # Kiểm định χ² phân phối đều
│   │   │   └── monte-carlo.js           # Khoảng tin cậy binomial 95/99%
│   │   └── utils/
│   │       └── time.js                  # nowVN(), todayVN() — xử lý giờ VN (UTC+7)
│   └── routes/
│       ├── +layout.svelte               # Nav bar + đăng ký service worker (PWA)
│       ├── +page.svelte / .server.js    # Dashboard: tổng kỳ, top pair, soi cầu, kỳ gần nhất
│       ├── nhap-lieu/+page.svelte       # Nhập tay (auto-focus next input)
│       ├── lich-su/                      # Danh sách kỳ (phân trang), expand, xóa
│       ├── lich/                         # Lịch tháng: cặp GĐB theo ngày
│       ├── thong-ke/                     # Bảng 10×10 + biểu đồ + hot/cold + đầu/đuôi + tổng GĐB…
│       ├── lo-gan/                       # Lô gan: số kỳ chưa ra của mỗi cặp
│       ├── cau-lo/                       # Cầu lô: cặp đang ra liên tiếp (streak)
│       ├── dan-de/                       # Dàn đề theo tần suất tổng thể
│       ├── khuyen-nghi/                  # Khuyến nghị hôm nay: gộp ensemble + gap + backtest
│       ├── du-doan/                      # Ensemble score + backtest → phương án gợi ý
│       ├── nghien-cuu/                   # Chi-square, khoảng tin cậy, gap, autocorrelation GĐB
│       ├── trang-thai/                   # Nhật ký cào + ngày hụt dữ liệu + nút "cào bù"
│       └── api/
│           ├── scrape/+server.js         # GET  — scrape thử 1 kỳ (không lưu)
│           ├── daily-scrape/+server.js   # POST — cào hôm nay + hôm qua, lưu nếu chưa có
│           ├── health/+server.js         # GET  — health check
│           ├── export/+server.js         # GET  — export dữ liệu
│           ├── results/+server.js        # POST — lưu 1 kỳ (nhập tay)
│           ├── results/[id]/+server.js   # GET/PUT/DELETE 1 kỳ
│           └── results/search/+server.js # GET  — tìm kiếm kỳ
└── static/                               # manifest.json, sw.js, icon…
```

## Database schema

```sql
draws   (id, draw_date TEXT "YYYY-MM-DD", province TEXT, created_at TEXT)
results (id, draw_id FK→draws, prize_name TEXT, value TEXT)
-- ON DELETE CASCADE: xóa draw → tự xóa results
-- Index: idx_draws_date, idx_draws_prov_date, idx_results_draw, idx_results_prize
```

Schema thực thi inline trong `database.js` (`getDb()` chạy migrate lần đầu, bật WAL + `foreign_keys = ON`). File `migrations/001_init.sql` chỉ để tham khảo — nguồn chính là `database.js`.

**Giá trị `province`:** `mien-bac` | `mien-trung` | `mien-nam`

**Giá trị `prize_name` (kèm số lượng mỗi kỳ):** `giai_db`(1) · `giai_nhat`(1) · `giai_nhi`(2) · `giai_ba`(6) · `giai_tu`(4) · `giai_nam`(6) · `giai_sau`(3) · `giai_bay`(4)

## Luồng cập nhật hằng ngày (auto-scrape)

1. `hooks.server.js` → `init()` chạy khi server khởi động: lên lịch `setTimeout` tới **18:45 VN** (sau giờ xổ Miền Bắc ~18:35). Nếu khởi động sau 18:45 → chạy catch-up ngay.
2. Tới giờ: `scrapeResult('mien-bac', today)` → `scraper.js` **race song song 3 nguồn** (minhchinh → xosothantai → ketquaxoso) bằng `Promise.any`, lấy nguồn trả về trước. Thất bại thì retry tối đa 3 lần (5, 10 phút).
3. `saveDraw()` lưu vào DB **và gọi `bust()` xóa toàn bộ cache stats**.
4. Lần truy cập trang tiếp theo: vì là **SSR (adapter-node)**, mỗi `+page.server.js` `load()` chạy lại, đọc SQLite mới → mọi trang (thống kê, lô gan, dự đoán…) **tự phản ánh dữ liệu mới, tự phân tích lại và cập nhật phương án gợi ý**. Không cần thao tác tay.

Endpoint thủ công để cào lại: `POST /api/daily-scrape` (hôm nay + hôm qua, mọi/1 miền), hoặc `GET /api/scrape?province=&date=` (chỉ thử, không lưu).

> ⚠️ Scheduler sống **trong process Node** (in-memory `setTimeout`). Nếu deploy nhiều instance → cào trùng; nếu process restart → lịch reset (có catch-up nên vẫn ổn trong ngày). Cache cũng là in-memory per-process.

### Cào bù & phát hiện hụt dữ liệu (bảng `scrape_log`)

- Mọi lần cào (auto hoặc API) đều ghi 1 dòng vào `scrape_log` qua `scrapeAndSave()` (`scrape-save.js`).
- Trang **`/trang-thai`** liệt kê ngày hụt dữ liệu (30 ngày, mỗi miền) + nhật ký 60 lần gần nhất, có nút **"cào bù"** gọi `POST /api/daily-scrape` với `{ provinces, dates }` cụ thể rồi `invalidateAll()`.
- `getMissingDates(provinces, days)` (`scrape-log.js`) so ngày kỳ vọng với `draws` để tìm ngày thiếu.

### Cấu hình cào qua ENV (khuyến nghị dùng cron ngoài cho production)

| ENV | Mặc định | Ý nghĩa |
|-----|----------|---------|
| `AUTO_SCRAPE_ENABLED` | `true` | `false` = tắt scheduler in-process (tránh cào trùng khi có cron ngoài) |
| `AUTO_SCRAPE_PROVINCES` | `mien-bac` | miền scheduler in-process cào, phẩy ngăn cách |
| `CRON_SECRET` | (trống) | nếu đặt → `POST /api/daily-scrape` yêu cầu header `x-cron-secret` khớp |
| `SCRAPE_TIMEOUT_MS` | `10000` | timeout mỗi request scrape |
| `DATABASE_PATH` | `./data/xoso.db` | trỏ volume bền vững khi deploy |

`POST /api/daily-scrape` nhận `{ provinces?, dates? }` — mặc định cả 3 miền × [hôm nay, hôm qua]. Mẫu cron ngoài: `.github/workflows/daily-scrape.yml` (11:55 UTC = 18:55 VN, cần secret `APP_URL` + `CRON_SECRET`).

## Lớp thống kê (`stats.js`) — các hàm chính

- `getFrequencyStats(year, month, prize)` / `getFrequencyStatsForWindow(N, prize)` — tần suất theo tháng/năm/giải hoặc N kỳ gần nhất → grid 10×10.
- `getHotColdData(N, prize)` — top nóng (ra nhiều) / lạnh (streak dài) trong N kỳ.
- `getLoGanStats()` — số kỳ liên tiếp mỗi cặp chưa ra (binary search theo ngày).
- `getCauLoStats()` — cặp đang ra **liên tiếp** ≥2 kỳ (streak).
- `getDauDuoiStats` / `getTongGDBStats` — tần suất đầu/đuôi, tổng 2 số cuối GĐB + chẵn/lẻ.
- `getPairCoOccurrence(topN, prize)` — cặp đôi hay cùng xuất hiện 1 kỳ.
- `getFrequencyComparison()` — so 7 kỳ vs 30 kỳ → movers up/down + `trendMap`.
- `getGapStatsAll()` — avgGap, stdGap, currentGap, **overdueScore (Z-score)** mỗi cặp.
- `getGDBSequence(n)` — chuỗi cặp GĐB cũ→mới (cho autocorrelation).
- `getTrendData(topN)` — xu hướng top cặp qua ≤12 tháng.
- `getSoiCauRecs(n)` — gợi ý dashboard (lô gan 60% + freq gần đây 40%).
- **`getEnsembleData()`** — chấm điểm 0–100 mỗi cặp từ 5 tín hiệu: lô gan 35%, freq30 thấp 25%, xu hướng giảm 20%, không cầu lô 10%, hiếm dài hạn 10%.
- **`runBacktest(testN)`** — walk-forward: train 90 kỳ, dự đoán top K, đối chiếu hit-rate với xác suất hypergeometric ngẫu nhiên.
- **`getDailyRecommendation(n)`** — gộp ensemble (70%) + overdue gap Z-score (30%) → top N cặp kèm `reasons[]` và độ tin cậy từ backtest (trang `/khuyen-nghi`).

Các hàm nặng (`getAllFreqMapStats`, `getGapStatsAll`, `getEnsembleData`, `runBacktest`) bọc `withCache(key, TTL=10 phút, fn)`.

## Logic phân loại tần suất (`frequency.js`)

`classify(count, avg)`: **Mạnh** (≥avg×1.5) · **Vừa** · **Yếu** (≤avg×0.5) · **Tham khảo** (count=0). `buildGrid` → mảng 10×10 cho bảng hiển thị.

## Scraper (`scraper.js`)

- 3 nguồn định nghĩa dạng `{ name, label, buildUrl, parse }` trong mảng `SOURCES`; thêm nguồn = push object mới.
- Race qua `Promise.any` — nguồn nào hợp lệ trước thì thắng; tất cả fail → trả `AggregateError` gộp lỗi.
- Timeout mỗi request cấu hình qua env `SCRAPE_TIMEOUT_MS` (mặc định 10000).
- Parser trích số từ `data="..."`, `<span>`, hoặc text thuần tùy nguồn.

## Phân tích khoa học (trang `/nghien-cuu`)

- `chi-square.js` — χ² kiểm định 100 cặp có phân phối đều không (xấp xỉ Wilson-Hilferty + erf A&S). `p ≤ 0.05` = có lệch.
- `monte-carlo.js` — khoảng tin cậy binomial `B(n, 1/100)`; `classifyCI` gán extreme-low/low/normal/high/extreme-high.
- ACF (autocorrelation) chuỗi GĐB: `|ACF| < 2/√n` → độc lập (kỳ vọng với xổ số hợp lệ).

## Xử lý thời gian

`time.js`: `nowVN()` trả `Date` "fake-UTC" (đã +7h) → dùng `getUTCHours()`/`getUTCMinutes()` để lấy giờ VN. `todayVN()` → `'YYYY-MM-DD'`. Áp dụng nhất quán ở dashboard, `/lich`, scheduler.

## Quy ước code

- Server-side data loading dùng `+page.server.js` `load()`, gọi thẳng SQLite — **không** fetch API từ server.
- API routes chỉ cho client-side mutations / scrape / export.
- `getDb()` là singleton — không tạo nhiều connection.
- Mọi write dùng `db.transaction()` (atomic) **và gọi `bust()`** để làm mới cache.
- Toàn project **runes mode bắt buộc** (`vite.config.js`): dùng `$state`, `$derived`, `$props` — không `$:` / `export let`.
- Alias: `$components` → `src/components`.

## Đặc thù triển khai

- **adapter-node** → chạy `node build`. Đặt `DATABASE_PATH` trỏ volume bền vững (vd Railway) để dữ liệu không mất khi redeploy.
- PWA: service worker `/sw.js` đăng ký trong `+layout.svelte`, manifest + theme-color trong `<svelte:head>`.

## Các trang

| Route | Chức năng |
|-------|-----------|
| `/` | Dashboard: tổng kỳ, cặp nổi bật, soi cầu top 5, trạng thái kết quả hôm nay |
| `/nhap-lieu` | Nhập tay (auto-focus next input) |
| `/lich-su` | Danh sách kỳ (phân trang), expand xem chi tiết, xóa |
| `/lich` | Lịch tháng — cặp GĐB theo từng ngày |
| `/thong-ke` | Bảng 10×10, biểu đồ, hot/cold, đầu/đuôi, tổng GĐB, co-occurrence, filter tháng/giải/window |
| `/lo-gan` | Lô gan — số kỳ chưa ra của mỗi cặp (list + grid) |
| `/cau-lo` | Cầu lô — cặp đang ra liên tiếp |
| `/dan-de` | Dàn đề theo tần suất tổng thể |
| `/khuyen-nghi` | Khuyến nghị hôm nay: top 8 cặp (ensemble+gap) kèm lý do + độ tin cậy backtest |
| `/du-doan` | Ensemble score 0–100 + kết quả backtest → phương án gợi ý |
| `/nghien-cuu` | Chi-square, khoảng tin cậy, gap, autocorrelation GĐB |
| `/trang-thai` | Nhật ký cào, ngày hụt dữ liệu, nút cào bù |
