import starDescriptionsSource from "~/data/star-descriptions.json";
import starCourseSource from "~/data/star-course-data.json";
import {
  boShi12,
  changSheng12,
  jiangQian12,
  luckyStars,
  majorStars,
  shaStars,
  suiJian12,
} from "~/utils/ziwei/stars";

export type LearningStage = {
  id: string;
  title: string;
  parent?: string;
  kind: "reference" | "stars" | "action";
};

export const learningProgressKey = "ziwei_learning_completed_stage_ids";

type StringMap = Record<string, string>;
type NestedStringMap = Record<string, StringMap>;
type StringListMap = Record<string, string[]>;
type StarCourseSource = {
  palaceNames: string[];
  palaceFocus: StringMap;
  majorStarHighlights: StringMap;
  supportStarHighlights: StringMap;
  supportStarPalaceEffects: StringMap;
  luckyStarPalaceEffects: NestedStringMap;
  maleficStarPalaceEffects: NestedStringMap;
  miscStarPalaceEffects: StringListMap;
  changShengGodPalaceEffects: StringListMap;
  boShiGodPalaceEffects: StringListMap;
  suiJianGodPalaceEffects: StringListMap;
  jiangQianGodPalaceEffects: StringListMap;
};
type StarDescriptionsSource = {
  major: Record<string, StringMap>;
  minor: StringMap;
  gods: StringMap;
};

const starCourse = starCourseSource as StarCourseSource;
const starDescriptions = starDescriptionsSource as StarDescriptionsSource;

export const learningStages: LearningStage[] = [
  { id: "1", title: "認識命盤", kind: "reference" },
  { id: "2_1", title: "天干地支", parent: "認識宮位", kind: "reference" },
  { id: "2_2", title: "十二宮", parent: "認識宮位", kind: "reference" },
  { id: "2_3", title: "三方四正", parent: "認識宮位", kind: "reference" },
  { id: "3_1", title: "主星", parent: "認識星曜", kind: "stars" },
  { id: "3_2", title: "吉星", parent: "認識星曜", kind: "stars" },
  { id: "3_3", title: "凶星", parent: "認識星曜", kind: "stars" },
  { id: "3_4", title: "雜曜", parent: "認識星曜", kind: "stars" },
  { id: "3_5", title: "長生十二神", parent: "認識星曜", kind: "stars" },
  { id: "3_6", title: "博士十二神", parent: "認識星曜", kind: "stars" },
  { id: "3_7", title: "歲建十二神", parent: "認識星曜", kind: "stars" },
  { id: "3_8", title: "將前十二神", parent: "認識星曜", kind: "stars" },
  { id: "4_1", title: "四化", parent: "認識變化", kind: "reference" },
  { id: "4_2", title: "時運", parent: "認識變化", kind: "reference" },
  { id: "5", title: "AI 解盤學習", kind: "action" },
];

const majorLabels: StringMap = {
  紫微: "帝星",
  天機: "智星",
  太陽: "光明",
  武曲: "財星",
  天同: "福星",
  廉貞: "囚星",
  天府: "庫星",
  太陰: "陰富",
  貪狼: "桃花",
  巨門: "口舌",
  天相: "印星",
  天梁: "蔭星",
  七殺: "將星",
  破軍: "變革",
};
const minorLabels: StringMap = {
  左輔: "助力",
  右弼: "協調",
  天魁: "明貴",
  天鉞: "暗貴",
  文昌: "文書",
  文曲: "才情",
  祿存: "固定祿",
  天馬: "奔動",
  擎羊: "衝刺",
  陀羅: "纏繞",
  火星: "爆發",
  鈴星: "暗火",
  地空: "落空",
  地劫: "破耗",
  天姚: "桃花",
  紅鸞: "婚喜",
  咸池: "外緣",
};
const godLabels: StringMap = {
  長生: "萌芽",
  沐浴: "洗鍊",
  冠帶: "成形",
  臨官: "就位",
  帝旺: "極盛",
  衰: "轉弱",
  病: "失衡",
  死: "停滯",
  墓: "收藏",
  絕: "斷點",
  胎: "孕育",
  養: "滋養",
};
const displayNames = (names: string[], labels: StringMap, fallback: string) =>
  names.map((name) => `${name}・${labels[name] || fallback}`);
const miscStars = Object.keys(starDescriptions.minor).filter(
  (name) => !luckyStars.includes(name) && !shaStars.includes(name),
);

export const starLessons: Record<string, { intro: string; names: string[] }> = {
  "3_1": {
    intro:
      "14 顆主星是解盤核心，用來建立命盤的性格骨架與事件主軸。先掌握主星，再看吉星、煞星與其他星曜如何輔助或修正。",
    names: displayNames(majorStars, majorLabels, "主星"),
  },
  "3_2": {
    intro: "吉星用來觀察助力、資源、才華與貴人。它們通常讓主星更順利發揮。",
    names: displayNames(luckyStars, minorLabels, "助力"),
  },
  "3_3": {
    intro:
      "凶星提示壓力、阻力、破耗與衝突。它們不只代表壞事，也可能帶來突破、速度與警覺。",
    names: displayNames(shaStars, minorLabels, "煞曜"),
  },
  "3_4": {
    intro:
      "雜曜用來補充桃花、孤寡、文書、醫藥、破耗與喜慶等細節，適合在主星判讀後修正語氣。",
    names: displayNames(miscStars, minorLabels, "輔助"),
  },
  "3_5": {
    intro:
      "長生十二神描述一件事從萌芽、旺盛、衰退到重新孕育的生命週期，用來輔助判斷宮位氣勢。",
    names: displayNames(changSheng12, godLabels, "狀態"),
  },
  "3_6": {
    intro:
      "博士十二神偏向能力、文書、喜慶、耗損與執行狀態，可補充流年與宮位事件的細節。",
    names: displayNames(boShi12, godLabels, "狀態"),
  },
  "3_7": {
    intro:
      "歲建十二神常用於觀察年度氣象，提示當年該宮位容易被放大、阻滯、喜慶或消耗的面向。",
    names: displayNames(suiJian12, godLabels, "狀態"),
  },
  "3_8": {
    intro:
      "將前十二神偏向行動、遷移、名利、災煞與人際暗流，適合補充事件推進時的外部情境。",
    names: displayNames(jiangQian12, godLabels, "狀態"),
  },
};

