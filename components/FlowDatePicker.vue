<script setup lang="ts">
import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  X,
} from "@lucide/vue";

type FlowType = "流年" | "流月" | "流日";
type DialogType = "year" | "month" | "day";
type DialogPanel = "primary" | "year" | "month";

const props = defineProps<{
  flowType: FlowType;
  year: number;
  month: number;
  day: number;
  birthYear: number;
}>();

const emit = defineEmits<{
  "update:year": [number];
  "update:month": [number];
  "update:day": [number];
}>();

const now = new Date();
const maxYear = now.getFullYear() + 1;
const minYear = computed(() =>
  Math.min(maxYear, props.birthYear || now.getFullYear() - 80),
);
const months = Array.from({ length: 12 }, (_, index) => index + 1);
const selectedMonthDays = computed(() =>
  new Date(props.year, props.month, 0).getDate(),
);

const dialog = ref<DialogType | null>(null);
const dialogPanel = ref<DialogPanel>("primary");
const pageStart = ref(Math.max(minYear.value, now.getFullYear() - 10));
const calendarYear = ref(props.year);
const calendarMonth = ref(props.month);

const pickerLabel = computed(() => {
  if (props.flowType === "流年") return "年";
  if (props.flowType === "流月") return "年・月";
  return "年・月・日";
});

const pickerValue = computed(() => {
  const month = String(props.month).padStart(2, "0");
  const day = String(props.day).padStart(2, "0");
  if (props.flowType === "流年") return `${props.year} 年`;
  if (props.flowType === "流月") return `${props.year} 年 ${month} 月`;
  return `${props.year} 年 ${month} 月 ${day} 日`;
});

const yearPage = computed(() =>
  Array.from({ length: 12 }, (_, index) => pageStart.value + index).filter(
    (value) => value >= minYear.value && value <= maxYear,
  ),
);

const yearPageLabel = computed(() => {
  const lastYear = yearPage.value.at(-1) ?? pageStart.value;
  return `${pageStart.value}－${lastYear}`;
});

const dialogTitle = computed(() => {
  if (dialog.value === "year" || dialogPanel.value === "year") {
    return "選擇年份";
  }
  if (dialogPanel.value === "month") return "選擇月份";
  return dialog.value === "month" ? "選擇月份" : "選擇日期";
});

const calendarCells = computed(() => {
  const firstWeekday = new Date(
    calendarYear.value,
    calendarMonth.value - 1,
    1,
  ).getDay();
  const totalDays = new Date(
    calendarYear.value,
    calendarMonth.value,
    0,
  ).getDate();
  const cells: Array<number | null> = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: totalDays }, (_, index) => index + 1),
  ];
  return [...cells, ...Array(42 - cells.length).fill(null)];
});

watch(selectedMonthDays, (maximum) => {
  if (props.day > maximum) emit("update:day", maximum);
});

function setYearPage(value: number) {
  const preferredStart = value - (value % 12);
  pageStart.value = Math.min(
    Math.max(minYear.value, preferredStart),
    Math.max(minYear.value, maxYear - 11),
  );
}

function openPicker() {
  dialog.value =
    props.flowType === "流年"
      ? "year"
      : props.flowType === "流月"
        ? "month"
        : "day";
  dialogPanel.value = "primary";
  calendarYear.value = props.year;
  calendarMonth.value = props.month;
  setYearPage(props.year);
}

function openYearPanel() {
  setYearPage(calendarYear.value);
  dialogPanel.value = "year";
}

function openMonthPanel() {
  dialogPanel.value = "month";
}

function shiftYears(direction: number) {
  pageStart.value = Math.min(
    Math.max(minYear.value, pageStart.value + direction * 12),
    Math.max(minYear.value, maxYear - 11),
  );
}

function chooseYear(value: number) {
  if (dialog.value === "year") {
    emit("update:year", value);
    dialog.value = null;
    return;
  }

  calendarYear.value = value;
  dialogPanel.value = "primary";
}

function moveMonthYear(direction: number) {
  const nextYear = calendarYear.value + direction;
  if (nextYear < minYear.value || nextYear > maxYear) return;
  calendarYear.value = nextYear;
}

function chooseMonth(value: number) {
  emit("update:year", calendarYear.value);
  emit("update:month", value);
  dialog.value = null;
}

