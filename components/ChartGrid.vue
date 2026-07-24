<script setup lang="ts">
import { Solar } from "lunar-typescript";
import type { ZiweiChartData } from "~/types/ziwei";
import {
  earthlyBranches,
  getXiaoXianAges,
  heavenlyStems,
  palaceNameForBranch,
} from "~/utils/ziwei/core";
import {
  majorStars,
  majorStarBrightness,
  starCategory,
} from "~/utils/ziwei/stars";
import descriptions from "~/data/star-descriptions.json";

const props = defineProps<{ chart: ZiweiChartData }>();
const emit = defineEmits<{ fullAnalysis: [] }>();
const selectedBranch = ref("");
const showPalaceDetail = ref(false);
const sanFangSiZheng = computed(() => {
  if (!selectedBranch.value) return new Set<string>();
  const index = earthlyBranches.indexOf(selectedBranch.value as never);
  return new Set([
    selectedBranch.value,
    earthlyBranches[(index + 4) % 12],
    earthlyBranches[(index + 6) % 12],
    earthlyBranches[(index + 8) % 12],
  ]);
});
const positions: Record<string, string> = {
  巳: "p-si",
  午: "p-wu",
  未: "p-wei",
  申: "p-shen",
  辰: "p-chen",
  酉: "p-you",
  卯: "p-mao",
  戌: "p-xu",
  寅: "p-yin",
  丑: "p-chou",
  子: "p-zi",
  亥: "p-hai",
};
const bazi = computed(() => {
  try {
    const time = props.chart.trueSolarTime
      ?.split(" ")[1]
      ?.split(":")
      .map(Number) || [12, 0];
    const eight = Solar.fromYmdHms(
      props.chart.solarYear,
      props.chart.solarMonth,
      props.chart.solarDay,
      time[0] || 0,
      time[1] || 0,
      0,
    )
      .getLunar()
      .getEightChar();
    return `${eight.getYear()} ${eight.getMonth()} ${eight.getDay()} ${eight.getTime()}`;
  } catch {
    return "";
  }
});

function palaceDetail(branch: string) {
  return {
    branch,
    name: palaceNameForBranch(props.chart, branch),
    stars: displayStars(branch),
    daXian: daXianRange(branch),
    xiaoXian: getXiaoXianAges(props.chart, branch),
    gods: [
      props.chart.palaceChangSheng[branch],
      props.chart.palaceBoShi[branch],
      props.chart.palaceSuiJian[branch],
      props.chart.palaceJiangQian[branch],
    ].filter(Boolean),
  };
}

const selectedPalace = computed(() => {
  if (!selectedBranch.value) return null;
  return palaceDetail(selectedBranch.value);
});
const relatedPalaces = computed(() => {
  if (!selectedBranch.value) return [];
  const index = earthlyBranches.indexOf(selectedBranch.value as never);
  return [
    { branch: earthlyBranches[(index + 4) % 12], relation: "三合宮" },
    { branch: earthlyBranches[(index + 8) % 12], relation: "三合宮" },
    { branch: earthlyBranches[(index + 6) % 12], relation: "對宮" },
  ].map(({ branch, relation }) => ({
    branch,
    name: palaceNameForBranch(props.chart, branch),
    relation,
  }));
});
const selectedDetailStars = computed(
  () =>
    selectedPalace.value?.stars.filter((star) =>
      starDescription(star, selectedPalace.value!.name),
    ) || [],
);

function daXianRange(branch: string): [number, number] | undefined {
  const existing = props.chart.palaceDaXian?.[branch];
  if (existing?.length === 2) return existing;
  if (
    !props.chart.bureau ||
    !props.chart.destinyPalaceBranch ||
    !props.chart.yearStem
  )
    return undefined;
  const destinyIndex = earthlyBranches.indexOf(
    props.chart.destinyPalaceBranch as never,
  );
  const branchIndex = earthlyBranches.indexOf(branch as never);
  const stemIndex = heavenlyStems.indexOf(props.chart.yearStem as never);
  const forward =
    (stemIndex % 2 === 0 && props.chart.gender === "男") ||
    (stemIndex % 2 !== 0 && props.chart.gender === "女");
  const offset = forward
    ? (branchIndex - destinyIndex + 12) % 12
    : (destinyIndex - branchIndex + 12) % 12;
  const start = props.chart.bureau.number + offset * 10;
  return [start, start + 9];
}

