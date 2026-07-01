<script>
  import { invalidateAll } from '$app/navigation';

  let { data } = $props();

  const STATUS_STYLE = {
    saved:   'bg-green-100 text-green-700',
    partial: 'bg-yellow-100 text-yellow-700',
    skipped: 'bg-gray-100 text-gray-500',
    no_data: 'bg-red-100 text-red-700',
    error:   'bg-red-100 text-red-700',
  };

  let busy    = $state(false);
  let message = $state('');

  // Ngày thiếu, không tính hôm nay (có thể chưa tới giờ xổ)
  const missingPast = $derived(data.missing.filter(d => d !== data.today));

  async function backfill(dates, label) {
    if (busy) return;
    busy = true;
    message = `Đang cào ${label}...`;
    try {
      const res  = await fetch('/api/daily-scrape', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ dates }),
      });
      const json = await res.json();
      if (!res.ok) {
        message = `Lỗi: ${json.error ?? res.status}`;
      } else {
        message = `Xong: +${json.saved} lưu · ${json.partial} thiếu giải · ${json.skipped} bỏ qua · ${json.failed} thất bại`;
        await invalidateAll();
      }
    } catch (e) {
      message = `Lỗi mạng: ${e.message}`;
    } finally {
      busy = false;
    }
  }

  function backfillAll() {
    if (missingPast.length === 0) { message = 'Không có ngày nào thiếu.'; return; }
    backfill(missingPast, `${missingPast.length} ngày thiếu`);
  }
</script>

<svelte:head><title>Trạng thái dữ liệu — Times</title></svelte:head>

<h1 class="text-2xl font-bold mb-2 text-gray-800">Trạng thái dữ liệu</h1>
<p class="text-sm text-gray-500 mb-5">
  Theo dõi việc cào kết quả Miền Bắc tự động và các ngày bị hụt dữ liệu (30 ngày gần nhất).
</p>

{#if message}
  <div class="mb-4 rounded-lg border px-4 py-2.5 text-sm
              {busy ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-gray-50 border-gray-200 text-gray-700'}">
    {message}
  </div>
{/if}

<!-- Ngày thiếu -->
<div class="bg-white border rounded-xl shadow-sm mb-6 overflow-hidden">
  <div class="px-4 py-3 border-b bg-gray-50 flex items-center justify-between gap-3">
    <div>
      <h2 class="font-semibold text-gray-700">Ngày thiếu dữ liệu</h2>
      <p class="text-xs text-gray-400 mt-0.5">
        {missingPast.length === 0 ? 'Không thiếu ngày nào 🎉' : `${missingPast.length} ngày cần cào bù`}
      </p>
    </div>
    <button onclick={backfillAll} disabled={busy || missingPast.length === 0}
      class="text-sm px-3 py-1.5 rounded-lg bg-blue-600 text-white font-medium
             hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed shrink-0">
      Cào bù tất cả
    </button>
  </div>

  <div class="px-4 py-3">
    {#if data.missing.length === 0}
      <p class="text-sm text-green-600">Đầy đủ dữ liệu 30 ngày gần nhất.</p>
    {:else}
      <div class="flex flex-wrap gap-1.5">
        {#each data.missing as d}
          <button onclick={() => backfill([d], d)} disabled={busy}
            class="font-mono text-xs px-2 py-1 rounded border transition-colors disabled:opacity-40
                   {d === data.today
                     ? 'bg-blue-50 border-blue-200 text-blue-600'
                     : 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100'}"
            title={d === data.today ? 'Hôm nay — có thể chưa tới giờ xổ' : 'Bấm để cào bù'}>
            {d}{d === data.today ? ' (hôm nay)' : ''}
          </button>
        {/each}
      </div>
    {/if}
  </div>
</div>

<!-- Nhật ký cào -->
<div class="bg-white border rounded-xl shadow-sm overflow-hidden">
  <div class="px-4 py-3 border-b bg-gray-50">
    <h2 class="font-semibold text-gray-700">Nhật ký cào gần nhất</h2>
    <p class="text-xs text-gray-400 mt-0.5">60 lần gần nhất</p>
  </div>

  {#if data.logs.length === 0}
    <p class="px-4 py-6 text-center text-sm text-gray-400">Chưa có nhật ký nào.</p>
  {:else}
    <div class="overflow-x-auto">
      <table class="w-full text-sm border-collapse">
        <thead>
          <tr class="bg-gray-50 text-gray-500 text-left text-xs">
            <th class="px-3 py-2">Thời điểm (UTC)</th>
            <th class="px-3 py-2">Kỳ</th>
            <th class="px-3 py-2">Trạng thái</th>
            <th class="px-3 py-2">Nguồn / ghi chú</th>
          </tr>
        </thead>
        <tbody>
          {#each data.logs as log}
            <tr class="border-t hover:bg-gray-50">
              <td class="px-3 py-1.5 font-mono text-xs text-gray-500 whitespace-nowrap">{log.run_at}</td>
              <td class="px-3 py-1.5 font-mono text-xs">{log.draw_date}</td>
              <td class="px-3 py-1.5">
                <span class="text-xs px-2 py-0.5 rounded font-medium {STATUS_STYLE[log.status] ?? 'bg-gray-100 text-gray-500'}">
                  {log.status}
                </span>
              </td>
              <td class="px-3 py-1.5 text-xs text-gray-500 max-w-[240px] truncate" title={log.source ?? log.note ?? ''}>
                {log.source ?? log.note ?? '—'}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>
