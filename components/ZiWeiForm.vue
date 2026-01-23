<script setup>
import { ref, onMounted } from 'vue'

const formData = ref({
  name: '',
  date: '',
  timeIndex: 0,
  gender: 'male'
})

const timeOptions = [
  { value: 0, label: '子 23:00～00:59' },
  { value: 1, label: '丑 01:00～02:59' },
  { value: 2, label: '寅 03:00～04:59' },
  { value: 3, label: '卯 05:00～06:59' },
  { value: 4, label: '辰 07:00～08:59' },
  { value: 5, label: '巳 09:00～10:59' },
  { value: 6, label: '午 11:00～12:59' },
  { value: 7, label: '未 13:00～14:59' },
  { value: 8, label: '申 15:00～16:59' },
  { value: 9, label: '酉 17:00～18:59' },
  { value: 10, label: '戌 19:00～20:59' },
  { value: 11, label: '亥 21:00～22:59' },
]

const emit = defineEmits(['submit'])

function handleSubmit() {
  if (!formData.value.name || !formData.value.date) return
  emit('submit', { ...formData.value })
}

function saveToCache() {
  if (!formData.value.name && !formData.value.date) return 
  localStorage.setItem('ziwei_form_data', JSON.stringify(formData.value))
  alert('資料已儲存！')
}

onMounted(() => {
  const cached = localStorage.getItem('ziwei_form_data')
  if (cached) {
    try {
      const parsed = JSON.parse(cached)
      formData.value = { ...formData.value, ...parsed }
    } catch (e) {
      console.error('Failed to load cached data', e)
    }
  }
})
</script>

<template>
  <div class="form-card glass">
    <form @submit.prevent="handleSubmit" class="form-grid">
      <div class="form-group">
        <label>姓名</label>
        <input type="text" v-model="formData.name" placeholder="請輸入姓名" required class="input-field" />
      </div>

      <div class="form-group">
        <label>性別</label>
        <div class="radio-group">
          <label class="radio-label">
            <input type="radio" v-model="formData.gender" value="male" />
            <span>男 (乾造)</span>
          </label>
          <label class="radio-label">
            <input type="radio" v-model="formData.gender" value="female" />
            <span>女 (坤造)</span>
          </label>
        </div>
      </div>

      <div class="form-group">
        <label>出生日期 (國曆)</label>
        <input type="date" v-model="formData.date" required class="input-field" />
      </div>

      <div class="form-group">
        <label>出生時辰</label>
        <select v-model="formData.timeIndex" class="input-field select-field">
          <option v-for="option in timeOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
      </div>

      <div class="form-actions">
        <button type="button" @click="saveToCache" class="btn btn-secondary">儲存資料</button>
        <button type="submit" class="btn btn-primary">排盤</button>
      </div>
    </form>
  </div>
</template>

<style scoped>
.form-card {
  padding: 3rem;
  border-radius: 20px;
  max-width: 600px;
  width: 100%;
  margin: 0 auto;
  background: #FFFAF0; /* Light beige/cream */
  box-shadow: 0 10px 30px rgba(0,0,0,0.05);
  border: 1px solid rgba(74, 59, 50, 0.1);
}

h2 {
  margin-bottom: 2rem;
  text-align: center;
  font-size: 2.5rem;
  color: #5d4037;
  letter-spacing: 4px;
}

.form-grid {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  text-align: left;
}

label {
  font-size: 1rem;
  color: #5d4037;
  font-weight: 600;
}

.input-field {
  padding: 0.8rem 1rem;
  border-radius: 8px;
  background: #fff;
  border: 1px solid #e0e0e0;
  color: #4a3b32;
  font-size: 1rem;
  transition: all 0.3s;
}

.input-field:focus {
  outline: none;
  border-color: #81C7D4;
  box-shadow: 0 0 0 3px rgba(129, 199, 212, 0.2);
}

.radio-group {
  display: flex;
  gap: 2rem;
  padding: 0.5rem 0;
}

.radio-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  color: #5d4037;
  font-weight: 500;
}

input[type="radio"] {
  accent-color: #81C7D4;
  width: 1.2rem;
  height: 1.2rem;
}

.form-actions {
  margin-top: 2rem;
  text-align: center;
  display: flex; /* Added flex for side-by-side buttons */
  justify-content: center;
  gap: 1rem;
}

.btn {
    display: inline-flex; justify-content: center; align-items: center;
    padding: 1rem 2rem;
    font-size: 1.2rem; letter-spacing: 2px; /* Adjusted letter spacing */
    border: none;
    border-radius: 50px;
    cursor: pointer; transition: all 0.3s;
    font-weight: bold;
}

.btn-primary {
    display: inline-flex; justify-content: center; align-items: center;
    width: 100%;
    background: #5d4037; color: white;

    box-shadow: 0 4px 10px rgba(93, 64, 55, 0.3);
}

.btn-primary:hover {
    background: #4a3b32;
    transform: translateY(-2px);
    box-shadow: 0 6px 15px rgba(93, 64, 55, 0.4);
}

.btn-secondary {
    background: #e0e0e0; color: #5d4037;
    box-shadow: 0 4px 10px rgba(0,0,0,0.1);
}
.btn-secondary:hover {
    background: #d5d5d5;
    transform: translateY(-2px);
    box-shadow: 0 6px 15px rgba(0,0,0,0.15);
}

@media (max-width: 600px) {
  .form-card { padding: 2rem 1.5rem; }
  h2 { font-size: 1.8rem; }
  .radio-group { flex-direction: column; gap: 1rem; }
  .btn-primary { padding: 0.8rem 2rem; }
}
</style>
