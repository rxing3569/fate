<template>
  <div class="analysis-progress-bar" role="progressbar" aria-label="解析進度">
    <span />
  </div>
</template>

<style scoped>
.analysis-progress-bar {
  flex: 0 0 auto;
  width: min(calc(100% - 48px), 620px);
  height: 2px;
  margin: 0 auto;
  overflow: hidden;
  background: rgba(36, 87, 90, 0.08);
}
.analysis-progress-bar span {
  display: block;
  width: 35%;
  height: 100%;
  background: var(--mountain);
  transform: translateX(-100%);
  animation: analysis-progress 1.15s linear infinite;
}
@keyframes analysis-progress {
  to {
    transform: translateX(286%);
  }
}
@media (prefers-reduced-motion: reduce) {
  .analysis-progress-bar span {
    animation-duration: 2.5s;
  }
}
</style>
