# XoSo Stats

Ứng dụng SvelteKit lưu kết quả xổ số Miền Bắc trong SQLite, cung cấp thống kê, backtest và công cụ nhập/scrape dữ liệu.

## Chạy local

```sh
copy .env.example .env
npm install
npm run dev
```

Đổi `ADMIN_PASSWORD` và `CRON_SECRET` trước khi chạy. Trình duyệt sẽ yêu cầu HTTP Basic Auth khi mở `/nhap-lieu`.

## Kiểm tra

```sh
npm test
npm run build
```

## Biến môi trường

- `DATABASE_PATH`: đường dẫn SQLite; production nên trỏ tới persistent volume.
- `ADMIN_USERNAME`, `ADMIN_PASSWORD`: bắt buộc cho trang/API quản trị. Khi thiếu, endpoint quản trị trả `503` (fail-closed).
- `CRON_SECRET`: bắt buộc cho cron ngoài gọi `/api/daily-scrape`; gửi qua header `x-cron-secret`. Người quản trị đã xác thực vẫn có thể chạy batch thủ công.
- `AUTO_SCRAPE_ENABLED`: mặc định `false`. Chỉ bật scheduler trong process khi chạy một instance và không có cron ngoài.
- `BODY_SIZE_LIMIT`: giới hạn body cho adapter-node, khuyến nghị `64K`.
- `SCRAPE_TIMEOUT_MS`: timeout mỗi nguồn, được giới hạn trong khoảng 1–30 giây.

## Deploy

1. Gắn persistent volume và đặt `DATABASE_PATH`.
2. Đặt các secret riêng, đủ dài; không truyền secret trong query string.
3. Dùng GitHub Actions/cron ngoài thì giữ `AUTO_SCRAPE_ENABLED=false`.
4. Chạy một instance nếu dùng SQLite. Unique constraint bảo vệ trùng kỳ, nhưng SQLite không phù hợp cho nhiều node cùng ghi lên filesystem phân tán.

Scraper chỉ chấp nhận HTTPS và redirect tới danh sách hostname nguồn đã cấu hình, đồng thời giới hạn response ở 2 MiB.
