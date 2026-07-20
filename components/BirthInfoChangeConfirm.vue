<script setup lang="ts">
defineProps<{ open: boolean, loading?: boolean }>()
defineEmits<{ cancel: [], confirm: [] }>()
</script>

<template>
  <AppBottomSheet :open="open" :locked="loading" labelledby="birth-confirm-title" @close="$emit('cancel')">
        <template #header><h2 id="birth-confirm-title">確認修改命盤資料？</h2></template>
        <p>修改出生資料或性別後，系統將會清空所有您已保存的命盤與分析紀錄，此動作無法復原。</p>
        <p>是否確定要修改並清空舊有命盤？</p>
        <div class="confirm-actions">
          <button class="app-button outline" type="button" :disabled="loading" @click="$emit('cancel')">取消</button>
          <button class="app-button" type="button" :disabled="loading" @click="$emit('confirm')">{{ loading ? '更新中…' : '確定修改' }}</button>
        </div>
  </AppBottomSheet>
</template>

<style scoped>
p { margin:16px auto 0;color:rgba(36,87,90,.72);font-size:14px;line-height:1.55; }
p + p { margin-top:12px; }
.confirm-actions { display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:28px; }
</style>
