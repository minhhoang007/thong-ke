<svelte:head>
  <title>Nghiên cứu — Times</title>
</svelte:head>

<script>
  let { data } = $props();

  // Tab đang hiển thị
  let activeTab = $state('chi-square');

  const TABS = [
    { id: 'chi-square', label: 'Kiểm định ngẫu nhiên' },
    { id: 'gap',        label: 'Phân tích khoảng cách' },
    { id: 'autocorr',  label: 'Tương quan GĐB' },
    { id: 'ci',        label: 'Khoảng tin cậy' },
  ];

  // ---- Tab Gap: sắp xếp ----
  let gapSort  = $state('overdue');   // 'overdue' | 'pair' | 'avg'
  let gapFilter = $state('all');      // 'all' | 'overdue' | 'normal' | 'recent'

  const gapSorted = $derived.by(() => {
    let list = [...data.gapList];

    // Filter
    if (gapFilter === 'overdue') list = list.filter(g => (g.overdueScore ?? 0) > 1);
    else if (gapFilter === 'normal') list = list.filter(g => g.overdueScore !== null && Math.abs(g.overdueScore) <= 1);
    else if (gapFilter === 'recent') list = list.filter(g => (g.overdueScore ?? 0) < -0.5);

    // Sort
    if (gapSort === 'pair')   list.sort((a, b) => a.pair.localeCompare(b.pair));
    else if (gapSort === 'avg') list.sort((a, b) => (b.avgGap ?? 0) - (a.avgGap ?? 0));
    // default: by overdueScore (đã sắp xếp từ server)

    return list;
  });

  // Màu cho overdueScore
  function overdueColor(score) {
    if (score === null)  return 'text-gray-400';
    if (score > 2)       return 'text-red-600 font-bold';
    if (score > 1)       return 'text-orange-500 font-semibold';
    if (score < -0.5)    return 'text-green-600';
    return 'text-gray-700';
  }

  function overdueLabel(score) {
    if (score === null)  return '—';
    if (score > 2)       return `+${score} ⚠️`;
    if (score > 1)       return `+${score}`;
    if (score < -0.5)    return `${score}`;
    return `${score}`;
  }

  function overdueBadge(score) {
    if (score === null)  return 'bg-gray-100 text-gray-400';
    if (score > 2)       return 'bg-red-100 text-red-700';
    if (score > 1)       return 'bg-orange-100 text-orange-700';
    if (score < -0.5)    return 'bg-green-100 text-green-700';
    return 'bg-gray-50 text-gray-600';
  }

  // ---- Tab CI: màu sắc ----
  function ciColor(cls) {
    const map = {
      'extreme-high': 'bg-red-200 text-red-900',
      'high':         'bg-orange-100 text-orange-800',
      'normal':       'bg-white text-gray-700',
      'low':          'bg-blue-100 text-blue-800',
      'extreme-low':  'bg-blue-200 text-blue-900',
    };
    return map[cls] ?? 'bg-white text-gray-700';
  }

  function ciDot(cls) {
    const map = {
      'extreme-high': 'bg-red-500',
      'high':         'bg-orange-400',
      'normal':       'bg-gray-200',
      'low':          'bg-blue-400',
      'extreme-low':  'bg-blue-600',
    };
    return map[cls] ?? 'bg-gray-200';
  }

  // ---- Tab ACF: SVG chart ----
  const ACF_W = 420;
  const ACF_H = 160;
  const ACF_MARGIN = { top: 16, right: 16, bottom: 28, left: 40 };
  const chartW = ACF_W - ACF_MARGIN.left - ACF_MARGIN.right;
  const chartH = ACF_H - ACF_MARGIN.top - ACF_MARGIN.bottom;

  const acfYScale = $derived.by(() => {
    const maxAbs = Math.max(0.3, ...data.acf.map(d => Math.abs(d.acf)), data.critValue + 0.05);
    return (v) => ACF_MARGIN.top + chartH / 2 - (v / maxAbs) * (chartH / 2);
  });

  const acfZeroY  = $derived(ACF_MARGIN.top + chartH / 2);
  const acfCritY  = $derived(acfYScale(data.critValue));
  const acfCritYn = $derived(acfYScale(-data.critValue));

  function acfBarX(i) {
    const barW = chartW / (data.acf.length * 1.8);
    const step = chartW / data.acf.length;
    return ACF_MARGIN.left + i * step + step / 2 - barW / 2;
  }
  const acfBarW = $derived(data.acf.length > 0 ? chartW / (data.acf.length * 1.8) : 30);

  // Kết luận ACF
  const acfConclusion = $derived.by(() => {
    if (data.acf.length === 0) return null;
    const sig = data.acf.filter(d => Math.abs(d.acf) > data.critValue);
    return sig.length === 0
      ? { ok: true,  text: `Không có tương quan chuỗi đáng kể tại bất kỳ lag nào (trong ${data.gdbN} kỳ GĐB). GĐB hoạt động ngẫu nhiên.` }
      : { ok: false, text: `Có tương quan tại lag: ${sig.map(d => d.lag).join(', ')} — cần thận trọng khi diễn giải.` };
  });
