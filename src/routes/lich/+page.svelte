<svelte:head>
  <title>Lịch Xổ Số — Times</title>
</svelte:head>

<script>
  import { goto } from '$app/navigation';

  let { data } = $props();

  const DAYS    = ['T2','T3','T4','T5','T6','T7','CN'];
  const MONTHS  = ['','Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6',
                   'Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12'];
  const PROVINCE_SHORT = { 'mien-bac': 'MB', 'mien-trung': 'MT', 'mien-nam': 'MN' };
  const PRIZE_LABEL = {
    giai_db: 'ĐB', giai_nhat: 'Nhất', giai_nhi: 'Nhì',
    giai_ba: 'Ba', giai_tu: 'Tư', giai_nam: 'Năm', giai_sau: 'Sáu', giai_bay: 'Bảy',
  };

  // Xây dựng lưới calendar
  const calendarCells = $derived.by(() => {
    const firstDay = new Date(data.year, data.month - 1, 1).getDay();
    // Chuyển Sun=0→6, Mon=1→0, ..., Sat=6→5
    const offset   = (firstDay + 6) % 7;
    const daysInMonth = new Date(data.year, data.month, 0).getDate();

    const cells = [];
    for (let i = 0; i < offset; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  });

  function dateStr(day) {
    if (!day) return '';
    return `${data.year}-${String(data.month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
  }

  function prevMonth() {
    let m = data.month - 1, y = data.year;
    if (m < 1) { m = 12; y--; }
    goto(`/lich?year=${y}&month=${m}`);
  }
  function nextMonth() {
    let m = data.month + 1, y = data.year;
    if (m > 12) { m = 1; y++; }
    goto(`/lich?year=${y}&month=${m}`);
  }

  // Chi tiết ngày được chọn
  let selectedDate    = $state(null);
  let selectedDetails = $state(null);
  let loadingDetail   = $state(false);

  async function selectDay(day) {
    const d = dateStr(day);
    if (!data.byDate[d]) return;
    if (selectedDate === d) { selectedDate = null; selectedDetails = null; return; }
    selectedDate    = d;
    selectedDetails = null;
    loadingDetail   = true;
    // Fetch chi tiết cho từng kỳ của ngày đó
    const details = [];
    for (const draw of data.byDate[d]) {
      const res  = await fetch(`/api/results/${draw.id}`);
      const json = await res.json();
      details.push(json);
    }
    selectedDetails = details;
    loadingDetail   = false;
  }

  const today = new Date().toISOString().slice(0, 10);
</script>

<div class="flex items-center justify-between mb-6">
  <h1 class="text-2xl font-bold text-gray-800">Lịch Xổ Số</h1>
  <div class="flex items-center gap-2">
    <button onclick={prevMonth}
      class="px-3 py-1.5 rounded-lg border text-sm text-gray-600 hover:bg-gray-50">‹</button>
    <span class="text-base font-semibold text-gray-700 min-w-[130px] text-center">
      {MONTHS[data.month]} {data.year}
    </span>
    <button onclick={nextMonth}
      class="px-3 py-1.5 rounded-lg border text-sm text-gray-600 hover:bg-gray-50">›</button>
  </div>
</div>

<!-- Lưới calendar -->
<div class="bg-white border rounded-xl shadow-sm overflow-hidden mb-4">
  <!-- Header ngày trong tuần -->
  <div class="grid grid-cols-7 border-b">
    {#each DAYS as d, i}
      <div class="py-2 text-center text-xs font-semibold
                  {i === 6 ? 'text-red-500' : 'text-gray-400'}">
        {d}
      </div>
    {/each}
  </div>

  <!-- Các tuần -->
  <div class="grid grid-cols-7 divide-x divide-y">
    {#each calendarCells as day, i}
      {@const ds = dateStr(day)}
      {@const draws = day ? (data.byDate[ds] ?? []) : []}
      {@const isToday = ds === today}
      {@const isSelected = ds === selectedDate}
      {@const hasDraw = draws.length > 0}

      <div
        onclick={() => day && selectDay(day)}
        class="min-h-[72px] p-1.5 relative transition-colors
               {day ? 'cursor-pointer hover:bg-gray-50' : 'bg-gray-50/50'}
               {isSelected ? 'bg-amber-50 ring-inset ring-2 ring-amber-400' : ''}
               {i % 7 === 6 && day ? 'bg-red-50/30' : ''}">

        {#if day}
          <!-- Số ngày -->
          <div class="flex items-center justify-between mb-1">
            <span class="text-xs font-semibold
                         {isToday ? 'bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px]'
                          : i % 7 === 6 ? 'text-red-400' : 'text-gray-500'}">
              {day}
            </span>
            {#if hasDraw}
              <span class="text-[10px] text-gray-300">{draws.length > 1 ? draws.length+'kỳ' : ''}</span>
            {/if}
          </div>

          <!-- Kết quả GĐB -->
          {#if hasDraw}
            <div class="space-y-0.5">
              {#each draws as draw}
                <div class="flex items-center gap-1">
                  {#if draws.length > 1}
                    <span class="text-[9px] text-gray-400 w-4">{PROVINCE_SHORT[draw.province] ?? '?'}</span>
                  {/if}
                  <span class="font-mono font-bold text-sm text-blue-700
                               {isSelected ? 'text-amber-700' : ''}">
                    {draw.gdb_pair ?? '??'}
                  </span>
                </div>
              {/each}
            </div>
          {:else}
            <div class="text-[10px] text-gray-300 mt-1">—</div>
          {/if}
        {/if}
      </div>
    {/each}
  </div>
</div>

<!-- Chú thích -->
<div class="flex items-center gap-4 text-xs text-gray-400 mb-6 flex-wrap">
  <span>Số lớn = 2 số cuối giải đặc biệt</span>
  <span class="flex items-center gap-1">
    <span class="w-4 h-4 rounded-full bg-blue-600 text-white text-[8px] flex items-center justify-center">•</span>
    Hôm nay
  </span>
  <span class="flex items-center gap-1">
    <span class="w-3 h-3 bg-amber-50 border-2 border-amber-400 rounded inline-block"></span>
    Đang xem chi tiết
  </span>
</div>

<!-- Chi tiết ngày được chọn -->
{#if selectedDate}
  <div class="bg-white border rounded-xl shadow-sm overflow-hidden">
    <div class="px-4 py-3 border-b bg-amber-50 flex items-center justify-between">
      <span class="font-semibold text-amber-800">
        Kết quả ngày {selectedDate}
      </span>
      <button onclick={() => { selectedDate = null; selectedDetails = null; }}
        class="text-amber-500 hover:text-amber-700 text-sm">✕</button>
    </div>

    {#if loadingDetail}
      <p class="px-4 py-6 text-center text-sm text-gray-400">Đang tải...</p>

    {:else if selectedDetails}
      {#each selectedDetails as draw}
        <div class="px-4 py-4 {selectedDetails.length > 1 ? 'border-b last:border-0' : ''}">
          {#if selectedDetails.length > 1}
            <p class="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
              {draw.province === 'mien-bac' ? 'Miền Bắc' : draw.province === 'mien-trung' ? 'Miền Trung' : 'Miền Nam'}
            </p>
          {/if}
          <div class="grid grid-cols-2 gap-x-6 gap-y-1 md:grid-cols-4">
            {#each draw.results ?? [] as r}
              <div class="flex items-center gap-2 text-sm">
                <span class="text-gray-400 text-xs w-12 shrink-0">{PRIZE_LABEL[r.prize_name] ?? r.prize_name}</span>
                <span class="font-mono font-semibold text-gray-800">{r.value}</span>
                <span class="text-gray-300 text-xs font-mono">→{r.value.slice(-2)}</span>
              </div>
            {/each}
          </div>
        </div>
      {/each}
    {/if}
  </div>
{/if}

<!-- Tóm tắt tháng -->
{#if Object.keys(data.byDate).length > 0}
  <div class="mt-6 bg-gray-50 border rounded-xl p-4">
    <p class="text-sm font-semibold text-gray-600 mb-3">
      Tháng {data.month}/{data.year} — {Object.keys(data.byDate).length} ngày có dữ liệu
    </p>
    <div class="flex flex-wrap gap-2">
      {#each Object.entries(data.byDate).sort() as [date, draws]}
        <button onclick={() => selectDay(parseInt(date.slice(8)))}
          class="flex flex-col items-center px-2 py-1.5 rounded-lg border text-xs transition-colors
                 {selectedDate === date ? 'bg-amber-100 border-amber-400 text-amber-800'
                  : 'bg-white hover:bg-gray-50 text-gray-600'}">
          <span class="font-mono font-bold text-sm">{draws[0].gdb_pair ?? '??'}</span>
          <span class="text-gray-400 text-[10px]">{date.slice(8)}</span>
        </button>
      {/each}
    </div>
  </div>
{:else}
  <div class="mt-4 bg-white border rounded-xl p-6 text-center">
    <p class="text-gray-400 text-sm mb-2">Chưa có dữ liệu tháng {data.month}/{data.year}.</p>
    <a href="/nhap-lieu" class="text-blue-600 hover:underline text-sm">Nhập hoặc scrape dữ liệu →</a>
  </div>
{/if}
