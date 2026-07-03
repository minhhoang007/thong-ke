<svelte:head>
  <title>Dàn Đề — Times</title>
</svelte:head>

<script>
  let { data } = $props();

  const COLOR = {
    'manh':      'bg-green-200 text-green-900 font-bold ring-1 ring-green-400',
    'vua':       'bg-gray-50 text-gray-700 border',
    'yeu':       'bg-orange-100 text-orange-800',
    'tham-khao': 'bg-gray-200 text-gray-400',
  };
  const LABEL_VI = { manh: 'Mạnh', vua: 'Vừa', yeu: 'Yếu', 'tham-khao': 'Chưa ra' };

  let seed    = $state('');
  let formula = $state('dau-duoi');

  // Tạo dàn đề theo từng công thức
  const danDe = $derived.by(() => {
    const s = seed.trim();
    if (!/^\d{2}$/.test(s)) return [];

    const a = parseInt(s[0]); // hàng chục
    const b = parseInt(s[1]); // hàng đơn vị

    if (formula === 'dau-duoi') {
      const set = new Set();
      for (let i = 0; i <= 9; i++) {
        set.add(String(a * 10 + i).padStart(2, '0')); // cùng đầu
        set.add(String(i * 10 + b).padStart(2, '0')); // cùng đuôi
      }
      return [...set].sort();
    }

    if (formula === 'tong') {
      const sum = a + b;
      const pairs = [];
      for (let x = 0; x <= 9; x++) {
        const y = sum - x;
        if (y >= 0 && y <= 9) pairs.push(String(x * 10 + y).padStart(2, '0'));
      }
      return pairs.sort();
    }

    if (formula === 'vong') {
      // Bước 5 → 100/gcd(100,5)=20 cặp duy nhất
      const start = a * 10 + b;
      const pairs = [];
      for (let i = 0; i < 20; i++) pairs.push(String((start + i * 5) % 100).padStart(2, '0'));
      return pairs.sort();
    }

    if (formula === 'guong') {
      // Đối xứng: (9-a)(9-b), plus các cặp liên quan
      const mirror  = String((9 - a) * 10 + (9 - b)).padStart(2, '0');
      const rev     = String(b * 10 + a).padStart(2, '0');
      const revMirror = String((9 - b) * 10 + (9 - a)).padStart(2, '0');
      const sum = a + b;
      const sumPairs = [];
      for (let x = 0; x <= 9; x++) {
        const y = sum - x;
        if (y >= 0 && y <= 9) sumPairs.push(String(x * 10 + y).padStart(2, '0'));
      }
      const diffTarget = Math.abs(a - b);
      const diffPairs = [];
      for (let x = 0; x <= 9; x++) {
        for (let y = 0; y <= 9; y++) {
          if (Math.abs(x - y) === diffTarget) diffPairs.push(String(x * 10 + y).padStart(2, '0'));
        }
      }
      const set = new Set([s, mirror, rev, revMirror, ...sumPairs, ...diffPairs]);
      return [...set].sort();
    }

    return [];
  });

  const FORMULAS = [
    {
      id: 'dau-duoi',
      label: 'Đầu-Đuôi',
      badge: '19 số',
      desc: 'Tất cả cặp cùng đầu (hàng chục) hoặc cùng đuôi (hàng đơn vị) với số hạt nhân.',
    },
    {
      id: 'tong',
      label: 'Tổng',
      badge: 'Theo tổng',
      desc: 'Tất cả cặp có tổng 2 chữ số = tổng của số hạt nhân. Ví dụ: 47 → tổng 11 → 29,38,47,56,65,74,83,92.',
    },
    {
      id: 'vong',
      label: 'Vòng tròn +5',
      badge: '20 số',
      desc: 'Số hạt nhân cộng dần 5 (mod 100) × 20 bước. Mỗi nhóm 5 số bao phủ toàn bộ 100 cặp.',
    },
    {
      id: 'guong',
      label: 'Gương + Tổng',
      badge: 'Tổng hợp',
      desc: 'Kết hợp: số gương (9-a)(9-b), số đảo, cùng tổng, cùng hiệu. Bao quát nhất.',
    },
  ];

  function handleInput(e) {
    const v = e.target.value.replace(/\D/g, '').slice(0, 2);
    seed = v.padStart(v.length === 0 ? 0 : 2, '0') || '';
    e.target.value = v;
  }

  let totalCount    = $derived(danDe.length);
  let avgFreq       = $derived(
    data.totalDraws > 0 && danDe.length > 0
      ? (danDe.reduce((s, p) => s + (data.freqMap[p]?.count ?? 0), 0) / danDe.length).toFixed(1)
      : '—'
  );