function palaceStem(branch: string) {
  if (!props.chart.yearStem) return "";
  const yearIndex = heavenlyStems.indexOf(props.chart.yearStem as never);
  const branchIndex = earthlyBranches.indexOf(branch as never);
  return heavenlyStems[
    ((yearIndex % 5) * 2 + 2 + ((branchIndex - 2 + 12) % 12)) % 10
  ];
}

function displayName(branch: string) {
  const name = palaceNameForBranch(props.chart, branch);
  return `${props.chart.bodyPalaceBranch === branch ? "[身]" : ""}${name}`;
}

function palaceGods(branch: string) {
  return [
    props.chart.palaceChangSheng[branch],
    props.chart.palaceBoShi[branch],
    props.chart.palaceSuiJian[branch],
    props.chart.palaceJiangQian[branch],
  ].filter((name): name is string => Boolean(name));
}

function displayStars(branch: string) {
  return [...(props.chart.palaceStars[branch] || []), ...palaceGods(branch)];
}

function starLabel(star: string, branch: string) {
  if (!majorStars.includes(star)) return star;
  const branchIndex = earthlyBranches.indexOf(branch as never);
  return `${star}${majorStarBrightness[star]?.[branchIndex] || ""}`;
}

function cleanStar(star: string) {
  return star.replace(/[廟旺得利平陷不]$/, "");
}

function starTone(star: string) {
  const category = starCategory(cleanStar(star));
  return ["major", "lucky", "sha"].includes(category) ? category : "misc";
}

function fullPalaceName(name: string) {
  return name.endsWith("宮") ? name : `${name}宮`;
}

function starDescription(star: string, palaceName: string) {
  const name = cleanStar(star);
  const major = descriptions.major as Record<string, Record<string, string>>;
  const minor = descriptions.minor as Record<string, string>;
  const gods = descriptions.gods as Record<string, string>;
  const siHua = descriptions.siHua as Record<string, string>;
  let text = major[name]?.[palaceName] || minor[name] || gods[name] || "";
  const transformation = props.chart.palaceSiHua[name];
  if (transformation && siHua[transformation])
    text += `${text ? "\n\n" : ""}${transformation}：${siHua[transformation]}`;
  return text;
}
</script>

