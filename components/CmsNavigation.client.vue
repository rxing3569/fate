<script setup lang="ts">
type Page = "dashboard" | "members" | "orders" | "issues";
const props = defineProps<{ page: Page }>();
const emit = defineEmits<{ logout: [] }>();
const menuOpen = ref(false);
const route = useRoute();
const links = [
  { page: "dashboard" as const, to: "/cms/", label: "數據總覽" },
  { page: "members" as const, to: "/cms/members/", label: "會員管理" },
  { page: "orders" as const, to: "/cms/orders/", label: "訂單管理" },
  { page: "issues" as const, to: "/cms/issues/", label: "問題回報" },
];
watch(() => route.path, () => { menuOpen.value = false; });
</script>

<template>
  <aside class="cms-navigation">
    <div class="brand"><p>FATEJYC</p><h2>CMS</h2></div>
    <button class="menu-toggle" type="button" :aria-expanded="menuOpen" aria-controls="cms-navigation-menu" aria-label="切換管理後台選單" @click="menuOpen = !menuOpen">
      <span /><span /><span />
    </button>
    <div id="cms-navigation-menu" class="menu" :class="{ open: menuOpen }">
      <nav>
        <NuxtLink v-for="link in links" :key="link.page" :to="link.to" :class="{ active: props.page === link.page }">{{ link.label }}</NuxtLink>
      </nav>
      <button class="logout" type="button" @click="emit('logout')">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M10 5H6.5A1.5 1.5 0 0 0 5 6.5v11A1.5 1.5 0 0 0 6.5 19H10m5-4 3-3-3-3m3 3H9" />
        </svg>
        <span>登出管理後台</span>
      </button>
    </div>
  </aside>
</template>

<style scoped>
.cms-navigation{position:sticky;top:0;z-index:20;height:100dvh;padding:30px 24px;background:#123e37;color:#fff;display:flex;flex-direction:column}
.brand p{margin:0 0 5px;color:#9cc1b8;font-size:11px;font-weight:800;letter-spacing:.16em}.brand h2{margin:0;font-size:28px}
.menu{min-height:0;flex:1;display:flex;flex-direction:column}nav{display:grid;gap:8px;margin-top:48px}nav a{padding:11px 12px;color:#d8ebe6;text-decoration:none;border-radius:9px}nav a:hover,nav a.active{background:#ffffff18;color:#fff}
.logout{width:100%;margin-top:auto;padding:11px 13px;border:1px solid #ffffff24;border-radius:10px;background:#ffffff0b;color:#d8ebe6;display:flex;align-items:center;gap:9px;font:inherit;font-size:13px;font-weight:750;text-align:left;cursor:pointer;transition:background .18s ease,border-color .18s ease,color .18s ease}.logout:hover{border-color:#ffffff42;background:#ffffff16;color:#fff}.logout:focus-visible{outline:2px solid #9cd3c7;outline-offset:3px}.logout svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}.menu-toggle{display:none}
@media(max-width:900px){
  .cms-navigation{height:64px;padding:0 18px;flex-direction:row;align-items:center;justify-content:space-between}
  .brand{display:flex;align-items:baseline;gap:9px}.brand p{margin:0}.brand h2{font-size:22px}
  .menu-toggle{width:42px;height:42px;padding:10px;border:0;border-radius:9px;background:transparent;display:grid;align-content:center;gap:5px;cursor:pointer}.menu-toggle:hover,.menu-toggle[aria-expanded=true]{background:#ffffff14}.menu-toggle span{display:block;height:2px;border-radius:2px;background:#fff}
  .menu{position:absolute;top:64px;left:0;right:0;display:none;padding:10px 14px 16px;background:#123e37;border-top:1px solid #ffffff16;box-shadow:0 14px 28px #102c2730}.menu.open{display:block}
  nav{margin:0}nav a{display:block}.logout{margin-top:10px;padding:12px 13px;background:#ffffff0e}
}
</style>
