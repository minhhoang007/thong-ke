<svelte:head>
  <title>Dashboard — XoSo Stats</title>
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
</script>

<h1 class="text-2xl font-bold mb-6 text-gray-800">Tổng quan</h1>

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
