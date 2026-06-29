<svelte:head>
  <title>Thống kê — XoSo Stats</title>
</svelte:head>

<script>
  import { goto } from '$app/navigation';
  import FrequencyChart from '$components/FrequencyChart.svelte';
  import TrendChart     from '$components/TrendChart.svelte';

  let { data } = $props();

  const PRIZE_OPTIONS = [
    { value: 'all',       label: 'Tất cả giải' },
    { value: 'giai_db',   label: 'Giải đặc biệt' },
    { value: 'giai_nhat', label: 'Giải nhất' },
    { value: 'giai_nhi',  label: 'Giải nhì' },
    { value: 'giai_ba',   label: 'Giải ba' },
    { value: 'giai_tu',   label: 'Giải tư' },
    { value: 'giai_nam',  label: 'Giải năm' },
    { value: 'giai_sau',  label: 'Giải sáu' },
    { value: 'giai_bay',  label: 'Giải bảy' },
  ];

  const COLOR = {
    'manh':      'bg-green-200 text-green-900 font-bold',
    'vua':       'bg-gray-50 text-gray-700',
    'yeu':       'bg-orange-100 text-orange-800',
    'tham-khao': 'bg-gray-200 text-gray-400',
  };
  const LABEL_VI = { 'manh': 'Mạnh', 'vua': 'Vừa', 'yeu': 'Yếu', 'tham-khao': 'Tham khảo' };

  // Derived từ server data — URL là nguồn sự thật, không cần local state
  let selectedPeriod = $derived(
    data.filterYear && data.filterMonth
      ? `${data.filterYear}-${String(data.filterMonth).padStart(2,'0')}`
      : ''
  );
  let selectedPrize = $derived(data.filterPrize || 'all');

  function formatPeriod(p) {
    if (!p) return 'Toàn bộ';
    const [y, m] = p.split('-');
    return `Tháng ${parseInt(m)}/${y}`;
  }

  function buildUrl(period, prize) {
    const params = new URLSearchParams();
    if (period) {
      const [y, m] = period.split('-');
      params.set('year', y);
      params.set('month', m);
    }
    if (prize && prize !== 'all') params.set('prize', prize);
    const qs = params.toString();
    return '/thong-ke' + (qs ? '?' + qs : '');
  }

  function onPeriodChange(e) {
    goto(buildUrl(e.target.value, selectedPrize));
  }

  function onPrizeChange(e) {
    goto(buildUrl(selectedPeriod, e.target.value));
  }

  let prizeLabel = $derived(
    PRIZE_OPTIONS.find(o => o.value === selectedPrize)?.label ?? 'Tất cả giải'
  );
  let periodLabel = $derived(selectedPeriod ? formatPeriod(selectedPeriod) : '');

  function exportUrl() {
    const p = new URLSearchParams();
    if (selectedPeriod) {
      const [y, m] = selectedPeriod.split('-');
      p.set('year', y); p.set('month', m);
    }
    if (selectedPrize !== 'all') p.set('prize', selectedPrize);
    const qs = p.toString();
    return '/api/export' + (qs ? '?' + qs : '');
  }
</script>

