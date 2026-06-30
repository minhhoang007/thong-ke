<svelte:head>
  <title>Cầu Lô — XoSo Stats</title>
</svelte:head>

<script>
  let { data } = $props();

  let showAll = $state(false);

  const displayList = $derived(showAll ? data.active : data.active.slice(0, 20));

  // Màu ô grid theo độ dài cầu
  function cellColor(streak) {
    if (streak >= 5) return 'bg-red-200 text-red-900 font-bold ring-1 ring-red-400';
    if (streak >= 3) return 'bg-orange-200 text-orange-900 font-bold';
    if (streak >= 2) return 'bg-yellow-100 text-yellow-800';
    if (streak === 1) return 'bg-gray-50 text-gray-500';
    return 'bg-white text-gray-300';
  }
</script>

<h1 class="text-2xl font-bold mb-2 text-gray-800">Cầu Lô</h1>
<p class="text-sm text-gray-500 mb-6">{data.totalDraws} kỳ trong dữ liệu</p>

<!-- Giải thích -->
<div class="bg-teal-50 border border-teal-200 rounded-xl p-4 mb-6 text-sm">
  <p class="font-semibold text-teal-800 mb-1">Cầu lô là gì?</p>
  <p class="text-teal-700 mb-2">
    Một cặp số được gọi là <strong>đang cầu</strong> khi nó xuất hiện trong nhiều kỳ liên tiếp tính từ kỳ xổ mới nhất.
    Người chơi thường <em>theo cầu</em> — đánh tiếp cặp đó — cho đến khi cầu "vỡ" (cặp không ra nữa).
  </p>
  <p class="text-teal-600 text-xs">
    Ví dụ: nếu cặp <span class="font-mono font-bold">47</span> ra trong 4 kỳ liên tiếp gần nhất, nó đang có cầu 4 kỳ.
    Cầu dài hơn = tín hiệu mạnh hơn theo quan điểm người chơi.
    Xổ số vẫn là ngẫu nhiên — mọi thống kê chỉ mang tính tham khảo.
  </p>
</div>

