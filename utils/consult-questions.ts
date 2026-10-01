export type ConsultFollowupQuestion = {
  id: string;
  text: string;
  drawGroup?: string;
  promptId?: string;
};

const knownDrawGroups = ["博士十二神", "歲前十二神", "將前十二神"] as const;
const questionBlockPattern = /\/question\b([\s\S]*?)(?:\/question_end\b|$)/i;
const questionEndPattern = /\/question_end\b/i;

function asText(value: unknown) {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  return "";
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isQuestionTemplate(value: string) {
  const content = value.trim();
  return (
    /^\{[\s\S]+\}$/.test(content) &&
    /(?:追問段落內容|追問概念|各兩個追問|共六個)/.test(content)
  );
}

function normalizeDrawGroup(value: unknown) {
  const raw = asText(value).replace(/[【】\[\]（）()]/g, "");
  if (!raw) return undefined;
  if (raw.includes("博士")) return knownDrawGroups[0];
  if (raw.includes("歲前") || raw.includes("岁前")) return knownDrawGroups[1];
  if (raw.includes("將前") || raw.includes("将前")) return knownDrawGroups[2];
  return raw;
}

function extractDrawGroup(value: string) {
  const labelled = value.match(
    /(?:抽卡|抽(?:取|出|牌)?|對應(?:卡片?|牌)?|卡片?|card(?:_group)?|draw(?:_group|_card)?)\s*[:：=]\s*[【\[]?([^】\]\n,，|；;]+)/i,
  );
  if (labelled?.[1]) return normalizeDrawGroup(labelled[1]);

  const bracketed = value.match(/[【\[]([^】\]]+)[】\]]/);
  if (bracketed?.[1]) return normalizeDrawGroup(bracketed[1]);

  for (const group of knownDrawGroups) {
    if (value.includes(group)) return group;
  }
  if (value.includes("岁前")) return knownDrawGroups[1];
  if (value.includes("将前")) return knownDrawGroups[2];
  return undefined;
}

function removeDrawGroupLabel(value: string, drawGroup?: string) {
  let cleaned = value.trim();
  const groups = drawGroup ? [drawGroup] : [...knownDrawGroups];
  for (const group of groups) {
    const escapedGroup = escapeRegExp(group);
    cleaned = cleaned
      .replace(
        new RegExp(
          `^\\s*(?:抽卡|抽(?:取|出|牌)?|對應(?:卡片?|牌)?|卡片?|card(?:_group)?|draw(?:_group|_card)?)?\\s*[【\\[]?${escapedGroup}[】\\]]?\\s*(?:[|｜:：=、-]\\s*)?`,
          "i",
        ),
        "",
      )
      .replace(
        new RegExp(
          `\\s*(?:[|｜:：=、-]\\s*)?(?:抽卡|抽(?:取|出|牌)?|對應(?:卡片?|牌)?|卡片?|card(?:_group)?|draw(?:_group|_card)?)?\\s*[【\\[]?${escapedGroup}[】\\]]?\\s*$`,
          "i",
        ),
        "",
      );
  }
  return cleaned
    .replace(/^\s*[【\[][^】\]]+[】\]]\s*/, "")
    .replace(
      /\s*(?:[|｜]\s*[^|｜\n]+|[（(]\s*(?:抽卡|抽(?:取|出|牌)?|對應(?:卡片?|牌)?|卡片?|card(?:_group)?|draw(?:_group|_card)?)?\s*[:：=]?\s*[^\n|｜）)]*[）)])\s*$/i,
      "",
    )
    .replace(
      /\s*(?:抽卡|抽(?:取|出|牌)?|對應(?:卡片?|牌)?|卡片?|card(?:_group)?|draw(?:_group|_card)?)\s*[:：=]\s*[【\[]?[^】\]\n,，|；;]+[】\]]?\s*$/i,
      "",
    )
    .trim();
}

function removeQuestionLabel(value: string) {
  return value
    .replace(/^\s*\*\*(.+)\*\*\s*$/, "$1")
    .replace(/^\s*[（(][^）)\n]+[）)]\s*[：:]\s*/, "")
    .replace(/^\s*(?:現實執行條件|短期外部環境|短期遭遇(?:\s*[／/]\s*|與)?轉折)\s*[：:]\s*/, "")
    .trim();
}

function promptPrefix(drawGroup?: string) {
  return drawGroup === knownDrawGroups[0]
    ? "doctor"
    : drawGroup === knownDrawGroups[1]
      ? "year"
      : drawGroup === knownDrawGroups[2]
        ? "general"
        : "";
}

function addMissingPromptIds(questions: ConsultFollowupQuestion[]) {
  const groupCounts = new Map<string, number>();
  return questions.map((question) => {
    if (question.promptId || !question.drawGroup) return question;
    const count = (groupCounts.get(question.drawGroup) || 0) + 1;
    groupCounts.set(question.drawGroup, count);
    const prefix = promptPrefix(question.drawGroup);
    return prefix
      ? { ...question, promptId: `${prefix}_${String(count).padStart(2, "0")}` }
      : question;
  });
}

