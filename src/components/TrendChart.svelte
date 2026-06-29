<script>
  let { data, title = '' } = $props();

  const COLORS = ['#2563eb', '#16a34a', '#dc2626', '#d97706', '#7c3aed'];

  const W = 900; const H = 160;
  const PL = 32; const PR = 12; const PT = 8; const PB = 28;
  const CW = W - PL - PR;
  const CH = H - PT - PB;

  let periods   = $derived(data.periods);
  let series    = $derived(data.series);
  let maxCount  = $derived(Math.max(...series.flatMap(s => s.counts), 1));

  function xAt(i) {
    return PL + (periods.length < 2 ? CW / 2 : (i / (periods.length - 1)) * CW);
  }
  function yAt(count) {
    return PT + CH - (count / maxCount) * CH;
  }
  function toPoints(counts) {
    return counts.map((c, i) => `${xAt(i)},${yAt(c)}`).join(' ');
  }

  function labelStep(n) {
    if (n <= 6) return 1;
    if (n <= 12) return 2;
    return 3;
  }
</script>

{#if title}
  <p class="text-sm font-semibold text-gray-600 mb-2">{title}</p>
{/if}

{#if periods.length < 2}
  <p class="text-sm text-gray-400 text-center py-6">Cần ít nhất 2 tháng dữ liệu để hiển thị xu hướng.</p>
{:else}

<div class="overflow-x-auto">
  <svg viewBox="0 0 {W} {H}" class="w-full min-w-[500px]" style="height:175px;">

    <!-- Grid ngang -->
    {#each [0, 0.5, 1] as t}
      {@const gy = PT + CH * (1 - t)}
      <line x1={PL} y1={gy} x2={W - PR} y2={gy} stroke="#f3f4f6" stroke-width="1" />
      <text x={PL - 4} y={gy + 3} font-size="9" fill="#d1d5db" text-anchor="end">
        {Math.round(maxCount * t)}
      </text>
    {/each}

    <!-- Label tháng trục X -->
    {#each periods as period, i}
      {#if i % labelStep(periods.length) === 0}
        <text x={xAt(i)} y={H - 4} font-size="9" fill="#9ca3af" text-anchor="middle">{period}</text>
      {/if}
    {/each}

    <!-- Lines + dots -->
    {#each series as s, si}
      {@const color = COLORS[si % COLORS.length]}
      <polyline
        points={toPoints(s.counts)}
        fill="none"
        stroke={color}
        stroke-width="2.5"
        stroke-linejoin="round"
        stroke-linecap="round"
      />
      {#each s.counts as count, i}
        <circle cx={xAt(i)} cy={yAt(count)} r="3.5" fill={color} />
      {/each}
    {/each}

    <!-- Baseline -->
    <line x1={PL} y1={PT + CH} x2={W - PR} y2={PT + CH} stroke="#e5e7eb" stroke-width="1" />
  </svg>
</div>

<!-- Legend -->
<div class="flex gap-5 flex-wrap mt-2">
  {#each series as s, si}
    <span class="flex items-center gap-1.5 text-xs text-gray-600">
      <svg width="18" height="4" style="flex-shrink:0">
        <line x1="0" y1="2" x2="18" y2="2" stroke={COLORS[si % COLORS.length]} stroke-width="2.5" stroke-linecap="round"/>
      </svg>
      <span class="font-mono font-semibold">{s.pair}</span>
    </span>
  {/each}
</div>

{/if}