<template>
  <div class="chart-wrap">
    <div class="palace-grid" aria-label="紫微命盤十二宮">
      <button
        v-for="branch in earthlyBranches"
        :key="branch"
        class="palace"
        :class="[
          positions[branch],
          {
            selected: selectedBranch === branch,
            related: selectedBranch !== branch && sanFangSiZheng.has(branch),
          },
        ]"
        type="button"
        @click="
          selectedBranch = branch;
          showPalaceDetail = true;
        "
      >
        <div class="stars">
          <span
            v-for="star in displayStars(branch)"
            :key="`${branch}-${star}`"
            class="star"
            :class="starCategory(star)"
          >
            <i
              v-for="(character, index) in starLabel(star, branch)"
              :key="`${character}-${index}`"
              >{{ character }}</i
            ><b v-if="chart.palaceSiHua[cleanStar(star)]">{{
              chart.palaceSiHua[cleanStar(star)]?.replace("化", "")
            }}</b>
          </span>
        </div>
        <footer>
          <small>{{ palaceStem(branch) }}{{ branch }}</small
          ><span v-if="daXianRange(branch)" class="daxian-age"
            >{{ daXianRange(branch)?.join(" - ") }} 歲</span
          ><strong>{{ displayName(branch) }}</strong>
        </footer>
      </button>

      <section class="chart-center">
        <strong>{{ chart.gender }}命　{{ chart.bureau?.name }}</strong>
        <span v-if="bazi">{{ bazi }}</span>
        <span>{{
          chart.trueSolarTime ||
          `${chart.solarYear}/${chart.solarMonth}/${chart.solarDay}`
        }}</span>
        <button
          class="center-action"
          type="button"
          @click="emit('fullAnalysis')"
        >
          <AppMaterialIcon name="auto_awesome_rounded" :size="14" />AI 全盤解析
        </button>
      </section>
    </div>

    <AppBottomSheet
      :open="Boolean(selectedPalace && showPalaceDetail)"
      height-mode="viewport"
      scroll-mode="nested"
      sheet-class="palace-detail-sheet"
      content-class="palace-sheet-content"
      @close="showPalaceDetail = false"
    >
      <template v-if="selectedPalace" #header>
        <header class="palace-sheet-header">
          <h2>
            {{ fullPalaceName(selectedPalace.name) }} ({{ selectedPalace.branch }})
          </h2>
          <button
            class="sheet-analysis-button"
            type="button"
            @click="showPalaceDetail = false; emit('fullAnalysis')"
          >
            <AppMaterialIcon name="auto_awesome_rounded" :size="14" />AI 全盤解析
          </button>
        </header>
      </template>
      <div v-if="selectedPalace" class="palace-sheet">
          <div class="sheet-divider" />
          <div class="sheet-scroll" data-sheet-scroll>
            <h3>大小限虛歲</h3>
            <div class="limits">
              <p>
                <b class="daxian-label">大限虛歲</b
                ><span>{{
                  selectedPalace.daXian
                    ? `${selectedPalace.daXian[0]} - ${selectedPalace.daXian[1]}`
                    : "無"
                }}</span>
              </p>
              <p>
                <b class="xiaoxian-label">小限虛歲</b
                ><span>{{ selectedPalace.xiaoXian.join("、") || "無" }}</span>
              </p>
            </div>
            <h3>宮位星曜</h3>
            <div class="detail-stars">
              <span
                v-for="star in selectedPalace.stars"
                :key="star"
                :class="starTone(star)"
                >{{ starLabel(star, selectedPalace.branch)
                }}<b v-if="chart.palaceSiHua[cleanStar(star)]"
                  >・{{ chart.palaceSiHua[cleanStar(star)] }}</b
                ></span
              ><em v-if="!selectedPalace.stars.length">空宮</em>
            </div>
            <p
              v-if="
                !selectedPalace.stars.some((star) =>
                  majorStars.includes(cleanStar(star)),
                )
              "
              class="empty-palace"
            >
              此宮位目前為空宮（無十四主星），可借對宮星曜作為判讀參考。
            </p>
            <h3>三方四正宮位</h3>
            <div class="related-palaces">
              <article
                v-for="palace in relatedPalaces"
                :key="palace.branch"
                class="related-palace-card"
              >
                <div class="related-palace-heading">
                  <span>{{ palace.relation }}</span>
                  <strong
                    >{{ fullPalaceName(palace.name) }} ({{
                      palace.branch
                    }})</strong
                  >
                </div>
              </article>
            </div>
            <h3>詳解內容</h3>
            <article
              v-for="star in selectedDetailStars"
              :key="`detail-${star}`"
              class="description-card"
            >
              <strong :class="starTone(star)"
                >【{{ starLabel(star, selectedPalace.branch)
                }}{{ chart.palaceSiHua[cleanStar(star)] || "" }}】{{
                  majorStars.includes(cleanStar(star))
                    ? `於${fullPalaceName(selectedPalace.name)}`
                    : ""
                }}</strong
              >
              <p>{{ starDescription(star, selectedPalace.name) }}</p>
            </article>
          </div>
      </div>
    </AppBottomSheet>
  </div>
</template>

<style scoped>
/* Chart frame and twelve-palace layout */
.chart-wrap {
  width: 100%;
  height: 100%;
  min-height: 0;
}
.palace-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  grid-template-rows: repeat(4, minmax(0, 1fr));
  width: 100%;
  height: 100%;
  aspect-ratio: auto;
  gap: 2px;
  padding: 2px;
  background: rgba(36, 87, 90, 0.12);
  border-radius: 5px;
  box-shadow: 0 14px 28px rgba(36, 87, 90, 0.08);
}
.palace {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  padding: 3px;
  border: 1.5px solid transparent;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.84);
  color: var(--mountain);
  text-align: left;
  transition:
    border-color 0.16s ease,
    background-color 0.16s ease,
    box-shadow 0.16s ease;
}
.p-si {
  grid-area: 1/1;
}
.p-wu {
  grid-area: 1/2;
}
.p-wei {
  grid-area: 1/3;
}
.p-shen {
  grid-area: 1/4;
}
.p-chen {
  grid-area: 2/1;
}
.p-you {
  grid-area: 2/4;
}
.p-mao {
  grid-area: 3/1;
}
.p-xu {
  grid-area: 3/4;
}
.p-yin {
  grid-area: 4/1;
}
.p-chou {
  grid-area: 4/2;
}
.p-zi {
  grid-area: 4/3;
}
.p-hai {
  grid-area: 4/4;
}

