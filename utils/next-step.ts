import type {
  NextStepAction,
  NextStepDestination,
  NextStepIntent,
  NextStepSource,
} from "~/types/next-step";

const NEXT_STEP_INTENT_KEY = "ziwei:next-step-intent";
const NEXT_STEP_LIFETIME_MS = 2 * 60 * 60 * 1000;

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
  }
}

export const romanceQuestions = [
  "我的正緣可能具備哪些性格特質？",
  "我在感情中最容易反覆遇到什麼課題？",
  "我適合主動追求，還是讓關係自然發展？",
  "我在親密關係中，該如何改善溝通與安全感？",
  "我容易被哪種類型吸引，又真正適合哪種類型？",
] as const;

export const palaceQuestions = [
  "我的夫妻宮反映出哪些感情需求與相處盲點？",
  "我的官祿宮適合哪種工作環境與發展方向？",
  "我的財帛宮顯示我更適合哪種理財方式？",
  "我的福德宮透露我該如何調整壓力與內在狀態？",
  "哪一個宮位是我現階段最值得優先關注的？",
] as const;

export const tenYearQuestions = [
  "我目前的十年大運，最值得把握的機會是什麼？",
  "這個十年大運對我的感情發展有什麼影響？",
  "這個十年適合轉職、創業，還是先累積實力？",
  "這十年間有哪些財務機會與風險需要注意？",
  "面對目前的大運，我最適合採取哪三個行動？",
] as const;

function validIntent(value: unknown): value is NextStepIntent {
  if (!value || typeof value !== "object") return false;
  const intent = value as Record<string, unknown>;
  return (
    intent.version === 1 &&
    (intent.type === "report" || intent.type === "article") &&
    typeof intent.id === "string" &&
    typeof intent.actionId === "string" &&
    ["chart", "report", "match", "flow", "qa"].includes(
      String(intent.destination),
    ) &&
    Number.isFinite(Number(intent.expiresAt))
  );
}

export function trackNextStepEvent(
  event: string,
  payload: Record<string, string | undefined>,
) {
  if (!import.meta.client) return;
  const safePayload = Object.fromEntries(
    Object.entries(payload).filter(([, value]) => Boolean(value)),
  );
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event, ...safePayload });
}

export function saveNextStepIntent(
  source: NextStepSource,
  action: NextStepAction,
) {
  if (!import.meta.client) return null;
  const createdAt = Date.now();
  const questions = action.questions;
  const question = questions?.length
    ? questions[Math.floor(Math.random() * questions.length)]
    : undefined;
  const intent: NextStepIntent = {
    ...source,
    version: 1,
    actionId: action.id,
    destination: action.destination,
    reportCategory: action.reportCategory,
    question,
    createdAt,
    expiresAt: createdAt + NEXT_STEP_LIFETIME_MS,
  };
  sessionStorage.setItem(NEXT_STEP_INTENT_KEY, JSON.stringify(intent));
  return intent;
}

export function readNextStepIntent(destination?: NextStepDestination) {
  if (!import.meta.client) return null;
  try {
    const raw = JSON.parse(
      sessionStorage.getItem(NEXT_STEP_INTENT_KEY) || "null",
    ) as unknown;
    if (!validIntent(raw) || raw.expiresAt <= Date.now()) {
      clearNextStepIntent();
      return null;
    }
    return destination && raw.destination !== destination ? null : raw;
  } catch {
    clearNextStepIntent();
    return null;
  }
}

export function trackNextStepArrival(destination: NextStepDestination) {
  const intent = readNextStepIntent(destination);
  if (!intent || intent.arrivalTracked) return intent;
  trackNextStepEvent("next_step_arrived", {
    source_type: intent.type,
    source_id: intent.id,
    action_id: intent.actionId,
    destination,
  });
  intent.arrivalTracked = true;
  sessionStorage.setItem(NEXT_STEP_INTENT_KEY, JSON.stringify(intent));
  return intent;
}

export function trackNextStepSubmitted(destination: NextStepDestination) {
  const intent = readNextStepIntent(destination);
  if (!intent) return;
  trackNextStepEvent("next_step_submitted", {
    source_type: intent.type,
    source_id: intent.id,
    action_id: intent.actionId,
    destination,
  });
}

export function trackAttributedEvent(event: string) {
  const intent = readNextStepIntent();
  if (!intent) return;
  trackNextStepEvent(event, {
    source_type: intent.type,
    source_id: intent.id,
    action_id: intent.actionId,
    destination: intent.destination,
  });
}

export function clearNextStepIntent() {
  if (import.meta.client) sessionStorage.removeItem(NEXT_STEP_INTENT_KEY);
}