<!-- Header + bộ lọc -->
<div class="flex items-start justify-between gap-4 mb-2 flex-wrap">
  <h1 class="text-2xl font-bold text-gray-800">Thống kê tần suất</h1>

  <div class="flex items-center gap-3 flex-wrap">
    <a href={exportUrl()} download
      class="text-xs px-3 py-1.5 rounded-lg border border-green-300 text-green-700 hover:bg-green-50 shrink-0">
      ↓ Xuất CSV
    </a>
    <div class="flex items-center gap-2">
      <label for="period-select" class="text-sm text-gray-500 shrink-0">Thời gian:</label>
      <select id="period-select" value={selectedPeriod} onchange={onPeriodChange}
        class="border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white">
        <option value="">Toàn bộ</option>
        {#each data.periods as p}
          <option value={p}>{formatPeriod(p)}</option>
        {/each}
      </select>
    </div>

    <div class="flex items-center gap-2">
      <label for="prize-select" class="text-sm text-gray-500 shrink-0">Giải:</label>
      <select id="prize-select" value={selectedPrize} onchange={onPrizeChange}
        class="border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white">
        {#each PRIZE_OPTIONS as o}
          <option value={o.value}>{o.label}</option>
        {/each}
      </select>
    </div>
  </div>
</div>

<p class="text-sm text-gray-500 mb-6">
  {#if periodLabel}
    <span class="inline-flex items-center gap-1 bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-medium mr-1">
      {periodLabel}
    </span>
  {/if}
  {#if selectedPrize !== 'all'}
    <span class="inline-flex items-center gap-1 bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full text-xs font-medium mr-1">
      {prizeLabel}
    </span>
  {/if}
  {data.totalDraws} kỳ · {data.totalValues} lần xuất hiện
</p>

{#if data.totalDraws === 0}
  <div class="bg-white border rounded-xl p-8 text-center shadow-sm">
    <p class="text-gray-400 mb-3">
      {selectedPeriod || selectedPrize !== 'all'
        ? 'Không có dữ liệu với bộ lọc này.'
        : 'Chưa có dữ liệu nào.'}
    </p>
    {#if !selectedPeriod && selectedPrize === 'all'}
      <a href="/nhap-lieu" class="text-blue-600 hover:underline text-sm">Nhập kết quả đầu tiên →</a>
    {:else}
      <button onclick={() => goto('/thong-ke')} class="text-blue-600 hover:underline text-sm">
        Xem toàn bộ →
      </button>
    {/if}
  </div>
{:else}

  <!-- Biểu đồ cột tần suất -->
  <div class="bg-white border rounded-xl p-4 shadow-sm mb-4">
    <FrequencyChart grid={data.grid} title="Phân bố tần suất 00–99" />
  </div>

  <!-- Chú thích màu -->
  <div class="flex gap-3 mb-4 flex-wrap">
    {#each Object.entries(COLOR) as [key, cls]}
      <span class="px-3 py-1 rounded-full text-xs {cls} border border-black/5">{LABEL_VI[key]}</span>
    {/each}
  </div>

  <!-- Bảng 10×10 -->
  <div class="bg-white border rounded-xl p-4 shadow-sm overflow-x-auto mb-8">
    <table class="w-full border-collapse">
      <thead>
        <tr>
          <th class="w-8 text-xs text-gray-400 font-normal pb-2"></th>
          {#each [0,1,2,3,4,5,6,7,8,9] as col}
            <th class="text-xs text-gray-400 font-normal pb-2 text-center">×{col}</th>
          {/each}
        </tr>
      </thead>
      <tbody>
        {#each data.grid as row, rowIdx}
          <tr>
            <td class="text-xs text-gray-400 pr-2 text-right">{rowIdx}×</td>
            {#each row as cell}
              <td class="p-0.5">
                <div class="rounded-lg p-1.5 text-center {COLOR[cell.label]} min-w-[44px]">
                  <div class="text-sm font-mono leading-none">{cell.pair}</div>
                  <div class="text-xs leading-none mt-0.5 opacity-80">{cell.count}x</div>
                </div>
              </td>
            {/each}
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

{/if}

<!-- ── Section Nóng / Lạnh ── -->
{#if data.hotCold.recentN > 0}
  <div class="border-t pt-6 mb-8">
    <div class="flex items-baseline gap-3 mb-1">
      <h2 class="text-lg font-bold text-gray-700">Nóng / Lạnh</h2>
      <span class="text-xs text-gray-400">{data.hotCold.recentN} kỳ gần nhất · {prizeLabel}</span>
    </div>
    <p class="text-xs text-gray-400 mb-4">Lạnh = chưa ra nhiều kỳ liên tiếp · Nóng = xuất hiện nhiều nhất gần đây</p>

    <div class="grid grid-cols-1 gap-4 md:grid-cols-2">

      <!-- Lạnh nhất -->
      <div class="bg-white border rounded-xl shadow-sm overflow-hidden">
        <div class="px-4 py-3 border-b bg-blue-50 flex items-center gap-2">
          <span class="text-blue-700 font-semibold text-sm">❄ Lạnh nhất</span>
          <span class="text-xs text-blue-400 ml-auto">số kỳ chưa ra</span>
        </div>
        <div class="divide-y">
          {#each data.hotCold.cold as item, i}
            <div class="px-4 py-2 flex items-center gap-3">
              <span class="text-xs text-gray-400 w-4 text-right">{i + 1}</span>
              <span class="font-mono font-bold text-lg text-blue-700 w-10">{item.pair}</span>
              <div class="flex-1">
                <div class="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    class="h-full rounded-full bg-blue-400"
                    style="width: {Math.min(100, (item.streak / data.hotCold.recentN) * 100)}%"
                  ></div>
                </div>
              </div>
              <span class="text-sm font-semibold text-blue-700 w-20 text-right shrink-0">
                {item.streak === data.hotCold.recentN ? `≥${item.streak}` : item.streak} kỳ
              </span>
            </div>
          {/each}
          {#if data.hotCold.cold.length === 0}
            <p class="px-4 py-3 text-sm text-gray-400">Không có cặp số lạnh.</p>
          {/if}
        </div>
      </div>

      <!-- Nóng nhất -->
      <div class="bg-white border rounded-xl shadow-sm overflow-hidden">
        <div class="px-4 py-3 border-b bg-orange-50 flex items-center gap-2">
          <span class="text-orange-700 font-semibold text-sm">🔥 Nóng nhất</span>
          <span class="text-xs text-orange-400 ml-auto">số lần trong {data.hotCold.recentN} kỳ</span>
        </div>
        <div class="divide-y">
          {#each data.hotCold.hot as item, i}
            {@const maxCount = data.hotCold.hot[0]?.count || 1}
            <div class="px-4 py-2 flex items-center gap-3">
              <span class="text-xs text-gray-400 w-4 text-right">{i + 1}</span>
              <span class="font-mono font-bold text-lg text-orange-600 w-10">{item.pair}</span>
              <div class="flex-1">
                <div class="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    class="h-full rounded-full bg-orange-400"
                    style="width: {Math.min(100, (item.count / maxCount) * 100)}%"
                  ></div>
                </div>
              </div>
              <span class="text-sm font-semibold text-orange-600 w-16 text-right shrink-0">
                {item.count} lần
              </span>
            </div>
          {/each}
          {#if data.hotCold.hot.length === 0}
            <p class="px-4 py-3 text-sm text-gray-400">Không có dữ liệu.</p>
          {/if}
        </div>
      </div>

    </div>
  </div>
{/if}

<!-- ── Section co-occurrence ── -->
{#if data.coOccurrence.length > 0}
  <div class="border-t pt-6 mb-8">
    <div class="flex items-baseline justify-between gap-3 mb-1 flex-wrap">
      <div>
        <h2 class="text-lg font-bold text-gray-700">Cặp đôi cùng kỳ</h2>
        <p class="text-xs text-gray-400 mt-0.5">Hai cặp số cùng xuất hiện trong một kỳ nhiều nhất · {prizeLabel}</p>
      </div>
    </div>

    <div class="bg-white border rounded-xl shadow-sm overflow-hidden mt-3">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b bg-gray-50 text-xs text-gray-500 font-medium">
            <th class="px-4 py-2 text-left w-8">#</th>
            <th class="px-4 py-2 text-center">Cặp A</th>
            <th class="px-4 py-2 text-center">Cặp B</th>
            <th class="px-4 py-2 text-right">Số kỳ cùng ra</th>
            <th class="px-2 py-2 text-left w-32"></th>
          </tr>
        </thead>
        <tbody class="divide-y">
          {#each data.coOccurrence as item, i}
            {@const maxCount = data.coOccurrence[0]?.count || 1}
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-2 text-gray-400">{i + 1}</td>
              <td class="px-4 py-2 text-center">
                <span class="font-mono font-bold text-blue-700 text-base">{item.a}</span>
              </td>
              <td class="px-4 py-2 text-center">
                <span class="font-mono font-bold text-violet-700 text-base">{item.b}</span>
              </td>
              <td class="px-4 py-2 text-right font-semibold text-gray-700">{item.count} kỳ</td>
              <td class="px-2 py-2">
                <div class="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                  <div class="h-full rounded-full bg-violet-300"
                    style="width: {Math.min(100, (item.count / maxCount) * 100)}%"></div>
                </div>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </div>
{/if}

<!-- ── Section xu hướng ── -->
{#if data.trend.periods.length > 0}
  <div class="border-t pt-6">
    <h2 class="text-lg font-bold text-gray-700 mb-1">Xu hướng theo tháng</h2>
    <p class="text-xs text-gray-400 mb-4">Top 5 cặp xuất hiện nhiều nhất — tính trên toàn bộ dữ liệu, tất cả giải</p>

    <div class="bg-white border rounded-xl p-4 shadow-sm">
      <TrendChart data={data.trend} title="Số lần xuất hiện mỗi tháng" />
    </div>
  </div>
{/if}
