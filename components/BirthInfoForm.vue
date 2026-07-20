<script setup lang="ts">
import type { BirthInfo, Gender } from "~/types/ziwei";
import { Navigation } from "@lucide/vue";
import cityData from "~/data/cities.json";
import type { CityOption } from "~/components/CityPicker.vue";

const props = withDefaults(
  defineProps<{
    initial?: BirthInfo | null;
    submitLabel?: string;
    disabled?: boolean;
    defaultGender?: Gender;
    genderLabel?: string;
    dateLabel?: string;
    timeLabel?: string;
    cityLabel?: string;
    longitudeLabel?: string;
    previewTitle?: string;
    previewTimeLabel?: string;
  }>(),
  {
    defaultGender: "男",
    genderLabel: "生理性別",
    dateLabel: "出生日期 (YYYY/MM/DD)",
    timeLabel: "出生時間 (24小時制 HH:MM)",
    cityLabel: "出生城市",
    longitudeLabel: "手動輸入經度",
    previewTitle: "真太陽時校正",
    previewTimeLabel: "真太陽時",
  },
);

const emit = defineEmits<{ submit: [value: BirthInfo] }>();
const form = reactive({
  gender: (props.initial?.gender || props.defaultGender) as Gender,
  date: props.initial
    ? `${props.initial.year}/${String(props.initial.month).padStart(2, "0")}/${String(props.initial.day).padStart(2, "0")}`
    : "",
  time: props.initial
    ? `${String(props.initial.hour).padStart(2, "0")}:${String(props.initial.minute).padStart(2, "0")}`
    : "",
  cityId: (props.initial?.cityId || "").replaceAll("-", "_"),
  longitude: props.initial?.longitude ?? 120,
});
const dateError = ref("");
const timeError = ref("");
const cityError = ref("");

const selectedLongitude = computed(() =>
  form.cityId === "OTHER"
    ? Number(form.longitude)
    : cityData.find((city) => city.id === form.cityId)?.lng || 120,
);
const offset = computed(() => (selectedLongitude.value - 120) * 4);
const trueSolar = computed(() => {
  const date = new Date(`${form.date.replaceAll("/", "-")}T${form.time}:00`);
  if (Number.isNaN(date.getTime())) return "--";
  date.setMinutes(date.getMinutes() + offset.value);
  return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
});

function formatDate(event: Event) {
  const input = event.target as HTMLInputElement;
  const digits = input.value.replace(/\D/g, "").slice(0, 8);
  form.date = [digits.slice(0, 4), digits.slice(4, 6), digits.slice(6, 8)]
    .filter(Boolean)
    .join("/");
  dateError.value = "";
}

function formatTime(event: Event) {
  const input = event.target as HTMLInputElement;
  const digits = input.value.replace(/\D/g, "").slice(0, 4);
  form.time = [digits.slice(0, 2), digits.slice(2, 4)]
    .filter(Boolean)
    .join(":");
  timeError.value = "";
}

