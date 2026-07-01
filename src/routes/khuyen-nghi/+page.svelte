<script>
  let { data } = $props();
  const rec = $derived(data.rec);

  function scoreBg(s) {
    if (s >= 80) return 'bg-red-500 text-white';
    if (s >= 65) return 'bg-orange-400 text-white';
    if (s >= 50) return 'bg-yellow-300 text-gray-800';
    if (s >= 35) return 'bg-blue-100 text-blue-800';
    return 'bg-gray-100 text-gray-500';
  }
  function trendIcon(t) { return t === 'up' ? '↑' : t === 'down' ? '↓' : '–'; }
  function trendColor(t) { return t === 'up' ? 'text-green-600' : t === 'down' ? 'text-red-500' : 'text-gray-400'; }

  // Độ tin cậy tổng thể lấy từ backtest top-5 so với ngẫu nhiên
  const confidence = $derived.by(() => {
    const hr = rec?.backtest?.hitRates?.find(h => h.k === 5);
    if (!hr) return null;
    return { rate: hr.rate, random: hr.random, beat: hr.rate > hr.random, testN: rec.backtest.testN };
  });
</script>

<svelte:head><title>Khuyến nghị hôm nay — Times</title></svelte:head>

<h1 class="text-2xl font-bold mb-1 text-gray-800">Khuyến nghị hôm nay</h1>
<p class="text-sm text-gray-500 mb-4">
  Tổng hợp <b>ensemble (5 tín hiệu)</b> + <b>phân tích quá hạn (gap)</b> thành một danh sách gợi ý duy nhất
  {#if data.today}<span class="text-gray-400">· cập nhật cho {data.today}</span>{/if}
</p>

{#if !rec}
  <div class="bg-yellow-50 border border-yellow-300 rounded p-4 text-yellow-800">
    Cần ít nhất 10 kỳ dữ liệu để tạo khuyến nghị.
  </div>
{:else}

  <div class="bg-amber-50 border border-amber-300 rounded p-3 text-sm text-amber-800 mb-5">
    ⚠️ Xổ số là ngẫu nhiên — đây chỉ là gợi ý tham khảo từ thống kê, không đảm bảo trúng thưởng.
  </div>

  <!-- Độ tin cậy từ backtest -->
  {#if confidence}
    <div class="rounded-lg border p-4 mb-5 {confidence.beat ? 'bg-green-50 border-green-300' : 'bg-gray-50 border-gray-200'}">
      <div class="text-sm text-gray-600">Độ tin cậy (kiểm tra ngược {confidence.testN} kỳ, chỉ tiêu Top 5)</div>
      <div class="flex items-baseline gap-2 mt-1">
        <span class="text-2xl font-bold {confidence.beat ? 'text-green-700' : 'text-gray-600'}">{confidence.rate}%</span>
        <span class="text-xs text-gray-500">trúng · ngẫu nhiên {confidence.random}%</span>
        <span class="text-xs font-semibold {confidence.beat ? 'text-green-600' : 'text-red-500'}">
          {confidence.beat ? `+${(confidence.rate - confidence.random).toFixed(1)}%` : `${(confidence.rate - confidence.random).toFixed(1)}%`}
        </span>
      </div>
      <a href="/du-doan" class="text-xs text-blue-600 hover:underline">Xem chi tiết backtest →</a>
    </div>
  {/if}

  <!-- Top picks -->
  <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
    {#each rec.picks as p}
      <div class="bg-white border rounded-xl p-3 shadow-sm text-center">
        <div class="font-mono text-3xl font-bold text-gray-800">{p.pair}</div>
        <div class="mt-1 inline-block px-2 py-0.5 rounded text-xs font-bold {scoreBg(p.score)}">
          {p.score} điểm
        </div>
        <div class="text-[11px] text-gray-400 mt-1">
          gan {p.gan} · 30kỳ {p.count30}
          <span class="font-bold {trendColor(p.trend)}">{trendIcon(p.trend)}</span>
        </div>
      </div>
    {/each}
  </div>

  <!-- Bảng chi tiết + lý do -->
  <div class="bg-white border rounded-xl shadow-sm overflow-hidden">
    <div class="px-4 py-3 border-b bg-gray-50">
      <h2 class="font-semibold text-gray-700">Chi tiết & lý do</h2>
    </div>
    <div class="overflow-x-auto">
      <table class="w-full text-sm border-collapse">
        <thead>
          <tr class="bg-gray-50 text-gray-500 text-left text-xs">
            <th class="px-3 py-2">#</th>
            <th class="px-3 py-2">Cặp</th>
            <th class="px-3 py-2">Điểm</th>
            <th class="px-3 py-2">Ensemble</th>
            <th class="px-3 py-2">Quá hạn</th>
            <th class="px-3 py-2">Gan</th>
            <th class="px-3 py-2">Lý do</th>
          </tr>
        </thead>
        <tbody>
          {#each rec.picks as p, i}
            <tr class="border-t hover:bg-gray-50">
              <td class="px-3 py-2 text-gray-400">{i + 1}</td>
              <td class="px-3 py-2 font-mono font-bold text-lg">{p.pair}</td>
              <td class="px-3 py-2">
                <span class="inline-block px-2 py-0.5 rounded text-xs font-bold {scoreBg(p.score)}">{p.score}</span>
              </td>
              <td class="px-3 py-2 font-mono text-gray-600">{p.ensembleScore}</td>
              <td class="px-3 py-2 font-mono text-gray-600">{p.overdueScore != null ? `${p.overdueScore.toFixed(1)}σ` : '—'}</td>
              <td class="px-3 py-2 font-mono text-gray-600">{p.gan}</td>
              <td class="px-3 py-2">
                <div class="flex flex-wrap gap-1">
                  {#each p.reasons as r}
                    <span class="text-[11px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100">{r}</span>
                  {/each}
                </div>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </div>

  <p class="text-xs text-gray-400 mt-4 leading-relaxed">
    Điểm cuối = 70% điểm ensemble (lô gan, tần suất, xu hướng, cầu lô, hiếm dài hạn) + 30% mức quá hạn theo phân tích khoảng cách (Z-score).
    Dữ liệu tự cập nhật sau mỗi kỳ được cào.
  </p>

{/if}
