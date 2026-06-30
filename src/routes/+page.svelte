<svelte:head>
  <title>Dashboard — Times</title>
</svelte:head>

<script>
  let { data } = $props();

  // Tên giải dễ đọc
  const PRIZE_LABEL = {
    giai_db:   'Giải đặc biệt',
    giai_nhat: 'Giải nhất',
    giai_nhi:  'Giải nhì',
    giai_ba:   'Giải ba',
    giai_tu:   'Giải tư',
    giai_nam:  'Giải năm',
    giai_sau:  'Giải sáu',
    giai_bay:  'Giải bảy',
  };

  // Scrape hôm nay
  let scrapeStatus  = $state('idle'); // idle | loading | done | error
  let scrapeResults = $state([]);

  async function handleDailyScrape() {
    scrapeStatus = 'loading';
    try {
      const res  = await fetch('/api/daily-scrape', { method: 'POST' });
      const json = await res.json();
      scrapeResults = json.results ?? [];
      scrapeStatus  = 'done';
    } catch {
      scrapeStatus = 'error';
    }
  }
</script>

<div class="flex items-center justify-between mb-6 flex-wrap gap-3">
  <h1 class="text-2xl font-bold text-gray-800">Tổng quan</h1>

  <!-- Scrape hôm nay -->
  <div class="flex items-center gap-3 flex-wrap">
    {#if data.todayInDb}
      <span class="text-xs text-green-600 bg-green-50 border border-green-200 rounded-lg px-3 py-1.5 font-medium">
        ✓ Đã có kết quả {data.todayVN}
      </span>
    {:else if !data.resultsAvailable}
      <span class="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
        Kết quả {data.todayVN} chưa có — xổ số XSMB công bố sau 18:35 (giờ VN)
      </span>
    {:else}
      <button onclick={handleDailyScrape}
        disabled={scrapeStatus === 'loading'}
        class="flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg font-medium transition-colors
               {scrapeStatus === 'loading'
                 ? 'bg-blue-100 text-blue-400 cursor-not-allowed'
                 : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'}">
        {#if scrapeStatus === 'loading'}
          <span class="animate-spin text-base">⟳</span> Đang cập nhật...
        {:else}
          ↓ Cập nhật kết quả hôm nay
        {/if}
      </button>
    {/if}

    {#if scrapeStatus === 'done'}
      <div class="text-xs text-gray-500 flex flex-col gap-0.5">
        {#each scrapeResults as r}
          <span>
            {r.date}:
            {#if r.status === 'saved'}
              <span class="text-green-600 font-medium">✓ Đã lưu</span>
            {:else if r.status === 'skipped'}
              <span class="text-gray-400">Đã có</span>
            {:else}
              <span class="text-orange-500">Không có dữ liệu</span>
            {/if}
          </span>
        {/each}
      </div>
    {:else if scrapeStatus === 'error'}
      <span class="text-xs text-red-500">Lỗi kết nối</span>
    {/if}
  </div>
</div>

<!-- 4 ô thống kê -->
<div class="grid grid-cols-2 gap-4 mb-8 md:grid-cols-4">
  <div class="rounded-xl p-4 bg-blue-100 text-blue-800 shadow-sm">
    <p class="text-sm font-medium">Tổng kỳ đã nhập</p>
    <p class="text-3xl font-bold mt-1">{data.total}</p>
  </div>
  <div class="rounded-xl p-4 bg-green-100 text-green-800 shadow-sm">
    <p class="text-sm font-medium">Cặp nổi bật nhất</p>
    <p class="text-3xl font-bold mt-1">
      {data.topPairs[0] ? data.topPairs[0].pair : '—'}
    </p>
    {#if data.topPairs[0]}
      <p class="text-xs mt-1 opacity-70">{data.topPairs[0].count} lần</p>
    {/if}
  </div>
  <div class="rounded-xl p-4 bg-yellow-100 text-yellow-800 shadow-sm">
    <p class="text-sm font-medium">Kỳ gần nhất</p>
    <p class="text-xl font-bold mt-1">
      {data.latest ? data.latest.draw_date : '—'}
    </p>
  </div>
  <div class="rounded-xl p-4 bg-purple-100 text-purple-800 shadow-sm">
    <p class="text-sm font-medium">Khu vực</p>
    <p class="text-xl font-bold mt-1">
      {data.latest ? data.latest.province : '—'}
    </p>
  </div>
</div>

<!-- Gợi ý hôm nay (Soi cầu tự động) -->
{#if data.soiCau.length > 0}
  <div class="bg-white border rounded-xl p-5 shadow-sm mb-6">
    <div class="flex items-baseline gap-2 mb-1">
      <h2 class="text-base font-semibold text-gray-700">Gợi ý hôm nay</h2>
      <span class="text-xs text-gray-400">Soi cầu tự động</span>
    </div>
    <p class="text-xs text-gray-400 mb-4">
      Tổng hợp từ lô gan (60%) + tần suất 30 kỳ gần nhất (40%). Chỉ mang tính tham khảo — xổ số là ngẫu nhiên.
    </p>
    <div class="flex flex-wrap gap-3">
      {#each data.soiCau as item, i}
        <div class="flex flex-col items-center bg-indigo-50 border border-indigo-200 rounded-xl px-5 py-3 min-w-[80px]">
          <span class="text-xs text-indigo-400 font-medium mb-0.5">#{i + 1}</span>
          <span class="font-mono font-bold text-2xl text-indigo-700">{item.pair}</span>
          <span class="text-xs text-indigo-500 mt-1">Gan {item.gan} kỳ</span>
          <span class="text-xs text-gray-400">Ra {item.recentCount}x/30 kỳ</span>
        </div>
      {/each}
    </div>
    <div class="mt-3 flex gap-3 text-xs">
      <a href="/lo-gan" class="text-indigo-600 hover:underline">Xem lô gan đầy đủ →</a>
      <a href="/thong-ke" class="text-blue-600 hover:underline">Thống kê chi tiết →</a>
    </div>
  </div>
{/if}

<!-- Kỳ xổ số gần nhất -->
{#if data.latest}
  <div class="bg-white border rounded-xl p-6 shadow-sm">
    <h2 class="text-lg font-semibold mb-4 text-gray-700">
      Kỳ gần nhất — {data.latest.draw_date}
    </h2>
    <div class="space-y-2">
      {#each data.latest.results as r}
        <div class="flex items-center gap-3">
          <span class="w-36 text-sm text-gray-500 shrink-0">
            {PRIZE_LABEL[r.prize_name] ?? r.prize_name}
          </span>
          <span class="font-mono font-semibold text-gray-800">{r.value}</span>
          <span class="text-xs text-gray-400 font-mono">→ {r.value.slice(-2)}</span>
        </div>
      {/each}
    </div>
    <a href="/thong-ke" class="mt-4 inline-block text-sm text-blue-600 hover:underline">
      Xem thống kê đầy đủ →
    </a>
  </div>
{:else}
  <div class="bg-white border rounded-xl p-6 shadow-sm">
    <h2 class="text-lg font-semibold mb-2 text-gray-700">Kỳ xổ số gần nhất</h2>
    <p class="text-gray-400 text-sm">Chưa có dữ liệu. <a href="/nhap-lieu" class="text-blue-500 hover:underline">Nhập kết quả đầu tiên →</a></p>
  </div>
{/if}
