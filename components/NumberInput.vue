<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: {
    type: [Number, String],
    default: 0
  },
  min: {
    type: Number,
    default: 1
  },
  max: {
    type: Number,
    default: 9999
  }
})

const emit = defineEmits(['update:modelValue'])

const inputValue = computed({
  get: () => props.modelValue,
  set: (val) => updateValue(val)
})

function updateValue(val) {
  let num = parseInt(val)
  if (isNaN(num)) return // Don't update if invalid (or handle empty)
  
  // Validation bounds
  if (num < props.min) num = props.min
  if (num > props.max) num = props.max
  
  emit('update:modelValue', num)
}

function handleInput(e) {
  // Remove non-digit chars immediately for "positive integer" rule
  let val = e.target.value.replace(/[^0-9]/g, '')
  if (val === '') return // Allow empty temporarily? Or force min?
  e.target.value = val 
  // Update model logic handled by change or blur usually, but here we want reactive
  updateValue(val)
}

function increment() {
  updateValue(Number(props.modelValue) + 1)
}

function decrement() {
  updateValue(Number(props.modelValue) - 1)
}
</script>

<template>
  <div class="number-input-wrapper">
    <input 
      type="number" 
      :value="inputValue" 
      @input="handleInput"
      class="custom-input"
      placeholder="年"
    >
    <div class="spinners">
      <button class="spin-btn up" @click="increment">▲</button>
      <button class="spin-btn down" @click="decrement">▼</button>
    </div>
  </div>
</template>

<style scoped>
.number-input-wrapper {
  display: flex;
  position: relative;
  width: 80px; /* adjusted width */
  height: 32px;
  border: 1px solid #d7ccc8;
  border-radius: 6px;
  background: #fff;
  overflow: hidden;
  transition: border-color 0.2s;
}

.number-input-wrapper:hover,
.number-input-wrapper:focus-within {
  border-color: #8d6e63;
}

.custom-input {
  width: 100%;
  border: none;
  outline: none;
  padding: 0 0.5rem;
  font-size: 14px;
  color: #5d4037;
  text-align: center;
  background: transparent;
  /* Hide standard appearance */
  -moz-appearance: textfield;
  appearance: textfield;
}
.custom-input::-webkit-outer-spin-button,
.custom-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.spinners {
  display: flex;
  flex-direction: column;
  width: 20px;
  border-left: 1px solid #eee;
}

.spin-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fdfbf7;
  border: none;
  cursor: pointer;
  font-size: 8px; /* Tiny arrows */
  color: #8d6e63;
  padding: 0;
  line-height: 1;
  transition: background 0.2s, color 0.2s;
}

.spin-btn:hover {
  background: #8d6e63;
  color: white;
}

.spin-btn.up {
  border-bottom: 1px solid #eee;
}
</style>