function submit() {
  dateError.value = "";
  timeError.value = "";
  cityError.value = "";
  const [year, month, day] = form.date.split("/").map(Number);
  const [hour, minute] = form.time.split(":").map(Number);
  const date = new Date(year, month - 1, day);
  if (
    !year ||
    !month ||
    !day ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    dateError.value = "請輸入有效日期 (YYYY/MM/DD)";
  }
  if (
    !Number.isInteger(hour) ||
    !Number.isInteger(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    timeError.value = "請輸入有效時間 (HH:MM)";
  }
  if (!form.cityId) cityError.value = "請選擇出生城市";
  if (dateError.value || timeError.value || cityError.value) return;
  emit("submit", {
    gender: form.gender,
    year,
    month,
    day,
    hour,
    minute,
    cityId: form.cityId,
    longitude: selectedLongitude.value,
  });
}

function selectCity(city: CityOption) {
  cityError.value = "";
  if (city.id !== "OTHER") form.longitude = city.lng;
}
</script>

<template>
  <form class="birth-form form-stack" @submit.prevent="submit">
    <div class="gender-field">
      <div class="gender-label">
        <AppMaterialIcon name="person_outline_rounded" :size="18" /><span>{{
          genderLabel
        }}</span>
      </div>
      <div class="gender-picker" role="radiogroup" :aria-label="genderLabel">
        <button
          v-for="gender in ['男', '女'] as Gender[]"
          :key="gender"
          type="button"
          role="radio"
          :class="{ active: form.gender === gender }"
          :aria-checked="form.gender === gender"
          @click="form.gender = gender"
        >
          <span class="gender-check"
            ><AppMaterialIcon
              v-if="form.gender === gender"
              name="check_rounded"
              :size="12"
          /></span>
          <span>{{ gender }}</span>
        </button>
      </div>
    </div>

    <div class="app-input-field" :class="{ invalid: dateError }">
      <label for="birth-date">{{ dateLabel }}</label>
      <div class="app-input-wrap">
        <AppMaterialIcon name="calendar_month" :size="20" /><input
          id="birth-date"
          :value="form.date"
          type="text"
          inputmode="numeric"
          maxlength="10"
          placeholder="YYYY/MM/DD"
          autocomplete="bday"
          :aria-invalid="Boolean(dateError)"
          @input="formatDate"
        />
      </div>
      <small class="field-error">{{ dateError || "\u00a0" }}</small>
    </div>

    <div class="app-input-field" :class="{ invalid: timeError }">
      <label for="birth-time">{{ timeLabel }}</label>
      <div class="app-input-wrap">
        <AppMaterialIcon name="access_time" :size="20" /><input
          id="birth-time"
          :value="form.time"
          type="text"
          inputmode="numeric"
          maxlength="5"
          placeholder="HH:MM"
          :aria-invalid="Boolean(timeError)"
          @input="formatTime"
        />
      </div>
      <small class="field-error">{{ timeError || "\u00a0" }}</small>
    </div>

    <div class="field city-field" :class="{ invalid: cityError }">
      <label>{{ cityLabel }}</label
      ><CityPicker v-model="form.cityId" @select="selectCity" /><small
        class="field-error"
        >{{ cityError || "\u00a0" }}</small
      >
    </div>
    <div v-if="form.cityId === 'OTHER'" class="field">
      <label for="longitude">{{ longitudeLabel }}</label
      ><input
        id="longitude"
        v-model.number="form.longitude"
        class="input"
        type="number"
        min="-180"
        max="180"
        step="0.01"
      />
    </div>
    <section class="solar-preview glass">
      <Navigation :size="20" /><span
        ><strong>{{ previewTitle }}</strong
        ><span>{{ previewTimeLabel }}　{{ trueSolar }}</span
        ><small
          >校正 {{ offset > 0 ? "+" : "" }}{{ offset.toFixed(1) }} 分鐘</small
        ></span
      >
    </section>
    <button class="app-button" type="submit" :disabled="disabled">
      {{ submitLabel || "開始排盤" }}
    </button>
  </form>
</template>

<style scoped>
.birth-form {
  width: 100%;
}
.gender-field {
  display: grid;
  gap: 8px;
}
.gender-label {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-left: 4px;
  color: rgba(36, 87, 90, 0.64);
  font-size: 14px;
  font-weight: 600;
}
.gender-picker {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 16px;
}
.gender-picker button {
  position: relative;
  display: grid;
  place-items: center;
  height: 56px;
  border: 1.2px solid rgba(36, 87, 90, 0.24);
  border-radius: 18px;
  background: var(--white);
  color: var(--mountain);
  font-size: 16px;
  font-weight: 700;
}
.gender-picker button.active {
  border: 2px solid var(--mountain);
}
.gender-check {
  position: absolute;
  left: 10px;
  top: 10px;
  display: grid;
  place-items: center;
  width: 16px;
  height: 16px;
  border: 1.2px solid rgba(36, 87, 90, 0.24);
  border-radius: 50%;
  color: white;
}
.gender-picker button.active .gender-check {
  border-color: var(--mountain);
  background: var(--mountain);
}
.app-input-field {
  display: grid;
  gap: 6px;
  min-width: 0;
}
.app-input-field > label {
  color: rgba(36, 87, 90, 0.68);
  font-size: 13px;
  font-weight: 700;
}
.app-input-wrap {
  display: grid;
  grid-template-columns: 28px 1fr;
  align-items: center;
  min-height: 56px;
  padding: 0 15px;
  border: 1.4px solid rgba(36, 87, 90, 0.42);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.88);
  color: var(--mountain);
}
.app-input-wrap:focus-within {
  border: 2.2px solid var(--mountain);
}
.app-input-wrap input {
  width: 100%;
  height: 52px;
  padding: 0 4px;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--mountain);
  font-size: 16px;
  font-weight: 600;
}
.app-input-wrap input::placeholder {
  color: rgba(36, 87, 90, 0.32);
}
.app-input-field.invalid .app-input-wrap {
  border-color: var(--cinnabar);
}
.field-error {
  display: block;
  min-height: 18px;
  padding-left: 14px;
  color: var(--cinnabar);
  font-size: 12px;
  font-weight: 700;
  line-height: 18px;
}
.city-field.invalid :deep(.city-trigger) {
  border-color: var(--cinnabar);
}
.solar-preview {
  display: grid;
  grid-template-columns: 24px 1fr;
  gap: 10px;
  padding: 15px 17px;
  border-radius: 18px;
  margin-bottom: 16px;
}
.solar-preview > span {
  display: grid;
  gap: 0px;
}
.solar-preview strong {
  font-size: 14px;
}
.solar-preview span {
  font-size: 13px;
  font-weight: 700;
}
.solar-preview small {
  color: var(--text-soft);
}
</style>