function chooseCalendarMonth(value: number) {
  calendarMonth.value = value;
  dialogPanel.value = "primary";
}

function canMoveCalendar(direction: number) {
  const next = new Date(
    calendarYear.value,
    calendarMonth.value - 1 + direction,
    1,
  );
  return next.getFullYear() >= minYear.value && next.getFullYear() <= maxYear;
}

function moveCalendar(direction: number) {
  if (!canMoveCalendar(direction)) return;
  const next = new Date(
    calendarYear.value,
    calendarMonth.value - 1 + direction,
    1,
  );
  calendarYear.value = next.getFullYear();
  calendarMonth.value = next.getMonth() + 1;
}

function chooseDay(value: number) {
  emit("update:year", calendarYear.value);
  emit("update:month", calendarMonth.value);
  emit("update:day", value);
  dialog.value = null;
}
</script>

<template>
  <section class="flow-date-picker glass">
    <button class="date-trigger" type="button" @click="openPicker">
      <small>{{ pickerLabel }}</small>
      <span class="date-trigger-value">
        <strong>{{ pickerValue }}</strong>
        <CalendarDays v-if="flowType === '流日'" :size="21" />
        <ChevronDown v-else :size="21" />
      </span>
    </button>
  </section>

  <Teleport to="body">
    <Transition name="picker-dialog">
      <div v-if="dialog" class="picker-backdrop" @click.self="dialog = null">
        <section
          class="picker-dialog glass"
          role="dialog"
          aria-modal="true"
          aria-label="選擇分析日期"
        >
          <header>
            <div>
              <small>時運解析</small>
              <h2>{{ dialogTitle }}</h2>
            </div>
            <button type="button" aria-label="關閉" @click="dialog = null">
              <X :size="20" />
            </button>
          </header>

          <div class="picker-content">
            <div v-if="dialog === 'year'" class="year-panel">
              <nav class="picker-nav" aria-label="切換年份範圍">
                <button
                  type="button"
                  aria-label="上一組年份"
                  :disabled="pageStart <= minYear"
                  @click="shiftYears(-1)"
                >
                  <ChevronLeft />
                </button>
                <strong>{{ yearPageLabel }}</strong>
                <button
                  type="button"
                  aria-label="下一組年份"
                  :disabled="pageStart + 11 >= maxYear"
                  @click="shiftYears(1)"
                >
                  <ChevronRight />
                </button>
              </nav>
              <div class="year-grid">
                <button
                  v-for="value in yearPage"
                  :key="value"
                  :class="{ selected: value === year }"
                  type="button"
                  @click="chooseYear(value)"
                >
                  {{ value }}
                </button>
              </div>
              <p class="picker-range">可選範圍：{{ minYear }}－{{ maxYear }}</p>
            </div>

            <div v-else-if="dialogPanel === 'year'" class="year-panel">
              <nav class="picker-nav" aria-label="切換年份範圍">
                <button
                  type="button"
                  aria-label="上一組年份"
                  :disabled="pageStart <= minYear"
                  @click="shiftYears(-1)"
                >
                  <ChevronLeft />
                </button>
                <strong>{{ yearPageLabel }}</strong>
                <button
                  type="button"
                  aria-label="下一組年份"
                  :disabled="pageStart + 11 >= maxYear"
                  @click="shiftYears(1)"
                >
                  <ChevronRight />
                </button>
              </nav>
              <div class="year-grid">
                <button
                  v-for="value in yearPage"
                  :key="value"
                  :class="{ selected: value === calendarYear }"
                  type="button"
                  @click="chooseYear(value)"
                >
                  {{ value }}
                </button>
              </div>
              <p class="picker-range">選擇年份後返回{{ dialog === "month" ? "月份" : "日期" }}</p>
            </div>

            <div v-else-if="dialogPanel === 'month'" class="month-panel">
              <nav class="picker-nav" aria-label="選擇月份">
                <span aria-hidden="true"></span>
                <strong>{{ calendarYear }} 年</strong>
                <span aria-hidden="true"></span>
              </nav>
              <div class="month-grid">
                <button
                  v-for="value in months"
                  :key="value"
                  :class="{ selected: value === calendarMonth }"
                  type="button"
                  @click="chooseCalendarMonth(value)"
                >
                  {{ value }} 月
                </button>
              </div>
              <p class="picker-range">選擇月份後返回日期</p>
            </div>

            <div v-else-if="dialog === 'month'" class="month-panel">
              <nav class="picker-nav" aria-label="切換年份">
                <button
                  type="button"
                  aria-label="上一年"
                  :disabled="calendarYear <= minYear"
                  @click="moveMonthYear(-1)"
                >
                  <ChevronLeft />
                </button>
                <button
                  class="picker-nav-trigger"
                  type="button"
                  aria-label="選擇年份"
                  @click="openYearPanel"
                >
                  {{ calendarYear }} 年 <ChevronDown :size="18" />
                </button>
                <button
                  type="button"
                  aria-label="下一年"
                  :disabled="calendarYear >= maxYear"
                  @click="moveMonthYear(1)"
                >
                  <ChevronRight />
                </button>
              </nav>
              <div class="month-grid">
                <button
                  v-for="value in months"
                  :key="value"
                  :class="{
                    selected: value === month && calendarYear === year,
                  }"
                  type="button"
                  @click="chooseMonth(value)"
                >
                  {{ value }} 月
                </button>
              </div>
              <p class="picker-range picker-range-placeholder" aria-hidden="true">
                保留提示文字位置
              </p>
            </div>

            <div v-else class="day-panel">
              <nav class="picker-nav" aria-label="切換月份">
                <button
                  type="button"
                  aria-label="上一個月"
                  :disabled="!canMoveCalendar(-1)"
                  @click="moveCalendar(-1)"
                >
                  <ChevronLeft />
                </button>
                <div class="calendar-period">
                  <button
                    class="picker-nav-trigger"
                    type="button"
                    aria-label="選擇年份"
                    @click="openYearPanel"
                  >
                    {{ calendarYear }} 年 <ChevronDown :size="17" />
                  </button>
                  <button
                    class="picker-nav-trigger"
                    type="button"
                    aria-label="選擇月份"
                    @click="openMonthPanel"
                  >
                    {{ calendarMonth }} 月 <ChevronDown :size="17" />
                  </button>
                </div>
                <button
                  type="button"
                  aria-label="下一個月"
                  :disabled="!canMoveCalendar(1)"
                  @click="moveCalendar(1)"
                >
                  <ChevronRight />
                </button>
              </nav>
              <div class="week-row">
                <span
                  v-for="name in ['日', '一', '二', '三', '四', '五', '六']"
                  :key="name"
                >
                  {{ name }}
                </span>
              </div>
              <div class="calendar-grid">
                <span v-for="(value, index) in calendarCells" :key="index">
                  <button
                    v-if="value"
                    :class="{
                      selected:
                        value === day &&
                        calendarMonth === month &&
                        calendarYear === year,
                    }"
                    type="button"
                    @click="chooseDay(value)"
                  >
                    {{ value }}
                  </button>
                </span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.flow-date-picker {
  width: 100%;
  padding: 16px;
  border-radius: 28px;
}