</script>

<div class="page-heading">
  <div><div class="eyebrow">Công cụ tạo bộ số</div><h1>Dàn Đề</h1><p>Tạo và đánh giá nhanh một dàn số từ hạt nhân theo công thức đã chọn.</p></div>
</div>
<p class="text-sm text-gray-500 mb-6">Từ 1 số hạt nhân, tạo bộ cặp đề theo công thức dân gian</p>

<!-- Giải thích -->
<div class="warning-panel mb-6 text-sm">
  <p class="font-semibold text-amber-800 mb-1">Dàn đề là gì?</p>
  <p class="text-amber-700 mb-2">
    Người chơi chọn 1 số "hạt nhân" (thường là 2 số cuối giải đặc biệt, hoặc số linh cảm)
    rồi dùng công thức để tạo ra cả <em>bộ cặp</em> liên quan — đánh tất cả để tăng xác suất ít nhất 1 cặp ra.
  </p>
  <p class="text-amber-600 text-xs italic">Xổ số là ngẫu nhiên. Các công thức chỉ mang tính tham khảo vui.</p>
</div>

<!-- Input + Công thức -->
<div class="grid md:grid-cols-2 gap-6 mb-6">

  <!-- Input số hạt nhân -->
  <div class="surface-card card-pad">
    <label for="seed-number" class="block text-sm font-semibold text-gray-700 mb-3">Số hạt nhân (00–99)</label>
    <div class="flex items-center gap-3">
      <input id="seed-number"
        type="text" inputmode="numeric"
        placeholder="47"
        oninput={handleInput}
        maxlength="2"
        class="field-control mono-number !h-14 !w-24 text-center !text-3xl !font-bold
               focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400
               {seed.length === 2 ? 'border-amber-400 bg-amber-50 text-amber-800' : 'border-gray-200 text-gray-400'}"
      />
      {#if seed.length === 2}
        <div class="text-sm text-gray-500">
          <p>Đầu: <strong class="text-gray-800">{seed[0]}</strong> · Đuôi: <strong class="text-gray-800">{seed[1]}</strong></p>
          <p>Tổng: <strong class="text-gray-800">{parseInt(seed[0]) + parseInt(seed[1])}</strong> ·
             Gương: <strong class="text-gray-800">{String((9 - parseInt(seed[0])) * 10 + (9 - parseInt(seed[1]))).padStart(2,'0')}</strong></p>
        </div>
      {/if}
    </div>
  </div>

  <!-- Chọn công thức -->
  <div class="surface-card card-pad">
    <p class="text-sm font-semibold text-gray-700 mb-3">Công thức</p>
    <div class="space-y-2">
      {#each FORMULAS as f}
        <label class="flex items-start gap-2 cursor-pointer group">
          <input type="radio" bind:group={formula} value={f.id} class="mt-0.5 accent-amber-500" />
          <div>
            <span class="text-sm font-medium text-gray-700 group-hover:text-amber-700">{f.label}</span>
            <span class="ml-1.5 text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">{f.badge}</span>
            <p class="text-xs text-gray-400 mt-0.5">{f.desc}</p>
          </div>
        </label>
      {/each}
    </div>
  </div>
</div>

<!-- Kết quả dàn đề -->
{#if seed.length < 2}
  <div class="surface-card card-pad text-center">
    <p class="text-gray-400 text-sm">Nhập số hạt nhân (2 chữ số) để xem dàn đề.</p>
  </div>

{:else if danDe.length === 0}
  <div class="surface-card card-pad text-center">
    <p class="text-gray-400 text-sm">Không tạo được dàn với công thức này.</p>
  </div>

{:else}
  <!-- Tóm tắt -->
  <div class="grid grid-cols-3 gap-3 mb-4">
    <div class="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
      <p class="text-xs text-amber-600">Số cặp trong dàn</p>
      <p class="text-2xl font-bold text-amber-700">{totalCount}</p>
    </div>
    <div class="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">
      <p class="text-xs text-blue-600">Trung bình xuất hiện</p>
      <p class="text-2xl font-bold text-blue-700">{avgFreq}x</p>
    </div>
    <div class="bg-gray-50 border rounded-xl p-3 text-center">
      <p class="text-xs text-gray-500">Dữ liệu từ</p>
      <p class="text-2xl font-bold text-gray-700">{data.totalDraws}</p>
      <p class="text-xs text-gray-400">kỳ</p>
    </div>
  </div>

  <!-- Chú thích màu -->
  <div class="flex gap-2 mb-3 flex-wrap text-xs">
    {#each Object.entries({manh:'Mạnh',vua:'Vừa',yeu:'Yếu','tham-khao':'Chưa ra'}) as [k, v]}
      <span class="px-2.5 py-1 rounded-full {COLOR[k]}">{v}</span>
    {/each}
    <span class="text-gray-400 ml-auto self-center">Màu = tần suất lịch sử toàn bộ</span>
  </div>

  <!-- Dàn cặp -->
  <div class="surface-card card-pad">
    <div class="flex flex-wrap gap-2">
      {#each danDe as pair}
        {@const info = data.freqMap[pair]}
        {@const isSeed = pair === seed}
        <div class="flex flex-col items-center rounded-xl px-3 py-2 min-w-[60px] text-center
                    {isSeed ? 'ring-2 ring-amber-500 bg-amber-50' : (info ? COLOR[info.label] : 'bg-gray-50 text-gray-400')}">
          {#if isSeed}
            <span class="text-xs text-amber-500 font-medium leading-none mb-0.5">★ hạt nhân</span>
          {/if}
          <span class="font-mono font-bold text-xl leading-none">{pair}</span>
          {#if info}
            <span class="text-xs opacity-70 mt-0.5">{info.count}x</span>
          {:else}
            <span class="text-xs opacity-50 mt-0.5">—</span>
          {/if}
        </div>
      {/each}
    </div>
  </div>

  <!-- Bảng thống kê chi tiết -->
  {#if data.totalDraws > 0}
    <details class="mt-4">
      <summary class="cursor-pointer text-sm text-gray-500 hover:text-gray-700 select-none">
        Xem bảng chi tiết ▼
      </summary>
      <div class="surface-card mt-2 overflow-hidden">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b bg-gray-50 text-xs text-gray-500 font-medium">
              <th class="px-4 py-2 text-left">#</th>
              <th class="px-4 py-2 text-center">Cặp</th>
              <th class="px-4 py-2 text-right">Số lần ra</th>
              <th class="px-4 py-2 text-right">% tần suất</th>
              <th class="px-4 py-2 text-left">Mức</th>
            </tr>
          </thead>
          <tbody class="divide-y">
            {#each danDe as pair, i}
              {@const info = data.freqMap[pair]}
              <tr class="hover:bg-gray-50">
                <td class="px-4 py-2 text-gray-400">{i + 1}</td>
                <td class="px-4 py-2 text-center font-mono font-bold
                           {pair === seed ? 'text-amber-600' : 'text-gray-800'}">
                  {pair}{pair === seed ? ' ★' : ''}
                </td>
                <td class="px-4 py-2 text-right font-semibold">{info?.count ?? 0}</td>
                <td class="px-4 py-2 text-right text-gray-500">
                  {info && data.totalDraws > 0 ? (info.count / data.totalDraws * 100).toFixed(1) : '0.0'}%
                </td>
                <td class="px-4 py-2">
                  <span class="text-xs px-2 py-0.5 rounded-full {COLOR[info?.label ?? 'tham-khao']}">
                    {LABEL_VI[info?.label ?? 'tham-khao']}
                  </span>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </details>
  {/if}
{/if}

<!-- Gợi ý sử dụng -->
<div class="mt-6 bg-gray-50 border rounded-xl p-4 text-xs text-gray-500 space-y-1">
  <p class="font-semibold text-gray-600 text-sm mb-2">Cách dùng thông thường</p>
  <p>• <strong>Từ GĐB hôm qua:</strong> Lấy 2 số cuối giải đặc biệt → nhập làm hạt nhân → chọn công thức Đầu-Đuôi.</p>
  <p>• <strong>Từ số linh cảm:</strong> Nhập số bất kỳ → xem dàn → đối chiếu màu sắc tần suất để chọn cặp "mạnh".</p>
  <p>• <strong>Kết hợp:</strong> Dùng cùng trang <a href="/lo-gan" class="text-amber-600 hover:underline">Lô Gan</a>
    — chọn từ dàn những cặp đang "gan" để tăng thêm lý do tin tưởng.</p>
</div>
