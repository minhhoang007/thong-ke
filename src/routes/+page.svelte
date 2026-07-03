<svelte:head>
  <title>Dashboard — Times</title>
</svelte:head>

<script>
  import { invalidateAll } from '$app/navigation';

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

  let scrapeStatus  = $state('idle');
  let scrapeResults = $state([]);

  async function handleDailyScrape() {
    scrapeStatus = 'loading';
    try {
      const res  = await fetch('/api/daily-scrape', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({}),
      });
      const json = await res.json();
      scrapeResults = json.results ?? [];
      scrapeStatus  = 'done';
      // Nạp lại dữ liệu server (total, latest, soiCau, todayInDb...) để Dashboard tự cập nhật
      if (json.saved > 0 || json.partial > 0) await invalidateAll();
    } catch {
      scrapeStatus = 'error';
    }
  }
</script>

<!-- Header + scrape -->
<div class="page-heading">
  <div>
    <div class="eyebrow">Bảng điều khiển</div>
    <h1>Tổng quan dữ liệu</h1>
    <p>Theo dõi kỳ xổ mới nhất, xu hướng nổi bật và tình trạng cập nhật hôm nay.</p>
  </div>

  <div class="flex items-center gap-3 flex-wrap">
    {#if data.todayInDb}
      <span class="status-pill status-pill-success">
        ✓ Đã có kết quả {data.todayVN}
      </span>
    {:else if !data.resultsAvailable}
      <span class="status-pill status-pill-warning max-w-md leading-relaxed">
        Kết quả {data.todayVN} chưa có — XSMB công bố sau 18:35 (giờ VN)
      </span>
    {:else}
      <button onclick={handleDailyScrape}
        disabled={scrapeStatus === 'loading'}
        class="action-primary
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
      <div class="text-xs text-gray-500 flex flex-col gap-1 mt-1">
        {#each scrapeResults as r}
          <span class="flex items-center gap-1.5">
            <span class="text-gray-400">{r.date}:</span>
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
<div class="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
  <div class="metric-card metric-card-primary">
    <p class="metric-label">Tổng kỳ</p>
    <p class="metric-value">{data.total}</p>
    <p class="metric-note">kỳ đã lưu</p>
  </div>
  <div class="metric-card">
    <p class="metric-label">Cặp nổi bật</p>
    <p class="metric-value mono-number text-indigo-600">
      {data.topPairs[0]?.pair ?? '—'}
    </p>
    {#if data.topPairs[0]}
      <p class="metric-note">{data.topPairs[0].count} lần xuất hiện</p>
    {/if}
  </div>
  <div class="metric-card">
    <p class="metric-label">Kỳ gần nhất</p>
    <p class="mt-3 text-base font-extrabold text-slate-800 sm:text-lg">
      {data.latest ? data.latest.draw_date : '—'}
    </p>
    {#if data.latest}
      <p class="metric-note">Miền Bắc</p>
    {/if}
  </div>
  <div class="metric-card">
    <p class="metric-label">Hôm nay</p>
    <p class="mt-3 text-base font-extrabold text-slate-800">{data.todayVN}</p>
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
  <section class="surface-card card-pad mb-6">
    <div class="section-heading">
      <div>
        <div class="eyebrow">Điểm nhấn</div>
        <h2>Gợi ý hôm nay</h2>
      </div>
      <span class="status-pill">Soi cầu tự động</span>
    </div>
    <p class="text-xs text-gray-400 mb-4">
      Tổng hợp từ lô gan (60%) + tần suất 30 kỳ gần nhất (40%). Chỉ mang tính tham khảo.
    </p>
    <div class="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-5">
      {#each data.soiCau as item, i}
        <div class="rounded-2xl border border-indigo-100 bg-gradient-to-b from-indigo-50 to-white px-3 py-3 text-center">
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
  </section>
{/if}

<!-- Bảng kết quả kỳ gần nhất -->
{#if data.latest}
  <section class="surface-card overflow-hidden">

    <!-- Card header -->
    <div class="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/70 px-4 py-3.5 sm:px-6">
      <div>
        <span class="font-semibold text-gray-700 text-base">Kỳ gần nhất</span>
        <span class="ml-2 text-sm text-gray-400">{data.latest.draw_date}</span>
      </div>
      <span class="text-xs bg-blue-100 text-blue-700 font-medium rounded-full px-3 py-1">
        Miền Bắc
      </span>
    </div>

    <!-- Giải đặc biệt — hero -->
    {#if gdbValue}
      <div class="flex flex-col items-center border-b border-blue-100 bg-gradient-to-b from-blue-50 via-blue-50/40 to-white px-4 py-7">
        <span class="text-xs font-semibold text-blue-500 uppercase tracking-widest mb-2">Giải đặc biệt</span>
        <div class="mono-number text-4xl font-black tracking-[.12em] text-slate-900 sm:text-5xl">
          {gdbValue.slice(0, -2)}<span class="text-blue-600">{gdbValue.slice(-2)}</span>
        </div>
      </div>
    {/if}

    <!-- Các giải còn lại -->
    <div class="divide-y">
      {#each otherPrizes as g}
        {@const isHighlight = g.key === 'giai_nhat'}
        <div class="flex items-start gap-3 px-3 py-3 sm:items-baseline sm:gap-5 sm:px-6
                    {isHighlight ? 'bg-yellow-50/60' : ''}">

          <!-- Nhãn giải -->
          <div class="w-16 shrink-0 text-left sm:w-24 sm:text-right">
            <span class="text-xs font-semibold
                         {isHighlight ? 'text-yellow-600' : 'text-gray-400'}">
              {PRIZE_LABEL[g.key]}
            </span>
          </div>

          <!-- Các số -->
          <div class="flex flex-1 flex-wrap gap-x-3 gap-y-1.5 sm:gap-x-5">
            {#each g.values as v}
              <span class="mono-number text-sm text-slate-700 sm:text-[15px]">
                {v.slice(0, -2)}<span class="font-bold text-blue-600">{v.slice(-2)}</span>
              </span>
            {/each}
          </div>
        </div>
      {/each}
    </div>

    <!-- Footer -->
    <div class="flex flex-wrap gap-4 border-t border-slate-100 bg-slate-50/70 px-4 py-3 text-xs sm:px-6">
      <a href="/thong-ke" class="text-blue-600 hover:underline">Thống kê đầy đủ →</a>
      <a href="/lich-su"  class="text-gray-500 hover:underline">Xem lịch sử →</a>
    </div>
  </section>

{:else}
  <div class="surface-card card-pad text-center">
    <p class="text-gray-400 text-sm mb-3">Chưa có dữ liệu nào.</p>
    <a href="/nhap-lieu" class="inline-block text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
      Nhập kết quả đầu tiên →
    </a>
  </div>
{/if}