.date-trigger {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 13px;
  width: 100%;
  min-height: 126px;
  padding: 18px;
  border: 0;
  border-radius: 22px;
  background: transparent;
  color: var(--mountain);
  text-align: center;
}

.date-trigger small {
  color: var(--text-soft);
  font-size: 17px;
  font-weight: 900;
  line-height: 1;
}

.date-trigger-value {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
}

.date-trigger-value strong {
  font-size: clamp(24px, 4.2vw, 31px);
  line-height: 1.2;
}

.date-trigger-value svg {
  flex: 0 0 auto;
}

.picker-backdrop {
  position: fixed;
  z-index: 120;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgba(20, 42, 43, 0.36);
  backdrop-filter: blur(5px);
}

.picker-dialog {
  display: flex;
  flex-direction: column;
  width: min(520px, 100%);
  height: min(500px, calc(100dvh - 48px));
  padding: 24px;
  overflow: hidden;
  border-radius: 30px;
  color: var(--mountain);
}

.picker-dialog > header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex: 0 0 auto;
  gap: 16px;
  margin-bottom: 22px;
}

.picker-dialog header small {
  color: var(--tea);
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.12em;
}

.picker-dialog h2 {
  margin: 5px 0 0;
  font-size: 25px;
  line-height: 1.2;
}