function recordQuestion(value: unknown, index: number) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const text = asText(
    record.question ??
      record.question_text ??
      record.text ??
      record.prompt ??
      record.prompt_text ??
      record.content,
  );
  if (!text) return null;
  const cardValue = record.card;
  const cardGroup =
    cardValue && typeof cardValue === "object"
      ? (cardValue as Record<string, unknown>).group ??
        (cardValue as Record<string, unknown>).name
      : cardValue;
  const drawGroup = normalizeDrawGroup(
    record.draw_group ??
      record.drawGroup ??
      record.card_group ??
      record.cardGroup ??
      cardGroup ??
      record.draw_card ??
      record.card_key ??
      record.cardKey ??
      record.draw ??
      record.target_card ??
      record.group ??
      record["抽卡"] ??
      record["抽取卡片"],
  ) || extractDrawGroup(text);
  const displayText = removeQuestionLabel(
    removeDrawGroupLabel(text, drawGroup),
  );
  if (!displayText) return null;
  const rawPromptId = asText(record.prompt_id ?? record.promptId ?? record.id);
  const prefix = promptPrefix(drawGroup);
  const promptId = prefix && new RegExp(`^${prefix}_(?:0[1-9]|1[0-2])$`).test(rawPromptId)
    ? rawPromptId
    : "";
  return {
    id: rawPromptId || `question_${String(index + 1).padStart(2, "0")}`,
    text: displayText,
    ...(drawGroup ? { drawGroup } : {}),
    ...(promptId ? { promptId } : {}),
  } satisfies ConsultFollowupQuestion;
}

function parseJsonQuestions(body: string) {
  const candidate = body
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  if (!candidate.startsWith("[") && !candidate.startsWith("{")) return [];
  try {
    const parsed = JSON.parse(candidate) as unknown;
    const records = Array.isArray(parsed)
      ? parsed
      : parsed && typeof parsed === "object" && Array.isArray((parsed as Record<string, unknown>).questions)
        ? (parsed as { questions: unknown[] }).questions
        : [parsed];
    return records
      .map((item, index) => recordQuestion(item, index))
      .filter((item): item is ConsultFollowupQuestion => Boolean(item));
  } catch {
    return body
      .split("\n")
      .map((line, index) => {
        try {
          return recordQuestion(JSON.parse(line), index);
        } catch {
          return null;
        }
      })
      .filter((item): item is ConsultFollowupQuestion => Boolean(item));
  }
}

function parseLineQuestions(body: string) {
  const questions: ConsultFollowupQuestion[] = [];
  const lines = body.replace(/\r\n?/g, "\n").split("\n");
  let currentDrawGroup: string | undefined;
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const explicitDrawGroup = extractDrawGroup(line);
    const numbered = line.match(/^\s*(\d{1,2})\s*[.)、．]\s*(.+)$/);
    const bullet = line.match(/^\s*[-*+]\s+(.+)$/);
    let text = numbered?.[2] || bullet?.[1] || "";
    const headingText = (bullet?.[1] || line)
      .replace(/^\*\*|\*\*$/g, "")
      .trim();
    const headingDrawGroup = extractDrawGroup(headingText);
    if (headingDrawGroup && !/[？?]\s*$/.test(headingText)) {
      currentDrawGroup = headingDrawGroup;
      continue;
    }
    if (!text) continue;
    const drawGroup = explicitDrawGroup || currentDrawGroup;
    const groupOnlyMatch = text.match(
      /^(?:抽卡|抽(?:取|出|牌)?|對應(?:卡片?|牌)?|卡片?|card(?:_group)?|draw(?:_group|_card)?)?\s*[:：=]?\s*[【\[]?(.+?)[】\]]?$/i,
    );
    const groupOnlyValue = groupOnlyMatch?.[1]
      ?.replace(/[【】\[\]（）()]/g, "")
      .trim();
    const isGroupOnly =
      Boolean(drawGroup) &&
      groupOnlyValue === drawGroup;
    if (isGroupOnly) {
      currentDrawGroup = drawGroup;
      continue;
    }

    text = removeQuestionLabel(removeDrawGroupLabel(text, drawGroup));
    if (!text) continue;
    questions.push({
      id: `question_${String(questions.length + 1).padStart(2, "0")}`,
      text,
      ...(drawGroup ? { drawGroup } : {}),
    });
  }
  return questions;
}

export function parseConsultQuestions(source: string) {
  const match = source.match(questionBlockPattern);
  if (!match) {
    return { content: source, found: false, questions: [] as ConsultFollowupQuestion[] };
  }
  const blockStart = match.index || 0;
  let blockEnd = blockStart + match[0].length;
  let body = match[1] || "";
  if (isQuestionTemplate(body)) {
    const remainder = source.slice(blockEnd);
    const secondEndMatch = remainder.match(questionEndPattern);
    body = secondEndMatch
      ? remainder.slice(0, secondEndMatch.index)
      : remainder;
    blockEnd += secondEndMatch
      ? (secondEndMatch.index || 0) + secondEndMatch[0].length
      : remainder.length;
  }
  const jsonQuestions = parseJsonQuestions(body);
  const questions = addMissingPromptIds(jsonQuestions.length
    ? jsonQuestions
    : parseLineQuestions(body));
  return {
    content: `${source.slice(0, blockStart)}${source.slice(blockEnd)}`
      .replace(/\n{3,}/g, "\n\n")
      .trim(),
    found: true,
    questions: questions.slice(0, 6),
  };
}
