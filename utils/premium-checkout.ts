import type {
  PremiumCheckoutDraft,
  PremiumCheckoutIntent,
} from "~/types/billing";

const PREMIUM_CHECKOUT_INTENT_KEY = "ziwei:premium-checkout-intent";
const INTENT_LIFETIME_MS = 2 * 60 * 60 * 1000;

function validBirthInfo(value: unknown) {
  if (!value || typeof value !== "object") return false;
  const info = value as Record<string, unknown>;
  return (
    ["男", "女"].includes(String(info.gender)) &&
    ["year", "month", "day", "hour", "minute"].every((key) =>
      Number.isFinite(Number(info[key])),
    ) &&
    typeof info.cityId === "string"
  );
}

function isPremiumCheckoutIntent(
  value: unknown,
): value is PremiumCheckoutIntent {
  if (!value || typeof value !== "object") return false;
  const intent = value as Record<string, unknown>;
  if (
    intent.version !== 1 ||
    typeof intent.userUuid !== "string" ||
    !intent.userUuid ||
    typeof intent.merchantOrderNo !== "string" ||
    !intent.merchantOrderNo ||
    !Number.isFinite(Number(intent.createdAt)) ||
    !Number.isFinite(Number(intent.expiresAt))
  )
    return false;
  if (intent.source === "qa")
    return typeof intent.question === "string" && Boolean(intent.question.trim());
  return (
    intent.source === "match" &&
    typeof intent.matchType === "string" &&
    validBirthInfo(intent.birthInfo)
  );
}

export function savePremiumCheckoutIntent(
  draft: PremiumCheckoutDraft,
  userUuid: string,
  merchantOrderNo: string,
) {
  if (!import.meta.client) return;
  const createdAt = Date.now();
  const intent: PremiumCheckoutIntent = {
    ...draft,
    version: 1,
    userUuid,
    merchantOrderNo,
    createdAt,
    expiresAt: createdAt + INTENT_LIFETIME_MS,
  };
  sessionStorage.setItem(
    PREMIUM_CHECKOUT_INTENT_KEY,
    JSON.stringify(intent),
  );
}

export function readPremiumCheckoutIntent(options: {
  userUuid?: string;
  merchantOrderNo?: string;
  source?: PremiumCheckoutDraft["source"];
} = {}) {
  if (!import.meta.client) return null;
  try {
    const intent = JSON.parse(
      sessionStorage.getItem(PREMIUM_CHECKOUT_INTENT_KEY) || "null",
    ) as unknown;
    if (
      !isPremiumCheckoutIntent(intent) ||
      intent.expiresAt <= Date.now() ||
      (options.userUuid && intent.userUuid !== options.userUuid) ||
      (options.merchantOrderNo &&
        intent.merchantOrderNo !== options.merchantOrderNo) ||
      (options.source && intent.source !== options.source)
    ) {
      clearPremiumCheckoutIntent();
      return null;
    }
    return intent;
  } catch {
    clearPremiumCheckoutIntent();
    return null;
  }
}

export function clearPremiumCheckoutIntent() {
  if (import.meta.client)
    sessionStorage.removeItem(PREMIUM_CHECKOUT_INTENT_KEY);
}
