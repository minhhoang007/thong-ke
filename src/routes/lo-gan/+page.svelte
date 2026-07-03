<svelte:head>
  <title>Lô Gan — Times</title>
</svelte:head>

<script>
  let { data } = $props();

  // Màu theo mức độ gan
  function ganColor(gan, total) {
    if (total === 0 || gan === 0) return 'bg-green-100 text-green-800';
    const pct = gan / total;
    if (pct >= 0.5)  return 'bg-red-200 text-red-900 font-bold';
    if (pct >= 0.25) return 'bg-orange-200 text-orange-900 font-semibold';
    if (pct >= 0.1)  return 'bg-yellow-100 text-yellow-800';
    return 'bg-gray-50 text-gray-600';
  }

  function ganLabel(gan) {
    if (gan === 0) return 'Vừa ra';
    return `${gan} kỳ`;
  }

  let showAll = $state(false);
  let displayList = $derived(showAll ? data.list : data.list.slice(0, 20));
</script>

<div class="page-heading">
  <div><div class="eyebrow">Theo dõi khoảng cách</div><h1>Lô Gan</h1><p>{data.totalDraws} kỳ dữ liệu · Xếp hạng thời gian chưa xuất hiện của 100 cặp số.</p></div>
</div>

<!-- Mô tả -->
<div class="soft-panel mb-6 text-sm text-indigo-900">
  <p class="font-semibold mb-1">Lô gan là gì?</p>
  <p class="leading-relaxed">
    <strong>Lô gan</strong> là số kỳ xổ số liên tiếp mà một cặp số (00–99) chưa xuất hiện, tính từ kỳ gần nhất đến nay.
    Cặp số có gan càng cao thì "nợ" càng lâu — nhiều người chơi coi đây là dấu hiệu cặp đó sắp quay trở lại.
  </p>
  <ul class="mt-2 space-y-1 text-xs">
    <li><span class="inline-block w-3 h-3 rounded bg-red-200 mr-1 align-middle"></span> <strong>Đỏ</strong> — Gan rất cao (≥50% tổng kỳ): cặp đang rất "thiếu nợ"</li>
    <li><span class="inline-block w-3 h-3 rounded bg-orange-200 mr-1 align-middle"></span> <strong>Cam</strong> — Gan cao (25–50%): cần chú ý</li>
    <li><span class="inline-block w-3 h-3 rounded bg-yellow-100 mr-1 align-middle"></span> <strong>Vàng</strong> — Gan trung bình (10–25%)</li>
    <li><span class="inline-block w-3 h-3 rounded bg-gray-50 border mr-1 align-middle"></span> <strong>Xám</strong> — Gan thấp: vừa ra gần đây</li>
  </ul>
</div>

