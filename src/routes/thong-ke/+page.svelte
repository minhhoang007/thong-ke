<svelte:head>
  <title>Thống kê — Times</title>
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

  let selectedWindow = $derived(data.filterWindow ?? null);

  // window và period là mutually exclusive: window xóa period và ngược lại
  function buildUrl({ period, prize, win }) {
    const params = new URLSearchParams();
    if (win) {
      params.set('window', win);
    } else if (period) {
      const [y, m] = period.split('-');
      params.set('year', y);
      params.set('month', m);
    }
    if (prize && prize !== 'all') params.set('prize', prize);
    const qs = params.toString();
    return '/thong-ke' + (qs ? '?' + qs : '');
  }

  function onPeriodChange(e) {
    goto(buildUrl({ period: e.target.value, prize: selectedPrize, win: null }));
  }

  function onPrizeChange(e) {
    goto(buildUrl({ period: selectedPeriod, prize: e.target.value, win: selectedWindow }));
  }

  function onWindowClick(w) {
    goto(buildUrl({ period: null, prize: selectedPrize, win: selectedWindow === w ? null : w }));
  }

  const WINDOWS = [
    { value: 7,  label: '7 kỳ' },
    { value: 30, label: '30 kỳ' },
    { value: 90, label: '90 kỳ' },
  ];

  let prizeLabel = $derived(
    PRIZE_OPTIONS.find(o => o.value === selectedPrize)?.label ?? 'Tất cả giải'
  );
  let periodLabel = $derived(selectedPeriod ? formatPeriod(selectedPeriod) : '');

  function trendArrow(pair) {
    const t = data.comparison?.trendMap?.[pair];
    return t === 'up' ? '↑' : t === 'down' ? '↓' : '';
  }
  function trendColor(pair) {
    const t = data.comparison?.trendMap?.[pair];
    return t === 'up' ? 'text-green-600' : t === 'down' ? 'text-red-500' : '';
  }

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
        disabled={!!selectedWindow}
        class="border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white
               disabled:opacity-40 disabled:cursor-not-allowed">
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

