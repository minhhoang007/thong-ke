<script>
  import { browser } from '$app/environment';
  import { page } from '$app/state';
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
  function isActive(href) { return href === '/' ? page.url.pathname === '/' : page.url.pathname.startsWith(href); }
  function groupActive(item) { return item.children?.some((child) => isActive(child.href)); }
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

<nav class="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 text-slate-700 shadow-[0_8px_30px_rgba(31,49,90,0.06)] backdrop-blur-xl">
  <div class="app-container flex h-16 items-center justify-between gap-5">
    <a href="/" onclick={closeAll}
      class="group flex shrink-0 items-center gap-2.5" aria-label="Times XS — Trang chủ">
      <span class="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-sm font-black text-white shadow-lg shadow-blue-200">T</span>
      <span class="leading-tight">
        <span class="block text-base font-extrabold tracking-tight text-slate-900">Times XS</span>
        <span class="hidden text-[10px] font-semibold uppercase tracking-[.16em] text-slate-400 sm:block">Dữ liệu & thống kê</span>
      </span>
    </a>

    <!-- Desktop links -->
    <div class="hidden lg:flex gap-1 items-center text-sm">
      {#each NAV as item}
        {#if item.children}
          <div class="relative">
            <button onclick={() => toggleDesk(item.label)}
              class="flex items-center gap-1.5 rounded-xl px-3.5 py-2 font-semibold transition-colors
                     {groupActive(item) ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}">
              {item.label}
              <svg class="h-3.5 w-3.5 transition-transform {openDesk === item.label ? 'rotate-180' : ''}" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clip-rule="evenodd"/></svg>
            </button>
            {#if openDesk === item.label}
              <div class="absolute right-0 z-30 mt-2 w-56 rounded-2xl border border-slate-200 bg-white p-2 text-slate-700 shadow-2xl shadow-slate-300/50">
                {#each item.children as c}
                  <a href={c.href} onclick={closeAll}
                    class="block rounded-xl px-3 py-2.5 text-sm font-medium transition-colors
                           {isActive(c.href) ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50 hover:text-slate-950'}">
                    {c.label}
                  </a>
                {/each}
              </div>
            {/if}
          </div>
        {:else}
          <a href={item.href} onclick={closeAll}
            class="rounded-xl px-3.5 py-2 font-semibold transition-colors
                   {isActive(item.href) ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}">{item.label}</a>
        {/if}
      {/each}
    </div>

    <!-- Hamburger button (mobile only) -->
    <button onclick={() => menuOpen = !menuOpen}
      class="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 lg:hidden"
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
    <div class="app-container border-t border-slate-100 py-3 lg:hidden">
      {#each NAV as item}
        {#if item.children}
          <div class="px-2 pb-1 pt-3 text-[10px] font-extrabold uppercase tracking-[.16em] text-slate-400">
            {item.label}
          </div>
          {#each item.children as c}
            <a href={c.href} onclick={closeAll}
              class="my-0.5 block rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors
                     {isActive(c.href) ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}">
              {c.label}
            </a>
          {/each}
        {:else}
          <a href={item.href} onclick={closeAll}
            class="my-0.5 block rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors
                   {isActive(item.href) ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-50'}">
            {item.label}
          </a>
        {/if}
      {/each}
    </div>
  {/if}
</nav>

<!-- Backdrop đóng dropdown desktop khi bấm ra ngoài -->
{#if openDesk}
  <button class="fixed inset-0 z-30 hidden cursor-default lg:block" aria-label="Đóng menu"
    onclick={closeAll}></button>
{/if}

<main class="app-container min-h-[calc(100vh-8rem)] py-5 sm:py-7 lg:py-9">
  {@render children()}
</main>

<footer class="border-t border-slate-200/80 bg-white/60 py-5 text-center text-xs text-slate-400">
  <div class="app-container">Times XS · Dữ liệu thống kê chỉ mang tính tham khảo</div>
</footer>
