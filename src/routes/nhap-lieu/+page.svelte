<svelte:head>
  <title>Nhập liệu — XoSo Stats</title>
</svelte:head>

<script>
  import { parseCSV, CSV_TEMPLATE } from '$lib/logic/csv-parser.js';

  // ── Cấu hình giải ──────────────────────────────────────────────
  const PRIZE_CONFIG = [
    { key: 'giai_db',   label: 'Giải đặc biệt', count: 1, digits: 5 },
    { key: 'giai_nhat', label: 'Giải nhất',      count: 1, digits: 5 },
    { key: 'giai_nhi',  label: 'Giải nhì',       count: 2, digits: 5 },
    { key: 'giai_ba',   label: 'Giải ba',         count: 6, digits: 5 },
    { key: 'giai_tu',   label: 'Giải tư',         count: 4, digits: 4 },
    { key: 'giai_nam',  label: 'Giải năm',        count: 6, digits: 4 },
    { key: 'giai_sau',  label: 'Giải sáu',        count: 3, digits: 3 },
    { key: 'giai_bay',  label: 'Giải bảy',        count: 4, digits: 2 },
  ];

  // ── State chung ─────────────────────────────────────────────────
  let activeTab = $state('manual'); // 'manual' | 'csv'

  // ── State nhập tay ──────────────────────────────────────────────
  const today = new Date().toISOString().slice(0, 10);
  let draw_date = $state(today);
  let province  = $state('mien-bac');
  let prizes    = $state(Object.fromEntries(PRIZE_CONFIG.map(p => [p.key, Array(p.count).fill('')])));
  let manualStatus  = $state('idle');
  let manualMessage = $state('');

  async function handleManualSubmit() {
    manualStatus = 'loading';
    const prizesPayload = {};
    for (const p of PRIZE_CONFIG) {
      prizesPayload[p.key] = p.count === 1 ? prizes[p.key][0] : prizes[p.key];
    }
    try {
      const res  = await fetch('/api/results', { method: 'POST', headers: { 'Content-Type': 'application/json' },
                               body: JSON.stringify({ draw_date, province, prizes: prizesPayload }) });
      const data = await res.json();
      if (res.ok) {
        manualStatus  = 'success';
        manualMessage = `Đã lưu kỳ ngày ${draw_date} (ID: ${data.drawId})`;
        prizes = Object.fromEntries(PRIZE_CONFIG.map(p => [p.key, Array(p.count).fill('')]));
      } else {
        manualStatus  = 'error';
        manualMessage = data.error || 'Lưu thất bại.';
      }
    } catch {
      manualStatus = 'error'; manualMessage = 'Không kết nối được server.';
    }
  }

  function handleInput(event, key, index, digits) {
    const val = event.target.value.replace(/\D/g, '').slice(0, digits);
    prizes[key][index] = val;
    if (val.length === digits) {
      const next = event.target.closest('.prize-row')?.querySelectorAll('input')[index + 1];
      if (next) next.focus();
    }
  }

  // ── State CSV import ─────────────────────────────────────────────
  let csvDraws   = $state([]);    // rows parsed từ file
  let csvErrors  = $state([]);    // lỗi parse
  let csvStatus  = $state('idle'); // 'idle' | 'loading' | 'success' | 'error'
  let csvMessage = $state('');
  let csvProgress = $state(0);

  function handleFileChange(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const { draws, errors } = parseCSV(e.target.result);
      csvDraws  = draws;
      csvErrors = errors;
      csvStatus = 'idle';
      csvMessage = '';
    };
    reader.readAsText(file, 'utf-8');
  }

  async function handleCSVImport() {
    if (csvDraws.length === 0) return;
    csvStatus = 'loading';
    csvProgress = 0;
    try {
      const res  = await fetch('/api/results/batch', { method: 'POST',
                               headers: { 'Content-Type': 'application/json' },
                               body: JSON.stringify({ draws: csvDraws }) });
      const data = await res.json();
      if (res.ok) {
        csvStatus  = 'success';
        csvMessage = `Đã nhập thành công ${data.count} kỳ xổ số.`;
        csvDraws   = [];
        csvErrors  = [];
      } else {
        csvStatus  = 'error';
        csvMessage = data.error || 'Import thất bại.';
      }
    } catch {
      csvStatus = 'error'; csvMessage = 'Không kết nối được server.';
    }
  }

  function downloadTemplate() {
    const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a'); a.href = url; a.download = 'mau-xoso.csv';
    a.click(); URL.revokeObjectURL(url);
  }

  const PROVINCE_LABEL = { 'mien-bac': 'Miền Bắc', 'mien-trung': 'Miền Trung', 'mien-nam': 'Miền Nam' };
  const PRIZE_LABEL    = { giai_db:'Đặc biệt', giai_nhat:'Nhất', giai_nhi:'Nhì',
                           giai_ba:'Ba', giai_tu:'Tư', giai_nam:'Năm', giai_sau:'Sáu', giai_bay:'Bảy' };

  // ── Scrape tự động ──────────────────────────────────────────────────
  let scrapeStatus  = $state('idle'); // 'idle' | 'loading' | 'preview' | 'error'
  let scrapeMessage = $state('');
  let scrapePartial = $state(false);

  async function handleScrape() {
    scrapeStatus  = 'loading';
    scrapeMessage = '';
    const dateParam = draw_date !== today ? `&date=${draw_date}` : '';
    try {
      const res  = await fetch(`/api/scrape?province=${province}${dateParam}`);
      const data = await res.json();
      if (!res.ok) {
        scrapeStatus  = 'error';
        scrapeMessage = data.error || 'Lấy dữ liệu thất bại.';
        return;
      }
      // Điền kết quả vào form nhập tay
      for (const p of PRIZE_CONFIG) {
        const val = data.prizes[p.key];
        if (!val) continue;
        prizes[p.key] = Array.isArray(val) ? val : [val];
      }
      scrapeStatus  = 'preview';
      scrapePartial = data.partial;
      scrapeMessage = data.partial
        ? `Tìm được ${data.foundCount}/${data.totalPrizes} giải. Kiểm tra và điền các ô còn thiếu.`
        : 'Đã lấy đủ kết quả. Kiểm tra lại rồi nhấn Lưu.';
    } catch {
      scrapeStatus = 'error'; scrapeMessage = 'Không kết nối được server.';
    }
  }
