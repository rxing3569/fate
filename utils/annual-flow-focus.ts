export interface AnnualFlowFocus {
  relationship: string;
  career: string;
  wealth: string;
  major_decision: string;
}

export const emptyAnnualFlowFocus = (): AnnualFlowFocus => ({
  relationship: "",
  career: "",
  wealth: "",
  major_decision: "",
});

export const annualRelationshipOptions = [
  "單身，想找對象",
  "有曖昧，想知道能不能發展",
  "有對象，想結婚",
  "感情卡關，想知道是否適合繼續",
  "想復合",
  "想看這年桃花運",
  "想看感情中的爛桃花／第三者風險",
];

export const annualCareerOptions = [
  "想找工作",
  "想換工作",
  "想升遷／加薪",
  "想轉職／轉換跑道",
  "想創業",
  "想發展副業／接案",
  "已經創業，想看事業發展",
  "想看職場人際／貴人運",
  "想知道這年適合衝刺還是守成",
];

export const annualWealthOptions = [
  "想看這年整體財運",
  "想看正財／工作收入",
  "想看偏財／額外收入",
  "想存錢／改善現金流",
  "想看是否容易破財",
  "想知道這年適不適合擴大財務規模",
];

export const annualDecisionOptions = [
  "想搬家、換城市或長期移居，想知道這年是否適合改變環境",
  "想出國、留學或海外發展，想確認這年是否適合遠行變動",
  "想買房、賣房或處理房產，想知道這年是否適合做決定",
  "想進修、考證照或重返校園，想確認是否值得長期投入時間",
  "想開始全新的生活方式，但不確定這年是否適合改變",
  "有一件拖延很久的重要事情，想知道這年適不適合正式處理",
  "想知道這年該積極行動，還是先觀望等待更好的時機",
  "沒有明確目標但正值轉折期，想知道這年最重要的選擇方向",
];

export function normalizeAnnualFlowFocus(
  value?: Partial<AnnualFlowFocus> | null,
): AnnualFlowFocus {
  const normalizeOption = (option?: string) =>
    String(option || "").replace("今年", "這年");
  return {
    relationship: normalizeOption(value?.relationship),
    career: normalizeOption(value?.career),
    wealth: normalizeOption(value?.wealth),
    major_decision: String(value?.major_decision || "").trim(),
  };
}

export function sameAnnualFlowFocus(
  left?: Partial<AnnualFlowFocus> | null,
  right?: Partial<AnnualFlowFocus> | null,
) {
  return (
    JSON.stringify(normalizeAnnualFlowFocus(left)) ===
    JSON.stringify(normalizeAnnualFlowFocus(right))
  );
}