<!-- Cửa sổ thời gian (N kỳ gần nhất) -->
<div class="flex items-center gap-2 mb-3 flex-wrap">
  <span class="text-xs text-gray-400 shrink-0">Cửa sổ:</span>
  <button onclick={() => onWindowClick(null)}
    class="text-xs px-3 py-1 rounded-full border transition-colors
           {!selectedWindow ? 'bg-blue-600 text-white border-blue-600' : 'text-gray-500 hover:bg-gray-100'}">
    Tất cả
  </button>
  {#each WINDOWS as w}
    <button onclick={() => onWindowClick(w.value)}
      class="text-xs px-3 py-1 rounded-full border transition-colors
             {selectedWindow === w.value ? 'bg-blue-600 text-white border-blue-600' : 'text-gray-500 hover:bg-gray-100'}">
      {w.label}
    </button>
  {/each}
  {#if selectedWindow}
    <span class="text-xs text-blue-500 ml-1">— {selectedWindow} kỳ gần nhất · bộ lọc tháng tạm dừng</span>
  {/if}
  <span class="ml-auto text-xs text-gray-300 flex items-center gap-1">
    <span class="text-green-600 font-bold">↑</span> tăng so với TB 30 kỳ ·
    <span class="text-red-500 font-bold">↓</span> giảm
  </span>
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
                  {#if trendArrow(cell.pair)}
                    <div class="text-xs font-bold leading-none {trendColor(cell.pair)}">{trendArrow(cell.pair)}</div>
                  {/if}
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
  <div class="border-t pt-6 mb-8">
    <h2 class="text-lg font-bold text-gray-700 mb-1">Xu hướng theo tháng</h2>
    <p class="text-xs text-gray-400 mb-4">Top 5 cặp xuất hiện nhiều nhất — tính trên toàn bộ dữ liệu, tất cả giải</p>

    <div class="bg-white border rounded-xl p-4 shadow-sm">
      <TrendChart data={data.trend} title="Số lần xuất hiện mỗi tháng" />
    </div>
  </div>
{/if}

<!-- ── Section Biến động 7 ngày vs 30 kỳ ── -->
{#if data.comparison.n30 >= 7}
  <div class="border-t pt-6 mb-8">
    <div class="flex items-baseline gap-3 mb-1">
      <h2 class="text-lg font-bold text-gray-700">Biến động gần đây</h2>
      <span class="text-xs text-gray-400">7 kỳ vs 30 kỳ gần nhất</span>
    </div>
    <p class="text-xs text-gray-400 mb-4">
      So sánh tỷ lệ xuất hiện trong <strong>7 kỳ gần nhất</strong> với nền 30 kỳ.
      Cặp <span class="text-green-600 font-medium">Tăng</span> đang ra nhiều hơn bình thường gần đây —
      cặp <span class="text-red-500 font-medium">Giảm</span> đang "lạnh" hơn so với 1 tháng trước.
    </p>

    <div class="grid grid-cols-1 gap-4 md:grid-cols-2">

      <!-- Tăng -->
      <div class="bg-white border rounded-xl shadow-sm overflow-hidden">
        <div class="px-4 py-3 border-b bg-green-50 flex items-center gap-2">
          <span class="text-green-700 font-semibold text-sm">↑ Tăng mạnh nhất</span>
          <span class="text-xs text-green-400 ml-auto">7 kỳ / 30 kỳ</span>
        </div>
        <div class="divide-y">
          {#each data.comparison.moversUp as item}
            <div class="px-4 py-2.5 flex items-center gap-3">
              <span class="font-mono font-bold text-lg text-green-700 w-10 shrink-0">{item.pair}</span>
              <div class="flex-1">
                <div class="flex items-center gap-1 text-xs text-gray-500 mb-1">
                  <span class="text-green-600 font-medium">{item.count7}x</span>
                  <span class="text-gray-300">/7 kỳ</span>
                  <span class="mx-1 text-gray-300">·</span>
                  <span>{item.count30}x</span>
                  <span class="text-gray-300">/30 kỳ</span>
                </div>
                <div class="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                  <div class="h-full rounded-full bg-green-400 transition-all"
                    style="width: {Math.min(100, (item.rate7 / Math.max(...data.comparison.moversUp.map(m => m.rate7), 0.01)) * 100).toFixed(1)}%">
                  </div>
                </div>
              </div>
              <span class="text-xs text-green-600 font-semibold w-16 text-right shrink-0">
                +{(item.diff * 100).toFixed(1)}%
              </span>
            </div>
          {/each}
          {#if data.comparison.moversUp.length === 0}
            <p class="px-4 py-3 text-sm text-gray-400">Không có cặp tăng.</p>
          {/if}
        </div>
      </div>

      <!-- Giảm -->
      <div class="bg-white border rounded-xl shadow-sm overflow-hidden">
        <div class="px-4 py-3 border-b bg-red-50 flex items-center gap-2">
          <span class="text-red-600 font-semibold text-sm">↓ Giảm mạnh nhất</span>
          <span class="text-xs text-red-400 ml-auto">7 kỳ / 30 kỳ</span>
        </div>
        <div class="divide-y">
          {#each data.comparison.moversDown as item}
            <div class="px-4 py-2.5 flex items-center gap-3">
              <span class="font-mono font-bold text-lg text-red-600 w-10 shrink-0">{item.pair}</span>
              <div class="flex-1">
                <div class="flex items-center gap-1 text-xs text-gray-500 mb-1">
                  <span class="text-red-500 font-medium">{item.count7}x</span>
                  <span class="text-gray-300">/7 kỳ</span>
                  <span class="mx-1 text-gray-300">·</span>
                  <span>{item.count30}x</span>
                  <span class="text-gray-300">/30 kỳ</span>
                </div>
                <div class="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                  <div class="h-full rounded-full bg-red-300 transition-all"
                    style="width: {Math.min(100, (item.count30 / Math.max(...data.comparison.moversDown.map(m => m.count30), 1)) * 100).toFixed(1)}%">
                  </div>
                </div>
              </div>
              <span class="text-xs text-red-500 font-semibold w-16 text-right shrink-0">
                {(item.diff * 100).toFixed(1)}%
              </span>
            </div>
          {/each}
          {#if data.comparison.moversDown.length === 0}
            <p class="px-4 py-3 text-sm text-gray-400">Không có cặp giảm.</p>
          {/if}
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- ── Section Đầu / Đuôi ── -->
{#if data.dauDuoi.total > 0}
  <div class="border-t pt-6 mb-8">
    <h2 class="text-lg font-bold text-gray-700 mb-1">Thống kê Đầu / Đuôi</h2>
    <p class="text-xs text-gray-400 mb-1">
      <strong>Đầu</strong> = chữ số hàng chục của 2 số cuối (ví dụ: <span class="font-mono">73</span> → đầu <span class="font-mono">7</span>) ·
      <strong>Đuôi</strong> = chữ số hàng đơn vị (→ đuôi <span class="font-mono">3</span>)
    </p>
    <p class="text-xs text-gray-500 mb-4">
      Dùng để chọn "lô theo đầu" hoặc "lô theo đuôi" — ví dụ: đánh tất cả các cặp có đuôi 7 (07, 17, 27 … 97).
      Tổng mẫu: {data.dauDuoi.total.toLocaleString()} lần xuất hiện.
    </p>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">

      <!-- Đầu -->
      <div class="bg-white border rounded-xl shadow-sm overflow-hidden">
        <div class="px-4 py-3 border-b bg-blue-50">
          <span class="font-semibold text-blue-700 text-sm">Đầu (chữ số hàng chục)</span>
        </div>
        <div class="p-4 space-y-2">
          {#each data.dauDuoi.dau as item}
            {@const max = Math.max(...data.dauDuoi.dau.map(d => d.count), 1)}
            {@const pct = (item.count / data.dauDuoi.total * 100).toFixed(1)}
            <div class="flex items-center gap-3">
              <span class="font-mono font-bold text-blue-700 w-4 shrink-0">{item.digit}</span>
              <div class="flex-1 h-5 bg-gray-100 rounded overflow-hidden">
                <div class="h-full bg-blue-400 rounded transition-all"
                  style="width: {(item.count / max * 100).toFixed(1)}%"></div>
              </div>
              <span class="text-xs text-gray-600 w-12 text-right shrink-0">{item.count}x</span>
              <span class="text-xs text-gray-400 w-10 text-right shrink-0">{pct}%</span>
            </div>
          {/each}
        </div>
      </div>

      <!-- Đuôi -->
      <div class="bg-white border rounded-xl shadow-sm overflow-hidden">
        <div class="px-4 py-3 border-b bg-violet-50">
          <span class="font-semibold text-violet-700 text-sm">Đuôi (chữ số hàng đơn vị)</span>
        </div>
        <div class="p-4 space-y-2">
          {#each data.dauDuoi.duoi as item}
            {@const max = Math.max(...data.dauDuoi.duoi.map(d => d.count), 1)}
            {@const pct = (item.count / data.dauDuoi.total * 100).toFixed(1)}
            <div class="flex items-center gap-3">
              <span class="font-mono font-bold text-violet-700 w-4 shrink-0">{item.digit}</span>
              <div class="flex-1 h-5 bg-gray-100 rounded overflow-hidden">
                <div class="h-full bg-violet-400 rounded transition-all"
                  style="width: {(item.count / max * 100).toFixed(1)}%"></div>
              </div>
              <span class="text-xs text-gray-600 w-12 text-right shrink-0">{item.count}x</span>
              <span class="text-xs text-gray-400 w-10 text-right shrink-0">{pct}%</span>
            </div>
          {/each}
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- ── Section Tổng Giải Đặc Biệt ── -->
{#if data.tongGDB.total > 0}
  <div class="border-t pt-6">
    <h2 class="text-lg font-bold text-gray-700 mb-1">Tổng Giải Đặc Biệt</h2>
    <p class="text-xs text-gray-400 mb-1">
      Tổng 2 chữ số cuối của giải đặc biệt (ví dụ: <span class="font-mono">73 → 7+3 = 10</span>).
      Giá trị từ 0 đến 18.
    </p>
    <p class="text-xs text-gray-500 mb-4">
      Nhiều người chơi chọn cặp số có tổng bằng giá trị tổng đang "hot" — hoặc chọn chẵn/lẻ dựa trên xu hướng.
      Tổng mẫu: {data.tongGDB.total} kỳ giải đặc biệt.
    </p>

    <!-- Chẵn / Lẻ -->
    <div class="grid grid-cols-2 gap-3 mb-4">
      <div class="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
        <p class="text-xs text-green-600 mb-1">Giải ĐB chẵn</p>
        <p class="text-3xl font-bold text-green-700">{data.tongGDB.chan}</p>
        <p class="text-xs text-green-500 mt-0.5">
          {data.tongGDB.total > 0 ? (data.tongGDB.chan / data.tongGDB.total * 100).toFixed(1) : 0}%
        </p>
      </div>
      <div class="bg-orange-50 border border-orange-200 rounded-xl p-4 text-center">
        <p class="text-xs text-orange-600 mb-1">Giải ĐB lẻ</p>
        <p class="text-3xl font-bold text-orange-700">{data.tongGDB.le}</p>
        <p class="text-xs text-orange-500 mt-0.5">
          {data.tongGDB.total > 0 ? (data.tongGDB.le / data.tongGDB.total * 100).toFixed(1) : 0}%
        </p>
      </div>
    </div>

    <!-- Bar chart tổng 0–18 -->
    <div class="bg-white border rounded-xl shadow-sm p-4">
      <p class="text-xs text-gray-500 mb-3">Tần suất từng giá trị tổng (0 → 18)</p>
      <div class="space-y-1.5">
        {#each data.tongGDB.tong as item}
          {@const max = Math.max(...data.tongGDB.tong.map(t => t.count), 1)}
          {@const pct = (item.count / data.tongGDB.total * 100).toFixed(1)}
          <div class="flex items-center gap-3">
            <span class="font-mono text-xs text-gray-600 w-5 text-right shrink-0">{item.value}</span>
            <div class="flex-1 h-5 bg-gray-100 rounded overflow-hidden">
              <div class="h-full bg-emerald-400 rounded transition-all"
                style="width: {(item.count / max * 100).toFixed(1)}%"></div>
            </div>
            <span class="text-xs text-gray-600 w-10 text-right shrink-0">{item.count}x</span>
            <span class="text-xs text-gray-400 w-9 text-right shrink-0">{pct}%</span>
          </div>
        {/each}
      </div>
    </div>
  </div>
{/if}