{#if data.totalDraws === 0}
  <div class="surface-card card-pad text-center">
    <p class="text-gray-400 mb-3">Chưa có dữ liệu.</p>
    <a href="/nhap-lieu" class="text-blue-600 hover:underline text-sm">Nhập kết quả đầu tiên →</a>
  </div>
{:else}

  <!-- Tổng quan nhanh -->
  <div class="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
    <div class="metric-card">
      <p class="text-xs text-gray-500">Tổng kỳ dữ liệu</p>
      <p class="text-2xl font-bold text-gray-800 mt-1">{data.totalDraws}</p>
    </div>
    <div class="metric-card border-red-100 bg-red-50/70">
      <p class="text-xs text-red-600">Gan cao nhất</p>
      <p class="text-2xl font-bold text-red-700 mt-1">{data.list[0]?.pair ?? '—'}</p>
      <p class="text-xs text-red-500 mt-0.5">{data.list[0]?.gan ?? 0} kỳ chưa ra</p>
    </div>
    <div class="metric-card border-emerald-100 bg-emerald-50/70">
      <p class="text-xs text-green-600">Vừa ra gần nhất</p>
      <p class="text-2xl font-bold text-green-700 mt-1">
        {data.list.find(i => i.gan === 0)?.pair ?? '—'}
      </p>
      <p class="text-xs text-green-500 mt-0.5">Gan = 0</p>
    </div>
    <div class="metric-card border-orange-100 bg-orange-50/70">
      <p class="text-xs text-orange-600">Cặp chưa bao giờ ra</p>
      <p class="text-2xl font-bold text-orange-700 mt-1">
        {data.list.filter(i => i.lastDate === null).length}
      </p>
      <p class="text-xs text-orange-500 mt-0.5">trong 100 cặp</p>
    </div>
  </div>

  <!-- Lưới 10×10 -->
  <div class="surface-card card-pad scroll-shell mb-6">
    <h2 class="text-sm font-semibold text-gray-600 mb-3">Bảng 10×10 — Gan (số kỳ chưa ra)</h2>
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
                <div class="rounded-lg p-1.5 text-center {ganColor(cell.gan, data.totalDraws)} min-w-[44px]">
                  <div class="text-sm font-mono leading-none">{cell.pair}</div>
                  <div class="text-xs leading-none mt-0.5 opacity-80">{ganLabel(cell.gan)}</div>
                </div>
              </td>
            {/each}
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

  <!-- Bảng xếp hạng -->
  <div class="surface-card mb-4 overflow-hidden">
    <div class="px-4 py-3 border-b bg-gray-50">
      <h2 class="font-semibold text-gray-700">Xếp hạng lô gan — cao nhất trước</h2>
      <p class="text-xs text-gray-400 mt-0.5">Cặp có gan cao nhất là ứng viên "sắp ra" theo kinh nghiệm dân gian</p>
    </div>
    <div class="divide-y">
      {#each displayList as item, i}
        {@const pct = data.totalDraws > 0 ? item.gan / data.totalDraws : 0}
        <div class="px-4 py-2.5 flex items-center gap-3">
          <span class="text-xs text-gray-400 w-5 text-right shrink-0">{i + 1}</span>
          <span class="font-mono font-bold text-lg w-10 shrink-0
            {pct >= 0.5 ? 'text-red-700' : pct >= 0.25 ? 'text-orange-600' : pct >= 0.1 ? 'text-yellow-700' : 'text-gray-600'}">
            {item.pair}
          </span>
          <div class="flex-1">
            <div class="h-2 rounded-full bg-gray-100 overflow-hidden">
              <div class="h-full rounded-full transition-all
                {pct >= 0.5 ? 'bg-red-400' : pct >= 0.25 ? 'bg-orange-400' : 'bg-yellow-300'}"
                style="width: {Math.min(100, pct * 100).toFixed(1)}%">
              </div>
            </div>
          </div>
          <span class="text-sm font-semibold w-20 text-right shrink-0
            {pct >= 0.5 ? 'text-red-700' : pct >= 0.25 ? 'text-orange-600' : 'text-gray-600'}">
            {item.gan} kỳ
          </span>
          <span class="text-xs text-gray-400 w-24 text-right shrink-0 hidden sm:block">
            {item.lastDate ?? 'Chưa bao giờ'}
          </span>
        </div>
      {/each}
    </div>

    {#if data.list.length > 20}
      <div class="px-4 py-3 border-t bg-gray-50 text-center">
        <button onclick={() => showAll = !showAll}
          class="text-sm text-blue-600 hover:underline">
          {showAll ? 'Thu gọn ▲' : `Xem thêm ${data.list.length - 20} cặp ▼`}
        </button>
      </div>
    {/if}
  </div>

  <!-- Ghi chú cách dùng -->
  <div class="bg-gray-50 border rounded-xl p-4 text-xs text-gray-500 leading-relaxed">
    <p class="font-semibold text-gray-600 mb-1">Cách sử dụng lô gan:</p>
    <p>
      Lô gan không đảm bảo cặp số sẽ ra — xổ số là ngẫu nhiên. Tuy nhiên, đây là công cụ phổ biến để
      chọn lọc ứng viên kết hợp với các phân tích khác (đầu/đuôi, tổng GĐB).
      Thông thường người chơi chọn cặp gan cao <em>và</em> có lịch sử xuất hiện nhiều.
    </p>
  </div>

{/if}
