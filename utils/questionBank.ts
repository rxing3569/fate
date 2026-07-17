export type ReviewLevel = {
  slug: "basic" | "advanced" | "expert";
  title: string;
  subtitle: string;
  description: string;
  courseIds: string[];
};

export type ReviewQuestion = {
  text: string;
  options: { key: string; text: string }[];
  answer: string;
  explanation: string;
};

export const reviewLevels: ReviewLevel[] = [
  {
    slug: "basic",
    title: "基礎",
    subtitle: "課程 1－2｜建立紫微核心觀念",
    description: "從認識命盤開始，掌握天干地支、十二宮與三方四正。",
    courseIds: ["1", "2_1", "2_2", "2_3"],
  },
  {
    slug: "advanced",
    title: "進階",
    subtitle: "課程 3｜理解星曜特質",
    description: "複習十四主星、吉凶星曜、雜曜與各類十二神。",
    courseIds: ["3_1", "3_2", "3_3", "3_4", "3_5", "3_6", "3_7", "3_8"],
  },
  {
    slug: "expert",
    title: "高階",
    subtitle: "課程 4｜掌握命盤變化",
    description: "進一步理解宮位四化、十年大限與流年時運推演。",
    courseIds: ["4_1", "4_2"],
  },
];

export function getReviewLevel(slug: string) {
  return reviewLevels.find((level) => level.slug === slug);
}

export function parseReviewQuestions(markdown: string): ReviewQuestion[] {
  return markdown
    .split(/^##\s+/m)
    .filter(Boolean)
    .map((block) => {
      const lines = block
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
      const text = lines.shift() || "";
      const options = lines
        .filter((line) => /^[A-D]\.\s/.test(line))
        .map((line) => ({ key: line[0]!, text: line.slice(3).trim() }));
      const answerLine = lines.find((line) => /^\*\*答案[：:]/.test(line)) || "";
      const explanationLine =
        lines.find((line) => /^\*\*解析[：:]\*\*/.test(line)) || "";

      return {
        text,
        options,
        answer: answerLine
          .replace(/^\*\*答案[：:]\s*/, "")
          .replace(/\*\*.*/, "")
          .trim(),
        explanation: explanationLine
          .replace(/^\*\*解析[：:]\*\*\s*/, "")
          .trim(),
      };
    })
    .filter(
      (question) =>
        question.text && question.options.length === 4 && question.answer,
    );
}
