<svelte:head>
  <title>Lịch sử — XoSo Stats</title>
</svelte:head>

<script>
  import { invalidateAll } from '$app/navigation';

  let { data } = $props();

  const PRIZE_LABEL = {
    giai_db: 'Đặc biệt', giai_nhat: 'Nhất', giai_nhi: 'Nhì',
    giai_ba: 'Ba', giai_tu: 'Tư', giai_nam: 'Năm', giai_sau: 'Sáu', giai_bay: 'Bảy',
  };
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
  const PROVINCE_LABEL = { 'mien-bac': 'Miền Bắc', 'mien-trung': 'Miền Trung', 'mien-nam': 'Miền Nam' };

  // ── State danh sách ──
  // Dùng $effect để sync từ server data (cần thiết khi invalidateAll() sau delete)
  let draws      = $state([]);
  let total      = $state(0);
  let hasMore    = $state(false);
  let loadPage   = $state(2);
  let loadingMore = $state(false);

  $effect(() => {
    draws   = data.draws;
    total   = data.total;
    hasMore = data.hasMore;
    loadPage = 2;
  });

  async function loadMore() {
    loadingMore = true;
    const res  = await fetch(`/api/results?page=${loadPage}&pageSize=20`);
    const json = await res.json();
    draws    = [...draws, ...json.draws];
    hasMore  = json.hasMore;
    loadPage++;
    loadingMore = false;
  }

  // ── Expand / chi tiết ──
  let expandedId   = $state(null);
  let expandedData = $state(null);

  async function toggleExpand(id) {
    if (expandedId === id) { expandedId = null; expandedData = null; editingId = null; return; }
    expandedId   = id;
    expandedData = null;
    editingId    = null;
    const res    = await fetch(`/api/results/${id}`);
    expandedData = await res.json();
  }

  // ── Xóa ──
  let deletingId = $state(null);

  async function handleDelete(id, date) {
    if (!confirm(`Xóa kỳ ngày ${date}? Thao tác này không thể hoàn tác.`)) return;
    deletingId = id;
    await fetch(`/api/results/${id}`, { method: 'DELETE' });
    draws = draws.filter(d => d.id !== id);
    total--;
    deletingId = null;
    if (expandedId === id) { expandedId = null; expandedData = null; }
  }

  // ── Chỉnh sửa ──
  let editingId     = $state(null);
  let editDate      = $state('');
  let editProvince  = $state('');
  let editPrizes    = $state({});
  let editStatus    = $state('idle');
  let editMessage   = $state('');

  function startEdit() {
    if (!expandedData) return;
    editingId    = expandedData.id;
    editDate     = expandedData.draw_date;
    editProvince = expandedData.province;

    // Gom kết quả theo prize_name
    const grouped = {};
    for (const r of expandedData.results) {
      if (!grouped[r.prize_name]) grouped[r.prize_name] = [];
      grouped[r.prize_name].push(r.value);
    }
    editPrizes = Object.fromEntries(
      PRIZE_CONFIG.map(p => [p.key, Array.from({ length: p.count }, (_, i) => grouped[p.key]?.[i] ?? '')])
    );
    editStatus  = 'idle';
    editMessage = '';
  }

  function handleEditInput(e, key, index, digits) {
    const val = e.target.value.replace(/\D/g, '').slice(0, digits);
    editPrizes[key][index] = val;
    if (val.length === digits) {
      const next = e.target.closest('.edit-prize-row')?.querySelectorAll('input')[index + 1];
      if (next) next.focus();
    }
  }

  async function handleEditSave() {
    editStatus = 'loading';
    const prizesPayload = {};
    for (const p of PRIZE_CONFIG) {
      prizesPayload[p.key] = p.count === 1 ? editPrizes[p.key][0] : editPrizes[p.key];
    }
    try {
      const res  = await fetch(`/api/results/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draw_date: editDate, province: editProvince, prizes: prizesPayload }),
      });
      const json = await res.json();
      if (res.ok) {
        editStatus  = 'success';
        editMessage = 'Đã cập nhật.';
        // Refresh row trong danh sách
        draws = draws.map(d => d.id === editingId
          ? { ...d, draw_date: editDate, province: editProvince }
          : d
        );
        // Reload expanded data
        const detail = await fetch(`/api/results/${editingId}`);
        expandedData = await detail.json();
        editingId = null;
      } else {
        editStatus  = 'error';
        editMessage = json.error || 'Cập nhật thất bại.';
      }
    } catch {
      editStatus = 'error'; editMessage = 'Không kết nối được server.';
    }
  }
</script>

<div class="flex items-center justify-between mb-6">
  <h1 class="text-2xl font-bold text-gray-800">Lịch sử các kỳ xổ số</h1>
  <span class="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
    {total} kỳ
  </span>
</div>

{#if draws.length === 0}
  <div class="bg-white border rounded-xl p-8 text-center shadow-sm">
    <p class="text-gray-400 mb-3">Chưa có kỳ nào được nhập.</p>
    <a href="/nhap-lieu" class="text-blue-600 hover:underline text-sm">Nhập kỳ đầu tiên →</a>
  </div>
{:else}
  <div class="space-y-2">
    {#each draws as draw (draw.id)}
      <div class="bg-white border rounded-xl shadow-sm overflow-hidden">

        <!-- Hàng tóm tắt -->
        <div class="flex items-center gap-4 px-4 py-3">
          <button onclick={() => toggleExpand(draw.id)} class="flex-1 flex items-center gap-4 text-left min-w-0">
            <span class="text-base font-mono font-semibold text-blue-700 w-28 shrink-0">{draw.draw_date}</span>
            <span class="text-sm text-gray-500 shrink-0">{PROVINCE_LABEL[draw.province] ?? draw.province}</span>
            <span class="text-xs text-gray-400 ml-auto shrink-0">{draw.result_count} số</span>
            <span class="text-gray-400 text-sm ml-2 shrink-0">{expandedId === draw.id ? '▲' : '▼'}</span>
          </button>
          <button onclick={() => handleDelete(draw.id, draw.draw_date)}
            disabled={deletingId === draw.id}
            class="text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 disabled:opacity-40 shrink-0">
            {deletingId === draw.id ? '...' : 'Xóa'}
          </button>
        </div>

        <!-- Chi tiết mở rộng -->
        {#if expandedId === draw.id}
          <div class="border-t bg-gray-50">
            {#if !expandedData}
              <p class="px-4 py-3 text-sm text-gray-400">Đang tải...</p>

            {:else if editingId === draw.id}
              <!-- ── Form chỉnh sửa ── -->
              <div class="px-4 py-4">
                <div class="flex gap-4 mb-4 flex-wrap">
                  <div>
                    <label for="edit-date-{draw.id}" class="block text-xs font-medium text-gray-600 mb-1">Ngày xổ</label>
                    <input id="edit-date-{draw.id}" type="date" bind:value={editDate}
                      class="border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                  </div>
                  <div>
                    <label for="edit-province-{draw.id}" class="block text-xs font-medium text-gray-600 mb-1">Khu vực</label>
                    <select id="edit-province-{draw.id}" bind:value={editProvince}
                      class="border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                      <option value="mien-bac">Miền Bắc</option>
                      <option value="mien-trung">Miền Trung</option>
                      <option value="mien-nam">Miền Nam</option>
                    </select>
                  </div>
                </div>

                <div class="space-y-2 mb-4">
                  {#each PRIZE_CONFIG as prize}
                    <div class="edit-prize-row flex items-center gap-2 flex-wrap">
                      <span class="w-32 text-xs font-semibold text-gray-600 shrink-0">
                        {prize.label} <span class="text-gray-400 font-normal">({prize.digits})</span>
                      </span>
                      <div class="flex gap-1.5 flex-wrap">
                        {#each editPrizes[prize.key] as _, i}
                          <input type="text" inputmode="numeric" value={editPrizes[prize.key][i]}
                            oninput={(e) => handleEditInput(e, prize.key, i, prize.digits)}
                            maxlength={prize.digits} placeholder={'_'.repeat(prize.digits)}
                            class="border rounded text-center font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-400
                                   {prize.key === 'giai_db' ? 'w-20 h-9 font-bold border-blue-300 bg-blue-50'
                                    : prize.digits >= 5 ? 'w-16 h-8' : prize.digits === 4 ? 'w-14 h-8' : 'w-10 h-8'}" />
                        {/each}
                      </div>
                    </div>
                  {/each}
                </div>

                {#if editStatus === 'error'}
                  <p class="text-sm text-red-600 mb-3">❌ {editMessage}</p>
                {/if}
                {#if editStatus === 'success'}
                  <p class="text-sm text-green-600 mb-3">✅ {editMessage}</p>
                {/if}

                <div class="flex gap-2">
                  <button onclick={handleEditSave} disabled={editStatus === 'loading'}
                    class="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors
                           {editStatus === 'loading' ? 'bg-blue-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}">
                    {editStatus === 'loading' ? 'Đang lưu...' : 'Lưu'}
                  </button>
                  <button onclick={() => { editingId = null; editStatus = 'idle'; }}
                    class="px-4 py-2 rounded-lg text-sm border text-gray-600 hover:bg-gray-100">
                    Hủy
                  </button>
                </div>
              </div>

            {:else}
              <!-- ── Xem chi tiết ── -->
              <div class="px-4 py-3">
                <div class="grid grid-cols-2 gap-x-8 gap-y-1 md:grid-cols-4 mb-3">
                  {#each expandedData.results as r}
                    <div class="flex items-center gap-2 text-sm">
                      <span class="text-gray-400 w-16 shrink-0">{PRIZE_LABEL[r.prize_name] ?? r.prize_name}</span>
                      <span class="font-mono font-medium text-gray-800">{r.value}</span>
                      <span class="text-gray-300 text-xs">→{r.value.slice(-2)}</span>
                    </div>
                  {/each}
                </div>
                <button onclick={startEdit}
                  class="text-xs px-3 py-1.5 rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50">
                  Chỉnh sửa kỳ này
                </button>
              </div>
            {/if}
          </div>
        {/if}

      </div>
    {/each}
  </div>

  <!-- Load thêm -->
  {#if hasMore}
    <div class="mt-4 text-center">
      <button onclick={loadMore} disabled={loadingMore}
        class="px-6 py-2.5 rounded-xl border text-sm font-medium text-gray-600 hover:bg-gray-50
               disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
        {loadingMore ? 'Đang tải...' : `Xem thêm (đang hiển thị ${draws.length}/${total})`}
      </button>
    </div>
  {:else if draws.length > 20}
    <p class="mt-3 text-center text-xs text-gray-400">Đã hiển thị toàn bộ {total} kỳ.</p>
  {/if}
{/if}
