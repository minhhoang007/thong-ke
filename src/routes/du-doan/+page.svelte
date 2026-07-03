<script>
  let { data } = $props();
  const ensemble = $derived(data.ensemble);
  const backtest = $derived(data.backtest);

  let activeTab = $state('ensemble');

  function scoreBg(score) {
    if (score >= 80) return 'bg-red-500 text-white';
    if (score >= 65) return 'bg-orange-400 text-white';
    if (score >= 50) return 'bg-yellow-300 text-gray-800';
    if (score >= 35) return 'bg-blue-100 text-blue-800';
    return 'bg-gray-100 text-gray-500';
  }

  function trendIcon(trend) {
    if (trend === 'up')   return '↑';
    if (trend === 'down') return '↓';
    return '–';
  }
  function trendColor(trend) {
    if (trend === 'up')   return 'text-green-600';
    if (trend === 'down') return 'text-red-500';
    return 'text-gray-400';
  }
</script>

<svelte:head><title>Dự Đoán — Times XS</title></svelte:head>

<div class="page-heading">
  <div><div class="eyebrow">Mô hình tham khảo</div><h1>Dự đoán</h1><p>Điểm tổng hợp 5 tín hiệu, đi kèm kiểm tra ngược minh bạch.</p></div>
</div>

{#if !ensemble}
  <div class="bg-yellow-50 border border-yellow-300 rounded p-4 text-yellow-800">
    Cần ít nhất 10 kỳ dữ liệu để tính điểm dự đoán.
  </div>
{:else}

<!-- Tab buttons -->
<div class="segmented-control mb-6 w-fit max-w-full" role="tablist">
  {#each [['ensemble','Điểm Dự Đoán'],['backtest','Kiểm Tra Ngược']] as [id, label]}
    <button
      onclick={() => activeTab = id}
      aria-selected={activeTab === id}
      class:active={activeTab === id}>
      {label}
    </button>
  {/each}
</div>

<!-- ═══ TAB 1: ENSEMBLE ═══ -->
{#if activeTab === 'ensemble'}

  <!-- Disclaimer -->
  <div class="warning-panel mb-5 text-sm">
    ⚠️ Xổ số là ngẫu nhiên — điểm này chỉ là tham khảo, không đảm bảo trúng thưởng.
  </div>

  <!-- 5 tín hiệu giải thích -->
  <div class="soft-panel mb-5 text-sm text-slate-700">
    <div class="font-semibold text-blue-800 mb-2">5 tín hiệu tạo thành điểm (thuyết "đến kỳ"):</div>
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
      <div>🔴 <b>Lô gan 35%</b> — kỳ liên tiếp chưa ra, càng lâu càng cao</div>
      <div>🟠 <b>Tần suất 30 kỳ 25%</b> — ít ra gần đây = "còn dư địa"</div>
      <div>🟡 <b>Xu hướng giảm 20%</b> — rate 7 kỳ thấp hơn rate 30 kỳ</div>
      <div>🔵 <b>Không cầu lô 10%</b> — không đang trên streak nóng</div>
      <div>⚪ <b>Hiếm dài hạn 10%</b> — ít xuất hiện trong toàn lịch sử</div>
    </div>
  </div>

  <!-- Grid 10×10 -->
  <div class="mb-6">
    <h2 class="font-semibold text-gray-700 mb-2">Bảng điểm 00–99</h2>
    <div class="scroll-shell bg-white p-2 sm:p-3">
      <div class="grid grid-cols-10 gap-0.5 min-w-[320px]" style="width: fit-content">
        {#each ensemble.grid as row}
          {#each row as cell}
            <div class="w-10 h-10 flex flex-col items-center justify-center rounded text-center
                        {scoreBg(cell.score)} transition-colors cursor-default"
                 title="Cặp {cell.pair}: {cell.score} điểm | Gan {cell.gan} | 30kỳ {cell.count30}">
              <div class="text-[9px] leading-none opacity-75">{cell.pair}</div>
              <div class="text-[11px] font-bold leading-none">{cell.score}</div>
            </div>
          {/each}
        {/each}
      </div>
    </div>
    <!-- Legend -->
    <div class="flex flex-wrap gap-2 mt-2 text-xs text-gray-600">
      <span class="px-2 py-0.5 rounded bg-red-500 text-white">80–100 Rất cao</span>
      <span class="px-2 py-0.5 rounded bg-orange-400 text-white">65–79 Cao</span>
      <span class="px-2 py-0.5 rounded bg-yellow-300 text-gray-800">50–64 Trung bình</span>
      <span class="px-2 py-0.5 rounded bg-blue-100 text-blue-800">35–49 Thấp</span>
      <span class="px-2 py-0.5 rounded bg-gray-100 text-gray-500">0–34 Rất thấp</span>
    </div>
  </div>

  <!-- Top 10 bảng -->
  <div>
    <h2 class="font-semibold text-gray-700 mb-2">Top 10 cặp điểm cao nhất</h2>
    <div class="scroll-shell">
      <table class="data-table">
        <thead>
          <tr class="bg-gray-100 text-gray-600 text-left">
            <th class="px-3 py-2 w-8">#</th>
            <th class="px-3 py-2">Cặp</th>
            <th class="px-3 py-2">Điểm</th>
            <th class="px-3 py-2">Lô gan</th>
            <th class="px-3 py-2">30 kỳ</th>
            <th class="px-3 py-2">Trend</th>
            <th class="px-3 py-2">Tín hiệu (gan / f30 / trend / cầu / lịch)</th>
          </tr>
        </thead>
        <tbody>
          {#each ensemble.sorted.slice(0, 10) as item, i}
            <tr class="border-t hover:bg-gray-50">
              <td class="px-3 py-2 text-gray-400">{i + 1}</td>
              <td class="px-3 py-2 font-mono font-bold text-lg">{item.pair}</td>
              <td class="px-3 py-2">
                <span class="inline-block px-2 py-0.5 rounded text-xs font-bold
                             {scoreBg(item.score)}">{item.score}</span>
              </td>
              <td class="px-3 py-2 font-mono">{item.gan}</td>
              <td class="px-3 py-2 font-mono">{item.count30}</td>
              <td class="px-3 py-2 font-mono font-bold {trendColor(item.trend)}">{trendIcon(item.trend)}</td>
              <td class="px-3 py-2">
                <div class="flex gap-1 flex-wrap text-xs font-mono">
                  {#each [item.signals.gan, item.signals.freq30, item.signals.trend, item.signals.caulo, item.signals.longTerm] as s}
                    <span class="px-1.5 py-0.5 rounded
                                 {s >= 70 ? 'bg-red-100 text-red-700' :
                                  s >= 40 ? 'bg-yellow-100 text-yellow-700' :
                                            'bg-gray-100 text-gray-500'}">{s}</span>
                  {/each}
                </div>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </div>

<!-- ═══ TAB 2: BACKTEST ═══ -->
{:else if activeTab === 'backtest'}

  {#if !backtest}
    <div class="text-gray-500 italic">Cần thêm dữ liệu để chạy backtest.</div>
  {:else}

    <!-- Giải thích -->
    <div class="soft-panel mb-5 text-sm text-slate-700">
      <div class="font-semibold text-blue-800 mb-1">Kiểm tra ngược là gì?</div>
      <ul class="list-disc list-inside space-y-1">
        <li>Với mỗi kỳ trong <b>{backtest.testN} kỳ gần nhất</b>: chỉ dùng dữ liệu có trước kỳ đó rồi kiểm tra kết quả thực</li>
        <li>Chiến lược: dùng đúng <b>ensemble 5 tín hiệu + gap</b> như bảng khuyến nghị hiện tại</li>
        <li>So sánh với <b>chọn ngẫu nhiên</b> cùng số lượng cặp</li>
        <li>Hit = ít nhất 1 cặp dự đoán xuất hiện trong kết quả thực</li>
      </ul>
    </div>

    <!-- Hit rate cards -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
      {#each backtest.hitRates as hr}
        {@const beat = hr.rate > hr.random}
        <div class="metric-card !min-h-0 {beat ? 'border-green-200 bg-green-50/70' : ''}">
          <div class="text-2xl font-bold {beat ? 'text-green-700' : 'text-gray-600'}">
            {hr.rate}%
          </div>
          <div class="text-sm font-medium text-gray-700 mt-0.5">Top {hr.k} — {hr.hits}/{backtest.testN} kỳ</div>
          <div class="text-xs text-gray-500 mt-1">
            Ngẫu nhiên: {hr.random}%
            <span class="ml-1 font-semibold {beat ? 'text-green-600' : 'text-red-500'}">
              {beat ? `+${(hr.rate - hr.random).toFixed(1)}%` : `${(hr.rate - hr.random).toFixed(1)}%`}
            </span>
          </div>
        </div>
      {/each}
    </div>

    <!-- Cảnh báo -->
    <div class="warning-panel mb-5 text-sm">
      ⚠️ Kết quả tốt trong quá khứ không đảm bảo tương lai. Xổ số là ngẫu nhiên và số mẫu nhỏ (30 kỳ) chưa đủ kết luận thống kê.
    </div>

    <!-- Chi tiết từng kỳ -->
    <div>
      <h2 class="font-semibold text-gray-700 mb-2">Chi tiết {backtest.testN} kỳ kiểm tra</h2>
      <div class="scroll-shell">
        <table class="data-table">
          <thead>
            <tr class="bg-gray-100 text-gray-600 text-left">
              <th class="px-3 py-2">Ngày</th>
              <th class="px-3 py-2">Top 5 dự đoán</th>
              <th class="px-2 py-2 text-center">Top 1</th>
              <th class="px-2 py-2 text-center">Top 3</th>
              <th class="px-2 py-2 text-center">Top 5</th>
            </tr>
          </thead>
          <tbody>
            {#each backtest.results as r}
              <tr class="border-t hover:bg-gray-50">
                <td class="px-3 py-1.5 font-mono text-gray-600 text-xs whitespace-nowrap">{r.date}</td>
                <td class="px-3 py-1.5">
                  <div class="flex gap-1 flex-wrap">
                    {#each r.top5 as p, i}
                      <span class="font-mono text-xs px-1.5 py-0.5 rounded
                                   {i === 0 ? 'bg-red-100 text-red-700 font-bold' :
                                    i < 3   ? 'bg-orange-100 text-orange-700' :
                                              'bg-gray-100 text-gray-600'}">{p}</span>
                    {/each}
                  </div>
                </td>
                <td class="px-2 py-1.5 text-center text-base">{r.hit1 ? '✓' : '✗'}</td>
                <td class="px-2 py-1.5 text-center text-base">{r.hit3 ? '✓' : '✗'}</td>
                <td class="px-2 py-1.5 text-center text-base {r.hit5 ? 'text-green-600' : 'text-red-400'}">{r.hit5 ? '✓' : '✗'}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>

  {/if}
{/if}

{/if}
