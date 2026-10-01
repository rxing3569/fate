export type ConsultStarGroup = "主星" | "輔星" | "雜曜" | "長生十二神";

export interface ConsultStar {
  group: ConsultStarGroup;
  name: string;
}

// Derived from ref/ziwei_tarot_rag.csv; only group and name are shipped.
export const consultStarPool: ConsultStar[] = [
  ...["紫微", "天機", "太陽", "武曲", "天同", "廉貞", "天府", "太陰", "貪狼", "巨門", "天相", "天梁", "七殺", "破軍"].map(name => ({ group: "主星" as const, name })),
  ...["左輔", "右弼", "文昌", "文曲", "天魁", "天鉞", "祿存", "天馬", "擎羊", "陀羅", "火星", "鈴星", "地空", "地劫"].map(name => ({ group: "輔星" as const, name })),
  ...["紅鸞", "天喜", "天姚", "鹹池", "孤辰", "寡宿", "天哭", "天虛", "華蓋", "天刑", "天月", "天巫", "天官", "天福", "天廚", "天才", "天壽", "天傷", "天使", "天空", "截空", "旬空", "空亡", "破碎", "蜚廉", "陰煞", "解神", "天德", "月德", "龍池", "鳳閣", "三臺", "八座", "恩光", "天貴", "臺輔", "封誥"].map(name => ({ group: "雜曜" as const, name })),
  ...["長生", "沐浴", "冠帶", "臨官", "帝旺", "衰", "病", "死", "墓", "絕", "胎", "養"].map(name => ({ group: "長生十二神" as const, name })),
];

export function starsInGroup(group: ConsultStarGroup) {
  return consultStarPool.filter(star => star.group === group);
}
