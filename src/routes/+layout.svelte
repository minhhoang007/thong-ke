<script>
  import favicon from '$lib/assets/favicon.svg';
  import '../app.css';

  let { children } = $props();
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
</svelte:head>

<nav class="bg-blue-800 text-white px-6 py-4 flex gap-6 items-center shadow-md flex-wrap">
  <span class="font-bold text-xl tracking-wide shrink-0">XoSo Stats</span>
  <a href="/" class="hover:underline text-sm">Dashboard</a>
  <a href="/nhap-lieu" class="hover:underline text-sm">Nhập liệu</a>
  <a href="/thong-ke" class="hover:underline text-sm">Thống kê</a>
  <a href="/lo-gan" class="hover:underline text-sm">Lô Gan</a>
  <a href="/lich-su" class="hover:underline text-sm">Lịch sử</a>
</nav>

<main class="p-6 max-w-5xl mx-auto">
  {@render children()}
</main>
