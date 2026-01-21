<script setup>
defineProps({
  title: {
    type: String,
    required: true
  },
  engTitle: {
    type: String,
    required: true
  }
})
</script>

<template>
  <div class="section-header">
    <h2>{{ title }}</h2>
    <span class="eng-title">{{ engTitle }}</span>
    <div class="ink-line"></div>
  </div>
</template>

<style scoped>
.section-header { text-align: center; margin-bottom: 2rem; }
h2 { font-size: 2.5rem; color: #2c2c2c; margin-bottom: 0.2rem; letter-spacing: 4px; }
.eng-title { font-size: 0.9rem; color: #81C7D4; letter-spacing: 4px; font-weight: bold; text-transform: uppercase; }
.ink-line { width: 60px; height: 3px; background: #81C7D4; margin: 0.8rem auto 0; border-radius: 2px; }

@media (max-width: 768px) {
    h2 { font-size: 2rem; }
}
</style>
