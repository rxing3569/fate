<template>
  <main class="cms-layout"><slot /></main>
</template>

<style>
html:has(.cms-layout), body:has(.cms-layout), #__nuxt:has(.cms-layout) { min-height: 100%; background: #f4f7f6; }
body:has(.cms-layout) { margin: 0; }
.cms-layout { min-height: 100dvh; color: #183532; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
.cms-layout *, .cms-layout *::before, .cms-layout *::after { box-sizing: border-box; }
</style>
