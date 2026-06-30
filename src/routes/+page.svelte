<svelte:head>
  <title>Dashboard — Times</title>
</svelte:head>

<script>
  let { data } = $props();

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

  const PRIZE_SHORT = {
    giai_db:   'ĐB',
    giai_nhat: '1',
    giai_nhi:  '2',
    giai_ba:   '3',
    giai_tu:   '4',
    giai_nam:  '5',
    giai_sau:  '6',
    giai_bay:  '7',
  };

  const PRIZE_ORDER = ['giai_db','giai_nhat','giai_nhi','giai_ba','giai_tu','giai_nam','giai_sau','giai_bay'];

  const PROVINCE_LABEL = {
    'mien-bac':   'Miền Bắc',
    'mien-trung': 'Miền Trung',
    'mien-nam':   'Miền Nam',
  };

  // Nhóm kết quả theo giải, đúng thứ tự
  const prizeGroups = $derived.by(() => {
    if (!data.latest?.results) return [];
    const map = {};
    for (const r of data.latest.results) {
      if (!map[r.prize_name]) map[r.prize_name] = [];
      map[r.prize_name].push(r.value);
    }
    return PRIZE_ORDER.map(k => ({ key: k, values: map[k] ?? [] })).filter(g => g.values.length);
  });

  const gdbValue = $derived(prizeGroups.find(g => g.key === 'giai_db')?.values[0] ?? null);
  const otherPrizes = $derived(prizeGroups.filter(g => g.key !== 'giai_db'));

  let scrapeStatus    = $state('idle');
  let scrapeResults   = $state([]);
  let scrapeProvinces = $state(['mien-bac']);

  async function handleDailyScrape() {
    scrapeStatus = 'loading';
    try {
      const res  = await fetch('/api/daily-scrape', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ provinces: scrapeProvinces }),
      });
      const json = await res.json();
      scrapeResults = json.results ?? [];
      scrapeStatus  = 'done';
    } catch {
      scrapeStatus = 'error';
    }
  }
</script>

