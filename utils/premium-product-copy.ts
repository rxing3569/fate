export const premiumBenefits = [
  "每月有 60 次不扣除點數之額度（額度將於每月一號重置）",
  "解鎖「合盤解析」、「AI 問答」等專屬功能",
] as const;

export function premiumPromotionCopy(price: number) {
  return `目前享有早鳥六折優惠。持續訂閱即維持 NT$${price}/月；取消後重新訂閱將依當時售價計費。`;
}

export const premiumRenewalCopy =
  "付款成功當日立即扣款並開通，後續由藍新於每月同日自動續扣；若於 29～31 日訂閱，後續扣款日固定為每月 28 日。您可隨時取消自動續訂，權益仍保留至當期截止日。";

export const hostedPaymentCopy =
  "下一步將離開本站前往藍新安全付款頁。付款結果會由系統驗證後發放點數或會員權益。";
