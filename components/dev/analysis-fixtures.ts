import type { AnalysisKind } from "~/stores/active-analysis";

export type DevScenario =
  | "idle"
  | "connecting"
  | "waiting"
  | "streaming"
  | "disconnected"
  | "completed"
  | "partial"
  | "connection_failed"
  | "stream_failed"
  | "server_failed"
  | "busy"
  | "timed_out"
  | "cancelled"
  | "auth_required"
  | "membership_required"
  | "insufficient_points"
  | "limit_reached";

export interface DevStreamFrame {
  key: string;
  content: string;
  completesKey?: string;
}

export const targetLabels: Record<AnalysisKind, string> = {
  report: "命盤解析",
  match: "合盤解析",
  flow: "時運解析",
  qa: "AI 問答",
};

export const targetRoutes: Record<AnalysisKind, string> = {
  report: "/report",
  match: "/match",
  flow: "/flow",
  qa: "/qa",
};

export const scenarioGroups: Array<{
  label: string;
  options: Array<{ value: DevScenario; label: string }>;
}> = [
  {
    label: "生命週期",
    options: [
      { value: "idle", label: "無任務／初始" },
      { value: "connecting", label: "連線中" },
      { value: "waiting", label: "等待 AI 第一段回覆" },
      { value: "streaming", label: "接收 AI 串流" },
      { value: "disconnected", label: "斷線、背景仍處理" },
      { value: "completed", label: "完成" },
      { value: "partial", label: "部分完成" },
      { value: "timed_out", label: "逾時" },
      { value: "cancelled", label: "取消／重置" },
    ],
  },
  {
    label: "技術錯誤",
    options: [
      { value: "connection_failed", label: "連線建立失敗" },
      { value: "stream_failed", label: "串流途中失敗" },
      { value: "server_failed", label: "一般服務失敗" },
      { value: "busy", label: "AI 服務繁忙" },
    ],
  },
  {
    label: "權限與額度",
    options: [
      { value: "auth_required", label: "登入狀態失效" },
      { value: "membership_required", label: "需要付費會員" },
      { value: "insufficient_points", label: "點數不足" },
      { value: "limit_reached", label: "使用次數已達上限" },
    ],
  },
];

const reportFixtures: Record<string, string> = {
  general: `### DEV 模擬資料：核心性格
這是一段專門用來檢查命盤解析串流畫面的合成內容，不代表真實命理結果。

/summary
你重視清楚的方向，也擅長在變動中整理優先順序。
/summary_end

### DEV 模擬資料：天賦與行動
當目標明確時，你傾向先建立結構，再逐步驗證自己的判斷。`,
  palace_detail: `### DEV 模擬資料：命宮
命宮範例內容會逐段出現，用來確認卡片、摘要與詳細頁的更新行為。

/summary
觀察重點是自我定位、決策節奏與面對環境的方式。
/summary_end

### DEV 模擬資料：官祿宮
此段用於測試第二張解析卡片，不應作為任何實際決策依據。`,
  ten_year: `### DEV 模擬資料：第一大限 6-15 歲
這個階段的文字僅供測試十年大運標題與內容排版。

/summary
模擬重點是學習節奏與環境適應。
/summary_end

### DEV 模擬資料：第二大限 16-25 歲
第二段內容用來驗證串流完成一個區段後，下一張卡片如何加入畫面。`,
};

const flowFixture = `### DEV 模擬資料：整體趨勢
這是時運解析的合成串流內容，用來檢查段落逐步出現的狀態。

- 工作推進：4/5
- 人際互動：3/5
- 財務節奏：2/5

### DEV 模擬資料：行動建議
先處理最重要且能立即驗證的事項，保留調整空間。本段不構成真實命理建議。`;

const matchFixture = `## DEV 模擬資料：關係速覽
- 溝通默契（78/100）
- 價值協調（72/100）
- 長期穩定（81/100）

### 溝通默契
雙方適合先確認彼此的期待，再討論具體做法。

### 價值協調
遇到差異時，清楚說明優先順序會比猜測更有效。

### 長期穩定
穩定的互動節奏有助於累積信任。

## DEV 模擬資料：相處提醒
這是用來驗證合盤卡片與分數元件的合成內容，不代表任何真實關係判斷。`;

const qaFixture = `這是 **DEV 模擬回覆**，內容會以短片段逐步送出。

你可以用這個情境檢查：

1. 等待第一段回覆時的 loading。
2. Markdown 在串流途中的更新。
3. 暫停、斷線與完成後的輸入框狀態。

這不是根據目前命盤產生的正式回答。`;

function splitFixture(source: string, size = 18) {
  const characters = Array.from(source);
  const chunks: string[] = [];
  for (let index = 0; index < characters.length; index += size) {
    chunks.push(characters.slice(index, index + size).join(""));
  }
  return chunks;
}

export function completeContents(kind: AnalysisKind): Record<string, string> {
  if (kind === "report") return { ...reportFixtures };
  if (kind === "flow") return { main: flowFixture };
  if (kind === "match") return { main: matchFixture };
  return { main: qaFixture };
}

export function streamFrames(kind: AnalysisKind): DevStreamFrame[] {
  const entries =
    kind === "report"
      ? Object.entries(reportFixtures)
      : Object.entries(completeContents(kind));
  return entries.flatMap(([key, source]) => {
    const chunks = splitFixture(source);
    return chunks.map((content, index) => ({
      key,
      content,
      completesKey: index === chunks.length - 1 ? key : undefined,
    }));
  });
}

export function scenarioError(scenario: DevScenario) {
  switch (scenario) {
    case "connection_failed":
      return "無法連線分析服務，請稍後再試。";
    case "stream_failed":
      return "AI 回覆串流途中發生錯誤，請重新執行。";
    case "server_failed":
      return "分析服務暫時發生錯誤，請稍後再試。";
    case "busy":
      return "目前解析服務使用人數較多，請稍候幾分鐘後再試。";
    case "timed_out":
      return "系統服務中斷，本次分析已停止，請重新執行。";
    case "auth_required":
      return "登入狀態已失效，請重新登入。";
    case "membership_required":
      return "此功能為付費會員專屬，請購買會員後再試。";
    case "insufficient_points":
      return "點數餘額不足，請先購買點數後再繼續。";
    case "limit_reached":
      return "本功能的使用次數已達上限，請稍後再試。";
    case "partial":
      return "部分解析未完成，可免費重新執行未完成項目。";
    default:
      return "";
  }
}