<!-- Header + scrape -->
<div class="flex items-center justify-between mb-6 flex-wrap gap-3">
  <h1 class="text-2xl font-bold text-gray-800">Tổng quan</h1>

  <div class="flex items-center gap-3 flex-wrap">
    {#if data.todayInDb}
      <span class="text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-1.5 font-medium">
        ✓ Đã có kết quả {data.todayVN}
      </span>
    {:else if !data.resultsAvailable}
      <span class="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
        Kết quả {data.todayVN} chưa có — XSMB công bố sau 18:35 (giờ VN)
      </span>
    {:else}
      <div class="flex flex-col gap-2 items-end">
        <div class="flex gap-3 text-xs text-gray-600">
          {#each Object.entries(PROVINCE_LABEL) as [val, label]}
            <label class="flex items-center gap-1 cursor-pointer select-none">
              <input type="checkbox" bind:group={scrapeProvinces} value={val} class="accent-blue-600" />
              {label}
            </label>
          {/each}
        </div>
        <button onclick={handleDailyScrape}
          disabled={scrapeStatus === 'loading' || scrapeProvinces.length === 0}
          class="flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg font-medium transition-colors
                 {scrapeStatus === 'loading' || scrapeProvinces.length === 0
                   ? 'bg-blue-100 text-blue-400 cursor-not-allowed'
                   : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'}">
          {#if scrapeStatus === 'loading'}
            <span class="animate-spin text-base">⟳</span> Đang cập nhật...
          {:else}
            ↓ Cập nhật kết quả hôm nay
          {/if}
        </button>
      </div>
    {/if}

    {#if scrapeStatus === 'done'}
      <div class="text-xs text-gray-500 flex flex-col gap-1 mt-1">
        {#each scrapeResults as r}
          <span class="flex items-center gap-1.5">
            <span class="text-gray-400">{r.date} · {PROVINCE_LABEL[r.province] ?? r.province}:</span>
            {#if r.status === 'saved'}
              <span class="text-green-600 font-medium">✓ Đã lưu</span>
              {#if r.sourceLabel}
                <span class="text-gray-400">({r.sourceLabel}{r.partial ? ', thiếu giải' : ''})</span>
              {/if}
            {:else if r.status === 'skipped'}
              <span class="text-gray-400">Đã có</span>
            {:else if r.status === 'no_data'}
              <span class="text-orange-500">Chưa có kết quả</span>
            {:else}
              <span class="text-red-500">Lỗi</span>
            {/if}
          </span>
        {/each}
      </div>
    {:else if scrapeStatus === 'error'}
      <span class="text-xs text-red-500">Lỗi kết nối</span>
    {/if}
  </div>
</div>

<!-- 4 stat cards -->
<div class="grid grid-cols-2 gap-3 mb-6 md:grid-cols-4">
  <div class="rounded-xl p-4 bg-blue-600 text-white shadow-sm">
    <p class="text-xs font-medium opacity-75 uppercase tracking-wide">Tổng kỳ</p>
    <p class="text-3xl font-bold mt-1">{data.total}</p>
    <p class="text-xs opacity-60 mt-0.5">kỳ đã lưu</p>
  </div>
  <div class="rounded-xl p-4 bg-white border shadow-sm">
    <p class="text-xs font-medium text-gray-400 uppercase tracking-wide">Cặp nổi bật</p>
    <p class="text-3xl font-bold mt-1 font-mono text-gray-800">
      {data.topPairs[0]?.pair ?? '—'}
    </p>
    {#if data.topPairs[0]}
      <p class="text-xs text-gray-400 mt-0.5">{data.topPairs[0].count} lần xuất hiện</p>
    {/if}
  </div>
  <div class="rounded-xl p-4 bg-white border shadow-sm">
    <p class="text-xs font-medium text-gray-400 uppercase tracking-wide">Kỳ gần nhất</p>
    <p class="text-lg font-bold mt-1 text-gray-800">
      {data.latest ? data.latest.draw_date : '—'}
    </p>
    {#if data.latest}
      <p class="text-xs text-gray-400 mt-0.5">{PROVINCE_LABEL[data.latest.province] ?? data.latest.province}</p>
    {/if}
  </div>
  <div class="rounded-xl p-4 bg-white border shadow-sm">
    <p class="text-xs font-medium text-gray-400 uppercase tracking-wide">Hôm nay</p>
    <p class="text-sm font-bold mt-1 text-gray-800">{data.todayVN}</p>
    {#if data.todayInDb}
      <p class="text-xs text-green-600 mt-0.5">✓ Đã có dữ liệu</p>
    {:else if data.resultsAvailable}
      <p class="text-xs text-amber-600 mt-0.5">Chưa scrape</p>
    {:else}
      <p class="text-xs text-gray-400 mt-0.5">Chưa xổ</p>
    {/if}
  </div>
</div>

<!-- Gợi ý hôm nay -->
{#if data.soiCau.length > 0}
  <div class="bg-white border rounded-xl p-5 shadow-sm mb-6">
    <div class="flex items-baseline gap-2 mb-1">
      <h2 class="text-base font-semibold text-gray-700">Gợi ý hôm nay</h2>
      <span class="text-xs text-gray-400">Soi cầu tự động</span>
    </div>
    <p class="text-xs text-gray-400 mb-4">
      Tổng hợp từ lô gan (60%) + tần suất 30 kỳ gần nhất (40%). Chỉ mang tính tham khảo.
    </p>
    <div class="flex flex-wrap gap-3">
      {#each data.soiCau as item, i}
        <div class="flex flex-col items-center bg-indigo-50 border border-indigo-200 rounded-xl px-5 py-3 min-w-[80px]">
          <span class="text-xs text-indigo-400 font-medium mb-0.5">#{i + 1}</span>
          <span class="font-mono font-bold text-2xl text-indigo-700">{item.pair}</span>
          <span class="text-xs text-indigo-500 mt-1">Gan {item.gan} kỳ</span>
          <span class="text-xs text-gray-400">Ra {item.recentCount}x/30</span>
        </div>
      {/each}
    </div>
    <div class="mt-3 flex gap-4 text-xs">
      <a href="/lo-gan"   class="text-indigo-600 hover:underline">Lô gan đầy đủ →</a>
      <a href="/thong-ke" class="text-blue-600   hover:underline">Thống kê chi tiết →</a>
    </div>
  </div>
{/if}

<!-- Bảng kết quả kỳ gần nhất -->
{#if data.latest}
  <div class="bg-white border rounded-xl shadow-sm overflow-hidden">

    <!-- Card header -->
    <div class="flex items-center justify-between px-5 py-3 border-b bg-gray-50">
      <div>
        <span class="font-semibold text-gray-700 text-base">Kỳ gần nhất</span>
        <span class="ml-2 text-sm text-gray-400">{data.latest.draw_date}</span>
      </div>
      <span class="text-xs bg-blue-100 text-blue-700 font-medium rounded-full px-3 py-1">
        {PROVINCE_LABEL[data.latest.province] ?? data.latest.province}
      </span>
    </div>

    <!-- Giải đặc biệt — hero -->
    {#if gdbValue}
      <div class="flex flex-col items-center py-5 border-b bg-gradient-to-b from-blue-50 to-white">
        <span class="text-xs font-semibold text-blue-500 uppercase tracking-widest mb-2">Giải đặc biệt</span>
        <div class="font-mono font-black text-5xl tracking-wider text-gray-900">
          {gdbValue.slice(0, -2)}<span class="text-blue-600">{gdbValue.slice(-2)}</span>
        </div>
      </div>
    {/if}

    <!-- Các giải còn lại -->
    <div class="divide-y">
      {#each otherPrizes as g}
        {@const isHighlight = g.key === 'giai_nhat'}
        <div class="flex items-baseline gap-4 px-5 py-2.5
                    {isHighlight ? 'bg-yellow-50/60' : ''}">

          <!-- Nhãn giải -->
          <div class="shrink-0 w-20 text-right">
            <span class="text-xs font-semibold
                         {isHighlight ? 'text-yellow-600' : 'text-gray-400'}">
              {PRIZE_LABEL[g.key]}
            </span>
          </div>

          <!-- Các số -->
          <div class="flex flex-wrap gap-x-4 gap-y-1">
            {#each g.values as v}
              <span class="font-mono text-sm text-gray-700">
                {v.slice(0, -2)}<span class="font-bold text-blue-600">{v.slice(-2)}</span>
              </span>
            {/each}
          </div>
        </div>
      {/each}
    </div>

    <!-- Footer -->
    <div class="px-5 py-3 border-t bg-gray-50 flex gap-4 text-xs">
      <a href="/thong-ke" class="text-blue-600 hover:underline">Thống kê đầy đủ →</a>
      <a href="/lich-su"  class="text-gray-500 hover:underline">Xem lịch sử →</a>
    </div>
  </div>

{:else}
  <div class="bg-white border rounded-xl p-8 shadow-sm text-center">
    <p class="text-gray-400 text-sm mb-3">Chưa có dữ liệu nào.</p>
    <a href="/nhap-lieu" class="inline-block text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
      Nhập kết quả đầu tiên →
    </a>
  </div>
{/if}