/* Center summary and analysis action */
.chart-center {
  grid-area: 2/2/4/4;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 12px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.65);
  text-align: center;
}
.chart-center > strong {
  font-size: 14px;
}
.chart-center > span {
  font-size: 12px;
  font-weight: 700;
  line-height: 1.35;
}
.center-action {
  display: flex;
  align-items: center;
  gap: 4px;
  justify-content: center;
  min-width: 120px;
  min-height: 36px;
  margin-top: 6px;
  padding: 8px 12px;
  border: 0;
  border-radius: 14px;
  background: var(--mountain);
  color: white;
  font-size: 12px;
  font-weight: 800;
}

/* Palace stars and labels */
.stars {
  display: flex;
  align-items: flex-start;
  align-content: flex-start;
  justify-content: flex-start;
  flex-wrap: wrap;
  gap: 4px 6px;
  min-height: 0;
  overflow: hidden;
}
.star {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 0 0 auto;
  min-width: max-content;
  color: var(--text-soft);
  font-size: 16px;
  font-style: normal;
  line-height: 1.08;
}
.star i {
  font-style: normal;
}
.star b {
  margin-top: 1px;
  padding: 2px 3px;
  border-radius: 3px;
  background: var(--cinnabar);
  color: white;
  font-size: 13px;
  line-height: 1;
}
.star.major {
  color: #b33e32;
  font-weight: 900;
}
.star.lucky {
  color: #397b72;
  font-weight: 700;
}
.star.sha {
  color: #6d506e;
  font-weight: 700;
}
.palace footer {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  grid-template-rows: auto auto;
  align-items: end;
  gap: 1px 3px;
}
.palace footer small {
  grid-row: 1/3;
  align-self: end;
  color: rgba(36, 87, 90, 0.43);
  font-size: 10px;
  font-weight: 800;
}
.palace footer strong {
  grid-column: 2;
  overflow: hidden;
  color: var(--cinnabar);
  font-size: 12px;
  text-align: right;
  white-space: nowrap;
  text-overflow: ellipsis;
}

/* Palace detail sheet */
.palace-sheet {
  box-sizing: border-box;
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  width: 100%;
  min-height: 0;
  overflow: hidden;
  padding: 0;
  background: transparent;
}
.palace-sheet-header {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 0 4px 10px;
}
.palace-sheet-header h2 {
  min-width: 0;
  margin: 0;
  font-size: 20px;
  white-space: nowrap;
}
.palace-sheet h3 {
  margin: 20px 0 9px;
  font-size: 15px;
}
.detail-stars {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}
.detail-stars span {
  padding: 7px 10px;
  border: 1px solid rgba(36, 87, 90, 0.12);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.6);
  font-size: 13px;
  font-weight: 800;
}
.detail-stars .major {
  color: var(--cinnabar);
}
.detail-stars .lucky {
  color: var(--jade);
}
.detail-stars .sha {
  color: #735c78;
}
.detail-stars .misc {
  color: #5d4037;
}
.detail-stars em {
  color: var(--text-soft);
}
.related-palaces {
  display: grid;
  gap: 10px;
}
.related-palace-card {
  padding: 12px;
  border: 1px solid rgba(36, 87, 90, 0.12);
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 5px 14px rgba(36, 87, 90, 0.06);
}
.related-palace-heading {
  display: flex;
  align-items: center;
  gap: 8px;
}
.related-palace-heading > span {
  flex: 0 0 auto;
  padding: 3px 7px;
  border-radius: 7px;
  background: rgba(36, 87, 90, 0.1);
  color: var(--mountain);
  font-size: 11px;
  font-weight: 800;
}
.related-palace-heading > strong {
  color: var(--mountain);
  font-size: 13px;
}
.limits {
  display: grid;
  gap: 12px;
}
.limits p {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin: 0;
  color: var(--text-soft);
  font-size: 14px;
  line-height: 1.5;
}
.limits b {
  color: var(--mountain);
}
.empty-palace {
  margin-top: 18px;
  color: var(--text-soft);
  font-size: 13px;
  font-style: italic;
  line-height: 1.55;
}
.detail-action {
  width: 100%;
  margin-top: 18px;
}

