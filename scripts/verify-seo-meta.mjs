import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const siteUrl = "https://www.fatejyc.com";
const articleSlugs = [
  "four-transformations",
  "ten-year-fortune",
  "ziwei-chart-basics",
  "ziwei-star-twelve-palaces-guide",
];
const learningIds = [
  "1",
  "2_1",
  "2_2",
  "2_3",
  "3_1",
  "3_2",
  "3_3",
  "3_4",
  "3_5",
  "3_6",
  "3_7",
  "3_8",
  "4_1",
  "4_2",
];
const reviewRoutes = {
  basic: ["1", "2_1", "2_2", "2_3"],
  advanced: ["3_1", "3_2", "3_3", "3_4", "3_5", "3_6", "3_7", "3_8"],
  expert: ["4_1", "4_2"],
};
const routes = [
  "/",
  "/ai-analysis/",
  "/articles/",
  "/learn/",
  "/learning/",
  "/quiz/",
  "/review/",
  "/privacy/",
  "/privacy-pwa/",
  ...articleSlugs.map((slug) => `/articles/${slug}/`),
  ...learningIds.map((id) => `/learning/${id}/`),
  ...Object.entries(reviewRoutes).flatMap(([level, ids]) =>
    ids.map((id) => `/review/${level}/${id}/`),
  ),
];

function decodeHtml(value = "") {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

function tagContent(html, name) {
  const patterns = [
    new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']*)["'][^>]*>`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+name=["']${name}["'][^>]*>`, "i"),
  ];
  return decodeHtml(patterns.map((pattern) => html.match(pattern)?.[1]).find(Boolean));
}

function propertyContent(html, property) {
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']*)["'][^>]*>`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+property=["']${property}["'][^>]*>`, "i"),
  ];
  return decodeHtml(patterns.map((pattern) => html.match(pattern)?.[1]).find(Boolean));
}

function canonicalHref(html) {
  const patterns = [
    /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']*)["'][^>]*>/i,
    /<link[^>]+href=["']([^"']*)["'][^>]+rel=["']canonical["'][^>]*>/i,
  ];
  return decodeHtml(patterns.map((pattern) => html.match(pattern)?.[1]).find(Boolean));
}

const failures = [];
const seenTitles = new Map();
const seenDescriptions = new Map();

for (const route of routes) {
  const htmlPath = resolve(".output/public", route.slice(1), "index.html");
  let html;
  try {
    html = await readFile(htmlPath, "utf8");
  } catch {
    failures.push(`${route}: missing prerendered HTML`);
    continue;
  }

  const title = decodeHtml(html.match(/<title>([^<]*)<\/title>/i)?.[1]);
  const description = tagContent(html, "description");
  const keywords = tagContent(html, "keywords")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const canonical = canonicalHref(html);
  const expectedCanonical = `${siteUrl}${route}`;
  const ogTitle = propertyContent(html, "og:title");
  const ogDescription = propertyContent(html, "og:description");

  const isArticleDetail = route.startsWith("/articles/") && route !== "/articles/";
  const titleMaximum = isArticleDetail ? 72 : 60;
  if ([...title].length < 18 || [...title].length > titleMaximum)
    failures.push(
      `${route}: title length ${[...title].length}, expected 18-${titleMaximum}`,
    );
  if ([...description].length < 60 || [...description].length > 140)
    failures.push(`${route}: description length ${[...description].length}, expected 60-140`);
  if (keywords.length < 3 || keywords.length > 6)
    failures.push(`${route}: keyword count ${keywords.length}, expected 3-6`);
  if (new Set(keywords).size !== keywords.length)
    failures.push(`${route}: duplicate keywords`);
  if (canonical !== expectedCanonical)
    failures.push(`${route}: canonical is ${canonical || "missing"}`);
  if (ogTitle !== title) failures.push(`${route}: og:title does not match title`);
  if (ogDescription !== description)
    failures.push(`${route}: og:description does not match description`);
  if (seenTitles.has(title))
    failures.push(`${route}: duplicate title also used by ${seenTitles.get(title)}`);
  if (seenDescriptions.has(description))
    failures.push(`${route}: duplicate description also used by ${seenDescriptions.get(description)}`);
  seenTitles.set(title, route);
  seenDescriptions.set(description, route);
}

if (failures.length) {
  console.error(`SEO metadata verification failed:\n${failures.map((item) => `- ${item}`).join("\n")}`);
  process.exit(1);
}

console.log(`Verified SEO metadata for ${routes.length} prerendered public routes.`);