{#if data.totalDraws === 0}
  <div class="bg-white border rounded-xl p-8 text-center shadow-sm">
    <p class="text-gray-400 mb-3">Chưa có dữ liệu.</p>
    <a href="/nhap-lieu" class="text-blue-600 hover:underline text-sm">Nhập kết quả đầu tiên →</a>
  </div>
{:else}

  <!-- Tóm tắt -->
  <div class="grid grid-cols-2 gap-4 mb-6 md:grid-cols-4">
    <div class="rounded-xl p-4 bg-teal-100 text-teal-800 shadow-sm">
      <p class="text-xs font-medium">Đang cầu (≥2 kỳ)</p>
      <p class="text-3xl font-bold mt-1">{data.active.length}</p>
    </div>
    <div class="rounded-xl p-4 bg-red-100 text-red-800 shadow-sm">
      <p class="text-xs font-medium">Cầu dài nhất</p>
      {#if data.active[0]}
        <p class="text-3xl font-bold font-mono mt-1">{data.active[0].pair}</p>
        <p class="text-xs mt-0.5 opacity-70">{data.active[0].streak} kỳ liên tiếp</p>
      {:else}
        <p class="text-2xl font-bold mt-1">—</p>
      {/if}
    </div>
    <div class="rounded-xl p-4 bg-orange-100 text-orange-800 shadow-sm">
      <p class="text-xs font-medium">Cầu ≥ 3 kỳ</p>
      <p class="text-3xl font-bold mt-1">{data.active.filter(a => a.streak >= 3).length}</p>
    </div>
    <div class="rounded-xl p-4 bg-yellow-100 text-yellow-800 shadow-sm">
      <p class="text-xs font-medium">Cầu ≥ 5 kỳ</p>
      <p class="text-3xl font-bold mt-1">{data.active.filter(a => a.streak >= 5).length}</p>
    </div>
  </div>

  <!-- Chú thích màu -->
  <div class="flex gap-2 mb-4 flex-wrap text-xs">
    <span class="px-2.5 py-1 rounded-full bg-red-200 text-red-900 border border-red-300">≥ 5 kỳ — Cầu mạnh</span>
    <span class="px-2.5 py-1 rounded-full bg-orange-200 text-orange-900">3–4 kỳ — Đang cầu</span>
    <span class="px-2.5 py-1 rounded-full bg-yellow-100 text-yellow-800">2 kỳ — Mới cầu</span>
    <span class="px-2.5 py-1 rounded-full bg-gray-50 text-gray-500 border">1 kỳ — Bình thường</span>
    <span class="px-2.5 py-1 rounded-full bg-white text-gray-300 border">0 kỳ — Chưa ra gần đây</span>
  </div>

  <!-- Grid 10×10 -->
  <div class="bg-white border rounded-xl p-4 shadow-sm overflow-x-auto mb-8">
    <p class="text-xs text-gray-400 mb-3">Lưới 10×10 — màu thể hiện số kỳ liên tiếp đang cầu</p>
    <table class="border-collapse w-full">
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
                <div class="rounded-lg p-1.5 text-center {cellColor(cell.streak)} min-w-[44px]">
                  <div class="text-sm font-mono leading-none">{cell.pair}</div>
                  <div class="text-xs leading-none mt-0.5 opacity-80">
                    {cell.streak > 0 ? `${cell.streak}×` : '—'}
                  </div>
                </div>
              </td>
            {/each}
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

  <!-- Danh sách cầu đang chạy -->
  {#if data.active.length === 0}
    <div class="bg-white border rounded-xl p-6 shadow-sm text-center">
      <p class="text-gray-400 text-sm">Không có cặp nào đang cầu (ra ≥ 2 kỳ liên tiếp).</p>
    </div>
  {:else}
    <div class="bg-white border rounded-xl shadow-sm overflow-hidden">
      <div class="px-4 py-3 border-b bg-teal-50 flex items-center justify-between">
        <span class="font-semibold text-teal-700 text-sm">Các cặp đang cầu</span>
        <span class="text-xs text-teal-500">{data.active.length} cặp · sắp xếp theo cầu dài nhất</span>
      </div>
      <div class="divide-y">
        {#each displayList as item, i}
          <div class="px-4 py-3 flex items-start gap-3">
            <span class="text-xs text-gray-400 w-5 text-right mt-1 shrink-0">{i + 1}</span>
            <span class="font-mono font-bold text-xl shrink-0
              {item.streak >= 5 ? 'text-red-700' : item.streak >= 3 ? 'text-orange-600' : 'text-yellow-700'}">
              {item.pair}
            </span>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-1">
                <span class="text-sm font-semibold text-gray-700">{item.streak} kỳ liên tiếp</span>
                {#if item.streak >= 5}
                  <span class="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full">Cầu mạnh</span>
                {:else if item.streak >= 3}
                  <span class="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full">Đang cầu</span>
                {/if}
              </div>
              <div class="flex flex-wrap gap-1">
                {#each item.dates as date}
                  <span class="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded font-mono">{date}</span>
                {/each}
              </div>
            </div>
          </div>
        {/each}
      </div>
      {#if data.active.length > 20}
        <div class="px-4 py-3 border-t text-center">
          <button onclick={() => showAll = !showAll}
            class="text-sm text-teal-600 hover:underline">
            {showAll ? 'Thu gọn ▲' : `Xem tất cả ${data.active.length} cặp ▼`}
          </button>
        </div>
      {/if}
    </div>
  {/if}

  <!-- Hướng dẫn sử dụng -->
  <div class="mt-6 bg-gray-50 border rounded-xl p-4 text-xs text-gray-500 space-y-1">
    <p class="font-semibold text-gray-600 text-sm mb-2">Cách sử dụng trang Cầu Lô</p>
    <p>• <strong>Theo cầu:</strong> Chọn cặp đang có cầu ≥ 3 kỳ — đánh tiếp hy vọng cầu tiếp tục.</p>
    <p>• <strong>Bẻ cầu:</strong> Đặt ngược lại — nếu cầu đã dài, nhiều người cho rằng sắp "vỡ".</p>
    <p>• <strong>Kết hợp:</strong> Dùng cùng trang <a href="/lo-gan" class="text-teal-600 hover:underline">Lô Gan</a>
      — cầu + gan cao = tín hiệu trái chiều thú vị để nghiên cứu.</p>
    <p class="pt-1 text-gray-400 italic">Xổ số là hoàn toàn ngẫu nhiên. Mọi phân tích chỉ mang tính tham khảo thống kê.</p>
  </div>

{/if}