.description-card {
  margin-bottom: 10px;
  padding: 14px;
  border: 1px solid rgba(255, 255, 255, 0.56);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.52);
}
.description-card strong {
  font-size: 14px;
}
.description-card strong.major {
  color: #b33e32;
}
.description-card strong.lucky {
  color: #397b72;
}
.description-card strong.sha {
  color: #6d506e;
}
.description-card strong.misc {
  color: #5d4037;
}
.description-card p {
  margin: 6px 0 0;
  color: var(--text-soft);
  font-size: 13px;
  line-height: 1.6;
  white-space: pre-line;
}

/* Three-directions/four-corners selection states */
.palace.related {
  border: 1.5px solid rgba(36, 87, 90, 0.52);
  background:
    linear-gradient(rgba(107, 166, 160, 0.1), rgba(107, 166, 160, 0.1)),
    #fff;
  box-shadow: inset 0 0 0 0.5px rgba(36, 87, 90, 0.12);
}
.palace.selected {
  z-index: 2;
  border: 1.5px solid rgba(179, 62, 50, 0.7);
  background:
    linear-gradient(rgba(179, 62, 50, 0.08), rgba(179, 62, 50, 0.08)),
    #fff;
  box-shadow: inset 0 0 0 0.5px rgba(179, 62, 50, 0.16);
}
.sheet-analysis-button {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-width: 120px;
  min-height: 36px;
  padding: 8px 14px;
  border: 0;
  border-radius: 14px;
  background: var(--mountain);
  box-shadow: 0 2px 7px rgba(36, 87, 90, 0.2);
  color: white;
  font-size: 12px;
  font-weight: 800;
}
.sheet-divider {
  flex: 0 0 auto;
  height: 1px;
  background: rgba(190, 164, 103, 0.24);
}
.sheet-scroll {
  flex: 1 1 auto;
  min-height: 0;
  padding: 0 4px 12px;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: thin;
  scrollbar-color: rgba(36, 87, 90, 0.28) transparent;
}
.sheet-scroll::-webkit-scrollbar {
  width: 5px;
}
.sheet-scroll::-webkit-scrollbar-track {
  background: transparent;
}
.sheet-scroll::-webkit-scrollbar-thumb {
  border-radius: 5px;
  background: rgba(36, 87, 90, 0.28);
}
.sheet-scroll h3:first-child {
  margin-top: 16px;
}
.limits p > b {
  flex: 0 0 auto;
  padding: 4px 8px;
  border-radius: 8px;
  font-size: 12px;
}
.limits p > span {
  padding-top: 3px;
  color: var(--mountain);
  font-weight: 700;
  line-height: 1.4;
}
.limits .daxian-label {
  background: rgba(179, 62, 50, 0.12);
  color: var(--cinnabar);
}
.limits .xiaoxian-label {
  background: rgba(36, 87, 90, 0.12);
  color: var(--mountain);
}
.palace footer .daxian-age {
  grid-column: 2;
  overflow: hidden;
  color: rgba(36, 87, 90, 0.62);
  font-size: 9px;
  font-weight: 800;
  line-height: 1.1;
  text-align: right;
  white-space: nowrap;
  text-overflow: ellipsis;
}

/* Responsive adjustments */
@media (max-width: 430px) {
  .stars {
    gap: 3px 4px;
  }
  .star {
    font-size: 14px;
  }
  .chart-center {
    padding: 7px;
  }
  .chart-center > span {
    font-size: 11px;
  }
  .center-action {
    min-width: 112px;
    padding-inline: 8px;
  }
  .palace footer small {
    font-size: 9px;
  }
  .palace footer strong {
    font-size: 11px;
  }
}
@media (max-width: 380px) {
  .palace-sheet h2 {
    font-size: 18px;
  }
  .sheet-analysis-button {
    min-width: 108px;
    padding-inline: 9px;
    font-size: 11px;
  }
}
@media (max-width: 350px) {
  .stars {
    gap: 2px;
  }
  .chart-center > strong {
    font-size: 13px;
  }
  .chart-center > span {
    font-size: 10px;
  }
  .center-action {
    min-width: 104px;
    font-size: 11px;
  }
}
@media (min-width: 560px) {
  .palace footer .daxian-age {
    font-size: 10px;
  }
}
@media (min-width: 681px) {
  .palace-grid {
    max-width: 680px;
    margin: 0 auto;
  }
}

:global(.palace-detail-sheet.app-bottom-sheet.is-viewport-height) {
  height: min(65%, 680px);
  padding: 12px 12px 0;
}
:global(.palace-sheet-content.app-bottom-sheet-content) {
  display: flex;
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
  text-align: left;
}
</style>