export type StarLessonDetail = {
  name: string;
  label: string;
  baseDescription: string;
  palaceDescriptions: Array<{ title: string; text: string }>;
};

function fullPalaceName(name: string) {
  return name.endsWith("宮") ? name : `${name}宮`;
}

function formatPalaceDescription(
  starName: string,
  palace: string,
  raw: string,
  isGod: boolean,
) {
  const suffix = isGod
    ? "判讀時仍要配合主星強弱、大限流年與三方四正，不宜只憑單一十二神定吉凶。"
    : "判讀時仍要配合主星強弱、四化引動與三方四正，不宜只憑單星定吉凶。";
  const content = `${raw.trim()} ${suffix}`;
  if (content.startsWith(`${starName}星在${palace}時`)) return content;
  if (content.startsWith(`${starName}在${palace}時`))
    return content.replace(
      `${starName}在${palace}時`,
      `${starName}星在${palace}時`,
    );
  return `${starName}星在${palace}時，代表${content}`;
}

function listPalaceEffects(source: StringListMap, starName: string) {
  const values = source[starName] || [];
  return Object.fromEntries(
    starCourse.palaceNames.map((palace, index) => [
      palace,
      values[index] || "",
    ]),
  );
}

export function getStarLessonDetail(
  stageId: string,
  displayName: string,
): StarLessonDetail | null {
  const [name, label = "星曜"] = displayName.split("・");
  if (!name) return null;
  const isGod = ["3_5", "3_6", "3_7", "3_8"].includes(stageId);
  const baseDescription =
    stageId === "3_1"
      ? starCourse.majorStarHighlights[name] ||
        starDescriptions.major[name]?.["命宮"] ||
        ""
      : isGod
        ? starDescriptions.gods[name] ||
          `${name}用來輔助觀察宮位氣勢與事件狀態。`
        : starCourse.supportStarHighlights[name] ||
          starDescriptions.minor[name] ||
          `${name}需配合所在宮位、主星與四化綜合判讀。`;

  let effects: StringMap = {};
  if (stageId === "3_1") effects = starDescriptions.major[name] || {};
  else if (stageId === "3_2")
    effects = starCourse.luckyStarPalaceEffects[name] || {};
  else if (stageId === "3_3")
    effects = starCourse.maleficStarPalaceEffects[name] || {};
  else if (stageId === "3_4")
    effects = listPalaceEffects(starCourse.miscStarPalaceEffects, name);
  else if (stageId === "3_5")
    effects = listPalaceEffects(starCourse.changShengGodPalaceEffects, name);
  else if (stageId === "3_6")
    effects = listPalaceEffects(starCourse.boShiGodPalaceEffects, name);
  else if (stageId === "3_7")
    effects = listPalaceEffects(starCourse.suiJianGodPalaceEffects, name);
  else if (stageId === "3_8")
    effects = listPalaceEffects(starCourse.jiangQianGodPalaceEffects, name);

  const palaceDescriptions = starCourse.palaceNames.map((palace) => {
    const fallback = `主要影響「${starCourse.palaceFocus[palace] || palace}」這個領域，可視為該宮位的輔助能量。`;
    const raw =
      effects[palace] || starCourse.supportStarPalaceEffects[name] || fallback;
    return {
      title: fullPalaceName(palace),
      text:
        stageId === "3_1"
          ? raw.startsWith(`${name}星在${palace}時`)
            ? raw
            : `${name}星在${palace}時，代表${raw.trim()}`
          : formatPalaceDescription(name, palace, raw, isGod),
    };
  });

  return { name, label, baseDescription, palaceDescriptions };
}

export function stageLabel(stage: LearningStage) {
  return stage.parent ? `${stage.parent}：${stage.title}` : stage.title;
}

export function loadCompletedStages() {
  if (!import.meta.client) return [] as string[];
  try {
    const value = JSON.parse(localStorage.getItem(learningProgressKey) || "[]");
    return normalizeCompletedStages(value);
  } catch {
    return [];
  }
}

export function normalizeCompletedStages(value: unknown) {
  if (!Array.isArray(value)) return [] as string[];
  const valid = new Set(learningStages.map((stage) => stage.id));
  const completed = new Set(
    value.filter((id): id is string => typeof id === "string" && valid.has(id)),
  );
  return learningStages.map((stage) => stage.id).filter((id) => completed.has(id));
}

export function replaceCompletedStages(stageIds: unknown) {
  if (!import.meta.client) return [] as string[];
  const normalized = normalizeCompletedStages(stageIds);
  localStorage.setItem(learningProgressKey, JSON.stringify(normalized));
  window.dispatchEvent(new CustomEvent("learning-progress-updated", { detail: { completedStageIds: normalized } }));
  return normalized;
}

export function mergeCompletedStages(...sources: unknown[]) {
  return normalizeCompletedStages(sources.flatMap((source) => Array.isArray(source) ? source : []));
}

export function markStageCompleted(stageId: string) {
  return replaceCompletedStages([...loadCompletedStages(), stageId]);
}
