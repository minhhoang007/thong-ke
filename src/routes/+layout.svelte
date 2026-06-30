<script>
  import { browser } from '$app/environment';
  import favicon from '$lib/assets/favicon.svg';
  import '../app.css';

  let { children } = $props();

  if (browser && 'serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }

  const NAV_LINKS = [
    { href: '/',          label: 'Dashboard' },
    { href: '/nhap-lieu', label: 'Nhập liệu' },
    { href: '/thong-ke',  label: 'Thống kê' },
    { href: '/lo-gan',    label: 'Lô Gan' },
    { href: '/cau-lo',    label: 'Cầu Lô' },
    { href: '/dan-de',    label: 'Dàn Đề' },
    { href: '/lich',      label: 'Lịch' },
    { href: '/lich-su',   label: 'Lịch sử' },
  ];

  let menuOpen = $state(false);
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

<nav class="bg-blue-800 text-white shadow-md">
  <div class="px-4 py-3 flex items-center justify-between">
    <a href="/" onclick={() => menuOpen = false}
      class="font-bold text-xl tracking-wide shrink-0 hover:text-blue-200">
      Times
    </a>

    <!-- Desktop links -->
    <div class="hidden md:flex gap-5 items-center text-sm">
      {#each NAV_LINKS as link}
        <a href={link.href} class="hover:underline opacity-90 hover:opacity-100">{link.label}</a>
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
    <div class="md:hidden border-t border-blue-700 px-4 py-2">
      {#each NAV_LINKS as link}
        <a href={link.href} onclick={() => menuOpen = false}
          class="block py-2.5 text-sm border-b border-blue-700/40 last:border-0
                 opacity-90 hover:opacity-100 hover:text-blue-200">
          {link.label}
        </a>
      {/each}
    </div>
  {/if}
</nav>

<main class="p-4 md:p-6 max-w-5xl mx-auto">
  {@render children()}
</main>