</script>

<!-- Header -->
<div class="page-heading">
  <div>
    <div class="eyebrow">Phòng nghiên cứu</div>
    <h1>Nghiên cứu thống kê</h1>
    <p>
    Phân tích khoa học kết quả xổ số. Dữ liệu: <strong>{data.totalDraws} kỳ</strong>,
    <strong>{data.totalValues.toLocaleString()} kết quả</strong>.
    </p>
  </div>
  <span class="status-pill">{data.totalValues.toLocaleString()} quan sát</span>
</div>

<!-- Disclaimer -->
<div class="warning-panel mb-5 text-xs leading-relaxed">
  ⚠️ <strong>Lưu ý quan trọng:</strong> Tất cả phân tích dưới đây là thống kê mô tả dựa trên dữ liệu lịch sử.
  Xổ số là trò chơi ngẫu nhiên — không có phương pháp nào đảm bảo trúng thưởng.
  Các chỉ số giúp bạn <em>hiểu dữ liệu</em>, không phải dự đoán tương lai.
</div>

<!-- Tab navigation -->
<div class="segmented-control mb-5" role="tablist" aria-label="Nhóm nghiên cứu">
  {#each TABS as tab}
    <button
      onclick={() => activeTab = tab.id}
      aria-selected={activeTab === tab.id}
      class:active={activeTab === tab.id}>
      {tab.label}
    </button>
  {/each}
</div>

<!-- ================================================================== -->
<!-- TAB 1: CHI-SQUARE TEST                                             -->
<!-- ================================================================== -->
{#if activeTab === 'chi-square'}
  <div class="space-y-4">

    <!-- Giải thích -->
    <div class="soft-panel text-sm leading-relaxed text-blue-950">
      <p class="font-semibold mb-1">Kiểm định χ² (Chi-square) — Phân phối đều</p>
      <p>
        Nếu xổ số ngẫu nhiên hoàn toàn, 100 cặp số <strong>phải xuất hiện gần bằng nhau</strong>.
        Kiểm định χ² đo mức độ lệch khỏi phân phối đều và tính xác suất p-value.
      </p>
      <ul class="mt-2 space-y-1 text-xs">
        <li>• <strong>p-value &gt; 0.05</strong>: Không có bằng chứng lệch phân phối → hệ thống ngẫu nhiên ✓</li>
        <li>• <strong>p-value ≤ 0.05</strong>: Lệch thống kê đáng kể → một số cặp ra nhiều/ít bất thường</li>
        <li>• <strong>χ²</strong>: Giá trị càng lớn → phân phối càng lệch so với đồng đều</li>
        <li>• <strong>Bậc tự do (df)</strong> = 99 (100 cặp − 1)</li>
      </ul>
    </div>

    {#if !data.chiSquare}
      <div class="surface-card card-pad text-center text-gray-400">Chưa đủ dữ liệu.</div>
    {:else}
      <!-- Kết quả chính -->
      <div class="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div class="metric-card !min-h-0 text-center">
          <p class="text-xs text-gray-400 uppercase tracking-wide mb-1">Chi-square (χ²)</p>
          <p class="text-3xl font-bold font-mono {data.chiSquare.significant ? 'text-red-600' : 'text-gray-800'}">
            {data.chiSquare.chi2}
          </p>
        </div>
        <div class="metric-card !min-h-0 text-center">
          <p class="text-xs text-gray-400 uppercase tracking-wide mb-1">p-value</p>
          <p class="text-3xl font-bold font-mono {data.chiSquare.significant ? 'text-red-600' : 'text-green-600'}">
            {data.chiSquare.pValue}
          </p>
        </div>
        <div class="metric-card !min-h-0 text-center">
          <p class="text-xs text-gray-400 uppercase tracking-wide mb-1">Bậc tự do</p>
          <p class="text-3xl font-bold font-mono text-gray-600">{data.chiSquare.df}</p>
        </div>
        <div class="metric-card !min-h-0 text-center">
          <p class="text-xs text-gray-400 uppercase tracking-wide mb-1">Kỳ vọng / cặp</p>
          <p class="text-3xl font-bold font-mono text-gray-800">{data.chiSquare.expected}</p>
        </div>
      </div>

      <!-- Verdict -->
      <div class="rounded-xl p-4 border {data.chiSquare.significant
        ? 'bg-red-50 border-red-200 text-red-800'
        : 'bg-green-50 border-green-200 text-green-800'}">
        <p class="font-semibold text-base mb-1">
          {data.chiSquare.significant ? '⚠️ Có lệch phân phối đáng kể' : '✓ Phân phối đều — hệ thống hoạt động ngẫu nhiên'}
        </p>
        <p class="text-sm">
          {#if data.chiSquare.significant}
            p-value = {data.chiSquare.pValue} ≤ 0.05: Dữ liệu cho thấy một số cặp xuất hiện lệch so với kỳ vọng.
            Có thể do mẫu nhỏ hoặc cơ chế xổ số không đều.
          {:else}
            p-value = {data.chiSquare.pValue} &gt; 0.05: Không đủ bằng chứng để bác bỏ giả thuyết ngẫu nhiên.
            100 cặp số phân bố gần đều nhau.
          {/if}
        </p>
      </div>

      <!-- Thống kê phụ -->
      <div class="surface-card card-pad">
        <p class="text-sm font-semibold text-gray-700 mb-3">Chi tiết phân phối</p>
        <div class="grid grid-cols-3 gap-4 text-center text-sm">
          <div>
            <p class="text-gray-400 text-xs mb-1">Tổng kết quả</p>
            <p class="font-bold text-gray-800">{data.chiSquare.total.toLocaleString()}</p>
          </div>
          <div>
            <p class="text-gray-400 text-xs mb-1">Cặp ít nhất</p>
            <p class="font-bold text-blue-600">{data.chiSquare.min} lần</p>
          </div>
          <div>
            <p class="text-gray-400 text-xs mb-1">Cặp nhiều nhất</p>
            <p class="font-bold text-red-500">{data.chiSquare.max} lần</p>
          </div>
        </div>
        <p class="text-xs text-gray-400 mt-3">
          Chênh lệch min–max: {data.chiSquare.max - data.chiSquare.min} lần
          (kỳ vọng đều = {data.chiSquare.expected} lần/cặp).
        </p>
      </div>
    {/if}
  </div>

<!-- ================================================================== -->
<!-- TAB 2: GAP ANALYSIS                                                -->
<!-- ================================================================== -->
{:else if activeTab === 'gap'}
  <div class="space-y-4">

    <!-- Giải thích -->
    <div class="bg-purple-50 border border-purple-200 rounded-xl p-4 text-sm text-purple-900 leading-relaxed">
      <p class="font-semibold mb-1">Phân tích khoảng cách (Gap Analysis)</p>
      <p>
        <strong>Khoảng cách</strong> = số kỳ xổ giữa 2 lần xuất hiện liên tiếp của một cặp số.
        Mỗi cặp có khoảng cách trung bình (avgGap) và độ lệch chuẩn (stdGap) riêng.
      </p>
      <ul class="mt-2 space-y-1 text-xs">
        <li>• <strong>Z-score (Đang nợ)</strong> = (Kỳ hiện tại − avgGap) / stdGap</li>
        <li>• <strong>Z &gt; 2</strong>: Đang "nợ" rất lâu, bất thường so với lịch sử cặp đó 🔴</li>
        <li>• <strong>Z 1–2</strong>: Khá gan, trên mức bình thường 🟠</li>
        <li>• <strong>Z −1 đến 1</strong>: Bình thường 🔵</li>
        <li>• <strong>Z &lt; −0.5</strong>: Vừa ra gần đây 🟢</li>
        <li>• <strong>Lưu ý:</strong> Z-score dựa trên lịch sử từng cặp, không phải quy luật tổng quát.</li>
      </ul>
    </div>

    <!-- Bộ lọc + sắp xếp -->
    <div class="flex flex-wrap gap-2 items-center">
      <span class="text-xs text-gray-400 mr-1">Lọc:</span>
      {#each [['all','Tất cả'], ['overdue','Đang nợ (Z>1)'], ['normal','Bình thường'], ['recent','Vừa ra']] as [val, label]}
        <button onclick={() => gapFilter = val}
          class="text-xs px-3 py-1.5 rounded-lg border transition-colors
                 {gapFilter === val ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-600 hover:bg-gray-50'}">
          {label}
        </button>
      {/each}
      <span class="text-xs text-gray-300 mx-2">|</span>
      <span class="text-xs text-gray-400 mr-1">Sắp xếp:</span>
      {#each [['overdue','Z-score'], ['avg','Avg Gap'], ['pair','Cặp số']] as [val, label]}
        <button onclick={() => gapSort = val}
          class="text-xs px-3 py-1.5 rounded-lg border transition-colors
                 {gapSort === val ? 'bg-gray-700 text-white border-gray-700' : 'bg-white text-gray-600 hover:bg-gray-50'}">
          {label}
        </button>
      {/each}
    </div>

    <!-- Tổng quan nhanh -->
    <div class="grid grid-cols-3 gap-3">
      <div class="metric-card !min-h-0 text-center">
        <p class="text-xs text-gray-400 mb-1">Đang nợ nhiều (Z&gt;2)</p>
        <p class="text-2xl font-bold text-red-600">{data.gapList.filter(g => (g.overdueScore ?? 0) > 2).length}</p>
        <p class="text-xs text-gray-400">cặp</p>
      </div>
      <div class="metric-card !min-h-0 text-center">
        <p class="text-xs text-gray-400 mb-1">Khá gan (Z 1–2)</p>
        <p class="text-2xl font-bold text-orange-500">
          {data.gapList.filter(g => { const s = g.overdueScore ?? 0; return s > 1 && s <= 2; }).length}
        </p>
        <p class="text-xs text-gray-400">cặp</p>
      </div>
      <div class="metric-card !min-h-0 text-center">
        <p class="text-xs text-gray-400 mb-1">Vừa ra (Z&lt;−0.5)</p>
        <p class="text-2xl font-bold text-green-600">{data.gapList.filter(g => (g.overdueScore ?? 0) < -0.5).length}</p>
        <p class="text-xs text-gray-400">cặp</p>
      </div>
    </div>

    <!-- Bảng gap -->
    <div class="surface-card overflow-hidden">
      <div class="scroll-shell rounded-none border-x-0 border-b-0">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-gray-50 border-b text-xs text-gray-500 uppercase">
              <th class="text-left px-4 py-2.5 font-medium">Cặp</th>
              <th class="text-right px-4 py-2.5 font-medium">Số lần ra</th>
              <th class="text-right px-4 py-2.5 font-medium">Avg Gap</th>
              <th class="text-right px-4 py-2.5 font-medium">Std Gap</th>
              <th class="text-right px-4 py-2.5 font-medium">Đang gan</th>
              <th class="text-right px-4 py-2.5 font-medium">Z-score</th>
            </tr>
          </thead>
          <tbody class="divide-y">
            {#each gapSorted as g}
              <tr class="hover:bg-gray-50/50">
                <td class="px-4 py-2">
                  <span class="font-mono font-bold text-base text-gray-800">{g.pair}</span>
                </td>
                <td class="px-4 py-2 text-right text-gray-600">{g.appearances}</td>
                <td class="px-4 py-2 text-right font-mono text-gray-600">
                  {g.avgGap ?? '—'}
                </td>
                <td class="px-4 py-2 text-right font-mono text-gray-400">
                  {g.stdGap ?? '—'}
                </td>
                <td class="px-4 py-2 text-right font-mono text-gray-700">{g.currentGap}</td>
                <td class="px-4 py-2 text-right">
                  <span class="inline-block px-2 py-0.5 rounded-full text-xs font-medium {overdueBadge(g.overdueScore)}">
                    {overdueLabel(g.overdueScore)}
                  </span>
                </td>
              </tr>
            {/each}
            {#if gapSorted.length === 0}
              <tr><td colspan="6" class="text-center py-6 text-gray-400">Không có cặp nào phù hợp.</td></tr>
            {/if}
          </tbody>
        </table>
      </div>
    </div>
  </div>

<!-- ================================================================== -->
<!-- TAB 3: AUTOCORRELATION                                             -->
<!-- ================================================================== -->
{:else if activeTab === 'autocorr'}
  <div class="space-y-4">

    <!-- Giải thích -->
    <div class="bg-teal-50 border border-teal-200 rounded-xl p-4 text-sm text-teal-900 leading-relaxed">
      <p class="font-semibold mb-1">Tự tương quan chuỗi GĐB (Autocorrelation)</p>
      <p>
        Phân tích xem kết quả Giải Đặc Biệt hôm nay có <strong>liên quan đến các kỳ trước</strong> không.
        Dùng <strong>{data.gdbN} kỳ GĐB</strong> gần nhất.
      </p>
      <ul class="mt-2 space-y-1 text-xs">
        <li>• <strong>ACF(lag k)</strong>: Tương quan giữa GĐB kỳ t và kỳ t−k</li>
        <li>• <strong>Đường vàng (±{data.critValue})</strong>: Ngưỡng ý nghĩa 95% = ±2/√{data.gdbN}</li>
        <li>• Thanh <span class="text-red-600 font-semibold">đỏ</span>: vượt ngưỡng → có tương quan đáng kể</li>
        <li>• Thanh <span class="text-blue-600 font-semibold">xanh</span>: trong ngưỡng → ngẫu nhiên (bình thường)</li>
        <li>• Xổ số hoạt động đúng: <strong>tất cả thanh đều trong ngưỡng</strong></li>
      </ul>
    </div>

    <!-- Chuỗi GĐB 30 kỳ gần nhất -->
    <div class="surface-card card-pad">
      <p class="text-sm font-semibold text-gray-700 mb-3">30 kỳ GĐB gần nhất</p>
      <div class="flex flex-wrap gap-1.5">
        {#each data.gdbLast30 as d, i}
          <div class="flex flex-col items-center">
            <span class="font-mono font-bold text-sm text-gray-800 bg-gray-100 rounded px-1.5 py-0.5">
              {d.pair}
            </span>
            {#if i === data.gdbLast30.length - 1}
              <span class="text-xs text-blue-500 mt-0.5">mới</span>
            {/if}
          </div>
        {/each}
        {#if data.gdbLast30.length === 0}
          <span class="text-gray-400 text-sm">Chưa có dữ liệu GĐB.</span>
        {/if}
      </div>
    </div>

    <!-- ACF chart -->
    {#if data.acf.length === 0}
      <div class="surface-card card-pad text-center text-gray-400">
        Cần ít nhất 15 kỳ GĐB để tính tương quan.
      </div>
    {:else}
      <div class="surface-card card-pad">
        <p class="text-sm font-semibold text-gray-700 mb-1">Biểu đồ ACF (lag 1–{data.acf.length})</p>
        <p class="text-xs text-gray-400 mb-3">Trục ngang: lag (kỳ trước đó) · Trục dọc: hệ số tương quan (−1 đến +1)</p>
        <svg viewBox="0 0 {ACF_W} {ACF_H}" class="w-full max-w-lg" style="height:160px">
          <!-- Lưới ngang -->
          {#each [-0.2, 0, 0.2] as y}
            <line
              x1={ACF_MARGIN.left} y1={acfYScale(y)}
              x2={ACF_MARGIN.left + chartW} y2={acfYScale(y)}
              stroke="#f3f4f6" stroke-width="1"
            />
            <text x={ACF_MARGIN.left - 4} y={acfYScale(y) + 4} text-anchor="end" font-size="9" fill="#9ca3af">
              {y}
            </text>
          {/each}

          <!-- Đường zero -->
          <line
            x1={ACF_MARGIN.left} y1={acfZeroY}
            x2={ACF_MARGIN.left + chartW} y2={acfZeroY}
            stroke="#6b7280" stroke-width="1"
          />

          <!-- Đường ngưỡng ý nghĩa 95% (±2/√n) -->
          <line
            x1={ACF_MARGIN.left} y1={acfCritY}
            x2={ACF_MARGIN.left + chartW} y2={acfCritY}
            stroke="#f59e0b" stroke-width="1.5" stroke-dasharray="5,3"
          />
          <line
            x1={ACF_MARGIN.left} y1={acfCritYn}
            x2={ACF_MARGIN.left + chartW} y2={acfCritYn}
            stroke="#f59e0b" stroke-width="1.5" stroke-dasharray="5,3"
          />
          <text x={ACF_W - ACF_MARGIN.right + 2} y={acfCritY + 4} font-size="8" fill="#f59e0b">
            +{data.critValue}
          </text>
          <text x={ACF_W - ACF_MARGIN.right + 2} y={acfCritYn + 4} font-size="8" fill="#f59e0b">
            −{data.critValue}
          </text>

          <!-- Thanh ACF -->
          {#each data.acf as d, i}
            {@const isSig = Math.abs(d.acf) > data.critValue}
            <rect
              x={acfBarX(i)}
              y={d.acf >= 0 ? acfYScale(d.acf) : acfZeroY}
              width={acfBarW}
              height={Math.abs(acfYScale(d.acf) - acfZeroY)}
              fill={isSig ? '#ef4444' : '#3b82f6'}
              rx="2"
            />
            <!-- Label lag -->
            <text
              x={acfBarX(i) + acfBarW / 2}
              y={ACF_H - ACF_MARGIN.bottom + 14}
              text-anchor="middle" font-size="10" fill="#6b7280"
            >
              {d.lag}
            </text>
            <!-- Giá trị ACF -->
            <text
              x={acfBarX(i) + acfBarW / 2}
              y={d.acf >= 0 ? acfYScale(d.acf) - 3 : acfYScale(d.acf) + 11}
              text-anchor="middle" font-size="8"
              fill={isSig ? '#dc2626' : '#6b7280'}
            >
              {d.acf}
            </text>
          {/each}

          <!-- Trục X label -->
          <text
            x={ACF_MARGIN.left + chartW / 2}
            y={ACF_H - 4}
            text-anchor="middle" font-size="9" fill="#9ca3af"
          >
            Lag (kỳ trước)
          </text>
        </svg>
      </div>

      <!-- Kết luận -->
      {#if acfConclusion}
        <div class="rounded-xl p-4 border {acfConclusion.ok
          ? 'bg-green-50 border-green-200 text-green-800'
          : 'bg-red-50 border-red-200 text-red-800'}">
          <p class="font-semibold mb-1">{acfConclusion.ok ? '✓ Kết quả' : '⚠️ Phát hiện'}</p>
          <p class="text-sm">{acfConclusion.text}</p>
        </div>
      {/if}

      <!-- Bảng số liệu ACF -->
      <div class="surface-card overflow-hidden">
        <div class="bg-gray-50 border-b px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Chi tiết ACF</div>
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b bg-gray-50/50 text-xs text-gray-400">
              <th class="text-left px-4 py-2 font-medium">Lag</th>
              <th class="text-right px-4 py-2 font-medium">Hệ số ACF</th>
              <th class="text-right px-4 py-2 font-medium">Ngưỡng 95%</th>
              <th class="text-right px-4 py-2 font-medium">Kết luận</th>
            </tr>
          </thead>
          <tbody class="divide-y">
            {#each data.acf as d}
              {@const sig = Math.abs(d.acf) > data.critValue}
              <tr class="{sig ? 'bg-red-50/50' : ''}">
                <td class="px-4 py-2 font-mono text-gray-700">Lag {d.lag}</td>
                <td class="px-4 py-2 text-right font-mono font-semibold {sig ? 'text-red-600' : 'text-gray-700'}">
                  {d.acf}
                </td>
                <td class="px-4 py-2 text-right font-mono text-gray-400">±{data.critValue}</td>
                <td class="px-4 py-2 text-right text-xs">
                  {#if sig}
                    <span class="text-red-600 font-medium">⚠️ Có tương quan</span>
                  {:else}
                    <span class="text-green-600">✓ Ngẫu nhiên</span>
                  {/if}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </div>

<!-- ================================================================== -->
<!-- TAB 4: CONFIDENCE INTERVAL (MONTE CARLO)                          -->
<!-- ================================================================== -->
{:else if activeTab === 'ci'}
  <div class="space-y-4">

    <!-- Giải thích -->
    <div class="bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-sm text-indigo-900 leading-relaxed">
      <p class="font-semibold mb-1">Khoảng tin cậy thống kê (Monte Carlo)</p>
      <p>
        Tưởng tượng chạy <strong>10.000 lần mô phỏng xổ số ngẫu nhiên</strong> với cùng số kỳ.
        Mỗi mô phỏng đếm mỗi cặp xuất hiện bao nhiêu lần. Khoảng tin cậy cho biết
        <em>phạm vi bình thường</em> nếu xổ số hoàn toàn ngẫu nhiên.
      </p>
      <ul class="mt-2 space-y-1 text-xs">
        <li>• <strong>CI 95%</strong>: [{data.ci.lo95} – {data.ci.hi95}] lần — phạm vi bình thường</li>
        <li>• <strong>CI 99%</strong>: [{data.ci.lo99} – {data.ci.hi99}] lần — phạm vi rất rộng</li>
        <li>• <strong>Kỳ vọng</strong>: {data.ci.mean} lần/cặp (σ = {data.ci.std})</li>
        <li>• Cặp ngoài CI 95%: <strong>kỳ vọng ~5 cặp</strong> ngay cả khi hoàn toàn ngẫu nhiên</li>
      </ul>
    </div>

    <!-- Tổng quan -->
    <div class="grid grid-cols-2 gap-3 md:grid-cols-4">
      <div class="metric-card !min-h-0 text-center">
        <p class="text-xs text-gray-400 uppercase tracking-wide mb-1">Kỳ vọng</p>
        <p class="text-2xl font-bold font-mono text-gray-800">{data.ci.mean}</p>
        <p class="text-xs text-gray-400">lần/cặp</p>
      </div>
      <div class="metric-card !min-h-0 text-center">
        <p class="text-xs text-gray-400 uppercase tracking-wide mb-1">CI 95%</p>
        <p class="text-lg font-bold font-mono text-gray-700">[{data.ci.lo95} – {data.ci.hi95}]</p>
      </div>
      <div class="metric-card !min-h-0 text-center">
        <p class="text-xs text-gray-400 uppercase tracking-wide mb-1">Ngoài CI 95%</p>
        <p class="text-2xl font-bold font-mono {data.outsideCI95 > 10 ? 'text-red-600' : 'text-orange-500'}">
          {data.outsideCI95}
        </p>
        <p class="text-xs text-gray-400">cặp (kỳ vọng ~5)</p>
      </div>
      <div class="metric-card !min-h-0 text-center">
        <p class="text-xs text-gray-400 uppercase tracking-wide mb-1">Ngoài CI 99%</p>
        <p class="text-2xl font-bold font-mono {data.outsideCI99 > 5 ? 'text-red-600' : 'text-gray-700'}">
          {data.outsideCI99}
        </p>
        <p class="text-xs text-gray-400">cặp (kỳ vọng ~1)</p>
      </div>
    </div>

    <!-- Chú thích màu -->
    <div class="flex flex-wrap gap-3 text-xs text-gray-600">
      <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded bg-red-500 inline-block"></span>Rất cao (ngoài CI 99%)</span>
      <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded bg-orange-400 inline-block"></span>Cao (ngoài CI 95%)</span>
      <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded bg-gray-200 inline-block"></span>Bình thường (trong CI 95%)</span>
      <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded bg-blue-400 inline-block"></span>Thấp (ngoài CI 95%)</span>
      <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded bg-blue-600 inline-block"></span>Rất thấp (ngoài CI 99%)</span>
    </div>

    <!-- Lưới 10×10 -->
    <div class="surface-card card-pad">
      <p class="text-sm font-semibold text-gray-700 mb-3">Bản đồ CI toàn bộ 100 cặp</p>
      <div class="grid grid-cols-10 gap-1">
        {#each data.pairsCI as p}
          <div class="flex flex-col items-center py-1.5 rounded {ciColor(p.ciClass)}"
               title="{p.pair}: {p.count} lần">
            <span class="font-mono text-xs font-bold leading-none">{p.pair}</span>
            <span class="text-xs leading-none mt-0.5 opacity-70">{p.count}</span>
          </div>
        {/each}
      </div>
    </div>

    <!-- Danh sách cặp ngoài CI -->
    {#if data.pairsOutside.length > 0}
      <div class="surface-card overflow-hidden">
        <div class="bg-gray-50 border-b px-4 py-2.5 text-sm font-semibold text-gray-700">
          Cặp ngoài khoảng tin cậy 95% ({data.pairsOutside.length} cặp)
        </div>
        <div class="divide-y">
          {#each data.pairsOutside.sort((a, b) => b.count - a.count) as p}
            <div class="flex items-center gap-4 px-4 py-2.5">
              <span class="font-mono font-bold text-lg w-10">{p.pair}</span>
              <span class="font-mono text-gray-700 w-12 text-right">{p.count}×</span>
              <div class="flex-1">
                <!-- Mini bar so với kỳ vọng -->
                <div class="relative h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div class="absolute left-0 top-0 h-full rounded-full {p.count > data.ci.mean ? 'bg-orange-400' : 'bg-blue-400'}"
                       style="width: {Math.min(100, Math.round(p.count / (data.ci.hi99 || 1) * 100))}%">
                  </div>
                  <!-- Marker kỳ vọng -->
                  <div class="absolute top-0 h-full w-0.5 bg-gray-400"
                       style="left: {Math.round(data.ci.mean / (data.ci.hi99 || 1) * 100)}%">
                  </div>
                </div>
              </div>
              <span class="text-xs px-2 py-0.5 rounded-full {ciColor(p.ciClass)} border">
                {p.ciClass === 'extreme-high' ? 'Rất cao' :
                 p.ciClass === 'high'         ? 'Cao' :
                 p.ciClass === 'low'          ? 'Thấp' :
                 p.ciClass === 'extreme-low'  ? 'Rất thấp' : ''}
              </span>
            </div>
          {/each}
        </div>
        <div class="px-4 py-2.5 bg-gray-50 border-t text-xs text-gray-400">
          Kỳ vọng ({data.ci.mean} lần) · CI 95% [{data.ci.lo95} – {data.ci.hi95}] · CI 99% [{data.ci.lo99} – {data.ci.hi99}]
        </div>
      </div>
    {:else}
      <div class="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-800">
        ✓ Tất cả 100 cặp đều nằm trong khoảng tin cậy 95% — phân phối bình thường.
      </div>
    {/if}
  </div>
{/if}
