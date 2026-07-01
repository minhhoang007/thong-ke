<script>
  import { browser } from '$app/environment';
  import favicon from '$lib/assets/favicon.svg';
  import '../app.css';

  let { children } = $props();

  if (browser && 'serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }

  // Menu 2 cấp: item có `children` là menu cha (dropdown), còn lại là link đơn.
  const NAV = [
    { href: '/', label: 'Dashboard' },
    {
      label: 'Thống kê',
      children: [
        { href: '/thong-ke',   label: 'Bảng thống kê' },
        { href: '/khuyen-nghi', label: 'Khuyến nghị' },
        { href: '/lo-gan',     label: 'Lô Gan' },
        { href: '/cau-lo',     label: 'Cầu Lô' },
        { href: '/dan-de',     label: 'Dàn Đề' },
        { href: '/du-doan',    label: 'Dự Đoán' },
        { href: '/nghien-cuu', label: 'Nghiên cứu' },
      ],
    },
    {
      label: 'Dữ liệu',
      children: [
        { href: '/nhap-lieu',  label: 'Nhập liệu' },
        { href: '/lich',       label: 'Lịch' },
        { href: '/lich-su',    label: 'Lịch sử' },
        { href: '/trang-thai', label: 'Trạng thái' },
      ],
    },
  ];

  let menuOpen = $state(false);   // hamburger mobile
  let openDesk = $state(null);    // label dropdown desktop đang mở

  function toggleDesk(label) { openDesk = openDesk === label ? null : label; }
  function closeAll() { openDesk = null; menuOpen = false; }
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
  <link rel="manifest" href="/manifest.json" />
  <meta name="theme-color" content="#1e40af" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
  <meta name="apple-mobile-web-app-title" content="Times XS" />
  <link rel="apple-touch-icon" href="/icon.svg" />
</svelte:head>

<nav class="bg-blue-800 text-white shadow-md relative z-20">
  <div class="px-4 py-3 flex items-center justify-between">
    <a href="/" onclick={closeAll}
      class="font-bold text-xl tracking-wide shrink-0 hover:text-blue-200">
      Times
    </a>

    <!-- Desktop links -->
    <div class="hidden md:flex gap-1 items-center text-sm">
      {#each NAV as item}
        {#if item.children}
          <div class="relative">
            <button onclick={() => toggleDesk(item.label)}
              class="px-3 py-2 rounded hover:bg-blue-700 flex items-center gap-1 transition-colors">
              {item.label}
              <span class="text-[10px] opacity-70">{openDesk === item.label ? '▲' : '▼'}</span>
            </button>
            {#if openDesk === item.label}
              <div class="absolute right-0 mt-1 w-44 bg-white text-gray-700 rounded-lg shadow-lg py-1 z-30">
                {#each item.children as c}
                  <a href={c.href} onclick={closeAll}
                    class="block px-4 py-2 text-sm hover:bg-blue-50 hover:text-blue-700">
                    {c.label}
                  </a>
                {/each}
              </div>
            {/if}
          </div>
        {:else}
          <a href={item.href} onclick={closeAll}
            class="px-3 py-2 rounded hover:bg-blue-700 transition-colors">{item.label}</a>
        {/if}
      {/each}
    </div>

    <!-- Hamburger button (mobile only) -->
    <button onclick={() => menuOpen = !menuOpen}
      class="md:hidden p-2 rounded hover:bg-blue-700 transition-colors"
      aria-label={menuOpen ? 'Đóng menu' : 'Mở menu'}>
      {#if menuOpen}
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
        </svg>
      {:else}
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
        </svg>
      {/if}
    </button>
  </div>

  <!-- Mobile dropdown -->
  {#if menuOpen}
    <div class="md:hidden border-t border-blue-700 py-2">
      {#each NAV as item}
        {#if item.children}
          <div class="px-3 pt-2 pb-1 text-xs font-semibold uppercase tracking-wide text-blue-300">
            {item.label}
          </div>
          {#each item.children as c}
            <a href={c.href} onclick={closeAll}
              class="block px-6 py-3 text-base border-b border-blue-700/30 last:border-0
                     opacity-90 hover:opacity-100 hover:bg-blue-700/40 transition-colors">
              {c.label}
            </a>
          {/each}
        {:else}
          <a href={item.href} onclick={closeAll}
            class="block px-3 py-3 text-base font-medium border-b border-blue-700/30
                   opacity-90 hover:opacity-100 hover:bg-blue-700/40 transition-colors">
            {item.label}
          </a>
        {/if}
      {/each}
    </div>
  {/if}
</nav>

<!-- Backdrop đóng dropdown desktop khi bấm ra ngoài -->
{#if openDesk}
  <button class="fixed inset-0 z-10 cursor-default hidden md:block" aria-label="Đóng menu"
    onclick={closeAll}></button>
{/if}

<main class="p-4 md:p-6 max-w-5xl mx-auto">
  {@render children()}
</main>