</script>

<h1 class="text-2xl font-bold mb-6 text-gray-800">Nhập kết quả xổ số</h1>

<!-- Tab chọn chế độ -->
<div class="flex gap-2 mb-6">
  <button onclick={() => activeTab = 'manual'}
    class="px-4 py-2 rounded-lg text-sm font-medium transition-colors
           {activeTab === 'manual' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}">
    Nhập tay
  </button>
  <button onclick={() => activeTab = 'csv'}
    class="px-4 py-2 rounded-lg text-sm font-medium transition-colors
           {activeTab === 'csv' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}">
    Import CSV
  </button>
</div>

<!-- ───── TAB NHẬP TAY ───── -->
{#if activeTab === 'manual'}

  {#if manualStatus === 'success'}
    <div class="mb-4 p-4 bg-green-100 text-green-800 rounded-xl border border-green-300">✅ {manualMessage}</div>
  {/if}
  {#if manualStatus === 'error'}
    <div class="mb-4 p-4 bg-red-100 text-red-800 rounded-xl border border-red-300">❌ {manualMessage}</div>
  {/if}

  <form onsubmit={(e) => { e.preventDefault(); handleManualSubmit(); }}>
    <div class="bg-white border rounded-xl p-6 shadow-sm mb-4">

      <div class="flex gap-4 mb-4 flex-wrap items-end">
        <div>
          <label for="draw_date" class="block text-sm font-medium text-gray-700 mb-1">Ngày xổ</label>
          <input id="draw_date" type="date" bind:value={draw_date} required
            class="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
        </div>
        <div>
          <label for="province" class="block text-sm font-medium text-gray-700 mb-1">Khu vực</label>
          <select id="province" bind:value={province}
            class="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
            <option value="mien-bac">Miền Bắc</option>
            <option value="mien-trung">Miền Trung</option>
            <option value="mien-nam">Miền Nam</option>
          </select>
        </div>
        <!-- Nút lấy kết quả tự động -->
        <button type="button" onclick={handleScrape} disabled={scrapeStatus === 'loading'}
          class="px-4 py-2 rounded-lg text-sm font-medium border border-indigo-300 text-indigo-700
                 hover:bg-indigo-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
          {scrapeStatus === 'loading' ? '⏳ Đang lấy...' : '⚡ Lấy kết quả tự động'}
        </button>
      </div>

      <!-- Thông báo scrape -->
      {#if scrapeStatus === 'preview'}
        <div class="mb-4 p-3 rounded-lg border {scrapePartial ? 'bg-yellow-50 border-yellow-200 text-yellow-800' : 'bg-green-50 border-green-200 text-green-800'} text-sm">
          {scrapePartial ? '⚠️' : '✅'} {scrapeMessage}
        </div>
      {/if}
      {#if scrapeStatus === 'error'}
        <div class="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          ❌ {scrapeMessage}
        </div>
      {/if}

      <div class="space-y-4">
        {#each PRIZE_CONFIG as prize}
          <div class="prize-row flex items-center gap-3 flex-wrap">
            <span class="w-36 text-sm font-semibold text-gray-700 shrink-0">
              {prize.label} <span class="text-xs text-gray-400 font-normal">({prize.digits} số)</span>
            </span>
            <div class="flex gap-2 flex-wrap">
              {#each prizes[prize.key] as _, i}
                <input type="text" inputmode="numeric" value={prizes[prize.key][i]}
                  oninput={(e) => handleInput(e, prize.key, i, prize.digits)}
                  maxlength={prize.digits} placeholder={'_'.repeat(prize.digits)}
                  class="border rounded-lg text-center font-mono text-base focus:outline-none focus:ring-2 focus:ring-blue-400
                         {prize.key === 'giai_db' ? 'w-24 h-12 text-xl font-bold border-blue-400 bg-blue-50'
                          : prize.digits >= 5 ? 'w-20 h-10' : prize.digits === 4 ? 'w-16 h-10' : 'w-12 h-10'}" />
              {/each}
            </div>
          </div>
        {/each}
      </div>
    </div>

    <button type="submit" disabled={manualStatus === 'loading'}
      class="w-full py-3 rounded-xl font-semibold text-white transition-colors
             {manualStatus === 'loading' ? 'bg-blue-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}">
      {manualStatus === 'loading' ? 'Đang lưu...' : 'Lưu kết quả'}
    </button>
  </form>

<!-- ───── TAB CSV IMPORT ───── -->
{:else}

  <div class="bg-white border rounded-xl p-6 shadow-sm mb-4">
    <div class="flex items-start justify-between gap-4 mb-4 flex-wrap">
      <div>
        <h2 class="font-semibold text-gray-800 mb-1">Import từ file CSV</h2>
        <p class="text-sm text-gray-500">Mỗi dòng = 1 kỳ xổ số. Tải file mẫu để xem định dạng đúng.</p>
      </div>
      <button onclick={downloadTemplate}
        class="text-sm px-4 py-2 border rounded-lg text-blue-600 hover:bg-blue-50 shrink-0">
        Tải file mẫu CSV
      </button>
    </div>

    <label for="csvfile" class="block text-sm font-medium text-gray-700 mb-2">Chọn file CSV</label>
    <input id="csvfile" type="file" accept=".csv,text/csv" onchange={handleFileChange}
      class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4
             file:rounded-lg file:border file:text-sm file:font-medium
             file:bg-blue-50 file:text-blue-600 hover:file:bg-blue-100" />
  </div>

  <!-- Lỗi parse -->
  {#if csvErrors.length > 0}
    <div class="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl">
      <p class="font-medium text-red-700 mb-2">Phát hiện {csvErrors.length} lỗi:</p>
      <ul class="text-sm text-red-600 space-y-1">
        {#each csvErrors as err}
          <li>• {err}</li>
        {/each}
      </ul>
    </div>
  {/if}

  <!-- Thông báo import -->
  {#if csvStatus === 'success'}
    <div class="mb-4 p-4 bg-green-100 text-green-800 rounded-xl border border-green-300">✅ {csvMessage}</div>
  {/if}
  {#if csvStatus === 'error'}
    <div class="mb-4 p-4 bg-red-100 text-red-800 rounded-xl border border-red-300">❌ {csvMessage}</div>
  {/if}

  <!-- Preview dữ liệu đã parse -->
  {#if csvDraws.length > 0}
    <div class="bg-white border rounded-xl shadow-sm overflow-hidden mb-4">
      <div class="px-4 py-3 border-b bg-gray-50 flex items-center justify-between">
        <span class="font-semibold text-gray-700">Xem trước — {csvDraws.length} kỳ</span>
      </div>
      <div class="divide-y max-h-72 overflow-y-auto">
        {#each csvDraws as d, i}
          <div class="px-4 py-2 flex items-center gap-4 text-sm">
            <span class="text-gray-400 w-6 text-right shrink-0">{i + 1}</span>
            <span class="font-mono font-semibold text-blue-700 w-28">{d.draw_date}</span>
            <span class="text-gray-500">{PROVINCE_LABEL[d.province] ?? d.province}</span>
            <span class="text-gray-400">
              ĐB: <span class="font-mono text-gray-700">{d.prizes.giai_db}</span>
            </span>
          </div>
        {/each}
      </div>
    </div>

    <button onclick={handleCSVImport} disabled={csvStatus === 'loading'}
      class="w-full py-3 rounded-xl font-semibold text-white transition-colors
             {csvStatus === 'loading' ? 'bg-blue-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}">
      {csvStatus === 'loading' ? 'Đang nhập...' : `Nhập tất cả ${csvDraws.length} kỳ`}
    </button>
  {/if}

{/if}
