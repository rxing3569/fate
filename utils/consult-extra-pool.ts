export const consultExtraPool = {
  "博士十二神": ["博士", "力士", "青龍", "小耗", "將軍", "奏書", "飛廉", "喜神", "病符", "大耗", "伏兵", "官府"],
  "將前十二神": ["將星", "攀鞍", "歲驛", "息神", "華蓋", "劫煞", "災煞", "天煞", "指背", "鹹池", "月煞", "亡神"],
  "歲前十二神": ["歲建", "晦氣", "喪門", "貫索", "官符", "小耗", "大耗", "龍德", "白虎", "天德", "吊客", "病符"],
} as const;

export type ConsultExtraGroup = keyof typeof consultExtraPool;

export function drawConsultExtraCard(group: string) {
  if (!(group in consultExtraPool)) throw new Error("追問題目缺少有效的抽卡組別。請重新選擇。");
  const names = consultExtraPool[group as ConsultExtraGroup];
  const random = new Uint32Array(1);
  const limit = Math.floor(0x100000000 / names.length) * names.length;
  do crypto.getRandomValues(random); while (random[0]! >= limit);
  return { group, name: names[random[0]! % names.length]! };
}
