<script>
  let { grid, title = '' } = $props();

  const BAR_COLOR = {
    'manh':      '#16a34a',
    'vua':       '#93c5fd',
    'yeu':       '#fb923c',
    'tham-khao': '#e5e7eb',
  };

  // $derived để tự cập nhật khi prop grid thay đổi (khi đổi tab)
  let cells    = $derived(grid.flat().sort((a, b) => a.pair.localeCompare(b.pair)));
  let maxCount = $derived(Math.max(...cells.map(c => c.count), 1));

  const W = 1000;
  const H = 120;
  const BOTTOM = 20; // chỗ để label
  const BAR_W = 8;
  const GAP = 2;
  const STEP = BAR_W + GAP;
</script>

{#if title}
  <p class="mb-3 text-sm font-bold text-slate-700">{title}</p>
{/if}

<div class="scroll-shell border-0 bg-slate-50/70 p-2 sm:p-3">
  <svg viewBox="0 0 {W} {H + BOTTOM}" class="h-[135px] w-full min-w-[500px] sm:h-[150px]">
    {#each cells as cell, i}
      {@const barH = cell.count === 0 ? 2 : Math.max(3, (cell.count / maxCount) * H)}
      {@const x = i * STEP}
      {@const y = H - barH}

      <rect
        x={x}
        y={y}
        width={BAR_W}
        height={barH}
        fill={BAR_COLOR[cell.label]}
        rx="1"
      />

      <!-- Label mỗi 10 cặp: 00, 10, 20, ... -->
      {#if i % 10 === 0}
        <text
          x={x + BAR_W / 2}
          y={H + BOTTOM - 2}
          font-size="9"
          fill="#9ca3af"
          text-anchor="middle"
        >{cell.pair}</text>
      {/if}
    {/each}

    <!-- Đường nền -->
    <line x1="0" y1={H} x2={W} y2={H} stroke="#e5e7eb" stroke-width="1" />
  </svg>
</div>