.picker-dialog > header > button,
.picker-nav > button:not(.picker-nav-trigger) {
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  width: 42px;
  height: 42px;
  border: 1px solid rgba(36, 87, 90, 0.1);
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.68);
  color: var(--mountain);
}

.picker-content {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  scrollbar-width: none;
}

.picker-content::-webkit-scrollbar {
  display: none;
}

.year-panel,
.month-panel,
.day-panel {
  display: flex;
  flex-direction: column;
  min-height: 100%;
}

.picker-nav {
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr) 42px;
  align-items: center;
  flex: 0 0 auto;
  gap: 12px;
  margin-bottom: 18px;
}

.picker-nav > strong {
  font-size: 20px;
  text-align: center;
}

.picker-nav-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-width: 0;
  min-height: 42px;
  padding: 7px 12px;
  border: 1px solid rgba(36, 87, 90, 0.12);
  border-radius: 15px;
  background: rgba(255, 255, 255, 0.62);
  color: var(--mountain);
  font-size: 20px;
  font-weight: 900;
  white-space: nowrap;
}

.calendar-period {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-width: 0;
}

.calendar-period .picker-nav-trigger {
  flex: 0 1 auto;
  padding-inline: 10px;
}

.picker-nav button:disabled {
  cursor: not-allowed;
  opacity: 0.3;
}

.year-grid,
.month-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  grid-auto-rows: 52px;
  align-content: center;
  flex: 1 1 auto;
  gap: 9px;
  width: 100%;
}

.year-grid button,
.month-grid button {
  border: 1px solid rgba(36, 87, 90, 0.1);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.6);
  color: var(--mountain);
  font-weight: 850;
}

.year-grid button.selected,
.month-grid button.selected,
.calendar-grid button.selected {
  border-color: transparent;
  background: var(--mountain);
  color: white;
}

.picker-range {
  flex: 0 0 16px;
  height: 16px;
  margin: 14px 0 0;
  overflow: hidden;
  color: var(--text-soft);
  font-size: 12px;
  line-height: 16px;
  text-align: center;
  white-space: nowrap;
}

.picker-range-placeholder {
  visibility: hidden;
}

.week-row,
.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 5px;
}

.week-row {
  flex: 0 0 auto;
  margin-bottom: 7px;
  color: var(--text-soft);
  font-size: 12px;
  font-weight: 800;
  text-align: center;
}

.calendar-grid {
  grid-template-rows: repeat(6, minmax(0, 1fr));
  flex: 1 1 auto;
  min-height: 250px;
}

.calendar-grid span {
  display: grid;
  place-items: center;
  min-width: 0;
  min-height: 0;
}

.calendar-grid button {
  width: min(100%, 42px);
  aspect-ratio: 1;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--mountain);
  font-weight: 800;
}

.calendar-grid button:hover {
  background: rgba(107, 166, 160, 0.16);
}

.picker-dialog-enter-active,
.picker-dialog-leave-active {
  transition: opacity 0.2s;
}

.picker-dialog-enter-active .picker-dialog,
.picker-dialog-leave-active .picker-dialog {
  transition: transform 0.22s;
}

.picker-dialog-enter-from,
.picker-dialog-leave-to {
  opacity: 0;
}

.picker-dialog-enter-from .picker-dialog,
.picker-dialog-leave-to .picker-dialog {
  transform: translateY(12px) scale(0.97);
}

@media (max-width: 540px) {
  .picker-backdrop {
    padding: 16px;
  }

  .picker-dialog {
    height: min(500px, calc(100dvh - 32px));
    padding: 20px 16px;
  }

  .date-trigger {
    min-height: 112px;
  }

  .date-trigger-value strong {
    font-size: clamp(21px, 6vw, 27px);
  }

  .picker-nav-trigger,
  .picker-nav > strong {
    font-size: 18px;
  }

  .calendar-period {
    gap: 5px;
  }

  .calendar-period .picker-nav-trigger {
    padding-inline: 7px;
  }

  .year-grid,
  .month-grid {
    grid-auto-rows: 48px;
    gap: 7px;
  }
}
</style>
